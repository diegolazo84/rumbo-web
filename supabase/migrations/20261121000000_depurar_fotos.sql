-- C21: borrado automático de las fotos privadas de las acciones (bucket «evidencias»).
--
-- Reglas (decisión de Diego del 29-oct-2026):
-- · Foto revisada (aprobada o no aprobada): se borra el archivo N días después de su revisión.
-- · Foto opcional (acción hecha o dejada con foto): N días después de adjuntarse.
-- · Foto en revisión: nunca se borra por plazo.
-- · N = ajustes_operacion.dias_conservar_foto; si está vacío, 30.
-- · Se conservan el registro, su estado, la nota del coach y los créditos: solo se quita la ruta
--   del archivo y se anota foto_depurada_en.
--
-- Cómo corre: la tarea programada «fotos-depurar» (todos los días) llama a la Edge Function
-- «depurar-fotos» con pg_net. La función usa la clave de servicio que Supabase le entrega por
-- dentro (nunca sale de Supabase) y borra los archivos con la API de Storage, no con SQL. Solo
-- acepta llamadas con la llave interna «depurar_fotos_token», que esta migración crea en Vault.
-- Mientras no exista el secreto «depurar_fotos_url» (lo crea Diego al activar), la tarea no hace
-- nada.

-- 1. Cuándo se adjuntó la foto ------------------------------------------------------------------
-- Falta este dato para las fotos opcionales (actualizado_en cambia por otros motivos). Un
-- disparador lo anota cada vez que cambia la ruta, sin tocar las funciones de registro.
alter table public.registros add column if not exists foto_subida_en timestamptz;

create or replace function privado.anotar_foto_subida() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.foto_ruta is not null and new.foto_subida_en is null then new.foto_subida_en := now(); end if;
  elsif new.foto_ruta is distinct from old.foto_ruta then
    new.foto_subida_en := case when new.foto_ruta is null then null else now() end;
  end if;
  return new;
end $$;
revoke execute on function privado.anotar_foto_subida() from public, anon, authenticated;

create or replace trigger foto_subida before insert or update of foto_ruta on public.registros
  for each row execute function privado.anotar_foto_subida();

-- Fotos que ya existen: la fecha del archivo (o, si no está, la última actualización).
update public.registros r
   set foto_subida_en = coalesce((select s.created_at from storage.objects s
                                   where s.bucket_id = 'evidencias' and s.name = r.foto_ruta), r.actualizado_en)
 where r.foto_ruta is not null and r.foto_subida_en is null;

-- 2. Registro de ejecuciones y fallos (solo los ve el dueño, mediante estado_depuracion_fotos) ---
create table if not exists privado.depuracion_fotos (
  id bigint generated always as identity primary key,
  origen text not null check (origen in ('programada','manual')),
  iniciada_en timestamptz not null default now(),
  terminada_en timestamptz,
  estado text not null default 'en_curso' check (estado in ('en_curso','ok','con_errores','fallida')),
  vencidas int not null default 0,              -- vencidas al empezar
  borradas int not null default 0,              -- archivos borrados y registros anotados
  fallidas int not null default 0,              -- no se pudieron borrar (se reintentan mañana)
  huerfanos_borrados int not null default 0,
  archivos_sin_registro int,                    -- al terminar, pasado el período de seguridad
  registros_sin_archivo int,                    -- al terminar
  vencidas_guardadas int,                       -- al terminar: vencidas que siguen guardadas
  error text check (char_length(error) <= 120)  -- código técnico, nunca rutas ni nombres
);
alter table privado.depuracion_fotos enable row level security;

create table if not exists privado.depuracion_fotos_fallos (
  registro_id uuid primary key references public.registros(id) on delete cascade,
  intentos int not null default 1,
  ultimo_error text not null check (char_length(ultimo_error) <= 120),
  primer_fallo timestamptz not null default now(),
  ultimo_intento timestamptz not null default now()
);
alter table privado.depuracion_fotos_fallos enable row level security;
revoke all on privado.depuracion_fotos, privado.depuracion_fotos_fallos from public, anon, authenticated;

-- 3. Plazos ----------------------------------------------------------------------------------
-- Horas sin registro antes de tratar un archivo como huérfano: una subida en curso nunca tarda
-- tanto (la app registra la foto segundos después de subirla).
create or replace function privado.horas_seguridad_huerfanos() returns int
language sql immutable set search_path = '' as $$ select 48 $$;

