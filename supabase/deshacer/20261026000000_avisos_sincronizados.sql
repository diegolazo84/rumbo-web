-- Deshace migrations/20261026000000_avisos_sincronizados.sql (A5). Borra los avisos guardados.
begin;
drop trigger if exists aviso_app on public.revisiones;
drop trigger if exists aviso_app on public.solicitudes_ajuste;
drop trigger if exists aviso_app on public.programas;
drop trigger if exists aviso_app on public.registros_semanales;
drop function if exists public.marcar_avisos_leidos(uuid[]);
drop function if exists privado.aviso_app();
drop function if exists privado.avisar_app(uuid, boolean, text, text, text);
drop function if exists privado.equipo_de(uuid);
drop table if exists public.avisos;
commit;
