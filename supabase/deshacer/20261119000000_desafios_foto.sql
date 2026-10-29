-- Deshace 20261119000000_desafios_foto.sql: vuelve comunidad_desafios de C9, se quitan la función,
-- las políticas y la columna. Antes, vaciar el bucket «desafios» desde el panel de Supabase
-- (Storage) o con la API: Supabase no deja borrar filas de storage.objects con SQL.
drop function public.poner_foto_desafio(uuid, text);
drop policy desafios_subir on storage.objects;
drop policy desafios_ver on storage.objects;
drop policy desafios_borrar on storage.objects;
drop function privado.foto_desafio_permitida(text, text);
delete from storage.buckets where id = 'desafios';
drop function public.comunidad_desafios();
create function public.comunidad_desafios()
returns table (id uuid, titulo text, descripcion text, reglas text, dias int, inicio date, fin date, ilustracion text,
               activo boolean, participantes int, participo boolean, dias_cumplidos int, dias_transcurridos int, completado boolean)
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
         p.participante_id is not null and privado.dias_cumplidos_desafio(d.id, v_yo) >= d.dias
    from public.desafios d
    left join public.participaciones_desafio p on p.desafio_id = d.id and p.participante_id = v_yo
   where d.activo or v_mod
   order by (v_hoy > d.inicio + d.dias - 1), d.inicio;
end $$;
revoke all on function public.comunidad_desafios() from public, anon, authenticated;
grant execute on function public.comunidad_desafios() to authenticated;
alter table public.desafios drop column foto_ruta;
