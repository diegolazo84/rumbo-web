-- C2 · Videollamada semanal del plan «Acompañamiento cercano» (20 minutos por semana).
-- El coach (o el dueño) deja el enlace y la hora de cada semana y después anota si se hizo.
-- Lo conversado se publica como siempre: la revisión semanal de tipo «videollamada».
-- No crea salas ni conecta servicios de video: el enlace lo pega el coach.

create table public.videollamadas (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  ciclo_id uuid not null references public.ciclos(id) on delete cascade,
  semana smallint not null check (semana between 1 and 12),
  programada_para timestamptz not null,
  enlace text not null check (enlace ~ '^https://[^[:space:]]+$' and char_length(enlace) <= 300),
  estado text not null default 'programada' check (estado in ('programada','realizada','no_asistio','cancelada')),
  registrada_por uuid,
  actualizada_en timestamptz not null default now(),
  unique (ciclo_id, semana)
);
alter table public.videollamadas enable row level security;
revoke all on public.videollamadas from anon, authenticated;
grant select on public.videollamadas to authenticated;
create policy equipo_leer on public.videollamadas for select to authenticated
  using (privado.gestiona(participante_id));
create policy yo_leer on public.videollamadas for select to authenticated
  using (participante_id = (select privado.mi_participante_id()));
create or replace trigger auditar after insert or update or delete on public.videollamadas
  for each row execute function privado.auditar_cambio();

-- Aviso a la persona cuando se programa o cambia su videollamada.
alter table public.avisos drop constraint avisos_tipo_check;
alter table public.avisos add constraint avisos_tipo_check check (tipo in ('revision_publicada','ajuste_respondido',
  'programa_publicado','registro_enviado','ajuste_pedido','videollamada_programada'));

-- Programar (o cambiar) la videollamada de una semana. Solo ciclos del plan cercano, activos,
-- y semanas del ciclo. Una que ya se hizo o se anotó no se reprograma.
create or replace function public.programar_videollamada(p_ciclo uuid, p_semana integer,
  p_programada_para timestamptz, p_enlace text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare c public.ciclos%rowtype; v public.videollamadas%rowtype; v_id uuid; v_enlace text := btrim(p_enlace);
begin
  select * into c from public.ciclos where id = p_ciclo;
  if c.id is null or not privado.gestiona(c.participante_id) then perform privado.error('sesion','no_autorizado','403'); end if;
  if c.plan_id <> 'cercano' then perform privado.error('plan','sin_videollamada'); end if;
  if c.estado <> 'activo' then perform privado.error('ciclo','no_activo'); end if;
  if p_semana is null or p_semana < 1 or p_semana > c.semanas then perform privado.error('semana','invalida'); end if;
  if p_programada_para is null or p_programada_para < now() then perform privado.error('fecha','invalida'); end if;
  if v_enlace is null or v_enlace !~ '^https://[^[:space:]]+$' or char_length(v_enlace) > 300 then
    perform privado.error('enlace','invalido');
  end if;
  select * into v from public.videollamadas where ciclo_id = p_ciclo and semana = p_semana for update;
  if v.id is not null and v.estado <> 'programada' then perform privado.error('videollamada','ya_registrada','409'); end if;
  insert into public.videollamadas (participante_id, ciclo_id, semana, programada_para, enlace, registrada_por)
  values (c.participante_id, c.id, p_semana, p_programada_para, v_enlace, auth.uid())
  on conflict (ciclo_id, semana) do update
    set programada_para = excluded.programada_para, enlace = excluded.enlace,
        registrada_por = excluded.registrada_por, actualizada_en = now()
  returning id into v_id;
  perform privado.avisar_app(c.participante_id, true, 'videollamada_programada',
    'Tu videollamada de la semana ' || p_semana || ' está agendada', '/mi-espacio/acompanamiento/');
  return v_id;
end $$;

-- Anotar qué pasó: realizada o no asistió (desde la hora agendada), o cancelada (en cualquier momento).
create or replace function public.anotar_videollamada(p_videollamada uuid, p_estado text) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.videollamadas%rowtype;
begin
  select * into v from public.videollamadas where id = p_videollamada for update;
  if v.id is null or not privado.gestiona(v.participante_id) then perform privado.error('sesion','no_autorizado','403'); end if;
  if p_estado not in ('realizada','no_asistio','cancelada') then perform privado.error('estado','invalido'); end if;
  if p_estado <> 'cancelada' and v.programada_para > now() then perform privado.error('fecha','aun_no_ocurre'); end if;
  update public.videollamadas set estado = p_estado, registrada_por = auth.uid(), actualizada_en = now()
   where id = p_videollamada;
end $$;

revoke all on function public.programar_videollamada(uuid, integer, timestamptz, text),
  public.anotar_videollamada(uuid, text) from public, anon, authenticated;
grant execute on function public.programar_videollamada(uuid, integer, timestamptz, text),
  public.anotar_videollamada(uuid, text) to authenticated;

-- Las videollamadas también forman parte de la copia de mis datos.
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
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;
