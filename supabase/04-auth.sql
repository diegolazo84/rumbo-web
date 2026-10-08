-- Generado desde especificacion-plataforma.md §6. Pegar en el editor SQL de Supabase en orden.

-- Hook «Before User Created» (Authentication → Hooks). VERIFICAR que exista en el plan gratis;
-- si no, se desactiva «Allow new users to sign up» y Diego invita desde Authentication → Users.
create or replace function privado.antes_de_crear_usuario(event jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v extensions.citext := lower(event->'user'->>'email');
begin
  if exists (select 1 from public.participantes where correo = v and estado <> 'cerrado')
     or exists (select 1 from privado.correos_equipo where correo = v) then
    return '{}'::jsonb;
  end if;
  -- El mensaje no se muestra: la pantalla de ingreso responde siempre igual (4.2).
  return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'no_invitado'));
end $$;
grant usage on schema privado to supabase_auth_admin;
grant execute on function privado.antes_de_crear_usuario(jsonb) to supabase_auth_admin;
revoke execute on function privado.antes_de_crear_usuario(jsonb) from public, anon, authenticated;

-- Vincula la cuenta con su ficha la primera vez que entra
create or replace function privado.vincular_cuenta() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.participantes set user_id = new.id,
         estado = case when estado = 'invitado' then 'activo' else estado end
   where correo = lower(new.email)::extensions.citext and user_id is null;
  return new;
end $$;
create or replace trigger al_crear_usuario after insert on auth.users
  for each row execute function privado.vincular_cuenta();

insert into privado.correos_equipo values ('SU_CORREO');
-- después de su primer ingreso por /mi-espacio/entrar/:
insert into public.equipo (user_id, nombre) select id, 'Diego' from auth.users where email = 'SU_CORREO';
