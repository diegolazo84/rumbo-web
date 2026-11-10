// Datos de Mis logros que no vienen en el contexto de Mi espacio: reconocimientos (E1), el
// descuento por renovación (E1 y C17) y el ranking semanal voluntario (C5).
//   · Real: de la base. Cada bloque devuelve null mientras su función está apagada (módulo sin
//     habilitar o beneficio inactivo), y la pantalla lo oculta: aparece solo al activarlo.
//   · Vista previa: ejemplo calculado con las mismas reglas sobre el escenario de ejemplo.
import type { Meta } from "../../../../data/ejemplo-app";
import { sumarDias, type Iso } from "../../../../lib/fechas";
import { datos, ErrorBase, supabase } from "../../../../lib/supabase";
import type { CicloEspacio, Progreso } from "../espacio";

export type ClaveReconocimiento = "primer_paso" | "primera_semana" | "constancia" | "mitad_del_camino" | "ciclo_completado" | "meta_alcanzada";
export type Reconocimiento = {
  clave: ClaveReconocimiento;
  nombre: string;
  descripcion: string;
  umbral: number | null; // constancia: días de racha; mitad del camino: % de lo programado
  obtenido: Iso | null; // primera vez que se otorgó
  veces: number; // meta alcanzada puede repetirse (una por meta)
};
export type BeneficioVigente = { nombre: string; descripcion: string; porcentaje: number; diasCiclo: number };
export type BeneficioObtenido = { nombre: string; porcentaje: number | null; estado: "disponible" | "aplicado" };
export type Recompensas = { vigente: BeneficioVigente | null; obtenidos: BeneficioObtenido[] };
export type RankingEstado = {
  alias: string | null;
  participo: boolean;
  puesto: number | null; // null: menos de 3 participantes o sin acciones la semana pasada
  total: number;
  cumplimiento: number | null;
};

export interface FuenteLogros {
  ejemplo: boolean;
  reconocimientos(): Promise<Reconocimiento[] | null>;
  recompensas(): Promise<Recompensas | null>;
  ranking(): Promise<RankingEstado | null>;
  participar(si: boolean, alias: string | null): Promise<void>;
}

export const CATALOGO: Omit<Reconocimiento, "obtenido" | "veces">[] = [
  { clave: "primer_paso", nombre: "Primer paso", descripcion: "Marcaste tu primera acción.", umbral: null },
  { clave: "primera_semana", nombre: "Primera semana", descripcion: "Terminaste la primera semana de tu ciclo con acciones hechas.", umbral: null },
  { clave: "constancia", nombre: "Constancia", descripcion: "Sostuviste una racha de días seguidos en tu ciclo.", umbral: 7 },
  { clave: "mitad_del_camino", nombre: "Mitad del camino", descripcion: "Llegaste a la mitad del ciclo con buena parte de lo programado hecho.", umbral: 50 },
  { clave: "ciclo_completado", nombre: "Ciclo completado", descripcion: "Llegaste al final de tu ciclo.", umbral: null },
  { clave: "meta_alcanzada", nombre: "Meta alcanzada", descripcion: "Lograste todos los hitos de una meta.", umbral: null },
];

// ---------------------------------------------------------------------------
// Real

const fechaChile = (ts: string) => new Date(ts).toLocaleDateString("sv-SE", { timeZone: "America/Santiago" }) as Iso;
// Una función que todavía no está en la base (migración sin aplicar) se trata como apagada.
const noExiste = (e: unknown) => e instanceof ErrorBase && e.estado === 404 && !e.campo;

