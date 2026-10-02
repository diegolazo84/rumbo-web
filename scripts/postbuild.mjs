// Deja dist/ lista para cualquier hosting estático (GitHub Pages, Cloudflare,
// un servidor propio), sin reglas de redirección del proveedor:
// - prerenderiza cada página (HTML completo para buscadores y vistas previas),
// - 404.html prerenderizado con noindex,
// - páginas de reenvío a la plataforma original (postular, Mi espacio, etc.),
// - robots.txt y sitemap.xml con la dirección pública.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const DIST = "dist";
const SSR = "dist-ssr";
const BASE = (process.env.BASE_PATH ?? "/").replace(/\/?$/, "/");
const SITE_URL = (process.env.SITE_URL ?? `http://localhost:4173${BASE}`).replace(/\/$/, "");
const PLATAFORMA = "https://rumbo-acompanamiento-diego.diegolazo84.chatgpt.site";

// SITE_URL y BASE_PATH deben describir la misma carpeta, o canonical y og:url quedan mal.
const rutaSitio = new URL(SITE_URL + "/").pathname;
if (rutaSitio !== BASE) {
  throw new Error(`SITE_URL (${SITE_URL}) no termina en BASE_PATH (${BASE}). Revisa las variables.`);
}

const { render, paginas, PAGINA_404, IMAGEN_SOCIAL, LEMA } = await import(
  pathToFileURL(join(SSR, "entry-server.js")).href
);

const plantilla = readFileSync(join(DIST, "index.html"), "utf8");
if (!plantilla.includes("<!--app-head-->") || !plantilla.includes("<!--app-html-->")) {
  throw new Error("index.html no tiene los marcadores <!--app-head--> y <!--app-html-->.");
}

// Fuentes que se ven sobre el pliegue: se precargan para evitar el cambio de tipografía.
const fuentesCriticas = readdirSync(join(DIST, "assets")).filter((f) =>
  /^(fraunces-latin-opsz-(normal|italic)|instrument-sans-latin-wght-normal)-.*\.woff2$/.test(f),
);
if (fuentesCriticas.length !== 3) {
  throw new Error(`Se esperaban 3 fuentes críticas en dist/assets y hay ${fuentesCriticas.length}.`);
}

const esc = (s) =>
  String(s).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

// CSP por meta: GitHub Pages no permite cabeceras propias. frame-ancestors no funciona
// en meta (limitación del estándar). 'unsafe-inline' en style-src solo cubre los
// atributos style que pone React (colores por categoría, barras de progreso).
function csp(scriptsExtra = []) {
  return [
    "default-src 'self'",
    ["script-src 'self'", ...scriptsExtra].join(" "),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

const imagenSocial = `${SITE_URL}/${IMAGEN_SOCIAL.ruta}`;

function cabeza({ titulo, descripcion, canonical, indexable, extra = "" }) {
  const t = esc(titulo);
  const d = esc(descripcion);
  return [
    `<meta http-equiv="Content-Security-Policy" content="${csp()}" />`,
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    indexable ? "" : `<meta name="robots" content="noindex" />`,
    canonical ? `<link rel="canonical" href="${canonical}" />` : "",
    ...fuentesCriticas.map(
      (f) => `<link rel="preload" href="${BASE}assets/${f}" as="font" type="font/woff2" crossorigin />`,
    ),
    `<meta property="og:site_name" content="Rumbo" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="es_CL" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    canonical ? `<meta property="og:url" content="${canonical}" />` : "",
    `<meta property="og:image" content="${imagenSocial}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="${IMAGEN_SOCIAL.ancho}" />`,
    `<meta property="og:image:height" content="${IMAGEN_SOCIAL.alto}" />`,
    `<meta property="og:image:alt" content="${esc(IMAGEN_SOCIAL.alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    extra,
  ]
    .filter(Boolean)
    .join("\n    ");
}

// Datos estructurados: solo hechos verificables. Sin precios (Offer), sin reseñas ni
// valoraciones, sin dirección física, sin tipos médicos: Rumbo no es un prestador de salud.
function jsonLd() {
  const datos = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organizacion`,
        name: "Rumbo",
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/icons/icono-512.png`,
        slogan: LEMA,
        description:
          "Planificación personal con acompañamiento humano. Piloto en preparación en Santiago de Chile.",
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#sitio`,
        name: "Rumbo",
        url: `${SITE_URL}/`,
        inLanguage: "es-CL",
        publisher: { "@id": `${SITE_URL}/#organizacion` },
      },
    ],
  };
  // "<" escapado para que ningún texto pueda cerrar la etiqueta script.
  return `<script type="application/ld+json">${JSON.stringify(datos).replaceAll("<", "\\u003c")}</script>`;
}

