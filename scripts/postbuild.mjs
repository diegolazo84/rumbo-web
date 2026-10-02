// Deja dist/ lista para cualquier hosting estático (GitHub Pages, Cloudflare, un
// servidor propio), sin reglas de redirección del proveedor (especificación 6.2):
// - puerta de lanzamiento (LANZAMIENTO=1) con los datos que bloquean la difusión,
// - prerenderiza cada página y 404.html (noindex) con su <head> completo y CSP,
// - páginas de reenvío a la plataforma con la piel de la marca (5.7),
// - guardián de marcadores: falla si queda un «[PENDIENTE]», una llave o un «null»,
// - analítica opcional (solo con VITE_UMAMI_WEBSITE_ID),
// - robots.txt y sitemap.xml con la dirección pública.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { buscarMarcadores } from "./marcadores.mjs";
import { PLATAFORMA, REENVIOS, scriptReenvio, textosReenvio } from "./reenvios.mjs";

const DIST = "dist";
const SSR = "dist-ssr";
// Valores por defecto coherentes entre sí: `npm run build` funciona sin variables.
const BASE = (process.env.BASE_PATH || "/rumbo-web/").replace(/\/?$/, "/");
const SITE_URL = (process.env.SITE_URL || "https://diegolazo84.github.io/rumbo-web").replace(/\/+$/, "");
const VERSION = process.env.GITHUB_SHA || "local";
const UMAMI_ID = process.env.VITE_UMAMI_WEBSITE_ID?.trim() || "";
const VERIFICACION_GOOGLE = process.env.GOOGLE_SITE_VERIFICATION?.trim() || "";
const LANZAMIENTO = process.env.LANZAMIENTO?.trim() === "1";

// 1. SITE_URL y BASE_PATH deben describir la misma carpeta, o canonical y og:url quedan mal.
const rutaSitio = new URL(SITE_URL + "/").pathname;
if (rutaSitio !== BASE) {
  throw new Error(`SITE_URL (${SITE_URL}) no termina en BASE_PATH (${BASE}). Revisa las variables.`);
}
if (UMAMI_ID && !/^[0-9a-f-]{36}$/i.test(UMAMI_ID)) {
  throw new Error(`VITE_UMAMI_WEBSITE_ID no parece un identificador de Umami: «${UMAMI_ID}».`);
}
if (VERIFICACION_GOOGLE && !/^[\w-]+$/.test(VERIFICACION_GOOGLE)) {
  throw new Error("GOOGLE_SITE_VERIFICATION solo admite letras, números, «_» y «-».");
}

// 2. Paquete de prerender y plantilla.
const ssr = await import(pathToFileURL(join(SSR, "entry-server.js")).href);
const { render, paginas, PAGINA_404, IMAGEN_SOCIAL, LEMA } = ssr;
// entry-server.tsx reexporta los datos operativos (6.1) para la puerta de lanzamiento y los reenvíos.
const operacion = ssr.operacion ?? null;
const ayuda = ssr.ayuda ?? null;
if (!operacion || !ayuda) {
  console.warn("postbuild: src/entry-server.tsx no reexporta `operacion` y `ayuda` (6.1); se tratan como vacíos.");
}

// 11. Puerta de lanzamiento: sin estos datos la web se puede publicar, pero no difundir (sección 8).
if (LANZAMIENTO) {
  const faltan = [];
  if (!operacion || !ayuda) faltan.push("src/entry-server.tsx debe reexportar `operacion` y `ayuda` (6.1).");
  else {
    if (!operacion.responsable) faltan.push("operacion.responsable: quién opera Rumbo (nombre, RUT si corresponde y comuna) (8.1).");
    if (!operacion.correo) faltan.push("operacion.correo: correo de contacto (8.1).");
    if (!operacion.plazoPrimeraRespuesta) faltan.push("operacion.plazoPrimeraRespuesta: plazo de la primera respuesta (8.3).");
    if (!operacion.cobertura) faltan.push("operacion.cobertura: desde dónde se puede participar (8.2).");
    if (!ayuda.verificadoEl) faltan.push("ayuda.verificadoEl: día en que se verificaron los números de Ayuda inmediata (8.16).");
    if (!operacion.preciosConImpuestos && !operacion.topePrecio)
      faltan.push("operacion.preciosConImpuestos o operacion.topePrecio: precio con impuestos incluidos (8.5).");
  }
  if (faltan.length) {
    throw new Error(
      `LANZAMIENTO=1: faltan datos que bloquean el lanzamiento público:\n${faltan.map((f) => `  - ${f}`).join("\n")}`,
    );
  }
  if (!operacion.respondemosTodas) {
    console.warn("postbuild: se recomienda operacion.respondemosTodas = true para el lanzamiento (8.3).");
  }
}

