// Panel real de Diego (etapa 3, plataforma 5): acceso con segundo factor TOTP (aal2), Hoy con la
// cola real, ficha de solicitud (acuerdo, cerrar, nuevo enlace, crear su espacio), constructor
// (metas, acciones, guardar y publicar), revisión semanal, ajustes, fotos y Más. Solo corre con
// el interruptor encendido (MI_ESPACIO_PROPIO=1). Supabase nunca se toca: page.route responde
// Auth y PostgREST con una base en memoria; sin aal2 no se ve ninguna fila (como migrations/20261008000002_rls.sql) y
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
    // Comunidad (C6 a C9): una publicación con dos reportes abiertos, una oculta, un grupo y un desafío.
    publicaciones: [
      { id: "pub1", texto: "Compren mis suplementos, link en mi perfil.", tipo: "general", estado: "visible", respuesta_a: null, foto_ruta: null, creada_en: "2026-10-12T15:00:00Z", moderacion_motivo: null, moderada_en: null },
      { id: "pub2", texto: "Un comentario fuera de tono.", tipo: "general", estado: "oculta", respuesta_a: "pub1", foto_ruta: null, creada_en: "2026-10-11T15:00:00Z", moderacion_motivo: "respeto", moderada_en: "2026-10-11T18:00:00Z" },
    ],
    reportes_comunidad: [
      { id: "rep1", publicacion_id: "pub1", motivo: "spam", detalle: "Vende productos.", creado_en: "2026-10-12T16:00:00Z", resuelto_en: null },
      { id: "rep2", publicacion_id: "pub1", motivo: "salud", detalle: null, creado_en: "2026-10-12T17:00:00Z", resuelto_en: null },
    ],
    grupos_comunidad: [{ id: "gr1", nombre: "Estudio", descripcion: "Para quienes estudian.", ilustracion: "brote", activo: true, categoria: null, destacado: false }],
    propuestas_grupo: [{ id: "pg1", nombre: "Lectura", descripcion: "Para leer un poco cada día.", alias: "Brote Sereno", estado: "pendiente", creada_en: "2026-10-21T12:00:00Z" }],
    miembros_grupo: [{ grupo_id: "gr1" }, { grupo_id: "gr1" }],
    desafios: [{ id: "de1", titulo: "Semana de constancia", descripcion: null, reglas: "Haz todas tus acciones programadas cada día.", dias: 7, inicio: "2026-10-19", ilustracion: null, activo: true }],
    participaciones_desafio: [{ desafio_id: "de1" }],
    modulos: [
      { clave: "comunidad", nombre: "Comunidad con foro moderado", estado: "probado", probado_en: "2026-10-21T12:00:00Z", respaldo: null, que_falta: "Reglas y privacidad", orden: 1, cambiado_en: "2026-10-21T12:00:00Z" },
      { clave: "ranking", nombre: "Ranking semanal voluntario", estado: "planificado", probado_en: null, respaldo: null, que_falta: "Requiere la comunidad", orden: 2, cambiado_en: "2026-10-21T12:00:00Z" },
    ],
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
    else if (op === "is" && v === "null") r = r.filter((f) => f[col] === null || f[col] === undefined);
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

const ADMIN = new Set(["cambiar_modulo", "propuestas_grupo_equipo", "responder_propuesta_grupo", "moderar_publicacion", "guardar_grupo_comunidad", "guardar_desafio", "crear_espacio", "nuevo_enlace_solicitud", "nuevo_borrador", "solapamientos", "carga_prevista", "publicar_programa", "revisar_evidencia", "pausar_ciclo", "reanudar_ciclo", "eliminar_participante"]);

