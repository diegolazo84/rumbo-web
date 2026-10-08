// Aviso de ayuda (.aviso-ayuda, plataforma 3.1 y 1.3): variante compacta del aviso phone que
// va bajo TODO texto libre (meta, mensaje, registro semanal, solicitud de ajuste, nota de
// evidencia). Siempre visible: nunca dentro de un <details> cerrado. Los números salen de
// recursosAyuda() (vía formularios.ts). También aquí: «No es un chat: no hay respuesta inmediata.»
import type { MouseEventHandler } from "react";
import { Link } from "react-router-dom";
import { AVISO_AYUDA, TEXTOS_FORM } from "../../data/formularios";
import Icono from "../app/Icono";

type Props = {
  // "general": «Rumbo no atiende urgencias…»; "revision": variante del registro semanal (4.11).
  variante?: "general" | "revision";
  href?: string; // destino de «Ayuda inmediata» (por defecto /ayuda/)
  onAyuda?: MouseEventHandler<HTMLAnchorElement>; // en Mi espacio puede abrir la hoja de 4.15
  className?: string;
};

export default function AvisoAyuda({ variante = "general", href = "/ayuda/", onAyuda, className }: Props) {
  const enlace = (
    <Link to={href} onClick={onAyuda}>
      {AVISO_AYUDA.enlace}
    </Link>
  );
  return (
    <div className={className ? `aviso aviso-ayuda ${className}` : "aviso aviso-ayuda"}>
      <Icono nombre="phone" tamaño={16} className="aviso-icono" />
      <p>
        {variante === "revision" ? (
          <>
            {AVISO_AYUDA.revision}
            {enlace}.
          </>
        ) : (
          <>
            {AVISO_AYUDA.antes}
            <strong>{AVISO_AYUDA.numero4141}</strong>
            {AVISO_AYUDA.medio}
            <strong>
              {AVISO_AYUDA.tel131 ? <a href={AVISO_AYUDA.tel131}>{AVISO_AYUDA.numero131}</a> : AVISO_AYUDA.numero131}
            </strong>
            {AVISO_AYUDA.despues}
            {enlace}.
          </>
        )}
      </p>
    </div>
  );
}

// «No es un chat: no hay respuesta inmediata.» (1.2-3): junto a todo lugar donde la persona escribe para su coach.
export function NoEsChat({ className }: { className?: string }) {
  return <p className={className ? `no-es-chat ${className}` : "no-es-chat"}>{TEXTOS_FORM.noEsChat}</p>;
}
