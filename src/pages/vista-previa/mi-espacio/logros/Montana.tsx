// «Tu montaña» (Mis logros, nov-2026): los 10 niveles reales como estaciones de un sendero que sube
// a la cima. Lo conseguido se ilumina, tu nivel late y el siguiente dice cuánto falta. Los puntos son
// HTML sobre el dibujo (mismo tamaño en cualquier ancho) y forman una lista ordenada accesible.
import { m, useReducedMotion } from "motion/react";
import { Escena } from "../../../../components/app/Movimiento";
import { Icono } from "../../../../components/app";
import { niveles } from "../../../../data/rumbo";
import { miles } from "../../../../lib/fechas";
import { T_LOGROS } from "../textos";

const ANCHO = 1000;
const ALTO = 340;
// Estaciones en % del dibujo (de la base a la cima).
const PUNTOS: [number, number][] = [
  [6, 86], [15, 79], [25, 73], [34, 64], [44, 58], [53, 48], [62, 41], [71, 31], [79, 23], [87, 12],
];

// Curva suave que pasa por todos los puntos (Catmull-Rom a Bézier).
function sendero(pts: [number, number][]) {
  const p = pts.map(([x, y]) => [(x / 100) * ANCHO, (y / 100) * ALTO] as const);
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] ?? p[i], b = p[i], c = p[i + 1], e = p[i + 2] ?? c;
    d += ` C${b[0] + (c[0] - a[0]) / 6} ${b[1] + (c[1] - a[1]) / 6} ${c[0] - (e[0] - b[0]) / 6} ${c[1] - (e[1] - b[1]) / 6} ${c[0]} ${c[1]}`;
  }
  return d;
}

export default function Montana({ creditos, nivel }: { creditos: number; nivel: number }) {
  const T = T_LOGROS.montana;
  const reducido = useReducedMotion();
  const i = Math.max(0, Math.min(niveles.length - 1, nivel - 1));
  const siguiente = niveles[i + 1];
  // Avance real entre tu nivel y el siguiente, para iluminar el tramo justo.
  const tramo = siguiente ? Math.min(1, (creditos - niveles[i].minimo) / (siguiente.minimo - niveles[i].minimo)) : 0;
  const avance = (i + tramo) / (niveles.length - 1);
  const d = sendero(PUNTOS);
  // La ladera sigue el sendero (un poco más abajo), hasta la cima y de bajada a la derecha.
  const ladera = `${sendero(PUNTOS.map(([x, y]) => [x, y - 4] as [number, number])).replace(/^M[^C]+/, `M0 ${ALTO} L0 ${ALTO * 0.88} L${(PUNTOS[0][0] / 100) * ANCHO} ${((PUNTOS[0][1] - 4) / 100) * ALTO}`)} L${ANCHO * 0.885} ${ALTO * 0.06} L${ANCHO * 0.93} ${ALTO * 0.16} C${ANCHO * 0.96} ${ALTO * 0.24} ${ANCHO * 0.98} ${ALTO * 0.3} ${ANCHO} ${ALTO * 0.34} V${ALTO}Z`;

  return (
    <Escena>
      <section className="ml-montana" aria-labelledby="ml-montana">
        <div className="ml-montana__cabeza">
          <h2 id="ml-montana" className="ml-montana__h2">
            {T.titulo}
          </h2>
          <p className="ml-montana__bajada">{siguiente ? T.bajada(siguiente.minimo - creditos, siguiente.nombre) : T.cima}</p>
        </div>
        <div className="ml-montana__escena">
          <svg className="ml-montana__dibujo" viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="mm-cielo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className="mm-cielo-alto" />
                <stop offset="1" className="mm-cielo-bajo" />
              </linearGradient>
            </defs>
            <rect width={ANCHO} height={ALTO} fill="url(#mm-cielo)" />
            <circle className="mm-sol" cx="760" cy="70" r="38" />
            <path className="mm-lejos" d="M0 250 C120 210 200 230 300 190 C380 160 430 170 520 130 C600 95 640 120 700 100 L760 90 C820 110 900 130 1000 110 V340 H0Z" />
            <path className="mm-monte" d={ladera} />
            <path className="mm-nieve" d="M858 30 L885 20 L930 54 L910 48 L896 58 L878 44 Z" />
            <path className="mm-cerca" d="M0 340 V300 C140 330 260 300 400 318 C540 336 700 300 820 318 C900 330 960 320 1000 312 V340Z" />
            <path className="mm-sendero" d={d} />
            <m.path
              className="mm-sendero-luz"
              d={d}
              initial={{ pathLength: reducido ? avance : 0 }}
              animate={{ pathLength: Math.max(avance, 0.0001) }}
              transition={{ duration: reducido ? 0 : 1.4, ease: [0.22, 1, 0.36, 1], delay: reducido ? 0 : 0.2 }}
            />
          </svg>
          <ol className="ml-montana__estaciones">
            {niveles.map((n, k) => {
              const estado = k < i ? "logrado" : k === i ? "actual" : "futuro";
              const [x, y] = PUNTOS[k];
              const lado = k < 2 ? "izq" : k > 7 ? "der" : "centro";
              return (
                <li
                  key={n.nivel}
                  className={`ml-estacion es-${estado} es-${lado}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  aria-current={estado === "actual" ? "step" : undefined}
                >
                  <span className="ml-estacion__punto" aria-hidden="true">
                    {estado === "logrado" ? <Icono nombre="check" tamaño={12} /> : estado === "actual" ? n.nivel : k === niveles.length - 1 ? <Icono nombre="star" tamaño={12} /> : null}
                  </span>
                  <span className={estado === "actual" || (k === i + 1 && siguiente) || k === niveles.length - 1 ? "ml-estacion__rotulo" : "sr-only"}>
                    <span className="ml-estacion__n">{T.nivel(n.nivel)}</span> <span className="ml-estacion__nombre">{n.nombre}</span>
                    <span className="sr-only">
                      {", "}
                      {estado === "logrado" ? T.logrado : estado === "actual" ? T.actual : T.desde(miles(n.minimo))}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </Escena>
  );
}
