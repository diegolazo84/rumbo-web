-- C15 · Pantalla Desafíos de Comunidad (maqueta de ChatGPT, 29-oct-2026). Sobre C9 (desafíos):
--   · Proponer un desafío para revisión del equipo (como las propuestas de grupo de C13): la
--     persona ve el estado de lo suyo; moderación lo ve con el alias, nunca con la ficha.
--   · «Actividad reciente»: solo la propia (me uní, cumplí un día, completé). C9 dejó como regla
--     que de un desafío se muestra cuántas personas participan, nunca quiénes.
-- No toca acciones, créditos, rachas, niveles ni beneficios.

create table public.propuestas_desafio (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 3 and 80),
  descripcion text check (char_length(descripcion) <= 300),
  estado text not null default 'pendiente' check (estado in ('pendiente','creado','descartada')),
  creada_en timestamptz not null default now(),
  respondida_en timestamptz,
  respondida_por uuid
);
create index propuestas_desafio_pendientes on public.propuestas_desafio (creada_en) where estado = 'pendiente';
alter table public.propuestas_desafio enable row level security;
revoke all on public.propuestas_desafio from anon, authenticated;
-- Se escribe solo con las funciones de abajo. La lee moderación (el panel usa propuestas_desafio_equipo, con alias).
grant select on public.propuestas_desafio to authenticated;
create policy moderacion_leer on public.propuestas_desafio for select to authenticated using (privado.puede_moderar());
create or replace trigger auditar after insert or update or delete on public.propuestas_desafio
  for each row execute function privado.auditar_cambio();

create or replace function public.proponer_desafio(p_titulo text, p_descripcion text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.en_comunidad(); v_titulo text := btrim(p_titulo);
        v_desc text := nullif(btrim(p_descripcion), ''); v_id uuid;
begin
  if v_titulo is null or char_length(v_titulo) not between 3 and 80 then perform privado.error('titulo','largo'); end if;
  if char_length(v_desc) > 300 then perform privado.error('descripcion','largo'); end if;
  if (select count(*) from public.propuestas_desafio x where x.participante_id = v_yo and x.estado = 'pendiente') >= 3 then
    perform privado.error('propuestas','demasiadas','429'); end if;
  insert into public.propuestas_desafio (participante_id, titulo, descripcion) values (v_yo, v_titulo, v_desc) returning id into v_id;
  perform privado.avisar('Rumbo: nueva propuesta de desafío', 'Una persona propuso un desafío para la comunidad. Revísalo en el panel, en Comunidad.');
  return v_id;
end $$;

create or replace function public.mis_propuestas_desafio()
returns table (id uuid, titulo text, descripcion text, estado text, creada_en timestamptz)
language sql stable security definer set search_path = '' as $$
  select x.id, x.titulo, x.descripcion, x.estado, x.creada_en from public.propuestas_desafio x
   where x.participante_id = privado.mi_participante_id() order by x.creada_en desc;
$$;

create or replace function public.propuestas_desafio_equipo()
returns table (id uuid, titulo text, descripcion text, alias text, estado text, creada_en timestamptz, respondida_en timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not privado.puede_moderar() then perform privado.error('sesion','no_autorizado','403'); end if;
  return query select x.id, x.titulo, x.descripcion, a.alias::text, x.estado, x.creada_en, x.respondida_en
    from public.propuestas_desafio x left join public.alias a on a.participante_id = x.participante_id
   order by (x.estado = 'pendiente') desc, x.creada_en desc limit 100;
end $$;

create or replace function public.responder_propuesta_desafio(p_id uuid, p_estado text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.puede_moderar() then perform privado.error('sesion','no_autorizado','403'); end if;
  if p_estado not in ('creado','descartada') then perform privado.error('estado','invalido'); end if;
  update public.propuestas_desafio set estado = p_estado, respondida_en = now(), respondida_por = auth.uid()
   where id = p_id and estado = 'pendiente';
  if not found then perform privado.error('propuesta','no_encontrada','404'); end if;
end $$;

-- Mi actividad en desafíos: cuándo me uní, cada día cumplido (con el número de día del desafío)
-- y el desafío completado. Mismo cálculo verificable de C9 (progreso_diario, sin días en suspenso).
create or replace function public.mi_actividad_desafios()
returns table (tipo text, desafio_id uuid, titulo text, fecha date, dia int)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := privado.en_comunidad(); v_hoy date := privado.hoy_chile();
begin
  return query
  with mias as (
    select d.id, d.titulo, d.inicio, d.dias, x.unido_en
      from public.participaciones_desafio x join public.desafios d on d.id = x.desafio_id and d.activo
     where x.participante_id = v_yo),
  cumplidos as (
    select m.id, m.titulo, m.inicio, m.dias, p.fecha,
           count(*) over (partition by m.id) as total
      from mias m join public.progreso_diario p on p.participante_id = v_yo
       and p.fecha between m.inicio and least(m.inicio + m.dias - 1, v_hoy)
       and not p.en_suspenso and p.programadas > 0 and p.hechas >= p.programadas)
  select * from (
    select 'unido'::text, m.id, m.titulo, (m.unido_en at time zone 'America/Santiago')::date, null::int from mias m
    union all
    select case when c.total >= c.dias and c.fecha = c.inicio + c.dias - 1 then 'completado' else 'dia' end,
           c.id, c.titulo, c.fecha, (c.fecha - c.inicio + 1)::int from cumplidos c
  ) t (tipo, desafio_id, titulo, fecha, dia)
  order by t.fecha desc, t.dia desc nulls last limit 20;
end $$;

revoke all on function public.proponer_desafio(text, text), public.mis_propuestas_desafio(), public.propuestas_desafio_equipo(),
  public.responder_propuesta_desafio(uuid, text), public.mi_actividad_desafios() from public, anon, authenticated;
grant execute on function public.proponer_desafio(text, text), public.mis_propuestas_desafio(), public.mi_actividad_desafios()
  to authenticated;
-- Las de moderación revisan puede_moderar (que exige el segundo factor) dentro de la función.
grant execute on function public.propuestas_desafio_equipo(), public.responder_propuesta_desafio(uuid, text) to authenticated;

-- Las propuestas de desafío propias también van en la copia de los datos.
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
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;
