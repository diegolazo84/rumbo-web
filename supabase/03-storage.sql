-- Generado desde especificacion-plataforma.md §6. Pegar en el editor SQL de Supabase en orden.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidencias', 'evidencias', false, 4194304, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Ruta obligatoria: {participante_id}/{ocurrencia_id}/{uuid}.webp
create or replace function privado.foto_permitida(p_nombre text, p_subir boolean) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare v_part text := split_part(p_nombre, '/', 1); v_oc text := split_part(p_nombre, '/', 2);
        v_yo uuid := privado.mi_participante_id(); v_hoy date; v_ventana int;
begin
  if v_part !~ '^[0-9a-f-]{36}$' or v_oc !~ '^[0-9a-f-]{36}$' then return false; end if;
  if not p_subir then return v_part = v_yo::text or privado.es_admin(); end if;
  if v_part <> v_yo::text then return false; end if;
  v_hoy := privado.hoy_de(v_yo);
  select dias_registro_tardio into v_ventana from public.ajustes_operacion;
  return exists (select 1 from public.ocurrencias o where o.id = v_oc::uuid and o.participante_id = v_yo
                   and o.requiere_foto and o.vigente and o.fecha between v_hoy - v_ventana and v_hoy)
     and (select count(*) from storage.objects s
           where s.bucket_id = 'evidencias' and s.name like v_part || '/' || v_oc || '/%') < 3;
end $$;
grant execute on function privado.foto_permitida(text, boolean) to authenticated;

create policy evid_subir  on storage.objects for insert to authenticated
  with check (bucket_id = 'evidencias' and privado.foto_permitida(name, true));
create policy evid_ver    on storage.objects for select to authenticated
  using (bucket_id = 'evidencias' and privado.foto_permitida(name, false));
create policy evid_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'evidencias' and privado.foto_permitida(name, false));
-- Sin política de UPDATE: no se sobrescribe; reemplazar = subir otra y borrar la anterior.
