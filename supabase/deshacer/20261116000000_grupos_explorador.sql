-- Deshace 20261116000000_grupos_explorador.sql: vuelven las funciones de C8 y C9, se borran las
-- propuestas de grupo (con su historial) y las columnas de destacado y categoría.
drop function public.responder_propuesta_grupo(uuid, text);
drop function public.propuestas_grupo_equipo();
drop function public.mis_propuestas_grupo();
drop function public.proponer_grupo(text, text);
drop table public.propuestas_grupo;

drop function public.comunidad_grupos();
create function public.comunidad_grupos()
returns table (id uuid, nombre text, descripcion text, miembros int, soy_miembro boolean, ilustracion text, publicaciones int, activo boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid; v_mod boolean := privado.puede_moderar();
begin
  if v_mod then v_yo := privado.mi_participante_id(); else v_yo := privado.en_comunidad(); end if;
  return query
  select g.id, g.nombre, g.descripcion,
         (select count(*)::int from public.miembros_grupo m where m.grupo_id = g.id),
         exists (select 1 from public.miembros_grupo m where m.grupo_id = g.id and m.participante_id = v_yo),
         g.ilustracion,
         (select count(*)::int from public.publicaciones x where x.grupo_id = g.id and x.respuesta_a is null and x.estado = 'visible'),
         g.activo
    from public.grupos_comunidad g
   where g.activo or v_mod
   order by g.nombre;
end $$;
revoke all on function public.comunidad_grupos() from public, anon, authenticated;
grant execute on function public.comunidad_grupos() to authenticated;

create or replace function public.guardar_grupo_comunidad(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := nullif(p->>'id', '')::uuid; v_nombre text := btrim(p->>'nombre');
        v_desc text := nullif(btrim(p->>'descripcion'), ''); v_ilus text := nullif(p->>'ilustracion', '');
begin
  if not privado.puede_moderar() then perform privado.error('sesion','no_autorizado','403'); end if;
  if v_nombre is null or char_length(v_nombre) not between 2 and 60 then perform privado.error('nombre','largo'); end if;
  if char_length(v_desc) > 200 then perform privado.error('descripcion','largo'); end if;
  if v_ilus is not null and v_ilus not in ('colinas','brote','atardecer','sendero','lago','montana') then
    perform privado.error('ilustracion','invalida'); end if;
  if exists (select 1 from public.grupos_comunidad g where lower(btrim(g.nombre)) = lower(v_nombre) and g.id is distinct from v_id) then
    perform privado.error('nombre','en_uso','409'); end if;
  if v_id is null then
    insert into public.grupos_comunidad (nombre, descripcion, activo, creado_por, ilustracion)
    values (v_nombre, v_desc, coalesce((p->>'activo')::boolean, true), auth.uid(), v_ilus) returning id into v_id;
  else
    update public.grupos_comunidad set nombre = v_nombre, descripcion = v_desc, ilustracion = v_ilus,
           activo = coalesce((p->>'activo')::boolean, activo) where id = v_id;
    if not found then perform privado.error('grupo','no_encontrado','404'); end if;
  end if;
  return v_id;
end $$;

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
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;


drop index public.grupos_comunidad_un_destacado;
alter table public.grupos_comunidad drop column destacado, drop column categoria;
