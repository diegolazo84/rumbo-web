-- Deshace 20261108000000_recompensas.sql
-- Restaura registrar_pago (B4), tareas_por_hora (D1) y exportar_mis_datos (C6).
create or replace function public.registrar_pago(p_ciclo uuid, p_medio text, p_pagado_en date,
  p_monto integer default null, p_moneda text default 'CLP', p_referencia text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare c public.ciclos%rowtype; v_id uuid; v_monto integer;
begin
  if not privado.es_dueno() then perform privado.error('sesion','no_autorizado','403'); end if;
  select * into c from public.ciclos where id = p_ciclo;
  if c.id is null then perform privado.error('ciclo','no_encontrado','404'); end if;
  if p_moneda not in ('CLP','USD') then perform privado.error('moneda','invalida'); end if;
  if p_medio not in ('transferencia','paypal') then perform privado.error('medio','invalido'); end if;
  if p_pagado_en is null or p_pagado_en > current_date then perform privado.error('fecha','invalida'); end if;
  v_monto := coalesce(p_monto, case when p_moneda = 'CLP' then c.precio_acordado_clp end);
  if v_monto is null or v_monto <= 0 then perform privado.error('monto','invalido'); end if;
  if exists (select 1 from public.pagos where ciclo_id = p_ciclo) then perform privado.error('pago','ya_registrado','409'); end if;
  insert into public.pagos (participante_id, ciclo_id, monto, moneda, medio, pagado_en, referencia, registrado_por)
  values (c.participante_id, c.id, v_monto, p_moneda, p_medio, p_pagado_en, nullif(btrim(p_referencia), ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function privado.tareas_por_hora() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from privado.limites where ventana < now() - interval '48 hours';
  delete from privado.sales where fecha < privado.hoy_chile() - 1;
  if extract(hour from now() at time zone 'America/Santiago') = 9 then perform privado.resumen_diario(); end if;
  perform privado.enviar_recordatorios();
end $$;

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
    'progreso', (select to_jsonb(g) from public.progreso g, yo where g.participante_id = yo.id));
$$;
drop function if exists public.mis_beneficios();
drop function if exists public.aplicar_beneficio(uuid, uuid);
drop function if exists public.otorgar_beneficio(uuid, uuid, text);
drop function if exists privado.evaluar_beneficios(date);
drop function if exists public.guardar_beneficio(uuid, jsonb);
drop function if exists public.mis_reconocimientos();
drop function if exists privado.otorgar_reconocimientos(date);
drop function if exists public.guardar_reconocimiento(text, jsonb);
drop table if exists public.beneficios_otorgados;
drop table if exists public.beneficios;
drop table if exists public.reconocimientos_otorgados;
drop table if exists public.reconocimientos;
delete from public.avisos where tipo in ('reconocimiento','beneficio_disponible');
alter table public.avisos drop constraint avisos_tipo_check;
alter table public.avisos add constraint avisos_tipo_check check (tipo in ('revision_publicada','ajuste_respondido',
  'programa_publicado','registro_enviado','ajuste_pedido','videollamada_programada',
  'recordatorio_acciones','recordatorio_registro','reporte_comunidad'));
