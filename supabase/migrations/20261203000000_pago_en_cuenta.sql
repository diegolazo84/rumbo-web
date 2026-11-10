-- Pago dentro de Mi espacio (Diego, 10-nov-2026): tras aceptar el acuerdo, la persona ve en su
-- cuenta (con sesión) el monto, el vencimiento y los datos para transferir, y recibe un correo.
-- - Los datos para transferir viven en Vault (secreto `datos_transferencia`, una línea por dato:
--   banco, tipo y número de cuenta, RUT, nombre, correo). Nunca en el código ni en páginas públicas.
-- - «Ya transferí» solo deja un aviso: NO registra el pago, NO lo confirma y NO cambia el ciclo.
--   El pago lo registra el dueño en Pagos después de verificarlo (registrar_pago).
-- - Vencimiento: el día anterior al inicio del ciclo (condiciones aprobadas el 10-oct-2026).

create table public.avisos_pago (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  ciclo_id uuid not null references public.ciclos(id) on delete cascade,
  referencia text check (char_length(referencia) <= 80),
  creado_en timestamptz not null default now(),
  unique (ciclo_id)
);
alter table public.avisos_pago enable row level security;
revoke all on public.avisos_pago from anon, authenticated;
grant select on public.avisos_pago to authenticated;
create policy admin_leer on public.avisos_pago for select to authenticated using (privado.es_admin());
create policy yo_leer on public.avisos_pago for select to authenticated
  using (participante_id = (select privado.mi_participante_id()));
create or replace trigger auditar after insert or update or delete on public.avisos_pago
  for each row execute function privado.auditar_cambio();

-- El ciclo por pagar de quien llama: el más reciente que no está cerrado.
create or replace function public.mi_pago() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_part uuid := privado.mi_participante_id(); c public.ciclos%rowtype; v_pagado boolean; v_aviso timestamptz;
        v_datos text;
begin
  if v_part is null then return null; end if;
  select * into c from public.ciclos where participante_id = v_part and estado <> 'cerrado' order by numero desc limit 1;
  if c.id is null or c.precio_acordado_clp is null then return null; end if;
  v_pagado := exists (select 1 from public.pagos where ciclo_id = c.id);
  select creado_en into v_aviso from public.avisos_pago where ciclo_id = c.id;
  if not v_pagado then
    select decrypted_secret into v_datos from vault.decrypted_secrets where name = 'datos_transferencia';
  end if;
  return jsonb_build_object(
    'ciclo_id', c.id, 'numero', c.numero, 'plan', c.plan_id, 'monto_clp', c.precio_acordado_clp,
    'inicio', c.inicio, 'vence', c.inicio - 1, 'pagado', v_pagado, 'aviso_en', v_aviso,
    -- Solo mientras falta pagar, y solo si Diego los configuró en Vault.
    'datos', case when v_datos is null or btrim(v_datos) = '' then null
                  else to_jsonb(array(select btrim(l) from regexp_split_to_table(v_datos, E'\n') l where btrim(l) <> '')) end);
end $$;

-- «Ya transferí»: un aviso por ciclo, con referencia opcional. Avisa al equipo y confirma por correo.
create or replace function public.avisar_pago(p_referencia text default null) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare v_part uuid := privado.mi_participante_id(); c public.ciclos%rowtype; v_en timestamptz; v_correo text; v_nombre text;
begin
  if v_part is null then perform privado.error('sesion','no_autorizado','403'); end if;
  select * into c from public.ciclos where participante_id = v_part and estado <> 'cerrado' order by numero desc limit 1;
  if c.id is null then perform privado.error('ciclo','no_encontrado','404'); end if;
  if exists (select 1 from public.pagos where ciclo_id = c.id) then perform privado.error('pago','ya_registrado','409'); end if;
  if char_length(p_referencia) > 80 then perform privado.error('referencia','larga'); end if;
  insert into public.avisos_pago (participante_id, ciclo_id, referencia)
  values (v_part, c.id, nullif(btrim(p_referencia), ''))
  on conflict (ciclo_id) do update set referencia = coalesce(excluded.referencia, public.avisos_pago.referencia)
  returning creado_en into v_en;
  select correo, coalesce(nombre_preferido, nombre) into v_correo, v_nombre from public.participantes where id = v_part;
  perform privado.avisar('Aviso de pago', coalesce(v_nombre, 'Una persona') || ' avisó que transfirió el ciclo '
    || c.numero || '. Verifícalo y regístralo en Pagos.');
  perform privado.enviar_correo(v_correo, 'Recibimos tu aviso de pago',
    'Hola' || coalesce(', ' || v_nombre, '') || E':\n\nRecibimos tu aviso de transferencia por $'
    || replace(to_char(c.precio_acordado_clp, 'FM999,999,999'), ',', '.') || E'. Lo confirmaremos cuando lo verifiquemos; '
    || E'te avisaremos en Mi espacio.\n\nEntra a Mi espacio: https://diegolazo84.github.io/rumbo-web/mi-espacio/pago/');
  return v_en;
