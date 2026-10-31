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
      { id: "p1", user_id: "u-ana", correo: "ana@correo.cl", nombre: "Ana Pérez", nombre_preferido: "Ana", estado: "activo", zona_horaria: "America/Santiago", solicitud_id: null, coach_id: "coach-1", creado_en: "2026-10-01T12:00:00Z" },
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
    // Equipo (bloque 2): el dueño (sesión de las pruebas), un coach que acompaña a Ana y una invitación.
    equipo: [
      { user_id: UID, nombre: "Diego", rol: "dueno", puede_moderar: true, activo: true, presentacion: null, creado_en: "2026-10-01T00:00:00Z" },
      { user_id: "coach-1", nombre: "Carla", rol: "coach", puede_moderar: false, activo: true, presentacion: "Acompaño a personas que estudian y trabajan.", creado_en: "2026-10-20T00:00:00Z" },
    ],
    invitaciones_equipo: [
      { id: "inv1", correo: "marta@correo.cl", nombre: "Marta", puede_moderar: false, creada_en: "2026-10-12T12:00:00Z", expira_en: "2026-10-19T12:00:00Z", aceptada_en: null, revocada_en: null },
    ],
    videollamadas: [],
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

const ADMIN = new Set(["invitar_coach", "revocar_invitacion", "cambiar_coach", "asignar_coach", "actualizar_mi_perfil", "programar_videollamada", "anotar_videollamada", "ver_postulacion", "cambiar_modulo", "propuestas_grupo_equipo", "responder_propuesta_grupo", "moderar_publicacion", "guardar_grupo_comunidad", "guardar_desafio", "crear_espacio", "nuevo_enlace_solicitud", "nuevo_borrador", "solapamientos", "carga_prevista", "publicar_programa", "revisar_evidencia", "pausar_ciclo", "reanudar_ciclo", "eliminar_participante", "ia_bandeja", "ia_revisar", "ia_gasto"]);

