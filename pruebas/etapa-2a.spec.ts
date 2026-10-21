// Rumbo 2.1, etapa 2A: Mi Rumbo. Acciones primero, agrupadas por momento del día, con la meta a
// la que aportan; foco en franja; «Tu acompañamiento» con «Me está costando»; días anteriores
// plegados; y el mismo anillo del día en la ficha del panel. Corre sobre la vista previa.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { TEXTOS_AYUDA } from "../src/components/app/AyudaInmediata";
import { colorDeMeta, momentoDe } from "../src/lib/mi-rumbo";
import { T_COSTANDO, T_HOY } from "../src/pages/vista-previa/mi-espacio/textos";

const ETIQUETAS_AXE = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function abrir(page: Page, r: string) {
  await page.goto(`vista-previa/${r}`);
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
}

async function sinViolaciones(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}

test.beforeEach(({}, info) => {
  test.skip(info.project.name === "iphone", "basta con Chromium en móvil y escritorio");
});

test("reglas compartidas: momentos del día y color por meta", () => {
  expect(momentoDe("08:30")).toBe("manana");
  expect(momentoDe("11:59:00")).toBe("manana");
  expect(momentoDe("12:00")).toBe("tarde");
  expect(momentoDe("18:59")).toBe("tarde");
  expect(momentoDe("19:00")).toBe("noche");
  expect(momentoDe(null)).toBe("flexible");
  expect(colorDeMeta(["a", "b", "c"], "c")).toBe(2);
  expect(colorDeMeta(["a"], "x")).toBe(0);
  expect(colorDeMeta(Array.from({ length: 9 }, (_, i) => `m${i}`), "m8")).toBe(0);
});

test("Mi Rumbo: acciones por momento del día, cada una con su meta", async ({ page }) => {
  await abrir(page, "mi-espacio/");
  const titulos = await page.locator(".me-hoy__cuerpo .me-grupo__titulo").allTextContents();
  expect(titulos.map((t) => t.trim())).toEqual([T_HOY.grupos.manana, T_HOY.grupos.noche, T_HOY.grupos.flexibles]);
  const filas = page.locator(".me-hoy__cuerpo .accion--hoy");
  await expect(filas).toHaveCount(3);
  for (const fila of await filas.all()) {
    await expect(fila.locator(".accion-meta")).not.toBeEmpty();
    await expect(fila).toHaveAttribute("data-meta-color", /^[0-7]$/);
  }
  // Las acciones empiezan en la primera pantalla del teléfono.
  const caja = await filas.first().boundingBox();
  expect(caja!.y).toBeLessThan(page.viewportSize()!.height);
  await sinViolaciones(page);
});

test("Mi Rumbo: el foco va en franja y dice «Nuevo» si la revisión no se ha visto", async ({ page }) => {
  await abrir(page, "mi-espacio/");
  const foco = page.locator(".me-foco--franja");
  await expect(foco).toContainText(T_HOY.foco.rotulo);
  await expect(foco).toContainText(T_HOY.foco.nuevo);
  // Las novedades siguen con su enlace, ahora dentro de «Tu acompañamiento».
  await expect(page.locator(".me-acomp-hoy .me-novedades--compactas").getByRole("link")).toHaveCount(2);
});

test("«Me está costando»: tres caminos que ya existen y sin promesa de respuesta inmediata", async ({ page }) => {
  await abrir(page, "mi-espacio/");
  await page.getByRole("button", { name: T_HOY.acompanamiento.costando }).first().click();
  const hoja = page.getByRole("dialog", { name: T_COSTANDO.titulo });
  await expect(hoja).toBeVisible();
  await expect(hoja.getByRole("link", { name: new RegExp(T_COSTANDO.ajuste.titulo) })).toHaveAttribute("href", /\/mi-espacio\/plan\/ajuste\/?$/);
  await expect(hoja.getByRole("link", { name: new RegExp(T_COSTANDO.contar.titulo) })).toHaveAttribute("href", /#registro-costo$/);
  await expect(hoja).toContainText("no tiene respuesta inmediata");
  await expect(hoja).toContainText("jueves 15");
  await sinViolaciones(page);
  // «Necesito ayuda ahora» abre Ayuda inmediata.
  await hoja.getByRole("button", { name: new RegExp(T_COSTANDO.ayuda.titulo) }).click();
  await expect(page.getByRole("dialog", { name: TEXTOS_AYUDA.titulo })).toBeVisible();
  await expect(hoja).toBeHidden();
});

test("«Me está costando» desde una acción: el ajuste llega con esa acción elegida", async ({ page }) => {
  await abrir(page, "mi-espacio/");
  await page.locator(".me-hoy__cuerpo .accion--hoy .accion__abrir").nth(1).click();
  await expect(page.locator(".hoja--detalle")).toBeVisible();
  await page.locator(".hoja--detalle").getByRole("button", { name: T_HOY.acompanamiento.costando }).click();
  const hoja = page.getByRole("dialog", { name: T_COSTANDO.titulo });
  await expect(hoja).toContainText("Sobre «");
  await expect(hoja.getByRole("link", { name: new RegExp(T_COSTANDO.ajuste.titulo) })).toHaveAttribute("href", /\?accion=/);
});

test("De días anteriores parte plegado en Mi Rumbo y se despliega", async ({ page }) => {
  await abrir(page, "mi-espacio/");
  const boton = page.locator(".me-anteriores").getByRole("button", { name: "Ver las acciones" });
  await expect(boton).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: "Ya la hice" })).toHaveCount(0);
  await boton.click();
  await expect(page.getByRole("button", { name: "Ya la hice" }).first()).toBeVisible();
  // Su propia pantalla de la vista previa lo muestra abierto.
  await abrir(page, "mi-espacio/dias-anteriores/");
  await expect(page.getByRole("button", { name: "Ya la hice" }).first()).toBeVisible();
});

test("panel: la semana de la ficha muestra el día de hoy con el mismo anillo", async ({ page }) => {
  await abrir(page, "equipo/participante/?pestana=semana");
  await expect(page.getByRole("img", { name: /^Hoy: \d+ de \d+ acciones? hechas?\.$/ })).toBeVisible();
});