end $$;

-- Correo al crear un ciclo con precio: monto, vencimiento y dónde ver los datos (no van en el correo).
create or replace function privado.correo_pago_ciclo() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_correo text; v_nombre text;
begin
  if new.precio_acordado_clp is null then return new; end if;
  select correo, coalesce(nombre_preferido, nombre) into v_correo, v_nombre from public.participantes where id = new.participante_id;
  perform privado.enviar_correo(v_correo, 'Tu espacio en Rumbo está listo: así pagas tu ciclo',
    'Hola' || coalesce(', ' || v_nombre, '') || E':\n\nTu espacio en Rumbo está listo. Para empezar tu ciclo el '
    || to_char(new.inicio, 'DD-MM-YYYY') || ', el pago de $' || replace(to_char(new.precio_acordado_clp, 'FM999,999,999'), ',', '.')
    || ' vence el ' || to_char(new.inicio - 1, 'DD-MM-YYYY') || E'.\n\nLos datos para transferir están en tu espacio, '
    || E'con tu sesión: https://diegolazo84.github.io/rumbo-web/mi-espacio/pago/\n\n'
    || 'Si estás fuera de Chile, responde este correo y te mandamos el enlace de PayPal en dólares.');
  return new;
end $$;
create trigger correo_pago after insert on public.ciclos for each row execute function privado.correo_pago_ciclo();

revoke all on function public.mi_pago(), public.avisar_pago(text), privado.correo_pago_ciclo() from public, anon, authenticated;
grant execute on function public.mi_pago(), public.avisar_pago(text) to authenticated;

