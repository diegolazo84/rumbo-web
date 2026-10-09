// Panel real de Diego (etapa 3, plataforma 5): acceso con segundo factor TOTP (aal2), Hoy con la
// cola real, ficha de solicitud (acuerdo, cerrar, nuevo enlace, crear su espacio), constructor
// (metas, acciones, guardar y publicar), revisión semanal, ajustes, fotos y Más. Solo corre con
// el interruptor encendido (MI_ESPACIO_PROPIO=1). Supabase nunca se toca: page.route responde
// Auth y PostgREST con una base en memoria; sin aal2 no se ve ninguna fila (como 02-rls.sql) y
// las RPC de admin responden «sesion:no_autorizado». Las políticas de verdad las prueba la base
// local de CI (pruebas/base/rls.mjs).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Request, type Route } from "@playwright/test";
import { operacion } from "../src/data/rumbo";
import { SUPABASE_URL } from "../src/lib/supabase-config";

const ETIQUETAS_AXE = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const CLAVE_SESION = "rumbo-sesion";
const AHORA = new Date("2026-10-13T15:00:00Z"); // martes 13 de octubre, mediodía en Chile
const UID = "00000000-0000-4000-8000-0000000000d1";
const EXP = 4102444800; // 2100: la sesión simulada no vence con el reloj fijo

const hidratar = (page: Page) => page.waitForFunction(() => document.documentElement.classList.contains("hidratado"));
async function sinViolaciones(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}

// ---------------------------------------------------------------------------
// Base en memoria

type Fila = Record<string, unknown>;
type Base = Record<string, Fila[]>;

function ocurrenciasDe(participante: string, ciclo: string, programa: string, desde: string, dias: number): Fila[] {
  const r: Fila[] = [];
  for (let i = 0; i < dias; i++) {
    const f = new Date(`${desde}T12:00:00Z`);
    f.setUTCDate(f.getUTCDate() + i);
    const fecha = f.toISOString().slice(0, 10);
    r.push({
      id: `o-${fecha}`,
      participante_id: participante,
      ciclo_id: ciclo,
      programa_id: programa,
      accion_id: "a1",
      meta_clave: "k1",
      meta_titulo: "Terminar mi tesis",
      categoria: "proyecto",
      fecha,
      hora: "08:00:00",
      duracion_min: 30,
      titulo: "Escribir 30 minutos",
      instrucciones: "Abre el documento.\nEscribe sin corregir.",
      version_corta: null,
      requiere_foto: false,
      vigente: true,
    });
  }
  return r;
}

