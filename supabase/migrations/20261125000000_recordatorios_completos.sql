-- R1 · Recordatorios (maqueta 4 de ChatGPT, 30-oct-2026; migración aprobada por Diego el 30-oct-2026).
-- Completa D1/D3 sin tablas nuevas, sobre public.recordatorios:
--  · activos: interruptor general. Apagado por defecto. Al apagarlo, las demás preferencias se
--    conservan. Apagado, solo llega lo esencial a Mis avisos (mensajes del coach y videollamada
--    agendada) y nunca correos.
--  · Categorías: acciones del día y revisión semanal (ya existían); videollamadas (recordatorio
--    24 h antes); mensajes del coach (copia por correo: dentro de Rumbo llegan siempre);
--    comunidad (sus avisos en Mis avisos) y logros (copia por correo: dentro de Rumbo llegan siempre,
--    decisión de Diego del 31-oct-2026).
--  · Horario desde/hasta (7 a 22), hora del recordatorio diario dentro de ese horario, días de la
--    semana y la zona horaria de la persona (participantes.zona_horaria).
--  · Correo: por_correo (D3) y Brevo solo si existen sus claves; correo_disponible() lo dice.
-- guardar_recordatorios pasa a recibir un jsonb (la pantalla es la única que la usa).
-- Quien ya tenía un recordatorio encendido queda con el interruptor general encendido.

alter table public.recordatorios
  add column activos boolean not null default false,
  add column videollamadas boolean not null default true,
  add column mensajes_coach boolean not null default true,
  add column comunidad boolean not null default false,
  add column logros boolean not null default true,
  add column desde smallint not null default 7 check (desde between 7 and 22),
  add column hasta smallint not null default 22 check (hasta between 7 and 22),
  add column dias smallint[] not null default '{1,2,3,4,5,6,7}'
    check (cardinality(dias) between 1 and 7 and dias <@ '{1,2,3,4,5,6,7}'::smallint[]),
  add constraint recordatorios_horario check (desde <= hasta and hora between desde and hasta);
update public.recordatorios set activos = true where acciones_del_dia or registro_semanal;

-- Recordatorio de videollamada: una sola vez por videollamada.
alter table public.videollamadas add column recordada_en timestamptz;

alter table public.avisos drop constraint avisos_tipo_check;
alter table public.avisos add constraint avisos_tipo_check check (tipo in ('revision_publicada','ajuste_respondido',
  'programa_publicado','registro_enviado','ajuste_pedido','videollamada_programada',
  'recordatorio_acciones','recordatorio_registro','reporte_comunidad','reconocimiento','beneficio_disponible',
  'ia_por_revisar','ia_respondida','ia_alerta',
  'reserva_pedida','reserva_respondida','mensaje_especialista','recomendacion_especialista',
  'recordatorio_videollamada'));

-- ¿Quiere la persona esta categoría? Sin preferencias guardadas: no (todo viene apagado).
create or replace function privado.quiere(p_participante uuid, p_categoria text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select x.activos and case p_categoria
      when 'comunidad' then x.comunidad
      when 'logros' then x.logros and x.por_correo
      when 'mensajes_coach' then x.mensajes_coach and x.por_correo
      when 'videollamadas' then x.videollamadas and x.por_correo
      else false end
    from public.recordatorios x where x.participante_id = p_participante), false);
$$;
revoke execute on function privado.quiere(uuid, text) from public, anon, authenticated;

