-- E3 · Especialistas Rumbo, primera etapa: perfiles, credenciales verificadas, especialidades y
-- servicios (función 23 del inventario). Decisión de Diego (21-oct-2026): profesionales
-- independientes que comparten el propósito de Rumbo; no es solo un directorio (las reservas, el
-- trabajo con participantes y la comunicación llegan en E4). Comisión inicial del 15 % sobre
-- reservas originadas en Rumbo, SUJETA A VALIDACIÓN: queda configurable y marcada sin validar.
--
-- Reglas:
--  · Solo el dueño invita. El especialista entra con su correo (mismo ingreso por código, con
--    TOTP como el equipo), acepta, completa su perfil y lo envía a revisión.
--  · Nadie aparece publicado sin credenciales verificadas por el dueño y su aprobación explícita.
--    Si un especialista publicado cambia su perfil, vuelve a revisión y deja de mostrarse.
--  · No hay pagos: los precios son del especialista y solo se informan. Reservas apagadas.
--  · Un especialista no es parte del equipo: no ve participantes ni nada del programa.
-- Las personas ven los publicados solo con el módulo «especialistas» habilitado.

create table public.especialidades (
  clave text primary key check (clave ~ '^[a-z_]{3,40}$'),
  nombre text not null check (char_length(nombre) between 3 and 60),
  activa boolean not null default true,
  orden smallint not null default 0
);
alter table public.especialidades enable row level security;
revoke all on public.especialidades from anon, authenticated;
grant select on public.especialidades to authenticated;
create policy con_sesion_leer on public.especialidades for select to authenticated using (true);
create or replace trigger auditar after insert or update or delete on public.especialidades
  for each row execute function privado.auditar_cambio();
-- Punto de partida editable por el dueño (guardar_especialidad).
insert into public.especialidades (clave, nombre, orden) values
  ('nutricion', 'Nutrición', 1), ('psicologia', 'Psicología', 2), ('actividad_fisica', 'Actividad física', 3),
  ('sueno', 'Sueño y descanso', 4), ('finanzas_personales', 'Finanzas personales', 5), ('organizacion', 'Organización y productividad', 6);

create table public.especialistas_config (
  id boolean primary key default true check (id),
  comision_pct numeric(5,2) not null default 15 check (comision_pct between 0 and 100),
  comision_validada boolean not null default false,      -- el 15 % está por validar
  reservas_activas boolean not null default false,       -- E4; sin pagos en línea
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid
);
alter table public.especialistas_config enable row level security;
revoke all on public.especialistas_config from anon, authenticated;
grant select on public.especialistas_config to authenticated;
create policy admin_leer on public.especialistas_config for select to authenticated using (privado.es_admin());
create or replace trigger auditar after insert or update or delete on public.especialistas_config
  for each row execute function privado.auditar_cambio();
insert into public.especialistas_config default values;

create table public.especialistas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  correo extensions.citext not null unique check (char_length(correo::text) <= 254 and correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  nombre text not null check (char_length(nombre) between 2 and 80),
  profesion text check (char_length(profesion) between 2 and 80),
  especialidades text[] not null default '{}',
  presentacion text check (char_length(presentacion) <= 1200),
  como_se_alinea text check (char_length(como_se_alinea) <= 600),     -- cómo comparte el propósito de Rumbo
  modalidad text check (modalidad in ('en_linea','presencial','ambas')),
  comuna text check (char_length(comuna) <= 60),
  estado text not null default 'invitado'
    check (estado in ('invitado','borrador','en_revision','verificado','publicado','suspendido','rechazado')),
  invitado_por uuid, invitado_en timestamptz not null default now(),
  aceptado_en timestamptz,
  enviado_a_revision_en timestamptz,
  verificado_por uuid, verificado_en timestamptz,
  publicado_por uuid, publicado_en timestamptz,
  nota_dueno text check (char_length(nota_dueno) <= 600),
  actualizado_en timestamptz not null default now()
);
alter table public.especialistas enable row level security;
revoke all on public.especialistas from anon, authenticated;
grant select on public.especialistas to authenticated;
create policy admin_leer on public.especialistas for select to authenticated using (privado.es_admin());
create policy yo_leer on public.especialistas for select to authenticated using (user_id = auth.uid());
create or replace trigger auditar after insert or update or delete on public.especialistas
  for each row execute function privado.auditar_cambio();