async function simular(page: Page, base: Base, { equipo = true, factores = [] as Factor[] } = {}) {
  const llamadas: Llamada[] = [];
  const auth = { factores: [...factores] };
  let esEquipo = equipo;
  const rpc: Record<string, (c: Record<string, unknown>) => unknown> = {
    soy_equipo: () => esEquipo,
    mi_rol_equipo: () => (esEquipo ? { rol: "dueno", puede_moderar: true } : null),
    // Bloque 2: las mismas reglas que la base (B5, A1, A2, A3 y C2), en lo que la pantalla muestra.
    aceptar_invitacion_equipo: () => {
      if (!base.invitaciones_equipo.some((i) => i.correo === "diego@correo.cl")) return { __error: "invitacion:no_encontrada", __estado: 404 };
      esEquipo = true;
      return { rol: "coach", puede_moderar: false };
    },
    invitar_coach: (c) => {
      if (base.invitaciones_equipo.some((i) => i.correo === c.p_correo && !i.aceptada_en && !i.revocada_en)) return { __error: "invitacion:ya_invitada", __estado: 409 };
      base.invitaciones_equipo.push({ id: "inv2", correo: c.p_correo, nombre: c.p_nombre, puede_moderar: c.p_puede_moderar, creada_en: AHORA.toISOString(), expira_en: "2026-10-20T15:00:00Z", aceptada_en: null, revocada_en: null });
      return "inv2";
    },
    revocar_invitacion: (c) => {
      base.invitaciones_equipo.find((i) => i.id === c.p_invitacion)!.revocada_en = AHORA.toISOString();
      return null;
    },
    cambiar_coach: (c) => {
      if (c.p_activo === false && base.participantes.some((p) => p.coach_id === c.p_coach)) return { __error: "coach:con_participantes", __estado: 409 };
      const e = base.equipo.find((x) => x.user_id === c.p_coach)!;
      if (c.p_activo !== null) e.activo = c.p_activo;
      if (c.p_puede_moderar !== null) e.puede_moderar = c.p_puede_moderar;
      return null;
    },
    asignar_coach: (c) => {
      base.participantes.find((p) => p.id === c.p_participante)!.coach_id = c.p_coach;
      return null;
    },
    actualizar_mi_perfil: (c) => {
      Object.assign(base.equipo.find((x) => x.user_id === UID)!, c.p as Fila);
      return null;
    },
    programar_videollamada: (c) => {
      if (!/^https:\/\/\S+$/.test(String(c.p_enlace))) return { __error: "enlace:invalido", __estado: 400 };
      base.videollamadas.push({ id: `vl${c.p_semana}`, participante_id: "p1", ciclo_id: c.p_ciclo, semana: c.p_semana, programada_para: c.p_programada_para, enlace: c.p_enlace, estado: "programada" });
      return `vl${c.p_semana}`;
    },
    anotar_videollamada: (c) => {
      base.videollamadas.find((x) => x.id === c.p_videollamada)!.estado = c.p_estado;
      return null;
    },
    ver_postulacion: (c) => {
      if (String(c.p_motivo ?? "").trim().length < 10) return { __error: "motivo:corto", __estado: 400 };
      const s = base.solicitudes.find((x) => x.id === base.participantes.find((p) => p.id === c.p_participante)!.solicitud_id)!;
      return { creada_en: s.creada_en, area: s.area_id, meta: s.meta, apoyo: s.apoyo, dias: s.dias, franjas: s.franjas, horarios_nota: s.horarios_nota };
    },
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
    // Como la base (20261122000000): desde la última semana o con el ciclo cerrado; 10 a 800 caracteres.
    guardar_mensaje_cierre: (c) => {
      const ciclo = base.ciclos.find((x) => x.id === c.p_ciclo)!;
      const v = String(c.p_mensaje ?? "").trim();
      if (v && v.length < 10) return { __error: "mensaje:corto", __estado: 400 };
      Object.assign(ciclo, { mensaje_cierre: v || null, mensaje_cierre_por: v ? UID : null, mensaje_cierre_en: v ? AHORA.toISOString() : null });
      return null;
    },
    // Asistente (E2): la bandeja muestra lo pendiente; revisar solo lo que está «por revisar».
    ia_bandeja: () =>
      (base.ia_consultas ?? [])
        .filter((q) => ["enviada", "por_revisar", "lista", "crisis", "error"].includes(String(q.estado)))
        .map((q) => ({ id: q.id, participante_id: q.participante_id, tipo: q.tipo, pregunta: q.pregunta, estado: q.estado, respuesta: q.respuesta, creada_en: q.creada_en })),
    ia_revisar: (c) => {
      const q = (base.ia_consultas ?? []).find((x) => x.id === c.p_consulta);
      if (!q || q.estado !== "por_revisar") return { __error: "consulta:no_por_revisar", __estado: 409 };
      Object.assign(q, {
        estado: c.p_aprobar ? "aprobada" : "descartada",
        texto_final: c.p_aprobar ? (c.p_texto ?? q.respuesta) : null,
        revisada_por: UID,
        revisada_en: AHORA.toISOString(),
        nota_revision: c.p_nota ?? null,
      });
      return null;
    },
    ia_gasto: () => ({ tope_usd: base.ia_config[0].tope_mensual_usd, gastado_usd: 0.0123, reservado_usd: 0.0005, consultas: 3, crisis: 1, sin_presupuesto: 0, errores: 1 }),
    guardar_ia_config: (c) => {
      const p = c.p as Fila;
      const g = base.ia_config[0];
      if (p.activo === true && !base.ia_clave) return { __error: "ia:sin_clave", __estado: 409 };
      if (p.tope_diario_persona !== undefined && (Number(p.tope_diario_persona) < 1 || Number(p.tope_diario_persona) > 50)) return { __error: "ia:config_invalida", __estado: 400 };
      Object.assign(g, p, p.activo === true ? { activado_en: AHORA.toISOString() } : p.activo === false ? { activado_en: null } : {});
      return null;
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

test("constructor: una acción medible guarda su cantidad propuesta y su unidad (sugerida u otra)", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio", "el constructor es de escritorio (5.6)");
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/constructor/?id=p2");
  await hidratar(page);
  await page.getByRole("button", { name: "Crear el borrador" }).click();
  await page.getByRole("button", { name: "Nueva meta" }).click();
  await page.locator("#meta-titulo").fill("Moverme más");
  await page.getByRole("button", { name: "Nueva acción" }).click();
  await page.locator("#accion-titulo").fill("Tomar agua");
  await page.locator('input[name="accion-dias"][value="1"]').check();
  await page.locator("#accion-instrucciones").fill("Ten una botella a mano.");
  await page.getByLabel("Se mide con una cantidad").check();
  await page.locator("#accion-objetivo").fill("8");
  await page.locator("#accion-unidad").selectOption("vasos");
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect.poll(() => base.acciones.find((a) => a.titulo === "Tomar agua")).toMatchObject({ cantidad_objetivo: 8, unidad: "vasos" });

  await page.locator("#accion-unidad").selectOption("otra");
  await page.locator("#accion-unidad-otra").fill("series");
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect.poll(() => base.acciones.find((a) => a.titulo === "Tomar agua")).toMatchObject({ cantidad_objetivo: 8, unidad: "series" });

  await page.getByLabel("Se mide con una cantidad").uncheck();
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect.poll(() => base.acciones.find((a) => a.titulo === "Tomar agua")).toMatchObject({ cantidad_objetivo: null, unidad: null });
  await sinViolaciones(page);
});

// Informe de cierre (30-oct-2026): el coach escribe el mensaje de cierre en la ficha.
test("ficha: mensaje de cierre al final del ciclo, con su autor; oculto sin la migración", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  Object.assign(base.ciclos[0], { estado: "cerrado", mensaje_cierre: null, mensaje_cierre_por: null, mensaje_cierre_en: null });
  const llamadas = await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/participante/?id=p1");
  await hidratar(page);
  await page.getByRole("tab", { name: "Revisiones" }).click();
  const s = page.locator('section[aria-labelledby="mensaje-cierre-titulo"]');
  await expect(s).toBeVisible();
  await s.getByLabel("Tu mensaje para cerrar el ciclo").fill("Bien");
  await s.getByRole("button", { name: "Guardar mensaje" }).click();
  await expect(s.getByText("Escribe entre 10 y 800 caracteres.")).toBeVisible();
  expect(llamadas.some((l) => l.nombre === "guardar_mensaje_cierre")).toBe(false);
  await s.getByLabel("Tu mensaje para cerrar el ciclo").fill("Cerraste el ciclo con constancia. Sigamos.");
  await s.getByRole("button", { name: "Guardar mensaje" }).click();
  await expect(s.getByText("Mensaje guardado. La persona lo verá en su informe de cierre.")).toBeVisible();
  expect(llamadas.find((l) => l.nombre === "guardar_mensaje_cierre")?.cuerpo).toEqual({ p_ciclo: "c1", p_mensaje: "Cerraste el ciclo con constancia. Sigamos." });
  await expect(s).toContainText(/Escrito por .+ el /);
  await s.getByRole("button", { name: "Quitar mensaje" }).click();
  await expect(s.getByText("Mensaje quitado. El informe mostrará tu último foco.")).toBeVisible();
  expect(base.ciclos[0].mensaje_cierre).toBeNull();
  await sinViolaciones(page);

  // Sin la migración aplicada, la columna no existe: la tarjeta no aparece.
  await page.route(/\/rest\/v1\/ciclos\?.*mensaje_cierre/, (rt) => rt.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ code: "42703", message: "column ciclos.mensaje_cierre does not exist" }) }));
  await page.reload();
  await hidratar(page);
  await page.getByRole("tab", { name: "Revisiones" }).click();
  await expect(page.getByRole("heading", { name: "Semana 4" }).or(page.getByRole("heading", { name: /Semana \d/ }).first())).toBeVisible();
  await expect(s).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// Bloque 2 de Rumbo 1.0: equipo, perfil, videollamadas y postulación con motivo

