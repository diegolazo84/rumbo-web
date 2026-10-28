-- E2 · Asistente con inteligencia artificial (función 9 del inventario), con la API de OpenAI.
-- Decisión de Diego (21-oct-2026): se construye completo pero queda APAGADO hasta que autorice el
-- uso real de la API (es un servicio pagado aparte de ChatGPT). Para encenderlo hacen falta tres
-- cosas, todas del dueño: la clave `openai_api_key` en el Vault, activar la configuración
-- (guardar_ia_config) y habilitar el módulo «asistente_ia» para participantes.
--
-- Reglas:
--  · Acompaña, no reemplaza al coach: lo que responde la IA a una persona lo lee primero su coach
--    (o el dueño), que lo aprueba tal cual, lo corrige o lo descarta. La persona nunca ve un
--    borrador sin revisar. El coach también puede pedirle borradores para su propio trabajo.
--  · Consentimiento: nada se envía sin que la persona lo acepte, y ella elige qué contexto se
--    comparte (metas, acciones de la semana, último registro semanal). Nunca se envían nombre,
--    correo ni datos de contacto. Puede retirarlo cuando quiera.
--  · Crisis: si la pregunta sugiere riesgo para la persona, NO se envía a la IA; la persona ve de
--    inmediato *4141 y 131 y su coach recibe una alerta.
--  · Gasto: tope mensual en dólares y tope diario de consultas por persona. Antes de enviar se
--    reserva el costo máximo posible; si no cabe en el tope, no se envía.
--  · Todo queda registrado: qué contexto se envió, tokens, costo y quién revisó.
-- La respuesta llega por pg_net (sin funciones externas) y se recoge al abrir la bandeja y en la
-- tarea por hora. Antes de habilitarlo, la política de privacidad debe describirlo.

-- 1. Configuración (una fila, solo el dueño) ---------------------------------------------------
create table public.ia_config (
  id boolean primary key default true check (id),
  activo boolean not null default false,
  modelo text not null default 'gpt-4o-mini' check (modelo ~ '^[a-z0-9.:-]{3,60}$'),
  instrucciones text not null check (char_length(instrucciones) between 50 and 3000),
  max_tokens_respuesta smallint not null default 400 check (max_tokens_respuesta between 50 and 2000),
  tokens_entrada_estimados smallint not null default 2000 check (tokens_entrada_estimados between 100 and 20000),
  precio_entrada_1m numeric(8,4) not null default 0.15 check (precio_entrada_1m >= 0),   -- USD por millón de tokens
  precio_salida_1m numeric(8,4) not null default 0.60 check (precio_salida_1m >= 0),
  tope_mensual_usd numeric(8,2) not null default 5 check (tope_mensual_usd >= 0),
  tope_diario_persona smallint not null default 5 check (tope_diario_persona between 1 and 50),
  activado_en timestamptz,
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid
);
alter table public.ia_config enable row level security;
revoke all on public.ia_config from anon, authenticated;
grant select on public.ia_config to authenticated;
create policy admin_leer on public.ia_config for select to authenticated using (privado.es_admin());
create or replace trigger auditar after insert or update or delete on public.ia_config
  for each row execute function privado.auditar_cambio();

insert into public.ia_config (instrucciones) values (
'Eres el asistente de Rumbo, un programa de acompañamiento para ordenar hábitos y proyectos personales. '
|| 'Un coach humano revisa tu respuesta antes de que la persona la lea. Responde en español de Chile, en un tono '
|| 'cálido, claro y concreto, en menos de 120 palabras. Usa solo el contexto que se te entrega. No hagas '
|| 'diagnósticos ni des indicaciones médicas, psicológicas, legales ni financieras. No cambies el plan: si algo '
|| 'debería cambiar, sugiere conversarlo con su coach o pedir un ajuste desde Mi espacio. No prometas resultados. '
|| 'Si notas riesgo para la persona, dilo con cuidado y sugiere llamar al *4141 (Línea de Prevención del '
|| 'Suicidio) o al 131 (SAMU).');

