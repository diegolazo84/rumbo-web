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
       case when (select count(*) from cron.job where jobname like 'rumbo-%') = 3 then 'ok' else 'FALLA' end;
