-- R1 · Informe de cierre de ciclo (maqueta de ChatGPT, 30-oct-2026): el coach escribe un mensaje
-- de cierre para la persona. Es texto del coach (nunca generado ni inventado) y la persona lo ve en
-- su informe de cierre con el nombre real de quien lo escribió. Sin mensaje, el informe muestra el
-- último foco que el coach publicó.
--  · Lo escriben el dueño o el coach de esa persona (privado.gestiona, con segundo factor), desde la
--    última semana del ciclo o con el ciclo ya cerrado. Vacío lo quita.
--  · El cambio queda en la auditoría (ciclos ya tiene el disparador auditar).
-- No cambia créditos, niveles, rachas, reconocimientos ni el estado del ciclo.

alter table public.ciclos
  add column mensaje_cierre text check (mensaje_cierre is null or char_length(mensaje_cierre) between 10 and 800),
  add column mensaje_cierre_por uuid references auth.users(id) on delete set null,
  add column mensaje_cierre_en timestamptz;

create or replace function public.guardar_mensaje_cierre(p_ciclo uuid, p_mensaje text) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.ciclos%rowtype; v text := nullif(btrim(coalesce(p_mensaje, '')), '');
begin
  select * into c from public.ciclos where id = p_ciclo;
  if c.id is null or not privado.gestiona(c.participante_id) then perform privado.error('sesion','no_autorizado','403'); end if;
  if c.estado <> 'cerrado' and privado.hoy_chile() < c.fin - 6 then perform privado.error('ciclo','no_termina'); end if;
  if v is not null and char_length(v) < 10 then perform privado.error('mensaje','corto'); end if;
  if v is not null and char_length(v) > 800 then perform privado.error('mensaje','largo'); end if;
  update public.ciclos
     set mensaje_cierre = v,
         mensaje_cierre_por = case when v is null then null else auth.uid() end,
         mensaje_cierre_en = case when v is null then null else now() end
   where id = c.id;
end $$;
revoke all on function public.guardar_mensaje_cierre(uuid, text) from public, anon, authenticated;
grant execute on function public.guardar_mensaje_cierre(uuid, text) to authenticated;

-- El informe suma el mensaje de cierre (texto, nombre de quien lo escribió y fecha). Lo demás no cambia.
create or replace function public.informe_ciclo(p_ciclo uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c public.ciclos%rowtype; v jsonb;
begin
  select * into c from public.ciclos where id = p_ciclo;
  if c.id is null or not privado.puede_ver_evolucion(c.participante_id) then perform privado.error('sesion','no_autorizado','403'); end if;
  with d as (
    select * from public.progreso_diario
     where participante_id = c.participante_id and fecha between c.inicio and least(c.fin, current_date)
  ), sem as (
    select * from public.evolucion_semanal(c.participante_id) e where e.ciclo_id = c.id
  )
  select jsonb_build_object(
    'ciclo', jsonb_build_object('numero', c.numero, 'plan', c.plan_id, 'inicio', c.inicio, 'fin', c.fin,
                                'semanas', c.semanas, 'estado', c.estado),
    'cerrado', c.estado = 'cerrado',
    'acciones', jsonb_build_object(
      'programadas', (select coalesce(sum(programadas), 0) from d),
      'hechas', (select coalesce(sum(hechas), 0) from d),
      'cumplimiento', (select case when sum(programadas) > 0 then round(100.0 * sum(hechas) / sum(programadas)) end from d)),
    'constancia', jsonb_build_object(
      'dias_con_acciones', (select count(*) from d where programadas > 0),
      'dias_con_alguna_hecha', (select count(*) from d where programadas > 0 and hechas > 0),
      'dias_completos', (select count(*) from d where programadas > 0 and hechas >= programadas),
      'mejor_racha', (select coalesce(max(racha), 0) from d)),
    'creditos', (select coalesce(sum(creditos_acciones + bono), 0) from d),
    'semanas', (select coalesce(jsonb_agg(to_jsonb(sem) - 'ciclo_id' - 'ciclo_numero' order by semana), '[]'::jsonb) from sem),
    'focos', (select coalesce(jsonb_agg(jsonb_build_object('semana', r.semana, 'foco', r.foco) order by r.semana), '[]'::jsonb)
                from public.revisiones r where r.ciclo_id = c.id and r.publicada_en is not null),
    'mensaje_cierre', case when c.mensaje_cierre is not null then jsonb_build_object(
        'texto', c.mensaje_cierre,
        'autor', (select e.nombre from public.equipo e where e.user_id = c.mensaje_cierre_por),
        'en', c.mensaje_cierre_en) end)
  into v;
  return v;
end $$;
