#!/usr/bin/env bash
# supabase db diff de public y privado, con la salida JSON en el archivo indicado.
# A veces el puerto de la base de comparación (54320) sigue ocupado por una corrida anterior.
# Solo en ese caso se reintenta con otro puerto (hasta 3 veces); cualquier otro error falla de inmediato.
set -uo pipefail
salida="$1"
for intento in 1 2 3; do
  if supabase db diff --db-url "$PGURL" -s public,privado --output-format json > "$salida" 2> "$salida.err"; then exit 0; fi
  cat "$salida.err"
  grep -qE "address already in use|port is already allocated" "$salida.err" && [ "$intento" -lt 3 ] || exit 1
  export SUPABASE_DB_SHADOW_PORT=$((54330 + intento))
  echo "puerto ocupado; reintento $((intento + 1)) con el puerto $SUPABASE_DB_SHADOW_PORT"
done
