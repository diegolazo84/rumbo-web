// Rutas de la vista previa (etapa 0, plataforma 2.1 y 10). Imitan las rutas reales bajo
// /vista-previa/ («/vista-previa/mi-espacio/calendario/» ↔ «/mi-espacio/calendario/»).
// Las pantallas importan desde aquí (no desde registro.ts) para enlazarse entre sí.
// Se borra entera al pasar a la etapa 3.

export const PREVIA = "/vista-previa/";

// "mi-espacio/progreso/" → "/vista-previa/mi-espacio/progreso/"
export const rutaPrevia = (ruta = "") => PREVIA + ruta.replace(/^\/+/, "");

// Destinos de la estructura de Mi espacio (EstructuraApp, prop `rutas`).
export const RUTAS_MI_ESPACIO = {
  hoy: rutaPrevia("mi-espacio/"),
  calendario: rutaPrevia("mi-espacio/calendario/"),
  progreso: rutaPrevia("mi-espacio/progreso/"),
  semana: rutaPrevia("mi-espacio/semana/"),
  ajuste: rutaPrevia("mi-espacio/ajuste/"),
  preferencias: rutaPrevia("mi-espacio/preferencias/"),
  salir: rutaPrevia("mi-espacio/entrar/saliste/"),
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
