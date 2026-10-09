// Mi espacio real: filas de la base (RLS, 6.5) → los tipos que usan las pantallas de la vista
// previa (ejemplo-app.ts). Funciones puras: sin red, sin React (las prueba el navegador con
// datos simulados y la base local en CI).
import { calcularProgreso, type EstadoDia, type DiaProgreso, type EstadoRegistro, type Meta, type Novedad, type Ocurrencia, type PlanParam, type RegistroSemanal, type Revision, type SolicitudAjuste } from "../../../data/ejemplo-app";
import { bonoDiario, nivelPara, type CategoriaId } from "../../../data/rumbo";
import { diaMes, diasEntre, fechaLarga, sumarDias, type Iso } from "../../../lib/fechas";
import type { Ausencia, CicloEspacio, NotaCambios, Progreso } from "../../vista-previa/mi-espacio/espacio";
import { T_NOVEDADES } from "../../vista-previa/mi-espacio/textos";

// ---------------------------------------------------------------------------
// Filas (solo las columnas que se leen)

export type FilaParticipante = {
  id: string;
  correo: string;
  nombre: string;
  nombre_preferido: string | null;
  estado: string;
  zona_horaria: string;
  ocultar_gamificacion: boolean;
};
export type FilaCiclo = {
  id: string;
  numero: number;
  plan_id: PlanParam;
  inicio: Iso;
  semanas: number;
  fin: Iso;
  dia_revision: number;
  hora_videollamada: string | null;
  estado: "activo" | "pausado" | "cerrado";
  pausa_motivo: "pedida" | "cuidado" | null;
  pausa_desde: Iso | null;
  pausa_hasta: Iso | null;
  foco_inicial: string | null;
};
export type FilaPrograma = {
  id: string;
  version: number;
  estado: "publicado" | "reemplazado";
  nota_cambios: string | null;
  vigente_desde: Iso | null;
  publicado_en: string | null;
};
export type FilaMeta = {
  programa_id: string;
  clave: string;
  titulo: string;
  para_que: string | null;
  categoria: CategoriaId;
  hitos: { texto: string; logrado: boolean }[] | null;
  orden: number;
};
export type FilaOcurrencia = {
  id: string;
  programa_id: string;
  accion_id: string;
  meta_clave: string;
  meta_titulo: string;
  categoria: CategoriaId;
  fecha: Iso;
  hora: string | null;
  duracion_min: number;
  titulo: string;
  instrucciones: string;
  version_corta: string | null;
  requiere_foto: boolean;
  vigente: boolean;
  anulada_motivo: "ajuste" | "pausa" | null;
  anulada_en: Iso | null;
};
export type FilaRegistro = {
  ocurrencia_id: string;
  estado: "hecha" | "en_revision" | "aprobada" | "rechazada" | "dejada";
  version: "completa" | "corta" | null;
  explicacion: string | null;
  nota_revision: string | null;
  revisado_en: string | null;
};
export type FilaProgreso = { creditos: number; nivel: number; racha: number; bono_siguiente: number };
export type FilaDia = {
  fecha: Iso;
  programadas: number;
  hechas: number;
  en_revision: number;
  creditos_acciones: number;
  bono: number;
  racha: number;
  en_suspenso: boolean;
};
export type FilaRegistroSemanal = {
  semana: number;
  carga: "liviana" | "justa" | "pesada" | null;
  funciono: string | null;
  costo: string | null;
  cambiar: string | null;
  enviado_en: string | null;
};
export type FilaRevision = {
  semana: number;
  que_funciono: string | null;
  que_ajustamos: string | null;
  foco: string | null;
  iniciada_en: string | null;
  publicada_en: string | null;
};
export type FilaAjuste = {
  id: string;
  creada_en: string;
  tipo: string;
  ocurrencias: string[] | null;
  desde: Iso | null;
  texto: string;
  estado: SolicitudAjuste["estado"];
  respuesta: string | null;
  cuenta_como_reorden: boolean;
  respondida_en: string | null;
};
export type FilaPlan = { id: PlanParam; reordenes_por_ciclo: number };

export type Filas = {
  participante: FilaParticipante;
  ciclo: FilaCiclo;
  programas: FilaPrograma[];
  metas: FilaMeta[];
  ocurrencias: FilaOcurrencia[];
  registros: FilaRegistro[];
  progreso: FilaProgreso | null;
  dias: FilaDia[];
  registrosSemanales: FilaRegistroSemanal[];
  revisiones: FilaRevision[];
  ajustes: FilaAjuste[];
  planes: FilaPlan[];
};

// ---------------------------------------------------------------------------
// Fechas

// «Hoy» en una zona horaria («2026-10-13»). La base lo calcula igual (privado.hoy_de).
export function hoyEn(zona: string, ahora = new Date()): Iso {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
  }
}