create or replace function privado.dias_conservar_foto() returns int
language sql stable security definer set search_path = '' as $$
  select coalesce((select nullif(greatest(a.dias_conservar_foto, 0), 0) from public.ajustes_operacion a limit 1), 30)::int;
$$;

-- Fotos con plazo y cuándo vence cada una. Excluye las rutas que usa otro registro.
create or replace function privado.fotos_con_plazo() returns table (registro_id uuid, ruta text, regla text, vence_en timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.foto_ruta,
         case when r.estado in ('aprobada','rechazada') then 'revisada' else 'opcional' end,
         case when r.estado in ('aprobada','rechazada') then r.revisado_en else r.foto_subida_en end
           + make_interval(days => privado.dias_conservar_foto())
    from public.registros r
   where r.foto_ruta is not null and r.foto_depurada_en is null
     and ((r.estado in ('aprobada','rechazada') and r.revisado_en is not null)
          or (r.estado in ('hecha','dejada') and r.foto_subida_en is not null))
     and not exists (select 1 from public.registros o where o.foto_ruta = r.foto_ruta and o.id <> r.id);
$$;

create or replace function privado.archivo_existe(p_ruta text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from storage.objects s where s.bucket_id = 'evidencias' and s.name = p_ruta);
$$;

-- Lo que el dueño y las alertas necesitan contar, sin rutas ni nombres.
create or replace function privado.conteo_fotos() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'vencidas', (select count(*) from privado.fotos_con_plazo() f where f.vence_en <= now()),
    'vencidas_guardadas', (select count(*) from privado.fotos_con_plazo() f where f.vence_en <= now() and privado.archivo_existe(f.ruta)),
    'proximas_7_dias', (select count(*) from privado.fotos_con_plazo() f where f.vence_en > now() and f.vence_en <= now() + interval '7 days'),
    'en_revision', (select count(*) from public.registros r where r.estado = 'en_revision' and r.foto_ruta is not null),
    'archivos_sin_registro', (select count(*) from storage.objects s where s.bucket_id = 'evidencias'
        and s.created_at < now() - make_interval(hours => privado.horas_seguridad_huerfanos())
        and not exists (select 1 from public.registros r where r.foto_ruta = s.name)),
    'archivos_recientes_sin_registro', (select count(*) from storage.objects s where s.bucket_id = 'evidencias'
        and s.created_at >= now() - make_interval(hours => privado.horas_seguridad_huerfanos())
        and not exists (select 1 from public.registros r where r.foto_ruta = s.name)),
    'registros_sin_archivo', (select count(*) from public.registros r where r.foto_ruta is not null and not privado.archivo_existe(r.foto_ruta)));
$$;
revoke execute on function privado.dias_conservar_foto(), privado.fotos_con_plazo(), privado.archivo_existe(text),
  privado.conteo_fotos(), privado.horas_seguridad_huerfanos() from public, anon, authenticated;

-- 4. Funciones de la Edge Function (solo con la clave de servicio) -----------------------------
-- La llave interna se crea aquí, al azar, dentro de Vault: nadie la escribe ni la copia.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'depurar_fotos_token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'depurar_fotos_token',
      'Llave interna: la tarea programada la envía a la Edge Function depurar-fotos');
  end if;
end $$;

