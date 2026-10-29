-- C13 · Grupos de la comunidad (maqueta de ChatGPT, 22-oct-2026): el explorador de grupos.
--  · Grupo destacado: lo elige moderación (uno a la vez, activo). Sin elección, no hay destacado.
--  · Categoría del grupo (proyecto, orden o bienestar, las mismas áreas de las metas). La pone moderación.
--  · Sugeridos, regla simple y transparente: grupos activos a los que no perteneces cuya categoría
--    coincide con la de alguna de tus metas publicadas. Se calcula en la base: el navegador no lee metas.
--  · Proponer un grupo: las personas proponen nombre y descripción; el equipo las ve en su panel
--    (con el alias, nunca la ficha) y las marca creadas o descartadas. Hasta 3 pendientes por persona.
--    Avisa al equipo sin datos personales.
-- No hay grupos privados: todo grupo activo se puede descubrir y unirse; lo publicado en un grupo
-- sigue siendo solo para sus miembros (C7).

alter table public.grupos_comunidad
  add column destacado boolean not null default false,
  add column categoria text check (categoria in ('proyecto','orden','bienestar'));
create unique index grupos_comunidad_un_destacado on public.grupos_comunidad (destacado) where destacado;

create or replace function public.guardar_grupo_comunidad(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := nullif(p->>'id', '')::uuid; v_nombre text := btrim(p->>'nombre');
        v_desc text := nullif(btrim(p->>'descripcion'), ''); v_ilus text := nullif(p->>'ilustracion', '');
        v_cat text := nullif(p->>'categoria', ''); v_dest boolean := coalesce((p->>'destacado')::boolean, false);
        v_activo boolean;
begin
  if not privado.puede_moderar() then perform privado.error('sesion','no_autorizado','403'); end if;
  if v_nombre is null or char_length(v_nombre) not between 2 and 60 then perform privado.error('nombre','largo'); end if;
  if char_length(v_desc) > 200 then perform privado.error('descripcion','largo'); end if;
  if v_ilus is not null and v_ilus not in ('colinas','brote','atardecer','sendero','lago','montana') then
    perform privado.error('ilustracion','invalida'); end if;
  if v_cat is not null and v_cat not in ('proyecto','orden','bienestar') then perform privado.error('categoria','invalida'); end if;
  if exists (select 1 from public.grupos_comunidad g where lower(btrim(g.nombre)) = lower(v_nombre) and g.id is distinct from v_id) then
    perform privado.error('nombre','en_uso','409'); end if;
  v_activo := coalesce((p->>'activo')::boolean, (select g.activo from public.grupos_comunidad g where g.id = v_id), true);
  if v_dest and not v_activo then perform privado.error('destacado','inactivo'); end if;
  -- Uno destacado a la vez: elegir otro quita el anterior.
  if v_dest then update public.grupos_comunidad set destacado = false where destacado and id is distinct from v_id; end if;
  if v_id is null then
    insert into public.grupos_comunidad (nombre, descripcion, activo, creado_por, ilustracion, categoria, destacado)
    values (v_nombre, v_desc, v_activo, auth.uid(), v_ilus, v_cat, v_dest) returning id into v_id;
  else
    update public.grupos_comunidad set nombre = v_nombre, descripcion = v_desc, ilustracion = v_ilus,
           categoria = v_cat, destacado = v_dest, activo = v_activo where id = v_id;
    if not found then perform privado.error('grupo','no_encontrado','404'); end if;
  end if;
  return v_id;
end $$;

drop function public.comunidad_grupos();
create function public.comunidad_grupos()
returns table (id uuid, nombre text, descripcion text, miembros int, soy_miembro boolean, ilustracion text, publicaciones int,
               activo boolean, destacado boolean, categoria text, creado_en timestamptz, sugerido boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid; v_mod boolean := privado.puede_moderar(); v_cats text[];
begin
  if v_mod then v_yo := privado.mi_participante_id(); else v_yo := privado.en_comunidad(); end if;
  -- Las áreas de las metas publicadas de la persona (para «sugeridos»).
  select coalesce(array_agg(distinct m.categoria), '{}') into v_cats
    from public.metas m join public.programas g on g.id = m.programa_id
   where m.participante_id = v_yo and g.estado <> 'borrador';
  return query
  select g.id, g.nombre, g.descripcion,
         (select count(*)::int from public.miembros_grupo m where m.grupo_id = g.id),
         exists (select 1 from public.miembros_grupo m where m.grupo_id = g.id and m.participante_id = v_yo) as mio,
         g.ilustracion,
         (select count(*)::int from public.publicaciones x where x.grupo_id = g.id and x.respuesta_a is null and x.estado = 'visible'),
         g.activo, g.destacado and g.activo, g.categoria, g.creado_en,
         g.activo and g.categoria = any(v_cats)
           and not exists (select 1 from public.miembros_grupo m where m.grupo_id = g.id and m.participante_id = v_yo)
    from public.grupos_comunidad g
   where g.activo or v_mod
   order by g.nombre;
end $$;

-- Propuestas de grupo
create table public.propuestas_grupo (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 2 and 60),
  descripcion text check (char_length(descripcion) <= 300),
  estado text not null default 'pendiente' check (estado in ('pendiente','creada','descartada')),
  creada_en timestamptz not null default now(),
  respondida_en timestamptz,
  respondida_por uuid
);
create index propuestas_grupo_pendientes on public.propuestas_grupo (creada_en) where estado = 'pendiente';
alter table public.propuestas_grupo enable row level security;
revoke all on public.propuestas_grupo from anon, authenticated;
-- Se escribe solo con las funciones de abajo. La lee moderación (el panel usa propuestas_grupo_equipo, con alias).
grant select on public.propuestas_grupo to authenticated;
create policy moderacion_leer on public.propuestas_grupo for select to authenticated using (privado.puede_moderar());
create or replace trigger auditar after insert or update or delete on public.propuestas_grupo
  for each row execute function privado.auditar_cambio();

create or replace function public.proponer_grupo(p_nombre text, p_descripcion text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.en_comunidad(); v_nombre text := btrim(p_nombre);
        v_desc text := nullif(btrim(p_descripcion), ''); v_id uuid;
begin
  if v_nombre is null or char_length(v_nombre) not between 2 and 60 then perform privado.error('nombre','largo'); end if;
  if char_length(v_desc) > 300 then perform privado.error('descripcion','largo'); end if;
  if exists (select 1 from public.grupos_comunidad g where g.activo and lower(btrim(g.nombre)) = lower(v_nombre)) then
    perform privado.error('nombre','en_uso','409'); end if;
  if (select count(*) from public.propuestas_grupo x where x.participante_id = v_yo and x.estado = 'pendiente') >= 3 then
    perform privado.error('propuestas','demasiadas','429'); end if;
  insert into public.propuestas_grupo (participante_id, nombre, descripcion) values (v_yo, v_nombre, v_desc) returning id into v_id;
  perform privado.avisar('Rumbo: nueva propuesta de grupo', 'Una persona propuso un grupo para la comunidad. Revísalo en el panel, en Comunidad.');
  return v_id;
end $$;

-- Lo que la persona propuso (para ver su estado).
create or replace function public.mis_propuestas_grupo()
returns table (id uuid, nombre text, descripcion text, estado text, creada_en timestamptz)
language sql stable security definer set search_path = '' as $$
  select x.id, x.nombre, x.descripcion, x.estado, x.creada_en from public.propuestas_grupo x
   where x.participante_id = privado.mi_participante_id() order by x.creada_en desc;
$$;

-- Moderación: las propuestas con el alias de quien propone (nunca su ficha, nombre ni correo).
create or replace function public.propuestas_grupo_equipo()
returns table (id uuid, nombre text, descripcion text, alias text, estado text, creada_en timestamptz, respondida_en timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not privado.puede_moderar() then perform privado.error('sesion','no_autorizado','403'); end if;
  return query select x.id, x.nombre, x.descripcion, a.alias::text, x.estado, x.creada_en, x.respondida_en
    from public.propuestas_grupo x left join public.alias a on a.participante_id = x.participante_id
   order by (x.estado = 'pendiente') desc, x.creada_en desc limit 100;
end $$;

create or replace function public.responder_propuesta_grupo(p_id uuid, p_estado text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.puede_moderar() then perform privado.error('sesion','no_autorizado','403'); end if;
  if p_estado not in ('creada','descartada') then perform privado.error('estado','invalido'); end if;
  update public.propuestas_grupo set estado = p_estado, respondida_en = now(), respondida_por = auth.uid()
   where id = p_id and estado = 'pendiente';
  if not found then perform privado.error('propuesta','no_encontrada','404'); end if;
end $$;

revoke all on function public.comunidad_grupos(), public.proponer_grupo(text, text), public.mis_propuestas_grupo(),
  public.propuestas_grupo_equipo(), public.responder_propuesta_grupo(uuid, text) from public, anon, authenticated;
grant execute on function public.comunidad_grupos(), public.proponer_grupo(text, text), public.mis_propuestas_grupo()
  to authenticated;
-- Las de moderación revisan puede_moderar (que exige el segundo factor) dentro de la función.
grant execute on function public.propuestas_grupo_equipo(), public.responder_propuesta_grupo(uuid, text) to authenticated;

-- Las propuestas propias también van en la copia de los datos.
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
    'propuestas_grupo', (select jsonb_agg(to_jsonb(x) - 'participante_id' - 'respondida_por') from public.propuestas_grupo x, yo where x.participante_id = yo.id),
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;

