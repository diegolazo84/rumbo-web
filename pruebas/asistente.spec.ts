// Asistente de Rumbo (maqueta definitiva de ChatGPT, 31-oct-2026) en la vista previa: conversación
// con la respuesta revisada por el coach y la pregunta enviada, ejemplos, «Más ideas», «Crear plan»,
// lo que se comparte, información, ayuda en crisis y los 8 estados de la maqueta. Lo real (RPC de la base E2) está en
// mi-espacio-real.spec.ts; las reglas de la base, en pruebas/base/matriz.mjs.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { T_ASISTENTE as T } from "../src/pages/vista-previa/mi-espacio/textos";
import { revisarBarra } from "./barra-movil";

const RUTA = "vista-previa/mi-espacio/asistente/";
async function abrir(page: Page) {
  await page.goto(RUTA);
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
}

test("se llega desde la barra lateral (escritorio) o el menú (móvil)", async ({ page, isMobile }) => {
  await page.goto("vista-previa/mi-espacio/");
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
  if (isMobile) {
    await page.getByRole("button", { name: "Menú" }).click();
    await page.getByRole("link", { name: T.titulo }).click();
  } else {
    await page.locator("nav.lateral").getByRole("link", { name: T.titulo }).click();
  }
  await page.waitForURL(`**/${RUTA}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(T.titulo);
  if (!isMobile) await expect(page.locator("nav.lateral").getByRole("link", { name: T.titulo })).toHaveAttribute("aria-current", "page");
  // La barra inferior del móvil no cambia: siguen siendo 5 secciones.
  if (isMobile) await expect(page.locator("nav.barra-inferior .nav-app__item")).toHaveCount(5);
});

test("conversación: solo lo revisado por el coach; lo pendiente se dice «En revisión»", async ({ page }) => {
  await abrir(page);
  const pares = page.locator(".as-par");
  await expect(pares).toHaveCount(2);
  await expect(pares.first()).toContainText("mantener la motivación");
  await expect(pares.first()).toContainText(T.estados.aprobada.etiqueta);
  await expect(pares.nth(1)).toContainText(T.estados.en_revision.etiqueta);
  await expect(pares.nth(1)).toContainText(T.estados.en_revision.texto);
  await expect(page.getByText("Ejemplo", { exact: true }).first()).toBeVisible();
});

test("«Más ideas» y los ejemplos preparan una pregunta sin enviarla; enviar avisa que la revisa el coach", async ({ page, isMobile }) => {
  await abrir(page);
  const campo = page.getByLabel(T.escribir);
  await page.getByRole("button", { name: T.seguir.masIdeas }).click();
  await expect(campo).toHaveValue(/^Sobre «Me está costando mantener la motivación esta semana\. ¿Qué…»: ¿me das otras ideas distintas\?$/);
  await expect(campo).toBeFocused();
  if (!isMobile) {
    await page.getByRole("button", { name: T.ejemplos.lista[1] }).click();
    await expect(campo).toHaveValue(T.ejemplos.lista[1]);
  }
  await campo.fill("ok");
  await page.getByRole("button", { name: T.enviar }).click();
  await expect(page.locator("#as-pregunta-estado")).toHaveText(T.muyCorta);
  await campo.fill("¿Cómo retomo después de unos días difíciles?");
  await expect(page.getByText(T.largo(44))).toBeVisible();
  await page.getByRole("button", { name: T.enviar }).click();
  await expect(page.locator("#as-pregunta-estado")).toHaveText(T.enviadaAviso);
  await expect(campo).toHaveValue("");
});

test("lo que compartes: cambiar abre el formulario; retirar pide confirmación", async ({ page }) => {
  await abrir(page);
  await expect(page.getByText(T.ajustes.con("mis metas, mis acciones de esta semana"))).toBeVisible();
  await page.getByRole("button", { name: T.ajustes.cambiar }).click();
  await expect(page.getByRole("heading", { name: T.ajustes.cambiar, level: 2 })).toBeFocused();
  await expect(page.getByRole("checkbox", { name: new RegExp(T.consentimiento.opciones.metas.titulo) })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: new RegExp(T.consentimiento.opciones.registroSemanal.titulo) })).not.toBeChecked();
  await page.getByRole("button", { name: T.ajustes.confirmarNo }).click();
  await page.getByRole("button", { name: T.ajustes.retirar }).click();
  await expect(page.getByText(T.ajustes.confirmar)).toBeVisible();
  await page.getByRole("button", { name: T.ajustes.confirmarNo }).click();
  await expect(page.getByText(T.ajustes.confirmar)).toHaveCount(0);
});

test("información y ayuda en crisis siempre visibles, sin prometer confidencialidad absoluta", async ({ page }) => {
  await abrir(page);
  await expect(page.getByRole("heading", { name: T.info.titulo })).toBeVisible();
  await expect(page.getByText(T.info.puntos[2].texto)).toBeVisible();
  const crisis = page.locator(".as-crisis");
  await expect(crisis).toContainText("*4141");
  await expect(crisis.getByRole("link", { name: "131" })).toHaveAttribute("href", "tel:131");
  await expect(page.locator("main")).not.toContainText(/confidencial/i);
});

test("accesible y sin desborde; en móvil la barra no tapa nada", async ({ page, isMobile }) => {
  await abrir(page);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  if (isMobile) {
    await page.setViewportSize({ width: 320, height: 640 });
    const sobra = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".rc-tarjeta, .as-burbuja, .as-chip, .as-escribir__caja, .as-ejemplo")]
        .filter((e) => e.getBoundingClientRect().right > window.innerWidth + 0.5)
        .map((e) => `${e.className} ${Math.round(e.getBoundingClientRect().right)}`),
    );
    expect(sobra).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    if (test.info().project.name !== "iphone") await revisarBarra(page);
  }
});

test("autorización: explica qué hace, qué se envía, la revisión del coach y cómo retirarla; sin ella no se pregunta", async ({ page }) => {
  await page.goto("vista-previa/mi-espacio/asistente/autorizar/");
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
  await expect(page.getByRole("heading", { name: T.privacidad.titulo })).toBeVisible();
  await expect(page.getByText(T.privacidad.resumen)).toBeVisible();
  await page.getByText(T.privacidad.saberMas).click();
  for (const p of T.consentimiento.puntos) await expect(page.getByText(p)).toBeVisible();
  for (const o of ["metas", "acciones", "registroSemanal"] as const)
    await expect(page.getByRole("checkbox", { name: new RegExp(T.consentimiento.opciones[o].titulo) })).not.toBeChecked();
  await expect(page.getByLabel(T.escribir)).toHaveCount(0);
  await page.getByRole("button", { name: T.privacidad.aceptar }).click();
  await expect(page.getByLabel(T.escribir)).toBeVisible();
});

test("apagado: lo dice, lleva a Mi acompañamiento y la ayuda en crisis sigue a la vista", async ({ page }) => {
  await page.goto("vista-previa/mi-espacio/asistente/apagado/");
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
  await expect(page.getByRole("heading", { name: T.apagado.titulo })).toBeVisible();
  await expect(page.getByRole("link", { name: T.apagado.ir })).toBeVisible();
  await expect(page.getByLabel(T.escribir)).toHaveCount(0);
  await expect(page.locator(".as-crisis")).toContainText("*4141");
});

// ---------------------------------------------------------------------------
// Estados de la maqueta definitiva (31-oct)

async function estado(page: Page, e: string) {
  await page.goto(`${RUTA}${e}/`);
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
}

test("1. primera visita: bienvenida con la supervisión del coach; «Comenzar» lleva a la autorización", async ({ page }) => {
  await estado(page, "bienvenida");
  await expect(page.getByRole("heading", { name: T.bienvenida.titulo })).toBeVisible();
  for (const p of T.bienvenida.puntos) await expect(page.getByText(p, { exact: true })).toBeVisible();
  await expect(page.getByLabel(T.escribir)).toHaveCount(0);
  await page.getByRole("button", { name: T.bienvenida.comenzar }).click();
  await expect(page.getByRole("heading", { name: T.privacidad.titulo })).toBeFocused();
});

test("3. pregunta enviada: se dice que está enviada y que la revisa el coach", async ({ page }) => {
  await estado(page, "enviada");
  const enviada = page.locator(".as-enviada");
  await expect(enviada).toContainText(T.estados.en_revision.etiqueta);
  await expect(enviada).toContainText(T.estados.en_revision.texto);
  await expect(page.locator(".as-burbuja--ia")).toHaveCount(0);
});

test("4. respuesta aprobada: aviso de revisión, «Revisada por tu coach» y las acciones; «Crear plan» solo prepara una pregunta", async ({ page }) => {
  await estado(page, "aprobada");
  await expect(page.locator(".as-lista")).toContainText(T.lista.titulo);
  await expect(page.locator(".as-burbuja--ia ol li")).toHaveCount(3);
  await expect(page.locator(".as-revisada")).toHaveText(T.estados.aprobada.etiqueta);
  const acciones = page.getByRole("group", { name: T.seguir.titulo });
  await expect(acciones.getByRole("button")).toHaveText([T.seguir.masIdeas, T.seguir.crearPlan, T.seguir.profundizar]);
  await acciones.getByRole("button", { name: T.seguir.crearPlan }).click();
  await expect(page.getByLabel(T.escribir)).toHaveValue(/plan simple para esta semana.*antes de cambiar mi plan\.$/);
  await expect(page.getByLabel(T.escribir)).toBeFocused();
  // «Me sirvió» / «No me sirvió»: una sola vigente; «No me sirvió» ofrece un comentario opcional.
  const valorar = page.getByRole("group", { name: T.valorar.grupo });
  const sirvio = valorar.getByRole("button", { name: T.valorar.sirvio, exact: true });
  const noSirvio = valorar.getByRole("button", { name: T.valorar.noSirvio });
  await sirvio.click();
  await expect(sirvio).toHaveAttribute("aria-pressed", "true");
  await noSirvio.click();
  await expect(sirvio).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByLabel(T.valorar.motivo)).toBeVisible();
  await noSirvio.click();
  await expect(noSirvio).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText(T.valorar.quitada)).toBeVisible();
});

test("5. no compartida: se explica sin mostrar el borrador; «Escribir una nueva pregunta» lleva al campo", async ({ page }) => {
  await estado(page, "no-compartida");
  const nc = page.locator(".as-no-compartida");
  await expect(nc).toContainText(T.estados.descartada.etiqueta);
  await expect(nc).toContainText(T.estados.descartada.texto);
  await expect(page.locator(".as-burbuja--ia")).toHaveCount(0);
  await expect(page.locator(".as-revisada")).toHaveCount(0);
  await nc.getByRole("button", { name: T.nuevaPregunta }).click();
  await expect(page.getByLabel(T.escribir)).toBeFocused();
});

test("6. mis conversaciones: por fecha, con su estado; elegir una vuelve a la conversación", async ({ page }) => {
  await estado(page, "conversaciones");
  await expect(page.getByRole("heading", { name: T.historial.titulo })).toBeFocused();
  await expect(page.locator(".as-historial__dia")).toHaveText([T.historial.grupos.hoy, T.historial.grupos.pasada, T.historial.grupos.antes]);
  await expect(page.locator(".as-historial__fila").first()).toContainText(T.historial.estados.aprobada);
  await expect(page.locator(".as-historial__fila--en_revision")).toContainText(T.historial.estados.en_revision);
  await expect(page.locator(".as-historial__fila--descartada")).toContainText(T.historial.estados.descartada);
  await page.locator(".as-historial__fila").first().click();
  await expect(page.locator(".as-chat .as-par")).not.toHaveCount(0);
  await expect(page.locator("#as-c-ih-1")).toBeFocused();
});

test("6b. desde la conversación se abren Mis conversaciones y la configuración", async ({ page }) => {
  await abrir(page);
  await page.getByRole("button", { name: T.historial.abrir }).click();
  await expect(page).toHaveURL(/\?ver=conversaciones$/);
  await expect(page.getByRole("heading", { name: T.historial.titulo })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${RUTA}$`));
  await expect(page.locator(".as-chat .as-par")).toHaveCount(2);
  await page.getByRole("button", { name: T.configuracion.abrir, exact: true }).click();
  await expect(page.getByRole("heading", { name: T.configuracion.titulo })).toBeVisible();
});

