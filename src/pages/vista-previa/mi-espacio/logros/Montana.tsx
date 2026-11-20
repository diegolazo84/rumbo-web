// «Tu montaña» (Mis logros, nov-2026): sobre la foto real de Torres del Paine de la portada, los 10
// niveles reales suben en zigzag hasta la cumbre. Lo conseguido se ilumina, tu nivel late y el
// siguiente dice cuánto falta. Los puntos son HTML (mismo tamaño en cualquier ancho) y forman una
// lista ordenada accesible; el sendero dorado es decorativo.
import { m, useReducedMotion } from "motion/react";
import { Escena } from "../../../../components/app/Movimiento";
import { Icono } from "../../../../components/app";
import { niveles } from "../../../../data/rumbo";
import { miles } from "../../../../lib/fechas";
import { T_LOGROS } from "../textos";

const ANCHO = 1000;
const ALTO = 1000;
// Estaciones en % de la foto: zigzag desde el sendero hasta la cumbre (de la base a la cima).
const PUNTOS: [number, number][] = [
  [40, 90], [58, 84], [72, 74], [57, 64], [42, 56], [55, 46], [67, 37], [58, 27], [50, 18], [47, 8],
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

  return (
    <Escena>
      <section className="ml-montana" aria-label={T.titulo}>
        <p className="sr-only">{siguiente ? T.bajada(siguiente.minimo - creditos, siguiente.nombre) : T.cima}</p>
          <svg className="ml-montana__dibujo" viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path className="mm-sendero-sombra" d={d} />
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
      </section>
    </Escena>
  );
}
