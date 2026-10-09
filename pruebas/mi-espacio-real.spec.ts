// Mi espacio propio (etapa 3, plataforma 4 y 6): ingreso por código y por enlace, estados del
// programa, marcar con la respuesta del servidor, registro semanal y salir. Solo corre con el
// interruptor encendido (operacion.miEspacioPropio, o MI_ESPACIO_PROPIO=1 al compilar y al
// probar). Supabase nunca se toca: page.route responde Auth y PostgREST con una base en memoria
// que aplica las mismas reglas de visibilidad (RLS) que importan aquí: solo lo de la persona y
// nunca un borrador. La base local de CI prueba las políticas de verdad (pruebas/base/).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { operacion } from "../src/data/rumbo";
import { SUPABASE_URL } from "../src/lib/supabase-config";

const ETIQUETAS_AXE = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const CLAVE_SESION = "rumbo-sesion";
const HOY = "2026-10-13"; // martes de la semana 2
const UID = "00000000-0000-4000-8000-000000000001";

const hidratar = (page: Page) => page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
async function sinViolaciones(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}

// ---------------------------------------------------------------------------
// Base en memoria

const sumar = (iso: string, d: number) => {
  const f = new Date(`${iso}T12:00:00Z`);
  f.setUTCDate(f.getUTCDate() + d);
  return f.toISOString().slice(0, 10);
};

type Fila = Record<string, unknown>;
type Base = Record<string, Fila[]>;

function baseInicial({ conPrograma = true } = {}): Base {
  const ocurrencias: Fila[] = [];
  if (conPrograma)
    for (let i = 0; i < 16; i++) {
      const fecha = sumar("2026-10-05", i);
      ocurrencias.push({
        id: `o-${fecha}`,
        participante_id: "p1",
        ciclo_id: "c1",
        programa_id: "g1",
        accion_id: "a1",
        meta_clave: "m1",
        meta_titulo: "Terminar mi tesis",
        categoria: "proyecto",
        fecha,
        hora: "08:00:00",
        duracion_min: 30,
        titulo: "Escribir 30 minutos",
        instrucciones: "Abre el documento.\nEscribe sin corregir.",
        version_corta: "Escribir 10 minutos",
        requiere_foto: false,
        vigente: true,
        anulada_motivo: null,
        anulada_en: null,
      });
    }
  return {
    participantes: [
      { id: "p1", user_id: UID, correo: "ana@correo.cl", nombre: "Ana Pérez", nombre_preferido: "Ana", estado: "activo", zona_horaria: "America/Santiago", ocultar_gamificacion: false },
      // Otra persona: nunca debe verse.
      { id: "p2", user_id: "otra", correo: "otra@correo.cl", nombre: "Otra Persona", nombre_preferido: null, estado: "activo", zona_horaria: "America/Santiago", ocultar_gamificacion: false },
    ],
    ciclos: [
      { id: "c1", participante_id: "p1", numero: 1, plan_id: "coach", inicio: "2026-10-05", semanas: 4, fin: "2026-11-01", dia_revision: 4, hora_videollamada: null, estado: "activo", pausa_motivo: null, pausa_desde: null, pausa_hasta: null, foco_inicial: "Empieza el día con lo más importante." },
    ],
    programas: conPrograma
      ? [
          { id: "g1", ciclo_id: "c1", participante_id: "p1", version: 1, estado: "publicado", nota_cambios: null, vigente_desde: "2026-10-05", publicado_en: "2026-10-02T12:00:00Z" },
          { id: "g2", ciclo_id: "c1", participante_id: "p1", version: 2, estado: "borrador", nota_cambios: "BORRADOR SECRETO", vigente_desde: null, publicado_en: null },
        ]
      : [{ id: "g2", ciclo_id: "c1", participante_id: "p1", version: 1, estado: "borrador", nota_cambios: null, vigente_desde: null, publicado_en: null }],
    metas: [
      { programa_id: "g1", participante_id: "p1", clave: "m1", titulo: "Terminar mi tesis", para_que: "Para titularme este año.", categoria: "proyecto", hitos: [], orden: 0 },
      { programa_id: "g2", participante_id: "p1", clave: "m9", titulo: "BORRADOR SECRETO", para_que: null, categoria: "orden", hitos: [], orden: 1 },
    ],
    ocurrencias,
    registros: conPrograma
      ? [{ ocurrencia_id: "o-2026-10-12", participante_id: "p1", estado: "hecha", version: "completa", explicacion: null, nota_revision: null, revisado_en: null }]
      : [],
    progreso: conPrograma ? [{ participante_id: "p1", creditos: 3, nivel: 1, racha: 1, bono_siguiente: 2 }] : [],
    progreso_diario: conPrograma
      ? [{ participante_id: "p1", fecha: "2026-10-12", programadas: 1, hechas: 1, en_revision: 0, creditos_acciones: 1, bono: 2, racha: 1, en_suspenso: false }]
      : [],
    registros_semanales: [],
    revisiones: [],
    solicitudes_ajuste: [],
    planes: [
      { id: "coach", reordenes_por_ciclo: 0 },
      { id: "cercano", reordenes_por_ciclo: 2 },
    ],
  };
}

