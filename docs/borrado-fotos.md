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

1. **Tarea diaria.** La tarea programada `fotos-depurar` (pg_cron, 07:30 UTC) llama a la Edge Function `depurar-fotos` con pg_net y le envía la llave interna `depurar_fotos_token`.
2. **La llave interna** vive en Vault. La crea la migración al azar y nadie la escribe ni la copia.
3. **La función** usa la clave de servicio que Supabase le entrega por dentro. Esa clave **no** se guarda en GitHub ni en ningún otro lugar.
4. **Borrado de archivos:** la función borra con la API de Storage, nunca con SQL. Después, la base anota solo las fotos cuyo archivo ya no existe.
5. **Si algo falla,** nada se marca por error: lo que falló se reintenta al día siguiente.
6. **Archivos sin ningún registro:** se borran pasadas 48 horas. Ese margen protege las subidas que todavía están en curso.
7. **Cierre y avisos.** Cada ejecución queda registrada en `privado.depuracion_fotos`. Si algo quedó mal, llega un aviso por ntfy sin datos personales ni rutas. También avisa si la tarea lleva más de 2 días sin correr.
8. **Supervisión:** el dueño la revisa en el panel, en **Más → Mantención**.

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

   No hay que crear ningún secreto: Supabase entrega `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` a la función.
4. **Activar.** En Supabase → SQL Editor, crear la dirección (una sola vez):

   ```sql
   select vault.create_secret('https://jhukwxeeytedkjtwqowq.supabase.co/functions/v1/depurar-fotos',
     'depurar_fotos_url', 'Dirección de la Edge Function depurar-fotos');
   ```
5. **Comprobar.** En el panel, abrir Más → Mantención y comprobar que diga «Activo». Pulsar «Revisar ahora» y, pasado un minuto, «Actualizar». La última ejecución debe decir «Sin problemas».

## Desactivar

Hay dos formas:
- Borrar la dirección: `delete from vault.secrets where name = 'depurar_fotos_url';`. La tarea sigue programada, pero no hace nada.
- Deshacer todo con `supabase/deshacer/20261121000000_depurar_fotos.sql`.
