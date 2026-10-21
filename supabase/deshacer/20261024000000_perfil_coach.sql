-- Deshace migrations/20261024000000_perfil_coach.sql (A3). Borra las presentaciones escritas.
begin;
drop function if exists public.mi_coach();
drop function if exists public.actualizar_mi_perfil(jsonb);
alter table public.equipo drop column if exists presentacion;
commit;
