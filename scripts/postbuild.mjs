// Deja dist/ lista para cualquier hosting estático (GitHub Pages, Cloudflare,
// un servidor propio), sin reglas de redirección del proveedor:
// - una página por ruta para que /privacidad cargue directo,
// - 404.html con la misma app,
// - páginas de reenvío a la plataforma original (postular, Mi espacio, etc.),
// - robots.txt y sitemap.xml con la dirección pública.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const BASE = (process.env.BASE_PATH ?? "/").replace(/\/?$/, "/");
const SITE_URL = (process.env.SITE_URL ?? "https://diegolazo84.github.io/rumbo-web").replace(/\/$/, "");
const PLATAFORMA = "https://rumbo-acompanamiento-diego.diegolazo84.chatgpt.site";

const app = readFileSync(join(DIST, "index.html"), "utf8");

function escribir(ruta, html) {
  const dir = join(DIST, ruta);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
}

for (const ruta of ["privacidad"]) escribir(ruta, app);
writeFileSync(join(DIST, "404.html"), app);

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
  escribir(
    ruta,
    `<!doctype html>
<html lang="es-CL">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rumbo</title>
<script>location.replace(${JSON.stringify(url)} + location.search + location.hash);</script>
<meta http-equiv="refresh" content="0; url=${url}">
</head>
<body style="font-family:system-ui,sans-serif;background:#F5EFE4;color:#1d2621;padding:24px">
<p>Te llevamos a la plataforma de Rumbo. Si no avanza, <a href="${url}">entra aquí</a>.</p>
</body>
</html>
`,
  );
}

writeFileSync(
  join(DIST, "robots.txt"),
  `User-agent: *
Allow: /
Disallow: ${BASE}mi-programa
Disallow: ${BASE}estado

Sitemap: ${SITE_URL}/sitemap.xml
`,
);

writeFileSync(
  join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc></url>
  <url><loc>${SITE_URL}/privacidad</loc></url>
</urlset>
`,
);

// Evita que GitHub Pages procese dist/ con Jekyll.
writeFileSync(join(DIST, ".nojekyll"), "");

console.log(`postbuild: listo para ${SITE_URL} (base ${BASE})`);
