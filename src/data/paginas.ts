// Metadatos por página (6.7): los usa el prerenderizado (scripts/postbuild.mjs) para
// escribir <head> en el HTML estático, y la app para actualizar el título al
// navegar. Una página nueva se agrega aquí y en App.tsx (TypeScript exige ambas).
import { LEMA } from "./rumbo";

export type PaginaId = "inicio" | "privacidad" | "condiciones" | "ayuda";

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
};

export const paginas: Pagina[] = [
  {
    id: "inicio",
    ruta: "/",
    titulo: `Rumbo · ${LEMA}`,
    descripcion:
      "Tu meta, convertida en una semana posible: un calendario de acciones concretas y una persona que lo revisa contigo. Piloto en preparación en Santiago.",
    ogDescripcion:
      "Planificación personal con acompañamiento humano. Tu meta, convertida en una semana posible. Piloto en preparación en Santiago de Chile.",
    revisada: "2026-10-02",
  },
  {
    id: "privacidad",
    ruta: "/privacidad/",
    titulo: "Privacidad · Rumbo",
    descripcion:
      "Qué datos pide Rumbo durante el piloto, para qué los usa, dónde se guardan, cuánto tiempo los conserva y cómo ejercer tus derechos.",
    revisada: "2026-10-02",
  },
  {
    id: "condiciones",
    ruta: "/condiciones/",
    titulo: "Condiciones del piloto · Rumbo",
    descripcion:
      "Cómo se postula al piloto de Rumbo, qué incluye y qué no incluye cada plan, precios de referencia y qué se acuerda contigo antes de empezar.",
    revisada: "2026-10-02",
  },
  {
    id: "ayuda",
    ruta: "/ayuda/",
    titulo: "Ayuda inmediata · Rumbo",
    descripcion:
      "Rumbo no es un servicio de urgencias. Si necesitas ayuda ahora en Chile: *4141 (prevención del suicidio), 131 (SAMU) y Salud Responde 600 360 7777.",
    revisada: "2026-10-02",
  },
];

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
