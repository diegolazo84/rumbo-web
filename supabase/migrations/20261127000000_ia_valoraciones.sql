-- R1 · Asistente (maqueta definitiva, 31-oct-2026): «Me sirvió» / «No me sirvió» en cada respuesta
-- aprobada por el coach. Una valoración vigente por respuesta (y por lo tanto por persona): se puede
-- cambiar o quitar; el motivo es opcional y solo para «No me sirvió». No cambia el plan, ni créditos,
-- ni lo que vio la persona. La leen la persona y su coach (o el dueño); entra en la copia de datos.

create table public.ia_valoraciones (
  consulta_id uuid primary key references public.ia_consultas(id) on delete cascade,
  participante_id uuid not null references public.participantes(id) on delete cascade,
  util boolean not null,
  motivo text check (motivo is null or char_length(motivo) between 1 and 300),
  actualizada_en timestamptz not null default now(),
  check (util is false or motivo is null)
);
create index ia_valoraciones_participante on public.ia_valoraciones (participante_id);
alter table public.ia_valoraciones enable row level security;
revoke all on public.ia_valoraciones from anon, authenticated;
grant select on public.ia_valoraciones to authenticated;
create policy yo_leer on public.ia_valoraciones for select to authenticated
  using (participante_id = (select privado.mi_participante_id()));
create policy equipo_leer on public.ia_valoraciones for select to authenticated using (privado.gestiona(participante_id));
create or replace trigger auditar after insert or update or delete on public.ia_valoraciones
  for each row execute function privado.auditar_cambio();