export function fuenteLogrosReal(): FuenteLogros {
  const rpc = async <T>(nombre: string, args?: Record<string, unknown>): Promise<T> => datos(await (await supabase()).rpc(nombre, args)) as T;
  const visible = (clave: string) => rpc<boolean>("modulo_visible", { p_clave: clave });
  return {
    ejemplo: false,
    async reconocimientos() {
      if (!(await visible("reconocimientos"))) return null;
      const sb = await supabase();
      const [catalogo, mios] = await Promise.all([
        sb.from("reconocimientos").select("clave,nombre,descripcion,umbral").eq("activo", true).order("orden"),
        rpc<{ clave: ClaveReconocimiento; otorgado_en: string }[]>("mis_reconocimientos"),
      ]);
      return (datos(catalogo) as { clave: ClaveReconocimiento; nombre: string; descripcion: string; umbral: number | null }[]).map((r) => {
        const de = (mios ?? []).filter((m) => m.clave === r.clave).sort((a, b) => a.otorgado_en.localeCompare(b.otorgado_en));
        return { ...r, obtenido: de[0] ? fechaChile(de[0].otorgado_en) : null, veces: de.length };
      });
    },
    async recompensas() {
      let vigente: BeneficioVigente | null = null;
      try {
        const [b] = (await rpc<{ nombre: string; descripcion: string; porcentaje: number; dias_ciclo: number }[]>("mi_beneficio_renovacion")) ?? [];
        if (b) vigente = { nombre: b.nombre, descripcion: b.descripcion, porcentaje: b.porcentaje, diasCiclo: b.dias_ciclo };
      } catch (e) {
        if (!noExiste(e)) throw e;
      }
      const filas = (await rpc<{ nombre: string; porcentaje: number | null; estado: string }[]>("mis_beneficios")) ?? [];
      const obtenidos = filas
        .filter((f) => f.estado === "disponible" || f.estado === "aplicado")
        .map((f) => ({ nombre: f.nombre, porcentaje: f.porcentaje, estado: f.estado as BeneficioObtenido["estado"] }));
      return vigente || obtenidos.some((o) => o.estado === "disponible") ? { vigente, obtenidos } : null;
    },
    async ranking() {
      if (!(await visible("ranking"))) return null;
      const sb = await supabase();
      const fila = datos(await sb.from("alias").select("alias,en_ranking").maybeSingle()) as { alias: string; en_ranking: boolean } | null;
      if (!fila?.en_ranking) return { alias: fila?.alias ?? null, participo: false, puesto: null, total: 0, cumplimiento: null };
      const filas = (await rpc<{ puesto: number; cumplimiento: number; soy_yo: boolean }[]>("ranking_semanal")) ?? [];
      const yo = filas.find((f) => f.soy_yo);
      return { alias: fila.alias, participo: true, puesto: yo?.puesto ?? null, total: filas.length, cumplimiento: yo?.cumplimiento ?? null };
    },
    async participar(si, alias) {
      if (si && alias) await rpc("guardar_alias", { p_alias: alias });
      await rpc("participar_en_ranking", { p_participar: si });
    },
  };
}

// ---------------------------------------------------------------------------
// Vista previa: los reconocimientos salen del progreso de ejemplo con las reglas de la base
// (privado.otorgar_reconocimientos). Sin módulos apagados, salvo ?apagados=1.

export function reconocimientosDe(progreso: Progreso, ciclo: CicloEspacio, metas: Meta[], hoy: Iso): Reconocimiento[] {
  const dias = progreso.dias;
  const primerPaso = dias.find((d) => d.hechas > 0)?.fecha ?? null;
  const finSemana1 = sumarDias(ciclo.inicio, 6);
  const semana1 = hoy >= sumarDias(finSemana1, 1) && dias.some((d) => d.fecha <= finSemana1 && d.hechas > 0) ? sumarDias(finSemana1, 1) : null;
  const constancia = dias.find((d) => d.racha >= 7)?.fecha ?? null;
  const mitad = sumarDias(ciclo.inicio, Math.floor((ciclo.semanas * 7) / 2));
  const hastaMitad = dias.filter((d) => d.fecha < mitad);
  const prog = hastaMitad.reduce((s, d) => s + d.programadas, 0);
  const hechas = hastaMitad.reduce((s, d) => s + d.hechas, 0);
  const mitadOk = hoy >= mitad && hechas > 0 && hechas * 100 >= 50 * prog ? mitad : null;
  const ciclo_ = hoy > ciclo.fin && primerPaso ? sumarDias(ciclo.fin, 1) : null;
  const metasLogradas = metas.filter((m) => m.hitos.length > 0 && m.hitos.every((h) => h.logrado)).length;
  const obtenido: Record<ClaveReconocimiento, Iso | null> = {
    primer_paso: primerPaso,
    primera_semana: semana1,
    constancia,
    mitad_del_camino: mitadOk,
    ciclo_completado: ciclo_,
    meta_alcanzada: metasLogradas ? hoy : null,
  };
  return CATALOGO.map((r) => ({ ...r, obtenido: obtenido[r.clave], veces: r.clave === "meta_alcanzada" ? metasLogradas : obtenido[r.clave] ? 1 : 0 }));
}

export function fuenteLogrosEjemplo(datosEjemplo: () => { progreso: Progreso; ciclo: CicloEspacio; metas: Meta[]; hoy: Iso }, apagados: boolean): FuenteLogros {
  let ranking: RankingEstado = { alias: null, participo: false, puesto: null, total: 0, cumplimiento: null };
  return {
    ejemplo: true,
    async reconocimientos() {
      const d = datosEjemplo();
      return reconocimientosDe(d.progreso, d.ciclo, d.metas, d.hoy);
    },
    async recompensas() {
      if (apagados) return null;
      return {
        vigente: {
          nombre: "10 % en tu próxima renovación",
          descripcion: "Por completar todas las acciones programadas de tu ciclo de 28 días. Se usa en una renovación y no se suma a otros descuentos.",
          porcentaje: 10,
          diasCiclo: 28,
        },
        obtenidos: [],
      };
    },
    async ranking() {
      return apagados ? null : ranking;
    },
    async participar(si, alias) {
      // Ejemplo: sin otras personas, el puesto no se muestra (hacen falta 3).
      ranking = { alias: alias ?? ranking.alias, participo: si, puesto: null, total: 0, cumplimiento: null };
    },
  };
}