function baseInicial(): Base {
  return {
    solicitudes: [
      {
        id: "s1",
        creada_en: "2026-10-12T14:20:00Z",
        tipo: "solicitud",
        nombre: "Valeria",
        correo: "valeria@correo.cl",
        area_id: "organizacion",
        meta: "Quiero ordenar mi semana para llegar con energía al trabajo y a mis estudios.",
        apoyo: "coach",
        dias: ["lun", "jue"],
        franjas: ["tarde"],
        horarios_nota: null,
        zona_horaria: "America/Santiago",
        avisos_futuros: false,
        estado: "recibida",
        motivo_cierre: null,
        nota_cierre: null,
        responder_antes: "2026-10-14",
        respondida_en: null,
        acuerdo: null,
        condiciones_aceptadas: null,
        origen: { area: "organizacion" },
        posible_spam: false,
        posible_duplicado: false,
        duplicado_de: null,
        notas_internas: null,
        participante_id: null,
      },
      {
        id: "s2",
        creada_en: "2026-10-01T13:00:00Z",
        tipo: "solicitud",
        nombre: "Tomás",
        correo: "tomas@correo.cl",
        area_id: "estudio",
        meta: "Tengo exámenes en diciembre y quiero llegar con las materias repasadas.",
        apoyo: "cercano",
        dias: [],
        franjas: [],
        horarios_nota: null,
        zona_horaria: "America/Santiago",
        avisos_futuros: true,
        estado: "acordada",
        motivo_cierre: null,
        nota_cierre: null,
        responder_antes: "2026-10-05",
        respondida_en: "2026-10-02T12:00:00Z",
        acuerdo: { plan: "cercano", precio_clp: 60000, inicio: "2026-10-19", semanas: 4, dia_revision: 3, hora_videollamada: "19:00" },
        condiciones_aceptadas: { version: "1.0", fecha: "2026-10-10T12:00:00Z" },
        origen: null,
        posible_spam: false,
        posible_duplicado: false,
        duplicado_de: null,
        notas_internas: "Prefiere tardes.",
        participante_id: null,
      },
    ],
    participantes: [
      { id: "p1", user_id: "u-ana", correo: "ana@correo.cl", nombre: "Ana Pérez", nombre_preferido: "Ana", estado: "activo", zona_horaria: "America/Santiago", solicitud_id: null, creado_en: "2026-10-01T12:00:00Z" },
      { id: "p2", user_id: null, correo: "bruno@correo.cl", nombre: "Bruno Díaz", nombre_preferido: null, estado: "invitado", zona_horaria: "America/Santiago", solicitud_id: null, creado_en: "2026-10-09T12:00:00Z" },
    ],
    ciclos: [
      // Ana: semana 2, revisión los martes (hoy).
      { id: "c1", participante_id: "p1", numero: 1, plan_id: "coach", inicio: "2026-10-05", semanas: 4, fin: "2026-11-01", dia_revision: 2, hora_videollamada: null, estado: "activo", pausa_motivo: null, pausa_desde: null, pausa_hasta: null, foco_inicial: null },
      // Bruno: empieza el lunes 19, sin programa todavía.
      { id: "c2", participante_id: "p2", numero: 1, plan_id: "coach", inicio: "2026-10-19", semanas: 4, fin: "2026-11-15", dia_revision: 4, hora_videollamada: null, estado: "activo", pausa_motivo: null, pausa_desde: null, pausa_hasta: null, foco_inicial: null },
    ],
    programas: [{ id: "g1", ciclo_id: "c1", participante_id: "p1", version: 1, estado: "publicado", nota_cambios: null, vigente_desde: "2026-10-05", publicado_en: "2026-10-02T12:00:00Z" }],
    metas: [{ id: "m1", programa_id: "g1", participante_id: "p1", clave: "k1", titulo: "Terminar mi tesis", para_que: null, categoria: "proyecto", hitos: [], orden: 0 }],
    acciones: [
      { id: "a1", programa_id: "g1", meta_id: "m1", titulo: "Escribir 30 minutos", instrucciones: "Abre el documento.", version_corta: null, hora: "08:00:00", duracion_min: 30, dias: [1, 2, 3, 4, 5, 6, 7], semana_desde: 1, semanas: 4, requiere_foto: false, orden: 0 },
    ],
    ocurrencias: ocurrenciasDe("p1", "c1", "g1", "2026-10-05", 14),
    registros: [
      { id: "r1", ocurrencia_id: "o-2026-10-12", participante_id: "p1", estado: "hecha", version: "completa", foto_ruta: null, explicacion: null, nota_revision: null, creado_en: "2026-10-12T20:00:00Z" },
      { id: "r9", ocurrencia_id: "o-2026-10-08", participante_id: "p1", estado: "en_revision", version: "completa", foto_ruta: null, explicacion: "No pude sacar foto, lo escribí a mano en mi cuaderno.", nota_revision: null, creado_en: "2026-10-08T20:00:00Z" },
    ],
    progreso_diario: [{ participante_id: "p1", fecha: "2026-10-12", programadas: 1, hechas: 1, en_revision: 0, creditos_acciones: 1, bono: 2, racha: 1, en_suspenso: false }],
    registros_semanales: [{ participante_id: "p1", ciclo_id: "c1", semana: 1, carga: "justa", funciono: "Escribir temprano.", costo: null, cambiar: null, enviado_en: "2026-10-11T20:00:00Z" }],
    revisiones: [
      { id: "rv1", participante_id: "p1", ciclo_id: "c1", semana: 1, tipo: "escrita", que_funciono: "Escribir temprano.", que_ajustamos: null, foco: "Seguir igual.", iniciada_en: "2026-10-06T18:00:00Z", publicada_en: "2026-10-06T20:00:00Z" },
    ],
    solicitudes_ajuste: [
      { id: "aj1", participante_id: "p1", ciclo_id: "c1", creada_en: "2026-10-12T21:00:00Z", tipo: "carga", ocurrencias: [], desde: "2026-10-13", texto: "Esta semana tengo pruebas y no alcanzo todo.", pide_reorden: false, estado: "enviada", respuesta: null, cuenta_como_reorden: false, responder_antes: null, respondida_en: null },
    ],
    mensajes_contacto: [{ id: "msj1", creado_en: "2026-10-11T12:00:00Z", motivo: "duda", nombre: "Luis", correo: "luis@correo.cl", mensaje: "¿Cuándo abren nuevas postulaciones?", estado: "nuevo" }],
    peticiones_derechos: [],
    planes: [
      { id: "coach", reordenes_por_ciclo: 0 },
      { id: "cercano", reordenes_por_ciclo: 2 },
    ],
    ajustes_operacion: [{ id: true, postulaciones_abiertas: true, tope_solicitudes_dia: null, ausencia_hasta: null, ausencia_texto: null }],
    feriados: [{ fecha: "2026-10-12", nombre: "Encuentro de Dos Mundos" }],
  };
}

