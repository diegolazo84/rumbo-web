// Completar una acción (paquete 2): mensaje según el contexto y sonido opcional.
//
// · Solo usa el progreso PERSONAL (créditos, día, racha) que ya calcula la base con las reglas
//   vigentes: no cambia ni suma nada. El ranking global (ranking_semanal) se calcula aparte, por
//   cumplimiento relativo de la semana, y nada de este archivo lo lee ni lo alimenta: así la
//   futura puntuación competitiva puede definirse sin tocar el progreso personal.
// · El sonido viene apagado y se guarda por dispositivo (es una comodidad, no un dato). Se genera
//   con Web Audio (sin archivos) y nunca suena si el navegador no lo permite.

import type { DiaProgreso } from "../data/ejemplo-app";

export type TipoLogro = "accion" | "primera" | "ultima" | "corta" | "anterior" | "dia" | "racha" | "hito";
// Intensidad de la celebración: lo cotidiano es suave; el día completo, la racha y los hitos, más.
export type Intensidad = "suave" | "dia" | "racha" | "hito";
export type Logro = {
  tipo: TipoLogro;
  intensidad: Intensidad;
  titulo?: string; // solo en día completo, racha e hito: «¡Lo lograste!»
  texto: string; // el reconocimiento
  creditos?: string; // «+4 créditos», aparte y en segundo plano (no aparece si se ocultaron)
  mensaje: string; // todo junto, para leerlo en una línea
};

export type ContextoLogro = {
  titulo: string;
  corta: boolean;
  desdeAnteriores: boolean;
  diaAnterior?: string; // «lunes 12», si se registró en otro día
  dia?: DiaProgreso; // el día de la acción, ya con la respuesta del servidor
  conCreditos: boolean; // false si la persona ocultó créditos y niveles
};

// Rachas que se celebran como hito (semanas seguidas de días completos dentro del ciclo).
const HITOS: Record<number, string> = { 7: "¡Una semana seguida!", 14: "¡Dos semanas seguidas!", 21: "¡Tres semanas seguidas!", 28: "¡Cuatro semanas seguidas!" };
const NUMEROS = ["", "Un", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete", "Ocho", "Nueve", "Diez"];
const diasSeguidos = (n: number) => `${NUMEROS[n] ?? n} ${n === 1 ? "día seguido" : "días seguidos"}`;
const creditosTexto = (n: number) => `+${n} ${n === 1 ? "crédito" : "créditos"}`;

function armar(tipo: TipoLogro, intensidad: Intensidad, texto: string, n: number, con: boolean, titulo?: string): Logro {
  const creditos = con ? creditosTexto(n) : undefined;
  return { tipo, intensidad, titulo, texto, creditos, mensaje: [titulo, texto, creditos].filter(Boolean).join(" ") };
}

// PROPUESTO: textos a confirmar con el fundador (y ChatGPT para el tono). Sin culpa, sin presión.
// Lo cotidiano se reconoce con calma; el día completo, la racha y los hitos, con más fuerza.
export function logroDeRegistro(c: ContextoLogro): Logro {
  const d = c.dia;
  const porAccion = 1;
  const con = c.conCreditos;
  if (d?.estado === "completo") {
    const total = porAccion + d.bono;
    if (HITOS[d.racha])
      return armar("hito", "hito", `Completaste tu día. ${diasSeguidos(d.racha)} avanzando a tu ritmo.`, total, con, HITOS[d.racha]);
    if (d.racha >= 3) return armar("racha", "racha", `Completaste tu día. ${diasSeguidos(d.racha)} avanzando a tu ritmo.`, total, con, "¡Lo lograste!");
    return armar("dia", "dia", "Completaste tu día.", total, con, "¡Lo lograste!");
  }
  if (c.desdeAnteriores && c.diaAnterior) return armar("anterior", "suave", `Registrada en el ${c.diaAnterior}. Tu avance se actualizó.`, porAccion, con);
  if (c.corta) return armar("corta", "suave", "Hiciste la versión corta: también cuenta.", porAccion, con);
  if (d && d.programadas > 1) {
    const quedan = d.programadas - d.hechas - d.enRevision - d.dejadas;
    if (quedan === 1) return armar("ultima", "suave", "Te queda una para completar el día.", porAccion, con);
    if (d.hechas === 1) return armar("primera", "suave", `Primer paso del día: “${c.titulo}”.`, porAccion, con);
  }
  return armar("accion", "suave", `Marcaste “${c.titulo}”.`, porAccion, con);
}

// Cuánto se queda la confirmación a la vista (se pausa con el puntero o el foco encima).
export const DURACION_LOGRO: Record<Intensidad, number> = { suave: 4000, dia: 6000, racha: 6000, hito: 7000 };

// ---------------------------------------------------------------------------
// Sonido opcional

const CLAVE_SONIDO = "rumbo-sonido";

export function sonidoActivo(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(CLAVE_SONIDO) === "1";
  } catch {
    return false;
  }
}

export function guardarSonido(activo: boolean) {
  try {
    if (activo) localStorage.setItem(CLAVE_SONIDO, "1");
    else localStorage.removeItem(CLAVE_SONIDO);
  } catch {
    /* sin almacenamiento: vale solo mientras la página siga abierta */
  }
  memoria = activo;
}

let memoria: boolean | null = null;
let audio: AudioContext | null = null;

// Notas cortas y suaves: dos para una acción, tres para un día completo, cuatro para un hito.
const NOTAS: Record<Intensidad, number[]> = {
  suave: [659.25, 987.77],
  dia: [523.25, 659.25, 783.99],
  racha: [523.25, 659.25, 783.99],
  hito: [523.25, 659.25, 783.99, 1046.5],
};

export function sonar(intensidad: Intensidad, { forzar = false } = {}) {
  if (!forzar && !(memoria ?? sonidoActivo())) return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    if (audio.state === "suspended") void audio.resume();
    const notas = NOTAS[intensidad];
    const t0 = audio.currentTime + 0.01;
    notas.forEach((f, i) => {
      const osc = audio!.createOscillator();
      const vol = audio!.createGain();
      const t = t0 + i * 0.09;
      osc.type = "sine";
      osc.frequency.value = f;
      vol.gain.setValueAtTime(0.0001, t);
      vol.gain.exponentialRampToValueAtTime(0.07, t + 0.015);
      vol.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      osc.connect(vol).connect(audio!.destination);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  } catch {
    /* sin audio: la confirmación visual basta */
  }
}
