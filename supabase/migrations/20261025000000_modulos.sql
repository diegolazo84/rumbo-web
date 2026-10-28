-- A4 (Rumbo 2.0): configuración de módulos.
-- Una fila por función del producto con su estado real. La pantalla de «Lo que viene» y cada
-- sección podrán preguntarle a la base qué está encendido, en vez de listas fijas en el código.
-- Estados: planificado → desarrollado → probado → habilitado → operativo.
-- Reglas: solo el dueño cambia estados (cambiar_modulo); no se habilita sin haber pasado por
-- «probado»; no se marca «operativo» sin anotar qué lo respalda; cada cambio queda en la
-- auditoría (disparador de A2). Un módulo es visible para participantes solo si está habilitado
-- u operativo.

create table if not exists public.modulos (
  clave text primary key check (clave ~ '^[a-z_]{3,40}$'),
  nombre text not null check (char_length(nombre) between 3 and 80),
  estado text not null default 'planificado'
    check (estado in ('planificado','desarrollado','probado','habilitado','operativo')),
  probado_en timestamptz,                -- se fija la primera vez que pasa por «probado»
  respaldo text check (char_length(respaldo) <= 300),   -- qué demuestra que funciona
  que_falta text check (char_length(que_falta) <= 300),
  orden smallint not null default 0,
  cambiado_en timestamptz not null default now(),
  cambiado_por uuid
);
alter table public.modulos enable row level security;
revoke all on public.modulos from anon, authenticated;
-- Con sesión (participantes y equipo). La portada no lo necesita: se arma al publicar.
grant select on public.modulos to authenticated;
create policy con_sesion_leer on public.modulos for select to authenticated using (true);

create or replace trigger auditar after insert or update or delete on public.modulos
  for each row execute function privado.auditar_cambio();

create or replace function public.cambiar_modulo(p_clave text, p_estado text, p_respaldo text default null,
  p_que_falta text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.modulos%rowtype; v_resp text := nullif(btrim(p_respaldo), '');
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  select * into m from public.modulos where clave = p_clave for update;
  if m.clave is null then perform privado.error('modulo','no_encontrado','404'); end if;
  if p_estado not in ('planificado','desarrollado','probado','habilitado','operativo') then
    perform privado.error('estado','invalido'); end if;
  if p_estado in ('habilitado','operativo') and m.probado_en is null then
    perform privado.error('estado','sin_probar','409'); end if;
  if p_estado = 'operativo' and coalesce(v_resp, m.respaldo) is null then
    perform privado.error('respaldo','requerido'); end if;
  update public.modulos set estado = p_estado,
         probado_en = case when p_estado = 'probado' then coalesce(probado_en, now()) else probado_en end,
         respaldo = coalesce(left(v_resp, 300), respaldo),
         que_falta = case when p_que_falta is not null then nullif(left(btrim(p_que_falta), 300), '') else que_falta end,
         cambiado_en = now(), cambiado_por = auth.uid()
   where clave = p_clave;
end $$;

create or replace function public.modulo_visible(p_clave text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select estado in ('habilitado','operativo') from public.modulos where clave = p_clave), false);
$$;

revoke all on function public.cambiar_modulo(text, text, text, text), public.modulo_visible(text) from public, anon, authenticated;
grant execute on function public.cambiar_modulo(text, text, text, text) to authenticated;
grant execute on function public.modulo_visible(text) to authenticated;

-- Estado real al 21 de octubre de 2026 (docs/inventario-funciones.md). Ninguno está habilitado.
insert into public.modulos (clave, nombre, estado, que_falta, orden) values
  ('comunidad', 'Comunidad con foro moderado', 'planificado', 'Alias, publicaciones, moderación y reglas', 1),
  ('ranking', 'Ranking semanal voluntario', 'planificado', 'Requiere la comunidad', 2),
  ('fotos', 'Fotografías opcionales y privadas', 'planificado', 'Subida, regla para cualquier acción, miniaturas y borrado por plazo', 3),
  ('asistente_ia', 'Asistente con inteligencia artificial', 'planificado', 'Servicio pagado: requiere aprobación de Diego', 4),
  ('notificaciones', 'Avisos dentro de Rumbo', 'planificado', 'Centro de avisos sincronizado', 5),
  ('recordatorios', 'Recordatorios por correo y en el teléfono', 'planificado', 'Preferencias, envío programado y textos legales', 6),
  ('whatsapp', 'Avisos por WhatsApp', 'planificado', 'Después de correo y teléfono; servicio pagado', 7),
  ('reconocimientos', 'Reconocimientos y recompensas', 'planificado', 'Catálogo y criterios de Diego', 8),
  ('informes', 'Informe de evolución y cierre de ciclo', 'planificado', 'Gráficos, constancia e informe final', 9),
  ('especialistas', 'Red de especialistas', 'planificado', 'Modelo comercial, verificación y revisión legal', 10),
  ('pagos_en_linea', 'Pagos en línea', 'planificado', 'Inicio de actividades en el SII', 11),
  ('app_movil', 'Aplicación instalable con avisos', 'planificado', 'Service worker y avisos en el teléfono', 12),
  ('ia_avanzada', 'Inteligencia artificial avanzada', 'planificado', 'Requiere el asistente operativo', 13)
on conflict (clave) do nothing;
