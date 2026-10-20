-- Etapa 1 (solo lectura): ¿hay historial de migraciones en este proyecto? Lo pega Diego en el SQL
-- Editor de Supabase antes de registrar la línea base (docs/migraciones.md). No lee datos de personas.
select case
         when to_regnamespace('supabase_migrations') is null then 'sin historial: no existe el esquema supabase_migrations'
         when to_regclass('supabase_migrations.schema_migrations') is null then 'sin historial: existe el esquema, pero no la tabla'
         else 'historial: ' || (xpath('/row/t/text()', query_to_xml(
           'select coalesce(string_agg(version || '' '' || coalesce(name, ''''), '', '' order by version), ''tabla vacía'') as t
              from supabase_migrations.schema_migrations', false, true, '')))[1]::text
       end as historial;
