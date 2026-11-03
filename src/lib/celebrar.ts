// Completar una acción (paquete 2): mensaje según el contexto y sonido opcional.
//
// · Solo usa el progreso PERSONAL (créditos, día, racha) que ya calcula la base con las reglas
//   vigentes: no cambia ni suma nada. El ranking global (ranking_semanal) se calcula aparte, por
//   cumplimiento relativo de la semana, y nada de este archivo lo lee ni lo alimenta: así la
//   futura puntuación competitiva puede definirse sin tocar el progreso personal.
// · El sonido viene apagado y se guarda por dispositivo (es una comodidad, no un dato). Se genera
//   con Web Audio (sin archivos) y nunca suena si el navegador no lo permite.

import type { DiaProgreso } from "../data/ejemplo-app";

export type TipoLogro = "accion" | "primera" | "ultima" | "corta" | "anterior" | "dia" | "racha";
export type Logro = { tipo: TipoLogro; mensaje: string };

export type ContextoLogro = {
  titulo: string;
  corta: boolean;
  desdeAnteriores: boolean;
  diaAnterior?: string; // «lunes 12», si se registró en otro día
  dia?: DiaProgreso; // el día de la acción, ya con la respuesta del servidor
  conCreditos: boolean; // false si la persona ocultó créditos y niveles
};

const credito = (n: number, con: boolean) => (con ? ` · +${n} ${n === 1 ? "crédito" : "créditos"}` : "");

// PROPUESTO: textos a confirmar con el fundador (y ChatGPT para el tono). Sin culpa, sin presión.
export function logroDeRegistro(c: ContextoLogro): Logro {
  const d = c.dia;
  const porAccion = 1;
  if (d?.estado === "completo") {
    const total = porAccion + d.bono;
    if (d.racha >= 3) return { tipo: "racha", mensaje: `Día completo, ${d.racha} días seguidos${credito(total, c.conCreditos)}` };
    return { tipo: "dia", mensaje: `Completaste el día${credito(total, c.conCreditos)}` };
  }
  if (c.desdeAnteriores && c.diaAnterior)
    return { tipo: "anterior", mensaje: `Registrada en el ${c.diaAnterior}${credito(porAccion, c.conCreditos)}. Tu avance se actualizó.` };
  if (c.corta) return { tipo: "corta", mensaje: `Hiciste la versión corta: también cuenta${credito(porAccion, c.conCreditos)}` };
  if (d && d.programadas > 1) {
    const quedan = d.programadas - d.hechas - d.enRevision - d.dejadas;
    if (quedan === 1) return { tipo: "ultima", mensaje: `Listo “${c.titulo}”. Te queda una para completar el día${credito(porAccion, c.conCreditos)}` };
    if (d.hechas === 1) return { tipo: "primera", mensaje: `Primer paso del día: “${c.titulo}”${credito(porAccion, c.conCreditos)}` };
  }
  return { tipo: "accion", mensaje: `Marcaste “${c.titulo}”${credito(porAccion, c.conCreditos)}` };
}

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

// Notas cortas y suaves: dos para una acción, tres para un día completo.
const NOTAS: Record<"accion" | "dia", number[]> = { accion: [659.25, 987.77], dia: [523.25, 659.25, 783.99] };

export function sonar(tipo: TipoLogro, { forzar = false } = {}) {
  if (!forzar && !(memoria ?? sonidoActivo())) return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    if (audio.state === "suspended") void audio.resume();
    const notas = tipo === "dia" || tipo === "racha" ? NOTAS.dia : NOTAS.accion;
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
