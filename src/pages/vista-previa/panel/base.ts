// Rutas del panel y utilidades sin estilos ni componentes (las usa también el marco de la vista
// previa para calcular los contadores, sin cargar el CSS del panel).
import type { Iso } from "../../../lib/fechas";
import { RUTAS_PANEL, rutaPrevia } from "../rutas";

export const R = {
  ...RUTAS_PANEL,
  solicitud: rutaPrevia("equipo/solicitud/"),
  participante: rutaPrevia("equipo/participante/"),
  constructor: rutaPrevia("equipo/constructor/"),
  revision: rutaPrevia("equipo/revision/"),
  ajustes: rutaPrevia("equipo/ajustes/"),
  contacto: rutaPrevia("equipo/contacto/"),
  hoyVacio: rutaPrevia("equipo/hoy/vacio/"),
  verComo: rutaPrevia("mi-espacio/"),
  estado: rutaPrevia("estado/"),
} as const;

export const conId = (ruta: string, id: string, extra?: Record<string, string>) =>
  `${ruta}?${new URLSearchParams({ id, ...extra }).toString()}`;

// Por plazo (sin plazo al final).
export const ordenPorPlazo = <T extends { vence: Iso | null }>(a: T, b: T) =>
  a.vence && b.vence ? a.vence.localeCompare(b.vence) : a.vence ? -1 : b.vence ? 1 : 0;
