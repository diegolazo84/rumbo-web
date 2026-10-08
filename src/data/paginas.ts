// Metadatos por página (6.7): los usa el prerenderizado (scripts/postbuild.mjs) para
// escribir <head> en el HTML estático, y la app para actualizar el título al
// navegar. Una página nueva se agrega aquí y en App.tsx (TypeScript exige ambas).
import { LEMA, operacion } from "./rumbo";

// Fecha de la versión publicada: la usan las bajadas de Privacidad y Condiciones («vigente
// desde el…») y el sitemap. Es literal y se cambia a mano en el mismo commit que publica una
// versión nueva (nunca un marcador). Una página que cambie después lleva su propia fecha.
export const VERSION_PUBLICADA = { iso: "2026-10-02", texto: "2 de octubre de 2026" } as const;

export type PaginaId = "inicio" | "privacidad" | "condiciones" | "ayuda" | "postular" | "estado" | "contacto";

export type Pagina = {
  id: PaginaId;
  // Ruta con barra final: es la que sirve GitHub Pages sin redirección (carpeta/index.html).
  ruta: string;
  titulo: string;
  descripcion: string; // ≤155 caracteres
  // og:description cuando difiere de la descripción.
  ogDescripcion?: string;
  // Fecha de última revisión de contenido para sitemap.xml (AAAA-MM-DD).
  revisada: string;
  // false: noindex, sin canonical y fuera del sitemap (por defecto, indexable).
  indexable?: boolean;
  // false: sin analítica aunque esté activa (plataforma 2.1: /estado/ no carga Umami).
  analitica?: boolean;
  // <meta name="referrer">: /estado/ lleva el token en el # (plataforma 2.1 y 6.15).
  referrer?: string;
  // Formularios con Supabase (plataforma 2.3): connect-src permite el proyecto, y la página es una
  // porción perezosa que postbuild prerenderiza esperando que cargue, con su CSS en <head>.
  formulario?: boolean;
};

// Páginas del formulario propio (plataforma 2.1 y 3.2): existen solo con
// operacion.formularioPropio; si no, esas rutas son reenvíos a la plataforma (postbuild.mjs).
const PAGINAS_FORMULARIO: Pagina[] = [
  {
    id: "postular",
    ruta: "/postular/",
    titulo: "Cuéntanos tu meta · Rumbo",
    descripcion:
      "Cuéntanos qué quieres lograr. Una persona lee cada solicitud y te responde en hasta 2 días hábiles. Postular es gratis y no te compromete.",
    revisada: VERSION_PUBLICADA.iso,
    formulario: true,
  },
  {
    id: "estado",
    ruta: "/estado/",
    titulo: "Tu solicitud · Rumbo",
    // La especificación (3.2) no le da descripción: es noindex y no se comparte.
    descripcion: "Estado de tu solicitud a Rumbo, con el enlace privado que viste al enviarla.",
    revisada: VERSION_PUBLICADA.iso,
    indexable: false,
    analitica: false,
    referrer: "no-referrer",
    formulario: true,
  },
  {
    id: "contacto",
    ruta: "/contacto/",
    titulo: "Contacto · Rumbo",
    descripcion:
      "Escríbenos con tus dudas sobre Rumbo, tu solicitud o tus datos. Respondemos en días hábiles; no hay atención inmediata.",
    revisada: VERSION_PUBLICADA.iso,
    formulario: true,
  },
];

export const paginas: Pagina[] = [
  {
    id: "inicio",
    ruta: "/",
    titulo: `Rumbo · ${LEMA}`,
    descripcion:
      "Tu meta, convertida en una semana posible: un calendario de acciones y una persona que lo revisa contigo. Piloto en preparación, en línea y en español.",
    ogDescripcion:
      "Planificación personal con acompañamiento humano. Tu meta, convertida en una semana posible. Piloto en preparación, en línea y en español.",
    revisada: VERSION_PUBLICADA.iso,
  },
  {
    id: "privacidad",
    ruta: "/privacidad/",
    titulo: "Privacidad · Rumbo",
    descripcion:
      "Qué datos pide Rumbo durante el piloto, para qué los usa, dónde se guardan, cuánto tiempo los conserva y cómo ejercer tus derechos.",
    revisada: VERSION_PUBLICADA.iso,
  },
  {
    id: "condiciones",
    ruta: "/condiciones/",
    titulo: "Condiciones del piloto · Rumbo",
    descripcion:
      "Cómo se postula al piloto de Rumbo, qué incluye y qué no incluye cada plan, precios de referencia y qué se acuerda contigo antes de empezar.",
    revisada: VERSION_PUBLICADA.iso,
  },
  {
    id: "ayuda",
    ruta: "/ayuda/",
    titulo: "Ayuda inmediata · Rumbo",
    descripcion:
      "Rumbo no es un servicio de urgencias. Si necesitas ayuda ahora en Chile: *4141 (prevención del suicidio), 131 (SAMU) y Salud Responde 600 360 7777.",
    revisada: VERSION_PUBLICADA.iso,
  },
  ...(operacion.formularioPropio ? PAGINAS_FORMULARIO : []),
];

// Páginas que van en sitemap.xml.
export const paginasIndexables = () => paginas.filter((p) => p.indexable !== false);

export const PAGINA_404 = {
  titulo: "Página no encontrada · Rumbo",
  descripcion: "Esta dirección no existe en la web de Rumbo.",
};

// Texto alternativo e imagen para redes (archivo en public/og/).
export const IMAGEN_SOCIAL = {
  ruta: "og/rumbo-1200x630.png",
  ancho: 1200,
  alto: 630,
  alt: "Rumbo: Tu meta, convertida en una semana posible. Planificación personal con acompañamiento humano.",
};

// Coincidencia sensible a mayúsculas, igual que el router (rutas con caseSensitive).
export function paginaPorRuta(pathname: string): Pagina | undefined {
  const normal = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return paginas.find((p) => p.ruta === normal);
}