async function simular(page: Page, base: Base, { equipo = true, factores = [] as Factor[] } = {}) {
  const llamadas: Llamada[] = [];
  const auth = { factores: [...factores] };
  const rpc: Record<string, (c: Record<string, unknown>) => unknown> = {
    soy_equipo: () => equipo,
    mi_rol_equipo: () => (equipo ? { rol: "dueno", puede_moderar: true } : null),
    moderar_publicacion: (c) => {
      const p = base.publicaciones.find((x) => x.id === c.p_id)!;
      p.estado = c.p_ocultar ? "oculta" : "visible";
      p.moderacion_motivo = c.p_ocultar ? c.p_motivo : null;
      p.moderada_en = AHORA.toISOString();
      for (const r of base.reportes_comunidad.filter((x) => x.publicacion_id === c.p_id && !x.resuelto_en)) r.resuelto_en = AHORA.toISOString();
      return null;
    },
    // Las mismas reglas que la base (A4): no se habilita sin «probado»; «operativo» con respaldo.
    cambiar_modulo: (c) => {
      const m = base.modulos.find((x) => x.clave === c.p_clave)!;
      if (["habilitado", "operativo"].includes(String(c.p_estado)) && !m.probado_en) return { __error: "estado:sin_probar", __estado: 409 };
      if (c.p_estado === "operativo" && !c.p_respaldo && !m.respaldo) return { __error: "respaldo:requerido", __estado: 400 };
      Object.assign(m, {
        estado: c.p_estado,
        probado_en: c.p_estado === "probado" ? (m.probado_en ?? AHORA.toISOString()) : m.probado_en,
        respaldo: c.p_respaldo ?? m.respaldo,
        que_falta: c.p_que_falta === null || c.p_que_falta === undefined ? m.que_falta : String(c.p_que_falta) || null,
        cambiado_en: AHORA.toISOString(),
      });
      return null;
    },
    guardar_grupo_comunidad: (c) => {
      const p = c.p as Fila;
      const g = p.id ? base.grupos_comunidad.find((x) => x.id === p.id)! : (base.grupos_comunidad[base.grupos_comunidad.push({ id: `gr${base.grupos_comunidad.length + 1}` }) - 1] as Fila);
      // Como la base (C13): solo un grupo destacado, y debe estar activo.
      if (p.destacado && !p.activo) return { __error: "destacado:inactivo", __estado: 400 };
      if (p.destacado) for (const x of base.grupos_comunidad) x.destacado = false;
      Object.assign(g, { nombre: p.nombre, descripcion: p.descripcion, ilustracion: p.ilustracion, activo: p.activo, categoria: p.categoria ?? null, destacado: Boolean(p.destacado) });
      return g.id;
    },
    propuestas_grupo_equipo: () => base.propuestas_grupo,
    responder_propuesta_grupo: (c) => {
      const x = base.propuestas_grupo.find((y) => y.id === c.p_id && y.estado === "pendiente");
      if (!x) return { __error: "propuesta:no_encontrada", __estado: 404 };
      x.estado = c.p_estado;
      return null;
    },
    guardar_desafio: (c) => {
      const p = c.p as Fila;
      const x = p.id ? base.desafios.find((y) => y.id === p.id)! : (base.desafios[base.desafios.push({ id: `de${base.desafios.length + 1}` }) - 1] as Fila);
      Object.assign(x, { titulo: p.titulo, descripcion: p.descripcion, reglas: p.reglas, dias: p.dias, inicio: p.inicio, ilustracion: p.ilustracion, activo: p.activo });
      return x.id;
    },
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
      const r = f((cuerpo ?? {}) as Record<string, unknown>) as { __error?: string; __estado?: number } | null;
      if (r && typeof r === "object" && "__error" in r) return responder(rt, r.__estado ?? 400, { code: "P0001", message: r.__error });
      return responder(rt, 200, r ?? null);
    }
    const tabla = partes[2];
    llamadas.push({ tipo: "tabla", metodo, nombre: tabla, url: req.url(), cuerpo, aal });
    base[tabla] ??= [];
    // Sin aal2, las políticas no muestran ni dejan escribir nada (migrations/20261008000002_rls.sql).
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

// Referencia de ChatGPT (21-oct-2026): «Mis participantes» con datos de la plataforma.
test("mis participantes: filtros, progreso de la semana, estado, actividad y revisiones de hoy", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const llamadas = await simular(page, baseInicial(), { factores: VERIFICADO });
  await page.goto("equipo/participantes/");
  await hidratar(page);
  await expect(page.locator("h1")).toHaveText("Mis participantes");
  const filtros = page.getByRole("group", { name: "Filtrar participantes" });
  await expect(filtros.getByRole("button", { name: /Todos/ })).toHaveText("Todos2");
  await expect(filtros.getByRole("button", { name: /Revisión esta semana/ })).toHaveText("Revisión esta semana1");
  await expect(filtros.getByRole("button", { name: /Necesita atención/ })).toHaveText("Necesita atención1");
  await expect(filtros.getByRole("button", { name: /Sin registro/ })).toHaveText("Sin registro0");
  const filas = page.locator(".pa-coach__tabla tbody tr");
  await expect(filas).toHaveCount(2);
  // Ana: semana 2 (12 al 18), 1 de 7 hechas; revisión hoy; ajuste sin responder y evidencia por revisar.
  const ana = filas.filter({ hasText: "Ana" });
  await expect(ana).toContainText("Plan: Con acompañamiento");
  await expect(ana).toContainText("1 de 7");
  await expect(ana).toContainText("Hoy");
  await expect(ana.locator(".pa-estado")).toHaveText("Necesita apoyo");
  await expect(ana).toContainText("ajuste sin responder · evidencia por revisar · no envió su registro semanal");
  await expect(ana.getByRole("link", { name: "Ver a Ana" })).toHaveAttribute("href", /\/equipo\/participante\/\?id=p1$/);
  // Bruno: empieza el 19 y su programa está en preparación.
  const bruno = filas.filter({ hasText: "Bruno" });
  await expect(bruno.locator(".pa-estado")).toHaveText("Programa en preparación");
  await expect(bruno).toContainText("Sin acciones");
  // Sin fotos ni nombres de ejemplo: iniciales.
  await expect(page.locator(".pa-coach img")).toHaveCount(0);
  await expect(ana.locator(".pa-coach__avatar")).toHaveText("A");
  // Filtro y búsqueda.
  await filtros.getByRole("button", { name: /Necesita atención/ }).click();
  await expect(filas).toHaveCount(1);
  await expect(filtros.getByRole("button", { name: /Necesita atención/ })).toHaveAttribute("aria-pressed", "true");
  await filtros.getByRole("button", { name: /Todos/ }).click();
  await page.getByLabel("Buscar participante por nombre").fill("bru");
  await expect(filas).toHaveCount(1);
  await expect(filas.first()).toContainText("Bruno");
  // Actividad reciente: lo que hicieron, con su hora real (Chile).
  const actividad = page.locator(".pa-coach__bloque").filter({ hasText: "Actividad reciente" }).locator("li");
  await expect(actividad.nth(0)).toContainText("Ana envió una solicitud de ajuste");
  await expect(actividad.nth(0)).toContainText("Ayer, 18:00");
  await expect(actividad.nth(1)).toContainText("Ana completó una acción");
  // Revisiones de hoy: la de Ana, con «Iniciar» a su revisión.
  const deHoy = page.locator(".pa-coach__bloque").filter({ hasText: "Revisiones de hoy" }).locator("li");
  await expect(deHoy).toHaveCount(1);
  await expect(deHoy).toContainText("Revisión escrita de Ana");
  await expect(deHoy.getByRole("link", { name: "Iniciar la revisión de Ana" })).toHaveAttribute("href", /\/equipo\/revision\/\?id=p1$/);
  expect(llamadas.some((l) => l.tipo === "tabla" && l.nombre === "ocurrencias")).toBe(true);
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
  // Se guarda solo al completar; «Guardar borrador» lo confirma igual.
  await expect(page.getByText("Borrador guardado.")).toBeVisible();
  // Sin cambios, «Guardar borrador» igual confirma.
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByText("El borrador ya está guardado: no hay cambios pendientes.")).toBeVisible();
  expect(base.metas.find((m) => m.titulo === "Ordenar mi semana")).toMatchObject({ programa_id: "g3", participante_id: "p2", categoria: "proyecto", orden: 0 });
  expect(base.acciones.find((a) => a.titulo === "Planificar la semana")).toMatchObject({ programa_id: "g3", dias: [1], duracion_min: 10, semana_desde: 1, semanas: 4 });
  await sinViolaciones(page);

  await page.getByRole("button", { name: "Publicar" }).click();
  const hoja = page.getByRole("dialog");
  await expect(hoja.getByText("Revisión final: ninguna acción choca de horario con otra.")).toBeVisible();
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
  // Al cerrar, el editor ya no queda sobre un programa publicado: se vuelve a leer la base.
  await hoja.getByRole("button", { name: "Cerrar" }).click();
  await expect(page.getByText(/La versión 1 está publicada y la persona ya la ve\./)).toBeVisible();
  await expect(page.getByRole("button", { name: "Crear el borrador" })).toBeVisible();
});

