-- C3 · Seguimiento de la evolución (función 15 del inventario): datos para el gráfico semanal y el
-- informe de cierre de ciclo. Solo resume lo que ya está en la base (progreso diario, registro
-- semanal y revisiones publicadas): no estima, no compara con otras personas ni inventa resultados.
-- La persona ve lo suyo; su coach y el dueño, lo de quienes gestionan.

create or replace function privado.puede_ver_evolucion(p_participante uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(p_participante = privado.mi_participante_id(), false) or coalesce(privado.gestiona(p_participante), false);
$$;
revoke execute on function privado.puede_ver_evolucion(uuid) from public, anon, authenticated;

-- Una fila por semana de cada ciclo (sin argumento: la persona que llama).
create or replace function public.evolucion_semanal(p_participante uuid default null)
returns table (ciclo_id uuid, ciclo_numero int, semana int, desde date, hasta date,
               programadas int, hechas int, en_revision int, cumplimiento int, dias_completos int,
               creditos int, carga text, revision_publicada boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_p uuid := coalesce(p_participante, privado.mi_participante_id());
begin
  if v_p is null or not privado.puede_ver_evolucion(v_p) then perform privado.error('sesion','no_autorizado','403'); end if;
  return query
  with semanas as (
    select c.id, c.numero::int numero, s::int semana, c.inicio + (s - 1) * 7 desde,
           least(c.inicio + s * 7 - 1, c.fin) hasta
      from public.ciclos c, generate_series(1, c.semanas) s
     where c.participante_id = v_p and c.inicio + (s - 1) * 7 <= least(current_date, c.fin)
  )
  select w.id, w.numero, w.semana, w.desde, w.hasta,
         coalesce(sum(d.programadas), 0)::int,
         coalesce(sum(d.hechas), 0)::int,
         coalesce(sum(d.en_revision), 0)::int,
         case when coalesce(sum(d.programadas), 0) = 0 then null
              else round(100.0 * sum(d.hechas) / sum(d.programadas))::int end,
         count(*) filter (where d.programadas > 0 and d.hechas >= d.programadas)::int,
         coalesce(sum(d.creditos_acciones + d.bono), 0)::int,
         (select r.carga from public.registros_semanales r where r.ciclo_id = w.id and r.semana = w.semana and r.enviado_en is not null),
         exists (select 1 from public.revisiones v where v.ciclo_id = w.id and v.semana = w.semana and v.publicada_en is not null)
    from semanas w
    left join public.progreso_diario d on d.participante_id = v_p and d.fecha between w.desde and w.hasta
   group by w.id, w.numero, w.semana, w.desde, w.hasta
   order by w.numero, w.semana;
end $$;

-- Informe de un ciclo: totales, constancia y los focos que el coach publicó en cada revisión.
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

revoke all on function public.evolucion_semanal(uuid), public.informe_ciclo(uuid) from public, anon, authenticated;
grant execute on function public.evolucion_semanal(uuid), public.informe_ciclo(uuid) to authenticated;
