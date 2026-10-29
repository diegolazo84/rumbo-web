// Crear publicación (maqueta de ChatGPT, 22-oct-2026) en la vista previa: categorías, texto con
// contador y límite, fotos (tipo, peso, máximo 5, quitar), destino solo en grupos propios,
// comentarios, vista previa, publicar sin duplicar, cancelar con confirmación, accesibilidad y
// móvil (barra inferior y teclado). La base y Mi espacio real se prueban en matriz.mjs y
// mi-espacio-real.spec.ts.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { T_COMU } from "../src/pages/vista-previa/mi-espacio/comunidad/textos";
import { revisarBarra } from "./barra-movil";

const T = T_COMU.crearPagina;
const ETIQUETAS_AXE = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const RUTA = "vista-previa/mi-espacio/comunidad/crear/";

async function abrir(page: Page, q = "") {
  await page.goto(`${RUTA}${q}`);
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
  await expect(page.locator("main h1")).toHaveText(T.titulo);
  await expect(page.locator(".co-cat")).toHaveCount(4); // el formulario aparece al confirmar el acceso
}
async function sinViolaciones(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}
const texto = (page: Page) => page.getByRole("textbox", { name: new RegExp(T.pasos.texto) });
const radio = (page: Page, c: keyof typeof T.categorias) => page.getByRole("radio", { name: T.categorias[c].titulo, exact: true });
const previa = (page: Page) => page.locator(".co-crear__previa .co-crear__pub");
const imagen = (n: number, tipo = "image/png", bytes = 64) => ({ name: `foto${n}.${tipo.split("/")[1]}`, mimeType: tipo, buffer: Buffer.alloc(bytes, n) });

test.beforeEach(({}, info) => {
  test.skip(info.project.name === "iphone", "basta con Chromium en móvil y escritorio");
});

test("los cinco pasos de la maqueta, con sus textos", async ({ page }) => {
  await abrir(page);
  for (const t of [T.pasos.tipo, T.pasos.texto, T.pasos.fotos, T.pasos.donde, T.pasos.config])
    await expect(page.getByRole("heading", { name: new RegExp(t.replace(/[?¿]/g, ".")) })).toBeVisible();
  await expect(texto(page)).toHaveAttribute("placeholder", T.placeholder);
  await expect(page.getByRole("switch", { name: T.comentarios })).toBeChecked();
  await expect(page.getByText(T.comentariosAyuda)).toBeVisible();
  await expect(page.locator(".co-destino__select")).toHaveValue("");
  await expect(page.locator(".co-escribir__contador [aria-hidden]")).toHaveText("0/1.000");
});

test("categorías: se elige una a la vez, se marca y la vista previa la muestra", async ({ page, isMobile }) => {
  await abrir(page);
  await expect(radio(page, "progreso")).toBeChecked();
  for (const c of ["pregunta", "consejo", "otro", "progreso"] as const) {
    await page.locator(".co-cat", { has: radio(page, c) }).click();
    await expect(radio(page, c)).toBeChecked();
    await expect(page.locator(".co-cat input:checked")).toHaveCount(1);
  }
  if (isMobile) return;
  await page.locator(".co-cat", { has: radio(page, "pregunta") }).click();
  await expect(previa(page).locator(".co-pub__tipo")).toHaveText(T_COMU.rotuloTipo.pregunta);
  await page.locator(".co-cat", { has: radio(page, "otro") }).click();
  await expect(previa(page).locator(".co-pub__tipo")).toHaveCount(0); // «Otro» = publicación general, sin rótulo
});

test("texto: no se publica vacío ni solo con espacios; contador y tope de 1.000", async ({ page }) => {
  await abrir(page);
  await page.getByRole("button", { name: T.publicar }).click();
  await expect(page.getByRole("alert")).toContainText(T.errores.vacio);
  await expect(page.getByRole("alert")).toBeFocused();
  await texto(page).fill("    ");
  await page.getByRole("button", { name: T.publicar }).click();
  await expect(page.getByRole("alert")).toContainText(T.errores.vacio);
  await texto(page).fill("x".repeat(1200));
  await expect(texto(page)).toHaveValue("x".repeat(1000));
  await expect(page.locator(".co-escribir__contador [aria-hidden]")).toHaveText("1.000/1.000");
  await expect(page.locator(".co-escribir__contador .sr-only")).toHaveText("1000 de 1000 caracteres");
});

