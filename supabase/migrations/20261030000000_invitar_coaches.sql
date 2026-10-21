-- B5 · Invitar y gestionar coaches. Solo el dueño invita, activa o desactiva y da el permiso de
-- moderar. La persona invitada entra con su correo (el mismo ingreso por código) y acepta.
-- Un coach con participantes asignados no se desactiva: antes se reasignan (queda registrado).

create table public.invitaciones_equipo (
  id uuid primary key default gen_random_uuid(),
  correo extensions.citext not null check (char_length(correo::text) <= 254 and correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  nombre text not null check (char_length(nombre) between 2 and 60),
  puede_moderar boolean not null default false,
  creada_por uuid,
  creada_en timestamptz not null default now(),
  expira_en timestamptz not null default now() + interval '7 days',
  aceptada_en timestamptz,
  revocada_en timestamptz,
  check (aceptada_en is null or revocada_en is null)
);
create unique index invitacion_abierta on public.invitaciones_equipo (correo) where aceptada_en is null and revocada_en is null;
alter table public.invitaciones_equipo enable row level security;
revoke all on public.invitaciones_equipo from anon, authenticated;
grant select on public.invitaciones_equipo to authenticated;
create policy dueno_leer on public.invitaciones_equipo for select to authenticated using (privado.es_dueno());
create or replace trigger auditar after insert or update or delete on public.invitaciones_equipo
  for each row execute function privado.auditar_cambio();

create or replace function public.invitar_coach(p_correo text, p_nombre text, p_puede_moderar boolean default false) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v extensions.citext := lower(btrim(p_correo)); v_id uuid;
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  if v is null or v !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform privado.error('correo','invalido'); end if;
  if exists (select 1 from public.equipo e join auth.users u on u.id = e.user_id where lower(u.email) = v::text) then
    perform privado.error('invitacion','ya_en_equipo','409'); end if;
  if exists (select 1 from public.participantes where correo = v and estado <> 'cerrado') then
    perform privado.error('invitacion','es_participante','409'); end if;
  -- Una invitación vencida se reemplaza; una vigente no se duplica.
  update public.invitaciones_equipo set revocada_en = now()
   where correo = v and aceptada_en is null and revocada_en is null and expira_en <= now();
  if exists (select 1 from public.invitaciones_equipo where correo = v and aceptada_en is null and revocada_en is null) then
    perform privado.error('invitacion','ya_invitada','409'); end if;
  insert into public.invitaciones_equipo (correo, nombre, puede_moderar, creada_por)
  values (v, btrim(p_nombre), coalesce(p_puede_moderar, false), auth.uid()) returning id into v_id;
  insert into privado.correos_equipo values (v) on conflict do nothing;   -- permite crear la cuenta
  return v_id;
end $$;

create or replace function public.revocar_invitacion(p_invitacion uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare i public.invitaciones_equipo%rowtype;
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  select * into i from public.invitaciones_equipo where id = p_invitacion for update;
  if i.id is null or i.aceptada_en is not null or i.revocada_en is not null then
    perform privado.error('invitacion','no_encontrada','404'); end if;
  update public.invitaciones_equipo set revocada_en = now() where id = i.id;
  delete from privado.correos_equipo c where c.correo = i.correo
     and not exists (select 1 from public.equipo e join auth.users u on u.id = e.user_id where lower(u.email) = i.correo::text);
end $$;

-- La persona invitada, ya con sesión, acepta y entra al equipo como coach.
create or replace function public.aceptar_invitacion_equipo() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare i public.invitaciones_equipo%rowtype; v_correo text;
begin
  select lower(email) into v_correo from auth.users where id = auth.uid();
  if v_correo is null then perform privado.error('sesion','no_autorizado','403'); end if;
  select * into i from public.invitaciones_equipo
   where correo = v_correo::extensions.citext and aceptada_en is null and revocada_en is null and expira_en > now() for update;
  if i.id is null then perform privado.error('invitacion','no_encontrada','404'); end if;
  insert into public.equipo (user_id, nombre, rol, puede_moderar) values (auth.uid(), i.nombre, 'coach', i.puede_moderar);
  update public.invitaciones_equipo set aceptada_en = now() where id = i.id;
  return jsonb_build_object('rol', 'coach', 'puede_moderar', i.puede_moderar);
end $$;

create or replace function public.cambiar_coach(p_coach uuid, p_activo boolean, p_puede_moderar boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.equipo%rowtype;
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  select * into e from public.equipo where user_id = p_coach for update;
  if e.user_id is null or e.rol <> 'coach' then perform privado.error('coach','no_encontrado','404'); end if;
  if not coalesce(p_activo, e.activo) and exists (select 1 from public.participantes where coach_id = p_coach) then
    perform privado.error('coach','con_participantes','409'); end if;
  update public.equipo set activo = coalesce(p_activo, activo), puede_moderar = coalesce(p_puede_moderar, puede_moderar)
   where user_id = p_coach;
end $$;

revoke all on function public.invitar_coach(text, text, boolean), public.revocar_invitacion(uuid),
  public.aceptar_invitacion_equipo(), public.cambiar_coach(uuid, boolean, boolean) from public, anon, authenticated;
grant execute on function public.invitar_coach(text, text, boolean), public.revocar_invitacion(uuid),
  public.aceptar_invitacion_equipo(), public.cambiar_coach(uuid, boolean, boolean) to authenticated;