-- La copia de mis datos suma los avisos de pago (misma función de 20261130, más «avisos_pago»).
create or replace function public.exportar_mis_datos() returns jsonb
language sql stable security definer set search_path = '' as $$
  with yo as (select privado.mi_participante_id() as id)
  select jsonb_build_object(
    'generado_en', now(),
    'perfil',   (select to_jsonb(p) - 'user_id' from public.participantes p, yo where p.id = yo.id),
    'ciclos',   (select jsonb_agg(to_jsonb(c)) from public.ciclos c, yo where c.participante_id = yo.id),
    'metas',    (select jsonb_agg(to_jsonb(m)) from public.metas m join public.programas g on g.id = m.programa_id, yo
                  where m.participante_id = yo.id and g.estado <> 'borrador'),
    'acciones', (select jsonb_agg(to_jsonb(o) || jsonb_build_object('registro', to_jsonb(r) - 'participante_id'))
                  from public.ocurrencias o left join public.registros r on r.ocurrencia_id = o.id, yo
                  where o.participante_id = yo.id),
    'registros_semanales', (select jsonb_agg(to_jsonb(s)) from public.registros_semanales s, yo where s.participante_id = yo.id),
    'revisiones', (select jsonb_agg(to_jsonb(v)) from public.revisiones v, yo where v.participante_id = yo.id and v.publicada_en is not null),
    'solicitudes_ajuste', (select jsonb_agg(to_jsonb(a)) from public.solicitudes_ajuste a, yo where a.participante_id = yo.id),
    'pagos', (select jsonb_agg(to_jsonb(x) - 'registrado_por') from public.pagos x, yo where x.participante_id = yo.id),
    'videollamadas', (select jsonb_agg(to_jsonb(x) - 'registrada_por') from public.videollamadas x, yo where x.participante_id = yo.id),
    'recordatorios', (select to_jsonb(x) from public.recordatorios x, yo where x.participante_id = yo.id),
    'alias', (select to_jsonb(x) from public.alias x, yo where x.participante_id = yo.id),
    'publicaciones', (select jsonb_agg(to_jsonb(x) - 'moderada_por') from public.publicaciones x, yo where x.autor = yo.id),
    'reportes', (select jsonb_agg(to_jsonb(x)) from public.reportes_comunidad x, yo where x.reportante = yo.id),
    'reconocimientos', (select jsonb_agg(to_jsonb(x)) from public.reconocimientos_otorgados x, yo where x.participante_id = yo.id),
    'beneficios', (select jsonb_agg(to_jsonb(x) - 'otorgado_por') from public.beneficios_otorgados x, yo where x.participante_id = yo.id),
    'asistente_consentimiento', (select to_jsonb(x) from public.ia_consentimientos x, yo where x.participante_id = yo.id),
    'asistente_consultas', (select jsonb_agg(jsonb_build_object('pregunta', x.pregunta, 'contexto_enviado', x.contexto_enviado,
        'estado', x.estado, 'respuesta', case when x.estado = 'aprobada' then x.texto_final end, 'creada_en', x.creada_en))
      from public.ia_consultas x, yo where x.participante_id = yo.id and x.tipo = 'pregunta'),
    'asistente_valoraciones', (select jsonb_agg(jsonb_build_object('consulta_id', x.consulta_id, 'util', x.util,
        'motivo', x.motivo, 'actualizada_en', x.actualizada_en)) from public.ia_valoraciones x, yo where x.participante_id = yo.id),
    'especialistas_vinculos', (select jsonb_agg(to_jsonb(x)) from public.vinculos_especialista x, yo where x.participante_id = yo.id),
    'especialistas_reservas', (select jsonb_agg(to_jsonb(x) - 'comision_pct' - 'comision_clp') from public.reservas_especialista x, yo
                                where x.participante_id = yo.id),
    'especialistas_recomendaciones', (select jsonb_agg(to_jsonb(x)) from public.recomendaciones_especialista x, yo where x.participante_id = yo.id),
    'especialistas_mensajes', (select jsonb_agg(to_jsonb(x)) from public.mensajes_especialista x, yo where x.participante_id = yo.id),
    'comunidad_reacciones', (select jsonb_agg(to_jsonb(x)) from public.reacciones_comunidad x, yo where x.participante_id = yo.id),
    'comunidad_grupos', (select jsonb_agg(jsonb_build_object('grupo', g.nombre, 'unido_en', m.unido_en))
                          from public.miembros_grupo m join public.grupos_comunidad g on g.id = m.grupo_id, yo where m.participante_id = yo.id),
    'comunidad_guardadas', (select jsonb_agg(to_jsonb(x)) from public.guardadas_comunidad x, yo where x.participante_id = yo.id),
    'comunidad_bloqueos', (select jsonb_agg(jsonb_build_object('alias', a.alias, 'desde', b.creado_en))
                            from public.bloqueos_comunidad b join public.alias a on a.participante_id = b.bloqueado, yo where b.bloqueador = yo.id),
    'desafios', (select jsonb_agg(jsonb_build_object('desafio', d.titulo, 'unido_en', x.unido_en))
                  from public.participaciones_desafio x join public.desafios d on d.id = x.desafio_id, yo where x.participante_id = yo.id),
    'propuestas_grupo', (select jsonb_agg(to_jsonb(x) - 'participante_id' - 'respondida_por') from public.propuestas_grupo x, yo where x.participante_id = yo.id),
    'propuestas_desafio', (select jsonb_agg(to_jsonb(x) - 'participante_id' - 'respondida_por') from public.propuestas_desafio x, yo where x.participante_id = yo.id),
    'avisos_pago', (select jsonb_agg(to_jsonb(x) - 'participante_id') from public.avisos_pago x, yo where x.participante_id = yo.id),
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;
