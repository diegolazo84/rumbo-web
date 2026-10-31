-- R1 · Asistente (maqueta definitiva, 31-oct-2026): aviso en Mis avisos cuando el coach decide no
-- compartir una respuesta. No revela la respuesta, el borrador ni la nota interna: solo que la revisó.
-- Uno por consulta: ia_revisar solo actúa sobre lo que está «por revisar» (con candado), así que
-- una consulta no se puede descartar dos veces. Solo dentro de Rumbo: no se copia por correo.

-- Tipo nuevo. Se agrega a la lista vigente (con o sin 20261126000000_avisos_comunidad aplicada).
do $$
declare v text;
begin
  select pg_get_constraintdef(c.oid) into v from pg_constraint c
   where c.conname = 'avisos_tipo_check' and c.conrelid = 'public.avisos'::regclass;
  if position('ia_no_compartida' in v) = 0 then
    alter table public.avisos drop constraint avisos_tipo_check;
    execute 'alter table public.avisos add constraint avisos_tipo_check check (tipo = ''ia_no_compartida'' or '
      || regexp_replace(v, '^CHECK ', '') || ')';
  end if;
end $$;

-- La misma función de 20261109000000_asistente_ia.sql + el aviso al no compartir.
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

