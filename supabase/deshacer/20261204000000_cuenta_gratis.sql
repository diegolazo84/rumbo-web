-- Deshace 20261204000000_cuenta_gratis.sql: se borran las cuentas gratis y sus datos, el módulo
-- «cuenta_gratis» y el registro vuelve a ser solo por invitación (versión de 20261008000004).
create or replace function privado.antes_de_crear_usuario(event jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v extensions.citext := lower(event->'user'->>'email');
begin
  if exists (select 1 from public.participantes where correo = v and estado <> 'cerrado')
     or exists (select 1 from privado.correos_equipo where correo = v) then
    return '{}'::jsonb;
  end if;
  -- El mensaje no se muestra: la pantalla de ingreso responde siempre igual (4.2).
  return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'no_invitado'));
end $$;
drop function public.dar_acceso_completo(uuid, text, text);
drop function public.cuentas_creadas();
drop function public.borrar_mi_cuenta_libre();
drop function public.pedir_acompanamiento_libre(text);
drop function public.ajustar_cuenta_libre(jsonb);
drop function public.marcar_libre(uuid, date, boolean);
drop function public.mi_cuenta_libre();
drop function public.crear_cuenta_libre(jsonb);
drop function privado.acciones_validas(jsonb);
drop function privado.progreso_libre(uuid);
drop function privado.cuenta_gratis_abierta();
delete from public.modulos where clave = 'cuenta_gratis';
drop table public.registros_libres;
drop table public.acciones_libres;
drop table public.cuentas_libres;
