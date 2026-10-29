-- Deshace 20261115000000_crear_publicacion.sql: vuelven las funciones de C7 y C8 y se quitan las columnas nuevas.
-- Las publicaciones con varias fotos conservan solo la primera (foto_ruta).
create or replace function privado.foto_comunidad_permitida(p_nombre text, p_accion text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare v_part text := split_part(p_nombre, '/', 1); v_yo uuid := privado.mi_participante_id();
begin
  if p_nombre !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|png)$' then return false; end if;
  if p_accion = 'subir' then
    -- Solo en su carpeta, participando, y con el mismo freno que las publicaciones (20 al día).
    return v_part = v_yo::text and privado.participa_en_comunidad()
       and (select count(*) from storage.objects s where s.bucket_id = 'comunidad' and s.name like v_part || '/%'
              and s.created_at > now() - interval '24 hours') < 20;
  end if;
  if v_part = v_yo::text or privado.puede_moderar() then return true; end if;
  if p_accion = 'borrar' then return false; end if;
  return privado.participa_en_comunidad() and exists (
    select 1 from public.publicaciones x where x.foto_ruta = p_nombre and privado.ve_publicacion(x.id, v_yo));
end $$;

drop function public.publicar_en_comunidad(text, uuid, uuid, text, text, text[], boolean, uuid);
create function public.publicar_en_comunidad(p_texto text, p_respuesta_a uuid default null,
  p_grupo uuid default null, p_foto_ruta text default null, p_tipo text default 'general') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.en_comunidad(); v_id uuid; v_texto text := btrim(p_texto); v_grupo uuid := p_grupo;
        v_tipo text := coalesce(nullif(p_tipo, ''), 'general');
begin
  if v_texto is null or char_length(v_texto) not between 1 and 1000 then perform privado.error('texto','invalido'); end if;
  if v_tipo not in ('general','progreso','pregunta','consejo','logro') then perform privado.error('tipo','invalido'); end if;
  if p_respuesta_a is not null then
    if p_foto_ruta is not null then perform privado.error('foto','solo_publicaciones'); end if;
    if v_tipo <> 'general' then perform privado.error('tipo','solo_publicaciones'); end if;
    if not exists (select 1 from public.publicaciones x where x.id = p_respuesta_a and x.respuesta_a is null)
       or not privado.ve_publicacion(p_respuesta_a, v_yo) then
      perform privado.error('publicacion','no_encontrada','404');
    end if;
    select grupo_id into v_grupo from public.publicaciones where id = p_respuesta_a;
  elsif v_grupo is not null and not exists (
      select 1 from public.miembros_grupo m join public.grupos_comunidad g on g.id = m.grupo_id
       where m.grupo_id = v_grupo and m.participante_id = v_yo and g.activo) then
    perform privado.error('grupo','no_miembro','403');
  end if;
  if p_foto_ruta is not null and (split_part(p_foto_ruta, '/', 1) <> v_yo::text
     or not exists (select 1 from storage.objects s where s.bucket_id = 'comunidad' and s.name = p_foto_ruta)) then
    perform privado.error('foto','ruta_invalida');
  end if;
  if (select count(*) from public.publicaciones x where x.autor = v_yo and x.creada_en > now() - interval '24 hours') >= 20 then
    perform privado.error('comunidad','demasiadas','429');
  end if;
  insert into public.publicaciones (autor, respuesta_a, texto, grupo_id, foto_ruta, tipo)
  values (v_yo, p_respuesta_a, v_texto, v_grupo, p_foto_ruta, v_tipo) returning id into v_id;
  return v_id;
end $$;

drop function public.comunidad_publicaciones(uuid, timestamptz, integer, uuid, boolean, text, boolean, text);
create function public.comunidad_publicaciones(p_hilo uuid default null, p_antes timestamptz default null,
  p_limite integer default 30, p_grupo uuid default null, p_solo_mis_grupos boolean default false,
  p_tipo text default null, p_solo_guardadas boolean default false, p_tema text default null)
returns table (id uuid, respuesta_a uuid, alias_publico text, texto text, creada_en timestamptz, mia boolean, respuestas int,
               grupo_id uuid, grupo_titulo text, foto_ruta text, reacciones int, mi_reaccion boolean, tipo text, guardada boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid; v_mod boolean := privado.puede_moderar(); v_tema text := lower(nullif(btrim(p_tema, ' #'), ''));
begin
  if v_mod then v_yo := privado.mi_participante_id(); else v_yo := privado.en_comunidad(); end if;
  return query
  select x.id, x.respuesta_a, a.alias::text, x.texto, x.creada_en, x.autor is not distinct from v_yo,
         (select count(*)::int from public.publicaciones r where r.respuesta_a = x.id and r.estado = 'visible'
            and (v_mod or not privado.bloqueados_entre(r.autor, v_yo))),
         x.grupo_id, g.nombre, x.foto_ruta,
         (select count(*)::int from public.reacciones_comunidad c where c.publicacion_id = x.id),
         exists (select 1 from public.reacciones_comunidad c where c.publicacion_id = x.id and c.participante_id = v_yo),
         x.tipo,
         exists (select 1 from public.guardadas_comunidad s where s.publicacion_id = x.id and s.participante_id = v_yo)
    from public.publicaciones x
    join public.alias a on a.participante_id = x.autor
    left join public.grupos_comunidad g on g.id = x.grupo_id
   where x.estado = 'visible'
     and (x.grupo_id is null or v_mod or exists (select 1 from public.miembros_grupo m where m.grupo_id = x.grupo_id and m.participante_id = v_yo))
     and (v_mod or not privado.bloqueados_entre(x.autor, v_yo))
     and (case when p_hilo is null then x.respuesta_a is null else x.id = p_hilo or x.respuesta_a = p_hilo end)
     and (p_grupo is null or x.grupo_id = p_grupo)
     and (not coalesce(p_solo_mis_grupos, false) or x.grupo_id is not null)
     and (p_tipo is null or x.tipo = p_tipo)
     and (not coalesce(p_solo_guardadas, false)
          or exists (select 1 from public.guardadas_comunidad s where s.publicacion_id = x.id and s.participante_id = v_yo))
     and (v_tema is null or lower(x.texto) ~ ('#' || regexp_replace(v_tema, '([^[:alnum:]])', '\\\1', 'g') || '($|[^[:alnum:]_])'))
     and (p_antes is null or x.creada_en < p_antes)
   order by case when p_hilo is null then x.creada_en end desc, x.creada_en
   limit least(greatest(coalesce(p_limite, 30), 1), 100);
end $$;

revoke all on function public.publicar_en_comunidad(text, uuid, uuid, text, text),
  public.comunidad_publicaciones(uuid, timestamptz, integer, uuid, boolean, text, boolean, text) from public, anon, authenticated;
grant execute on function public.publicar_en_comunidad(text, uuid, uuid, text, text),
  public.comunidad_publicaciones(uuid, timestamptz, integer, uuid, boolean, text, boolean, text) to authenticated;

drop index public.publicaciones_cliente;
alter table public.publicaciones drop constraint publicaciones_fotos_sin_respuesta;
alter table public.publicaciones drop column cliente_id, drop column permite_comentarios, drop column fotos;