// Visibilidad como en 02-rls.sql: lo de p1 y nunca un borrador ni sus metas.
function visibles(base: Base, tabla: string): Fila[] {
  const filas = base[tabla] ?? [];
  const borradores = new Set((base.programas ?? []).filter((p) => p.estado === "borrador").map((p) => p.id));
  if (tabla === "planes") return filas;
  if (tabla === "participantes") return filas.filter((f) => f.id === "p1");
  if (tabla === "programas") return filas.filter((f) => f.participante_id === "p1" && f.estado !== "borrador");
  if (tabla === "metas") return filas.filter((f) => f.participante_id === "p1" && !borradores.has(f.programa_id));
  if (["acciones", "solicitudes", "equipo"].includes(tabla)) return [];
  return filas.filter((f) => !("participante_id" in f) || f.participante_id === "p1");
}

// Filtros de PostgREST que usa la app: eq, neq, gte, in.
function filtrar(filas: Fila[], q: URLSearchParams) {
  let r = filas;
  for (const [col, valor] of q) {
    if (["select", "order", "limit", "offset"].includes(col)) continue;
    const [op, ...resto] = valor.split(".");
    const v = resto.join(".");
    if (op === "eq") r = r.filter((f) => String(f[col]) === v);
    else if (op === "neq") r = r.filter((f) => String(f[col]) !== v);
    else if (op === "gte") r = r.filter((f) => String(f[col]) >= v);
    else if (op === "in") {
      const lista = v.replace(/^\(|\)$/g, "").split(",").map((x) => x.replace(/^"|"$/g, ""));
      r = r.filter((f) => lista.includes(String(f[col])));
    }
  }
  return r;
}

type Llamada = { tipo: "rpc" | "tabla" | "auth"; nombre: string; url: string; cuerpo: Record<string, unknown> };

