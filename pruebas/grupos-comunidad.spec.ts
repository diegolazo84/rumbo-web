// Grupos de la comunidad (maqueta de ChatGPT, 22-oct-2026) en la vista previa: portada, pestañas,
// buscador, destacado, lista, unirse, entrar, salir, Mis grupos, sugeridos, proponer un grupo,
// accesibilidad y móvil. La base (C13) se prueba en matriz.mjs; Mi espacio real, en
// mi-espacio-real.spec.ts.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { T_COMU } from "../src/pages/vista-previa/mi-espacio/comunidad/textos";
import { revisarBarra } from "./barra-movil";

const T = T_COMU.explorador;
const ETIQUETAS_AXE = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const RUTA = "vista-previa/mi-espacio/comunidad/grupos/";

async function abrir(page: Page, q = "") {
  await page.goto(`${RUTA}${q}`);
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
  await expect(page.locator("main h1")).toHaveText(T.titulo);
  await expect(page.locator(".gr-seccion")).toBeVisible();
}
async function sinViolaciones(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}
const tarjetas = (page: Page) => page.locator(".gr-grilla .gr-tarjeta");
const nombres = (page: Page) => tarjetas(page).locator(".gr-tarjeta__nombre");
const buscar = (page: Page) => page.getByRole("searchbox", { name: T.buscarEtiqueta });
const tarjeta = (page: Page, n: string) => tarjetas(page).filter({ has: page.getByRole("button", { name: n, exact: true }) });

test.beforeEach(({}, info) => {
  test.skip(info.project.name === "iphone", "basta con Chromium en móvil y escritorio");
});

test("portada, pestañas, buscador, destacado y lista con datos rotulados «Ejemplo»", async ({ page }) => {
  await abrir(page);
  await expect(page.locator(".co-portada__bajada")).toHaveText(T.bajada);
  await expect(page.locator(".co-portada__mano")).toHaveText(T.mano);
  await expect(page.getByText(T_COMU.ejemplo)).toBeVisible();
  const nav = page.getByRole("navigation", { name: T.navegacion });
  await expect(nav.getByRole("link", { name: T.pestanas.todos })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: T.pestanas.mios })).toBeVisible();
  await expect(nav.getByRole("link", { name: T.pestanas.sugeridos })).toBeVisible();
  await expect(nav.getByRole("button", { name: T.proponer })).toBeVisible();
  await expect(buscar(page)).toHaveAttribute("placeholder", T.buscar);
  // El destacado lo elige el equipo; no se repite en la lista.
  const d = page.locator(".gr-destacado");
  await expect(d.getByText(T.destacado)).toBeVisible();
  await expect(d.getByRole("heading", { name: "Vida saludable" })).toBeVisible();
  await expect(d).toContainText("14 miembros");
  await expect(d.getByRole("link", { name: T.entrarGrupo })).toBeVisible();
  await expect(d.getByRole("button", { name: T.verDetalles })).toBeVisible();
  await expect(nombres(page)).toHaveCount(5);
  await expect(nombres(page)).not.toContainText(["Vida saludable"]);
});

test("orden: más recientes, más miembros y nombre", async ({ page }) => {
  await abrir(page);
  await expect(nombres(page).first()).toHaveText("Proyectos personales");
  await page.getByLabel(T.orden).selectOption("miembros");
  await expect(nombres(page)).toHaveText(["Actividad física", "Bienestar emocional", "Alimentación consciente", "Organización y hábitos", "Proyectos personales"]);
  await page.getByLabel(T.orden).selectOption("nombre");
  await expect(nombres(page).first()).toHaveText("Actividad física");
});

