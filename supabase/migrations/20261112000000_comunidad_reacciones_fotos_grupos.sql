-- C7 · Comunidad con la referencia de ChatGPT (21-oct-2026): reacciones, foto opcional y grupos.
-- Se mantiene todo lo de C6 (módulo «comunidad» habilitado por el dueño, alias, reglas, reportes,
-- moderación con motivo, tope de 20 publicaciones al día) y se suma:
--  · Reacción de apoyo («me gusta»): una por persona y publicación; se quita con el mismo botón.
--    Solo se ve cuántas hay y si la propia está puesta: nunca quién reaccionó.
--  · Foto opcional en una publicación (no en las respuestas). Bucket privado «comunidad»: la ven
--    solo quienes participan (módulo habilitado, alias y reglas) mientras la publicación esté
--    visible; el autor y moderación siempre. Ruta: {participante_id}/{uuid}.{webp|jpg|png}.
--  · Grupos: los crea y cierra moderación (dueño o coach con permiso). Cada persona se une o sale.
--    Lo publicado en un grupo lo ven solo sus miembros (y moderación). Las respuestas heredan el grupo.
-- No hay ranking de popularidad ni recomendaciones: «Todos» es lo general y lo de mis grupos.

-- ---------------------------------------------------------------------------
-- Grupos

create table public.grupos_comunidad (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) between 2 and 60),
  descripcion text check (char_length(descripcion) <= 200),
  activo boolean not null default true,
  creado_por uuid,
  creado_en timestamptz not null default now()
);
create unique index grupos_comunidad_nombre on public.grupos_comunidad (lower(btrim(nombre)));
alter table public.grupos_comunidad enable row level security;
revoke all on public.grupos_comunidad from anon, authenticated;
grant select on public.grupos_comunidad to authenticated;
create policy moderacion_leer on public.grupos_comunidad for select to authenticated using (privado.puede_moderar());
create or replace trigger auditar after insert or update or delete on public.grupos_comunidad
  for each row execute function privado.auditar_cambio();

create table public.miembros_grupo (
  grupo_id uuid not null references public.grupos_comunidad(id) on delete cascade,
  participante_id uuid not null references public.participantes(id) on delete cascade,
  unido_en timestamptz not null default now(),
  primary key (grupo_id, participante_id)
);
alter table public.miembros_grupo enable row level security;
revoke all on public.miembros_grupo from anon, authenticated;
grant select on public.miembros_grupo to authenticated;
create policy moderacion_leer on public.miembros_grupo for select to authenticated using (privado.puede_moderar());

alter table public.publicaciones
  add column grupo_id uuid references public.grupos_comunidad(id) on delete set null,
  add column foto_ruta text check (foto_ruta ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|png)$');
alter table public.publicaciones add constraint publicaciones_foto_del_autor
  check (foto_ruta is null or split_part(foto_ruta, '/', 1) = autor::text);
alter table public.publicaciones add constraint publicaciones_foto_sin_respuesta
  check (foto_ruta is null or respuesta_a is null);
create index publicaciones_grupo on public.publicaciones (grupo_id, creada_en desc) where respuesta_a is null;

-- ---------------------------------------------------------------------------
-- Reacciones

create table public.reacciones_comunidad (
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  participante_id uuid not null references public.participantes(id) on delete cascade,
  creada_en timestamptz not null default now(),
  primary key (publicacion_id, participante_id)
);
alter table public.reacciones_comunidad enable row level security;
revoke all on public.reacciones_comunidad from anon, authenticated;
grant select on public.reacciones_comunidad to authenticated;
create policy moderacion_leer on public.reacciones_comunidad for select to authenticated using (privado.puede_moderar());

-- ¿Ve quien llama esta publicación? Visible y, si es de un grupo, siendo miembro (o moderación).
create or replace function privado.ve_publicacion(p_id uuid, p_yo uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.publicaciones x
                  where x.id = p_id and x.estado = 'visible'
                    and (x.grupo_id is null or privado.puede_moderar()
                         or exists (select 1 from public.miembros_grupo m where m.grupo_id = x.grupo_id and m.participante_id = p_yo)));
$$;
revoke execute on function privado.ve_publicacion(uuid, uuid) from public, anon, authenticated;

