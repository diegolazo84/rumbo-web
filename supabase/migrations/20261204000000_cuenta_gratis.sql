-- Cuenta gratis «Rumbo Inicial» (Diego, 18-nov-2026): cualquiera crea su cuenta (Google o código al
-- correo) y queda en gratis. El dueño ve las cuentas creadas en el panel y decide a quién darle
-- acceso completo. Todo queda APAGADO mientras el módulo «cuenta_gratis» no esté habilitado.
-- - Gratis: 1 meta, hasta 3 acciones diarias en los días que la persona elige, marcar hoy o ayer.
--   Créditos, rachas y nivel con las MISMAS reglas (reglas_creditos y niveles), calculados aparte:
--   no tocan progreso ni progreso_diario de los participantes.
-- - Las cuentas gratis no son participantes: los coaches no las ven. Solo la persona y el dueño.
-- - «Dar acceso completo» (dueño, con TOTP) crea una solicitud ya llena desde la cuenta. Desde ahí
--   sigue el camino de siempre: Registrar acuerdo → la persona acepta → Crear su espacio.
--   Las condiciones y el pago se aceptan igual que hoy.
-- - Al crear el espacio, la ficha se enlaza a la misma cuenta (vincular_ficha) y su historial gratis
--   se conserva. Si el ciclo termina y no renueva, Mi espacio vuelve a mostrar la cuenta gratis.
-- - Registro abierto: antes_de_crear_usuario deja crear cuentas a cualquier correo SOLO con el
--   módulo habilitado. Apagado, responde como hasta hoy (solo participantes y equipo).

begin;

create table public.cuentas_libres (
  user_id uuid primary key references auth.users(id) on delete cascade,
  correo extensions.citext not null unique check (char_length(correo) <= 254),
  nombre text not null check (char_length(nombre) between 2 and 60),
  origen text not null default 'correo' check (origen in ('correo','google')),
  area_id text not null references public.areas(id),
  meta text not null check (char_length(meta) between 20 and 300),
  dias smallint[] not null check (cardinality(dias) between 1 and 7 and dias <@ array[1,2,3,4,5,6,7]::smallint[]),
  mayor_edad boolean not null check (mayor_edad),
  consentimiento jsonb not null,                  -- {version_privacidad, texto, fecha}
  avisos_novedades boolean not null default false,
  creada_en timestamptz not null default now(),
  ultima_visita timestamptz not null default now(),
  acceso_pedido_en timestamptz,                   -- tocó «Quiero acompañamiento»
  apoyo_pedido text check (apoyo_pedido in ('coach','cercano','nose')),
  solicitud_id uuid references public.solicitudes(id) on delete set null
);

create table public.acciones_libres (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.cuentas_libres(user_id) on delete cascade,
  titulo text not null check (char_length(titulo) between 3 and 80),
  desde date not null,
  hasta date,                                     -- null = vigente
  creada_en timestamptz not null default now(),
  check (hasta is null or hasta >= desde)
);
create index acciones_libres_usuario on public.acciones_libres (user_id, desde);

create table public.registros_libres (
  accion_id uuid not null references public.acciones_libres(id) on delete cascade,
  user_id uuid not null references public.cuentas_libres(user_id) on delete cascade,
  fecha date not null,
  creado_en timestamptz not null default now(),
  primary key (accion_id, fecha)
);
create index registros_libres_usuario on public.registros_libres (user_id, fecha);

alter table public.cuentas_libres enable row level security;
alter table public.acciones_libres enable row level security;
alter table public.registros_libres enable row level security;
revoke all on public.cuentas_libres, public.acciones_libres, public.registros_libres from anon, authenticated;
-- Lectura de lo propio; toda escritura pasa por las funciones de abajo.
grant select on public.cuentas_libres, public.acciones_libres, public.registros_libres to authenticated;
create policy propia on public.cuentas_libres for select to authenticated using (user_id = auth.uid());
create policy propias on public.acciones_libres for select to authenticated using (user_id = auth.uid());
create policy propios on public.registros_libres for select to authenticated using (user_id = auth.uid());

insert into public.modulos (clave, nombre, estado, que_falta, orden) values
  ('cuenta_gratis', 'Cuenta gratis «Rumbo Inicial»', 'desarrollado',
   'Pantallas de la cuenta gratis, Condiciones y Privacidad con la cuenta gratis', 20)
