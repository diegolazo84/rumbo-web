-- Funciones siempre presentes (pedido de Diego, 20-nov-2026): avisos, recordatorios,
-- reconocimientos, fotos, ranking, informes y la app instalable dejan de depender de un
-- interruptor. Están siempre para todas las personas; lo que cada una decide (recordatorios,
-- correo, entrar al ranking, subir una foto) sigue siendo su preferencia.
-- Siguen dependiendo del dueño: comunidad, asistente con IA, WhatsApp, especialistas, pagos en
-- línea, IA avanzada y cuenta gratis.

create or replace function public.modulo_visible(p_clave text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_clave in ('notificaciones','recordatorios','reconocimientos','fotos','ranking','informes','app_movil')
      or coalesce((select estado in ('habilitado','operativo') from public.modulos where clave = p_clave), false);
$$;
revoke all on function public.modulo_visible(text) from public, anon;
grant execute on function public.modulo_visible(text) to authenticated;

update public.modulos m set
  estado = 'operativo',
  probado_en = coalesce(m.probado_en, now()),
  respaldo = v.respaldo,
  que_falta = v.que_falta,
  cambiado_en = now()
from (values
  ('notificaciones', 'Siempre presente: Mis avisos con campana, filtros y búsqueda.', 'Avisos de la comunidad: al abrir la comunidad.'),
  ('recordatorios', 'Siempre presente: cada persona elige qué, cuándo y si llegan por correo. Envío cada hora.', 'Correo: clave de Brevo en Vault. Avisos en el teléfono: más adelante.'),
  ('reconocimientos', 'Siempre presente: 6 reconocimientos automáticos en Mis logros.', 'El 10 % de renovación se activa en Reconocimientos y beneficio.'),
  ('fotos', 'Siempre presente: foto opcional y privada en cualquier acción, con miniatura.', 'Borrado a los 30 días: desplegar la función depurar-fotos (docs/borrado-fotos.md).'),
  ('ranking', 'Siempre presente: voluntario, con alias, desde Mis logros. Se ve con 3 o más personas.', null),
  ('informes', 'Siempre presente: evolución semanal e informe de cierre de ciclo.', null),
  ('app_movil', 'Siempre presente: Mi espacio se instala en el teléfono.', 'Avisos en el teléfono: más adelante.')
) as v(clave, respaldo, que_falta)
where m.clave = v.clave;
