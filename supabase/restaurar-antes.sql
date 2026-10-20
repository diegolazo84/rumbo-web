-- Restauración de un respaldo (docs/respaldo-y-restauracion.md), paso «antes».
-- Se pega SOLO en un proyecto NUEVO y vacío, antes de restaurar esquema-*.sql y datos-*.sql.
-- Por qué: un proyecto nuevo de Supabase da permisos a anon y authenticated sobre todo lo que
-- se crea en public. El respaldo trae los permisos que se dieron, pero no los que se quitaron,
-- así que sin esto lo restaurado quedaría más abierto que producción (lo detectó la primera
-- restauración de prueba, el 12 de octubre de 2026). Mismas reglas que migrations/20261008000000_esquema.sql.

create extension if not exists citext   with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net;
create extension if not exists pg_cron;

alter default privileges for role postgres in schema public  revoke all     on tables    from anon, authenticated;
alter default privileges for role postgres in schema public  revoke all     on sequences from anon, authenticated;
alter default privileges for role postgres in schema public  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;
