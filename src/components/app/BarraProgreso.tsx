// Barra de progreso (.barra de la especificación 3.14): role="progressbar" con valor y texto
// visible debajo. Relleno bosque (nivel) o var(--cat) (meta) sobre carril papel hondo.
// El ancho es el único estilo en línea permitido.
import type { ReactNode } from "react";
import type { CategoriaId } from "../../data/rumbo";

type Props = {
  valor: number;
  maximo: number;
  minimo?: number;
  etiqueta: string; // nombre accesible: «Créditos para llegar a Ritmo», «Acciones de Lanzar mi taller en línea»
  textoValor?: string; // aria-valuetext: «22 de 25 créditos»
  texto?: ReactNode; // texto visible bajo la barra
  cat?: CategoriaId; // relleno con el color de la meta
  className?: string;
};

export default function BarraProgreso({ valor, maximo, minimo = 0, etiqueta, textoValor, texto, cat, className }: Props) {
  const rango = maximo - minimo;
  const avance = rango > 0 ? Math.max(0, Math.min(100, Math.round(((valor - minimo) / rango) * 100))) : 100;
  return (
    <div className={className ? `progreso ${className}` : "progreso"} data-cat={cat}>
      <div
        className={cat ? "barra barra--meta" : "barra"}
        role="progressbar"
        aria-valuemin={minimo}
        aria-valuemax={maximo}
        aria-valuenow={valor}
        aria-label={etiqueta}
        aria-valuetext={textoValor}
      >
        <span className="barra-relleno" style={{ inlineSize: `${avance}%` }} />
      </div>
      {texto && <p className="barra-texto">{texto}</p>}
    </div>
  );
}
