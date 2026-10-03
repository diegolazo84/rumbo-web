// Zona de envío (.envio, plataforma 3.1 y 3.12): botón primario (ancho en móvil) y debajo
// las frases de tranquilidad. Ahí aparece el aviso de error de red (role="alert"), sobre el
// botón. Enviando: el botón cambia de texto y queda con aria-disabled (nunca disabled), y una
// región role="status" lo anuncia. Sin barra fija inferior en formularios públicos.
import type { MouseEvent, ReactNode } from "react";
import Icono from "../app/Icono";

type Props = {
  texto: string; // «Enviar mi solicitud»
  textoEnviando?: string; // «Enviando tu solicitud…»
  anuncioEnviando?: string; // «Enviando tu solicitud» (role=status)
  enviando?: boolean;
  alerta?: ReactNode; // error de red, servidor, límite o cerradas: va sobre el botón
  accionAlerta?: ReactNode; // p. ej. «Intentar de nuevo» o «Avisarme cuando vuelvan a recibir»
  frases?: ReactNode[]; // tranquilidad en --t-xs
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

export default function Envio({
  texto,
  textoEnviando,
  anuncioEnviando,
  enviando,
  alerta,
  accionAlerta,
  frases = [],
  onClick,
  className,
}: Props) {
  return (
    <div className={className ? `envio ${className}` : "envio"}>
      <div role="alert" className="envio__alerta">
        {alerta && (
          <div className="aviso aviso--error-envio">
            <Icono nombre="info" tamaño={20} className="aviso-icono" />
            <div className="aviso-cuerpo">
              {typeof alerta === "string" ? <p>{alerta}</p> : alerta}
              {accionAlerta}
            </div>
          </div>
        )}
      </div>
      <button
        type="submit"
        className="boton boton--primario envio__boton"
        aria-disabled={enviando ? true : undefined}
        onClick={(e) => {
          if (enviando) {
            e.preventDefault();
            return;
          }
          onClick?.(e);
        }}
      >
        {enviando ? (textoEnviando ?? texto) : texto}
      </button>
      <p role="status" className="sr-only">
        {enviando ? (anuncioEnviando ?? textoEnviando ?? "") : ""}
      </p>
      {frases.length > 0 && (
        <div className="envio__frases">
          {frases.map((f, i) => (
            <p key={i}>{f}</p>
          ))}
        </div>
      )}
    </div>
  );
}
