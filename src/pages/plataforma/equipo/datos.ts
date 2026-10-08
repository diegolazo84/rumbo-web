// Panel real (etapa 3, plataforma 5): filas de la base (con aal2, las políticas admin_* de 6.4
// dejan leer todo) y su traducción a las formas que usan las pantallas de la vista previa.
// Las fechas de plazo las fija la base (responder_antes, fecha_limite); aquí solo se calculan
// las que no se guardan: el día de revisión de cada semana (corrido al día hábil siguiente si es
// feriado, 5.3) y la semana del ciclo.
import { POSTULAR } from "../../../data/formularios";
import { diaCorto, diaSemana, diasEntre, esHabil, sumarDias, type Iso } from "../../../lib/fechas";
import { conId, ordenPorPlazo } from "../../vista-previa/panel/base";
import type { Item } from "../../vista-previa/panel/cola";
import type { AjustePanel, FichaParticipante, Solicitud } from "../../vista-previa/panel/ejemplo";
import type { RutasPanel } from "../../vista-previa/panel/modo";
import { HOY_PANEL } from "../../vista-previa/panel/textos";
import { fechaDe, hoyEn } from "../mi-espacio/datos";

// ---------------------------------------------------------------------------
// Filas

export type FilaSolicitud = {
  id: string;
  creada_en: string;
  tipo: "solicitud" | "interes";
  nombre: string | null;
  correo: string | null;
  area_id: string | null;
  meta: string | null;
  apoyo: "coach" | "cercano" | "nose" | null;
  dias: string[];
  franjas: string[];
  horarios_nota: string | null;
  zona_horaria: string | null;
  avisos_futuros: boolean;
  estado: Solicitud["estado"];
  motivo_cierre: "capacidad" | "alcance" | "sin_respuesta" | "avisado" | null;
  nota_cierre: string | null;
  responder_antes: Iso | null;
  respondida_en: string | null;
  acuerdo: Record<string, unknown> | null;
  condiciones_aceptadas: { fecha?: string } | null;
  origen: { area?: string; apoyo?: string } | null;
  posible_spam: boolean;
  posible_duplicado: boolean;
  duplicado_de: string | null;
  notas_internas: string | null;
  participante_id: string | null;
};

export type FilaParticipantePanel = {
  id: string;
  user_id: string | null;
  correo: string;
  nombre: string;
  nombre_preferido: string | null;
  estado: "invitado" | "activo" | "cerrado";
  zona_horaria: string;
  solicitud_id: string | null;
  creado_en: string;
};

export type FilaCicloPanel = {
  id: string;
  participante_id: string;
  numero: number;
  plan_id: "coach" | "cercano";
  inicio: Iso;
  semanas: number;
  fin: Iso;
  dia_revision: number;
  hora_videollamada: string | null;
  estado: "activo" | "pausado" | "cerrado";
  pausa_motivo: string | null;
  pausa_desde: Iso | null;
  pausa_hasta: Iso | null;
  foco_inicial: string | null;
};

export type FilaProgramaPanel = {
  id: string;
  ciclo_id: string;
  participante_id: string;
  version: number;
  estado: "borrador" | "publicado" | "reemplazado";
  nota_cambios: string | null;
  vigente_desde: Iso | null;
  publicado_en: string | null;
};

export type FilaAjustePanel = {
  id: string;
  participante_id: string;
  ciclo_id: string;
  creada_en: string;
  tipo: string;
  ocurrencias: string[];
  desde: Iso | null;
  texto: string;
  pide_reorden: boolean;
  estado: AjustePanel["estado"];
  respuesta: string | null;
  cuenta_como_reorden: boolean;
  responder_antes: Iso | null;
  respondida_en: string | null;
};

export type FilaRevisionPanel = {
  id: string;
  participante_id: string;
  ciclo_id: string;
  semana: number;
  tipo: "escrita" | "videollamada";
  que_funciono: string | null;
  que_ajustamos: string | null;
  foco: string | null;
  iniciada_en: string;
  publicada_en: string | null;
};

