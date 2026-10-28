-- Deshace 20261031000000_fotos_en_cualquier_accion.sql
create or replace function privado.foto_permitida(p_nombre text, p_subir boolean) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare v_part text := split_part(p_nombre, '/', 1); v_oc text := split_part(p_nombre, '/', 2);
        v_yo uuid := privado.mi_participante_id(); v_hoy date; v_ventana int;
begin
  if v_part !~ '^[0-9a-f-]{36}$' or v_oc !~ '^[0-9a-f-]{36}$' then return false; end if;
  if not p_subir then return v_part = v_yo::text or privado.gestiona(v_part::uuid); end if;
  if v_part <> v_yo::text then return false; end if;
  v_hoy := privado.hoy_de(v_yo);
  select dias_registro_tardio into v_ventana from public.ajustes_operacion;
  return exists (select 1 from public.ocurrencias o where o.id = v_oc::uuid and o.participante_id = v_yo
                   and o.requiere_foto and o.vigente and o.fecha between v_hoy - v_ventana and v_hoy)
     and (select count(*) from storage.objects s
           where s.bucket_id = 'evidencias' and s.name like v_part || '/' || v_oc || '/%') < 3;
end $$;
drop function if exists public.quitar_foto(uuid);
drop function if exists public.adjuntar_foto(uuid, text);
