// Desafíos de Comunidad: maqueta de ChatGPT (29-oct-2026) y prompt de implementación de Diego.
//   · Escritorio: portada del desafío destacado (paisaje con una persona, frase a mano), «Todos
//     los desafíos» con filtros (Todos, En curso, Próximos, Finalizados) y tres tarjetas grandes,
//     «Más desafíos» en tarjetas chicas; a la derecha Mi participación, Mis reconocimientos,
//     Actividad reciente y «¿Tienes una idea para un desafío?».
//   · Móvil: portada, filtros, desafíos, Mi participación, reconocimientos y actividad.
// Todo sale de la base (C9 y C15): participar es voluntario, el avance son los días en que la
// persona completó todas sus acciones (nadie marca días a mano), no suma créditos ni cambia rachas
// ni beneficios. De los demás solo se muestra cuántos participan, nunca quiénes; la actividad y los
// reconocimientos son solo los propios.
import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Hoja, Icono, Tostada, type NombreIconoApp } from "../../../../components/app";
import { ErrorBase } from "../../../../lib/supabase";
import { EtiquetaEjemplo, useEspacio } from "../comun";
import { fechaLargaIso } from "./contexto";
import {
  fuenteEjemploCompartida,
  fuenteReal,
  type Acceso,
  type ActividadDesafio,
  type Desafio,
  type DiaDesafio,
  type FuenteComunidad,
  type Ilustracion,
  type PropuestaDesafio,
} from "./fuente";
import { FOTO_PORTADA, PaisajeMini, PaisajePortada } from "./Paisaje";
import { Avatar } from "./Publicaciones";
import { T_COMU } from "./textos";
import "../../../../styles/vista-comunidad.css";

const T = T_COMU.pagina;
type Filtro = keyof typeof T.filtros;
const FILTROS = Object.keys(T.filtros) as Filtro[];
type Estado = "en-curso" | "proximo" | "finalizado";

// Fechas AAAA-MM-DD: hoy en Chile en la plataforma (como la base) y local en la vista previa.
const isoLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const isoChile = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
const entre = (desde: string, hasta: string) => Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86_400_000);

const estadoDe = (d: Desafio, hoy: string): Estado => (hoy < d.inicio ? "proximo" : hoy > d.fin ? "finalizado" : "en-curso");
const pct = (d: Desafio) => Math.round((Math.min(d.diasCumplidos, d.dias) / d.dias) * 100);
const ICONO_RECONOCIMIENTO: Record<Ilustracion, NombreIconoApp> = {
  montana: "footprints",
  sendero: "footprints",
  colinas: "leaf",
  brote: "sprout",
  lago: "sun",
  atardecer: "sun",
};

export default function DesafiosPagina() {
  const esp = useEspacio();
  const [params] = useSearchParams();
  // Vista previa: ?desafios=0 muestra el estado sin desafíos.
  const sinDesafios = !esp.real && params.get("desafios") === "0";
  const fuente = useMemo<FuenteComunidad>(() => {
    if (esp.real) return fuenteReal();
    const f = fuenteEjemploCompartida("abierta");
    return sinDesafios ? { ...f, desafios: async () => [], actividadDesafios: async () => [] } : f;
  }, [esp.real, sinDesafios]);
  const [acceso, setAcceso] = useState<{ estado: Acceso; alias: string | null } | null>(null);
  const [errorAcceso, setErrorAcceso] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vivo = true;
    setErrorAcceso(false);
    fuente
      .acceso()
      .then((a) => vivo && setAcceso(a))
      .catch(() => vivo && setErrorAcceso(true));
    return () => {
      vivo = false;
    };
  }, [fuente, intento]);

  return (
    <div className="me-pantalla co-comunidad de-pagina">
      <h1 className="sr-only">{T.titulo}</h1>
      {fuente.ejemplo && (
        <p className="co-ejemplo">
          <EtiquetaEjemplo />
          <span>{T_COMU.ejemplo}</span>
        </p>
      )}
      {errorAcceso && (
        <div className="co-tarjeta co-estado co-angosta" role="alert">
          <p>{T_COMU.errorGeneral}</p>
          <button type="button" className="boton boton--secundario" onClick={() => setIntento(intento + 1)}>
            {T_COMU.feed.reintentar}
          </button>
        </div>
      )}
      {!acceso && !errorAcceso && <p className="co-tarjeta co-estado co-angosta">{T_COMU.cargando}</p>}
      {/* Sin módulo, sin alias o sin reglas aceptadas: se resuelve en Comunidad y aquí no se ve nada. */}
      {acceso && acceso.estado !== "abierta" && (
        <div className="co-tarjeta co-estado co-angosta">
          <p>{T.cerrada}</p>
          <Link to={esp.R.comunidad} className="boton boton--secundario">
            {T.volverComunidad}
          </Link>
        </div>
      )}
      {acceso?.estado === "abierta" && <Desafios fuente={fuente} alias={acceso.alias ?? ""} hoy={esp.real ? isoChile() : isoLocal()} />}
    </div>
  );
}