test("constructor: una acción incompleta se ve, se abre al guardar y dice qué le falta", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio", "el constructor es de escritorio (5.6)");
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/constructor/?id=p2");
  await hidratar(page);
  await page.getByRole("button", { name: "Crear el borrador" }).click();
  await page.getByRole("button", { name: "Nueva meta" }).click();
  await page.locator("#meta-titulo").fill("Ordenar mi semana");
  await page.getByRole("button", { name: "Nueva acción" }).click();
  await page.locator("#accion-titulo").fill("Planificar la semana");
  await page.locator('input[name="accion-dias"][value="1"]').check();
  await page.locator("#accion-instrucciones").fill("Abre tu agenda y anota tres prioridades.");
  // Una segunda acción queda vacía (sin días): igual aparece en la semana.
  await page.getByRole("button", { name: "Nueva acción" }).click();
  const sinDia = page.getByRole("group", { name: "Sin día asignado" });
  await expect(sinDia).toBeVisible();
  await page.getByRole("button", { name: /Planificar la semana/ }).click();
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByText(/Falta completar la acción sin título \(semana 1\): título, días, instrucciones\./)).toBeVisible();
  await expect(page.locator("#accion-titulo")).toHaveValue("");
  await expect(page.getByText("Elige al menos un día.")).toBeVisible();
  // Al quitarla, se guarda.
  await page.getByRole("button", { name: "Eliminar acción" }).click();
  await expect(sinDia).toHaveCount(0);
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByText(/Borrador guardado\.|ya está guardado/)).toBeVisible();
});

test("constructor: acciones de dos metas a la misma hora, en todas las semanas, y se publica avisando el cruce", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio", "el constructor es de escritorio (5.6)");
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  const llamadas = await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/constructor/?id=p2");
  await hidratar(page);
  await page.getByRole("button", { name: "Crear el borrador" }).click();
  for (const [meta, accion] of [["Meta A", "Acción A"], ["Meta B", "Acción B"]]) {
    await page.getByRole("button", { name: "Nueva meta" }).click();
    await page.locator("#meta-titulo").fill(meta);
    await page.getByRole("button", { name: "Nueva acción" }).click();
    await page.locator("#accion-titulo").fill(accion);
    await page.getByRole("radio", { name: "Con horario" }).check();
    await page.locator('input[name="accion-dias"][value="1"]').check();
    await page.locator("#accion-instrucciones").fill("Hacerlo.");
  }
  // Las dos siguen en la semana 1 y también en la 3 (duran hasta el fin del ciclo).
  const semana = page.locator(".pa-constructor__semana");
  for (const n of ["Semana 1", "Semana 3"]) {
    await page.getByRole("radio", { name: n }).check();
    await expect(semana.locator(".pa-bloque__titulo", { hasText: "Acción A" })).toBeVisible();
    await expect(semana.locator(".pa-bloque__titulo", { hasText: "Acción B" })).toBeVisible();
  }
  await page.getByRole("button", { name: "Publicar" }).click();
  const hoja = page.getByRole("dialog");
  await expect(hoja.getByText(/Hay acciones a la misma hora\. Se publican igual/)).toBeVisible();
  await hoja.locator("#pub-foco").fill("Empieza por lo más importante.");
  await hoja.getByRole("button", { name: "Publicar" }).click();
  await expect(hoja.getByText(/Programa publicado/)).toBeVisible();
  expect(llamadas.find((l) => l.nombre === "publicar_programa")!.cuerpo).toMatchObject({ p_aceptar_solapamientos: true });
  expect(base.acciones.filter((a) => a.programa_id === "g3").map((a) => a.titulo).sort()).toEqual(["Acción A", "Acción B"]);
});

