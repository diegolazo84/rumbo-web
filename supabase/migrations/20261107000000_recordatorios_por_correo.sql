-- D3 · Recordatorios también por correo (función 12 del inventario), con Brevo (plan gratis: 300
-- correos al día). Queda preparado y APAGADO: solo envía si en el Vault de Supabase existen
-- `brevo_api_key` y `correo_remitente` (un remitente verificado en Brevo), y solo a quien eligió
-- recibirlos por correo. Sin esas claves, los recordatorios siguen llegando solo dentro de Rumbo.
-- El correo no lleva datos del programa: dice qué toca y enlaza a Mi espacio.

alter table public.recordatorios add column por_correo boolean not null default false;

-- Envía un correo por Brevo. Devuelve false (y no envía) si faltan las claves.
create or replace function privado.enviar_correo(p_para text, p_asunto text, p_texto text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_clave text; v_remitente text;
begin
  select decrypted_secret into v_clave     from vault.decrypted_secrets where name = 'brevo_api_key';
  select decrypted_secret into v_remitente from vault.decrypted_secrets where name = 'correo_remitente';
  if v_clave is null or v_remitente is null or p_para is null then return false; end if;
  perform net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object('api-key', v_clave, 'Content-Type', 'application/json', 'Accept', 'application/json'),
    body := jsonb_build_object('sender', jsonb_build_object('name', 'Rumbo', 'email', v_remitente),
                               'to', jsonb_build_array(jsonb_build_object('email', p_para)),
                               'subject', p_asunto, 'textContent', p_texto));
  return true;
end $$;
revoke execute on function privado.enviar_correo(text, text, text) from public, anon, authenticated;

drop function if exists public.guardar_recordatorios(boolean, boolean, integer);
create or replace function public.guardar_recordatorios(p_acciones_del_dia boolean, p_registro_semanal boolean,
  p_hora integer default 20, p_por_correo boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id();
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  if p_acciones_del_dia is null or p_registro_semanal is null or p_por_correo is null then
    perform privado.error('preferencia','invalida'); end if;
  if p_hora is null or p_hora < 7 or p_hora > 22 then perform privado.error('hora','invalida'); end if;
  insert into public.recordatorios (participante_id, acciones_del_dia, registro_semanal, hora, por_correo)
  values (v_yo, p_acciones_del_dia, p_registro_semanal, p_hora, p_por_correo)
  on conflict (participante_id) do update
    set acciones_del_dia = excluded.acciones_del_dia, registro_semanal = excluded.registro_semanal,
        hora = excluded.hora, por_correo = excluded.por_correo, actualizado_en = now();
end $$;
revoke all on function public.guardar_recordatorios(boolean, boolean, integer, boolean) from public, anon, authenticated;
grant execute on function public.guardar_recordatorios(boolean, boolean, integer, boolean) to authenticated;

-- Igual que en D1, y además el correo a quien lo eligió.
create or replace function privado.enviar_recordatorios(p_hora integer default null, p_hoy date default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_hoy date := coalesce(p_hoy, privado.hoy_chile());
  v_hora int := coalesce(p_hora, extract(hour from now() at time zone 'America/Santiago')::int);
  v_sitio text := 'https://diegolazo84.github.io/rumbo-web/';   -- se reemplaza con el dominio propio
  v_pie text;
  r record; v_n int := 0; v_semana int;
begin
  v_pie := E'\n\nEntra a Mi espacio: ' || v_sitio || E'mi-espacio/\n\nSi no quieres recibir estos correos, cámbialo en Preferencias: '
           || v_sitio || 'mi-espacio/preferencias/';
  for r in
    select p.id, p.correo::text correo, c.id ciclo_id, c.inicio, c.semanas, c.dia_revision,
           x.acciones_del_dia, x.registro_semanal, x.por_correo
      from public.recordatorios x
      join public.participantes p on p.id = x.participante_id and p.estado = 'activo' and p.user_id is not null
      join public.ciclos c on c.participante_id = p.id and c.estado = 'activo' and c.inicio <= v_hoy and c.fin >= v_hoy
     where x.hora = v_hora and (x.acciones_del_dia or x.registro_semanal)
  loop
    if r.acciones_del_dia
       and exists (select 1 from public.ocurrencias o where o.participante_id = r.id and o.fecha = v_hoy and o.vigente
                     and not exists (select 1 from public.registros g where g.ocurrencia_id = o.id))
       and not exists (select 1 from public.avisos a where a.participante_id = r.id and a.tipo = 'recordatorio_acciones'
                         and a.creado_en > now() - interval '20 hours') then
      perform privado.avisar_app(r.id, true, 'recordatorio_acciones', 'Hoy tienes acciones por marcar', '/mi-espacio/');
      if r.por_correo then
        perform privado.enviar_correo(r.correo, 'Rumbo: hoy tienes acciones por marcar',
          'Hola. Hoy tienes acciones de tu plan por marcar.' || v_pie);
      end if;
      v_n := v_n + 1;
    end if;
    -- Mañana es el día de revisión de la semana v_semana.
    v_semana := ((v_hoy + 1 - r.inicio - (r.dia_revision - 1)) / 7) + 1;
    if r.registro_semanal
       and (v_hoy + 1 - r.inicio - (r.dia_revision - 1)) >= 0 and (v_hoy + 1 - r.inicio - (r.dia_revision - 1)) % 7 = 0
       and v_semana between 1 and r.semanas
       and not exists (select 1 from public.registros_semanales w where w.ciclo_id = r.ciclo_id and w.semana = v_semana
                         and w.enviado_en is not null)
       and not exists (select 1 from public.avisos a where a.participante_id = r.id and a.tipo = 'recordatorio_registro'
                         and a.creado_en > now() - interval '20 hours') then
      perform privado.avisar_app(r.id, true, 'recordatorio_registro',
        'Mañana es tu revisión: cuéntale a tu coach cómo te fue esta semana', '/mi-espacio/');
      if r.por_correo then
        perform privado.enviar_correo(r.correo, 'Rumbo: mañana es tu revisión',
          'Hola. Mañana es tu revisión semanal: cuéntale a tu coach cómo te fue esta semana.' || v_pie);
      end if;
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end $$;
