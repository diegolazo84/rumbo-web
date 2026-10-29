// Paisajes propios de Comunidad, dibujados para Rumbo (sin fotos externas ni de stock):
//   · Portada: cordillera al atardecer con una persona sentada en una roca mirando el valle, como
//     la maqueta de ChatGPT. Es provisoria: <Portada> acepta la fotografía definitiva (props.foto)
//     y la usa en su lugar sin cambiar la composición.
//   · Miniaturas de grupos y desafíos (sendero, lago, montaña, colinas, brote, atardecer).
// Decorativos siempre (aria-hidden): el texto vecino da el significado.
import { useId } from "react";
import type { Ilustracion } from "./fuente";

// Fotografía definitiva de la portada (pendiente de ChatGPT). Cuando llegue, se pone aquí su ruta
// en /public y Comunidad y Crear publicación la usan en lugar de la ilustración.
export const FOTO_PORTADA: string | null = null;

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

const CIELO: Record<Ilustracion, [string, string]> = {
  sendero: ["#E9C9A0", "#F6E7CF"],
  lago: ["#C9D8D2", "#F3E6CF"],
  montana: ["#D9B49B", "#F5DDBF"],
  colinas: ["#DCE6DA", "#F6EEDF"],
  brote: ["#E7E2CC", "#F6F0E1"],
  atardecer: ["#C99A86", "#F6DEBF"],
};

export function PaisajeMini({ nombre, className }: { nombre: Ilustracion | null; className?: string }) {
  const id = useId().replace(/:/g, "");
  const n = nombre ?? "colinas";
  const [arriba, abajo] = CIELO[n];
  return (
    <svg className={className} viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={arriba} />
          <stop offset="1" stopColor={abajo} />
        </linearGradient>
      </defs>
      <rect width="160" height="100" fill={`url(#${id}c)`} />
      {n === "sendero" && (
        <>
          <circle cx="118" cy="30" r="10" fill="#F7D79C" />
          <path fill="#8FA58F" d="M0 56 C30 40 60 44 90 52 S140 40 160 46 V100 H0Z" />
          <path fill="#56735F" d="M0 70 C40 58 90 62 160 66 V100 H0Z" />
          <path fill="#E7D3B0" d="M70 100 C76 86 86 76 104 70 L112 70 C98 78 92 88 92 100Z" />
          <path fill="#2F4A3A" d="M18 72 l8 -22 l8 22z M30 74 l7 -18 l7 18z M130 70 l7 -20 l7 20z M142 72 l6 -16 l6 16z" />
        </>
      )}
      {n === "lago" && (
        <>
          <path fill="#9AA6A8" d="M0 54 L30 34 L52 46 L80 26 L108 44 L132 32 L160 46 V100 H0Z" />
          <path fill="#6E8C86" d="M0 62 C40 54 110 56 160 60 V100 H0Z" />
          <path fill="#A9C6C4" d="M0 70 C50 64 110 66 160 70 V88 C110 84 50 86 0 90Z" />
          <path fill="#3F5A4C" d="M0 90 C50 86 110 84 160 88 V100 H0Z" />
          <circle cx="60" cy="74" r="3" fill="#F6E7CF" opacity="0.7" />
        </>
      )}
      {n === "montana" && (
        <>
          <circle cx="40" cy="30" r="9" fill="#F7D79C" />
          <path fill="#9C7A80" d="M0 64 L36 30 L60 50 L96 16 L132 50 L160 38 V100 H0Z" />
          <path fill="#F4E2DC" d="M96 16 L106 26 L100 28 L110 32 L96 30 L88 24Z" />
          <path fill="#5E5257" d="M0 76 C40 64 100 66 160 70 V100 H0Z" />
          <circle cx="112" cy="62" r="3" fill="#262224" />
          <path fill="#262224" d="M109 65 h6 l2 10 h-10z" />
        </>
      )}
      {n === "colinas" && (
        <>
          <circle cx="124" cy="28" r="10" fill="#F2C46D" />
          <path fill="#C9DACB" d="M0 58 C30 42 70 44 100 52 S140 40 160 46 V100 H0Z" />
          <path fill="#94B49D" d="M0 72 C40 60 100 62 160 66 V100 H0Z" />
          <path fill="none" stroke="#E7D3B0" strokeWidth="5" strokeLinecap="round" d="M60 100 C70 88 96 80 130 76" />
        </>
      )}
      {n === "brote" && (
        <>
          <path fill="#D9C7A6" d="M0 76 C50 70 110 70 160 74 V100 H0Z" />
          <path fill="none" stroke="#3B6E58" strokeWidth="4" strokeLinecap="round" d="M80 76 V48" />
          <path fill="#94B49D" d="M80 58 C66 58 58 48 58 38 C72 38 80 46 80 58Z" />
          <path fill="#5F8E74" d="M80 52 C94 52 102 42 102 30 C88 30 80 38 80 52Z" />
          <circle cx="40" cy="30" r="3" fill="#F2C46D" />
          <circle cx="124" cy="24" r="2.5" fill="#F2C46D" />
        </>
      )}
      {n === "atardecer" && (
        <>
          <circle cx="96" cy="54" r="16" fill="#FFE3B0" opacity="0.9" />
          <path fill="#8C6E72" d="M0 60 L30 44 L56 54 L86 36 L118 52 L160 42 V100 H0Z" />
          <path fill="#3B3B3C" d="M0 78 C40 70 100 72 160 76 V100 H0Z" />
        </>
      )}
    </svg>
  );
}