test("constructor: al elegir otra meta no se edita la acción anterior y todo se guarda solo", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio", "el constructor es de escritorio (5.6)");
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/constructor/?id=p2");
  await hidratar(page);
  await page.getByRole("button", { name: "Crear el borrador" }).click();
  await page.getByRole("button", { name: "Nueva meta" }).click();
  await page.locator("#meta-titulo").fill("Meta A");
  await page.getByRole("button", { name: /^Nueva acción/ }).click();
  await page.locator("#accion-titulo").fill("Acción A");
  await page.locator('input[name="accion-dias"][value="1"]').check();
  await page.locator("#accion-instrucciones").fill("Hacer A.");
  // Meta nueva: el formulario ya no muestra la acción de la meta A.
  await page.getByRole("button", { name: "Nueva meta" }).click();
  await page.locator("#meta-titulo").fill("Meta B");
  await expect(page.locator("#accion-titulo")).toHaveCount(0);
  await page.getByRole("button", { name: "Agregar una acción a «Meta B»" }).click();
  await page.locator("#accion-titulo").fill("Acción B");
  await page.locator('input[name="accion-dias"][value="2"]').check();
  await page.locator("#accion-instrucciones").fill("Hacer B.");
  // Volver a la meta A abre su acción, intacta.
  await page.getByRole("button", { name: /Meta A/ }).first().click();
  await expect(page.locator("#accion-titulo")).toHaveValue("Acción A");
  // Sin pulsar «Guardar borrador», se guarda solo.
  await expect.poll(() => base.acciones.filter((a) => a.programa_id === "g3").map((a) => `${a.titulo}:${(a.dias as number[]).join()}`).sort(), { timeout: 8000 }).toEqual(["Acción A:1", "Acción B:2"]);
  await expect(page.getByText("Borrador guardado.")).toBeVisible();
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

test("fotos y explicaciones: la foto se ve con enlace firmado de 5 minutos y sin el borrado simulado", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  base.registros.push({ id: "r10", ocurrencia_id: "o-2026-10-09", participante_id: "p1", estado: "en_revision", version: "completa", foto_ruta: "p1/o-2026-10-09/3f0c0f8e-1111-4a4a-9b9b-222233334444.webp", explicacion: null, nota_revision: null, creado_en: "2026-10-09T20:00:00Z" });
  await simular(page, base, { factores: VERIFICADO });
  const firmadas: { ruta: string; segundos: number }[] = [];
  await page.route(`${SUPABASE_URL}/storage/v1/object/sign/evidencias/**`, async (rt) => {
    const req = rt.request();
    const ruta = new URL(req.url()).pathname.replace(/^.*\/sign\/evidencias\//, "");
    if (req.method() === "POST") {
      firmadas.push({ ruta, segundos: (req.postDataJSON() as { expiresIn: number }).expiresIn });
      return rt.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ signedURL: `/object/sign/evidencias/${ruta}?token=corto` }) });
    }
    // PNG válido de 1×1.
    return rt.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64") });
  });
  await page.goto("equipo/revisar/");
  await hidratar(page);
  const img = page.locator("img.pa-miniatura");
  await expect(img).toHaveAttribute("src", /\/storage\/v1\/object\/sign\/evidencias\/p1\/o-2026-10-09\/.+token=corto/);
  expect(firmadas).toEqual([{ ruta: "p1/o-2026-10-09/3f0c0f8e-1111-4a4a-9b9b-222233334444.webp", segundos: 300 }]);
  await expect(page.getByText("Las fotos llegan en la etapa 4", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Eliminar archivo ahora" })).toHaveCount(0);
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

const ESTADO_MANTENCION = {
  estado: "con_problemas",
  horario: "30 7 * * *",
  dias: 30,
  horas_seguridad: 48,
  conteo: { vencidas: 1, vencidas_guardadas: 1, proximas_7_dias: 3, en_revision: 2, archivos_sin_registro: 0, archivos_recientes_sin_registro: 1, registros_sin_archivo: 0 },
  fallos: { fotos: 1, repetidos: 0, ultimo_error: "storage:503" },
  interrumpidas_30_dias: 0,
  borradas_30_dias: 7,
  ejecuciones: [
    { origen: "programada", iniciada_en: "2026-10-29T07:30:02Z", terminada_en: "2026-10-29T07:30:05Z", estado: "con_errores", vencidas: 3, borradas: 2, fallidas: 1, huerfanos_borrados: 0, error: null },
    { origen: "manual", iniciada_en: "2026-10-28T15:10:00Z", terminada_en: "2026-10-28T15:10:03Z", estado: "ok", vencidas: 1, borradas: 1, fallidas: 0, huerfanos_borrados: 2, error: null },
    { origen: "programada", iniciada_en: "2026-10-28T07:30:01Z", terminada_en: "2026-10-28T07:30:04Z", estado: "ok", vencidas: 5, borradas: 5, fallidas: 0, huerfanos_borrados: 0, error: null },
  ],
};

async function abrirMantencion(page: Page, estado: object, pedir: (rt: Route) => unknown = (rt) => rt.fulfill({ status: 200, contentType: "application/json", body: "false" })) {
  await preparar(page, "aal2", VERIFICADO);
  await simular(page, baseInicial(), { factores: VERIFICADO });
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/pedir_depuracion_fotos`, pedir);
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/estado_depuracion_fotos`, (rt) => rt.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(estado) }));
  await page.goto("equipo/mas/");
  await hidratar(page);
  return page.locator("section.pa-mant");
}

