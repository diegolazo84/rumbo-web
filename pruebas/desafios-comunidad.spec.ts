// C15 · Desafíos de Comunidad (maqueta de ChatGPT, 29-oct-2026) en la vista previa: portada del
// destacado, filtros, tarjetas con estado y progreso, inscripción, detalle con reglas y avance día
// a día, participación, reconocimientos obtenidos, actividad solo propia, proponer, vacío y móvil.
// La base (propuestas, actividad e inscripción solo propias) se prueba en matriz.mjs.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { T_COMU } from "../src/pages/vista-previa/mi-espacio/comunidad/textos";
import { revisarBarra } from "./barra-movil";

const T = T_COMU.pagina;
const ETIQUETAS_AXE = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const RUTA = "vista-previa/mi-espacio/comunidad/desafios/";

async function abrir(page: Page, q = "") {
  await page.goto(`${RUTA}${q}`);
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
  await expect(page.locator(".de-columnas, .co-estado--vacio").first()).toBeVisible();
}
async function sinViolaciones(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}
const filtros = (page: Page) => page.getByRole("navigation", { name: T.navegacion });
const tarjeta = (page: Page, t: string) => page.locator("li.de-tarjeta", { has: page.getByRole("heading", { name: t }) });

test.beforeEach(({}, info) => {
  test.skip(info.project.name === "iphone", "basta con Chromium en móvil y escritorio");
});

test("portada del desafío destacado con datos reales, filtros y tarjetas; rotulado como ejemplo", async ({ page }) => {
  await abrir(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(T.titulo);
  await expect(page.getByText(T_COMU.ejemplo)).toBeVisible();
  // C16: la vista previa no inventa fotos; sin foto del equipo, cada desafío muestra su ilustración.
  await expect(page.locator("img.de-foto")).toHaveCount(0);
  const portada = page.locator(".de-portada");
  await expect(portada).toContainText(T.destacado);
  await expect(portada.getByRole("heading", { name: "30 días de bienestar" })).toBeVisible();
  await expect(portada).toContainText(T_COMU.desafios.participantes(342));
  await expect(portada).toContainText(T.quedan(18));
  // Ya participa: «Continuar» lleva a Mi Rumbo, donde se cumplen las acciones del día.
  await expect(portada.getByRole("link", { name: T.continuar })).toHaveAttribute("href", /mi-espacio\/$/);
  await expect(filtros(page).getByRole("link", { name: T.filtros.todos })).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".de-grilla").first().locator("li.de-tarjeta")).toHaveCount(3);
  const bienestar = tarjeta(page, "30 días de bienestar").first();
  await expect(bienestar.locator(".de-sello")).toHaveText(T.estados["en-curso"]);
  await expect(bienestar).toContainText(T.progresoDias(10, 30));
  await expect(bienestar.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "10");
  await expect(tarjeta(page, "Alimentación consciente").locator(".de-sello")).toHaveText(T.estados.proximo);
  await expect(tarjeta(page, "Alimentación consciente")).toContainText(T.comienza(5));
  await expect(page.getByRole("heading", { name: T.mas })).toBeVisible();
  await sinViolaciones(page);
});

test("filtros: en curso, próximos y finalizados", async ({ page }) => {
  await abrir(page);
  await filtros(page).getByRole("link", { name: T.filtros["en-curso"] }).click();
  await expect(page).toHaveURL(/filtro=en-curso/);
  await expect(page.locator("li.de-tarjeta")).toHaveCount(1);
  await filtros(page).getByRole("link", { name: T.filtros.proximos }).click();
  await expect(page.locator("li.de-tarjeta")).toHaveCount(6);
  await expect(page.getByRole("heading", { name: T.filtros.proximos, level: 2 })).toBeVisible();
  await filtros(page).getByRole("link", { name: T.filtros.finalizados }).click();
  const fin = page.locator("li.de-tarjeta");
  await expect(fin).toHaveCount(1);
  await expect(fin).toContainText("Movimiento diario");
  await expect(fin.getByText(T.completado)).toBeVisible();
  await expect(fin.getByRole("button", { name: /Inscribirme|Unirme/ })).toHaveCount(0);
});

test("inscribirse en un próximo es voluntario, se ve en Mi participación y se cancela desde el detalle", async ({ page }) => {
  await abrir(page);
  const mente = tarjeta(page, "Mente en calma");
  await mente.getByRole("button", { name: `${T.inscribirme}: Mente en calma` }).click();
  await expect(page.locator(".tostada__texto")).toContainText("Te inscribiste. El desafío empieza el");
  await expect(mente.getByText(T.inscrito)).toBeVisible();
  await expect(mente).toContainText(T_COMU.desafios.participantes(204));
  const part = page.locator(".de-lateral__tarjeta", { has: page.getByRole("heading", { name: T.participacion }) });
  await expect(part.getByRole("button", { name: T.verTodos })).toBeVisible();
  await mente.getByRole("button", { name: `${T.verDetalles}: Mente en calma` }).click();
  const hoja = page.getByRole("dialog", { name: "Mente en calma" });
  await expect(hoja).toContainText(T_COMU.desafios.reglas);
  await expect(hoja).toContainText(T_COMU.desafios.noSuma);
  await hoja.getByRole("button", { name: T.cancelar }).click();
  await expect(page.locator(".tostada__texto")).toHaveText(T.salidoAviso);
  await expect(hoja.getByRole("button", { name: T.inscribirme })).toBeVisible();
});

