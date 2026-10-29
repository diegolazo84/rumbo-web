// Borrado automático de fotos privadas (C21): la lógica, sin dependencias, para que la usen la
// Edge Function (Deno) y las pruebas de CI (Node) exactamente igual.
//
// Orden, pensado para que un fallo nunca deje información incorrecta:
// 1. La base entrega un lote de fotos vencidas (privado.fotos_con_plazo).
// 2. Se borran los archivos con la API de Storage (nunca con SQL).
// 3. La base anota como borradas solo las fotos cuyo archivo ya no existe. Las demás quedan como
//    fallo y se reintentan en la próxima ejecución. Si el archivo se borró pero la base no alcanzó
//    a anotarlo, la próxima ejecución lo anota (el archivo ya no está).
// 4. Archivos sin registro, pasado el período de seguridad: se borran.
// 5. La base cierra la ejecución con sus propios conteos y, si algo quedó mal, avisa por ntfy.
// Los errores se guardan como códigos cortos: nunca rutas, nombres ni mensajes con datos.

export const BUCKET = "evidencias";
export const LOTE = 100;
export const MAX_LOTES = 10;

// Código corto y sin datos para un error de Storage o de la base.
export function codigo(origen, e) {
  const estado = e?.statusCode ?? e?.status ?? e?.code ?? "";
  return `${origen}${estado ? `:${String(estado).slice(0, 20)}` : ""}`.replace(/[^\w:.-]/g, "").slice(0, 60);
}

// Lo que necesita depurar(), sobre un cliente de supabase-js con la clave de servicio.
export function adaptador(sb) {
  const rpc = async (fn, args) => {
    const { data, error } = await sb.rpc(fn, args);
    if (error) throw Object.assign(new Error(fn), { origen: "base", code: error.code });
    return data;
  };
  return {
    iniciar: (origen) => rpc("depuracion_iniciar", { p_origen: origen }),
    lote: (ejecucion, n) => rpc("depuracion_lote", { p_ejecucion: ejecucion, p_limite: n }),
    borrar: async (rutas) => {
      const { data, error } = await sb.storage.from(BUCKET).remove(rutas);
      if (error) throw Object.assign(new Error("storage"), { origen: "storage", statusCode: error.statusCode ?? error.status });
      return (data ?? []).length;
    },
    confirmar: (ejecucion, ids) => rpc("depuracion_confirmar", { p_ejecucion: ejecucion, p_ids: ids }),
    fallo: (ejecucion, ids, error) => rpc("depuracion_fallo", { p_ejecucion: ejecucion, p_ids: ids, p_error: error }),
    huerfanos: async () => ((await rpc("depuracion_huerfanos", {})) ?? []).map((f) => f.ruta),
    terminar: (ejecucion, huerfanos, error) =>
      rpc("depuracion_terminar", { p_ejecucion: ejecucion, p_huerfanos_borrados: huerfanos, p_error: error }),
  };
}

export async function depurar(api, { origen = "programada", lote = LOTE, maxLotes = MAX_LOTES } = {}) {
  const ejecucion = await api.iniciar(origen);
  if (ejecucion == null) return { estado: "omitida", motivo: "otra ejecución en curso" };
  let error = null;
  let huerfanos = 0;
  try {
    for (let i = 0; i < maxLotes; i++) {
      const filas = (await api.lote(ejecucion, lote)) ?? [];
      if (!filas.length) break;
      const ids = filas.map((f) => f.registro_id);
      let falla = null;
      try {
        await api.borrar(filas.map((f) => f.ruta));
      } catch (e) {
        falla = codigo(e.origen ?? "storage", e);
      }
      // Se confirma igual: la base solo anota las que de verdad ya no tienen archivo.
      let confirmados = [];
      try {
        confirmados = (await api.confirmar(ejecucion, ids)) ?? [];
      } catch (e) {
        falla = falla ?? codigo(e.origen ?? "base", e);
      }
      const pendientes = ids.filter((id) => !confirmados.includes(id));
      if (pendientes.length) await api.fallo(ejecucion, pendientes, falla ?? "archivo_sigue");
    }
    const rutas = (await api.huerfanos()) ?? [];
    if (rutas.length) {
      try {
        huerfanos = await api.borrar(rutas);
      } catch {
        /* quedan contados como archivos sin registro al terminar */
      }
    }
  } catch (e) {
    error = codigo(e.origen ?? "ejecucion", e);
  }
  return api.terminar(ejecucion, huerfanos, error);
}
