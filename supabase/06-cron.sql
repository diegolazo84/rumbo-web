-- Generado desde especificacion-plataforma.md §6. Pegar en el editor SQL de Supabase en orden.

create or replace function privado.tareas_por_hora() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from privado.limites where ventana < now() - interval '48 hours';
  delete from privado.sales where fecha < privado.hoy_chile() - 1;
  if extract(hour from now() at time zone 'America/Santiago') = 9 then perform privado.resumen_diario(); end if;
end $$;

create or replace function privado.aplicar_conservacion() returns void
language plpgsql security definer set search_path = '' as $$
declare a public.ajustes_operacion%rowtype; v_hoy date := privado.hoy_chile();
begin
  select * into a from public.ajustes_operacion;
  delete from public.solicitudes where eliminar_despues < v_hoy and estado = 'cerrada';
  if a.meses_conservar_interes is not null then
    delete from public.solicitudes where tipo = 'interes' and estado <> 'retirada'
       and creada_en < now() - make_interval(months => a.meses_conservar_interes);
  end if;
  delete from public.mensajes_contacto where eliminar_despues < v_hoy;
  delete from public.auditoria where en < now() - interval '24 months';
  -- Fotos y participantes no se borran solos: aparecen en Hoy como tarea para Diego (5.3).
end $$;

select cron.schedule('rumbo-por-hora',     '5 * * * *',  $$select privado.tareas_por_hora()$$);
select cron.schedule('rumbo-recalcular',   '15 5 * * *', $$select privado.recalcular_todo()$$);       -- 01:15/02:15 en Chile
select cron.schedule('rumbo-conservacion', '30 6 * * *', $$select privado.aplicar_conservacion()$$);
