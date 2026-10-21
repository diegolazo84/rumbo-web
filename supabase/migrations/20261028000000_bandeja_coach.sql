-- B2 · Bandeja de seguimiento: lo que pide atención en cada participante que gestiona quien llama.
-- El coach ve solo a los suyos; el dueño, a todos. Solo señales calculadas, sin textos de las personas.

create or replace function public.bandeja_seguimiento()
returns table (participante_id uuid, nombre text, coach_id uuid, ciclo_id uuid, semana int,
               dias_sin_actividad int, evidencias_por_revisar int, ajustes_pendientes int, ajustes_vencidos int,
               registro_semanal_pendiente boolean, revision_pendiente boolean, prioridad int)
language sql stable security definer set search_path = '' as $$
  with base as (
    select p.id, coalesce(p.nombre_preferido, p.nombre) nombre, p.coach_id, c.id ciclo_id,
           least(c.semanas, greatest(1, ((current_date - c.inicio) / 7) + 1))::int semana, c.inicio, c.dia_revision
      from public.participantes p
      join public.ciclos c on c.participante_id = p.id and c.estado = 'activo'
     where p.estado = 'activo' and c.inicio <= current_date and privado.gestiona(p.id)
  ), s as (
    select b.*,
      (current_date - coalesce((select max((g.creado_en at time zone 'America/Santiago')::date) from public.registros g
                                 where g.participante_id = b.id), b.inicio))::int dias_sin_actividad,
      (select count(*) from public.registros g where g.participante_id = b.id and g.estado = 'en_revision')::int evidencias,
      (select count(*) from public.solicitudes_ajuste a where a.participante_id = b.id and a.estado in ('enviada','en_revision'))::int ajustes,
      (select count(*) from public.solicitudes_ajuste a where a.participante_id = b.id and a.estado in ('enviada','en_revision')
          and a.responder_antes < current_date)::int vencidos,
      -- La semana en curso ya pasó su día de revisión (lunes = 1 … viernes = 5).
      (b.inicio + (b.semana - 1) * 7 + (b.dia_revision - 1)) <= current_date as toca_revision
    from base b
  )
  select s.id, s.nombre, s.coach_id, s.ciclo_id, s.semana, s.dias_sin_actividad, s.evidencias, s.ajustes, s.vencidos,
         s.toca_revision and not exists (select 1 from public.registros_semanales w where w.ciclo_id = s.ciclo_id
                                            and w.semana = s.semana and w.enviado_en is not null),
         s.toca_revision and not exists (select 1 from public.revisiones v where v.ciclo_id = s.ciclo_id
                                            and v.semana = s.semana and v.publicada_en is not null),
         (s.vencidos * 3 + s.ajustes + s.evidencias + case when s.dias_sin_actividad >= 3 then 2 else 0 end)::int
    from s
   order by 12 desc, s.dias_sin_actividad desc;
$$;

revoke all on function public.bandeja_seguimiento() from public, anon, authenticated;
grant execute on function public.bandeja_seguimiento() to authenticated;