-- Participa sin cortar (para las políticas de Storage): módulo visible, ficha activa, alias y reglas.
create or replace function privado.participa_en_comunidad() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.modulo_visible('comunidad') and exists (
    select 1 from public.alias a join public.participantes p on p.id = a.participante_id
     where a.participante_id = privado.mi_participante_id() and p.estado = 'activo' and a.reglas_comunidad_en is not null);
$$;

-- ---------------------------------------------------------------------------
-- Fotos (bucket privado «comunidad»)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comunidad', 'comunidad', false, 4194304, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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
revoke execute on function privado.foto_comunidad_permitida(text, text) from public, anon, authenticated;
grant execute on function privado.foto_comunidad_permitida(text, text) to authenticated;
revoke execute on function privado.participa_en_comunidad() from public, anon, authenticated;

create policy comunidad_subir  on storage.objects for insert to authenticated
  with check (bucket_id = 'comunidad' and privado.foto_comunidad_permitida(name, 'subir'));
create policy comunidad_ver    on storage.objects for select to authenticated
  using (bucket_id = 'comunidad' and privado.foto_comunidad_permitida(name, 'ver'));
create policy comunidad_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'comunidad' and privado.foto_comunidad_permitida(name, 'borrar'));

-- ---------------------------------------------------------------------------
-- Funciones

