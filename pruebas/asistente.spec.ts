// Asistente de Rumbo (maqueta de ChatGPT, 30-oct-2026) en la vista previa: conversación con la
// respuesta revisada por el coach y la pregunta en revisión, ejemplos, «Más ideas», lo que se
// comparte, información y ayuda en crisis. Lo real (RPC de la base E2) está en
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
  await expect(page.getByRole("heading", { name: T.ajustes.titulo, level: 2 })).toBeFocused();
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
  await expect(page.getByRole("heading", { name: T.consentimiento.titulo })).toBeVisible();
  for (const p of T.consentimiento.puntos) await expect(page.getByText(p)).toBeVisible();
  for (const o of ["metas", "acciones", "registroSemanal"] as const)
    await expect(page.getByRole("checkbox", { name: new RegExp(T.consentimiento.opciones[o].titulo) })).not.toBeChecked();
  await expect(page.getByLabel(T.escribir)).toHaveCount(0);
  await page.getByRole("button", { name: T.consentimiento.aceptar }).click();
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
