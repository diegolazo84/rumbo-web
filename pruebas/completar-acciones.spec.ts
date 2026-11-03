// Paquete 2: completar una acción. Mensaje según el contexto del día, anillo en el check, pulso en
// el anillo del día completo, sonido opcional (apagado por defecto) y movimiento reducido.
// Corre sobre la vista previa; las reglas de créditos y niveles no cambian.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import type { DiaProgreso } from "../src/data/ejemplo-app";
import { logroDeRegistro } from "../src/lib/celebrar";

const ETIQUETAS_AXE = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function abrir(page: Page, r: string) {
  await page.goto(`vista-previa/${r}`);
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
}

// Cuenta las notas que se tocan (Web Audio simulado: en CI no hay parlantes).
const contarNotas = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as { __notas: number; AudioContext: unknown };
    w.__notas = 0;
    class Falso {
      state = "running";
      currentTime = 0;
      destination = {};
      resume() {
        return Promise.resolve();
      }
      createGain() {
        return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (x: unknown) => x };
      }
      createOscillator() {
        return { type: "", frequency: { value: 0 }, connect: (x: unknown) => x, start: () => (w.__notas += 1), stop() {} };
      }
    }
    w.AudioContext = Falso;
  });
const notas = (page: Page) => page.evaluate(() => (window as unknown as { __notas: number }).__notas);

test.beforeEach(({}, info) => {
  test.skip(info.project.name === "iphone", "basta con Chromium en móvil y escritorio");
});

const dia = (d: Partial<DiaProgreso>): DiaProgreso => ({
  fecha: "2026-10-13",
  programadas: 3,
  hechas: 1,
  enRevision: 0,
  dejadas: 0,
  estado: "en_curso",
  bono: 0,
  creditos: 1,
  racha: 0,
  ...d,
});
const base = { titulo: "Escribir", corta: false, desdeAnteriores: false, conCreditos: true };

test("mensajes según el contexto e intensidad, sin cambiar créditos ni hablar del ranking", ({}, info) => {
  test.skip(info.project.name !== "escritorio", "regla pura: una vez basta");
  expect(logroDeRegistro({ ...base, dia: dia({}) })).toMatchObject({ tipo: "primera", intensidad: "suave", texto: "Primer paso del día: “Escribir”.", creditos: "+1 crédito" });
  expect(logroDeRegistro({ ...base, dia: dia({}) }).titulo).toBeUndefined();
  expect(logroDeRegistro({ ...base, dia: dia({ hechas: 2 }) }).tipo).toBe("ultima");
  expect(logroDeRegistro({ ...base, dia: dia({ hechas: 3, estado: "completo", bono: 2, racha: 1 }) })).toMatchObject({
    intensidad: "dia",
    titulo: "¡Lo lograste!",
    texto: "Completaste tu día.",
    creditos: "+3 créditos",
  });
  expect(logroDeRegistro({ ...base, dia: dia({ hechas: 3, estado: "completo", bono: 3, racha: 3 }) })).toMatchObject({
    intensidad: "racha",
    titulo: "¡Lo lograste!",
    texto: "Completaste tu día. Tres días seguidos avanzando a tu ritmo.",
    creditos: "+4 créditos",
  });
  expect(logroDeRegistro({ ...base, dia: dia({ hechas: 3, estado: "completo", bono: 5, racha: 12 }) }).texto).toBe(
    "Completaste tu día. 12 días seguidos avanzando a tu ritmo.",
  );
  // Hito: una semana completa seguida.
  expect(logroDeRegistro({ ...base, dia: dia({ hechas: 3, estado: "completo", bono: 5, racha: 7 }) })).toMatchObject({
    tipo: "hito",
    intensidad: "hito",
    titulo: "¡Una semana seguida!",
    texto: "Completaste tu día. Siete días seguidos avanzando a tu ritmo.",
  });
  expect(logroDeRegistro({ ...base, corta: true, dia: dia({ hechas: 2, programadas: 4 }) }).tipo).toBe("corta");
  expect(logroDeRegistro({ ...base, desdeAnteriores: true, diaAnterior: "lunes 12", dia: dia({ fecha: "2026-10-12" }) }).texto).toBe(
    "Registrada en el lunes 12. Tu avance se actualizó.",
  );
  // Sin créditos visibles (Preferencias): no se nombran.
  expect(logroDeRegistro({ ...base, conCreditos: false, dia: dia({ hechas: 3, estado: "completo", bono: 2 }) }).creditos).toBeUndefined();
  // Una dejada no cuenta como pendiente: completar la otra es la última.
  expect(logroDeRegistro({ ...base, dia: dia({ hechas: 1, dejadas: 1 }) }).tipo).toBe("ultima");
  for (const t of ["ranking", "puesto", "lugar"])
    expect(logroDeRegistro({ ...base, dia: dia({ hechas: 3, estado: "completo", bono: 5, racha: 7 }) }).mensaje.toLowerCase()).not.toContain(t);
});