-- Avisos: igual que A5, y además:
--  · los avisos de la Comunidad solo llegan a quien los eligió;
--  · los mensajes del coach, la videollamada agendada y los logros llegan siempre a Mis avisos, con
--    copia por correo solo a quien la eligió (sin el contenido: dice qué pasó y enlaza a Mi espacio).
--    Cada logro se otorga una sola vez, así que su aviso no se repite.
create or replace function privado.avisar_app(p_participante uuid, p_para_participante boolean, p_tipo text,
  p_titulo text, p_enlace text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_correo text; v_sitio text := 'https://diegolazo84.github.io/rumbo-web';
begin
  if p_para_participante then
    if p_tipo in ('comunidad_respuesta','desafio_nuevo') and not privado.quiere(p_participante, 'comunidad') then return; end if;
  end if;
  delete from public.avisos a where a.leido_en < now() - interval '90 days'
     and a.destinatario in (select p.user_id from public.participantes p where p.id = p_participante
                            union select privado.equipo_de(p_participante));
  if p_para_participante then
    insert into public.avisos (destinatario, participante_id, tipo, titulo, enlace)
    select p.user_id, p.id, p_tipo, p_titulo, p_enlace from public.participantes p
     where p.id = p_participante and p.user_id is not null and p.estado <> 'cerrado';
    if (p_tipo in ('revision_publicada','ajuste_respondido','programa_publicado') and privado.quiere(p_participante, 'mensajes_coach'))
       or (p_tipo = 'videollamada_programada' and privado.quiere(p_participante, 'videollamadas'))
       or (p_tipo in ('reconocimiento','beneficio_disponible') and privado.quiere(p_participante, 'logros')) then
      select p.correo::text into v_correo from public.participantes p
       where p.id = p_participante and p.user_id is not null and p.estado <> 'cerrado';
      perform privado.enviar_correo(v_correo, 'Rumbo: ' || p_titulo,
        'Hola. ' || p_titulo || E'.\n\nEntra a Mi espacio: ' || v_sitio || p_enlace
        || E'\n\nSi no quieres recibir estos correos, cámbialo en tus recordatorios: ' || v_sitio || '/mi-espacio/preferencias/recordatorios/');
    end if;
  else
    insert into public.avisos (destinatario, participante_id, tipo, titulo, enlace)
    select d, p_participante, p_tipo, p_titulo, p_enlace from privado.equipo_de(p_participante) d;
  end if;
end $$;
revoke all on function privado.avisar_app(uuid, boolean, text, text, text) from public, anon, authenticated;

-- Guardar: p = {activos, acciones_del_dia, registro_semanal, videollamadas, mensajes_coach, comunidad,
-- logros, por_correo (booleanos), desde, hasta, hora (7 a 22), dias (1 = lunes … 7 = domingo)}.
drop function if exists public.guardar_recordatorios(boolean, boolean, integer, boolean);
create or replace function public.guardar_recordatorios(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_yo uuid := privado.mi_participante_id();
  v_bool text[] := array['activos','acciones_del_dia','registro_semanal','videollamadas','mensajes_coach','comunidad','logros','por_correo'];
  k text; v_desde int; v_hasta int; v_hora int; v_dias smallint[];
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  if p is null or jsonb_typeof(p) <> 'object' then perform privado.error('preferencia','invalida'); end if;
  foreach k in array v_bool loop
    if jsonb_typeof(p->k) is distinct from 'boolean' then perform privado.error('preferencia','invalida'); end if;
  end loop;
  if jsonb_typeof(p->'desde') is distinct from 'number' or jsonb_typeof(p->'hasta') is distinct from 'number'
     or jsonb_typeof(p->'hora') is distinct from 'number' then perform privado.error('hora','invalida'); end if;
  v_desde := (p->>'desde')::numeric; v_hasta := (p->>'hasta')::numeric; v_hora := (p->>'hora')::numeric;
  if v_desde < 7 or v_hasta > 22 or v_desde > v_hasta or v_hora < v_desde or v_hora > v_hasta
     or (p->>'desde')::numeric <> v_desde or (p->>'hasta')::numeric <> v_hasta or (p->>'hora')::numeric <> v_hora then
    perform privado.error('hora','invalida');
  end if;
  if jsonb_typeof(p->'dias') is distinct from 'array' then perform privado.error('dias','invalidos'); end if;
  begin
    select array_agg(distinct d::smallint order by d::smallint) into v_dias from jsonb_array_elements_text(p->'dias') d;
  exception when others then perform privado.error('dias','invalidos');
  end;
  if v_dias is null or not v_dias <@ '{1,2,3,4,5,6,7}'::smallint[] then perform privado.error('dias','invalidos'); end if;
  insert into public.recordatorios (participante_id, activos, acciones_del_dia, registro_semanal, videollamadas, mensajes_coach,
                                    comunidad, logros, por_correo, desde, hasta, hora, dias)
  values (v_yo, (p->>'activos')::boolean, (p->>'acciones_del_dia')::boolean, (p->>'registro_semanal')::boolean,
          (p->>'videollamadas')::boolean, (p->>'mensajes_coach')::boolean, (p->>'comunidad')::boolean,
          (p->>'logros')::boolean, (p->>'por_correo')::boolean, v_desde, v_hasta, v_hora, v_dias)
  on conflict (participante_id) do update
    set activos = excluded.activos, acciones_del_dia = excluded.acciones_del_dia, registro_semanal = excluded.registro_semanal,
        videollamadas = excluded.videollamadas, mensajes_coach = excluded.mensajes_coach, comunidad = excluded.comunidad,
        logros = excluded.logros, por_correo = excluded.por_correo, desde = excluded.desde, hasta = excluded.hasta,
        hora = excluded.hora, dias = excluded.dias, actualizado_en = now();
end $$;
revoke all on function public.guardar_recordatorios(jsonb) from public, anon, authenticated;
grant execute on function public.guardar_recordatorios(jsonb) to authenticated;

-- ¿Puede Rumbo enviar correos? Solo dice sí o no (las claves nunca salen del Vault).
create or replace function public.correo_disponible() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
     and exists (select 1 from vault.decrypted_secrets where name = 'brevo_api_key')
     and exists (select 1 from vault.decrypted_secrets where name = 'correo_remitente');
$$;
revoke all on function public.correo_disponible() from public, anon, authenticated;
grant execute on function public.correo_disponible() to authenticated;

-- Cada hora: en la hora y el día de cada persona (su zona horaria), solo con el interruptor general
-- encendido y dentro de su horario. p_hora y p_hoy fijan la hora y el día para las pruebas.
create or replace function privado.enviar_recordatorios(p_hora integer default null, p_hoy date default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_sitio text := 'https://diegolazo84.github.io/rumbo-web/';   -- se reemplaza con el dominio propio
  v_pie text;
  r record; v record; v_n int := 0; v_semana int; v_hoy date; v_hora int;
begin
  v_pie := E'\n\nEntra a Mi espacio: ' || v_sitio || E'mi-espacio/\n\nSi no quieres recibir estos correos, cámbialo en tus recordatorios: '
           || v_sitio || 'mi-espacio/preferencias/recordatorios/';
  for r in
    select p.id, p.correo::text correo, p.zona_horaria, c.id ciclo_id, c.inicio, c.fin, c.semanas, c.dia_revision,
           x.acciones_del_dia, x.registro_semanal, x.videollamadas, x.por_correo, x.hora, x.desde, x.hasta, x.dias
      from public.recordatorios x
      join public.participantes p on p.id = x.participante_id and p.estado = 'activo' and p.user_id is not null
      join public.ciclos c on c.participante_id = p.id and c.estado = 'activo'
     where x.activos and (x.acciones_del_dia or x.registro_semanal or x.videollamadas)
  loop
    v_hoy := coalesce(p_hoy, (now() at time zone coalesce(r.zona_horaria, 'America/Santiago'))::date);
    v_hora := coalesce(p_hora, extract(hour from now() at time zone coalesce(r.zona_horaria, 'America/Santiago'))::int);
    continue when v_hoy < r.inicio or v_hoy > r.fin
               or not (extract(isodow from v_hoy)::smallint = any (r.dias))
               or v_hora < r.desde or v_hora > r.hasta;
    if r.acciones_del_dia and v_hora = r.hora
       and exists (select 1 from public.ocurrencias o where o.participante_id = r.id and o.fecha = v_hoy and o.vigente
                     and not exists (select 1 from public.registros g where g.ocurrencia_id = o.id))
       and not exists (select 1 from public.avisos a where a.participante_id = r.id and a.tipo = 'recordatorio_acciones'
                         and a.creado_en > now() - interval '20 hours') then
      perform privado.avisar_app(r.id, true, 'recordatorio_acciones', 'Hoy tienes acciones por marcar', '/mi-espacio/');
      if r.por_correo then
        perform privado.enviar_correo(r.correo, 'Rumbo: hoy tienes acciones por marcar',
          'Hola. Hoy tienes acciones de tu plan por marcar.' || v_pie);
      end if;
      v_n := v_n + 1;
    end if;
    -- Mañana es el día de revisión de la semana v_semana.
    v_semana := ((v_hoy + 1 - r.inicio - (r.dia_revision - 1)) / 7) + 1;
    if r.registro_semanal and v_hora = r.hora
       and (v_hoy + 1 - r.inicio - (r.dia_revision - 1)) >= 0 and (v_hoy + 1 - r.inicio - (r.dia_revision - 1)) % 7 = 0
       and v_semana between 1 and r.semanas
       and not exists (select 1 from public.registros_semanales w where w.ciclo_id = r.ciclo_id and w.semana = v_semana
                         and w.enviado_en is not null)
       and not exists (select 1 from public.avisos a where a.participante_id = r.id and a.tipo = 'recordatorio_registro'
                         and a.creado_en > now() - interval '20 hours') then
      perform privado.avisar_app(r.id, true, 'recordatorio_registro',
        'Mañana es tu revisión: cuéntale a tu coach cómo te fue esta semana', '/mi-espacio/');
      if r.por_correo then
        perform privado.enviar_correo(r.correo, 'Rumbo: mañana es tu revisión',
          'Hola. Mañana es tu revisión semanal: cuéntale a tu coach cómo te fue esta semana.' || v_pie);
      end if;
      v_n := v_n + 1;
    end if;
    -- Videollamada en las próximas 24 horas (o menos, si recién se agendó): una vez, dentro del horario.
    if r.videollamadas then
      for v in
        select l.id, l.programada_para from public.videollamadas l
         where l.ciclo_id = r.ciclo_id and l.estado = 'programada' and l.recordada_en is null
           and l.programada_para > now() and l.programada_para <= now() + interval '24 hours'
      loop
        perform privado.avisar_app(r.id, true, 'recordatorio_videollamada',
          'Tu videollamada es el ' || to_char(v.programada_para at time zone coalesce(r.zona_horaria, 'America/Santiago'), 'DD-MM')
          || ' a las ' || to_char(v.programada_para at time zone coalesce(r.zona_horaria, 'America/Santiago'), 'HH24:MI'),
          '/mi-espacio/acompanamiento/');
        if r.por_correo then
          perform privado.enviar_correo(r.correo, 'Rumbo: tu videollamada es pronto',
            'Hola. Tu videollamada semanal con tu coach es dentro de las próximas 24 horas. El enlace está en Mi acompañamiento.' || v_pie);
        end if;
        update public.videollamadas set recordada_en = now() where id = v.id;
        v_n := v_n + 1;
      end loop;
    end if;
  end loop;
  return v_n;
end $$;
revoke execute on function privado.enviar_recordatorios(integer, date) from public, anon, authenticated;
