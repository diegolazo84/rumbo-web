// Panel del coach, «Mis participantes» (referencia de ChatGPT, 21-oct-2026): estado de seguimiento,
// progreso de la semana, próxima revisión, actividad reciente y revisiones de hoy. Funciones puras
// sobre filas de la base; nada se inventa. Las señales son las mismas de bandeja_seguimiento()
// (B2, migrations/20261028000000_bandeja_coach.sql), calculadas aquí para no depender de que esa
// migración ya esté aplicada.
import { diaSemana, diasEntre, sumarDias, type Iso } from "../../../lib/fechas";
import { cicloDe, estadoCiclo, fechaRevision, nombreDe, proximaRevision, semanaDelCiclo, ZONA_CHILE, type DatosPanel, type FilaCicloPanel, type FilaParticipantePanel } from "./datos";

export type FilaOcurrenciaSemana = { id: string; participante_id: string; fecha: Iso; vigente: boolean };
export type FilaRegistroSeguimiento = { ocurrencia_id: string; participante_id: string; estado: string; creado_en: string };
export type FilaRegistroSemanalSeguimiento = { participante_id: string; ciclo_id: string; semana: number; enviado_en: string | null };
export type FilaVideollamadaSeguimiento = { participante_id: string; ciclo_id: string; semana: number; programada_para: string; estado: string };

export type Extra = {
  ocurrencias: FilaOcurrenciaSemana[];
  registros: FilaRegistroSeguimiento[];
  registrosSemanales: FilaRegistroSemanalSeguimiento[];
  videollamadas: FilaVideollamadaSeguimiento[];
};

export type EstadoSeguimiento = "al_dia" | "sin_registro" | "necesita_apoyo" | "preparacion" | "pausa" | "cerrado";

export type FilaSeguimiento = {
  id: string;
  nombre: string;
  plan: "coach" | "cercano";
  estado: EstadoSeguimiento;
  motivos: ("ajuste" | "evidencia" | "sin_actividad" | "registro")[];
  hechas: number;
  programadas: number;
  proxima: Iso | null;
  horaProxima: string | null; // solo plan cercano
  revisionEstaSemana: boolean;
  revisionHoy: boolean; // revisión de hoy aún sin publicar
};

const HECHAS = new Set(["hecha", "aprobada"]);
export const DIAS_SIN_ACTIVIDAD = 3; // como bandeja_seguimiento()

