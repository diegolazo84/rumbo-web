// Informe de cierre de ciclo (maqueta de ChatGPT, 30-oct-2026) en la vista previa: lo mismo que
// calcula informe_ciclo sobre el escenario de ejemplo, sin mensajes de coach inventados. La versión
// real (informe_ciclo, mensaje de cierre y módulo de reconocimientos) se prueba en
// mi-espacio-real.spec.ts; el mensaje de cierre en la base, en pruebas/base/matriz.mjs.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { T_CIERRE as T } from "../src/pages/vista-previa/mi-espacio/textos";

const RUTA = "vista-previa/mi-espacio/programa/cerrado/";
const tarjeta = (page: Page, titulo: string) => page.locator("section.ml-tarjeta", { has: page.getByRole("heading", { level: 2, name: titulo }) });

async function abrir(page: Page) {
  await page.goto(RUTA);
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
  await expect(page.locator(".ic-progreso")).toBeVisible();
}

test("portada, objetivos y progreso del ciclo que cuadran", async ({ page }) => {
  await abrir(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(T.titulo);
  await expect(page.locator(".ic-chip")).toHaveText(T.chip);
  await expect(tarjeta(page, T.objetivo.varios).locator("li")).toHaveCount(3);
  const p = tarjeta(page, T.progreso.titulo);
  const barra = p.getByRole("progressbar");
  const hechas = Number(await barra.getAttribute("aria-valuenow"));
  const programadas = Number(await barra.getAttribute("aria-valuemax"));
  expect(programadas).toBeGreaterThan(0);
  await expect(p.locator(".ic-progreso__pct")).toHaveText(`${Math.round((100 * hechas) / programadas)}%`);
  await expect(p).toContainText(T.progreso.deTotal(hechas, programadas));
  await expect(p.locator(".ic-dato")).toHaveCount(3);
  await expect(p.locator(".ic-dato--hechas .ic-dato__n")).toHaveText(String(hechas));
});

test("evolución por semana, áreas por meta y logros conseguidos", async ({ page }) => {
  await abrir(page);
  const evo = tarjeta(page, T.evolucion.titulo);
  await expect(evo.locator(".ic-grafico__semanas li")).toHaveCount(4);
  await expect(evo.getByRole("img")).toHaveAttribute("aria-label", /^Acciones hechas por semana: semana 1, \d+ de \d+;/);
  const areas = tarjeta(page, T.areas.titulo);
  expect(await areas.locator(".ic-area").count()).toBeGreaterThan(0);
  for (const a of await areas.locator(".ic-area").all()) await expect(a.getByRole("progressbar")).toHaveAttribute("aria-valuetext", /^\d+ %: \d+ de \d+ acciones$/);
  const logros = tarjeta(page, T.logros.titulo);
  expect(await logros.locator(".ic-logro").count()).toBeGreaterThan(0);
  await expect(logros.locator("time").first()).toHaveText(/^Conseguido el \d+ de \w+/);
  await expect(logros.getByRole("link", { name: T.logros.ver })).toHaveAttribute("href", /mi-espacio\/logros\/$/);
});

test("sin mensaje inventado: el último foco del coach; qué sigue con acciones reales", async ({ page }) => {
  await abrir(page);
  await expect(page.getByRole("heading", { name: T.coach.mensaje })).toHaveCount(0);
  const foco = tarjeta(page, T.coach.foco);
  await expect(foco).toContainText(/Revisión de la semana \d/);
  const sigue = tarjeta(page, T.sigue.titulo);
  await expect(sigue.getByRole("link", { name: T.sigue.nuevo })).toHaveAttribute("href", /\/contacto\/\?motivo=solicitud$/);
  const descarga = page.waitForEvent("download");
  await sigue.getByRole("button", { name: T.sigue.descargar }).click();
  expect((await descarga).suggestedFilename()).toBe("mis-datos-rumbo-ejemplo.json");
  await expect(sigue.getByRole("link", { name: T.sigue.revision })).toBeVisible();
});

test("accesible y sin desbordes", async ({ page }) => {
  await abrir(page);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);
});