create table public.especialistas_credenciales (
  id uuid primary key default gen_random_uuid(),
  especialista_id uuid not null references public.especialistas(id) on delete cascade,
  tipo text not null check (tipo in ('titulo','registro_superintendencia','certificacion','colegio_profesional','otro')),
  descripcion text not null check (char_length(descripcion) between 3 and 200),
  emisor text check (char_length(emisor) <= 120),
  numero text check (char_length(numero) <= 60),
  estado text not null default 'pendiente' check (estado in ('pendiente','verificada','rechazada')),
  revisada_por uuid, revisada_en timestamptz,
  nota_revision text check (char_length(nota_revision) <= 300),   -- cómo se verificó (p. ej. registro público consultado)
  creada_en timestamptz not null default now(),
  check (estado = 'pendiente' or nota_revision is not null)
);
alter table public.especialistas_credenciales enable row level security;
revoke all on public.especialistas_credenciales from anon, authenticated;
grant select on public.especialistas_credenciales to authenticated;
create policy admin_leer on public.especialistas_credenciales for select to authenticated using (privado.es_admin());
create policy yo_leer on public.especialistas_credenciales for select to authenticated
  using (especialista_id in (select e.id from public.especialistas e where e.user_id = auth.uid()));
create or replace trigger auditar after insert or update or delete on public.especialistas_credenciales
  for each row execute function privado.auditar_cambio();

create table public.especialistas_servicios (
  id uuid primary key default gen_random_uuid(),
  especialista_id uuid not null references public.especialistas(id) on delete cascade,
  nombre text not null check (char_length(nombre) between 3 and 80),
  descripcion text check (char_length(descripcion) <= 400),
  duracion_min smallint not null check (duracion_min between 10 and 240),
  modalidad text not null check (modalidad in ('en_linea','presencial')),
  precio_clp integer check (precio_clp > 0),        -- lo fija el especialista; Rumbo no cobra
  precio_usd numeric(8,2) check (precio_usd > 0),
  activo boolean not null default true,
  actualizado_en timestamptz not null default now()
);
alter table public.especialistas_servicios enable row level security;
revoke all on public.especialistas_servicios from anon, authenticated;
grant select on public.especialistas_servicios to authenticated;
create policy admin_leer on public.especialistas_servicios for select to authenticated using (privado.es_admin());
create policy yo_leer on public.especialistas_servicios for select to authenticated
  using (especialista_id in (select e.id from public.especialistas e where e.user_id = auth.uid()));
create or replace trigger auditar after insert or update or delete on public.especialistas_servicios
  for each row execute function privado.auditar_cambio();

-- Quién es quién. Como el equipo, el especialista trabaja con segundo factor (TOTP).
create or replace function privado.mi_especialista_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select e.id from public.especialistas e
   where e.user_id = auth.uid() and coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
     and e.estado not in ('invitado','suspendido','rechazado');
$$;
revoke execute on function privado.mi_especialista_id() from public, anon, authenticated;

