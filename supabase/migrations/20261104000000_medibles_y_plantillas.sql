-- C4 · Acciones medibles y plantillas (función 22 del inventario).
-- Medibles: una acción puede llevar una cantidad objetivo y su unidad (p. ej. 20 «minutos», 3
-- «vasos»). La persona anota cuánto hizo después de marcarla. La cantidad es informativa: marcar
-- la acción, los créditos, rachas y niveles no cambian.
-- Plantillas: acciones tipo que el equipo reutiliza en el constructor. Las ve el equipo (dueño y
-- coaches, con TOTP); cada uno edita las suyas, el dueño todas; se archivan, no se borran.

alter table public.acciones add column cantidad_objetivo integer check (cantidad_objetivo between 1 and 10000),
  add column unidad text check (char_length(unidad) between 1 and 20);
alter table public.acciones add constraint acciones_medible check ((cantidad_objetivo is null) = (unidad is null));
alter table public.registros add column cantidad integer check (cantidad between 0 and 100000);

-- Lo medible de mis acciones en un rango de fechas (la persona no lee la tabla acciones).
create or replace function public.mis_medibles(p_desde date, p_hasta date)
returns table (ocurrencia_id uuid, cantidad_objetivo integer, unidad text, cantidad integer)
language sql stable security definer set search_path = '' as $$
  select o.id, a.cantidad_objetivo, a.unidad, r.cantidad
    from public.ocurrencias o
    join public.acciones a on a.id = o.accion_id and a.unidad is not null
    left join public.registros r on r.ocurrencia_id = o.id
   where o.participante_id = privado.mi_participante_id() and o.fecha between p_desde and p_hasta
     and p_hasta - p_desde <= 92
   order by o.fecha;
$$;

-- Anotar cuánto hice en una acción medible ya marcada (o borrar la cifra con null).
create or replace function public.anotar_cantidad(p_ocurrencia uuid, p_cantidad integer) returns void
language plpgsql security definer set search_path = '' as $$
declare o public.ocurrencias%rowtype; v_unidad text;
begin
  select * into o from public.ocurrencias where id = p_ocurrencia and participante_id = privado.mi_participante_id();
  if o.id is null then perform privado.error('accion','no_encontrada','404'); end if;
  select unidad into v_unidad from public.acciones where id = o.accion_id;
  if v_unidad is null then perform privado.error('accion','no_medible'); end if;
  if p_cantidad is not null and (p_cantidad < 0 or p_cantidad > 100000) then perform privado.error('cantidad','invalida'); end if;
  update public.registros set cantidad = p_cantidad, actualizado_en = now()
   where ocurrencia_id = p_ocurrencia and estado in ('hecha','en_revision','aprobada');
  if not found then perform privado.error('accion','sin_marcar','409'); end if;
end $$;

create table public.plantillas_accion (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) between 2 and 60),
  instrucciones text not null check (char_length(instrucciones) between 1 and 800),
  version_corta text check (char_length(version_corta) <= 200),
  duracion_min smallint not null check (duracion_min between 5 and 240),
  requiere_foto boolean not null default false,
  cantidad_objetivo integer check (cantidad_objetivo between 1 and 10000),
  unidad text check (char_length(unidad) between 1 and 20),
  area_id text references public.areas(id),
  autor uuid not null,
  archivada boolean not null default false,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  check ((cantidad_objetivo is null) = (unidad is null))
);
alter table public.plantillas_accion enable row level security;
revoke all on public.plantillas_accion from anon, authenticated;
grant select on public.plantillas_accion to authenticated;
create policy equipo_leer on public.plantillas_accion for select to authenticated
  using (privado.es_dueno() or privado.es_coach());
create or replace trigger auditar after insert or update or delete on public.plantillas_accion
  for each row execute function privado.auditar_cambio();

-- Crear (p_id null) o editar una plantilla. p: titulo, instrucciones, version_corta, duracion_min,
-- requiere_foto, cantidad_objetivo, unidad, area_id, archivada.
create or replace function public.guardar_plantilla(p_id uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare t public.plantillas_accion%rowtype; v_id uuid;
begin
  if not (privado.es_dueno() or privado.es_coach()) then perform privado.error('sesion','no_autorizado','403'); end if;
  if p_id is not null then
    select * into t from public.plantillas_accion where id = p_id for update;
    if t.id is null then perform privado.error('plantilla','no_encontrada','404'); end if;
    if t.autor <> auth.uid() and not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  end if;
  begin
    if p_id is null then
      insert into public.plantillas_accion (titulo, instrucciones, version_corta, duracion_min, requiere_foto,
                                            cantidad_objetivo, unidad, area_id, autor)
      values (btrim(p->>'titulo'), btrim(p->>'instrucciones'), nullif(btrim(p->>'version_corta'), ''),
              (p->>'duracion_min')::smallint, coalesce((p->>'requiere_foto')::boolean, false),
              (p->>'cantidad_objetivo')::int, nullif(btrim(p->>'unidad'), ''), nullif(p->>'area_id', ''), auth.uid())
      returning id into v_id;
    else
      update public.plantillas_accion set
        titulo = coalesce(btrim(p->>'titulo'), titulo),
        instrucciones = coalesce(btrim(p->>'instrucciones'), instrucciones),
        version_corta = case when p ? 'version_corta' then nullif(btrim(p->>'version_corta'), '') else version_corta end,
        duracion_min = coalesce((p->>'duracion_min')::smallint, duracion_min),
        requiere_foto = coalesce((p->>'requiere_foto')::boolean, requiere_foto),
        cantidad_objetivo = case when p ? 'cantidad_objetivo' then (p->>'cantidad_objetivo')::int else cantidad_objetivo end,
        unidad = case when p ? 'unidad' then nullif(btrim(p->>'unidad'), '') else unidad end,
        area_id = case when p ? 'area_id' then nullif(p->>'area_id', '') else area_id end,
        archivada = coalesce((p->>'archivada')::boolean, archivada),
        actualizada_en = now()
       where id = p_id
      returning id into v_id;
    end if;
  exception when check_violation or not_null_violation or invalid_text_representation or foreign_key_violation then
    perform privado.error('plantilla','invalida');
  end;
  return v_id;
end $$;

revoke all on function public.mis_medibles(date, date), public.anotar_cantidad(uuid, integer),
  public.guardar_plantilla(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.mis_medibles(date, date), public.anotar_cantidad(uuid, integer),
  public.guardar_plantilla(uuid, jsonb) to authenticated;