const plantilla = readFileSync(join(DIST, "index.html"), "utf8");
if (!plantilla.includes("<!--app-head-->") || !plantilla.includes("<!--app-html-->")) {
  throw new Error("index.html no tiene los marcadores <!--app-head--> y <!--app-html-->.");
}
// La base de Vite (vite.config.ts) debe ser la misma que BASE_PATH, o los recursos no cargan.
if (!plantilla.includes(`src="${BASE}assets/`)) {
  throw new Error(`Los recursos de index.html no están bajo ${BASE}: revisa \`base\` en vite.config.ts y BASE_PATH.`);
}

// 3. Fuentes que se ven sobre el pliegue: se precargan para evitar el cambio de tipografía.
const fuentesCriticas = readdirSync(join(DIST, "assets")).filter((f) =>
  /^(fraunces-latin-opsz-(normal|italic)|instrument-sans-latin-wght-normal)-.*\.woff2$/.test(f),
);
if (fuentesCriticas.length !== 3) {
  throw new Error(`Se esperaban 3 fuentes críticas en dist/assets y hay ${fuentesCriticas.length}.`);
}

const esc = (s) =>
  String(s).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

// 10. Analítica opcional, sin cookies. Umami Cloud envía los eventos a su pasarela
// (gateway.umami.is; api-gateway.umami.dev en versiones anteriores del script).
const UMAMI = {
  script: "https://cloud.umami.is/script.js",
  scriptSrc: ["https://cloud.umami.is"],
  connectSrc: ["https://gateway.umami.is", "https://api-gateway.umami.dev"],
};
const conAnalitica = Boolean(UMAMI_ID);

