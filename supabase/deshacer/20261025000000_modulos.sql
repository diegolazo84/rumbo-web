-- Deshace migrations/20261025000000_modulos.sql (A4).
begin;
drop function if exists public.cambiar_modulo(text, text, text, text);
drop function if exists public.modulo_visible(text);
drop table if exists public.modulos;
commit;
