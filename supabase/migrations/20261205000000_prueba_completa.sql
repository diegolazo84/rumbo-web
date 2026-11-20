-- Prueba completa de 14 días (Diego, 19-nov-2026): al crear la cuenta gratis, la persona parte con
-- Rumbo completo armado con su meta y sus acciones, y el equipo le escribe UNA revisión al final de
-- la primera semana. Al terminar pasa sola a la cuenta gratis, con los créditos que ganó.
-- - Técnicamente es una ficha de participante con un ciclo de prueba (sin precio: no hay pago).
--   El ciclo parte el lunes de esta semana (el calendario es por semanas) y las acciones existen
--   solo desde hoy hasta prueba_hasta.
-- - ajustes_operacion.dias_prueba (14 por defecto; 0 = sin prueba) define el largo.
-- - privado.cerrar_pruebas() (cada hora) cierra el ciclo y la ficha al terminar: Mi espacio vuelve
--   a la cuenta gratis, las acciones gratis parten al día siguiente y los créditos se conservan.
-- - «Dar acceso completo» funciona también durante la prueba: al crear el espacio pagado, la prueba
--   se cierra y la ficha sigue siendo la misma (mismo progreso).

begin;

alter table public.ajustes_operacion
  add column dias_prueba smallint not null default 14 check (dias_prueba between 0 and 30);
alter table public.ciclos add column prueba_desde date, add column prueba_hasta date;
alter table public.ciclos drop constraint ciclos_semanas_check, drop constraint ciclos_check;
alter table public.ciclos
  add constraint ciclos_semanas_check check (semanas in (4,8,12) or (prueba_hasta is not null and semanas between 1 and 4)),
  add constraint ciclos_check check (fin >= inicio + semanas * 7 - 1 or prueba_hasta is not null),
  add constraint ciclos_prueba_check check ((prueba_desde is null) = (prueba_hasta is null) and (prueba_hasta is null or (prueba_hasta >= prueba_desde and fin = prueba_hasta and precio_acordado_clp is null)));
alter table public.cuentas_libres add column creditos_prueba int not null default 0 check (creditos_prueba >= 0);

