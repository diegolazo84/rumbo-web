// Ruta de puntos (2.7): el recorrido de la marca, hecho de puntos como el del logo.
// Siempre decorativa (aria-hidden). Variantes:
// - "fondo": curva horizontal con paradas en los tres colores y anillo de destino
//   (fondo de la portada desde 1024 px, imagen para redes);
// - "vertical": línea que une los círculos de los pasos del método (se estira al alto de su caja);
// - "404": la misma curva, pero termina en un «?».
import type { CategoriaId } from "../data/rumbo";

const CURVA = "M8 160 C140 160 160 40 300 60 S470 170 592 40";
// Puntos sobre la curva (t = 0,5 de cada tramo y el vértice central).
const PARADAS: { cx: number; cy: number; cat: CategoriaId }[] = [
  { cx: 151, cy: 102.5, cat: "proyecto" },
  { cx: 300, cy: 60, cat: "orden" },
  { cx: 452.75, cy: 106.25, cat: "bienestar" },
];

type Props = { variante?: "fondo" | "vertical" | "404"; className?: string };

export default function RutaPuntos({ variante = "fondo", className }: Props) {
  const clases = ["ruta-puntos", `ruta-puntos--${variante}`, className].filter(Boolean).join(" ");

  if (variante === "vertical") {
    // Sin viewBox: las unidades son píxeles y la línea mide lo que mida su caja.
    return (
      <svg className={clases} width="4" height="100%" aria-hidden="true" focusable="false">
        <line className="ruta-trazo" x1="2" y1="2" x2="2" y2="100%" />
      </svg>
    );
  }

  return (
    <svg className={clases} viewBox="0 0 600 200" aria-hidden="true" focusable="false">
      <path className="ruta-trazo" d={CURVA} />
      {PARADAS.map((p) => (
        <circle key={p.cat} className="ruta-parada" data-cat={p.cat} cx={p.cx} cy={p.cy} r="4" />
      ))}
      {variante === "404" ? (
        <text className="ruta-fin" x="592" y="40" textAnchor="middle" dominantBaseline="central">
          ?
        </text>
      ) : (
        <circle className="ruta-destino" cx="592" cy="40" r="5" />
      )}
    </svg>
  );
}
