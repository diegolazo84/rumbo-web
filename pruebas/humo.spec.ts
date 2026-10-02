// Prueba de humo antes de publicar: HTML prerenderizado, hidratación sin errores,
// enlaces, reenvíos a la plataforma, 404, imágenes para redes y accesibilidad (axe).
import { readFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { IMAGEN_SOCIAL, paginas } from "../src/data/paginas";
import { PLATAFORMA, TEXTO_PLATAFORMA, ayuda, operacion } from "../src/data/rumbo";

// Destinos externos permitidos (sección 4 de la especificación).
const RUTAS_PLATAFORMA = ["/postular", "/contacto", "/mi-programa", "/comunidad", "/privacidad-piloto"];
const TELEFONOS = ["tel:131", "tel:6003607777", "tel:1412", ...(ayuda.incluir1455 ? ["tel:1455"] : [])];
const AREAS_PERMITIDAS = [
  "emprendimiento",
  "organizacion",
  "bienestar",
  "alimentacion",
  "movimiento",
  ...[operacion.paramEstudio, operacion.paramCambios].filter((v): v is string => !!v),
];

const SITE_URL = (process.env.SITE_URL ?? process.env.URL_PRUEBA ?? "https://diegolazo84.github.io/rumbo-web").replace(
  /\/$/,
  "",
);
const PROD = { tag: "@produccion" };
const relativa = (ruta: string) => ruta.replace(/^\//, "") || "./";

// Junta errores de consola (incluye desajustes de hidratación y bloqueos de la CSP).
function vigilarConsola(page: Page) {
  const errores: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errores.push(m.text());
  });
  page.on("pageerror", (e) => errores.push(String(e)));
  return errores;
}

for (const p of paginas) {
  test.describe(`página ${p.ruta}`, () => {
    test("HTML estático completo para buscadores y vistas previas", PROD, async ({ request }) => {
      const r = await request.get(relativa(p.ruta), { maxRedirects: 0 });
      expect(r.status()).toBe(200);
      const html = await r.text();
      expect(html).toContain("<h1");
      expect(html).toContain(`<title>${p.titulo}</title>`);
      expect(html).toContain(`<link rel="canonical" href="${SITE_URL}${p.ruta}" />`);
      expect(html).toContain(`<meta property="og:url" content="${SITE_URL}${p.ruta}" />`);
      expect(html).toContain(`<meta property="og:image" content="${SITE_URL}/${IMAGEN_SOCIAL.ruta}" />`);
      expect(html).toMatch(/<meta http-equiv="Content-Security-Policy"/);
      expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
      for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
        expect(() => JSON.parse(m[1])).not.toThrow();
      }
    });

    test("se lee sin JavaScript", async ({ browser }) => {
      const ctx = await browser.newContext({ javaScriptEnabled: false });
      const page = await ctx.newPage();
      await page.goto(relativa(p.ruta));
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("footer")).toContainText("Rumbo no es un servicio de salud ni de urgencias.");
      // Nada queda oculto a la espera de JS.
      const ocultos = await page
        .locator("main *")
        .evaluateAll((els) => els.filter((e) => getComputedStyle(e).opacity === "0").length);
      expect(ocultos).toBe(0);
      await ctx.close();
    });

    test("hidrata sin errores de consola ni bloqueos de CSP", PROD, async ({ page }) => {
      const errores = vigilarConsola(page);
      await page.goto(relativa(p.ruta));
      await page.waitForLoadState("networkidle");
      expect(await page.title()).toBe(p.titulo);
      expect(errores).toEqual([]);
    });

    test("enlaces internos responden 200 sin redirección y externos van a destinos permitidos", async ({
      page,
      request,
    }) => {
      await page.goto(relativa(p.ruta));
      const enlaces = await page.locator("a[href]").evaluateAll((as) =>
        as.map((a) => ({
          href: (a as HTMLAnchorElement).href,
          evento: a.getAttribute("data-umami-event"),
          ubicacion: a.getAttribute("data-umami-event-ubicacion"),
          texto: a.textContent ?? "",
        })),
      );
      const origen = new URL(page.url()).origin;
      const ubicaciones: string[] = [];
      for (const e of enlaces) {
        const url = new URL(e.href);
        if (url.protocol === "tel:") {
          expect(TELEFONOS, `teléfono inesperado: ${e.href}`).toContain(e.href);
        } else if (url.protocol === "mailto:") {
          expect(e.href, "correo inesperado").toBe(`mailto:${operacion.correo}`);
        } else if (url.origin === origen) {
          const r = await request.get(url.pathname + url.search, { maxRedirects: 0 });
          expect(r.status(), `enlace roto o con redirección: ${e.href}`).toBe(200);
        } else {
          expect(url.origin, `enlace externo inesperado: ${e.href}`).toBe(PLATAFORMA);
          expect(RUTAS_PLATAFORMA, `ruta de la plataforma no permitida: ${e.href}`).toContain(url.pathname);
          expect(e.texto, `sin aviso de salida: ${e.href}`).toContain(TEXTO_PLATAFORMA);
          if (url.pathname === "/postular") {
            for (const [clave, valor] of url.searchParams) {
              if (clave === "area") expect(AREAS_PERMITIDAS).toContain(valor);
              else if (clave === "apoyo") expect(["coach", "cercano"]).toContain(valor);
              else throw new Error(`parámetro no permitido: ${e.href}`);
            }
            expect(e.evento, `postular sin analítica: ${e.href}`).toBe("postular");
            expect(e.ubicacion, `postular sin ubicación: ${e.href}`).toBeTruthy();
            ubicaciones.push(e.ubicacion!);
          }
        }
      }
      expect(new Set(ubicaciones).size, "ubicaciones de postular repetidas").toBe(ubicaciones.length);
    });

    test("sin desborde horizontal de 320 a 1440 px", async ({ page }) => {
      for (const ancho of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width: ancho, height: 900 });
        await page.goto(relativa(p.ruta));
        const { sw, cw } = await page.evaluate(() => ({
          sw: document.documentElement.scrollWidth,
          cw: document.documentElement.clientWidth,
        }));
        expect(sw, `desborde a ${ancho} px`).toBe(cw);
      }
    });

    test("accesibilidad WCAG 2.2 AA (axe)", async ({ page }) => {
      await page.goto(relativa(p.ruta));
      const r = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const resumen = r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
      expect(resumen).toEqual([]);
    });
  });
}

