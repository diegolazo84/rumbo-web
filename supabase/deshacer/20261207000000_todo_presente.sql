-- Deshace 20261207000000_todo_presente: comunidad, especialistas y asistente vuelven a depender de
-- la tabla modulos; ia_enviar vuelve a exigir la IA conectada. Las filas quedan «habilitado» para que
-- nadie pierda una función al deshacer.
begin;
create or replace function public.modulo_visible(p_clave text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_clave in ('notificaciones','recordatorios','reconocimientos','fotos','ranking','informes','app_movil')
      or coalesce((select estado in ('habilitado','operativo') from public.modulos where clave = p_clave), false);
$$;
revoke all on function public.modulo_visible(text) from public, anon;
grant execute on function public.modulo_visible(text) to authenticated;

create or replace function privado.ia_enviar(p_participante uuid, p_tipo text, p_pregunta text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  g public.ia_config%rowtype; v_clave text := privado.ia_clave(); v_ctx jsonb; v_id uuid; v_req bigint;
  v_reserva numeric; v_mes numeric; v_texto text := btrim(p_pregunta);
begin
  select * into g from public.ia_config;
  if not g.activo or v_clave is null then perform privado.error('ia','apagada','409'); end if;
  if not exists (select 1 from public.ia_consentimientos where participante_id = p_participante
                   and aceptado_en is not null and retirado_en is null) then
    perform privado.error('ia','sin_consentimiento','409');
  end if;
  if v_texto is null or char_length(v_texto) < 3 or char_length(v_texto) > 1000 then perform privado.error('pregunta','invalida'); end if;
  if (select count(*) from public.ia_consultas where participante_id = p_participante and tipo = p_tipo
        and creada_en > now() - interval '24 hours') >= g.tope_diario_persona then
    perform privado.error('ia','demasiadas','429');
  end if;
  if privado.ia_es_crisis(v_texto) then
    insert into public.ia_consultas (participante_id, tipo, pedida_por, pregunta, estado)
    values (p_participante, p_tipo, auth.uid(), v_texto, 'crisis') returning id into v_id;
    perform privado.avisar_app(p_participante, false, 'ia_alerta', 'Alerta: una consulta al asistente sugiere riesgo. Contacta a la persona.', '/equipo/');
    perform privado.avisar('Rumbo · alerta en una consulta al asistente', 'Una consulta sugiere riesgo. Revisa el panel ahora.');
    return v_id;
  end if;
  v_reserva := (g.tokens_entrada_estimados * g.precio_entrada_1m + g.max_tokens_respuesta * g.precio_salida_1m) / 1000000;
  select coalesce(sum(coalesce(costo_usd, costo_reservado_usd)), 0) into v_mes from public.ia_consultas
   where creada_en >= date_trunc('month', now() at time zone 'America/Santiago') at time zone 'America/Santiago';
  if v_mes + v_reserva > g.tope_mensual_usd then
    insert into public.ia_consultas (participante_id, tipo, pedida_por, pregunta, estado)
    values (p_participante, p_tipo, auth.uid(), v_texto, 'sin_presupuesto') returning id into v_id;
    return v_id;
  end if;
  v_ctx := privado.ia_contexto(p_participante);
  v_req := net.http_post(
    url := 'https://api.openai.com/v1/chat/completions',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_clave, 'Content-Type', 'application/json'),
    body := jsonb_build_object('model', g.modelo, 'max_tokens', g.max_tokens_respuesta, 'temperature', 0.4,
      'messages', jsonb_build_array(
        jsonb_build_object('role', 'system', 'content', g.instrucciones
          || case when p_tipo = 'borrador_coach' then ' Esta vez escribes un borrador para el coach, no para la persona.' else '' end),
        jsonb_build_object('role', 'user', 'content', 'Contexto autorizado (JSON): ' || v_ctx::text || E'\n\n'
          || case when p_tipo = 'borrador_coach' then 'Pedido del coach: ' else 'Pregunta de la persona: ' end || v_texto))),
    timeout_milliseconds := 30000);
  insert into public.ia_consultas (participante_id, tipo, pedida_por, pregunta, contexto_enviado, estado, request_id, costo_reservado_usd)
  values (p_participante, p_tipo, auth.uid(), v_texto, v_ctx, 'enviada', v_req, v_reserva) returning id into v_id;
  return v_id;
end $$;
revoke execute on function privado.ia_enviar(uuid, text, text) from public, anon, authenticated;

create or replace function public.ia_revisar(p_consulta uuid, p_aprobar boolean, p_texto text default null,
  p_nota text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare q public.ia_consultas%rowtype; v_texto text;
begin
  select * into q from public.ia_consultas where id = p_consulta for update;
  if q.id is null or not privado.gestiona(q.participante_id) then perform privado.error('sesion','no_autorizado','403'); end if;
  if q.tipo <> 'pregunta' or q.estado <> 'por_revisar' then perform privado.error('consulta','no_por_revisar','409'); end if;
  if p_aprobar then
    v_texto := coalesce(nullif(btrim(p_texto), ''), q.respuesta);
    if char_length(v_texto) > 2000 then perform privado.error('texto','invalido'); end if;
    update public.ia_consultas set estado = 'aprobada', texto_final = v_texto, revisada_por = auth.uid(), revisada_en = now(),
           nota_revision = nullif(left(btrim(p_nota), 300), '') where id = p_consulta;
    perform privado.avisar_app(q.participante_id, true, 'ia_respondida', 'Tu coach revisó la respuesta del asistente', '/mi-espacio/');
  else
    update public.ia_consultas set estado = 'descartada', revisada_por = auth.uid(), revisada_en = now(),
           nota_revision = nullif(left(btrim(p_nota), 300), '') where id = p_consulta;
    -- Sin el texto ni el motivo: solo que la revisó. Un aviso por consulta (solo se revisa una vez).
    perform privado.avisar_app(q.participante_id, true, 'ia_no_compartida', 'Tu coach revisó tu pregunta al asistente', '/mi-espacio/asistente/');
  end if;
end $$;

update public.modulos set estado = 'habilitado', cambiado_en = now()
 where clave in ('comunidad','especialistas','asistente_ia') and estado = 'operativo';
commit;
