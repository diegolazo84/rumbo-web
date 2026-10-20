# Eliminación de cuentas: problema actual y solución propuesta

Preparado el 12 de octubre de 2026 (Etapa 0). **Solo documento**: no se ejecuta ninguna
eliminación ni cambio en la base hasta que Diego lo apruebe en una etapa posterior.

## Cómo funciona hoy

La eliminación desde el panel tiene 3 pasos (especificación 6.11):

1. Borrar las fotos del participante en el bucket `evidencias` (hoy no hay fotos: la subida
   está apagada).
2. `public.eliminar_participante(id)` (`supabase/01-funciones.sql`): anonimiza la solicitud
   (nombre, correo, meta, acuerdo, etc. quedan vacíos y el estado pasa a `retirada`) y borra la
   fila de `participantes`; en cascada se borran ciclos, programas, metas, acciones, registros,
   progreso, registros semanales, revisiones y solicitudes de ajuste. Deja una fila en
   `auditoria` con el id, sin datos personales.
3. Manual.

## Qué queda sin borrar (eliminación incompleta)

| Dato | Dónde queda | Por qué |
|---|---|---|
| Correo y cuenta de acceso | `auth.users` (y sus sesiones y factores) | La función no puede borrar en el esquema `auth`; `participantes.user_id` es `on delete set null`, al revés |
| Mensajes de contacto | `mensajes_contacto` (correo, nombre, mensaje) | No están ligados al participante |
| Peticiones de derechos | `peticiones_derechos.correo` | Se conservan como registro de la petición |
| Eventos de la solicitud | `solicitudes_eventos` | Se mantienen mientras exista la solicitud anonimizada |
| Correos enviados | Brevo (registro de envíos) y bandeja de Gmail | Fuera de Supabase |
| Copias de seguridad | Respaldos de Supabase, si se activan | Se borran solos al vencer el plazo del respaldo |

Riesgo: si la persona vuelve a pedir código con el mismo correo, su cuenta de acceso aún existe.

## Solución propuesta (para una etapa posterior)

1. **Autenticación**: una Edge Function `eliminar-cuenta`, que solo puede llamar alguien del
   equipo con segundo factor, que llame a `auth.admin.deleteUser(user_id)` con la clave de
   servicio guardada como secreto de la función (nunca en la web ni en el chat). Orden: guardar
   `user_id` → `eliminar_participante` → borrar la cuenta de acceso.
2. **Datos personales**: ampliar `eliminar_participante` para anonimizar `mensajes_contacto` del
   mismo correo y dejar en `peticiones_derechos` solo un resumen (tipo, fecha, resultado) sin
   correo, una vez cumplido el plazo que fije la revisión legal.
3. **Archivos (fotos futuras)**: la misma Edge Function borra la carpeta `evidencias/<id>/`
   antes del paso 2, así el procedimiento queda en un solo botón.
4. **Conversaciones futuras (asistente IA, comunidad)**: toda tabla nueva con datos de una
   persona debe referenciar `participantes(id) on delete cascade`, o anonimizarse en la misma
   función. Lo publicado en la comunidad se reemplaza por «publicación eliminada».
5. **Fuera de Supabase**: lista de verificación manual para Gmail y Brevo (borrar o anonimizar
   registros cuando la herramienta lo permita).
6. **Comprobación**: la consulta 6 de `docs/supabase-pendientes.md` debe dar 0, y una prueba
   en `pruebas/base/rls.mjs` que cree y elimine un participante de prueba en la base local.
7. **Respuesta a la persona**: confirmar por correo que se eliminaron sus datos y qué se
   conserva por obligación legal (por ejemplo, documentos tributarios).

Qué se conserva y por cuánto tiempo lo decide la revisión legal (`docs/revision-legal.md`, punto 8).
