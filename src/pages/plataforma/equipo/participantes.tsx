// Panel del coach: «Mis participantes» con la referencia de ChatGPT (21-oct-2026, 21:35 UTC).
// Filtros con contadores, búsqueda, tabla (participante y plan, progreso de la semana, próxima
// revisión, estado y «Ver»), actividad reciente y revisiones de hoy con «Iniciar».
// Todos los datos salen de la plataforma (seguimiento.ts); nada de fotos ni nombres de ejemplo.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icono, type NombreIconoApp } from "../../../components/app";
import { mayuscula, mesDe, nombreDia, numeroDia, sumarDias, type Iso } from "../../../lib/fechas";
import { datos } from "../../../lib/supabase";
import Carga from "../../vista-previa/mi-espacio/Carga";
import { conId, planDe, usePanel } from "../../vista-previa/panel/comun";
import { MIS_PARTICIPANTES as T } from "../../vista-previa/panel/textos";
import { useDatosPanel } from "./comun";
import { actividadReciente, fechaChile, horaChile, lunesEnCurso, seguimiento, type EstadoSeguimiento, type Extra, type FilaSeguimiento } from "./seguimiento";

type Filtro = "todos" | "revision" | "atencion" | "sinRegistro";

const fechaCorta = (f: Iso) => `${mayuscula(nombreDia(f).slice(0, 3))} ${numeroDia(f)} ${mesDe(f).slice(0, 3)}`;
const iniciales = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

export function MisParticipantesReal() {
  const { sb, d } = useDatosPanel();
  const [extra, setExtra] = useState<Extra | null>(null);
  const [error, setError] = useState(false);
  const desde = lunesEnCurso(d);
  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        // Acciones y registros desde el lunes en curso más antiguo (y una semana antes, para los días
        // sin registrar). Las videollamadas (C2) son opcionales: sin la migración, la hora del plan.
        const inicio = desde ?? d.hoy;
        const [o, r, w, v] = await Promise.all([
          sb.from("ocurrencias").select("id,participante_id,fecha,vigente").gte("fecha", inicio).lte("fecha", sumarDias(d.hoy, 7)).limit(5000),
          sb.from("registros").select("ocurrencia_id,participante_id,estado,creado_en").gte("creado_en", `${sumarDias(inicio, -7)}T00:00:00Z`).limit(5000),
          sb.from("registros_semanales").select("participante_id,ciclo_id,semana,enviado_en"),
          sb.from("videollamadas").select("participante_id,ciclo_id,semana,programada_para,estado"),
        ]);
        if (!vivo) return;
        setExtra({
          ocurrencias: datos(o) as Extra["ocurrencias"],
          registros: datos(r) as Extra["registros"],
          registrosSemanales: datos(w) as Extra["registrosSemanales"],
          videollamadas: v.error ? [] : ((v.data ?? []) as Extra["videollamadas"]),
        });
      } catch {
        if (vivo) setError(true);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [sb, d.hoy, desde]);
  if (error) return <Carga estado="error" />;
  if (!extra) return <Carga estado="cargando" />;
  return <MisParticipantes filas={seguimiento(d, extra)} actividad={actividadReciente(d, extra)} />;
}

const ESTADO_PASTILLA: Record<EstadoSeguimiento, string> = {
  al_dia: "pa-estado--ok",
  sin_registro: "pa-estado--aviso",
  necesita_apoyo: "pa-estado--alerta",
  preparacion: "pa-estado--neutro",
  pausa: "pa-estado--neutro",
  cerrado: "pa-estado--neutro",
};

