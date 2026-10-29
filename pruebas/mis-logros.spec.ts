// Mis logros (maqueta de ChatGPT, 29-oct-2026) en la vista previa: niveles reales, créditos de la
// semana, racha y mejor racha, evolución por semana, reconocimientos con las reglas de la base,
// recompensas y ranking visibles solo con su función activa (?apagados=1 simula que no lo están).
// La lectura del beneficio en la base se prueba en matriz.mjs; la versión real, en
// mi-espacio-real.spec.ts.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { niveles } from "../src/data/rumbo";
import { T_LOGROS as T } from "../src/pages/vista-previa/mi-espacio/textos";
import { revisarBarra } from "./barra-movil";

const RUTA = "vista-previa/mi-espacio/logros/";

async function abrir(page: Page, q = "") {
  await page.goto(`${RUTA}${q}`);
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
  await expect(page.locator(".ml-insignias")).toBeVisible();
}
const tarjeta = (page: Page, titulo: string) => page.locator("section.ml-tarjeta", { has: page.getByRole("heading", { level: 2, name: titulo }) });

test("portada, nivel real con los 10 niveles y créditos que cuadran", async ({ page }) => {
  await abrir(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(T.portada.ojo);
  await expect(page.locator(".ml-portada")).toContainText(T.portada.titulo);
  const nivel = tarjeta(page, T.nivel.titulo);
  const n = Number((await nivel.locator(".ml-nivel__n").textContent())!.replace(/\D/g, ""));
  const real = niveles.find((x) => x.nivel === n)!;
  await expect(nivel.locator(".ml-nivel__nombre")).toHaveText(real.nombre);
  const creditos = Number((await page.locator(".ml-cifra__n").textContent())!.replace(/\./g, ""));
  expect(creditos).toBeGreaterThanOrEqual(real.minimo);
  const siguiente = niveles.find((x) => x.nivel === n + 1)!;
  await expect(nivel).toContainText(T.nivel.faltan(siguiente.minimo - creditos, siguiente.nivel));
  await expect(nivel.getByRole("progressbar")).toHaveAttribute("aria-valuemax", String(siguiente.minimo));
  await nivel.getByRole("button", { name: T.nivel.ver }).click();
  const hoja = page.getByRole("dialog", { name: T.nivel.hoja });
  await expect(hoja.locator("ol li")).toHaveCount(10);
  for (const x of niveles) await expect(hoja).toContainText(`${T.nivel.nivel(x.nivel)} · ${x.nombre}`);
  await expect(hoja.locator("li[aria-current]")).toContainText(real.nombre);
  await hoja.getByRole("button", { name: "Cerrar" }).click();
  // Créditos: lunes a domingo de esta semana; los días que no llegan no tienen barra.
  const cred = tarjeta(page, T.creditos.titulo);
  await expect(cred.locator(".ml-barras__ejes li")).toHaveCount(7);
  await expect(cred.getByRole("link", { name: T.creditos.historial })).toHaveAttribute("href", /\/mi-espacio\/logros\/creditos\/$/);
  await expect(cred.locator(".ml-creditos__bono-n")).toHaveText(/^\+[234]$/);
});

test("constancia, evolución por semana y esta semana con datos del escenario", async ({ page }) => {
  await abrir(page);
  const c = tarjeta(page, T.constancia.titulo);
  const racha = Number((await c.locator(".ml-caja__n").first().textContent())!.replace(/\D/g, ""));
  const mejor = Number((await c.locator(".ml-caja__n").nth(1).textContent())!.replace(/\D/g, ""));
  expect(mejor).toBeGreaterThanOrEqual(racha);
  await expect(c.getByRole("img", { name: T.constancia.llamas(racha) })).toBeVisible();
  await expect(c.locator(".ml-llamas .es-encendida")).toHaveCount(Math.min(racha, 7));
  const evo = tarjeta(page, T.evolucion.titulo);
  await expect(evo.locator(".ml-semanas__lista li")).toHaveCount(4);
  await expect(evo.locator(".ml-semanas__lista li").first()).toContainText(/Semana 1\s*\d+ %/);
  await expect(evo.locator(".ml-semanas__lista li").last()).toContainText("—");
  await expect(evo.getByRole("img", { name: /Has completado \d+ de \d+ acciones/ })).toBeVisible();
  await evo.getByText(T.estaSemana.hechas).click();
  await expect(evo.locator(".me-hechas li").first()).toBeVisible();
});

test("reconocimientos: los 6, con fecha si se obtuvieron y avance si se puede calcular", async ({ page }) => {
  await abrir(page);
  const r = tarjeta(page, T.reconocimientos.titulo);
  await expect(r.locator(".ml-insignia")).toHaveCount(6);
  await expect(r.locator(".ml-insignia.es-obtenida").first()).toContainText(/de \w+/);
  await expect(r.locator('.ml-insignia[data-clave="constancia"]')).toContainText(T.reconocimientos.corto.constancia(7));
  await expect(r.locator('.ml-insignia[data-clave="mitad_del_camino"]')).toContainText(T.reconocimientos.corto.mitad_del_camino(50));
  await r.getByRole("button", { name: T.reconocimientos.ver }).click();
  const hoja = page.getByRole("dialog", { name: T.reconocimientos.hoja });
  await expect(hoja.locator("li")).toHaveCount(6);
  await expect(hoja).toContainText(T.reconocimientos.hojaNota);
});

test("recompensas y ranking: visibles con su función activa; ocultos si no, y los reconocimientos usan el ancho", async ({ page }) => {
  await abrir(page);
  const rec = tarjeta(page, T.recompensas.titulo);
  await expect(rec).toContainText(T.recompensas.descuento(10));
  await expect(rec.getByRole("progressbar", { name: T.recompensas.barra })).toBeVisible();
  const ranking = tarjeta(page, T.ranking.titulo);
  await ranking.getByRole("button", { name: T.ranking.participar }).click();
  await ranking.getByLabel(T.ranking.alias).fill("Río Claro");
  await ranking.getByRole("button", { name: T.ranking.entrar }).click();
  await expect(ranking).toContainText(T.ranking.sinPuesto);
  await expect(ranking).toContainText(T.ranking.como("Río Claro"));
  await ranking.getByRole("button", { name: T.ranking.salir }).click();
  await expect(ranking.getByRole("button", { name: T.ranking.participar })).toBeVisible();

  await abrir(page, "?apagados=1");
  await expect(page.getByRole("heading", { name: T.recompensas.titulo })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: T.ranking.titulo })).toHaveCount(0);
  await expect(page.locator(".ml-reconocimientos")).toHaveClass(/es-amplio/);
  const ancho = await page.locator(".ml-reconocimientos").evaluate((e) => e.getBoundingClientRect().width);
  const fila = await page.locator(".ml-fila--logros").evaluate((e) => e.getBoundingClientRect().width);
  expect(ancho).toBeCloseTo(fila, 0);
});

test("accesible y sin desborde; en móvil la barra no tapa nada", async ({ page, isMobile }) => {
  await abrir(page);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  if (isMobile) {
    await page.setViewportSize({ width: 320, height: 640 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await revisarBarra(page);
  }
});
