-- E4 · Especialistas Rumbo, segunda etapa: el espacio de trabajo (función 23 del inventario).
-- Sobre E3. Todo con autorización de la persona y sin pagos:
--  · Vínculo: la persona autoriza a un especialista publicado y elige qué comparte (metas,
--    acciones recientes, evolución semanal). Sin vínculo activo, el especialista no ve nada.
--    Ella lo retira cuando quiera y el acceso se corta en el acto. Solo se comparte su nombre
--    preferido; nunca el correo ni otros datos de contacto.
--  · Reservas: la persona pide un servicio (origen «rumbo»); el especialista acepta (con hora y
--    enlace https), rechaza y después anota si se realizó. El especialista también puede agendar
--    con quien ya está vinculado (origen «propio»). Rumbo no cobra: el pago es entre ellos. Al
--    realizarse una reserva de origen «rumbo» se calcula la comisión con el porcentaje vigente (15 %
--    por validar) para la liquidación; las de origen «propio» no llevan comisión. Las reservas
--    solo se abren cuando el dueño activa `reservas_activas`.
--  · Seguimiento y recomendaciones: con el vínculo, el especialista ve solo lo autorizado y deja
--    recomendaciones, que lee la persona y también su coach (el coach decide si ajusta el plan).
--  · Mensajes: privados entre la persona y el especialista (ni coach ni dueño los leen).
-- Un especialista suspendido o rechazado pierde todo acceso.

create table public.vinculos_especialista (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  especialista_id uuid not null references public.especialistas(id) on delete cascade,
  comparte_metas boolean not null default false,
  comparte_acciones boolean not null default false,
  comparte_evolucion boolean not null default false,
  otorgado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  retirado_en timestamptz
);
create unique index vinculo_activo on public.vinculos_especialista (participante_id, especialista_id) where retirado_en is null;
alter table public.vinculos_especialista enable row level security;
revoke all on public.vinculos_especialista from anon, authenticated;
grant select on public.vinculos_especialista to authenticated;
create policy equipo_leer on public.vinculos_especialista for select to authenticated using (privado.gestiona(participante_id));
create policy yo_leer on public.vinculos_especialista for select to authenticated
  using (participante_id = (select privado.mi_participante_id()));
create or replace trigger auditar after insert or update or delete on public.vinculos_especialista
  for each row execute function privado.auditar_cambio();

create table public.reservas_especialista (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  especialista_id uuid not null references public.especialistas(id) on delete cascade,
  servicio_id uuid not null references public.especialistas_servicios(id),
  origen text not null check (origen in ('rumbo','propio')),
  mensaje text check (char_length(mensaje) <= 500),
  estado text not null default 'pedida' check (estado in ('pedida','aceptada','rechazada','realizada','no_asistio','cancelada')),
  programada_para timestamptz,
  enlace text check (enlace ~ '^https://[^[:space:]]+$' and char_length(enlace) <= 300),
  nota_especialista text check (char_length(nota_especialista) <= 300),
  precio_clp integer check (precio_clp > 0),
  comision_pct numeric(5,2) not null default 0 check (comision_pct between 0 and 100),
  comision_clp integer check (comision_clp >= 0),
  creada_en timestamptz not null default now(),
  respondida_en timestamptz,
  cerrada_en timestamptz,
  check (estado not in ('aceptada','realizada','no_asistio') or programada_para is not null),
  check (origen = 'rumbo' or comision_pct = 0)
);
alter table public.reservas_especialista enable row level security;
revoke all on public.reservas_especialista from anon, authenticated;
grant select on public.reservas_especialista to authenticated;
create policy equipo_leer on public.reservas_especialista for select to authenticated using (privado.gestiona(participante_id));
create policy yo_leer on public.reservas_especialista for select to authenticated
  using (participante_id = (select privado.mi_participante_id()));
create policy especialista_leer on public.reservas_especialista for select to authenticated
  using (especialista_id = (select privado.mi_especialista_id()));
create or replace trigger auditar after insert or update or delete on public.reservas_especialista
  for each row execute function privado.auditar_cambio();

