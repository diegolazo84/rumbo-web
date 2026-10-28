-- Deshace 20261112000000_comunidad_reacciones_fotos_grupos.sql
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
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;

drop function if exists public.comunidad_publicaciones(uuid, timestamptz, integer, uuid, boolean);
create function public.comunidad_publicaciones(p_hilo uuid default null, p_antes timestamptz default null,
  p_limite integer default 30)
returns table (id uuid, respuesta_a uuid, alias_publico text, texto text, creada_en timestamptz, mia boolean, respuestas int)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid;
begin
  if privado.puede_moderar() then v_yo := privado.mi_participante_id(); else v_yo := privado.en_comunidad(); end if;
  return query
  select x.id, x.respuesta_a, a.alias::text, x.texto, x.creada_en, x.autor is not distinct from v_yo,
         (select count(*)::int from public.publicaciones r where r.respuesta_a = x.id and r.estado = 'visible')
    from public.publicaciones x
    join public.alias a on a.participante_id = x.autor
   where x.estado = 'visible'
     and (case when p_hilo is null then x.respuesta_a is null else x.id = p_hilo or x.respuesta_a = p_hilo end)
     and (p_antes is null or x.creada_en < p_antes)
   order by case when p_hilo is null then x.creada_en end desc, x.creada_en
   limit least(greatest(coalesce(p_limite, 30), 1), 100);
end $$;
drop function if exists public.publicar_en_comunidad(text, uuid, uuid, text);
create function public.publicar_en_comunidad(p_texto text, p_respuesta_a uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.en_comunidad(); v_id uuid; v_texto text := btrim(p_texto);
begin
  if v_texto is null or char_length(v_texto) not between 1 and 1000 then perform privado.error('texto','invalido'); end if;
  if p_respuesta_a is not null and not exists (select 1 from public.publicaciones x where x.id = p_respuesta_a
                                                 and x.respuesta_a is null and x.estado = 'visible') then
    perform privado.error('publicacion','no_encontrada','404');
  end if;
  if (select count(*) from public.publicaciones x where x.autor = v_yo and x.creada_en > now() - interval '24 hours') >= 20 then
    perform privado.error('comunidad','demasiadas','429');
  end if;
  insert into public.publicaciones (autor, respuesta_a, texto) values (v_yo, p_respuesta_a, v_texto) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.publicar_en_comunidad(text, uuid), public.comunidad_publicaciones(uuid, timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.publicar_en_comunidad(text, uuid), public.comunidad_publicaciones(uuid, timestamptz, integer)
  to authenticated;

drop function if exists public.comunidad_grupos();
drop function if exists public.salir_de_grupo(uuid);
drop function if exists public.unirme_a_grupo(uuid);
drop function if exists public.guardar_grupo_comunidad(jsonb);
drop function if exists public.reaccionar_publicacion(uuid);

drop policy if exists comunidad_subir on storage.objects;
drop policy if exists comunidad_ver on storage.objects;
drop policy if exists comunidad_borrar on storage.objects;
drop function if exists privado.foto_comunidad_permitida(text, text);
set storage.allow_delete_query = 'true';
delete from storage.buckets where id = 'comunidad' and not exists (select 1 from storage.objects o where o.bucket_id = 'comunidad');
reset storage.allow_delete_query;

drop function if exists privado.participa_en_comunidad();
drop function if exists privado.ve_publicacion(uuid, uuid);
drop table if exists public.reacciones_comunidad;
drop index if exists public.publicaciones_grupo;
alter table public.publicaciones drop constraint if exists publicaciones_foto_sin_respuesta;
alter table public.publicaciones drop constraint if exists publicaciones_foto_del_autor;
alter table public.publicaciones drop column if exists foto_ruta, drop column if exists grupo_id;
drop table if exists public.miembros_grupo;
drop table if exists public.grupos_comunidad;
