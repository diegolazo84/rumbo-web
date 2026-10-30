// Rutas de la vista previa (etapa 0, plataforma 2.1 y 10). Imitan las rutas reales bajo
// /vista-previa/ («/vista-previa/mi-espacio/plan/» ↔ «/mi-espacio/plan/»).
// Las pantallas importan desde aquí (no desde registro.ts) para enlazarse entre sí.
// Se borra entera al pasar a la etapa 3.

export const PREVIA = "/vista-previa/";

// "mi-espacio/progreso/" → "/vista-previa/mi-espacio/progreso/"
export const rutaPrevia = (ruta = "") => PREVIA + ruta.replace(/^\/+/, "");

// Destinos de la estructura de Mi espacio (EstructuraApp, prop `rutas`): las cinco secciones de
// Rumbo 2.0 (etapa 2) y las filas del menú de la cabecera. `hoy` es la portada de Mi espacio.
export const RUTAS_MI_ESPACIO = {
  hoy: rutaPrevia("mi-espacio/"),
  rumbo: rutaPrevia("mi-espacio/"),
  plan: rutaPrevia("mi-espacio/plan/"),
  acompanamiento: rutaPrevia("mi-espacio/acompanamiento/"),
  comunidad: rutaPrevia("mi-espacio/comunidad/"),
  logros: rutaPrevia("mi-espacio/logros/"),
  ajuste: rutaPrevia("mi-espacio/plan/ajuste/"),
  preferencias: rutaPrevia("mi-espacio/preferencias/"),
  misDatos: rutaPrevia("mi-espacio/preferencias/#mis-datos"),
  loQueViene: rutaPrevia("mi-espacio/lo-que-viene/"),
  salir: rutaPrevia("mi-espacio/entrar/saliste/"),
  avisos: rutaPrevia("mi-espacio/avisos/"),
} as const;

// Destinos del panel (EstructuraApp tipo "panel").
export const RUTAS_PANEL = {
  hoy: rutaPrevia("equipo/"),
  solicitudes: rutaPrevia("equipo/solicitudes/"),
  participantes: rutaPrevia("equipo/participantes/"),
  revisar: rutaPrevia("equipo/revisar/"),
  mas: rutaPrevia("equipo/mas/"),
} as const;

// Pantallas públicas de la plataforma, para enlazarlas desde otras pantallas de la vista previa.
export const RUTAS_PUBLICAS = {
  postular: rutaPrevia("postular/"),
  interes: rutaPrevia("postular/interes/"),
  estado: rutaPrevia("estado/"),
  contacto: rutaPrevia("contacto/"),
  entrar: rutaPrevia("mi-espacio/entrar/"),
} as const;