create table public.recomendaciones_especialista (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  especialista_id uuid not null references public.especialistas(id) on delete cascade,
  texto text not null check (char_length(texto) between 10 and 800),
  creada_en timestamptz not null default now()
);
alter table public.recomendaciones_especialista enable row level security;
revoke all on public.recomendaciones_especialista from anon, authenticated;
grant select on public.recomendaciones_especialista to authenticated;
create policy equipo_leer on public.recomendaciones_especialista for select to authenticated using (privado.gestiona(participante_id));
create policy yo_leer on public.recomendaciones_especialista for select to authenticated
  using (participante_id = (select privado.mi_participante_id()));
create policy especialista_leer on public.recomendaciones_especialista for select to authenticated
  using (especialista_id = (select privado.mi_especialista_id()));
create or replace trigger auditar after insert or update or delete on public.recomendaciones_especialista
  for each row execute function privado.auditar_cambio();

-- Privados entre las dos partes: sin política para el equipo.
create table public.mensajes_especialista (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  especialista_id uuid not null references public.especialistas(id) on delete cascade,
  de_especialista boolean not null,
  texto text not null check (char_length(texto) between 1 and 1000),
  creado_en timestamptz not null default now(),
  leido_en timestamptz
);
create index mensajes_especialista_hilo on public.mensajes_especialista (participante_id, especialista_id, creado_en);
alter table public.mensajes_especialista enable row level security;
revoke all on public.mensajes_especialista from anon, authenticated;
grant select on public.mensajes_especialista to authenticated;
create policy yo_leer on public.mensajes_especialista for select to authenticated
  using (participante_id = (select privado.mi_participante_id()));
create policy especialista_leer on public.mensajes_especialista for select to authenticated
  using (especialista_id = (select privado.mi_especialista_id()));

alter table public.avisos drop constraint avisos_tipo_check;
alter table public.avisos add constraint avisos_tipo_check check (tipo in ('revision_publicada','ajuste_respondido',
  'programa_publicado','registro_enviado','ajuste_pedido','videollamada_programada',
  'recordatorio_acciones','recordatorio_registro','reporte_comunidad','reconocimiento','beneficio_disponible',
  'ia_por_revisar','ia_respondida','ia_alerta',
  'reserva_pedida','reserva_respondida','mensaje_especialista','recomendacion_especialista'));
-- Los avisos del especialista enlazan a su espacio.
alter table public.avisos drop constraint avisos_enlace_check;
alter table public.avisos add constraint avisos_enlace_check check (enlace ~ '^/(mi-espacio|equipo|especialista)/');

-- Piezas internas ------------------------------------------------------------------------------
-- Las políticas de lectura del especialista la usan: authenticated debe poder ejecutarla.
grant execute on function privado.mi_especialista_id() to authenticated;
create or replace function privado.vinculo(p_participante uuid, p_especialista uuid) returns public.vinculos_especialista
language sql stable security definer set search_path = '' as $$
  select v.* from public.vinculos_especialista v join public.especialistas e on e.id = v.especialista_id
   where v.participante_id = p_participante and v.especialista_id = p_especialista and v.retirado_en is null
     and e.estado in ('verificado','publicado','en_revision');
$$;
revoke execute on function privado.vinculo(uuid, uuid) from public, anon, authenticated;

