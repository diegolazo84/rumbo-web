-- Deshace 20261122000000_mensaje_cierre.sql: vuelve el informe a su versión anterior (sin mensaje),
-- quita la función y las columnas. Los mensajes escritos se pierden.
drop function public.guardar_mensaje_cierre(uuid, text);
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
                from public.revisiones r where r.ciclo_id = c.id and r.publicada_en is not null))
  into v;
  return v;
end $$;
alter table public.ciclos drop column mensaje_cierre, drop column mensaje_cierre_por, drop column mensaje_cierre_en;
