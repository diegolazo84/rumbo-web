# Migraciones de la base (Etapa 1 de Rumbo 2.0)

Desde la Etapa 1, la estructura de la base de Supabase vive en `supabase/migrations/`, en
archivos numerados con fecha (`AAAAMMDDhhmmss_nombre.sql`) que se aplican en ese orden.

## Reglas

- Cada cambio de estructura es un archivo **nuevo** en `supabase/migrations/`. Nunca se edita un
  archivo que ya se pegó en producción.
- Desde Rumbo 2.0, cada migración nueva trae en `supabase/deshacer/` un archivo con el mismo
  nombre que la deshace. GitHub Actions comprueba que deja la base exactamente como antes.
- Toda tabla nueva entra con RLS y con casos nuevos en `pruebas/base/rls.mjs`, y se declara en
  `pruebas/base/matriz.mjs` (quién la lee y quién la escribe). Lo mismo para cada función que
  anon o authenticated puedan ejecutar. Si falta, GitHub Actions falla.
- La contraseña de la base y la dirección de conexión no se escriben en el chat, en este
  repositorio ni en GitHub Actions.
- Nada de lo que está aquí lee datos de personas ni secretos: solo nombres y definiciones.

## La línea base

Los 11 primeros archivos son los mismos que se pegaron entre el 8 y el 12 de octubre de 2026,
sin cambiar una línea, en el orden en que se pegaron. El número 12 recoge lo que la comparación
del 20 de octubre encontró en producción y no estaba en el repositorio: RLS activado por Supabase
en `privado.correos_equipo`, `privado.limites` y `privado.sales`, y `privado.avisar` sin un
comentario. En producción ya está así: **no se pega**, solo se registra.