test("7. configuración: el interruptor refleja la autorización y apagarlo pide confirmar el retiro", async ({ page }) => {
  await estado(page, "configuracion");
  const sw = page.getByRole("switch", { name: T.configuracion.interruptor });
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await sw.click();
  await expect(page.getByText(T.ajustes.confirmar)).toBeVisible();
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await page.getByRole("button", { name: T.ajustes.confirmarNo }).click();
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: T.ajustes.cambiar }).first().click();
  await expect(page.getByRole("heading", { name: T.ajustes.cambiar, level: 2 })).toBeFocused();
});

test("8. desactivado por la persona: puede activarlo (vuelve a autorizar); apagado por el equipo: no", async ({ page }) => {
  await estado(page, "desactivado");
  await expect(page.getByRole("heading", { name: T.desactivado.titulo })).toBeVisible();
  await expect(page.getByLabel(T.escribir)).toHaveCount(0);
  await page.getByRole("button", { name: T.desactivado.activar }).click();
  await expect(page.getByRole("heading", { name: T.privacidad.titulo })).toBeFocused();
  for (const o of ["metas", "acciones", "registroSemanal"] as const)
    await expect(page.getByRole("checkbox", { name: new RegExp(T.consentimiento.opciones[o].titulo) })).not.toBeChecked();
  await estado(page, "apagado");
  await expect(page.getByRole("button", { name: T.desactivado.activar })).toHaveCount(0);
});

