-- A1 (Rumbo 2.0): roles del equipo (dueño y coach), permiso de moderación y coach principal.
-- Lo que hoy hace el «equipo» queda para el DUEÑO (privado.es_admin() pasa a significar «es
-- dueño»). Al coach se le abre solo lo de su trabajo, y solo con los participantes que tiene
-- asignados; al reasignar, el coach anterior pierde el acceso. Todo exige segundo factor (aal2).
-- Decisiones de Diego (21-oct-2026): solo el dueño pausa o reanuda; el coach ve el correo de los
-- suyos; el coach no lee las postulaciones; las reasignaciones quedan registradas.

-- 1. Estructura -------------------------------------------------------------
alter table public.equipo
  add column if not exists rol text not null default 'coach' check (rol in ('dueno','coach')),
  add column if not exists puede_moderar boolean not null default false,
  add column if not exists activo boolean not null default true;
-- Las cuentas que ya existen (hoy, solo Diego) quedan como dueño: nadie pierde acceso.
update public.equipo set rol = 'dueno' where rol = 'coach' and not exists (select 1 from public.equipo where rol = 'dueno');

alter table public.participantes
  add column if not exists coach_id uuid references public.equipo(user_id) on delete set null;
create index if not exists participantes_coach on public.participantes (coach_id);

-- Historial de asignaciones: quién acompañó a quién y desde cuándo (sin contenido personal).
create table if not exists public.asignaciones_coach (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  coach_id uuid references public.equipo(user_id) on delete set null,
  desde timestamptz not null default now(),
  hasta timestamptz,
  asignado_por uuid,
  motivo text check (char_length(motivo) <= 200)
);
create unique index if not exists asignacion_vigente on public.asignaciones_coach (participante_id) where hasta is null;
alter table public.asignaciones_coach enable row level security;
revoke all on public.asignaciones_coach from anon, authenticated;

-- 2. Quién es quién -----------------------------------------------------------
create or replace function privado.es_dueno() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
     and exists (select 1 from public.equipo e where e.user_id = auth.uid() and e.rol = 'dueno' and e.activo);
$$;
-- Compatibilidad: todo lo que hoy exige es_admin() queda solo para el dueño.
create or replace function privado.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$ select privado.es_dueno(); $$;

create or replace function privado.es_coach() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
     and exists (select 1 from public.equipo e where e.user_id = auth.uid() and e.rol = 'coach' and e.activo);
$$;
-- ¿Quien llama puede gestionar a este participante? El dueño, a todos; el coach, a los suyos.
create or replace function privado.gestiona(p_participante uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select privado.es_dueno()
      or (privado.es_coach() and exists (select 1 from public.participantes p
                                          where p.id = p_participante and p.coach_id = auth.uid()));
$$;
create or replace function privado.puede_moderar() returns boolean
language sql stable security definer set search_path = '' as $$
  select privado.es_dueno()
      or (privado.es_coach() and exists (select 1 from public.equipo e where e.user_id = auth.uid() and e.puede_moderar));
$$;

-- Siempre queda al menos un dueño activo.
create or replace function privado.equipo_guardia() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.equipo where rol = 'dueno' and activo) then
    perform privado.error('equipo','sin_dueno','409');
  end if;
  return null;
end $$;
create or replace trigger guardia_dueno after update or delete on public.equipo
  for each statement execute function privado.equipo_guardia();

