-- C16 · Fotografía de portada opcional por desafío, cargada por el equipo desde el panel.
--   · Bucket privado «desafios» (máx. 2 MB; jpeg, png o webp). Ruta: <id del desafío>/<uuid>.<ext>.
--   · Sube y borra solo moderación (dueño o coach con permiso, con segundo factor).
--   · La ven quienes moderan y quienes participan en Comunidad, solo si es la foto vigente de un
--     desafío activo. Sin foto, la pantalla usa la ilustración de siempre.
--   · No toca acciones, créditos, rachas, niveles ni beneficios.

alter table public.desafios add column foto_ruta text
  check (foto_ruta is null or foto_ruta ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|png)$');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('desafios', 'desafios', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function privado.foto_desafio_permitida(p_nombre text, p_accion text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_nombre !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg|png)$' then return false; end if;
  if p_accion in ('subir', 'borrar') then
    -- Solo moderación y solo en la carpeta de un desafío que existe.
    return privado.puede_moderar()
       and exists (select 1 from public.desafios d where d.id::text = split_part(p_nombre, '/', 1));
  end if;
  if privado.puede_moderar() then return true; end if;
  return privado.participa_en_comunidad()
     and exists (select 1 from public.desafios d where d.foto_ruta = p_nombre and d.activo);
end $$;
revoke execute on function privado.foto_desafio_permitida(text, text) from public, anon, authenticated;
grant execute on function privado.foto_desafio_permitida(text, text) to authenticated;

create policy desafios_subir  on storage.objects for insert to authenticated
  with check (bucket_id = 'desafios' and privado.foto_desafio_permitida(name, 'subir'));
create policy desafios_ver    on storage.objects for select to authenticated
  using (bucket_id = 'desafios' and privado.foto_desafio_permitida(name, 'ver'));
create policy desafios_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'desafios' and privado.foto_desafio_permitida(name, 'borrar'));

-- Poner o quitar la foto (null la quita). La foto tiene que estar ya subida en la carpeta del
-- desafío. Devuelve la ruta anterior para que el panel la borre del bucket.
create or replace function public.poner_foto_desafio(p_desafio uuid, p_ruta text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_antes text;
begin
  if not privado.puede_moderar() then perform privado.error('sesion','no_autorizado','403'); end if;
  select d.foto_ruta into v_antes from public.desafios d where d.id = p_desafio for update;
  if not found then perform privado.error('desafio','no_encontrado','404'); end if;
  if p_ruta is not null and (split_part(p_ruta, '/', 1) <> p_desafio::text
     or not exists (select 1 from storage.objects o where o.bucket_id = 'desafios' and o.name = p_ruta)) then
    perform privado.error('foto','invalida'); end if;
  update public.desafios set foto_ruta = p_ruta where id = p_desafio;  -- queda en auditoría (trigger)
  return v_antes;
end $$;
revoke all on function public.poner_foto_desafio(uuid, text) from public, anon, authenticated;
grant execute on function public.poner_foto_desafio(uuid, text) to authenticated;

-- comunidad_desafios() suma foto_ruta al final (misma lógica de C9). Cambia el tipo de retorno,
-- así que se reemplaza con drop + create y se vuelven a dar los permisos.
drop function public.comunidad_desafios();
create function public.comunidad_desafios()
returns table (id uuid, titulo text, descripcion text, reglas text, dias int, inicio date, fin date, ilustracion text,
               activo boolean, participantes int, participo boolean, dias_cumplidos int, dias_transcurridos int, completado boolean,
               foto_ruta text)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid; v_mod boolean := privado.puede_moderar(); v_hoy date := privado.hoy_chile();
begin
  if v_mod then v_yo := privado.mi_participante_id(); else v_yo := privado.en_comunidad(); end if;
  return query
  select d.id, d.titulo, d.descripcion, d.reglas, d.dias::int, d.inicio, (d.inicio + d.dias - 1), d.ilustracion, d.activo,
         (select count(*)::int from public.participaciones_desafio x where x.desafio_id = d.id),
         p.participante_id is not null,
         case when p.participante_id is not null then privado.dias_cumplidos_desafio(d.id, v_yo) else 0 end,
         greatest(0, least(d.dias, v_hoy - d.inicio + 1))::int,
         p.participante_id is not null and privado.dias_cumplidos_desafio(d.id, v_yo) >= d.dias,
         d.foto_ruta
    from public.desafios d
    left join public.participaciones_desafio p on p.desafio_id = d.id and p.participante_id = v_yo
   where d.activo or v_mod
   order by (v_hoy > d.inicio + d.dias - 1), d.inicio;
end $$;
revoke all on function public.comunidad_desafios() from public, anon, authenticated;
grant execute on function public.comunidad_desafios() to authenticated;
