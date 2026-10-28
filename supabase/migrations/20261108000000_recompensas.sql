-- E1 · Reconocimientos y recompensas (función 18 del inventario), según lo decidido por Diego el
-- 21-oct-2026. No cambia niveles, créditos, rachas ni multiplicadores: solo los lee.
--
-- Reconocimientos digitales: primer paso, primera semana, constancia, mitad del camino, ciclo
-- completado y meta alcanzada. Se otorgan solos (tarea por hora), una vez por persona (primer
-- paso), por ciclo o por meta. La persona los ve y recibe aviso solo con el módulo
-- «reconocimientos» habilitado por el dueño, y nunca aviso si ocultó la gamificación.
--
-- Beneficio comercial: 10 % de descuento en UNA renovación para quien completa todas las acciones
-- programadas de su ciclo de 28 días. Cuentan solo las acciones vigentes (lo programado más los
-- ajustes autorizados; lo anulado por ajuste o pausa no cuenta). No acumulable: una renovación
-- lleva a lo más un beneficio. Viene APAGADO: el dueño edita porcentaje y condiciones y lo activa
-- cuando decida (con el beneficio activo no se cambian sus condiciones; hay que apagarlo antes).
-- El catálogo admite convenios con tiendas, descuentos de especialistas y premios físicos, que el
-- dueño otorga a mano y solo si están activos. No cobra ni toca precios: el descuento se descuenta
-- del monto sugerido al registrar el pago.

-- 1. Reconocimientos --------------------------------------------------------------------------
create table public.reconocimientos (
  clave text primary key check (clave in ('primer_paso','primera_semana','constancia','mitad_del_camino',
                                          'ciclo_completado','meta_alcanzada')),
  nombre text not null check (char_length(nombre) between 3 and 40),
  descripcion text not null check (char_length(descripcion) between 10 and 200),
  umbral smallint check (umbral between 1 and 100),   -- constancia: días de racha; mitad: % hecho
  activo boolean not null default true,
  orden smallint not null default 0,
  actualizado_en timestamptz not null default now()
);
alter table public.reconocimientos enable row level security;
revoke all on public.reconocimientos from anon, authenticated;
grant select on public.reconocimientos to authenticated;
create policy con_sesion_leer on public.reconocimientos for select to authenticated using (true);
create or replace trigger auditar after insert or update or delete on public.reconocimientos
  for each row execute function privado.auditar_cambio();

insert into public.reconocimientos (clave, nombre, descripcion, umbral, orden) values
  ('primer_paso', 'Primer paso', 'Marcaste tu primera acción.', null, 1),
  ('primera_semana', 'Primera semana', 'Terminaste la primera semana de tu ciclo con acciones hechas.', null, 2),
  ('constancia', 'Constancia', 'Sostuviste una racha de días seguidos en tu ciclo.', 7, 3),
  ('mitad_del_camino', 'Mitad del camino', 'Llegaste a la mitad del ciclo con buena parte de lo programado hecho.', 50, 4),
  ('ciclo_completado', 'Ciclo completado', 'Llegaste al final de tu ciclo.', null, 5),
  ('meta_alcanzada', 'Meta alcanzada', 'Lograste todos los hitos de una meta.', null, 6);

create table public.reconocimientos_otorgados (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  clave text not null references public.reconocimientos(clave),
  referencia text not null,          -- 'unico', el id del ciclo o la clave de la meta
  otorgado_en timestamptz not null default now(),
  unique (participante_id, clave, referencia)
);
alter table public.reconocimientos_otorgados enable row level security;
revoke all on public.reconocimientos_otorgados from anon, authenticated;
grant select on public.reconocimientos_otorgados to authenticated;
create policy equipo_leer on public.reconocimientos_otorgados for select to authenticated
  using (privado.gestiona(participante_id));
create policy yo_leer on public.reconocimientos_otorgados for select to authenticated
  using (participante_id = (select privado.mi_participante_id()));

alter table public.avisos drop constraint avisos_tipo_check;
alter table public.avisos add constraint avisos_tipo_check check (tipo in ('revision_publicada','ajuste_respondido',
  'programa_publicado','registro_enviado','ajuste_pedido','videollamada_programada',
  'recordatorio_acciones','recordatorio_registro','reporte_comunidad','reconocimiento','beneficio_disponible'));

