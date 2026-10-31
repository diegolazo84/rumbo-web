// Datos del informe de cierre de ciclo (maqueta de ChatGPT, 30-oct-2026).
//   · Real: informe_ciclo(p_ciclo) de la base (C3). El mensaje de cierre llega solo cuando la
//     migración 20261122000000 está aplicada y el coach lo escribió; si no, null.
//   · Vista previa: se calcula con las mismas reglas sobre el escenario de ejemplo. Sin mensaje de
//     cierre (no se inventan mensajes del coach): se muestra el último foco publicado.
import type { Revision } from "../../../../data/ejemplo-app";
import { sumarDias, type Iso } from "../../../../lib/fechas";
import { datos, supabase } from "../../../../lib/supabase";
import type { CicloEspacio, Progreso } from "../espacio";

export type SemanaInforme = { semana: number; programadas: number; hechas: number };
export type MensajeCierre = { texto: string; autor: string | null; en: string | null };
export type Informe = {
  programadas: number;
  hechas: number;
  cumplimiento: number | null; // % de lo programado hecho; null sin acciones programadas
  mejorRacha: number;
  diasCompletos: number;
  creditos: number;
  semanas: SemanaInforme[];
  focos: { semana: number; foco: string }[];
  mensaje: MensajeCierre | null;
};

type InformeBase = {
  acciones: { programadas: number; hechas: number; cumplimiento: number | null };
  constancia: { dias_completos: number; mejor_racha: number };
  creditos: number;
  semanas: { semana: number; programadas: number; hechas: number }[];
  focos: { semana: number; foco: string | null }[];
  mensaje_cierre?: { texto: string; autor: string | null; en: string | null } | null;
};

export async function informeReal(ciclo: string): Promise<Informe> {
  const sb = await supabase();
  const i = datos(await sb.rpc("informe_ciclo", { p_ciclo: ciclo })) as InformeBase;
  return {
    programadas: Number(i.acciones.programadas),
    hechas: Number(i.acciones.hechas),
    cumplimiento: i.acciones.cumplimiento === null ? null : Number(i.acciones.cumplimiento),
    mejorRacha: Number(i.constancia.mejor_racha),
    diasCompletos: Number(i.constancia.dias_completos),
    creditos: Number(i.creditos),
    semanas: i.semanas.map((s) => ({ semana: s.semana, programadas: s.programadas, hechas: s.hechas })),
    focos: i.focos.filter((f): f is { semana: number; foco: string } => !!f.foco?.trim()),
    mensaje: i.mensaje_cierre?.texto ? i.mensaje_cierre : null,
  };
}

// Vista previa: lo mismo que calcula informe_ciclo, sobre el progreso de ejemplo.
export function informeEjemplo(progreso: Progreso, ciclo: CicloEspacio, revisiones: Revision[]): Informe {
  const dias = progreso.dias.filter((d) => d.fecha >= ciclo.inicio && d.fecha <= ciclo.fin);
  const suma = (xs: typeof dias, k: "programadas" | "hechas") => xs.reduce((s, d) => s + d[k], 0);
  const programadas = suma(dias, "programadas");
  const hechas = suma(dias, "hechas");
  const semanas = Array.from({ length: ciclo.semanas }, (_, i) => {
    const desde = sumarDias(ciclo.inicio, i * 7) as Iso;
    const de = dias.filter((d) => d.fecha >= desde && d.fecha <= sumarDias(desde, 6));
    return { semana: i + 1, programadas: suma(de, "programadas"), hechas: suma(de, "hechas") };
  });
  return {
    programadas,
    hechas,
    cumplimiento: programadas ? Math.round((100 * hechas) / programadas) : null,
    mejorRacha: Math.max(0, ...dias.map((d) => d.racha)),
    diasCompletos: dias.filter((d) => d.programadas > 0 && d.hechas >= d.programadas).length,
    creditos: dias.reduce((s, d) => s + d.creditos, 0),
    semanas,
    focos: revisiones.filter((r) => r.publicadaEl && r.foco.trim()).map((r) => ({ semana: r.semana, foco: r.foco })),
    mensaje: null,
  };
}
