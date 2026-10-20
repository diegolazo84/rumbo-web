-- Etapa 1: alinea el repositorio con producción (comparado con `supabase db diff` el 20-10-2026).
-- En producción esto YA está así, así que no se pega: solo se registra como aplicada
-- (docs/migraciones.md, Paso C). En una base nueva deja todo igual que producción.

-- 1. El «RLS automático» del proyecto activó la seguridad por fila en estas tres tablas
--    internas. Nadie las lee desde la API (el esquema privado no está expuesto) y las funciones
--    que las usan son del dueño de las tablas, así que no cambia nada; queda más cerrado.
alter table privado.correos_equipo enable row level security;
alter table privado.limites        enable row level security;
alter table privado.sales          enable row level security;

-- 2. privado.avisar quedó en producción sin el comentario de una línea que trae
--    20261012000000_avisos_ntfy.sql. Mismo código; se deja el texto exacto de producción.
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
    v_enlace := substring(p_cuerpo from '(https://\S+)'); 
    perform net.http_post(
      url := 'https://ntfy.sh',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('topic', v_ntfy, 'title', p_asunto, 'message', p_cuerpo)
              || case when v_enlace is not null then jsonb_build_object('click', v_enlace) else '{}'::jsonb end);
  end if;
end $$;

revoke execute on function privado.avisar(text, text) from public, anon, authenticated;
