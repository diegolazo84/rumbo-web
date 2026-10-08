-- Generado desde especificacion-plataforma.md §6. Pegar en el editor SQL de Supabase en orden.

-- 1. Todo cerrado
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- 2. Catálogos: lectura pública
grant select on public.areas, public.planes, public.niveles, public.reglas_creditos, public.feriados to anon, authenticated;
create policy catalogo_leer on public.areas           for select to anon, authenticated using (true);
create policy catalogo_leer on public.planes          for select to anon, authenticated using (true);
create policy catalogo_leer on public.niveles         for select to anon, authenticated using (true);
create policy catalogo_leer on public.reglas_creditos for select to anon, authenticated using (true);
create policy catalogo_leer on public.feriados        for select to anon, authenticated using (true);

-- 3. Admin: escritura directa solo en tablas de gestión
grant select on all tables in schema public to authenticated;
do $$ declare t text; begin
  foreach t in array array['areas','planes','niveles','reglas_creditos','feriados','ajustes_operacion',
    'solicitudes','solicitudes_eventos','mensajes_contacto','peticiones_derechos',
    'participantes','ciclos','programas','metas','acciones','revisiones','solicitudes_ajuste'] loop
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('create policy admin_todo on public.%I for all to authenticated
                    using (privado.es_admin()) with check (privado.es_admin())', t);
  end loop;
  -- Solo lectura para el admin (las escriben funciones)
  foreach t in array array['equipo','auditoria','ocurrencias','registros','progreso','progreso_diario','registros_semanales'] loop
    execute format('create policy admin_leer on public.%I for select to authenticated using (privado.es_admin())', t);
  end loop;
end $$;

-- 4. La persona: lee lo suyo
create policy yo_leer on public.participantes for select to authenticated
  using (id = (select privado.mi_participante_id()));
do $$ declare t text; begin
  foreach t in array array['ciclos','ocurrencias','registros','progreso','progreso_diario',
                           'registros_semanales','solicitudes_ajuste','peticiones_derechos'] loop
    execute format('create policy yo_leer on public.%I for select to authenticated
                    using (participante_id = (select privado.mi_participante_id()))', t);
  end loop;
end $$;
create policy yo_leer on public.programas for select to authenticated
  using (participante_id = (select privado.mi_participante_id()) and estado <> 'borrador');
create policy yo_leer on public.metas for select to authenticated
  using (participante_id = (select privado.mi_participante_id())
         and exists (select 1 from public.programas g where g.id = programa_id and g.estado <> 'borrador'));
create policy yo_leer on public.revisiones for select to authenticated
  using (participante_id = (select privado.mi_participante_id()) and publicada_en is not null);
-- Sin políticas para la persona en: acciones (usa ocurrencias), solicitudes, mensajes, equipo, auditoria, ajustes_operacion.
