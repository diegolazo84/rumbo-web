// Genera la imagen para redes (1200×630) y los íconos PNG/ICO a partir de HTML
// con las fuentes locales de @fontsource. Sin servicios externos.
// Uso: npm run imagenes   (requiere `npx playwright install chromium` una vez)
// Los archivos resultantes se guardan en public/ y se versionan en git.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { chromium } from "@playwright/test";

const require = createRequire(import.meta.url);
// Las fuentes van incrustadas como data: (una página creada con setContent no puede leer file://).
const archivoFuente = (paquete, archivo) =>
  "data:font/woff2;base64," +
  readFileSync(join(dirname(require.resolve(`${paquete}/package.json`)), "files", archivo)).toString("base64");

const FRAUNCES = archivoFuente("@fontsource-variable/fraunces", "fraunces-latin-opsz-normal.woff2");
const FRAUNCES_I = archivoFuente("@fontsource-variable/fraunces", "fraunces-latin-opsz-italic.woff2");
const INSTRUMENT = archivoFuente("@fontsource-variable/instrument-sans", "instrument-sans-latin-wght-normal.woff2");

// Mismos valores que src/styles.css y src/data/rumbo.ts.
const C = {
  papel: "#f5efe4",
  papel2: "#ede4d4",
  blanco: "#fffdf8",
  tinta: "#1d2621",
  tintaSuave: "#4d5a52",
  verde: "#1f4636",
  calido: "#b85a2e",
  proyecto: "#158b83",
  orden: "#3973c5",
  bienestar: "#b77b16",
};

const fuentes = `
@font-face { font-family: F; src: url(${FRAUNCES}) format("woff2"); font-weight: 100 900; }
@font-face { font-family: F; font-style: italic; src: url(${FRAUNCES_I}) format("woff2"); font-weight: 100 900; }
@font-face { font-family: S; src: url(${INSTRUMENT}) format("woff2"); font-weight: 400 700; }
* { box-sizing: border-box; margin: 0; }
body { -webkit-font-smoothing: antialiased; }`;

const accion = (color, titulo, detalle) => `
  <div class="accion" style="--c:${color}"><span class="caja"></span><div><b>${titulo}</b><small>${detalle}</small></div></div>`;

const og = `<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><style>${fuentes}
body { width: 1200px; height: 630px; background: ${C.papel}; color: ${C.tinta}; font-family: S; display: grid;
  grid-template-columns: 1fr 430px; gap: 56px; padding: 64px 72px; align-items: center; overflow: hidden; }
.logo { font-family: F; font-weight: 600; font-size: 44px; color: ${C.verde}; letter-spacing: -0.01em; }
.logo span { color: ${C.calido}; }
h1 { font-family: F; font-weight: 600; font-size: 68px; line-height: 1.04; letter-spacing: -0.02em; margin: 34px 0 22px; }
h1 em { color: ${C.calido}; font-weight: 500; }
p { font-size: 25px; line-height: 1.35; color: ${C.tintaSuave}; max-width: 30em; }
.insignia { display: inline-block; margin-top: 26px; background: #e2eadf; color: ${C.verde}; font-weight: 600;
  font-size: 20px; padding: 8px 18px; border-radius: 999px; }
.tarjeta { background: ${C.blanco}; border: 1px solid #ddd2bf; border-radius: 26px; padding: 26px;
  box-shadow: 0 30px 60px -36px rgba(31,70,54,.5); display: grid; gap: 12px; }
.tarjeta h2 { font-family: S; font-size: 15px; letter-spacing: .1em; text-transform: uppercase; color: ${C.tintaSuave}; }
.accion { display: flex; gap: 12px; align-items: flex-start; padding: 13px 14px; border-radius: 12px;
  background: color-mix(in srgb, var(--c) 10%, white); border-left: 5px solid var(--c); }
.caja { width: 20px; height: 20px; border-radius: 5px; border: 2px solid var(--c); flex: none; margin-top: 2px; }
.accion b { display: block; font-size: 19px; font-weight: 600; line-height: 1.25; }
.accion small { font-size: 15px; color: ${C.tintaSuave}; }
.nota { background: #f3e0d2; border-radius: 12px; padding: 12px 14px; font-size: 16px; line-height: 1.35; }
</style></head><body>
<div>
  <div class="logo">rumbo<span>.</span></div>
  <h1>Tu meta, convertida en una <em>semana posible.</em></h1>
  <p>Un calendario de acciones concretas y una persona que revisa tu avance contigo.</p>
  <span class="insignia">Piloto en preparación · Santiago de Chile</span>
</div>
<div class="tarjeta" aria-hidden="true">
  <h2>Ejemplo de semana</h2>
  ${accion(C.proyecto, "Conversar con un posible cliente", "Miércoles 18:00 · 45 min")}
  ${accion(C.orden, "Reservar 2 bloques de trabajo", "Martes 09:00 · 20 min")}
  ${accion(C.bienestar, "Cerrar el día: 3 cosas que hiciste", "Lunes 21:00 · 10 min")}
  <div class="nota">«Ajustemos la próxima semana a lo que sí funcionó.»</div>
</div>
</body></html>`;

