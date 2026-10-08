// Vista previa · detalle de acción como página completa (plataforma 4.8 y 4.9), como se ve al
// entrar directo por accion/?id=. Desde una lista (Hoy, calendario) el mismo contenido se abre
// en una hoja. Estados: por-hacer, hecha, futura, dejada-pasar, anulada-ajuste, anulada-pausa
// y, en acciones con foto (Martín), con-foto, foto-en-revision, foto-aprobada, foto-no-aprobada
// y foto-depurada.
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { TEXTOS_CARGA, Tostada } from "../../../components/app";
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
import { Cabeza, RegionViva, useAvisos, useEspacio, usePrograma, type Progreso } from "./comun";
import { T_COMUN, T_DETALLE, T_HOY } from "./textos";

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
  const { real } = useEspacio();
  return real ? <DetalleReal /> : <DetallePrevia estado={estado} />;
}

function DetallePrevia({ estado = "por-hacer" }: PropsPantalla) {
  const inicial = (POR_ESTADO[estado] ?? POR_ESTADO["por-hacer"])();
  const [registro, setRegistro] = useState<EstadoRegistro | null>(inicial.registro);
  return (
    <div className="me-pantalla me-pantalla--angosta">
      <Detalle o={{ ...inicial, registro }} hoy={HOY} onRegistrar={setRegistro} fotoInicial={FOTO[estado]} />
    </div>
  );
}

// Mi espacio real: accion/?id={uuid} (se lee después de hidratar). Marcar funciona como en Hoy.
function DetalleReal() {
  const { search } = useLocation();
  const { R } = useEspacio();
  const [id, setId] = useState<string | null>(null);
  useEffect(() => setId(new URLSearchParams(search).get("id") ?? ""), [search]);
  const { lista, registrar, hoy } = usePrograma();
  const { tostada, setTostada, vivo, setVivo, cerrar } = useAvisos();
  const o = id ? lista.find((x) => x.id === id) : undefined;

  if (id === null) {
    return (
      <div className="me-pantalla me-pantalla--angosta">
        <div className="cargando" role="status">
          <h1 className="me-cargando__titulo">{TEXTOS_CARGA.cargando}</h1>
        </div>
      </div>
    );
  }
  if (!o) {
    return (
      <div className="me-pantalla me-pantalla--angosta">
        <Cabeza titulo={T_DETALLE.noEncontrada} bajada={<p><Link to={R.calendario}>{T_DETALLE.irAlCalendario}</Link></p>} />
      </div>
    );
  }
  const anunciar = (p: Progreso) => setVivo(T_HOY.marcar.vivo(p.creditos, p.nivel.nivel, p.nivel.nombre));
  const guardar = (estado: EstadoRegistro | null): void =>
    registrar(o.id, estado, anunciar, () =>
      setTostada({ mensaje: T_HOY.marcar.error(o.titulo), accion: { texto: T_HOY.marcar.reintentar, onClick: () => guardar(estado) } }),
    );
  return (
    <div className="me-pantalla me-pantalla--angosta">
      <Detalle o={o} hoy={hoy} onRegistrar={guardar} />
      <Tostada mensaje={tostada?.mensaje ?? null} accion={tostada?.accion} onCerrar={cerrar} textoCerrar={T_COMUN.cerrar} />
      <RegionViva texto={vivo} />
    </div>
  );
}
