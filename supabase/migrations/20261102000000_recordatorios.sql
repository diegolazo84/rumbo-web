-- D1 · Recordatorios automáticos dentro de Rumbo (función 12 del inventario).
-- Cada persona elige si quiere recordatorios y a qué hora (hora de Chile). Vienen apagados: se
-- activan solo si la persona lo pide. Llegan como avisos de Rumbo (A5), sin servicios externos;
-- el correo y los avisos en el teléfono se suman después sobre esta misma preferencia.
--  · Acciones del día: a la hora elegida, si hoy tiene acciones sin marcar.
--  · Registro semanal: el día antes de su revisión, a la hora elegida, si no lo ha enviado.
-- Nunca en ciclos pausados o cerrados, y como máximo uno de cada tipo por día (20 horas entre uno y otro).

create table public.recordatorios (
  participante_id uuid primary key references public.participantes(id) on delete cascade,
  acciones_del_dia boolean not null default false,
  registro_semanal boolean not null default false,
  hora smallint not null default 20 check (hora between 7 and 22),
  actualizado_en timestamptz not null default now()
);
alter table public.recordatorios enable row level security;
revoke all on public.recordatorios from anon, authenticated;
grant select on public.recordatorios to authenticated;
create policy admin_leer on public.recordatorios for select to authenticated using (privado.es_admin());
create policy yo_leer on public.recordatorios for select to authenticated
  using (participante_id = (select privado.mi_participante_id()));

alter table public.avisos drop constraint avisos_tipo_check;
alter table public.avisos add constraint avisos_tipo_check check (tipo in ('revision_publicada','ajuste_respondido',
  'programa_publicado','registro_enviado','ajuste_pedido','videollamada_programada',
  'recordatorio_acciones','recordatorio_registro'));

create or replace function public.guardar_recordatorios(p_acciones_del_dia boolean, p_registro_semanal boolean,
  p_hora integer default 20) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id();
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  if p_acciones_del_dia is null or p_registro_semanal is null then perform privado.error('preferencia','invalida'); end if;
  if p_hora is null or p_hora < 7 or p_hora > 22 then perform privado.error('hora','invalida'); end if;
  insert into public.recordatorios (participante_id, acciones_del_dia, registro_semanal, hora)
  values (v_yo, p_acciones_del_dia, p_registro_semanal, p_hora)
  on conflict (participante_id) do update
    set acciones_del_dia = excluded.acciones_del_dia, registro_semanal = excluded.registro_semanal,
        hora = excluded.hora, actualizado_en = now();
end $$;
revoke all on function public.guardar_recordatorios(boolean, boolean, integer) from public, anon, authenticated;
grant execute on function public.guardar_recordatorios(boolean, boolean, integer) to authenticated;

-- Crea los recordatorios que tocan a la hora y el día indicados (por defecto, los actuales de Chile;
-- las pruebas indican otros). Devuelve cuántos creó.
create or replace function privado.enviar_recordatorios(p_hora integer default null, p_hoy date default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_hoy date := coalesce(p_hoy, privado.hoy_chile());
  v_hora int := coalesce(p_hora, extract(hour from now() at time zone 'America/Santiago')::int);
  r record; v_n int := 0; v_semana int;
begin
  for r in
    select p.id, c.id ciclo_id, c.inicio, c.semanas, c.dia_revision, x.acciones_del_dia, x.registro_semanal
      from public.recordatorios x
      join public.participantes p on p.id = x.participante_id and p.estado = 'activo' and p.user_id is not null
      join public.ciclos c on c.participante_id = p.id and c.estado = 'activo' and c.inicio <= v_hoy and c.fin >= v_hoy
     where x.hora = v_hora and (x.acciones_del_dia or x.registro_semanal)
  loop
    if r.acciones_del_dia
       and exists (select 1 from public.ocurrencias o where o.participante_id = r.id and o.fecha = v_hoy and o.vigente
                     and not exists (select 1 from public.registros g where g.ocurrencia_id = o.id))
       and not exists (select 1 from public.avisos a where a.participante_id = r.id and a.tipo = 'recordatorio_acciones'
                         and a.creado_en > now() - interval '20 hours') then
      perform privado.avisar_app(r.id, true, 'recordatorio_acciones', 'Hoy tienes acciones por marcar', '/mi-espacio/');
      v_n := v_n + 1;
    end if;
    -- Mañana es el día de revisión de la semana v_semana.
    v_semana := ((v_hoy + 1 - r.inicio - (r.dia_revision - 1)) / 7) + 1;
    if r.registro_semanal
       and (v_hoy + 1 - r.inicio - (r.dia_revision - 1)) >= 0 and (v_hoy + 1 - r.inicio - (r.dia_revision - 1)) % 7 = 0
       and v_semana between 1 and r.semanas
       and not exists (select 1 from public.registros_semanales w where w.ciclo_id = r.ciclo_id and w.semana = v_semana
                         and w.enviado_en is not null)
       and not exists (select 1 from public.avisos a where a.participante_id = r.id and a.tipo = 'recordatorio_registro'
                         and a.creado_en > now() - interval '20 hours') then
      perform privado.avisar_app(r.id, true, 'recordatorio_registro',
        'Mañana es tu revisión: cuéntale a tu coach cómo te fue esta semana', '/mi-espacio/');
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end $$;
revoke execute on function privado.enviar_recordatorios(integer, date) from public, anon, authenticated;

create or replace function privado.tareas_por_hora() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from privado.limites where ventana < now() - interval '48 hours';
  delete from privado.sales where fecha < privado.hoy_chile() - 1;
  if extract(hour from now() at time zone 'America/Santiago') = 9 then perform privado.resumen_diario(); end if;
  perform privado.enviar_recordatorios();
end $$;

-- Las preferencias de recordatorios también forman parte de la copia de mis datos.
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
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;
