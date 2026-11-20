-- Deshace 20261206000000_funciones_siempre_presentes: modulo_visible vuelve a depender solo de la
-- tabla modulos. Las filas de lo esencial quedan «habilitado» (visibles, como las dejó Diego el
-- 20-nov) para que nadie pierda una función al deshacer; respaldo y qué falta se conservan.
begin;
create or replace function public.modulo_visible(p_clave text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select estado in ('habilitado','operativo') from public.modulos where clave = p_clave), false);
$$;
revoke all on function public.modulo_visible(text) from public, anon;
grant execute on function public.modulo_visible(text) to authenticated;

update public.modulos set estado = 'habilitado', cambiado_en = now()
 where clave in ('notificaciones','recordatorios','reconocimientos','fotos','ranking','informes','app_movil')
   and estado = 'operativo';
commit;
