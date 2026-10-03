// Franja de la semana (.franja-semana, plataforma 4.1.3 y 4.7.3): 7 botones de día con la
// inicial, el número y hasta 3 puntos con el color de cada meta con acciones ese día.
// Hoy: contorno bosque de 1,5 px. Día completo: check pequeño en niebla y bosque. Pegajosa bajo
// la cabecera. Los puntos son decorativos: el nombre accesible del botón lo dice todo.
// Un día pasado incompleto no lleva ninguna marca (sin rojo, sin cruz).
import type { CategoriaId } from "../../data/rumbo";

export type DiaFranja = {
  fecha: string; // AAAA-MM-DD
  inicial: string; // «M»
  numero: number;
  puntos: CategoriaId[]; // una por meta con acciones ese día (máx. 3 se dibujan)
  hoy?: boolean;
  completo?: boolean;
  fuera?: boolean; // fuera del programa
  nombre: string; // «Martes 13 de octubre: 3 acciones, 1 hecha.»
};

type Props = {
  dias: DiaFranja[];
  elegido?: string;
  onElegir?: (fecha: string) => void;
  etiqueta?: string; // nombre del grupo, p. ej. «Días de la semana»
};

export default function FranjaSemana({ dias, elegido, onElegir, etiqueta }: Props) {
  return (
    <div className="franja-semana" role="group" aria-label={etiqueta}>
      {dias.map((d) => {
        const clases = ["franja-semana__dia", d.hoy && "es-hoy", d.completo && "es-completo", d.fuera && "es-fuera"]
          .filter(Boolean)
          .join(" ");
        return (
          <button
            key={d.fecha}
            type="button"
            className={clases}
            aria-label={d.nombre}
            aria-pressed={elegido ? elegido === d.fecha : undefined}
            onClick={() => onElegir?.(d.fecha)}
          >
            <span className="franja-semana__inicial" aria-hidden="true">
              {d.inicial}
            </span>
            <span className="franja-semana__numero" aria-hidden="true">
              {d.numero}
            </span>
            <span className="franja-semana__puntos" aria-hidden="true">
              {d.puntos.slice(0, 3).map((c, i) => (
                <span key={i} className="punto-meta" data-cat={c} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
