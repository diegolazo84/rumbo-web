// Formulario propio contra Supabase (plataforma 2.4, 3, 6.6 y 8.2-F): /postular/, /estado/#token
// y /contacto/ en modo real. Solo corre con el interruptor encendido (operacion.formularioPropio,
// o FORMULARIO_PROPIO=1 al compilar y al probar). Supabase nunca se toca: page.route responde
// cada RPC y guarda lo que el navegador envió.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { CONTACTO, NOMBRE, POSTULAR, RETIRAR } from "../src/data/formularios";
import { estados, operacion } from "../src/data/rumbo";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../src/lib/supabase-config";
import { ESTADO } from "../src/pages/vista-previa/formulario/textos";

const ETIQUETAS_AXE = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const TOKEN = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-AbCdE"; // 43 caracteres base64url
const META = "Tengo exámenes en diciembre y siempre termino estudiando el último día.";

const hidratar = (page: Page) => page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
async function sinViolaciones(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}

type Llamada = { nombre: string; cuerpo: Record<string, unknown>; cabeceras: Record<string, string> };
type Respuesta = { status?: number; body?: unknown } | "abortar";
type Respondedor = (cuerpo: Record<string, unknown>, n: number) => Respuesta;

// Simula las RPC públicas. Lo no indicado responde como la base con postulaciones abiertas.
async function simularSupabase(page: Page, respuestas: Record<string, Respondedor> = {}) {
  const llamadas: Llamada[] = [];
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/*`, async (rt: Route) => {
    const req = rt.request();
    const nombre = new URL(req.url()).pathname.split("/").pop()!;
    const cuerpo = (req.postDataJSON() ?? {}) as Record<string, unknown>;
    llamadas.push({ nombre, cuerpo, cabeceras: req.headers() });
    const n = llamadas.filter((l) => l.nombre === nombre).length;
    const porDefecto: Respondedor = () =>
      nombre === "estado_postulaciones"
        ? { body: { abiertas: true, motivo: "cerradas", responder_antes: null, ausencia: null } }
        : { status: 500, body: { message: "sin simular" } };
    const r = (respuestas[nombre] ?? porDefecto)(cuerpo, n);
    if (r === "abortar") return rt.abort("internetdisconnected");
    await rt.fulfill({ status: r.status ?? 200, contentType: "application/json", body: JSON.stringify(r.body ?? null) });
  });
  return llamadas;
}
const de = (llamadas: Llamada[], nombre: string) => llamadas.filter((l) => l.nombre === nombre);

async function llenarPostular(page: Page) {
  await page.locator("#area-estudio").check();
  await page.locator("#meta").fill(META);
  await page.locator("#apoyo-nose").check();
  await page.locator("#nombre").fill("Camila");
  await page.locator("#correo").fill("camila@ejemplo.cl");
  await page.locator("#mayor-edad").check();
  await page.locator("#autorizacion").check();
}
const ENVIO_OK: Respondedor = () => ({
  body: { tipo: "solicitud", creada_en: new Date().toISOString(), responder_antes: "2026-10-14" },
});

const SOLICITUD = {
  tipo: "solicitud",
  estado: "recibida",
  nombre: "Camila",
  correo: "c•••@ejemplo.cl",
  area: "estudio",
  apoyo: "nose",
  meta: META,
  dias: ["lun", "mie"],
  franjas: ["tarde"],
  horarios_nota: null,
  creada_en: "2026-10-08T15:30:00Z",
  responder_antes: "2026-10-12",
  con_atraso: false,
  acuerdo: null,
  condiciones_aceptadas: null,
  version_condiciones: "1.1",
};

test.beforeEach(({}, info) => {
  test.skip(!operacion.formularioPropio, "solo con el formulario propio (FORMULARIO_PROPIO=1)");
  test.skip(info.project.name !== "escritorio", "interacción: basta un proyecto");
});

test("postular: un envío válido llega a Supabase y la confirmación muestra el enlace privado", async ({ page }) => {
  const llamadas = await simularSupabase(page, { enviar_solicitud: ENVIO_OK });
  await page.goto("postular/");
  await hidratar(page);
  // Sin datos ficticios (el «Ejemplo» de la ayuda de la meta sí corresponde, 3.4).
  await expect(page.getByText(estados.ejemploIlustrativo.texto)).toHaveCount(0);
  await llenarPostular(page);
  // Días y franjas: la base solo acepta sus códigos (lun…vie, manana…noche).
  await page.getByRole("checkbox", { name: "Lunes", exact: true }).check();
  await page.getByRole("checkbox", { name: "Miércoles", exact: true }).check();
  await page.getByRole("button", { name: POSTULAR.envio.boton }).click();
  await expect(page.locator("main h1")).toHaveText("Recibimos tu solicitud, Camila.");
  await expect(page.locator("main h1")).toBeFocused();

  // Lo que recibió la base: el cuerpo { p: … } con el token de 43 caracteres y la clave anon.
  const [envio] = de(llamadas, "enviar_solicitud");
  expect(envio.cabeceras.apikey).toBe(SUPABASE_ANON_KEY);
  const p = envio.cuerpo.p as Record<string, unknown>;
  expect(p.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(p).toMatchObject({
    tipo: "solicitud",
    nombre: "Camila",
    correo: "camila@ejemplo.cl",
    area: "estudio",
    meta: META,
    apoyo: "nose",
    mayor_edad: true,
    autorizacion: true,
    campo_extra_7: "",
  });
  expect(typeof p.ms).toBe("number");
  expect(p.dias).toEqual(["lun", "mie"]);
  expect(String(p.texto_autorizacion)).toContain(POSTULAR.autorizacion.enlace);

  // El enlace privado es /estado/#token, sin la etiqueta «Ejemplo».
  await expect(page.locator("#enlace-privado")).toHaveText(new RegExp(`/estado/#${p.token}$`));
  await expect(page.locator(".vf-enlace").getByRole("link")).toHaveAttribute("href", new RegExp(`/estado/#${p.token}$`));
  await expect(page.locator(".vf-enlace").getByText("Ejemplo", { exact: true })).toHaveCount(0);
  await sinViolaciones(page);

  // Recargar no reenvía.
  await page.reload();
  await hidratar(page);
  await expect(page.locator("main h1")).toHaveText("Ya enviaste esta solicitud.");
  expect(de(llamadas, "enviar_solicitud")).toHaveLength(1);
});

test("postular: un error de validación del servidor muestra el resumen de errores", async ({ page }) => {
  await simularSupabase(page, {
    enviar_solicitud: () => ({ status: 400, body: { code: "PT400", message: "nombre:vacio" } }),
  });
  await page.goto("postular/");
  await hidratar(page);
  await llenarPostular(page);
  await page.getByRole("button", { name: POSTULAR.envio.boton }).click();
  const resumen = page.locator("#resumen-errores");
  await expect(resumen).toBeFocused();
  await expect(resumen.getByRole("link")).toHaveText([NOMBRE.errores.vacio]);
  await expect(page.locator("#nombre")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#meta")).toHaveValue(META);
});

test("postular: un fallo de red muestra el reintento y reintentar envía el mismo token", async ({ page }) => {
  const llamadas = await simularSupabase(page, {
    enviar_solicitud: (cuerpo, n) => (n === 1 ? "abortar" : ENVIO_OK(cuerpo, n)),
  });
  await page.goto("postular/");
  await hidratar(page);
  await llenarPostular(page);
  await page.getByRole("button", { name: POSTULAR.envio.boton }).click();
  await expect(page.getByRole("alert")).toContainText("No pudimos enviar tu solicitud.");
  await expect(page.locator("#meta")).toHaveValue(META);
  await page.getByRole("button", { name: "Intentar de nuevo" }).click();
  await expect(page.locator("main h1")).toHaveText("Recibimos tu solicitud, Camila.");
  const envios = de(llamadas, "enviar_solicitud").map((l) => (l.cuerpo.p as { token: string }).token);
  expect(envios).toHaveLength(2);
  expect(envios[1]).toBe(envios[0]);
});

test("estado: lee la solicitud del #token y retirar la borra", async ({ page }) => {
  let retirada = false;
  const llamadas = await simularSupabase(page, {
    ver_solicitud: () => ({ body: retirada ? { ...SOLICITUD, estado: "retirada", cerrada_en: new Date().toISOString() } : SOLICITUD }),
    retirar_solicitud: () => {
      retirada = true;
      return { body: { cerrada_en: new Date().toISOString() } };
    },
  });
  await page.goto(`estado/#${TOKEN}`);
  await hidratar(page);
  await expect(page.locator("main h1")).toHaveText("Recibimos tu solicitud.");
  // «Lo que nos contaste» (plegado) trae la meta tal como llegó de la base.
  await expect(page.getByText(META)).toBeAttached();
  await expect(page.getByText("Ejemplo", { exact: true })).toHaveCount(0);
  expect(de(llamadas, "ver_solicitud")[0].cuerpo).toEqual({ p_token: TOKEN });
  await sinViolaciones(page);

  await page.getByRole("button", { name: RETIRAR.boton, exact: true }).click();
  await page.getByRole("dialog", { name: RETIRAR.titulo }).getByRole("button", { name: RETIRAR.confirmar }).click();
  await expect(page.locator("main h1")).toHaveText("Retiraste tu solicitud.");
  expect(de(llamadas, "retirar_solicitud").map((l) => l.cuerpo)).toEqual([{ p_token: TOKEN }]);
});

test("estado: un token desconocido o mal formado muestra «no encontrada» sin datos", async ({ page }) => {
  const llamadas = await simularSupabase(page, { ver_solicitud: () => ({ body: null }) });
  await page.goto(`estado/#${TOKEN}`);
  await hidratar(page);
  await expect(page.locator("main h1")).toHaveText(ESTADO.noEncontrada.titulo);
  await expect(page.getByText(META)).toHaveCount(0);
  expect(de(llamadas, "ver_solicitud")).toHaveLength(1);
  // Un token mal formado ni siquiera consulta la base.
  await page.goto("about:blank");
  await page.goto("estado/#corto");
  await hidratar(page);
  await expect(page.locator("main h1")).toHaveText(ESTADO.noEncontrada.titulo);
  expect(de(llamadas, "ver_solicitud")).toHaveLength(1);
});

test("contacto: enviar llega a enviar_mensaje y muestra la confirmación", async ({ page }) => {
  const llamadas = await simularSupabase(page, { enviar_mensaje: () => ({ body: { ok: true } }) });
  await page.goto("contacto/?motivo=datos");
  await hidratar(page);
  await expect(page.locator("#motivo-datos")).toBeChecked();
  await page.locator("#correo").fill("camila@ejemplo.cl");
  await page.locator("#mensaje").fill("Quiero ver los datos que tienen de mí.");
  await page.getByRole("button", { name: CONTACTO.boton }).click();
  await expect(page.locator("main h1")).toHaveText(CONTACTO.confirmacion.titulo);
  await expect(page.locator("main h1")).toBeFocused();
  const [m] = de(llamadas, "enviar_mensaje");
  expect(m.cuerpo.p).toMatchObject({
    motivo: "datos",
    correo: "camila@ejemplo.cl",
    mensaje: "Quiero ver los datos que tienen de mí.",
    campo_extra_7: "",
  });
  await sinViolaciones(page);
});

test("contacto: un fallo de red conserva el mensaje y ofrece reintentar", async ({ page }) => {
  await simularSupabase(page, { enviar_mensaje: () => "abortar" });
  await page.goto("contacto/");
  await hidratar(page);
  await page.locator("#motivo-duda").check();
  await page.locator("#correo").fill("camila@ejemplo.cl");
  await page.locator("#mensaje").fill("¿Cuándo abren el área de bienestar?");
  await page.getByRole("button", { name: CONTACTO.boton }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("#mensaje")).toHaveValue("¿Cuándo abren el área de bienestar?");
});
