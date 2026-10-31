-- R1 · Registrar acción (maqueta de ChatGPT, 30-oct-2026): nota opcional «¿Cómo te sentiste hoy?»
-- en cada acción ya marcada (hasta 200 caracteres). La escribe solo la persona; la leen ella, su
-- coach y el dueño (las políticas de registros no cambian) y entra en su copia de datos.
-- No cambia créditos, niveles, rachas ni el estado del registro.

alter table public.registros add column nota text check (nota is null or char_length(nota) between 1 and 200);

create or replace function public.anotar_nota(p_ocurrencia uuid, p_nota text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := privado.mi_participante_id(); v text := nullif(btrim(coalesce(p_nota, '')), '');
begin
  if v_yo is null then perform privado.error('sesion','sin_ficha','403'); end if;
  if not exists (select 1 from public.ocurrencias where id = p_ocurrencia and participante_id = v_yo) then
    perform privado.error('accion','no_encontrada','404');
  end if;
  if v is not null and char_length(v) > 200 then perform privado.error('nota','larga'); end if;
  update public.registros set nota = v, actualizado_en = now()
   where ocurrencia_id = p_ocurrencia and participante_id = v_yo and estado in ('hecha','en_revision','aprobada');
  if not found then perform privado.error('accion','sin_marcar','409'); end if;
end $$;
revoke all on function public.anotar_nota(uuid, text) from public, anon, authenticated;
grant execute on function public.anotar_nota(uuid, text) to authenticated;

-- Corrección: una nueva versión del programa conservaba las acciones pero perdía lo medible
-- (cantidad_objetivo y unidad, C4). Misma función de 20261022000000_roles_coach.sql + esas dos columnas.
create or replace function public.nuevo_borrador(p_ciclo uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_base public.programas%rowtype; v_nuevo uuid; m record; v_meta uuid; c public.ciclos%rowtype;
begin
  if not privado.gestiona((select cc.participante_id from public.ciclos cc where cc.id = p_ciclo)) then
    perform privado.error('sesion','no_autorizado','403'); end if;
  select id into v_nuevo from public.programas where ciclo_id = p_ciclo and estado = 'borrador';
  if v_nuevo is not null then return v_nuevo; end if;
  select * into c from public.ciclos where id = p_ciclo;
  select * into v_base from public.programas where ciclo_id = p_ciclo and estado = 'publicado';
  insert into public.programas (ciclo_id, participante_id, version)
  values (p_ciclo, c.participante_id, coalesce((select max(version) from public.programas where ciclo_id = p_ciclo), 0) + 1)
  returning id into v_nuevo;
  if v_base.id is not null then
    for m in select * from public.metas where programa_id = v_base.id loop
      insert into public.metas (programa_id, participante_id, clave, titulo, para_que, categoria, hitos, orden)
      values (v_nuevo, m.participante_id, m.clave, m.titulo, m.para_que, m.categoria, m.hitos, m.orden)
      returning id into v_meta;
      insert into public.acciones (programa_id, meta_id, titulo, instrucciones, version_corta, hora, duracion_min,
             dias, semana_desde, semanas, requiere_foto, cantidad_objetivo, unidad, orden)
      select v_nuevo, v_meta, titulo, instrucciones, version_corta, hora, duracion_min, dias, semana_desde,
             semanas, requiere_foto, cantidad_objetivo, unidad, orden from public.acciones where meta_id = m.id;
    end loop;
  end if;
  return v_nuevo;
end $$;
