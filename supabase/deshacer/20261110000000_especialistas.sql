-- Deshace 20261110000000_especialistas.sql
drop function if exists public.especialistas_publicados(text);
drop function if exists public.enviar_perfil_a_revision();
drop function if exists public.guardar_servicio_especialista(uuid, jsonb);
drop function if exists public.agregar_credencial(text, text, text, text);
drop function if exists public.guardar_perfil_especialista(jsonb);
drop function if exists public.aceptar_invitacion_especialista();
drop function if exists public.guardar_especialidad(text, text, boolean);
drop function if exists public.guardar_config_especialistas(jsonb);
drop function if exists public.decidir_especialista(uuid, text, text);
drop function if exists public.revisar_credencial(uuid, boolean, text);
drop function if exists public.invitar_especialista(text, text);
drop function if exists privado.mi_especialista_id();
delete from privado.correos_equipo c using public.especialistas e
 where c.correo = e.correo and not exists (select 1 from public.equipo q join auth.users u on u.id = q.user_id where lower(u.email) = e.correo::text);
drop table if exists public.especialistas_servicios;
drop table if exists public.especialistas_credenciales;
drop table if exists public.especialistas;
drop table if exists public.especialistas_config;
drop table if exists public.especialidades;
