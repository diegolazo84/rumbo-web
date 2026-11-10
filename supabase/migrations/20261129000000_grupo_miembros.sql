-- C14 · Interior de un grupo (maqueta de ChatGPT, 29-oct-2026): la pestaña «Miembros».
-- Solo quien es miembro del grupo (o el equipo que modera) ve la lista, y solo con alias: sin
-- nombre, correo ni ficha. No aparecen las personas bloqueadas entre sí ni las fichas no activas.
create function public.comunidad_miembros_grupo(p_grupo uuid)
returns table (alias text, unido_en timestamptz, soy_yo boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_yo uuid; v_mod boolean := privado.puede_moderar();
begin
  if v_mod then v_yo := privado.mi_participante_id(); else v_yo := privado.en_comunidad(); end if;
  if not exists (select 1 from public.grupos_comunidad g where g.id = p_grupo and (g.activo or v_mod)) then
    perform privado.error('grupo','no_encontrado','404');
  end if;
  if not v_mod and not exists (select 1 from public.miembros_grupo m where m.grupo_id = p_grupo and m.participante_id = v_yo) then
    perform privado.error('grupo','no_miembro','403');
  end if;
  return query
  select a.alias::text, m.unido_en, m.participante_id is not distinct from v_yo
    from public.miembros_grupo m
    join public.alias a on a.participante_id = m.participante_id
    join public.participantes p on p.id = m.participante_id and p.estado = 'activo'
   where m.grupo_id = p_grupo
     and (m.participante_id is not distinct from v_yo or v_yo is null or not privado.bloqueados_entre(m.participante_id, v_yo))
   order by (m.participante_id is not distinct from v_yo) desc, m.unido_en, a.alias
   limit 500;
end $$;
revoke all on function public.comunidad_miembros_grupo(uuid) from public, anon, authenticated;
grant execute on function public.comunidad_miembros_grupo(uuid) to authenticated;
