-- Etapa 3 (plataforma 10): ayudas para Mi espacio y el panel. Pegar en el editor SQL de Supabase
-- después de 00 a 06. Idempotente: se puede pegar más de una vez sin efectos dobles.
-- Si alguna vez se vuelve a pegar 01-funciones.sql, pegar también este archivo: 01 quita los
-- permisos de ejecución de todas las funciones y aquí se vuelven a dar.

-- 1. ¿La cuenta es del equipo? Sin exigir aal2: con esto el panel decide si pide el segundo
--    factor (TOTP) o dice que no hay acceso. No revela nada de otras cuentas.
create or replace function public.soy_equipo() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.equipo e where e.user_id = auth.uid());
$$;

-- 2. Contexto de Mi espacio: el «hoy» de la persona en su zona horaria (6.4), la ventana de
--    registro tardío y las semanas cuya revisión ya empezó y aún no se publica (para mostrar
--    «En revisión» sin leer la revisión sin publicar). null si la cuenta no tiene ficha.
create or replace function public.mi_contexto() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'hoy', privado.hoy_de(p.id),
    'dias_registro_tardio', a.dias_registro_tardio,
    'semanas_en_revision', coalesce((
      select jsonb_agg(r.semana order by r.semana)
      from public.revisiones r join public.ciclos c on c.id = r.ciclo_id
      where c.participante_id = p.id and c.estado <> 'cerrado' and r.publicada_en is null), '[]'::jsonb))
  from public.participantes p cross join public.ajustes_operacion a
  where p.id = privado.mi_participante_id();
$$;

-- 3. Ficha creada para un correo que ya tiene cuenta (por ejemplo, un segundo ciclo después de
--    cerrar el primero, o una cuenta del equipo que prueba su propio espacio): se vincula al
--    crearla. privado.vincular_cuenta (04-auth.sql) cubre el caso contrario: la cuenta llega después.
create or replace function privado.vincular_ficha() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  if new.user_id is null then
    select u.id into v from auth.users u where lower(u.email) = lower(new.correo::text) limit 1;
    if v is not null and not exists (select 1 from public.participantes p where p.user_id = v) then
      new.user_id := v;
      if new.estado = 'invitado' then new.estado := 'activo'; end if;
    end if;
  end if;
  return new;
end $$;
create or replace trigger vincular_ficha before insert on public.participantes
  for each row execute function privado.vincular_ficha();

-- 4. Permisos: solo la persona con sesión (nunca anon) ejecuta las dos funciones públicas.
revoke all on function public.soy_equipo(), public.mi_contexto() from public, anon, authenticated;
grant execute on function public.soy_equipo(), public.mi_contexto() to authenticated;
revoke all on function privado.vincular_ficha() from public, anon, authenticated;

-- PostgREST lee el esquema nuevo.
notify pgrst, 'reload schema';
