// Detalle de una acción con la referencia de ChatGPT (29-oct-2026): página completa, panel
// lateral del calendario y hoja móvil. Vista previa; la versión real está en mi-espacio-real.spec.ts.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { T_DETALLE } from "../src/pages/vista-previa/mi-espacio/textos";
import { revisarBarra } from "./barra-movil";

const B = "vista-previa/mi-espacio/plan/accion/";
async function abrir(page: Page, estado = "") {
  await page.goto(B + estado);
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
}
async function sinViolaciones(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}
const desborde = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test("por hacer: ruta, encabezado, marcar, versión corta, «Si hoy no alcanzas» y pedir un ajuste", async ({ page }) => {
  await abrir(page);
  const migas = page.getByRole("navigation", { name: T_DETALLE.migas.etiqueta });
  await expect(migas.getByRole("link", { name: T_DETALLE.migas.volver })).toHaveAttribute("href", /\/mi-espacio\/plan\/$/);
  await expect(migas.locator("[aria-current=page]")).toHaveText(T_DETALLE.migas.accion("martes 13"));
  await expect(migas).toContainText(/Semana \d+ de \d+/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Revisar la agenda");
  await expect(page.locator(".me-detalle")).toHaveAttribute("data-cat", "orden");

  // El nombre accesible es solo la acción; la bajada es su descripción.
  const marcar = page.getByRole("button", { name: T_DETALLE.marcar, exact: true });
  await expect(marcar).toHaveAccessibleDescription(T_DETALLE.marcarSub(1));
  const corta = page.getByRole("button", { name: T_DETALLE.corta, exact: true });
  await expect(corta).toHaveAccessibleDescription(T_DETALLE.cortaSub);
  await expect(page.locator(".me-si-no")).toContainText(T_DETALLE.siNo);
  await expect(page.locator(".me-si-no")).toContainText("También cuenta como hecha.");

  // Sin casillas en los pasos ni consejos inventados.
  await expect(page.locator(".me-detalle input[type=checkbox], .me-detalle [role=checkbox]")).toHaveCount(0);
  await expect(page.getByText(/tips del coach|siguiente acción/i)).toHaveCount(0);

  // Marcar → hecha con desmarcar; desmarcar vuelve a por hacer. El foco sigue al estado.
  await marcar.click();
  await expect(page.locator(".me-hecha__texto")).toHaveText(T_DETALLE.hecha);
  await expect(page.getByRole("button", { name: T_DETALLE.desmarcar })).toBeFocused();
  await page.getByRole("button", { name: T_DETALLE.desmarcar }).click();
  await expect(marcar).toBeFocused();
  await corta.click();
  await expect(page.locator(".me-hecha__texto")).toHaveText(T_DETALLE.hechaCorta);

  // Tarjeta final: textos exactos y el formulario de ajuste con la acción elegida.
  const ajuste = page.locator(".me-ajuste-tarjeta");
  await expect(ajuste.getByRole("heading", { name: T_DETALLE.ajusteCard.titulo })).toBeVisible();
  await expect(ajuste).toContainText(T_DETALLE.ajusteCard.texto);
  await ajuste.getByRole("link", { name: T_DETALLE.ajusteCard.boton }).click();
  await expect(page).toHaveURL(/\/ajuste\/\?accion=a5-2026-10-13$/);
});

test("pasos numerados (sin casillas) y «Para qué» con las palabras de la persona", async ({ page }) => {
  await abrir(page, "hecha/");
  await expect(page.locator(".me-pasos > li")).toHaveCount(2);
  await expect(page.locator(".me-seccion-num__bajada").first()).toHaveText(T_DETALLE.comoSub("30 min", true));
  await expect(page.locator(".me-para-que__de")).toHaveText(`${T_DETALLE.atribucion}:`);
  await expect(page.locator(".me-para-que__cita q")).not.toBeEmpty();
  await expect(page.getByRole("button", { name: T_DETALLE.desmarcar })).toBeVisible();
  await expect(page.getByRole("button", { name: T_DETALLE.marcar })).toHaveCount(0);
});

test("estados: futura bloqueada, dejada pasar, anuladas y fuera del plazo", async ({ page }) => {
  await abrir(page, "futura/");
  const marcar = page.getByRole("button", { name: T_DETALLE.marcar, exact: true });
  await expect(marcar).toHaveAttribute("aria-disabled", "true");
  await expect(marcar).toHaveAccessibleDescription(`${T_DETALLE.marcarSub(1)} ${T_DETALLE.futura("miércoles 14")}`);
  await marcar.click({ force: true });
  await expect(page.locator(".me-hecha")).toHaveCount(0);

  await abrir(page, "dejada-pasar/");
  await expect(page.getByText(T_DETALLE.dejada)).toBeVisible();
  await page.getByRole("button", { name: T_DETALLE.deshacer }).click();
  await expect(page.getByRole("button", { name: T_DETALLE.dejar })).toBeVisible();

  await abrir(page, "anulada-pausa/");
  await expect(page.getByText(T_DETALLE.anuladaPausa)).toBeVisible();
  await expect(page.locator(".me-marcar")).toHaveCount(0);
  await abrir(page, "anulada-ajuste/");
  await expect(page.getByText(/Ya no está en tu programa/)).toBeVisible();
  await expect(page.locator(".me-marcar")).toHaveCount(0);
});

test("foto: sin subida simulada, solo «No puedo subir una foto»", async ({ page }) => {
  await abrir(page, "con-foto/");
  await expect(page.getByText(T_DETALLE.foto.porAhora)).toBeVisible();
  await expect(page.getByRole("button", { name: T_DETALLE.foto.subir })).toHaveCount(0);
  await expect(page.locator(".me-detalle input[type=file]")).toHaveCount(0);
  await page.getByRole("button", { name: T_DETALLE.foto.noPuedo }).click();
  await page.getByRole("textbox").fill("Ordené el escritorio pero no tengo cámara a mano.");
  await page.getByRole("button", { name: /enviar|guardar/i }).click();
  await expect(page.locator(".me-foto").getByText(T_DETALLE.foto.enRevision, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: T_DETALLE.foto.eliminar })).toHaveCount(0);

  await abrir(page, "foto-no-aprobada/");
  await expect(page.getByRole("button", { name: T_DETALLE.foto.botonOtra })).toHaveCount(0);
  await expect(page.getByRole("button", { name: T_DETALLE.foto.noPuedo })).toBeVisible();
  for (const e of ["foto-en-revision/", "foto-aprobada/", "foto-depurada/"]) {
    await abrir(page, e);
    await expect(page.locator(".me-foto")).toBeVisible();
  }
});