| Versión | Archivo | Antes se llamaba |
|---|---|---|
| 20261008000000 | `20261008000000_esquema.sql` | `00-esquema.sql` |
| 20261008000001 | `20261008000001_funciones.sql` | `01-funciones.sql` |
| 20261008000002 | `20261008000002_rls.sql` | `02-rls.sql` |
| 20261008000003 | `20261008000003_storage.sql` | `03-storage.sql` |
| 20261008000004 | `20261008000004_auth.sql` | `04-auth.sql` |
| 20261008000005 | `20261008000005_avisos.sql` | `05-avisos.sql` |
| 20261008000006 | `20261008000006_cron.sql` | `06-cron.sql` |
| 20261008000007 | `20261008000007_semillas.sql` | `semillas.sql` |
| 20261008000008 | `20261008000008_feriados.sql` | `feriados-2026-2027.sql` |
| 20261008000009 | `20261008000009_etapa3.sql` | `07-etapa3.sql` |
| 20261012000000 | `20261012000000_avisos_ntfy.sql` | `08-avisos-ntfy.sql` |
| 20261020000000 | `20261020000000_alinear_produccion.sql` | (nuevo, ver abajo) |
| 20261022000000 | `20261022000000_roles_coach.sql` | (nuevo, A1: roles dueño y coach; **pendiente de aplicar, solo con autorización de Diego**; se deshace con `supabase/deshacer/20261022000000_roles_coach.sql`) |
| 20261023000000 | `20261023000000_auditoria_ver_con_motivo.sql` | (nuevo, A2: auditoría de cambios y «Ver con motivo»; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261024000000 | `20261024000000_perfil_coach.sql` | (nuevo, A3: perfil del coach y «Tu coach»; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261025000000 | `20261025000000_modulos.sql` | (nuevo, A4: configuración de módulos; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261026000000 | `20261026000000_avisos_sincronizados.sql` | (nuevo, A5: avisos dentro de la app y leídos sincronizados; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261027000000 | `20261027000000_indicadores.sql` | (nuevo, B3: indicadores de negocio para el dueño; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261028000000 | `20261028000000_bandeja_coach.sql` | (nuevo, B2: bandeja de seguimiento del coach; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261029000000 | `20261029000000_pagos.sql` | (nuevo, B4: registro manual de pagos y devoluciones; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261030000000 | `20261030000000_invitar_coaches.sql` | (nuevo, B5: invitar y gestionar coaches; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261031000000 | `20261031000000_fotos_en_cualquier_accion.sql` | (nuevo, C1: foto opcional en cualquier acción; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261101000000 | `20261101000000_videollamadas.sql` | (nuevo, C2: videollamada semanal del plan cercano; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261102000000 | `20261102000000_recordatorios.sql` | (nuevo, D1: recordatorios automáticos dentro de Rumbo; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261103000000 | `20261103000000_evolucion.sql` | (nuevo, C3: evolución semanal e informe de ciclo; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261104000000 | `20261104000000_medibles_y_plantillas.sql` | (nuevo, C4: acciones medibles y plantillas; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261105000000 | `20261105000000_alias_y_ranking.sql` | (nuevo, C5: alias y ranking semanal voluntario; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261106000000 | `20261106000000_comunidad.sql` | (nuevo, C6: comunidad con reglas, reportes y moderación; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261107000000 | `20261107000000_recordatorios_por_correo.sql` | (nuevo, D3: recordatorios por correo con Brevo, apagados sin claves; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261108000000 | `20261108000000_recompensas.sql` | (nuevo, E1: reconocimientos y beneficios; descuento apagado; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261109000000 | `20261109000000_asistente_ia.sql` | (nuevo, E2: asistente de IA con OpenAI, apagado; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261110000000 | `20261110000000_especialistas.sql` | (nuevo, E3: especialistas, perfiles y verificación; **pendiente de aplicar, solo con autorización de Diego**) |
| 20261111000000 | `20261111000000_especialistas_trabajo.sql` | (nuevo, E4: vínculos, reservas, seguimiento, recomendaciones, mensajes y comisiones; **pendiente de aplicar, solo con autorización de Diego**) |

Fuera de `migrations/` quedan las herramientas que no cambian la estructura:
`verificacion.sql`, `historial-migraciones.sql`, `restaurar-antes.sql` y `restaurar-despues.sql`.

## Cómo se compara producción con el repositorio

Se usan dos revisiones, porque ninguna cubre todo sola:

1. **`supabase db diff`** (herramienta oficial de Supabase). Arma en Docker una base aparte con
   `supabase/migrations/` y la compara con producción en los esquemas `public` y `privado`: tablas,
   columnas, funciones, políticas RLS, permisos, índices y disparadores. Solo lee el catálogo de
   la base, no filas.
2. **`supabase/verificacion.sql`** (en el SQL Editor). Cubre lo que la herramienta oficial no
   compara porque son filas o viven en esquemas que administra Supabase: las 3 tareas
   programadas (nombre, horario y comando), las 3 políticas de archivos, el bucket `evidencias`
   y el disparador sobre `auth.users`.

No se compara con `db diff` los esquemas `storage`, `auth` ni `cron`: Supabase los actualiza por
su cuenta y su versión en producción no es la del Supabase local, así que aparecerían
diferencias que no son nuestras (falsos positivos).

En GitHub Actions (`.github/workflows/base-de-datos.yml`) se prueba que: (a) los archivos pegados
como en el SQL Editor y los aplicados por la herramienta oficial dan una base idéntica (diferencia
vacía, sin falsos positivos del entorno local), y (b) las dos revisiones detectan cambios hechos a
mano en permisos, índices, funciones, tareas programadas, políticas de archivos, buckets y el
disparador de cuentas.

**Diferencia esperada en producción.** Si el proyecto se creó con «Enable automatic RLS», Supabase
agregó la función `public.rls_auto_enable()` (ver `restaurar-despues.sql`). No es de Rumbo:
`db diff` la mostrará y se acepta como conocida. Cualquier otra diferencia se revisa una por una.

## Paso A · Historial previo (solo lectura, SQL Editor)

Supabase → proyecto «rumbo» → SQL Editor → New query → pegar `supabase/historial-migraciones.sql`
→ Run. Responde una de estas líneas:

- `sin historial: no existe el esquema supabase_migrations`
- `sin historial: existe el esquema, pero no la tabla`
- `historial: tabla vacía`
- `historial: <versiones>`: ya hay registros. **No se registra nada** hasta revisar cuáles son.

Guarda la respuesta (captura o texto): es el estado «antes» para revertir el Paso C.

## Paso B · Comparación (solo lectura)

1. SQL Editor → pegar `supabase/verificacion.sql` → Run. Todas las filas deben decir `ok`.
2. En el Mac (mismas herramientas del respaldo semanal; Docker Desktop abierto), en la Terminal:

   ```
   brew upgrade supabase
   cd ~ && git clone https://github.com/diegolazo84/rumbo-web.git rumbo-web-etapa1 && cd rumbo-web-etapa1 && git checkout etapa-1
   ```

   (Después de integrar el PR basta `git checkout main && git pull`.)

3. Contraseña y dirección, igual que en `docs/respaldo-y-restauracion.md` (pasos 1 y 2: `read -rs
   PASS`, luego `export DBURL=…; unset PASS` y la prueba `psql "$DBURL" -Atc "select 'conexion ok'"`).
4. Comparación:

   ```
   supabase db diff --db-url "$DBURL" -s public,privado
   ```

   Resultado esperado: `No schema changes found`, o solo lo de `public.rls_auto_enable`. Copia el
   resultado en el chat: contiene definiciones de estructura (que ya son públicas en este
   repositorio), no datos ni claves.
5. `unset DBURL`.

## Paso C · Registrar la línea base (escribe solo en el historial)

Solo cuando el Paso A dijo «sin historial» o «tabla vacía», el Paso B salió sin diferencias (o
solo la esperada) y Diego lo autorizó por escrito.

**Qué registros se crean.** 12 filas en `supabase_migrations.schema_migrations`, una por versión
de la tabla de arriba, con `version`, `name` y `statements` (el texto del archivo). Si el esquema
o la tabla no existían, la herramienta los crea. **No se ejecuta el contenido de los archivos**: no
cambia ninguna tabla, función, permiso ni dato de Rumbo.

**Cómo comprobar que no existen antes.** El Paso A, el mismo día.

**Respaldo.** El respaldo semanal completo (`docs/respaldo-y-restauracion.md`) el mismo día, antes
de este paso, y la respuesta guardada del Paso A.

**Registro** (con `DBURL` cargada como en el Paso B, dentro de la carpeta del repositorio):

```
supabase migration repair --status applied 20261008000000 20261008000001 20261008000002 20261008000003 20261008000004 20261008000005 20261008000006 20261008000007 20261008000008 20261008000009 20261012000000 20261020000000 --db-url "$DBURL"
supabase migration list --db-url "$DBURL"
unset DBURL
```

`migration list` debe mostrar las 12 versiones con la misma fecha en las columnas Local y Remote.
Luego, en el SQL Editor, `supabase/historial-migraciones.sql` debe decir
`historial: 20261008000000 esquema, …, 20261020000000 alinear_produccion`.

**Cómo revertir solo esos registros.**

```
supabase migration repair --status reverted 20261008000000 20261008000001 20261008000002 20261008000003 20261008000004 20261008000005 20261008000006 20261008000007 20261008000008 20261008000009 20261012000000 20261020000000 --db-url "$DBURL"
```

Borra únicamente esas 12 filas del historial (probado en la base local: la tabla queda vacía y
nada más cambia). Si el Paso A había dicho «no existe el esquema supabase_migrations», se puede
dejar el esquema vacío (no afecta a nada) o quitarlo en el SQL Editor con
`drop schema supabase_migrations cascade;`, solo en ese caso.

## Próximas migraciones (desde la Etapa 2)

1. Claude agrega un archivo nuevo en `supabase/migrations/` en un PR; GitHub lo prueba en limpio.
2. Respaldo semanal y, si el cambio es grande, prueba en `rumbo-prueba`.
3. Diego pega el archivo en el SQL Editor y registra solo esa versión:
   `supabase migration repair --status applied <versión> --db-url "$DBURL"`.
4. Paso B otra vez: `verificacion.sql` en `ok` y `db diff` sin diferencias.