// Fecha local (Chile) de una marca de tiempo de la base.
export const fechaDe = (marca: string | null | undefined, zona = "America/Santiago"): Iso | null =>
  marca ? hoyEn(zona, new Date(marca)) : null;

const hhmm = (hora: string | null) => (hora ? hora.slice(0, 5) : null);

// Minutos de diferencia entre una zona y Chile en este momento (para la hora de la videollamada).
function minutosDesdeUtc(zona: string, ahora: Date) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(ahora);
  const v = (t: string) => Number(partes.find((p) => p.type === t)?.value ?? 0);
  const local = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour") % 24, v("minute"));
  return Math.round((local - ahora.getTime()) / 60_000);
}

export function horaLocalDe(zona: string, ahora = new Date()): ((hora: string) => string) | null {
  if (!zona || zona === "America/Santiago") return null;
  let dif = 0;
  try {
    dif = minutosDesdeUtc(zona, ahora) - minutosDesdeUtc("America/Santiago", ahora);
  } catch {
    return null;
  }
  if (!dif) return null;
  return (hora: string) => {
    const [h, m] = hora.split(":").map(Number);
    const total = (((h * 60 + m + dif) % 1440) + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };
}

// ---------------------------------------------------------------------------
// Registros y ocurrencias

export function estadoRegistro(r: FilaRegistro | undefined): EstadoRegistro | null {
  if (!r) return null;
  switch (r.estado) {
    case "hecha":
      return r.version === "corta" ? "corta" : "hecha";
    case "en_revision":
      return "revision";
    case "aprobada":
      return "aprobada";
    case "rechazada":
      return "no_aprobada";
    case "dejada":
      return "dejada";
  }
}

export function aOcurrencia(o: FilaOcurrencia, r: FilaRegistro | undefined, inicio: Iso): Ocurrencia {
  return {
    id: o.id,
    accionId: o.accion_id,
    metaId: o.meta_clave,
    categoria: o.categoria,
    fecha: o.fecha,
    semana: Math.floor(diasEntre(inicio, o.fecha) / 7) + 1,
    titulo: o.titulo,
    hora: hhmm(o.hora),
    duracion: o.duracion_min,
    instrucciones: o.instrucciones.split(/\n+/).map((l) => l.trim()).filter(Boolean),
    versionCorta: o.version_corta,
    conFoto: o.requiere_foto,
    vigente: o.vigente,
    ...(o.vigente || !o.anulada_motivo ? {} : { anulada: { motivo: o.anulada_motivo, en: o.anulada_en ?? o.fecha } }),
    registro: estadoRegistro(r),
    metaTitulo: o.meta_titulo,
    explicacion: r?.explicacion ?? null,
    notaRevision: r?.nota_revision ?? null,
  };
}

const ordenOcurrencias = (a: Ocurrencia, b: Ocurrencia) =>
  a.fecha.localeCompare(b.fecha) || (a.hora ?? "99").localeCompare(b.hora ?? "99") || a.titulo.localeCompare(b.titulo);

// ---------------------------------------------------------------------------
// Metas: las del programa publicado; si aún no hay metas visibles, las que nombran las ocurrencias.

export function aMeta(m: FilaMeta): Meta {
  return {
    id: m.clave,
    titulo: m.titulo,
    corto: m.titulo,
    categoria: m.categoria,
    paraQue: m.para_que,
    hitos: Array.isArray(m.hitos) ? m.hitos.map((h) => ({ texto: String(h.texto ?? ""), logrado: !!h.logrado })) : [],
  };
}

function metasDe(filas: Filas, publicado: FilaPrograma | undefined) {
  const delPublicado = filas.metas
    .filter((m) => publicado && m.programa_id === publicado.id)
    .sort((a, b) => a.orden - b.orden)
    .map(aMeta);
  // Todas las versiones: la más reciente de cada clave (para el detalle de acciones pasadas).
  const version = new Map(filas.programas.map((p) => [p.id, p.version]));
  const porClave = new Map<string, FilaMeta>();
  for (const m of filas.metas) {
    const actual = porClave.get(m.clave);
    if (!actual || (version.get(m.programa_id) ?? 0) > (version.get(actual.programa_id) ?? 0)) porClave.set(m.clave, m);
  }
  const todas = [...porClave.values()].map(aMeta);
  for (const o of filas.ocurrencias) {
    if (!todas.some((m) => m.id === o.meta_clave))
      todas.push({ id: o.meta_clave, titulo: o.meta_titulo, corto: o.meta_titulo, categoria: o.categoria, paraQue: null, hitos: [] });
  }
  return { metas: delPublicado, todas };
}

// ---------------------------------------------------------------------------
// Progreso (D4): lo calcula la base; aquí solo se arma para mostrarlo.

export function armarProgreso(progreso: FilaProgreso | null, dias: FilaDia[], lista: Ocurrencia[], inicio: Iso, hoy: Iso): Progreso {
  // Sin fila de progreso todavía (programa recién publicado): lo mismo que diría la base.
  const base = calcularProgreso(lista, hoy, inicio);
  if (!progreso) return base;
  const porFecha = new Map(dias.map((d) => [d.fecha, d]));
  const resultado: DiaProgreso[] = [];
  for (let fecha = inicio; fecha <= hoy; fecha = sumarDias(fecha, 1)) {
    const d = porFecha.get(fecha);
    const delDia = lista.filter((o) => o.fecha === fecha && o.vigente);
    const dejadas = delDia.filter((o) => o.registro === "dejada").length;
    if (!d || !d.programadas) {
      resultado.push({ fecha, programadas: 0, hechas: 0, enRevision: 0, dejadas, estado: "sin_acciones", bono: 0, creditos: 0, racha: d?.racha ?? 0 });
      continue;
    }
    let estado: EstadoDia;
    if (d.hechas === d.programadas) estado = "completo";
    else if (d.en_suspenso || d.hechas + d.en_revision === d.programadas) estado = "suspenso";
    else if (fecha === hoy) estado = "en_curso";
    else estado = "incompleto";
    resultado.push({
      fecha,
      programadas: d.programadas,
      hechas: d.hechas,
      enRevision: d.en_revision,
      dejadas,
      estado,
      bono: d.bono,
      creditos: d.creditos_acciones + d.bono,
      racha: d.racha,
    });
  }
  const { actual, siguiente } = nivelPara(progreso.creditos);
  return {
    dias: resultado,
    creditos: progreso.creditos,
    racha: progreso.racha,
    nivel: actual,
    siguiente,
    bonoSiguiente: progreso.bono_siguiente ?? bonoDiario(progreso.racha + 1),
  };
}

// ---------------------------------------------------------------------------
// Ciclo

export function armarCiclo(c: FilaCiclo, publicado: boolean, hoy: Iso, ajustes: FilaAjuste[], planes: FilaPlan[]): CicloEspacio {
  const estado: CicloEspacio["estado"] =
    c.estado === "cerrado" || hoy > c.fin ? "cerrado" : c.estado === "pausado" ? "pausa" : publicado ? "en_curso" : "preparacion";
  return {
    numero: c.numero,
    plan: c.plan_id,
    semanas: c.semanas,
    inicio: c.inicio,
    fin: c.fin,
    diaRevision: c.dia_revision,
    horaVideollamada: hhmm(c.hora_videollamada) ?? "",
    reordenamientosUsados: ajustes.filter((a) => a.cuenta_como_reorden).length,
    reordenamientosMax: planes.find((p) => p.id === c.plan_id)?.reordenes_por_ciclo ?? 0,
    estado,
    pausa: c.pausa_motivo ? { motivo: c.pausa_motivo, desde: c.pausa_desde, hasta: c.pausa_hasta } : null,
  };
}

// ---------------------------------------------------------------------------
// Novedades (4.4.3): las más recientes primero, de los últimos 14 días, sin las ya vistas.

const DIAS_NOVEDAD = 14;

export function armarNovedades(
  filas: Filas,
  lista: Ocurrencia[],
  hoy: Iso,
  vistas: Set<string>,
  R: { semana: string; ajusteLista: string; accion: string },
): Novedad[] {
  const desde = sumarDias(hoy, -DIAS_NOVEDAD);
  const items: (Novedad & { cuando: string })[] = [];
  for (const r of filas.revisiones) {
    if (!r.publicada_en || (fechaDe(r.publicada_en) ?? "") < desde) continue;
    items.push({
      id: `revision-${r.semana}`,
      texto: T_NOVEDADES.revision(r.semana),
      enlace: T_NOVEDADES.verRevision,
      destino: "semana",
      ruta: `${R.semana}?n=${r.semana}`,
      cuando: r.publicada_en,
    });
  }
  for (const a of filas.ajustes) {
    if (a.estado !== "respondida" && a.estado !== "sin_cambios") continue;
    if (!a.respondida_en || (fechaDe(a.respondida_en) ?? "") < desde) continue;
    items.push({ id: `ajuste-${a.id}`, texto: T_NOVEDADES.ajuste, enlace: T_NOVEDADES.verAjuste, destino: "ajuste", cuando: a.respondida_en });
  }
  for (const p of filas.programas) {
    if (p.version < 2 || !p.publicado_en || !p.vigente_desde || (fechaDe(p.publicado_en) ?? "") < desde) continue;
    items.push({
      id: `programa-${p.version}`,
      texto: T_NOVEDADES.programa(diaMes(p.vigente_desde)),
      enlace: T_NOVEDADES.verPrograma,
      destino: "programa",
      ruta: `${R.semana}?n=${Math.max(1, Math.floor(diasEntre(filas.ciclo.inicio, p.vigente_desde) / 7))}`,
      cuando: p.publicado_en,
    });
  }
  for (const r of filas.registros) {
    if ((r.estado !== "aprobada" && r.estado !== "rechazada") || !r.revisado_en || (fechaDe(r.revisado_en) ?? "") < desde) continue;
    const o = lista.find((x) => x.id === r.ocurrencia_id);
    if (!o) continue;
    items.push({
      id: `evidencia-${r.ocurrencia_id}-${r.estado}`,
      texto: r.estado === "aprobada" ? T_NOVEDADES.aprobada(o.titulo) : T_NOVEDADES.rechazada(o.titulo),
      enlace: T_NOVEDADES.verAccion,
      destino: "accion",
      ruta: `${R.accion}?id=${o.id}`,
      cuando: r.revisado_en,
    });
  }
  return items
    .filter((n) => !vistas.has(n.id))
    .sort((a, b) => b.cuando.localeCompare(a.cuando))
    .map(({ cuando: _, ...n }) => n);
}

// ---------------------------------------------------------------------------
// Todo junto

export type Contexto = { hoy: Iso; ventana: number; semanasEnRevision: number[] };

export function armarDatos(filas: Filas, ctx: Contexto) {
  const { ciclo: c } = filas;
  const publicado = filas.programas.find((p) => p.estado === "publicado");
  const registros = new Map(filas.registros.map((r) => [r.ocurrencia_id, r]));
  const lista = filas.ocurrencias.map((o) => aOcurrencia(o, registros.get(o.id), c.inicio)).sort(ordenOcurrencias);
  const { metas, todas } = metasDe(filas, publicado);
  const ciclo = armarCiclo(c, !!publicado, ctx.hoy, filas.ajustes, filas.planes);
  const p = filas.participante;
  const nombre = p.nombre_preferido || p.nombre;

  const registrosSemanales: RegistroSemanal[] = filas.registrosSemanales.map((r) => ({
    semana: r.semana,
    carga: r.carga,
    funciono: r.funciono ?? "",
    costo: r.costo ?? "",
    cambiar: r.cambiar ?? "",
    enviadoEl: fechaDe(r.enviado_en),
  }));
  const revisiones: Revision[] = filas.revisiones
    .filter((r) => r.publicada_en)
    .map((r) => ({
      semana: r.semana,
      iniciadaEl: fechaDe(r.iniciada_en),
      publicadaEl: fechaDe(r.publicada_en),
      funciono: r.que_funciono ?? "",
      ajustamos: r.que_ajustamos ?? "",
      foco: r.foco ?? "",
    }));
  const solicitudesAjuste: SolicitudAjuste[] = [...filas.ajustes]
    .sort((a, b) => b.creada_en.localeCompare(a.creada_en))
    .map((a) => ({
      id: a.id,
      tipo: a.tipo,
      acciones: a.ocurrencias ?? [],
      desde: a.desde ?? fechaDe(a.creada_en) ?? ctx.hoy,
      detalle: a.texto,
      enviadaEl: fechaDe(a.creada_en) ?? ctx.hoy,
      estado: a.estado,
      respuesta: a.respuesta,
    }));
  const notasCambios: NotaCambios[] = filas.programas
    .filter((x) => x.nota_cambios)
    .map((x) => ({ version: x.version, nota: x.nota_cambios ?? "", publicadoEl: fechaDe(x.publicado_en) }));

  return {
    lista,
    metas,
    metasTodas: todas,
    ciclo,
    nombre,
    publicado,
    progreso: armarProgreso(filas.progreso, filas.dias, lista, c.inicio, ctx.hoy),
    esc: {
      participante: { nombre, zonaHoraria: p.zona_horaria },
      plan: c.plan_id,
      diaRevision: c.dia_revision,
      horaVideollamada: hhmm(c.hora_videollamada) ?? "",
      horaLocal: horaLocalDe(p.zona_horaria),
      reordenamientosUsados: ciclo.reordenamientosUsados,
      metas,
      ocurrencias: lista,
      focoInicial: c.foco_inicial ?? "",
      registrosSemanales,
      revisiones,
      solicitudesAjuste,
    },
    notasCambios,
  };
}

// Ausencia de quien acompaña (estado_postulaciones → ausencia {hasta, texto}).
export function armarAusencia(a: { hasta: Iso; texto: string | null } | null | undefined): Ausencia | null {
  if (!a?.hasta) return null;
  const vuelve = sumarDias(a.hasta, 1);
  const texto = a.texto?.trim() || `Tu coach vuelve el ${fechaLarga(vuelve)}.`;
  return { hasta: a.hasta, vuelve, texto, banda: texto };
}