on conflict (clave) do nothing;

create or replace function privado.cuenta_gratis_abierta() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.modulos where clave = 'cuenta_gratis' and estado in ('habilitado','operativo'));
$$;

-- ---------- Registro abierto solo con el módulo habilitado ----------
create or replace function privado.antes_de_crear_usuario(event jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v extensions.citext := lower(event->'user'->>'email');
begin
  if privado.cuenta_gratis_abierta()
     or exists (select 1 from public.participantes where correo = v and estado <> 'cerrado')
     or exists (select 1 from privado.correos_equipo where correo = v) then
    return '{}'::jsonb;
  end if;
  -- El mensaje no se muestra: la pantalla de ingreso responde siempre igual (4.2).
  return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'no_invitado'));
end $$;

-- ---------- Créditos, racha y nivel de una cuenta gratis (mismas reglas que recalcular_progreso) ----------
create or replace function privado.progreso_libre(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  r public.reglas_creditos%rowtype; c public.cuentas_libres%rowtype;
  v_hoy date := privado.hoy_chile(); v_racha int := 0; v_total int := 0; v_bono int; d record;
begin
  select * into c from public.cuentas_libres where user_id = p_user;
  if c.user_id is null then return null; end if;
  select * into r from public.reglas_creditos;
  for d in
    select f.fecha,
           (select count(*) from public.acciones_libres a
             where a.user_id = p_user and a.desde <= f.fecha and (a.hasta is null or a.hasta >= f.fecha))::int as programadas,
           (select count(*) from public.registros_libres g join public.acciones_libres a on a.id = g.accion_id
             where g.user_id = p_user and g.fecha = f.fecha
               and a.desde <= f.fecha and (a.hasta is null or a.hasta >= f.fecha))::int as hechas
      from (select g0::date as fecha
              from generate_series((c.creada_en at time zone 'America/Santiago')::date::timestamp, v_hoy::timestamp, interval '1 day') g0) f
     where extract(isodow from f.fecha)::smallint = any (c.dias)
     order by f.fecha
  loop
    continue when d.programadas = 0;            -- un día sin acciones no corta la racha
    v_bono := 0;
    if d.hechas = d.programadas then
      v_racha := v_racha + 1;
      v_bono := case when v_racha >= r.dias_racha_larga then r.bono_racha7
                     when v_racha >= r.dias_racha_media then r.bono_racha3
                     else r.bono_dia_completo end;
    elsif d.fecha < v_hoy then
      v_racha := 0;                              -- hoy, en curso, no corta
    end if;
    v_total := v_total + d.hechas * r.por_accion + v_bono;
  end loop;
  return jsonb_build_object(
    'creditos', v_total,
    'nivel', (select max(n.nivel) from public.niveles n where n.minimo <= v_total),
    'racha', v_racha,
    'bono_siguiente', case when v_racha + 1 >= r.dias_racha_larga then r.bono_racha7
                           when v_racha + 1 >= r.dias_racha_media then r.bono_racha3
                           else r.bono_dia_completo end);
end $$;

-- Limpia y valida la lista de acciones (1 a 3, sin repetir, 3 a 80 caracteres).
create or replace function privado.acciones_validas(p jsonb) returns text[]
language plpgsql immutable set search_path = '' as $$
declare v text[];
begin
  if jsonb_typeof(p) is distinct from 'array' then perform privado.error('acciones','invalidas'); end if;
  select coalesce(array_agg(distinct btrim(x)), '{}') into v from jsonb_array_elements_text(p) x where btrim(x) <> '';
  if cardinality(v) not between 1 and 3 then perform privado.error('acciones','entre_1_y_3'); end if;
  if exists (select 1 from unnest(v) t where char_length(t) not between 3 and 80) then
    perform privado.error('acciones','largo'); end if;
  return v;
end $$;

-- ---------- Funciones de la persona (con sesión) ----------
-- p: {nombre, area, meta, dias: [1..7], acciones: [texto], mayor_edad, version_privacidad, texto_consentimiento, avisos}
create or replace function public.crear_cuenta_libre(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_correo text; v_origen text; v_dias smallint[]; v_acc text[];
  v_hoy date := privado.hoy_chile(); t text;
begin
  if v_uid is null then perform privado.error('sesion','sin_sesion','401'); end if;
  if not privado.cuenta_gratis_abierta() then perform privado.error('modulo','cerrado','409'); end if;
  if privado.mi_participante_id() is not null then perform privado.error('cuenta','tiene_programa','409'); end if;
  if exists (select 1 from public.equipo where user_id = v_uid) then perform privado.error('cuenta','es_equipo','409'); end if;
  if exists (select 1 from public.cuentas_libres where user_id = v_uid) then perform privado.error('cuenta','ya_existe','409'); end if;
  if (p->>'mayor_edad')::boolean is not true then perform privado.error('mayor_edad','requerido'); end if;
  if char_length(btrim(coalesce(p->>'texto_consentimiento', ''))) < 10 then perform privado.error('consentimiento','requerido'); end if;
  select lower(email), coalesce(raw_app_meta_data->>'provider', 'email') into v_correo, v_origen from auth.users where id = v_uid;
  select coalesce(array_agg(distinct x::smallint order by x::smallint), '{}') into v_dias
    from jsonb_array_elements_text(coalesce(p->'dias', '[]'::jsonb)) x where x ~ '^[1-7]$';
  v_acc := privado.acciones_validas(p->'acciones');
  insert into public.cuentas_libres (user_id, correo, nombre, origen, area_id, meta, dias, mayor_edad, consentimiento, avisos_novedades)
  values (v_uid, v_correo, btrim(p->>'nombre'), case when v_origen = 'google' then 'google' else 'correo' end,
          p->>'area', btrim(p->>'meta'), v_dias, true,
          jsonb_build_object('version_privacidad', left(p->>'version_privacidad', 20),
                             'texto', left(p->>'texto_consentimiento', 2000), 'fecha', now()),
          coalesce((p->>'avisos')::boolean, false));
  foreach t in array v_acc loop
    insert into public.acciones_libres (user_id, titulo, desde) values (v_uid, t, v_hoy);
  end loop;
  return public.mi_cuenta_libre();
end $$;

create or replace function public.mi_cuenta_libre() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); c public.cuentas_libres%rowtype; v_hoy date := privado.hoy_chile();
begin
  select * into c from public.cuentas_libres where user_id = v_uid;
  if c.user_id is null then return null; end if;
  update public.cuentas_libres set ultima_visita = now() where user_id = v_uid and ultima_visita < now() - interval '10 minutes';
  return jsonb_build_object(
    'hoy', v_hoy,
    'cuenta', to_jsonb(c) - 'user_id' - 'consentimiento' - 'solicitud_id',
    'abierta', privado.cuenta_gratis_abierta(),
    'acciones', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'titulo', a.titulo, 'desde', a.desde, 'hasta', a.hasta) order by a.desde, a.creada_en)
                            from public.acciones_libres a where a.user_id = v_uid and (a.hasta is null or a.hasta >= v_hoy - 41)), '[]'),
    'registros', coalesce((select jsonb_agg(jsonb_build_object('accion_id', g.accion_id, 'fecha', g.fecha) order by g.fecha)
                             from public.registros_libres g where g.user_id = v_uid and g.fecha >= v_hoy - 41), '[]'),
    'progreso', privado.progreso_libre(v_uid));
