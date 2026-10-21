-- Arreglo: el formulario de contacto (/contacto/) no guardaba mensajes.
-- privado.aviso_nuevo() evaluaba `new.tipo` en la misma condición que `tg_table_name`, y
-- PL/pgSQL resuelve los campos de NEW antes de evaluar el AND: en mensajes_contacto, que no tiene
-- columna `tipo`, el disparador fallaba («record "new" has no field "tipo"») y enviar_mensaje
-- devolvía error. Ahora cada tabla tiene su propia rama y solo lee sus columnas.
-- Mismo comportamiento para solicitudes, peticiones_derechos y solicitudes_ajuste.
create or replace function privado.aviso_nuevo() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_base text := 'https://diegolazo84.github.io/rumbo-web/equipo/';   -- se reemplaza con el dominio propio
begin
  if tg_table_name = 'solicitudes' then
    if new.tipo = 'solicitud' then
      perform privado.avisar('Rumbo · nueva solicitud · responder antes del ' || to_char(new.responder_antes, 'DD-MM'),
        'Área: ' || new.area_id || E'\nApoyo: ' || new.apoyo
        || case when new.posible_spam then E'\nMarca: posible spam' else '' end
        || case when new.posible_duplicado then E'\nMarca: posible duplicado' else '' end
        || E'\n\n' || v_base || 'solicitud/?id=' || new.id);
    end if;
  elsif tg_table_name = 'mensajes_contacto' then
    perform privado.avisar('Rumbo · nuevo mensaje · ' || new.motivo, v_base || 'mas/');
  elsif tg_table_name = 'peticiones_derechos' then
    perform privado.avisar('Rumbo · petición de datos' || coalesce(' · vence el ' || to_char(new.fecha_limite, 'DD-MM'), ''), v_base || 'mas/');
  elsif tg_table_name = 'solicitudes_ajuste' then
    if new.pide_reorden then
      perform privado.avisar('Rumbo · reordenar semana · antes del ' || to_char(new.responder_antes, 'DD-MM'), v_base);
    end if;
  end if;
  return null;
end $$;
revoke execute on function privado.aviso_nuevo() from public, anon, authenticated;
