// Tostada (.tostada, plataforma 4.1.3 y 4.5): aviso sobre la barra inferior con texto y una
// acción («Deshacer», «Reintentar»), dentro de una región role="status" que existe siempre (así
// se anuncia). Los avisos y errores no desaparecen solos: se van con la siguiente acción o al
// cerrarlos. Nunca tapa un campo con foco (va sobre la barra, fuera del flujo del contenido).
//
// Logro (paquete 2, `tono`): confirmación de una acción completada, con intensidad según el
// logro. Se cierra sola a los pocos segundos (DURACION_LOGRO) y la cuenta se detiene mientras el
// puntero o el foco estén encima, para que «Deshacer» siga al alcance (WCAG 2.2.1).
import { useEffect, useRef, useState } from "react";
import { DURACION_LOGRO, type Intensidad } from "../../lib/celebrar";
import Icono from "./Icono";

type Props = {
  mensaje: string | null;
  titulo?: string; // logro: «¡Lo lograste!»
  detalle?: string; // logro: «+4 créditos», en segundo plano
  tono?: Intensidad;
  accion?: { texto: string; onClick: () => void };
  onCerrar?: () => void;
  textoCerrar?: string;
};

export default function Tostada({ mensaje, titulo, detalle, tono, accion, onCerrar, textoCerrar = "Cerrar" }: Props) {
  const [pausa, setPausa] = useState(false);
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  useEffect(() => setPausa(false), [mensaje]);
  // Cierre automático solo para los logros; se reinicia con cada mensaje nuevo.
  useEffect(() => {
    if (!mensaje || !tono || pausa) return;
    const t = window.setTimeout(() => cerrar.current?.(), DURACION_LOGRO[tono]);
    return () => window.clearTimeout(t);
  }, [mensaje, titulo, tono, pausa]);

  const clases = tono ? `tostada tostada--logro tostada--${tono}` : "tostada";
  return (
    <div className="tostada-zona" role="status">
      {mensaje && (
        <div
          key={`${titulo ?? ""}${mensaje}`}
          className={clases}
          onPointerEnter={() => setPausa(true)}
          onPointerLeave={() => setPausa(false)}
          onFocus={() => setPausa(true)}
          onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setPausa(false)}
        >
          {tono && (
            <span className="tostada__logro" aria-hidden="true">
              <Icono nombre={tono === "suave" ? "check" : "star"} tamaño={16} />
            </span>
          )}
          <p className="tostada__texto">
            {titulo && <strong className="tostada__titulo">{titulo} </strong>}
            <span className="tostada__mensaje">{mensaje}</span>
            {detalle && <span className="tostada__detalle"> {detalle}</span>}
          </p>
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
