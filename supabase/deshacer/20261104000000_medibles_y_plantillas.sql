-- Deshace 20261104000000_medibles_y_plantillas.sql
drop function if exists public.guardar_plantilla(uuid, jsonb);
drop function if exists public.anotar_cantidad(uuid, integer);
drop function if exists public.mis_medibles(date, date);
drop table if exists public.plantillas_accion;
alter table public.registros drop column if exists cantidad;
alter table public.acciones drop constraint if exists acciones_medible;
alter table public.acciones drop column if exists cantidad_objetivo, drop column if exists unidad;
