// Rumbo 2.1, etapa 2A: Mi Rumbo. Acciones primero, agrupadas por momento del día, con la meta a
// la que aportan; foco en franja; «Tu acompañamiento» con «Me está costando»; días anteriores
// plegados; y el mismo anillo del día en la ficha del panel. Corre sobre la vista previa.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { TEXTOS_AYUDA } from "../src/components/app/AyudaInmediata";
import { readFileSync } from "node:fs";
import { niveles, reglasCreditos } from "../src/data/rumbo";
import { colorDeMeta, estadoBienvenida, fraseDelDia, incluyeCoach, metaPrincipal, momentoDe } from "../src/lib/mi-rumbo";
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

// ---------------------------------------------------------------------------
// Referencia visual aprobada (21-oct-2026): bienvenida, meta principal, acceso al acompañamiento,
// primera acción visible y celebración solo al subir de nivel.

test("reglas compartidas: meta principal y acompañamiento según el plan", () => {
  const metas = [{ id: "a" }, { id: "b" }];
  expect(metaPrincipal(metas)?.id).toBe("a");
  expect(metaPrincipal(metas, "b")?.id).toBe("b"); // cuando el coach la elija desde el panel
  expect(metaPrincipal(metas, "x")?.id).toBe("a");
  expect(metaPrincipal([])).toBeNull();
  expect(incluyeCoach("coach")).toBe(true);
  expect(incluyeCoach("cercano")).toBe(true);
  expect(incluyeCoach("inicial")).toBe(false);
});

test("Mi Rumbo: bienvenida cálida con la meta real y el H1 de la sección", async ({ page }) => {
  await abrir(page, "mi-espacio/");
  await expect(page.locator("h1")).toHaveText("Mi Rumbo");
  const bienvenida = page.locator(".me-bienvenida");
  await expect(bienvenida).toContainText("¡Hola, Camila!");
  await expect(bienvenida).toContainText("Martes 13 · Semana 2 de 4");
  // La frase nombra una meta real de la persona (no una frase genérica).
  await expect(bienvenida.locator(".me-bienvenida__frase")).toContainText("«Lanzar mi taller en línea»");
  await expect(bienvenida.locator("svg.ilustracion")).toHaveAttribute("aria-hidden", "true");
});

test("Mi Rumbo: la meta principal es la primera meta, con sus hitos y enlace a Mis metas", async ({ page }) => {
  await abrir(page, "mi-espacio/");
  const meta = page.locator(".me-meta-principal");
  await expect(meta).toContainText(T_HOY.metaPrincipal.rotulo);
  await expect(meta).toContainText("Lanzar mi taller en línea");
  await expect(meta).toContainText(T_HOY.metaPrincipal.hitos(1, 2));
  await expect(meta).toHaveAttribute("href", /\/mi-espacio\/plan\/metas\/?$/);
});

