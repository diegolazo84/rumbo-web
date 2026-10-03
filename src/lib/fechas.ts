// Fechas de calendario en español de Chile, sin Intl ni zona horaria: una fecha es un
// texto «AAAA-MM-DD» (el día de calendario de la persona) y todo se calcula en UTC puro.
// Así el prerender y el navegador escriben exactamente lo mismo (sin errores de hidratación)
// y «martes 13» nunca se corre de día por la hora del equipo. La fecha válida de un registro
// siempre la decide el servidor (plataforma 6.7); esto solo sirve para mostrar.

export type Iso = string; // «2026-10-13»

export const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"] as const;
export const INICIALES = ["L", "M", "M", "J", "V", "S", "D"] as const;
export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;

const aFecha = (iso: Iso) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
};
const aIso = (f: Date): Iso => f.toISOString().slice(0, 10);

export const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Suma días (negativos para restar).
export function sumarDias(iso: Iso, dias: number): Iso {
  const f = aFecha(iso);
  f.setUTCDate(f.getUTCDate() + dias);
  return aIso(f);
}

// Días entre dos fechas (b − a).
export const diasEntre = (a: Iso, b: Iso) => Math.round((aFecha(b).getTime() - aFecha(a).getTime()) / 86_400_000);

// 1 = lunes … 7 = domingo.
export function diaSemana(iso: Iso): number {
  const d = aFecha(iso).getUTCDay();
  return d === 0 ? 7 : d;
}

export const lunesDe = (iso: Iso) => sumarDias(iso, 1 - diaSemana(iso));
export const numeroDia = (iso: Iso) => aFecha(iso).getUTCDate();
export const mesDe = (iso: Iso) => MESES[aFecha(iso).getUTCMonth()];
export const anioDe = (iso: Iso) => aFecha(iso).getUTCFullYear();
export const nombreDia = (iso: Iso) => DIAS[diaSemana(iso) - 1];
export const inicialDia = (iso: Iso) => INICIALES[diaSemana(iso) - 1];

// «martes 13»
export const diaCorto = (iso: Iso) => `${nombreDia(iso)} ${numeroDia(iso)}`;
// «13 de octubre»
export const diaMes = (iso: Iso) => `${numeroDia(iso)} de ${mesDe(iso)}`;
// «martes 13 de octubre»
export const fechaLarga = (iso: Iso) => `${nombreDia(iso)} ${diaMes(iso)}`;
// «martes 13 de octubre de 2026»
export const fechaCompleta = (iso: Iso) => `${fechaLarga(iso)} de ${anioDe(iso)}`;

// Los 7 días de la semana que empieza el lunes dado.
export const semanaDesde = (lunes: Iso): Iso[] => Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));

// «12 al 18 de octubre» o «26 de octubre al 1 de noviembre».
export function rangoSemana(lunes: Iso): string {
  const domingo = sumarDias(lunes, 6);
  return mesDe(lunes) === mesDe(domingo)
    ? `${numeroDia(lunes)} al ${diaMes(domingo)}`
    : `${diaMes(lunes)} al ${diaMes(domingo)}`;
}

// Miles con punto, como en Chile («1.500»), sin depender del Intl del navegador.
export const miles = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// «30 min», «1 h», «1 h 15 min»
export function duracionTexto(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// «08:30» + 30 → «09:00»
export function sumarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + minutos;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Días hábiles (lunes a viernes sin feriados), una sola implementación para la web y el panel
// (plataforma 10.2). Solo para mostrar estimaciones: la fecha válida la calcula la base con su
// tabla de feriados (6.5 y 6.6). `feriados` es la lista de fechas «AAAA-MM-DD» que no son hábiles.

export const esHabil = (iso: Iso, feriados: readonly Iso[] = []) => diaSemana(iso) <= 5 && !feriados.includes(iso);

// Suma `dias` días hábiles a partir del día siguiente a `desde`.
export function sumarDiasHabiles(desde: Iso, dias: number, feriados: readonly Iso[] = []): Iso {
  let fecha = desde;
  for (let quedan = dias; quedan > 0; ) {
    fecha = sumarDias(fecha, 1);
    if (esHabil(fecha, feriados)) quedan -= 1;
  }
  return fecha;
}

// Días hábiles en el intervalo (a, b].
export function habilesEntre(a: Iso, b: Iso, feriados: readonly Iso[] = []): number {
  let n = 0;
  for (let f = sumarDias(a, 1); f <= b; f = sumarDias(f, 1)) if (esHabil(f, feriados)) n++;
  return n;
}
