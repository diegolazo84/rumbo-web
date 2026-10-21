-- A3 (Rumbo 2.0): perfil del coach y «Tu coach» con datos reales.
-- - equipo.presentacion: unas líneas sobre quién acompaña (la escribe el propio coach o el dueño).
-- - mi_coach(): el participante obtiene el nombre y la presentación de SU coach, y nada más del
--   equipo (no lee la tabla equipo).
-- - actualizar_mi_perfil(): cada persona del equipo cambia su propio nombre y presentación; el rol,
--   el permiso de moderación y el estado los cambia solo el dueño.
-- La foto del coach llega con las fotos (C1), que es cuando se tocan los archivos.

alter table public.equipo
  add column if not exists presentacion text check (char_length(presentacion) <= 400);

create or replace function public.mi_coach() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('nombre', e.nombre, 'presentacion', e.presentacion)
    from public.participantes p join public.equipo e on e.user_id = p.coach_id and e.activo
   where p.id = privado.mi_participante_id();
$$;

create or replace function public.actualizar_mi_perfil(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_nombre text := btrim(p->>'nombre'); v_pres text := nullif(btrim(p->>'presentacion'), '');
begin
  if not (privado.es_dueno() or privado.es_coach()) then perform privado.error('sesion','no_autorizado','403'); end if;
  if p ? 'nombre' and (v_nombre is null or char_length(v_nombre) not between 2 and 60) then
    perform privado.error('nombre','largo'); end if;
  if char_length(v_pres) > 400 then perform privado.error('presentacion','largo'); end if;
  update public.equipo set
    nombre = case when p ? 'nombre' then v_nombre else nombre end,
    presentacion = case when p ? 'presentacion' then v_pres else presentacion end
   where user_id = auth.uid();
end $$;

revoke all on function public.mi_coach(), public.actualizar_mi_perfil(jsonb) from public, anon, authenticated;
grant execute on function public.mi_coach(), public.actualizar_mi_perfil(jsonb) to authenticated;
