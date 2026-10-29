# Borrado automático de fotos privadas (C21)

Las fotos de las acciones (bucket privado `evidencias`) se borran solas cuando vence su plazo.

## Reglas

| Foto | Se borra el archivo | Qué se conserva |
|---|---|---|
| Revisada (aprobada o no aprobada) | N días después de la revisión (`registros.revisado_en`) | Estado, nota del coach, fecha de revisión, créditos |
| Opcional (acción hecha con foto) | N días después de adjuntarse (`registros.foto_subida_en`, la anota la base) | La acción hecha y sus créditos |
| En revisión | Nunca por plazo | — |

- **N** es `ajustes_operacion.dias_conservar_foto`. Si está vacío, son 30 días.
- Al borrar una foto, el registro queda con `foto_ruta` vacía y la fecha en `foto_depurada_en`. En Mi espacio se ve: «La foto se borró a los 30 días de revisada…».
- Si otro registro usa el mismo archivo, ese archivo no se borra.

## Cómo funciona

1. **Tarea diaria.** La tarea programada `fotos-depurar` (pg_cron, 07:30 UTC) llama a la Edge Function `depurar-fotos` con pg_net. pg_cron trabaja en UTC, que no cambia con el horario de verano: en Chile corre a las 04:30 en horario de verano y a las 03:30 en invierno, siempre de madrugada, sin saltarse ni repetir ejecuciones. Los plazos se cuentan en horas exactas.
2. **Autenticación interna.** La llave `depurar_fotos_llave` vive solo en Vault. La crea la migración al azar, nadie la escribe y **nunca viaja**: cada llamada lleva la hora (`x-rumbo-hora`) y una firma HMAC-SHA256 de «hora:origen» (`x-rumbo-firma`). La firma vence a los 5 minutos y sirve una sola vez (`privado.depuracion_firmas`). Además, cambiar el origen la invalida. La función se despliega con `--no-verify-jwt`, pero antes de tocar nada le pide a la base que compruebe la firma; sin una firma válida responde 401 sin contenido.
3. **La función** usa la clave de servicio que Supabase le entrega por dentro. Esa clave **no** se guarda en GitHub ni en ningún otro lugar. La función no escribe registros y solo responde conteos y códigos cortos.
4. **Borrado de archivos:** la función borra con la API de Storage, nunca con SQL. Después, la base anota solo las fotos cuyo archivo ya no existe.
5. **Si algo falla,** nada se marca por error: lo que falló se reintenta al día siguiente. Si la persona cambió la foto mientras tanto, no queda como error.
6. **Archivos sin ningún registro:** se borran pasadas 48 horas. Antes de entregar cada archivo para borrar, la base toma un candado por ruta, vuelve a comprobar que ningún registro lo usa y lo reserva (`privado.depuracion_reservas`). Mientras la ruta está reservada, ningún registro puede empezar a usarla. Así, una subida o un registro simultáneo nunca termina apuntando a un archivo borrado. Las fotos vencidas siguen el mismo camino.
7. **Cierre y avisos.** Cada ejecución queda registrada en `privado.depuracion_fotos`. Si algo quedó mal, llega un aviso por ntfy sin datos personales ni rutas.
8. **Vigilancia independiente.** Otra tarea, `fotos-vigilar` (13:00 UTC, media mañana en Chile), avisa por ntfy si el borrado está activado pero la tarea diaria se apagó o pasaron más de 26 horas sin ejecución.
9. **Supervisión:** el dueño la revisa en el panel, en **Más → Mantención**. El estado lo calcula la base (`privado.estado_borrado_fotos`). Solo dice «Activo» si el borrado está configurado, la tarea está encendida y la última ejecución programada (de menos de 26 horas) terminó bien.

Mientras no exista el secreto `depurar_fotos_url`, la tarea no hace nada.

Código:
- `supabase/migrations/20261121000000_depurar_fotos.sql`
- `supabase/functions/depurar-fotos/`

Pruebas:
- `pruebas/base/depuracion.mjs`
- el paso «Borrado automático de fotos» de `base-de-datos.yml`

## Activación (la hace Diego, solo con su autorización)

1. **Respaldo** de la base, como siempre (`docs/respaldo-y-restauracion.md`).
2. **Aplicar la migración:** `npx supabase db push`, desde la carpeta del repositorio.
3. **Desplegar la función** desde la carpeta del repositorio, con la sesión de la CLI ya iniciada:

   ```
   npx supabase functions deploy depurar-fotos --project-ref jhukwxeeytedkjtwqowq --no-verify-jwt
   ```

   No hay que crear ningún secreto de la función: Supabase entrega `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. La llave interna ya la creó la migración en Vault.
4. **Activar.** En Supabase → SQL Editor, crear la dirección (una sola vez):

   ```sql
   select vault.create_secret('https://jhukwxeeytedkjtwqowq.supabase.co/functions/v1/depurar-fotos',
     'depurar_fotos_url', 'Dirección de la Edge Function depurar-fotos');
   ```
5. **Comprobar.** En el panel, abrir Más → Mantención: debe decir «Esperando la primera ejecución». Pulsar «Revisar ahora» y, pasado un minuto, «Actualizar». La última ejecución debe decir «Sin problemas». Después de la primera ejecución programada (a las 04:30 o 03:30, hora de Chile), debe decir «Activo».

## Desactivar

Hay dos formas:
- Borrar la dirección: `delete from vault.secrets where name = 'depurar_fotos_url';`. La tarea sigue programada, pero no hace nada.
- Deshacer todo con `supabase/deshacer/20261121000000_depurar_fotos.sql`.