test("Más → Mantención: el borrado automático de fotos con datos reales de la base y «Revisar ahora»", async ({ page }) => {
  let pedidas = 0;
  const m = await abrirMantencion(page, ESTADO_MANTENCION, (rt) => {
    pedidas++;
    return rt.fulfill({ status: 200, contentType: "application/json", body: "true" });
  });
  // A. Estado general: el que calcula la base, con la hora de Chile del horario UTC.
  await expect(m.locator(".pa-mant__estado-titulo")).toHaveText("Activo, con problemas");
  await expect(m.getByText(/Todos los días a las 0[34]:30, hora de Chile/)).toBeVisible();
  await expect(m.locator(".pa-mant__estado-datos")).toContainText("Programada");
  await expect(m.locator(".pa-mant__estado-datos")).toContainText("Con problemas");
  // B. Indicadores.
  const cifra = (t: string) => m.locator(".pa-mant__cifra", { hasText: t }).locator(".pa-mant__cifra-n");
  await expect(cifra("Vencidas")).toHaveText("1");
  await expect(cifra("Próximas a vencer")).toHaveText("3");
  await expect(cifra("En revisión")).toHaveText("2");
  await expect(cifra("Eliminadas")).toHaveText("7");
  // C. Alertas: lo que tiene problemas se distingue; lo demás dice «Sin problemas».
  const problema = (t: string) => m.locator(".pa-mant__problema", { hasText: t });
  await expect(problema("Errores de eliminación")).toHaveClass(/pa-mant__problema--hay/);
  await expect(problema("Errores de eliminación")).toContainText("Último código: storage:503.");
  await expect(problema("Archivos huérfanos")).not.toHaveClass(/pa-mant__problema--hay/);
  await expect(problema("Archivos huérfanos")).toContainText("1 archivo reciente en espera");
  await expect(problema("Registros sin archivo")).toContainText("Sin problemas");
  await expect(problema("Ejecuciones interrumpidas")).toContainText("Sin problemas");
  // D. Historial.
  await expect(m.locator(".pa-mant__tabla tbody tr")).toHaveCount(3);
  await expect(m.locator(".pa-mant__tabla tbody tr").nth(1)).toContainText("+2 sin registro");
  // Nunca rutas privadas.
  await expect(m).not.toContainText("/");
  // Sin desplazamiento horizontal.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await sinViolaciones(page);
  if (process.env.CAPTURAS) {
    // Sin las barras fijas del panel, que taparían parte de la sección en la captura.
    await page.addStyleTag({ content: "header, nav, .barra-inferior, [class*='navegacion'] { visibility: hidden !important; }" });
    await m.screenshot({ path: `/mnt/project-files/rumbo-web/fotos-privadas/mantencion-${test.info().project.name}.png`, animations: "disabled" });
  }
  // Desde 320 px, sin desbordes.
  const tam = page.viewportSize();
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect(await m.evaluate((el) => [...el.querySelectorAll("*")].filter((x) => x.getBoundingClientRect().right > window.innerWidth + 0.5).length)).toBe(0);
  if (tam) await page.setViewportSize(tam);
  // E. Acciones.
  await m.getByRole("button", { name: "Revisar ahora" }).click();
  await expect(m.getByText("Listo: la revisión empezó.")).toBeVisible();
  expect(pedidas).toBe(1);
});

test("Más → Mantención: «Activo» solo cuando la base lo confirma; sin activar no se simula nada", async ({ page }) => {
  const m = await abrirMantencion(page, {
    ...ESTADO_MANTENCION,
    estado: "sin_activar",
    conteo: { ...ESTADO_MANTENCION.conteo, vencidas_guardadas: 0, archivos_recientes_sin_registro: 0 },
    fallos: { fotos: 0, repetidos: 0, ultimo_error: null },
    borradas_30_dias: 0,
    ejecuciones: [],
  });
  await expect(m.locator(".pa-mant__estado-titulo")).toHaveText("Sin activar");
  await expect(m.locator(".pa-mant__estado")).toHaveClass(/pa-mant__estado--neutro/);
  await expect(m.getByText("Activo")).toHaveCount(0);
  await expect(m.getByText("Todavía no se ha ejecutado.")).toBeVisible();
  await expect(m.getByText("Aún no hay ejecuciones.")).toBeVisible();
  await m.getByRole("button", { name: "Revisar ahora" }).click();
  await expect(m.getByText("No se pudo empezar: el borrado automático aún no está activo.")).toBeVisible();
  await sinViolaciones(page);
});

test("Más → Mantención: detenido y tarea apagada se muestran como atención, sin colores de error", async ({ page }) => {
  for (const [estado, titulo] of [["detenida", "Detenido"], ["desactivada", "Tarea apagada"], ["activa", "Activo"]] as const) {
    const m = await abrirMantencion(page, { ...ESTADO_MANTENCION, estado, interrumpidas_30_dias: estado === "activa" ? 0 : 1 });
    await expect(m.locator(".pa-mant__estado-titulo")).toHaveText(titulo);
    await expect(m.locator(".pa-mant__estado")).toHaveClass(estado === "activa" ? /pa-mant__estado--bien/ : /pa-mant__estado--atencion/);
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }
});

