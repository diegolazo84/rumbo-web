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

// Visibilidad como en migrations/20261008000002_rls.sql: lo de p1 y nunca un borrador ni sus metas.
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
      const r = f(cuerpo);
      // Error de la base («campo:codigo» con su estado HTTP), como lo devuelve PostgREST.
      if (r && typeof r === "object" && "__error" in r)
        return rt.fulfill({ status: Number((r as Fila).__estado ?? 400), contentType: "application/json", body: JSON.stringify({ code: "PT400", message: (r as Fila).__error }) });
      return rt.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(r ?? null) });
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
  await page.goto("mi-espacio/plan/");
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
  await page.waitForURL(/\/mi-espacio\/plan\/$/);
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
  await expect(page.locator("h1")).toHaveText("Mi Rumbo");
  await expect(page.locator(".me-bienvenida__ojo")).toContainText("Martes 13 · Semana");
  await hidratar(page);
  await expect(page.getByText("¡Hola, Ana!")).toBeVisible();
  await expect(page.getByText("Ejemplo", { exact: true })).toHaveCount(0);
  await expect(page.getByText("BORRADOR SECRETO")).toHaveCount(0);
  const creditos = page.locator(".me-hoy .me-resumen__creditos");
  await expect(creditos).toHaveText("3 créditos");
  await sinViolaciones(page);

  const casilla = page.getByRole("checkbox", { name: "Marcar “Escribir 30 minutos” como hecha" });
  // Resumen del día: solo las acciones de hoy (1), nunca las de días futuros.
  await expect(page.getByRole("img", { name: "Hoy: 0 de 1 acción hecha." })).toBeVisible();
  await casilla.check();
  await expect(casilla).toBeChecked();
  await expect(creditos).toHaveText("4 créditos");
  await expect(page.getByRole("img", { name: "Hoy: 1 de 1 acción hecha." })).toBeVisible();
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
  await page.goto("mi-espacio/acompanamiento/");
  await hidratar(page);
  await expect(page.locator("h1")).toHaveText("Mi acompañamiento");
  await expect(page.locator(".me-semana__subtitulo")).toHaveText("Semana 2 de 4");
  await page.locator("#tu-registro").getByRole("button", { name: "Escribir mi registro" }).click();
  await page.locator("#registro-funciono").fill("Escribir temprano.");
  await page.getByRole("button", { name: "Enviar mi registro" }).click();
  await expect.poll(() => llamadas.filter((l) => l.nombre === "guardar_registro_semanal").length).toBe(1);
  const g = llamadas.find((l) => l.nombre === "guardar_registro_semanal")!;
  expect(g.cuerpo.p_semana).toBe(2);
  expect(g.cuerpo.p_enviar).toBe(true);
  expect((g.cuerpo.p as Record<string, string>).funciono).toBe("Escribir temprano.");

  await page.goto("mi-espacio/plan/ajuste/");
  await expect(page.locator("h1")).toHaveText("¿Qué necesitas cambiar?");
  await hidratar(page);
  await page.locator('input[name="ajuste-tipo"][value="carga"]').check();
  await page.locator("#ajuste-detalle").fill("Esta semana tengo pruebas y no alcanzo todo.");
  await page.getByRole("button", { name: "Pedir el ajuste" }).click();
  await expect(page.locator("h1")).toHaveText("Recibimos tu solicitud de ajuste.");
  const a = llamadas.find((l) => l.nombre === "pedir_ajuste")!;
  expect((a.cuerpo.p as Record<string, unknown>).tipo).toBe("carga");
});

