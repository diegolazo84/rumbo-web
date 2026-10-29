// Más → Mantención (C21): el dueño comprueba que el borrado automático de fotos funciona. Todo
// sale de la base (estado_depuracion_fotos): pendientes, última ejecución, borradas, errores y
// archivos sin registro. Nunca muestra rutas ni nombres. «Revisar ahora» pide una ejecución
// (pedir_depuracion_fotos); solo funciona si el borrado ya está activo.
import { useCallback, useEffect, useState } from "react";
import Etiqueta from "../../../components/Etiqueta";
import { Icono } from "../../../components/app";
import { datos } from "../../../lib/supabase";
import { Datos, Seccion } from "../../vista-previa/panel/comun";
import { MANTENCION_FOTOS as T } from "../../vista-previa/panel/textos";
import { Alerta, useDatosPanel, useEscritura } from "./comun";

type Ejecucion = {
  origen: string;
  iniciada_en: string;
  terminada_en: string | null;
  estado: string;
  vencidas: number;
  borradas: number;
  fallidas: number;
  huerfanos_borrados: number;
  error: string | null;
};
export type EstadoDepuracion = {
  activa: boolean;
  dias: number;
  horas_seguridad: number;
  conteo: {
    vencidas_guardadas: number;
    proximas_7_dias: number;
    en_revision: number;
    archivos_sin_registro: number;
    archivos_recientes_sin_registro: number;
    registros_sin_archivo: number;
  };
  fallos: { fotos: number; repetidos: number; ultimo_error: string | null };
  borradas_30_dias: number;
  ejecuciones: Ejecucion[];
};

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

function EtiquetaEstado({ estado }: { estado: string }) {
  return <Etiqueta variante={estado === "ok" ? "activo" : "nota"}>{T.estados[estado] ?? estado}</Etiqueta>;
}

export function MantencionFotos() {
  const { sb } = useDatosPanel();
  const [estado, setEstado] = useState<EstadoDepuracion | null | "sin-acceso">(null);
  const [correr, error] = useEscritura();
  const [aviso, setAviso] = useState("");
  const leer = useCallback(async () => {
    try {
      setEstado(datos(await sb.rpc("estado_depuracion_fotos")) as EstadoDepuracion);
    } catch {
      setEstado("sin-acceso"); // un coach, o la migración aún no aplicada
    }
  }, [sb]);
  useEffect(() => {
    void leer();
  }, [leer]);
  if (estado === "sin-acceso" || estado === null) return null;
  const c = estado.conteo;
  const ultima = estado.ejecuciones[0];
  const alerta = (n: number) => (n > 0 ? <strong className="pa-alerta-num">{n}</strong> : n);
  return (
    <Seccion titulo={T.titulo} id="mantencion" className="tarjeta pa-tarjeta">
      <div className="pa-pila pa-pila--chica">
        <h3 className="pa-h3">{T.subtitulo}</h3>
        <p>
          <Etiqueta variante={estado.activa ? "activo" : "nota"}>{estado.activa ? T.activo : T.inactivo}</Etiqueta>
        </p>
        <p className="microcopia">{T.plazo(estado.dias)}</p>
        <Datos
          filas={[
            [T.filas.pendientes, alerta(c.vencidas_guardadas)],
            [T.filas.proximas, c.proximas_7_dias],
            [T.filas.enRevision, c.en_revision],
            [T.filas.borradas, estado.borradas_30_dias],
            [T.filas.errores, <>{alerta(estado.fallos.fotos)}{T.filas.repetidos(estado.fallos.repetidos)}</>],
            [T.filas.huerfanos(estado.horas_seguridad), alerta(c.archivos_sin_registro)],
            [T.filas.recientes, c.archivos_recientes_sin_registro],
            [T.filas.sinArchivo, alerta(c.registros_sin_archivo)],
          ]}
        />
      </div>
      <div className="pa-pila pa-pila--chica">
        <h3 className="pa-h3">{T.ultima}</h3>
        {ultima ? (
          <>
            <p>
              <EtiquetaEstado estado={ultima.estado} /> {fechaHora(ultima.iniciada_en)} · {T.origen[ultima.origen] ?? ultima.origen}
            </p>
            <p className="microcopia">
              {T.resumen(ultima.borradas, ultima.fallidas, ultima.huerfanos_borrados)}
              {ultima.error ? ` · ${T.error(ultima.error)}` : ""}
            </p>
          </>
        ) : (
          <p className="microcopia">{T.nunca}</p>
        )}
        {estado.ejecuciones.length > 1 && (
          <>
            <h4 className="pa-h3">{T.historial}</h4>
            <ul className="pa-lista-simple">
              {estado.ejecuciones.slice(1).map((e) => (
                <li key={e.iniciada_en}>
                  <EtiquetaEstado estado={e.estado} /> {fechaHora(e.iniciada_en)} · {T.resumen(e.borradas, e.fallidas, e.huerfanos_borrados)}
                  {e.error ? ` · ${T.error(e.error)}` : ""}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="acciones">
        <button
          type="button"
          className="boton boton--secundario"
          onClick={async () => {
            setAviso("");
            let lanzada = false;
            if (await correr(async () => (lanzada = datos(await sb.rpc("pedir_depuracion_fotos")) === true))) setAviso(lanzada ? T.pedida : T.noActiva);
          }}
        >
          <Icono nombre="refresh-cw" tamaño={20} />
          {T.revisar}
        </button>
        <button type="button" className="boton boton--terciario" onClick={() => void leer()}>
          {T.actualizar}
        </button>
      </div>
      <Alerta texto={error} />
      <p role="status" className="microcopia">
        {aviso}
      </p>
    </Seccion>
  );
}