test("búsqueda por nombre y descripción, sin tildes ni mayúsculas; sin resultados y limpiar", async ({ page }) => {
  await abrir(page);
  await buscar(page).fill("ORGANIZACION");
  await expect(nombres(page)).toHaveText(["Organización y hábitos"]);
  await expect(page.locator(".gr-destacado")).toHaveCount(0);
  await expect(page.getByText(T.resultados(1))).toBeAttached();
  await buscar(page).fill("calma");
  await expect(nombres(page)).toHaveText(["Alimentación consciente"]);
  await buscar(page).fill("saludable");
  await expect(nombres(page)).toHaveText(["Vida saludable"]); // al buscar, el destacado vuelve a la lista
  await buscar(page).fill("ajedrez");
  await expect(page.getByText(T.sinResultados("ajedrez"))).toBeVisible();
  await page.getByRole("button", { name: T.limpiar }).click();
  await expect(buscar(page)).toHaveValue("");
  await expect(nombres(page)).toHaveCount(5);
});

test("unirse, entrar y salir: el conteo cambia y Entrar lleva a las publicaciones del grupo", async ({ page, isMobile }) => {
  await abrir(page);
  const t = tarjeta(page, "Proyectos personales");
  await expect(t).toContainText("4 miembros");
  await t.getByRole("button", { name: `${T.unirseCorto}: Proyectos personales` }).click();
  await expect(page.locator(".tostada__texto")).toHaveText(T_COMU.grupos.unido("Proyectos personales"));
  await expect(t).toContainText("5 miembros");
  const entrar = t.getByRole("link", { name: `${T.entrar}: Proyectos personales` });
  await expect(entrar).toHaveAttribute("href", /comunidad\/\?vista=grupos&grupo=g6$/);
  if (!isMobile) await expect(page.locator(".gr-lateral")).toContainText("Mis grupos");
  // Salir desde Ver detalles.
  await t.getByRole("button", { name: "Proyectos personales", exact: true }).click();
  const hoja = page.getByRole("dialog", { name: "Proyectos personales" });
  await expect(hoja.getByText(T.detalle.privacidad)).toBeVisible();
  await expect(hoja.getByText(T.detalle.eresParte)).toBeVisible();
  await hoja.getByRole("button", { name: T.detalle.salir }).click();
  await expect(page.locator(".tostada__texto")).toHaveText(T_COMU.grupos.salido("Proyectos personales"));
  await expect(hoja.getByRole("button", { name: T.unirse })).toBeVisible();
  await expect(hoja.getByRole("button", { name: T.detalle.salir })).toHaveCount(0);
});

test("Ver detalles del destacado: miembros, publicaciones y área reales", async ({ page }) => {
  await abrir(page);
  await page.locator(".gr-destacado").getByRole("button", { name: T.verDetalles }).click();
  const hoja = page.getByRole("dialog", { name: "Vida saludable" });
  await expect(hoja.locator(".gr-detalle__datos")).toContainText("Miembros14");
  await expect(hoja.locator(".gr-detalle__datos")).toContainText("ÁreaBienestar");
  await sinViolaciones(page);
});

test("Mis grupos y Grupos sugeridos: solo los propios y los de las áreas de tus metas", async ({ page }) => {
  await abrir(page, "?vista=mios");
  await expect(page.getByRole("link", { name: T.pestanas.mios })).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".gr-destacado")).toHaveCount(0);
  await expect(nombres(page)).toHaveText(["Bienestar emocional", "Actividad física", "Vida saludable"]);
  await abrir(page, "?vista=sugeridos");
  await expect(page.locator(".gr-principal").getByText(T.reglaSugeridos)).toBeVisible();
  await expect(nombres(page)).toHaveText(["Organización y hábitos", "Alimentación consciente"]);
  // Al unirse, deja de ser sugerencia.
  await tarjeta(page, "Organización y hábitos").getByRole("button", { name: /Unirse/ }).click();
  await expect(nombres(page)).toHaveText(["Alimentación consciente"]);
});

