-- Generado desde especificacion-plataforma.md §6. Pegar en el editor SQL de Supabase en orden.

-- ---------- Quién es quién ----------
create or replace function privado.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
     and exists (select 1 from public.equipo e where e.user_id = auth.uid());
$$;
create or replace function privado.mi_participante_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.participantes p where p.user_id = auth.uid() and p.estado <> 'cerrado';
$$;
create or replace function privado.ciclo_abierto(p_participante uuid) returns public.ciclos
language sql stable security definer set search_path = '' as $$
  select c.* from public.ciclos c where c.participante_id = p_participante and c.estado <> 'cerrado';
$$;

-- ---------- Fechas ----------
create or replace function privado.hoy_chile() returns date
language sql stable set search_path = '' as $$ select (now() at time zone 'America/Santiago')::date $$;

create or replace function privado.hoy_de(p_participante uuid) returns date
language sql stable security definer set search_path = '' as $$
  select (now() at time zone p.zona_horaria)::date from public.participantes p where p.id = p_participante;
$$;

create or replace function privado.es_habil(p date) returns boolean
language sql stable security definer set search_path = '' as $$
  select extract(isodow from p) < 6 and not exists (select 1 from public.feriados f where f.fecha = p);
$$;

-- Cuenta desde el día hábil siguiente a p_desde. Viernes 2-oct-2026 + 2 = martes 6-oct-2026.
create or replace function privado.sumar_dias_habiles(p_desde date, p_dias int) returns date
language plpgsql stable security definer set search_path = '' as $$
declare v date := p_desde; n int := 0;
begin
  while n < p_dias loop
    v := v + 1;
    if privado.es_habil(v) then n := n + 1; end if;
  end loop;
  return v;
end $$;

-- Plazo de respuesta a una solicitud: con ausencia vigente se cuenta desde el regreso.
create or replace function privado.plazo_solicitud() returns date
language sql stable security definer set search_path = '' as $$
  select privado.sumar_dias_habiles(
           greatest(privado.hoy_chile(), coalesce(a.ausencia_hasta, privado.hoy_chile())),
           a.dias_habiles_respuesta)
  from public.ajustes_operacion a;
$$;

create or replace function privado.fecha_limite_derechos() returns date
language sql stable security definer set search_path = '' as $$
  select case when a.dias_plazo_derechos is null then null
              when a.plazo_derechos_habiles then privado.sumar_dias_habiles(privado.hoy_chile(), a.dias_plazo_derechos)
              else privado.hoy_chile() + a.dias_plazo_derechos end
  from public.ajustes_operacion a;
$$;

-- ---------- Errores con estado HTTP (PostgREST convierte SQLSTATE PTxxx en HTTP xxx; verificar) ----------
create or replace function privado.error(p_campo text, p_codigo text, p_http text default '400') returns void
language plpgsql set search_path = '' as $$
begin
  raise exception '%:%', p_campo, p_codigo using errcode = 'PT' || p_http;
end $$;

-- ---------- Límites y huella de conexión ----------
create or replace function privado.sal_del_dia() returns bytea
language plpgsql security definer set search_path = '' as $$
declare v bytea;
begin
  insert into privado.sales (fecha, sal) values (privado.hoy_chile(), extensions.gen_random_bytes(32))
  on conflict (fecha) do nothing;
  select sal into v from privado.sales where fecha = privado.hoy_chile();
  return v;
end $$;

-- IP del cliente según la cabecera que fija el proxy de confianza. VERIFICAR en rumbo-prueba
-- cuál llega (prueba 8.2-S6); nunca el primer valor de x-forwarded-for, que el cliente puede falsear.
create or replace function privado.ip_cliente() returns text
language plpgsql stable set search_path = '' as $$
declare h json := coalesce(current_setting('request.headers', true), '{}')::json; x text;
begin
  if h->>'cf-connecting-ip' is not null then return h->>'cf-connecting-ip'; end if;
  x := h->>'x-forwarded-for';
  if x is not null then return btrim(reverse(split_part(reverse(x), ',', 1))); end if;  -- último salto
  return 'sin-ip';
end $$;

-- Código derivado de la IP con sal aleatoria diaria: no permite conocer la IP; se borra a las 48 h.
create or replace function privado.huella(p text) returns text
language sql security definer set search_path = '' as $$
  select encode(extensions.digest(convert_to(p, 'UTF8') || privado.sal_del_dia(), 'sha256'), 'hex');
$$;

create or replace function privado.consumir_limite(p_clave text, p_max int, p_ventana interval) returns void
language plpgsql security definer set search_path = '' as $$
declare v int;
begin
  insert into privado.limites (clave, ventana, cuenta)
  values (p_clave, date_bin(p_ventana, now(), timestamptz '2000-01-01'), 1)
  on conflict (clave, ventana) do update set cuenta = privado.limites.cuenta + 1
  returning cuenta into v;
  if v > p_max then perform privado.error('envio', 'demasiados', '429'); end if;
