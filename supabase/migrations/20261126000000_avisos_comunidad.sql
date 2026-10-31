-- R1 · Mis avisos (maqueta de ChatGPT, 30-oct-2026): avisos de la Comunidad (aprobados por Diego
-- el 30-oct-2026).
--  · comunidad_respuesta: alguien respondió tu publicación. Solo dice el alias de quien respondió,
--    nunca su nombre ni lo que escribió. No avisa si te respondes a ti mismo ni si bloqueaste a esa
--    persona.
--  · desafio_nuevo: se abrió un desafío nuevo. Llega a quienes ya entraron a la Comunidad (alias y
--    reglas aceptadas) y siguen activos.
-- Ninguno se crea mientras el módulo «comunidad» no esté visible. Textos fijos; enlazan a la
-- Comunidad. Lo demás de avisos (lectura, marcar leídos, borrado de leídos a los 90 días) no cambia.
-- Antes se llamaba 20261124000000; pasó a ir después de 20261125000000_recordatorios_completos
-- (31-oct-2026) para no depender de una migración sin aplicar: ambos avisos solo llegan a quien eligió
-- «Comunidad» en sus recordatorios (privado.quiere y privado.avisar_app, de 20261125).
-- La lista incluye 'ia_no_compartida' (20261128000000) para que aplicarla después no la quite.

alter table public.avisos drop constraint avisos_tipo_check;
alter table public.avisos add constraint avisos_tipo_check check (tipo in ('revision_publicada','ajuste_respondido',
  'programa_publicado','registro_enviado','ajuste_pedido','videollamada_programada',
  'recordatorio_acciones','recordatorio_registro','reporte_comunidad','reconocimiento','beneficio_disponible',
  'ia_por_revisar','ia_respondida','ia_alerta','ia_no_compartida',
  'reserva_pedida','reserva_respondida','mensaje_especialista','recomendacion_especialista',
  'recordatorio_videollamada','comunidad_respuesta','desafio_nuevo'));

create or replace function privado.aviso_comunidad() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_autor uuid; v_alias text;
begin
  if not public.modulo_visible('comunidad') then return null; end if;
  if tg_table_name = 'publicaciones' then
    if new.respuesta_a is null or new.estado <> 'visible' then return null; end if;
    select x.autor into v_autor from public.publicaciones x where x.id = new.respuesta_a and x.estado = 'visible';
    if v_autor is null or v_autor = new.autor then return null; end if;
    if exists (select 1 from public.bloqueos_comunidad b where b.bloqueador = v_autor and b.bloqueado = new.autor) then
      return null;
    end if;
    select a.alias::text into v_alias from public.alias a where a.participante_id = new.autor;
    perform privado.avisar_app(v_autor, true, 'comunidad_respuesta',
      left(coalesce(v_alias, 'Alguien') || ' respondió tu publicación', 120), '/mi-espacio/comunidad/');
  elsif tg_table_name = 'desafios' then
    if not new.activo or (tg_op = 'UPDATE' and old.activo) then return null; end if;
    insert into public.avisos (destinatario, participante_id, tipo, titulo, enlace)
    select p.user_id, p.id, 'desafio_nuevo', left('Nuevo desafío en la Comunidad: «' || new.titulo || '»', 120),
           '/mi-espacio/comunidad/'
      from public.participantes p join public.alias a on a.participante_id = p.id
     where p.user_id is not null and p.estado = 'activo' and a.reglas_comunidad_en is not null
       and privado.quiere(p.id, 'comunidad');
  end if;
  return null;
end $$;
revoke all on function privado.aviso_comunidad() from public, anon, authenticated;

create or replace trigger aviso_comunidad after insert on public.publicaciones
  for each row execute function privado.aviso_comunidad();
create or replace trigger aviso_comunidad after insert or update of activo on public.desafios
  for each row execute function privado.aviso_comunidad();