test("Proponer un grupo: valida, no repite nombres, máximo 3 en revisión y muestra las tuyas", async ({ page }) => {
  await abrir(page);
  const abrirHoja = async () => {
    const d = page.getByRole("dialog", { name: T.propuesta.titulo });
    await expect(d).toBeHidden(); // la hoja anterior terminó de cerrarse
    await page.getByRole("navigation", { name: T.navegacion }).getByRole("button", { name: T.proponer }).click();
    await expect(d.getByLabel(T.propuesta.nombre)).toBeVisible();
    return d;
  };
  let hoja = await abrirHoja();
  await expect(hoja.getByText(T.propuesta.nota)).toBeVisible();
  await hoja.getByRole("button", { name: T.propuesta.enviar }).click();
  await expect(hoja.getByRole("alert")).toHaveText(T.propuesta.errores.largo);
  await hoja.getByLabel(T.propuesta.nombre).fill("vida saludable");
  await hoja.getByRole("button", { name: T.propuesta.enviar }).click();
  await expect(hoja.getByRole("alert")).toHaveText(T.propuesta.errores.enUso);
  await sinViolaciones(page);
  for (const n of ["Lectura", "Finanzas personales", "Cocina simple"]) {
    await hoja.getByLabel(T.propuesta.nombre).fill(n);
    await hoja.getByRole("button", { name: T.propuesta.enviar }).click();
    await expect(page.locator(".tostada__texto")).toHaveText(T.propuesta.listo);
    hoja = await abrirHoja();
  }
  await expect(hoja.locator(".gr-mias li")).toHaveCount(3);
  await expect(hoja.locator(".gr-mias")).toContainText(T.propuesta.estados.pendiente);
  await hoja.getByLabel(T.propuesta.nombre).fill("Música");
  await hoja.getByRole("button", { name: T.propuesta.enviar }).click();
  await expect(hoja.getByRole("alert")).toHaveText(T.propuesta.errores.demasiadas);
});

test("sin grupos: mensaje claro, sin destacado y con «Proponer un grupo»", async ({ page }) => {
  await abrir(page, "?grupos=0");
  const vacio = page.locator(".gr-vacio");
  await expect(vacio.getByRole("heading", { name: T.vacio.titulo })).toBeVisible();
  await expect(vacio.getByText(T.vacio.texto)).toBeVisible();
  await expect(page.locator(".gr-destacado")).toHaveCount(0);
  await expect(tarjetas(page)).toHaveCount(0);
  await sinViolaciones(page);
  // El botón abre el formulario de propuestas aunque no haya grupos, y se puede enviar.
  await vacio.getByRole("button", { name: T.proponer }).click();
  const hoja = page.getByRole("dialog", { name: T.propuesta.titulo });
  await hoja.getByLabel(T.propuesta.nombre).fill("Lectura");
  await hoja.getByRole("button", { name: T.propuesta.enviar }).click();
  await expect(page.locator(".tostada__texto")).toHaveText(T.propuesta.listo);
});

test("dirección directa a un grupo ajeno: no se ven sus publicaciones hasta unirse", async ({ page }) => {
  await page.goto("vista-previa/mi-espacio/comunidad/?vista=grupos&grupo=g4");
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
  await expect(page.getByText(T_COMU.interior.noMiembroTitulo)).toBeVisible();
  await expect(page.locator("article.co-pub")).toHaveCount(0);
});

test("accesibilidad: sin violaciones WCAG 2.2 AA en la pantalla", async ({ page }) => {
  await abrir(page);
  await sinViolaciones(page);
  await abrir(page, "?vista=sugeridos");
  await sinViolaciones(page);
});

test("móvil: sin desplazamiento horizontal y la barra inferior no tapa contenido", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo móvil");
  await abrir(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator(".gr-lateral")).toBeHidden();
  // Cabecera corta; el título completo sigue en la portada y en la pestaña del navegador.
  await expect(page.locator(".cabecera-app__seccion")).toHaveText("Grupos");
  await expect(page.locator("main h1")).toHaveText(T.titulo);
  await expect(page).toHaveTitle(/^Grupos de la comunidad/);
  // Destacado: la ilustración ocupa menos que el texto y el botón de acceso queda a la vista.
  const img = (await page.locator(".gr-destacado__img").boundingBox())!;
  const texto = (await page.locator(".gr-destacado__texto").boundingBox())!;
  expect(img.width).toBeLessThan(texto.width / 1.5);
  await expect(page.locator(".gr-destacado").getByRole("link", { name: T.entrarGrupo })).toBeInViewport();
  await expect(page.locator(".gr-proponer.gr-solo-movil")).toBeVisible();
  await revisarBarra(page);
});
