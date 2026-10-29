// Anillo del día (etapa 2A): acciones hechas sobre programadas de un día, sin porcentaje.
// Lo usan Mi Rumbo (participante) y la semana de la ficha del panel (coach), para que ambos
// vean el mismo avance. role="img" con el texto completo; el número visible es «1/3».
// El arco se dibuja con atributos SVG (sin estilos en línea).

const RADIO = 15.5;
const LARGO = 2 * Math.PI * RADIO;

type Props = {
  hechas: number;
  programadas: number;
  etiqueta: string; // «Hoy: 1 de 3 acciones hechas.»
  chico?: boolean; // 40 px (panel); por defecto 64 px
  className?: string;
};

export default function AnilloDia({ hechas, programadas, etiqueta, chico, className }: Props) {
  const h = Math.max(0, Math.min(hechas, programadas));
  const avance = programadas > 0 ? h / programadas : 0;
  const completo = programadas > 0 && h === programadas;
  const clases = ["anillo", chico && "anillo--chico", completo && "es-completo", className].filter(Boolean).join(" ");
  return (
    <div className={clases} role="img" aria-label={etiqueta}>
      <svg viewBox="0 0 36 36" aria-hidden="true" focusable="false">
        <circle className="anillo__carril" cx="18" cy="18" r={RADIO} />
        {h > 0 && (
          <circle
            className="anillo__arco"
            cx="18"
            cy="18"
            r={RADIO}
            strokeDasharray={`${(avance * LARGO).toFixed(2)} ${LARGO.toFixed(2)}`}
          />
        )}
      </svg>
      <span className="anillo__texto" aria-hidden="true">
        {h}/{programadas}
      </span>
    </div>
  );
}
