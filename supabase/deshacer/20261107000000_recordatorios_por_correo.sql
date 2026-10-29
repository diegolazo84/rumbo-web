-- Deshace 20261107000000_recordatorios_por_correo.sql
drop function if exists public.guardar_recordatorios(boolean, boolean, integer, boolean);
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
drop function if exists privado.enviar_correo(text, text, text);
alter table public.recordatorios drop column if exists por_correo;
