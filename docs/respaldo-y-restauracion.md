# Respaldo manual y restauración de prueba

Procedimiento para el plan gratis de Supabase, que no incluye copias descargables. **No
modifica producción**: el respaldo solo lee, y la restauración se hace en una base aparte.

## Reglas

- La contraseña de la base y la cadena de conexión no se escriben en el chat, en este
  repositorio ni en GitHub Actions: el repositorio es público y los artefactos de Actions
  pueden descargarse.
- El archivo de respaldo contiene datos personales: se cifra antes de guardarlo y no se sube a
  ningún servicio sin cifrar.
- Frecuencia propuesta: semanal (por ejemplo, el lunes) y antes de cada publicación que toque
  la base. Conservar las últimas 4.

## Una vez: preparar el computador (Mac)

1. Homebrew (https://brew.sh), y en la Terminal:
   `brew install --cask docker-desktop` y `brew install supabase/tap/supabase libpq && brew link --force libpq`.
2. Abrir Docker Desktop (sin cuenta). `supabase telemetry disable` es opcional.
3. Carpeta privada: `mkdir -p ~/Rumbo-respaldos && chmod 700 ~/Rumbo-respaldos`.
4. Dejar al menos 2 GB libres en el disco (la copia la hace Docker).

## Cada semana: respaldo

En Supabase (proyecto «rumbo») → «Connect» → «Session pooler»: la dirección trae
`[YOUR-PASSWORD]` en lugar de la contraseña. En la Terminal, dentro de `~/Rumbo-respaldos`:

1. **Contraseña, oculta y sola** (pegar esta línea sola; si se pegan varias juntas, la Terminal
   toma la siguiente línea como contraseña):

   ```
   echo -n "Contraseña de la base: "; read -rs PASS; echo
   ```

2. **Dirección y prueba de conexión** (cambiar REF y HOST por los de la dirección copiada; hoy
   `jhukwxeeytedkjtwqowq` y `aws-0-sa-east-1.pooler.supabase.com`):

   ```
   export DBURL="postgresql://postgres.REF:$(printf %s "$PASS" | perl -pe 's/([^A-Za-z0-9._~-])/sprintf("%%%02X",ord($1))/ge')@HOST:5432/postgres"; unset PASS
   psql "$DBURL" -Atc "select 'conexion ok'"
   ```

3. **Copia** (solo lee producción):

   ```
   F=$(date +%Y-%m-%d)
   supabase db dump --db-url "$DBURL" -f roles-$F.sql --role-only
   supabase db dump --db-url "$DBURL" -f esquema-$F.sql
   supabase db dump --db-url "$DBURL" -f datos-$F.sql --use-copy --data-only
   ```

   La advertencia «circular foreign-key constraints … solicitudes» es esperable.

4. **Conteo de producción** en el mismo momento (solo nombres de tablas y números):

   ```
   psql "$DBURL" -At -F ' | ' -c "select n.nspname || '.' || c.relname, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', n.nspname, c.relname), false, true, '')))[1]::text from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind = 'r' and n.nspname in ('public','privado','auth') order by 1" > conteo-produccion-$F.txt
   unset DBURL
   ```

5. **Cifrar**: comprimir los `.sql` y el conteo en `rumbo-AAAA-MM-DD.7z` con contraseña
   (AES-256, «cifrar nombres de archivo»; en Mac, Keka), guardar esa contraseña en el gestor
   de contraseñas, borrar los `.sql` sin cifrar y guardar el `.7z` en dos lugares.

Límites: no copia las claves de Vault (cifradas con una clave del proyecto), las tareas
programadas, el disparador sobre `auth.users` ni la configuración del proyecto (hook, SMTP,
plantillas, Site URL). La restauración los rehace con `supabase/restaurar-despues.sql` y el panel.

## Una vez al mes: restauración de prueba (sin tocar producción)

Se hace en un proyecto gratis aparte, «rumbo-prueba» (el plan Free permite dos), que se borra al
terminar porque contiene una copia de los datos. No necesita espacio en el disco del Mac.

1. Crear el proyecto `rumbo-prueba` (São Paulo, Free), con su propia contraseña.
2. En su SQL Editor, pegar `supabase/restaurar-antes.sql` (quita los permisos que un proyecto
   nuevo da por defecto; sin esto lo restaurado queda más abierto que producción).
3. Conectar como en el respaldo, con otra variable (`PRUEBAURL`) y la dirección de
   `rumbo-prueba`. Comprobar que está vacío: `psql "$PRUEBAURL" -Atc "select count(*) from information_schema.tables where table_schema = 'public'"` debe dar 0.
4. Filtrar las tablas internas de archivos que Supabase no deja escribir y restaurar en una sola
   transacción (el archivo de roles no se usa: solo trae ajustes internos que un proyecto nuevo
   ya tiene y no permite cambiar):

   ```
   awk '/^COPY "?storage"?\./ { if ($2 !~ /\.("?buckets"?|"?objects"?)$/) { salta=1; next } } salta { if ($0 == "\\.") salta=0; next } { print }' datos-$F.sql > datos-$F-restaurar.sql
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --file esquema-$F.sql \
     --command 'SET session_replication_role = replica' --file datos-$F-restaurar.sql \
     --dbname "$PRUEBAURL" > restauracion-$F.log 2>&1; echo "resultado: $?"
   ```

   Debe decir `resultado: 0`.
5. En el SQL Editor de `rumbo-prueba`, pegar `supabase/restaurar-despues.sql`.
6. Comparar conteos: correr la consulta del paso 4 del respaldo contra `$PRUEBAURL`, guardarla en
   `conteo-prueba-$F.txt` y `diff conteo-produccion-$F.txt conteo-prueba-$F.txt`: sin diferencias.
7. Pegar `supabase/verificacion.sql` en `rumbo-prueba`: todo «ok» salvo «tareas programadas
   creadas» (en la prueba no se crean, para que no corran).
8. Borrar el proyecto `rumbo-prueba` (Project Settings → General → Delete project), `unset
   PRUEBAURL` y borrar los `.sql` sin cifrar.
9. Anotar fecha y resultado en un registro privado.

## Alternativa de pago

Plan Pro de Supabase (USD 25 al mes): copias diarias automáticas con 7 días de retención y
restauración desde el panel. El procedimiento manual sigue sirviendo como copia propia.
