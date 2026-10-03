// Vista previa de la plataforma (etapa 0 «Piel», plataforma 2.1, 8 y 10): cada pantalla del
// registro se publica prerenderizada, con noindex y nofollow, sin canonical ni analítica,
// fuera del sitemap y sin enlaces desde la web pública. Hidrata sin errores, pasa axe
// (WCAG 2.2 AA), no se desborda a 320 px y sus objetivos táctiles miden 44 px o más.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { paginas } from "../src/data/paginas";
import { INDICE, pantallas } from "../src/pages/vista-previa/registro";
import { atributosVisibles, buscarFrases, buscarMarcadores, textoVisible } from "../scripts/marcadores.mjs";

const ETIQUETAS_AXE = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const relativa = (ruta: string) => ruta.replace(/^\//, "") || "./";
const todas = [{ ruta: INDICE.ruta, titulo: INDICE.titulo, nombre: "Índice" }, ...pantallas];

function vigilarConsola(page: Page) {
  const errores: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errores.push(m.text());
  });
  page.on("pageerror", (e) => errores.push(String(e)));
  return errores;
}

async function vigilarCsp(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  return () => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
}

const esperarHidratacion = (page: Page) =>
  page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));

// Objetivos táctiles visibles de menos de 44 px (los enlaces dentro de un texto corrido se exceptúan).
const objetivosChicos = (page: Page) =>
  page.evaluate(() => {
    const fuera: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("a, button, summary, label.accion, label.opcion, label.casilla")) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width < 2 || r.height < 2 || cs.visibility === "hidden" || el.closest("[hidden], .sr-only, .saltar, dialog:not([open])"))
        continue;
      if (el.tagName === "A" && cs.display === "inline") {
        let bloque = el.parentElement;
        while (bloque && getComputedStyle(bloque).display === "inline") bloque = bloque.parentElement;
        if (bloque && (bloque.textContent ?? "").trim() !== (el.textContent ?? "").trim()) continue;
      }
      if (r.height < 43.5) fuera.push(`${el.tagName.toLowerCase()} «${(el.textContent ?? "").trim().slice(0, 40)}»: ${r.height.toFixed(1)} px`);
    }
    return fuera;
  });

test.describe("registro de la vista previa", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "escritorio", "datos: basta un proyecto");
  });

  test("rutas únicas bajo /vista-previa/ y títulos de la especificación", () => {
    const rutas = todas.map((p) => p.ruta);
    expect(new Set(rutas).size).toBe(rutas.length);
    for (const p of pantallas) {
      expect(p.ruta, p.nombre).toMatch(/^\/vista-previa\/([a-z0-9-]+\/)+$/);
      expect(p.titulo, p.ruta).toMatch(/ · Rumbo$/);
      if (p.marco === "mi-espacio" || p.marco === "ingreso") expect(p.titulo, p.ruta).toMatch(/^[^·]+ · Mi espacio · Rumbo$/);
      if (p.marco === "panel") expect(p.titulo, p.ruta).toMatch(/^[^·]+ · Panel · Rumbo$/);
    }
  });

  test("fuera del sitemap y sin enlaces desde la web pública", async ({ request }) => {
    const sitemap = await (await request.get("sitemap.xml")).text();
    expect(sitemap).not.toContain("vista-previa");
    for (const ruta of [...paginas.map((p) => p.ruta), "/esta-ruta-no-existe/"]) {
      const html = await (await request.get(relativa(ruta))).text();
      expect(html, ruta).not.toContain("vista-previa/");
    }
  });
});

