// C14 · Interior de un grupo (maqueta de ChatGPT, 29-oct-2026) en la vista previa: portada con
// datos del grupo, pestañas Publicaciones / Miembros / Información, invitación que abre Crear
// publicación con el grupo elegido, tarjetas con Me gusta, Comentar y Reportar, columna lateral,
// estado de quien no es miembro, salir con confirmación, accesibilidad y móvil.
// La base (lista de miembros e interacciones solo para miembros) se prueba en matriz.mjs.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { T_COMU } from "../src/pages/vista-previa/mi-espacio/comunidad/textos";
import { revisarBarra } from "./barra-movil";

const T = T_COMU.interior;
const ETIQUETAS_AXE = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const RUTA = "vista-previa/mi-espacio/comunidad/";

async function abrir(page: Page, grupo: string, extra = "") {
  await page.goto(`${RUTA}?vista=grupos&grupo=${grupo}${extra}`);
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
  await expect(page.locator(".gi-portada")).toBeVisible();
}
async function sinViolaciones(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}
const pestanas = (page: Page) => page.getByRole("navigation", { name: T.navegacion("Vida saludable") });

test.beforeEach(({}, info) => {
  test.skip(info.project.name === "iphone", "basta con Chromium en móvil y escritorio");
});

test("portada con datos reales del grupo y pertenencia discreta para quien ya es miembro", async ({ page }) => {
  await abrir(page, "g1");
  const portada = page.locator(".gi-portada");
  await expect(portada.getByRole("heading", { level: 1 })).toHaveText("Vida saludable");
  await expect(portada).toContainText("Hábitos simples para sentirte mejor cada día.");
  await expect(portada).toContainText(T_COMU.grupos.miembros(14));
  await expect(portada.getByRole("link", { name: T.volver })).toHaveAttribute("href", /comunidad\/grupos\/$/);
  await expect(portada.getByText(T.soyParte)).toBeVisible();
  await expect(portada.getByRole("button", { name: T.unirse })).toHaveCount(0);
  // La portada de Comunidad no se repite: la del grupo la reemplaza.
  await expect(page.locator(".co-portada")).toHaveCount(0);
  await expect(page.getByText(T_COMU.ejemplo)).toBeVisible();
});

