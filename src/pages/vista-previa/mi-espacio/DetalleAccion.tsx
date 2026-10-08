// Vista previa · detalle de acción como página completa (plataforma 4.8 y 4.9), como se ve al
// entrar directo por accion/?id=. Desde una lista (Hoy, calendario) el mismo contenido se abre
// en una hoja. Estados: por-hacer, hecha, futura, dejada-pasar, anulada-ajuste, anulada-pausa
// y, en acciones con foto (Martín), con-foto, foto-en-revision, foto-aprobada, foto-no-aprobada
// y foto-depurada.
import { useState } from "react";
import {
  HOY,
  accionAnuladaAjuste,
  accionAnuladaPausa,
  accionConFoto,
  accionFotoAprobada,
  accionFotoDepurada,
  accionFotoNoAprobada,
  ocurrenciaPorId,
  type EstadoRegistro,
  type Ocurrencia,
} from "../../../data/ejemplo-app";
import type { PropsPantalla } from "../registro";
import Detalle, { type FotoInicial } from "./Detalle";

// Una ocurrencia del ejemplo por estado (src/data/ejemplo-app.ts).
const POR_ESTADO: Record<string, () => Ocurrencia> = {
  "por-hacer": () => ocurrenciaPorId("a5-2026-10-13")!, // hoy, con versión corta
  hecha: () => ocurrenciaPorId("a3-2026-10-13")!, // hoy, ya marcada
  futura: () => ocurrenciaPorId("a2-2026-10-14")!, // mañana
  "dejada-pasar": () => ocurrenciaPorId("a5-2026-10-06")!, // dentro de la ventana de 7 días
  "anulada-ajuste": () => accionAnuladaAjuste,
  "anulada-pausa": () => accionAnuladaPausa,
  "con-foto": () => ({ ...accionConFoto, registro: null }),
  "foto-en-revision": () => accionConFoto,
  "foto-aprobada": () => accionFotoAprobada,
  "foto-no-aprobada": () => accionFotoNoAprobada,
  "foto-depurada": () => accionFotoDepurada,
};

const FOTO: Record<string, FotoInicial> = {
  "con-foto": "sin",
  "foto-en-revision": "revision",
  "foto-aprobada": "aprobada",
  "foto-no-aprobada": "no-aprobada",
  "foto-depurada": "depurada",
};

export default function DetalleAccion({ estado = "por-hacer" }: PropsPantalla) {
  const inicial = (POR_ESTADO[estado] ?? POR_ESTADO["por-hacer"])();
  const [registro, setRegistro] = useState<EstadoRegistro | null>(inicial.registro);
  return (
    <div className="me-pantalla me-pantalla--angosta">
      <Detalle o={{ ...inicial, registro }} hoy={HOY} onRegistrar={setRegistro} fotoInicial={FOTO[estado]} />
    </div>
  );
}
