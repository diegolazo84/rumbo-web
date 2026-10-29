// Tabla de rutas de Mi espacio propio y el panel (etapa 3). Aparte de src/plataforma.ts para
// que no pese en las páginas públicas: la usan la porción de la plataforma y el prerender.

export type MarcoPlataforma = "ingreso" | "mi-espacio" | "panel";

export type RutaPlataforma = {
  ruta: string; // absoluta, con barra final
  titulo: string; // <title>
  marco: MarcoPlataforma;
  seccion: string; // título de la sección en la cabecera
  activo: string; // destino activo de la navegación
  // Ruta antigua (Rumbo 2.0, etapa 2): se prerenderiza para no dar 404 y, al cargar, lleva a
  // `redirige` conservando ?búsqueda y #ancla (enlaces guardados y de correos).
  redirige?: string;
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
const antigua = (ruta: string, nueva: string): RutaPlataforma => ({ ...me(ruta, "Mi espacio", ""), redirige: `/mi-espacio/${nueva}` });
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
  // Cinco secciones (Rumbo 2.0, etapa 2): Mi Rumbo, Mi plan, Mi acompañamiento, Comunidad y Mis logros.
  me("", "Mi Rumbo", "rumbo"),
  me("plan/", "Mi plan", "plan"),
  me("plan/metas/", "Mi plan", "plan", "Mis metas"),
  me("plan/accion/", "Acción", "plan"),
  me("plan/ajuste/", "Pedir un ajuste", "plan"),
  me("acompanamiento/", "Mi acompañamiento", "acompanamiento"),
  me("comunidad/", "Comunidad", "comunidad"),
  me("comunidad/crear/", "Crear publicación", "comunidad"),
  me("comunidad/grupos/", "Grupos", "comunidad", "Grupos de la comunidad"),
  me("logros/", "Mis logros", "logros"),
  me("logros/creditos/", "Créditos", "logros", "Créditos"),
  me("lo-que-viene/", "Lo que viene en Rumbo", ""),
  me("preferencias/", "Preferencias", "preferencias"),
  me("preferencias/eliminar/", "Preferencias", "preferencias", "Eliminar mis datos"),
  me("ayuda/", "Ayuda inmediata", "rumbo"),
  // Rutas anteriores a la etapa 2: redirigen a la sección nueva.
  antigua("calendario/", "plan/"),
  antigua("accion/", "plan/accion/"),
  antigua("ajuste/", "plan/ajuste/"),
  antigua("semana/", "acompanamiento/"),
  antigua("progreso/", "logros/"),
  antigua("progreso/creditos/", "logros/creditos/"),
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
  panel("comunidad/", "Comunidad", "mas"),
  panel("modulos/", "Módulos", "mas"),
  panel("mas/", "Más", "mas"),
];

export const rutaPlataforma = (pathname: string) => {
  const conBarra = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return RUTAS_PLATAFORMA.find((r) => r.ruta === conBarra);
};
