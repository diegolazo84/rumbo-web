// Reglas compartidas de la etapa 2A (Mi Rumbo). Las usan las tres cuentas: Mi espacio del
// participante, la ficha del panel (coach) y el constructor. Así el participante ve los
// mismos colores y momentos del día que diseñó y revisa quien lo acompaña.
// Sin React y sin datos: solo funciones puras, para poder probarlas y reutilizarlas.
import type { CategoriaId } from "../data/rumbo";

// ---------------------------------------------------------------------------
// Momento del día de una acción (agrupación de Mi Rumbo). Cortes aprobados el 21-oct-2026:
// mañana hasta las 11:59, tarde de 12:00 a 18:59 y noche desde las 19:00. Sin hora: «flexible».

export type Momento = "manana" | "tarde" | "noche" | "flexible";
export const MOMENTOS: Momento[] = ["manana", "tarde", "noche", "flexible"];
export const CORTES_MOMENTO = { tarde: "12:00", noche: "19:00" } as const;

export function momentoDe(hora: string | null | undefined): Momento {
  if (!hora) return "flexible";
  const h = hora.slice(0, 5); // «08:30» o «08:30:00»
  if (h < CORTES_MOMENTO.tarde) return "manana";
  if (h < CORTES_MOMENTO.noche) return "tarde";
  return "noche";
}

// ---------------------------------------------------------------------------
// Color de cada meta: el mismo que usa el constructor (un color por meta, en el orden de las
// metas del programa). Paleta --meta-0 … --meta-7 en styles.css; [data-meta-color] en app.css.

export const COLORES_META = 8;

export function colorDeMeta(idsEnOrden: readonly string[], id: string): number {
  return Math.max(0, idsEnOrden.indexOf(id)) % COLORES_META;
}

// ---------------------------------------------------------------------------
// Icono de una acción según su categoría: los mismos de la portada para cada área.
// (Un icono propio por acción, elegido por el coach, necesita una columna nueva: etapa 7.)

export const ICONO_CATEGORIA = {
  proyecto: "lightbulb",
  orden: "list-checks",
  bienestar: "heart",
} as const satisfies Record<CategoriaId, string>;
