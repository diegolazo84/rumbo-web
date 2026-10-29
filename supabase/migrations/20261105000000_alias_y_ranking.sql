-- C5 · Alias y ranking semanal voluntario (función 7 del inventario; el alias también lo usará la
-- comunidad). Lo aprobado: voluntario, semanal, por cumplimiento relativo y solo con alias.
--  · Cada persona elige un alias propio y decide si entra al ranking (puede salir cuando quiera).
--  · El ranking de una semana compara el % de acciones hechas sobre las programadas de esa semana.
--    Solo entra quien tuvo acciones esa semana. Empates comparten el puesto.
--  · Lo ven quienes participan en él y el equipo con TOTP. No muestra nombres ni cifras de acciones.
--  · Resguardo de privacidad: con menos de 3 participantes no se muestra (con 2 se sabría quién es quién).
-- Para las personas solo funciona con el módulo «ranking» habilitado (lo decide el dueño, A4).
-- Antes de habilitarlo, la política de privacidad debe describirlo (hoy dice que aún no existe).

create table public.alias (
  participante_id uuid primary key references public.participantes(id) on delete cascade,
  alias extensions.citext not null unique check (char_length(alias) between 3 and 24
                                                 and alias ~ '^[[:alnum:]áéíóúüñÁÉÍÓÚÜÑ][[:alnum:]áéíóúüñÁÉÍÓÚÜÑ _.-]*$'),
  en_ranking boolean not null default false,
  ranking_aceptado_en timestamptz,
  actualizado_en timestamptz not null default now(),
  check (not en_ranking or ranking_aceptado_en is not null)
);
alter table public.alias enable row level security;
revoke all on public.alias from anon, authenticated;
grant select on public.alias to authenticated;
create policy equipo_leer on public.alias for select to authenticated using (privado.gestiona(participante_id));
create policy yo_leer on public.alias for select to authenticated
  using (participante_id = (select privado.mi_participante_id()));
create or replace trigger auditar after insert or update or delete on public.alias
  for each row execute function privado.auditar_cambio();

create or replace function public.guardar_alias(p_alias text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id(); v_alias text := btrim(p_alias);
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  if v_alias is null or char_length(v_alias) not between 3 and 24
     or v_alias !~ '^[[:alnum:]áéíóúüñÁÉÍÓÚÜÑ][[:alnum:]áéíóúüñÁÉÍÓÚÜÑ _.-]*$' then
    perform privado.error('alias','invalido');
  end if;
  if exists (select 1 from public.alias a where lower(a.alias::text) = lower(v_alias) and a.participante_id <> v_yo) then
    perform privado.error('alias','en_uso','409');
  end if;
  insert into public.alias (participante_id, alias) values (v_yo, v_alias)
  on conflict (participante_id) do update set alias = excluded.alias, actualizado_en = now();
end $$;

-- Entrar (true) o salir (false) del ranking. Entrar exige tener alias.
create or replace function public.participar_en_ranking(p_participar boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id();
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  if p_participar is null then perform privado.error('ranking','invalido'); end if;
  if p_participar and not public.modulo_visible('ranking') then perform privado.error('ranking','no_disponible','409'); end if;
  update public.alias set en_ranking = p_participar,
         ranking_aceptado_en = case when p_participar then now() else ranking_aceptado_en end,
         actualizado_en = now()
   where participante_id = v_yo;
  if not found then perform privado.error('alias','sin_alias','409'); end if;
end $$;

-- Ranking de la semana que empieza el lunes p_lunes (por defecto, la última semana completa).
create or replace function public.ranking_semanal(p_lunes date default null)
returns table (puesto int, alias_publico text, cumplimiento int, soy_yo boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_yo uuid := privado.mi_participante_id();
  v_lunes date := coalesce(p_lunes, date_trunc('week', privado.hoy_chile())::date - 7);
  v_equipo boolean := privado.es_dueno() or privado.es_coach();
begin
  if extract(isodow from v_lunes) <> 1 then perform privado.error('semana','invalida'); end if;
  if not v_equipo and not public.modulo_visible('ranking') then perform privado.error('ranking','no_disponible','409'); end if;
  if not v_equipo and not exists (select 1 from public.alias a where a.participante_id = v_yo and a.en_ranking) then
    perform privado.error('ranking','no_participa','403');
  end if;
  return query
  with semana as (
    select a.participante_id, a.alias::text alias, sum(d.hechas) hechas, sum(d.programadas) programadas
      from public.alias a
      join public.participantes p on p.id = a.participante_id and p.estado = 'activo'
      join public.progreso_diario d on d.participante_id = a.participante_id and d.fecha between v_lunes and v_lunes + 6
     where a.en_ranking
     group by a.participante_id, a.alias
    having sum(d.programadas) > 0
  ), puntaje as (
    select s.*, round(100.0 * least(s.hechas, s.programadas) / s.programadas)::int pct from semana s
  )
  select (rank() over (order by x.pct desc))::int, x.alias, x.pct, x.participante_id is not distinct from v_yo
    from puntaje x
   where (select count(*) from puntaje) >= 3
   order by 1, 2;
end $$;

revoke all on function public.guardar_alias(text), public.participar_en_ranking(boolean), public.ranking_semanal(date)
  from public, anon, authenticated;
grant execute on function public.guardar_alias(text), public.participar_en_ranking(boolean), public.ranking_semanal(date)
  to authenticated;

-- El alias y la participación en el ranking también forman parte de la copia de mis datos.
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
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;