test("accesibilidad con estados abiertos: menú, detalles y acciones marcadas", async ({ page, isMobile }) => {
  await page.goto("./");
  if (isMobile) await page.getByRole("button", { name: "Menú" }).click();
  await page.getByLabel(/Reservar 2 bloques de trabajo/).check();
  await page.getByLabel(/Cerrar el día: 3 cosas que hiciste/).check();
  await page.locator("details").evaluateAll((ds) => ds.forEach((d) => ((d as HTMLDetailsElement).open = true)));
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
});

test("el calendario de ejemplo es interactivo tras hidratar", async ({ page }) => {
  await page.goto("./");
  const creditos = page.locator(".calendario-creditos");
  const anuncio = page.locator('.calendario [aria-live="polite"]');
  await expect(creditos).toHaveText("9 créditos");
  await expect(page.locator(".calendario")).not.toContainText("Día completo");
  await page.getByLabel(/Reservar 2 bloques de trabajo/).check();
  // 1 por la acción + 2 por día completo (martes tiene una sola acción).
  await expect(creditos).toHaveText("12 créditos");
  await expect(page.locator(".calendario")).toContainText("Día completo · +2");
  await expect(anuncio).toHaveText("12 créditos. Nivel 2, Impulso.");
});

test("menú móvil: abre, Escape, toque fuera y Tab fuera lo cierran", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo en móvil");
  await page.goto("./");
  const boton = page.getByRole("button", { name: "Menú" });
  const panel = page.locator("#menu-movil");

  await boton.click();
  await expect(boton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(boton).toBeFocused();

  await boton.click();
  await page.mouse.click(200, 800);
  await expect(panel).toBeHidden();

  await boton.click();
  await panel.getByRole("link", { name: /Mi espacio/ }).focus();
  await page.keyboard.press("Tab");
  await expect(panel).toBeHidden();
  await expect(boton).toHaveAttribute("aria-expanded", "false");
});

test("la cabecera de Ayuda inmediata no lleva enlace a postular", async ({ page }) => {
  await page.goto("ayuda/");
  await expect(page.locator('header a[href*="/postular"]')).toHaveCount(0);
  await page.goto("./");
  await expect(page.locator('header a[href*="/postular"]')).toHaveCount(1);
});

