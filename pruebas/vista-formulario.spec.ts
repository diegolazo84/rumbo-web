// Vista previa de /postular/, /estado/ y /contacto/ (plataforma 3 y 8.2-F, etapa 0): la
// validación funciona de verdad en el navegador y el envío se simula sin red. Comprueba el
// resumen de errores (F2), la validación al salir del campo (F3), la preselección por URL (F4),
// el borrador en la pestaña (F6), el cambio a modo interés, la confirmación y el diálogo de retiro.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { CONTACTO, CORREO, NOMBRE, POSTULAR, RETIRAR, ACEPTAR_ACUERDO, validarPostular } from "../src/data/formularios";
import { POSTULANTE } from "../src/data/ejemplo-app";

const ETIQUETAS_AXE = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const hidratar = (page: Page) => page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
async function abrir(page: Page, ruta: string) {
  await page.goto(`vista-previa/${ruta}`);
  await hidratar(page);
  await expect(page.locator("main h1")).toHaveCount(1);
}
async function sinViolaciones(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "escritorio", "interacción: basta un proyecto");
});

test("postular: enviar vacío muestra el resumen con los textos de formularios.ts y lleva a cada campo", async ({ page }) => {
  await abrir(page, "postular/");
  await page.getByRole("button", { name: POSTULAR.envio.boton }).click();
  const resumen = page.locator("#resumen-errores");
  await expect(resumen).toBeFocused();
  const esperados = Object.values(
    validarPostular({ area: "", meta: "", apoyo: "", nombre: "", correo: "", mayorEdad: false, autorizacion: false }),
  );
  await expect(resumen.getByRole("heading")).toHaveText(`Revisa ${esperados.length} campos antes de enviar`);
  await expect(resumen.getByRole("link")).toHaveText(esperados as string[]);
  await resumen.getByRole("link", { name: NOMBRE.errores.vacio }).click();
  await expect(page.locator("#nombre")).toBeFocused();
  await resumen.getByRole("link", { name: POSTULAR.meta.errores.vacio }).click();
  await expect(page.locator("#meta")).toBeFocused();
  // El error desaparece apenas se corrige, y el resumen se acorta.
  await page.locator("#correo").fill("camila@ejemplo.cl");
  await expect(page.locator("#correo")).not.toHaveAttribute("aria-invalid", "true");
  await expect(resumen.getByRole("heading")).toHaveText(`Revisa ${esperados.length - 1} campos antes de enviar`);
  await sinViolaciones(page);
});

test("postular: valida al salir del campo solo tras la primera edición", async ({ page }) => {
  await abrir(page, "postular/");
  const nombre = page.locator("#nombre");
  await nombre.focus();
  await page.locator("#correo").focus();
  await expect(nombre).not.toHaveAttribute("aria-invalid", "true");
  await nombre.fill("C");
  await page.locator("#correo").focus();
  await expect(page.locator("#error-nombre")).toContainText(NOMBRE.errores.vacio);
  await nombre.fill("Camila");
  await expect(page.locator("#error-nombre")).toBeEmpty();
  // Correo mal escrito: sugerencia que no bloquea.
  await page.locator("#correo").fill("camila@gmial.com");
  await nombre.focus();
  await expect(page.getByText(CORREO.sugerencia("camila@gmail.com"))).toBeVisible();
  await page.getByRole("button", { name: CORREO.usarSugerencia("camila@gmail.com") }).click();
  await expect(page.locator("#correo")).toHaveValue("camila@gmail.com");
});

test("postular: ?area= y ?apoyo= preseleccionan sin mover el foco; un valor desconocido no marca nada", async ({ page }) => {
  await abrir(page, "postular/?area=habitos&apoyo=cercano");
  await expect(page.locator("#area-organizacion")).toBeChecked();
  await expect(page.locator("#apoyo-cercano")).toBeChecked();
  await expect(page.getByText(POSTULAR.apoyo.elegisteDesdePlanes("Acompañamiento cercano"))).toBeVisible();
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);

  await abrir(page, "postular/?area=otra-cosa&apoyo=gratis");
  await expect(page.locator('input[name="area"]:checked')).toHaveCount(0);
  await expect(page.locator('input[name="apoyo"]:checked')).toHaveCount(0);

  await abrir(page, "postular/?area=alimentacion");
  await expect(page.locator("main h1")).toHaveText(POSTULAR.interes.titulo("Alimentación"));
  await expect(page).toHaveTitle("Deja tu interés · Rumbo");
});

test("postular: elegir un área «Más adelante» cambia a modo interés y el foco se queda en la opción", async ({ page }) => {
  await abrir(page, "postular/");
  await page.getByText(POSTULAR.area.otraArea).click();
  await page.locator("#area-movimiento").check();
  await expect(page.locator("main h1")).toHaveText(POSTULAR.interes.titulo("Movimiento"));
  await expect(page.locator("#area-movimiento")).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: POSTULAR.area.cambioAInteres("Movimiento") })).toBeVisible();
  await expect(page.locator("#meta")).toHaveCount(0);
  await sinViolaciones(page);
  // Volver al modo solicitud: sin parámetro y con el foco en el H1.
  await page.getByRole("link", { name: POSTULAR.interes.volver }).click();
  await expect(page.locator("main h1")).toHaveText("Cuéntanos tu meta.");
  await expect(page.locator("main h1")).toBeFocused();
});

