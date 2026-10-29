// Mi plan: encabezado «Tu camino, paso a paso», «Tu día de hoy», «Lo que estás construyendo» y
// la jerarquía del calendario semanal (mejora visual de Diego, 29-oct-2026). Vista previa; la
// versión real está en mi-espacio-real.spec.ts.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { T_PLAN } from "../src/pages/vista-previa/mi-espacio/textos";
import { revisarBarra } from "./barra-movil";

async function abrir(page: Page) {
  await page.goto("vista-previa/mi-espacio/plan/");
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
}

test("encabezado con la semana del ciclo, día de hoy con sus registros y metas reales", async ({ page }) => {
  await abrir(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mi plan");
  await expect(page.locator(".me-camino__titulo")).toHaveText(T_PLAN.camino.titulo);
  await expect(page.locator(".me-camino__bajada")).toHaveText(T_PLAN.camino.bajada);
  await expect(page.locator(".me-camino__semana")).toHaveText(/^Semana \d+ de (4|8|12)$/);
  // El título del calendario dice la misma semana.
  const semana = (await page.locator(".me-camino__semana").textContent())!;
  await expect(page.locator(".me-calendario__titulo")).toContainText(semana);

  // Tu día de hoy: cuadra con las acciones de hoy en el calendario.
  const hoyDia = page.locator(".me-dia--hoy");
  const total = await hoyDia.locator(".me-filas > li").count();
  const hechas = await hoyDia.locator("input:checked").count();
  const tarjeta = page.locator(".me-plan-hoy");
  await expect(tarjeta.getByRole("heading", { name: T_PLAN.hoy.titulo })).toBeVisible();
  await expect(tarjeta.locator(".me-plan-hoy__n")).toHaveText(T_PLAN.hoy.cifra(hechas, total));
  await expect(tarjeta.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(hechas));
  await expect(tarjeta.getByRole("progressbar")).toHaveAttribute("aria-valuemax", String(total));

  // Lo que estás construyendo: las mismas metas que Mis metas, con acceso a ellas.
  const metas = page.locator(".me-construyendo__meta");
  const nombres = await page.locator(".me-construyendo__nombre").allTextContents();
  expect(nombres.length).toBeGreaterThan(0);
  for (const m of await metas.all()) expect(await m.getAttribute("data-cat")).toBeTruthy();
  await page.locator(".me-construyendo").getByRole("link", { name: T_PLAN.construyendo.ver }).click();
  await expect(page).toHaveURL(/\/mi-espacio\/plan\/metas\/$/);
  for (const n of nombres) await expect(page.locator(".me-metas")).toContainText(n);
});

test("«Ver mis acciones de hoy» abre el día de hoy en el calendario", async ({ page }) => {
  await abrir(page);
  const fecha = (await page.locator(".me-plan-hoy__fecha").textContent())!;
  await page.getByRole("button", { name: T_PLAN.hoy.ver }).click();
  await expect(page.getByRole("radio", { name: "Día" })).toBeChecked();
  await expect(page.locator(".me-calendario__titulo")).toHaveText(fecha);
  await expect(page.locator(".me-calendario__titulo")).toBeFocused();
  await expect(page.locator(".me-calendario__titulo")).toBeInViewport();
  await expect(page.locator(".me-cal-dia .accion").first()).toBeVisible();
});

test("calendario semanal: hoy destacado, días completos con check, futuros neutros", async ({ page }) => {
  await abrir(page);
  await expect(page.locator(".me-dia--hoy")).toHaveCount(1);
  await expect(page.locator(".me-dia--hoy .me-dia__hoy")).toHaveText(T_PLAN.diaHoy);
  const completos = page.locator(".me-dia--completo");
  expect(await completos.count()).toBeGreaterThan(0);
  await expect(completos.first().locator("legend .etiqueta")).toContainText("Día completo");
  // Futuros: sin marcas de completo y con su propio fondo.
  await expect(page.locator(".me-dia--futuro.me-dia--completo")).toHaveCount(0);
  const fondo = (sel: string) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(await fondo(".me-dia--futuro")).not.toBe(await fondo(".me-dia--hoy"));
  // Resumen semanal: lo registrado y lo programado de lunes a hoy, igual a lo que muestran los días.
  const hasta = page.locator(".me-dia:not(.me-dia--futuro)");
  const n = await hasta.locator(".me-filas > li").count();
  const r = await hasta.locator("input:checked").count();
  await expect(page.locator(".me-cal-semana__pie")).toContainText(`registraste ${r} de ${n} acciones`);
  // Las vistas Día, Semana y Mes siguen ahí.
  for (const v of ["Día", "Semana", "Mes"]) await expect(page.getByRole("radio", { name: v })).toBeVisible();
});

test("accesible, sin desborde y en móvil el orden pone primero lo de hoy", async ({ page, isMobile }) => {
  await abrir(page);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  if (!isMobile) return;
  const y = (sel: string) => page.locator(sel).first().evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
  const orden = [await y(".me-camino"), await y(".me-plan-hoy"), await y(".me-construyendo"), await y(".me-calendario__barra"), await y(".me-ajuste-plan")];
  expect([...orden].sort((a, b) => a - b)).toEqual(orden);
  // «Tu día de hoy» se ve sin desplazarse.
  await expect(page.locator(".me-plan-hoy__boton")).toBeInViewport();
  await page.setViewportSize({ width: 320, height: 640 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await page.setViewportSize({ width: 390, height: 844 });
  // La rueda del mouse no existe en WebKit móvil: la barra se revisa en Chromium móvil.
  if (test.info().project.name !== "iphone") await revisarBarra(page);
});
