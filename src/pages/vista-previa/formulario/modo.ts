// Modo de las pantallas de /postular/, /estado/ y /contacto/: las mismas pantallas corren en
// la vista previa (envío simulado, datos de ejemplo, rutas bajo /vista-previa/) y como páginas
// reales (Supabase por src/lib/api.ts, rutas públicas). Por defecto, vista previa: el registro
// de la vista previa no cambia. src/pages/formulario/PaginaFormulario.tsx pone el modo real.
import { createContext, useContext } from "react";
import { operacion, rutas } from "../../../data/rumbo";
import { RUTAS_PUBLICAS } from "../rutas";

export type RutasFormulario = { postular: string; estado: string; contacto: string; entrar: string };
export type ModoFormulario = {
  real: boolean;
  rutas: RutasFormulario;
  // Claves de sessionStorage (las de la vista previa no se mezclan con las reales).
  claves: { borrador: string; enviada: string; token: string };
};

export const MODO_PREVIA: ModoFormulario = {
  real: false,
  rutas: RUTAS_PUBLICAS,
  claves: {
    borrador: "rumbo-vista-previa-postular",
    enviada: "rumbo-vista-previa-postular-enviada",
    token: "rumbo-vista-previa-postular-token",
  },
};

// «Entrar a Mi espacio» lleva a /mi-espacio/, que explica cómo se entra mientras no haya cuentas;
// con el interruptor miEspacioPropio (D8), al ingreso propio.
export const MODO_REAL: ModoFormulario = {
  real: true,
  rutas: {
    postular: "/postular/",
    estado: "/estado/",
    contacto: "/contacto/",
    entrar: operacion.miEspacioPropio ? "/mi-espacio/entrar/" : rutas.miEspacio,
  },
  claves: { borrador: "rumbo-postular", enviada: "rumbo-postular-enviada", token: "rumbo-postular-token" },
};

export const ModoFormularioContexto = createContext<ModoFormulario>(MODO_PREVIA);
export const useModoFormulario = () => useContext(ModoFormularioContexto);
