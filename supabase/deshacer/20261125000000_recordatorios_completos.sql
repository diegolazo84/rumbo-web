-- Deshace 20261125000000_recordatorios_completos.sql: vuelve a las funciones anteriores (A5 y D3),
-- quita las columnas nuevas y los recordatorios de videollamada. Se pierden
-- el interruptor general, horario, días y categorías nuevas que hayan elegido las personas.
delete from public.avisos where tipo = 'recordatorio_videollamada';
alter table public.avisos drop constraint avisos_tipo_check;
alter table public.avisos add constraint avisos_tipo_check check (tipo in ('revision_publicada','ajuste_respondido',
  'programa_publicado','registro_enviado','ajuste_pedido','videollamada_programada',
  'recordatorio_acciones','recordatorio_registro','reporte_comunidad','reconocimiento','beneficio_disponible',
  'ia_por_revisar','ia_respondida','ia_alerta',
  'reserva_pedida','reserva_respondida','mensaje_especialista','recomendacion_especialista'));

create or replace function privado.avisar_app(p_participante uuid, p_para_participante boolean, p_tipo text,
  p_titulo text, p_enlace text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.avisos a where a.leido_en < now() - interval '90 days'
     and a.destinatario in (select p.user_id from public.participantes p where p.id = p_participante
                            union select privado.equipo_de(p_participante));
  if p_para_participante then
    insert into public.avisos (destinatario, participante_id, tipo, titulo, enlace)
    select p.user_id, p.id, p_tipo, p_titulo, p_enlace from public.participantes p
     where p.id = p_participante and p.user_id is not null and p.estado <> 'cerrado';
  else
    insert into public.avisos (destinatario, participante_id, tipo, titulo, enlace)
    select d, p_participante, p_tipo, p_titulo, p_enlace from privado.equipo_de(p_participante) d;
  end if;
end $$;
revoke all on function privado.avisar_app(uuid, boolean, text, text, text) from public, anon, authenticated;


drop function if exists public.guardar_recordatorios(jsonb);
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
revoke execute on function privado.enviar_recordatorios(integer, date) from public, anon, authenticated;

drop function if exists public.correo_disponible();
drop function if exists privado.quiere(uuid, text);
alter table public.videollamadas drop column if exists recordada_en;
alter table public.recordatorios drop constraint if exists recordatorios_horario,
  drop column if exists activos, drop column if exists videollamadas, drop column if exists mensajes_coach,
  drop column if exists comunidad, drop column if exists logros, drop column if exists desde,
  drop column if exists hasta, drop column if exists dias;
