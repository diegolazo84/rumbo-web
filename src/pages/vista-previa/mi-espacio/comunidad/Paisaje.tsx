// Paisajes propios de Comunidad, dibujados para Rumbo (sin fotos externas ni de stock):
//   · Portada: cordillera al atardecer con una persona sentada en una roca mirando el valle, como
//     la maqueta de ChatGPT. Es provisoria: <Portada> acepta la fotografía definitiva (props.foto)
//     y la usa en su lugar sin cambiar la composición.
//   · Miniaturas de grupos y desafíos (sendero, lago, montaña, colinas, brote, atardecer).
// Decorativos siempre (aria-hidden): el texto vecino da el significado.
import { useId } from "react";
import { BASENAME } from "../../../../base";
import type { Ilustracion } from "./fuente";

// Fotografía real de la portada (Christopher Politano, Unsplash: dos personas caminan un sendero en
// Torres del Paine; créditos en docs/creditos-fotos.md). Comunidad, Mis logros, Mis avisos,
// Recordatorios y el informe de cierre la usan en lugar de la ilustración; la ilustración queda
// como respaldo si se vuelve a null.
export const FOTO_PORTADA: string | null = `${BASENAME}fotos/sendero-1440.webp`;

export function PaisajePortada({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={className} viewBox="0 0 1200 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7C7486" />
          <stop offset="0.3" stopColor="#D69477" />
          <stop offset="0.6" stopColor="#F2AE6E" />
          <stop offset="1" stopColor="#F8D29C" />
        </linearGradient>
        <radialGradient id={`${id}s`} cx="0.58" cy="0.6" r="0.4">
          <stop offset="0" stopColor="#FFE3B0" stopOpacity="0.95" />
          <stop offset="0.4" stopColor="#F5B978" stopOpacity="0.45" />
          <stop offset="1" stopColor="#F5B978" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3C996" stopOpacity="0" />
          <stop offset="1" stopColor="#F3C996" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      <rect width="1200" height="340" fill={`url(#${id}c)`} />
      <rect width="1200" height="340" fill={`url(#${id}s)`} />
      <path fill="#A87968" opacity="0.7" d="M0 170 L60 138 L120 150 L200 96 L260 124 L330 70 L390 108 L450 82 L520 120 L600 92 L680 132 L760 88 L830 118 L900 76 L980 116 L1060 98 L1130 128 L1200 110 V340 H0Z" />
      <path fill="#F4E2DC" opacity="0.55" d="M330 70 L352 86 L342 90 L366 96 L390 108 L360 102 Z M760 88 L782 104 L772 108 L800 114 L830 118 L796 116 Z M900 76 L922 92 L912 96 L940 104 L960 110 L930 106 Z" />
      <path fill="#7A5450" opacity="0.85" d="M0 206 L80 176 L170 196 L250 158 L340 190 L430 160 L520 192 L610 170 L700 204 L790 174 L880 206 L970 180 L1060 210 L1140 188 L1200 200 V340 H0Z" />
      <rect y="170" width="1200" height="90" fill={`url(#${id}b)`} />
      <path fill="#B8806A" opacity="0.55" d="M0 246 C120 230 260 236 400 244 S700 250 860 238 S1080 236 1200 244 V340 H0Z" />
      <path fill="#4F4447" opacity="0.9" d="M0 262 L40 250 L60 232 L74 252 L96 240 L112 222 L128 246 L150 236 L170 214 L188 244 L214 238 L240 256 L320 262 L420 270 L520 268 V340 H0Z" />
      <path fill="#3E3639" d="M0 300 C120 286 220 290 330 300 S520 314 600 300 C660 290 700 268 760 262 C840 254 960 270 1060 262 C1120 258 1160 250 1200 252 V340 H0Z" />
      <path fill="#2E292B" d="M450 340 C470 300 510 278 570 272 C630 266 680 276 720 300 C740 312 750 326 754 340Z" />
      <g fill="#262224" transform="translate(-110 0)">
        <circle cx="704" cy="196" r="11" />
        <path d="M688 208 C682 224 682 246 690 262 L722 262 C728 246 726 224 718 208 Z" />
        <path d="M692 254 L662 266 C654 270 654 280 662 281 L700 272 Z" />
        <path d="M716 256 L746 268 C752 272 750 281 742 281 L708 272 Z" />
        <path d="M718 218 C730 228 736 242 734 252 L726 252 C726 244 722 234 714 226 Z" />
        <path d="M694 202 C690 196 692 186 700 184 C710 182 716 188 716 196 C712 192 704 192 694 202Z" />
      </g>
    </svg>
  );
}

// Miniaturas con fotografías reales (nov-2026, pedido de Diego: fotos reales en vez de dibujos).
// Cada tema usa un encuadre distinto de las fotos de la web (créditos en docs/creditos-fotos.md).
const FOTO_MINI: Record<Ilustracion, { src: string; pos: string }> = {
  sendero: { src: "bosque-sendero-800", pos: "50% 60%" },
  montana: { src: "torres-800", pos: "50% 45%" },
  colinas: { src: "colinas-800", pos: "50% 55%" },
  lago: { src: "lago-calmo-800", pos: "50% 50%" },
  brote: { src: "brote-800", pos: "50% 50%" },
  atardecer: { src: "lago-atardecer-800", pos: "50% 55%" },
};

export function PaisajeMini({ nombre, className }: { nombre: Ilustracion | null; className?: string }) {
  const f = FOTO_MINI[nombre ?? "colinas"];
  return (
    <img
      className={className ? `paisaje-foto ${className}` : "paisaje-foto"}
      src={`${BASENAME}fotos/${f.src}.webp`}
      style={{ objectPosition: f.pos }}
      alt=""
      loading="lazy"
      decoding="async"
    />
  );
}