// Rumbo 2.0, etapa 2: las rutas anteriores llevan a la sección nueva con su búsqueda.
test("rutas anteriores: semana, progreso, calendario y ajuste redirigen a las secciones nuevas", async ({ page }) => {
  await conSesion(page);
  await simular(page, baseInicial());
  const casos: [string, RegExp, string][] = [
    ["mi-espacio/semana/?n=1", /\/mi-espacio\/acompanamiento\/\?n=1$/, "Mi acompañamiento"],
    ["mi-espacio/progreso/", /\/mi-espacio\/logros\/$/, "Mis logros"],
    ["mi-espacio/progreso/creditos/", /\/mi-espacio\/logros\/creditos\/$/, "El detalle de tus créditos."],
    ["mi-espacio/calendario/?vista=mes", /\/mi-espacio\/plan\/\?vista=mes$/, "Mi plan"],
    ["mi-espacio/ajuste/#tus-solicitudes", /\/mi-espacio\/plan\/ajuste\/#tus-solicitudes$/, "¿Qué necesitas cambiar?"],
    ["mi-espacio/accion/?id=o-2026-10-12", /\/mi-espacio\/plan\/accion\/\?id=o-2026-10-12$/, "Escribir 30 minutos"],
  ];
  for (const [antes, despues, h1] of casos) {
    const r = await page.goto(antes);
    expect(r?.status(), antes).toBe(200);
    await page.waitForURL(despues);
    await expect(page.locator("h1"), antes).toHaveText(h1);
  }
});

test("descargar mis datos llama a exportar_mis_datos y baja el archivo", async ({ page }) => {
  await conSesion(page);
  const llamadas = await simular(page, baseInicial(), { exportar_mis_datos: () => ({ perfil: { nombre: "Ana Pérez" } }) });
  await page.goto("mi-espacio/preferencias/");
  await hidratar(page);
  const [descarga] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar mis datos" }).click()]);
  expect(descarga.suggestedFilename()).toBe("mis-datos-rumbo.json");
  expect(llamadas.some((l) => l.nombre === "exportar_mis_datos")).toBe(true);
});

test("Mi espacio real nunca muestra «Ejemplo» ni el aviso de la vista previa", async ({ page }) => {
  await conSesion(page);
  await simular(page, baseInicial());
  for (const r of ["mi-espacio/", "mi-espacio/acompanamiento/", "mi-espacio/comunidad/", "mi-espacio/logros/", "mi-espacio/plan/metas/", "mi-espacio/lo-que-viene/"]) {
    await page.goto(r);
    await hidratar(page);
    await expect(page.locator("main h1"), r).toBeVisible();
    await expect(page.getByText("Ejemplo", { exact: true }), r).toHaveCount(0);
    await expect(page.getByText(/datos de ejemplo|Vista previa de la plataforma/), r).toHaveCount(0);
  }
});

test("Lo que viene real: lo que el dueño ya habilitó deja de aparecer; sin la tabla, la lista completa", async ({ page }) => {
  await conSesion(page);
  const base = baseInicial();
  base.modulos = [
    { clave: "comunidad", estado: "habilitado" },
    { clave: "ranking", estado: "probado" },
    { clave: "app_movil", estado: "operativo" },
  ];
  await simular(page, base);
  await page.goto("mi-espacio/lo-que-viene/");
  await hidratar(page);
  const titulos = page.locator(".me-lqv__titulo");
  await expect(titulos).toHaveCount(6);
  await expect(titulos).not.toContainText(["Comunidad con foro moderado"]);
  await expect(page.getByText("Ranking semanal voluntario")).toBeVisible(); // probado no basta
  await expect(page.getByText("Aplicación móvil")).toHaveCount(0);
  // Sin la tabla (migración sin aplicar): las 8 funciones, como hasta ahora.
  await page.route("**/rest/v1/modulos**", (rt) => rt.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "42P01", message: "no existe" }) }));
  await page.reload();
  await hidratar(page);
  await expect(titulos).toHaveCount(8);
});