end $$;

create or replace function privado.enmascarar(p_correo text) returns text
language sql immutable set search_path = '' as $$
  select left(split_part(p_correo, '@', 1), 1) || '•••@' || split_part(p_correo, '@', 2);
$$;

-- ---------- Guardia de solicitudes: historial, fechas y conservación ----------
create or replace function privado.solicitudes_guardia() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a public.ajustes_operacion%rowtype;
begin
  select * into a from public.ajustes_operacion;
  if new.estado is distinct from old.estado then
    new.estado_cambiado_en := now();
    if new.estado = 'respondida' and old.respondida_en is null then new.respondida_en := now(); end if;
    if new.estado in ('cerrada','retirada') then
      new.cerrada_en := now();
      if new.estado = 'cerrada' and a.meses_conservar_cerrada is not null then
        new.eliminar_despues := privado.hoy_chile() + make_interval(months => a.meses_conservar_cerrada);
      end if;
    end if;
    if new.estado = 'acordada' and new.acuerdo is null then perform privado.error('acuerdo','requerido'); end if;
    if new.estado = 'con_espacio' and new.condiciones_aceptadas is null then perform privado.error('condiciones','sin_aceptar'); end if;
    insert into public.solicitudes_eventos (solicitud_id, de_estado, a_estado) values (new.id, old.estado, new.estado);
  end if;
  if new.acuerdo is distinct from old.acuerdo and old.condiciones_aceptadas is not null then
    new.condiciones_aceptadas := null;   -- si cambia el acuerdo, hay que aceptarlo de nuevo
  end if;
  return new;
end $$;
create or replace trigger solicitudes_guardia before update on public.solicitudes
  for each row execute function privado.solicitudes_guardia();

-- ---------- Guardias del programa: solo el borrador se edita ----------
create or replace function privado.solo_borrador() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_prog uuid := coalesce(new.programa_id, old.programa_id);
begin
  if current_setting('rumbo.sistema', true) = 'si' then return coalesce(new, old); end if;
  if (select estado from public.programas where id = v_prog) <> 'borrador' then
    perform privado.error('programa', 'no_es_borrador', '409');
  end if;
  return coalesce(new, old);
end $$;
create or replace trigger metas_solo_borrador before insert or update or delete on public.metas
  for each row execute function privado.solo_borrador();
create or replace trigger acciones_solo_borrador before insert or update or delete on public.acciones
  for each row execute function privado.solo_borrador();

create or replace function privado.programas_guardia() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('rumbo.sistema', true) = 'si' then return coalesce(new, old); end if;
  if tg_op = 'INSERT' then
    if new.estado <> 'borrador' then perform privado.error('programa','solo_borrador','409'); end if;
    return new;
  end if;
  if old.estado <> 'borrador' then perform privado.error('programa','no_es_borrador','409'); end if;
  if tg_op = 'UPDATE' and new.estado <> 'borrador' then perform privado.error('programa','usa_publicar','409'); end if;
  return coalesce(new, old);
end $$;
create or replace trigger programas_guardia before insert or update or delete on public.programas
  for each row execute function privado.programas_guardia();

create or replace function public.ping() returns text
language sql stable security definer set search_path = '' as $$ select 'ok' $$;

create or replace function public.estado_postulaciones() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'abiertas', a.postulaciones_abiertas
                and (a.tope_solicitudes_dia is null or (select count(*) from public.solicitudes s
                     where s.tipo = 'solicitud'
                       and (s.creada_en at time zone 'America/Santiago')::date = privado.hoy_chile()) < a.tope_solicitudes_dia),
    'motivo', case when not a.postulaciones_abiertas then 'cerradas' else 'tope' end,
    'responder_antes', privado.plazo_solicitud(),
    'ausencia', case when a.ausencia_hasta >= privado.hoy_chile()
                     then jsonb_build_object('hasta', a.ausencia_hasta, 'texto', a.ausencia_texto) end)
  from public.ajustes_operacion a;
$$;

create or replace function privado.respuesta_envio(s public.solicitudes) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('tipo', s.tipo, 'creada_en', s.creada_en, 'responder_antes', s.responder_antes);
$$;