create or replace function privado.avisar_especialista(p_especialista uuid, p_participante uuid, p_tipo text, p_titulo text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.avisos (destinatario, participante_id, tipo, titulo, enlace)
  select e.user_id, p_participante, p_tipo, p_titulo, '/especialista/' from public.especialistas e
   where e.id = p_especialista and e.user_id is not null;
end $$;
revoke execute on function privado.avisar_especialista(uuid, uuid, text, text) from public, anon, authenticated;

create or replace function privado.persona_activa() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id();
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  if not public.modulo_visible('especialistas') then perform privado.error('modulo','no_disponible','409'); end if;
  return v_yo;
end $$;
revoke execute on function privado.persona_activa() from public, anon, authenticated;

-- 1. La persona ---------------------------------------------------------------------------------
-- Autorizar (o cambiar lo que comparte con) un especialista publicado.
create or replace function public.autorizar_especialista(p_especialista uuid, p_metas boolean, p_acciones boolean,
  p_evolucion boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.persona_activa(); v_id uuid;
begin
  if p_metas is null or p_acciones is null or p_evolucion is null then perform privado.error('autorizacion','invalida'); end if;
  select id into v_id from public.vinculos_especialista where participante_id = v_yo and especialista_id = p_especialista and retirado_en is null;
  if v_id is null then
    if not exists (select 1 from public.especialistas where id = p_especialista and estado = 'publicado') then
      perform privado.error('especialista','no_encontrado','404'); end if;
    insert into public.vinculos_especialista (participante_id, especialista_id, comparte_metas, comparte_acciones, comparte_evolucion)
    values (v_yo, p_especialista, p_metas, p_acciones, p_evolucion) returning id into v_id;
  else
    update public.vinculos_especialista set comparte_metas = p_metas, comparte_acciones = p_acciones,
           comparte_evolucion = p_evolucion, actualizado_en = now() where id = v_id;
  end if;
  return v_id;
end $$;

-- Retirar la autorización: el especialista deja de ver todo al instante. Las reservas pendientes se cancelan.
create or replace function public.retirar_especialista(p_especialista uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id();
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  update public.vinculos_especialista set retirado_en = now(), comparte_metas = false, comparte_acciones = false,
         comparte_evolucion = false where participante_id = v_yo and especialista_id = p_especialista and retirado_en is null;
  if not found then perform privado.error('vinculo','no_encontrado','404'); end if;
  update public.reservas_especialista set estado = 'cancelada', cerrada_en = now()
   where participante_id = v_yo and especialista_id = p_especialista and estado in ('pedida','aceptada');
end $$;

-- Pedir una reserva. Crea el vínculo (sin compartir nada) si no existía: la persona elige contactarlo.
create or replace function public.pedir_reserva(p_servicio uuid, p_mensaje text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.persona_activa(); s public.especialistas_servicios%rowtype; v_id uuid; g public.especialistas_config%rowtype;
begin
  select * into g from public.especialistas_config;
  if not g.reservas_activas then perform privado.error('reservas','no_disponibles','409'); end if;
  select * into s from public.especialistas_servicios where id = p_servicio and activo;
  if s.id is null or not exists (select 1 from public.especialistas where id = s.especialista_id and estado = 'publicado') then
    perform privado.error('servicio','no_encontrado','404'); end if;
  if (select count(*) from public.reservas_especialista where participante_id = v_yo and estado = 'pedida') >= 3 then
    perform privado.error('reserva','demasiadas','429'); end if;
  if (privado.vinculo(v_yo, s.especialista_id)).id is null then
    insert into public.vinculos_especialista (participante_id, especialista_id) values (v_yo, s.especialista_id);
  end if;
  insert into public.reservas_especialista (participante_id, especialista_id, servicio_id, origen, mensaje, precio_clp, comision_pct)
  values (v_yo, s.especialista_id, s.id, 'rumbo', nullif(left(btrim(p_mensaje), 500), ''), s.precio_clp, g.comision_pct)
  returning id into v_id;
  perform privado.avisar_especialista(s.especialista_id, v_yo, 'reserva_pedida', 'Nueva solicitud de reserva');
  return v_id;
end $$;

create or replace function public.cancelar_reserva(p_reserva uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id(); r public.reservas_especialista%rowtype;
begin
  select * into r from public.reservas_especialista where id = p_reserva for update;
  if r.id is null or (r.participante_id is distinct from v_yo and r.especialista_id is distinct from privado.mi_especialista_id()) then
    perform privado.error('reserva','no_encontrada','404'); end if;
  if r.estado not in ('pedida','aceptada') then perform privado.error('reserva','cerrada','409'); end if;
  update public.reservas_especialista set estado = 'cancelada', cerrada_en = now() where id = p_reserva;
  if r.participante_id = v_yo then
    perform privado.avisar_especialista(r.especialista_id, r.participante_id, 'reserva_respondida', 'Una reserva fue cancelada');
  else
    perform privado.avisar_app(r.participante_id, true, 'reserva_respondida', 'Tu especialista canceló una reserva', '/mi-espacio/');
  end if;
end $$;

-- Mensajes con un especialista vinculado (de la persona o del especialista, según quién llama).
create or replace function public.enviar_mensaje_especialista(p_participante uuid, p_especialista uuid, p_texto text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_soy_esp boolean := coalesce(p_especialista = privado.mi_especialista_id(), false); v_id uuid; v_texto text := btrim(p_texto);
begin
  if not v_soy_esp and p_participante is distinct from privado.mi_participante_id() then
    perform privado.error('sesion','no_autorizado','403'); end if;
  if (privado.vinculo(p_participante, p_especialista)).id is null then perform privado.error('vinculo','no_encontrado','404'); end if;
  if v_texto is null or char_length(v_texto) < 1 or char_length(v_texto) > 1000 then perform privado.error('texto','invalido'); end if;
  if (select count(*) from public.mensajes_especialista where participante_id = p_participante and especialista_id = p_especialista
        and de_especialista = v_soy_esp and creado_en > now() - interval '24 hours') >= 30 then
    perform privado.error('mensaje','demasiados','429'); end if;
  insert into public.mensajes_especialista (participante_id, especialista_id, de_especialista, texto)
  values (p_participante, p_especialista, v_soy_esp, v_texto) returning id into v_id;
  if v_soy_esp then
    perform privado.avisar_app(p_participante, true, 'mensaje_especialista', 'Nuevo mensaje de tu especialista', '/mi-espacio/');
  else
    perform privado.avisar_especialista(p_especialista, p_participante, 'mensaje_especialista', 'Nuevo mensaje');
  end if;
  return v_id;
end $$;

-- 2. El especialista ------------------------------------------------------------------------------
create or replace function privado.yo_especialista() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid := privado.mi_especialista_id();
begin
  if v is null then perform privado.error('sesion','no_autorizado','403'); end if;
  return v;
end $$;
revoke execute on function privado.yo_especialista() from public, anon, authenticated;

create or replace function public.responder_reserva(p_reserva uuid, p_aceptar boolean, p_programada_para timestamptz default null,
  p_enlace text default null, p_nota text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.yo_especialista(); r public.reservas_especialista%rowtype; v_enlace text := nullif(btrim(p_enlace), '');
begin
  select * into r from public.reservas_especialista where id = p_reserva and especialista_id = v_yo for update;
  if r.id is null then perform privado.error('reserva','no_encontrada','404'); end if;
  if r.estado <> 'pedida' then perform privado.error('reserva','ya_respondida','409'); end if;
  if p_aceptar then
    if p_programada_para is null or p_programada_para < now() then perform privado.error('fecha','invalida'); end if;
    if v_enlace is not null and (v_enlace !~ '^https://[^[:space:]]+$' or char_length(v_enlace) > 300) then
      perform privado.error('enlace','invalido'); end if;
  end if;
  update public.reservas_especialista set estado = case when p_aceptar then 'aceptada' else 'rechazada' end,
         programada_para = case when p_aceptar then p_programada_para end, enlace = case when p_aceptar then v_enlace end,
         nota_especialista = nullif(left(btrim(p_nota), 300), ''), respondida_en = now(),
         cerrada_en = case when p_aceptar then null else now() end
   where id = p_reserva;
  perform privado.avisar_app(r.participante_id, true, 'reserva_respondida',
    case when p_aceptar then 'Tu reserva fue confirmada' else 'Tu reserva no pudo confirmarse' end, '/mi-espacio/');
end $$;

-- Agendar con alguien ya vinculado (origen «propio»: sin comisión).
create or replace function public.agendar_reserva(p_participante uuid, p_servicio uuid, p_programada_para timestamptz,
  p_enlace text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.yo_especialista(); s public.especialistas_servicios%rowtype; v_id uuid; v_enlace text := nullif(btrim(p_enlace), '');
begin
  if (privado.vinculo(p_participante, v_yo)).id is null then perform privado.error('vinculo','no_encontrado','404'); end if;
  select * into s from public.especialistas_servicios where id = p_servicio and especialista_id = v_yo and activo;
  if s.id is null then perform privado.error('servicio','no_encontrado','404'); end if;
  if p_programada_para is null or p_programada_para < now() then perform privado.error('fecha','invalida'); end if;
  if v_enlace is not null and (v_enlace !~ '^https://[^[:space:]]+$' or char_length(v_enlace) > 300) then
    perform privado.error('enlace','invalido'); end if;
  insert into public.reservas_especialista (participante_id, especialista_id, servicio_id, origen, estado, programada_para, enlace,
                                            precio_clp, respondida_en)
  values (p_participante, v_yo, s.id, 'propio', 'aceptada', p_programada_para, v_enlace, s.precio_clp, now())
  returning id into v_id;
  perform privado.avisar_app(p_participante, true, 'reserva_respondida', 'Tu especialista agendó una sesión', '/mi-espacio/');
  return v_id;
end $$;

-- Anotar qué pasó (desde la hora agendada). Una realizada de origen «rumbo» calcula la comisión.
create or replace function public.anotar_reserva(p_reserva uuid, p_estado text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.yo_especialista(); r public.reservas_especialista%rowtype;
begin
  select * into r from public.reservas_especialista where id = p_reserva and especialista_id = v_yo for update;
  if r.id is null then perform privado.error('reserva','no_encontrada','404'); end if;
  if r.estado <> 'aceptada' then perform privado.error('reserva','no_aceptada','409'); end if;
  if p_estado not in ('realizada','no_asistio') then perform privado.error('estado','invalido'); end if;
  if r.programada_para > now() then perform privado.error('fecha','aun_no_ocurre'); end if;
  update public.reservas_especialista set estado = p_estado, cerrada_en = now(),
         comision_clp = case when p_estado = 'realizada' and r.origen = 'rumbo' and r.precio_clp is not null
                             then round(r.precio_clp * r.comision_pct / 100.0) end
   where id = p_reserva;
end $$;

-- Mis participantes vinculados y lo que cada uno autorizó.
create or replace function public.mis_participantes_especialista()
returns table (participante_id uuid, nombre text, comparte_metas boolean, comparte_acciones boolean, comparte_evolucion boolean,
               otorgado_en timestamptz, reservas_abiertas integer)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := privado.yo_especialista();
begin
  return query select v.participante_id, coalesce(p.nombre_preferido, p.nombre), v.comparte_metas, v.comparte_acciones,
      v.comparte_evolucion, v.otorgado_en,
      (select count(*)::int from public.reservas_especialista r where r.participante_id = v.participante_id
          and r.especialista_id = v_yo and r.estado in ('pedida','aceptada'))
    from public.vinculos_especialista v join public.participantes p on p.id = v.participante_id
   where v.especialista_id = v_yo and v.retirado_en is null order by v.otorgado_en;
end $$;

-- Seguimiento: solo lo que la persona autorizó.
create or replace function public.especialista_seguimiento(p_participante uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := privado.yo_especialista(); v public.vinculos_especialista%rowtype; c public.ciclos%rowtype;
  v_hoy date := privado.hoy_chile(); r jsonb;
begin
  v := privado.vinculo(p_participante, v_yo);
  if v.id is null then perform privado.error('vinculo','no_encontrado','404'); end if;
  select * into c from public.ciclos where participante_id = p_participante and estado <> 'cerrado';
  r := jsonb_build_object('nombre', (select coalesce(nombre_preferido, nombre) from public.participantes where id = p_participante));
  if c.id is null then return r; end if;
  if v.comparte_metas then
    r := r || jsonb_build_object('metas', (select jsonb_agg(jsonb_build_object('titulo', m.titulo, 'para_que', m.para_que,
        'categoria', m.categoria, 'hitos', m.hitos) order by m.orden)
      from public.metas m join public.programas g on g.id = m.programa_id and g.estado = 'publicado' where g.ciclo_id = c.id));
  end if;
  if v.comparte_acciones then
    r := r || jsonb_build_object('acciones_recientes', (select jsonb_agg(jsonb_build_object('fecha', o.fecha, 'accion', o.titulo,
        'estado', coalesce(g.estado, case when o.fecha < v_hoy then 'sin_marcar' else 'pendiente' end)) order by o.fecha, o.hora)
      from public.ocurrencias o left join public.registros g on g.ocurrencia_id = o.id
      where o.ciclo_id = c.id and o.vigente and o.fecha between v_hoy - 13 and v_hoy + 7));
  end if;
  if v.comparte_evolucion then
    r := r || jsonb_build_object('evolucion', (select jsonb_agg(jsonb_build_object('semana', s,
        'cumplimiento', (select case when sum(d.programadas) > 0 then round(100.0 * sum(d.hechas) / sum(d.programadas))::int end
                           from public.progreso_diario d where d.participante_id = p_participante
                            and d.fecha between c.inicio + (s - 1) * 7 and least(c.inicio + s * 7 - 1, v_hoy))) order by s)
      from generate_series(1, c.semanas) s where c.inicio + (s - 1) * 7 <= v_hoy));
  end if;
  return r;
end $$;

create or replace function public.recomendar(p_participante uuid, p_texto text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.yo_especialista(); v_id uuid;
begin
  if (privado.vinculo(p_participante, v_yo)).id is null then perform privado.error('vinculo','no_encontrado','404'); end if;
  if p_texto is null or char_length(btrim(p_texto)) not between 10 and 800 then perform privado.error('texto','invalido'); end if;
  insert into public.recomendaciones_especialista (participante_id, especialista_id, texto) values (p_participante, v_yo, btrim(p_texto))
  returning id into v_id;
  perform privado.avisar_app(p_participante, true, 'recomendacion_especialista', 'Tu especialista dejó una recomendación', '/mi-espacio/');
  perform privado.avisar_app(p_participante, false, 'recomendacion_especialista', 'Un especialista dejó una recomendación', '/equipo/');
  return v_id;
end $$;

-- 3. El dueño: comisiones para la liquidación (no cobra nada) ---------------------------------------
create or replace function public.comisiones_especialistas(p_desde date, p_hasta date)
returns table (especialista_id uuid, nombre text, realizadas integer, monto_clp bigint, comision_clp bigint, comision_validada boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  return query select e.id, e.nombre, count(r.id)::int, coalesce(sum(r.precio_clp), 0)::bigint, coalesce(sum(r.comision_clp), 0)::bigint,
      (select c.comision_validada from public.especialistas_config c)
    from public.especialistas e join public.reservas_especialista r on r.especialista_id = e.id
   where r.estado = 'realizada' and r.origen = 'rumbo' and (r.cerrada_en at time zone 'America/Santiago')::date between p_desde and p_hasta
   group by e.id, e.nombre order by e.nombre;
end $$;

revoke all on function public.autorizar_especialista(uuid, boolean, boolean, boolean), public.retirar_especialista(uuid),
  public.pedir_reserva(uuid, text), public.cancelar_reserva(uuid), public.enviar_mensaje_especialista(uuid, uuid, text),
  public.responder_reserva(uuid, boolean, timestamptz, text, text), public.agendar_reserva(uuid, uuid, timestamptz, text),
  public.anotar_reserva(uuid, text), public.mis_participantes_especialista(), public.especialista_seguimiento(uuid),
  public.recomendar(uuid, text), public.comisiones_especialistas(date, date) from public, anon, authenticated;
grant execute on function public.autorizar_especialista(uuid, boolean, boolean, boolean), public.retirar_especialista(uuid),
  public.pedir_reserva(uuid, text), public.cancelar_reserva(uuid), public.enviar_mensaje_especialista(uuid, uuid, text),
  public.responder_reserva(uuid, boolean, timestamptz, text, text), public.agendar_reserva(uuid, uuid, timestamptz, text),
  public.anotar_reserva(uuid, text), public.mis_participantes_especialista(), public.especialista_seguimiento(uuid),
  public.recomendar(uuid, text), public.comisiones_especialistas(date, date) to authenticated;

-- Copia de mis datos: vínculos, reservas, recomendaciones y mensajes con especialistas.
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
    'especialistas_vinculos', (select jsonb_agg(to_jsonb(x)) from public.vinculos_especialista x, yo where x.participante_id = yo.id),
    'especialistas_reservas', (select jsonb_agg(to_jsonb(x) - 'comision_pct' - 'comision_clp') from public.reservas_especialista x, yo
                                where x.participante_id = yo.id),
    'especialistas_recomendaciones', (select jsonb_agg(to_jsonb(x)) from public.recomendaciones_especialista x, yo where x.participante_id = yo.id),
    'especialistas_mensajes', (select jsonb_agg(to_jsonb(x)) from public.mensajes_especialista x, yo where x.participante_id = yo.id),
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;
