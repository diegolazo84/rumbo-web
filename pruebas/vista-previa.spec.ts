// Vista previa de la plataforma (etapa 0 «Piel», plataforma 2.1, 8 y 10): cada pantalla del
// registro se publica prerenderizada, con noindex y nofollow, sin canonical ni analítica,
// fuera del sitemap y sin enlaces desde la web pública. Hidrata sin errores, pasa axe
// (WCAG 2.2 AA), no se desborda a 320 px y sus objetivos táctiles miden 44 px o más.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { paginas } from "../src/data/paginas";
import { INDICE, pantallas, type PantallaPrevia } from "../src/pages/vista-previa/registro";
import { atributosVisibles, buscarFrases, buscarMarcadores, textoVisible } from "../scripts/marcadores.mjs";
import { POSTULAR, validarPostular } from "../src/data/formularios";
import { TEXTOS_CARGA } from "../src/components/app/Bloques";

const ETIQUETAS_AXE = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const relativa = (ruta: string) => ruta.replace(/^\//, "") || "./";
const todas: (Pick<PantallaPrevia, "ruta" | "titulo" | "nombre"> & { sinDatos?: boolean })[] = [
  { ruta: INDICE.ruta, titulo: INDICE.titulo, nombre: "Índice", sinDatos: true },
  ...pantallas,
];

function vigilarConsola(page: Page) {
  const errores: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errores.push(m.text());
  });
  page.on("pageerror", (e) => errores.push(String(e)));
  return errores;
}

async function vigilarCsp(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __csp: string[] };
    w.__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => w.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  return () => page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
}

const esperarHidratacion = (page: Page) =>
  page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));

// Objetivos táctiles visibles de menos de 44 px (los enlaces dentro de un texto corrido se exceptúan).
const objetivosChicos = (page: Page) =>
  page.evaluate(() => {
    const fuera: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("a, button, summary, label.accion, label.opcion, label.casilla")) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width < 2 || r.height < 2 || cs.visibility === "hidden" || el.closest("[hidden], .sr-only, .saltar, dialog:not([open])"))
        continue;
      if (el.tagName === "A" && cs.display === "inline") {
        let bloque = el.parentElement;
        while (bloque && getComputedStyle(bloque).display === "inline") bloque = bloque.parentElement;
        if (bloque && (bloque.textContent ?? "").trim() !== (el.textContent ?? "").trim()) continue;
      }
      if (r.height < 43.5) fuera.push(`${el.tagName.toLowerCase()} «${(el.textContent ?? "").trim().slice(0, 40)}»: ${r.height.toFixed(1)} px`);
    }
    return fuera;
  });

test.describe("registro de la vista previa", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "escritorio", "datos: basta un proyecto");
  });

  test("rutas únicas bajo /vista-previa/ y títulos de la especificación", () => {
    const rutas = todas.map((p) => p.ruta);
    expect(new Set(rutas).size).toBe(rutas.length);
    for (const p of pantallas) {
      expect(p.ruta, p.nombre).toMatch(/^\/vista-previa\/([a-z0-9-]+\/)+$/);
      expect(p.titulo, p.ruta).toMatch(/ · Rumbo$/);
      if (p.marco === "mi-espacio" || p.marco === "ingreso") expect(p.titulo, p.ruta).toMatch(/^[^·]+ · Mi espacio · Rumbo$/);
      if (p.marco === "panel") expect(p.titulo, p.ruta).toMatch(/^[^·]+ · Panel · Rumbo$/);
    }
  });

  // Única excepción: /mi-espacio/ enlaza a Hoy de ejemplo («Mira cómo será Mi espacio», rotulado como ejemplo).
  test("fuera del sitemap y sin enlaces desde la web pública", async ({ request }) => {
    const sitemap = await (await request.get("sitemap.xml")).text();
    expect(sitemap).not.toContain("vista-previa");
    for (const ruta of [...paginas.map((p) => p.ruta), "/esta-ruta-no-existe/"]) {
      let html = await (await request.get(relativa(ruta))).text();
      if (ruta === "/mi-espacio/") {
        const ejemplo = /href="[^"]*\/vista-previa\/mi-espacio\/"/g;
        expect(html.match(ejemplo), ruta).toHaveLength(1);
        html = html.replace(ejemplo, "");
      }
      expect(html, ruta).not.toContain("vista-previa/");
    }
  });
});

