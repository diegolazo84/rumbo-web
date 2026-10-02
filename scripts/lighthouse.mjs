// Lighthouse contra dist/ servido como GitHub Pages (especificación 6.9), en móvil y en
// escritorio, para las 4 páginas. Guarda los informes JSON en lighthouse/ y falla si:
// accesibilidad < 100, buenas prácticas o SEO < 95, rendimiento en móvil < 90 en local
// (< 85 en CI, por el ruido de los servidores) o en escritorio < 95.
// Uso: npm run lighthouse   (después de npm run build)
// Variables: CHROME_PATH (si no, el Chromium de Playwright), PUERTO_LIGHTHOUSE,
// CORRIDAS (por defecto 3 en local y 1 en CI; se toma la mediana).
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const VERSION = "13.5.0";
const BASE = (process.env.BASE_PATH || "/rumbo-web/").replace(/\/?$/, "/");
const PUERTO = Number(process.env.PUERTO_LIGHTHOUSE ?? 4180);
const CI = !!process.env.CI;
const CORRIDAS = Number(process.env.CORRIDAS ?? (CI ? 1 : 3));
const CHROME = process.env.CHROME_PATH || chromium.executablePath();
const SALIDA = "lighthouse";
const RUTAS = { inicio: "", privacidad: "privacidad/", condiciones: "condiciones/", ayuda: "ayuda/" };
const MODOS = {
  movil: { flags: [], umbrales: { performance: CI ? 85 : 90, accessibility: 100, "best-practices": 95, seo: 95 } },
  escritorio: { flags: ["--preset=desktop"], umbrales: { performance: 95, accessibility: 100, "best-practices": 95, seo: 95 } },
};

mkdirSync(SALIDA, { recursive: true });
const servidor = spawn(process.execPath, ["scripts/servidor-pages.mjs", "dist", String(PUERTO), BASE], { stdio: "ignore" });
const cerrar = () => servidor.kill();
process.on("exit", cerrar);

// Espera a que el servidor responda.
for (let i = 0; ; i++) {
  try {
    if ((await fetch(`http://localhost:${PUERTO}${BASE}`)).ok) break;
  } catch {}
  if (i > 50) throw new Error("El servidor local no respondió.");
  await new Promise((r) => setTimeout(r, 100));
}

const mediana = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
const fallas = [];

for (const [modo, { flags, umbrales }] of Object.entries(MODOS)) {
  for (const [id, ruta] of Object.entries(RUTAS)) {
    const puntajes = {};
    for (let n = 1; n <= CORRIDAS; n++) {
      const archivo = join(SALIDA, `${id}-${modo}${CORRIDAS > 1 ? `-${n}` : ""}.json`);
      const r = spawnSync(
        "npx",
        [
          "--yes",
          `lighthouse@${VERSION}`,
          `http://localhost:${PUERTO}${BASE}${ruta}`,
          ...flags,
          "--only-categories=performance,accessibility,best-practices,seo",
          "--output=json",
          `--output-path=${archivo}`,
          "--chrome-flags=--headless=new --no-sandbox --disable-gpu",
          "--quiet",
        ],
        { stdio: "inherit", env: { ...process.env, CHROME_PATH: CHROME } },
      );
      if (r.status !== 0) throw new Error(`Lighthouse falló en ${id} (${modo}).`);
      const { categories } = JSON.parse(readFileSync(archivo, "utf8"));
      for (const [cat, { score }] of Object.entries(categories)) (puntajes[cat] ??= []).push(Math.round(score * 100));
    }
    const resumen = Object.entries(umbrales).map(([cat, minimo]) => {
      const valor = mediana(puntajes[cat]);
      if (valor < minimo) fallas.push(`${id} (${modo}): ${cat} ${valor} < ${minimo}`);
      return `${cat} ${valor}`;
    });
    console.log(`lighthouse ${id} (${modo}): ${resumen.join(" · ")}`);
  }
}

cerrar();
if (fallas.length) {
  console.error(`Lighthouse bajo el umbral:\n  - ${fallas.join("\n  - ")}`);
  process.exit(1);
}
console.log(`lighthouse: todo sobre el umbral (${CORRIDAS} corrida${CORRIDAS > 1 ? "s, mediana" : ""}).`);
