// Mi acompañamiento con la referencia de ChatGPT (21-oct-2026, 21:35 UTC): portada, «Tu coach»
// (genérico en la vista previa), el mensaje de la semana (foco real del coach), cuatro acciones,
// «Esta semana», la próxima revisión según el plan, el historial, «Así fue tu semana» y el cierre,
// todo con datos que ya existen. Corre sobre la vista previa; el coach y la videollamada reales,
// en mi-espacio-real.spec.ts.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { revisiones } from "../src/data/ejemplo-app";
import { T_ACOMPANAMIENTO as T, T_COSTANDO, T_SEMANA } from "../src/pages/vista-previa/mi-espacio/textos";

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
// Sin desplazamiento suave: con la máquina cargada, un clic en un botón fuera de pantalla podía caer
// mientras la página todavía se movía (misma causa que la prueba intermitente del formulario).
test.use({ reducedMotion: "reduce" });

test("tu coach sin nombre ni foto, con el foco real de la última revisión como mensaje y sin «Nuevo»", async ({ page }) => {
  await abrir(page, "publicada/");
  await expect(page.locator("h1")).toHaveText("Mi acompañamiento");
  await expect(page.locator(".me-acomp-portada__bajada")).toHaveText(T.portada.bajada);
  const coach = page.locator(".me-coach");
  await expect(coach.getByRole("heading", { name: T.coach.titulo, exact: true })).toBeVisible();
  await expect(coach).toContainText(T.coach.quien);
  await expect(coach.locator("img")).toHaveCount(0);
  await expect(coach.locator(".me-coach__firma")).toHaveCount(0);
  await expect(coach).not.toContainText("Diego");
  await expect(coach.locator(".me-coach__rotulo")).toHaveText(T.mensaje.rotulo);
  const foco = revisiones.find((r) => r.semana === 1)!.foco;
  await expect(coach.locator(".me-coach__cita")).toContainText(foco);
  await expect(coach.locator(".me-coach__fecha")).toHaveText("Jueves 8");
  // Lo visto se guarda solo en cada dispositivo: no es fiable, así que no hay «Nuevo» en esta sección.
  await expect(page.locator(".me-acomp .me-nuevo")).toHaveCount(0);
  await sinViolaciones(page);
});

