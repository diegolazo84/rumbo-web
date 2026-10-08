// Cliente mínimo de las páginas públicas /postular/, /estado/ y /contacto/ (plataforma 2.1 y
// 6.6): `fetch` a las RPC públicas de Supabase, sin supabase-js. Una sola implementación.
// - POST {SUPABASE_URL}/rest/v1/rpc/{nombre} con la clave anon (pública por diseño).
// - Tiempo máximo por llamada (15 s al enviar, 3.12).
// - Los errores de la base llegan como «campo:codigo» con estado HTTP (privado.error, SQLSTATE
//   PTxxx → HTTP xxx). Aquí se clasifican; el texto de cada campo sale de formularios.ts.
// Nunca se registra en consola un dato personal ni el token.
import {
  CONTACTO,
  CORREO,
  NOMBRE,
  POSTULAR,
  type DatosContacto,
  type DatosPostular,
  type ModoPostular,
} from "../data/formularios";
import type { Iso } from "./fechas";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config";

export const TIEMPO_ENVIO_MS = 15_000;
const TIEMPO_LECTURA_MS = 10_000;

// ---------------------------------------------------------------------------
// Errores

export type TipoError =
  | "red" // sin respuesta: conexión caída o bloqueada
  | "tiempo" // pasó el tiempo máximo
  | "validacion" // 400 con campo:codigo
  | "limite" // 429: demasiados envíos (3.11)
  | "cerradas" // 409 postulaciones:cerradas (3.9)
  | "no_encontrada" // 404 token:no_encontrada
  | "conflicto" // otro 409 (estado:con_espacio, estado:sin_acuerdo, version:desactualizada)
  | "servidor"; // 5xx, proyecto en pausa, respuesta inesperada

export class ErrorApi extends Error {
  constructor(
    readonly tipo: TipoError,
    readonly estado = 0,
    readonly campo: string | null = null,
    readonly codigo: string | null = null,
  ) {
    super(campo ? `${tipo} ${estado} ${campo}:${codigo}` : `${tipo} ${estado}`);
    this.name = "ErrorApi";
  }
  // Fallo de conexión (se reintenta con el mismo token, 3.12).
  get esDeRed() {
    return this.tipo === "red" || this.tipo === "tiempo";
  }
}

// «campo:codigo» del mensaje de PostgREST.
function campoCodigo(cuerpo: unknown): [string | null, string | null] {
  const mensaje = typeof cuerpo === "object" && cuerpo && "message" in cuerpo ? String(cuerpo.message) : "";
  const m = /^([a-z_]+):([a-z_]+)$/.exec(mensaje.trim());
  return m ? [m[1], m[2]] : [null, null];
}

function clasificar(estado: number, cuerpo: unknown): ErrorApi {
  const [campo, codigo] = campoCodigo(cuerpo);
  if (estado === 429) return new ErrorApi("limite", estado, campo, codigo);
  if (estado === 409 && campo === "postulaciones" && codigo === "cerradas") return new ErrorApi("cerradas", estado, campo, codigo);
  if (estado === 409) return new ErrorApi("conflicto", estado, campo, codigo);
  if (estado === 404 && campo === "token") return new ErrorApi("no_encontrada", estado, campo, codigo);
  if (estado === 400 && campo) return new ErrorApi("validacion", estado, campo, codigo);
  return new ErrorApi("servidor", estado, campo, codigo);
}

// ---------------------------------------------------------------------------
// Llamada