test.describe("HTML prerenderizado de la vista previa", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "escritorio", "HTML: basta un proyecto");
  });

  for (const p of todas) {
    test(`noindex, nofollow, sin analítica ni marcadores: ${p.ruta}`, async ({ request }) => {
      const r = await request.get(relativa(p.ruta), { maxRedirects: 0 });
      expect(r.status()).toBe(200);
      const html = await r.text();
      expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
      expect(html).not.toContain('rel="canonical"');
      expect(html).not.toMatch(/<script[^>]*umami/i);
      expect(html).toContain(`<title>${p.titulo}</title>`);
      expect(html).toContain('<div id="root" data-pagina="vista-previa">');
      expect(html.match(/<h1[\s>]/g)?.length, "un solo h1").toBe(1);
      expect(html).toMatch(/img-src 'self' data: blob:/);
      // Todo es ejemplo y lo dice.
      expect(textoVisible(html)).toContain("Ejemplo");
      expect(buscarMarcadores(html)).toEqual([]);
      const legible = [textoVisible(html), ...atributosVisibles(html).map((a) => a.valor)].join(" \n ");
      expect(buscarFrases(legible)).toEqual([]);
    });
  }
});

for (const p of todas) {
  test(`hidrata sin errores, axe y 320 px: ${p.ruta}`, async ({ page, isMobile }) => {
    const errores = vigilarConsola(page);
    const csp = await vigilarCsp(page);
    if (isMobile) await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(relativa(p.ruta));
    await esperarHidratacion(page);
    await expect(page.locator("main h1")).toHaveCount(1);
    // Las porciones perezosas terminan de hidratar: ya no hay estado de carga.
    await expect(page.locator(":is(main, .app__contenido) > .cargando")).toHaveCount(0);
    const { sw, cw } = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }));
    expect(sw, "desborde horizontal").toBe(cw);
    const r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
    expect(r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    if (isMobile) expect(await objetivosChicos(page)).toEqual([]);
    expect(errores).toEqual([]);
    expect(await csp()).toEqual([]);
  });
}

test("navegar desde el índice cambia el título y lleva el foco al h1", async ({ page }) => {
  const errores = vigilarConsola(page);
  await page.goto(relativa(INDICE.ruta));
  await esperarHidratacion(page);
  const destino = pantallas.find((p) => p.marco === "mi-espacio")!;
  await page.getByRole("link", { name: destino.nombre, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${destino.ruta}$`));
  await expect(page).toHaveTitle(destino.titulo);
  await expect(page.locator("main h1")).toBeFocused();
  await page.getByRole("link", { name: "Todas las pantallas" }).click();
  await expect(page).toHaveTitle(INDICE.titulo);
  expect(errores).toEqual([]);
});

// Base compartida: el catálogo ejercita validación, hoja y tostada con los mismos criterios.
test("componentes: validación al enviar, hoja y tostada sin violaciones", async ({ page }) => {
  const errores = vigilarConsola(page);
  await page.goto("vista-previa/componentes/");
  await esperarHidratacion(page);
  // Enviar vacío: resumen con foco y errores en línea ligados a cada campo.
  await page.getByRole("button", { name: "Enviar mensaje" }).first().click();
  const resumen = page.locator("#resumen-errores");
  await expect(resumen).toBeFocused();
  await expect(resumen.getByRole("heading")).toHaveText(/^Revisa \d+ campos? antes de enviar$/);
  await expect(page.locator("#c-correo")).toHaveAttribute("aria-invalid", "true");
  await resumen.getByRole("link").first().click();
  await expect(page.locator('input[name="motivo"]').first()).toBeFocused();
  // El error desaparece apenas se corrige.
  await page.locator("#c-correo").fill("camila@ejemplo.cl");
  await expect(page.locator("#c-correo")).not.toHaveAttribute("aria-invalid", "true");
  let r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  // Marcar una acción muestra la tostada (role=status); la hoja se abre, Escape la cierra y devuelve el foco.
  await page.getByRole("checkbox", { name: /^Marcar “.+” como hecha$/, checked: false }).first().check();
  await expect(page.locator(".tostada")).toBeVisible();
  const abrir = page.getByRole("button", { name: "Abrir una hoja" });
  await abrir.click();
  await expect(page.locator("dialog[open]")).toBeVisible();
  r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(abrir).toBeFocused();
  expect(errores).toEqual([]);
});