test("panel lateral y hoja: mismo diseño, sin ruta y con el título en la hoja", async ({ page }) => {
  await page.goto("vista-previa/mi-espacio/plan/");
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
  await page.locator("#dia-2026-10-13 .accion__abrir").first().click();
  const hoja = page.locator("dialog.hoja--detalle[open]");
  await expect(hoja.locator(".me-detalle--hoja")).toBeVisible();
  await expect(hoja.getByRole("navigation", { name: T_DETALLE.migas.etiqueta })).toHaveCount(0);
  await expect(hoja.locator("h1")).toHaveCount(0);
  await expect(hoja.locator(".me-detalle__ilus")).toBeVisible();
  await expect(hoja.getByRole("heading", { level: 3, name: T_DETALLE.como })).toBeVisible();
  await expect(hoja.getByRole("link", { name: T_DETALLE.ajusteCard.boton })).toHaveAttribute("href", /accion=/);
  await sinViolaciones(page);
  expect(await hoja.evaluate((d) => d.scrollWidth - d.clientWidth)).toBeLessThanOrEqual(0);
});

test("accesible y sin desborde en todos los estados; en móvil la barra no tapa", async ({ page, isMobile }) => {
  for (const e of ["", "hecha/", "futura/", "con-foto/", "foto-aprobada/"]) {
    await abrir(page, e);
    await sinViolaciones(page);
    expect(await desborde(page)).toBeLessThanOrEqual(0);
  }
  if (!isMobile) {
    // Escritorio: «Si hoy no alcanzas» al lado de los botones, no debajo.
    await abrir(page);
    const a = await page.locator(".me-detalle__estado").boundingBox();
    const b = await page.locator(".me-si-no").boundingBox();
    expect(b!.x).toBeGreaterThan(a!.x + a!.width - 1);
    return;
  }
  await abrir(page);
  // Móvil: una columna, botones grandes y en orden.
  const y = (sel: string) => page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  const orden = [await y(".me-detalle__titulo"), await y(".me-marcar--primario"), await y(".me-marcar--secundario"), await y(".me-si-no"), await y(".me-ajuste-tarjeta")];
  expect([...orden].sort((p, q) => p - q)).toEqual(orden);
  const alto = await page.locator(".me-marcar--primario").evaluate((el) => el.getBoundingClientRect().height);
  expect(alto).toBeGreaterThanOrEqual(64);
  await page.setViewportSize({ width: 320, height: 640 });
  expect(await desborde(page)).toBeLessThanOrEqual(0);
  await page.setViewportSize({ width: 390, height: 844 });
  if (test.info().project.name !== "iphone") await revisarBarra(page);
});
