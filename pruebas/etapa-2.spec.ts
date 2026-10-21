// Rumbo 2.0, etapa 2: navegación de cinco secciones (Mi Rumbo, Mi plan, Mi acompañamiento,
// Comunidad y Mis logros), menú de la cabecera, resumen del día en Mi Rumbo y lo que todavía no
// existe rotulado «Próximamente» (sin botones de compra, sin fechas). Corre sobre la vista previa.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { loQueViene } from "../src/data/rumbo";
import { ROTULOS_BARRA } from "../src/components/app/Navegacion";
import { T_LO_QUE_VIENE } from "../src/pages/vista-previa/mi-espacio/textos";

const ETIQUETAS_AXE = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const SECCIONES = [
  { rotulo: ROTULOS_BARRA.B.rumbo, ruta: /\/vista-previa\/mi-espacio\/$/, h1: "Mi Rumbo" },
  { rotulo: ROTULOS_BARRA.B.plan, ruta: /\/vista-previa\/mi-espacio\/plan\/$/, h1: "Mi plan" },
  { rotulo: ROTULOS_BARRA.B.acompanamiento, ruta: /\/vista-previa\/mi-espacio\/acompanamiento\/$/, h1: "Mi acompañamiento" },
  { rotulo: ROTULOS_BARRA.B.comunidad, ruta: /\/vista-previa\/mi-espacio\/comunidad\/$/, h1: "Comunidad" },
  { rotulo: ROTULOS_BARRA.B.logros, ruta: /\/vista-previa\/mi-espacio\/logros\/$/, h1: "Mis logros" },
];

async function abrir(page: Page, r: string) {
  await page.goto(`vista-previa/${r}`);
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
}

async function sinViolaciones(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}

test.beforeEach(({}, info) => {
  test.skip(info.project.name === "iphone", "basta con Chromium en móvil y escritorio");
});

test("las cinco secciones se abren desde la navegación y cada una tiene su nombre completo como H1", async ({ page, isMobile }) => {
  await abrir(page, "mi-espacio/");
  const nav = page.locator(isMobile ? "nav.barra-inferior" : "nav.lateral");
  await expect(nav.locator(".nav-app__item")).toHaveCount(5);
  // Barra inferior: rótulos cortos (opción B). Barra lateral de escritorio: nombres completos.
  for (const s of SECCIONES) {
    const nombre = isMobile ? s.rotulo : s.h1;
    await nav.getByRole("link", { name: nombre, exact: true }).click();
    await page.waitForURL(s.ruta);
    await expect(page.locator("main h1")).toHaveText(s.h1);
    await expect(nav.getByRole("link", { name: nombre, exact: true })).toHaveAttribute("aria-current", "page");
  }
});

test("el menú de la cabecera reemplaza a «Más»: Preferencias, Mis datos, Lo que viene y Salir", async ({ page }) => {
  await abrir(page, "mi-espacio/");
  await expect(page.locator(".barra-inferior").getByText("Más", { exact: true })).toHaveCount(0);
  const menu = page.getByRole("button", { name: "Menú" });
  await menu.click();
  const hoja = page.getByRole("dialog", { name: "Menú" });
  for (const fila of ["Pedir un ajuste", "Preferencias", "Mis datos", "Lo que viene en Rumbo", "Volver a la web", "Salir"])
    await expect(hoja.getByRole("link", { name: fila })).toBeVisible();
  await expect(hoja.getByRole("button", { name: "Ayuda inmediata" })).toBeVisible();
  await sinViolaciones(page);
  await hoja.getByRole("link", { name: "Lo que viene en Rumbo" }).click();
  await page.waitForURL(/\/mi-espacio\/lo-que-viene\/$/);
  await expect(page.locator("main h1")).toHaveText("Lo que viene en Rumbo");
});

test("Ayuda inmediata sigue visible en la cabecera de cada sección", async ({ page }) => {
  for (const r of ["mi-espacio/", "mi-espacio/plan/", "mi-espacio/acompanamiento/", "mi-espacio/comunidad/", "mi-espacio/logros/"]) {
    await abrir(page, r);
    await expect(page.locator(".cabecera-app").getByRole("button", { name: "Ayuda inmediata" }), r).toBeVisible();
  }
});

