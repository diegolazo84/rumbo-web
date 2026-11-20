-- Deshace 20261205000000_prueba_completa.sql: se borran las pruebas en curso o terminadas (sus ciclos
-- y, si no tienen otro ciclo, sus fichas) y las funciones vuelven a su versión anterior.
begin;
delete from public.participantes p
 where exists (select 1 from public.ciclos c where c.participante_id = p.id and c.prueba_hasta is not null)
   and not exists (select 1 from public.ciclos c where c.participante_id = p.id and c.prueba_hasta is null);
delete from public.ciclos where prueba_hasta is not null;
drop function public.mi_prueba();
drop function privado.cerrar_pruebas();
drop function privado.iniciar_prueba(uuid);
create or replace function privado.tareas_por_hora() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from privado.limites where ventana < now() - interval '48 hours';
  delete from privado.sales where fecha < privado.hoy_chile() - 1;
  if extract(hour from now() at time zone 'America/Santiago') = 9 then perform privado.resumen_diario(); end if;
  perform privado.enviar_recordatorios();
  perform privado.otorgar_reconocimientos();
  perform privado.evaluar_beneficios();
  perform privado.ia_recoger();
end $$;

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

create or replace function public.crear_espacio(p_solicitud uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare s public.solicitudes%rowtype; v_part uuid; v_ac jsonb; v_inicio date; v_sem smallint;
begin
  if not privado.es_admin() then perform privado.error('sesion','no_autorizado','403'); end if;
  select * into s from public.solicitudes where id = p_solicitud for update;
  if s.estado <> 'acordada' or s.condiciones_aceptadas is null then perform privado.error('solicitud','sin_aceptar','409'); end if;
  v_ac := s.acuerdo; v_inicio := (v_ac->>'inicio')::date; v_sem := (v_ac->>'semanas')::smallint;
  insert into public.participantes (correo, nombre, solicitud_id) values (s.correo, s.nombre, s.id)
  on conflict (correo) do update set estado = case when public.participantes.estado = 'cerrado' then 'invitado'
                                                   else public.participantes.estado end
  returning id into v_part;
  insert into public.ciclos (participante_id, numero, plan_id, inicio, semanas, fin, dia_revision,
         hora_videollamada, precio_acordado_clp, condiciones)
  values (v_part, coalesce((select max(numero) from public.ciclos where participante_id = v_part), 0) + 1,
          v_ac->>'plan', v_inicio, v_sem, v_inicio + v_sem * 7 - 1, (v_ac->>'dia_revision')::smallint,
          nullif(v_ac->>'hora_videollamada','')::time, (v_ac->>'precio_clp')::int, s.condiciones_aceptadas);
  update public.solicitudes set estado = 'con_espacio', participante_id = v_part where id = s.id;
  insert into public.auditoria (actor, accion, tabla, fila) values (auth.uid(), 'crear_espacio', 'participantes', v_part);
  return v_part;
end $$;

create or replace function public.bandeja_seguimiento()
returns table (participante_id uuid, nombre text, coach_id uuid, ciclo_id uuid, semana int,
               dias_sin_actividad int, evidencias_por_revisar int, ajustes_pendientes int, ajustes_vencidos int,
               registro_semanal_pendiente boolean, revision_pendiente boolean, prioridad int)
language sql stable security definer set search_path = '' as $$
  with base as (
    select p.id, coalesce(p.nombre_preferido, p.nombre) nombre, p.coach_id, c.id ciclo_id,
           least(c.semanas, greatest(1, ((current_date - c.inicio) / 7) + 1))::int semana, c.inicio, c.dia_revision
      from public.participantes p
      join public.ciclos c on c.participante_id = p.id and c.estado = 'activo'
     where p.estado = 'activo' and c.inicio <= current_date and privado.gestiona(p.id)
  ), s as (
    select b.*,
      (current_date - coalesce((select max((g.creado_en at time zone 'America/Santiago')::date) from public.registros g
                                 where g.participante_id = b.id), b.inicio))::int dias_sin_actividad,
      (select count(*) from public.registros g where g.participante_id = b.id and g.estado = 'en_revision')::int evidencias,
      (select count(*) from public.solicitudes_ajuste a where a.participante_id = b.id and a.estado in ('enviada','en_revision'))::int ajustes,
      (select count(*) from public.solicitudes_ajuste a where a.participante_id = b.id and a.estado in ('enviada','en_revision')
          and a.responder_antes < current_date)::int vencidos,
      -- La semana en curso ya pasó su día de revisión (lunes = 1 … viernes = 5).
      (b.inicio + (b.semana - 1) * 7 + (b.dia_revision - 1)) <= current_date as toca_revision
    from base b
  )
  select s.id, s.nombre, s.coach_id, s.ciclo_id, s.semana, s.dias_sin_actividad, s.evidencias, s.ajustes, s.vencidos,
         s.toca_revision and not exists (select 1 from public.registros_semanales w where w.ciclo_id = s.ciclo_id
                                            and w.semana = s.semana and w.enviado_en is not null),
         s.toca_revision and not exists (select 1 from public.revisiones v where v.ciclo_id = s.ciclo_id
                                            and v.semana = s.semana and v.publicada_en is not null),
         (s.vencidos * 3 + s.ajustes + s.evidencias + case when s.dias_sin_actividad >= 3 then 2 else 0 end)::int
    from s
   order by 12 desc, s.dias_sin_actividad desc;
$$;

alter table public.cuentas_libres drop column creditos_prueba;
alter table public.ciclos drop constraint ciclos_prueba_check, drop constraint ciclos_semanas_check, drop constraint ciclos_check;
alter table public.ciclos
  add constraint ciclos_semanas_check check (semanas in (4,8,12)),
  add constraint ciclos_check check (fin >= inicio + semanas * 7 - 1);
alter table public.ciclos drop column prueba_desde, drop column prueba_hasta;
alter table public.ajustes_operacion drop column dias_prueba;
commit;
