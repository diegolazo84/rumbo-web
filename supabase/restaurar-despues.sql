-- Restauración de un respaldo (docs/respaldo-y-restauracion.md), paso «después».
-- Lo que el respaldo no trae porque vive fuera de public y privado:
-- 1. El disparador que vincula una cuenta nueva con su ficha (04-auth.sql), que está en auth.users.
create or replace trigger al_crear_usuario after insert on auth.users
  for each row execute function privado.vincular_cuenta();
-- 2. Las tareas programadas: en una restauración REAL (no en la prueba) se pega después 06-cron.sql.
-- 3. Lo que es configuración del proyecto y se rehace en el panel de Supabase: hook
--    «Before User Created» (privado.antes_de_crear_usuario), SMTP de Brevo, plantillas de correo,
--    código de 6 dígitos, Site URL, segundo factor TOTP y el secreto ntfy_tema en Vault.
