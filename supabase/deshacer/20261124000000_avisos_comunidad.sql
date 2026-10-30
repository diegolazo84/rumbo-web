-- Deshace 20261124000000_avisos_comunidad.sql: quita los disparadores y los avisos de Comunidad
-- (se borran los avisos de esos dos tipos) y vuelve a la lista de tipos anterior.
drop trigger if exists aviso_comunidad on public.publicaciones;
drop trigger if exists aviso_comunidad on public.desafios;
drop function if exists privado.aviso_comunidad();
delete from public.avisos where tipo in ('comunidad_respuesta','desafio_nuevo');
alter table public.avisos drop constraint avisos_tipo_check;
alter table public.avisos add constraint avisos_tipo_check check (tipo in ('revision_publicada','ajuste_respondido',
  'programa_publicado','registro_enviado','ajuste_pedido','videollamada_programada',
  'recordatorio_acciones','recordatorio_registro','reporte_comunidad','reconocimiento','beneficio_disponible',
  'ia_por_revisar','ia_respondida','ia_alerta',
  'reserva_pedida','reserva_respondida','mensaje_especialista','recomendacion_especialista'));
