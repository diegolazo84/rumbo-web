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

## Una vez: preparar el computador

1. Instalar Docker Desktop (gratis para uso personal) y la CLI de Supabase
   (https://supabase.com/docs/guides/local-development/cli/getting-started).
2. Instalar 7-Zip (Windows) o Keka (Mac) para cifrar con AES-256.

## Cada semana: respaldo

1. En Supabase → botón «Connect» → copiar la cadena de conexión «Session pooler».
2. En una terminal, en una carpeta privada del computador (no dentro del repositorio):

   ```bash
   supabase db dump --db-url "<cadena con la contraseña>" -f roles.sql --role-only
   supabase db dump --db-url "<cadena con la contraseña>" -f esquema.sql
   supabase db dump --db-url "<cadena con la contraseña>" -f datos.sql --use-copy --data-only
   ```

   Son los comandos de la guía oficial de Supabase «Backup and restore using the CLI». En la
   primera restauración de prueba (abajo) se confirma que el respaldo trae todas las tablas,
   incluidas las cuentas de acceso.
3. Comprimir los tres archivos en `rumbo-AAAA-MM-DD.7z` con contraseña (AES-256 y «cifrar
   nombres de archivo»). Guardar esa contraseña en un gestor de contraseñas.
4. Borrar los `.sql` sin cifrar.
5. Guardar el `.7z` en dos lugares (computador y disco externo o nube personal).

Límites: no copia las claves de Vault (cifradas con una clave del proyecto) ni los archivos
del bucket `evidencias` (hoy vacío). Las claves de aviso se vuelven a cargar a mano tras una
restauración.

## Una vez al mes: restauración de prueba (sin tocar producción)

1. Descifrar el último `.7z` en una carpeta privada.
2. Levantar una base local vacía: en una carpeta nueva, `supabase init` y `supabase start`
   (corre en Docker, en el propio computador).
3. Restaurar en la base LOCAL (puerto 54322; nunca la cadena de producción):

   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --file roles.sql --file esquema.sql \
     --command 'SET session_replication_role = replica' --file datos.sql \
     --dbname "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
   ```

4. Comparar conteos. Correr esta consulta en producción (solo lectura) y en la local; deben
   coincidir:

   ```sql
   select 'solicitudes' t, count(*) from public.solicitudes
   union all select 'participantes', count(*) from public.participantes
   union all select 'ciclos', count(*) from public.ciclos
   union all select 'registros', count(*) from public.registros
   union all select 'registros_semanales', count(*) from public.registros_semanales
   union all select 'revisiones', count(*) from public.revisiones
   union all select 'cuentas', count(*) from auth.users;
   ```

5. Correr `supabase/verificacion.sql` en la local: debe decir «ok».
6. Apagar y borrar: `supabase stop --no-backup` y eliminar los `.sql` descifrados.
7. Anotar la fecha y el resultado (OK o diferencias) en un registro privado.

## Alternativa de pago

Plan Pro de Supabase (USD 25 al mes): copias diarias automáticas con 7 días de retención y
restauración desde el panel. El procedimiento manual sigue sirviendo como copia propia.