test.describe("HTML prerenderizado de la vista previa", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "escritorio", "HTML: basta un proyecto");
  });

  for (const p of todas) {
    test(`noindex, nofollow, sin analítica ni marcadores: ${p.ruta}`, async ({ request }) => {
      const r = await request.get(relativa(p.ruta), { maxRedirects: 0 });
      expect(r.status()).toBe(200);
      const html = await r.text();
      expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
      expect(html).not.toContain('rel="canonical"');
      expect(html).not.toMatch(/<script[^>]*umami/i);
      expect(html).toContain(`<title>${p.titulo}</title>`);
      expect(html).toContain('<div id="root" data-pagina="vista-previa">');
      expect(html.match(/<h1[\s>]/g)?.length, "un solo h1").toBe(1);
      expect(html).toMatch(/img-src 'self' data: blob:/);
      // Todo es ejemplo y lo dice: la banda de la vista previa y, dentro del contenido, la
      // etiqueta punteada «Ejemplo» en toda pantalla que muestra datos de ejemplo.
      expect(textoVisible(html)).toContain("Ejemplo");
      if (!p.sinDatos) {
        const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
        expect(main, "etiqueta «Ejemplo» dentro del contenido").toContain("etiqueta--ejemplo");
      }
      expect(buscarMarcadores(html)).toEqual([]);
      const legible = [textoVisible(html), ...atributosVisibles(html).map((a) => a.valor)].join(" \n ");
      expect(buscarFrases(legible)).toEqual([]);
    });
  }
});

for (const p of todas) {
  test(`hidrata sin errores, axe y 320 px: ${p.ruta}`, async ({ page, isMobile }) => {
    const errores = vigilarConsola(page);
    const csp = await vigilarCsp(page);
    if (isMobile) await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(relativa(p.ruta));
    await esperarHidratacion(page);
    await expect(page.locator("main h1")).toHaveCount(1);
    // Las porciones perezosas terminan de hidratar: ya no hay estado de carga.
    await expect(page.locator(":is(main, .app__contenido) > .cargando")).toHaveCount(0);
    const { sw, cw } = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }));
    expect(sw, "desborde horizontal").toBe(cw);
    const r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
    expect(r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    if (isMobile) expect(await objetivosChicos(page)).toEqual([]);
    expect(errores).toEqual([]);
    expect(await csp()).toEqual([]);
  });
}

test("navegar desde el índice cambia el título y lleva el foco al h1", async ({ page }) => {
  const errores = vigilarConsola(page);
  await page.goto(relativa(INDICE.ruta));
  await esperarHidratacion(page);
  const destino = pantallas.find((p) => p.marco === "mi-espacio")!;
  await page.getByRole("link", { name: destino.nombre, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${destino.ruta}$`));
  await expect(page).toHaveTitle(destino.titulo);
  await expect(page.locator("main h1")).toBeFocused();
  await page.getByRole("link", { name: "Todas las pantallas" }).click();
  await expect(page).toHaveTitle(INDICE.titulo);
  expect(errores).toEqual([]);
});

// Base compartida: el catálogo ejercita validación, hoja y tostada con los mismos criterios.
test("componentes: validación al enviar, hoja y tostada sin violaciones", async ({ page }) => {
  const errores = vigilarConsola(page);
  await page.goto("vista-previa/componentes/");
  await esperarHidratacion(page);
  // Enviar vacío: resumen con foco y errores en línea ligados a cada campo.
  await page.getByRole("button", { name: "Enviar mensaje" }).first().click();
  const resumen = page.locator("#resumen-errores");
  await expect(resumen).toBeFocused();
  await expect(resumen.getByRole("heading")).toHaveText(/^Revisa \d+ campos? antes de enviar$/);
  await expect(page.locator("#c-correo")).toHaveAttribute("aria-invalid", "true");
  await resumen.getByRole("link").first().click();
  await expect(page.locator('input[name="motivo"]').first()).toBeFocused();
  // El error desaparece apenas se corrige.
  await page.locator("#c-correo").fill("camila@ejemplo.cl");
  await expect(page.locator("#c-correo")).not.toHaveAttribute("aria-invalid", "true");
  let r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  // Marcar una acción muestra la tostada (role=status); la hoja se abre, Escape la cierra y devuelve el foco.
  await page.getByRole("checkbox", { name: /^Marcar “.+” como hecha$/, checked: false }).first().check();
  await expect(page.locator(".tostada")).toBeVisible();
  const abrir = page.getByRole("button", { name: "Abrir una hoja" });
  await abrir.click();
  await expect(page.locator("dialog[open]")).toBeVisible();
  r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(abrir).toBeFocused();
  expect(errores).toEqual([]);
});

// ---------------------------------------------------------------------------
// Pruebas de la revisión (plataforma 8 y 10): estados que solo se ven interactuando.

const ruta = (r: string) => `vista-previa/${r}`;
async function abrir(page: Page, r: string) {
  await page.goto(ruta(r));
  await esperarHidratacion(page);
  await expect(page.locator("main h1")).toHaveCount(1);
}

test.describe("barra inferior", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(!isMobile, "la barra inferior solo existe en el teléfono");
  });

  // Los rótulos («Calendario», «Participantes»…) no se montan entre sí a ningún ancho de teléfono.
  for (const ancho of [320, 360, 390]) {
    test(`los rótulos no se superponen a ${ancho} px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 740 });
      for (const r of ["mi-espacio/", "equipo/"]) {
        await abrir(page, r);
        const problemas = await page.evaluate(() => {
          const fuera: string[] = [];
          const items = [...document.querySelectorAll<HTMLElement>(".barra-inferior .nav-app__item")];
          const textos = items.map((i) => i.querySelector<HTMLElement>(".nav-app__texto")!.getBoundingClientRect());
          items.forEach((item, i) => {
            const caja = item.getBoundingClientRect();
            const t = textos[i];
            if (t.left < caja.left - 0.5 || t.right > caja.right + 0.5) fuera.push(`rótulo ${i + 1} se sale de su ítem`);
            const j = textos[i + 1];
            if (j && t.right > j.left + 0.5 && t.bottom > j.top && j.bottom > t.top) fuera.push(`rótulos ${i + 1} y ${i + 2} se superponen`);
          });
          return fuera;
        });
        expect(problemas, r).toEqual([]);
      }
    });
  }

  // WCAG 2.4.11: la barra no tapa el elemento con foco (scroll-padding-bottom).
  test("no tapa el elemento con foco al recorrer Hoy con el teclado", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    // Sin desplazamiento suave: se mide dónde queda el foco, no la animación.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await abrir(page, "mi-espacio/");
    const tapados: string[] = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const t = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        const barra = document.querySelector<HTMLElement>(".barra-inferior");
        if (!el || !barra || barra.contains(el) || el === document.body || el.closest("dialog, .tostada-zona")) return null;
        const r = el.getBoundingClientRect();
        const tope = barra.getBoundingClientRect().top;
        return r.top >= tope - 0.5 ? `${el.tagName.toLowerCase()} «${(el.textContent ?? "").trim().slice(0, 30)}»` : null;
      });
      if (t) tapados.push(t);
    }
    expect(tapados).toEqual([]);
  });
});