-- El dueño ajusta nombre, texto, umbral y si un reconocimiento se otorga. p: nombre, descripcion,
-- umbral, activo. Lo ya otorgado no cambia.
create or replace function public.guardar_reconocimiento(p_clave text, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  begin
    update public.reconocimientos set
      nombre = coalesce(btrim(p->>'nombre'), nombre),
      descripcion = coalesce(btrim(p->>'descripcion'), descripcion),
      umbral = case when p ? 'umbral' then (p->>'umbral')::smallint else umbral end,
      activo = coalesce((p->>'activo')::boolean, activo),
      actualizado_en = now()
     where clave = p_clave;
    if not found then perform privado.error('reconocimiento','no_encontrado','404'); end if;
  exception when check_violation or not_null_violation or invalid_text_representation or numeric_value_out_of_range then
    perform privado.error('reconocimiento','invalido');
  end;
end $$;

-- Otorga lo que corresponde al día indicado (por defecto, hoy en Chile). Devuelve cuántos otorgó.
create or replace function privado.otorgar_reconocimientos(p_hoy date default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_hoy date := coalesce(p_hoy, privado.hoy_chile());
  v_visible boolean := public.modulo_visible('reconocimientos');
  v_racha int := coalesce((select umbral from public.reconocimientos where clave = 'constancia'), 7);
  v_mitad int := coalesce((select umbral from public.reconocimientos where clave = 'mitad_del_camino'), 50);
  r record; v_n int := 0;
begin
  for r in
    with hechas as (
      select o.participante_id, o.ciclo_id, o.fecha from public.ocurrencias o
        join public.registros g on g.ocurrencia_id = o.id and g.estado in ('hecha','aprobada')
       where o.vigente and o.fecha <= v_hoy),
    candidatos as (
      select distinct h.participante_id, 'primer_paso' clave, 'unico' referencia from hechas h
      union
      select distinct c.participante_id, 'primera_semana', c.id::text from public.ciclos c
        join hechas h on h.ciclo_id = c.id and h.fecha between c.inicio and c.inicio + 6
       where v_hoy >= c.inicio + 7
      union
      select distinct c.participante_id, 'constancia', c.id::text from public.ciclos c
        join public.progreso_diario d on d.participante_id = c.participante_id and d.fecha between c.inicio and least(c.fin, v_hoy)
       where d.racha >= v_racha
      union
      select c.participante_id, 'mitad_del_camino', c.id::text from public.ciclos c
        join public.ocurrencias o on o.ciclo_id = c.id and o.vigente and o.fecha < c.inicio + c.semanas * 7 / 2
        left join public.registros g on g.ocurrencia_id = o.id and g.estado in ('hecha','aprobada')
       where v_hoy >= c.inicio + c.semanas * 7 / 2
       group by c.participante_id, c.id
      having count(g.id) * 100 >= v_mitad * count(o.id) and count(g.id) > 0
      union
      select distinct c.participante_id, 'ciclo_completado', c.id::text from public.ciclos c
        join hechas h on h.ciclo_id = c.id
       where v_hoy > c.fin and c.estado <> 'pausado'
      union
      select m.participante_id, 'meta_alcanzada', m.clave::text from public.metas m
        join public.programas g on g.id = m.programa_id and g.estado = 'publicado'
       where jsonb_array_length(m.hitos) > 0
         and not exists (select 1 from jsonb_array_elements(m.hitos) x where coalesce((x->>'logrado')::boolean, false) = false))
    insert into public.reconocimientos_otorgados (participante_id, clave, referencia)
    select k.participante_id, k.clave, k.referencia from candidatos k
      join public.reconocimientos z on z.clave = k.clave and z.activo
    on conflict (participante_id, clave, referencia) do nothing
    returning participante_id, clave
  loop
    v_n := v_n + 1;
    if v_visible and not coalesce((select ocultar_gamificacion from public.participantes where id = r.participante_id), true) then
      perform privado.avisar_app(r.participante_id, true, 'reconocimiento',
        'Nuevo reconocimiento: ' || (select nombre from public.reconocimientos where clave = r.clave), '/mi-espacio/');
    end if;
  end loop;
  return v_n;
end $$;
revoke execute on function privado.otorgar_reconocimientos(date) from public, anon, authenticated;

create or replace function public.mis_reconocimientos()
returns table (clave text, nombre text, descripcion text, referencia text, otorgado_en timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id();
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  if not public.modulo_visible('reconocimientos') then perform privado.error('modulo','no_disponible','409'); end if;
  return query select o.clave, z.nombre, z.descripcion, o.referencia, o.otorgado_en
    from public.reconocimientos_otorgados o join public.reconocimientos z on z.clave = o.clave
   where o.participante_id = v_yo order by o.otorgado_en, z.orden;
end $$;

-- 2. Beneficios ---------------------------------------------------------------------------------
create table public.beneficios (
  id uuid primary key default gen_random_uuid(),
  clave text not null unique check (clave ~ '^[a-z0-9_]{3,40}$'),
  tipo text not null check (tipo in ('descuento_renovacion','convenio_tienda','descuento_especialista','premio_fisico')),
  nombre text not null check (char_length(nombre) between 3 and 60),
  descripcion text not null check (char_length(descripcion) between 10 and 300),
  porcentaje smallint check (porcentaje between 1 and 100),
  condicion text check (condicion in ('todas_las_acciones_del_ciclo')),
  dias_ciclo smallint check (dias_ciclo in (28, 56, 84)),
  proveedor text check (char_length(proveedor) <= 80),   -- tienda o especialista, cuando aplique
  activo boolean not null default false,
  activado_en timestamptz,
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid,
  check (tipo <> 'descuento_renovacion' or (porcentaje is not null and condicion is not null and dias_ciclo is not null))
);
alter table public.beneficios enable row level security;
revoke all on public.beneficios from anon, authenticated;
grant select on public.beneficios to authenticated;
create policy admin_leer on public.beneficios for select to authenticated using (privado.es_admin());
create or replace trigger auditar after insert or update or delete on public.beneficios
  for each row execute function privado.auditar_cambio();

insert into public.beneficios (clave, tipo, nombre, descripcion, porcentaje, condicion, dias_ciclo) values
  ('renovacion_ciclo_completo', 'descuento_renovacion', '10 % en tu próxima renovación',
   'Por completar todas las acciones programadas de tu ciclo de 28 días. Se usa en una renovación y no se suma a otros descuentos.',
   10, 'todas_las_acciones_del_ciclo', 28);

create table public.beneficios_otorgados (
  id uuid primary key default gen_random_uuid(),
  beneficio_id uuid not null references public.beneficios(id),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  ciclo_origen uuid references public.ciclos(id) on delete set null,   -- el ciclo que lo ganó (automáticos)
  porcentaje smallint check (porcentaje between 1 and 100),            -- el vigente al otorgarlo
  nota text check (char_length(nota) <= 200),
  estado text not null default 'disponible' check (estado in ('disponible','aplicado','anulado')),
  aplicado_en_ciclo uuid references public.ciclos(id) on delete set null,
  descuento_clp integer check (descuento_clp >= 0),
  otorgado_en timestamptz not null default now(),
  aplicado_en timestamptz,
  otorgado_por uuid,
  unique (beneficio_id, ciclo_origen),
  check ((estado = 'aplicado') = (aplicado_en_ciclo is not null))
);
-- No acumulable: una renovación lleva a lo más un beneficio.
create unique index beneficios_uno_por_ciclo on public.beneficios_otorgados (aplicado_en_ciclo) where aplicado_en_ciclo is not null;
alter table public.beneficios_otorgados enable row level security;
revoke all on public.beneficios_otorgados from anon, authenticated;
grant select on public.beneficios_otorgados to authenticated;
create policy admin_leer on public.beneficios_otorgados for select to authenticated using (privado.es_admin());
create policy yo_leer on public.beneficios_otorgados for select to authenticated
  using (participante_id = (select privado.mi_participante_id()));
create or replace trigger auditar after insert or update or delete on public.beneficios_otorgados
  for each row execute function privado.auditar_cambio();

-- Crear (p_id null) o editar un beneficio. p: clave, tipo, nombre, descripcion, porcentaje,
-- condicion, dias_ciclo, proveedor, activo. Activo, solo se cambian nombre, descripción y activo.
create or replace function public.guardar_beneficio(p_id uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare b public.beneficios%rowtype; v_id uuid; v_activo boolean;
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  if p_id is not null then
    select * into b from public.beneficios where id = p_id for update;
    if b.id is null then perform privado.error('beneficio','no_encontrado','404'); end if;
    if b.activo and coalesce((p->>'activo')::boolean, true)
       and (p ?| array['clave','tipo','porcentaje','condicion','dias_ciclo','proveedor']) then
      perform privado.error('beneficio','activo','409');
    end if;
  end if;
  begin
    if p_id is null then
      insert into public.beneficios (clave, tipo, nombre, descripcion, porcentaje, condicion, dias_ciclo, proveedor, actualizado_por)
      values (p->>'clave', p->>'tipo', btrim(p->>'nombre'), btrim(p->>'descripcion'), (p->>'porcentaje')::smallint,
              nullif(p->>'condicion', ''), (p->>'dias_ciclo')::smallint, nullif(btrim(p->>'proveedor'), ''), auth.uid())
      returning id into v_id;
    else
      v_activo := coalesce((p->>'activo')::boolean, b.activo);
      update public.beneficios set
        clave = coalesce(p->>'clave', clave),
        tipo = coalesce(p->>'tipo', tipo),
        nombre = coalesce(btrim(p->>'nombre'), nombre),
        descripcion = coalesce(btrim(p->>'descripcion'), descripcion),
        porcentaje = case when p ? 'porcentaje' then (p->>'porcentaje')::smallint else porcentaje end,
        condicion = case when p ? 'condicion' then nullif(p->>'condicion', '') else condicion end,
        dias_ciclo = case when p ? 'dias_ciclo' then (p->>'dias_ciclo')::smallint else dias_ciclo end,
        proveedor = case when p ? 'proveedor' then nullif(btrim(p->>'proveedor'), '') else proveedor end,
        activo = v_activo,
        activado_en = case when v_activo and not b.activo then now() when not v_activo then null else activado_en end,
        actualizado_en = now(), actualizado_por = auth.uid()
       where id = p_id
      returning id into v_id;
    end if;
  exception when check_violation or not_null_violation or invalid_text_representation or numeric_value_out_of_range
                 or unique_violation then
    perform privado.error('beneficio','invalido');
  end;
  return v_id;
end $$;

-- Otorga el descuento de renovación a quien completó su ciclo. Solo beneficios activos; corre
-- con la tarea por hora y no repite (uno por ciclo). Devuelve cuántos otorgó.
create or replace function privado.evaluar_beneficios(p_hoy date default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_hoy date := coalesce(p_hoy, privado.hoy_chile()); r record; v_n int := 0;
begin
  for r in
    insert into public.beneficios_otorgados (beneficio_id, participante_id, ciclo_origen, porcentaje)
    select b.id, c.participante_id, c.id, b.porcentaje
      from public.beneficios b
      join public.ciclos c on c.semanas * 7 = b.dias_ciclo and c.fin < v_hoy and c.estado <> 'pausado'
     where b.activo and b.tipo = 'descuento_renovacion' and b.condicion = 'todas_las_acciones_del_ciclo'
       and exists (select 1 from public.ocurrencias o where o.ciclo_id = c.id and o.vigente)
       and not exists (select 1 from public.ocurrencias o where o.ciclo_id = c.id and o.vigente
                         and not exists (select 1 from public.registros g where g.ocurrencia_id = o.id
                                           and g.estado in ('hecha','aprobada')))
    on conflict (beneficio_id, ciclo_origen) do nothing
    returning participante_id, beneficio_id
  loop
    v_n := v_n + 1;
    perform privado.avisar_app(r.participante_id, true, 'beneficio_disponible',
      'Ganaste un beneficio: ' || (select nombre from public.beneficios where id = r.beneficio_id), '/mi-espacio/');
  end loop;
  return v_n;
end $$;
revoke execute on function privado.evaluar_beneficios(date) from public, anon, authenticated;

-- Beneficios del catálogo que no se ganan solos (convenios, especialistas, premios): los otorga
-- el dueño a una persona, solo si están activos.
create or replace function public.otorgar_beneficio(p_beneficio uuid, p_participante uuid, p_nota text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare b public.beneficios%rowtype; v_id uuid;
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  select * into b from public.beneficios where id = p_beneficio;
  if b.id is null then perform privado.error('beneficio','no_encontrado','404'); end if;
  if not b.activo then perform privado.error('beneficio','inactivo','409'); end if;
  if b.tipo = 'descuento_renovacion' then perform privado.error('beneficio','automatico','409'); end if;
  if not exists (select 1 from public.participantes where id = p_participante) then
    perform privado.error('participante','no_encontrado','404'); end if;
  insert into public.beneficios_otorgados (beneficio_id, participante_id, porcentaje, nota, otorgado_por)
  values (b.id, p_participante, b.porcentaje, nullif(left(btrim(p_nota), 200), ''), auth.uid())
  returning id into v_id;
  perform privado.avisar_app(p_participante, true, 'beneficio_disponible', 'Ganaste un beneficio: ' || b.nombre, '/mi-espacio/');
  return v_id;
end $$;

-- Aplicar un descuento de renovación a un ciclo posterior de la misma persona, antes de registrar
-- su pago. Devuelve el descuento en pesos (sobre el precio acordado del ciclo).
create or replace function public.aplicar_beneficio(p_otorgado uuid, p_ciclo uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare o public.beneficios_otorgados%rowtype; b public.beneficios%rowtype; c public.ciclos%rowtype; v_origen int; v_desc int;
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  select * into o from public.beneficios_otorgados where id = p_otorgado for update;
  if o.id is null then perform privado.error('beneficio','no_encontrado','404'); end if;
  select * into b from public.beneficios where id = o.beneficio_id;
  if b.tipo <> 'descuento_renovacion' then perform privado.error('beneficio','no_es_descuento','409'); end if;
  if o.estado <> 'disponible' then perform privado.error('beneficio','ya_usado','409'); end if;
  select * into c from public.ciclos where id = p_ciclo;
  if c.id is null or c.participante_id <> o.participante_id then perform privado.error('ciclo','no_encontrado','404'); end if;
  select numero into v_origen from public.ciclos where id = o.ciclo_origen;
  if v_origen is not null and c.numero <= v_origen then perform privado.error('ciclo','no_es_renovacion','409'); end if;
  if c.precio_acordado_clp is null then perform privado.error('ciclo','sin_precio','409'); end if;
  if exists (select 1 from public.pagos where ciclo_id = p_ciclo) then perform privado.error('pago','ya_registrado','409'); end if;
  v_desc := round(c.precio_acordado_clp * o.porcentaje / 100.0);
  begin
    update public.beneficios_otorgados set estado = 'aplicado', aplicado_en_ciclo = p_ciclo, descuento_clp = v_desc,
           aplicado_en = now() where id = p_otorgado;
  exception when unique_violation then
    perform privado.error('beneficio','no_acumulable','409');
  end;
  return v_desc;
end $$;

create or replace function public.mis_beneficios()
returns table (id uuid, nombre text, descripcion text, tipo text, porcentaje smallint, estado text,
               descuento_clp integer, otorgado_en timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id();
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  return query select o.id, b.nombre, b.descripcion, b.tipo, o.porcentaje, o.estado, o.descuento_clp, o.otorgado_en
    from public.beneficios_otorgados o join public.beneficios b on b.id = o.beneficio_id
   where o.participante_id = v_yo and o.estado <> 'anulado' order by o.otorgado_en;
end $$;

revoke all on function public.guardar_reconocimiento(text, jsonb), public.mis_reconocimientos(),
  public.guardar_beneficio(uuid, jsonb), public.otorgar_beneficio(uuid, uuid, text), public.aplicar_beneficio(uuid, uuid),
  public.mis_beneficios() from public, anon, authenticated;
grant execute on function public.guardar_reconocimiento(text, jsonb), public.mis_reconocimientos(),
  public.guardar_beneficio(uuid, jsonb), public.otorgar_beneficio(uuid, uuid, text), public.aplicar_beneficio(uuid, uuid),
  public.mis_beneficios() to authenticated;

-- 3. El pago de una renovación con descuento sugiere el monto ya descontado ----------------------
create or replace function public.registrar_pago(p_ciclo uuid, p_medio text, p_pagado_en date,
  p_monto integer default null, p_moneda text default 'CLP', p_referencia text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare c public.ciclos%rowtype; v_id uuid; v_monto integer;
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  select * into c from public.ciclos where id = p_ciclo;
  if c.id is null then perform privado.error('ciclo','no_encontrado','404'); end if;
  if p_moneda not in ('CLP','USD') then perform privado.error('moneda','invalida'); end if;
  if p_medio not in ('transferencia','paypal') then perform privado.error('medio','invalido'); end if;
  if p_pagado_en is null or p_pagado_en > current_date then perform privado.error('fecha','invalida'); end if;
  v_monto := coalesce(p_monto, case when p_moneda = 'CLP' then c.precio_acordado_clp
    - coalesce((select descuento_clp from public.beneficios_otorgados where aplicado_en_ciclo = c.id), 0) end);
  if v_monto is null or v_monto <= 0 then perform privado.error('monto','invalido'); end if;
  if exists (select 1 from public.pagos where ciclo_id = p_ciclo) then perform privado.error('pago','ya_registrado','409'); end if;
  insert into public.pagos (participante_id, ciclo_id, monto, moneda, medio, pagado_en, referencia, registrado_por)
  values (c.participante_id, c.id, v_monto, p_moneda, p_medio, p_pagado_en, nullif(btrim(p_referencia), ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- 4. Tarea por hora y copia de mis datos -------------------------------------------------------
create or replace function privado.tareas_por_hora() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from privado.limites where ventana < now() - interval '48 hours';
  delete from privado.sales where fecha < privado.hoy_chile() - 1;
  if extract(hour from now() at time zone 'America/Santiago') = 9 then perform privado.resumen_diario(); end if;
  perform privado.enviar_recordatorios();
  perform privado.otorgar_reconocimientos();
  perform privado.evaluar_beneficios();
end $$;

create or replace function public.exportar_mis_datos() returns jsonb
language sql stable security definer set search_path = '' as $$
  with yo as (select privado.mi_participante_id() as id)
  select jsonb_build_object(
    'generado_en', now(),
    'perfil',   (select to_jsonb(p) - 'user_id' from public.participantes p, yo where p.id = yo.id),
    'ciclos',   (select jsonb_agg(to_jsonb(c)) from public.ciclos c, yo where c.participante_id = yo.id),
    'metas',    (select jsonb_agg(to_jsonb(m)) from public.metas m join public.programas g on g.id = m.programa_id, yo
                  where m.participante_id = yo.id and g.estado <> 'borrador'),
    'acciones', (select jsonb_agg(to_jsonb(o) || jsonb_build_object('registro', to_jsonb(r) - 'participante_id'))
                  from public.ocurrencias o left join public.registros r on r.ocurrencia_id = o.id, yo
                  where o.participante_id = yo.id),
    'registros_semanales', (select jsonb_agg(to_jsonb(s)) from public.registros_semanales s, yo where s.participante_id = yo.id),
    'revisiones', (select jsonb_agg(to_jsonb(v)) from public.revisiones v, yo where v.participante_id = yo.id and v.publicada_en is not null),
    'solicitudes_ajuste', (select jsonb_agg(to_jsonb(a)) from public.solicitudes_ajuste a, yo where a.participante_id = yo.id),
    'pagos', (select jsonb_agg(to_jsonb(x) - 'registrado_por') from public.pagos x, yo where x.participante_id = yo.id),
    'videollamadas', (select jsonb_agg(to_jsonb(x) - 'registrada_por') from public.videollamadas x, yo where x.participante_id = yo.id),
    'recordatorios', (select to_jsonb(x) from public.recordatorios x, yo where x.participante_id = yo.id),
    'alias', (select to_jsonb(x) from public.alias x, yo where x.participante_id = yo.id),
    'publicaciones', (select jsonb_agg(to_jsonb(x) - 'moderada_por') from public.publicaciones x, yo where x.autor = yo.id),
    'reportes', (select jsonb_agg(to_jsonb(x)) from public.reportes_comunidad x, yo where x.reportante = yo.id),
    'reconocimientos', (select jsonb_agg(to_jsonb(x)) from public.reconocimientos_otorgados x, yo where x.participante_id = yo.id),
    'beneficios', (select jsonb_agg(to_jsonb(x) - 'otorgado_por') from public.beneficios_otorgados x, yo where x.participante_id = yo.id),
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;
