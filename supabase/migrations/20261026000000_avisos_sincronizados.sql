-- A5 (Rumbo 2.0): avisos dentro de Rumbo, sincronizados entre dispositivos.
-- Reemplaza el «Nuevo» guardado en el navegador: el aviso y si se leyó viven en la base, así que
-- lo leído en el teléfono queda leído en el computador.
-- Los avisos los crea la base (disparadores), nunca el navegador. Sus textos son fijos y no copian
-- lo que escribió nadie: solo dicen qué pasó y llevan a la pantalla donde verlo.
-- Para participantes: revisión semanal publicada, respuesta a una solicitud de ajuste y programa
-- nuevo publicado. Para el equipo: registro semanal enviado y solicitud de ajuste nueva (al coach
-- de esa persona, o al dueño si no tiene coach).
-- Cada uno lee y marca solo los suyos. Los leídos se borran a los 90 días: al crear un aviso nuevo
-- para alguien, se borran sus leídos más antiguos (sin otra tarea programada).

create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  destinatario uuid not null references auth.users(id) on delete cascade,
  participante_id uuid references public.participantes(id) on delete cascade,  -- de quién trata
  tipo text not null check (tipo in ('revision_publicada','ajuste_respondido','programa_publicado',
                                     'registro_enviado','ajuste_pedido')),
  titulo text not null check (char_length(titulo) <= 120),
  enlace text not null check (enlace ~ '^/(mi-espacio|equipo)/'),
  creado_en timestamptz not null default now(),
  leido_en timestamptz
);
create index if not exists avisos_bandeja on public.avisos (destinatario, leido_en, creado_en desc);
alter table public.avisos enable row level security;
revoke all on public.avisos from anon, authenticated;
grant select on public.avisos to authenticated;
create policy yo_leer on public.avisos for select to authenticated using (destinatario = auth.uid());

-- A quién del equipo le llega lo de un participante: su coach; si no tiene, los dueños activos.
create or replace function privado.equipo_de(p_participante uuid) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select e.user_id from public.participantes p join public.equipo e on e.user_id = p.coach_id and e.activo
   where p.id = p_participante
  union
  select e.user_id from public.equipo e
   where e.rol = 'dueno' and e.activo
     and not exists (select 1 from public.participantes p join public.equipo c on c.user_id = p.coach_id and c.activo
                      where p.id = p_participante);
$$;

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

create or replace function privado.aviso_app() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'revisiones' then
    if new.publicada_en is not null and (tg_op = 'INSERT' or old.publicada_en is null) then
      perform privado.avisar_app(new.participante_id, true, 'revision_publicada',
        'Tu coach publicó la revisión de la semana ' || new.semana, '/mi-espacio/acompanamiento/');
    end if;
  elsif tg_table_name = 'solicitudes_ajuste' then
    if tg_op = 'INSERT' then
      perform privado.avisar_app(new.participante_id, false, 'ajuste_pedido',
        'Nueva solicitud de ajuste', '/equipo/ajustes/');
    elsif new.estado in ('respondida','sin_cambios') and old.estado not in ('respondida','sin_cambios') then
      perform privado.avisar_app(new.participante_id, true, 'ajuste_respondido',
        'Tu coach respondió tu solicitud de ajuste', '/mi-espacio/acompanamiento/');
    end if;
  elsif tg_table_name = 'programas' then
    if new.estado = 'publicado' and old.estado = 'borrador' and new.version > 1 then
      perform privado.avisar_app(new.participante_id, true, 'programa_publicado',
        'Tu plan tiene cambios', '/mi-espacio/plan/');
    end if;
  elsif tg_table_name = 'registros_semanales' then
    if new.enviado_en is not null and (tg_op = 'INSERT' or old.enviado_en is null) then
      perform privado.avisar_app(new.participante_id, false, 'registro_enviado',
        'Registro semanal enviado (semana ' || new.semana || ')', '/equipo/participante/?id=' || new.participante_id);
    end if;
  end if;
  return null;
end $$;

create or replace trigger aviso_app after insert or update on public.revisiones
  for each row execute function privado.aviso_app();
create or replace trigger aviso_app after insert or update on public.solicitudes_ajuste
  for each row execute function privado.aviso_app();
create or replace trigger aviso_app after update on public.programas
  for each row execute function privado.aviso_app();
create or replace trigger aviso_app after insert or update on public.registros_semanales
  for each row execute function privado.aviso_app();

-- Marcar leídos: los indicados, o todos si no se indica ninguno. Solo los propios.
create or replace function public.marcar_avisos_leidos(p_ids uuid[] default null) returns int
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if auth.uid() is null then perform privado.error('sesion','no_autorizado','403'); end if;
  update public.avisos set leido_en = now()
   where destinatario = auth.uid() and leido_en is null and (p_ids is null or id = any(p_ids));
  get diagnostics v_n = row_count;
  return v_n;
end $$;


revoke all on function privado.equipo_de(uuid), privado.avisar_app(uuid, boolean, text, text, text), privado.aviso_app() from public, anon, authenticated;
revoke all on function public.marcar_avisos_leidos(uuid[]) from public, anon, authenticated;
grant execute on function public.marcar_avisos_leidos(uuid[]) to authenticated;
