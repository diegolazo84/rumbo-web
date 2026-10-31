-- Deshace 20261123000000_nota_registro.sql: quita la función y la columna (las notas escritas se pierden).
drop function public.anotar_nota(uuid, text);
alter table public.registros drop column nota;

-- nuevo_borrador vuelve a su versión de 20261022000000_roles_coach.sql.
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
             dias, semana_desde, semanas, requiere_foto, orden)
      select v_nuevo, v_meta, titulo, instrucciones, version_corta, hora, duracion_min, dias, semana_desde,
             semanas, requiere_foto, orden from public.acciones where meta_id = m.id;
    end loop;
  end if;
  return v_nuevo;
end $$;
