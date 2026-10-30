// Mis avisos (maqueta de ChatGPT, 30-oct-2026): lo que se muestra de cada aviso de la tabla avisos
// (A5). Los avisos los crea la base con textos fijos; aquí solo se agrupan por día, se clasifican
// por tipo y se elige a dónde llevan. Ningún texto copia lo que escribió alguien.
import type { NombreIconoApp } from "../../../../components/app/Icono";
import { diasEntre, sumarDias, type Iso } from "../../../../lib/fechas";
import type { RutasEspacio } from "../espacio";

export type Aviso = {
  id: string;
  tipo: string;
  titulo: string;
  enlace: string; // ruta real (/mi-espacio/…)
  creadoEn: string; // timestamptz
  leidoEn: string | null;
};

export type Categoria = "recordatorios" | "mensajes" | "comunidad" | "logros" | "sistema";
export const CATEGORIAS: Categoria[] = ["recordatorios", "mensajes", "comunidad", "logros", "sistema"];

const POR_TIPO: Record<string, Categoria> = {
  recordatorio_acciones: "recordatorios",
  recordatorio_registro: "recordatorios",
  revision_publicada: "mensajes",
  ajuste_respondido: "mensajes",
  programa_publicado: "mensajes",
  videollamada_programada: "mensajes",
  ia_respondida: "mensajes",
  mensaje_especialista: "mensajes",
  recomendacion_especialista: "mensajes",
  reserva_respondida: "mensajes",
  comunidad_respuesta: "comunidad",
  desafio_nuevo: "comunidad",
  reconocimiento: "logros",
  beneficio_disponible: "logros",
};
export const categoriaDe = (tipo: string): Categoria => POR_TIPO[tipo] ?? "sistema";

export const ICONO_CATEGORIA: Record<Categoria, NombreIconoApp> = {
  recordatorios: "bell",
  mensajes: "message-square",
  comunidad: "users",
  logros: "award",
  sistema: "settings",
};
// Algunos tipos tienen un icono propio dentro de su categoría.
const ICONO_TIPO: Record<string, NombreIconoApp> = {
  videollamada_programada: "video",
  programa_publicado: "calendar-days",
  desafio_nuevo: "flag",
};
export const iconoDe = (tipo: string): NombreIconoApp => ICONO_TIPO[tipo] ?? ICONO_CATEGORIA[categoriaDe(tipo)];

// Día del aviso en la zona horaria de la persona.
export function diaDe(ts: string, zona: string): Iso {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ts));
  } catch {
    return ts.slice(0, 10);
  }
}
export function horaDe(ts: string, zona: string): string {
  try {
    return new Intl.DateTimeFormat("es-CL", { timeZone: zona, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(ts));
  } catch {
    return ts.slice(11, 16);
  }
}

export type Grupo = "hoy" | "ayer" | "semana" | "anteriores";
export const GRUPOS: Grupo[] = ["hoy", "ayer", "semana", "anteriores"];
export function grupoDe(dia: Iso, hoy: Iso): Grupo {
  if (dia >= hoy) return "hoy";
  if (dia === sumarDias(hoy, -1)) return "ayer";
  // «Esta semana»: los últimos 7 días (así no queda vacía a comienzos de semana).
  return diasEntre(dia, hoy) < 7 ? "semana" : "anteriores";
}

// A dónde lleva un aviso dentro de Mi espacio (real o vista previa). null: no hay a dónde ir
// (p. ej. la Comunidad mientras el módulo esté apagado).
export function destinoDe(aviso: Pick<Aviso, "tipo" | "enlace">, R: RutasEspacio, comunidad: boolean): string | null {
  const ruta = aviso.enlace.split(/[?#]/)[0];
  if (categoriaDe(aviso.tipo) === "logros") return R.progreso; // la base enlaza a la portada
  if (aviso.tipo === "ia_respondida") return R.asistente; // la base enlaza a la portada
  if (ruta.startsWith("/mi-espacio/comunidad/")) return comunidad ? R.comunidad : null;
  if (ruta.startsWith("/mi-espacio/acompanamiento/")) return R.semana;
  if (ruta.startsWith("/mi-espacio/plan/ajuste/")) return R.ajusteLista;
  if (ruta.startsWith("/mi-espacio/plan/")) return R.calendario;
  if (ruta.startsWith("/mi-espacio/logros/")) return R.progreso;
  if (ruta.startsWith("/mi-espacio/preferencias/")) return R.preferencias;
  if (ruta.startsWith("/mi-espacio/")) return R.hoy;
  return null;
}
