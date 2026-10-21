-- C6 · Comunidad con foro moderado (función 16 del inventario).
-- Lo aprobado: la comunidad abre solo con participantes y moderación suficientes. Por eso, para las
-- personas solo funciona con el módulo «comunidad» habilitado (lo decide el dueño, A4); el equipo
-- con permiso de moderar puede usarla antes para prepararla.
--  · Para participar: alias (C5) y aceptar las reglas. Se publica con el alias, nunca con el nombre.
--  · Publicaciones de hasta 1000 caracteres y respuestas de un nivel. Cada persona borra las suyas.
--  · Cualquiera reporta una publicación (una vez); moderación (dueño o coach con permiso) oculta o
--    deja visible, con motivo. Ocultar no borra: queda para revisión y auditoría.
--  · Freno contra abuso: hasta 20 publicaciones por persona al día.
-- Nadie lee las tablas directo salvo moderación: las personas usan comunidad_publicaciones(), que
-- no muestra quién es quién. Antes de habilitarla, la política de privacidad debe describirla.

alter table public.alias add column reglas_comunidad_en timestamptz;

-- Cada reporte nuevo avisa a quienes moderan (dueños y coaches con permiso, activos).
alter table public.avisos drop constraint avisos_tipo_check;
alter table public.avisos add constraint avisos_tipo_check check (tipo in ('revision_publicada','ajuste_respondido',
  'programa_publicado','registro_enviado','ajuste_pedido','videollamada_programada',
  'recordatorio_acciones','recordatorio_registro','reporte_comunidad'));

create table public.publicaciones (
  id uuid primary key default gen_random_uuid(),
  autor uuid not null references public.participantes(id) on delete cascade,
  respuesta_a uuid references public.publicaciones(id) on delete cascade,
  texto text not null check (char_length(btrim(texto)) between 1 and 1000),
  estado text not null default 'visible' check (estado in ('visible','oculta','borrada')),
  moderacion_motivo text check (moderacion_motivo in ('respeto','privacidad','salud','spam','otro')),
  moderada_por uuid,
  moderada_en timestamptz,
  creada_en timestamptz not null default now(),
  check (estado <> 'oculta' or moderacion_motivo is not null)
);
create index publicaciones_recientes on public.publicaciones (creada_en desc) where respuesta_a is null;
create index publicaciones_hilo on public.publicaciones (respuesta_a, creada_en);
alter table public.publicaciones enable row level security;
revoke all on public.publicaciones from anon, authenticated;
grant select on public.publicaciones to authenticated;
create policy moderacion_leer on public.publicaciones for select to authenticated using (privado.puede_moderar());
create or replace trigger auditar after insert or update or delete on public.publicaciones
  for each row execute function privado.auditar_cambio();

create table public.reportes_comunidad (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  reportante uuid not null references public.participantes(id) on delete cascade,
  motivo text not null check (motivo in ('respeto','privacidad','salud','spam','otro')),
  detalle text check (char_length(detalle) <= 300),
  creado_en timestamptz not null default now(),
  resuelto_en timestamptz,
  resolucion text check (resolucion in ('ocultada','sin_cambios')),
  unique (publicacion_id, reportante),
  check ((resuelto_en is null) = (resolucion is null))
);
alter table public.reportes_comunidad enable row level security;
revoke all on public.reportes_comunidad from anon, authenticated;
grant select on public.reportes_comunidad to authenticated;
create policy moderacion_leer on public.reportes_comunidad for select to authenticated using (privado.puede_moderar());
create or replace trigger auditar after insert or update or delete on public.reportes_comunidad
  for each row execute function privado.auditar_cambio();

-- ¿Puede quien llama participar? Devuelve su ficha o corta con el motivo.
create or replace function privado.en_comunidad() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id(); a public.alias%rowtype;
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  if not public.modulo_visible('comunidad') then perform privado.error('comunidad','no_disponible','409'); end if;
  if not exists (select 1 from public.participantes p where p.id = v_yo and p.estado = 'activo') then
    perform privado.error('sesion','no_activo','403'); end if;
  select * into a from public.alias where participante_id = v_yo;
  if a.participante_id is null then perform privado.error('alias','sin_alias','409'); end if;
  if a.reglas_comunidad_en is null then perform privado.error('comunidad','sin_reglas','409'); end if;
  return v_yo;
end $$;
revoke execute on function privado.en_comunidad() from public, anon, authenticated;

create or replace function public.aceptar_reglas_comunidad() returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id();
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  if not public.modulo_visible('comunidad') then perform privado.error('comunidad','no_disponible','409'); end if;
  update public.alias set reglas_comunidad_en = coalesce(reglas_comunidad_en, now()), actualizado_en = now()
   where participante_id = v_yo;
  if not found then perform privado.error('alias','sin_alias','409'); end if;