-- p: {token, tipo, nombre, correo, area, meta, apoyo, dias[], franjas[], horarios_nota, zona_horaria,
--     mayor_edad, autorizacion, texto_autorizacion, avisos_futuros, origen{}, ms, campo_extra_7}
create or replace function public.enviar_solicitud(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  a public.ajustes_operacion%rowtype;
  v_token  text := p->>'token';
  v_hash   bytea;
  v_tipo   text := coalesce(p->>'tipo', 'solicitud');
  v_nombre text := btrim(p->>'nombre');
  v_correo text := lower(btrim(p->>'correo'));
  v_area   text := nullif(p->>'area', '');
  v_meta   text := nullif(btrim(p->>'meta'), '');
  v_apoyo  text := nullif(p->>'apoyo', '');
  v_spam   boolean;
  v_previa uuid;
  v_fila   public.solicitudes%rowtype;
begin
  select * into a from public.ajustes_operacion;

  -- 1. Token generado en el navegador (32 bytes, base64url). Es también la clave de idempotencia.
  if v_token is null or v_token !~ '^[A-Za-z0-9_-]{43}$' then perform privado.error('token','invalido'); end if;
  v_hash := extensions.digest(v_token, 'sha256');
  select * into v_fila from public.solicitudes where token_hash = v_hash;
  if found then return privado.respuesta_envio(v_fila); end if;   -- reintento: misma respuesta

  -- 2. Validación (los textos los pone el cliente desde formularios.ts)
  if v_tipo not in ('solicitud','interes') then perform privado.error('tipo','invalido'); end if;
  if v_nombre is null or v_nombre = '' then perform privado.error('nombre','vacio'); end if;
  if char_length(v_nombre) not between 2 and 60 then perform privado.error('nombre','largo'); end if;
  if v_nombre ~* '(@|https?://|www\.)' then perform privado.error('nombre','formato'); end if;
  if v_correo is null or v_correo = '' then perform privado.error('correo','vacio'); end if;
  if char_length(v_correo) > 254 or v_correo !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform privado.error('correo','formato'); end if;
  if coalesce((p->>'mayor_edad')::boolean, false) is not true then perform privado.error('mayor_edad','requerido'); end if;
  if coalesce((p->>'autorizacion')::boolean, false) is not true then perform privado.error('autorizacion','requerido'); end if;

  if v_tipo = 'solicitud' then
    if v_area is null or not exists (select 1 from public.areas where id = v_area and en_piloto) then
      perform privado.error('area','requerido'); end if;
    if v_meta is null then perform privado.error('meta','vacio'); end if;
    if char_length(v_meta) < 20 then perform privado.error('meta','corto'); end if;
    if char_length(v_meta) > 1500 then perform privado.error('meta','largo'); end if;
    if v_apoyo is null or v_apoyo not in ('coach','cercano','nose') then perform privado.error('apoyo','requerido'); end if;
    if (select not (e->>'abiertas')::boolean from public.estado_postulaciones() e) then
      perform privado.error('postulaciones','cerradas','409'); end if;
  else
    if v_area is not null and not exists (select 1 from public.areas where id = v_area and not en_piloto) then
      perform privado.error('area','invalida'); end if;
    v_meta := null; v_apoyo := null;
  end if;

  -- 3. Límites por conexión y por correo
  perform privado.consumir_limite('ip:' || privado.huella(privado.ip_cliente()), a.limite_ip_hora, interval '1 hour');
  perform privado.consumir_limite('correo:' || privado.huella(v_correo), a.limite_correo_dia, interval '1 day');

  -- 4. Marcas: nunca descartan, solo ordenan la bandeja
  v_spam := coalesce(p->>'campo_extra_7', '') <> ''
         or coalesce((p->>'ms')::int, 0) < 4000
         or (select count(*) from regexp_matches(coalesce(v_meta, ''), '(https?://|www\.)', 'g')) > 3
         or (v_meta is not null and exists (select 1 from public.solicitudes s
                where s.meta = v_meta and s.creada_en > now() - interval '7 days'));
  select s.id into v_previa from public.solicitudes s
   where s.correo = v_correo::extensions.citext and s.tipo = v_tipo
     and s.estado in ('recibida','en_revision','respondida','acordada')
   order by s.creada_en limit 1;

  insert into public.solicitudes (tipo, nombre, correo, area_id, meta, apoyo, dias, franjas, horarios_nota,
         zona_horaria, mayor_edad, consentimiento, avisos_futuros, responder_antes, token_hash, origen,
         posible_spam, posible_duplicado, duplicado_de)
  values (v_tipo, v_nombre, v_correo, v_area, v_meta, v_apoyo,
         coalesce(array(select jsonb_array_elements_text(p->'dias')), '{}'),
         coalesce(array(select jsonb_array_elements_text(p->'franjas')), '{}'),
         nullif(btrim(p->>'horarios_nota'), ''), left(p->>'zona_horaria', 64), true,
         jsonb_build_object('version_privacidad', a.version_privacidad,
                            'texto', left(p->>'texto_autorizacion', 600), 'fecha', now()),
         v_tipo = 'solicitud' and coalesce((p->>'avisos_futuros')::boolean, false),
         case when v_tipo = 'solicitud' then privado.plazo_solicitud() end,
         v_hash, p->'origen', v_spam, v_previa is not null, v_previa)
  on conflict (token_hash) do nothing
  returning * into v_fila;
  if v_fila.id is null then select * into v_fila from public.solicitudes where token_hash = v_hash; end if;
  return privado.respuesta_envio(v_fila);
end $$;

create or replace function public.ver_solicitud(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when s.estado = 'retirada' then
           jsonb_build_object('tipo', s.tipo, 'estado', s.estado, 'cerrada_en', s.cerrada_en)
         else jsonb_build_object(
           'tipo', s.tipo, 'estado', s.estado, 'motivo_cierre', s.motivo_cierre, 'nota_cierre', s.nota_cierre,
           'nombre', s.nombre, 'correo', privado.enmascarar(s.correo::text),
           'area', s.area_id, 'apoyo', s.apoyo, 'meta', s.meta, 'dias', s.dias, 'franjas', s.franjas,
           'horarios_nota', s.horarios_nota, 'creada_en', s.creada_en,
           'responder_antes', s.responder_antes, 'respondida_en', s.respondida_en,
           'con_atraso', s.estado in ('recibida','en_revision') and s.responder_antes < privado.hoy_chile(),
           'acuerdo', s.acuerdo,
           'condiciones_aceptadas', s.condiciones_aceptadas - 'texto',
           'version_condiciones', (select version_condiciones from public.ajustes_operacion))
         end
  from public.solicitudes s
  where p_token ~ '^[A-Za-z0-9_-]{43}$' and s.token_hash = extensions.digest(p_token, 'sha256');
$$;

-- Retirar = revocar el consentimiento: se borra al tiro y queda una fila mínima para las cifras.
create or replace function public.retirar_solicitud(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.solicitudes%rowtype;
begin
  select * into v from public.solicitudes where p_token ~ '^[A-Za-z0-9_-]{43}$'
     and token_hash = extensions.digest(p_token, 'sha256') for update;
  if v.id is null then perform privado.error('token','no_encontrada','404'); end if;
  if v.estado = 'con_espacio' then perform privado.error('estado','con_espacio','409'); end if;
  if v.estado = 'retirada' then return jsonb_build_object('cerrada_en', v.cerrada_en); end if;
  delete from public.solicitudes_eventos where solicitud_id = v.id;
  update public.solicitudes set
    estado = 'retirada', nombre = null, correo = null, meta = null, dias = '{}', franjas = '{}',
    horarios_nota = null, zona_horaria = null, origen = null, notas_internas = null, nota_cierre = null,
    acuerdo = null, condiciones_aceptadas = null, token_hash = null, duplicado_de = null,
    consentimiento = consentimiento || jsonb_build_object('revocado_en', now())
  where id = v.id returning * into v;
  return jsonb_build_object('cerrada_en', v.cerrada_en);
end $$;

create or replace function public.aceptar_acuerdo(p_token text, p_version text, p_texto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v public.solicitudes%rowtype; v_ver text;
begin
  select version_condiciones into v_ver from public.ajustes_operacion;
  select * into v from public.solicitudes where p_token ~ '^[A-Za-z0-9_-]{43}$'
     and token_hash = extensions.digest(p_token, 'sha256') for update;
  if v.id is null then perform privado.error('token','no_encontrada','404'); end if;
  if v.estado <> 'acordada' or v.acuerdo is null then perform privado.error('estado','sin_acuerdo','409'); end if;
  if p_version is distinct from v_ver then perform privado.error('version','desactualizada','409'); end if;
  update public.solicitudes set condiciones_aceptadas = jsonb_build_object(
      'version', v_ver, 'texto', left(p_texto, 2000), 'fecha', now(), 'acuerdo', v.acuerdo)
  where id = v.id;
  return jsonb_build_object('fecha', now(), 'version', v_ver);
end $$;

-- p: {motivo, nombre, correo, mensaje, ms, campo_extra_7}
create or replace function public.enviar_mensaje(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  a public.ajustes_operacion%rowtype;
  v_correo text := lower(btrim(p->>'correo'));
  v_msg text := btrim(p->>'mensaje');
  v_id uuid;
begin
  select * into a from public.ajustes_operacion;
  if coalesce(p->>'motivo','') not in ('duda','solicitud','datos','problema','otro') then perform privado.error('motivo','requerido'); end if;
  if v_correo is null or v_correo !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_correo) > 254 then perform privado.error('correo','formato'); end if;
  if v_msg is null or v_msg = '' then perform privado.error('mensaje','vacio'); end if;
  if char_length(v_msg) < 10 then perform privado.error('mensaje','corto'); end if;
  if char_length(v_msg) > 2000 then perform privado.error('mensaje','largo'); end if;
  if char_length(btrim(coalesce(p->>'nombre',''))) > 60 then perform privado.error('nombre','largo'); end if;
  perform privado.consumir_limite('ip:' || privado.huella(privado.ip_cliente()), a.limite_ip_hora, interval '1 hour');
  perform privado.consumir_limite('correo:' || privado.huella(v_correo), a.limite_correo_dia, interval '1 day');

  insert into public.mensajes_contacto (motivo, nombre, correo, mensaje, posible_spam, eliminar_despues)
  values (p->>'motivo', nullif(btrim(p->>'nombre'), ''), v_correo, v_msg,
          coalesce(p->>'campo_extra_7','') <> '' or coalesce((p->>'ms')::int, 0) < 4000,
          case when a.meses_conservar_contacto is not null
               then privado.hoy_chile() + make_interval(months => a.meses_conservar_contacto) end)
  returning id into v_id;
  if p->>'motivo' = 'datos' then
    insert into public.peticiones_derechos (origen, mensaje_id, correo, tipo, fecha_limite)
    values ('contacto', v_id, v_correo, 'otro', privado.fecha_limite_derechos());
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- Créditos, rachas y niveles (única implementación; reglas desde rumbo.ts) ----------
create or replace function privado.recalcular_progreso(p_participante uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.reglas_creditos%rowtype; a public.ajustes_operacion%rowtype;
  v_hoy date := privado.hoy_de(p_participante); v_desde date;
  v_racha int := 0; v_total int := 0; v_bono int; v_susp boolean; d record;
begin
  if v_hoy is null then return; end if;
  select * into r from public.reglas_creditos;
  select * into a from public.ajustes_operacion;
  if not a.creditos_entre_ciclos then
    select c.inicio into v_desde from public.ciclos c
     where c.participante_id = p_participante order by c.numero desc limit 1;
  end if;
  delete from public.progreso_diario where participante_id = p_participante;
  for d in
    select o.fecha, count(*)::int as programadas,
           count(*) filter (where g.estado in ('hecha','aprobada'))::int as hechas,
           count(*) filter (where g.estado = 'en_revision')::int as pendientes
      from public.ocurrencias o
      left join public.registros g on g.ocurrencia_id = o.id
     where o.participante_id = p_participante and o.vigente and o.fecha <= v_hoy
       and (v_desde is null or o.fecha >= v_desde)
     group by o.fecha order by o.fecha
  loop
    v_bono := 0; v_susp := false;
    if d.hechas = d.programadas then                       -- día completo
      v_racha := v_racha + 1;
      v_bono := case when v_racha >= r.dias_racha_larga then r.bono_racha7
                     when v_racha >= r.dias_racha_media then r.bono_racha3
                     else r.bono_dia_completo end;
    elsif a.suspenso_por_foto and d.pendientes > 0 and d.hechas + d.pendientes = d.programadas then
      v_susp := true;                                      -- foto por revisar: ni suma ni corta
    elsif d.fecha < v_hoy then
      v_racha := 0;                                        -- hoy, en curso, no corta
    end if;
    v_total := v_total + d.hechas * r.por_accion + v_bono;
    insert into public.progreso_diario values
      (p_participante, d.fecha, d.programadas, d.hechas, d.pendientes, d.hechas * r.por_accion, v_bono, v_racha, v_susp);
  end loop;
  -- Un día sin acciones programadas no aparece en el bucle: no corta la racha.
  insert into public.progreso (participante_id, creditos, nivel, racha, bono_siguiente, actualizado_en)
  values (p_participante, v_total,
          (select max(n.nivel) from public.niveles n where n.minimo <= v_total), v_racha,
          case when v_racha + 1 >= r.dias_racha_larga then r.bono_racha7
               when v_racha + 1 >= r.dias_racha_media then r.bono_racha3
               else r.bono_dia_completo end, now())
  on conflict (participante_id) do update set creditos = excluded.creditos, nivel = excluded.nivel,
     racha = excluded.racha, bono_siguiente = excluded.bono_siguiente, actualizado_en = now();
end $$;

create or replace function privado.mi_progreso() returns jsonb
language sql stable security definer set search_path = '' as $$
  select to_jsonb(g) - 'participante_id' from public.progreso g where g.participante_id = privado.mi_participante_id();
$$;

-- ---------- Validación común de una acción que la persona registra ----------
create or replace function privado.ocurrencia_registrable(p_ocurrencia uuid) returns public.ocurrencias
language plpgsql stable security definer set search_path = '' as $$
declare o public.ocurrencias%rowtype; v_yo uuid := privado.mi_participante_id(); v_hoy date; v_ventana int;
begin
  select * into o from public.ocurrencias where id = p_ocurrencia;
  if o.id is null or o.participante_id is distinct from v_yo then perform privado.error('accion','no_encontrada','404'); end if;
  if not o.vigente then perform privado.error('accion','no_vigente','409'); end if;
  if (select estado from public.ciclos where id = o.ciclo_id) = 'cerrado' then perform privado.error('ciclo','cerrado','409'); end if;
  v_hoy := privado.hoy_de(v_yo);
  select dias_registro_tardio into v_ventana from public.ajustes_operacion;
  if o.fecha > v_hoy then perform privado.error('accion','futura','409'); end if;
  if o.fecha < v_hoy - v_ventana then perform privado.error('accion','fuera_de_plazo','409'); end if;
  return o;
end $$;

create or replace function public.marcar_accion(p_ocurrencia uuid, p_version text default 'completa') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.ocurrencias%rowtype;
begin
  o := privado.ocurrencia_registrable(p_ocurrencia);
  if o.requiere_foto then perform privado.error('accion','requiere_foto','409'); end if;
  if p_version not in ('completa','corta') or (p_version = 'corta' and o.version_corta is null) then
    perform privado.error('version','invalida'); end if;
  insert into public.registros (ocurrencia_id, participante_id, estado, version)
  values (o.id, o.participante_id, 'hecha', p_version)
  on conflict (ocurrencia_id) do update set estado = 'hecha', version = excluded.version, actualizado_en = now();
  perform privado.recalcular_progreso(o.participante_id);
  return privado.mi_progreso();
end $$;

-- Desmarcar, deshacer «dejarla pasar» o quitar una evidencia sin archivo: borra el registro.
create or replace function public.desmarcar_accion(p_ocurrencia uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.ocurrencias%rowtype;
begin
  o := privado.ocurrencia_registrable(p_ocurrencia);     -- misma ventana: el pasado revisado no se reescribe
  delete from public.registros where ocurrencia_id = o.id;
  perform privado.recalcular_progreso(o.participante_id);
  return privado.mi_progreso();
end $$;

create or replace function public.dejar_pasar(p_ocurrencia uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.ocurrencias%rowtype;
begin
  o := privado.ocurrencia_registrable(p_ocurrencia);
  if o.fecha >= privado.hoy_de(o.participante_id) then perform privado.error('accion','es_de_hoy','409'); end if;
  insert into public.registros (ocurrencia_id, participante_id, estado) values (o.id, o.participante_id, 'dejada')
  on conflict (ocurrencia_id) do nothing;
  perform privado.recalcular_progreso(o.participante_id);
  return privado.mi_progreso();
end $$;

-- Foto (ruta ya subida al bucket) o explicación de 10 a 280 caracteres. Queda «en revisión».
create or replace function public.registrar_evidencia(p_ocurrencia uuid, p_foto_ruta text, p_explicacion text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.ocurrencias%rowtype; v_exp text := nullif(btrim(p_explicacion), '');
begin
  o := privado.ocurrencia_registrable(p_ocurrencia);
  if not o.requiere_foto then perform privado.error('accion','sin_foto','409'); end if;
  if p_foto_ruta is null and v_exp is null then perform privado.error('evidencia','vacia'); end if;
  if p_foto_ruta is not null and (p_foto_ruta not like o.participante_id || '/' || o.id || '/%'
     or not exists (select 1 from storage.objects s where s.bucket_id = 'evidencias' and s.name = p_foto_ruta)) then
    perform privado.error('evidencia','ruta_invalida'); end if;
  if v_exp is not null and char_length(v_exp) not between 10 and 280 then perform privado.error('explicacion','largo'); end if;
  insert into public.registros (ocurrencia_id, participante_id, estado, foto_ruta, explicacion)
  values (o.id, o.participante_id, 'en_revision', p_foto_ruta, v_exp)
  on conflict (ocurrencia_id) do update set estado = 'en_revision', foto_ruta = excluded.foto_ruta,
     explicacion = excluded.explicacion, nota_revision = null, revisado_en = null, actualizado_en = now();
  perform privado.recalcular_progreso(o.participante_id);
  return privado.mi_progreso();
end $$;

-- El navegador borra antes el archivo del bucket; esta función quita el registro y resta lo que correspondía.
create or replace function public.eliminar_evidencia(p_ocurrencia uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.ocurrencias%rowtype;
begin
  select * into o from public.ocurrencias where id = p_ocurrencia and participante_id = privado.mi_participante_id();
  if o.id is null then perform privado.error('accion','no_encontrada','404'); end if;
  delete from public.registros where ocurrencia_id = o.id;
  perform privado.recalcular_progreso(o.participante_id);
  return privado.mi_progreso();
end $$;

create or replace function public.guardar_registro_semanal(p_semana smallint, p jsonb, p_enviar boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id(); c public.ciclos%rowtype;
begin
  c := privado.ciclo_abierto(v_yo);
  if c.id is null then perform privado.error('ciclo','sin_ciclo','409'); end if;
  if p_semana < 1 or c.inicio + (p_semana - 1) * 7 > privado.hoy_de(v_yo) or c.inicio + (p_semana - 1) * 7 > c.fin then
    perform privado.error('semana','invalida','409'); end if;
  if exists (select 1 from public.revisiones r where r.ciclo_id = c.id and r.semana = p_semana) then
    perform privado.error('semana','en_revision','409'); end if;
  insert into public.registros_semanales (participante_id, ciclo_id, semana, carga, funciono, costo, cambiar, enviado_en)
  values (v_yo, c.id, p_semana, nullif(p->>'carga',''), nullif(btrim(p->>'funciono'),''),
          nullif(btrim(p->>'costo'),''), nullif(btrim(p->>'cambiar'),''), case when p_enviar then now() end)
  on conflict (ciclo_id, semana) do update set carga = excluded.carga, funciono = excluded.funciono,
     costo = excluded.costo, cambiar = excluded.cambiar,
     enviado_en = coalesce(excluded.enviado_en, public.registros_semanales.enviado_en), actualizado_en = now();
  return jsonb_build_object('ok', true);
end $$;

-- p: {tipo, ocurrencias[], desde, texto, pide_reorden}
create or replace function public.pedir_ajuste(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_yo uuid := privado.mi_participante_id(); c public.ciclos%rowtype;
  v_reorden boolean := coalesce((p->>'pide_reorden')::boolean, false); v_quedan int; v_id uuid;
begin
  c := privado.ciclo_abierto(v_yo);
  if c.id is null then perform privado.error('ciclo','sin_ciclo','409'); end if;
  if (select count(*) from public.solicitudes_ajuste s where s.participante_id = v_yo
       and s.creada_en > now() - interval '7 days') >= 5 then perform privado.error('ajuste','demasiados','429'); end if;
  if v_reorden then
    select pl.reordenes_por_ciclo - (select count(*) from public.solicitudes_ajuste s
             where s.ciclo_id = c.id and s.cuenta_como_reorden)
      into v_quedan from public.planes pl where pl.id = c.plan_id;
    if c.plan_id <> 'cercano' or v_quedan <= 0 then v_reorden := false; end if;
  end if;
  insert into public.solicitudes_ajuste (participante_id, ciclo_id, tipo, ocurrencias, desde, texto, pide_reorden, responder_antes)
  values (v_yo, c.id, p->>'tipo',
          coalesce(array(select (jsonb_array_elements_text(p->'ocurrencias'))::uuid), '{}'),
          nullif(p->>'desde','')::date, btrim(p->>'texto'), v_reorden,
          case when v_reorden then privado.sumar_dias_habiles(privado.hoy_chile(), 1) end)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'responder_antes',
         (select responder_antes from public.solicitudes_ajuste where id = v_id));
end $$;

create or replace function public.actualizar_preferencias(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.participantes set
    nombre_preferido = case when p ? 'nombre_preferido' then nullif(btrim(p->>'nombre_preferido'), '') else nombre_preferido end,
    ocultar_gamificacion = coalesce((p->>'ocultar_gamificacion')::boolean, ocultar_gamificacion)
  where id = privado.mi_participante_id();
end $$;

create or replace function public.pedir_derecho(p_tipo text, p_detalle text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id(); v_lim date := privado.fecha_limite_derechos();
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  insert into public.peticiones_derechos (origen, participante_id, correo, tipo, detalle, fecha_limite)
  select 'mi_espacio', v_yo, p.correo, p_tipo, left(p_detalle, 1000), v_lim from public.participantes p where p.id = v_yo;
  return jsonb_build_object('fecha_limite', v_lim);
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
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;

-- ---------- Programa (admin) ----------
-- Semana N de un ciclo que parte un lunes: fecha = inicio + (N-1)*7 + (isodow - 1)
create or replace function privado.ocurrencias_previstas(p_programa uuid)
returns table (accion_id uuid, fecha date, hora time, duracion_min smallint)
language sql stable security definer set search_path = '' as $$
  select a.id, (c.inicio + (w - 1) * 7 + (d - 1))::date, a.hora, a.duracion_min
  from public.acciones a
  join public.programas g on g.id = a.programa_id
  join public.ciclos c on c.id = g.ciclo_id
  cross join lateral generate_series(a.semana_desde, a.semana_desde + a.semanas - 1) w
  cross join lateral unnest(a.dias) d
  where a.programa_id = p_programa and c.inicio + (w - 1) * 7 + (d - 1) <= c.fin;
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

-- Copia el programa publicado (o el indicado) como borrador v+1, conservando la clave de cada meta
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

create or replace function public.pausar_ciclo(p_ciclo uuid, p_desde date, p_hasta date, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.ciclos%rowtype;
begin
  if not privado.es_admin() then perform privado.error('sesion','no_autorizado','403'); end if;
  update public.ciclos set estado = 'pausado', pausa_motivo = p_motivo, pausa_desde = p_desde, pausa_hasta = p_hasta
   where id = p_ciclo returning * into c;
  if (select pausa_sin_acciones from public.ajustes_operacion) then
    update public.ocurrencias o set vigente = false, anulada_motivo = 'pausa', anulada_en = privado.hoy_chile()
     where o.ciclo_id = p_ciclo and o.vigente and o.fecha between p_desde and coalesce(p_hasta, c.fin)
       and not exists (select 1 from public.registros r where r.ocurrencia_id = o.id);
  end if;
  perform privado.recalcular_progreso(c.participante_id);
end $$;

create or replace function public.reanudar_ciclo(p_ciclo uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.ciclos%rowtype; v_hoy date;
begin
  if not privado.es_admin() then perform privado.error('sesion','no_autorizado','403'); end if;
  select * into c from public.ciclos where id = p_ciclo;
  v_hoy := privado.hoy_de(c.participante_id);
  update public.ocurrencias set vigente = true, anulada_motivo = null, anulada_en = null
   where ciclo_id = p_ciclo and anulada_motivo = 'pausa' and fecha >= v_hoy
     and programa_id = (select id from public.programas where ciclo_id = p_ciclo and estado = 'publicado');
  update public.ciclos set estado = 'activo', pausa_motivo = null, pausa_desde = null, pausa_hasta = null where id = p_ciclo;
  perform privado.recalcular_progreso(c.participante_id);
end $$;

-- Desde una solicitud con acuerdo aceptado: crea participante y ciclo
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

create or replace function public.nuevo_enlace_solicitud(p_solicitud uuid, p_token text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.es_admin() then perform privado.error('sesion','no_autorizado','403'); end if;
  if p_token !~ '^[A-Za-z0-9_-]{43}$' then perform privado.error('token','invalido'); end if;
  update public.solicitudes set token_hash = extensions.digest(p_token, 'sha256') where id = p_solicitud and estado <> 'retirada';
end $$;

-- Paso 2 de 3 de la eliminación (6.11). Exige que las fotos ya se hayan borrado del bucket.
create or replace function public.eliminar_participante(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.es_admin() then perform privado.error('sesion','no_autorizado','403'); end if;
  if exists (select 1 from storage.objects where bucket_id = 'evidencias' and name like p_id::text || '/%') then
    perform privado.error('fotos','borrar_primero','409'); end if;
  perform set_config('rumbo.sistema', 'si', true);      -- la cascada borra programas publicados
  update public.solicitudes set estado = 'retirada', nombre = null, correo = null, meta = null, dias = '{}',
         franjas = '{}', horarios_nota = null, zona_horaria = null, origen = null, notas_internas = null,
         nota_cierre = null, acuerdo = null, condiciones_aceptadas = null, token_hash = null, participante_id = null
   where participante_id = p_id;
  delete from public.participantes where id = p_id;     -- cascada: ciclos, programas, registros, progreso, revisiones, ajustes
  insert into public.auditoria (actor, accion, tabla, fila) values (auth.uid(), 'eliminar', 'participantes', p_id);
end $$;

create or replace function privado.recalcular_todo() returns void
language plpgsql security definer set search_path = '' as $$
declare p uuid;
begin
  for p in select id from public.participantes where estado = 'activo' loop
    perform privado.recalcular_progreso(p);
  end loop;
end $$;

-- ---------- Permisos de ejecución ----------
revoke all on all functions in schema public  from public, anon, authenticated;
revoke all on all functions in schema privado from public, anon, authenticated;
grant execute on function public.ping(), public.estado_postulaciones(), public.enviar_solicitud(jsonb),
  public.ver_solicitud(text), public.retirar_solicitud(text), public.aceptar_acuerdo(text, text, text),
  public.enviar_mensaje(jsonb) to anon, authenticated;
grant execute on function public.marcar_accion(uuid, text), public.desmarcar_accion(uuid), public.dejar_pasar(uuid),
  public.registrar_evidencia(uuid, text, text), public.eliminar_evidencia(uuid),
  public.guardar_registro_semanal(smallint, jsonb, boolean), public.pedir_ajuste(jsonb),
  public.actualizar_preferencias(jsonb), public.pedir_derecho(text, text), public.exportar_mis_datos(),
  public.solapamientos(uuid), public.carga_prevista(uuid), public.publicar_programa(uuid, date, boolean, text, text),
  public.nuevo_borrador(uuid), public.revisar_evidencia(uuid, boolean, text), public.pausar_ciclo(uuid, date, date, text),
  public.reanudar_ciclo(uuid), public.crear_espacio(uuid), public.nuevo_enlace_solicitud(uuid, text),
  public.eliminar_participante(uuid) to authenticated;   -- las de admin comprueban es_admin() adentro
grant execute on function privado.es_admin(), privado.mi_participante_id() to authenticated;  -- usadas en políticas