export type FilaEvidencia = {
  id: string;
  participante_id: string;
  ocurrencia_id: string;
  estado: string;
  foto_ruta: string | null;
  explicacion: string | null;
  creado_en: string;
};

export type FilaMensaje = { id: string; creado_en: string; motivo: string; nombre: string | null; correo: string; mensaje: string; estado: string };
export type FilaPeticion = {
  id: string;
  recibida_en: string;
  origen: string;
  participante_id: string | null;
  correo: string;
  tipo: string;
  detalle: string | null;
  fecha_limite: Iso | null;
  estado: string;
  respuesta: string | null;
};

export type FilaAjustesOperacion = {
  postulaciones_abiertas: boolean;
  tope_solicitudes_dia: number | null;
  ausencia_hasta: Iso | null;
  ausencia_texto: string | null;
};

export type DatosPanel = {
  hoy: Iso;
  feriados: Iso[];
  solicitudes: FilaSolicitud[];
  participantes: FilaParticipantePanel[];
  ciclos: FilaCicloPanel[];
  programas: FilaProgramaPanel[];
  ajustes: FilaAjustePanel[];
  revisiones: FilaRevisionPanel[];
  evidencias: FilaEvidencia[]; // registros en revisión
  mensajes: FilaMensaje[]; // sin responder
  peticiones: FilaPeticion[]; // abiertas
  planes: { id: string; reordenes_por_ciclo: number }[];
  operacion: FilaAjustesOperacion | null;
};

export const COLUMNAS_PANEL = {
  solicitud:
    "id,creada_en,tipo,nombre,correo,area_id,meta,apoyo,dias,franjas,horarios_nota,zona_horaria,avisos_futuros,estado,motivo_cierre,nota_cierre,responder_antes,respondida_en,acuerdo,condiciones_aceptadas,origen,posible_spam,posible_duplicado,duplicado_de,notas_internas,participante_id",
  participante: "id,user_id,correo,nombre,nombre_preferido,estado,zona_horaria,solicitud_id,creado_en",
  ciclo: "id,participante_id,numero,plan_id,inicio,semanas,fin,dia_revision,hora_videollamada,estado,pausa_motivo,pausa_desde,pausa_hasta,foco_inicial",
  programa: "id,ciclo_id,participante_id,version,estado,nota_cambios,vigente_desde,publicado_en",
  ajuste: "id,participante_id,ciclo_id,creada_en,tipo,ocurrencias,desde,texto,pide_reorden,estado,respuesta,cuenta_como_reorden,responder_antes,respondida_en",
  revision: "id,participante_id,ciclo_id,semana,tipo,que_funciono,que_ajustamos,foco,iniciada_en,publicada_en",
  evidencia: "id,participante_id,ocurrencia_id,estado,foto_ruta,explicacion,creado_en",
  mensaje: "id,creado_en,motivo,nombre,correo,mensaje,estado",
  peticion: "id,recibida_en,origen,participante_id,correo,tipo,detalle,fecha_limite,estado,respuesta",
  operacion: "postulaciones_abiertas,tope_solicitudes_dia,ausencia_hasta,ausencia_texto",
} as const;

// ---------------------------------------------------------------------------
// Utilidades

