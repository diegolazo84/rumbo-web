// Imágenes decorativas de Rumbo (nov-2026): antes eran dibujos; Diego pidió fotos reales en vez de
// dibujos animados o emojis. Cada nombre es un recorte de una foto que ya está en public/fotos/
// (mismas fotos de la portada), con alt vacío porque solo acompañan al texto.
//   · paisaje   → sendero de Torres del Paine (franja ancha)
//   · colinas   → pie de la tarjeta «Tu acompañamiento» (franja baja del sendero)
//   · brote     → celebración y estados vacíos (plantas del escritorio de Mi espacio, redondo)
//   · atardecer → luz cálida sobre la cordillera
//   · cuaderno  → encabezado del detalle de una acción (escritorio con cuaderno)
import { BASENAME } from "../../base";

type Nombre = "paisaje" | "colinas" | "brote" | "atardecer" | "cuaderno";

type Props = { nombre: Nombre; className?: string };

const FOTO: Record<Nombre, { src: string; pos: string }> = {
  paisaje: { src: "sendero-800", pos: "50% 30%" },
  colinas: { src: "sendero-800", pos: "50% 78%" },
  brote: { src: "mi-espacio-800", pos: "8% 55%" },
  atardecer: { src: "sendero-1440", pos: "12% 40%" },
  cuaderno: { src: "camino-sin-claridad-480", pos: "50% 50%" },
};

export default function Ilustracion({ nombre, className }: Props) {
  const f = FOTO[nombre];
  const clases = ["ilustracion", `ilustracion--${nombre}`, className].filter(Boolean).join(" ");
  return (
    <img
      className={clases}
      src={`${BASENAME}fotos/${f.src}.webp`}
      style={{ objectPosition: f.pos }}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
