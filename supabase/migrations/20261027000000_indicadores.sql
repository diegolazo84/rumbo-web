-- B3 · Indicadores de negocio (docs/metricas-negocio.md) calculados en la base.
-- Solo el dueño con TOTP. Devuelve conteos agregados (numerador y denominador), nunca datos de personas.
-- Los indicadores que dependen de tablas que aún no existen (pagos, minutos, IA) se listan como no disponibles.

create or replace function public.indicadores(p_desde date, p_hasta date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  d timestamptz; h timestamptz; r jsonb;
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  if p_desde is null or p_hasta is null or p_hasta < p_desde or p_hasta - p_desde > 366 then
    perform privado.error('periodo','invalido'); end if;
  d := p_desde::timestamp at time zone 'America/Santiago';
  h := (p_hasta + 1)::timestamp at time zone 'America/Santiago';

  select jsonb_build_object(
    'periodo', jsonb_build_object('desde', p_desde, 'hasta', p_hasta),
    'conversion', jsonb_build_object(
      'postulaciones', (select count(*) from public.solicitudes s where s.tipo = 'solicitud' and s.creada_en >= d and s.creada_en < h),
      'interes', (select count(*) from public.solicitudes s where s.tipo = 'interes' and s.creada_en >= d and s.creada_en < h),
      'respondidas_a_tiempo', (select count(*) from public.solicitudes s where s.tipo = 'solicitud' and s.creada_en >= d and s.creada_en < h
                                 and s.respondida_en is not null
                                 and (s.respondida_en at time zone 'America/Santiago')::date <= s.responder_antes),
      'acordadas', (select count(distinct e.solicitud_id) from public.solicitudes_eventos e where e.a_estado = 'acordada' and e.en >= d and e.en < h),
      'revisadas', (select count(distinct e.solicitud_id) from public.solicitudes_eventos e
                     where e.de_estado in ('recibida','en_revision') and e.en >= d and e.en < h),
      'acuerdos_aceptados', (select count(*) from public.solicitudes s where s.acuerdo is not null
                              and s.condiciones_aceptadas is not null and s.estado_cambiado_en >= d and s.estado_cambiado_en < h),
      'ciclos_por_plan', coalesce((select jsonb_object_agg(plan_id, n) from (select c.plan_id, count(*) n from public.ciclos c
                                     where c.inicio between p_desde and p_hasta group by c.plan_id) x), '{}'::jsonb)),
    'activacion', jsonb_build_object(
      'empezaron', (select count(*) from public.ciclos c where c.numero = 1 and c.inicio between p_desde and p_hasta),
      'primera_accion_3_dias', (select count(*) from public.ciclos c where c.numero = 1 and c.inicio between p_desde and p_hasta
                                 and exists (select 1 from public.registros g join public.ocurrencias o on o.id = g.ocurrencia_id
                                              where o.ciclo_id = c.id and o.fecha <= c.inicio + 2 and g.estado <> 'dejada')),
      'registro_semana_1', (select count(*) from public.ciclos c where c.numero = 1 and c.inicio between p_desde and p_hasta
                             and exists (select 1 from public.registros_semanales w where w.ciclo_id = c.id and w.semana = 1 and w.enviado_en is not null))),
    'cumplimiento', jsonb_build_object(
      'acciones_programadas', (select coalesce(sum(p.programadas), 0) from public.progreso_diario p where p.fecha between p_desde and p_hasta),
      'acciones_hechas', (select coalesce(sum(p.hechas), 0) from public.progreso_diario p where p.fecha between p_desde and p_hasta),
      'dias_con_acciones', (select count(*) from public.progreso_diario p where p.fecha between p_desde and p_hasta and p.programadas > 0),
      'dias_completos', (select count(*) from public.progreso_diario p where p.fecha between p_desde and p_hasta
                          and p.programadas > 0 and p.hechas >= p.programadas),
      'registros_semanales_enviados', (select count(*) from public.registros_semanales w where w.enviado_en >= d and w.enviado_en < h),
      'revisiones_publicadas', (select count(*) from public.revisiones v where v.publicada_en >= d and v.publicada_en < h),
      'ajustes_pedidos', (select count(*) from public.solicitudes_ajuste a where a.creada_en >= d and a.creada_en < h)),
    'retencion', jsonb_build_object(
      'en_ciclo_activo', (select count(distinct c.participante_id) from public.ciclos c
                           where c.inicio <= p_hasta and c.fin >= p_desde and c.estado <> 'cerrado'),
      'con_actividad', (select count(distinct g.participante_id) from public.registros g where g.creado_en >= d and g.creado_en < h),
      'pausados', (select count(*) from public.ciclos c where c.pausa_desde between p_desde and p_hasta),
      'cerrados', (select count(*) from public.ciclos c where c.cerrado_en >= d and c.cerrado_en < h),
      'cerrados_antes_del_fin', (select count(*) from public.ciclos c where c.cerrado_en >= d and c.cerrado_en < h
                                  and (c.cerrado_en at time zone 'America/Santiago')::date < c.fin),
      'renovaciones', (select count(*) from public.ciclos c where c.numero > 1 and c.inicio between p_desde and p_hasta)),
    'equipo', jsonb_build_object(
      'acompanantes_activos', (select count(*) from public.equipo e where e.activo),
      'participantes_con_coach', (select count(*) from public.participantes p where p.coach_id is not null),
      'participantes_sin_coach', (select count(*) from public.participantes p where p.coach_id is null and p.estado = 'activo')),
    'no_disponible', jsonb_build_array(
      jsonb_build_object('indicador', 'visitas y tasa de postulación', 'falta', 'analítica sin cookies (no activa)'),
      jsonb_build_object('indicador', 'conversión a pago, devoluciones, ingreso y margen', 'falta', 'registro de pagos (B4)'),
      jsonb_build_object('indicador', 'minutos y costo humano', 'falta', 'registrar minutos por revisión'),
      jsonb_build_object('indicador', 'uso y costo de IA', 'falta', 'asistente de IA (no activo)'))
  ) into r;
  return r;
end $$;

revoke all on function public.indicadores(date, date) from public, anon, authenticated;
grant execute on function public.indicadores(date, date) to authenticated;
