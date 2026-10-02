// Contraste y sistema de diseño (especificación 2.1, 2.2, 2.5 y 6.9): recalcula la tabla
// de contraste desde los tokens de src/styles.css, revisa que ninguna hoja use colores,
// tamaños, radios o sombras fuera de los tokens, y que la portada solo use valores de la escala.
import { readFileSync, readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const HOJA = "src/styles.css";
const HOJAS = [HOJA, ...readdirSync("src/styles").filter((f) => f.endsWith(".css")).map((f) => `src/styles/${f}`)];
const css = readFileSync(HOJA, "utf8");

// Primer bloque :root (2.1): ahí viven todos los tokens.
const inicioRoot = css.indexOf(":root {");
const bloqueRoot = css.slice(inicioRoot, css.indexOf("\n}", inicioRoot) + 2);
const tokens = Object.fromEntries(
  [...bloqueRoot.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]),
);

// ---------------------------------------------------------------------------
// Colores y fórmula WCAG 2.2

type Rgba = [number, number, number, number];
function color(nombre: string): Rgba {
  const v = tokens[nombre];
  if (!v) throw new Error(`No existe el token --${nombre}`);
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(1) as Rgba;
  const rgb = v.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+))?\s*\)$/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] ? Number(rgb[4]) : 1];
  const ref = v.match(/^var\(--([\w-]+)\)$/);
  if (ref) return color(ref[1]);
  throw new Error(`--${nombre} no es un color: ${v}`);
}
// Capas de abajo hacia arriba: ["bosque", "superficie-oscura"] = superficie oscura sobre bosque.
const sobre = ([r, g, b, a]: Rgba, [fr, fg, fb]: Rgba): Rgba => [r * a + fr * (1 - a), g * a + fg * (1 - a), b * a + fb * (1 - a), 1];
const componer = (capas: string[]) => capas.slice(1).reduce((fondo, c) => sobre(color(c), fondo), color(capas[0]));
const lineal = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminancia = ([r, g, b]: Rgba) => 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
function ratio(texto: string, fondo: string | string[]) {
  const f = componer(Array.isArray(fondo) ? fondo : [fondo]);
  const t = sobre(color(texto), f);
  const [a, b] = [luminancia(t), luminancia(f)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

// Tabla 2.2: [texto, fondo, umbral, ratio publicado]. 4,5 texto normal; 3 texto grande y no textual.
const OSCURO_AVISO = ["bosque", "superficie-oscura"];
const PARES: [string, string | string[], number, number][] = [
  // Texto sobre fondos claros
  ["tinta", "papel", 4.5, 13.58],
  ["tinta", "papel-hondo", 4.5, 12.32],
  ["tinta", "superficie", 4.5, 15.29],
  ["tinta", "niebla", 4.5, 12.63],
  ["tinta", "terracota-suave", 4.5, 12.14],
  ["tinta-suave", "papel", 4.5, 6.33],
  ["tinta-suave", "papel-hondo", 4.5, 5.74],
  ["tinta-suave", "superficie", 4.5, 7.12],
  ["tinta-suave", "niebla", 4.5, 5.89],
  ["bosque", "papel", 4.5, 9.23],
  ["bosque", "papel-hondo", 4.5, 8.38],
  ["bosque", "superficie", 4.5, 10.39],
  ["bosque", "niebla", 4.5, 8.59],
  ["terracota-texto", "papel", 4.5, 5.65],
  ["terracota-texto", "papel-hondo", 4.5, 5.13],
  ["terracota-texto", "superficie", 4.5, 6.36],
  ["terracota-texto", "terracota-suave", 4.5, 5.05],
  ["terracota", "papel", 3, 4.04], // solo texto ≥24 px
  ["terracota", "papel-hondo", 3, 3.67], // solo texto ≥24 px
  // Texto sobre fondos oscuros
  ["sobre-oscuro", "bosque", 4.5, 9.23],
  ["sobre-oscuro", "bosque-hondo", 4.5, 11.52],
  ["superficie", "bosque", 4.5, 10.39],
  ["sobre-oscuro-suave", "bosque", 4.5, 5.66],
  ["sobre-oscuro-suave", "bosque-hondo", 4.5, 6.74],
  ["ambar", "bosque", 4.5, 5.85],
  ["ambar", "bosque-hondo", 4.5, 7.3],
  ["sobre-oscuro", OSCURO_AVISO, 4.5, 7.88],
  ["sobre-oscuro-suave", OSCURO_AVISO, 4.5, 4.83],
  ["ambar", OSCURO_AVISO, 4.5, 4.99],
  // Categorías: texto sobre papel, hondo, superficie y su fondo; tinta y tinta suave sobre su fondo
  ...(["proyecto", "orden", "bienestar"] as const).flatMap((c): [string, string, number, number][] => [
    [`${c}-texto`, "papel", 4.5, 5.09],
    [`${c}-texto`, "papel-hondo", 4.5, 4.62],
    [`${c}-texto`, "superficie", 4.5, 5.74],
    [`${c}-texto`, `${c}-fondo`, 4.5, 4.91],
    ["tinta", `${c}-fondo`, 4.5, 13.08],
    ["tinta-suave", `${c}-fondo`, 4.5, 6.1],
    // No textuales: base de categoría sobre superficie y su fondo; check blanco sobre la base
    [c, "superficie", 3, 3.53],
    [c, `${c}-fondo`, 3, 3.09],
    ["sobre-categoria", c, 3, 3.58],
  ]),
  // Elementos no textuales: foco, bordes de controles y barra
  ["terracota", "superficie", 3, 4.55],
  ["terracota", "niebla", 3, 3.76],
  ["ambar", OSCURO_AVISO, 3, 4.99],
  ["linea-fuerte", "papel", 3, 3.61],
  ["linea-fuerte", "papel-hondo", 3, 3.27],
  ["linea-fuerte", "superficie", 3, 4.06],
  ["bosque", "papel-hondo", 3, 8.38],
];

test.describe("tokens y contraste", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "escritorio" || !!process.env.URL_PRUEBA, "lee src/: basta un proyecto local");
  });

  test("tabla 2.2: ningún par bajo su umbral", () => {
    const bajos = PARES.filter(([t, f, umbral]) => ratio(t, f) < umbral).map(
      ([t, f, umbral]) => `${t} sobre ${[f].flat().join("+")}: ${ratio(t, f).toFixed(2)} < ${umbral}`,
    );
    expect(bajos).toEqual([]);
    // El foco terracota sobre bosque (2,28) y el ámbar sobre claro (1,78) siguen prohibidos: si dejaran
    // de fallar, la regla de foco de 2.5 dejaría de tener sentido y habría que revisar la tabla.
    expect(ratio("terracota", "bosque")).toBeLessThan(3);
    expect(ratio("ambar", "papel")).toBeLessThan(3);
  });

  test("tokens: 13 tamaños, 4 radios y 2 sombras", () => {
    const nombres = Object.keys(tokens);
    expect(nombres.filter((n) => n.startsWith("t-"))).toEqual([
      "t-display", "t-titulo", "t-h2", "t-h3", "t-precio", "t-voz", "t-lead",
      "t-base", "t-s", "t-xs", "t-micro", "t-logo", "t-logo-chico",
    ]);
    expect(nombres.filter((n) => n.startsWith("r-"))).toEqual(["r-s", "r-m", "r-l", "r-full"]);
    expect(nombres.filter((n) => n.startsWith("sombra-"))).toEqual(["sombra-1", "sombra-2"]);
    expect([tokens["r-s"], tokens["r-m"], tokens["r-l"], tokens["r-full"]]).toEqual(["10px", "16px", "24px", "999px"]);
  });

  test("hojas de estilo: nada de colores, tamaños, radios ni sombras fuera de :root", () => {
    const fuera: string[] = [];
    for (const archivo of HOJAS) {
      let texto = readFileSync(archivo, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      if (archivo === HOJA) texto = texto.replace(bloqueRoot.replace(/\/\*[\s\S]*?\*\//g, ""), "");
      for (const m of texto.matchAll(/([\w-]+)\s*:\s*([^;{}]+)/g)) {
        const [prop, valor] = [m[1].toLowerCase(), m[2].trim().replace(/\s*!important$/, "")];
        const linea = `${archivo}: ${prop}: ${valor}`;
        if (/#[0-9a-f]{3,8}\b/i.test(valor)) fuera.push(`hex: ${linea}`);
        if (prop === "font-size" && !/^(var\(--t-[\w-]+\)|inherit)$/.test(valor)) fuera.push(`tamaño: ${linea}`);
        if (prop === "font" && !/var\(--t-[\w-]+\)|^inherit$/.test(valor)) fuera.push(`tamaño: ${linea}`);
        if (/^border(-[\w]+)*-radius$/.test(prop) && !/^((var\(--r-[\w-]+\)|0|50%|inherit)\s*)+$/.test(valor))
          fuera.push(`radio: ${linea}`);
        // La barra de categoría del calendario (3.13) es un borde dibujado con inset, no una sombra.
        if (prop === "box-shadow" && !/^(var\(--sombra-[12]\)|none|inset -?\d+px 0 0 var\(--[\w-]+\))$/.test(valor))
          fuera.push(`sombra: ${linea}`);
      }
    }
    expect(fuera).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Estilos computados de la portada

test("portada: radios, tamaños de texto y fondos de capítulo dentro del sistema", async ({ page }) => {
  await page.goto("./");
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
  const fuera = await page.evaluate(() => {
    // Valores de la escala a este ancho: se miden con una sonda, así las fórmulas clamp() coinciden.
    const escala = new Set<string>();
    const sonda = document.createElement("span");
    document.body.append(sonda);
    for (const t of ["display", "titulo", "h2", "h3", "precio", "voz", "lead", "base", "s", "xs", "micro", "logo", "logo-chico"]) {
      sonda.style.fontSize = `var(--t-${t})`;
      escala.add(getComputedStyle(sonda).fontSize);
    }
    const fondos = new Set<string>();
    for (const c of ["papel", "papel-hondo", "bosque"]) {
      sonda.style.backgroundColor = `var(--${c})`;
      fondos.add(getComputedStyle(sonda).backgroundColor);
    }
    sonda.remove();

    const radios = new Set(["0px", "10px", "16px", "24px", "999px", "50%"]);
    const problemas = new Set<string>();
    const nombre = (e: Element) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).join(".") : ""}`;
    for (const el of [document.body, ...document.body.querySelectorAll("*")]) {
      if (el.closest("script, style, noscript")) continue;
      for (const pseudo of [null, "::before", "::after"]) {
        const cs = getComputedStyle(el, pseudo);
        if (pseudo && (cs.content === "none" || cs.content === "normal")) continue;
        if (!escala.has(cs.fontSize)) problemas.add(`font-size ${cs.fontSize}: ${nombre(el)}${pseudo ?? ""}`);
        for (const esquina of ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius"] as const) {
          for (const v of cs[esquina].split(" ")) {
            if (!radios.has(v)) problemas.add(`radio ${v}: ${nombre(el)}${pseudo ?? ""}`);
          }
        }
      }
    }
    for (const s of document.querySelectorAll("section.capitulo")) {
      const bg = getComputedStyle(s).backgroundColor;
      if (!fondos.has(bg)) problemas.add(`fondo de capítulo ${bg}: ${nombre(s)}`);
    }
    return [...problemas];
  });
  expect(fuera).toEqual([]);
});
