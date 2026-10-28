-- Deshace migrations/20261022000000_roles_coach.sql (A1) y deja la base como antes: un solo
-- «equipo» con acceso total con segundo factor. Solo se usa si A1 da problemas en producción, con
-- autorización de Diego. Borra las columnas de rol y coach, el historial de asignaciones y las
-- cuentas de coach del equipo (sin roles tendrían acceso total).
begin;
drop function if exists public.asignar_coach(uuid, uuid, text);
drop function if exists public.mi_rol_equipo();
drop trigger if exists guardia_coach on public.participantes;
drop trigger if exists guardia_dueno on public.equipo;
do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies
            where schemaname = 'public' and policyname in ('coach_leer','coach_escribir','coach_modificar','coach_borrar','dueno_leer') loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;
drop table if exists public.asignaciones_coach;

-- Funciones como antes de A1 (20261008000001_funciones.sql y 20261008000003_storage.sql).
create or replace function privado.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
     and exists (select 1 from public.equipo e where e.user_id = auth.uid());
$$;

create or replace function public.solapamientos(p_programa uuid)
returns table (fecha date, accion_a uuid, accion_b uuid)
language sql stable security definer set search_path = '' as $$
  select x.fecha, x.accion_id, y.accion_id
  from privado.ocurrencias_previstas(p_programa) x
  join privado.ocurrencias_previstas(p_programa) y
    on x.fecha = y.fecha and x.accion_id < y.accion_id and x.hora is not null and y.hora is not null
   and x.hora < y.hora + make_interval(mins => y.duracion_min)
   and y.hora < x.hora + make_interval(mins => x.duracion_min)
  where privado.es_admin();
$$;

create or replace function public.carga_prevista(p_programa uuid) returns table (fecha date, minutos int)
language sql stable security definer set search_path = '' as $$
  select fecha, sum(duracion_min)::int from privado.ocurrencias_previstas(p_programa)
  where privado.es_admin() group by fecha order by fecha;
$$;

create or replace function public.publicar_programa(p_programa uuid, p_vigente_desde date,
  p_aceptar_solapamientos boolean default false, p_nota_cambios text default null, p_foco_inicial text default null)
returns int
language plpgsql security definer set search_path = '' as $$
declare v public.programas%rowtype; c public.ciclos%rowtype; v_hoy date; v_n int;
begin
  if not privado.es_admin() then perform privado.error('sesion','no_autorizado','403'); end if;
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

create or replace function public.nuevo_borrador(p_ciclo uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_base public.programas%rowtype; v_nuevo uuid; m record; v_meta uuid; c public.ciclos%rowtype;
begin
  if not privado.es_admin() then perform privado.error('sesion','no_autorizado','403'); end if;
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
  if not privado.es_admin() then perform privado.error('sesion','no_autorizado','403'); end if;
  if not p_aprobar and coalesce(btrim(p_nota), '') = '' then perform privado.error('nota','requerida'); end if;
  update public.registros set estado = case when p_aprobar then 'aprobada' else 'rechazada' end,
         nota_revision = nullif(left(btrim(p_nota), 300), ''), revisado_en = now(), actualizado_en = now()
   where id = p_registro and estado = 'en_revision' returning participante_id into v_part;
  if v_part is null then perform privado.error('registro','no_pendiente','409'); end if;
  perform privado.recalcular_progreso(v_part);
end $$;

create or replace function privado.foto_permitida(p_nombre text, p_subir boolean) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare v_part text := split_part(p_nombre, '/', 1); v_oc text := split_part(p_nombre, '/', 2);
        v_yo uuid := privado.mi_participante_id(); v_hoy date; v_ventana int;
begin
  if v_part !~ '^[0-9a-f-]{36}$' or v_oc !~ '^[0-9a-f-]{36}$' then return false; end if;
  if not p_subir then return v_part = v_yo::text or privado.es_admin(); end if;
  if v_part <> v_yo::text then return false; end if;
  v_hoy := privado.hoy_de(v_yo);
  select dias_registro_tardio into v_ventana from public.ajustes_operacion;
  return exists (select 1 from public.ocurrencias o where o.id = v_oc::uuid and o.participante_id = v_yo
                   and o.requiere_foto and o.vigente and o.fecha between v_hoy - v_ventana and v_hoy)
     and (select count(*) from storage.objects s
           where s.bucket_id = 'evidencias' and s.name like v_part || '/' || v_oc || '/%') < 3;
end $$;

drop function if exists privado.gestiona(uuid);
drop function if exists privado.puede_moderar();
drop function if exists privado.es_coach();
drop function if exists privado.es_dueno();
drop function if exists privado.equipo_guardia();
drop function if exists privado.coach_guardia();
drop index if exists public.participantes_coach;
alter table public.participantes drop column if exists coach_id;
-- Sin roles, todo el equipo tendría acceso total: los coaches dejan de ser parte del equipo.
delete from public.equipo where rol = 'coach';
alter table public.equipo drop column if exists rol, drop column if exists puede_moderar, drop column if exists activo;
commit;