test("emoji: se inserta donde está el cursor", async ({ page }) => {
  await abrir(page);
  await texto(page).fill("Hola mundo");
  await texto(page).evaluate((a: HTMLTextAreaElement) => a.setSelectionRange(4, 4));
  await page.getByRole("button", { name: T.emoji }).click();
  await page.getByRole("group", { name: T.emojis }).getByRole("button", { name: "🎉" }).click();
  await expect(texto(page)).toHaveValue("Hola🎉 mundo");
});

test("fotos: miniaturas, quitar, tipo, peso y máximo de 5", async ({ page, isMobile }) => {
  await abrir(page);
  const archivo = page.locator('input[type="file"]');
  await archivo.setInputFiles([imagen(1), imagen(2, "image/jpeg")]);
  await expect(page.locator(".co-fotos__una")).toHaveCount(2);
  await expect(page.getByRole("img", { name: T.fotoMiniatura(1) }).first()).toBeVisible();
  // Tipo y peso: se explican con el nombre del archivo y no se agregan.
  await archivo.setInputFiles([{ name: "nota.txt", mimeType: "text/plain", buffer: Buffer.from("hola") }, imagen(3, "image/gif")]);
  await expect(page.getByRole("alert")).toContainText(T.errores.fotoTipo("nota.txt"));
  await expect(page.getByRole("alert")).toContainText(T.errores.fotoTipo("foto3.gif"));
  await archivo.setInputFiles([imagen(4, "image/webp", 10 * 1024 * 1024 + 1)]);
  await expect(page.getByRole("alert")).toContainText(T.errores.fotoPeso("foto4.webp"));
  await expect(page.locator(".co-fotos__una")).toHaveCount(2);
  // Máximo 5: entran 3 de 4 y se avisa; el botón para agregar desaparece.
  await archivo.setInputFiles([imagen(5), imagen(6), imagen(7), imagen(8)]);
  await expect(page.locator(".co-fotos__una")).toHaveCount(5);
  await expect(page.getByRole("alert")).toContainText(T.errores.maxFotos);
  await expect(page.locator(".co-fotos__agregar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: T.agregarFotos })).toBeDisabled(); // el de la barra del texto
  if (!isMobile) await expect(previa(page).locator("img")).toHaveCount(5);
  // Quitar antes de publicar.
  await page.getByRole("button", { name: T.quitarFoto(2) }).click();
  await expect(page.locator(".co-fotos__una")).toHaveCount(4);
  await expect(page.locator(".co-fotos__agregar")).toBeVisible();
});

test("destino: solo toda la comunidad y los grupos propios; publica ahí con fotos y comentarios apagados", async ({ page }) => {
  await abrir(page, "?tipo=consejo");
  await expect(page.locator(".co-destino__select option")).toHaveText([T_COMU.formulario.todaLaComunidad, "Vida saludable", "Actividad física", "Bienestar emocional"]);
  await page.locator(".co-destino__select").selectOption({ label: "Actividad física" });
  await texto(page).fill("Partir con 10 minutos me sirvió.");
  await page.locator('input[type="file"]').setInputFiles([imagen(1), imagen(2)]);
  await page.getByRole("switch", { name: T.comentarios }).uncheck();
  const vp = page.viewportSize()!;
  if (vp.width >= 1024) {
    await expect(previa(page).locator(".co-pub__meta")).toContainText(T.en("Actividad física"));
    await expect(previa(page)).toContainText(T.sinComentarios);
    await expect(previa(page).locator(".co-pub__accion")).toHaveCount(0); // sin métricas inventadas
  }
  await page.getByRole("button", { name: T.publicar }).click();
  await expect(page).toHaveURL(/comunidad\/\?vista=grupos&grupo=g2/);
  await expect(page.locator(".tostada__texto")).toHaveText(T.listo);
  const mia = page.locator("article.co-pub", { has: page.getByText("Partir con 10 minutos me sirvió.") });
  await expect(mia).toHaveCount(1);
  await expect(mia.locator(".co-pub__alias")).toHaveText("Tu alias");
  await expect(mia.locator(".co-pub__tipo")).toHaveText(T_COMU.rotuloTipo.consejo);
  await expect(mia.locator(".co-pub__fotos img")).toHaveCount(2);
});

test("publicar: muestra que está publicando y un doble clic no duplica", async ({ page }) => {
  await abrir(page);
  await texto(page).fill("Solo una vez");
  const boton = page.getByRole("button", { name: T.publicar });
  await boton.dblclick();
  await expect(page.locator(".tostada__texto")).toHaveText(T.listo);
  await expect(page.locator("article.co-pub", { has: page.getByText("Solo una vez", { exact: true }) })).toHaveCount(1);
});

test("cancelar: sin cambios vuelve; con cambios pregunta antes de descartar", async ({ page }) => {
  await abrir(page);
  await page.getByRole("button", { name: T.cancelar }).click();
  await expect(page).toHaveURL(/comunidad\/$/);
  await abrir(page);
  await texto(page).fill("Algo a medias");
  await page.getByRole("button", { name: T.cancelar }).click();
  const hoja = page.getByRole("dialog", { name: T.descartar.titulo });
  await expect(hoja).toBeVisible();
  await sinViolaciones(page);
  await hoja.getByRole("button", { name: T.descartar.no }).click();
  await expect(texto(page)).toHaveValue("Algo a medias");
  // «Volver a la comunidad» también pregunta.
  await page.getByRole("link", { name: T.volver }).click();
  await page.getByRole("dialog", { name: T.descartar.titulo }).getByRole("button", { name: T.descartar.si }).click();
  await expect(page).toHaveURL(/comunidad\/$/);
  await expect(page.locator("article.co-pub", { has: page.getByText("Algo a medias") })).toHaveCount(0);
});

test("accesibilidad: vacía, con errores y con fotos", async ({ page }) => {
  await abrir(page);
  await sinViolaciones(page);
  await page.getByRole("button", { name: T.publicar }).click();
  await sinViolaciones(page);
  await page.locator('input[type="file"]').setInputFiles([imagen(1), { name: "x.txt", mimeType: "text/plain", buffer: Buffer.from("x") }]);
  await page.getByRole("button", { name: T.emoji }).click();
  await sinViolaciones(page);
  // Con teclado: la categoría se cambia con flechas.
  await radio(page, "progreso").focus();
  await page.keyboard.press("ArrowRight");
  await expect(radio(page, "pregunta")).toBeChecked();
});

test("escritorio: formulario a la izquierda y vista previa a la derecha", async ({ page, isMobile }) => {
  test.skip(isMobile, "solo escritorio");
  await abrir(page);
  const f = (await page.locator(".co-crear__form").boundingBox())!;
  const p = (await page.locator(".co-crear__previa").boundingBox())!;
  expect(p.x).toBeGreaterThan(f.x + f.width - 1);
  expect(f.width).toBeGreaterThan(p.width * 1.5);
  await expect(page.locator(".co-crear__revisar")).toBeHidden();
  await expect(page.getByRole("link", { name: T.volver })).toBeVisible();
  // Las cuatro categorías en una fila.
  const ys = await page.locator(".co-cat").evaluateAll((b) => b.map((x) => Math.round(x.getBoundingClientRect().top)));
  expect(new Set(ys).size).toBe(1);
});

test("móvil: una columna, revisar antes de publicar y la barra no tapa nada", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo móvil");
  await abrir(page);
  await expect(page.locator(".co-crear__previa")).toBeHidden();
  const ys = await page.locator(".co-cat").evaluateAll((b) => b.map((x) => Math.round(x.getBoundingClientRect().top)));
  expect(new Set(ys).size).toBe(1);
  await texto(page).fill("Mirando antes de publicar");
  await page.getByText(T.revisar).click();
  await expect(page.locator(".co-crear__revisar .co-crear__pub")).toContainText("Mirando antes de publicar");
  // Publicar (ancho completo) va antes que Cancelar.
  const pub = (await page.getByRole("button", { name: T.publicar }).boundingBox())!;
  const can = (await page.getByRole("button", { name: T.cancelar }).boundingBox())!;
  expect(pub.y).toBeLessThan(can.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await revisarBarra(page);
});

test("móvil: con el teclado abierto, el texto y «Publicar» siguen a la vista", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo móvil");
  await abrir(page);
  await texto(page).focus();
  // El teclado del teléfono deja ~55 % de la altura: se simula achicando la ventana.
  const v = page.viewportSize()!;
  await page.setViewportSize({ width: v.width, height: Math.round(v.height * 0.55) });
  await texto(page).fill("Hoy caminé 30 minutos.");
  await expect(texto(page)).toBeInViewport();
  await page.locator(".co-destino__select").focus();
  await expect(page.locator(".co-destino__select")).toBeInViewport({ ratio: 1 });
  await page.getByRole("button", { name: T.publicar }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: T.publicar })).toBeInViewport({ ratio: 1 });
  const barra = (await page.locator("nav.barra-inferior").boundingBox())!;
  const pub = (await page.getByRole("button", { name: T.publicar }).boundingBox())!;
  expect(pub.y + pub.height).toBeLessThanOrEqual(barra.y);
});