test("postular: el borrador vuelve en la pestaña y la autorización nunca vuelve marcada", async ({ page }) => {
  await abrir(page, "postular/");
  await page.locator("#meta").fill("Quiero ordenar mis semanas para avanzar con mi proyecto.");
  await page.locator("#autorizacion").check();
  await page.waitForTimeout(800);
  await page.reload();
  await hidratar(page);
  await expect(page.locator("#meta")).toHaveValue("Quiero ordenar mis semanas para avanzar con mi proyecto.");
  await expect(page.locator("#autorizacion")).not.toBeChecked();
  await expect(page.getByText(POSTULAR.borrador.recuperado)).toBeVisible();
  await page.getByRole("button", { name: POSTULAR.borrador.empezarDeCero }).click();
  await expect(page.locator("#meta")).toHaveValue("");
});

test("postular: un envío válido se simula y muestra la confirmación con foco en el H1", async ({ page }) => {
  await abrir(page, "postular/");
  await page.locator("#area-estudio").check();
  await page.locator("#meta").fill("Tengo exámenes en diciembre y siempre termino estudiando el último día.");
  await page.locator("#apoyo-nose").check();
  await page.locator("#nombre").fill("Camila");
  await page.locator("#correo").fill("camila@ejemplo.cl");
  await page.locator("#mayor-edad").check();
  await page.locator("#autorizacion").check();
  await page.getByRole("button", { name: POSTULAR.envio.boton }).click();
  await expect(page.getByRole("button", { name: "Enviando tu solicitud…" })).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator("main h1")).toHaveText("Recibimos tu solicitud, Camila.");
  await expect(page.locator("main h1")).toBeFocused();
  await expect(page).toHaveTitle("Solicitud enviada · Rumbo");
  await sinViolaciones(page);
  // Recargar no reenvía: «Ya enviaste esta solicitud.»
  await page.reload();
  await hidratar(page);
  await expect(page.locator("main h1")).toHaveText("Ya enviaste esta solicitud.");
});

test("postular: el error de red conserva lo escrito y el reintento termina enviando", async ({ page }) => {
  await abrir(page, "postular/error-red/");
  await expect(page.getByRole("alert")).toContainText("No pudimos enviar tu solicitud.");
  await page.getByRole("button", { name: "Intentar de nuevo" }).click();
  await expect(page.getByRole("alert")).toContainText("Si sigue fallando");
  await expect(page.locator("#nombre")).toHaveValue(POSTULANTE.nombre);
  await page.getByRole("button", { name: "Intentar de nuevo" }).click();
  await expect(page.locator("main h1")).toHaveText(`Recibimos tu solicitud, ${POSTULANTE.nombre}.`);
});

test("estado: retirar pide confirmación en un diálogo que Escape cierra", async ({ page }) => {
  await abrir(page, "estado/recibida/");
  const retirar = page.getByRole("button", { name: RETIRAR.boton, exact: true });
  await retirar.click();
  const dialogo = page.getByRole("dialog", { name: RETIRAR.titulo });
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByRole("button", { name: RETIRAR.mantener })).toBeFocused();
  await sinViolaciones(page);
  await page.keyboard.press("Escape");
  await expect(dialogo).toBeHidden();
  await expect(retirar).toBeFocused();
  await retirar.click();
  await dialogo.getByRole("button", { name: RETIRAR.confirmar }).click();
  await expect(page.locator("main h1")).toHaveText("Retiraste tu solicitud.");
  await expect(page.locator("main h1")).toBeFocused();
});

test("estado: aceptar el acuerdo pide marcar la casilla", async ({ page }) => {
  await abrir(page, "estado/acordada/");
  await page.getByRole("button", { name: ACEPTAR_ACUERDO.boton }).click();
  await expect(page.locator("#error-acepto")).toContainText(ACEPTAR_ACUERDO.error);
  await expect(page.locator("#acepto")).toBeFocused();
  await page.locator("#acepto").check();
  await page.getByRole("button", { name: ACEPTAR_ACUERDO.boton }).click();
  await expect(page.locator("main h1")).toHaveText("Aceptaste tu acuerdo.");
});

test("contacto: ?motivo=datos preselecciona y muestra su ayuda; enviar lleva a la confirmación", async ({ page }) => {
  await abrir(page, "contacto/?motivo=datos");
  await expect(page.locator("#motivo-datos")).toBeChecked();
  await expect(page.getByText(CONTACTO.motivo.ayudaDatos)).toBeVisible();
  await page.locator("#correo").fill("camila@ejemplo.cl");
  await page.locator("#mensaje").fill("Quiero ver los datos que tienen de mí.");
  await page.getByRole("button", { name: CONTACTO.boton }).click();
  await expect(page.locator("main h1")).toHaveText(CONTACTO.confirmacion.titulo);
  await expect(page.getByText(CONTACTO.confirmacion.datos)).toBeVisible();
  await expect(page.locator("main h1")).toBeFocused();
});
