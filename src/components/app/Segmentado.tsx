// Control segmentado (.segmentado, plataforma 4.1.3): radios nativos con aspecto de pastillas
// de 44 px («Día · Semana · Mes», «Liviana · Justa · Pesada»). Marcada: fondo bosque, texto papel.
import { useId } from "react";

type Props = {
  leyenda: string;
  leyendaOculta?: boolean; // «Vista del calendario» se lee pero no se ve
  name?: string;
  opciones: readonly { valor: string; texto: string }[];
  valor?: string;
  onCambio?: (valor: string) => void;
  className?: string;
};

export default function Segmentado({ leyenda, leyendaOculta, name, opciones, valor, onCambio, className }: Props) {
  const auto = useId();
  const nombre = name ?? auto;
  return (
    <fieldset className={className ? `segmentado ${className}` : "segmentado"} role="radiogroup">
      <legend className={leyendaOculta ? "sr-only" : "campo__etiqueta"}>{leyenda}</legend>
      <div className="segmentado__opciones">
        {opciones.map((o) => (
          <label key={o.valor} className="segmentado__opcion">
            <input
              type="radio"
              name={nombre}
              value={o.valor}
              {...(onCambio
                ? { checked: valor === o.valor, onChange: () => onCambio(o.valor) }
                : { defaultChecked: valor === o.valor })}
            />
            <span>{o.texto}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
