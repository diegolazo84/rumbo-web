// Modo de las pantallas del panel: vista previa (datos de ejemplo, rutas bajo /vista-previa/,
// etiqueta «Ejemplo») o panel real (etapa 3: /equipo/, datos de la base, sin «Ejemplo»).
// Las pantallas leen el modo con usePanel(); la vista previa no pone proveedor y queda igual.
import { createContext, useContext } from "react";
import type { Iso } from "../../../lib/fechas";
import { habilesEntre as habilesEntreCon } from "../../../lib/fechas";
import { R } from "./base";
import { HOY, habilesEntre } from "./ejemplo";

export type RutasPanel = { [K in keyof typeof R]: string };

// Rutas reales del panel (src/plataforma.ts). «hoyVacio» no existe fuera de la vista previa.
export const R_PANEL_REAL: RutasPanel = {
  hoy: "/equipo/",
  solicitudes: "/equipo/solicitudes/",
  participantes: "/equipo/participantes/",
  revisar: "/equipo/revisar/",
  mas: "/equipo/mas/",
  solicitud: "/equipo/solicitud/",
  participante: "/equipo/participante/",
  constructor: "/equipo/constructor/",
  revision: "/equipo/revision/",
  ajustes: "/equipo/ajustes/",
  contacto: "/equipo/contacto/",
  hoyVacio: "/equipo/",
  verComo: "/mi-espacio/",
  estado: "/estado/",
};

export type ModoPanel = {
  real: boolean;
  R: RutasPanel;
  hoy: Iso; // hoy en Chile
  habiles: (a: Iso, b: Iso) => number; // días hábiles en (a, b] con los feriados de la base
};

export const PANEL_PREVIA: ModoPanel = { real: false, R, hoy: HOY, habiles: habilesEntre };

// Panel real con los feriados leídos de la base.
export const modoReal = (hoy: Iso, feriados: readonly Iso[]): ModoPanel => ({
  real: true,
  R: R_PANEL_REAL,
  hoy,
  habiles: (a, b) => habilesEntreCon(a, b, feriados),
});

export const PanelContexto = createContext<ModoPanel>(PANEL_PREVIA);
export const usePanel = () => useContext(PanelContexto);