function escribir(ruta, html) {
  const dir = join(DIST, ruta);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
}

function pagina(urlRender, head) {
  const cuerpo = render(urlRender);
  if (!cuerpo.includes("<h1")) throw new Error(`El prerender de ${urlRender} no tiene <h1>.`);
  return plantilla.replace("<!--app-head-->", head).replace("<!--app-html-->", cuerpo);
}

for (const p of paginas) {
  const canonical = `${SITE_URL}${p.ruta}`;
  const html = pagina(
    BASE + p.ruta.replace(/^\//, ""),
    cabeza({
      titulo: p.titulo,
      descripcion: p.descripcion,
      canonical,
      indexable: true,
      extra: p.id === "inicio" ? jsonLd() : "",
    }),
  );
  escribir(p.ruta.replace(/^\//, ""), html);
}

writeFileSync(
  join(DIST, "404.html"),
  pagina(
    `${BASE}404-no-existe/`,
    cabeza({ titulo: PAGINA_404.titulo, descripcion: PAGINA_404.descripcion, canonical: null, indexable: false }),
  ),
);

// Rutas que viven en la plataforma original. Conservan ?area=, ?apoyo= y #token.
const reenvios = {
  postular: "/postular",
  contacto: "/contacto",
  "mi-programa": "/mi-programa",
  app: "/mi-programa",
  comunidad: "/comunidad",
  estado: "/estado",
  "privacidad-piloto": "/privacidad-piloto",
};

for (const [ruta, destino] of Object.entries(reenvios)) {
  const url = PLATAFORMA + destino;
  const script = `location.replace(${JSON.stringify(url)} + location.search + location.hash);`;
  const hash = createHash("sha256").update(script).digest("base64");
  escribir(
    ruta,
    `<!doctype html>
<html lang="es-CL">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp([`'sha256-${hash}'`])}">
<meta name="robots" content="noindex">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Te llevamos a la plataforma · Rumbo</title>
<script>${script}</script>
<meta http-equiv="refresh" content="0; url=${url}">
</head>
<body style="font-family:system-ui,sans-serif;background:#F5EFE4;color:#1d2621;padding:24px">
<p>Te llevamos a la plataforma de Rumbo. Si no avanza, <a href="${url}">entra aquí</a>.</p>
</body>
</html>
`,
  );
}

// Nota: con la dirección github.io/rumbo-web/ los buscadores no leen este robots.txt
// (solo vale en la raíz del dominio). Sirve al pasar a dominio propio.
writeFileSync(
  join(DIST, "robots.txt"),
  `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`,
);

writeFileSync(
  join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paginas.map((p) => `  <url><loc>${SITE_URL}${p.ruta}</loc><lastmod>${p.revisada}</lastmod></url>`).join("\n")}
</urlset>
`,
);

// Evita que GitHub Pages procese dist/ con Jekyll (solo aplica si algún día se publica desde una rama).
writeFileSync(join(DIST, ".nojekyll"), "");

// El paquete de prerender no se publica.
if (existsSync(SSR)) rmSync(SSR, { recursive: true });

console.log(`postbuild: ${paginas.length} páginas prerenderizadas + 404 para ${SITE_URL} (base ${BASE})`);
