// Comunidad con la maqueta de ChatGPT (21-oct-2026), en la vista previa (datos rotulados
// «Ejemplo»): composición de escritorio y móvil, crear publicación con validaciones, comentarios,
// apoyos, guardar, reportar, bloquear, grupos, desafíos, historias de logro, estados de ingreso
// y accesibilidad. Mi espacio real (la base) se prueba en mi-espacio-real.spec.ts.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { T_COMU as T } from "../src/pages/vista-previa/mi-espacio/comunidad/textos";

const ETIQUETAS_AXE = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const RUTA = "vista-previa/mi-espacio/comunidad/";

async function abrir(page: Page, q = "") {
  await page.goto(`${RUTA}${q}`);
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
  await expect(page.locator("main h1")).toHaveText(T.portada.titulo);
}
async function sinViolaciones(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}
const tarjeta = (page: Page, alias: string) => page.locator("article.co-pub").filter({ has: page.locator(".co-pub__alias", { hasText: alias }) });

test.beforeEach(({}, info) => {
  test.skip(info.project.name === "iphone", "basta con Chromium en móvil y escritorio");
});

test("portada, pestañas y aviso de ejemplo", async ({ page }) => {
  await abrir(page);
  await expect(page.locator(".co-portada__bajada")).toHaveText(T.portada.bajada);
  await expect(page.locator(".co-portada__mano")).toHaveText(T.portada.mano);
  await expect(page.locator(".co-ejemplo")).toContainText(T.ejemplo);
  const nav = page.getByRole("navigation", { name: T.navegacion });
  await expect(nav.locator('[aria-current="page"]')).toContainText(T.pestanas.todasCorta);
  await nav.getByRole("link", { name: T.pestanas.grupos }).click();
  await expect(page).toHaveURL(/vista=grupos/);
  await expect(nav.locator('[aria-current="page"]')).toHaveText(T.pestanas.grupos);
  await sinViolaciones(page);
});

test("escritorio: tres columnas y la central es la más ancha", async ({ page, isMobile }) => {
  test.skip(isMobile, "solo escritorio");
  await abrir(page);
  const ancho = async (s: string) => (await page.locator(s).boundingBox())!.width;
  const [izq, centro, der] = [await ancho(".co-col--izq"), await ancho(".co-col--centro"), await ancho(".co-col--der")];
  expect(centro).toBeGreaterThan(izq * 1.5);
  expect(centro).toBeGreaterThan(der * 1.5);
  await expect(page.locator(".co-col--izq")).toContainText(T.grupos.titulo);
  await expect(page.locator(".co-col--izq")).toContainText(T.desafios.destacado);
  await expect(page.locator(".co-col--der")).toContainText(T.temas.titulo);
  await expect(page.locator(".co-col--der")).toContainText(T.impacto.titulo);
  // La pestaña activa es una pastilla verde bosque y «Crear publicación» está a la derecha.
  await expect(page.locator(".co-pestana[aria-current]")).toHaveCSS("background-color", "rgb(31, 70, 54)");
  await expect(page.getByRole("button", { name: T.crear })).toBeVisible();
});

