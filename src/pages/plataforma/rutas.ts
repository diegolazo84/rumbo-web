// Tabla de rutas de Mi espacio propio y el panel (etapa 3). Aparte de src/plataforma.ts para
// que no pese en las páginas públicas: la usan la porción de la plataforma y el prerender.

export type MarcoPlataforma = "ingreso" | "mi-espacio" | "panel";

export type RutaPlataforma = {
  ruta: string; // absoluta, con barra final
  titulo: string; // <title>
  marco: MarcoPlataforma;
  seccion: string; // título de la sección en la cabecera
  activo: string; // destino activo de la navegación
};

const MI_ESPACIO = (seccion: string) => `${seccion} · Mi espacio · Rumbo`;
const PANEL = (seccion: string) => `${seccion} · Panel · Rumbo`;

const me = (ruta: string, seccion: string, activo: string, titulo = seccion): RutaPlataforma => ({
  ruta: `/mi-espacio/${ruta}`,
  titulo: MI_ESPACIO(titulo),
  marco: "mi-espacio",
  seccion,
  activo,
});
const panel = (ruta: string, seccion: string, activo: string): RutaPlataforma => ({
  ruta: `/equipo/${ruta}`,
  titulo: PANEL(seccion),
  marco: "panel",
  seccion,
  activo,
});

// Una fila por ruta real. Los identificadores van en la búsqueda (?id=, ?n=), nunca en la ruta.
export const RUTAS_PLATAFORMA: RutaPlataforma[] = [
  { ruta: "/mi-espacio/entrar/", titulo: MI_ESPACIO("Entrar"), marco: "ingreso", seccion: "Entrar", activo: "" },
  me("", "Hoy", "hoy"),
  me("calendario/", "Calendario", "calendario"),
  me("accion/", "Acción", "calendario"),
  me("progreso/", "Progreso", "progreso"),
  me("progreso/creditos/", "Créditos", "progreso", "Créditos"),
  me("semana/", "Semana", "semana"),
  me("ajuste/", "Pedir un ajuste", "ajuste"),
  me("preferencias/", "Preferencias", "preferencias"),
  me("preferencias/eliminar/", "Preferencias", "preferencias", "Eliminar mis datos"),
  me("ayuda/", "Ayuda inmediata", "hoy"),
  panel("", "Hoy", "hoy"),
  panel("solicitudes/", "Solicitudes", "solicitudes"),
  panel("solicitud/", "Solicitud", "solicitudes"),
  panel("participantes/", "Participantes", "participantes"),
  panel("participante/", "Participante", "participantes"),
  panel("constructor/", "Constructor", "participantes"),
  panel("revision/", "Revisión semanal", "participantes"),
  panel("ajustes/", "Solicitudes de ajuste", "participantes"),
  panel("revisar/", "Revisar", "revisar"),
  panel("contacto/", "Contacto y derechos", "mas"),
  panel("mas/", "Más", "mas"),
];

export const rutaPlataforma = (pathname: string) => {
  const conBarra = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return RUTAS_PLATAFORMA.find((r) => r.ruta === conBarra);
};