// Filtros de PostgREST que usa el panel: eq, neq, in.
function filtrar(filas: Fila[], q: URLSearchParams) {
  let r = filas;
  for (const [col, valor] of q) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(col)) continue;
    const [op, ...resto] = valor.split(".");
    const v = resto.join(".");
    if (op === "eq") r = r.filter((f) => String(f[col]) === v);
    else if (op === "neq") r = r.filter((f) => String(f[col]) !== v);
    else if (op === "in") {
      const lista = v.replace(/^\(|\)$/g, "").split(",").map((x) => x.replace(/^"|"$/g, ""));
      r = r.filter((f) => lista.includes(String(f[col])));
    }
  }
  return r;
}

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const aalDe = (req: Request) => {
  const jwt = (req.headers()["authorization"] ?? "").replace(/^Bearer /, "");
  try {
    return JSON.parse(Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString()).aal as string;
  } catch {
    return "anon";
  }
};

type Factor = { id: string; factor_type: "totp"; status: "verified" | "unverified"; friendly_name: string; created_at: string; updated_at: string };
const factor = (id: string, status: Factor["status"], n: number): Factor => ({
  id,
  factor_type: "totp",
  status,
  friendly_name: `TOTP ${n}`,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
});

function sesion(aal: "aal1" | "aal2", factores: Factor[]) {
  return {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: UID, role: "authenticated", aal, amr: [{ method: aal === "aal2" ? "totp" : "otp", timestamp: 1 }], exp: EXP, aud: "authenticated" })}.firma0`,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: EXP,
    refresh_token: "renovar",
    user: { id: UID, aud: "authenticated", role: "authenticated", email: "diego@correo.cl", app_metadata: {}, user_metadata: {}, created_at: "2026-10-01T00:00:00Z", factors: factores },
  };
}

type Llamada = { tipo: "rpc" | "tabla" | "auth"; metodo: string; nombre: string; url: string; cuerpo: unknown; aal: string };

const ADMIN = new Set(["crear_espacio", "nuevo_enlace_solicitud", "nuevo_borrador", "solapamientos", "carga_prevista", "publicar_programa", "revisar_evidencia", "pausar_ciclo", "reanudar_ciclo", "eliminar_participante"]);

async function simular(page: Page, base: Base, { equipo = true, factores = [] as Factor[] } = {}) {
  const llamadas: Llamada[] = [];
  const auth = { factores: [...factores] };
  const rpc: Record<string, (c: Record<string, unknown>) => unknown> = {
    soy_equipo: () => equipo,
    crear_espacio: (c) => {
      const s = base.solicitudes.find((x) => x.id === c.p_solicitud)!;
      s.estado = "con_espacio";
      s.participante_id = "p3";
      base.participantes.push({ id: "p3", user_id: null, correo: s.correo, nombre: s.nombre, nombre_preferido: null, estado: "invitado", zona_horaria: "America/Santiago", solicitud_id: s.id, creado_en: AHORA.toISOString() });
      base.ciclos.push({ id: "c3", participante_id: "p3", numero: 1, plan_id: "cercano", inicio: "2026-10-19", semanas: 4, fin: "2026-11-15", dia_revision: 3, hora_videollamada: "19:00:00", estado: "activo", pausa_motivo: null, pausa_desde: null, pausa_hasta: null, foco_inicial: null });
      return "p3";
    },
    nuevo_enlace_solicitud: () => null,
    nuevo_borrador: (c) => {
      base.programas.push({ id: "g3", ciclo_id: c.p_ciclo, participante_id: "p2", version: 1, estado: "borrador", nota_cambios: null, vigente_desde: null, publicado_en: null });
      return "g3";
    },
    solapamientos: () => [],
    carga_prevista: () => [{ fecha: "2026-10-19", minutos: 20 }],
    publicar_programa: (c) => {
      const g = base.programas.find((x) => x.id === c.p_programa)!;
      g.estado = "publicado";
      g.publicado_en = AHORA.toISOString();
      return 4;
    },
    revisar_evidencia: (c) => {
      const r = base.registros.find((x) => x.id === c.p_registro)!;
      r.estado = c.p_aprobar ? "aprobada" : "rechazada";
      return null;
    },
  };
  const responder = (rt: Route, status: number, cuerpo?: unknown) =>
    rt.fulfill({ status, contentType: "application/json", body: cuerpo === undefined ? "" : JSON.stringify(cuerpo) });

  await page.route(`${SUPABASE_URL}/rest/v1/**`, async (rt: Route) => {
    const req = rt.request();
    const url = new URL(req.url());
    const partes = url.pathname.split("/").filter(Boolean);
    const aal = aalDe(req);
    const metodo = req.method();
    const cuerpo = req.postData() ? req.postDataJSON() : null;
    if (partes[2] === "rpc") {
      const nombre = partes[3];
      llamadas.push({ tipo: "rpc", metodo, nombre, url: req.url(), cuerpo, aal });
      if (ADMIN.has(nombre) && aal !== "aal2") return responder(rt, 403, { code: "PT403", message: "sesion:no_autorizado" });
      const f = rpc[nombre];
      if (!f) return responder(rt, 404, { code: "PGRST202", message: "sin simular" });
      return responder(rt, 200, f((cuerpo ?? {}) as Record<string, unknown>) ?? null);
    }
    const tabla = partes[2];
    llamadas.push({ tipo: "tabla", metodo, nombre: tabla, url: req.url(), cuerpo, aal });
    base[tabla] ??= [];
    // Sin aal2, las políticas no muestran ni dejan escribir nada (02-rls.sql).
    const filas = aal === "aal2" ? base[tabla] : [];
    if (metodo === "GET") {
      const r = filtrar(filas, url.searchParams);
      const unObjeto = (req.headers()["accept"] ?? "").includes("vnd.pgrst.object");
      return responder(rt, 200, unObjeto ? (r[0] ?? null) : r);
    }
    if (aal !== "aal2") return responder(rt, 403, { code: "42501", message: "permission denied" });
    if (metodo === "PATCH") {
      for (const f of filtrar(filas, url.searchParams)) Object.assign(f, cuerpo);
      return responder(rt, 204);
    }
    if (metodo === "DELETE") {
      const quitar = new Set(filtrar(filas, url.searchParams));
      base[tabla] = filas.filter((f) => !quitar.has(f));
      return responder(rt, 204);
    }
    if (metodo === "POST") {
      const conflicto = (url.searchParams.get("on_conflict") ?? "id").split(",");
      const ignorar = (req.headers()["prefer"] ?? "").includes("ignore-duplicates");
      for (const nueva of (Array.isArray(cuerpo) ? cuerpo : [cuerpo]) as Fila[]) {
        const existe = base[tabla].find((f) => conflicto.every((k) => String(f[k]) === String(nueva[k])));
        if (existe && !ignorar) Object.assign(existe, nueva);
        else if (!existe) base[tabla].push({ ...nueva });
      }
      return responder(rt, 201);
    }
    return responder(rt, 405, {});
  });

  await page.route(`${SUPABASE_URL}/auth/v1/**`, async (rt: Route) => {
    const req = rt.request();
    const ruta = new URL(req.url()).pathname.replace(/^\/auth\/v1\//, "");
    const cuerpo = req.postData() ? req.postDataJSON() : null;
    llamadas.push({ tipo: "auth", metodo: req.method(), nombre: ruta, url: req.url(), cuerpo, aal: aalDe(req) });
    if (ruta === "user") return responder(rt, 200, { ...sesion("aal1", auth.factores).user });
    if (ruta === "logout") return rt.fulfill({ status: 204, body: "" });
    if (ruta === "factors" && req.method() === "POST") {
      const f = factor(`f${auth.factores.length + 1}`, "unverified", auth.factores.length + 1);
      auth.factores.push(f);
      return responder(rt, 200, { id: f.id, type: "totp", friendly_name: f.friendly_name, totp: { qr_code: "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'></svg>", secret: "JBSWY3DPEHPK3PXP", uri: "otpauth://totp/Rumbo" } });
    }
    const m = /^factors\/([^/]+)(?:\/(challenge|verify))?$/.exec(ruta);
    if (m && m[2] === "challenge") return responder(rt, 200, { id: `ch-${m[1]}`, type: "totp", expires_at: EXP });
    if (m && m[2] === "verify") {
      const f = auth.factores.find((x) => x.id === m[1]);
      if (!f || (cuerpo as { code?: string }).code !== "123456") return responder(rt, 422, { code: "mfa_verification_failed", message: "Invalid TOTP code entered" });
      f.status = "verified";
      return responder(rt, 200, sesion("aal2", auth.factores));
    }
    if (m && req.method() === "DELETE") {
      auth.factores = auth.factores.filter((x) => x.id !== m[1]);
      return responder(rt, 200, { id: m[1] });
    }
    return responder(rt, 404, {});
  });
  return llamadas;
}

// Sesión abierta en este dispositivo (como la deja supabase-js) y reloj fijo en el martes 13.
async function preparar(page: Page, aal: "aal1" | "aal2" | null, factores: Factor[] = []) {
  await page.clock.setFixedTime(AHORA);
  if (aal) await page.addInitScript(([clave, valor]) => window.localStorage.setItem(clave, valor), [CLAVE_SESION, JSON.stringify(sesion(aal, factores))] as const);
}

const VERIFICADO = [factor("f1", "verified", 1)];

test.beforeEach(({}, info) => {
  test.skip(!operacion.miEspacioPropio, "solo con Mi espacio propio (MI_ESPACIO_PROPIO=1)");
  test.skip(info.project.name === "iphone", "interacción: basta con Chromium y WebKit en humo");
});

// ---------------------------------------------------------------------------
// Acceso

test("sin sesión, el panel lleva al ingreso", async ({ page }) => {
  await preparar(page, null);
  await simular(page, baseInicial());
  await page.goto("equipo/solicitudes/");
  await expect(page.locator("h1")).toHaveText("Entra a tu espacio.");
});

test("una cuenta que no es del equipo no ve el panel", async ({ page }) => {
  await preparar(page, "aal1");
  const llamadas = await simular(page, baseInicial(), { equipo: false });
  await page.goto("equipo/");
  await expect(page.locator("h1")).toHaveText("Esta cuenta no tiene acceso al panel.");
  expect(llamadas.some((l) => l.tipo === "tabla")).toBe(false);
});

test("sin factores: registra un TOTP (QR y clave), verifica y entra a Hoy", async ({ page }) => {
  await preparar(page, "aal1");
  const llamadas = await simular(page, baseInicial());
  await page.goto("equipo/");
  await expect(page.locator("h1")).toHaveText("Segundo factor.");
  await hidratar(page);
  await expect(page.getByRole("img", { name: "Código QR del factor TOTP" })).toBeVisible();
  await expect(page.getByText("JBSWY3DPEHPK3PXP")).toBeVisible();
  await sinViolaciones(page);
  // Nada del panel se lee antes del segundo factor.
  expect(llamadas.some((l) => l.tipo === "tabla")).toBe(false);

  await page.getByLabel("Código de 6 dígitos").fill("000000");
  await page.getByRole("button", { name: "Verificar" }).click();
  await expect(page.getByText("Ese código no coincide. Revisa la hora de tu teléfono y escribe el código nuevo.")).toBeVisible();

  await page.getByLabel("Código de 6 dígitos").fill("123456");
  await page.getByRole("button", { name: "Verificar" }).click();
  await expect(page.locator("h1")).toHaveText("Hoy.");
  expect(llamadas.find((l) => l.nombre === "factors" && l.metodo === "POST")?.cuerpo).toMatchObject({ factor_type: "totp", friendly_name: "TOTP 1" });
  // Todas las lecturas de tablas van con aal2.
  expect(llamadas.filter((l) => l.tipo === "tabla").every((l) => l.aal === "aal2")).toBe(true);
});

test("con un factor registrado pide el código y luego muestra la cola", async ({ page }) => {
  await preparar(page, "aal1", VERIFICADO);
  await simular(page, baseInicial(), { factores: VERIFICADO });
  await page.goto("equipo/");
  await expect(page.locator("h1")).toHaveText("Segundo factor.");
  await hidratar(page);
  await expect(page.getByRole("img", { name: "Código QR del factor TOTP" })).toHaveCount(0);
  await page.getByLabel("Código de 6 dígitos").fill("123456");
  await page.getByRole("button", { name: "Verificar" }).click();
  await expect(page.locator("h1")).toHaveText("Hoy.");
});

// ---------------------------------------------------------------------------
// Hoy y solicitudes

test("Hoy real: la cola por vencimiento, sin «Ejemplo»", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  await simular(page, baseInicial(), { factores: VERIFICADO });
  await page.goto("equipo/");
  await expect(page.locator("h1")).toHaveText("Hoy.");
  await hidratar(page);
  const tarjetas = page.locator(".pa-cola__tarjeta");
  // Revisión de Ana vence hoy (martes); la solicitud de Valeria, mañana; después, sin plazo.
  await expect(tarjetas.nth(0)).toContainText("Revisión semanal");
  await expect(tarjetas.nth(0)).toContainText("Vence hoy");
  await expect(tarjetas.nth(1)).toContainText("Solicitud sin primera respuesta");
  await expect(tarjetas.nth(1)).toContainText("Valeria");
  await expect(tarjetas.nth(1)).toContainText("Vence mañana");
  await expect(page.getByText("Para tu revisión del martes 13")).toBeVisible();
  await expect(page.getByText("1 por revisar")).toBeVisible();
  await expect(page.getByText("Ejemplo", { exact: true })).toHaveCount(0);
  await sinViolaciones(page);
});

test("ficha de solicitud: abrirla la pasa a «en revisión»; acuerdo y enlace privado", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  const llamadas = await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/solicitud/?id=s1");
  await hidratar(page);
  await expect(page.locator("h1")).toHaveText("Valeria");
  await expect.poll(() => base.solicitudes[0].estado).toBe("en_revision");
  await sinViolaciones(page);

  await page.getByRole("button", { name: "Registrar acuerdo" }).first().click();
  await page.locator("#acuerdo-precio").fill("45000");
  await page.locator("form").filter({ has: page.locator("#acuerdo-precio") }).getByRole("button", { name: "Registrar acuerdo" }).click();
  await expect.poll(() => base.solicitudes[0].estado).toBe("acordada");
  expect(base.solicitudes[0].acuerdo).toEqual({ plan: "coach", precio_clp: 45000, inicio: "2026-10-19", semanas: 4, dia_revision: 4, hora_videollamada: null });
  await expect(page.getByText("La persona todavía no acepta el acuerdo.").first()).toBeVisible();

  await page.getByRole("button", { name: "Nuevo enlace privado" }).click();
  await expect.poll(() => llamadas.filter((l) => l.nombre === "nuevo_enlace_solicitud").length).toBe(1);
  const token = (llamadas.find((l) => l.nombre === "nuevo_enlace_solicitud")!.cuerpo as { p_token: string }).p_token;
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  await expect(page.getByText(`estado/#${token}`)).toBeVisible();
});

test("ficha de solicitud: cerrar con motivo y nota", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/solicitud/?id=s1");
  await hidratar(page);
  await expect(page.locator("h1")).toHaveText("Valeria");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.locator("#cerrar-nota").fill("Gracias por escribirnos.");
  await page.getByRole("button", { name: "Cerrar la solicitud" }).click();
  await expect.poll(() => base.solicitudes[0].estado).toBe("cerrada");
  expect(base.solicitudes[0]).toMatchObject({ motivo_cierre: "capacidad", nota_cierre: "Gracias por escribirnos." });
});

test("acuerdo aceptado: «Crear su espacio» corre crear_espacio", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  const llamadas = await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/solicitud/?id=s2");
  await hidratar(page);
  await expect(page.locator("h1")).toHaveText("Tomás");
  await page.getByRole("button", { name: "Crear su espacio" }).click();
  await expect(page.getByText("Su espacio está creado.", { exact: false })).toBeVisible();
  expect(llamadas.find((l) => l.nombre === "crear_espacio")!.cuerpo).toEqual({ p_solicitud: "s2" });
  await expect(page.getByRole("button", { name: "Abrir su ficha" })).toBeVisible();
});

// ---------------------------------------------------------------------------
// Programa, revisión, ajustes y fotos

test("constructor: crear el borrador, meta y acción, guardar y publicar", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio", "el constructor es de escritorio (5.6)");
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  const llamadas = await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/constructor/?id=p2");
  await hidratar(page);
  await page.getByRole("button", { name: "Crear el borrador" }).click();
  await expect(page.getByText("Borrador · todavía no lo ve")).toBeVisible();
  expect(llamadas.find((l) => l.nombre === "nuevo_borrador")!.cuerpo).toEqual({ p_ciclo: "c2" });

  await page.getByRole("button", { name: "Nueva meta" }).click();
  await page.locator("#meta-titulo").fill("Ordenar mi semana");
  await page.getByRole("button", { name: "Nueva acción" }).click();
  await page.locator("#accion-titulo").fill("Planificar la semana");
  await page.locator('input[name="accion-dias"][value="1"]').check();
  await page.locator("#accion-instrucciones").fill("Abre tu agenda y anota tres prioridades.");
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByText("Borrador guardado.")).toBeVisible();
  expect(base.metas.find((m) => m.titulo === "Ordenar mi semana")).toMatchObject({ programa_id: "g3", participante_id: "p2", categoria: "proyecto", orden: 0 });
  expect(base.acciones.find((a) => a.titulo === "Planificar la semana")).toMatchObject({ programa_id: "g3", dias: [1], duracion_min: 10, semana_desde: 1, semanas: 1 });
  await sinViolaciones(page);

  await page.getByRole("button", { name: "Publicar" }).click();
  const hoja = page.getByRole("dialog");
  await expect(hoja.getByText("La base no encuentra solapamientos.")).toBeVisible();
  await hoja.locator("#pub-foco").fill("Empieza por lo más importante.");
  await hoja.getByRole("button", { name: "Publicar" }).click();
  await expect(hoja.getByText("Programa publicado: 4 acciones fechadas en Mi espacio.")).toBeVisible();
  expect(llamadas.find((l) => l.nombre === "publicar_programa")!.cuerpo).toEqual({
    p_programa: "g3",
    p_vigente_desde: "2026-10-14",
    p_aceptar_solapamientos: false,
    p_nota_cambios: null,
    p_foco_inicial: "Empieza por lo más importante.",
  });
});

test("revisión semanal: abrirla la inicia y publicar guarda los tres campos", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/revision/?id=p1&n=2");
  await hidratar(page);
  await expect(page.locator("h1")).toHaveText("Revisión de Ana · semana 2.");
  const semana2 = () => base.revisiones.find((r) => r.semana === 2);
  await expect.poll(() => !!semana2()).toBe(true);
  expect(semana2()).toMatchObject({ participante_id: "p1", ciclo_id: "c1", tipo: "escrita" });
  await page.getByRole("button", { name: "Publicar revisión" }).click();
  await expect(page.getByText("Escribe qué funcionó.").first()).toBeVisible();
  await page.locator("#rev-funciono").fill("Escribiste cuatro de seis días.");
  await page.locator("#rev-foco").fill("Escribir antes de revisar el correo.");
  await page.getByRole("button", { name: "Publicar revisión" }).click();
  await expect(page.getByText("Revisión publicada. La persona la ve en Mi espacio.")).toBeVisible();
  expect(semana2()).toMatchObject({ que_funciono: "Escribiste cuatro de seis días.", que_ajustamos: null, foco: "Escribir antes de revisar el correo." });
  expect(semana2()!.publicada_en).toBeTruthy();
  await sinViolaciones(page);
});

test("solicitudes de ajuste: abrirlas las pasa a «en revisión» y la respuesta se guarda", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/ajustes/");
  await hidratar(page);
  await expect(page.locator("h1")).toHaveText("Solicitudes de ajuste.");
  await expect.poll(() => base.solicitudes_ajuste[0].estado).toBe("en_revision");
  await page.locator("#aj-aj1-respuesta").fill("Movemos la acción del jueves al sábado.");
  await page.getByRole("button", { name: "Responder" }).click();
  await expect.poll(() => base.solicitudes_ajuste[0].estado).toBe("respondida");
  expect(base.solicitudes_ajuste[0]).toMatchObject({ respuesta: "Movemos la acción del jueves al sábado.", cuenta_como_reorden: false });
});

test("fotos y explicaciones: aprobar corre revisar_evidencia", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  const llamadas = await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/revisar/");
  await hidratar(page);
  await expect(page.getByText("No pude sacar foto, lo escribí a mano en mi cuaderno.")).toBeVisible();
  await page.getByRole("button", { name: "Aprobar", exact: true }).click();
  await expect(page.getByText("Aprobada · +1 crédito")).toBeVisible();
  expect(llamadas.find((l) => l.nombre === "revisar_evidencia")!.cuerpo).toEqual({ p_registro: "r9", p_aprobar: true, p_nota: null });
});

test("ficha de participante: programa publicado y semana en solo lectura", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  await simular(page, baseInicial(), { factores: VERIFICADO });
  await page.goto("equipo/participante/?id=p1");
  await hidratar(page);
  await expect(page.locator("h1")).toHaveText("Ana");
  await expect(page.getByText("Semana 2 de 4")).toBeVisible();
  await expect(page.getByText("Escribir 30 minutos").first()).toBeVisible();
  await page.getByRole("tab", { name: "Semana" }).click();
  await expect(page.getByText("Esta semana registró 1 de 2 acciones programadas hasta hoy.")).toBeVisible();
  await sinViolaciones(page);
});

test("Más: postulaciones y cuenta con sus factores", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/mas/");
  await hidratar(page);
  await expect(page.locator("h1")).toHaveText("Más.");
  await expect(page.getByText("TOTP 1. 1 registrado. Deben ser 2.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Registrar otro factor" })).toBeVisible();
  await page.getByRole("switch", { name: "Recibir solicitudes" }).uncheck();
  const seccion = page.locator("section", { has: page.locator("#postulaciones-titulo") });
  await seccion.getByRole("button", { name: "Guardar" }).click();
  await expect.poll(() => base.ajustes_operacion[0].postulaciones_abiertas).toBe(false);
  await expect(seccion.getByText("Guardado.")).toBeVisible();
});
