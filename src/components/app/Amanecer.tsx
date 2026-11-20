// Amanecer del día (Mi Rumbo, nov-2026): paisaje dibujado que crece con lo que haces hoy.
// El sol sube, el camino se ilumina hasta la cima y los brotes crecen con cada acción hecha;
// con el día completo, la bandera de la cima se enciende y el sol respira. Es decorativo
// (aria-hidden): el avance real lo anuncia el anillo «1/3» de las acciones de hoy.
// Movimiento con Motion (skill rumbo-motion); con prefers-reduced-motion queda en su estado final.
import { useLayoutEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import { Escena } from "./Movimiento";

const CURVA = [0.22, 1, 0.36, 1] as const;
const CAMINO = "M60 262 C104 238 84 218 146 206 C206 195 196 176 246 168 C282 162 298 152 310 141";
// Brotes sobre la colina cercana: crecen con el avance del día (generativo, nunca decorado al azar).
const BROTES = [
  { x: 40, y: 236, s: 1.5 },
  { x: 214, y: 224, s: 1.3 },
  { x: 366, y: 202, s: 1.4 },
];

export default function Amanecer({ hechas, programadas, className }: { hechas: number; programadas: number; className?: string }) {
  const reducido = useReducedMotion();
  const p = programadas > 0 ? Math.min(hechas, programadas) / programadas : 0;
  const libre = programadas === 0;
  const completo = !libre && hechas >= programadas;
  // Día libre: el sol ya está arriba, sereno (descansar también es parte del plan).
  const avance = libre ? 0.75 : p;
  const cy = 128 - 72 * avance;

  // Un hito por acción, repartidos a lo largo del camino (el último en la cima).
  const camino = useRef<SVGPathElement>(null);
  const [hitos, setHitos] = useState<{ x: number; y: number }[]>([]);
  const n = Math.min(programadas, 8);
  useLayoutEffect(() => {
    const el = camino.current;
    if (!el || !n || typeof el.getTotalLength !== "function") return setHitos([]);
    const largo = el.getTotalLength();
    setHitos(Array.from({ length: n }, (_, i) => el.getPointAtLength((largo * (i + 1)) / n)));
  }, [n]);

  const t = (retraso = 0) => ({ duration: reducido ? 0 : 1.1, ease: CURVA, delay: reducido ? 0 : retraso });

  return (
    <Escena>
      <svg
        className={["amanecer", completo && "es-completo", libre && "es-libre", className].filter(Boolean).join(" ")}
        viewBox="0 0 400 260"
        preserveAspectRatio="xMaxYMax slice"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="am-cielo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="am-cielo-alto" />
            <stop offset="1" className="am-cielo-bajo" />
          </linearGradient>
          <radialGradient id="am-halo">
            <stop offset="0" className="am-halo-centro" />
            <stop offset="1" className="am-halo-borde" />
          </radialGradient>
        </defs>
        <rect width="400" height="260" fill="url(#am-cielo)" />
        {/* Resplandor del horizonte: se enciende con el avance. */}
        <m.ellipse className="am-resplandor" cx="300" cy="130" rx="190" ry="90" initial={{ opacity: 0 }} animate={{ opacity: 0.25 + 0.75 * avance }} transition={t(0.1)} />
        <m.g initial={{ y: reducido ? cy - 128 : 0 }} animate={{ y: cy - 128 }} transition={t(0.15)}>
          <circle className="am-halo" cx="300" cy="128" r="58" fill="url(#am-halo)" />
          <g className="am-rayos">
            {Array.from({ length: 12 }, (_, i) => (
              <line key={i} x1="300" y1="84" x2="300" y2="74" transform={`rotate(${i * 30} 300 128)`} />
            ))}
          </g>
          <circle className="am-sol" cx="300" cy="128" r="30" />
        </m.g>
        <path className="am-lejos" d="M0 168 C62 138 122 150 182 134 C242 118 304 100 400 122 V260 H0Z" />
        <path className="am-medio" d="M0 200 C82 170 150 186 222 166 C276 151 330 146 400 158 V260 H0Z" />
        <path className="am-cerca" d="M0 236 C92 214 170 232 252 206 C312 188 360 194 400 200 V260 H0Z" />
        <path className="am-camino" d={CAMINO} ref={camino} />
        {!libre && (
          <m.path className="am-camino-luz" d={CAMINO} initial={{ pathLength: reducido ? p : 0 }} animate={{ pathLength: Math.max(p, 0.0001) }} transition={t(0.35)} />
        )}
        {hitos.map((h, i) => (
          <m.circle
            key={i}
            className={i < hechas ? "am-hito es-hecho" : "am-hito"}
            cx={h.x}
            cy={h.y}
            r={i === hitos.length - 1 ? 0 : 5}
            initial={{ scale: reducido ? 1 : 0 }}
            animate={{ scale: 1 }}
            transition={{ ...t(0.45 + i * 0.08), duration: reducido ? 0 : 0.4 }}
          />
        ))}
        {/* Bandera en la cima: se enciende con el día completo. */}
        <g className="am-bandera">
          <line x1="311" y1="141" x2="311" y2="112" />
          <m.path d="M312 113 L332 119 L312 126 Z" initial={{ scaleX: reducido || completo ? 1 : 0.4 }} animate={{ scaleX: completo ? 1 : 0.6 }} style={{ originX: 0 }} transition={t(0.6)} />
        </g>
        {BROTES.map((b, i) => (
          <m.g
            key={i}
            className="am-brote"
            style={{ originX: 0.5, originY: 1 }}
            initial={{ scale: reducido ? 0.45 + 0.55 * avance : 0.3 }}
            animate={{ scale: 0.45 + 0.55 * avance }}
            transition={t(0.5 + i * 0.1)}
          >
            <g transform={`translate(${b.x} ${b.y}) scale(${b.s})`}>
              <path className="am-tallo" d="M0 0 C0 -8 0 -14 0 -20" />
              <path className="am-hoja" d="M0 -12 C-10 -14 -14 -22 -12 -26 C-4 -24 0 -18 0 -12Z" />
              <path className="am-hoja am-hoja--b" d="M0 -16 C8 -18 13 -26 12 -30 C4 -29 0 -23 0 -16Z" />
            </g>
          </m.g>
        ))}
      </svg>
    </Escena>
  );
}