export async function rpc<T>(nombre: string, cuerpo: Record<string, unknown> = {}, tiempo = TIEMPO_LECTURA_MS): Promise<T> {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), tiempo);
  const cabeceras: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  // La clave anon antigua es un JWT y va también como Bearer; la publicable (sb_publishable_…) no.
  if (SUPABASE_ANON_KEY.startsWith("eyJ")) cabeceras.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  let respuesta: Response;
  try {
    respuesta = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${nombre}`, {
      method: "POST",
      headers: cabeceras,
      body: JSON.stringify(cuerpo),
      signal: control.signal,
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
  } catch {
    throw new ErrorApi(control.signal.aborted ? "tiempo" : "red");
  } finally {
    clearTimeout(temporizador);
  }
  let datos: unknown = null;
  try {
    const texto = await respuesta.text();
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    if (respuesta.ok) throw new ErrorApi("servidor", respuesta.status);
  }
  if (!respuesta.ok) throw clasificar(respuesta.status, datos);
  return datos as T;
}

// ---------------------------------------------------------------------------
// Token de la solicitud: 32 bytes aleatorios en base64url (43 caracteres). Lo genera el
// navegador y es también la clave de idempotencia: un reintento con el mismo token nunca duplica.

export function nuevoToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export const esToken = (t: string) => /^[A-Za-z0-9_-]{43}$/.test(t);

// ---------------------------------------------------------------------------
// RPC públicas (6.6)

export type EstadoPostulaciones = {
  abiertas: boolean;
  motivo: "cerradas" | "tope";
  responder_antes: Iso | null;
  ausencia: { hasta: Iso; texto: string | null } | null;
};
export const estadoPostulaciones = () => rpc<EstadoPostulaciones | null>("estado_postulaciones");

export type EnvioSolicitud = {
  token: string;
  tipo: "solicitud" | "interes";
  nombre: string;
  correo: string;
  area: string | null;
  meta: string | null;
  apoyo: string | null;
  dias: string[];
  franjas: string[];
  horarios_nota: string | null;
  zona_horaria: string | null;
  mayor_edad: boolean;
  autorizacion: boolean;
  texto_autorizacion: string;
  avisos_futuros: boolean;
  origen: Record<string, string> | null;
  ms: number;
  campo_extra_7: string;
};
export type RespuestaEnvio = { tipo: "solicitud" | "interes"; creada_en: string; responder_antes: Iso | null };
export const enviarSolicitud = (p: EnvioSolicitud) => rpc<RespuestaEnvio>("enviar_solicitud", { p }, TIEMPO_ENVIO_MS);

export type EstadoSolicitud = "recibida" | "en_revision" | "respondida" | "acordada" | "con_espacio" | "cerrada" | "retirada";
export type Acuerdo = {
  plan: string;
  precio_clp?: number | null;
  inicio: Iso;
  semanas: number;
  dia_revision: number; // 1 = lunes … 5 = viernes
  hora_videollamada?: string | null; // «19:00» o «19:00:00», hora de Chile; solo cercano
};
export type Solicitud = {
  tipo: "solicitud" | "interes";
  estado: EstadoSolicitud;
  cerrada_en?: string | null;
  motivo_cierre?: "capacidad" | "alcance" | "sin_respuesta" | "avisado" | null;
  nota_cierre?: string | null;
  nombre?: string | null;
  correo?: string | null; // enmascarado por la base: «d•••@gmail.com»
  area?: string | null;
  apoyo?: string | null;
  meta?: string | null;
  dias?: string[] | null;
  franjas?: string[] | null;
  horarios_nota?: string | null;
  creada_en?: string | null;
  responder_antes?: Iso | null;
  respondida_en?: string | null;
  con_atraso?: boolean | null;
  acuerdo?: Acuerdo | null;
  condiciones_aceptadas?: { version: string; fecha: string } | null;
  version_condiciones?: string | null;
};
// null: token mal formado, ajeno o de una solicitud borrada (la base no distingue).
export const verSolicitud = (token: string) => rpc<Solicitud | null>("ver_solicitud", { p_token: token });
export const retirarSolicitud = (token: string) =>
  rpc<{ cerrada_en: string | null }>("retirar_solicitud", { p_token: token }, TIEMPO_ENVIO_MS);
export const aceptarAcuerdo = (token: string, version: string, texto: string) =>
  rpc<{ fecha: string; version: string }>(
    "aceptar_acuerdo",
    { p_token: token, p_version: version, p_texto: texto },
    TIEMPO_ENVIO_MS,
  );

export type EnvioMensaje = {
  motivo: string;
  nombre: string | null;
  correo: string;
  mensaje: string;
  ms: number;
  campo_extra_7: string;
};
export const enviarMensaje = (p: EnvioMensaje) => rpc<{ ok: boolean }>("enviar_mensaje", { p }, TIEMPO_ENVIO_MS);

// ---------------------------------------------------------------------------
// Errores de validación del servidor → campo y texto de formularios.ts (3.12: «El servidor
// devuelve campo:codigo; el texto lo pone el cliente»). null: el código no corresponde a un
// campo que la persona pueda corregir (se muestra como servidor no disponible).

export function errorPostular(e: ErrorApi, modo: ModoPostular): { campo: keyof DatosPostular; texto: string } | null {
  const { campo, codigo } = e;
  switch (campo) {
    case "area":
      return { campo: "area", texto: POSTULAR.area.error };
    case "meta":
      if (codigo === "vacio") return { campo: "meta", texto: POSTULAR.meta.errores.vacio };
      if (codigo === "corto") return { campo: "meta", texto: POSTULAR.meta.errores.corto };
      return null;
    case "apoyo":
      return { campo: "apoyo", texto: POSTULAR.apoyo.error };
    case "nombre":
      return { campo: "nombre", texto: codigo === "formato" ? NOMBRE.errores.invalido : NOMBRE.errores.vacio };
    case "correo":
      return { campo: "correo", texto: codigo === "vacio" ? CORREO.errores.vacio : CORREO.errores.formato };
    case "mayor_edad":
      return { campo: "mayorEdad", texto: POSTULAR.mayorEdad.error };
    case "autorizacion":
      return {
        campo: "autorizacion",
        texto:
          modo === "solicitud"
            ? POSTULAR.autorizacion.error
            : modo === "cerradas"
              ? POSTULAR.cerradas.autorizacion.error
              : POSTULAR.autorizacionInteres.error,
      };
    default:
      return null;
  }
}

export function errorContacto(e: ErrorApi): { campo: keyof DatosContacto; texto: string } | null {
  const { campo, codigo } = e;
  switch (campo) {
    case "motivo":
      return { campo: "motivo", texto: CONTACTO.motivo.error };
    case "correo":
      return { campo: "correo", texto: codigo === "vacio" ? CORREO.errores.vacio : CORREO.errores.formato };
    case "mensaje":
      if (codigo === "vacio") return { campo: "mensaje", texto: CONTACTO.mensaje.errores.vacio };
      if (codigo === "corto") return { campo: "mensaje", texto: CONTACTO.mensaje.errores.corto };
      return null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Fechas del servidor (marcas de tiempo) en hora de Chile, solo en el navegador: el
// prerender nunca las muestra (lib/fechas.ts trabaja sin Intl para no romper la hidratación).

export function enChile(marca: string): { fecha: Iso; hora: string } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(marca));
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return { fecha: `${v("year")}-${v("month")}-${v("day")}`, hora: `${v("hour")}:${v("minute")}` };
}
