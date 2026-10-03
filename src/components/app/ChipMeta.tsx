// Chip de meta con su color de categoría (.etiqueta--categoria, plataforma 4.7.1):
// «Lanzar mi taller en línea · Proyecto». Los colores son los mismos tokens de la portada
// (8.2-D2). LeyendaMetas: una por meta (.calendario-leyenda).
import { categorias, type CategoriaId } from "../../data/rumbo";

type ChipProps = {
  cat: CategoriaId;
  meta?: string; // sin meta: solo la categoría («Proyecto»)
  className?: string;
};

export default function ChipMeta({ cat, meta, className }: ChipProps) {
  const texto = meta ? `${meta} · ${categorias[cat].nombre}` : categorias[cat].nombre;
  return (
    <span className={["etiqueta", "etiqueta--categoria", "chip-meta", className].filter(Boolean).join(" ")} data-cat={cat}>
      {texto}
    </span>
  );
}

export function LeyendaMetas({ metas, etiqueta }: { metas: { titulo: string; categoria: CategoriaId }[]; etiqueta?: string }) {
  return (
    <ul className="calendario-leyenda leyenda-metas" aria-label={etiqueta}>
      {metas.map((m) => (
        <li key={m.titulo}>
          <ChipMeta cat={m.categoria} meta={m.titulo} />
        </li>
      ))}
    </ul>
  );
}