export const ZONA_CHILE = "America/Santiago";
export const hoyChile = () => hoyEn(ZONA_CHILE);
const horaChile = (marca: string) => {
  try {
    return new Intl.DateTimeFormat("es-CL", { timeZone: ZONA_CHILE, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(marca));
  } catch {
    return "";
  }
};

// Nombre de pila (5.3: «de quién, nombre de pila»).
export const dePila = (nombre: string | null | undefined) => (nombre ?? "").trim().split(/\s+/)[0] ?? "";
export const nombreDe = (p: FilaParticipantePanel) => dePila(p.nombre_preferido || p.nombre);

const DIAS_FORM: Record<string, string> = Object.fromEntries(
  ["lun", "mar", "mie", "jue", "vie"].map((c, i) => [c, POSTULAR.horarios.dias[i]]),
);
const FRANJAS_FORM: Record<string, string> = Object.fromEntries(POSTULAR.horarios.franjas.map((f) => [f.valor, f.texto]));

// Ciclo abierto (o el último) de una persona.
export function cicloDe(d: Pick<DatosPanel, "ciclos">, participanteId: string): FilaCicloPanel | null {
  const suyos = d.ciclos.filter((c) => c.participante_id === participanteId).sort((a, b) => b.numero - a.numero);
  return suyos.find((c) => c.estado !== "cerrado") ?? suyos[0] ?? null;
}

// Semana del ciclo para una fecha (1…semanas); null antes del inicio.
export const semanaDelCiclo = (c: Pick<FilaCicloPanel, "inicio">, fecha: Iso) =>
  fecha < c.inicio ? null : Math.floor(diasEntre(c.inicio, fecha) / 7) + 1;

// Día de revisión de la semana n: lunes + (día − 1); si no es hábil, el hábil siguiente (5.3).
export function fechaRevision(c: Pick<FilaCicloPanel, "inicio" | "dia_revision">, n: number, feriados: readonly Iso[]): Iso {
  let f = sumarDias(c.inicio, (n - 1) * 7 + (c.dia_revision - 1));
  while (!esHabil(f, feriados)) f = sumarDias(f, 1);
  return f;
}

// Próxima revisión desde hoy (la de esta semana si aún no pasa; si no, la de la siguiente).
export function proximaRevision(c: FilaCicloPanel, hoy: Iso, feriados: readonly Iso[]): Iso {
  const n = Math.min(Math.max(semanaDelCiclo(c, hoy) ?? 1, 1), c.semanas);
  const esta = fechaRevision(c, n, feriados);
  return esta >= hoy || n >= c.semanas ? esta : fechaRevision(c, n + 1, feriados);
}

const publicadoDe = (d: Pick<DatosPanel, "programas">, cicloId: string) => d.programas.find((g) => g.ciclo_id === cicloId && g.estado === "publicado") ?? null;

export function estadoCiclo(d: Pick<DatosPanel, "programas">, c: FilaCicloPanel | null, hoy: Iso): FichaParticipante["estadoCiclo"] {
  if (!c || c.estado === "cerrado" || hoy > c.fin) return "cerrado";
  if (c.estado === "pausado") return "pausa";
  return publicadoDe(d, c.id) ? "en_curso" : "preparacion";
}

export const reordenesUsados = (d: Pick<DatosPanel, "ajustes">, cicloId: string) =>
  d.ajustes.filter((a) => a.ciclo_id === cicloId && a.cuenta_como_reorden).length;
export const reordenesDe = (d: Pick<DatosPanel, "planes">, plan: string) => d.planes.find((p) => p.id === plan)?.reordenes_por_ciclo ?? 0;

// ---------------------------------------------------------------------------
// Solicitudes → forma de la vista previa

export const sinRespuesta = (s: FilaSolicitud) => s.tipo === "solicitud" && (s.estado === "recibida" || s.estado === "en_revision") && !s.respondida_en;

export function aSolicitud(s: FilaSolicitud): Solicitud {
  const origen = s.origen && (s.origen.area || s.origen.apoyo) ? `?${new URLSearchParams(Object.entries(s.origen).filter(([, v]) => !!v) as [string, string][]).toString()}` : null;
  return {
    id: s.id,
    tipo: s.tipo,
    nombre: s.nombre ?? "—",
    correo: s.correo ?? "—",
    area: s.area_id ?? "",
    meta: s.meta ?? "",
    apoyo: s.apoyo ?? "nose",
    dias: s.dias.map((x) => DIAS_FORM[x] ?? x),
    franjas: s.franjas.map((x) => FRANJAS_FORM[x] ?? x),
    zona: s.zona_horaria ?? "—",
    recibida: fechaDe(s.creada_en) ?? "",
    hora: horaChile(s.creada_en),
    responderAntes: s.responder_antes,
    respondidaEl: fechaDe(s.respondida_en),
    origen,
    marcas: [...(s.posible_spam ? (["posible_spam"] as const) : []), ...(s.posible_duplicado ? (["posible_duplicado"] as const) : [])],
    anterior: s.duplicado_de ?? undefined,
    estado: s.estado,
    motivoCierre: s.motivo_cierre && s.motivo_cierre !== "avisado" ? s.motivo_cierre : undefined,
    avisos: s.avisos_futuros,
  };
}

// ---------------------------------------------------------------------------
// Participantes → forma de la vista previa

export function aFicha(d: DatosPanel, p: FilaParticipantePanel): FichaParticipante {
  const c = cicloDe(d, p.id);
  const hoy = d.hoy;
  const estado = estadoCiclo(d, c, hoy);
  const semana = c ? semanaDelCiclo(c, hoy) : null;
  return {
    id: p.id,
    nombre: nombreDe(p),
    correo: p.correo,
    zona: p.zona_horaria,
    plan: c?.plan_id ?? "coach",
    semana: semana && c ? Math.min(semana, c.semanas) : null,
    semanas: c?.semanas ?? 0,
    inicio: c?.inicio ?? fechaDe(p.creado_en) ?? hoy,
    proximaRevision: c ? proximaRevision(c, hoy, d.feriados) : hoy,
    horaVideollamada: c?.hora_videollamada?.slice(0, 5) ?? undefined,
    estadoCiclo: estado,
    reordenamientosUsados: c ? reordenesUsados(d, c.id) : 0,
  };
}

// ---------------------------------------------------------------------------
// Ajustes → forma de la vista previa

export function aAjuste(d: DatosPanel, a: FilaAjustePanel): AjustePanel {
  const p = d.participantes.find((x) => x.id === a.participante_id);
  const c = d.ciclos.find((x) => x.id === a.ciclo_id);
  const cercano = c?.plan_id === "cercano";
  return {
    id: a.id,
    participanteId: a.participante_id,
    nombre: p ? nombreDe(p) : "—",
    plan: c?.plan_id ?? "coach",
    tipo: a.tipo,
    acciones: [], // las ocurrencias se ven en la ficha
    desde: a.desde ?? fechaDe(a.creada_en) ?? d.hoy,
    detalle: a.texto,
    enviadaEl: fechaDe(a.creada_en) ?? d.hoy,
    estado: a.estado,
    reordenar: cercano && a.pide_reorden,
    venceEl: cercano && a.pide_reorden ? a.responder_antes : null,
    paraRevision: !(cercano && a.pide_reorden) && c ? proximaRevision(c, d.hoy, d.feriados) : null,
  };
}

// ---------------------------------------------------------------------------
// Cola de Hoy (5.3) y contadores de la navegación (5.2)

// Revisiones semanales pendientes: la de esta semana si ya llegó su día, y la anterior si quedó
// sin publicar. Solo ciclos en curso con programa publicado.
export function revisionesPendientes(d: DatosPanel) {
  const lista: { participante: FilaParticipantePanel; ciclo: FilaCicloPanel; semana: number; fecha: Iso }[] = [];
  for (const p of d.participantes) {
    const c = cicloDe(d, p.id);
    if (!c || estadoCiclo(d, c, d.hoy) !== "en_curso") continue;
    const n = semanaDelCiclo(c, d.hoy);
    if (!n) continue;
    for (const k of [n - 1, n]) {
      if (k < 1 || k > c.semanas) continue;
      const fecha = fechaRevision(c, k, d.feriados);
      if (fecha > d.hoy) continue;
      if (d.revisiones.some((r) => r.ciclo_id === c.id && r.semana === k && r.publicada_en)) continue;
      lista.push({ participante: p, ciclo: c, semana: k, fecha });
    }
  }
  return lista;
}

export function colaReal(d: DatosPanel, R: RutasPanel): Item[] {
  const items: Item[] = [];
  // 1. Solicitudes sin primera respuesta
  for (const s of d.solicitudes.filter(sinRespuesta)) {
    items.push({ id: s.id, que: HOY_PANEL.tipos.solicitud, quien: dePila(s.nombre), vence: s.responder_antes, boton: HOY_PANEL.botones.solicitud, href: conId(R.solicitud, s.id) });
  }
  // 2. Revisiones semanales (en Cercano, el resumen de la videollamada)
  for (const r of revisionesPendientes(d)) {
    items.push({
      id: `rev-${r.ciclo.id}-${r.semana}`,
      que: r.ciclo.plan_id === "cercano" ? HOY_PANEL.tipos.videollamada : HOY_PANEL.tipos.revision,
      quien: nombreDe(r.participante),
      vence: r.fecha,
      boton: HOY_PANEL.botones.revision,
      href: conId(R.revision, r.participante.id, { n: String(r.semana) }),
    });
  }
  // 3 y 4. Reordenamientos (Cercano, 1 día hábil) y solicitudes de ajuste (sin plazo propio)
  for (const fila of d.ajustes.filter((a) => a.estado === "enviada" || a.estado === "en_revision")) {
    const a = aAjuste(d, fila);
    const c = d.ciclos.find((x) => x.id === fila.ciclo_id);
    items.push({
      id: a.id,
      que: a.reordenar ? HOY_PANEL.tipos.reordenamiento : HOY_PANEL.tipos.ajuste,
      quien: a.nombre,
      vence: a.reordenar ? a.venceEl : null,
      nota: a.reordenar
        ? HOY_PANEL.reordenamientosUsados(c ? reordenesUsados(d, c.id) : 0, reordenesDe(d, a.plan))
        : a.paraRevision
          ? HOY_PANEL.paraRevision(diaCorto(a.paraRevision))
          : undefined,
      boton: HOY_PANEL.botones.ajuste,
      href: R.ajustes,
    });
  }
  // 5. Fotos y explicaciones por revisar (agrupadas)
  if (d.evidencias.length) {
    items.push({ id: "fotos", que: HOY_PANEL.tipos.fotos, vence: null, nota: HOY_PANEL.porRevisar(d.evidencias.length), boton: HOY_PANEL.botones.fotos, href: R.revisar });
  }
  // 6. Peticiones sobre datos
  for (const x of d.peticiones) {
    items.push({
      id: x.id,
      que: HOY_PANEL.tipos.datos,
      quien: x.correo,
      vence: x.fecha_limite,
      nota: x.fecha_limite ? undefined : HOY_PANEL.fijaFecha,
      boton: HOY_PANEL.botones.datos,
      href: R.contacto,
    });
  }
  // 7. Mensajes de contacto sin responder
  for (const m of d.mensajes) {
    items.push({ id: m.id, que: HOY_PANEL.tipos.mensaje, quien: dePila(m.nombre) || m.correo, vence: null, boton: HOY_PANEL.botones.mensaje, href: R.contacto });
  }
  // 8. Mantención: en diciembre, los feriados del año siguiente
  const anio = Number(d.hoy.slice(0, 4));
  if (d.hoy.slice(5, 7) === "12" && !d.feriados.some((f) => f.startsWith(`${anio + 1}-`))) {
    items.push({ id: "feriados", que: HOY_PANEL.tipos.mantencion, vence: null, nota: HOY_PANEL.feriados(anio + 1), boton: HOY_PANEL.botones.mantencion, href: `${R.mas}#feriados` });
  }
  return items.map((it, i) => ({ it, i })).sort((a, b) => ordenPorPlazo(a.it, b.it) || a.i - b.i).map((x) => x.it);
}

export function contadoresReales(d: DatosPanel, R: RutasPanel) {
  return {
    hoy: colaReal(d, R).filter((i) => i.vence).length,
    solicitudes: d.solicitudes.filter(sinRespuesta).length,
    participantes: revisionesPendientes(d).filter((r) => r.fecha === d.hoy).length,
    revisar: d.evidencias.length,
    mas: d.peticiones.length,
  };
}

// Lunes de la semana n del ciclo.
export const lunesSemana = (c: Pick<FilaCicloPanel, "inicio">, n: number) => sumarDias(c.inicio, (n - 1) * 7);
export const esLunes = (f: Iso) => diaSemana(f) === 1;