test("publicaciones: solo del grupo, con alias, fecha, categoría, Me gusta, Comentar y Reportar", async ({ page }) => {
  await abrir(page, "g1");
  await expect(pestanas(page).getByRole("link", { name: T.pestanas.publicaciones })).toHaveAttribute("aria-current", "page");
  const pubs = page.locator("article.co-pub");
  await expect(pubs.first()).toBeVisible();
  // Ninguna dice «En <grupo>»: ya estás dentro del grupo.
  await expect(page.locator(".co-pub__grupo")).toHaveCount(0);
  const p = pubs.first();
  await expect(p.locator(".co-pub__alias")).toHaveText("Sofía");
  await expect(p.locator(".co-pub__meta")).toContainText("Hace");
  await expect(p.locator(".co-pub__tipo")).toHaveText(T_COMU.rotuloTipo.logro);
  const meGusta = p.getByRole("button", { name: /^Me gusta/ });
  await expect(meGusta).toHaveAttribute("aria-pressed", "false");
  await meGusta.click();
  await expect(meGusta).toHaveAttribute("aria-pressed", "true");
  await p.getByRole("button", { name: /^Comentar/ }).click();
  await expect(p.locator(".co-com").first()).toBeVisible();
  await p.getByRole("button", { name: T_COMU.publicacion.acciones("Sofía") }).click();
  await p.getByRole("button", { name: T_COMU.publicacion.reportar }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await sinViolaciones(page);
});

test("«Comparte tu experiencia…», el emoji, la foto y la columna lateral abren Crear publicación con este grupo", async ({ page }) => {
  await abrir(page, "g1");
  await page.getByRole("button", { name: T.invitacion }).click();
  await expect(page).toHaveURL(/comunidad\/crear\/\?grupo=g1$/);
  await page.goBack();
  await page.getByRole("button", { name: T.emoji }).click();
  await expect(page).toHaveURL(/grupo=g1&emoji=1$/);
  await expect(page.locator(".co-escribir__emoji [aria-expanded='true']")).toBeVisible();
  await page.goBack();
  await page.getByRole("button", { name: T.foto }).click();
  await expect(page).toHaveURL(/grupo=g1&foto=1$/);
  await page.goBack();
  await page.getByRole("button", { name: T.invitacion }).click();
  // El destino ya viene elegido en el editor que existe (no hay otro editor).
  await expect(page.locator(".co-destino__select")).toHaveValue("g1");
});

test("columna lateral: «Explorar publicaciones» lleva al listado de esta misma pantalla", async ({ page }) => {
  await abrir(page, "g1", "&seccion=informacion");
  const animo = page.locator(".gi-animo");
  await expect(animo.getByRole("heading", { name: T.animoTitulo })).toBeVisible();
  await expect(animo).toContainText(T.animoTexto);
  await animo.getByRole("link", { name: T.explorar }).click();
  await expect(page).toHaveURL(/grupo=g1#gi-publicaciones$/);
  await expect(pestanas(page).getByRole("link", { name: T.pestanas.publicaciones })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("#gi-publicaciones")).toBeFocused();
  await expect(page.locator("#gi-publicaciones article.co-pub").first()).toBeVisible();
});

test("dentro del grupo no se usa ilustración de relleno: sin fotos, tarjeta solo de texto", async ({ page }) => {
  await abrir(page, "g1");
  await expect(page.locator("article.co-pub").first()).toBeVisible();
  await expect(page.locator(".co-pub__foto--ilustracion")).toHaveCount(0);
  // El contenido simulado sigue rotulado como ejemplo.
  await expect(page.getByText(T_COMU.ejemplo)).toBeVisible();
});

test("miembros: solo alias e iniciales, «Tú» primero, sin fotos; «Ver todos» lleva a la pestaña", async ({ page }) => {
  await abrir(page, "g1");
  const lateral = page.locator(".gi-lateral");
  await expect(lateral.locator(".gi-avatares .co-avatar")).toHaveCount(4);
  await expect(lateral.locator(".gi-avatares__mas")).toHaveText(T.mas(10));
  await expect(lateral.locator("img")).toHaveCount(0);
  await lateral.getByRole("link", { name: T.verTodos }).click();
  await expect(pestanas(page).getByRole("link", { name: T.pestanas.miembros })).toHaveAttribute("aria-current", "page");
  const lista = page.locator(".gi-lista .gi-miembro");
  await expect(lista).toHaveCount(14);
  await expect(lista.first()).toContainText(T.tu);
  await expect(page.getByText(T.miembrosAyuda)).toBeVisible();
  await expect(page.locator(".gi-miembros img")).toHaveCount(0);
  await sinViolaciones(page);
});

test("información: descripción, área, fecha, privacidad y reglas; salir pide confirmación", async ({ page }) => {
  await abrir(page, "g1", "&seccion=informacion");
  const info = page.locator(".gi-info");
  await expect(info).toContainText("Bienestar");
  await expect(info).toContainText(T.privacidadTexto);
  await expect(info).toContainText(T.reglasTexto);
  await info.getByRole("button", { name: T.salir }).click();
  const hoja = page.getByRole("dialog");
  await expect(hoja).toContainText(T.salirConfirmar("Vida saludable"));
  await sinViolaciones(page);
  await hoja.getByRole("button", { name: T.salirSi }).click();
  await expect(page.locator(".tostada__texto")).toHaveText(T.salido("Vida saludable"));
  // Al salir: «Unirse» vuelve y lo del grupo queda solo para miembros.
  await expect(page.locator(".gi-portada").getByRole("button", { name: T.unirse })).toBeVisible();
  await expect(info.getByRole("button", { name: T.salir })).toHaveCount(0);
  await pestanas(page).getByRole("link", { name: T.pestanas.publicaciones }).click();
  await expect(page.getByText(T.noMiembroTitulo)).toBeVisible();
  await expect(page.locator("article.co-pub")).toHaveCount(0);
});

test("quien no es miembro: «Unirse», sin publicaciones ni lista de miembros; al unirse se abre", async ({ page }) => {
  await abrir(page, "g4");
  const portada = page.locator(".gi-portada");
  await expect(portada.getByRole("heading", { level: 1 })).toHaveText("Alimentación consciente");
  await expect(page.getByText(T.noMiembroTitulo)).toBeVisible();
  await expect(page.locator("article.co-pub")).toHaveCount(0);
  await expect(page.locator(".gi-invitacion")).toHaveCount(0);
  await expect(page.locator(".gi-animo")).toHaveCount(0);
  await expect(page.locator(".gi-avatares")).toHaveCount(0);
  await abrir(page, "g4", "&seccion=miembros");
  await expect(page.getByText(T.miembrosNoMiembro).first()).toBeVisible();
  await expect(page.locator(".gi-lista")).toHaveCount(0);
  await sinViolaciones(page);
  await portada.getByRole("button", { name: T.unirse }).click();
  await expect(page.locator(".tostada__texto")).toHaveText(T.unido_("Alimentación consciente"));
  await expect(portada.getByText(T.soyParte)).toBeVisible();
  await expect(page.locator(".gi-lista .gi-miembro").first()).toContainText(T.tu);
});

test("un grupo que no existe muestra el aviso y el camino de vuelta", async ({ page }) => {
  await page.goto(`${RUTA}?vista=grupos&grupo=nada`);
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
  await expect(page.getByText(T.noEncontrado)).toBeVisible();
  await expect(page.getByRole("link", { name: T.volver })).toBeVisible();
});

test("móvil: portada compacta, pestañas, invitación y publicaciones antes que el lateral; barra sin tapar", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo móvil");
  await abrir(page, "g1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const y = async (sel: string) => (await page.locator(sel).first().boundingBox())!.y;
  const portada = (await page.locator(".gi-portada").boundingBox())!;
  expect(portada.height).toBeLessThan(360);
  expect(await y(".gi-pestanas")).toBeLessThan(await y(".gi-invitacion"));
  expect(await y(".gi-invitacion")).toBeLessThan(await y("article.co-pub"));
  expect(await y("article.co-pub")).toBeLessThan(await y(".gi-lateral"));
  // Las tres pestañas se ven completas.
  for (const s of ["publicaciones", "miembros", "informacion"] as const) {
    const b = (await pestanas(page).getByRole("link", { name: T.pestanas[s] }).boundingBox())!;
    expect(b.x + b.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  await revisarBarra(page);
});