test("móvil: una columna, crear publicación antes de las publicaciones y la barra no tapa acciones", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo móvil");
  await abrir(page);
  await expect(page.locator(".co-col--izq")).toBeHidden();
  const crear = await page.locator(".co-compositor").boundingBox();
  const primera = await page.locator("article.co-pub").first().boundingBox();
  expect(crear!.y).toBeLessThan(primera!.y);
  // Todos los accesos del bloque de crear caben en una línea.
  const ys = await page.locator(".co-compositor__acceso").evaluateAll((b) => b.map((x) => Math.round(x.getBoundingClientRect().top)));
  expect(new Set(ys).size).toBe(1);
  // Al final de la página, las acciones de la última publicación quedan sobre la barra inferior.
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await page.waitForTimeout(300);
  const barra = await page.locator("nav.barra-inferior").boundingBox();
  const ultima = page.locator("article.co-pub").last().locator(".co-pub__pie");
  const pie = await ultima.boundingBox();
  expect(pie!.y + pie!.height).toBeLessThanOrEqual(barra!.y);
  // Sin desplazamiento horizontal de la página.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("crear publicación: valida, publica con alias y tipo, y confirma", async ({ page }) => {
  await abrir(page);
  await page.locator(".co-compositor").getByRole("button", { name: T.compositor.accesos.pregunta }).click();
  const hoja = page.getByRole("dialog", { name: T.formulario.titulo });
  await expect(hoja).toBeVisible();
  await expect(hoja.getByRole("radio", { name: T.tipos.pregunta })).toBeChecked();
  await hoja.getByRole("button", { name: T.formulario.publicar }).click();
  await expect(hoja.getByRole("alert")).toHaveText(T.formulario.errores.vacio);
  await hoja.getByLabel(T.formulario.texto).fill("x".repeat(1001));
  await hoja.getByRole("button", { name: T.formulario.publicar }).click();
  await expect(hoja.getByRole("alert")).toHaveText(T.formulario.errores.largo(1000));
  await hoja.getByLabel(T.formulario.texto).fill("¿Cómo ordenan su semana? #Hábitos");
  await hoja.getByLabel(T.formulario.donde).selectOption({ label: T.formulario.soloGrupo("Vida saludable") });
  await hoja.getByRole("button", { name: T.formulario.publicar }).click();
  await expect(hoja).toBeHidden();
  await expect(page.locator(".tostada__texto")).toHaveText(T.formulario.listo);
  const mia = page.locator("article.co-pub").first();
  await expect(mia.locator(".co-pub__alias")).toHaveText("Tu alias");
  await expect(mia.locator(".co-pub__meta")).toContainText("En Vida saludable");
  await expect(mia.locator(".co-pub__tipo")).toHaveText(T.rotuloTipo.pregunta);
  await expect(page.locator(".co-col--der .co-impacto__numeros dd").first()).toHaveText("1");
});

test("foto: el acceso «Foto» abre el formulario y rechaza archivos que no son imágenes", async ({ page }) => {
  await abrir(page);
  const selector = page.waitForEvent("filechooser");
  await page.locator(".co-compositor").getByRole("button", { name: T.compositor.accesos.foto }).click();
  const elegir = await selector;
  await elegir.setFiles({ name: "nota.txt", mimeType: "text/plain", buffer: Buffer.from("hola") });
  const hoja = page.getByRole("dialog", { name: T.formulario.titulo });
  await expect(hoja.getByRole("alert")).toHaveText(T.formulario.errores.fotoTipo);
});

test("apoyos, guardar y comentarios", async ({ page }) => {
  await abrir(page);
  const sofia = tarjeta(page, "Sofía");
  const apoyo = sofia.locator(".co-pub__accion--apoyo");
  await expect(apoyo).toHaveAttribute("aria-pressed", "false");
  await apoyo.click();
  await expect(apoyo).toHaveAttribute("aria-pressed", "true");
  await expect(apoyo).toContainText("7");
  const guardar = sofia.getByRole("button", { name: T.publicacion.guardar });
  await guardar.click();
  await expect(sofia.getByRole("button", { name: T.publicacion.guardada })).toHaveAttribute("aria-pressed", "true");
  await sofia.getByRole("button", { name: T.publicacion.comentarios(2) }).click();
  await expect(sofia.locator(".co-com")).toHaveCount(2);
  await sofia.getByLabel(T.hilo.escribir).fill("¡Muy bien!");
  await sofia.getByRole("button", { name: T.hilo.responder, exact: true }).click();
  await expect(sofia.locator(".co-com")).toHaveCount(3);
  await expect(sofia.locator(".co-com").last()).toContainText("Tu alias");
  // Guardadas en Mi actividad.
  await page.goto(`${RUTA}?vista=actividad`);
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
  await expect(page.locator(".co-feed").first()).toBeVisible();
});

test("reportar y bloquear desde el menú de una publicación", async ({ page }) => {
  await abrir(page);
  const matias = tarjeta(page, "Matías");
  await matias.getByRole("button", { name: T.publicacion.acciones("Matías") }).click();
  await matias.getByRole("button", { name: T.publicacion.reportar }).click();
  const hoja = page.getByRole("dialog", { name: T.reporte.titulo });
  await hoja.getByRole("button", { name: T.reporte.enviar }).click();
  await expect(hoja.getByRole("alert")).toBeVisible();
  await hoja.getByRole("radio", { name: T.reporte.motivos.spam }).check();
  await hoja.getByRole("button", { name: T.reporte.enviar }).click();
  await expect(page.locator(".tostada__texto")).toHaveText(T.reporte.listo);

  await matias.getByRole("button", { name: T.publicacion.acciones("Matías") }).click();
  await matias.getByRole("button", { name: T.publicacion.bloquear("Matías") }).click();
  await page.getByRole("dialog", { name: T.bloqueo.titulo("Matías") }).getByRole("button", { name: T.bloqueo.confirmar }).click();
  await expect(page.locator(".tostada__texto")).toHaveText(T.bloqueo.listo("Matías"));
  await expect(tarjeta(page, "Matías")).toHaveCount(0);
  // Se puede desbloquear desde Mi actividad (en la misma sesión de la vista previa).
  await page.locator(".co-col--der").getByRole("link", { name: T.impacto.ver }).or(page.locator(".co-pestanas__item--movil a")).locator("visible=true").first().click();
  await page.getByRole("button", { name: T.actividad.desbloquear }).click();
  await expect(page.locator(".tostada__texto")).toHaveText(T.actividad.desbloqueada("Matías"));
});

