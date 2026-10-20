-- Generado desde especificacion-plataforma.md §6. Pegar en el editor SQL de Supabase en orden.

select 'RLS activo en todas las tablas de public' as chequeo,
       case when bool_and(c.relrowsecurity) then 'ok' else 'FALLA' end
  from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'
union all
select 'anon no tiene permisos sobre tablas que no son catálogo',
       case when count(*) = 0 then 'ok' else 'FALLA: ' || string_agg(table_name || '.' || privilege_type, ', ') end
  from information_schema.role_table_grants
 where grantee = 'anon' and table_schema = 'public'
   and not (table_name in ('areas','planes','niveles','reglas_creditos','feriados') and privilege_type = 'SELECT')
union all
select 'anon ejecuta solo las 7 RPC públicas',
       case when count(*) = 7 then 'ok' else 'FALLA: ' || string_agg(p.proname, ', ') end
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('public','privado') and has_function_privilege('anon', p.oid, 'execute')
union all
select 'funciones security definer con search_path fijo',
       case when count(*) = 0 then 'ok' else 'FALLA: ' || string_agg(p.proname, ', ') end
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('public','privado') and p.prosecdef
   and not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')
union all
select 'bucket evidencias privado, 4 MB y 3 tipos',
       case when exists (select 1 from storage.buckets where id = 'evidencias' and not public
             and file_size_limit = 4194304 and cardinality(allowed_mime_types) = 3) then 'ok' else 'FALLA' end
union all
select 'niveles y reglas iguales a rumbo.ts',
       case when (select count(*) from public.niveles) = 10
             and (select minimo from public.niveles where nivel = 10) = 1100
             and (select bono_racha7 from public.reglas_creditos) = 4 then 'ok' else 'FALLA' end   -- semillas.mjs genera los valores
union all
select 'feriados cargados para este año y el siguiente',
       case when (select count(distinct extract(year from fecha)) from public.feriados
                   where extract(year from fecha) in (extract(year from now()), extract(year from now()) + 1)) = 2
            then 'ok' else 'FALLA' end
union all
select 'ajustes_operacion tiene una fila', case when (select count(*) from public.ajustes_operacion) = 1 then 'ok' else 'FALLA' end
union all
select 'tareas programadas creadas',
       case when (select count(*) from cron.job where jobname like 'rumbo-%') = 3 then 'ok' else 'FALLA' end
union all
-- migrations/20261008000009_etapa3.sql (Mi espacio propio y panel): dos funciones solo para cuentas con sesión.
select 'etapa 3: soy_equipo y mi_contexto, solo con sesión',
       case when (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'public' and p.proname in ('soy_equipo','mi_contexto')
                     and has_function_privilege('authenticated', p.oid, 'execute')
                     and not has_function_privilege('anon', p.oid, 'execute')) = 2
             and exists (select 1 from pg_trigger where tgname = 'vincular_ficha')
            then 'ok' else 'FALLA: falta pegar migrations/20261008000009_etapa3.sql' end
union all
-- migrations/20261012000000_avisos_ntfy.sql: avisos por ntfy en JSON, que nadie fuera de la base puede ejecutar.
select 'avisos por ntfy (08)',
       case when (select prosrc like '%''click''%' from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                   where n.nspname = 'privado' and p.proname = 'avisar')
             and not has_function_privilege('anon', 'privado.avisar(text, text)', 'execute')
            then 'ok' else 'FALLA: falta pegar migrations/20261012000000_avisos_ntfy.sql' end
union all
-- Etapa 1: lo que `supabase db diff` no compara porque son filas o viven en esquemas de Supabase
-- (cron, storage, auth). Solo lee nombres y definiciones; ningún dato de personas.
select 'etapa 1: tareas programadas exactas (nombre, horario y comando)',
       case when (select string_agg(jobname || ' ' || schedule || ' ' || command, '; ' order by jobname)
                    from cron.job where jobname like 'rumbo-%')
                 = 'rumbo-conservacion 30 6 * * * select privado.aplicar_conservacion(); '
                || 'rumbo-por-hora 5 * * * * select privado.tareas_por_hora(); '
                || 'rumbo-recalcular 15 5 * * * select privado.recalcular_todo()'
             and (select bool_and(active) from cron.job where jobname like 'rumbo-%')
            then 'ok' else 'FALLA: las tareas programadas no coinciden con supabase/migrations/20261008000006_cron.sql' end
union all
select 'etapa 1: políticas de archivos exactas (evid_subir, evid_ver, evid_borrar)',
       case when (select count(*) from pg_policies where schemaname = 'storage') = 3
             and (select string_agg(policyname || ' ' || cmd || ' ' || array_to_string(roles, ',') || ' '
                                    || coalesce(qual, '-') || ' ' || coalesce(with_check, '-'), '; ' order by policyname)
                    from pg_policies where schemaname = 'storage')
                 = 'evid_borrar DELETE authenticated ((bucket_id = ''evidencias''::text) AND privado.foto_permitida(name, false)) -; '
                || 'evid_subir INSERT authenticated - ((bucket_id = ''evidencias''::text) AND privado.foto_permitida(name, true)); '
                || 'evid_ver SELECT authenticated ((bucket_id = ''evidencias''::text) AND privado.foto_permitida(name, false)) -'
            then 'ok' else 'FALLA: las políticas de storage no coinciden con supabase/migrations/20261008000003_storage.sql' end
union all
select 'etapa 1: un solo bucket y es el de evidencias',
       case when (select string_agg(id, ',') from storage.buckets) = 'evidencias' then 'ok'
            else 'FALLA: buckets ' || coalesce((select string_agg(id, ',') from storage.buckets), 'ninguno') end
union all
select 'etapa 1: disparador de cuentas nuevas activo',
       case when (select string_agg(pg_get_triggerdef(t.oid) || ' ' || t.tgenabled::text, '; ')
                    from pg_trigger t where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal)
                 = 'CREATE TRIGGER al_crear_usuario AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION privado.vincular_cuenta() O'
            then 'ok' else 'FALLA: el disparador sobre auth.users no coincide con supabase/migrations/20261008000004_auth.sql' end;
