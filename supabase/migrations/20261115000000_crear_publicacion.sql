-- C11 · Crear publicación (maqueta de ChatGPT, 22-oct-2026).
-- Lo que la pantalla nueva necesita y la base aún no tenía:
--  · Hasta 5 fotos por publicación (`fotos`). `foto_ruta` se mantiene como la primera, para que
--    lo que ya lee una sola foto siga igual. Cada foto: en la carpeta de quien publica y ya subida.
--  · «Permitir comentarios»: si quien publica lo apaga, nadie más puede responder, tampoco con una
--    llamada directa a la base (las personas no escriben en la tabla: solo por esta función).
--  · Sin publicaciones duplicadas: la pantalla manda un identificador por intento (`cliente_id`);
--    si llega dos veces (doble clic, reintento por mala señal) se devuelve la misma publicación.
--  · Ver fotos: igual que antes, solo si la persona puede ver la publicación (grupo, bloqueos,
--    moderación). Ninguna foto suelta es visible para otros.
-- No cambia el tope de 20 al día, los tipos, el largo (1000), los créditos, niveles ni rachas.

alter table public.publicaciones
  add column fotos text[] not null default '{}' check (cardinality(fotos) <= 5),
  add column permite_comentarios boolean not null default true,
  add column cliente_id uuid;
alter table public.publicaciones add constraint publicaciones_fotos_sin_respuesta
  check (respuesta_a is null or cardinality(fotos) = 0);
create unique index publicaciones_cliente on public.publicaciones (autor, cliente_id) where cliente_id is not null;
update public.publicaciones set fotos = array[foto_ruta] where foto_ruta is not null;

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
    select 1 from public.publicaciones x where (x.foto_ruta = p_nombre or p_nombre = any(x.fotos)) and privado.ve_publicacion(x.id, v_yo));
end $$;

-- Publicar: tipo, texto, destino, hasta 5 fotos, permitir comentarios y sin duplicados.
-- p_foto_ruta sigue aceptándose (una foto) para lo que aún la usa.
drop function public.publicar_en_comunidad(text, uuid, uuid, text, text);
create function public.publicar_en_comunidad(p_texto text, p_respuesta_a uuid default null,
  p_grupo uuid default null, p_foto_ruta text default null, p_tipo text default 'general',
  p_fotos text[] default null, p_permite_comentarios boolean default true, p_cliente_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.en_comunidad(); v_id uuid; v_texto text := btrim(p_texto); v_grupo uuid := p_grupo;
        v_tipo text := coalesce(nullif(p_tipo, ''), 'general'); v_fotos text[]; v_foto text;
begin
  -- Mismo intento que ya llegó: la misma publicación, sin crear otra.
  if p_cliente_id is not null then
    select x.id into v_id from public.publicaciones x where x.autor = v_yo and x.cliente_id = p_cliente_id;
    if v_id is not null then return v_id; end if;
  end if;
  select coalesce(array_agg(distinct f), '{}') into v_fotos
    from unnest(coalesce(p_fotos, case when p_foto_ruta is not null then array[p_foto_ruta] end)) f where f is not null;
  if v_texto is null or char_length(v_texto) not between 1 and 1000 then perform privado.error('texto','invalido'); end if;
  if v_tipo not in ('general','progreso','pregunta','consejo','logro') then perform privado.error('tipo','invalido'); end if;
  if cardinality(v_fotos) > 5 then perform privado.error('fotos','demasiadas'); end if;
  if p_respuesta_a is not null then
    if cardinality(v_fotos) > 0 then perform privado.error('foto','solo_publicaciones'); end if;
    if v_tipo <> 'general' then perform privado.error('tipo','solo_publicaciones'); end if;
    if not exists (select 1 from public.publicaciones x where x.id = p_respuesta_a and x.respuesta_a is null)
       or not privado.ve_publicacion(p_respuesta_a, v_yo) then
      perform privado.error('publicacion','no_encontrada','404');
    end if;
    -- Comentarios cerrados por quien publicó: solo esa persona puede seguir respondiendo.
    if exists (select 1 from public.publicaciones x where x.id = p_respuesta_a and not x.permite_comentarios and x.autor <> v_yo) then
      perform privado.error('comentarios','cerrados','403');
    end if;
    select grupo_id into v_grupo from public.publicaciones where id = p_respuesta_a;
  elsif v_grupo is not null and not exists (
      select 1 from public.miembros_grupo m join public.grupos_comunidad g on g.id = m.grupo_id
       where m.grupo_id = v_grupo and m.participante_id = v_yo and g.activo) then
    perform privado.error('grupo','no_miembro','403');
  end if;
  foreach v_foto in array v_fotos loop
    if v_foto !~ ('^' || v_yo::text || '/[0-9a-f-]{36}\.(webp|jpg|png)$')
       or not exists (select 1 from storage.objects s where s.bucket_id = 'comunidad' and s.name = v_foto) then
      perform privado.error('foto','ruta_invalida');
    end if;
  end loop;
  if (select count(*) from public.publicaciones x where x.autor = v_yo and x.creada_en > now() - interval '24 hours') >= 20 then
    perform privado.error('comunidad','demasiadas','429');
  end if;
  insert into public.publicaciones (autor, respuesta_a, texto, grupo_id, foto_ruta, fotos, tipo, permite_comentarios, cliente_id)
  values (v_yo, p_respuesta_a, v_texto, v_grupo, v_fotos[1], v_fotos, v_tipo,
          case when p_respuesta_a is null then coalesce(p_permite_comentarios, true) else true end, p_cliente_id)
  returning id into v_id;
  return v_id;
end $$;

-- Lo que ve una persona: lo de antes más todas las fotos y si acepta comentarios.
drop function public.comunidad_publicaciones(uuid, timestamptz, integer, uuid, boolean, text, boolean, text);
create function public.comunidad_publicaciones(p_hilo uuid default null, p_antes timestamptz default null,
  p_limite integer default 30, p_grupo uuid default null, p_solo_mis_grupos boolean default false,
  p_tipo text default null, p_solo_guardadas boolean default false, p_tema text default null)
returns table (id uuid, respuesta_a uuid, alias_publico text, texto text, creada_en timestamptz, mia boolean, respuestas int,
               grupo_id uuid, grupo_titulo text, foto_ruta text, reacciones int, mi_reaccion boolean, tipo text, guardada boolean,
               fotos text[], permite_comentarios boolean)
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
         exists (select 1 from public.guardadas_comunidad s where s.publicacion_id = x.id and s.participante_id = v_yo),
         x.fotos, x.permite_comentarios
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

revoke all on function public.publicar_en_comunidad(text, uuid, uuid, text, text, text[], boolean, uuid),
  public.comunidad_publicaciones(uuid, timestamptz, integer, uuid, boolean, text, boolean, text) from public, anon, authenticated;
grant execute on function public.publicar_en_comunidad(text, uuid, uuid, text, text, text[], boolean, uuid),
  public.comunidad_publicaciones(uuid, timestamptz, integer, uuid, boolean, text, boolean, text) to authenticated;