test("detalle del destacado: reglas, mi avance día a día que coincide con el progreso, y dejar de participar", async ({ page }) => {
  await abrir(page);
  await page.locator(".de-portada__ver").click();
  const hoja = page.getByRole("dialog", { name: "30 días de bienestar" });
  await expect(hoja).toContainText(T_COMU.desafios.reglas);
  await expect(hoja).toContainText(T.comoAvanzar);
  await expect(hoja.locator(".co-dia")).toHaveCount(12);
  await expect(hoja.locator(".co-dia--hecho")).toHaveCount(10);
  await sinViolaciones(page);
  await hoja.getByRole("button", { name: T.salir }).click();
  await expect(page.locator(".tostada__texto")).toHaveText(T.salidoAviso);
  await expect(hoja.locator(".co-dia")).toHaveCount(0);
  await expect(hoja.getByRole("button", { name: T.unirme })).toBeVisible();
});

test("reconocimientos: solo los desafíos completados; actividad: solo la propia", async ({ page }) => {
  await abrir(page);
  const rec = page.locator(".de-lateral__tarjeta", { has: page.getByRole("heading", { name: T.reconocimientos }) });
  await expect(rec.locator(".de-medalla")).toHaveCount(1);
  await expect(rec).toContainText(T.reconocimiento("Movimiento diario"));
  const act = page.locator(".de-lateral__tarjeta", { has: page.getByRole("heading", { name: T.actividad }) });
  await expect(act.locator(".de-actividad__fila")).toHaveCount(4);
  await expect(act).toContainText(T.actividadAyuda);
  await expect(act.locator(".de-actividad__fila").first()).toContainText("Cumpliste el día 12 de «30 días de bienestar»");
  await act.getByRole("button", { name: T.verTodo }).click();
  const hoja = page.getByRole("dialog", { name: T.actividad });
  await expect(hoja).toContainText(T.completo("Movimiento diario"));
  await expect(hoja).toContainText(T.unido("30 días de bienestar"));
});

test("proponer un desafío: valida, envía y muestra el estado de lo propuesto", async ({ page }) => {
  await abrir(page);
  await page.locator(".de-idea").getByRole("button", { name: T.proponer }).click();
  const hoja = page.getByRole("dialog", { name: T.propuesta.titulo });
  await hoja.getByRole("button", { name: T.propuesta.enviar }).click();
  await expect(hoja.getByRole("alert")).toHaveText(T.propuesta.errores.largo);
  await hoja.getByLabel(T.propuesta.nombre).fill("Semana sin pantallas");
  await hoja.getByRole("button", { name: T.propuesta.enviar }).click();
  await expect(page.locator(".tostada__texto")).toHaveText(T.propuesta.listo);
  await page.locator(".de-idea").getByRole("button", { name: T.proponer }).click();
  await expect(page.getByRole("dialog", { name: T.propuesta.titulo })).toContainText(T.propuesta.estados.pendiente);
  await sinViolaciones(page);
});

test("sin desafíos: portada sin destacado y mensajes vacíos", async ({ page }) => {
  await abrir(page, "?desafios=0");
  await expect(page.locator(".de-portada--vacia")).toBeVisible();
  await expect(page.getByText(T.vacio.todos).first()).toBeVisible();
  await expect(page.getByText(T.sinParticipacion)).toBeVisible();
  await expect(page.getByText(T.sinReconocimientos)).toBeVisible();
  await expect(page.getByText(T.sinActividad)).toBeVisible();
});

test("desde Comunidad: la pestaña Desafíos y los enlaces viejos llevan a esta pantalla", async ({ page }) => {
  await page.goto("vista-previa/mi-espacio/comunidad/?vista=desafios&desafio=d3");
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
  await expect(page).toHaveURL(/comunidad\/desafios\/\?desafio=d3$/);
  await expect(page.getByRole("dialog", { name: "Mente en calma" })).toBeVisible();
});

test("móvil: portada, filtros, desafíos, participación, reconocimientos y actividad en ese orden; barra sin tapar", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo móvil");
  await abrir(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const y = async (sel: string) => (await page.locator(sel).first().boundingBox())!.y;
  const orden = [
    ".de-portada",
    ".de-filtros",
    "li.de-tarjeta",
    ".de-lateral__tarjeta:has(#de-part-t)",
    ".de-lateral__tarjeta:has(#de-rec-t)",
    ".de-lateral__tarjeta:has(#de-act-t)",
  ];
  for (let i = 1; i < orden.length; i++) expect(await y(orden[i - 1])).toBeLessThan(await y(orden[i]));
  for (const f of Object.values(T.filtros)) {
    const b = (await filtros(page).getByRole("link", { name: f }).boundingBox())!;
    expect(b.x + b.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  await revisarBarra(page);
});