const fechaHora = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_CHILE, year: "numeric", month: "2-digit", day: "2-digit" });
const hora = new Intl.DateTimeFormat("es-CL", { timeZone: ZONA_CHILE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export const fechaChile = (marca: string) => fechaHora.format(new Date(marca)) as Iso;
export const horaChile = (marca: string) => hora.format(new Date(marca));

const lunesDe = (f: Iso) => sumarDias(f, 1 - diaSemana(f));

// Lunes de la semana en curso de cada ciclo activo: desde ahí se leen acciones y registros.
export function lunesEnCurso(d: DatosPanel): Iso | null {
  const lunes = d.participantes
    .map((p) => cicloDe(d, p.id))
    .filter((c): c is FilaCicloPanel => !!c && c.estado === "activo" && c.inicio <= d.hoy && d.hoy <= c.fin)
    .map((c) => sumarDias(c.inicio, ((semanaDelCiclo(c, d.hoy) ?? 1) - 1) * 7));
  return lunes.length ? lunes.sort()[0] : null;
}

export function seguimiento(d: DatosPanel, x: Extra): FilaSeguimiento[] {
  const hoy = d.hoy;
  return d.participantes
    .filter((p) => p.estado !== "cerrado")
    .map((p) => fila(d, x, p, hoy));
}

function fila(d: DatosPanel, x: Extra, p: FilaParticipantePanel, hoy: Iso): FilaSeguimiento {
  const c = cicloDe(d, p.id);
  const ec = estadoCiclo(d, c, hoy);
  const base = { id: p.id, nombre: nombreDe(p), plan: c?.plan_id ?? "coach", motivos: [] as FilaSeguimiento["motivos"] } as const;
  if (!c || ec !== "en_curso" || hoy < c.inicio) {
    return {
      ...base,
      motivos: [],
      estado: ec === "en_curso" ? "preparacion" : ec,
      hechas: 0,
      programadas: 0,
      proxima: c && ec !== "cerrado" ? proximaRevision(c, hoy, d.feriados) : null,
      horaProxima: null,
      revisionEstaSemana: false,
      revisionHoy: false,
    };
  }
  const n = Math.min(semanaDelCiclo(c, hoy) ?? 1, c.semanas);
  const lunes = sumarDias(c.inicio, (n - 1) * 7);
  const domingo = sumarDias(lunes, 6);
  const semana = x.ocurrencias.filter((o) => o.participante_id === p.id && o.vigente && o.fecha >= lunes && o.fecha <= domingo);
  const ids = new Set(semana.map((o) => o.id));
  const suyos = x.registros.filter((r) => r.participante_id === p.id);
  const hechas = suyos.filter((r) => ids.has(r.ocurrencia_id) && HECHAS.has(r.estado)).length;

  // Señales de bandeja_seguimiento(): ajustes sin responder, evidencias por revisar, días sin registrar.
  const ajustes = d.ajustes.filter((a) => a.participante_id === p.id && (a.estado === "enviada" || a.estado === "en_revision")).length;
  const evidencias = d.evidencias.filter((e) => e.participante_id === p.id).length;
  const ultimo = suyos.map((r) => fechaChile(r.creado_en)).sort().at(-1) ?? null;
  const sinActividad = diasEntre(ultimo && ultimo > c.inicio ? ultimo : c.inicio, hoy);
  const diaRev = fechaRevision(c, n, d.feriados);
  const registroEnviado = x.registrosSemanales.some((w) => w.ciclo_id === c.id && w.semana === n && w.enviado_en);
  const publicada = d.revisiones.some((r) => r.ciclo_id === c.id && r.semana === n && r.publicada_en);
  const motivos: FilaSeguimiento["motivos"] = [];
  if (ajustes) motivos.push("ajuste");
  if (evidencias) motivos.push("evidencia");
  if (sinActividad >= DIAS_SIN_ACTIVIDAD) motivos.push("sin_actividad");
  const faltaRegistro = diaRev <= hoy && !registroEnviado && !publicada;
  if (faltaRegistro) motivos.push("registro");

  const proxima = proximaRevision(c, hoy, d.feriados);
  const nProxima = Math.min(semanaDelCiclo(c, proxima) ?? n, c.semanas);
  const llamada = x.videollamadas.find((v) => v.ciclo_id === c.id && v.semana === nProxima && v.estado === "programada");
  return {
    ...base,
    motivos,
    estado: motivos.some((m) => m !== "registro") ? "necesita_apoyo" : faltaRegistro ? "sin_registro" : "al_dia",
    hechas,
    programadas: semana.length,
    proxima: llamada ? fechaChile(llamada.programada_para) : proxima,
    horaProxima: c.plan_id === "cercano" ? (llamada ? horaChile(llamada.programada_para) : (c.hora_videollamada?.slice(0, 5) ?? null)) : null,
    revisionEstaSemana: proxima >= lunesDe(hoy) && proxima <= sumarDias(lunesDe(hoy), 6),
    revisionHoy: diaRev === hoy && !publicada,
  };
}

// Actividad reciente: lo que hicieron las personas (acciones, registros semanales, ajustes).
export type Actividad = { id: string; participanteId: string; nombre: string; tipo: "accion" | "registro" | "ajuste"; marca: string };

export function actividadReciente(d: DatosPanel, x: Extra, max = 6): Actividad[] {
  const nombre = new Map(d.participantes.map((p) => [p.id, nombreDe(p)]));
  const lista: Actividad[] = [
    ...x.registros.filter((r) => HECHAS.has(r.estado)).map((r) => ({ id: `a-${r.ocurrencia_id}`, participanteId: r.participante_id, tipo: "accion" as const, marca: r.creado_en })),
    ...x.registrosSemanales.filter((w) => w.enviado_en).map((w) => ({ id: `w-${w.ciclo_id}-${w.semana}`, participanteId: w.participante_id, tipo: "registro" as const, marca: w.enviado_en! })),
    ...d.ajustes.map((a) => ({ id: `j-${a.id}`, participanteId: a.participante_id, tipo: "ajuste" as const, marca: a.creada_en })),
  ]
    .filter((a) => nombre.has(a.participanteId))
    .map((a) => ({ ...a, nombre: nombre.get(a.participanteId)! }));
  return lista.sort((a, b) => (a.marca < b.marca ? 1 : a.marca > b.marca ? -1 : 0)).slice(0, max);
}
