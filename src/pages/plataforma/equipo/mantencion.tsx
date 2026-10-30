// Más → Mantención (C21): el dueño comprueba que el borrado automático de fotos funciona. Todo
// sale de la base (estado_depuracion_fotos): estado real, pendientes, última ejecución, borradas,
// errores y archivos sin registro. Nunca muestra rutas ni nombres. «Revisar ahora» pide una
// ejecución (pedir_depuracion_fotos); solo funciona si el borrado ya está activo.
import { useCallback, useEffect, useState } from "react";
import { Icono } from "../../../components/app";
import { datos } from "../../../lib/supabase";
import { Seccion } from "../../vista-previa/panel/comun";
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
  estado: "activa" | "con_problemas" | "esperando" | "detenida" | "desactivada" | "sin_activar";
  horario: string | null;
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
  interrumpidas_30_dias: number;
  borradas_30_dias: number;
  ejecuciones: Ejecucion[];
};

const ZONA = "America/Santiago";
const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-CL", { timeZone: ZONA, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// «30 7 * * *» (UTC, como trabaja pg_cron) → «04:30» u «03:30» según el horario de Chile de hoy.
export function horaChile(horario: string | null, hoy = new Date()): string | null {
  const m = horario?.match(/^(\d{1,2}) (\d{1,2}) \* \* \*$/);
  if (!m) return null;
  const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate(), Number(m[2]), Number(m[1])));
  return d.toLocaleTimeString("es-CL", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

// Tono de cada estado: bien (salvia), atención (terracota suave) o neutro (en espera, sin activar).
const TONO: Record<EstadoDepuracion["estado"], "bien" | "atencion" | "neutro"> = {
  activa: "bien",
  con_problemas: "atencion",
  detenida: "atencion",
  desactivada: "atencion",
  esperando: "neutro",
  sin_activar: "neutro",
};

function Problema({ titulo, n, texto, extra }: { titulo: string; n: number; texto: string; extra?: string }) {
  const hay = n > 0;
  return (
    <li className={`pa-mant__problema${hay ? " pa-mant__problema--hay" : ""}`}>
      <span className="pa-mant__problema-icono" aria-hidden="true">
        <Icono nombre={hay ? "circle-alert" : "check"} tamaño={20} />
      </span>
      <div className="pa-mant__problema-texto">
        <h4 className="pa-h3">{titulo}</h4>
        <p className="microcopia">{hay ? texto : T.alertas.sinProblemas}</p>
        {extra && <p className="microcopia">{extra}</p>}
      </div>
      <strong className="pa-mant__problema-n">{n}</strong>
    </li>
  );
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
  const ultima = estado.ejecuciones.find((e) => e.estado !== "en_curso") ?? estado.ejecuciones[0];
  const e = T.estado[estado.estado] ?? T.estado.sin_activar;
  const hora = horaChile(estado.horario);
  const cifras = [
    [T.cifras.vencidas, c.vencidas_guardadas, c.vencidas_guardadas > 0],
    [T.cifras.proximas, c.proximas_7_dias, false],
    [T.cifras.enRevision, c.en_revision, false],
    [T.cifras.borradas, estado.borradas_30_dias, false],
  ] as const;
  const extrasErrores = [
    estado.fallos.repetidos ? T.alertas.errores.repetidos(estado.fallos.repetidos) : "",
    estado.fallos.fotos && estado.fallos.ultimo_error ? T.alertas.errores.codigo(estado.fallos.ultimo_error) : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Seccion titulo={T.titulo} id="mantencion" className="pa-mant">
      {/* A. Estado general y acciones */}
      <div className={`tarjeta pa-mant__estado pa-mant__estado--${TONO[estado.estado] ?? "neutro"}`}>
        <div className="pa-mant__estado-principal">
          <p className="pa-mant__ojo">{T.ojo}</p>
          <p className="pa-mant__estado-titulo">
            <span className="pa-mant__punto" aria-hidden="true" />
            {e.titulo}
          </p>
          <p className="pa-mant__estado-texto">{e.texto}</p>
          <p className="microcopia">{T.plazo(estado.dias)}</p>
        </div>
        <dl className="pa-mant__estado-datos">
          <div>
            <dt>{T.frecuencia}</dt>
            <dd>
              {hora ? T.diario(hora) : T.sinHorario}
              {hora && <span className="microcopia">{T.cambioHora}</span>}
            </dd>
          </div>
          <div>
            <dt>{T.ultima}</dt>
            <dd>
              {ultima ? (
                <>
                  {fechaHora(ultima.iniciada_en)} · {T.origen[ultima.origen] ?? ultima.origen}
                  <span className={`pa-mant__resultado pa-mant__resultado--${ultima.estado}`}>{T.resultados[ultima.estado] ?? ultima.estado}</span>
                </>
              ) : (
                T.nunca
              )}
            </dd>
          </div>
        </dl>
        <div className="pa-mant__acciones">
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
          <Alerta texto={error} />
          <p role="status" className="microcopia">
            {aviso}
          </p>
        </div>
      </div>

      {/* B. Indicadores */}
      <ul className="pa-mant__cifras" aria-label={T.cifras.titulo}>
        {cifras.map(([t, n, atencion]) => (
          <li key={t.titulo} className={`tarjeta pa-mant__cifra${atencion ? " pa-mant__cifra--atencion" : ""}`}>
            <span className="pa-mant__cifra-titulo">{t.titulo}</span>
            <strong className="pa-mant__cifra-n">{n}</strong>
            <span className="microcopia">{t.nota}</span>
          </li>
        ))}
      </ul>

      <div className="pa-mant__dos">
        {/* C. Alertas y problemas */}
        <section className="tarjeta pa-mant__bloque" aria-labelledby="mantencion-alertas">
          <h3 id="mantencion-alertas" className="pa-mant__subtitulo">
            {T.alertas.titulo}
          </h3>
          <ul className="pa-mant__problemas">
            <Problema titulo={T.alertas.errores.titulo} n={estado.fallos.fotos} texto={T.alertas.errores.texto} extra={extrasErrores || undefined} />
            <Problema
              titulo={T.alertas.huerfanos.titulo}
              n={c.archivos_sin_registro}
              texto={T.alertas.huerfanos.texto(estado.horas_seguridad)}
              extra={c.archivos_recientes_sin_registro ? T.alertas.huerfanos.recientes(c.archivos_recientes_sin_registro) : undefined}
            />
            <Problema titulo={T.alertas.sinArchivo.titulo} n={c.registros_sin_archivo} texto={T.alertas.sinArchivo.texto} />
            <Problema titulo={T.alertas.interrumpidas.titulo} n={estado.interrumpidas_30_dias} texto={T.alertas.interrumpidas.texto} />
          </ul>
        </section>

        {/* D. Historial */}
        <section className="tarjeta pa-mant__bloque" aria-labelledby="mantencion-historial">
          <h3 id="mantencion-historial" className="pa-mant__subtitulo">
            {T.historial.titulo}
          </h3>
          {estado.ejecuciones.length ? (
            <table className="pa-mant__tabla">
              <thead>
                <tr>
                  <th scope="col">{T.historial.fecha}</th>
                  <th scope="col">{T.historial.resultado}</th>
                  <th scope="col">{T.historial.eliminadas}</th>
                  <th scope="col">{T.historial.errores}</th>
                </tr>
              </thead>
              <tbody>
                {estado.ejecuciones.map((x) => (
                  <tr key={x.iniciada_en}>
                    <th scope="row" data-etiqueta={T.historial.fecha}>
                      {fechaHora(x.iniciada_en)}
                      <span className="microcopia">{T.origen[x.origen] ?? x.origen}</span>
                    </th>
                    <td data-etiqueta={T.historial.resultado}>
                      <span className={`pa-mant__resultado pa-mant__resultado--${x.estado}`}>{T.resultados[x.estado] ?? x.estado}</span>
                    </td>
                    <td data-etiqueta={T.historial.eliminadas}>
                      {x.borradas}
                      {x.huerfanos_borrados > 0 && <span className="microcopia">{T.historial.huerfanos(x.huerfanos_borrados)}</span>}
                    </td>
                    <td data-etiqueta={T.historial.errores}>
                      {x.fallidas}
                      {x.error && <span className="microcopia">{T.historial.codigo(x.error)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="microcopia">{T.historial.vacio}</p>
          )}
        </section>
      </div>
    </Seccion>
  );
}