test.describe("Mi espacio: interacción y texto", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "escritorio", "interacción: basta un proyecto");
  });

  // M2 y 4.5: el check cambia al instante; los créditos, cuando responde el «servidor».
  test("marcar una acción en Hoy actualiza los créditos después de la respuesta", async ({ page }) => {
    await abrir(page, "mi-espacio/");
    const creditos = page.locator(".me-hoy .me-resumen__creditos");
    const antes = Number((await creditos.textContent())!.match(/\d+/)![0]);
    const nombre = await page.getByRole("checkbox", { name: /^Marcar “.+” como hecha$/, checked: false }).first().getAttribute("aria-label");
    const casilla = page.getByRole("checkbox", { name: nombre!, exact: true });
    await casilla.check();
    await expect(casilla).toBeChecked({ timeout: 100 });
    await expect(creditos).toHaveText(`${antes + 1} créditos`);
    await expect(page.getByRole("status").filter({ hasText: "+1 crédito" })).toBeVisible();
    await expect(page.locator('.me-hoy [aria-live="polite"]').first()).toContainText(`${antes + 1} créditos.`);
    // Deshacer devuelve los créditos.
    await page.getByRole("button", { name: "Deshacer" }).click();
    await expect(creditos).toHaveText(`${antes} créditos`);
  });

  // 4.1.4: sin conexión, los controles quedan con aria-disabled y la nota de conexión.
  test("sin conexión: banda, controles desactivados y nada se marca", async ({ page }) => {
    await abrir(page, "mi-espacio/hoy/sin-conexion/");
    await expect(page.getByText(TEXTOS_CARGA.sinConexion)).toBeVisible();
    const casilla = page.getByRole("checkbox", { name: /^Marcar “.+” como hecha$/, checked: false }).first();
    await expect(casilla).toHaveAttribute("aria-disabled", "true");
    await expect(casilla).toHaveAccessibleDescription(TEXTOS_CARGA.necesitasConexion);
    const creditos = page.locator(".me-resumen__creditos");
    const antes = await creditos.textContent();
    // aria-disabled (no disabled): sigue en el orden de foco y se puede tocar, pero no marca.
    await casilla.click({ force: true });
    await expect(casilla).not.toBeChecked();
    await page.waitForTimeout(700);
    await expect(creditos).toHaveText(antes!);
  });

  // M6: ocultar los créditos los quita de Hoy, no de Progreso.
  test("créditos ocultos en Hoy, visibles en Progreso", async ({ page }) => {
    await abrir(page, "mi-espacio/hoy/creditos-ocultos/");
    await expect(page.locator(".me-resumen")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText("créditos para llegar a");
    await abrir(page, "mi-espacio/progreso/");
    await expect(page.locator(".me-creditos .me-resumen__creditos")).toHaveText(/^\d+ créditos?$/);
  });

  // M4: cada celda del mes tiene un nombre completo y nunca dice «0 hechas».
  test("las celdas del mes se nombran con fecha y estado", async ({ page }) => {
    await abrir(page, "mi-espacio/calendario/mes/");
    const nombres = await page.locator(".me-mes__celda:not(.me-mes__celda--vacia)").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
    expect(nombres.length).toBe(31);
    for (const n of nombres) {
      expect(n).toMatch(/^[A-ZÁÉÍÓÚ][a-záéíóú]+ \d{1,2} de octubre: .+\.$/);
      expect(n).not.toMatch(/\b0 hechas\b/);
    }
    expect(nombres).toContain("Martes 13 de octubre: 3 acciones, 1 hecha.");
  });

  // M3 y M9: en el DOM vivo de Mi espacio no aparece ninguna palabra prohibida (1.4) ni «IA».
  test("Mi espacio no usa palabras prohibidas ni menciona IA", async ({ page }) => {
    const hallazgos: string[] = [];
    for (const p of pantallas.filter((x) => x.grupo === "mi-espacio")) {
      await page.goto(relativa(p.ruta));
      await esperarHidratacion(page);
      const texto = await page.locator("body").innerText();
      for (const h of buscarFrases(texto)) hallazgos.push(`${p.ruta}: ${h}`);
      for (const h of buscarFrases(texto, ["IA", "inteligencia artificial"])) hallazgos.push(`${p.ruta}: ${h}`);
    }
    expect(hallazgos).toEqual([]);
  });
});