test("404: estado 404, noindex y página propia", PROD, async ({ page, request }) => {
  const r = await request.get("esta-ruta-no-existe/");
  expect(r.status()).toBe(404);
  const html = await r.text();
  expect(html).toContain('<meta name="robots" content="noindex" />');
  expect(html).toContain("No encontramos esta");
  const errores = vigilarConsola(page);
  await page.goto("otra/ruta/inexistente");
  await expect(page.locator("h1")).toHaveText("No encontramos esta página.");
  // El aviso de crisis también está en la 404, y el pie llega al fondo.
  await expect(page.locator("footer")).toContainText("*4141");
  const { pie, alto } = await page.evaluate(() => ({
    pie: document.querySelector("footer")!.getBoundingClientRect().bottom + scrollY,
    alto: Math.max(innerHeight, document.documentElement.scrollHeight),
  }));
  expect(pie).toBeGreaterThanOrEqual(alto - 1);
  await page.getByRole("link", { name: "Volver al inicio" }).click();
  await expect(page.locator("h1")).toContainText("semana posible");
  // El único error aceptable es el propio estado 404 del documento.
  expect(errores.filter((e) => !e.includes("status of 404"))).toEqual([]);
});

const reenvios: Record<string, string> = {
  postular: "/postular",
  contacto: "/contacto",
  "mi-programa": "/mi-programa",
  app: "/mi-programa",
  comunidad: "/comunidad",
  estado: "/estado",
  "privacidad-piloto": "/privacidad-piloto",
};

for (const [ruta, destino] of Object.entries(reenvios)) {
  test(`reenvío /${ruta} conserva ?query y #hash`, PROD, async ({ page }) => {
    // No se toca la plataforma real: se responde localmente y se verifica la URL final.
    await page.route(`${PLATAFORMA}/**`, (r) => r.fulfill({ contentType: "text/html", body: "<p>plataforma</p>" }));
    await page.goto(`${ruta}?area=emprendimiento&apoyo=coach#token-de-prueba`);
    await page.waitForURL(`${PLATAFORMA}/**`);
    expect(page.url()).toBe(`${PLATAFORMA}${destino}?area=emprendimiento&apoyo=coach#token-de-prueba`);
  });
}

test("imagen para redes, íconos y manifest", PROD, async ({ request }) => {
  const og = await request.get(IMAGEN_SOCIAL.ruta);
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
  const png = await og.body();
  expect(png.readUInt32BE(16)).toBe(IMAGEN_SOCIAL.ancho);
  expect(png.readUInt32BE(20)).toBe(IMAGEN_SOCIAL.alto);
  expect(png.length).toBeLessThan(300 * 1024); // WhatsApp descarta imágenes pesadas

  for (const f of ["favicon.ico", "favicon.svg", "apple-touch-icon.png"]) {
    expect((await request.get(f)).status(), f).toBe(200);
  }
  const manifest = await (await request.get("site.webmanifest")).json();
  for (const icono of manifest.icons) {
    expect((await request.get(icono.src)).status(), icono.src).toBe(200);
  }
});

test("sitemap: cada URL existe y coincide con su canonical", PROD, async ({ request }) => {
  const xml = await (await request.get("sitemap.xml")).text();
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  expect(locs.length).toBe(paginas.length);
  for (const loc of locs) {
    expect(loc.startsWith(SITE_URL + "/")).toBe(true);
    const r = await request.get(relativa(loc.slice(SITE_URL.length)), { maxRedirects: 0 });
    expect(r.status(), loc).toBe(200);
    expect(await r.text()).toContain(`<link rel="canonical" href="${loc}" />`);
  }
});

test("presupuesto de peso (dist/)", async () => {
  test.skip(!!process.env.URL_PRUEBA, "solo sobre el build local");
  const assets = readdirSync("dist/assets");
  const gz = (f: string) => gzipSync(readFileSync(`dist/assets/${f}`)).length;
  const js = assets.filter((f) => f.endsWith(".js")).reduce((t, f) => t + gz(f), 0);
  const css = assets.filter((f) => f.endsWith(".css")).reduce((t, f) => t + gz(f), 0);
  expect(js, "JS comprimido").toBeLessThan(110 * 1024);
  expect(css, "CSS comprimido").toBeLessThan(12 * 1024);
  const html = readFileSync("dist/index.html");
  expect(html.length, "HTML de la portada").toBeLessThan(70 * 1024);
  const precargas = [...html.toString().matchAll(/rel="preload" href="[^"]*\/assets\/([^"]+)"/g)].map((m) => m[1]);
  const pesoPrecargas = precargas.reduce((t, f) => t + readFileSync(`dist/assets/${f}`).length, 0);
  expect(pesoPrecargas, "fuentes precargadas").toBeLessThan(200 * 1024);
});