// Rumbo 2.0, etapa 2: Mi acompañamiento muestra solo lo que existe en la base.
test("Mi acompañamiento real: foco inicial y fecha de la primera revisión, sin inventar observaciones", async ({ page }) => {
  await conSesion(page);
  await simular(page, baseInicial());
  await page.goto("mi-espacio/acompanamiento/");
  await hidratar(page);
  await expect(page.locator("h1")).toHaveText("Mi acompañamiento");
  await expect(page.getByRole("heading", { name: "Tu coach", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Próxima revisión" })).toBeVisible();
  await expect(page.locator(".me-proxima")).toContainText("Jueves 15 de octubre");
  // Intro de cercanía y la modalidad real del plan (sin atención permanente ni chat).
  await expect(page.locator(".me-acomp-portada__bajada")).toHaveText("No tienes que hacerlo solo. Estamos contigo en este camino.");
  await expect(page.locator(".me-proxima__modalidad")).toHaveText("Revisión por escrito");
  await expect(page.locator(".me-proxima")).toContainText("Este espacio no es un chat de respuesta inmediata.");
  // Sin revisión publicada, el historial lo dice sin inventar observaciones.
  await expect(page.locator(".me-acomp-historial")).toContainText("Aquí verás las respuestas de tu coach.");
  await expect(page.locator(".me-coach img")).toHaveCount(0);
  // Sin coach asignado (mi_coach no responde): «Tu coach» genérico, sin nombre inventado.
  await expect(page.locator(".me-coach__titulo")).toHaveText("Tu coach");
  await expect(page.locator(".me-coach__rotulo-coach")).toHaveCount(0);
  await sinViolaciones(page);
});

// Referencia de ChatGPT: el nombre y la presentación del coach llegan de mi_coach (A3) y, en el
// plan cercano, la videollamada de la semana de la tabla videollamadas (C2). Nada más.
test("Mi acompañamiento real: coach asignado y videollamada agendada por el coach", async ({ page }) => {
  await conSesion(page);
  const base = baseInicial();
  base.ciclos[0].plan_id = "cercano";
  base.ciclos[0].hora_videollamada = "19:00:00";
  base.videollamadas = [
    { participante_id: "p1", ciclo_id: "c1", semana: 1, programada_para: "2026-10-08T22:00:00Z", enlace: "https://meet.example.org/s1", estado: "realizada" },
    { participante_id: "p1", ciclo_id: "c1", semana: 2, programada_para: "2026-10-15T23:30:00Z", enlace: "https://meet.example.org/s2", estado: "programada" },
  ];
  base.revisiones.push({ participante_id: "p1", ciclo_id: "c1", semana: 1, tipo: "videollamada", que_funciono: "Las mañanas te funcionaron.", que_ajustamos: null, foco: "Una cosa a la vez.", iniciada_en: "2026-10-08T22:30:00Z", publicada_en: "2026-10-08T23:00:00Z" });
  const llamadas = await simular(page, base, { mi_coach: () => ({ nombre: "Diego Muñoz", presentacion: "Acompaño procesos de cambio de hábitos." }) });
  await page.goto("mi-espacio/acompanamiento/");
  await hidratar(page);
  const coach = page.locator(".me-coach");
  await expect(coach.locator(".me-coach__titulo")).toHaveText("Diego Muñoz");
  await expect(coach.locator(".me-coach__rotulo-coach")).toHaveText("Tu coach");
  await expect(coach).toContainText("Acompaño procesos de cambio de hábitos.");
  await expect(coach.locator(".me-coach__avatar")).toHaveText("DM");
  await expect(coach.locator(".me-coach__cita")).toContainText("Una cosa a la vez.");
  await expect(coach.locator(".me-coach__firma")).toHaveText("Diego Muñoz, tu coach");
  // Sin «En línea» ni foto: no existen en la base.
  await expect(coach).not.toContainText("En línea");
  // La videollamada de la semana 2: hora de Chile (20:30) y el enlace que dejó el coach.
  const proxima = page.locator(".me-proxima");
  await expect(proxima.locator(".me-proxima__modalidad")).toHaveText("Videollamada · 20 min · 20:30 (hora de Chile)");
  await expect(proxima.getByRole("link", { name: /Unirme a la videollamada/ })).toHaveAttribute("href", "https://meet.example.org/s2");
  await expect(page.locator(".me-acomp-acciones").getByRole("link", { name: /Mi videollamada/ })).toHaveAttribute("href", "https://meet.example.org/s2");
  // La de la semana 1 ya se anotó: queda en el historial con su estado real.
  await expect(page.locator(".me-acomp-historial")).toContainText("Videollamada de la semana 1");
  await expect(page.locator(".me-acomp-historial")).toContainText("Realizada el jueves 8");
  // No hay forma de agendar ni reprogramar desde aquí: la agenda el coach.
  await expect(page.getByRole("button", { name: /Agendar|Reprogramar/ })).toHaveCount(0);
  expect(llamadas.some((l) => l.tipo === "rpc" && l.nombre === "mi_coach")).toBe(true);
  expect(llamadas.some((l) => l.tipo === "tabla" && l.nombre === "videollamadas" && l.url.includes("ciclo_id=eq.c1"))).toBe(true);
  await sinViolaciones(page);
});

// Revisión real extensa: primero un resumen y «Leer revisión completa»; la solicitud respondida
// lleva la fecha real de la respuesta (solicitudes_ajuste.respondida_en). Sin «Nuevo».
test("Mi acompañamiento real: revisión extensa con resumen y fechas reales en el historial", async ({ page }) => {
  await conSesion(page);
  const base = baseInicial();
  const largo = "Marcaste casi todo lo de la mañana y eso muestra que el horario temprano te funciona. ".repeat(4).trim();
  base.revisiones.push({ participante_id: "p1", ciclo_id: "c1", semana: 1, tipo: "escrita", que_funciono: largo, que_ajustamos: null, foco: "Una cosa a la vez.", iniciada_en: "2026-10-08T18:00:00Z", publicada_en: "2026-10-08T20:00:00Z" });
  base.solicitudes_ajuste.push({ id: "s9", participante_id: "p1", ciclo_id: "c1", creada_en: "2026-10-06T15:00:00Z", tipo: "horarios", ocurrencias: [], desde: "2026-10-06", texto: "Salgo tarde los martes.", estado: "respondida", respuesta: "Movimos la acción a la noche.", cuenta_como_reorden: false, respondida_en: "2026-10-07T15:00:00Z" });
  await simular(page, base);
  await page.goto("mi-espacio/acompanamiento/?n=1");
  await hidratar(page);
  const vimos = page.locator("#lo-que-vimos");
  await expect(vimos).toContainText("Lo que funcionó");
  // «Lo que podemos ajustar» venía vacío: no se inventa.
  await expect(vimos).not.toContainText("Lo que podemos ajustar");
  const boton = vimos.getByRole("button", { name: "Leer revisión completa" });
  await expect(boton).toHaveAttribute("aria-expanded", "false");
  await boton.click();
  await expect(vimos.getByRole("button", { name: "Ver menos" })).toHaveAttribute("aria-expanded", "true");
  const historial = page.locator(".me-acomp-historial");
  await expect(historial).toContainText("Respondida el miércoles 7");
  await expect(historial).toContainText("Publicada el jueves 8");
  await expect(page.locator(".me-acomp .me-nuevo")).toHaveCount(0);
  await sinViolaciones(page);
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

// ---------------------------------------------------------------------------
// Comunidad real (C6 a C9): todo sale de las funciones de la base; nada de ejemplo.

const PUB = (id: string, extra: Fila = {}): Fila => ({
  id, respuesta_a: null, alias_publico: "Caminante", texto: "Hoy caminé 20 minutos #Hábitos", creada_en: new Date(Date.now() - 3 * 3600_000).toISOString(),
  mia: false, respuestas: 0, grupo_id: "gr1", grupo_titulo: "Actividad física", foto_ruta: null, reacciones: 2, mi_reaccion: false, tipo: "progreso", guardada: false, ...extra,
});

test("Comunidad real: cerrada mientras el dueño no la habilite (sin datos de ejemplo)", async ({ page }) => {
  await conSesion(page);
  await simular(page, baseInicial(), { mi_impacto_comunidad: () => ({ __error: "comunidad:no_disponible", __estado: 409 }) });
  await page.goto("mi-espacio/comunidad/");
  await hidratar(page);
  await expect(page.getByRole("heading", { name: "La comunidad aún no está abierta" })).toBeVisible();
  await expect(page.locator("article.co-pub")).toHaveCount(0);
  await expect(page.getByText("Ejemplo", { exact: true })).toHaveCount(0);
});

test("Grupos real: cerrada sin pedir grupos; abierta con destacado, sugeridos, unirse y proponer en la base", async ({ page }) => {
  await conSesion(page);
  let llamadas = await simular(page, baseInicial(), { mi_impacto_comunidad: () => ({ __error: "comunidad:no_disponible", __estado: 409 }) });
  await page.goto("mi-espacio/comunidad/grupos/");
  await hidratar(page);
  await expect(page.getByText("Para ver los grupos, primero entra a Comunidad.")).toBeVisible();
  expect(llamadas.some((l) => l.nombre === "comunidad_grupos")).toBe(false);
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await conSesion(page);
  const grupos = [
    { id: "gr1", nombre: "Actividad física", descripcion: "Moverse", miembros: 4, soy_miembro: true, ilustracion: "montana", publicaciones: 2, destacado: true, categoria: "bienestar", creado_en: "2026-10-01T00:00:00Z", sugerido: false },
    { id: "gr2", nombre: "Orden", descripcion: "Semana ordenada", miembros: 1, soy_miembro: false, ilustracion: null, publicaciones: 0, destacado: false, categoria: "orden", creado_en: "2026-10-02T00:00:00Z", sugerido: true },
  ];
  llamadas = await simular(page, baseInicial(), {
    mi_impacto_comunidad: () => [{ publicaciones: 0, comentarios: 0, reacciones_recibidas: 0 }],
    comunidad_grupos: () => grupos,
    unirme_a_grupo: (c) => {
      const g = grupos.find((x) => x.id === c.p_grupo)!;
      Object.assign(g, { soy_miembro: true, miembros: g.miembros + 1, sugerido: false });
      return null;
    },
    mis_propuestas_grupo: () => [],
    proponer_grupo: (c) => (c.p_nombre === "Orden" ? { __error: "nombre:en_uso", __estado: 409 } : "pg1"),
  });
  await page.goto("mi-espacio/comunidad/grupos/");
  await hidratar(page);
  await expect(page.getByText("Ejemplo", { exact: true })).toHaveCount(0);
  await expect(page.locator(".gr-destacado")).toContainText("Actividad física");
  await expect(page.locator(".gr-destacado")).toContainText("2 publicaciones");
  await page.getByRole("button", { name: "Unirse: Orden" }).first().click();
  await expect.poll(() => llamadas.find((l) => l.nombre === "unirme_a_grupo")?.cuerpo).toEqual({ p_grupo: "gr2" });
  await expect(page.locator(".gr-grilla")).toContainText("2 miembros");
  await page.getByRole("navigation", { name: "Secciones de Grupos de la comunidad" }).getByRole("button", { name: "Proponer un grupo" }).click();
  const hoja = page.getByRole("dialog", { name: "Proponer un grupo" });
  await hoja.getByLabel("Nombre del grupo").fill("Orden");
  await hoja.getByRole("button", { name: "Enviar propuesta" }).click();
  await expect(hoja.getByRole("alert")).toHaveText("Ya existe un grupo con ese nombre. Búscalo en Todos los grupos.");
  await hoja.getByLabel("Nombre del grupo").fill("Lectura");
  await hoja.getByRole("button", { name: "Enviar propuesta" }).click();
  await expect(page.locator(".tostada__texto")).toHaveText("Enviamos tu propuesta al equipo de Rumbo.");
  expect(llamadas.filter((l) => l.nombre === "proponer_grupo").at(-1)!.cuerpo).toEqual({ p_nombre: "Lectura", p_descripcion: null });
});

test("Comunidad real: alias y reglas antes de participar", async ({ page }) => {
  await conSesion(page);
  let estado: "sin_alias" | "sin_reglas" | "abierta" = "sin_alias";
  const llamadas = await simular(page, baseInicial(), {
    mi_impacto_comunidad: () =>
      estado === "sin_alias" ? { __error: "alias:sin_alias", __estado: 409 } : estado === "sin_reglas" ? { __error: "comunidad:sin_reglas", __estado: 409 } : [{ publicaciones: 0, comentarios: 0, reacciones_recibidas: 0 }],
    guardar_alias: () => ((estado = "sin_reglas"), null),
    aceptar_reglas_comunidad: () => ((estado = "abierta"), null),
    comunidad_publicaciones: () => [],
    comunidad_grupos: () => [],
    comunidad_temas: () => [],
    comunidad_desafios: () => [],
  });
  await page.goto("mi-espacio/comunidad/");
  await hidratar(page);
  await page.getByLabel("Tu alias").fill("Caminante");
  await page.getByRole("button", { name: "Guardar alias" }).click();
  await page.getByRole("button", { name: "Acepto las reglas" }).click();
  await expect(page.locator(".co-compositor")).toBeVisible();
  expect(llamadas.find((l) => l.nombre === "guardar_alias")?.cuerpo).toEqual({ p_alias: "Caminante" });
  expect(llamadas.some((l) => l.nombre === "aceptar_reglas_comunidad")).toBe(true);
});

test("Comunidad real: publicaciones, grupos, temas, impacto y desafíos de la base; apoyar, publicar y reportar", async ({ page }) => {
  await conSesion(page);
  const base = baseInicial();
  base.alias = [{ participante_id: "p1", alias: "Ana C" }];
  const llamadas = await simular(page, base, {
    mi_impacto_comunidad: () => [{ publicaciones: 3, comentarios: 5, reacciones_recibidas: 9 }],
    comunidad_publicaciones: () => [PUB("x1")],
    comunidad_grupos: () => [{ id: "gr1", nombre: "Actividad física", descripcion: "Moverse", miembros: 4, soy_miembro: true, ilustracion: "montana", publicaciones: 1 }],
    comunidad_temas: () => [{ tema: "Hábitos", publicaciones: 1 }],
    comunidad_desafios: () => [
      { id: "d1", titulo: "Constancia", descripcion: "Un mes", reglas: "Completa tus acciones del día.", dias: 28, inicio: "2026-10-05", fin: "2026-11-01", ilustracion: "sendero", participantes: 2, participo: true, dias_cumplidos: 3, dias_transcurridos: 9, completado: false },
    ],
    reaccionar_publicacion: () => true,
    publicar_en_comunidad: () => "nueva",
    reportar_publicacion: () => null,
  });
  await page.goto("mi-espacio/comunidad/");
  await hidratar(page);
  const pub = page.locator("article.co-pub").first();
  await expect(pub.locator(".co-pub__alias")).toHaveText("Caminante");
  await expect(pub.locator(".co-pub__meta")).toContainText("En Actividad física");
  await expect(page.getByText("Ejemplo", { exact: true })).toHaveCount(0);
  if (!(await page.locator(".co-col--izq").isVisible())) await page.setViewportSize({ width: 1366, height: 900 });
  await expect(page.locator(".co-col--izq")).toContainText("4 miembros");
  await expect(page.locator(".co-col--izq")).toContainText("2 participantes");
  await expect(page.locator(".co-col--izq")).toContainText("3 de 28 días cumplidos");
  await expect(page.locator(".co-col--der")).toContainText("#Hábitos");
  await expect(page.locator(".co-col--der .co-impacto__numeros dd")).toHaveText(["3", "5", "9"]);
  await expect(page.locator(".co-compositor .co-avatar")).toHaveText("AC");

  await pub.locator(".co-pub__accion--apoyo").click();
  await expect(pub.locator(".co-pub__accion--apoyo")).toHaveAttribute("aria-pressed", "true");
  expect(llamadas.find((l) => l.nombre === "reaccionar_publicacion")?.cuerpo).toEqual({ p_id: "x1" });

  await page.locator(".co-compositor").getByRole("button", { name: "Consejo" }).click();
  await expect(page).toHaveURL(/mi-espacio\/comunidad\/crear\/\?tipo=consejo/);
  await page.getByRole("textbox", { name: /Escribe tu publicación/ }).fill("Partir con poco ayuda #Hábitos");
  await page.getByRole("switch", { name: "Permitir comentarios" }).uncheck();
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.locator(".tostada__texto")).toHaveText("Tu publicación ya está en la comunidad.");
  const cuerpo = llamadas.find((l) => l.nombre === "publicar_en_comunidad")?.cuerpo as Record<string, unknown>;
  expect({ ...cuerpo, p_cliente_id: typeof cuerpo.p_cliente_id }).toEqual({
    p_texto: "Partir con poco ayuda #Hábitos", p_respuesta_a: null, p_grupo: null, p_tipo: "consejo", p_fotos: [], p_permite_comentarios: false, p_cliente_id: "string",
  });

  await pub.getByRole("button", { name: /Más acciones/ }).click();
  await pub.getByRole("button", { name: "Reportar" }).click();
  const reporte = page.getByRole("dialog", { name: "Reportar" });
  await reporte.getByRole("radio", { name: "Expone datos personales" }).check();
  await reporte.getByRole("button", { name: "Enviar reporte" }).click();
  await expect(reporte).toBeHidden();
  expect(llamadas.find((l) => l.nombre === "reportar_publicacion")?.cuerpo).toEqual({ p_id: "x1", p_motivo: "privacidad", p_detalle: null });
  await sinViolaciones(page);
});

test("Comunidad real: el límite de 20 publicaciones al día se explica sin perder el texto", async ({ page }) => {
  await conSesion(page);
  await simular(page, baseInicial(), {
    mi_impacto_comunidad: () => [{ publicaciones: 0, comentarios: 0, reacciones_recibidas: 0 }],
    comunidad_publicaciones: () => [],
    comunidad_grupos: () => [],
    comunidad_temas: () => [],
    comunidad_desafios: () => [],
    publicar_en_comunidad: () => ({ __error: "comunidad:demasiadas", __estado: 429 }),
  });
  await page.goto("mi-espacio/comunidad/");
  await hidratar(page);
  await page.locator(".co-compositor__invitacion").click();
  const texto = page.getByRole("textbox", { name: /Escribe tu publicación/ });
  await texto.fill("Una más");
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByRole("alert")).toContainText("20 publicaciones en 24 horas");
  await expect(texto).toHaveValue("Una más");
});

test("Crear publicación real: las fotos suben a la carpeta propia, en orden, y se borran si la base rechaza", async ({ page }) => {
  await conSesion(page);
  let rechazar = false;
  const llamadas = await simular(page, baseInicial(), {
    mi_impacto_comunidad: () => [{ publicaciones: 0, comentarios: 0, reacciones_recibidas: 0 }],
    comunidad_publicaciones: () => [],
    comunidad_grupos: () => [
      { id: "gr1", nombre: "Actividad física", descripcion: null, miembros: 4, soy_miembro: true, ilustracion: null, publicaciones: 0 },
      { id: "gr2", nombre: "Ajeno", descripcion: null, miembros: 4, soy_miembro: false, ilustracion: null, publicaciones: 0 },
    ],
    comunidad_temas: () => [],
    comunidad_desafios: () => [],
    publicar_en_comunidad: () => (rechazar ? { __error: "foto:ruta_invalida", __estado: 400 } : "nueva"),
  });
  const subidas: string[] = [];
  const borradas: string[] = [];
  await page.route(`${SUPABASE_URL}/storage/v1/object/**`, async (rt) => {
    const req = rt.request();
    if (req.method() === "DELETE") {
      borradas.push(...((req.postDataJSON() as { prefixes: string[] }).prefixes ?? []));
      return rt.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    subidas.push(new URL(req.url()).pathname.replace(/^.*\/object\/comunidad\//, ""));
    return rt.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ Key: "x" }) });
  });
  await page.goto("mi-espacio/comunidad/crear/");
  await hidratar(page);
  // Solo los grupos a los que pertenece.
  await expect(page.locator(".co-destino__select option")).toHaveText(["Toda la comunidad", "Actividad física"]);
  await page.locator(".co-destino__select").selectOption("gr1");
  await page.getByRole("textbox", { name: /Escribe tu publicación/ }).fill("Con fotos");
  const png = (n: number) => ({ name: `f${n}.png`, mimeType: "image/png", buffer: Buffer.from("89504e470d0a1a0a", "hex") });
  await page.locator('input[type="file"]').setInputFiles([png(1), png(2)]);
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page).toHaveURL(/vista=grupos&grupo=gr1/);
  expect(subidas).toHaveLength(2);
  for (const s of subidas) expect(s).toMatch(/^[^/]+\/[0-9a-f-]{36}\.(png|webp|jpg)$/);
  const cuerpo = llamadas.filter((l) => l.nombre === "publicar_en_comunidad").at(-1)!.cuerpo;
  expect(cuerpo.p_fotos).toEqual(subidas);
  expect(cuerpo.p_grupo).toBe("gr1");

  rechazar = true;
  subidas.length = 0;
  await page.goto("mi-espacio/comunidad/crear/");
  await hidratar(page);
  await page.getByRole("textbox", { name: /Escribe tu publicación/ }).fill("Otra");
  await page.locator('input[type="file"]').setInputFiles([png(3)]);
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByRole("alert")).toContainText("No pudimos subir la foto");
  expect(borradas).toEqual(subidas);
});

