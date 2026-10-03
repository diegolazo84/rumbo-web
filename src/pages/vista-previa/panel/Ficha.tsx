// Vista previa · panel, ficha de solicitud y de participante (plataforma 5.4 y 5.5).
// Variantes (registro.ts): «solicitud» y «participante».
import type { PropsPantalla } from "../registro";
import FichaParticipante from "./FichaParticipante";
import FichaSolicitud from "./FichaSolicitud";

export default function Ficha({ estado }: PropsPantalla) {
  return estado === "participante" ? <FichaParticipante /> : <FichaSolicitud />;
}
