// Campo trampa (plataforma 3.11): nombre no semántico, fuera de pantalla, aria-hidden, sin
// foco y sin autocompletado. Si llega lleno, la base marca la solicitud posible_spam y la
// respuesta es la normal: nunca se descarta en silencio.
import { TEXTOS_FORM } from "../../data/formularios";

export default function CampoTrampa({ valor, onCambio }: { valor?: string; onCambio?: (v: string) => void }) {
  const { nombre, etiqueta } = TEXTOS_FORM.trampa;
  return (
    <div className="campo-trampa" aria-hidden="true">
      <label htmlFor={nombre}>{etiqueta}</label>
      <input
        id={nombre}
        name={nombre}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        {...(onCambio ? { value: valor ?? "", onChange: (e) => onCambio(e.target.value) } : { defaultValue: "" })}
      />
    </div>
  );
}