type HojaAbierta = { tipo: "detalle"; id: string } | { tipo: "proponer" } | { tipo: "participacion" } | { tipo: "reconocimientos" } | { tipo: "actividad" } | null;

type Acciones = {
  hoy: string;
  ocupado: string | null;
  cambiar: (d: Desafio, unirme: boolean) => Promise<void>;
  detalle: (d: Desafio) => void;
  urlFoto: (ruta: string) => Promise<string | null>;
};

function Desafios({ fuente, alias, hoy }: { fuente: FuenteComunidad; alias: string; hoy: string }) {
  const { R } = useEspacio();
  const [params, setParams] = useSearchParams();
  const filtro: Filtro = (FILTROS as string[]).includes(params.get("filtro") ?? "") ? (params.get("filtro") as Filtro) : "todos";
  const [desafios, setDesafios] = useState<Desafio[] | null>(null);
  const [actividad, setActividad] = useState<ActividadDesafio[] | null>(null);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  // ?desafio=<id> abre su detalle (desde Comunidad o un enlace guardado).
  const pedido = params.get("desafio");
  const [hoja, setHoja] = useState<HojaAbierta>(pedido ? { tipo: "detalle", id: pedido } : null);

  useEffect(() => {
    let vivo = true;
    setError(false);
    Promise.all([fuente.desafios(), fuente.actividadDesafios()])
      .then(([d, a]) => {
        if (!vivo) return;
        setDesafios(d);
        setActividad(a);
      })
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
    };
  }, [fuente, version]);

  const cerrarHoja = () => {
    setHoja(null);
    if (params.has("desafio")) {
      const q = new URLSearchParams(params);
      q.delete("desafio");
      setParams(q, { replace: true });
    }
  };

  const cambiar = async (d: Desafio, unirme: boolean) => {
    setOcupado(d.id);
    try {
      if (unirme) await fuente.unirmeDesafio(d.id);
      else await fuente.salirDesafio(d.id);
      setMensaje(unirme ? (estadoDe(d, hoy) === "proximo" ? T.inscritoAviso(fechaLargaIso(d.inicio)) : T.unidoAviso) : T.salidoAviso);
      setVersion((v) => v + 1);
    } catch (e) {
      setMensaje(e instanceof ErrorBase && e.codigo === "no_disponible" ? T.noDisponible : T_COMU.errorGeneral);
    } finally {
      setOcupado(null);
    }
  };
  const acciones: Acciones = { hoy, ocupado, cambiar, detalle: (d) => setHoja({ tipo: "detalle", id: d.id }), urlFoto: fuente.urlFotoDesafio };

  const todos = desafios ?? [];
  const destacado = todos.find((d) => estadoDe(d, hoy) === "en-curso") ?? todos.find((d) => estadoDe(d, hoy) === "proximo") ?? null;
  const lista = todos.filter((d) => {
    const e = estadoDe(d, hoy);
    return filtro === "todos" || (filtro === "en-curso" && e === "en-curso") || (filtro === "proximos" && e === "proximo") || (filtro === "finalizados" && e === "finalizado");
  });
  const grandes = lista.slice(0, 3);
  const chicos = lista.slice(3);
  const mios = todos.filter((d) => d.participo);
  const logrados = todos.filter((d) => d.completado);
  const enHoja = hoja?.tipo === "detalle" ? (todos.find((d) => d.id === hoja.id) ?? null) : null;
  const tituloLista = filtro === "todos" ? T.todos : T.filtros[filtro];

  return (
    <>
      {error && (
        <div className="co-tarjeta co-estado" role="alert">
          <p>{T_COMU.errorGeneral}</p>
          <button type="button" className="boton boton--secundario" onClick={() => setVersion((v) => v + 1)}>
            {T_COMU.feed.reintentar}
          </button>
        </div>
      )}
      {!desafios && !error && <p className="co-tarjeta co-estado">{T_COMU.cargando}</p>}
      {desafios && (
        <div className="de-columnas">
          <div className="de-principal">
            {destacado ? <Portada d={destacado} acciones={acciones} continuar={R.hoy} /> : <PortadaVacia />}
            <section className="de-seccion" aria-labelledby="de-lista-t">
              <div className="de-seccion__cabeza">
                <h2 id="de-lista-t" className="de-h2">
                  {tituloLista}
                </h2>
                <nav className="de-filtros" aria-label={T.navegacion}>
                  <ul>
                    {FILTROS.map((f) => (
                      <li key={f}>
                        <Link to={f === "todos" ? "?" : `?filtro=${f}`} replace className="de-filtro" aria-current={filtro === f ? "page" : undefined}>
                          {T.filtros[f]}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
              {lista.length === 0 ? (
                <p className="co-tarjeta co-estado co-estado--vacio">{T.vacio[filtro]}</p>
              ) : (
                <ul className="de-grilla">
                  {grandes.map((d) => (
                    <Tarjeta key={d.id} d={d} acciones={acciones} continuar={R.hoy} />
                  ))}
                </ul>
              )}
            </section>
            {chicos.length > 0 && (
              <section className="de-seccion" aria-labelledby="de-mas-t">
                <h2 id="de-mas-t" className="de-h2">
                  {T.mas}
                </h2>
                <ul className="de-grilla de-grilla--chica">
                  {chicos.map((d) => (
                    <Tarjeta key={d.id} d={d} acciones={acciones} continuar={R.hoy} chica />
                  ))}
                </ul>
              </section>
            )}
          </div>
          <aside className="de-lateral" aria-label={`${T.participacion}, ${T.reconocimientos} y ${T.actividad}`}>
            <Lateral titulo={T.participacion} id="de-part-t" extra={mios.length > 2 && <VerTodos texto={T.verTodos} onClick={() => setHoja({ tipo: "participacion" })} />}>
              <Participacion desafios={mios.slice(0, 2)} hoy={hoy} acciones={acciones} />
            </Lateral>
            <Lateral
              titulo={T.reconocimientos}
              id="de-rec-t"
              icono="trophy"
              extra={logrados.length > 3 && <VerTodos texto={T.verTodos} onClick={() => setHoja({ tipo: "reconocimientos" })} />}
            >
              <Reconocimientos desafios={logrados.slice(0, 3)} />
            </Lateral>
            <Lateral
              titulo={T.actividad}
              id="de-act-t"
              extra={(actividad?.length ?? 0) > 4 && <VerTodos texto={T.verTodo} onClick={() => setHoja({ tipo: "actividad" })} />}
            >
              <Actividad filas={(actividad ?? []).slice(0, 4)} alias={alias} hoy={hoy} />
            </Lateral>
            <section className="co-tarjeta gr-proponer de-idea" aria-labelledby="de-idea-t">
              <Icono nombre="users" tamaño={24} />
              <h2 id="de-idea-t" className="gr-proponer__titulo">
                {T.idea}
              </h2>
              <p>{T.ideaTexto}</p>
              <button type="button" className="boton boton--secundario" onClick={() => setHoja({ tipo: "proponer" })}>
                <Icono nombre="plus" tamaño={20} />
                {T.proponer}
              </button>
            </section>
          </aside>
        </div>
      )}

      <Hoja abierta={!!enHoja} onCerrar={cerrarHoja} titulo={enHoja?.titulo ?? ""} className="co-hoja gr-hoja de-hoja">
        {enHoja && <Detalle d={enHoja} fuente={fuente} acciones={acciones} continuar={R.hoy} />}
      </Hoja>
      <Hoja abierta={hoja?.tipo === "participacion"} onCerrar={cerrarHoja} titulo={T.participacion} className="co-hoja gr-hoja de-hoja">
        {hoja?.tipo === "participacion" && <Participacion desafios={mios} hoy={hoy} acciones={acciones} />}
      </Hoja>
      <Hoja abierta={hoja?.tipo === "reconocimientos"} onCerrar={cerrarHoja} titulo={T.reconocimientos} className="co-hoja gr-hoja de-hoja">
        {hoja?.tipo === "reconocimientos" && <Reconocimientos desafios={logrados} />}
      </Hoja>
      <Hoja abierta={hoja?.tipo === "actividad"} onCerrar={cerrarHoja} titulo={T.actividad} className="co-hoja gr-hoja de-hoja">
        {hoja?.tipo === "actividad" && <Actividad filas={actividad ?? []} alias={alias} hoy={hoy} />}
      </Hoja>
      <Hoja abierta={hoja?.tipo === "proponer"} onCerrar={cerrarHoja} titulo={T.propuesta.titulo} className="co-hoja gr-hoja de-hoja">
        {hoja?.tipo === "proponer" && (
          <Proponer
            fuente={fuente}
            alCancelar={cerrarHoja}
            alEnviar={() => {
              cerrarHoja();
              setMensaje(T.propuesta.listo);
            }}
          />
        )}
      </Hoja>
      <Tostada mensaje={mensaje} onCerrar={() => setMensaje(null)} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Portada del desafío destacado

function Portada({ d, acciones, continuar }: { d: Desafio; acciones: Acciones; continuar: string }) {
  return (
    <section className="de-portada" aria-labelledby="de-portada-t">
      <ImagenDesafio d={d} acciones={acciones} className="de-portada__fondo" portada />
      <div className="de-portada__texto">
        <p className="de-portada__sello">{T.destacado}</p>
        <h2 id="de-portada-t" className="de-portada__h">
          {d.titulo}
        </h2>
        {d.descripcion && <p className="de-portada__desc">{d.descripcion}</p>}
        <Datos d={d} hoy={acciones.hoy} clase="de-portada__datos" />
        <div className="de-portada__botones">
          <Accion d={d} acciones={acciones} continuar={continuar} larga clase="de-portada__accion" />
          <button type="button" className="de-portada__ver" onClick={() => acciones.detalle(d)} aria-describedby="de-portada-t">
            {T.verDetalles}
            <Icono nombre="arrow-right" tamaño={20} />
          </button>
        </div>
      </div>
      <p className="de-portada__mano mano" aria-hidden="true">
        {T.mano}
      </p>
    </section>
  );
}

// Foto del desafío (C16) cuando el equipo la cargó; si no hay o no carga, la ilustración de siempre.
function ImagenDesafio({ d, acciones, className, portada }: { d: Desafio; acciones: Acciones; className?: string; portada?: boolean }) {
  const { urlFoto } = acciones;
  const [url, setUrl] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  useEffect(() => {
    setUrl(null);
    setFallo(false);
    if (!d.foto) return;
    let vivo = true;
    void urlFoto(d.foto).then((u) => vivo && setUrl(u));
    return () => {
      vivo = false;
    };
  }, [d.foto, urlFoto]);
  if (url && !fallo)
    return (
      <img
        className={className ? `${className} de-foto` : "de-foto"}
        src={url}
        alt=""
        loading={portada ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFallo(true)}
      />
    );
  if (portada) return FOTO_PORTADA ? <img className={className} src={FOTO_PORTADA} alt="" /> : <PaisajePortada className={className} />;
  return <PaisajeMini nombre={d.ilustracion ?? "sendero"} className={className} />;
}

function PortadaVacia() {
  return (
    <section className="de-portada de-portada--vacia" aria-labelledby="de-portada-t">
      {FOTO_PORTADA ? <img className="de-portada__fondo" src={FOTO_PORTADA} alt="" /> : <PaisajePortada className="de-portada__fondo" />}
      <div className="de-portada__texto">
        <h2 id="de-portada-t" className="de-portada__h">
          {T.titulo}
        </h2>
        <p className="de-portada__desc">{T.vacio.todos}</p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tarjetas

function Datos({ d, hoy, clase }: { d: Desafio; hoy: string; clase?: string }) {
  const e = estadoDe(d, hoy);
  const tiempo =
    e === "proximo" ? T.comienza(entre(hoy, d.inicio)) : e === "finalizado" ? T.termino(fechaLargaIso(d.fin)) : entre(hoy, d.fin) === 0 ? T.ultimoDia : T.quedan(entre(hoy, d.fin));
  return (
    <ul className={`de-datos${clase ? ` ${clase}` : ""}`}>
      <li>
        <Icono nombre="users" tamaño={16} />
        {T_COMU.desafios.participantes(d.participantes)}
      </li>
      <li>
        <Icono nombre="calendar-days" tamaño={16} />
        {tiempo}
      </li>
    </ul>
  );
}

// La acción de cada desafío según su estado y si participas:
//   en curso → «Unirme» o «Continuar» (lleva a Mi Rumbo: el avance sale de tus acciones del día);
//   próximo → «Inscribirme» o «Ya estás inscrito»; finalizado → «Completado» o solo los detalles.
function Accion({ d, acciones, continuar, larga, clase = "" }: { d: Desafio; acciones: Acciones; continuar: string; larga?: boolean; clase?: string }) {
  const e = estadoDe(d, acciones.hoy);
  const nombre = (t: string) => (larga ? undefined : `${t}: ${d.titulo}`);
  if (e === "finalizado")
    return d.completado ? (
      <span className={`de-chip de-chip--logro ${clase}`}>
        <Icono nombre="award" tamaño={16} />
        {T.completado}
      </span>
    ) : null;
  if (d.participo)
    return e === "en-curso" ? (
      <Link to={continuar} className={`boton boton--primario de-accion ${clase}`} aria-label={nombre(T.continuar)}>
        {T.continuar}
      </Link>
    ) : (
      <span className={`de-chip ${clase}`}>
        <Icono nombre="check" tamaño={16} />
        {T.inscrito}
      </span>
    );
  const texto = e === "proximo" ? T.inscribirme : larga ? T.unirme : T.unirmeCorto;
  return (
    <button
      type="button"
      className={`boton ${larga ? "boton--primario" : e === "proximo" ? "boton--secundario" : "boton--primario"} de-accion ${clase}`}
      disabled={acciones.ocupado === d.id}
      onClick={() => void acciones.cambiar(d, true)}
      aria-label={nombre(texto)}
    >
      {texto}
    </button>
  );
}

function Tarjeta({ d, acciones, continuar, chica }: { d: Desafio; acciones: Acciones; continuar: string; chica?: boolean }) {
  const e = estadoDe(d, acciones.hoy);
  const id = `de-t-${d.id}`;
  return (
    <li className={`co-tarjeta de-tarjeta${chica ? " de-tarjeta--chica" : ""}`}>
      <div className="de-tarjeta__img">
        <ImagenDesafio d={d} acciones={acciones} />
        {!chica && <span className={`de-sello de-sello--${e}`}>{T.estados[e]}</span>}
      </div>
      <div className="de-tarjeta__texto">
        <h3 id={id} className="de-tarjeta__nombre">
          <button type="button" className="gr-enlace" onClick={() => acciones.detalle(d)}>
            {d.titulo}
          </button>
        </h3>
        {d.descripcion && <p className="de-tarjeta__desc">{d.descripcion}</p>}
        <Datos d={d} hoy={acciones.hoy} />
        {!chica && d.participo && e !== "proximo" && <Progreso d={d} />}
      </div>
      <div className="de-tarjeta__botones">
        <Accion d={d} acciones={acciones} continuar={continuar} />
        {!chica && (
          <button type="button" className="de-ver" onClick={() => acciones.detalle(d)} aria-label={`${T.verDetalles}: ${d.titulo}`}>
            {T.verDetalles}
          </button>
        )}
      </div>
    </li>
  );
}

function Progreso({ d, etiqueta = true }: { d: Desafio; etiqueta?: boolean }) {
  return (
    <div className="de-progreso">
      {etiqueta && (
        <p className="de-progreso__fila">
          <span>{T.tuProgreso}</span>
          <span>{T.progresoDias(d.diasCumplidos, d.dias)}</span>
        </p>
      )}
      <div
        className="de-progreso__pista"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={d.dias}
        aria-valuenow={Math.min(d.diasCumplidos, d.dias)}
        aria-valuetext={T_COMU.desafios.avance(d.diasCumplidos, d.dias)}
        aria-label={`${T.tuProgreso}: ${d.titulo}`}
      >
        <span className="de-progreso__relleno" style={{ inlineSize: `${pct(d)}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Columna derecha

function Lateral({ titulo, id, icono, extra, children }: { titulo: string; id: string; icono?: NombreIconoApp; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="co-tarjeta co-lateral de-lateral__tarjeta" aria-labelledby={id}>
      <div className="gr-lateral__cabeza de-lateral__cabeza">
        <h2 id={id} className="de-lateral__titulo">
          {icono && <Icono nombre={icono} tamaño={20} />}
          {titulo}
        </h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

function VerTodos({ texto, onClick }: { texto: string; onClick: () => void }) {
  return (
    <button type="button" className="de-vertodos" onClick={onClick}>
      {texto}
    </button>
  );
}

function Participacion({ desafios, hoy, acciones }: { desafios: Desafio[]; hoy: string; acciones: Acciones }) {
  if (!desafios.length) return <p className="co-lateral__vacio">{T.sinParticipacion}</p>;
  return (
    <ul className="de-mias">
      {desafios.map((d) => {
        const e = estadoDe(d, hoy);
        const linea =
          e === "en-curso"
            ? T.filaEnCurso(d.diasTranscurridos, d.dias)
            : e === "proximo"
              ? T.filaProximo(fechaLargaIso(d.inicio))
              : d.completado
                ? T.filaCompletado
                : T.filaFinalizado;
        return (
          <li key={d.id} className="de-mia">
            <ImagenDesafio d={d} acciones={acciones} className="de-mia__img" />
            <div className="de-mia__texto">
              <button type="button" className="gr-enlace de-mia__nombre" onClick={() => acciones.detalle(d)}>
                {d.titulo}
              </button>
              <p className={`de-mia__estado${d.completado ? " de-mia__estado--logro" : ""}`}>{linea}</p>
              {e !== "proximo" && (
                <div className="de-mia__barra">
                  <Progreso d={d} etiqueta={false} />
                  <span aria-hidden="true">{pct(d)}%</span>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Reconocimientos realmente obtenidos: un desafío completado día a día (lo calcula la base).
function Reconocimientos({ desafios }: { desafios: Desafio[] }) {
  if (!desafios.length) return <p className="co-lateral__vacio">{T.sinReconocimientos}</p>;
  return (
    <ul className="de-medallas">
      {desafios.map((d) => (
        <li key={d.id} className="de-medalla">
          <span className="de-medalla__circulo" aria-hidden="true">
            <Icono nombre={ICONO_RECONOCIMIENTO[d.ilustracion ?? "sendero"]} tamaño={24} />
          </span>
          <span className="de-medalla__nombre">
            <span className="sr-only">{T.reconocimiento(d.titulo)}</span>
            <span aria-hidden="true">{d.titulo}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function cuando(fecha: string, hoy: string) {
  const n = entre(fecha, hoy);
  return n <= 0 ? T.hoy : n === 1 ? T.ayer : n < 30 ? T.haceDias(n) : fechaLargaIso(fecha);
}

// Solo la actividad propia: de los demás se muestra cuántos participan, nunca quiénes (regla de C9).
function Actividad({ filas, alias, hoy }: { filas: ActividadDesafio[]; alias: string; hoy: string }) {
  return (
    <>
      {filas.length ? (
        <ul className="de-actividad">
          {filas.map((a) => (
            <li key={`${a.tipo}-${a.desafioId}-${a.fecha}-${a.dia ?? 0}`} className="de-actividad__fila">
              {alias ? <Avatar alias={alias} /> : <span className="co-avatar" aria-hidden="true" />}
              <span className="de-actividad__texto">
                <span>{a.tipo === "unido" ? T.unido(a.titulo) : a.tipo === "completado" ? T.completo(a.titulo) : T.dia(a.dia ?? 0, a.titulo)}</span>
                <span className="de-actividad__cuando">{cuando(a.fecha, hoy)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="co-lateral__vacio">{T.sinActividad}</p>
      )}
      <p className="gr-regla">{T.actividadAyuda}</p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Detalle: reglas, fechas, participación y mi avance día a día

function Detalle({ d, fuente, acciones, continuar }: { d: Desafio; fuente: FuenteComunidad; acciones: Acciones; continuar: string }) {
  const navegar = useNavigate();
  const { R } = useEspacio();
  const e = estadoDe(d, acciones.hoy);
  const [dias, setDias] = useState<DiaDesafio[] | null>(null);
  useEffect(() => {
    let vivo = true;
    if (!d.participo || e === "proximo") {
      setDias(null);
      return;
    }
    fuente
      .avance(d.id)
      .then((x) => vivo && setDias(x))
      .catch(() => vivo && setDias([]));
    return () => {
      vivo = false;
    };
  }, [fuente, d.id, d.participo, e]);

  return (
    <div className="gr-detalle de-detalle">
      <div className="de-detalle__img">
        <ImagenDesafio d={d} acciones={acciones} />
        <span className={`de-sello de-sello--${e}`}>{T.estados[e]}</span>
      </div>
      <p className="de-detalle__fechas">{T.fechas(fechaLargaIso(d.inicio), fechaLargaIso(d.fin), d.dias)}</p>
      {d.descripcion && (
        <div className="de-detalle__parte">
          <h3 className="co-h3">{T_COMU.desafios.objetivo}</h3>
          <p>{d.descripcion}</p>
        </div>
      )}
      <div className="de-detalle__parte">
        <h3 className="co-h3">{T_COMU.desafios.reglas}</h3>
        <p>{d.reglas}</p>
        <p className="co-form__nota">{T_COMU.desafios.noSuma}</p>
      </div>
      <dl className="gr-detalle__datos">
        <div>
          <dt>{T.participantesTitulo}</dt>
          <dd>{d.participantes}</dd>
        </div>
        <div>
          <dt>{T.duracion}</dt>
          <dd>{T_COMU.desafios.dias(d.dias)}</dd>
        </div>
        <div>
          <dt>{T.estado}</dt>
          <dd>{T.estados[e]}</dd>
        </div>
      </dl>
      {d.participo && e !== "proximo" && (
        <div className="de-detalle__parte">
          <Progreso d={d} />
          {e === "en-curso" && <p className="co-form__nota">{T.comoAvanzar}</p>}
          {dias && dias.length > 0 && (
            <>
              <h3 className="co-h3">{T_COMU.desafios.miAvance}</h3>
              <ol className="co-dias">
                {dias.map((x, i) => (
                  <li key={x.fecha} className={x.cumplido ? "co-dia co-dia--hecho" : "co-dia"}>
                    {x.cumplido ? <Icono nombre="check" tamaño={12} /> : <span aria-hidden="true">{i + 1}</span>}
                    <span className="sr-only">
                      {fechaLargaIso(x.fecha)}: {x.cumplido ? T_COMU.desafios.cumplido : T_COMU.desafios.noCumplido}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
      {d.completado && (
        <div className="co-celebra" role="status">
          <Icono nombre="award" />
          <div>
            <p className="co-celebra__titulo">{T_COMU.desafios.celebracion}</p>
            <p>{T_COMU.desafios.celebracionTexto}</p>
          </div>
          <button
            type="button"
            className="boton boton--primario"
            onClick={() => navegar(`${R.comunidadCrear}?tipo=logro`, { state: { texto: `Completé el desafío «${d.titulo}». ` } })}
          >
            {T_COMU.desafios.compartir}
          </button>
        </div>
      )}
      {e !== "finalizado" && (
        <div className="co-form__botones">
          {d.participo ? (
            <>
              {e === "en-curso" && (
                <Link to={continuar} className="boton boton--primario">
                  {T.continuar}
                </Link>
              )}
              <button type="button" className="boton boton--secundario" disabled={acciones.ocupado === d.id} onClick={() => void acciones.cambiar(d, false)}>
                {e === "proximo" ? T.cancelar : T.salir}
              </button>
            </>
          ) : (
            <button type="button" className="boton boton--primario" disabled={acciones.ocupado === d.id} onClick={() => void acciones.cambiar(d, true)}>
              {e === "proximo" ? T.inscribirme : T.unirme}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Proponer un desafío (llega al panel del equipo con el alias)

function Proponer({ fuente, alEnviar, alCancelar }: { fuente: FuenteComunidad; alEnviar: () => void; alCancelar: () => void }) {
  const P = T.propuesta;
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mias, setMias] = useState<PropuestaDesafio[]>([]);
  const ids = { titulo: useId(), ayuda: useId(), desc: useId(), error: useId() };

  useEffect(() => {
    let vivo = true;
    fuente
      .misPropuestasDesafio()
      .then((p) => vivo && setMias(p))
      .catch(() => vivo && setMias([]));
    return () => {
      vivo = false;
    };
  }, [fuente]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const t = titulo.trim();
    if (t.length < 3 || t.length > 80) return setError(P.errores.largo);
    if (descripcion.trim().length > 300) return setError(P.errores.descripcion);
    setEnviando(true);
    setError(null);
    try {
      await fuente.proponerDesafio(t, descripcion.trim() || null);
      alEnviar();
    } catch (err) {
      const c = err instanceof ErrorBase ? `${err.campo}:${err.codigo}` : "";
      setError(
        c === "propuestas:demasiadas" ? P.errores.demasiadas : c === "titulo:largo" ? P.errores.largo : c === "descripcion:largo" ? P.errores.descripcion : T_COMU.errorGeneral,
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="co-form" onSubmit={enviar} noValidate>
      <p>{P.texto}</p>
      <div className="co-form__grupo">
        <label htmlFor={ids.titulo} className="co-form__etiqueta">
          {P.nombre}
        </label>
        <input
          id={ids.titulo}
          className="co-form__campo gr-campo"
          maxLength={80}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          aria-describedby={error ? `${ids.ayuda} ${ids.error}` : ids.ayuda}
          aria-invalid={error === P.errores.largo ? true : undefined}
        />
        <span id={ids.ayuda} className="co-form__nota">
          {P.nombreAyuda}
        </span>
      </div>
      <div className="co-form__grupo">
        <label htmlFor={ids.desc} className="co-form__etiqueta">
          {P.descripcion}
        </label>
        <textarea id={ids.desc} className="co-form__area" rows={3} maxLength={300} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>
      <p className="co-form__nota">{P.nota}</p>
      {error && (
        <p className="co-form__error" role="alert" id={ids.error}>
          {error}
        </p>
      )}
      <div className="co-form__botones">
        <button type="submit" className="boton boton--primario" disabled={enviando}>
          {P.enviar}
        </button>
        <button type="button" className="boton boton--secundario" onClick={alCancelar}>
          {P.cancelar}
        </button>
      </div>
      {mias.length > 0 && (
        <section className="gr-mias" aria-labelledby="de-mias-t">
          <h3 id="de-mias-t" className="co-h3">
            {P.tuyas}
          </h3>
          <ul>
            {mias.map((p) => (
              <li key={p.id}>
                <span>{p.titulo}</span>
                <span className="gr-mias__estado">{P.estados[p.estado] ?? p.estado}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </form>
  );
}
