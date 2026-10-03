// Hoja (.hoja, plataforma 4.1.3): <dialog> modal. En móvil sube desde abajo (--r-l arriba,
// asa decorativa, alto máximo 90 %); desde 1024 px es un panel lateral derecho de 420 px.
// Escape cierra (nativo) y el foco vuelve a quien la abrió. Tocar fuera también cierra.
// Se abre solo en el navegador: en el prerender queda cerrada.
import { useEffect, useId, useRef, type ReactNode } from "react";
import Icono from "./Icono";

type Props = {
  abierta: boolean;
  onCerrar: () => void;
  titulo: ReactNode;
  children: ReactNode;
  textoCerrar?: string; // nombre accesible del botón de cierre
  id?: string;
  className?: string;
};

export default function Hoja({ abierta, onCerrar, titulo, children, textoCerrar = "Cerrar", id, className }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const origen = useRef<HTMLElement | null>(null);
  const idTitulo = useId();

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierta && !d.open) {
      origen.current = document.activeElement as HTMLElement | null;
      d.showModal();
    } else if (!abierta && d.open) {
      d.close();
    }
  }, [abierta]);

  return (
    <dialog
      ref={dialogo}
      id={id}
      className={className ? `hoja ${className}` : "hoja"}
      aria-labelledby={idTitulo}
      onClose={() => {
        onCerrar();
        // Devuelve el foco a quien abrió la hoja (si sigue en la página).
        const o = origen.current;
        if (o && document.contains(o)) o.focus();
      }}
      onClick={(e) => {
        // Toque en el fondo (fuera de la caja): el evento llega al propio <dialog>.
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="hoja__caja">
        <span className="hoja__asa" aria-hidden="true" />
        <div className="hoja__cabeza">
          <h2 id={idTitulo} className="hoja__titulo">
            {titulo}
          </h2>
          <button type="button" className="boton-icono" onClick={() => dialogo.current?.close()}>
            <Icono nombre="x" tamaño={24} />
            <span className="sr-only">{textoCerrar}</span>
          </button>
        </div>
        <div className="hoja__cuerpo">{children}</div>
      </div>
    </dialog>
  );
}