test("Mi plan: pestañas Calendario y Mis metas, y «Pedir un ajuste»", async ({ page }) => {
  await abrir(page, "mi-espacio/plan/");
  const pestanas = page.getByRole("navigation", { name: "Vistas de Mi plan" });
  await expect(pestanas.getByRole("link", { name: "Calendario" })).toHaveAttribute("aria-current", "page");
  await pestanas.getByRole("link", { name: "Mis metas" }).click();
  await page.waitForURL(/\/mi-espacio\/plan\/metas\/$/);
  await expect(page.locator(".me-meta").first()).toBeVisible();
  // Sin barra de avance: el avance está en Mis logros.
  await expect(page.locator(".me-mis-metas [role=progressbar]")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Pedir un ajuste" }).last()).toBeVisible();
  await sinViolaciones(page);
});

test.describe("resumen del día en Mi Rumbo", () => {
  test("hechas sobre programadas de hoy, sin porcentaje", async ({ page }) => {
    await abrir(page, "mi-espacio/");
    // Etapa 2A: el resumen del día es un anillo «1/3» (role="img"), sin porcentaje.
    const resumen = page.locator(".me-hoy__anillo");
    await expect(resumen).toHaveAttribute("aria-label", /^Hoy: \d+ de \d+ acciones? hechas?\.$/);
    await expect(resumen).not.toContainText("%");
    // Marcar actualiza el resumen.
    const [h, n] = ((await resumen.textContent()) ?? "").split("/").map(Number);
    await page.getByRole("checkbox", { name: /^Marcar “.+” como hecha$/, checked: false }).first().check();
    await expect(resumen).toHaveText(`${h + 1}/${n}`);
  });

  test("día sin acciones: estado neutro, sin números", async ({ page }) => {
    await abrir(page, "mi-espacio/hoy/sin-acciones/");
    // Referencia visual: estado vacío con ilustración y el plan a mano, sin anillo ni números.
    const vacio = page.locator(".me-hoy-vacio");
    await expect(vacio).toContainText("Sin acciones para hoy");
    await expect(vacio).not.toContainText(/\d/);
    await expect(page.locator(".me-hoy__anillo")).toHaveCount(0);
  });
});

test.describe("«Próximamente»: sin botones de compra, sin fechas y sin datos ficticios", () => {
  for (const r of ["mi-espacio/comunidad/", "mi-espacio/lo-que-viene/"]) {
    test(r, async ({ page }) => {
      await abrir(page, r);
      const main = page.locator("main");
      await expect(main.locator(".etiqueta--pronto").first()).toBeVisible();
      await expect(main.locator("button")).toHaveCount(0);
      const enlaces = await main.locator("a").allTextContents();
      for (const e of enlaces) expect(e).not.toMatch(/comprar|contratar|reservar|pagar|suscrib/i);
      const texto = (await main.textContent()) ?? "";
      expect(texto).not.toMatch(/\b20\d\d\b|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i);
      // Sin ranking de ejemplo ni alias ficticios.
      await expect(main.locator(".ranking-tarjeta")).toHaveCount(0);
      await sinViolaciones(page);
    });
  }

  test("Lo que viene en Mi espacio dice lo mismo que la portada", () => {
    const [lanzamiento, despues] = T_LO_QUE_VIENE.grupos.map((g) => g.items.map((i) => i.titulo));
    expect(lanzamiento).toEqual(loQueViene.lanzamiento);
    expect(despues).toEqual(loQueViene.despues);
  });
});

test("Mi Rumbo: con dos novedades van juntas en un aviso compacto, cada una con su enlace", async ({ page }) => {
  await abrir(page, "mi-espacio/");
  const aviso = page.locator(".me-novedades--compactas");
  await expect(aviso.getByRole("link")).toHaveCount(2);
  await expect(aviso.getByRole("link", { name: /Ver la revisión/ })).toBeVisible();
  await expect(aviso.getByRole("link", { name: /Ver la respuesta/ })).toBeVisible();
  // Las acciones de hoy empiezan más arriba que con dos avisos separados.
  const caja = await aviso.boundingBox();
  expect(caja!.height).toBeLessThan(200);
  await sinViolaciones(page);
});

test("Mi acompañamiento: quién te acompaña, acuerdos, próxima revisión y observaciones", async ({ page }) => {
  await abrir(page, "mi-espacio/acompanamiento/publicada/");
  for (const t of ["Quién te acompaña", "Acuerdos de la semana", "Próxima revisión", "Observaciones de tu coach"])
    await expect(page.getByRole("heading", { name: t })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Semana 1 de 4." })).toBeVisible();
  // El asistente y la ficha del coach todavía no existen: solo «Próximamente», sin botones.
  await expect(page.locator(".me-pronto")).toContainText("Asistente de Rumbo");
  await expect(page.locator(".me-pronto button")).toHaveCount(0);
  await sinViolaciones(page);
});