async function simular(page: Page, base: Base, rpc: Record<string, (c: Record<string, unknown>) => unknown> = {}) {
  const llamadas: Llamada[] = [];
  const progreso = () => {
    const p = base.progreso[0] ?? { creditos: 0, nivel: 1, racha: 0, bono_siguiente: 2 };
    return { creditos: p.creditos, nivel: p.nivel, racha: p.racha, bono_siguiente: p.bono_siguiente };
  };
  const porDefecto: Record<string, (c: Record<string, unknown>) => unknown> = {
    mi_contexto: () => ({ hoy: HOY, dias_registro_tardio: 7, semanas_en_revision: [] }),
    estado_postulaciones: () => ({ abiertas: true, motivo: "cerradas", responder_antes: null, ausencia: null }),
    soy_equipo: () => false,
    marcar_accion: (c) => {
      base.registros = base.registros.filter((r) => r.ocurrencia_id !== c.p_ocurrencia);
      base.registros.push({ ocurrencia_id: c.p_ocurrencia, participante_id: "p1", estado: "hecha", version: c.p_version, explicacion: null, nota_revision: null, revisado_en: null });
      const p = base.progreso[0] as Fila;
      p.creditos = Number(p.creditos) + 1;
      return progreso();
    },
    desmarcar_accion: (c) => {
      base.registros = base.registros.filter((r) => r.ocurrencia_id !== c.p_ocurrencia);
      const p = base.progreso[0] as Fila;
      p.creditos = Number(p.creditos) - 1;
      return progreso();
    },
    guardar_registro_semanal: (c) => {
      const p = c.p as Fila;
      base.registros_semanales.push({ participante_id: "p1", ciclo_id: "c1", semana: c.p_semana, ...p, enviado_en: new Date().toISOString() });
      return { ok: true };
    },
    pedir_ajuste: (c) => {
      const p = c.p as Fila;
      base.solicitudes_ajuste.push({ id: "s1", participante_id: "p1", ciclo_id: "c1", creada_en: new Date().toISOString(), tipo: p.tipo, ocurrencias: p.ocurrencias, desde: p.desde, texto: p.texto, estado: "enviada", respuesta: null, cuenta_como_reorden: false, respondida_en: null });
      return { id: "s1", responder_antes: null };
    },
    actualizar_preferencias: () => null,
  };
  await page.route(`${SUPABASE_URL}/rest/v1/**`, async (rt: Route) => {
    const req = rt.request();
    const url = new URL(req.url());
    const partes = url.pathname.split("/").filter(Boolean); // rest, v1, tabla | rpc, nombre
    if (partes[2] === "rpc") {
      const nombre = partes[3];
      const cuerpo = (req.postDataJSON() ?? {}) as Record<string, unknown>;
      llamadas.push({ tipo: "rpc", nombre, url: req.url(), cuerpo });
      const f = rpc[nombre] ?? porDefecto[nombre];
      if (!f) return rt.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "PGRST202", message: "sin simular" }) });
      return rt.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(f(cuerpo) ?? null) });
    }
    const tabla = partes[2];
    llamadas.push({ tipo: "tabla", nombre: tabla, url: req.url(), cuerpo: {} });
    const filas = filtrar(visibles(base, tabla), url.searchParams);
    const unObjeto = (req.headers()["accept"] ?? "").includes("vnd.pgrst.object");
    return rt.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(unObjeto ? (filas[0] ?? null) : filas) });
  });
  await page.route(`${SUPABASE_URL}/auth/v1/**`, async (rt: Route) => {
    const req = rt.request();
    const nombre = new URL(req.url()).pathname.split("/").pop()!;
    const cuerpo = (req.postDataJSON() ?? {}) as Record<string, unknown>;
    llamadas.push({ tipo: "auth", nombre, url: req.url(), cuerpo });
    if (nombre === "otp") return rt.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    if (nombre === "verify") {
      if (cuerpo.token === "123456") return rt.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sesion()) });
      return rt.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ code: "otp_expired", message: "Token has expired or is invalid" }) });
    }
    if (nombre === "logout") return rt.fulfill({ status: 204, body: "" });
    if (nombre === "user") return rt.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sesion().user) });
    return rt.fulfill({ status: 404, contentType: "application/json", body: "{}" });
  });
  return llamadas;
}

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
function sesion() {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: UID, role: "authenticated", aal: "aal1", exp, aud: "authenticated" })}.firma`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: exp,
    refresh_token: "renovar",
    user: { id: UID, aud: "authenticated", role: "authenticated", email: "ana@correo.cl", app_metadata: {}, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" },
  };
}
// Sesión abierta en este dispositivo (como la deja supabase-js).
const conSesion = (page: Page) =>
  page.addInitScript(([clave, valor]) => window.localStorage.setItem(clave, valor), [CLAVE_SESION, JSON.stringify(sesion())] as const);

test.beforeEach(({}, info) => {
  test.skip(!operacion.miEspacioPropio, "solo con Mi espacio propio (MI_ESPACIO_PROPIO=1)");
  test.skip(info.project.name === "iphone", "interacción: basta con Chromium y WebKit en humo");
});

// ---------------------------------------------------------------------------

test("sin sesión, Mi espacio lleva al ingreso; con el código entra a Hoy", async ({ page }) => {
  const llamadas = await simular(page, baseInicial());
  await page.goto("mi-espacio/calendario/");
  await expect(page.locator("h1")).toHaveText("Entra a tu espacio.");
  await hidratar(page);
  await page.locator("#entrar-correo").fill("ana@correo.cl");
  await page.getByRole("button", { name: "Enviarme el código" }).click();
  await expect(page.locator("h1")).toHaveText("Revisa tu correo.");
  const otp = llamadas.find((l) => l.nombre === "otp")!;
  expect(otp.cuerpo.email).toBe("ana@correo.cl");
  expect(otp.cuerpo.create_user).toBe(true);
  // El correo nunca va en la URL.
  expect(page.url()).not.toContain("ana");

  await page.locator("#entrar-codigo").fill("000000");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Ese código no coincide. Revísalo o pide uno nuevo.")).toBeVisible();

  await page.locator("#entrar-codigo").fill("123456");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  // Vuelve a la ruta que se estaba abriendo.
  await page.waitForURL(/\/mi-espacio\/calendario\/$/);
  await expect(page.getByText("Escribir 30 minutos").first()).toBeVisible();
});

test("enlace del correo vencido: «Este enlace ya no sirve.» y el token sale de la URL", async ({ page }) => {
  const llamadas = await simular(page, baseInicial());
  await page.goto("mi-espacio/entrar/?th=pin-vencido&type=email");
  await expect(page.locator("h1")).toHaveText("Este enlace ya no sirve.");
  const v = llamadas.find((l) => l.nombre === "verify")!;
  expect(v.cuerpo.token_hash).toBe("pin-vencido");
  expect(page.url()).not.toContain("pin-vencido");
});

test("Hoy real: sin «Ejemplo», marcar llama a marcar_accion y los créditos vienen del servidor", async ({ page }) => {
  await conSesion(page);
  const llamadas = await simular(page, baseInicial());
  await page.goto("mi-espacio/");
  await expect(page.locator("h1")).toHaveText("Hoy, martes 13.");
  await hidratar(page);
  await expect(page.getByText("Hola, Ana.")).toBeVisible();
  await expect(page.getByText("Ejemplo", { exact: true })).toHaveCount(0);
  await expect(page.getByText("BORRADOR SECRETO")).toHaveCount(0);
  const creditos = page.locator(".me-hoy .me-resumen__creditos");
  await expect(creditos).toHaveText("3 créditos");
  await sinViolaciones(page);

  const casilla = page.getByRole("checkbox", { name: "Marcar “Escribir 30 minutos” como hecha" });
  await casilla.check();
  await expect(casilla).toBeChecked();
  await expect(creditos).toHaveText("4 créditos");
  const m = llamadas.filter((l) => l.nombre === "marcar_accion");
  expect(m).toHaveLength(1);
  expect(m[0].cuerpo).toEqual({ p_ocurrencia: `o-${HOY}`, p_version: "completa" });
  // La persona nunca consulta acciones ni borradores.
  expect(llamadas.some((l) => l.tipo === "tabla" && l.nombre === "acciones")).toBe(false);
  const programas = llamadas.find((l) => l.tipo === "tabla" && l.nombre === "programas")!;
  expect(decodeURIComponent(programas.url)).toContain("estado=neq.borrador");
});

test("si marcar falla, el check vuelve atrás y se ofrece reintentar", async ({ page }) => {
  await conSesion(page);
  await simular(page, baseInicial(), {
    marcar_accion: () => {
      throw new Error("no debería llegar");
    },
  });
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/marcar_accion`, (rt) => rt.abort("internetdisconnected"));
  await page.goto("mi-espacio/");
  await hidratar(page);
  const casilla = page.getByRole("checkbox", { name: "Marcar “Escribir 30 minutos” como hecha" });
  // click y no check: la respuesta llega al instante y el check ya volvió atrás.
  await casilla.click();
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await expect(casilla).not.toBeChecked();
});