// CSP por meta (6.6): GitHub Pages no permite cabeceras propias. frame-ancestors no
// funciona en meta (limitación del estándar). 'unsafe-inline' en style-src solo
// cubre los anchos de las barras de progreso y el estilo de los reenvíos.
function csp({ scripts = [], analitica = false } = {}) {
  return [
    "default-src 'self'",
    ["script-src 'self'", ...scripts, ...(analitica ? UMAMI.scriptSrc : [])].join(" "),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    ["connect-src 'self'", ...(analitica ? UMAMI.connectSrc : [])].join(" "),
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

const imagenSocial = `${SITE_URL}/${IMAGEN_SOCIAL.ruta}`;

// 4. <head> de cada página de contenido.
function cabeza({ titulo, descripcion, ogDescripcion, canonical, indexable, extra = "" }) {
  const t = esc(titulo);
  const d = esc(descripcion);
  const og = esc(ogDescripcion ?? descripcion);
  return [
    `<meta http-equiv="Content-Security-Policy" content="${csp({ analitica: conAnalitica })}" />`,
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
    `<meta property="og:description" content="${og}" />`,
    canonical ? `<meta property="og:url" content="${canonical}" />` : "",
    `<meta property="og:image" content="${imagenSocial}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="${IMAGEN_SOCIAL.ancho}" />`,
    `<meta property="og:image:height" content="${IMAGEN_SOCIAL.alto}" />`,
    `<meta property="og:image:alt" content="${esc(IMAGEN_SOCIAL.alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    // comprobar-produccion (6.10) espera a que la caché de Pages sirva esta versión.
    `<meta name="rumbo-version" content="${esc(VERSION)}" />`,
    VERIFICACION_GOOGLE ? `<meta name="google-site-verification" content="${VERIFICACION_GOOGLE}" />` : "",
    conAnalitica
      ? `<script defer src="${UMAMI.script}" data-website-id="${UMAMI_ID}" data-do-not-track="true" data-domains="${new URL(SITE_URL).hostname}"></script>`
      : "",
    extra,
  ]
    .filter(Boolean)
    .join("\n    ");
}

// 6.5 Datos estructurados: solo hechos verificables. Sin precios (Offer), sin reseñas
// ni valoraciones, sin dirección física, sin tipos médicos: Rumbo no es un prestador de salud.
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

// Todo HTML escrito pasa por el guardián antes de llegar a disco.
const escritos = [];
function escribirArchivo(archivo, html) {
  escritos.push({ archivo, html });
  writeFileSync(archivo, html);
}
function escribir(ruta, html) {
  const dir = join(DIST, ruta);
  mkdirSync(dir, { recursive: true });
  escribirArchivo(join(dir, "index.html"), html);
}

// #root[data-pagina] le dice a main.tsx si el HTML corresponde a la ruta pedida (6.1).
function conPagina(html, id) {
  if (html.includes("<!--app-pagina-->")) return html.replace("<!--app-pagina-->", id);
  return html.replace('<div id="root">', `<div id="root" data-pagina="${id}">`);
}

function pagina(urlRender, id, head) {
  const cuerpo = render(urlRender);
  if (!cuerpo.includes("<h1")) throw new Error(`El prerender de ${urlRender} no tiene <h1>.`);
  return conPagina(plantilla.replace("<!--app-head-->", head).replace("<!--app-html-->", cuerpo), id);
}

for (const p of paginas) {
  const canonical = `${SITE_URL}${p.ruta}`;
  const html = pagina(
    BASE + p.ruta.replace(/^\//, ""),
    p.id,
    cabeza({
      titulo: p.titulo,
      descripcion: p.descripcion,
      ogDescripcion: p.ogDescripcion,
      canonical,
      indexable: true,
      extra: p.id === "inicio" ? jsonLd() : "",
    }),
  );
  escribir(p.ruta.replace(/^\//, ""), html);
}

escribirArchivo(
  join(DIST, "404.html"),
  pagina(
    `${BASE}404-no-existe/`,
    "404",
    cabeza({ titulo: PAGINA_404.titulo, descripcion: PAGINA_404.descripcion, canonical: null, indexable: false }),
  ),
);

// 6. Reenvíos (5.7): rutas que viven en la plataforma. Conservan ?area=, ?apoyo= y #token.
// Piel de la marca sin fuentes propias ni hoja externa: carga al instante.
const ESTILO_REENVIO = `
body { margin: 0; background: #F5EFE4; color: #1D2621; font: 1.0625rem/1.6 system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
main { box-sizing: border-box; max-width: 32rem; margin: 0 auto; padding: 24px; }
.logo { margin: 0 0 32px; font: 600 28px/1 Georgia, serif; color: #1F4636; }
.logo span { color: #B85A2E; }
p { margin: 0 0 16px; }
.boton { display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; min-height: 48px; margin: 8px 0 24px; padding: 12px 24px; border: 1.5px solid #1F4636; border-radius: 999px; color: #1F4636; font-weight: 600; text-decoration: none; }
a { color: #1F4636; text-underline-offset: 3px; }
a:focus-visible { outline: 3px solid #B85A2E; outline-offset: 3px; }
@media (hover: hover) { .boton:hover { background: #E2EADF; } }`.trim();

for (const r of REENVIOS) {
  const url = PLATAFORMA + r.destino;
  const script = scriptReenvio(url);
  const hash = createHash("sha256").update(script).digest("base64");
  const texto = textosReenvio(r);
  const correo = operacion?.correo;
  const html = `<!doctype html>
<html lang="es-CL">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${csp({ scripts: [`'sha256-${hash}'`] })}">
<meta name="robots" content="noindex">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#F5EFE4">
<title>${esc(texto.titulo)}</title>
<link rel="icon" href="${BASE}favicon.ico" sizes="32x32">
<link rel="icon" href="${BASE}favicon.svg" type="image/svg+xml">
<script>${script}</script>
<meta http-equiv="refresh" content="3; url=${esc(url)}">
<style>
${ESTILO_REENVIO}
</style>
</head>
<body>
<main>
<p class="logo">rumbo<span>.</span></p>
<p>${esc(texto.llevamos)}</p>
<p>${esc(texto.explicacion)}</p>
<p><a class="boton" href="${esc(url)}">${esc(texto.enlace)}</a></p>
${correo ? `<p>¿No carga? Escríbenos a <a href="mailto:${esc(correo)}">${esc(correo)}</a>.</p>\n` : ""}</main>
</body>
</html>
`;
  for (const ruta of r.rutas) escribir(ruta, html);
}

// 5. Guardián de marcadores: nunca se publica un marcador ni un dato vacío.
const problemas = escritos.flatMap(({ archivo, html }) => buscarMarcadores(html).map((p) => `${archivo}: ${p}`));
if (problemas.length) {
  throw new Error(`Guardián de marcadores: hay texto sin completar en el HTML generado:\n  - ${problemas.join("\n  - ")}`);
}

// 7. Con la base /rumbo-web/ los buscadores no leen este robots.txt (solo vale en la
// raíz del dominio). Se genera igual, para cuando haya dominio propio.
writeFileSync(
  join(DIST, "robots.txt"),
  `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`,
);

// 8. Sitemap: las páginas indexables, con barra final y fecha de revisión.
writeFileSync(
  join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paginas.map((p) => `  <url><loc>${SITE_URL}${p.ruta}</loc><lastmod>${p.revisada}</lastmod></url>`).join("\n")}
</urlset>
`,
);

// 9. El paquete de prerender no se publica. Sin .nojekyll: con despliegue por Actions no
// se usa Jekyll, y upload-pages-artifact excluye los archivos ocultos.
if (existsSync(SSR)) rmSync(SSR, { recursive: true });

console.log(
  `postbuild: ${paginas.length} páginas + 404 + ${REENVIOS.reduce((n, r) => n + r.rutas.length, 0)} reenvíos para ${SITE_URL} (base ${BASE})` +
    `${conAnalitica ? ", con analítica" : ""}${LANZAMIENTO ? ", puerta de lanzamiento superada" : ""}`,
);
