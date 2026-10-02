// Servidor estático que imita GitHub Pages para un sitio de proyecto:
// - monta dist/ bajo BASE (p. ej. /rumbo-web/)
// - carpeta sin barra final -> 301 a la misma ruta con barra (conserva ?query)
// - /ruta sirve /ruta.html si existe
// - si no existe nada -> BASE/404.html con estado 404
// - gzip para tipos de texto, Cache-Control: max-age=600 como Pages
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { gzipSync } from "node:zlib";

const [, , DIR = "dist", PORT = "4173", BASE = "/rumbo-web/"] = process.argv;
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function enviar(req, res, archivo, estado = 200) {
  const tipo = TIPOS[extname(archivo)] ?? "application/octet-stream";
  let cuerpo = readFileSync(archivo);
  const cab = { "Content-Type": tipo, "Cache-Control": "max-age=600" };
  if (/text|javascript|json|xml|svg/.test(tipo) && /gzip/.test(req.headers["accept-encoding"] ?? "")) {
    cuerpo = gzipSync(cuerpo);
    cab["Content-Encoding"] = "gzip";
  }
  res.writeHead(estado, cab);
  res.end(cuerpo);
}

createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let ruta = decodeURIComponent(url.pathname);
  if (ruta === BASE.slice(0, -1)) {
    res.writeHead(301, { Location: BASE + url.search });
    return res.end();
  }
  if (!ruta.startsWith(BASE)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("404 (fuera de la base)");
  }
  const rel = normalize(ruta.slice(BASE.length)).replace(/^(\.\.[/\\])+/, "");
  const abs = join(DIR, rel);
  if (existsSync(abs) && statSync(abs).isDirectory()) {
    if (!ruta.endsWith("/")) {
      res.writeHead(301, { Location: ruta + "/" + url.search });
      return res.end();
    }
    if (existsSync(join(abs, "index.html"))) return enviar(req, res, join(abs, "index.html"));
  } else if (existsSync(abs)) {
    return enviar(req, res, abs);
  } else if (existsSync(abs + ".html")) {
    return enviar(req, res, abs + ".html");
  }
  const e404 = join(DIR, "404.html");
  if (existsSync(e404)) return enviar(req, res, e404, 404);
  res.writeHead(404);
  res.end("404");
}).listen(Number(PORT), () => console.log(`Pages simulado: http://localhost:${PORT}${BASE} -> ${DIR}`));
