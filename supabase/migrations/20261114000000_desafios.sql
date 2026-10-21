-- C9 · Desafíos de la comunidad (maqueta de ChatGPT, 21-oct-2026: «Desafío del mes»).
-- Moderación (dueño o coach con permiso) crea cada desafío: objetivo, reglas, duración en días y
-- fecha de inicio. Participar es voluntario (unirse y salir cuando se quiera).
-- El avance es verificable: un día cuenta como cumplido solo si ese día la persona tenía acciones
-- programadas y las completó todas (progreso_diario, el mismo cálculo de Mi Rumbo, sin días en
-- suspenso). Nadie marca días a mano. Se completa el desafío al llegar a la cantidad de días.
-- No da créditos, no cambia niveles, rachas ni multiplicadores: es solo reconocimiento.
-- Se muestra cuántas personas participan (conteo real), nunca quiénes.

create table public.desafios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(btrim(titulo)) between 3 and 80),
  descripcion text check (char_length(descripcion) <= 300),
  reglas text not null check (char_length(btrim(reglas)) between 10 and 1000),
  dias smallint not null check (dias between 7 and 60),
  inicio date not null,
  ilustracion text check (ilustracion in ('colinas','brote','atardecer','sendero','lago','montana')),
  activo boolean not null default true,
  creado_por uuid,
  creado_en timestamptz not null default now()
);
alter table public.desafios enable row level security;
revoke all on public.desafios from anon, authenticated;
grant select on public.desafios to authenticated;
create policy moderacion_leer on public.desafios for select to authenticated using (privado.puede_moderar());
create or replace trigger auditar after insert or update or delete on public.desafios
  for each row execute function privado.auditar_cambio();

create table public.participaciones_desafio (
  desafio_id uuid not null references public.desafios(id) on delete cascade,
  participante_id uuid not null references public.participantes(id) on delete cascade,
  unido_en timestamptz not null default now(),
  primary key (desafio_id, participante_id)
);
alter table public.participaciones_desafio enable row level security;
revoke all on public.participaciones_desafio from anon, authenticated;
grant select on public.participaciones_desafio to authenticated;
create policy moderacion_leer on public.participaciones_desafio for select to authenticated using (privado.puede_moderar());