-- Valorar: solo lo propio y ya aprobado. p_util null quita la valoración.
create or replace function public.ia_valorar(p_consulta uuid, p_util boolean, p_motivo text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id(); v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  if not exists (select 1 from public.ia_consultas where id = p_consulta and participante_id = v_yo and tipo = 'pregunta') then
    perform privado.error('consulta','no_encontrada','404');
  end if;
  if not exists (select 1 from public.ia_consultas where id = p_consulta and estado = 'aprobada') then
    perform privado.error('consulta','no_aprobada','409');
  end if;
  if p_util is null then
    delete from public.ia_valoraciones where consulta_id = p_consulta;
    return;
  end if;
  if p_util then v_motivo := null; end if;
  if v_motivo is not null and char_length(v_motivo) > 300 then perform privado.error('motivo','largo'); end if;
  insert into public.ia_valoraciones (consulta_id, participante_id, util, motivo)
  values (p_consulta, v_yo, p_util, v_motivo)
  on conflict (consulta_id) do update set util = excluded.util, motivo = excluded.motivo, actualizada_en = now();
end $$;
revoke all on function public.ia_valorar(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.ia_valorar(uuid, boolean, text) to authenticated;

-- Copia de mis datos: la misma de 20261116000000_grupos_explorador.sql + las valoraciones.
create or replace function public.exportar_mis_datos() returns jsonb
language sql stable security definer set search_path = '' as $$
  with yo as (select privado.mi_participante_id() as id)
  select jsonb_build_object(
    'generado_en', now(),
    'perfil',   (select to_jsonb(p) - 'user_id' from public.participantes p, yo where p.id = yo.id),
    'ciclos',   (select jsonb_agg(to_jsonb(c)) from public.ciclos c, yo where c.participante_id = yo.id),
    'metas',    (select jsonb_agg(to_jsonb(m)) from public.metas m join public.programas g on g.id = m.programa_id, yo
                  where m.participante_id = yo.id and g.estado <> 'borrador'),
    'acciones', (select jsonb_agg(to_jsonb(o) || jsonb_build_object('registro', to_jsonb(r) - 'participante_id'))
                  from public.ocurrencias o left join public.registros r on r.ocurrencia_id = o.id, yo
                  where o.participante_id = yo.id),
    'registros_semanales', (select jsonb_agg(to_jsonb(s)) from public.registros_semanales s, yo where s.participante_id = yo.id),
    'revisiones', (select jsonb_agg(to_jsonb(v)) from public.revisiones v, yo where v.participante_id = yo.id and v.publicada_en is not null),
    'solicitudes_ajuste', (select jsonb_agg(to_jsonb(a)) from public.solicitudes_ajuste a, yo where a.participante_id = yo.id),
    'pagos', (select jsonb_agg(to_jsonb(x) - 'registrado_por') from public.pagos x, yo where x.participante_id = yo.id),
    'videollamadas', (select jsonb_agg(to_jsonb(x) - 'registrada_por') from public.videollamadas x, yo where x.participante_id = yo.id),
    'recordatorios', (select to_jsonb(x) from public.recordatorios x, yo where x.participante_id = yo.id),
    'alias', (select to_jsonb(x) from public.alias x, yo where x.participante_id = yo.id),
    'publicaciones', (select jsonb_agg(to_jsonb(x) - 'moderada_por') from public.publicaciones x, yo where x.autor = yo.id),
    'reportes', (select jsonb_agg(to_jsonb(x)) from public.reportes_comunidad x, yo where x.reportante = yo.id),
    'reconocimientos', (select jsonb_agg(to_jsonb(x)) from public.reconocimientos_otorgados x, yo where x.participante_id = yo.id),
    'beneficios', (select jsonb_agg(to_jsonb(x) - 'otorgado_por') from public.beneficios_otorgados x, yo where x.participante_id = yo.id),
    'asistente_consentimiento', (select to_jsonb(x) from public.ia_consentimientos x, yo where x.participante_id = yo.id),
    'asistente_consultas', (select jsonb_agg(jsonb_build_object('pregunta', x.pregunta, 'contexto_enviado', x.contexto_enviado,
        'estado', x.estado, 'respuesta', case when x.estado = 'aprobada' then x.texto_final end, 'creada_en', x.creada_en))
      from public.ia_consultas x, yo where x.participante_id = yo.id and x.tipo = 'pregunta'),
    'asistente_valoraciones', (select jsonb_agg(jsonb_build_object('consulta_id', x.consulta_id, 'util', x.util,
        'motivo', x.motivo, 'actualizada_en', x.actualizada_en)) from public.ia_valoraciones x, yo where x.participante_id = yo.id),
    'especialistas_vinculos', (select jsonb_agg(to_jsonb(x)) from public.vinculos_especialista x, yo where x.participante_id = yo.id),
    'especialistas_reservas', (select jsonb_agg(to_jsonb(x) - 'comision_pct' - 'comision_clp') from public.reservas_especialista x, yo
                                where x.participante_id = yo.id),
    'especialistas_recomendaciones', (select jsonb_agg(to_jsonb(x)) from public.recomendaciones_especialista x, yo where x.participante_id = yo.id),
    'especialistas_mensajes', (select jsonb_agg(to_jsonb(x)) from public.mensajes_especialista x, yo where x.participante_id = yo.id),
    'comunidad_reacciones', (select jsonb_agg(to_jsonb(x)) from public.reacciones_comunidad x, yo where x.participante_id = yo.id),
    'comunidad_grupos', (select jsonb_agg(jsonb_build_object('grupo', g.nombre, 'unido_en', m.unido_en))
                          from public.miembros_grupo m join public.grupos_comunidad g on g.id = m.grupo_id, yo where m.participante_id = yo.id),
    'comunidad_guardadas', (select jsonb_agg(to_jsonb(x)) from public.guardadas_comunidad x, yo where x.participante_id = yo.id),
    'comunidad_bloqueos', (select jsonb_agg(jsonb_build_object('alias', a.alias, 'desde', b.creado_en))
                            from public.bloqueos_comunidad b join public.alias a on a.participante_id = b.bloqueado, yo where b.bloqueador = yo.id),
    'desafios', (select jsonb_agg(jsonb_build_object('desafio', d.titulo, 'unido_en', x.unido_en))
                  from public.participaciones_desafio x join public.desafios d on d.id = x.desafio_id, yo where x.participante_id = yo.id),
    'propuestas_grupo', (select jsonb_agg(to_jsonb(x) - 'participante_id' - 'respondida_por') from public.propuestas_grupo x, yo where x.participante_id = yo.id),
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;


