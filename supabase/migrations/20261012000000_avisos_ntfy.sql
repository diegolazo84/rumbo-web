-- Avisos a Diego por ntfy (Etapa 0 de Rumbo 2.0). Reemplaza privado.avisar de 05-avisos.sql:
-- ntfy recibe JSON (pg_net solo envía cuerpos jsonb), así el título con «·» y los saltos de
-- línea llegan bien y el aviso abre el panel al tocarlo. Resend sigue igual si algún día se
-- cargan sus claves. Los avisos no llevan datos personales: área, apoyo, plazos y un enlace
-- al panel, que exige sesión y segundo factor. Pegar en el editor SQL de Supabase después de
-- 07-etapa3.sql. No cambia datos.

create or replace function privado.avisar(p_asunto text, p_cuerpo text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_clave text; v_destino text; v_ntfy text; v_enlace text;
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
    v_enlace := substring(p_cuerpo from '(https://\S+)');   -- el enlace al panel, si lo hay
    perform net.http_post(
      url := 'https://ntfy.sh',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('topic', v_ntfy, 'title', p_asunto, 'message', p_cuerpo)
              || case when v_enlace is not null then jsonb_build_object('click', v_enlace) else '{}'::jsonb end);
  end if;
end $$;

revoke execute on function privado.avisar(text, text) from public, anon, authenticated;