-- Días cumplidos de una persona dentro de un desafío (hasta hoy).
create or replace function privado.dias_cumplidos_desafio(p_desafio uuid, p_yo uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.progreso_diario d join public.desafios x on x.id = p_desafio
   where d.participante_id = p_yo and not d.en_suspenso and d.programadas > 0 and d.hechas >= d.programadas
     and d.fecha between x.inicio and least(x.inicio + x.dias - 1, privado.hoy_chile());
$$;
revoke execute on function privado.dias_cumplidos_desafio(uuid, uuid) from public, anon, authenticated;

create or replace function public.guardar_desafio(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := nullif(p->>'id', '')::uuid; v_titulo text := btrim(p->>'titulo');
        v_desc text := nullif(btrim(p->>'descripcion'), ''); v_reglas text := btrim(p->>'reglas');
        v_dias int := (p->>'dias')::int; v_inicio date := (p->>'inicio')::date; v_ilus text := nullif(p->>'ilustracion', '');
begin
  if not privado.puede_moderar() then perform privado.error('sesion','no_autorizado','403'); end if;
  if v_titulo is null or char_length(v_titulo) not between 3 and 80 then perform privado.error('titulo','largo'); end if;
  if char_length(v_desc) > 300 then perform privado.error('descripcion','largo'); end if;
  if v_reglas is null or char_length(v_reglas) not between 10 and 1000 then perform privado.error('reglas','largo'); end if;
  if v_dias is null or v_dias not between 7 and 60 then perform privado.error('dias','invalido'); end if;
  if v_inicio is null then perform privado.error('inicio','invalido'); end if;
  if v_ilus is not null and v_ilus not in ('colinas','brote','atardecer','sendero','lago','montana') then
    perform privado.error('ilustracion','invalida'); end if;
  if v_id is null then
    if v_inicio < privado.hoy_chile() then perform privado.error('inicio','pasado'); end if;
    insert into public.desafios (titulo, descripcion, reglas, dias, inicio, ilustracion, activo, creado_por)
    values (v_titulo, v_desc, v_reglas, v_dias, v_inicio, v_ilus, coalesce((p->>'activo')::boolean, true), auth.uid())
    returning id into v_id;
  else
    -- Con personas participando, las reglas que miden el avance (días e inicio) ya no cambian.
    if exists (select 1 from public.participaciones_desafio x where x.desafio_id = v_id)
       and exists (select 1 from public.desafios d where d.id = v_id and (d.dias <> v_dias or d.inicio <> v_inicio)) then
      perform privado.error('desafio','con_participantes','409');
    end if;
    update public.desafios set titulo = v_titulo, descripcion = v_desc, reglas = v_reglas, dias = v_dias, inicio = v_inicio,
           ilustracion = v_ilus, activo = coalesce((p->>'activo')::boolean, activo) where id = v_id;
    if not found then perform privado.error('desafio','no_encontrado','404'); end if;
  end if;
  return v_id;
end $$;

create or replace function public.unirme_a_desafio(p_desafio uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.en_comunidad();
begin
  if not exists (select 1 from public.desafios d where d.id = p_desafio and d.activo
                  and privado.hoy_chile() <= d.inicio + d.dias - 1) then
    perform privado.error('desafio','no_disponible','404'); end if;
  insert into public.participaciones_desafio (desafio_id, participante_id) values (p_desafio, v_yo) on conflict do nothing;
end $$;

create or replace function public.salir_de_desafio(p_desafio uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id();
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  delete from public.participaciones_desafio where desafio_id = p_desafio and participante_id = v_yo;
end $$;

-- Desafíos que ve una persona: activos (y los inactivos para moderación), con el conteo real de
-- participantes y, si participa, su avance verificable.
create or replace function public.comunidad_desafios()
returns table (id uuid, titulo text, descripcion text, reglas text, dias int, inicio date, fin date, ilustracion text,
               activo boolean, participantes int, participo boolean, dias_cumplidos int, dias_transcurridos int, completado boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid; v_mod boolean := privado.puede_moderar(); v_hoy date := privado.hoy_chile();
begin
  if v_mod then v_yo := privado.mi_participante_id(); else v_yo := privado.en_comunidad(); end if;
  return query
  select d.id, d.titulo, d.descripcion, d.reglas, d.dias::int, d.inicio, (d.inicio + d.dias - 1), d.ilustracion, d.activo,
         (select count(*)::int from public.participaciones_desafio x where x.desafio_id = d.id),
         p.participante_id is not null,
         case when p.participante_id is not null then privado.dias_cumplidos_desafio(d.id, v_yo) else 0 end,
         greatest(0, least(d.dias, v_hoy - d.inicio + 1))::int,
         p.participante_id is not null and privado.dias_cumplidos_desafio(d.id, v_yo) >= d.dias
    from public.desafios d
    left join public.participaciones_desafio p on p.desafio_id = d.id and p.participante_id = v_yo
   where d.activo or v_mod
   order by (v_hoy > d.inicio + d.dias - 1), d.inicio;
end $$;

-- El detalle de mi avance: cada día del desafío hasta hoy, cumplido o no.
create or replace function public.mi_avance_desafio(p_desafio uuid) returns table (fecha date, cumplido boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := privado.en_comunidad(); d public.desafios%rowtype;
begin
  select * into d from public.desafios x where x.id = p_desafio and x.activo;
  if d.id is null or not exists (select 1 from public.participaciones_desafio x where x.desafio_id = p_desafio and x.participante_id = v_yo) then
    perform privado.error('desafio','no_participa','404'); end if;
  return query
  select g::date, coalesce((select not p.en_suspenso and p.programadas > 0 and p.hechas >= p.programadas
                              from public.progreso_diario p where p.participante_id = v_yo and p.fecha = g::date), false)
    from generate_series(d.inicio, least(d.inicio + d.dias - 1, privado.hoy_chile()), interval '1 day') g
   order by 1;
end $$;

revoke all on function public.guardar_desafio(jsonb), public.unirme_a_desafio(uuid), public.salir_de_desafio(uuid),
  public.comunidad_desafios(), public.mi_avance_desafio(uuid) from public, anon, authenticated;
grant execute on function public.guardar_desafio(jsonb), public.unirme_a_desafio(uuid), public.salir_de_desafio(uuid),
  public.comunidad_desafios(), public.mi_avance_desafio(uuid) to authenticated;

-- Los desafíos en los que participo también van en la copia de mis datos.
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
    'comunidad_reacciones', (select jsonb_agg(to_jsonb(x)) from public.reacciones_comunidad x, yo where x.participante_id = yo.id),
    'comunidad_grupos', (select jsonb_agg(jsonb_build_object('grupo', g.nombre, 'unido_en', m.unido_en))
                          from public.miembros_grupo m join public.grupos_comunidad g on g.id = m.grupo_id, yo where m.participante_id = yo.id),
    'comunidad_guardadas', (select jsonb_agg(to_jsonb(x)) from public.guardadas_comunidad x, yo where x.participante_id = yo.id),
    'comunidad_bloqueos', (select jsonb_agg(jsonb_build_object('alias', a.alias, 'desde', b.creado_en))
                            from public.bloqueos_comunidad b join public.alias a on a.participante_id = b.bloqueado, yo where b.bloqueador = yo.id),
    'desafios', (select jsonb_agg(jsonb_build_object('desafio', d.titulo, 'unido_en', x.unido_en))
                  from public.participaciones_desafio x join public.desafios d on d.id = x.desafio_id, yo where x.participante_id = yo.id),
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;
