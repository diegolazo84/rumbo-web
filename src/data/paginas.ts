// Metadatos por página: los usa el prerenderizado (scripts/postbuild.mjs) para
// escribir <head> en el HTML estático, y la app para actualizar el título al
// navegar. Una página nueva se agrega aquí y en App.tsx (TypeScript exige ambas).
import { LEMA } from "./rumbo";

export type PaginaId = "inicio" | "privacidad";

export type Pagina = {
  id: PaginaId;
  // Ruta con barra final: es la que sirve GitHub Pages sin redirección (carpeta/index.html).
  ruta: string;
  titulo: string;
  descripcion: string;
  // Fecha de última revisión de contenido para sitemap.xml (AAAA-MM-DD).
  revisada: string;
};

export const paginas: Pagina[] = [
  {
    id: "inicio",
    ruta: "/",
    titulo: `Rumbo · ${LEMA}`,
    descripcion:
      "Convertimos tu meta en una semana posible: un calendario de acciones concretas y una persona que revisa tu avance contigo. Piloto en preparación en Santiago de Chile.",
    revisada: "2026-10-02",
  },
  {
    id: "privacidad",
    ruta: "/privacidad/",
    titulo: "Privacidad · Rumbo",
    descripcion:
      "Qué datos recoge Rumbo durante el piloto, para qué los usa, dónde se guardan, cuánto tiempo los conserva y cómo ejercer tus derechos.",
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

export function paginaPorRuta(pathname: string): Pagina | undefined {
  const normal = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return paginas.find((p) => p.ruta === normal);
}