test("cuatro acciones: registrar, me está costando, la revisión escrita y solicitar un ajuste", async ({ page }) => {
  await abrir(page, "publicada/");
  const acciones = page.locator(".me-acomp-acciones li");
  await expect(acciones).toHaveCount(4);
  await expect(acciones.nth(0)).toContainText(T.acciones.registrar.titulo);
  await expect(acciones.nth(1)).toContainText(T.acciones.costando.titulo);
  // Plan con acompañamiento (por escrito): la tercera es la revisión, nunca agendar una videollamada.
  await expect(acciones.nth(2)).toContainText(T.acciones.revision.titulo);
  await expect(acciones.nth(2).getByRole("link")).toHaveAttribute("href", /#lo-que-vimos$/);
  await expect(page.locator(".me-acomp-acciones")).not.toContainText(/videollamada/i);
  await expect(acciones.nth(3).getByRole("link")).toHaveAttribute("href", /\/mi-espacio\/plan\/ajuste\/$/);
  // Plan cercano sin enlace todavía: la videollamada la agenda el coach.
  await abrir(page, "cercano/");
  await expect(acciones.nth(2)).toContainText(T.acciones.videollamada.titulo);
  await expect(acciones.nth(2)).toContainText(T.acciones.videollamada.sinEnlace);
  await expect(page.getByRole("button", { name: /Agendar|Reprogramar/ })).toHaveCount(0);
  await sinViolaciones(page);
});

test("esta semana: acciones hechas de la semana y un círculo por día", async ({ page }) => {
  await abrir(page, "");
  const semana = page.locator(".me-acomp-semana");
  await expect(semana.getByRole("heading", { name: T.semana.titulo })).toBeVisible();
  await expect(semana.locator(".me-acomp-dia")).toHaveCount(7);
  await expect(semana.locator(".me-acomp-dia[aria-current=date]")).toHaveCount(1);
  await expect(semana.locator(".me-acomp-semana__avance p")).toHaveText(/^\d+ de \d+ acci(ón completada|ones completadas)$/);
});

test("«Me está costando» abre la misma hoja de Mi Rumbo; «Escribir a mi coach» abre el formulario", async ({ page }) => {
  await abrir(page, "");
  await page.locator(".me-acomp-acciones").getByRole("button", { name: new RegExp(T.acciones.costando.titulo) }).click();
  const hoja = page.getByRole("dialog", { name: T_COSTANDO.titulo });
  await expect(hoja).toBeVisible();
  await expect(hoja).toContainText(T_COSTANDO.ajuste.titulo);
  await expect(hoja).toContainText(T_COSTANDO.contar.titulo);
  await expect(hoja).toContainText(T_COSTANDO.ayuda.titulo);
  await page.keyboard.press("Escape");
  await expect(hoja).not.toBeVisible();
  await expect(page.locator("#tu-registro")).toContainText(T_SEMANA.invitacion);
  await expect(page.locator("#registro-funciono")).toHaveCount(0);
  const escribir = page.locator(".me-acomp-portada").getByRole("link", { name: T.portada.escribir });
  await expect(escribir).toHaveAttribute("href", "#tu-registro");
  await escribir.click();
  await expect(page.locator("#registro-funciono")).toBeVisible();
  await expect(page.locator("#tu-registro")).toBeInViewport();
});

test("«Escribir mi registro» dentro de «Lo que compartiste» abre el formulario y lleva el foco", async ({ page }) => {
  await abrir(page, "");
  const seccion = page.locator("#tu-registro");
  await expect(seccion.getByRole("heading", { name: T_SEMANA.compartiste })).toBeVisible();
  await seccion.getByRole("button", { name: T_SEMANA.escribir }).click();
  await expect(page.locator("#tu-registro form")).toBeVisible();
  await expect(page.locator("#tu-registro form :is(input, textarea)").first()).toBeFocused();
  // La aclaración «no es un chat» aparece una sola vez en la pantalla.
  await expect(page.getByText(/no es un chat/i).filter({ visible: true })).toHaveCount(1);
});

test("registro ya enviado: «Lo que compartiste» muestra sus respuestas reales", async ({ page }) => {
  await abrir(page, "enviado/");
  const seccion = page.locator("#tu-registro");
  await expect(seccion).toContainText("La pausa de la tarde");
  await expect(seccion.getByRole("button", { name: T_SEMANA.editar })).toBeVisible();
  await expect(page.locator(".me-acomp-acciones").getByRole("link", { name: new RegExp(T.acciones.registrar.titulo) })).toHaveAttribute("href", "#tu-registro");
});

test("próxima revisión real: fecha, modalidad contratada y explicación según el programa", async ({ page }) => {
  await abrir(page, "");
  const proxima = page.locator(".me-proxima");
  await expect(proxima.locator(".me-proxima__fecha")).toHaveText("Jueves 15 de octubre");
  await expect(proxima.locator(".me-proxima__modalidad")).toHaveText(T.proxima.escrita);
  await expect(proxima).toContainText(T.proxima.explicaEscrita);
  await expect(proxima).toContainText(T.proxima.noEsChat);
  await abrir(page, "cercano/");
  await expect(page.locator(".me-proxima__modalidad")).toHaveText(T.proxima.videollamada("19:00"));
  // Sin enlace todavía: lo agenda el coach (C2), la persona no puede agendar ni reprogramar.
  await expect(page.locator(".me-proxima")).toContainText(T.proxima.sinEnlace);
  await sinViolaciones(page);
});

test("historial: tipo, estado real, fecha y acción para ver el detalle", async ({ page }) => {
  await abrir(page, "publicada/");
  const items = page.locator(".me-acomp-historial__item");
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText(T.historial.ajuste);
  await expect(items.nth(0)).toContainText("Enviada el lunes 12");
  await expect(items.nth(0).getByRole("link")).toHaveText(T.historial.verSolicitud);
  await expect(items.nth(1)).toContainText(T.historial.revision(1));
  await expect(items.nth(1)).toContainText("Publicada el jueves 8");
  await expect(items.nth(2)).toContainText("Respondida el martes 6");
  await expect(items.nth(2).getByRole("link")).toHaveText(T.historial.verRespuesta);
  await items.nth(1).getByRole("link", { name: T.historial.leerRevision }).click();
  await expect(page).toHaveURL(/#lo-que-vimos$/);
  await expect(page.locator("#lo-que-vimos")).toBeInViewport();
});

test("«Así fue tu semana»: «Lo que vimos juntos» con los tres apartados reales", async ({ page }) => {
  await abrir(page, "publicada/");
  await expect(page.getByRole("heading", { level: 2, name: T_SEMANA.asiFue })).toBeVisible();
  await expect(page.locator(".me-semana__subtitulo")).toHaveText("Semana 1 de 4");
  const vimos = page.locator("#lo-que-vimos");
  await expect(vimos.getByRole("heading", { name: T_SEMANA.vimos })).toBeVisible();
  for (const t of [T_SEMANA.loQueFunciono, T_SEMANA.podemosAjustar, T_SEMANA.focoProxima]) await expect(vimos.getByRole("heading", { name: t })).toBeVisible();
  const r = revisiones.find((x) => x.semana === 1)!;
  await expect(vimos).toContainText(r.funciono);
  await expect(vimos).toContainText(r.ajustamos);
  // Revisión corta: se ve completa, sin botón.
  await expect(vimos.getByRole("button", { name: T_SEMANA.leerCompleta })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: T_SEMANA.avances })).toBeVisible();
  await expect(page.locator(".me-marcaste__lista li[data-meta-color]").first()).toBeVisible();
});

test("sin revisión publicada: «Tu revisión aparecerá aquí cuando esté lista.»", async ({ page }) => {
  await abrir(page, "en-revision/");
  await expect(page.locator(".me-semana__sin-revision")).toHaveText(T_SEMANA.sinRevision);
  await expect(page.locator("#lo-que-vimos")).toHaveCount(0);
});

test("semana 1, sin revisiones: foco inicial y fecha de la primera revisión, sin inventar", async ({ page }) => {
  await abrir(page, "semana-1/");
  await expect(page.locator(".me-coach__fecha")).toHaveText(T.mensaje.inicial);
  await expect(page.locator(".me-acomp-historial")).not.toContainText(T.historial.revision(1));
  await expect(page.locator(".me-semana__sin-revision")).toHaveText(T_SEMANA.sinRevision);
});

test("cierre: frase breve, sin tarjetas «Próximamente»", async ({ page }) => {
  await abrir(page, "");
  await expect(page.locator(".me-acomp__cierre")).toHaveText(T.cierre);
  await expect(page.locator(".me-acomp .me-pronto")).toHaveCount(0);
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