test("Más → Mantención: un coach (o sin la migración) no ve la sección", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  await simular(page, baseInicial(), { factores: VERIFICADO });
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/estado_depuracion_fotos`, (rt) => rt.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ code: "PT403", message: "sesion:no_autorizado" }) }));
  await page.goto("equipo/mas/");
  await hidratar(page);
  await expect(page.locator("h1")).toHaveText("Más.");
  await expect(page.locator("#mantencion-titulo")).toHaveCount(0);
});

test("contacto: lo resuelto o respondido se puede volver a abrir", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  base.peticiones_derechos = [
    { id: "pet1", recibida_en: "2026-10-10T12:00:00Z", origen: "contacto", participante_id: null, correo: "eva@correo.cl", tipo: "acceso", detalle: null, fecha_limite: "2026-11-09", estado: "abierta", respuesta: null },
  ];
  await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/contacto/");
  await hidratar(page);
  await expect(page.locator("h1")).toHaveText("Contacto y derechos.");
  await expect(page.getByText("Consultas generales que llegan por el formulario de contacto.")).toBeVisible();
  await page.getByRole("button", { name: "Marcar como respondido" }).click();
  await expect.poll(() => base.mensajes_contacto[0].estado).toBe("respondido");
  await page.getByRole("button", { name: "Volver a abrir" }).click();
  await expect.poll(() => base.mensajes_contacto[0].estado).toBe("nuevo");
  expect(base.mensajes_contacto[0].respondido_en).toBeNull();
  await page.getByRole("button", { name: "Marcar como resuelta" }).click();
  await expect.poll(() => base.peticiones_derechos[0].estado).toBe("resuelta");
  await page.getByRole("button", { name: "Volver a abrir" }).click();
  await expect.poll(() => base.peticiones_derechos[0].estado).toBe("abierta");
  expect(base.peticiones_derechos[0].resuelta_en).toBeNull();
  await sinViolaciones(page);
});

test("contacto: al cargar, lo cerrado queda plegado aparte", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  base.mensajes_contacto.push({ id: "msj2", creado_en: "2026-10-09T12:00:00Z", motivo: "otro", nombre: "Rosa", correo: "rosa@correo.cl", mensaje: "Gracias por la respuesta de ayer.", estado: "archivado" });
  await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/contacto/");
  await hidratar(page);
  const plegado = page.locator("details.pa-cerrados");
  await expect(plegado.locator("summary")).toHaveText("Respondidos y archivados (1)");
  await expect(page.getByText("Gracias por la respuesta de ayer.")).toBeHidden();
  await plegado.locator("summary").click();
  await plegado.getByRole("button", { name: "Volver a abrir" }).click();
  await expect.poll(() => base.mensajes_contacto[1].estado).toBe("nuevo");
});

test("Comunidad: ocultar un reporte con motivo, volver a mostrar, crear grupo y desafío", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  const llamadas = await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/mas/");
  await hidratar(page);
  await page.getByRole("link", { name: "Comunidad: reportes, grupos y desafíos" }).click();
  await expect(page.locator("h1")).toHaveText("Comunidad.");
  await expect(page.getByText("Cerrada para participantes: solo el equipo la ve.")).toBeVisible();
  // Reporte: el contenido y los motivos, sin quién reporta ni quién publicó.
  const reporte = page.locator("li", { has: page.getByText("Compren mis suplementos, link en mi perfil.") });
  await expect(reporte.getByText("2 reportes")).toBeVisible();
  await expect(reporte.getByText("«Vende productos.»")).toBeVisible();
  // Motivos agrupados con su cantidad, contenido aparte y la decisión en su propio bloque.
  await expect(reporte.locator(".pa-co-motivo")).toHaveText(["Consejo de salud riesgoso1", "Publicidad o spam1"]);
  await expect(reporte.getByRole("heading", { name: "Contenido reportado" })).toBeVisible();
  await expect(reporte.getByRole("form", { name: "Decisión de moderación" })).toBeVisible();
  await reporte.getByLabel("Motivo para ocultar").selectOption("spam");
  await reporte.getByRole("button", { name: "Ocultar" }).click();
  await expect.poll(() => base.publicaciones[0].estado).toBe("oculta");
  expect(llamadas.find((l) => l.nombre === "moderar_publicacion")!.cuerpo).toEqual({ p_id: "pub1", p_ocultar: true, p_motivo: "spam" });
  await expect(page.getByText("No hay reportes abiertos.")).toBeVisible();
  // Oculta: volver a mostrar.
  const oculta = page.locator("li", { has: page.getByText("Un comentario fuera de tono.") });
  await oculta.getByRole("button", { name: "Volver a mostrar" }).click();
  await expect.poll(() => base.publicaciones[1].estado).toBe("visible");
  // Grupo nuevo: valida el nombre y guarda.
  await expect(page.getByText("2 miembros")).toBeVisible();
  await page.getByRole("button", { name: "Nuevo grupo" }).click();
  await page.getByRole("button", { name: "Guardar grupo" }).click();
  await expect(page.getByText("Escribe un nombre de 2 a 60 caracteres.")).toBeVisible();
  await page.locator("#grupo-nuevo-nombre").fill("Deporte");
  await page.locator("#grupo-nuevo-ilustracion").selectOption("montana");
  await page.getByRole("button", { name: "Guardar grupo" }).click();
  await expect(page.getByText("Grupo guardado.")).toBeVisible();
  expect(base.grupos_comunidad.find((g) => g.nombre === "Deporte")).toMatchObject({ ilustracion: "montana", activo: true, categoria: null, destacado: false });
  // Destacado y categoría (C13): un grupo inactivo no se destaca; al destacar uno, el anterior deja de serlo.
  const estudio = page.locator("li", { has: page.getByRole("heading", { name: "Estudio" }) });
  await estudio.getByRole("button", { name: "Editar" }).click();
  await page.locator("#grupo-gr1-categoria").selectOption("orden");
  await page.getByRole("switch", { name: /^Grupo destacado/ }).click();
  await page.getByRole("switch", { name: /^Activo \(/ }).click();
  await page.getByRole("button", { name: "Guardar grupo" }).click();
  await expect(page.getByText("Un grupo inactivo no puede ser el destacado.", { exact: false })).toBeVisible();
  await page.getByRole("switch", { name: /^Activo \(/ }).click();
  await page.getByRole("button", { name: "Guardar grupo" }).click();
  await expect.poll(() => base.grupos_comunidad[0]).toMatchObject({ categoria: "orden", destacado: true });
  await expect(estudio.getByText("Destacado", { exact: true })).toBeVisible();
  await expect(estudio.getByText("Organización")).toBeVisible();
  // Propuestas: alias de quien propone, sin otros datos; se marca creada.
  const propuesta = page.locator("li", { has: page.getByRole("heading", { name: "Lectura" }) });
  await expect(propuesta.getByText("Brote Sereno", { exact: false })).toBeVisible();
  await propuesta.getByRole("button", { name: "Marcar como creada" }).click();
  await expect.poll(() => base.propuestas_grupo[0].estado).toBe("creada");
  expect(llamadas.find((l) => l.nombre === "responder_propuesta_grupo")!.cuerpo).toEqual({ p_id: "pg1", p_estado: "creada" });
  // Desafío con participantes: duración e inicio bloqueados al editar.
  await expect(page.getByText("1 participante", { exact: true })).toBeVisible();
  await page.locator("li", { hasText: "Semana de constancia" }).getByRole("button", { name: "Editar" }).click();
  await expect(page.locator("#desafio-de1-dias")).toBeDisabled();
  await page.getByRole("button", { name: "Cancelar" }).click();
  // Desafío nuevo: valida y guarda.
  await page.getByRole("button", { name: "Nuevo desafío" }).click();
  await page.getByRole("button", { name: "Guardar desafío" }).click();
  await expect(page.getByText("Escribe un título de 3 a 80 caracteres.")).toBeVisible();
  await page.locator("#desafio-nuevo-titulo").fill("28 días de constancia");
  await page.locator("#desafio-nuevo-reglas").fill("Un día cuenta si haces todas tus acciones programadas.");
  await page.locator("#desafio-nuevo-inicio").fill("2026-10-26");
  await page.getByRole("button", { name: "Guardar desafío" }).click();
  await expect(page.getByText("Desafío guardado.")).toBeVisible();
  expect(base.desafios.find((x) => x.titulo === "28 días de constancia")).toMatchObject({ dias: 28, inicio: "2026-10-26", activo: true });
  await sinViolaciones(page);
});

test("Comunidad: una cuenta sin permiso de moderar no ve reportes", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  const llamadas = await simular(page, base, { factores: VERIFICADO });
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/mi_rol_equipo`, (rt) => rt.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ rol: "coach", puede_moderar: false }) }));
  await page.goto("equipo/comunidad/");
  await hidratar(page);
  await expect(page.getByText("Tu cuenta no tiene permiso para moderar la comunidad.", { exact: false })).toBeVisible();
  expect(llamadas.some((l) => l.nombre === "reportes_comunidad")).toBe(false);
});