test("Mi Rumbo: el foco de tu coach lleva a Mi acompañamiento (sin nombre ni foto inventados)", async ({ page, isMobile }) => {
  await abrir(page, "mi-espacio/");
  if (isMobile) {
    const franja = page.locator("a.me-foco--franja");
    await expect(franja).toBeVisible();
    await expect(franja).toHaveAttribute("href", /\/mi-espacio\/acompanamiento\//);
  } else {
    await expect(page.locator(".me-acomp-hoy .me-foco--tarjeta")).toBeVisible();
  }
  await expect(page.locator(".me-acomp-hoy")).toContainText(T_HOY.acompanamiento.quien);
  await expect(page.locator(".me-hoy img")).toHaveCount(0);
});

test("Mi Rumbo en el teléfono: la primera acción se ve sin desplazar y la barra no la tapa", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo móvil");
  // Tamaños habituales: la primera acción entera. Teléfono bajo (375 × 667): al menos su título.
  for (const [w, h, entera] of [[390, 844, true], [412, 915, true], [360, 780, true], [375, 667, false]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await abrir(page, "mi-espacio/");
    // En Mi espacio real no está la banda de la vista previa: se descuenta.
    const banda = (await page.locator(".previa-aviso").boundingBox())?.height ?? 0;
    const fila = (await page.locator(".me-hoy__cuerpo .accion--hoy").first().boundingBox())!;
    const barra = (await page.locator(".barra-inferior").boundingBox())!;
    expect(fila.y + (entera ? fila.height : 44) - banda, `${w}×${h}`).toBeLessThanOrEqual(barra.y);
  }
});

test("subir de nivel abre la celebración una vez; marcar una acción no", async ({ page }) => {
  await abrir(page, "mi-espacio/");
  const celebracion = page.locator(".hoja--celebracion");
  const pendientes = page.getByRole("checkbox", { name: /^Marcar “.+” como hecha$/, checked: false });
  await pendientes.first().check();
  await expect(celebracion).not.toBeVisible();
  // Camila tiene 22 créditos: con el día completo pasa los 25 de Ritmo (reglas sin cambios).
  await pendientes.first().check();
  await expect(celebracion).toBeVisible();
  await expect(celebracion).toContainText(T_HOY.celebracion.titulo("Ritmo"));
  await expect(celebracion).toContainText(T_HOY.celebracion.texto(3, 10));
  await sinViolaciones(page);
  await celebracion.getByRole("button", { name: T_HOY.celebracion.seguir }).click();
  await expect(celebracion).not.toBeVisible();
});

test("barra inferior: no tapa ningún botón, enlace ni texto de Mi Rumbo al desplazar", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo móvil");
  for (const [w, h] of [[320, 568], [375, 667], [390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await abrir(page, "mi-espacio/");
    const tapados = await page.evaluate(async () => {
      const barra = document.querySelector(".barra-inferior")!.getBoundingClientRect();
      const fuera: string[] = [];
      const piezas = document.querySelectorAll<HTMLElement>(
        ".me-hoy :is(a, button, input, [role='img'], p, h2, h3, .accion-titulo):not([hidden] *, .sr-only)",
      );
      for (const el of piezas) {
        if (!el.offsetParent && getComputedStyle(el).position !== "fixed") continue;
        el.scrollIntoView({ block: "end", behavior: "instant" });
        await new Promise((r) => requestAnimationFrame(r));
        const caja = el.getBoundingClientRect();
        if (!caja.height) continue;
        // Desplazado hasta el final de la pantalla, el elemento queda entero sobre la barra.
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

test("bienvenida: el estado del día sale del progreso real y las frases cambian de un día a otro", () => {
  const d = (fecha: string, programadas: number, hechas: number, estado = hechas >= programadas ? "completo" : "incompleto") => ({ fecha, programadas, hechas, estado });
  const hoy = "2026-10-14";
  expect(estadoBienvenida([d(hoy, 0, 0, "sin_acciones")], hoy)).toBe("sinAcciones");
  expect(estadoBienvenida([d(hoy, 3, 3)], hoy)).toBe("completo");
  expect(estadoBienvenida([d(hoy, 3, 1)], hoy)).toBe("algunas");
  expect(estadoBienvenida([d("2026-10-13", 3, 3), d(hoy, 3, 0)], hoy)).toBe("ninguna");
  expect(estadoBienvenida([d("2026-10-13", 3, 1), d(hoy, 3, 0)], hoy)).toBe("ayerCosto");
  // Dos días con acciones sin marcar (el día sin acciones del medio no cuenta ni corta).
  expect(estadoBienvenida([d("2026-10-11", 2, 0), d("2026-10-12", 0, 0, "sin_acciones"), d("2026-10-13", 3, 0), d(hoy, 3, 0)], hoy)).toBe("sinActividad");
  // Misma fecha, misma frase; fechas seguidas recorren las opciones.
  expect(fraseDelDia(["a", "b", "c"], hoy)).toBe(fraseDelDia(["a", "b", "c"], hoy));
  expect(new Set(["2026-10-14", "2026-10-15", "2026-10-16"].map((f) => fraseDelDia(["a", "b", "c"], f))).size).toBe(3);
  // Ninguna frase culpa ni compara.
  const todas = JSON.stringify(Object.values(T_HOY.bienvenida).flat().map((f) => (typeof f === "function" ? f("X") : f)));
  expect(todas).not.toMatch(/fallaste|no cumpliste|deberías|atrasad|otros participantes/i);
});

test("niveles y créditos de la celebración: los mismos de las reglas de Supabase (semillas)", () => {
  const sql = readFileSync("supabase/migrations/20261008000007_semillas.sql", "utf8");
  const filas = [...sql.matchAll(/\((\d+), (\d+), '([^']+)'\)/g)].map((m) => ({ nivel: +m[1], minimo: +m[2], nombre: m[3] }));
  expect(filas).toEqual(niveles);
  const r = sql.match(/values \(true, (\d+), (\d+), (\d+), (\d+), (\d+), (\d+)\)/)!.slice(1).map(Number);
  expect(r).toEqual([reglasCreditos.porAccion, reglasCreditos.bonoDiaCompleto, reglasCreditos.diasRachaMedia, reglasCreditos.bonoRacha3, reglasCreditos.diasRachaLarga, reglasCreditos.bonoRacha7]);
});

test("la celebración de un nivel se muestra una sola vez (desmarcar y volver a marcar no la repite)", async ({ page }) => {
  await abrir(page, "mi-espacio/");
  const celebracion = page.locator(".hoja--celebracion");
  const casillas = page.getByRole("checkbox", { name: /^Marcar “.+” como hecha$/ });
  await casillas.nth(1).check();
  await casillas.nth(2).check();
  await expect(celebracion).toBeVisible();
  await celebracion.getByRole("button", { name: T_HOY.celebracion.seguir }).click();
  await casillas.nth(2).uncheck();
  await casillas.nth(2).check();
  await page.waitForTimeout(400);
  await expect(celebracion).not.toBeVisible();
  // Tampoco al volver a abrir la pantalla.
  await page.reload();
  await page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
  await expect(celebracion).not.toBeVisible();
});

test("el foco con «Nuevo» lleva a la revisión publicada en Mi acompañamiento", async ({ page, isMobile }) => {
  test.skip(!isMobile, "la franja es de móvil; en escritorio el foco va en la tarjeta");
  await abrir(page, "mi-espacio/");
  const franja = page.locator("a.me-foco--franja");
  await expect(franja.locator(".me-nuevo")).toHaveText(T_HOY.foco.nuevo);
  await franja.click();
  await expect(page).toHaveURL(/\/mi-espacio\/acompanamiento\//);
  await expect(page.locator("h1")).toHaveText("Mi acompañamiento");
});
