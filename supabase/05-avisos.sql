-- Generado desde especificacion-plataforma.md §6. Pegar en el editor SQL de Supabase en orden.

create or replace function privado.avisar(p_asunto text, p_cuerpo text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_clave text; v_destino text; v_ntfy text;
begin
  select decrypted_secret into v_clave   from vault.decrypted_secrets where name = 'resend_api_key';
  select decrypted_secret into v_destino from vault.decrypted_secrets where name = 'aviso_destino';
  select decrypted_secret into v_ntfy    from vault.decrypted_secrets where name = 'ntfy_tema';
  if v_clave is not null and v_destino is not null then
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || v_clave, 'Content-Type', 'application/json'),
      body := jsonb_build_object('from', 'Rumbo <onboarding@resend.dev>', 'to', v_destino,
                                 'subject', p_asunto, 'text', p_cuerpo));
  elsif v_ntfy is not null then
    perform net.http_post(url := 'https://ntfy.sh/' || v_ntfy,
      headers := jsonb_build_object('Title', p_asunto), body := to_jsonb(p_cuerpo));
  end if;
end $$;

create or replace function privado.aviso_nuevo() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_base text := 'https://diegolazo84.github.io/rumbo-web/equipo/';   -- se reemplaza con el dominio propio
begin
  if tg_table_name = 'solicitudes' and new.tipo = 'solicitud' then
    perform privado.avisar('Rumbo · nueva solicitud · responder antes del ' || to_char(new.responder_antes, 'DD-MM'),
      'Área: ' || new.area_id || E'\nApoyo: ' || new.apoyo
      || case when new.posible_spam then E'\nMarca: posible spam' else '' end
      || case when new.posible_duplicado then E'\nMarca: posible duplicado' else '' end
      || E'\n\n' || v_base || 'solicitud/?id=' || new.id);
  elsif tg_table_name = 'mensajes_contacto' then
    perform privado.avisar('Rumbo · nuevo mensaje · ' || new.motivo, v_base || 'mas/');
  elsif tg_table_name = 'peticiones_derechos' then
    perform privado.avisar('Rumbo · petición de datos' || coalesce(' · vence el ' || to_char(new.fecha_limite, 'DD-MM'), ''), v_base || 'mas/');
  elsif tg_table_name = 'solicitudes_ajuste' and new.pide_reorden then
    perform privado.avisar('Rumbo · reordenar semana · antes del ' || to_char(new.responder_antes, 'DD-MM'), v_base);
  end if;
  return null;
end $$;
create or replace trigger aviso after insert on public.solicitudes        for each row execute function privado.aviso_nuevo();
create or replace trigger aviso after insert on public.mensajes_contacto  for each row execute function privado.aviso_nuevo();
create or replace trigger aviso after insert on public.peticiones_derechos for each row execute function privado.aviso_nuevo();
create or replace trigger aviso after insert on public.solicitudes_ajuste for each row execute function privado.aviso_nuevo();

-- Resumen de las 09:00 (hora de Chile) en días hábiles
create or replace function privado.resumen_diario() returns void
language plpgsql security definer set search_path = '' as $$
declare v_hoy date := privado.hoy_chile(); v_vencen int; v_atraso int;
begin
  if not privado.es_habil(v_hoy) then return; end if;
  select count(*) filter (where responder_antes = v_hoy), count(*) filter (where responder_antes < v_hoy)
    into v_vencen, v_atraso from public.solicitudes
   where tipo = 'solicitud' and estado in ('recibida','en_revision');
  if v_atraso > 0 then perform privado.avisar('Rumbo · ' || v_atraso || ' solicitud(es) pasaron su plazo', 'Ábrelas en el panel.'); end if;
  if v_vencen > 0 then perform privado.avisar('Rumbo · hoy vencen ' || v_vencen, 'Ábrelas en el panel.'); end if;
end $$;
