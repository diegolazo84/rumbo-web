-- C8 · Comunidad con la maqueta de ChatGPT (21-oct-2026): lo que falta para reproducirla con datos reales.
--  · Tipo de publicación: general, progreso, pregunta, consejo o logro («Historias de logro»).
--  · Guardar publicaciones (solo para mí) y filtro «guardadas».
--  · Bloquear a una persona desde su publicación: desde ese momento ninguna de las dos ve lo de la
--    otra (publicaciones y respuestas). La otra persona no recibe aviso. Se deshace por alias.
--    Moderación sigue viendo todo.
--  · Temas populares: etiquetas (#Tema) de lo que la persona puede ver en los últimos 30 días, con
--    su conteo real. Filtro por tema.
--  · Tu impacto: cuántas publicaciones, comentarios y reacciones recibidas tiene la persona.
--  · Ilustración del grupo (de las ilustraciones propias de Rumbo; nunca fotos externas).
--  · Reportar ahora respeta la visibilidad por grupo y bloqueos.
-- No cambia créditos, niveles, rachas ni el tope de 20 publicaciones al día.

alter table public.publicaciones add column tipo text not null default 'general'
  check (tipo in ('general','progreso','pregunta','consejo','logro'));
alter table public.publicaciones add constraint publicaciones_tipo_sin_respuesta
  check (respuesta_a is null or tipo = 'general');
create index publicaciones_tipo on public.publicaciones (tipo, creada_en desc) where respuesta_a is null;

alter table public.grupos_comunidad add column ilustracion text
  check (ilustracion in ('colinas','brote','atardecer','sendero','lago','montana'));

-- ---------------------------------------------------------------------------
-- Guardadas y bloqueos

create table public.guardadas_comunidad (
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  participante_id uuid not null references public.participantes(id) on delete cascade,
  guardada_en timestamptz not null default now(),
  primary key (publicacion_id, participante_id)
);
alter table public.guardadas_comunidad enable row level security;
revoke all on public.guardadas_comunidad from anon, authenticated;
grant select on public.guardadas_comunidad to authenticated;
create policy moderacion_leer on public.guardadas_comunidad for select to authenticated using (privado.puede_moderar());

create table public.bloqueos_comunidad (
  bloqueador uuid not null references public.participantes(id) on delete cascade,
  bloqueado uuid not null references public.participantes(id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (bloqueador, bloqueado),
  check (bloqueador <> bloqueado)
);
alter table public.bloqueos_comunidad enable row level security;
revoke all on public.bloqueos_comunidad from anon, authenticated;
grant select on public.bloqueos_comunidad to authenticated;
create policy moderacion_leer on public.bloqueos_comunidad for select to authenticated using (privado.puede_moderar());

-- ¿Hay un bloqueo entre estas dos personas (en cualquier sentido)?
create or replace function privado.bloqueados_entre(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.bloqueos_comunidad b
                  where (b.bloqueador = p_a and b.bloqueado = p_b) or (b.bloqueador = p_b and b.bloqueado = p_a));
$$;
revoke execute on function privado.bloqueados_entre(uuid, uuid) from public, anon, authenticated;

-- La visibilidad suma los bloqueos (también para la publicación original de un hilo).
create or replace function privado.ve_publicacion(p_id uuid, p_yo uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.publicaciones x
                  where x.id = p_id and x.estado = 'visible'
                    and (privado.puede_moderar() or (
                         (x.grupo_id is null
                          or exists (select 1 from public.miembros_grupo m where m.grupo_id = x.grupo_id and m.participante_id = p_yo))
                         and not privado.bloqueados_entre(x.autor, p_yo))));
$$;

-- ---------------------------------------------------------------------------
-- Funciones

drop function public.publicar_en_comunidad(text, uuid, uuid, text);
create function public.publicar_en_comunidad(p_texto text, p_respuesta_a uuid default null,
  p_grupo uuid default null, p_foto_ruta text default null, p_tipo text default 'general') returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.en_comunidad(); v_id uuid; v_texto text := btrim(p_texto); v_grupo uuid := p_grupo;
        v_tipo text := coalesce(nullif(p_tipo, ''), 'general');
begin
  if v_texto is null or char_length(v_texto) not between 1 and 1000 then perform privado.error('texto','invalido'); end if;
  if v_tipo not in ('general','progreso','pregunta','consejo','logro') then perform privado.error('tipo','invalido'); end if;
  if p_respuesta_a is not null then
    if p_foto_ruta is not null then perform privado.error('foto','solo_publicaciones'); end if;
    if v_tipo <> 'general' then perform privado.error('tipo','solo_publicaciones'); end if;
    if not exists (select 1 from public.publicaciones x where x.id = p_respuesta_a and x.respuesta_a is null)
       or not privado.ve_publicacion(p_respuesta_a, v_yo) then
      perform privado.error('publicacion','no_encontrada','404');
    end if;
    select grupo_id into v_grupo from public.publicaciones where id = p_respuesta_a;
  elsif v_grupo is not null and not exists (
      select 1 from public.miembros_grupo m join public.grupos_comunidad g on g.id = m.grupo_id
       where m.grupo_id = v_grupo and m.participante_id = v_yo and g.activo) then
    perform privado.error('grupo','no_miembro','403');
  end if;
  if p_foto_ruta is not null and (split_part(p_foto_ruta, '/', 1) <> v_yo::text
     or not exists (select 1 from storage.objects s where s.bucket_id = 'comunidad' and s.name = p_foto_ruta)) then
    perform privado.error('foto','ruta_invalida');
  end if;
  if (select count(*) from public.publicaciones x where x.autor = v_yo and x.creada_en > now() - interval '24 hours') >= 20 then
    perform privado.error('comunidad','demasiadas','429');
  end if;
  insert into public.publicaciones (autor, respuesta_a, texto, grupo_id, foto_ruta, tipo)
  values (v_yo, p_respuesta_a, v_texto, v_grupo, p_foto_ruta, v_tipo) returning id into v_id;
  return v_id;
end $$;

create or replace function public.reportar_publicacion(p_id uuid, p_motivo text, p_detalle text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.en_comunidad();
begin
  if p_motivo not in ('respeto','privacidad','salud','spam','otro') then perform privado.error('motivo','invalido'); end if;
  if not exists (select 1 from public.publicaciones x where x.id = p_id and x.autor <> v_yo)
     or not privado.ve_publicacion(p_id, v_yo) then
    perform privado.error('publicacion','no_encontrada','404');
  end if;
  insert into public.reportes_comunidad (publicacion_id, reportante, motivo, detalle)
  values (p_id, v_yo, p_motivo, nullif(left(btrim(p_detalle), 300), ''))
  on conflict (publicacion_id, reportante) do nothing;
  if found then
    insert into public.avisos (destinatario, tipo, titulo, enlace)
    select e.user_id, 'reporte_comunidad', 'Nuevo reporte en la comunidad', '/equipo/comunidad/'
      from public.equipo e where e.activo and (e.rol = 'dueno' or e.puede_moderar);
  end if;
end $$;

-- Guardar o quitar de guardadas. Devuelve si quedó guardada.
create or replace function public.guardar_publicacion(p_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.en_comunidad();
begin
  delete from public.guardadas_comunidad where publicacion_id = p_id and participante_id = v_yo;
  if found then return false; end if;
  if not exists (select 1 from public.publicaciones x where x.id = p_id and x.respuesta_a is null)
     or not privado.ve_publicacion(p_id, v_yo) then
    perform privado.error('publicacion','no_encontrada','404');
  end if;
  insert into public.guardadas_comunidad (publicacion_id, participante_id) values (p_id, v_yo);
  return true;
end $$;

-- Bloquear a quien escribió una publicación (sin saber quién es: solo su alias).
create or replace function public.bloquear_autor(p_publicacion uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.en_comunidad(); v_autor uuid;
begin
  select x.autor into v_autor from public.publicaciones x where x.id = p_publicacion;
  if v_autor is null or not privado.ve_publicacion(p_publicacion, v_yo) then
    perform privado.error('publicacion','no_encontrada','404'); end if;
  if v_autor = v_yo then perform privado.error('bloqueo','a_mi_mismo'); end if;
  insert into public.bloqueos_comunidad (bloqueador, bloqueado) values (v_yo, v_autor) on conflict do nothing;
end $$;

create or replace function public.desbloquear_alias(p_alias text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id();
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  delete from public.bloqueos_comunidad b using public.alias a
   where b.bloqueador = v_yo and a.participante_id = b.bloqueado and lower(a.alias::text) = lower(btrim(p_alias));
  if not found then perform privado.error('bloqueo','no_encontrado','404'); end if;
end $$;

create or replace function public.mis_bloqueos() returns table (alias_publico text, desde timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.alias::text, b.creado_en from public.bloqueos_comunidad b join public.alias a on a.participante_id = b.bloqueado
   where b.bloqueador = privado.mi_participante_id() order by b.creado_en desc;
$$;

drop function public.comunidad_grupos();
create function public.comunidad_grupos()
returns table (id uuid, nombre text, descripcion text, miembros int, soy_miembro boolean, ilustracion text, publicaciones int, activo boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid; v_mod boolean := privado.puede_moderar();
begin
  if v_mod then v_yo := privado.mi_participante_id(); else v_yo := privado.en_comunidad(); end if;
  return query
  select g.id, g.nombre, g.descripcion,
         (select count(*)::int from public.miembros_grupo m where m.grupo_id = g.id),
         exists (select 1 from public.miembros_grupo m where m.grupo_id = g.id and m.participante_id = v_yo),
         g.ilustracion,
         (select count(*)::int from public.publicaciones x where x.grupo_id = g.id and x.respuesta_a is null and x.estado = 'visible'),
         g.activo
    from public.grupos_comunidad g
   where g.activo or v_mod
   order by g.nombre;
end $$;

create or replace function public.guardar_grupo_comunidad(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := nullif(p->>'id', '')::uuid; v_nombre text := btrim(p->>'nombre');
        v_desc text := nullif(btrim(p->>'descripcion'), ''); v_ilus text := nullif(p->>'ilustracion', '');
begin
  if not privado.puede_moderar() then perform privado.error('sesion','no_autorizado','403'); end if;
  if v_nombre is null or char_length(v_nombre) not between 2 and 60 then perform privado.error('nombre','largo'); end if;
  if char_length(v_desc) > 200 then perform privado.error('descripcion','largo'); end if;
  if v_ilus is not null and v_ilus not in ('colinas','brote','atardecer','sendero','lago','montana') then
    perform privado.error('ilustracion','invalida'); end if;
  if exists (select 1 from public.grupos_comunidad g where lower(btrim(g.nombre)) = lower(v_nombre) and g.id is distinct from v_id) then
    perform privado.error('nombre','en_uso','409'); end if;
  if v_id is null then
    insert into public.grupos_comunidad (nombre, descripcion, activo, creado_por, ilustracion)
    values (v_nombre, v_desc, coalesce((p->>'activo')::boolean, true), auth.uid(), v_ilus) returning id into v_id;
  else
    update public.grupos_comunidad set nombre = v_nombre, descripcion = v_desc, ilustracion = v_ilus,
           activo = coalesce((p->>'activo')::boolean, activo) where id = v_id;
    if not found then perform privado.error('grupo','no_encontrado','404'); end if;
  end if;
  return v_id;
end $$;

drop function public.comunidad_publicaciones(uuid, timestamptz, integer, uuid, boolean);
create function public.comunidad_publicaciones(p_hilo uuid default null, p_antes timestamptz default null,
  p_limite integer default 30, p_grupo uuid default null, p_solo_mis_grupos boolean default false,
  p_tipo text default null, p_solo_guardadas boolean default false, p_tema text default null)
returns table (id uuid, respuesta_a uuid, alias_publico text, texto text, creada_en timestamptz, mia boolean, respuestas int,
               grupo_id uuid, grupo_titulo text, foto_ruta text, reacciones int, mi_reaccion boolean, tipo text, guardada boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid; v_mod boolean := privado.puede_moderar(); v_tema text := lower(nullif(btrim(p_tema, ' #'), ''));
begin
  if v_mod then v_yo := privado.mi_participante_id(); else v_yo := privado.en_comunidad(); end if;
  return query
  select x.id, x.respuesta_a, a.alias::text, x.texto, x.creada_en, x.autor is not distinct from v_yo,
         (select count(*)::int from public.publicaciones r where r.respuesta_a = x.id and r.estado = 'visible'
            and (v_mod or not privado.bloqueados_entre(r.autor, v_yo))),
         x.grupo_id, g.nombre, x.foto_ruta,
         (select count(*)::int from public.reacciones_comunidad c where c.publicacion_id = x.id),
         exists (select 1 from public.reacciones_comunidad c where c.publicacion_id = x.id and c.participante_id = v_yo),
         x.tipo,
         exists (select 1 from public.guardadas_comunidad s where s.publicacion_id = x.id and s.participante_id = v_yo)
    from public.publicaciones x
    join public.alias a on a.participante_id = x.autor
    left join public.grupos_comunidad g on g.id = x.grupo_id
   where x.estado = 'visible'
     and (x.grupo_id is null or v_mod or exists (select 1 from public.miembros_grupo m where m.grupo_id = x.grupo_id and m.participante_id = v_yo))
     and (v_mod or not privado.bloqueados_entre(x.autor, v_yo))
     and (case when p_hilo is null then x.respuesta_a is null else x.id = p_hilo or x.respuesta_a = p_hilo end)
     and (p_grupo is null or x.grupo_id = p_grupo)
     and (not coalesce(p_solo_mis_grupos, false) or x.grupo_id is not null)
     and (p_tipo is null or x.tipo = p_tipo)
     and (not coalesce(p_solo_guardadas, false)
          or exists (select 1 from public.guardadas_comunidad s where s.publicacion_id = x.id and s.participante_id = v_yo))
     and (v_tema is null or lower(x.texto) ~ ('#' || regexp_replace(v_tema, '([^[:alnum:]])', '\\\1', 'g') || '($|[^[:alnum:]_])'))
     and (p_antes is null or x.creada_en < p_antes)
   order by case when p_hilo is null then x.creada_en end desc, x.creada_en
   limit least(greatest(coalesce(p_limite, 30), 1), 100);
end $$;

-- Temas populares: etiquetas de lo que la persona puede ver (últimos 30 días), con su conteo real.
create or replace function public.comunidad_temas(p_limite integer default 5)
returns table (tema text, publicaciones int)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid; v_mod boolean := privado.puede_moderar();
begin
  if v_mod then v_yo := privado.mi_participante_id(); else v_yo := privado.en_comunidad(); end if;
  return query
  with visibles as (
    select x.id, x.texto from public.publicaciones x
     where x.estado = 'visible' and x.respuesta_a is null and x.creada_en > now() - interval '30 days'
       and (x.grupo_id is null or v_mod or exists (select 1 from public.miembros_grupo m where m.grupo_id = x.grupo_id and m.participante_id = v_yo))
       and (v_mod or not privado.bloqueados_entre(x.autor, v_yo))
  ), etiquetas as (
    select distinct v.id, lower(t[1]) tema, t[1] original
      from visibles v, regexp_matches(v.texto, '#([[:alnum:]_]{2,30})', 'g') t
  )
  select min(e.original), count(distinct e.id)::int from etiquetas e
   group by e.tema order by 2 desc, 1 limit least(greatest(coalesce(p_limite, 5), 1), 20);
end $$;

-- Tu impacto en la comunidad: solo números propios.
create or replace function public.mi_impacto_comunidad()
returns table (publicaciones int, comentarios int, reacciones_recibidas int)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := privado.en_comunidad();
begin
  return query select
    (select count(*)::int from public.publicaciones x where x.autor = v_yo and x.respuesta_a is null and x.estado = 'visible'),
    (select count(*)::int from public.publicaciones x where x.autor = v_yo and x.respuesta_a is not null and x.estado = 'visible'),
    (select count(*)::int from public.reacciones_comunidad c join public.publicaciones x on x.id = c.publicacion_id
      where x.autor = v_yo and x.estado = 'visible');
end $$;

revoke all on function public.publicar_en_comunidad(text, uuid, uuid, text, text), public.guardar_publicacion(uuid),
  public.bloquear_autor(uuid), public.desbloquear_alias(text), public.mis_bloqueos(), public.comunidad_grupos(),
  public.comunidad_publicaciones(uuid, timestamptz, integer, uuid, boolean, text, boolean, text),
  public.comunidad_temas(integer), public.mi_impacto_comunidad()
  from public, anon, authenticated;
grant execute on function public.publicar_en_comunidad(text, uuid, uuid, text, text), public.guardar_publicacion(uuid),
  public.bloquear_autor(uuid), public.desbloquear_alias(text), public.mis_bloqueos(), public.comunidad_grupos(),
  public.comunidad_publicaciones(uuid, timestamptz, integer, uuid, boolean, text, boolean, text),
  public.comunidad_temas(integer), public.mi_impacto_comunidad()
  to authenticated;

-- Guardadas y bloqueos propios también van en la copia de los datos.
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
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;
