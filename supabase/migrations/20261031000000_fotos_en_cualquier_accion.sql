-- C1 · Foto opcional en cualquier acción y en ambos planes, sin tope semanal (decisión de Diego,
-- 21-oct-2026). Las acciones que exigen evidencia siguen igual (registrar_evidencia, en revisión).
-- En las demás, la foto es un complemento privado: la acción queda «hecha» y los créditos no cambian.
-- Se mantiene el máximo de 3 archivos por acción y la ventana de registro tardío.

create or replace function privado.foto_permitida(p_nombre text, p_subir boolean) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare v_part text := split_part(p_nombre, '/', 1); v_oc text := split_part(p_nombre, '/', 2);
        v_yo uuid := privado.mi_participante_id(); v_hoy date; v_ventana int;
begin
  if v_part !~ '^[0-9a-f-]{36}$' or v_oc !~ '^[0-9a-f-]{36}$' then return false; end if;
  if not p_subir then return v_part = v_yo::text or privado.gestiona(v_part::uuid); end if;
  if v_part <> v_yo::text then return false; end if;
  v_hoy := privado.hoy_de(v_yo);
  select dias_registro_tardio into v_ventana from public.ajustes_operacion;
  return exists (select 1 from public.ocurrencias o where o.id = v_oc::uuid and o.participante_id = v_yo
                   and o.vigente and o.fecha between v_hoy - v_ventana and v_hoy)
     and (select count(*) from storage.objects s
           where s.bucket_id = 'evidencias' and s.name like v_part || '/' || v_oc || '/%') < 3;
end $$;

-- Adjunta una foto a una acción que no exige evidencia. Si aún no estaba marcada, la marca como hecha.
create or replace function public.adjuntar_foto(p_ocurrencia uuid, p_foto_ruta text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.ocurrencias%rowtype; v_estado text;
begin
  o := privado.ocurrencia_registrable(p_ocurrencia);
  if o.requiere_foto then perform privado.error('accion','requiere_evidencia','409'); end if;
  if p_foto_ruta is null or p_foto_ruta not like o.participante_id || '/' || o.id || '/%'
     or not exists (select 1 from storage.objects s where s.bucket_id = 'evidencias' and s.name = p_foto_ruta) then
    perform privado.error('evidencia','ruta_invalida'); end if;
  select estado into v_estado from public.registros where ocurrencia_id = o.id;
  if v_estado is not null and v_estado <> 'hecha' then perform privado.error('accion','no_hecha','409'); end if;
  insert into public.registros (ocurrencia_id, participante_id, estado, version, foto_ruta)
  values (o.id, o.participante_id, 'hecha', 'completa', p_foto_ruta)
  on conflict (ocurrencia_id) do update set foto_ruta = excluded.foto_ruta, actualizado_en = now();
  perform privado.recalcular_progreso(o.participante_id);
  return privado.mi_progreso();
end $$;

-- Quita la foto opcional (el navegador borra antes el archivo); la acción sigue hecha.
create or replace function public.quitar_foto(p_ocurrencia uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o public.ocurrencias%rowtype;
begin
  o := privado.ocurrencia_registrable(p_ocurrencia);
  update public.registros set foto_ruta = null, actualizado_en = now()
   where ocurrencia_id = o.id and estado = 'hecha';
  return privado.mi_progreso();
end $$;

revoke all on function public.adjuntar_foto(uuid, text), public.quitar_foto(uuid) from public, anon, authenticated;
grant execute on function public.adjuntar_foto(uuid, text), public.quitar_foto(uuid) to authenticated;
