// Imágenes decorativas de Rumbo (nov-2026): fotos reales de Pexels (licencia libre, uso comercial;
// créditos en docs/creditos-fotos.md) en lugar de dibujos. Alt vacío: solo acompañan al texto.
import { BASENAME } from "../../base";

type Nombre = "paisaje" | "colinas" | "brote" | "atardecer" | "cuaderno";

type Props = { nombre: Nombre; className?: string };

const FOTO: Record<Nombre, { src: string; pos: string }> = {
  paisaje: { src: "amanecer-colinas-800", pos: "50% 55%" },
  colinas: { src: "colinas-800", pos: "50% 60%" },
  brote: { src: "brote-800", pos: "50% 50%" },
  atardecer: { src: "lago-atardecer-800", pos: "50% 55%" },
  cuaderno: { src: "cuaderno-800", pos: "45% 50%" },
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
