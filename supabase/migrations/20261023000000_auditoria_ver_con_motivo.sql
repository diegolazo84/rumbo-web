-- A2 (Rumbo 2.0): auditoría ampliada y «Ver con motivo».
-- 1. Cada cambio en las tablas de gestión queda en public.auditoria: quién, cuándo, qué tabla y
--    fila, y QUÉ CAMPOS cambiaron (solo sus nombres, nunca su contenido).
-- 2. La postulación original de un participante (lo que escribió al postular) se lee solo con
--    ver_postulacion(participante, motivo): el dueño o el coach de esa persona, con un motivo de
--    al menos 10 caracteres. Cada lectura queda en la auditoría con el motivo.
-- La auditoría la lee solo el dueño (política de 20261008000002_rls.sql) y se borra a los 24 meses
-- (privado.aplicar_conservacion).

-- 1. Cambios -----------------------------------------------------------------
create or replace function privado.auditar_cambio() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_nuevo jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_viejo jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_fila jsonb := coalesce(v_nuevo, v_viejo);
  v_id text := coalesce(v_fila->>'id', v_fila->>'user_id');
  v_campos text[];
begin
  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into v_campos
      from jsonb_object_keys(v_nuevo) k where v_nuevo->k is distinct from v_viejo->k;
    if v_campos is null then return null; end if;          -- nada cambió
  end if;
  insert into public.auditoria (actor, accion, tabla, fila, detalle)
  values (auth.uid(), lower(tg_op), tg_table_name,
          case when v_id ~ '^[0-9a-f-]{36}$' then v_id::uuid end,
          case when v_campos is not null then jsonb_build_object('campos', to_jsonb(v_campos)) end);
  return null;
end $$;

do $$ declare t text; begin
  foreach t in array array['equipo','participantes','ciclos','ajustes_operacion','solicitudes','revisiones',
                           'solicitudes_ajuste','peticiones_derechos','planes','areas','niveles','reglas_creditos'] loop
    execute format('create or replace trigger auditar after insert or update or delete on public.%I
                    for each row execute function privado.auditar_cambio()', t);
  end loop;
end $$;

-- 2. Ver con motivo ------------------------------------------------------------
create or replace function public.ver_postulacion(p_participante uuid, p_motivo text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_motivo text := btrim(coalesce(p_motivo, '')); v jsonb;
begin
  if not privado.gestiona(p_participante) then perform privado.error('sesion','no_autorizado','403'); end if;
  if char_length(v_motivo) < 10 then perform privado.error('motivo','corto'); end if;
  select jsonb_build_object('creada_en', s.creada_en, 'area', s.area_id, 'meta', s.meta, 'apoyo', s.apoyo,
           'dias', s.dias, 'franjas', s.franjas, 'horarios_nota', s.horarios_nota)
    into v
    from public.participantes p join public.solicitudes s on s.id = p.solicitud_id
   where p.id = p_participante;
  insert into public.auditoria (actor, accion, tabla, fila, detalle)
  values (auth.uid(), 'ver_con_motivo', 'solicitudes', p_participante,
          jsonb_build_object('motivo', left(v_motivo, 300)));
  return v;     -- null si la persona no llegó por el formulario
end $$;

revoke all on function privado.auditar_cambio() from public, anon, authenticated;
revoke all on function public.ver_postulacion(uuid, text) from public, anon, authenticated;
grant execute on function public.ver_postulacion(uuid, text) to authenticated;