-- 2. Consentimiento --------------------------------------------------------------------------
create table public.ia_consentimientos (
  participante_id uuid primary key references public.participantes(id) on delete cascade,
  version text not null default '2026-10-21',
  metas boolean not null default false,
  acciones boolean not null default false,
  registro_semanal boolean not null default false,
  aceptado_en timestamptz,
  retirado_en timestamptz,
  check ((aceptado_en is null) or (retirado_en is null) or (retirado_en >= aceptado_en))
);
alter table public.ia_consentimientos enable row level security;
revoke all on public.ia_consentimientos from anon, authenticated;
grant select on public.ia_consentimientos to authenticated;
create policy equipo_leer on public.ia_consentimientos for select to authenticated using (privado.gestiona(participante_id));
create policy yo_leer on public.ia_consentimientos for select to authenticated
  using (participante_id = (select privado.mi_participante_id()));
create or replace trigger auditar after insert or update or delete on public.ia_consentimientos
  for each row execute function privado.auditar_cambio();

-- 3. Consultas ---------------------------------------------------------------------------------
-- La persona NO lee esta tabla (vería borradores sin revisar): usa mis_consultas_ia().
create table public.ia_consultas (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  tipo text not null check (tipo in ('pregunta','borrador_coach')),
  pedida_por uuid not null,
  pregunta text not null check (char_length(pregunta) between 3 and 1000),
  contexto_enviado jsonb,
  estado text not null check (estado in ('enviada','por_revisar','aprobada','descartada','lista','error','crisis','sin_presupuesto')),
  request_id bigint,
  respuesta text check (char_length(respuesta) <= 8000),
  texto_final text check (char_length(texto_final) <= 2000),
  tokens_entrada integer, tokens_salida integer,
  costo_reservado_usd numeric(10,6) not null default 0,
  costo_usd numeric(10,6),
  error text check (char_length(error) <= 300),
  creada_en timestamptz not null default now(),
  respondida_en timestamptz,
  revisada_por uuid, revisada_en timestamptz,
  nota_revision text check (char_length(nota_revision) <= 300)
);
create index ia_consultas_pendientes on public.ia_consultas (estado) where estado in ('enviada','por_revisar');
alter table public.ia_consultas enable row level security;
revoke all on public.ia_consultas from anon, authenticated;
grant select on public.ia_consultas to authenticated;
create policy equipo_leer on public.ia_consultas for select to authenticated using (privado.gestiona(participante_id));
create or replace trigger auditar after insert or update or delete on public.ia_consultas
  for each row execute function privado.auditar_cambio();

alter table public.avisos drop constraint avisos_tipo_check;
alter table public.avisos add constraint avisos_tipo_check check (tipo in ('revision_publicada','ajuste_respondido',
  'programa_publicado','registro_enviado','ajuste_pedido','videollamada_programada',
  'recordatorio_acciones','recordatorio_registro','reporte_comunidad','reconocimiento','beneficio_disponible',
  'ia_por_revisar','ia_respondida','ia_alerta'));

-- 4. Piezas internas -----------------------------------------------------------------------------
create or replace function privado.ia_clave() returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'openai_api_key' limit 1;
$$;
revoke execute on function privado.ia_clave() from public, anon, authenticated;

-- ¿El texto sugiere riesgo? Lista conservadora: ante la duda, se trata como crisis.
create or replace function privado.ia_es_crisis(p_texto text) returns boolean
language sql immutable set search_path = '' as $$
  select lower(p_texto) ~ ('suicid|matarme|quitarme la vida|no quiero (seguir )?vivir|quiero morir|morirme|'
    || 'hacerme da(ñ|n)o|autolesi|cortarme|no vale la pena vivir|desaparecer para siempre|terminar con todo');
$$;
revoke execute on function privado.ia_es_crisis(text) from public, anon, authenticated;