end $$;

-- Marcar o desmarcar una acción de hoy o de ayer (si ese día era de los elegidos).
create or replace function public.marcar_libre(p_accion uuid, p_fecha date, p_hecha boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); a public.acciones_libres%rowtype; c public.cuentas_libres%rowtype; v_hoy date := privado.hoy_chile();
begin
  select * into a from public.acciones_libres where id = p_accion and user_id = v_uid;
  if a.id is null then perform privado.error('accion','no_encontrada','404'); end if;
  select * into c from public.cuentas_libres where user_id = v_uid;
  if p_fecha is null or p_fecha not in (v_hoy, v_hoy - 1) then perform privado.error('fecha','fuera_de_plazo','409'); end if;
  if p_fecha < a.desde or (a.hasta is not null and p_fecha > a.hasta) then perform privado.error('accion','no_vigente','409'); end if;
  if not (extract(isodow from p_fecha)::smallint = any (c.dias)) then perform privado.error('fecha','dia_libre','409'); end if;
  if p_hecha then
    insert into public.registros_libres (accion_id, user_id, fecha) values (p_accion, v_uid, p_fecha) on conflict do nothing;
  else
    delete from public.registros_libres where accion_id = p_accion and fecha = p_fecha;
  end if;
  return privado.progreso_libre(v_uid);
