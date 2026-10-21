-- Deshace 20261111000000_especialistas_trabajo.sql
-- Restaura exportar_mis_datos de E2 (20261109000000_asistente_ia.sql).
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
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;
drop function if exists public.comisiones_especialistas(date, date);
drop function if exists public.recomendar(uuid, text);
drop function if exists public.especialista_seguimiento(uuid);
drop function if exists public.mis_participantes_especialista();
drop function if exists public.anotar_reserva(uuid, text);
drop function if exists public.agendar_reserva(uuid, uuid, timestamptz, text);
drop function if exists public.responder_reserva(uuid, boolean, timestamptz, text, text);
drop function if exists privado.yo_especialista();
drop function if exists public.enviar_mensaje_especialista(uuid, uuid, text);
drop function if exists public.cancelar_reserva(uuid);
drop function if exists public.pedir_reserva(uuid, text);
drop function if exists public.retirar_especialista(uuid);
drop function if exists public.autorizar_especialista(uuid, boolean, boolean, boolean);
drop function if exists privado.persona_activa();
drop function if exists privado.avisar_especialista(uuid, uuid, text, text);
drop function if exists privado.vinculo(uuid, uuid);
drop table if exists public.mensajes_especialista;
drop table if exists public.recomendaciones_especialista;
drop table if exists public.reservas_especialista;
drop table if exists public.vinculos_especialista;
revoke execute on function privado.mi_especialista_id() from authenticated;
delete from public.avisos where tipo in ('reserva_pedida','reserva_respondida','mensaje_especialista','recomendacion_especialista');
delete from public.avisos where enlace like '/especialista/%';
alter table public.avisos drop constraint avisos_enlace_check;
alter table public.avisos add constraint avisos_enlace_check check (enlace ~ '^/(mi-espacio|equipo)/');
alter table public.avisos drop constraint avisos_tipo_check;
alter table public.avisos add constraint avisos_tipo_check check (tipo in ('revision_publicada','ajuste_respondido',
  'programa_publicado','registro_enviado','ajuste_pedido','videollamada_programada',
  'recordatorio_acciones','recordatorio_registro','reporte_comunidad','reconocimiento','beneficio_disponible',
  'ia_por_revisar','ia_respondida','ia_alerta'));
