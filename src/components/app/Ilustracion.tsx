// Ilustraciones propias de Rumbo (referencia visual aprobada el 21-oct-2026): colinas, un camino
// y un sol, en la paleta de la marca. Son decorativas (aria-hidden) y se usan con medida:
//   · paisaje  → bienvenida de Mi Rumbo (pequeña, a la derecha del saludo)
//   · colinas  → pie de la tarjeta «Tu acompañamiento»
//   · brote    → celebración de un nuevo nivel y estados vacíos
//   · atardecer → portada de Mi acompañamiento mientras no llegue la fotografía de la referencia
//                 de ChatGPT (cordillera al atardecer y una persona sentada mirando el valle)
// Los colores vienen de clases (.il-*) con tokens en app.css, sin estilos en línea.

type Nombre = "paisaje" | "colinas" | "brote" | "atardecer";

type Props = { nombre: Nombre; className?: string };

export default function Ilustracion({ nombre, className }: Props) {
  const clases = ["ilustracion", `ilustracion--${nombre}`, className].filter(Boolean).join(" ");
  if (nombre === "atardecer")
    return (
      <svg className={clases} viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="il-at-cielo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6F7F86" />
            <stop offset="0.38" stopColor="#C99A86" />
            <stop offset="0.72" stopColor="#F0C59B" />
            <stop offset="1" stopColor="#F6DEBF" />
          </linearGradient>
          <radialGradient id="il-at-sol" cx="0.66" cy="0.62" r="0.36">
            <stop offset="0" stopColor="#FFE7BF" stopOpacity="0.95" />
            <stop offset="0.35" stopColor="#F7C78F" stopOpacity="0.55" />
            <stop offset="1" stopColor="#F7C78F" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="il-at-bruma" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F6DEBF" stopOpacity="0" />
            <stop offset="1" stopColor="#F6DEBF" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <rect width="1200" height="420" fill="url(#il-at-cielo)" />
        <rect width="1200" height="420" fill="url(#il-at-sol)" />
        <path fill="#A98A86" opacity="0.55" d="M0 230 L70 190 L120 205 L190 150 L240 172 L300 118 L350 150 L410 96 L470 140 L520 120 L585 168 L640 132 L700 176 L760 140 L820 178 L880 150 L950 190 L1010 160 L1080 196 L1140 170 L1200 190 V420 H0Z" />
        <path fill="#F3E3E0" opacity="0.6" d="M300 118 L322 133 L314 140 L338 142 L350 150 L330 152 Z M410 96 L436 116 L425 121 L452 128 L470 140 L440 137 Z M640 132 L662 147 L652 151 L680 160 L700 176 L668 166 Z" />
        <path fill="#8C6E72" opacity="0.75" d="M0 262 L90 226 L160 244 L250 200 L330 236 L420 196 L500 232 L580 210 L660 246 L750 214 L840 250 L930 222 L1020 256 L1110 230 L1200 248 V420 H0Z" />
        <rect y="220" width="1200" height="110" fill="url(#il-at-bruma)" />
        <path fill="#5E5257" opacity="0.85" d="M0 300 L110 268 L210 290 L320 256 L430 292 L540 270 L640 300 L760 276 L870 304 L980 282 L1090 306 L1200 290 V420 H0Z" />
        <path fill="#3B3B3C" d="M0 352 C140 322 260 330 380 344 S620 360 760 340 C860 326 900 300 960 296 C1020 292 1090 312 1200 322 V420 H0Z" />
        <path fill="#2A2B2C" d="M880 420 C900 356 940 318 1000 306 C1060 296 1120 300 1200 312 V420Z" />
        <g fill="#232425">
          <circle cx="1018" cy="236" r="11" />
          <path d="M1004 248 C1000 262 1000 280 1006 296 L1034 296 C1038 282 1036 262 1030 248 Z" />
          <path d="M1006 290 L976 300 C968 303 966 312 974 314 L1010 306 Z" />
          <path d="M1030 292 L1058 304 C1064 307 1062 316 1055 316 L1024 306 Z" />
          <path d="M1006 258 C996 270 990 282 992 292 L1000 292 C1000 282 1006 272 1012 264 Z" />
        </g>
      </svg>
    );
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
