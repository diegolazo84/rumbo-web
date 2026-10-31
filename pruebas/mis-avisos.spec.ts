// Mis avisos (maqueta de ChatGPT, 30-oct-2026) en la vista previa: campana con el número sin leer,
// «Mis avisos» en la barra lateral de escritorio (la barra inferior del móvil no cambia), filtros
// con números reales, grupos por día, búsqueda, abrir un aviso (lo marca leído y lleva a su
// pantalla) y «Marcar todo como leído». La lectura y el marcado reales están en
// mi-espacio-real.spec.ts; los avisos de la Comunidad, en pruebas/base/matriz.mjs.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { AVISOS_EJEMPLO } from "../src/pages/vista-previa/mi-espacio/espacio";
import { T_AVISOS as T } from "../src/pages/vista-previa/mi-espacio/textos";
import { revisarBarra } from "./barra-movil";

const RUTA = "vista-previa/mi-espacio/avisos/";
const SIN_LEER = AVISOS_EJEMPLO.filter((a) => !a.leidoEn).length;

async function abrir(page: Page, ruta = RUTA) {
  await page.goto(ruta);
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
}
const filtro = (page: Page, nombre: string) => page.getByRole("group", { name: T.filtros }).getByRole("button", { name: new RegExp(`^${nombre},`) });

test("campana en la cabecera y «Mis avisos» solo en la barra lateral", async ({ page, isMobile }) => {
  await abrir(page, "vista-previa/mi-espacio/");
  const campana = page.locator(".cabecera-app__avisos");
  await expect(campana).toHaveAccessibleName(`Mis avisos, ${SIN_LEER} sin leer`);
  await expect(campana.locator(".cabecera-app__avisos-numero")).toHaveText(String(SIN_LEER));
  await expect(page.locator("nav.barra-inferior").getByRole("link", { name: /Mis avisos/ })).toHaveCount(0);
  if (!isMobile) await expect(page.locator("nav.lateral").getByRole("link", { name: `Mis avisos, ${SIN_LEER} sin leer` })).toBeVisible();
  await campana.click();
  await page.waitForURL(`**/${RUTA}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(T.titulo);
  await expect(campana).toHaveAttribute("aria-current", "page");
});

test("filtros con números reales, grupos por día y búsqueda", async ({ page }) => {
  await abrir(page);
  await expect(filtro(page, T.filtro.todos)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".av-item")).toHaveCount(AVISOS_EJEMPLO.length);
  await expect(page.locator(".av-item--nuevo")).toHaveCount(SIN_LEER);
  // Comunidad apagada en la vista previa: su filtro no existe.
  await expect(filtro(page, T.filtro.comunidad)).toHaveCount(0);
  await expect(filtro(page, T.filtro.noLeidos)).toContainText(String(SIN_LEER));
  await expect(page.getByRole("heading", { level: 2, name: T.grupos.hoy })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: T.grupos.ayer })).toBeVisible();

  await filtro(page, T.filtro.noLeidos).click();
  await expect(page.locator(".av-item")).toHaveCount(SIN_LEER);
  await filtro(page, T.filtro.logros).click();
  const logros = AVISOS_EJEMPLO.filter((a) => a.tipo === "reconocimiento").length;
  await expect(page.locator(".av-item")).toHaveCount(logros);
  await filtro(page, T.filtro.sistema).click();
  await expect(page.getByText(T.vacio.filtro.titulo)).toBeVisible();

  await filtro(page, T.filtro.todos).click();
  await page.getByRole("searchbox", { name: T.buscar }).fill("ajuste");
  await expect(page.locator(".av-item")).toHaveCount(1);
  await page.getByRole("searchbox", { name: T.buscar }).fill("zzz");
  await expect(page.getByText(T.vacio.busqueda.titulo)).toBeVisible();
});

test("cada aviso muestra la descripción fija de su tipo, no texto inventado", async ({ page }) => {
  await abrir(page);
  for (const a of AVISOS_EJEMPLO) {
    const item = page.locator(".av-item", { hasText: a.titulo }).first();
    await expect(item).toContainText(T.descripcion[a.tipo]);
  }
});

test("abrir un aviso lo marca leído y lleva a su pantalla; marcar todo deja la lista al día", async ({ page }) => {
  await abrir(page);
  await page.locator(".av-item", { hasText: "revisión de la semana 2" }).click();
  await page.waitForURL("**/vista-previa/mi-espacio/acompanamiento/");
  await abrir(page);
  await page.getByRole("button", { name: T.marcarTodos }).click();
  await expect(page.getByRole("status").filter({ hasText: T.marcadosTodos })).toBeVisible();
  await expect(page.locator(".av-item--nuevo")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: T.alDia })).toBeVisible();
  await expect(filtro(page, T.filtro.todos)).toContainText("0");
});

test("«Tipos de avisos» filtra y «Ir a mis preferencias» lleva a Preferencias", async ({ page }) => {
  await abrir(page);
  await page.locator(".av-tipo", { hasText: T.filtro.mensajes }).click();
  await expect(filtro(page, T.filtro.mensajes)).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: T.irPreferencias }).click();
  await page.waitForURL("**/vista-previa/mi-espacio/preferencias/recordatorios/");
});

test("accesible y sin desborde; en móvil la barra no tapa nada", async ({ page, isMobile }) => {
  await abrir(page);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  if (isMobile) {
    await page.setViewportSize({ width: 320, height: 640 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    // Ningún control ni aviso se sale del ancho (la cabecera con campana, ayuda y menú cabe).
    const sobra = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".cabecera-app__acciones > *, .av-filtro, .av-buscar, .av-item, .av-tipo, .av-tarjeta .boton")]
        .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 0.5)
        .map((e) => `${e.className} ${Math.round(e.getBoundingClientRect().right)}`),
    );
    expect(sobra).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    if (test.info().project.name !== "iphone") await revisarBarra(page);
  }
});