test("móvil: «Apoyo» queda marcado, la barra no tapa nada en ningún estado y se oculta al escribir", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo móvil");
  for (const e of ["", "bienvenida", "autorizar", "aprobada", "no-compartida", "conversaciones", "configuracion", "desactivado"]) {
    if (e) await estado(page, e);
    else await abrir(page);
    await expect(page.locator("nav.barra-inferior .nav-app__item")).toHaveCount(5);
    await expect(page.locator('nav.barra-inferior [aria-current="page"]')).toContainText("Apoyo");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    if (test.info().project.name !== "iphone") await revisarBarra(page);
  }
  await abrir(page);
  await page.getByLabel(T.escribir).focus();
  await expect(page.locator("nav.barra-inferior")).toBeHidden();
});

test("los 8 estados pasan axe y no desbordan a 320, 768 y 1600 px", async ({ page }) => {
  for (const ancho of [320, 768, 1600]) {
    await page.setViewportSize({ width: ancho, height: 900 });
    for (const e of ["bienvenida", "autorizar", "enviada", "aprobada", "no-compartida", "conversaciones", "configuracion", "desactivado"]) {
      await estado(page, e);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `${e} a ${ancho}`).toBeLessThanOrEqual(0);
      if (ancho === 320) {
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        expect(r.violations.map((v) => `${e}: ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
      }
    }
  }
});

test("quien ya conversó: en móvil la portada es compacta, con accesos a escribir, privacidad y ayuda; la primera visita no cambia", async ({ page, isMobile }) => {
  await abrir(page);
  const atajos = page.getByRole("navigation", { name: T.atajos.titulo });
  if (!isMobile) {
    await expect(atajos).toBeHidden();
    await expect(page.locator(".as-claves")).toBeVisible();
    return;
  }
  await expect(page.locator(".as--compacta")).toHaveCount(1);
  await expect(atajos).toBeVisible();
  await expect(page.locator(".as-portada .rc-portada__bajada")).toBeHidden();
  await expect(page.locator(".as-portada .as-supervision")).toBeVisible();
  const alto = await page.locator(".as-portada").evaluate((e) => e.getBoundingClientRect().height);
  expect(alto).toBeLessThan(260);
  // Lo informativo y legal sigue en la página, a un toque.
  await atajos.getByRole("link", { name: T.atajos.privacidad }).click();
  await expect(page.locator("#as-info")).toBeInViewport();
  await atajos.getByRole("link", { name: T.atajos.ayuda }).click();
  await expect(page.locator("#as-crisis")).toBeInViewport();
  await expect(page.getByRole("link", { name: "131" }).first()).toBeVisible();
  await atajos.getByRole("button", { name: T.atajos.escribir }).click();
  await expect(page.getByLabel(T.escribir)).toBeFocused();

  // Primera visita: la bienvenida y la explicación completa.
  await estado(page, "bienvenida");
  await expect(page.locator(".as--compacta")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: T.atajos.titulo })).toHaveCount(0);
  await expect(page.locator(".as-portada .rc-portada__bajada")).toBeVisible();
  await expect(page.locator(".as-revisa")).toBeVisible();
});