-- 1. Dueño ------------------------------------------------------------------------------------
create or replace function public.invitar_especialista(p_correo text, p_nombre text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v extensions.citext := lower(btrim(p_correo)); v_id uuid;
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  if v is null or v !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform privado.error('correo','invalido'); end if;
  if p_nombre is null or char_length(btrim(p_nombre)) < 2 then perform privado.error('nombre','invalido'); end if;
  if exists (select 1 from public.equipo e join auth.users u on u.id = e.user_id where lower(u.email) = v::text) then
    perform privado.error('invitacion','ya_en_equipo','409'); end if;
  if exists (select 1 from public.participantes where correo = v and estado <> 'cerrado') then
    perform privado.error('invitacion','es_participante','409'); end if;
  if exists (select 1 from public.especialistas where correo = v) then perform privado.error('invitacion','ya_invitada','409'); end if;
  insert into public.especialistas (correo, nombre, invitado_por) values (v, left(btrim(p_nombre), 80), auth.uid())
  returning id into v_id;
  insert into privado.correos_equipo values (v) on conflict do nothing;   -- permite crear la cuenta
  return v_id;
end $$;

-- Verificar o rechazar una credencial, anotando cómo se comprobó.
create or replace function public.revisar_credencial(p_credencial uuid, p_verificada boolean, p_nota text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_nota text := nullif(btrim(p_nota), '');
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  if v_nota is null then perform privado.error('nota','requerida'); end if;
  update public.especialistas_credenciales set estado = case when p_verificada then 'verificada' else 'rechazada' end,
         revisada_por = auth.uid(), revisada_en = now(), nota_revision = left(v_nota, 300)
   where id = p_credencial;
  if not found then perform privado.error('credencial','no_encontrada','404'); end if;
end $$;

-- Cambiar el estado del especialista: verificado (exige ≥1 credencial verificada), publicado
-- (exige verificado y al menos un servicio activo), suspendido, rechazado o de vuelta a revisión.
create or replace function public.decidir_especialista(p_especialista uuid, p_estado text, p_nota text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.especialistas%rowtype;
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  select * into e from public.especialistas where id = p_especialista for update;
  if e.id is null then perform privado.error('especialista','no_encontrado','404'); end if;
  if p_estado not in ('verificado','publicado','suspendido','rechazado','en_revision') then perform privado.error('estado','invalido'); end if;
  if p_estado = 'verificado' then
    if e.estado not in ('en_revision','publicado') then perform privado.error('especialista','sin_revision','409'); end if;
    if not exists (select 1 from public.especialistas_credenciales where especialista_id = e.id and estado = 'verificada') then
      perform privado.error('especialista','sin_credenciales','409'); end if;
  elsif p_estado = 'publicado' then
    if e.estado <> 'verificado' then perform privado.error('especialista','sin_verificar','409'); end if;
    if not exists (select 1 from public.especialistas_servicios where especialista_id = e.id and activo) then
      perform privado.error('especialista','sin_servicios','409'); end if;
  elsif p_estado in ('suspendido','rechazado') and nullif(btrim(p_nota), '') is null then
    perform privado.error('nota','requerida');
  end if;
  update public.especialistas set estado = p_estado, nota_dueno = coalesce(nullif(left(btrim(p_nota), 600), ''), nota_dueno),
         verificado_por = case when p_estado = 'verificado' then auth.uid() else verificado_por end,
         verificado_en = case when p_estado = 'verificado' then now() else verificado_en end,
         publicado_por = case when p_estado = 'publicado' then auth.uid() else publicado_por end,
         publicado_en = case when p_estado = 'publicado' then now() when p_estado <> 'publicado' then null else publicado_en end,
         actualizado_en = now()
   where id = e.id;
end $$;

create or replace function public.guardar_config_especialistas(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  begin
    update public.especialistas_config set
      comision_pct = coalesce((p->>'comision_pct')::numeric, comision_pct),
      comision_validada = coalesce((p->>'comision_validada')::boolean, comision_validada),
      reservas_activas = coalesce((p->>'reservas_activas')::boolean, reservas_activas),
      actualizado_en = now(), actualizado_por = auth.uid();
  exception when check_violation or invalid_text_representation or numeric_value_out_of_range then
    perform privado.error('config','invalida');
  end;
end $$;

create or replace function public.guardar_especialidad(p_clave text, p_nombre text, p_activa boolean default true) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  begin
    insert into public.especialidades (clave, nombre, activa) values (p_clave, btrim(p_nombre), coalesce(p_activa, true))
    on conflict (clave) do update set nombre = excluded.nombre, activa = excluded.activa;
  exception when check_violation or not_null_violation then perform privado.error('especialidad','invalida');
  end;
end $$;

-- 2. Especialista --------------------------------------------------------------------------
-- Ya con sesión (y TOTP), acepta la invitación hecha a su correo.
create or replace function public.aceptar_invitacion_especialista() returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_correo text; v_id uuid;
begin
  if coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then perform privado.error('sesion','sin_segundo_factor','403'); end if;
  select lower(email) into v_correo from auth.users where id = auth.uid();
  if v_correo is null then perform privado.error('sesion','no_autorizado','403'); end if;
  update public.especialistas set user_id = auth.uid(), estado = 'borrador', aceptado_en = now(), actualizado_en = now()
   where correo = v_correo::extensions.citext and estado = 'invitado' and user_id is null
  returning id into v_id;
  if v_id is null then perform privado.error('invitacion','no_encontrada','404'); end if;
  return v_id;
end $$;

-- Editar el perfil. p: nombre, profesion, especialidades (arreglo), presentacion, como_se_alinea,
-- modalidad, comuna. Si estaba verificado o publicado, vuelve a revisión (y deja de mostrarse).
create or replace function public.guardar_perfil_especialista(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_especialista_id(); v_esp text[];
begin
  if v_yo is null then perform privado.error('sesion','no_autorizado','403'); end if;
  if p ? 'especialidades' then
    select coalesce(array_agg(x), '{}') into v_esp from jsonb_array_elements_text(p->'especialidades') x;
    if exists (select 1 from unnest(v_esp) x where x not in (select clave from public.especialidades where activa))
       or cardinality(v_esp) > 5 then
      perform privado.error('especialidades','invalidas'); end if;
  end if;
  begin
    update public.especialistas set
      nombre = coalesce(btrim(p->>'nombre'), nombre),
      profesion = case when p ? 'profesion' then nullif(btrim(p->>'profesion'), '') else profesion end,
      especialidades = coalesce(v_esp, especialidades),
      presentacion = case when p ? 'presentacion' then nullif(btrim(p->>'presentacion'), '') else presentacion end,
      como_se_alinea = case when p ? 'como_se_alinea' then nullif(btrim(p->>'como_se_alinea'), '') else como_se_alinea end,
      modalidad = case when p ? 'modalidad' then nullif(p->>'modalidad', '') else modalidad end,
      comuna = case when p ? 'comuna' then nullif(btrim(p->>'comuna'), '') else comuna end,
      estado = case when estado in ('verificado','publicado') then 'en_revision' else estado end,
      publicado_en = case when estado = 'publicado' then null else publicado_en end,
      actualizado_en = now()
     where id = v_yo;
  exception when check_violation or not_null_violation then perform privado.error('perfil','invalido');
  end;
end $$;

-- Agregar una credencial (queda pendiente hasta que el dueño la verifique).
create or replace function public.agregar_credencial(p_tipo text, p_descripcion text, p_emisor text default null,
  p_numero text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_especialista_id(); v_id uuid;
begin
  if v_yo is null then perform privado.error('sesion','no_autorizado','403'); end if;
  if (select count(*) from public.especialistas_credenciales where especialista_id = v_yo) >= 10 then
    perform privado.error('credencial','demasiadas','429'); end if;
  begin
    insert into public.especialistas_credenciales (especialista_id, tipo, descripcion, emisor, numero)
    values (v_yo, p_tipo, btrim(p_descripcion), nullif(btrim(p_emisor), ''), nullif(btrim(p_numero), ''))
    returning id into v_id;
  exception when check_violation or not_null_violation then perform privado.error('credencial','invalida');
  end;
  return v_id;
end $$;

-- Crear (p_id null) o editar un servicio. p: nombre, descripcion, duracion_min, modalidad,
-- precio_clp, precio_usd, activo.
create or replace function public.guardar_servicio_especialista(p_id uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_especialista_id(); v_id uuid;
begin
  if v_yo is null then perform privado.error('sesion','no_autorizado','403'); end if;
  if p_id is not null and not exists (select 1 from public.especialistas_servicios where id = p_id and especialista_id = v_yo) then
    perform privado.error('servicio','no_encontrado','404'); end if;
  if p_id is null and (select count(*) from public.especialistas_servicios where especialista_id = v_yo) >= 10 then
    perform privado.error('servicio','demasiados','429'); end if;
  begin
    if p_id is null then
      insert into public.especialistas_servicios (especialista_id, nombre, descripcion, duracion_min, modalidad, precio_clp, precio_usd)
      values (v_yo, btrim(p->>'nombre'), nullif(btrim(p->>'descripcion'), ''), (p->>'duracion_min')::smallint, p->>'modalidad',
              (p->>'precio_clp')::int, (p->>'precio_usd')::numeric)
      returning id into v_id;
    else
      update public.especialistas_servicios set
        nombre = coalesce(btrim(p->>'nombre'), nombre),
        descripcion = case when p ? 'descripcion' then nullif(btrim(p->>'descripcion'), '') else descripcion end,
        duracion_min = coalesce((p->>'duracion_min')::smallint, duracion_min),
        modalidad = coalesce(p->>'modalidad', modalidad),
        precio_clp = case when p ? 'precio_clp' then (p->>'precio_clp')::int else precio_clp end,
        precio_usd = case when p ? 'precio_usd' then (p->>'precio_usd')::numeric else precio_usd end,
        activo = coalesce((p->>'activo')::boolean, activo),
        actualizado_en = now()
       where id = p_id returning id into v_id;
    end if;
  exception when check_violation or not_null_violation or invalid_text_representation or numeric_value_out_of_range then
    perform privado.error('servicio','invalido');
  end;
  return v_id;
end $$;

create or replace function public.enviar_perfil_a_revision() returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_especialista_id(); e public.especialistas%rowtype;
begin
  if v_yo is null then perform privado.error('sesion','no_autorizado','403'); end if;
  select * into e from public.especialistas where id = v_yo for update;
  if e.estado <> 'borrador' then perform privado.error('perfil','ya_enviado','409'); end if;
  if e.profesion is null or e.presentacion is null or e.modalidad is null or cardinality(e.especialidades) = 0
     or not exists (select 1 from public.especialistas_credenciales where especialista_id = v_yo) then
    perform privado.error('perfil','incompleto'); end if;
  update public.especialistas set estado = 'en_revision', enviado_a_revision_en = now(), actualizado_en = now() where id = v_yo;
  perform privado.avisar('Rumbo · perfil de especialista por revisar', 'Revisa sus credenciales en el panel antes de publicarlo.');
end $$;

-- 3. Personas ---------------------------------------------------------------------------------
-- Directorio: solo publicados, sin correo ni datos de la cuenta, con el módulo habilitado.
create or replace function public.especialistas_publicados(p_especialidad text default null)
returns table (id uuid, nombre text, profesion text, especialidades text[], presentacion text, como_se_alinea text,
               modalidad text, comuna text, credenciales jsonb, servicios jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then perform privado.error('sesion','no_autorizado','403'); end if;
  if not public.modulo_visible('especialistas') and not privado.es_dueno() then
    perform privado.error('modulo','no_disponible','409'); end if;
  return query select e.id, e.nombre, e.profesion, e.especialidades, e.presentacion, e.como_se_alinea, e.modalidad, e.comuna,
      (select jsonb_agg(jsonb_build_object('tipo', c.tipo, 'descripcion', c.descripcion, 'emisor', c.emisor))
         from public.especialistas_credenciales c where c.especialista_id = e.id and c.estado = 'verificada'),
      (select jsonb_agg(jsonb_build_object('id', s.id, 'nombre', s.nombre, 'descripcion', s.descripcion, 'duracion_min', s.duracion_min,
                                           'modalidad', s.modalidad, 'precio_clp', s.precio_clp, 'precio_usd', s.precio_usd) order by s.nombre)
         from public.especialistas_servicios s where s.especialista_id = e.id and s.activo)
    from public.especialistas e
   where e.estado = 'publicado' and (p_especialidad is null or p_especialidad = any(e.especialidades))
   order by e.nombre;
end $$;

revoke all on function public.invitar_especialista(text, text), public.revisar_credencial(uuid, boolean, text),
  public.decidir_especialista(uuid, text, text), public.guardar_config_especialistas(jsonb),
  public.guardar_especialidad(text, text, boolean), public.aceptar_invitacion_especialista(),
  public.guardar_perfil_especialista(jsonb), public.agregar_credencial(text, text, text, text),
  public.guardar_servicio_especialista(uuid, jsonb), public.enviar_perfil_a_revision(),
  public.especialistas_publicados(text) from public, anon, authenticated;
grant execute on function public.invitar_especialista(text, text), public.revisar_credencial(uuid, boolean, text),
  public.decidir_especialista(uuid, text, text), public.guardar_config_especialistas(jsonb),
  public.guardar_especialidad(text, text, boolean), public.aceptar_invitacion_especialista(),
  public.guardar_perfil_especialista(jsonb), public.agregar_credencial(text, text, text, text),
  public.guardar_servicio_especialista(uuid, jsonb), public.enviar_perfil_a_revision(),
  public.especialistas_publicados(text) to authenticated;
