// Etiqueta única (3.3). Gramática de la honestidad: lleno = disponible, contorno = no
// disponible o más adelante, punteado = ejemplo, tenue sin punto = nota.
import type { ReactNode } from "react";
import { categorias, estados, type CategoriaId, type EstadoId, type VarianteEtiqueta } from "../data/rumbo";

type Props = {
  variante: VarianteEtiqueta;
  children: ReactNode;
  grande?: boolean; // insignia de la portada, nivel del calendario
  nowrap?: boolean; // «Nivel 1 · Inicio» nunca se parte
  cat?: CategoriaId; // obligatorio con variante "categoria"
  className?: string;
};

export default function Etiqueta({ variante, children, grande, nowrap, cat, className }: Props) {
  const clases = ["etiqueta", `etiqueta--${variante}`, grande && "etiqueta--grande", nowrap && "nowrap", className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={clases} data-cat={cat}>
      {children}
    </span>
  );
}

// Etiqueta de estado: el texto y la variante salen siempre de `estados` (rumbo.ts).
export function EtiquetaEstado({ estado, grande }: { estado: EstadoId; grande?: boolean }) {
  const e = estados[estado];
  return (
    <Etiqueta variante={e.variante} grande={grande}>
      {e.texto}
    </Etiqueta>
  );
}

// Etiqueta de categoría: «Proyecto», «Organización» o «Bienestar».
export function EtiquetaCategoria({ cat }: { cat: CategoriaId }) {
  return (
    <Etiqueta variante="categoria" cat={cat}>
      {categorias[cat].nombre}
    </Etiqueta>
  );
}