end $$;

-- Cambiar la meta, los días o las acciones. Las acciones que cambian se cierran ayer (lo hecho queda).
-- p: {meta?, area?, dias?, acciones?}
create or replace function public.ajustar_cuenta_libre(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_hoy date := privado.hoy_chile(); v_acc text[]; v_dias smallint[]; t text;
begin
  if not exists (select 1 from public.cuentas_libres where user_id = v_uid) then perform privado.error('cuenta','no_existe','404'); end if;
  if p ? 'dias' then
    select coalesce(array_agg(distinct x::smallint order by x::smallint), '{}') into v_dias
      from jsonb_array_elements_text(p->'dias') x where x ~ '^[1-7]$';
    update public.cuentas_libres set dias = v_dias where user_id = v_uid;
  end if;
  if p ? 'meta' or p ? 'area' then
    update public.cuentas_libres set meta = coalesce(btrim(p->>'meta'), meta), area_id = coalesce(p->>'area', area_id) where user_id = v_uid;
  end if;
  if p ? 'acciones' then
    v_acc := privado.acciones_validas(p->'acciones');
    -- Las que siguen igual no se tocan. Las que salen: si hoy ya se marcaron, cuentan hasta hoy;
    -- si no, se cierran ayer (o se borran, si nacieron hoy). Lo ya hecho nunca se pierde.
    delete from public.acciones_libres a where a.user_id = v_uid and a.hasta is null and a.desde = v_hoy
       and not (a.titulo = any (v_acc))
       and not exists (select 1 from public.registros_libres g where g.accion_id = a.id and g.fecha = v_hoy);
    update public.acciones_libres a
       set hasta = case when exists (select 1 from public.registros_libres g where g.accion_id = a.id and g.fecha = v_hoy)
                        then v_hoy else v_hoy - 1 end
     where a.user_id = v_uid and a.hasta is null and not (a.titulo = any (v_acc));
    foreach t in array v_acc loop
      if not exists (select 1 from public.acciones_libres where user_id = v_uid and hasta is null and titulo = t) then
        insert into public.acciones_libres (user_id, titulo, desde) values (v_uid, t, v_hoy);
      end if;
    end loop;
  end if;
  return public.mi_cuenta_libre();
end $$;

-- «Quiero acompañamiento»: queda marcado para el dueño y le llega un aviso.
create or replace function public.pedir_acompanamiento_libre(p_apoyo text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); c public.cuentas_libres%rowtype;
begin
  if p_apoyo not in ('coach','cercano','nose') then perform privado.error('apoyo','invalido'); end if;
  select * into c from public.cuentas_libres where user_id = v_uid for update;
  if c.user_id is null then perform privado.error('cuenta','no_existe','404'); end if;
  if c.acceso_pedido_en is not null and c.acceso_pedido_en > now() - interval '1 day' then return; end if;
  update public.cuentas_libres set acceso_pedido_en = now(), apoyo_pedido = p_apoyo where user_id = v_uid;
  perform privado.avisar('Rumbo · una cuenta gratis pidió acompañamiento', 'equipo/cuentas/');
end $$;

-- La persona borra su cuenta gratis (sus acciones y registros se van en cascada).
create or replace function public.borrar_mi_cuenta_libre() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.cuentas_libres where user_id = auth.uid();
end $$;

-- ---------- Panel del dueño (TOTP) ----------
-- Todas las cuentas creadas (Google o código), con o sin cuenta gratis completa, menos el equipo.
create or replace function public.cuentas_creadas() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_hoy date := privado.hoy_chile();
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  return coalesce((
    select jsonb_agg(fila order by (fila->>'creada_en') desc)
      from (
        select jsonb_build_object(
          'user_id', u.id,
          'correo', lower(u.email),
          'nombre', coalesce(c.nombre, p.nombre_preferido, p.nombre),
          'origen', case when coalesce(u.raw_app_meta_data->>'provider', 'email') = 'google' then 'google' else 'correo' end,
          'creada_en', u.created_at,
          'ultima_entrada', u.last_sign_in_at,
          'plan', case when p.id is not null and p.estado <> 'cerrado' then 'programa'
                       when c.user_id is not null then 'gratis'
                       else 'sin_completar' end,
          'participante_id', case when p.estado <> 'cerrado' then p.id end,
          'meta', c.meta,
          'area', c.area_id,
          'dias_con_acciones_7', (select count(distinct g.fecha) from public.registros_libres g where g.user_id = u.id and g.fecha > v_hoy - 7),
          'acciones_hechas', (select count(*) from public.registros_libres g where g.user_id = u.id),
          'acceso_pedido_en', c.acceso_pedido_en,
          'apoyo_pedido', c.apoyo_pedido,
          'solicitud_id', c.solicitud_id,
          'solicitud_estado', (select s.estado from public.solicitudes s where s.id = c.solicitud_id)
        ) as fila
          from auth.users u
          left join public.cuentas_libres c on c.user_id = u.id
          left join public.participantes p on p.user_id = u.id
         where u.deleted_at is null
           and not exists (select 1 from public.equipo e where e.user_id = u.id)
      ) t), '[]'::jsonb);
end $$;

-- «Dar acceso completo»: crea una solicitud ya llena desde la cuenta gratis. p_token lo genera el
-- panel (43 caracteres, como el formulario) para el enlace privado /estado/#token que acepta el acuerdo.
create or replace function public.dar_acceso_completo(p_user uuid, p_apoyo text, p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare c public.cuentas_libres%rowtype; v_sol uuid;
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  if p_apoyo not in ('coach','cercano','nose') then perform privado.error('apoyo','invalido'); end if;
  if p_token !~ '^[A-Za-z0-9_-]{43}$' then perform privado.error('token','invalido'); end if;
  select * into c from public.cuentas_libres where user_id = p_user for update;
  if c.user_id is null then perform privado.error('cuenta','no_existe','404'); end if;
  if exists (select 1 from public.participantes where user_id = p_user and estado <> 'cerrado') then
    perform privado.error('cuenta','tiene_programa','409'); end if;
  if exists (select 1 from public.solicitudes s where s.id = c.solicitud_id
              and s.estado in ('recibida','en_revision','respondida','acordada')) then
    perform privado.error('solicitud','abierta','409'); end if;
  insert into public.solicitudes (tipo, nombre, correo, area_id, meta, apoyo, dias, zona_horaria,
         mayor_edad, consentimiento, estado, token_hash, origen)
  values ('solicitud', c.nombre, c.correo, c.area_id, c.meta, p_apoyo,
          coalesce((select array_agg(d order by n) from (values (1,'lun'),(2,'mar'),(3,'mie'),(4,'jue'),(5,'vie')) v(n, d)
                     where n::smallint = any (c.dias)), '{}'),
          'America/Santiago', true, c.consentimiento, 'en_revision',
          extensions.digest(p_token, 'sha256'), jsonb_build_object('desde', 'cuenta_gratis'))
  returning id into v_sol;
  update public.cuentas_libres set solicitud_id = v_sol where user_id = p_user;
  insert into public.auditoria (actor, accion, tabla, fila, detalle)
  values (auth.uid(), 'dar_acceso_completo', 'cuentas_libres', p_user, jsonb_build_object('solicitud', v_sol, 'apoyo', p_apoyo));
  return v_sol;
end $$;

revoke all on function privado.cuenta_gratis_abierta(), privado.progreso_libre(uuid), privado.acciones_validas(jsonb)
  from public, anon, authenticated;
revoke all on function public.crear_cuenta_libre(jsonb), public.mi_cuenta_libre(), public.marcar_libre(uuid, date, boolean),
  public.ajustar_cuenta_libre(jsonb), public.pedir_acompanamiento_libre(text), public.borrar_mi_cuenta_libre(),
  public.cuentas_creadas(), public.dar_acceso_completo(uuid, text, text) from public, anon, authenticated;
grant execute on function public.crear_cuenta_libre(jsonb), public.mi_cuenta_libre(), public.marcar_libre(uuid, date, boolean),
  public.ajustar_cuenta_libre(jsonb), public.pedir_acompanamiento_libre(text), public.borrar_mi_cuenta_libre(),
  public.cuentas_creadas(), public.dar_acceso_completo(uuid, text, text) to authenticated;

commit;
