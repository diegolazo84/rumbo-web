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

// Mismos valores que src/styles.css y src/data/rumbo.ts (tokens 2.1).
const C = {
  papel: "#f5efe4",
  superficie: "#fffdf8",
  linea: "#ddd2bf",
  lineaFuerte: "#887b69",
  tinta: "#1d2621",
  tintaSuave: "#4d5a52",
  bosque: "#1f4636",
  terracota: "#b85a2e",
  terracotaTexto: "#9a4522",
  ambar: "#f0b48f",
  proyecto: "#158b83",
  orden: "#3973c5",
  bienestar: "#b77b16",
};
const LEMA = "Ordena lo que importa. Avanza con apoyo.";
// Forma larga de ESTADO_PILOTO (rumbo.ts): en la imagen para redes cabe completa.
const ESTADO_PILOTO = "Piloto en preparación · En línea y en español";

const fuentes = `
@font-face { font-family: F; src: url(${FRAUNCES}) format("woff2"); font-weight: 100 900; }
@font-face { font-family: F; font-style: italic; src: url(${FRAUNCES_I}) format("woff2"); font-weight: 100 900; }
@font-face { font-family: S; src: url(${INSTRUMENT}) format("woff2"); font-weight: 400 700; }
* { box-sizing: border-box; margin: 0; }
body { -webkit-font-smoothing: antialiased; }`;

// Ruta de puntos (2.7): la misma curva y las mismas paradas que src/components/RutaPuntos.tsx.
const rutaPuntos = `<svg class="ruta" viewBox="0 0 600 200" fill="none" aria-hidden="true">
  <path d="M8 160 C140 160 160 40 300 60 S470 170 592 40" stroke="${C.lineaFuerte}" stroke-opacity=".5"
    stroke-width="1.5" stroke-linecap="round" stroke-dasharray="0.1 10" />
  <circle cx="8" cy="160" r="4" fill="${C.proyecto}" />
  <circle cx="300" cy="60" r="4" fill="${C.orden}" />
  <circle cx="470" cy="150" r="4" fill="${C.bienestar}" />
  <circle cx="592" cy="40" r="5" stroke="${C.terracota}" stroke-width="1.5" />
</svg>`;

const accion = (color, titulo, detalle) => `
  <div class="accion" style="--c:${color}"><span class="caja"></span><div><b>${titulo}</b><small>${detalle}</small></div></div>`;

// Imagen para redes (6.4): papel con cuadrícula de agenda, logo, H1, lema, etiqueta en contorno,
// tarjeta de ejemplo con tres acciones en orden de días (lunes, martes, miércoles) y la ruta de
// puntos. Sin precios, testimonios ni personas.
const og = `<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><style>${fuentes}
body { position: relative; width: 1200px; height: 630px; background: ${C.papel}; color: ${C.tinta};
  font-family: S; display: grid; grid-template-columns: 1fr 430px; gap: 56px; padding: 60px 72px;
  align-items: center; overflow: hidden; }
/* Cuadrícula de agenda, igual que .portada::before */
body::before { content: ""; position: absolute; inset: 0;
  background-image: linear-gradient(to right, rgb(29 38 33 / .045) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(29 38 33 / .045) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(60% 70% at 75% 45%, black, transparent 70%); }
.ruta { position: absolute; left: 24px; bottom: -36px; width: 660px; opacity: .6; }
.texto, .tarjeta { position: relative; }
.logo { font-family: F; font-weight: 600; font-size: 44px; line-height: 1; color: ${C.bosque}; letter-spacing: -0.01em; }
.logo span { color: ${C.terracota}; }
h1 { font-family: F; font-weight: 500; font-size: 58px; line-height: 1.06; letter-spacing: -0.025em; margin: 30px 0 18px; text-wrap: balance; }
h1 em { color: ${C.terracota}; }
.lema { font-family: F; font-style: italic; font-weight: 500; font-size: 27px; line-height: 1.45; color: ${C.tintaSuave}; }
.insignia { display: inline-block; margin-top: 28px; border: 1.5px solid ${C.lineaFuerte}; color: ${C.tinta};
  font-weight: 600; font-size: 20px; padding: 9px 18px; border-radius: 999px; }
.tarjeta { background: ${C.superficie}; border: 1px solid ${C.linea}; border-radius: 24px; padding: 24px;
  box-shadow: 0 28px 64px -32px rgb(31 70 54 / .45); display: grid; gap: 12px; }
.ejemplo { justify-self: start; border: 1.5px dashed ${C.terracotaTexto}; color: ${C.terracotaTexto};
  font-weight: 600; font-size: 16px; letter-spacing: .01em; padding: 6px 14px; border-radius: 999px; }
.accion { display: flex; gap: 12px; align-items: flex-start; padding: 13px 14px; border-radius: 10px;
  background: color-mix(in srgb, var(--c) 12%, ${C.superficie}); box-shadow: inset 3px 0 0 var(--c); }
.caja { width: 20px; height: 20px; border-radius: 5px; border: 1.5px solid var(--c); flex: none; margin-top: 3px; }
.accion b { display: block; font-family: S; font-size: 19px; font-weight: 600; line-height: 1.25; }
.accion small { font-size: 15px; color: ${C.tintaSuave}; }
</style></head><body>
${rutaPuntos}
<div class="texto">
  <div class="logo">rumbo<span>.</span></div>
  <h1>Tu meta, convertida en una <em>semana posible.</em></h1>
  <p class="lema">${LEMA}</p>
  <span class="insignia">${ESTADO_PILOTO}</span>
</div>
<div class="tarjeta">
  <span class="ejemplo">Ejemplo</span>
  ${accion(C.bienestar, "Cerrar el día: 3 cosas que hiciste", "Lunes 21:00 · 10 min · Bienestar")}
  ${accion(C.orden, "Reservar 2 bloques de trabajo", "Martes 09:00 · 20 min · Organización")}
  ${accion(C.proyecto, "Conversar con un posible cliente", "Miércoles 18:00 · 45 min · Proyecto")}
</div>
</body></html>`;

// Ícono: «r» en Fraunces sobre bosque, punto ámbar (decisión D9). relleno = margen para íconos maskable.
const icono = (lado, { relleno = 0, redondeo = true } = {}) => `<!doctype html><html><head><meta charset="utf-8"><style>${fuentes}
html, body { width: ${lado}px; height: ${lado}px; background: ${redondeo ? "transparent" : C.bosque}; }
.i { width: 100%; height: 100%; background: ${C.bosque}; border-radius: ${redondeo ? "22%" : "0"};
  position: relative; display: grid; place-items: center; }
.r { font-family: F; font-weight: 600; color: ${C.papel}; font-size: ${lado * (1 - relleno * 2) * 0.78}px;
  line-height: 1; transform: translate(-${lado * 0.05}px, -${lado * 0.06}px); font-variation-settings: "opsz" 72; }
.p { position: absolute; width: ${lado * (1 - relleno * 2) * 0.13}px; height: ${lado * (1 - relleno * 2) * 0.13}px;
  border-radius: 50%; background: ${C.ambar}; left: ${lado * (0.5 + (1 - relleno * 2) * 0.155)}px; top: ${lado * (0.5 + (1 - relleno * 2) * 0.13)}px; }
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