create or replace function public.depuracion_token_valido(p_token text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_token is not null and length(p_token) >= 32
     and exists (select 1 from vault.decrypted_secrets where name = 'depurar_fotos_token' and decrypted_secret = p_token);
$$;

-- Empieza una ejecución. Devuelve null si ya hay otra en curso (evita dos a la vez). Una «en
-- curso» de hace más de 15 minutos se da por interrumpida.
create or replace function public.depuracion_iniciar(p_origen text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('depuracion_fotos'));
  update privado.depuracion_fotos set estado = 'fallida', error = 'interrumpida', terminada_en = now()
   where estado = 'en_curso' and iniciada_en < now() - interval '15 minutes';
  if exists (select 1 from privado.depuracion_fotos where estado = 'en_curso') then return null; end if;
  insert into privado.depuracion_fotos (origen, vencidas)
  values (case when p_origen = 'manual' then 'manual' else 'programada' end,
          (select count(*) from privado.fotos_con_plazo() f where f.vence_en <= now()))
  returning id into v_id;
  return v_id;
end $$;

-- Un lote de fotos vencidas, sin las que ya fallaron en esta misma ejecución.
create or replace function public.depuracion_lote(p_ejecucion bigint, p_limite int)
returns table (registro_id uuid, ruta text)
language sql stable security definer set search_path = '' as $$
  select f.registro_id, f.ruta from privado.fotos_con_plazo() f
   where f.vence_en <= now()
     and not exists (select 1 from privado.depuracion_fotos_fallos x
                      where x.registro_id = f.registro_id
                        and x.ultimo_intento >= (select d.iniciada_en from privado.depuracion_fotos d where d.id = p_ejecucion))
   order by f.vence_en
   limit least(greatest(p_limite, 1), 200);
$$;

-- Anota las fotos ya borradas. Solo las que siguen vencidas, con la misma ruta y cuyo archivo ya
-- no existe: si el borrado falló o la persona cambió la foto, el registro no se toca. Estado,
-- nota, revisión y créditos quedan como estaban.
create or replace function public.depuracion_confirmar(p_ejecucion bigint, p_ids uuid[]) returns uuid[]
language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[];
begin
  with listas as (
    select f.registro_id, f.ruta from privado.fotos_con_plazo() f
     where f.registro_id = any(p_ids) and f.vence_en <= now() and not privado.archivo_existe(f.ruta)
  ), hechas as (
    update public.registros r set foto_ruta = null, foto_depurada_en = now()
      from listas l where r.id = l.registro_id and r.foto_ruta = l.ruta
    returning r.id
  )
  select coalesce(array_agg(id), '{}') into v_ids from hechas;
  delete from privado.depuracion_fotos_fallos where registro_id = any(v_ids);
  update privado.depuracion_fotos set borradas = borradas + coalesce(array_length(v_ids, 1), 0) where id = p_ejecucion;
  return v_ids;
end $$;

create or replace function public.depuracion_fallo(p_ejecucion bigint, p_ids uuid[], p_error text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into privado.depuracion_fotos_fallos (registro_id, ultimo_error)
  select r.id, left(coalesce(p_error, 'desconocido'), 120) from public.registros r where r.id = any(p_ids)
  on conflict (registro_id) do update set intentos = privado.depuracion_fotos_fallos.intentos + 1,
    ultimo_error = excluded.ultimo_error, ultimo_intento = now();
  update privado.depuracion_fotos set fallidas = fallidas + coalesce(array_length(p_ids, 1), 0) where id = p_ejecucion;
end $$;

-- Archivos sin ningún registro, pasado el período de seguridad (48 h). Hasta 100 por llamada.
create or replace function public.depuracion_huerfanos() returns table (ruta text)
language sql stable security definer set search_path = '' as $$
  select s.name from storage.objects s
   where s.bucket_id = 'evidencias'
     and s.created_at < now() - make_interval(hours => privado.horas_seguridad_huerfanos())
     and not exists (select 1 from public.registros r where r.foto_ruta = s.name)
   order by s.created_at
   limit 100;
$$;

-- Cierra la ejecución con los conteos reales de la base y avisa por ntfy si algo quedó mal. El
-- aviso no lleva datos personales ni rutas.
create or replace function public.depuracion_terminar(p_ejecucion bigint, p_huerfanos_borrados int, p_error text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c jsonb := privado.conteo_fotos(); d privado.depuracion_fotos%rowtype; v_estado text; v_repetidos int;
begin
  select * into d from privado.depuracion_fotos where id = p_ejecucion for update;
  if not found then return null; end if;
  v_estado := case
    when p_error is not null then 'fallida'
    when d.fallidas > 0 or (c->>'vencidas_guardadas')::int > 0 or (c->>'registros_sin_archivo')::int > 0
         or (c->>'archivos_sin_registro')::int > 0 then 'con_errores'
    else 'ok' end;
  update privado.depuracion_fotos
     set terminada_en = now(), estado = v_estado, error = left(p_error, 120),
         huerfanos_borrados = greatest(coalesce(p_huerfanos_borrados, 0), 0),
         archivos_sin_registro = (c->>'archivos_sin_registro')::int,
         registros_sin_archivo = (c->>'registros_sin_archivo')::int,
         vencidas_guardadas = (c->>'vencidas_guardadas')::int
   where id = p_ejecucion
  returning * into d;
  select count(*) into v_repetidos from privado.depuracion_fotos_fallos where intentos >= 3;
  if v_estado <> 'ok' then
    perform privado.avisar('Rumbo · borrado de fotos con problemas',
      format('Borradas: %s. No se pudieron borrar: %s (fallan hace 3 días o más: %s). Vencidas que siguen guardadas: %s. '
             'Archivos sin registro: %s. Registros sin archivo: %s.%s Revisa Más → Mantención en el panel: '
             'https://diegolazo84.github.io/rumbo-web/equipo/mas/#mantencion',
             d.borradas, d.fallidas, v_repetidos, d.vencidas_guardadas, d.archivos_sin_registro, d.registros_sin_archivo,
             case when p_error is not null then ' La ejecución se detuvo (' || left(p_error, 40) || ').' else '' end));
  end if;
  return to_jsonb(d) - 'id';
end $$;

revoke all on function public.depuracion_token_valido(text), public.depuracion_iniciar(text), public.depuracion_lote(bigint, int),
  public.depuracion_confirmar(bigint, uuid[]), public.depuracion_fallo(bigint, uuid[], text), public.depuracion_huerfanos(),
  public.depuracion_terminar(bigint, int, text) from public, anon, authenticated;
grant execute on function public.depuracion_token_valido(text), public.depuracion_iniciar(text), public.depuracion_lote(bigint, int),
  public.depuracion_confirmar(bigint, uuid[]), public.depuracion_fallo(bigint, uuid[], text), public.depuracion_huerfanos(),
  public.depuracion_terminar(bigint, int, text) to service_role;

-- 5. Lanzar la Edge Function (tarea programada o «Ejecutar ahora» del dueño) -------------------
-- Sin el secreto «depurar_fotos_url» no hace nada: así la tarea queda creada pero inactiva hasta
-- que Diego despliegue la función y la active. Si la última ejecución tiene más de 2 días, avisa.
create or replace function privado.lanzar_depuracion_fotos(p_origen text default 'programada') returns bigint
language plpgsql security definer set search_path = '' as $$
declare v_url text; v_token text; v_ultima timestamptz;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'depurar_fotos_url';
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'depurar_fotos_token';
  if v_url is null or v_token is null then return null; end if;
  select max(iniciada_en) into v_ultima from privado.depuracion_fotos;
  if p_origen = 'programada' and v_ultima is not null and v_ultima < now() - interval '50 hours' then
    perform privado.avisar('Rumbo · el borrado de fotos no está corriendo',
      'La última ejecución del borrado de fotos fue hace más de 2 días. Revisa Más → Mantención en el panel: '
      || 'https://diegolazo84.github.io/rumbo-web/equipo/mas/#mantencion');
  end if;
  return net.http_post(
    url := v_url,
    body := jsonb_build_object('origen', case when p_origen = 'manual' then 'manual' else 'programada' end),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-rumbo-token', v_token),
    timeout_milliseconds := 120000);
end $$;
revoke execute on function privado.lanzar_depuracion_fotos(text) from public, anon, authenticated;

-- 07:30 UTC: entre las 04:30 y las 03:30 en Chile, según el horario de verano.
select cron.schedule('fotos-depurar', '30 7 * * *', $$select privado.lanzar_depuracion_fotos('programada')$$);

-- 6. Lo que ve y puede hacer el dueño (Más → Mantención) -----------------------------------------
create or replace function public.estado_depuracion_fotos() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  return jsonb_build_object(
    'activa', exists (select 1 from vault.secrets where name = 'depurar_fotos_url')
              and exists (select 1 from cron.job where jobname = 'fotos-depurar' and active),
    'dias', privado.dias_conservar_foto(),
    'horas_seguridad', privado.horas_seguridad_huerfanos(),
    'conteo', privado.conteo_fotos(),
    'fallos', jsonb_build_object(
      'fotos', (select count(*) from privado.depuracion_fotos_fallos),
      'repetidos', (select count(*) from privado.depuracion_fotos_fallos where intentos >= 3),
      'ultimo_error', (select ultimo_error from privado.depuracion_fotos_fallos order by ultimo_intento desc limit 1)),
    'borradas_30_dias', (select coalesce(sum(borradas + huerfanos_borrados), 0) from privado.depuracion_fotos
                          where iniciada_en > now() - interval '30 days'),
    'ejecuciones', coalesce((select jsonb_agg(to_jsonb(e) - 'id' order by e.iniciada_en desc)
                               from (select * from privado.depuracion_fotos order by iniciada_en desc limit 5) e), '[]'));
end $$;

create or replace function public.pedir_depuracion_fotos() returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  return privado.lanzar_depuracion_fotos('manual') is not null;
end $$;

revoke all on function public.estado_depuracion_fotos(), public.pedir_depuracion_fotos() from public, anon, authenticated;
grant execute on function public.estado_depuracion_fotos(), public.pedir_depuracion_fotos() to authenticated;