test("temas: el filtro muestra solo las publicaciones con ese tema", async ({ page }) => {
  await abrir(page, "?tema=Motivación");
  await expect(page.locator(".co-filtro")).toContainText(T.temas.filtrando("Motivación"));
  await expect(page.locator("article.co-pub")).toHaveCount(1);
  await expect(tarjeta(page, "Valentina")).toHaveCount(1);
});

test("grupos: descubrir, unirse, entrar y ver sus publicaciones", async ({ page }) => {
  await abrir(page, "?vista=grupos");
  const grupo = page.locator(".co-grupo").filter({ hasText: "Alimentación consciente" });
  await expect(grupo).toContainText(T.grupos.miembros(7));
  await grupo.getByRole("button", { name: T.grupos.unirme }).click();
  await expect(page.locator(".tostada__texto")).toHaveText(T.grupos.unido("Alimentación consciente"));
  await expect(grupo).toContainText(T.grupos.miembros(8));
  await grupo.getByRole("link", { name: "Alimentación consciente" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Alimentación consciente" })).toBeVisible();
  await expect(page.locator(".co-estado--vacio")).toHaveText(T.feed.vacioGrupo);
  await expect(page.locator(".co-compositor")).toBeVisible();
  await sinViolaciones(page);
});

test("desafíos: objetivo, reglas, participar, avance día a día y salir", async ({ page }) => {
  await abrir(page, "?vista=desafios");
  const d = page.locator(".co-desafio").first();
  await expect(d.getByRole("heading", { name: "28 días de constancia" })).toBeVisible();
  await expect(d).toContainText(T.desafios.reglas);
  await expect(d).toContainText(T.desafios.noSuma);
  await d.getByRole("button", { name: T.desafios.unirme }).click();
  await expect(page.locator(".tostada__texto")).toHaveText(T.desafios.unido);
  await expect(d.locator(".co-dia")).toHaveCount(10);
  await expect(d.locator(".co-barra__texto")).toHaveText(T.desafios.avance(7, 28));
  await d.getByRole("button", { name: T.desafios.salir }).click();
  await expect(d.locator(".co-dia")).toHaveCount(0);
  await sinViolaciones(page);
});

test("historias de logro: solo publicaciones de logro, y se crea con ese tipo", async ({ page }) => {
  await abrir(page, "?vista=logros");
  await expect(page.locator("article.co-pub")).toHaveCount(1);
  await expect(page.locator("article.co-pub .co-pub__tipo")).toHaveText(T.rotuloTipo.logro);
  await page.locator(".co-compositor__invitacion").click();
  await expect(page.getByRole("dialog", { name: T.formulario.titulo }).getByRole("radio", { name: T.tipos.logro })).toBeChecked();
});

test("antes de participar: comunidad cerrada, elegir alias y aceptar reglas", async ({ page }) => {
  await abrir(page, "?acceso=cerrada");
  await expect(page.getByRole("heading", { name: T.acceso.cerrada.titulo })).toBeVisible();
  await expect(page.locator("article.co-pub")).toHaveCount(0);
  await sinViolaciones(page);
  await abrir(page, "?acceso=sin_alias");
  await page.getByRole("button", { name: T.acceso.sin_alias.guardar }).click();
  await expect(page.getByRole("alert")).toHaveText(T.acceso.sin_alias.invalido);
  await abrir(page, "?acceso=sin_reglas");
  await expect(page.locator(".co-reglas li")).toHaveCount(T.acceso.sin_reglas.reglas.length);
  await expect(page.getByRole("button", { name: T.acceso.sin_reglas.aceptar })).toBeVisible();
  await sinViolaciones(page);
});

test("accesibilidad de la pantalla completa y del formulario abierto", async ({ page }) => {
  await abrir(page);
  await sinViolaciones(page);
  await page.locator(".co-compositor__invitacion").click();
  await expect(page.getByRole("dialog", { name: T.formulario.titulo })).toBeVisible();
  await sinViolaciones(page);
});

// Comportamiento real de la barra inferior en móvil: se desplaza la página con la rueda paso a
// paso (la barra no se mueve ni queda bajo el contenido), cada control alcanzado con el teclado
// queda entero entre la cabecera y la barra, y al final el último contenido queda sobre la barra.
async function revisarBarra(page: Page) {
  const barra = page.locator("nav.barra-inferior");
  await expect(barra).toBeVisible();
  const alto = await page.evaluate(() => window.innerHeight);
  const topeBarra = async () => (await barra.boundingBox())!.y;
  const inicial = await topeBarra();
  await page.mouse.move(200, alto / 2);
  for (let i = 0; i < 80; i++) {
    const antes = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(60);
    expect(await topeBarra()).toBeCloseTo(inicial, 0);
    // Lo que se ve en el centro de la barra es la barra misma: ningún contenido queda encima.
    expect(await page.evaluate((y) => !!document.elementFromPoint(window.innerWidth / 2, y + 20)?.closest("nav.barra-inferior"), inicial)).toBe(true);
    if ((await page.evaluate(() => window.scrollY)) === antes) break;
  }
  const fin = await page.evaluate(() => {
    const m = document.querySelector("main")!;
    const hijos = [...m.querySelectorAll("*")].filter((e) => (e as HTMLElement).offsetParent !== null);
    return Math.max(...hijos.map((e) => e.getBoundingClientRect().bottom));
  });
  expect(fin).toBeLessThanOrEqual(inicial + 0.5);
  // Cada control con foco queda visible entero (cabecera arriba, barra abajo).
  const cabeza = await page.evaluate(() => document.querySelector("header.cabecera, .cabecera-app")?.getBoundingClientRect().bottom ?? 0);
  const fallas = await page.evaluate(
    ({ abajo, arriba }) => {
      const r: string[] = [];
      // La página se desplaza con suavidad; aquí se mide la posición final de cada foco.
      document.documentElement.style.scrollBehavior = "auto";
      const controles = [...document.querySelectorAll<HTMLElement>("main a[href], main button, main input, main select, main textarea")].filter(
        (e) => e.offsetParent !== null && !e.hasAttribute("disabled"),
      );
      for (const e of controles) {
        e.focus({ preventScroll: false });
        if (document.activeElement !== e) continue;
        const b = e.getBoundingClientRect();
        if (b.bottom > abajo + 0.5 || b.top < arriba - 0.5) r.push(`${e.tagName} «${(e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 30)}» ${Math.round(b.top)}-${Math.round(b.bottom)}`);
      }
      return r;
    },
    { abajo: inicial, arriba: cabeza },
  );
  expect(fallas).toEqual([]);
}

for (const vista of ["", "?vista=grupos", "?vista=desafios", "?vista=logros", "?vista=actividad"]) {
  test(`móvil: la barra inferior no tapa contenido ni controles al desplazarse ${vista || "(todas)"}`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "solo móvil");
    await abrir(page, vista);
    await revisarBarra(page);
  });
}

test("móvil: con el teclado abierto, el texto y «Publicar» siguen a la vista", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo móvil");
  await abrir(page);
  await page.locator(".co-compositor").getByRole("button", { name: T.compositor.accesos.progreso }).click();
  const hoja = page.getByRole("dialog", { name: T.formulario.titulo });
  await hoja.getByLabel(T.formulario.texto).focus();
  // El teclado del teléfono deja ~55 % de la altura: se simula achicando la ventana.
  const v = page.viewportSize()!;
  await page.setViewportSize({ width: v.width, height: Math.round(v.height * 0.55) });
  await hoja.getByLabel(T.formulario.texto).fill("Hoy caminé 30 minutos.");
  await expect(hoja.getByLabel(T.formulario.texto)).toBeInViewport();
  await hoja.getByRole("button", { name: T.formulario.publicar }).scrollIntoViewIfNeeded();
  await expect(hoja.getByRole("button", { name: T.formulario.publicar })).toBeInViewport({ ratio: 1 });
});