-- 3. Permisos del coach (solo sus participantes) --------------------------------
-- Lectura de lo que necesita para acompañar.
do $$ declare t text; begin
  foreach t in array array['ciclos','ocurrencias','registros','progreso','progreso_diario','registros_semanales',
                           'programas','metas','revisiones','solicitudes_ajuste'] loop
    execute format('create policy coach_leer on public.%I for select to authenticated
                    using (privado.gestiona(participante_id))', t);
  end loop;
end $$;
create policy coach_leer on public.participantes for select to authenticated using (privado.gestiona(id));
create policy coach_leer on public.acciones for select to authenticated
  using (exists (select 1 from public.programas g where g.id = programa_id and privado.gestiona(g.participante_id)));

-- Escritura de su trabajo: constructor (programas, metas y acciones; los disparadores de hoy ya
-- impiden tocar lo publicado), revisiones semanales y respuesta a solicitudes de ajuste.
do $$ declare t text; begin
  foreach t in array array['programas','metas','revisiones'] loop
    execute format('create policy coach_escribir on public.%I for insert to authenticated with check (privado.gestiona(participante_id))', t);
    execute format('create policy coach_modificar on public.%I for update to authenticated
                    using (privado.gestiona(participante_id)) with check (privado.gestiona(participante_id))', t);
    execute format('create policy coach_borrar on public.%I for delete to authenticated using (privado.gestiona(participante_id))', t);
  end loop;
end $$;
create policy coach_escribir on public.acciones for insert to authenticated
  with check (exists (select 1 from public.programas g where g.id = programa_id and privado.gestiona(g.participante_id)));
create policy coach_modificar on public.acciones for update to authenticated
  using (exists (select 1 from public.programas g where g.id = programa_id and privado.gestiona(g.participante_id)))
  with check (exists (select 1 from public.programas g where g.id = programa_id and privado.gestiona(g.participante_id)));
create policy coach_borrar on public.acciones for delete to authenticated
  using (exists (select 1 from public.programas g where g.id = programa_id and privado.gestiona(g.participante_id)));
create policy coach_modificar on public.solicitudes_ajuste for update to authenticated
  using (privado.gestiona(participante_id)) with check (privado.gestiona(participante_id));

-- El coach ve su propia fila del equipo y la del dueño (para saber a quién acudir); el dueño, todas.
create policy coach_leer on public.equipo for select to authenticated
  using (privado.es_coach() and (user_id = auth.uid() or rol = 'dueno'));
-- Historial de asignaciones: el dueño todo; el coach, el de sus participantes.
grant select on public.asignaciones_coach to authenticated;
create policy dueno_leer on public.asignaciones_coach for select to authenticated using (privado.es_dueno());
create policy coach_leer on public.asignaciones_coach for select to authenticated using (privado.gestiona(participante_id));

-- 4. Funciones: el coach usa las de su trabajo, con sus participantes --------------
-- Mismo cuerpo que en 20261008000001_funciones.sql; solo cambia la primera comprobación.
create or replace function public.solapamientos(p_programa uuid)
returns table (fecha date, accion_a uuid, accion_b uuid)
language sql stable security definer set search_path = '' as $$
  select x.fecha, x.accion_id, y.accion_id
  from privado.ocurrencias_previstas(p_programa) x
  join privado.ocurrencias_previstas(p_programa) y
    on x.fecha = y.fecha and x.accion_id < y.accion_id and x.hora is not null and y.hora is not null
   and x.hora < y.hora + make_interval(mins => y.duracion_min)
   and y.hora < x.hora + make_interval(mins => x.duracion_min)
  where privado.gestiona((select g.participante_id from public.programas g where g.id = p_programa));
$$;

create or replace function public.carga_prevista(p_programa uuid) returns table (fecha date, minutos int)
language sql stable security definer set search_path = '' as $$
  select fecha, sum(duracion_min)::int from privado.ocurrencias_previstas(p_programa)
  where privado.gestiona((select g.participante_id from public.programas g where g.id = p_programa))
  group by fecha order by fecha;
$$;

create or replace function public.publicar_programa(p_programa uuid, p_vigente_desde date,
  p_aceptar_solapamientos boolean default false, p_nota_cambios text default null, p_foco_inicial text default null)
returns int
language plpgsql security definer set search_path = '' as $$
declare v public.programas%rowtype; c public.ciclos%rowtype; v_hoy date; v_n int;
begin
  if not privado.gestiona((select g.participante_id from public.programas g where g.id = p_programa)) then
    perform privado.error('sesion','no_autorizado','403'); end if;
  select * into v from public.programas where id = p_programa for update;
  if v.id is null or v.estado <> 'borrador' then perform privado.error('programa','no_es_borrador','409'); end if;
  select * into c from public.ciclos where id = v.ciclo_id;
  v_hoy := privado.hoy_de(v.participante_id);
  if p_vigente_desde < v_hoy then perform privado.error('vigencia','pasada','409'); end if;
  -- Evita duplicar un día que ya tiene acciones registradas (la vigencia parte al día siguiente)
  if exists (select 1 from public.ocurrencias o join public.registros r on r.ocurrencia_id = o.id
             where o.ciclo_id = c.id and o.fecha >= p_vigente_desde) then
    perform privado.error('vigencia','con_registros','409'); end if;
  if exists (select 1 from public.metas m where m.programa_id = p_programa
             and not exists (select 1 from public.acciones a where a.meta_id = m.id)) then
    perform privado.error('meta','sin_acciones','409'); end if;
  if not p_aceptar_solapamientos and exists (select 1 from public.solapamientos(p_programa)) then
    perform privado.error('programa','solapamientos','409'); end if;

  perform set_config('rumbo.sistema', 'si', true);
  update public.programas set estado = 'reemplazado' where ciclo_id = c.id and estado = 'publicado';
  update public.ocurrencias set vigente = false, anulada_motivo = 'ajuste', anulada_en = v_hoy
   where ciclo_id = c.id and fecha >= p_vigente_desde and vigente;      -- se anulan, no se borran
  insert into public.ocurrencias (participante_id, ciclo_id, programa_id, accion_id, meta_clave, meta_titulo,
         categoria, fecha, hora, duracion_min, titulo, instrucciones, version_corta, requiere_foto)
  select v.participante_id, c.id, p_programa, a.id, m.clave, m.titulo, m.categoria,
         x.fecha, a.hora, a.duracion_min, a.titulo, a.instrucciones, a.version_corta, a.requiere_foto
  from privado.ocurrencias_previstas(p_programa) x
  join public.acciones a on a.id = x.accion_id
  join public.metas m on m.id = a.meta_id
  where x.fecha >= p_vigente_desde;
  get diagnostics v_n = row_count;
  -- Pausa vigente que no corta la racha: el periodo queda sin acciones
  if c.estado = 'pausado' and (select pausa_sin_acciones from public.ajustes_operacion) then
    update public.ocurrencias set vigente = false, anulada_motivo = 'pausa', anulada_en = v_hoy
     where ciclo_id = c.id and programa_id = p_programa
       and fecha between greatest(c.pausa_desde, v_hoy) and coalesce(c.pausa_hasta, c.fin);
  end if;
  update public.programas set estado = 'publicado', publicado_en = now(), vigente_desde = p_vigente_desde,
         nota_cambios = coalesce(left(p_nota_cambios, 600), nota_cambios) where id = p_programa;
  if p_foco_inicial is not null then update public.ciclos set foco_inicial = left(p_foco_inicial, 200) where id = c.id; end if;
  perform set_config('rumbo.sistema', 'no', true);
  perform privado.recalcular_progreso(v.participante_id);
  insert into public.auditoria (actor, accion, tabla, fila) values (auth.uid(), 'publicar', 'programas', p_programa);
  return v_n;
end $$;

-- Copia el programa publicado (o el indicado) como borrador v+1, conservando la clave de cada meta
create or replace function public.nuevo_borrador(p_ciclo uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_base public.programas%rowtype; v_nuevo uuid; m record; v_meta uuid; c public.ciclos%rowtype;
begin
  if not privado.gestiona((select cc.participante_id from public.ciclos cc where cc.id = p_ciclo)) then
    perform privado.error('sesion','no_autorizado','403'); end if;
  select id into v_nuevo from public.programas where ciclo_id = p_ciclo and estado = 'borrador';
  if v_nuevo is not null then return v_nuevo; end if;
  select * into c from public.ciclos where id = p_ciclo;
  select * into v_base from public.programas where ciclo_id = p_ciclo and estado = 'publicado';
  insert into public.programas (ciclo_id, participante_id, version)
  values (p_ciclo, c.participante_id, coalesce((select max(version) from public.programas where ciclo_id = p_ciclo), 0) + 1)
  returning id into v_nuevo;
  if v_base.id is not null then
    for m in select * from public.metas where programa_id = v_base.id loop
      insert into public.metas (programa_id, participante_id, clave, titulo, para_que, categoria, hitos, orden)
      values (v_nuevo, m.participante_id, m.clave, m.titulo, m.para_que, m.categoria, m.hitos, m.orden)
      returning id into v_meta;
      insert into public.acciones (programa_id, meta_id, titulo, instrucciones, version_corta, hora, duracion_min,
             dias, semana_desde, semanas, requiere_foto, orden)
      select v_nuevo, v_meta, titulo, instrucciones, version_corta, hora, duracion_min, dias, semana_desde,
             semanas, requiere_foto, orden from public.acciones where meta_id = m.id;
    end loop;
  end if;
  return v_nuevo;
end $$;

create or replace function public.revisar_evidencia(p_registro uuid, p_aprobar boolean, p_nota text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_part uuid;
begin
  if not privado.gestiona((select r.participante_id from public.registros r where r.id = p_registro)) then
    perform privado.error('sesion','no_autorizado','403'); end if;
  if not p_aprobar and coalesce(btrim(p_nota), '') = '' then perform privado.error('nota','requerida'); end if;
  update public.registros set estado = case when p_aprobar then 'aprobada' else 'rechazada' end,
         nota_revision = nullif(left(btrim(p_nota), 300), ''), revisado_en = now(), actualizado_en = now()
   where id = p_registro and estado = 'en_revision' returning participante_id into v_part;
  if v_part is null then perform privado.error('registro','no_pendiente','409'); end if;
  perform privado.recalcular_progreso(v_part);
end $$;



-- Fotos: además de la persona y el dueño, las ve el coach de esa persona.
create or replace function privado.foto_permitida(p_nombre text, p_subir boolean) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare v_part text := split_part(p_nombre, '/', 1); v_oc text := split_part(p_nombre, '/', 2);
        v_yo uuid := privado.mi_participante_id(); v_hoy date; v_ventana int;
begin
  if v_part !~ '^[0-9a-f-]{36}$' or v_oc !~ '^[0-9a-f-]{36}$' then return false; end if;
  if not p_subir then return v_part = v_yo::text or privado.gestiona(v_part::uuid); end if;
  if v_part <> v_yo::text then return false; end if;
  v_hoy := privado.hoy_de(v_yo);
  select dias_registro_tardio into v_ventana from public.ajustes_operacion;
  return exists (select 1 from public.ocurrencias o where o.id = v_oc::uuid and o.participante_id = v_yo
                   and o.requiere_foto and o.vigente and o.fecha between v_hoy - v_ventana and v_hoy)
     and (select count(*) from storage.objects s
           where s.bucket_id = 'evidencias' and s.name like v_part || '/' || v_oc || '/%') < 3;
end $$;

-- 5. Asignar o reasignar coach (solo el dueño; queda en el historial y en la auditoría) ----
create or replace function public.asignar_coach(p_participante uuid, p_coach uuid, p_motivo text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  if not exists (select 1 from public.participantes where id = p_participante) then
    perform privado.error('participante','no_encontrado','404'); end if;
  if p_coach is not null and not exists (select 1 from public.equipo where user_id = p_coach and activo) then
    perform privado.error('coach','no_encontrado','404'); end if;
  if (select coach_id from public.participantes where id = p_participante) is not distinct from p_coach then return; end if;
  update public.asignaciones_coach set hasta = now() where participante_id = p_participante and hasta is null;
  insert into public.asignaciones_coach (participante_id, coach_id, asignado_por, motivo)
  values (p_participante, p_coach, auth.uid(), nullif(left(btrim(p_motivo), 200), ''));
  perform set_config('rumbo.asignando', 'si', true);
  update public.participantes set coach_id = p_coach where id = p_participante;
  perform set_config('rumbo.asignando', 'no', true);
  insert into public.auditoria (actor, accion, tabla, fila, detalle)
  values (auth.uid(), 'asignar_coach', 'participantes', p_participante, jsonb_build_object('coach', p_coach));
end $$;

-- El coach_id solo cambia con asignar_coach: el dueño no lo edita directo (así siempre hay historial).
create or replace function privado.coach_guardia() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.coach_id is distinct from old.coach_id
     and current_setting('rumbo.asignando', true) is distinct from 'si' then
    perform privado.error('coach','usar_asignar_coach','409');
  end if;
  return new;
end $$;
create or replace trigger guardia_coach before update of coach_id on public.participantes
  for each row execute function privado.coach_guardia();

-- Lo que el panel necesita saber de quien entra.
create or replace function public.mi_rol_equipo() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('rol', e.rol, 'puede_moderar', e.puede_moderar or e.rol = 'dueno')
    from public.equipo e where e.user_id = auth.uid() and e.activo;
$$;

-- 6. Permisos de ejecución ------------------------------------------------------
revoke all on function privado.es_dueno(), privado.es_coach(), privado.gestiona(uuid), privado.puede_moderar(),
  privado.equipo_guardia(), privado.coach_guardia() from public, anon, authenticated;
grant execute on function privado.es_dueno(), privado.es_coach(), privado.gestiona(uuid), privado.puede_moderar() to authenticated;  -- usadas en políticas
revoke all on function public.asignar_coach(uuid, uuid, text), public.mi_rol_equipo() from public, anon, authenticated;
grant execute on function public.asignar_coach(uuid, uuid, text), public.mi_rol_equipo() to authenticated;