end $$;

create or replace function public.publicar_en_comunidad(p_texto text, p_respuesta_a uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.en_comunidad(); v_id uuid; v_texto text := btrim(p_texto);
begin
  if v_texto is null or char_length(v_texto) not between 1 and 1000 then perform privado.error('texto','invalido'); end if;
  if p_respuesta_a is not null and not exists (select 1 from public.publicaciones x where x.id = p_respuesta_a
                                                 and x.respuesta_a is null and x.estado = 'visible') then
    perform privado.error('publicacion','no_encontrada','404');
  end if;
  if (select count(*) from public.publicaciones x where x.autor = v_yo and x.creada_en > now() - interval '24 hours') >= 20 then
    perform privado.error('comunidad','demasiadas','429');
  end if;
  insert into public.publicaciones (autor, respuesta_a, texto) values (v_yo, p_respuesta_a, v_texto) returning id into v_id;
  return v_id;
end $$;

create or replace function public.borrar_mi_publicacion(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id();
begin
  update public.publicaciones set estado = 'borrada' where id = p_id and autor = v_yo and estado <> 'borrada';
  if not found then perform privado.error('publicacion','no_encontrada','404'); end if;
end $$;

create or replace function public.reportar_publicacion(p_id uuid, p_motivo text, p_detalle text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.en_comunidad();
begin
  if p_motivo not in ('respeto','privacidad','salud','spam','otro') then perform privado.error('motivo','invalido'); end if;
  if not exists (select 1 from public.publicaciones x where x.id = p_id and x.estado = 'visible' and x.autor <> v_yo) then
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

-- Moderación: ocultar (con motivo) o dejar visible. Resuelve los reportes abiertos de esa publicación.
create or replace function public.moderar_publicacion(p_id uuid, p_ocultar boolean, p_motivo text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.puede_moderar() then perform privado.error('sesion','no_autorizado','403'); end if;
  if p_ocultar is null or (p_ocultar and (p_motivo is null or p_motivo not in ('respeto','privacidad','salud','spam','otro'))) then
    perform privado.error('motivo','invalido');
  end if;
  update public.publicaciones set
         estado = case when p_ocultar then 'oculta' else 'visible' end,
         moderacion_motivo = case when p_ocultar then p_motivo end,
         moderada_por = auth.uid(), moderada_en = now()
   where id = p_id and estado <> 'borrada';
  if not found then perform privado.error('publicacion','no_encontrada','404'); end if;
  update public.reportes_comunidad set resuelto_en = now(),
         resolucion = case when p_ocultar then 'ocultada' else 'sin_cambios' end
   where publicacion_id = p_id and resuelto_en is null;
end $$;

-- Lo que ve una persona: publicaciones visibles (o un hilo), con alias y sin datos de quién es quién.
create or replace function public.comunidad_publicaciones(p_hilo uuid default null, p_antes timestamptz default null,
  p_limite integer default 30)
returns table (id uuid, respuesta_a uuid, alias_publico text, texto text, creada_en timestamptz, mia boolean, respuestas int)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid;
begin
  if privado.puede_moderar() then v_yo := privado.mi_participante_id(); else v_yo := privado.en_comunidad(); end if;
  return query
  select x.id, x.respuesta_a, a.alias::text, x.texto, x.creada_en, x.autor is not distinct from v_yo,
         (select count(*)::int from public.publicaciones r where r.respuesta_a = x.id and r.estado = 'visible')
    from public.publicaciones x
    join public.alias a on a.participante_id = x.autor
   where x.estado = 'visible'
     and (case when p_hilo is null then x.respuesta_a is null else x.id = p_hilo or x.respuesta_a = p_hilo end)
     and (p_antes is null or x.creada_en < p_antes)
   order by case when p_hilo is null then x.creada_en end desc, x.creada_en
   limit least(greatest(coalesce(p_limite, 30), 1), 100);
end $$;

revoke all on function public.aceptar_reglas_comunidad(), public.publicar_en_comunidad(text, uuid),
  public.borrar_mi_publicacion(uuid), public.reportar_publicacion(uuid, text, text),
  public.moderar_publicacion(uuid, boolean, text), public.comunidad_publicaciones(uuid, timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.aceptar_reglas_comunidad(), public.publicar_en_comunidad(text, uuid),
  public.borrar_mi_publicacion(uuid), public.reportar_publicacion(uuid, text, text),
  public.moderar_publicacion(uuid, boolean, text), public.comunidad_publicaciones(uuid, timestamptz, integer)
  to authenticated;

-- Lo publicado y reportado por la persona también forma parte de la copia de sus datos.
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
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;