test("Mi Rumbo: marcar confirma con el contexto del día y completar el día se celebra", async ({ page }) => {
  await contarNotas(page);
  await abrir(page, "mi-espacio/");
  const pendientes = page.getByRole("checkbox", { name: /^Marcar “.+” como hecha$/, checked: false });
  const tostada = page.locator(".tostada");
  await pendientes.first().check();
  // El anillo sale al instante (dura menos de un segundo); la confirmación llega con el servidor.
  await expect(page.locator(".accion--recien")).toHaveCount(1);
  await expect(tostada).toHaveClass(/tostada--logro/);
  await expect(tostada).toContainText("Te queda una para completar el día.");
  await expect(tostada).toHaveClass(/tostada--suave/);
  await expect(tostada.locator(".tostada__titulo")).toHaveCount(0);
  await expect(tostada.getByRole("button", { name: "Deshacer" })).toBeVisible();
  // Sonido apagado por defecto: no suena nada.
  expect(await notas(page)).toBe(0);

  await pendientes.first().check();
  // El anillo del día hace un pulso una vez, apenas se completa.
  await expect(page.locator(".me-hoy__anillo.es-recien")).toHaveCount(1);
  // Camila llega a 3 días completos seguidos: primero el reconocimiento, después los créditos.
  await expect(tostada).toHaveClass(/tostada--racha/);
  await expect(tostada.locator(".tostada__titulo")).toHaveText("¡Lo lograste!");
  await expect(tostada.locator(".tostada__mensaje")).toHaveText("Completaste tu día. Tres días seguidos avanzando a tu ritmo.");
  await expect(tostada.locator(".tostada__detalle")).toHaveText("+4 créditos");
  await expect(page.locator(".me-hoy__anillo.es-recien")).toHaveCount(0, { timeout: 3000 });
  await expect(page.locator(".accion--recien")).toHaveCount(0);
  // La celebración de nivel (reglas sin cambios) sigue apareciendo encima: se cierra para revisar.
  await page.locator(".hoja--celebracion").getByRole("button").first().click();
  const r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);
});

test("la confirmación se cierra sola; con el puntero encima espera y «Deshacer» sigue disponible", async ({ page }) => {
  await page.clock.install();
  await abrir(page, "mi-espacio/");
  await page.getByRole("checkbox", { name: /^Marcar “.+” como hecha$/, checked: false }).first().check();
  const tostada = page.locator(".tostada");
  await page.clock.runFor(1000);
  await expect(tostada).toHaveClass(/tostada--suave/);
  // Con el puntero encima no se cierra.
  await tostada.hover();
  await page.clock.runFor(8000);
  await expect(tostada).toBeVisible();
  await expect(tostada.getByRole("button", { name: "Deshacer" })).toBeVisible();
  // Al salir, se cierra a los pocos segundos.
  await page.mouse.move(0, 0);
  await page.clock.runFor(4500);
  await expect(tostada).toHaveCount(0);
});

test("en móvil la confirmación es baja: no más de 72 px de alto", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo móvil");
  await abrir(page, "mi-espacio/");
  await page.getByRole("checkbox", { name: /^Marcar “.+” como hecha$/, checked: false }).first().check();
  const caja = (await page.locator(".tostada--logro").boundingBox())!;
  expect(caja.height).toBeLessThanOrEqual(72);
});

test("sonido opcional: se enciende en Preferencias, queda en el dispositivo y suena al marcar", async ({ page }) => {
  await contarNotas(page);
  await abrir(page, "mi-espacio/preferencias/");
  const sonido = page.getByRole("switch", { name: "Sonido al completar una acción" });
  await expect(sonido).not.toBeChecked();
  await sonido.check();
  // Al encenderlo se escucha una muestra (dos notas).
  await expect.poll(() => notas(page)).toBe(2);
  expect(await page.evaluate(() => localStorage.getItem("rumbo-sonido"))).toBe("1");

  await abrir(page, "mi-espacio/");
  await page.getByRole("checkbox", { name: /^Marcar “.+” como hecha$/, checked: false }).first().check();
  await expect.poll(() => notas(page)).toBe(2);
  // Desmarcar no suena.
  await page.getByRole("checkbox", { name: /^Marcar “.+” como hecha$/, checked: true }).first().uncheck();
  await page.waitForTimeout(300);
  expect(await notas(page)).toBe(2);

  await abrir(page, "mi-espacio/preferencias/");
  await expect(sonido).toBeChecked();
  await sonido.uncheck();
  expect(await page.evaluate(() => localStorage.getItem("rumbo-sonido"))).toBeNull();
});

test("movimiento reducido: sin animaciones al completar", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await abrir(page, "mi-espacio/");
  await page.getByRole("checkbox", { name: /^Marcar “.+” como hecha$/, checked: false }).first().check();
  await expect(page.locator(".tostada--logro")).toBeVisible();
  const anim = await page.evaluate(() => {
    const t = document.querySelector(".tostada--logro")!;
    const anillo = document.querySelector(".accion--recien .accion__control");
    return [getComputedStyle(t).animationName, anillo ? getComputedStyle(anillo, "::after").animationName : "none"];
  });
  expect(anim).toEqual(["none", "none"]);
});
