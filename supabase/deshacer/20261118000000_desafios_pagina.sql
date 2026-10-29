-- Deshace 20261118000000_desafios_pagina.sql: se borran las propuestas de desafío (con su
-- historial) y la actividad propia; la copia de datos vuelve a la versión de C13.
drop function public.mi_actividad_desafios();
drop function public.responder_propuesta_desafio(uuid, text);
drop function public.propuestas_desafio_equipo();
drop function public.mis_propuestas_desafio();
drop function public.proponer_desafio(text, text);
drop table public.propuestas_desafio;

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
    'especialistas_vinculos', (select jsonb_agg(to_jsonb(x)) from public.vinculos_especialista x, yo where x.participante_id = yo.id),
    'especialistas_reservas', (select jsonb_agg(to_jsonb(x) - 'comision_pct' - 'comision_clp') from public.reservas_especialista x, yo
                                where x.participante_id = yo.id),
    'especialistas_recomendaciones', (select jsonb_agg(to_jsonb(x)) from public.recomendaciones_especialista x, yo where x.participante_id = yo.id),
    'especialistas_mensajes', (select jsonb_agg(to_jsonb(x)) from public.mensajes_especialista x, yo where x.participante_id = yo.id),
    'comunidad_reacciones', (select jsonb_agg(to_jsonb(x)) from public.reacciones_comunidad x, yo where x.participante_id = yo.id),
    'comunidad_grupos', (select jsonb_agg(jsonb_build_object('grupo', g.nombre, 'unido_en', m.unido_en))
                          from public.miembros_grupo m join public.grupos_comunidad g on g.id = m.grupo_id, yo where m.participante_id = yo.id),
    'comunidad_guardadas', (select jsonb_agg(to_jsonb(x)) from public.guardadas_comunidad x, yo where x.participante_id = yo.id),
    'comunidad_bloqueos', (select jsonb_agg(jsonb_build_object('alias', a.alias, 'desde', b.creado_en))
                            from public.bloqueos_comunidad b join public.alias a on a.participante_id = b.bloqueado, yo where b.bloqueador = yo.id),
    'desafios', (select jsonb_agg(jsonb_build_object('desafio', d.titulo, 'unido_en', x.unido_en))
                  from public.participaciones_desafio x join public.desafios d on d.id = x.desafio_id, yo where x.participante_id = yo.id),
    'propuestas_grupo', (select jsonb_agg(to_jsonb(x) - 'participante_id' - 'respondida_por') from public.propuestas_grupo x, yo where x.participante_id = yo.id),
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;