// Ícono: «r» en Fraunces sobre verde, punto cálido. relleno = margen para íconos maskable.
const icono = (lado, { relleno = 0, redondeo = true } = {}) => `<!doctype html><html><head><meta charset="utf-8"><style>${fuentes}
html, body { width: ${lado}px; height: ${lado}px; background: ${redondeo ? "transparent" : C.verde}; }
.i { width: 100%; height: 100%; background: ${C.verde}; border-radius: ${redondeo ? "22%" : "0"};
  position: relative; display: grid; place-items: center; }
.r { font-family: F; font-weight: 600; color: ${C.papel}; font-size: ${lado * (1 - relleno * 2) * 0.78}px;
  line-height: 1; transform: translate(-${lado * 0.05}px, -${lado * 0.06}px); font-variation-settings: "opsz" 72; }
.p { position: absolute; width: ${lado * (1 - relleno * 2) * 0.13}px; height: ${lado * (1 - relleno * 2) * 0.13}px;
  border-radius: 50%; background: #d9822b; left: ${lado * (0.5 + (1 - relleno * 2) * 0.155)}px; top: ${lado * (0.5 + (1 - relleno * 2) * 0.13)}px; }
</style></head><body><div class="i"><span class="r">r</span><span class="p"></span></div></body></html>`;

// ICO con un PNG embebido (formato aceptado por todos los navegadores actuales).
function ico(png) {
  const cab = Buffer.alloc(22);
  cab.writeUInt16LE(0, 0);
  cab.writeUInt16LE(1, 2);
  cab.writeUInt16LE(1, 4);
  cab.writeUInt8(32, 6);
  cab.writeUInt8(32, 7);
  cab.writeUInt8(0, 8);
  cab.writeUInt8(0, 9);
  cab.writeUInt16LE(1, 10);
  cab.writeUInt16LE(32, 12);
  cab.writeUInt32LE(png.length, 14);
  cab.writeUInt32LE(22, 18);
  return Buffer.concat([cab, png]);
}

const SALIDA = process.env.SALIDA ?? "public";
const navegador = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

async function capturar(html, ancho, alto, transparente = false) {
  const pagina = await navegador.newPage({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1 });
  await pagina.setContent(html, { waitUntil: "load" });
  await pagina.evaluate(() => document.fonts.ready);
  // Fuentes declaradas: las usadas deben quedar "loaded"; ninguna puede quedar en "error".
  const estados = await pagina.evaluate(() => [...document.fonts].map((f) => `${f.family}/${f.style}:${f.status}`));
  if (estados.some((e) => e.endsWith(":error")) || !estados.some((e) => e.endsWith(":loaded"))) {
    throw new Error(`Fuentes sin cargar (${estados.join(", ")}): revisa las rutas de @fontsource.`);
  }
  const png = await pagina.screenshot({ type: "png", omitBackground: transparente });
  await pagina.close();
  return png;
}

mkdirSync(join(SALIDA, "og"), { recursive: true });
mkdirSync(join(SALIDA, "icons"), { recursive: true });

writeFileSync(join(SALIDA, "og/rumbo-1200x630.png"), await capturar(og, 1200, 630));
const png32 = await capturar(icono(32), 32, 32, true);
writeFileSync(join(SALIDA, "favicon-32.png"), png32);
writeFileSync(join(SALIDA, "favicon.ico"), ico(png32));
// apple-touch-icon: sin transparencia (iOS pinta el fondo de negro) y sin redondeo (iOS lo aplica).
writeFileSync(join(SALIDA, "apple-touch-icon.png"), await capturar(icono(180, { redondeo: false }), 180, 180));
writeFileSync(join(SALIDA, "icons/icono-192.png"), await capturar(icono(192), 192, 192, true));
writeFileSync(join(SALIDA, "icons/icono-512.png"), await capturar(icono(512), 512, 512, true));
writeFileSync(
  join(SALIDA, "icons/icono-maskable-512.png"),
  await capturar(icono(512, { relleno: 0.1, redondeo: false }), 512, 512),
);

await navegador.close();
console.log(`imagenes: listas en ${SALIDA}/ (og, favicon.ico, favicon-32, apple-touch-icon, icons/)`);
