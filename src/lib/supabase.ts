// Cliente de Supabase para Mi espacio y el panel (plataforma 2.1 y 6.15). supabase-js se carga
// solo aquí, con import() dinámico: no pesa en la portada ni en las páginas públicas, que usan el
// cliente mínimo de src/lib/api.ts. Una sola instancia por pestaña.
// - Sesión en localStorage (queda abierta en el dispositivo, con refresco automático) o, con
//   «Estoy en un computador compartido», en sessionStorage: se cierra al cerrar el navegador (4.2.1).
// - detectSessionInUrl: false. El enlace del correo trae ?th= (token_hash) y lo verifica la
//   pantalla de ingreso con verifyOtp; nunca hay tokens de sesión en la URL.
// - Nunca se usa una clave secreta: solo la URL y la clave anon (publicable) de supabase-config.ts.
// Nunca se registra en consola un dato personal, un token ni un código.
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config";

export type Cliente = SupabaseClient;

// Clave de la sesión en el almacenamiento del navegador (las pruebas la usan para simularla).
export const CLAVE_SESION = "rumbo-sesion";
// Marca de «computador compartido» (vive en sessionStorage: se va con la pestaña).
const CLAVE_COMPARTIDO = "rumbo-sesion-compartida";

function almacen(tipo: "local" | "session"): Storage | null {
  try {
    return tipo === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null; // sin almacenamiento (modo privado estricto): la sesión dura lo que la pestaña
  }
}

const compartido = () => almacen("session")?.getItem(CLAVE_COMPARTIDO) === "1";

// «Estoy en un computador compartido»: se elige antes de pedir el código.
export function usarComputadorCompartido(si: boolean) {
  try {
    if (si) almacen("session")?.setItem(CLAVE_COMPARTIDO, "1");
    else almacen("session")?.removeItem(CLAVE_COMPARTIDO);
  } catch {
    /* sin almacenamiento */
  }
}

const memoria = new Map<string, string>();
// Lee de los dos almacenes (la sesión puede estar en cualquiera); escribe en el que corresponde.
const adaptador = {
  getItem(clave: string) {
    try {
      return almacen("session")?.getItem(clave) ?? almacen("local")?.getItem(clave) ?? memoria.get(clave) ?? null;
    } catch {
      return memoria.get(clave) ?? null;
    }
  },
  setItem(clave: string, valor: string) {
    try {
      const destino = compartido() ? almacen("session") : almacen("local");
      const otro = compartido() ? almacen("local") : almacen("session");
      if (destino) destino.setItem(clave, valor);
      else memoria.set(clave, valor);
      otro?.removeItem(clave);
    } catch {
      memoria.set(clave, valor);
    }
  },
  removeItem(clave: string) {
    memoria.delete(clave);
    try {
      almacen("local")?.removeItem(clave);
      almacen("session")?.removeItem(clave);
    } catch {
      /* sin almacenamiento */
    }
  },
};

let instancia: Promise<Cliente> | null = null;

export function supabase(): Promise<Cliente> {
  instancia ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: adaptador,
        storageKey: CLAVE_SESION,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "implicit",
      },
      global: { headers: { "X-Client-Info": "rumbo-web" } },
    }),
  );
  return instancia;
}

// ---------------------------------------------------------------------------
// Errores de la base: «campo:codigo» con estado HTTP (privado.error, SQLSTATE PTxxx → HTTP xxx).

export class ErrorBase extends Error {
  constructor(
    readonly estado: number,
    readonly campo: string | null = null,
    readonly codigo: string | null = null,
  ) {
    super(campo ? `${estado} ${campo}:${codigo}` : `error ${estado}`);
    this.name = "ErrorBase";
  }
  get esDeRed() {
    return this.estado === 0;
  }
}

type RespuestaPostgrest<T> = { data: T | null; error: { message?: string; code?: string } | null; status?: number };

// Convierte la respuesta de supabase-js en datos o en ErrorBase (sin registrar nada en consola).
export function datos<T>(r: RespuestaPostgrest<T>): T {
  if (!r.error) return r.data as T;
  const m = /^([a-z_]+):([a-z_]+)$/.exec((r.error.message ?? "").trim());
  // Sin respuesta del servidor, supabase-js deja status 0 (o sin status) y un mensaje de fetch.
  const estado = r.status ?? 0;
  throw new ErrorBase(estado, m?.[1] ?? null, m?.[2] ?? null);
}
