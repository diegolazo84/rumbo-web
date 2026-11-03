// Tostada (.tostada, plataforma 4.1.3 y 4.5): aviso sobre la barra inferior con texto y una
// acción («Deshacer», «Reintentar»), dentro de una región role="status" que existe siempre (así
// se anuncia). No desaparece con cuenta regresiva: se va con la siguiente acción o al cerrarla.
// Nunca tapa un campo con foco (va sobre la barra, fuera del flujo del contenido).
import Icono from "./Icono";

type Props = {
  mensaje: string | null;
  // «logro»: confirmación de una acción completada (icono y entrada suave); «dia»: día completo.
  tono?: "logro" | "dia";
  accion?: { texto: string; onClick: () => void };
  onCerrar?: () => void;
  textoCerrar?: string;
};

export default function Tostada({ mensaje, tono, accion, onCerrar, textoCerrar = "Cerrar" }: Props) {
  return (
    <div className="tostada-zona" role="status">
      {mensaje && (
        <div key={mensaje} className={tono ? `tostada tostada--logro${tono === "dia" ? " tostada--dia" : ""}` : "tostada"}>
          {tono && (
            <span className="tostada__logro" aria-hidden="true">
              <Icono nombre={tono === "dia" ? "star" : "check"} tamaño={16} />
            </span>
          )}
          <p className="tostada__texto">{mensaje}</p>
          {accion && (
            <button type="button" className="boton boton--terciario tostada__accion" onClick={accion.onClick}>
              {accion.texto}
            </button>
          )}
          {onCerrar && (
            <button type="button" className="boton-icono tostada__cerrar" onClick={onCerrar}>
              <Icono nombre="x" tamaño={20} />
              <span className="sr-only">{textoCerrar}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
