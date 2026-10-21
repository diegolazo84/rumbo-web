// Ilustraciones propias de Rumbo (referencia visual aprobada el 21-oct-2026): colinas, un camino
// y un sol, en la paleta de la marca. Son decorativas (aria-hidden) y se usan con medida:
//   · paisaje  → bienvenida de Mi Rumbo (pequeña, a la derecha del saludo)
//   · colinas  → pie de la tarjeta «Tu acompañamiento»
//   · brote    → celebración de un nuevo nivel y estados vacíos
// Los colores vienen de clases (.il-*) con tokens en app.css, sin estilos en línea.

type Nombre = "paisaje" | "colinas" | "brote";

type Props = { nombre: Nombre; className?: string };

export default function Ilustracion({ nombre, className }: Props) {
  const clases = ["ilustracion", `ilustracion--${nombre}`, className].filter(Boolean).join(" ");
  if (nombre === "brote")
    return (
      <svg className={clases} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <circle className="il-fondo" cx="60" cy="60" r="52" />
        <circle className="il-aro" cx="60" cy="60" r="52" />
        <path className="il-tierra" d="M30 92 C50 82 70 82 90 92 Z" />
        <path className="il-tallo" d="M60 88 V56" />
        <path className="il-hoja-clara" d="M60 64 C46 64 40 54 40 44 C52 44 60 52 60 64Z" />
        <path className="il-hoja" d="M60 58 C74 58 82 48 82 36 C68 36 60 44 60 58Z" />
        <circle className="il-sol" cx="22" cy="28" r="3" />
        <circle className="il-sol" cx="100" cy="22" r="2.5" />
        <circle className="il-sol" cx="104" cy="70" r="2" />
        <rect className="il-destello" x="14" y="62" width="5" height="5" transform="rotate(45 16 64)" />
        <rect className="il-destello" x="96" y="96" width="5" height="5" transform="rotate(45 98 98)" />
      </svg>
    );
  if (nombre === "colinas")
    return (
      <svg className={clases} viewBox="0 0 440 84" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
        <circle className="il-sol" cx="360" cy="26" r="12" />
        <path className="il-lejos" d="M0 50 C80 26 170 30 240 44 S370 22 440 32 V84 H0Z" />
        <path className="il-colina" d="M40 84 C120 56 260 50 440 62 V84Z" />
        <path className="il-camino" d="M220 84 C236 70 280 62 330 58 S410 52 440 50" />
        <path className="il-tierra" d="M0 84 C30 70 90 66 140 74 S200 84 214 84Z" />
      </svg>
    );
  return (
    <svg className={clases} viewBox="0 0 200 118" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">
      <circle className="il-sol" cx="150" cy="34" r="15" />
      <path className="il-lejos" d="M0 86 C40 60 70 58 110 72 S170 50 200 58 V118 H0Z" />
      <path className="il-colina" d="M30 118 C60 84 120 76 200 88 V118Z" />
      <path className="il-camino" d="M118 118 C122 104 140 96 160 92 S190 86 200 84" />
      <path className="il-tierra" d="M0 118 C20 100 50 96 80 104 S120 118 130 118Z" />
      <path className="il-planta" d="M182 118c-2-14 2-26 8-32-1 10 0 22-2 32z" />
      <path className="il-planta" d="M188 118c4-10 9-16 12-18-2 8-5 13-8 18z" />
      <path className="il-aves" d="M66 40l4-3 4 3M80 30l3-2 3 2" />
    </svg>
  );
}
