// Mi acompañamiento con la referencia visual v2 (21-oct-2026): «Tu coach» genérico, el mensaje de
// la semana (foco real del coach), «Me está costando», «Escribir mi registro», la próxima revisión
// y el historial reciente, todo con datos que ya existen. Corre sobre la vista previa.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { revisiones } from "../src/data/ejemplo-app";
import { T_ACOMPANAMIENTO as T, T_COSTANDO } from "../src/pages/vista-previa/mi-espacio/textos";

const ETIQUETAS_AXE = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function abrir(page: Page, r: string) {
  await page.goto(`vista-previa/mi-espacio/acompanamiento/${r}`);
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
}

async function sinViolaciones(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}

test.beforeEach(({}, info) => {
  test.skip(info.project.name === "iphone", "basta con Chromium en móvil y escritorio");
});

test("tu coach sin nombre ni foto, con el foco real de la última revisión como mensaje", async ({ page }) => {
  await abrir(page, "publicada/");
  await expect(page.locator("h1")).toHaveText("Mi acompañamiento");
  const coach = page.locator(".me-coach");
  await expect(coach.getByRole("heading", { name: T.coach.titulo, exact: true })).toBeVisible();
  await expect(coach.locator(".me-avatar img")).toHaveCount(0);
  await expect(coach).not.toContainText("Diego");
  const foco = revisiones.find((r) => r.semana === 1)!.foco;
  await expect(coach.locator(".me-coach__cita")).toContainText(foco);
  await expect(coach.locator(".me-coach__mensaje .me-nuevo")).toBeVisible();
  await expect(coach.locator(".me-coach__fecha")).toHaveText("Jueves 8");
  await sinViolaciones(page);
});

test("«Me está costando» abre la misma hoja de Mi Rumbo y el registro está en la pantalla", async ({ page }) => {
  await abrir(page, "");
  await page.getByRole("button", { name: T.botones.costando }).click();
  const hoja = page.getByRole("dialog", { name: T_COSTANDO.titulo });
  await expect(hoja).toBeVisible();
  await expect(hoja).toContainText(T_COSTANDO.ajuste.titulo);
  await expect(hoja).toContainText(T_COSTANDO.contar.titulo);
  await expect(hoja).toContainText(T_COSTANDO.ayuda.titulo);
  await page.keyboard.press("Escape");
  await expect(hoja).not.toBeVisible();
  const escribir = page.getByRole("link", { name: T.botones.escribir });
  await expect(escribir).toHaveAttribute("href", "#tu-registro");
  await escribir.click();
  await expect(page.locator("#tu-registro")).toBeInViewport();
});

test("registro ya enviado: el botón dice «Ver mi registro»", async ({ page }) => {
  await abrir(page, "enviado/");
  await expect(page.getByRole("link", { name: T.botones.ver })).toBeVisible();
  await expect(page.getByRole("link", { name: T.botones.escribir, exact: true })).toHaveCount(0);
});

test("próxima revisión real: por escrito o videollamada según el plan, sin prometer chat", async ({ page }) => {
  await abrir(page, "");
  const proxima = page.locator(".me-proxima");
  await expect(proxima).toContainText("Jueves 15 de octubre");
  await expect(proxima).toContainText(T.proxima.escrita);
  await expect(proxima).toContainText(T.proxima.noEsChat);
  await abrir(page, "cercano/");
  await expect(page.locator(".me-coach__plan")).toContainText("Videollamada semanal de 20 minutos");
  await expect(page.locator(".me-proxima")).toContainText("Videollamada a las");
  await sinViolaciones(page);
});

test("historial: revisiones y solicitudes de ajuste reales, con «Nuevo» y enlaces", async ({ page }) => {
  await abrir(page, "publicada/");
  const items = page.locator(".me-acomp-historial__item");
  await expect(items).toHaveCount(3);
  await expect(items.filter({ hasText: T.historial.revision(1, true) })).toHaveCount(1);
  await expect(items.filter({ hasText: T.historial.ajusteRespondido })).toHaveCount(1);
  await expect(items.filter({ hasText: T.historial.ajustePendiente })).toHaveCount(1);
  await expect(page.locator(".me-acomp-historial .me-nuevo")).toHaveCount(2);
  await items.filter({ hasText: T.historial.revision(1, true) }).getByRole("link").click();
  await expect(page).toHaveURL(/#mis-semanas$/);
  await expect(page.getByRole("heading", { level: 2, name: "Semana 1 de 4." })).toBeVisible();
});

test("semana 1, sin revisiones: foco inicial y fecha de la primera revisión, sin inventar", async ({ page }) => {
  await abrir(page, "semana-1/");
  await expect(page.locator(".me-coach__fecha")).toHaveText(T.mensaje.inicial);
  await expect(page.locator(".me-coach__mensaje .me-nuevo")).toHaveCount(0);
  // Aún no hay revisiones publicadas: el historial no muestra ninguna (solo el ajuste que ya existía).
  await expect(page.locator(".me-acomp-historial")).not.toContainText("Tu coach respondió");
  await expect(page.locator(".me-acomp-historial")).not.toContainText("Tu coach publicó");
});

test("barra inferior: no tapa nada de Mi acompañamiento al desplazar", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo móvil");
  for (const [w, h] of [[320, 568], [375, 667], [390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await abrir(page, "publicada/");
    const tapados = await page.evaluate(async () => {
      const barra = document.querySelector(".barra-inferior")!.getBoundingClientRect();
      const fuera: string[] = [];
      const piezas = document.querySelectorAll<HTMLElement>(".me-acomp :is(a, button, p, h2, h3):not([hidden] *, .sr-only, dialog *)");
      for (const el of piezas) {
        if (!el.offsetParent) continue;
        el.scrollIntoView({ block: "end", behavior: "instant" });
        await new Promise((r) => requestAnimationFrame(r));
        const caja = el.getBoundingClientRect();
        if (!caja.height) continue;
        if (caja.bottom > barra.top + 0.5 && caja.top < innerHeight - 1) {
          const y = Math.min(caja.bottom - 2, innerHeight - 2);
          const arriba = document.elementFromPoint(caja.left + caja.width / 2, y);
          if (arriba && !el.contains(arriba) && arriba.closest(".barra-inferior")) fuera.push(el.textContent?.trim().slice(0, 40) || el.className);
        }
      }
      return fuera;
    });
    expect(tapados, `${w}×${h}`).toEqual([]);
  }
});
