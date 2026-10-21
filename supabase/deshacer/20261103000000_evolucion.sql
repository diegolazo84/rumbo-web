-- Deshace 20261103000000_evolucion.sql
drop function if exists public.informe_ciclo(uuid);
drop function if exists public.evolucion_semanal(uuid);
drop function if exists privado.puede_ver_evolucion(uuid);
