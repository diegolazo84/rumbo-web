-- Deshace 20261030000000_invitar_coaches.sql (los correos invitados que no entraron se quitan de la lista).
delete from privado.correos_equipo c where exists (select 1 from public.invitaciones_equipo i
  where i.correo = c.correo and i.aceptada_en is null)
  and not exists (select 1 from public.equipo e join auth.users u on u.id = e.user_id where lower(u.email) = c.correo::text);
drop function if exists public.cambiar_coach(uuid, boolean, boolean);
drop function if exists public.aceptar_invitacion_equipo();
drop function if exists public.revocar_invitacion(uuid);
drop function if exists public.invitar_coach(text, text, boolean);
drop table if exists public.invitaciones_equipo;
