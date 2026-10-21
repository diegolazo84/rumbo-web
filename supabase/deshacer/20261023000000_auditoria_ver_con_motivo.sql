-- Deshace migrations/20261023000000_auditoria_ver_con_motivo.sql (A2). Las filas que ya quedaron
-- en public.auditoria se conservan (son registro histórico).
begin;
do $$ declare t text; begin
  foreach t in array array['equipo','participantes','ciclos','ajustes_operacion','solicitudes','revisiones',
                           'solicitudes_ajuste','peticiones_derechos','planes','areas','niveles','reglas_creditos'] loop
    execute format('drop trigger if exists auditar on public.%I', t);
  end loop;
end $$;
drop function if exists public.ver_postulacion(uuid, text);
drop function if exists privado.auditar_cambio();
commit;
