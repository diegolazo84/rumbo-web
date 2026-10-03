// Resumen de errores (.resumen-errores, plataforma 3.1): un .aviso con fondo --error-fondo,
// icono circle-alert en --error y tabindex="-1". Al enviar con errores el foco cae aquí y se
// anuncia su título. Cada enlace lleva al control con el texto exacto del error, respetando
// scroll-padding-top (la cabecera fija nunca tapa el campo).
import type { MouseEvent, Ref } from "react";
import { tituloResumenErrores } from "../../data/formularios";
import Icono from "../app/Icono";

export type ErrorResumen = { id: string; texto: string }; // id del control o del grupo (fieldset)

type Props = {
  errores: ErrorResumen[];
  ref?: Ref<HTMLDivElement>; // para llevar el foco al resumen tras enviar
  id?: string;
};

// Lleva el foco al control: un input/textarea/select, o el radio marcado (o el primero) de un grupo.
export function enfocarCampo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const destino = el.matches("input, textarea, select")
    ? el
    : el.querySelector<HTMLElement>("input:checked, input:not([type=hidden]), textarea, select");
  (destino ?? el).focus();
  // scrollIntoView respeta scroll-padding-top del documento.
  (destino ?? el).scrollIntoView({ block: "start" });
}

export default function ResumenErrores({ errores, ref, id = "resumen-errores" }: Props) {
  if (!errores.length) return null;
  const titulo = `${id}-titulo`;
  const ir = (e: MouseEvent<HTMLAnchorElement>, campo: string) => {
    e.preventDefault();
    enfocarCampo(campo);
  };
  return (
    <div ref={ref} id={id} className="aviso resumen-errores" tabIndex={-1} aria-labelledby={titulo} role="group">
      <Icono nombre="circle-alert" tamaño={20} className="aviso-icono" />
      <div className="aviso-cuerpo">
        <h2 id={titulo} className="aviso-titulo">
          {tituloResumenErrores(errores.length)}
        </h2>
        <ul>
          {errores.map((e) => (
            <li key={e.id}>
              <a href={`#${e.id}`} onClick={(ev) => ir(ev, e.id)}>
                {e.texto}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