test("programa en preparación: el borrador no se ve", async ({ page }) => {
  await conSesion(page);
  await simular(page, baseInicial({ conPrograma: false }));
  await page.goto("mi-espacio/");
  await expect(page.locator("h1")).toHaveText("Estamos preparando tu programa.");
  await expect(page.getByText("BORRADOR SECRETO")).toHaveCount(0);
  // Lo único de ejemplo es el calendario punteado «Así se verá tu semana» (4.3.1).
  await expect(page.getByText("Ejemplo", { exact: true })).toHaveCount(1);
});

test("registro semanal y solicitud de ajuste van a sus RPC", async ({ page }) => {
  await conSesion(page);
  const llamadas = await simular(page, baseInicial());
  await page.goto("mi-espacio/semana/");
  await hidratar(page);
  await expect(page.locator("h1")).toHaveText("Semana 2 de 4.");
  await page.locator("#registro-funciono").fill("Escribir temprano.");
  await page.getByRole("button", { name: "Enviar mi registro" }).click();
  await expect.poll(() => llamadas.filter((l) => l.nombre === "guardar_registro_semanal").length).toBe(1);
  const g = llamadas.find((l) => l.nombre === "guardar_registro_semanal")!;
  expect(g.cuerpo.p_semana).toBe(2);
  expect(g.cuerpo.p_enviar).toBe(true);
  expect((g.cuerpo.p as Record<string, string>).funciono).toBe("Escribir temprano.");

  await page.goto("mi-espacio/ajuste/");
  await expect(page.locator("h1")).toHaveText("¿Qué necesitas cambiar?");
  await hidratar(page);
  await page.locator('input[name="ajuste-tipo"][value="carga"]').check();
  await page.locator("#ajuste-detalle").fill("Esta semana tengo pruebas y no alcanzo todo.");
  await page.getByRole("button", { name: "Pedir el ajuste" }).click();
  await expect(page.locator("h1")).toHaveText("Recibimos tu solicitud de ajuste.");
  const a = llamadas.find((l) => l.nombre === "pedir_ajuste")!;
  expect((a.cuerpo.p as Record<string, unknown>).tipo).toBe("carga");
});

test("salir cierra la sesión de este dispositivo", async ({ page }) => {
  await conSesion(page);
  const llamadas = await simular(page, baseInicial());
  await page.goto("mi-espacio/preferencias/");
  await hidratar(page);
  await page.getByRole("link", { name: "Salir de este dispositivo" }).click();
  await expect(page.getByText("Saliste de Mi espacio en este dispositivo.")).toBeVisible();
  await expect(page.locator("h1")).toHaveText("Entra a tu espacio.");
  expect(llamadas.some((l) => l.nombre === "logout")).toBe(true);
  expect(await page.evaluate((c) => localStorage.getItem(c), CLAVE_SESION)).toBeNull();
});

test("las rutas de Mi espacio y del panel son noindex y conectan solo con el proyecto", async ({ request }) => {
  for (const ruta of ["mi-espacio/", "mi-espacio/entrar/", "equipo/"]) {
    const html = await (await request.get(ruta)).text();
    expect(html, ruta).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(html, ruta).toContain(`connect-src 'self' ${SUPABASE_URL}`);
    expect(html, ruta).not.toContain('rel="canonical"');
  }
});