-- Contexto autorizado: solo lo que la persona eligió compartir, sin nombre ni contacto.
create or replace function privado.ia_contexto(p_participante uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare k public.ia_consentimientos%rowtype; c public.ciclos%rowtype; v jsonb := '{}'; v_hoy date := privado.hoy_chile();
begin
  select * into k from public.ia_consentimientos where participante_id = p_participante;
  select * into c from public.ciclos where participante_id = p_participante and estado <> 'cerrado';
  if c.id is null then return v; end if;
  v := jsonb_build_object('semana_del_ciclo', least(greatest((v_hoy - c.inicio) / 7 + 1, 1), c.semanas), 'semanas', c.semanas);
  if k.metas then
    v := v || jsonb_build_object('metas', (select jsonb_agg(jsonb_build_object('titulo', m.titulo, 'para_que', m.para_que) order by m.orden)
      from public.metas m join public.programas g on g.id = m.programa_id and g.estado = 'publicado' where g.ciclo_id = c.id));
  end if;
  if k.acciones then
    v := v || jsonb_build_object('acciones_de_la_semana', (select jsonb_agg(jsonb_build_object('fecha', o.fecha, 'accion', o.titulo,
        'estado', coalesce(r.estado, case when o.fecha < v_hoy then 'sin_marcar' else 'pendiente' end)) order by o.fecha, o.hora)
      from public.ocurrencias o left join public.registros r on r.ocurrencia_id = o.id
      where o.ciclo_id = c.id and o.vigente and o.fecha between v_hoy - extract(isodow from v_hoy)::int + 1
                                                         and v_hoy - extract(isodow from v_hoy)::int + 7));
  end if;
  if k.registro_semanal then
    v := v || jsonb_build_object('ultimo_registro_semanal', (select jsonb_build_object('semana', s.semana, 'carga', s.carga,
        'que_funciono', s.funciono, 'que_costo', s.costo, 'que_cambiaria', s.cambiar)
      from public.registros_semanales s where s.ciclo_id = c.id and s.enviado_en is not null order by s.semana desc limit 1));
  end if;
  return v;
end $$;
revoke execute on function privado.ia_contexto(uuid) from public, anon, authenticated;

-- Crea la consulta y la envía, o la deja registrada como crisis o sin presupuesto.
create or replace function privado.ia_enviar(p_participante uuid, p_tipo text, p_pregunta text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  g public.ia_config%rowtype; v_clave text := privado.ia_clave(); v_ctx jsonb; v_id uuid; v_req bigint;
  v_reserva numeric; v_mes numeric; v_texto text := btrim(p_pregunta);
begin
  select * into g from public.ia_config;
  if not g.activo or v_clave is null then perform privado.error('ia','apagada','409'); end if;
  if not exists (select 1 from public.ia_consentimientos where participante_id = p_participante
                   and aceptado_en is not null and retirado_en is null) then
    perform privado.error('ia','sin_consentimiento','409');
  end if;
  if v_texto is null or char_length(v_texto) < 3 or char_length(v_texto) > 1000 then perform privado.error('pregunta','invalida'); end if;
  if (select count(*) from public.ia_consultas where participante_id = p_participante and tipo = p_tipo
        and creada_en > now() - interval '24 hours') >= g.tope_diario_persona then
    perform privado.error('ia','demasiadas','429');
  end if;
  if privado.ia_es_crisis(v_texto) then
    insert into public.ia_consultas (participante_id, tipo, pedida_por, pregunta, estado)
    values (p_participante, p_tipo, auth.uid(), v_texto, 'crisis') returning id into v_id;
    perform privado.avisar_app(p_participante, false, 'ia_alerta', 'Alerta: una consulta al asistente sugiere riesgo. Contacta a la persona.', '/equipo/');
    perform privado.avisar('Rumbo · alerta en una consulta al asistente', 'Una consulta sugiere riesgo. Revisa el panel ahora.');
    return v_id;
  end if;
  v_reserva := (g.tokens_entrada_estimados * g.precio_entrada_1m + g.max_tokens_respuesta * g.precio_salida_1m) / 1000000;
  select coalesce(sum(coalesce(costo_usd, costo_reservado_usd)), 0) into v_mes from public.ia_consultas
   where creada_en >= date_trunc('month', now() at time zone 'America/Santiago') at time zone 'America/Santiago';
  if v_mes + v_reserva > g.tope_mensual_usd then
    insert into public.ia_consultas (participante_id, tipo, pedida_por, pregunta, estado)
    values (p_participante, p_tipo, auth.uid(), v_texto, 'sin_presupuesto') returning id into v_id;
    return v_id;
  end if;
  v_ctx := privado.ia_contexto(p_participante);
  v_req := net.http_post(
    url := 'https://api.openai.com/v1/chat/completions',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_clave, 'Content-Type', 'application/json'),
    body := jsonb_build_object('model', g.modelo, 'max_tokens', g.max_tokens_respuesta, 'temperature', 0.4,
      'messages', jsonb_build_array(
        jsonb_build_object('role', 'system', 'content', g.instrucciones
          || case when p_tipo = 'borrador_coach' then ' Esta vez escribes un borrador para el coach, no para la persona.' else '' end),
        jsonb_build_object('role', 'user', 'content', 'Contexto autorizado (JSON): ' || v_ctx::text || E'\n\n'
          || case when p_tipo = 'borrador_coach' then 'Pedido del coach: ' else 'Pregunta de la persona: ' end || v_texto))),
    timeout_milliseconds := 30000);
  insert into public.ia_consultas (participante_id, tipo, pedida_por, pregunta, contexto_enviado, estado, request_id, costo_reservado_usd)
  values (p_participante, p_tipo, auth.uid(), v_texto, v_ctx, 'enviada', v_req, v_reserva) returning id into v_id;
  return v_id;
end $$;
revoke execute on function privado.ia_enviar(uuid, text, text) from public, anon, authenticated;

-- Recoge las respuestas que llegaron. Devuelve cuántas consultas cerró.
create or replace function privado.ia_recoger() returns integer
language plpgsql security definer set search_path = '' as $$
declare q record; r record; g public.ia_config%rowtype; v_json jsonb; v_texto text; v_n int := 0; v_ent int; v_sal int;
begin
  select * into g from public.ia_config;
  for q in select * from public.ia_consultas where estado = 'enviada' for update skip locked loop
    select * into r from net._http_response where id = q.request_id;
    if r.id is null then
      if q.creada_en < now() - interval '5 hours' then
        update public.ia_consultas set estado = 'error', error = 'sin_respuesta', costo_reservado_usd = 0 where id = q.id;
        v_n := v_n + 1;
      end if;
      continue;
    end if;
    begin v_json := r.content::jsonb; exception when others then v_json := null; end;
    v_texto := v_json->'choices'->0->'message'->>'content';
    if r.status_code = 200 and v_texto is not null then
      v_ent := coalesce((v_json->'usage'->>'prompt_tokens')::int, 0);
      v_sal := coalesce((v_json->'usage'->>'completion_tokens')::int, 0);
      update public.ia_consultas set
        estado = case when q.tipo = 'pregunta' then 'por_revisar' else 'lista' end,
        respuesta = left(v_texto, 8000), tokens_entrada = v_ent, tokens_salida = v_sal,
        costo_usd = (v_ent * g.precio_entrada_1m + v_sal * g.precio_salida_1m) / 1000000, respondida_en = now()
       where id = q.id;
      perform privado.avisar_app(q.participante_id, false, 'ia_por_revisar',
        case when q.tipo = 'pregunta' then 'Respuesta del asistente por revisar' else 'Borrador del asistente listo' end, '/equipo/');
    else
      update public.ia_consultas set estado = 'error', costo_reservado_usd = 0,
        error = left(coalesce(case when r.timed_out then 'tiempo_agotado' end, r.error_msg, 'http_' || r.status_code::text), 300)
       where id = q.id;
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke execute on function privado.ia_recoger() from public, anon, authenticated;

-- 5. Funciones de la persona -----------------------------------------------------------------
-- ¿Puede usar el asistente ahora? (para mostrar o no la sección)
create or replace function public.ia_disponible() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select activo from public.ia_config), false) and privado.ia_clave() is not null
     and public.modulo_visible('asistente_ia');