test("Mis logros real (C17): todo de la base; recompensas y ranking solo con su función activa", async ({ page }) => {
  await conSesion(page);
  const base = baseInicial();
  base.reconocimientos = [
    { clave: "primer_paso", nombre: "Primer paso", descripcion: "Marcaste tu primera acción.", umbral: null, activo: true },
    { clave: "constancia", nombre: "Constancia", descripcion: "Sostuviste una racha de días seguidos en tu ciclo.", umbral: 5, activo: true },
    { clave: "meta_alcanzada", nombre: "Meta alcanzada", descripcion: "Lograste todos los hitos de una meta.", umbral: null, activo: true },
  ];
  base.alias = [{ participante_id: "p1", alias: "Ana C", en_ranking: false }];
  const apagado = { modulo_visible: () => false, mis_beneficios: () => [], mi_beneficio_renovacion: () => [] };
  let llamadas = await simular(page, base, apagado);
  await page.goto("mi-espacio/logros/");
  await hidratar(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mis logros");
  await expect(page.getByText("Ejemplo", { exact: true })).toHaveCount(0);
  await expect(page.locator(".ml-cifra")).toHaveText("3 créditos acumulados");
  await expect(page.locator(".ml-nivel__nombre")).toHaveText("Inicio");
  // Módulos sin habilitar y beneficio apagado: ni reconocimientos, ni recompensas, ni ranking.
  await expect(page.locator(".ml-cifra")).toBeVisible();
  await expect.poll(() => llamadas.filter((l) => l.nombre === "modulo_visible").length).toBe(2);
  await expect(page.getByRole("heading", { name: "Mis reconocimientos" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Mis recompensas" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Ranking/ })).toHaveCount(0);
  expect(llamadas.some((l) => l.nombre === "mis_reconocimientos" || l.nombre === "ranking_semanal")).toBe(false);

  // Habilitados: aparecen solos, con lo que dice la base.
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await conSesion(page);
  const ranking = [
    { puesto: 1, alias_publico: "Sol", cumplimiento: 100, soy_yo: false },
    { puesto: 2, alias_publico: "Ana C", cumplimiento: 80, soy_yo: true },
    { puesto: 3, alias_publico: "Río", cumplimiento: 60, soy_yo: false },
  ];
  llamadas = await simular(page, base, {
    modulo_visible: () => true,
    mis_reconocimientos: () => [{ clave: "primer_paso", nombre: "Primer paso", descripcion: "x", referencia: "unico", otorgado_en: "2026-10-05T15:00:00Z" }],
    mi_beneficio_renovacion: () => [{ nombre: "10 % en tu próxima renovación", descripcion: "Por completar todas las acciones programadas de tu ciclo de 28 días.", porcentaje: 10, dias_ciclo: 28 }],
    mis_beneficios: () => [],
    participar_en_ranking: (c) => {
      base.alias[0].en_ranking = c.p_participar;
      return null;
    },
    ranking_semanal: () => ranking,
  });
  await page.goto("mi-espacio/logros/");
  await hidratar(page);
  const rec = page.locator(".ml-reconocimientos");
  await expect(rec.locator(".ml-insignia")).toHaveCount(3);
  await expect(rec.locator('[data-clave="primer_paso"]')).toHaveAttribute("data-estado", "conseguido");
  await expect(rec.locator('[data-clave="primer_paso"] time')).toHaveText("Conseguido el 5 de octubre");
  // Umbral de la base (5), no el del ejemplo.
  await expect(rec.locator('[data-clave="constancia"]')).toContainText("Completa todas tus acciones 5 días seguidos.");
  // Racha en curso: en progreso, con barra sobre el umbral de la base.
  await expect(rec.locator('[data-clave="constancia"]')).toHaveAttribute("data-estado", "progreso");
  await expect(rec.locator('[data-clave="constancia"]').getByRole("progressbar")).toHaveAttribute("aria-valuemax", "5");
  // Ningún hito logrado: por desbloquear, sin barra y con cómo conseguirlo.
  const meta = rec.locator('[data-clave="meta_alcanzada"]');
  await expect(meta).toHaveAttribute("data-estado", "bloqueado");
  await expect(meta.locator(".ml-insignia__estado")).toHaveText("Por desbloquear");
  await expect(meta).toContainText("Logra todos los hitos de una de tus metas.");
  await expect(meta.getByRole("progressbar")).toHaveCount(0);
  await expect(page.locator(".ml-recompensas")).toContainText("10 % de descuento");
  await expect(page.locator(".ml-recompensas")).toContainText("1/16 acciones");
  await expect(page.locator(".ml-recompensas")).toContainText("En este ciclo quedó alguna acción sin hacer.");
  await page.locator(".ml-ranking").getByRole("button", { name: "Quiero participar" }).click();
  await expect.poll(() => llamadas.find((l) => l.nombre === "participar_en_ranking")?.cuerpo).toEqual({ p_participar: true });
  expect(llamadas.some((l) => l.nombre === "guardar_alias")).toBe(false);
  await expect(page.locator(".ml-ranking")).toContainText("La semana pasada quedaste en el puesto 2 de 3, con 80 % de tus acciones.");
  await expect(page.locator(".ml-ranking")).toContainText("Participas como «Ana C».");
});

test("Mis logros real (C17) con datos: 10 niveles, créditos, rachas, 4 semanas, metas y los 6 reconocimientos", async ({ page }) => {
  await conSesion(page);
  const base = baseInicial();
  // Ocho días seguidos con todo hecho (5 al 12 de octubre); hoy es el 13.
  const dias = Array.from({ length: 8 }, (_, i) => sumar("2026-10-05", i));
  base.registros = dias.map((f) => ({ ocurrencia_id: `o-${f}`, participante_id: "p1", estado: "hecha", version: "completa", explicacion: null, nota_revision: null, revisado_en: null }));
  base.progreso_diario = dias.map((f, i) => ({ participante_id: "p1", fecha: f, programadas: 1, hechas: 1, en_revision: 0, creditos_acciones: 1, bono: 2, racha: i + 1, en_suspenso: false }));
  base.progreso = [{ participante_id: "p1", creditos: 30, nivel: 3, racha: 8, bono_siguiente: 3 }];
  base.metas[0].hitos = [
    { texto: "Índice aprobado", logrado: true },
    { texto: "Primer capítulo", logrado: false },
  ];
  base.reconocimientos = [
    ["primer_paso", "Primer paso", null],
    ["primera_semana", "Primera semana", null],
    ["constancia", "Constancia", 7],
    ["mitad_del_camino", "Mitad del camino", 50],
    ["ciclo_completado", "Ciclo completado", null],
    ["meta_alcanzada", "Meta alcanzada", null],
  ].map(([clave, nombre, umbral]) => ({ clave, nombre, descripcion: "x", umbral, activo: true }));
  const otorgado = (clave: string, fecha: string) => ({ clave, nombre: clave, descripcion: "x", referencia: "unico", otorgado_en: `${fecha}T15:00:00Z` });
  // Solo «reconocimientos» habilitado; el 10 % y el ranking siguen apagados.
  const llamadas = await simular(page, base, {
    modulo_visible: (c) => c.p_clave === "reconocimientos",
    mis_reconocimientos: () => [otorgado("primer_paso", "2026-10-05"), otorgado("constancia", "2026-10-11"), otorgado("primera_semana", "2026-10-12")],
    mis_beneficios: () => [],
    mi_beneficio_renovacion: () => [],
  });
  await page.goto("mi-espacio/logros/");
  await hidratar(page);

  // Nivel y créditos de la base.
  await expect(page.locator(".ml-cifra")).toHaveText("30 créditos acumulados");
  await expect(page.locator(".ml-nivel__nombre")).toHaveText("Ritmo");
  await expect(page.locator(".ml-nivel__actual")).toContainText("Nivel 3");
  await page.getByRole("button", { name: "Ver los 10 niveles" }).click();
  const hoja = page.getByRole("dialog");
  await expect(hoja.locator("ol li")).toHaveCount(10);
  await expect(hoja.locator("li[aria-current]")).toContainText("Ritmo");
  await hoja.getByRole("button", { name: "Cerrar" }).click();

  // Rachas: actual y mejor del ciclo.
  const cajas = page.locator(".ml-constancia .ml-caja__n, section.ml-tarjeta .ml-caja__n");
  await expect(cajas.first()).toHaveText("8 días");
  await expect(cajas.nth(1)).toHaveText("8 días");

  // Evolución: semana 1 completa, semana 2 en curso (cuenta hasta hoy), 3 y 4 por venir; esta semana 1 de 7.
  const semanas = page.locator(".ml-semanas__lista li");
  await expect(semanas).toHaveCount(4);
  await expect(semanas.nth(0)).toContainText("100 %");
  await expect(semanas.nth(1)).toContainText("50 %"); // 12 hecha; 13 (hoy) todavía no
  await expect(semanas.nth(2)).toContainText("—");
  await expect(page.locator(".ml-esta-semana__cifra")).toHaveText("1 de 7");

  // Metas: avance e hitos reales.
  const meta = page.locator(".ml-metas .me-meta");
  await expect(meta).toHaveCount(1);
  await expect(meta).toContainText("Terminar mi tesis");
  await expect(meta.locator(".me-hitos li")).toHaveCount(2);

  // Los 6 reconocimientos con su estado.
  const rec = page.locator(".ml-reconocimientos .ml-insignia");
  await expect(rec).toHaveCount(6);
  const estado = (c: string) => page.locator(`.ml-insignia[data-clave="${c}"]`);
  await expect(estado("primer_paso")).toHaveAttribute("data-estado", "conseguido");
  await expect(estado("primer_paso").locator("time")).toHaveText("Conseguido el 5 de octubre");
  await expect(estado("constancia").locator("time")).toHaveText("Conseguido el 11 de octubre");
  await expect(estado("primera_semana").locator("time")).toHaveText("Conseguido el 12 de octubre");
  await expect(estado("mitad_del_camino")).toHaveAttribute("data-estado", "progreso");
  await expect(estado("mitad_del_camino")).toContainText("Llevas 89 % · se pide 50 %");
  await expect(estado("ciclo_completado")).toContainText("Día 9 de 28");
  await expect(estado("meta_alcanzada")).toContainText("1 de 2 hitos");

  // Recompensas y ranking siguen ocultos.
  await expect(page.getByRole("heading", { name: "Mis recompensas" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Ranking/ })).toHaveCount(0);
  expect(llamadas.some((l) => l.nombre === "ranking_semanal")).toBe(false);
});
