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
