// Recordatorios (maqueta de ChatGPT, 30-oct-2026) en la vista previa: interruptor general, categorías
// (videollamadas solo en el plan cercano, comunidad solo con el módulo abierto), horario, días,
// correo con su estado real, vista previa ilustrativa y guardar. Lo real (guardar_recordatorios,
// sin migración) está en mi-espacio-real.spec.ts; las reglas de envío, en pruebas/base/matriz.mjs.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { T_RECORDATORIOS as T } from "../src/pages/vista-previa/mi-espacio/textos";
import { revisarBarra } from "./barra-movil";

const RUTA = "vista-previa/mi-espacio/preferencias/recordatorios/";
async function abrir(page: Page) {
  await page.goto(RUTA);
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
}
const sw = (page: Page, nombre: string) => page.getByRole("switch", { name: nombre, exact: true });

test("se llega desde Preferencias y desde Mis avisos", async ({ page }) => {
  await page.goto("vista-previa/mi-espacio/preferencias/");
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
  await page.getByRole("link", { name: T.enPreferencias.enlace }).click();
  await page.waitForURL(`**/${RUTA}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(T.titulo);
});

test("interruptor general: apagado conserva las elecciones y bloquea los controles", async ({ page }) => {
  await abrir(page);
  const general = sw(page, T.general.titulo);
  await expect(general).toHaveAttribute("aria-checked", "true");
  await expect(sw(page, T.categorias.accionesDelDia.titulo)).toHaveAttribute("aria-checked", "true");
  await general.click();
  await expect(general).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText(T.general.apagado)).toBeVisible();
  await expect(sw(page, T.categorias.accionesDelDia.titulo)).toBeDisabled();
  await expect(sw(page, T.categorias.accionesDelDia.titulo)).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel(T.horario.desde)).toBeDisabled();
  await general.click();
  await expect(sw(page, T.categorias.accionesDelDia.titulo)).toBeEnabled();
});

test("categorías: videollamadas solo en el plan cercano, comunidad solo con el módulo abierto", async ({ page }) => {
  await abrir(page);
  await expect(sw(page, T.categorias.videollamadas.titulo)).toBeDisabled();
  await expect(page.getByText(T.sinVideollamadas)).toBeVisible();
  await expect(sw(page, T.categorias.comunidad.titulo)).toBeDisabled();
  await expect(page.getByText(T.comunidadCerrada)).toBeVisible();
  await expect(page.getByText("Recordatorios de bienestar")).toHaveCount(0);
  const logros = sw(page, T.categorias.logros.titulo);
  await logros.click();
  await expect(logros).toHaveAttribute("aria-checked", "false");
});

test("horario dentro de 7 a 22, el recordatorio diario se ajusta y la vista previa lo muestra", async ({ page }) => {
  await abrir(page);
  const desde = page.getByLabel(T.horario.desde);
  await expect(desde.locator("option")).toHaveCount(16);
  await expect(desde.locator("option").first()).toHaveText("7:00");
  await expect(desde.locator("option").last()).toHaveText("22:00");
  await page.getByLabel(T.horario.hasta).selectOption("18");
  await expect(page.getByLabel(T.horario.hora)).toHaveValue("18");
  await expect(page.locator(".rc-previa__fila")).toContainText("18:00");
  await expect(page.getByText(T.vistaPrevia.texto)).toBeVisible();
});

test("días: se eligen y no se puede guardar sin ninguno", async ({ page }) => {
  await abrir(page);
  const sabado = page.getByRole("button", { name: "sábado" });
  await expect(sabado).toHaveAttribute("aria-pressed", "false");
  await sabado.click();
  await expect(sabado).toHaveAttribute("aria-pressed", "true");
  for (const d of T.dias.largos) {
    const b = page.getByRole("button", { name: d });
    if ((await b.getAttribute("aria-pressed")) === "true") await b.click();
  }
  await expect(page.getByRole("alert")).toHaveText(T.dias.alMenosUno);
  await expect(page.getByRole("button", { name: T.guardar })).toBeDisabled();
});

test("correo con su estado real y guardar confirma", async ({ page }) => {
  await abrir(page);
  await expect(page.getByText(T.canales.correoInactivo)).toBeVisible();
  await sw(page, T.canales.correo).click();
  await page.getByRole("button", { name: T.guardar }).click();
  await expect(page.getByRole("status").filter({ hasText: T.guardado })).toBeVisible();
});

test("accesible y sin desborde; en móvil la barra no tapa nada", async ({ page, isMobile }) => {
  await abrir(page);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  if (isMobile) {
    await page.setViewportSize({ width: 320, height: 640 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    const sobra = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".rc-switch, .rc-dia, .rc-selector select, .rc-tarjeta, .rc-guardar .boton")]
        .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 0.5)
        .map((e) => `${e.className} ${Math.round(e.getBoundingClientRect().right)}`),
    );
    expect(sobra).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    if (test.info().project.name !== "iphone") await revisarBarra(page);
  }
});
