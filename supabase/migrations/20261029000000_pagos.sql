-- B4 · Registro manual de pagos y devoluciones (condiciones aprobadas el 10-oct-2026:
-- transferencia en Chile, PayPal fuera de Chile; devoluciones según las semanas no empezadas).
-- Solo registra lo que el dueño confirma: no cobra, no conecta medios de pago ni cambia precios.

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  ciclo_id uuid not null references public.ciclos(id) on delete cascade,
  monto integer not null check (monto > 0),
  moneda text not null check (moneda in ('CLP','USD')),
  medio text not null check (medio in ('transferencia','paypal')),
  pagado_en date not null,
  referencia text check (char_length(referencia) <= 80),
  devuelto integer not null default 0 check (devuelto >= 0),
  devuelto_en date,
  devolucion_motivo text check (devolucion_motivo in ('retiro_antes_del_inicio','semanas_no_empezadas','otro')),
  registrado_por uuid,
  creado_en timestamptz not null default now(),
  check (devuelto <= monto),
  check ((devuelto = 0) = (devuelto_en is null)),
  check ((devuelto = 0) = (devolucion_motivo is null))
);
create unique index pagos_un_pago_por_ciclo on public.pagos (ciclo_id);
alter table public.pagos enable row level security;
revoke all on public.pagos from anon, authenticated;
grant select on public.pagos to authenticated;
create policy admin_leer on public.pagos for select to authenticated using (privado.es_admin());
create policy yo_leer on public.pagos for select to authenticated
  using (participante_id = (select privado.mi_participante_id()));
create or replace trigger auditar after insert or update or delete on public.pagos
  for each row execute function privado.auditar_cambio();

-- Registrar el pago de un ciclo. El monto por defecto es el precio acordado del ciclo (en CLP).
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
  v_monto := coalesce(p_monto, case when p_moneda = 'CLP' then c.precio_acordado_clp end);
  if v_monto is null or v_monto <= 0 then perform privado.error('monto','invalido'); end if;
  if exists (select 1 from public.pagos where ciclo_id = p_ciclo) then perform privado.error('pago','ya_registrado','409'); end if;
  insert into public.pagos (participante_id, ciclo_id, monto, moneda, medio, pagado_en, referencia, registrado_por)
  values (c.participante_id, c.id, v_monto, p_moneda, p_medio, p_pagado_en, nullif(btrim(p_referencia), ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- Calcula la devolución que corresponde según las condiciones: 100 % antes del inicio;
-- después, la parte de las semanas que aún no empiezan.
create or replace function public.devolucion_sugerida(p_pago uuid, p_fecha date default current_date) returns integer
language plpgsql stable security definer set search_path = '' as $$
declare g public.pagos%rowtype; c public.ciclos%rowtype; v_empezadas int;
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  select * into g from public.pagos where id = p_pago;
  if g.id is null then perform privado.error('pago','no_encontrado','404'); end if;
  select * into c from public.ciclos where id = g.ciclo_id;
  if p_fecha < c.inicio then return g.monto - g.devuelto; end if;
  v_empezadas := least(c.semanas, ((p_fecha - c.inicio) / 7) + 1);
  return greatest(0, (g.monto * (c.semanas - v_empezadas)) / c.semanas - g.devuelto);
end $$;

create or replace function public.registrar_devolucion(p_pago uuid, p_monto integer, p_motivo text,
  p_devuelto_en date default current_date) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.pagos%rowtype;
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  select * into g from public.pagos where id = p_pago for update;
  if g.id is null then perform privado.error('pago','no_encontrado','404'); end if;
  if p_motivo not in ('retiro_antes_del_inicio','semanas_no_empezadas','otro') then perform privado.error('motivo','invalido'); end if;
  if p_monto is null or p_monto <= 0 or g.devuelto + p_monto > g.monto then perform privado.error('monto','invalido'); end if;
  if p_devuelto_en is null or p_devuelto_en > current_date then perform privado.error('fecha','invalida'); end if;
  update public.pagos set devuelto = devuelto + p_monto, devuelto_en = p_devuelto_en, devolucion_motivo = p_motivo
   where id = p_pago;
end $$;

revoke all on function public.registrar_pago(uuid, text, date, integer, text, text),
  public.devolucion_sugerida(uuid, date), public.registrar_devolucion(uuid, integer, text, date) from public, anon, authenticated;
grant execute on function public.registrar_pago(uuid, text, date, integer, text, text),
  public.devolucion_sugerida(uuid, date), public.registrar_devolucion(uuid, integer, text, date) to authenticated;

-- Los pagos también forman parte de la copia de mis datos.
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
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;