-- Publicar ahora acepta grupo y foto (opcionales). Reemplaza la firma de C6.
drop function public.publicar_en_comunidad(text, uuid);
create function public.publicar_en_comunidad(p_texto text, p_respuesta_a uuid default null,
  p_grupo uuid default null, p_foto_ruta text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.en_comunidad(); v_id uuid; v_texto text := btrim(p_texto); v_grupo uuid := p_grupo;
begin
  if v_texto is null or char_length(v_texto) not between 1 and 1000 then perform privado.error('texto','invalido'); end if;
  if p_respuesta_a is not null then
    if p_foto_ruta is not null then perform privado.error('foto','solo_publicaciones'); end if;
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
  insert into public.publicaciones (autor, respuesta_a, texto, grupo_id, foto_ruta)
  values (v_yo, p_respuesta_a, v_texto, v_grupo, p_foto_ruta) returning id into v_id;
  return v_id;
end $$;

-- Reaccionar o quitar la reacción. Devuelve si quedó puesta.
create or replace function public.reaccionar_publicacion(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.en_comunidad();
begin
  if not privado.ve_publicacion(p_id, v_yo) then perform privado.error('publicacion','no_encontrada','404'); end if;
  delete from public.reacciones_comunidad where publicacion_id = p_id and participante_id = v_yo;
  if found then return false; end if;
  insert into public.reacciones_comunidad (publicacion_id, participante_id) values (p_id, v_yo);
  return true;
end $$;

-- Grupos: moderación los crea, edita y cierra; las personas se unen o salen.
create or replace function public.guardar_grupo_comunidad(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := nullif(p->>'id', '')::uuid; v_nombre text := btrim(p->>'nombre');
        v_desc text := nullif(btrim(p->>'descripcion'), '');
begin
  if not privado.puede_moderar() then perform privado.error('sesion','no_autorizado','403'); end if;
  if v_nombre is null or char_length(v_nombre) not between 2 and 60 then perform privado.error('nombre','largo'); end if;
  if char_length(v_desc) > 200 then perform privado.error('descripcion','largo'); end if;
  if exists (select 1 from public.grupos_comunidad g where lower(btrim(g.nombre)) = lower(v_nombre) and g.id is distinct from v_id) then
    perform privado.error('nombre','en_uso','409'); end if;
  if v_id is null then
    insert into public.grupos_comunidad (nombre, descripcion, activo, creado_por)
    values (v_nombre, v_desc, coalesce((p->>'activo')::boolean, true), auth.uid()) returning id into v_id;
  else
    update public.grupos_comunidad set nombre = v_nombre, descripcion = v_desc,
           activo = coalesce((p->>'activo')::boolean, activo) where id = v_id;
    if not found then perform privado.error('grupo','no_encontrado','404'); end if;
  end if;
  return v_id;
end $$;

create or replace function public.unirme_a_grupo(p_grupo uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.en_comunidad();
begin
  if not exists (select 1 from public.grupos_comunidad g where g.id = p_grupo and g.activo) then
    perform privado.error('grupo','no_encontrado','404'); end if;
  insert into public.miembros_grupo (grupo_id, participante_id) values (p_grupo, v_yo) on conflict do nothing;
end $$;

create or replace function public.salir_de_grupo(p_grupo uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id();
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  delete from public.miembros_grupo where grupo_id = p_grupo and participante_id = v_yo;
end $$;

-- Grupos que ve una persona: los activos, con cuántos miembros tiene y si es parte.
create or replace function public.comunidad_grupos() returns table (id uuid, nombre text, descripcion text, miembros int, soy_miembro boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid;
begin
  if privado.puede_moderar() then v_yo := privado.mi_participante_id(); else v_yo := privado.en_comunidad(); end if;
  return query
  select g.id, g.nombre, g.descripcion,
         (select count(*)::int from public.miembros_grupo m where m.grupo_id = g.id),
         exists (select 1 from public.miembros_grupo m where m.grupo_id = g.id and m.participante_id = v_yo)
    from public.grupos_comunidad g
   where g.activo or privado.puede_moderar()
   order by g.nombre;
end $$;

-- Lo que ve una persona: publicaciones visibles generales y de sus grupos (o de un grupo, o un hilo),
-- con alias, foto, grupo, respuestas y reacciones. Sin datos de quién es quién.
drop function public.comunidad_publicaciones(uuid, timestamptz, integer);
create function public.comunidad_publicaciones(p_hilo uuid default null, p_antes timestamptz default null,
  p_limite integer default 30, p_grupo uuid default null, p_solo_mis_grupos boolean default false)
returns table (id uuid, respuesta_a uuid, alias_publico text, texto text, creada_en timestamptz, mia boolean, respuestas int,
               grupo_id uuid, grupo_titulo text, foto_ruta text, reacciones int, mi_reaccion boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid; v_mod boolean := privado.puede_moderar();
begin
  if v_mod then v_yo := privado.mi_participante_id(); else v_yo := privado.en_comunidad(); end if;
  return query
  select x.id, x.respuesta_a, a.alias::text, x.texto, x.creada_en, x.autor is not distinct from v_yo,
         (select count(*)::int from public.publicaciones r where r.respuesta_a = x.id and r.estado = 'visible'),
         x.grupo_id, g.nombre, x.foto_ruta,
         (select count(*)::int from public.reacciones_comunidad c where c.publicacion_id = x.id),
         exists (select 1 from public.reacciones_comunidad c where c.publicacion_id = x.id and c.participante_id = v_yo)
    from public.publicaciones x
    join public.alias a on a.participante_id = x.autor
    left join public.grupos_comunidad g on g.id = x.grupo_id
   where x.estado = 'visible'
     and (x.grupo_id is null or v_mod or exists (select 1 from public.miembros_grupo m where m.grupo_id = x.grupo_id and m.participante_id = v_yo))
     and (case when p_hilo is null then x.respuesta_a is null else x.id = p_hilo or x.respuesta_a = p_hilo end)
     and (p_grupo is null or x.grupo_id = p_grupo)
     and (not coalesce(p_solo_mis_grupos, false) or x.grupo_id is not null)
     and (p_antes is null or x.creada_en < p_antes)
   order by case when p_hilo is null then x.creada_en end desc, x.creada_en
   limit least(greatest(coalesce(p_limite, 30), 1), 100);
end $$;

revoke all on function public.publicar_en_comunidad(text, uuid, uuid, text), public.reaccionar_publicacion(uuid),
  public.guardar_grupo_comunidad(jsonb), public.unirme_a_grupo(uuid), public.salir_de_grupo(uuid),
  public.comunidad_grupos(), public.comunidad_publicaciones(uuid, timestamptz, integer, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.publicar_en_comunidad(text, uuid, uuid, text), public.reaccionar_publicacion(uuid),
  public.guardar_grupo_comunidad(jsonb), public.unirme_a_grupo(uuid), public.salir_de_grupo(uuid),
  public.comunidad_grupos(), public.comunidad_publicaciones(uuid, timestamptz, integer, uuid, boolean)
  to authenticated;

-- Las reacciones y los grupos de la persona también van en la copia de sus datos.
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
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;