test.describe("formularios públicos", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "escritorio", "interacción: basta un proyecto");
  });

  test("postular: enviar vacío muestra el resumen de errores con foco", async ({ page }) => {
    await abrir(page, "postular/");
    await page.getByRole("button", { name: POSTULAR.envio.boton }).click();
    const resumen = page.locator("#resumen-errores");
    await expect(resumen).toBeFocused();
    const n = Object.values(
      validarPostular({ area: "", meta: "", apoyo: "", nombre: "", correo: "", mayorEdad: false, autorizacion: false }),
    ).filter(Boolean).length;
    await expect(resumen.getByRole("link")).toHaveCount(n);
  });

  // F9: con las postulaciones cerradas, el formulario pide solo lo necesario para avisar.
  test("postular cerradas: su propia autorización y su error", async ({ page }) => {
    await abrir(page, "postular/cerradas/");
    await expect(page.getByText(POSTULAR.cerradas.frase)).toBeVisible();
    await expect(page.locator("#meta")).toHaveCount(0);
    await page.locator('main form button[type="submit"]').click();
    const resumen = page.locator("#resumen-errores");
    await expect(resumen).toBeFocused();
    await expect(resumen).toContainText(POSTULAR.cerradas.autorizacion.error);
  });
});

// F7: con zoom de 200 % en un computador (1280 px → 640 px CSS) nada se desborda.
test.describe("zoom de 200 %", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "escritorio", "zoom de escritorio");
  });
  for (const r of ["postular/", "estado/recibida/", "mi-espacio/", "mi-espacio/calendario/", "mi-espacio/semana/", "equipo/", "equipo/solicitud/"]) {
    test(`sin desborde ni contenido tapado: ${r}`, async ({ page }) => {
      await page.setViewportSize({ width: 640, height: 400 });
      await abrir(page, r);
      const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      expect(sw, "desborde horizontal").toBe(cw);
      await expect(page.locator("main h1")).toBeInViewport();
    });
  }
});

// F8: sin JavaScript, el HTML prerenderizado se lee completo (sin pantallas en blanco).
test.describe("sin JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "escritorio", "basta un proyecto");
  });
  for (const r of ["postular/", "estado/recibida/", "mi-espacio/", "mi-espacio/calendario/", "equipo/"]) {
    test(`se lee el contenido: ${r}`, async ({ page }) => {
      await page.goto(ruta(r));
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator("main .etiqueta--ejemplo").first()).toBeVisible();
      await expect(page.locator(":is(main, .app__contenido) > .cargando")).toHaveCount(0);
      const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      expect(sw).toBe(cw);
    });
  }
});
