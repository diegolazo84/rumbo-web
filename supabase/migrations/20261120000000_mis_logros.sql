-- C17 · Mis logros: la persona puede saber si el descuento por renovación está activo, para que
-- la tarjeta «Mis recompensas» aparezca sola cuando el dueño lo active (y se oculte si lo apaga).
-- Solo lee: no cambia beneficios, niveles, créditos, rachas ni reconocimientos. Las personas no
-- leen la tabla beneficios; esta función devuelve solo lo que la tarjeta muestra.
create or replace function public.mi_beneficio_renovacion()
returns table (nombre text, descripcion text, porcentaje smallint, dias_ciclo smallint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if privado.mi_participante_id() is null then perform privado.error('sesion','sin_ficha','403'); end if;
  return query select b.nombre, b.descripcion, b.porcentaje, b.dias_ciclo
    from public.beneficios b
   where b.tipo = 'descuento_renovacion' and b.activo
   order by b.activado_en desc nulls last
   limit 1;
end $$;
revoke all on function public.mi_beneficio_renovacion() from public, anon, authenticated;
grant execute on function public.mi_beneficio_renovacion() to authenticated;