export function MisParticipantes({ filas, actividad }: { filas: FilaSeguimiento[]; actividad: ReturnType<typeof actividadReciente> }) {
  const { R, hoy } = usePanel();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const cuentas: Record<Filtro, number> = {
    todos: filas.length,
    revision: filas.filter((f) => f.revisionEstaSemana).length,
    atencion: filas.filter((f) => f.estado === "necesita_apoyo").length,
    sinRegistro: filas.filter((f) => f.estado === "sin_registro").length,
  };
  const vistas = useMemo(() => {
    const q = busca.trim().toLocaleLowerCase("es");
    return filas
      .filter((f) => (filtro === "revision" ? f.revisionEstaSemana : filtro === "atencion" ? f.estado === "necesita_apoyo" : filtro === "sinRegistro" ? f.estado === "sin_registro" : true))
      .filter((f) => !q || f.nombre.toLocaleLowerCase("es").includes(q));
  }, [filas, filtro, busca]);
  const deHoy = filas.filter((f) => f.revisionHoy);

  return (
    <div className="pa-pantalla pa-coach">
      <header className="pa-coach__cabeza">
        <h1 className="pa-coach__h1">{T.titulo}</h1>
      </header>

      <div className="pa-coach__filtros" role="group" aria-label={T.filtros.etiqueta}>
        {(Object.keys(cuentas) as Filtro[]).map((k) => (
          <button key={k} type="button" className="pa-coach__filtro" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
            {T.filtros[k]}
            <span className={`pa-coach__cuenta${k === "atencion" && cuentas[k] ? " pa-coach__cuenta--alerta" : ""}`}>{cuentas[k]}</span>
          </button>
        ))}
      </div>

      <div className="pa-coach__buscar">
        <Icono nombre="search" tamaño={20} />
        <label className="sr-only" htmlFor="buscar-participante">
          {T.buscarEtiqueta}
        </label>
        <input id="buscar-participante" type="search" placeholder={T.buscar} value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {filas.length === 0 ? (
        <p className="pa-vacio">{T.vacio}</p>
      ) : (
        <div className="pa-coach__tabla-marco">
          <table className="pa-coach__tabla">
            <thead>
              <tr>
                <th scope="col">{T.columnas.participante}</th>
                <th scope="col">{T.columnas.progreso}</th>
                <th scope="col">{T.columnas.proxima}</th>
                <th scope="col">{T.columnas.estado}</th>
                <th scope="col">
                  <span className="sr-only">{T.columnas.ver}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {vistas.map((f) => (
                <tr key={f.id}>
                  <th scope="row" className="pa-coach__persona">
                    <span className="pa-coach__avatar" aria-hidden="true">
                      {iniciales(f.nombre)}
                    </span>
                    <span>
                      <span className="pa-coach__nombre">{f.nombre}</span>
                      <span className="pa-coach__plan">{T.plan(planDe(f.plan).nombre)}</span>
                    </span>
                  </th>
                  <td data-titulo={T.columnas.progreso}>
                    {f.programadas ? (
                      <span className="pa-coach__progreso">
                        <span className="pa-coach__barra" aria-hidden="true">
                          <span style={{ inlineSize: `${Math.round((f.hechas / f.programadas) * 100)}%` }} />
                        </span>
                        <span>{T.progreso(f.hechas, f.programadas)}</span>
                      </span>
                    ) : (
                      <span className="pa-coach__tenue">{T.sinAcciones}</span>
                    )}
                  </td>
                  <td data-titulo={T.columnas.proxima}>
                    {f.proxima ? (
                      <span className="pa-coach__fecha">
                        <Icono nombre="calendar-days" tamaño={16} />
                        <span>
                          {f.proxima === hoy ? "Hoy" : fechaCorta(f.proxima)}
                          {f.horaProxima && <span className="pa-coach__hora">{f.horaProxima}</span>}
                        </span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td data-titulo={T.columnas.estado}>
                    <span className={`pa-estado ${ESTADO_PASTILLA[f.estado]}`}>
                      {f.estado === "al_dia" && <Icono nombre="check" tamaño={16} />}
                      {T.estados[f.estado]}
                    </span>
                    {f.motivos.length > 0 && <span className="pa-coach__motivos">{f.motivos.map((m) => T.motivos[m]).join(" · ")}</span>}
                  </td>
                  <td className="pa-coach__accion">
                    <Link to={conId(R.participante, f.id)} className="boton boton--secundario boton--chico" aria-label={T.ver(f.nombre)}>
                      {T.columnas.ver}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {vistas.length === 0 && <p className="pa-vacio">{T.ninguno}</p>}
        </div>
      )}

      <div className="pa-coach__pie">
        <section className="pa-coach__bloque" aria-labelledby="coach-actividad">
          <h2 id="coach-actividad" className="pa-coach__h2">
            {T.actividad.titulo}
          </h2>
          {actividad.length ? (
            <ul className="pa-coach__lista">
              {actividad.map((a) => (
                <li key={a.id} className="pa-coach__item">
                  <span className={`pa-coach__icono pa-coach__icono--${a.tipo}`} aria-hidden="true">
                    <Icono nombre={ICONO_ACTIVIDAD[a.tipo]} tamaño={20} />
                  </span>
                  <span>
                    <Link to={conId(R.participante, a.participanteId)} className="pa-coach__texto">
                      {T.actividad[a.tipo](a.nombre)}
                    </Link>
                    <span className="pa-coach__cuando">{cuando(a.marca, hoy)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pa-vacio">{T.actividad.vacio}</p>
          )}
        </section>

        <section className="pa-coach__bloque" aria-labelledby="coach-hoy">
          <h2 id="coach-hoy" className="pa-coach__h2">
            {T.hoy.titulo}
          </h2>
          {deHoy.length ? (
            <ul className="pa-coach__lista">
              {deHoy.map((f) => (
                <li key={f.id} className="pa-coach__item pa-coach__item--hoy">
                  <span className="pa-coach__icono" aria-hidden="true">
                    <Icono nombre={f.plan === "cercano" ? "video" : "book-open"} tamaño={20} />
                  </span>
                  <span>
                    <span className="pa-coach__texto">{f.plan === "cercano" ? T.hoy.videollamada(f.nombre) : T.hoy.escrita(f.nombre)}</span>
                    <span className="pa-coach__cuando">{f.plan === "cercano" && f.horaProxima ? T.hoy.duracion(f.horaProxima) : T.hoy.porEscrito}</span>
                  </span>
                  <Link to={conId(R.revision, f.id)} className="boton boton--primario boton--chico" aria-label={T.hoy.iniciarDe(f.nombre)}>
                    {T.hoy.iniciar}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pa-vacio">{T.hoy.vacio}</p>
          )}
        </section>
      </div>
    </div>
  );
}

const ICONO_ACTIVIDAD: Record<"accion" | "registro" | "ajuste", NombreIconoApp> = { accion: "check", registro: "book-open", ajuste: "sliders-horizontal" };

function cuando(marca: string, hoy: Iso) {
  const f = fechaChile(marca);
  const h = horaChile(marca);
  if (f === hoy) return T.actividad.hoy(h);
  if (f === sumarDias(hoy, -1)) return T.actividad.ayer(h);
  return `${fechaCorta(f)}, ${h}`;
}