test("Módulos: el dueño ve el estado real y lo cambia con las reglas de la base", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  const llamadas = await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/mas/");
  await hidratar(page);
  await page.getByRole("link", { name: "Módulos: qué está encendido" }).click();
  await expect(page.locator("h1")).toHaveText("Módulos.");
  await expect(page.getByText("0 de 2 módulos están a la vista de las personas.")).toBeVisible();
  const ranking = page.locator("li", { has: page.getByRole("heading", { name: "Ranking semanal voluntario" }) });
  const comunidad = page.locator("li", { has: page.getByRole("heading", { name: "Comunidad con foro moderado" }) });
  await expect(ranking.getByText("Requiere la comunidad")).toBeVisible();
  // Sin «probado» no se puede habilitar: la opción está apagada y se explica.
  await ranking.getByRole("button", { name: "Cambiar estado" }).click();
  await expect(ranking.locator("#modulo-ranking-estado option[value=habilitado]")).toBeDisabled();
  await expect(ranking.getByText("Para habilitarlo, primero márcalo como probado.")).toBeVisible();
  await ranking.getByRole("button", { name: "Cancelar" }).click();
  // Operativo pide respaldo; habilitar avisa que las personas lo verán.
  await comunidad.getByRole("button", { name: "Cambiar estado" }).click();
  await comunidad.getByLabel("Estado").selectOption("operativo");
  await expect(comunidad.getByText("Al guardar, las personas empezarán a ver este módulo.")).toBeVisible();
  await comunidad.getByRole("button", { name: "Guardar" }).click();
  await expect(comunidad.getByText("Anota qué lo respalda para marcarlo operativo.").first()).toBeVisible();
  expect(llamadas.some((l) => l.nombre === "cambiar_modulo")).toBe(false);
  await comunidad.getByLabel("Estado").selectOption("habilitado");
  await comunidad.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("«Comunidad con foro moderado» quedó guardado.")).toBeVisible();
  expect(llamadas.find((l) => l.nombre === "cambiar_modulo")!.cuerpo).toEqual({ p_clave: "comunidad", p_estado: "habilitado", p_respaldo: null, p_que_falta: null });
  expect(base.modulos[0].estado).toBe("habilitado");
  await expect(page.getByText("1 de 2 módulos están a la vista de las personas.")).toBeVisible();
  await expect(comunidad.getByText("Las personas lo ven.")).toBeVisible();
  await sinViolaciones(page);
});

