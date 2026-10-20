-- Restauración de un respaldo (docs/respaldo-y-restauracion.md), paso «después».
-- Lo que el respaldo no trae porque vive fuera de public y privado:
-- 1. El disparador que vincula una cuenta nueva con su ficha (migrations/20261008000004_auth.sql), que está en auth.users.
create or replace trigger al_crear_usuario after insert on auth.users
  for each row execute function privado.vincular_cuenta();
-- 2. Las tareas programadas: en una restauración REAL (no en la prueba) se pega después migrations/20261008000006_cron.sql.
-- 3. Lo que es configuración del proyecto y se rehace en el panel de Supabase: hook
--    «Before User Created» (privado.antes_de_crear_usuario), SMTP de Brevo, plantillas de correo,
--    código de 6 dígitos, Site URL, segundo factor TOTP y el secreto ntfy_tema en Vault.

-- Si el proyecto nuevo se creó con «Enable automatic RLS», Supabase agrega la función
-- public.rls_auto_enable() ejecutable por anon (lo detectó la segunda restauración de prueba,
-- el 12 de octubre de 2026). No es de Rumbo: se le quita el permiso para que coincida con producción.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