$$;

create or replace function public.ia_guardar_consentimiento(p_metas boolean, p_acciones boolean, p_registro_semanal boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id();
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  if p_metas is null or p_acciones is null or p_registro_semanal is null then perform privado.error('consentimiento','invalido'); end if;
  insert into public.ia_consentimientos (participante_id, metas, acciones, registro_semanal, aceptado_en)
  values (v_yo, p_metas, p_acciones, p_registro_semanal, now())
  on conflict (participante_id) do update set metas = excluded.metas, acciones = excluded.acciones,
    registro_semanal = excluded.registro_semanal, aceptado_en = now(), retirado_en = null, version = excluded.version;
end $$;

create or replace function public.ia_retirar_consentimiento() returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id();
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  update public.ia_consentimientos set retirado_en = now(), metas = false, acciones = false, registro_semanal = false
   where participante_id = v_yo and retirado_en is null;
end $$;

-- Preguntar. Devuelve el estado: 'enviada' (la verá tu coach antes que tú), 'crisis' o 'sin_presupuesto'.
create or replace function public.ia_preguntar(p_pregunta text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id(); v_id uuid;
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  if not public.modulo_visible('asistente_ia') then perform privado.error('modulo','no_disponible','409'); end if;
  if not exists (select 1 from public.participantes p join public.ciclos c on c.participante_id = p.id and c.estado = 'activo'
                  where p.id = v_yo and p.estado = 'activo') then
    perform privado.error('ciclo','no_activo','409');
  end if;
  v_id := privado.ia_enviar(v_yo, 'pregunta', p_pregunta);
  return jsonb_build_object('id', v_id, 'estado', (select estado from public.ia_consultas where id = v_id));
end $$;

-- Mis consultas: la respuesta solo aparece cuando el coach la aprobó.
create or replace function public.mis_consultas_ia()
returns table (id uuid, pregunta text, estado text, respuesta text, creada_en timestamptz, revisada_en timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id();
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  return query select q.id, q.pregunta,
      case when q.estado in ('enviada','por_revisar') then 'en_revision' else q.estado end,
      case when q.estado = 'aprobada' then q.texto_final end, q.creada_en,
      case when q.estado in ('aprobada','descartada') then q.revisada_en end
    from public.ia_consultas q where q.participante_id = v_yo and q.tipo = 'pregunta'
   order by q.creada_en desc limit 50;
end $$;

-- 6. Funciones del equipo --------------------------------------------------------------------
-- El coach pide un borrador para su trabajo con la persona (p. ej. de su revisión semanal).
create or replace function public.ia_pedir_borrador(p_participante uuid, p_pedido text) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.gestiona(p_participante) then perform privado.error('sesion','no_autorizado','403'); end if;
  return privado.ia_enviar(p_participante, 'borrador_coach', p_pedido);
end $$;

-- Revisar la respuesta a una pregunta: aprobar (tal cual o corregida) o descartar con nota.
create or replace function public.ia_revisar(p_consulta uuid, p_aprobar boolean, p_texto text default null,
  p_nota text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare q public.ia_consultas%rowtype; v_texto text;
begin
  select * into q from public.ia_consultas where id = p_consulta for update;
  if q.id is null or not privado.gestiona(q.participante_id) then perform privado.error('sesion','no_autorizado','403'); end if;
  if q.tipo <> 'pregunta' or q.estado <> 'por_revisar' then perform privado.error('consulta','no_por_revisar','409'); end if;
  if p_aprobar then
    v_texto := coalesce(nullif(btrim(p_texto), ''), q.respuesta);
    if char_length(v_texto) > 2000 then perform privado.error('texto','invalido'); end if;
    update public.ia_consultas set estado = 'aprobada', texto_final = v_texto, revisada_por = auth.uid(), revisada_en = now(),
           nota_revision = nullif(left(btrim(p_nota), 300), '') where id = p_consulta;
    perform privado.avisar_app(q.participante_id, true, 'ia_respondida', 'Tu coach revisó la respuesta del asistente', '/mi-espacio/');
  else
    update public.ia_consultas set estado = 'descartada', revisada_por = auth.uid(), revisada_en = now(),
           nota_revision = nullif(left(btrim(p_nota), 300), '') where id = p_consulta;
  end if;
end $$;

-- Bandeja del coach: recoge lo que llegó y muestra lo de sus participantes (el dueño, todo).
create or replace function public.ia_bandeja()
returns table (id uuid, participante_id uuid, tipo text, pregunta text, estado text, respuesta text, creada_en timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if privado.es_dueno() or privado.es_coach() then perform privado.ia_recoger(); end if;
  return query select q.id, q.participante_id, q.tipo, q.pregunta, q.estado, q.respuesta, q.creada_en
    from public.ia_consultas q
   where privado.gestiona(q.participante_id) and q.estado in ('enviada','por_revisar','lista','crisis','error')
   order by (q.estado = 'crisis') desc, q.creada_en;
end $$;

-- El dueño configura y enciende. Encender exige la clave en el Vault.
create or replace function public.guardar_ia_config(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.ia_config%rowtype; v_activo boolean;
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  select * into g from public.ia_config for update;
  v_activo := coalesce((p->>'activo')::boolean, g.activo);
  if v_activo and privado.ia_clave() is null then perform privado.error('ia','sin_clave','409'); end if;
  begin
    update public.ia_config set
      activo = v_activo,
      modelo = coalesce(p->>'modelo', modelo),
      instrucciones = coalesce(p->>'instrucciones', instrucciones),
      max_tokens_respuesta = coalesce((p->>'max_tokens_respuesta')::smallint, max_tokens_respuesta),
      tokens_entrada_estimados = coalesce((p->>'tokens_entrada_estimados')::smallint, tokens_entrada_estimados),
      precio_entrada_1m = coalesce((p->>'precio_entrada_1m')::numeric, precio_entrada_1m),
      precio_salida_1m = coalesce((p->>'precio_salida_1m')::numeric, precio_salida_1m),
      tope_mensual_usd = coalesce((p->>'tope_mensual_usd')::numeric, tope_mensual_usd),
      tope_diario_persona = coalesce((p->>'tope_diario_persona')::smallint, tope_diario_persona),
      activado_en = case when v_activo and not g.activo then now() when not v_activo then null else activado_en end,
      actualizado_en = now(), actualizado_por = auth.uid();
  exception when check_violation or not_null_violation or invalid_text_representation or numeric_value_out_of_range then
    perform privado.error('ia','config_invalida');
  end;
end $$;

-- Gasto del mes (hora de Chile) para el dueño.
create or replace function public.ia_gasto() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_desde timestamptz := date_trunc('month', now() at time zone 'America/Santiago') at time zone 'America/Santiago';
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  return (select jsonb_build_object(
      'tope_usd', (select tope_mensual_usd from public.ia_config),
      'gastado_usd', coalesce(sum(costo_usd), 0),
      'reservado_usd', coalesce(sum(costo_reservado_usd) filter (where estado = 'enviada'), 0),
      'consultas', count(*) filter (where estado not in ('crisis','sin_presupuesto')),
      'crisis', count(*) filter (where estado = 'crisis'),
      'sin_presupuesto', count(*) filter (where estado = 'sin_presupuesto'),
      'errores', count(*) filter (where estado = 'error'))
    from public.ia_consultas where creada_en >= v_desde);
end $$;

revoke all on function public.ia_disponible(), public.ia_guardar_consentimiento(boolean, boolean, boolean),
  public.ia_retirar_consentimiento(), public.ia_preguntar(text), public.mis_consultas_ia(),
  public.ia_pedir_borrador(uuid, text), public.ia_revisar(uuid, boolean, text, text), public.ia_bandeja(),
  public.guardar_ia_config(jsonb), public.ia_gasto() from public, anon, authenticated;
grant execute on function public.ia_disponible(), public.ia_guardar_consentimiento(boolean, boolean, boolean),
  public.ia_retirar_consentimiento(), public.ia_preguntar(text), public.mis_consultas_ia(),
  public.ia_pedir_borrador(uuid, text), public.ia_revisar(uuid, boolean, text, text), public.ia_bandeja(),
  public.guardar_ia_config(jsonb), public.ia_gasto() to authenticated;

-- 7. Tarea por hora y copia de mis datos -------------------------------------------------------
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
    'asistente_consentimiento', (select to_jsonb(x) from public.ia_consentimientos x, yo where x.participante_id = yo.id),
    'asistente_consultas', (select jsonb_agg(jsonb_build_object('pregunta', x.pregunta, 'contexto_enviado', x.contexto_enviado,
        'estado', x.estado, 'respuesta', case when x.estado = 'aprobada' then x.texto_final end, 'creada_en', x.creada_en))
      from public.ia_consultas x, yo where x.participante_id = yo.id and x.tipo = 'pregunta'),
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;