test("Módulos: si la base rechaza, se explica; un coach no los ve", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  base.modulos[1].probado_en = null;
  const llamadas = await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/modulos/");
  await hidratar(page);
  // La base vuelve a exigir «probado» aunque la pantalla se salte el aviso.
  const ranking = page.locator("li", { has: page.getByRole("heading", { name: "Ranking semanal voluntario" }) });
  await ranking.getByRole("button", { name: "Cambiar estado" }).click();
  await ranking.locator("#modulo-ranking-estado").evaluate((s: HTMLSelectElement) => {
    s.querySelector("option[value=habilitado]")!.removeAttribute("disabled");
  });
  await ranking.getByLabel("Estado").selectOption("habilitado");
  await ranking.getByRole("button", { name: "Guardar" }).click();
  await expect(ranking.getByRole("alert")).toContainText("Para habilitarlo, primero márcalo como probado.");
  expect(base.modulos[1].estado).toBe("planificado");
  // Un coach (aunque modere) no ve ni lee los módulos.
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/mi_rol_equipo`, (rt) => rt.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ rol: "coach", puede_moderar: true }) }));
  const antes = llamadas.filter((l) => l.nombre === "modulos").length;
  await page.reload();
  await hidratar(page);
  await expect(page.getByText("Solo el dueño puede ver y cambiar los módulos.")).toBeVisible();
  expect(llamadas.filter((l) => l.nombre === "modulos").length).toBe(antes);
});

// Comportamiento real de la barra inferior en móvil: se desplaza la página con la rueda paso a
// paso (la barra no se mueve ni queda bajo el contenido), cada control alcanzado con el teclado
// queda entero entre la cabecera y la barra, y al final el último contenido queda sobre la barra.
async function revisarBarra(page: Page) {
  const barra = page.locator("nav.barra-inferior");
  await expect(barra).toBeVisible();
  const alto = await page.evaluate(() => window.innerHeight);
  const topeBarra = async () => (await barra.boundingBox())!.y;
  const inicial = await topeBarra();
  await page.mouse.move(200, alto / 2);
  for (let i = 0; i < 80; i++) {
    const antes = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(60);
    expect(await topeBarra()).toBeCloseTo(inicial, 0);
    // Lo que se ve en el centro de la barra es la barra misma: ningún contenido queda encima.
    expect(await page.evaluate((y) => !!document.elementFromPoint(window.innerWidth / 2, y + 20)?.closest("nav.barra-inferior"), inicial)).toBe(true);
    if ((await page.evaluate(() => window.scrollY)) === antes) break;
  }
  const fin = await page.evaluate(() => {
    const m = document.querySelector("main")!;
    const hijos = [...m.querySelectorAll("*")].filter((e) => (e as HTMLElement).offsetParent !== null);
    return Math.max(...hijos.map((e) => e.getBoundingClientRect().bottom));
  });
  expect(fin).toBeLessThanOrEqual(inicial + 0.5);
  // Cada control con foco queda visible entero (cabecera arriba, barra abajo).
  const cabeza = await page.evaluate(() => document.querySelector("header.cabecera, .cabecera-app")?.getBoundingClientRect().bottom ?? 0);
  const fallas = await page.evaluate(
    ({ abajo, arriba }) => {
      const r: string[] = [];
      // La página se desplaza con suavidad; aquí se mide la posición final de cada foco.
      document.documentElement.style.scrollBehavior = "auto";
      const controles = [...document.querySelectorAll<HTMLElement>("main a[href], main button, main input, main select, main textarea")].filter(
        (e) => e.offsetParent !== null && !e.hasAttribute("disabled"),
      );
      for (const e of controles) {
        e.focus({ preventScroll: false });
        if (document.activeElement !== e) continue;
        const b = e.getBoundingClientRect();
        if (b.bottom > abajo + 0.5 || b.top < arriba - 0.5) r.push(`${e.tagName} «${(e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 30)}» ${Math.round(b.top)}-${Math.round(b.bottom)}`);
      }
      return r;
    },
    { abajo: inicial, arriba: cabeza },
  );
  expect(fallas).toEqual([]);
}

test("Comunidad en móvil: la barra inferior no tapa reportes ni botones al desplazarse", async ({ page, isMobile }) => {
  test.skip(!isMobile, "solo móvil");
  await preparar(page, "aal2", VERIFICADO);
  await simular(page, baseInicial(), { factores: VERIFICADO });
  await page.goto("equipo/comunidad/");
  await hidratar(page);
  await expect(page.getByText("2 reportes").first()).toBeVisible();
  await revisarBarra(page);
});