const seccion = (page: Page, id: string) => page.locator(`section[aria-labelledby="${id}-titulo"]`);

test("Equipo: invitar con mensaje para copiar, revocar, no desactivar a quien acompaña y reasignar", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  const llamadas = await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/mas/");
  await hidratar(page);
  await page.getByRole("link", { name: "Equipo: coaches e invitaciones" }).click();
  await expect(page.locator("h1")).toHaveText("Equipo.");
  const carla = page.locator("li", { has: page.getByRole("heading", { name: "Carla" }) }).first();
  await expect(carla.getByText("1 persona")).toBeVisible();
  await expect(carla.getByText("Acompaño a personas que estudian y trabajan.")).toBeVisible();
  // Invitar: valida antes de llamar a la base y arma el mensaje con el enlace del panel.
  await page.getByRole("button", { name: "Crear invitación" }).click();
  await expect(page.getByText("Escribe un nombre de 2 a 60 caracteres.")).toBeVisible();
  expect(llamadas.some((l) => l.nombre === "invitar_coach")).toBe(false);
  await page.getByLabel("Nombre", { exact: true }).fill("Tomás Rojas");
  await page.getByLabel("Correo", { exact: true }).fill("Tomas@Correo.cl");
  await page.getByRole("switch", { name: "Puede moderar la comunidad" }).check();
  await page.getByRole("button", { name: "Crear invitación" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Invitación creada para Tomás Rojas." })).toBeVisible();
  expect(llamadas.find((l) => l.nombre === "invitar_coach")!.cuerpo).toEqual({ p_correo: "tomas@correo.cl", p_nombre: "Tomás Rojas", p_puede_moderar: true });
  await expect(page.locator("pre.pa-plantilla")).toContainText("/equipo/ y escribe tu correo: tomas@correo.cl.");
  const pendientes = seccion(page, "equipo-pendientes");
  await expect(pendientes.getByRole("heading", { name: "Tomás Rojas" })).toBeVisible();
  // La invitación de Marta sigue vigente: se revoca.
  const marta = pendientes.locator("li", { has: page.getByRole("heading", { name: "Marta" }) });
  await marta.getByRole("button", { name: "Revocar" }).click();
  await expect(page.getByText("Invitación a marta@correo.cl revocada.")).toBeVisible();
  await expect(pendientes.getByRole("heading", { name: "Marta" })).toHaveCount(0);
  // Carla acompaña a Ana: la base no deja desactivarla y la pantalla lo explica.
  await carla.getByRole("button", { name: "Desactivar" }).click();
  await expect(carla.getByRole("alert")).toContainText("Todavía acompaña a personas");
  await carla.getByRole("button", { name: "Permitir moderar" }).click();
  await expect(page.getByText("Carla ahora puede moderar la comunidad.")).toBeVisible();
  // Reasignar a Ana al dueño, con motivo.
  const ana = seccion(page, "equipo-asignar").locator("li", { has: page.getByRole("heading", { name: "Ana" }) });
  await expect(ana.getByText("Carla")).toBeVisible();
  await ana.getByRole("button", { name: "Cambiar coach" }).click();
  const hoja = page.getByRole("dialog");
  await hoja.getByLabel("Coach", { exact: true }).selectOption({ label: "Diego (Dueño)" });
  await hoja.getByLabel("Motivo").fill("Carla cambia de horario.");
  await hoja.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Ana ahora la acompaña Diego.")).toBeVisible();
  expect(llamadas.find((l) => l.nombre === "asignar_coach")!.cuerpo).toEqual({ p_participante: "p1", p_coach: UID, p_motivo: "Carla cambia de horario." });
  await expect(carla.getByText("0 personas")).toBeVisible();
  await sinViolaciones(page);
});

test("Equipo: un coach no lo gestiona", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const llamadas = await simular(page, baseInicial(), { factores: VERIFICADO });
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/mi_rol_equipo`, (rt) => rt.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ rol: "coach", puede_moderar: false }) }));
  await page.goto("equipo/equipo/");
  await hidratar(page);
  await expect(page.getByText("Solo el dueño de Rumbo puede gestionar el equipo.")).toBeVisible();
  expect(llamadas.some((l) => l.nombre === "invitaciones_equipo")).toBe(false);
});

test("invitación: la persona invitada la acepta y pasa a registrar su segundo factor", async ({ page }) => {
  await preparar(page, "aal1");
  const base = baseInicial();
  const llamadas = await simular(page, base, { equipo: false });
  await page.goto("equipo/");
  await hidratar(page);
  await expect(page.locator("h1")).toHaveText("Esta cuenta no tiene acceso al panel.");
  // Al llegar se busca sola; sin invitación para su correo queda el botón, y al pulsarlo se explica.
  await expect(page.getByRole("button", { name: "Aceptar mi invitación" })).toBeVisible();
  await page.getByRole("button", { name: "Aceptar mi invitación" }).click();
  await expect(page.getByRole("alert")).toContainText("No encontramos una invitación vigente para este correo.");
  base.invitaciones_equipo.push({ id: "inv9", correo: "diego@correo.cl", nombre: "Diego", puede_moderar: false, creada_en: "2026-10-12T12:00:00Z", expira_en: "2026-10-19T12:00:00Z", aceptada_en: null, revocada_en: null });
  await page.getByRole("button", { name: "Aceptar mi invitación" }).click();
  await expect(page.locator("h1")).toHaveText("Segundo factor.");
  expect(llamadas.filter((l) => l.nombre === "aceptar_invitacion_equipo")).toHaveLength(3);
  await sinViolaciones(page);
});

test("invitación vigente: se acepta sola al llegar y pasa directo al segundo factor", async ({ page }) => {
  await preparar(page, "aal1");
  const base = baseInicial();
  base.invitaciones_equipo.push({ id: "inv9", correo: "diego@correo.cl", nombre: "Diego", puede_moderar: false, creada_en: "2026-10-12T12:00:00Z", expira_en: "2026-10-19T12:00:00Z", aceptada_en: null, revocada_en: null });
  const llamadas = await simular(page, base, { equipo: false });
  await page.goto("equipo/");
  await hidratar(page);
  await expect(page.locator("h1")).toHaveText("Segundo factor.");
  expect(llamadas.filter((l) => l.nombre === "aceptar_invitacion_equipo")).toHaveLength(1);
});

test("Más: «Tu perfil» guarda nombre y presentación con actualizar_mi_perfil", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  const llamadas = await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/mas/");
  await hidratar(page);
  const perfil = seccion(page, "perfil");
  await expect(perfil.getByLabel("Nombre")).toHaveValue("Diego");
  await perfil.getByLabel("Presentación").fill("Acompaño a ordenar la semana sin exigirse de más.");
  await perfil.getByRole("button", { name: "Guardar perfil" }).click();
  await expect(perfil.getByText("Perfil guardado.")).toBeVisible();
  expect(llamadas.find((l) => l.nombre === "actualizar_mi_perfil")!.cuerpo).toEqual({ p: { nombre: "Diego", presentacion: "Acompaño a ordenar la semana sin exigirse de más." } });
  await sinViolaciones(page);
});

test("ficha: videollamadas del plan cercano, agendar con enlace y anotar", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  base.ciclos[0].plan_id = "cercano";
  base.ciclos[0].hora_videollamada = "19:00:00";
  // La semana 1 ya pasó y quedó agendada.
  base.videollamadas.push({ id: "vl1", participante_id: "p1", ciclo_id: "c1", semana: 1, programada_para: "2026-10-06T22:00:00Z", enlace: "https://meet.google.com/abc-defg-hij", estado: "programada" });
  const llamadas = await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/participante/?id=p1&pestana=revisiones");
  await hidratar(page);
  const vl = seccion(page, "videollamadas");
  await expect(vl.getByRole("heading", { name: "Videollamadas" })).toBeVisible();
  const s1 = vl.locator("li", { has: page.getByRole("heading", { name: "Semana 1" }) });
  await expect(s1.getByRole("link", { name: /meet\.google\.com/ })).toHaveAttribute("rel", "noopener noreferrer");
  // Ya pasó la hora: queda «Por anotar» y se pide anotar qué pasó. Sin próximas, no hay destacado.
  await expect(s1.getByText("Por anotar")).toBeVisible();
  await expect(s1.getByRole("heading", { name: "Anota qué pasó en esta videollamada" })).toBeVisible();
  await expect(s1.getByRole("button", { name: "La persona no asistió" })).toBeVisible();
  await expect(vl.locator(".pa-vl-proxima")).toHaveCount(0);
  await s1.getByRole("button", { name: "Se realizó" }).click();
  await expect(vl.getByText("Videollamada de la semana 1 anotada.")).toBeVisible();
  expect(llamadas.find((l) => l.nombre === "anotar_videollamada")!.cuerpo).toEqual({ p_videollamada: "vl1", p_estado: "realizada" });
  await expect(s1.getByText("Realizada")).toBeVisible();
  // Semana 2: propone el día de revisión a la hora acordada; valida el enlace.
  const s2 = vl.locator("li", { has: page.getByRole("heading", { name: "Semana 2" }) });
  await s2.getByRole("button", { name: "Agendar" }).click();
  await expect(s2.getByLabel("Fecha y hora")).toHaveValue("2026-10-13T19:00");
  await s2.getByLabel("Enlace de la videollamada").fill("meet.google.com/xyz");
  await s2.getByRole("button", { name: "Guardar" }).click();
  await expect(s2.getByText("Pega el enlace completo de la videollamada; debe empezar con https://.").first()).toBeVisible();
  expect(llamadas.some((l) => l.nombre === "programar_videollamada")).toBe(false);
  await s2.getByLabel("Enlace de la videollamada").fill("https://meet.google.com/xyz-abcd-efg");
  await s2.getByRole("button", { name: "Guardar" }).click();
  await expect(vl.getByText("Videollamada de la semana 2 agendada. La persona recibió un aviso.")).toBeVisible();
  const cuerpo = llamadas.find((l) => l.nombre === "programar_videollamada")!.cuerpo as Record<string, unknown>;
  expect(cuerpo.p_ciclo).toBe("c1");
  expect(cuerpo.p_semana).toBe(2);
  expect(cuerpo.p_enlace).toBe("https://meet.google.com/xyz-abcd-efg");
  await expect(s2.getByText("Agendada")).toBeVisible();
  // La próxima queda destacada arriba, con su enlace a mano; antes de la hora solo se puede cancelar.
  const proxima = vl.locator(".pa-vl-proxima");
  await expect(proxima.getByRole("heading", { name: "Próxima videollamada" })).toBeVisible();
  await expect(proxima).toContainText("Semana 2 ·");
  await expect(proxima.getByRole("link", { name: "Abrir la videollamada" })).toHaveAttribute("href", "https://meet.google.com/xyz-abcd-efg");
  await expect(s2.getByRole("heading", { name: "¿No se hará?" })).toBeVisible();
  await expect(s2.getByRole("button", { name: "Se realizó" })).toHaveCount(0);
  await sinViolaciones(page);
});

test("ficha: el plan con revisión escrita no muestra videollamadas", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const llamadas = await simular(page, baseInicial(), { factores: VERIFICADO });
  await page.goto("equipo/participante/?id=p1&pestana=revisiones");
  await hidratar(page);
  await expect(page.getByRole("heading", { name: "Semana 2" }).first()).toBeVisible();
  await expect(seccion(page, "videollamadas")).toHaveCount(0);
  expect(llamadas.some((l) => l.nombre === "videollamadas")).toBe(false);
});

test("ficha: la postulación se abre solo con motivo", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  base.participantes[0].solicitud_id = "s1";
  const llamadas = await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/participante/?id=p1&pestana=datos");
  await hidratar(page);
  await page.getByRole("button", { name: "Ver su postulación" }).click();
  const hoja = page.getByRole("dialog");
  await hoja.getByRole("button", { name: "Ver la postulación" }).click();
  await expect(hoja.getByText("Escribe el motivo con al menos 10 caracteres.").first()).toBeVisible();
  expect(llamadas.some((l) => l.nombre === "ver_postulacion")).toBe(false);
  await hoja.getByLabel("Motivo").fill("Revisar sus horarios para agendar.");
  await hoja.getByRole("button", { name: "Ver la postulación" }).click();
  await expect(hoja.getByText("Quiero ordenar mi semana para llegar con energía al trabajo y a mis estudios.")).toBeVisible();
  await expect(hoja.getByText("Lunes, Jueves")).toBeVisible();
  expect(llamadas.find((l) => l.nombre === "ver_postulacion")!.cuerpo).toEqual({ p_participante: "p1", p_motivo: "Revisar sus horarios para agendar." });
  await sinViolaciones(page);
});

// Capturas para la revisión de Diego (no corre en CI): CAPTURAS=carpeta npx playwright test -g "capturas del bloque 2".
test("capturas del bloque 2", async ({ page }, info) => {
  test.skip(!process.env.CAPTURAS, "solo para generar capturas");
  const dir = process.env.CAPTURAS!;
  const base = baseInicial();
  base.ciclos[0].plan_id = "cercano";
  base.ciclos[0].hora_videollamada = "19:00:00";
  base.videollamadas.push({ id: "vl1", participante_id: "p1", ciclo_id: "c1", semana: 1, programada_para: "2026-10-06T22:00:00Z", enlace: "https://meet.google.com/abc-defg-hij", estado: "realizada" });
  base.videollamadas.push({ id: "vl2", participante_id: "p1", ciclo_id: "c1", semana: 2, programada_para: "2026-10-13T22:00:00Z", enlace: "https://meet.google.com/xyz-abcd-efg", estado: "programada" });
  await preparar(page, "aal2", VERIFICADO);
  await simular(page, base, { factores: VERIFICADO });
  const sinBarras = () => page.addStyleTag({ content: ".barra-inferior, .cabecera-app { position: static !important; }" });
  const foto = async (ruta: string, nombre: string) => {
    await page.goto(ruta);
    await hidratar(page);
    await page.locator("main h1").first().waitFor();
    await expect(page.getByText("Cargando…")).toHaveCount(0);
    await page.waitForTimeout(500);
    await sinBarras();
    await page.screenshot({ path: `${dir}/${nombre}-${info.project.name}.png`, fullPage: true });
  };
  await foto("equipo/equipo/", "equipo");
  await foto("equipo/participante/?id=p1&pestana=revisiones", "videollamadas");
  await foto("equipo/mas/", "mas-perfil");
  await page.goto("equipo/participante/?id=p1&pestana=datos");
  await hidratar(page);
  base.participantes[0].solicitud_id = "s1";
  await page.reload();
  await hidratar(page);
  await page.getByRole("button", { name: "Ver su postulación" }).click();
  await page.getByRole("dialog").getByLabel("Motivo").fill("Revisar sus horarios para agendar.");
  await page.getByRole("dialog").getByRole("button", { name: "Ver la postulación" }).click();
  await page.getByRole("dialog").getByText("Lunes, Jueves").waitFor();
  await page.screenshot({ path: `${dir}/postulacion-${info.project.name}.png` });
});

// ---------------------------------------------------------------------------
// Asistente de Rumbo: bandeja de revisión (E2)

const consultasIa = (): Fila[] => [
  { id: "ia1", participante_id: "p1", tipo: "pregunta", pregunta: "¿Cómo mantengo la motivación?", estado: "por_revisar", respuesta: "Borrador del asistente.", texto_final: null, contexto_enviado: { semana_del_ciclo: 2, semanas: 4, metas: [{ titulo: "Caminar" }] }, error: null, creada_en: "2026-10-13T10:00:00Z", revisada_por: null, revisada_en: null, nota_revision: null },
  { id: "ia2", participante_id: "p1", tipo: "pregunta", pregunta: "¿Qué hábitos me recomiendas?", estado: "por_revisar", respuesta: "Otro borrador.", texto_final: null, contexto_enviado: { semana_del_ciclo: 2, semanas: 4 }, error: null, creada_en: "2026-10-13T11:00:00Z", revisada_por: null, revisada_en: null, nota_revision: null },
  { id: "ia3", participante_id: "p1", tipo: "pregunta", pregunta: "Quiero morir", estado: "crisis", respuesta: null, texto_final: null, contexto_enviado: null, error: null, creada_en: "2026-10-12T22:00:00Z", revisada_por: null, revisada_en: null, nota_revision: null },
  { id: "ia4", participante_id: "p1", tipo: "pregunta", pregunta: "Pregunta antigua", estado: "error", respuesta: null, texto_final: null, contexto_enviado: null, error: "tiempo_agotado", creada_en: "2026-09-01T10:00:00Z", revisada_por: null, revisada_en: null, nota_revision: null },
  { id: "ia5", participante_id: "p1", tipo: "pregunta", pregunta: "¿Cómo retomo?", estado: "aprobada", respuesta: "Original.", texto_final: "Corregido por el coach.", contexto_enviado: null, error: null, creada_en: "2026-10-10T10:00:00Z", revisada_por: "otra-persona", revisada_en: "2026-10-10T12:00:00Z", nota_revision: "Ajusté el tono." },
];

test("Asistente: aprobar tal cual, aprobar corregida y no compartir; alertas y revisadas con quién y cuándo", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  base.ia_consultas = consultasIa();
  base.ia_valoraciones = [{ consulta_id: "ia5", participante_id: "p1", util: false, motivo: "Muy general" }];
  const llamadas = await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/mas/");
  await hidratar(page);
  await page.getByRole("link", { name: "Asistente: respuestas por revisar" }).click();
  await expect(page.locator("h1")).toHaveText("Asistente: por revisar.");
  await expect(page.getByText("2 respuestas esperan tu revisión.")).toBeVisible();
  // Alerta reciente visible con la ficha; el error de hace más de 7 días no.
  const alertas = page.locator("section", { has: page.getByRole("heading", { name: "Alertas" }) });
  await expect(alertas).toContainText("Quiero morir");
  await expect(alertas.getByRole("link", { name: "Abrir la ficha" })).toBeVisible();
  await expect(page.getByText("Pregunta antigua")).toHaveCount(0);
  // Contexto enviado, sin el contenido.
  const primera = page.locator("li", { hasText: "¿Cómo mantengo la motivación?" });
  await expect(primera).toContainText("Lo que se envió además de la pregunta: semana_del_ciclo".replace("semana_del_ciclo", "semana del ciclo"));
  await expect(primera).toContainText("metas");
  await sinViolaciones(page);

  // 1) Corregida: envía el texto nuevo y la nota.
  await primera.getByLabel("Respuesta que verá la persona").fill("Texto corregido por el coach.");
  await primera.getByLabel(/Nota interna/).fill("Tono más cálido.");
  await primera.getByRole("button", { name: "Aprobar con mis cambios" }).click();
  await expect(page.getByText("Aprobada: la persona ya la puede ver.")).toBeVisible();
  expect(llamadas.find((l) => l.nombre === "ia_revisar")!.cuerpo).toEqual({ p_consulta: "ia1", p_aprobar: true, p_texto: "Texto corregido por el coach.", p_nota: "Tono más cálido." });
  expect(llamadas.find((l) => l.nombre === "ia_revisar")!.aal).toBe("aal2");

  // 2) No compartir pide confirmación.
  const segunda = page.locator("li", { hasText: "¿Qué hábitos me recomiendas?" }).filter({ has: page.getByRole("button", { name: "No compartir" }) });
  await segunda.getByRole("button", { name: "No compartir" }).click();
  await expect(segunda.getByText("La persona verá que tu coach decidió no compartir esta respuesta. ¿Seguro?")).toBeVisible();
  await segunda.getByRole("button", { name: "Sí, no compartir" }).click();
  await expect(page.getByText("No compartida.", { exact: true })).toBeVisible();
  expect(llamadas.filter((l) => l.nombre === "ia_revisar")[1].cuerpo).toEqual({ p_consulta: "ia2", p_aprobar: false, p_texto: null, p_nota: null });
  await expect(page.getByText("No hay respuestas por revisar.").first()).toBeVisible();

  // Revisadas: quién y cuándo, y si se corrigió.
  const revisadas = page.locator("section", { has: page.getByRole("heading", { name: "Revisadas recientemente" }) });
  await expect(revisadas.locator("li")).toHaveCount(3);
  await expect(revisadas.locator("li", { hasText: "¿Cómo retomo?" })).toContainText("Por otra persona del equipo");
  await expect(revisadas.locator("li", { hasText: "¿Cómo retomo?" })).toContainText("Con cambios");
  await expect(revisadas.locator("li", { hasText: "¿Cómo mantengo la motivación?" })).toContainText("Por ti");
  // La valoración de la persona («No me sirvió» y su comentario) la ve su coach.
  await expect(revisadas.locator("li", { hasText: "¿Cómo retomo?" })).toContainText("Valoración de la persona: No le sirvió · «Muy general»");
  await expect(revisadas.locator("li", { hasText: "¿Cómo mantengo la motivación?" })).not.toContainText("Valoración de la persona");
});

test("Asistente: aprobar tal cual no reenvía el texto; si ya fue revisada, se explica", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  base.ia_consultas = consultasIa().slice(0, 1);
  const llamadas = await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/asistente/");
  await hidratar(page);
  const fila = page.locator("li", { hasText: "¿Cómo mantengo la motivación?" });
  await expect(fila.getByRole("button", { name: "Aprobar y compartir" })).toBeVisible();
  // Otra persona del equipo la revisó mientras tanto.
  base.ia_consultas[0].estado = "aprobada";
  await fila.getByRole("button", { name: "Aprobar y compartir" }).click();
  await expect(fila.getByRole("alert")).toContainText("Esta respuesta ya fue revisada o ya no está pendiente.");
  expect(llamadas.find((l) => l.nombre === "ia_revisar")!.cuerpo).toEqual({ p_consulta: "ia1", p_aprobar: true, p_texto: null, p_nota: null });
  // Vaciar la respuesta no se aprueba.
  base.ia_consultas[0].estado = "por_revisar";
  await fila.getByLabel("Respuesta que verá la persona").fill("   ");
  await fila.getByRole("button", { name: "Aprobar con mis cambios" }).click();
  await expect(fila.getByText("La respuesta no puede quedar vacía.").first()).toBeVisible();
  expect(llamadas.filter((l) => l.nombre === "ia_revisar")).toHaveLength(1);
});

const configIa = (): Fila => ({ id: true, activo: false, modelo: "gpt-4o-mini", instrucciones: "Eres el asistente de Rumbo. Un coach humano revisa tu respuesta antes de que la persona la lea.", max_tokens_respuesta: 400, tokens_entrada_estimados: 2000, precio_entrada_1m: 0.15, precio_salida_1m: 0.6, tope_mensual_usd: 5, tope_diario_persona: 5, activado_en: null });

test("Asistente (dueño): consumo sin conversaciones, estimación por persona, límites y encender con la clave", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  base.ia_config = [configIa()];
  base.ia_consultas = consultasIa();
  base.modulos.push({ clave: "asistente_ia", nombre: "Asistente con inteligencia artificial", estado: "planificado", probado_en: null, respaldo: null, que_falta: null, orden: 4, cambiado_en: AHORA.toISOString() });
  const llamadas = await simular(page, base, { factores: VERIFICADO });
  await page.goto("equipo/mas/");
  await hidratar(page);
  await page.getByRole("link", { name: "Asistente: encender, límites y consumo" }).click();
  await expect(page.locator("h1")).toHaveText("Asistente: administración.");
  await expect(page.getByText("Apagado", { exact: true })).toBeVisible();
  await expect(page.getByText("Módulo «Asistente con inteligencia artificial»: Planificado.")).toBeVisible();
  // Consumo: montos y cuentas, nunca preguntas ni respuestas.
  const consumo = page.locator("section", { has: page.getByRole("heading", { name: "Consumo de este mes" }) });
  await expect(consumo).toContainText("USD 0,0123 de USD 5,00");
  await expect(consumo).toContainText("Respuestas por revisar2");
  await expect(page.locator("main")).not.toContainText("¿Cómo mantengo la motivación?");
  await expect(page.locator("main")).not.toContainText("Quiero morir");
  // Estimación: (2000 × 0,15 + 400 × 0,60) / 1e6 = 0,00054 por consulta; × 5 × 28.
  const est = page.locator("section", { has: page.getByRole("heading", { name: "Costo estimado por persona" }) });
  await expect(est).toContainText("USD 0,0005");
  await expect(est).toContainText("USD 0,08");
  await sinViolaciones(page);

  // Límites: valida y guarda.
  await page.getByLabel("Límite mensual (USD)").fill("diez");
  await page.getByRole("button", { name: "Guardar límites" }).click();
  await expect(page.getByLabel("Límite mensual (USD)")).toBeFocused();
  expect(llamadas.some((l) => l.nombre === "guardar_ia_config")).toBe(false);
  await page.getByLabel("Límite mensual (USD)").fill("10");
  await page.getByRole("button", { name: "Guardar límites" }).click();
  await expect(page.getByText("Límites guardados.")).toBeVisible();
  expect(llamadas.find((l) => l.nombre === "guardar_ia_config")!.cuerpo).toEqual({
    p: { tope_mensual_usd: 10, tope_diario_persona: 5, modelo: "gpt-4o-mini", max_tokens_respuesta: 400, tokens_entrada_estimados: 2000, precio_entrada_1m: 0.15, precio_salida_1m: 0.6 },
  });
  await expect(consumo).toContainText("USD 0,0123 de USD 10,00");

  // Encender sin clave: la base lo rechaza y se explica.
  await page.getByRole("button", { name: "Encender el asistente" }).click();
  await expect(page.getByText(/se envía a OpenAI \(servicio pagado\)/)).toBeVisible();
  await page.getByRole("button", { name: "Sí, continuar" }).click();
  await expect(page.getByText("Falta la clave de OpenAI en el Vault de Supabase.", { exact: false })).toBeVisible();
  expect(base.ia_config[0].activo).toBe(false);
  // Con la clave, enciende.
  base.ia_clave = true;
  await page.getByRole("button", { name: "Encender el asistente" }).click();
  await page.getByRole("button", { name: "Sí, continuar" }).click();
  await expect(page.getByText("El asistente quedó encendido.")).toBeVisible();
  await expect(page.getByText("Encendido", { exact: true })).toBeVisible();
  expect(llamadas.filter((l) => l.nombre === "guardar_ia_config").at(-1)!.cuerpo).toEqual({ p: { activo: true } });
});

test("Asistente (dueño): un coach no ve la administración", async ({ page }) => {
  await preparar(page, "aal2", VERIFICADO);
  const base = baseInicial();
  base.ia_config = [configIa()];
  const llamadas = await simular(page, base, { factores: VERIFICADO });
  await page.route(`${SUPABASE_URL}/rest/v1/rpc/mi_rol_equipo`, (rt) => rt.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ rol: "coach", puede_moderar: false }) }));
  await page.goto("equipo/asistente/administracion/");
  await hidratar(page);
  await expect(page.getByText("Solo el dueño puede administrar el asistente.")).toBeVisible();
  expect(llamadas.filter((l) => l.nombre === "ia_config" || l.nombre === "ia_gasto")).toHaveLength(0);
});