-- ---------- Empezar la prueba (lo llama crear_cuenta_libre) ----------
create or replace function privado.iniciar_prueba(p_user uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  c public.cuentas_libres%rowtype; v_dias smallint; v_hoy date := privado.hoy_chile(); v_lunes date;
  v_hasta date; v_part uuid; v_ciclo uuid; v_prog uuid; v_meta uuid; v_cat text; t record;
begin
  select dias_prueba into v_dias from public.ajustes_operacion;
  if coalesce(v_dias, 0) = 0 then return null; end if;
  select * into c from public.cuentas_libres where user_id = p_user;
  if c.user_id is null then return null; end if;
  -- Una sola prueba por cuenta (también si la persona borró su cuenta gratis y la creó de nuevo).
  if exists (select 1 from public.participantes where user_id = p_user or correo = c.correo) then return null; end if;
  v_lunes := v_hoy - (extract(isodow from v_hoy)::int - 1);
  v_hasta := v_hoy + v_dias - 1;
  select coalesce(categoria, 'proyecto') into v_cat from public.areas where id = c.area_id;

  perform set_config('rumbo.sistema', 'si', true);
  insert into public.participantes (user_id, correo, nombre, estado)
  values (p_user, c.correo, c.nombre, 'activo') returning id into v_part;
  insert into public.ciclos (participante_id, numero, plan_id, inicio, semanas, fin, dia_revision, prueba_desde, prueba_hasta)
  values (v_part, 1, 'acompanamiento', v_lunes, ((v_hasta - v_lunes) / 7 + 1)::smallint, v_hasta,
          least(5, extract(isodow from v_hoy + 6)::int)::smallint, v_hoy, v_hasta)
  returning id into v_ciclo;
  insert into public.programas (ciclo_id, participante_id, version, estado, vigente_desde, publicado_en, nota_cambios)
  values (v_ciclo, v_part, 1, 'publicado', v_hoy, now(), 'Plan de tu prueba, armado con lo que elegiste al crear tu cuenta.')
  returning id into v_prog;
  insert into public.metas (programa_id, participante_id, titulo, para_que, categoria)
  values (v_prog, v_part, left(c.meta, 80), case when char_length(c.meta) > 80 then left(c.meta, 200) end, v_cat)
  returning id into v_meta;
  for t in select a.titulo, row_number() over (order by a.creada_en, a.titulo) n
             from public.acciones_libres a where a.user_id = p_user and a.hasta is null loop
    insert into public.acciones (programa_id, meta_id, titulo, instrucciones, duracion_min, dias, semana_desde, semanas, orden)
    values (v_prog, v_meta, left(t.titulo, 60), t.titulo, 20, c.dias, 1, ((v_hasta - v_lunes) / 7 + 1)::smallint, t.n);
  end loop;
  insert into public.ocurrencias (participante_id, ciclo_id, programa_id, accion_id, meta_clave, meta_titulo,
         categoria, fecha, hora, duracion_min, titulo, instrucciones, version_corta, requiere_foto)
  select v_part, v_ciclo, v_prog, a.id, m.clave, m.titulo, m.categoria,
         x.fecha, a.hora, a.duracion_min, a.titulo, a.instrucciones, a.version_corta, a.requiere_foto
    from privado.ocurrencias_previstas(v_prog) x
    join public.acciones a on a.id = x.accion_id
    join public.metas m on m.id = a.meta_id
   where x.fecha between v_hoy and v_hasta;
  perform set_config('rumbo.sistema', 'no', true);
  perform privado.recalcular_progreso(v_part);
  insert into public.auditoria (actor, accion, tabla, fila, detalle)
  values (p_user, 'iniciar_prueba', 'participantes', v_part, jsonb_build_object('hasta', v_hasta));
  return v_part;
end $$;

-- ---------- Terminar las pruebas vencidas (cada hora) ----------
create or replace function privado.cerrar_pruebas() returns int
language plpgsql security definer set search_path = '' as $$
declare r record; v_hoy date := privado.hoy_chile(); v_n int := 0;
begin
  for r in select c.id, c.participante_id, c.prueba_hasta, p.user_id
             from public.ciclos c join public.participantes p on p.id = c.participante_id
            where c.prueba_hasta is not null and c.estado <> 'cerrado' and c.prueba_hasta < v_hoy
            for update of c loop
    update public.ciclos set estado = 'cerrado', cerrado_en = now() where id = r.id;
    update public.cuentas_libres
       set creditos_prueba = coalesce((select g.creditos from public.progreso g where g.participante_id = r.participante_id), 0)
     where user_id = r.user_id;
    update public.acciones_libres set desde = r.prueba_hasta + 1
     where user_id = r.user_id and hasta is null and desde <= r.prueba_hasta;
    update public.participantes set estado = 'cerrado'
     where id = r.participante_id and not exists (select 1 from public.ciclos o where o.participante_id = r.participante_id and o.estado <> 'cerrado');
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

create or replace function privado.tareas_por_hora() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from privado.limites where ventana < now() - interval '48 hours';
  delete from privado.sales where fecha < privado.hoy_chile() - 1;
  if extract(hour from now() at time zone 'America/Santiago') = 9 then perform privado.resumen_diario(); end if;
  perform privado.cerrar_pruebas();
  perform privado.enviar_recordatorios();
  perform privado.otorgar_reconocimientos();
  perform privado.evaluar_beneficios();
  perform privado.ia_recoger();
end $$;

-- La persona en prueba: cuándo termina y cuánto le queda (null si no está en prueba).
create or replace function public.mi_prueba() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('desde', c.prueba_desde, 'hasta', c.prueba_hasta,
                            'quedan', c.prueba_hasta - privado.hoy_chile() + 1,
                            'acceso_pedido', l.acceso_pedido_en is not null)
    from public.participantes p
    join public.ciclos c on c.participante_id = p.id and c.estado <> 'cerrado' and c.prueba_hasta is not null
    left join public.cuentas_libres l on l.user_id = p.user_id
   where p.user_id = auth.uid() and p.estado <> 'cerrado';
$$;

-- ---------- Cuenta gratis: crea la prueba y suma sus créditos ----------
create or replace function privado.progreso_libre(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  r public.reglas_creditos%rowtype; c public.cuentas_libres%rowtype;
  v_hoy date := privado.hoy_chile(); v_racha int := 0; v_total int := 0; v_bono int; d record;
begin
  select * into c from public.cuentas_libres where user_id = p_user;
  if c.user_id is null then return null; end if;
  select * into r from public.reglas_creditos;
  v_total := c.creditos_prueba;                 -- lo ganado en la prueba completa se conserva
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
  if privado.iniciar_prueba(v_uid) is not null then
    return public.mi_cuenta_libre() || jsonb_build_object('prueba', public.mi_prueba());
  end if;
  return public.mi_cuenta_libre();
end $$;

-- ---------- Panel del dueño: la prueba se ve como tal y se puede dar acceso completo ----------
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
          'plan', case when pr.id is not null then 'prueba'
                       when p.id is not null and p.estado <> 'cerrado' then 'programa'
                       when c.user_id is not null then 'gratis'
                       else 'sin_completar' end,
          'prueba_hasta', pr.prueba_hasta,
          'participante_id', case when p.estado <> 'cerrado' then p.id end,
          'meta', c.meta,
          'area', c.area_id,
          'dias_con_acciones_7', (select count(distinct g.fecha) from public.registros_libres g where g.user_id = u.id and g.fecha > v_hoy - 7)
                               + (select count(distinct o.fecha) from public.registros r join public.ocurrencias o on o.id = r.ocurrencia_id
                                   where pr.id is not null and o.ciclo_id = pr.id and r.estado in ('hecha','aprobada','en_revision') and o.fecha > v_hoy - 7),
          'acciones_hechas', (select count(*) from public.registros_libres g where g.user_id = u.id)
                           + (select count(*) from public.registros r join public.ocurrencias o on o.id = r.ocurrencia_id
                               join public.ciclos k on k.id = o.ciclo_id
                               where r.participante_id = p.id and k.prueba_hasta is not null and r.estado in ('hecha','aprobada','en_revision')),
          'acceso_pedido_en', c.acceso_pedido_en,
          'apoyo_pedido', c.apoyo_pedido,
          'solicitud_id', c.solicitud_id,
          'solicitud_estado', (select s.estado from public.solicitudes s where s.id = c.solicitud_id)
        ) as fila
          from auth.users u
          left join public.cuentas_libres c on c.user_id = u.id
          left join public.participantes p on p.user_id = u.id
          left join public.ciclos pr on pr.participante_id = p.id and pr.estado <> 'cerrado' and pr.prueba_hasta is not null
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
  -- Con programa pagado abierto no; en la prueba completa sí.
  if exists (select 1 from public.participantes p join public.ciclos k on k.participante_id = p.id
              where p.user_id = p_user and p.estado <> 'cerrado' and k.estado <> 'cerrado' and k.prueba_hasta is null) then
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

-- Crear el espacio pagado: si la persona está en su prueba, la prueba se cierra y la ficha sigue.
create or replace function public.crear_espacio(p_solicitud uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare s public.solicitudes%rowtype; v_part uuid; v_ac jsonb; v_inicio date; v_sem smallint;
begin
  if not privado.es_admin() then perform privado.error('sesion','no_autorizado','403'); end if;
  select * into s from public.solicitudes where id = p_solicitud for update;
  if s.estado <> 'acordada' or s.condiciones_aceptadas is null then perform privado.error('solicitud','sin_aceptar','409'); end if;
  v_ac := s.acuerdo; v_inicio := (v_ac->>'inicio')::date; v_sem := (v_ac->>'semanas')::smallint;
  insert into public.participantes (correo, nombre, solicitud_id) values (s.correo, s.nombre, s.id)
  on conflict (correo) do update set estado = case when public.participantes.estado = 'cerrado'
                                                   then case when public.participantes.user_id is not null then 'activo' else 'invitado' end
                                                   else public.participantes.estado end,
                                     solicitud_id = coalesce(public.participantes.solicitud_id, excluded.solicitud_id)
  returning id into v_part;
  update public.ciclos set estado = 'cerrado', cerrado_en = now()
   where participante_id = v_part and estado <> 'cerrado' and prueba_hasta is not null;
  insert into public.ciclos (participante_id, numero, plan_id, inicio, semanas, fin, dia_revision,
         hora_videollamada, precio_acordado_clp, condiciones)
  values (v_part, coalesce((select max(numero) from public.ciclos where participante_id = v_part), 0) + 1,
          v_ac->>'plan', v_inicio, v_sem, v_inicio + v_sem * 7 - 1, (v_ac->>'dia_revision')::smallint,
          nullif(v_ac->>'hora_videollamada','')::time, (v_ac->>'precio_clp')::int, s.condiciones_aceptadas);
  update public.solicitudes set estado = 'con_espacio', participante_id = v_part where id = s.id;
  insert into public.auditoria (actor, accion, tabla, fila) values (auth.uid(), 'crear_espacio', 'participantes', v_part);
  return v_part;
end $$;

-- ---------- Bandeja: en la prueba toca UNA revisión, desde el 7.º día ----------
create or replace function public.bandeja_seguimiento()
returns table (participante_id uuid, nombre text, coach_id uuid, ciclo_id uuid, semana int,
               dias_sin_actividad int, evidencias_por_revisar int, ajustes_pendientes int, ajustes_vencidos int,
               registro_semanal_pendiente boolean, revision_pendiente boolean, prioridad int)
language sql stable security definer set search_path = '' as $$
  with base as (
    select p.id, coalesce(p.nombre_preferido, p.nombre) nombre, p.coach_id, c.id ciclo_id,
           least(c.semanas, greatest(1, ((current_date - c.inicio) / 7) + 1))::int semana, c.inicio, c.dia_revision,
           c.prueba_desde
      from public.participantes p
      join public.ciclos c on c.participante_id = p.id and c.estado = 'activo'
     where p.estado = 'activo' and c.inicio <= current_date and privado.gestiona(p.id)
  ), s as (
    select b.*,
      (current_date - coalesce((select max((g.creado_en at time zone 'America/Santiago')::date) from public.registros g
                                 where g.participante_id = b.id), coalesce(b.prueba_desde, b.inicio)))::int dias_sin_actividad,
      (select count(*) from public.registros g where g.participante_id = b.id and g.estado = 'en_revision')::int evidencias,
      (select count(*) from public.solicitudes_ajuste a where a.participante_id = b.id and a.estado in ('enviada','en_revision'))::int ajustes,
      (select count(*) from public.solicitudes_ajuste a where a.participante_id = b.id and a.estado in ('enviada','en_revision')
          and a.responder_antes < current_date)::int vencidos,
      -- La semana en curso ya pasó su día de revisión (lunes = 1 … viernes = 5). En la prueba: el 7.º día.
      case when b.prueba_desde is not null then b.prueba_desde + 6 <= current_date
           else (b.inicio + (b.semana - 1) * 7 + (b.dia_revision - 1)) <= current_date end as toca_revision
    from base b
  )
  select s.id, s.nombre, s.coach_id, s.ciclo_id, s.semana, s.dias_sin_actividad, s.evidencias, s.ajustes, s.vencidos,
         s.toca_revision and s.prueba_desde is null
                         and not exists (select 1 from public.registros_semanales w where w.ciclo_id = s.ciclo_id
                                            and w.semana = s.semana and w.enviado_en is not null),
         s.toca_revision and not exists (select 1 from public.revisiones v where v.ciclo_id = s.ciclo_id
                                            and v.publicada_en is not null
                                            and (s.prueba_desde is not null or v.semana = s.semana)),
         (s.vencidos * 3 + s.ajustes + s.evidencias + case when s.dias_sin_actividad >= 3 then 2 else 0 end)::int
    from s
   order by 12 desc, s.dias_sin_actividad desc;
$$;

revoke all on function privado.iniciar_prueba(uuid), privado.cerrar_pruebas() from public, anon, authenticated;
revoke all on function public.mi_prueba() from public, anon, authenticated;
grant execute on function public.mi_prueba() to authenticated;
revoke all on function public.bandeja_seguimiento() from public, anon, authenticated;
grant execute on function public.bandeja_seguimiento() to authenticated;

commit;
