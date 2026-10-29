// Grupos de la comunidad: maqueta de ChatGPT (22-oct-2026) y prompt de implementación de Diego.
//   · Escritorio: portada con título, bajada y la frase a mano; pestañas (Todos, Mis grupos,
//     Grupos sugeridos y Proponer un grupo) con el buscador a la derecha; grupo destacado;
//     «Todos los grupos» en grilla de 4 con orden; a la derecha Mis grupos, Grupos sugeridos para
//     ti y «¿No encuentras un grupo?».
//   · Móvil: portada compacta, pestañas, buscador, destacado y la lista vertical.
// Todo sale de la base (comunidad_grupos, C13): miembros y publicaciones visibles reales, el
// destacado lo elige el equipo y la sugerencia es una regla simple (las áreas de tus metas).
// Unirse, salir y proponer los valida la base; lo de un grupo lo ven solo sus miembros.
import { useCallback, useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Hoja, Icono, Tostada } from "../../../../components/app";
import { ErrorBase } from "../../../../lib/supabase";
import { EtiquetaEjemplo, useEspacio } from "../comun";
import { fuenteEjemploCompartida, fuenteReal, type Acceso, type FuenteComunidad, type Grupo, type PropuestaGrupo } from "./fuente";
import { FOTO_PORTADA, PaisajeMini, PaisajePortada } from "./Paisaje";
import { T_COMU } from "./textos";
import "../../../../styles/vista-comunidad.css";

const T = T_COMU.explorador;
type Vista = "todos" | "mios" | "sugeridos";
const VISTAS: Vista[] = ["todos", "mios", "sugeridos"];
type Orden = keyof typeof T.ordenes;

// Sin mayúsculas ni tildes: «organizacion» encuentra «Organización».
const normal = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export default function GruposPagina() {
  const esp = useEspacio();
  // Vista previa: ?grupos=0 muestra el estado sin grupos.
  const [params] = useSearchParams();
  const sinGrupos = !esp.real && params.get("grupos") === "0";
  const fuente = useMemo<FuenteComunidad>(() => {
    if (esp.real) return fuenteReal();
    const f = fuenteEjemploCompartida("abierta");
    return sinGrupos ? { ...f, grupos: async () => [] } : f;
  }, [esp.real, sinGrupos]);
  const [acceso, setAcceso] = useState<Acceso | null>(null);
  const [errorAcceso, setErrorAcceso] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vivo = true;
    setErrorAcceso(false);
    fuente
      .acceso()
      .then((a) => vivo && setAcceso(a.estado))
      .catch(() => vivo && setErrorAcceso(true));
    return () => {
      vivo = false;
    };
  }, [fuente, intento]);

  return (
    <div className="me-pantalla co-comunidad gr-pagina">
      <header className="co-portada gr-portada">
        {FOTO_PORTADA ? <img className="co-portada__fondo" src={FOTO_PORTADA} alt="" /> : <PaisajePortada className="co-portada__fondo" />}
        <div className="co-portada__texto">
          <h1 className="co-portada__h1">{T.titulo}</h1>
          <p className="co-portada__bajada">{T.bajada}</p>
        </div>
        <p className="co-portada__mano mano" aria-hidden="true">
          {T.mano}
        </p>
      </header>
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
      {/* Sin módulo, sin alias o sin reglas aceptadas: se resuelve en Comunidad, y aquí no se ve ningún grupo. */}
      {acceso && acceso !== "abierta" && (
        <div className="co-tarjeta co-estado co-angosta">
          <p>{T.cerrada}</p>
          <Link to={esp.R.comunidad} className="boton boton--secundario">
            {T.volverComunidad}
          </Link>
        </div>
      )}
      {acceso === "abierta" && <Explorador fuente={fuente} />}
    </div>
  );
}

type HojaAbierta = { tipo: "detalle"; id: string } | { tipo: "proponer" } | null;

function Explorador({ fuente }: { fuente: FuenteComunidad }) {
  const { R } = useEspacio();
  const [params] = useSearchParams();
  const vista: Vista = (VISTAS as string[]).includes(params.get("vista") ?? "") ? (params.get("vista") as Vista) : "todos";
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);
  const [consulta, setConsulta] = useState("");
  const [orden, setOrden] = useState<Orden>("recientes");
  const [hoja, setHoja] = useState<HojaAbierta>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const idBuscar = useId();
  const idOrden = useId();

  useEffect(() => {
    let vivo = true;
    setError(false);
    fuente
      .grupos()
      .then((g) => vivo && setGrupos(g))
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
    };
  }, [fuente, version]);

  const entrar = useCallback((g: Grupo) => `${R.comunidad}?vista=grupos&grupo=${encodeURIComponent(g.id)}`, [R.comunidad]);
  const cambiar = async (g: Grupo, unirme: boolean) => {
    setOcupado(g.id);
    try {
      if (unirme) await fuente.unirmeGrupo(g.id);
      else await fuente.salirGrupo(g.id);
      setMensaje(unirme ? T_COMU.grupos.unido(g.nombre) : T_COMU.grupos.salido(g.nombre));
      setVersion((v) => v + 1);
    } catch {
      setMensaje(T_COMU.errorGeneral);
    } finally {
      setOcupado(null);
    }
  };
  const acciones: Acciones = { entrar, cambiar, ocupado, detalle: (g) => setHoja({ tipo: "detalle", id: g.id }) };

  const todos = grupos ?? [];
  const destacado = todos.find((g) => g.destacado) ?? null;
  const q = normal(consulta);
  const buscando = q.length > 0;
  const lista = useMemo(() => {
    const base = todos.filter((g) => (vista === "mios" ? g.soyMiembro : vista === "sugeridos" ? g.sugerido : true));
    const filtrada = buscando ? base.filter((g) => normal(`${g.nombre} ${g.descripcion ?? ""}`).includes(q)) : base;
    const sinDestacado = vista === "todos" && !buscando && destacado ? filtrada.filter((g) => g.id !== destacado.id) : filtrada;
    return [...sinDestacado].sort((a, b) =>
      orden === "miembros"
        ? b.miembros - a.miembros || a.nombre.localeCompare(b.nombre, "es")
        : orden === "nombre"
          ? a.nombre.localeCompare(b.nombre, "es")
          : (b.creadoEn ?? "").localeCompare(a.creadoEn ?? "") || a.nombre.localeCompare(b.nombre, "es"),
    );
  }, [todos, vista, q, buscando, destacado, orden]);

  const tituloLista = vista === "mios" ? T.pestanas.mios : vista === "sugeridos" ? T.pestanas.sugeridos : T.todos;
  const vacio = vista === "mios" ? T.sinMios : vista === "sugeridos" ? T.sinSugeridos : T.sinGrupos;
  const enHoja = hoja?.tipo === "detalle" ? (todos.find((g) => g.id === hoja.id) ?? null) : null;

  return (
    <>
      <div className="gr-barra">
        <nav className="co-pestanas gr-pestanas" aria-label={T.navegacion}>
          <ul>
            {(
              [
                ["todos", T.pestanas.todos, T.pestanas.todosCorta],
                ["mios", T.pestanas.mios, null],
                ["sugeridos", T.pestanas.sugeridos, T.pestanas.sugeridosCorta],
              ] as [Vista, string, string | null][]
            ).map(([v, texto, corta]) => (
              <li key={v}>
                <Link to={v === "todos" ? "?" : `?vista=${v}`} className="co-pestana" aria-current={vista === v ? "page" : undefined}>
                  {corta ? (
                    <>
                      <span className="co-pestana__larga">{texto}</span>
                      <span className="co-pestana__corta" aria-hidden="true">
                        {corta}
                      </span>
                    </>
                  ) : (
                    texto
                  )}
                </Link>
              </li>
            ))}
            <li>
              <button type="button" className="co-pestana gr-pestana-proponer" onClick={() => setHoja({ tipo: "proponer" })}>
                <span className="co-pestana__larga">{T.proponer}</span>
                <span className="co-pestana__corta" aria-hidden="true">
                  {T.proponerCorta}
                </span>
              </button>
            </li>
          </ul>
        </nav>
        <div className="gr-buscar" role="search">
          <label htmlFor={idBuscar} className="sr-only">
            {T.buscarEtiqueta}
          </label>
          <Icono nombre="search" tamaño={20} />
          <input id={idBuscar} type="search" className="gr-buscar__campo" placeholder={T.buscar} value={consulta} onChange={(e) => setConsulta(e.target.value)} autoComplete="off" />
        </div>
      </div>

      <div className="gr-columnas">
        <div className="gr-principal">
          {error && (
            <div className="co-tarjeta co-estado" role="alert">
              <p>{T_COMU.errorGeneral}</p>
              <button type="button" className="boton boton--secundario" onClick={() => setVersion((v) => v + 1)}>
                {T_COMU.feed.reintentar}
              </button>
            </div>
          )}
          {!grupos && !error && <p className="co-tarjeta co-estado">{T_COMU.cargando}</p>}
          {grupos && vista === "todos" && !buscando && destacado && <Destacado g={destacado} acciones={acciones} />}
          {grupos && (
            <section className="gr-seccion" aria-labelledby="gr-lista-t">
              <div className="gr-seccion__cabeza">
                <h2 id="gr-lista-t" className="co-h2 gr-h2">
                  {tituloLista}
                </h2>
                <label htmlFor={idOrden} className="sr-only">
                  {T.orden}
                </label>
                <select id={idOrden} className="gr-orden" value={orden} onChange={(e) => setOrden(e.target.value as Orden)}>
                  {(Object.keys(T.ordenes) as Orden[]).map((o) => (
                    <option key={o} value={o}>
                      {T.ordenes[o]}
                    </option>
                  ))}
                </select>
              </div>
              {vista === "sugeridos" && <p className="co-bajada">{T.reglaSugeridos}</p>}
              <p className="sr-only" aria-live="polite">
                {buscando ? T.resultados(lista.length) : ""}
              </p>
              {lista.length === 0 ? (
                buscando ? (
                  <div className="co-tarjeta co-estado co-estado--vacio">
                    <p>{T.sinResultados(consulta.trim())}</p>
                    <button type="button" className="boton boton--secundario" onClick={() => setConsulta("")}>
                      {T.limpiar}
                    </button>
                  </div>
                ) : vista === "todos" && destacado ? null : vista === "todos" && todos.length === 0 ? (
                  <div className="co-tarjeta gr-vacio">
                    <Icono nombre="users" tamaño={24} />
                    <h3 className="gr-vacio__titulo">{T.vacio.titulo}</h3>
                    <p>{T.vacio.texto}</p>
                    <button type="button" className="boton boton--primario" onClick={() => setHoja({ tipo: "proponer" })}>
                      <Icono nombre="plus" tamaño={20} />
                      {T.proponer}
                    </button>
                  </div>
                ) : (
                  <p className="co-tarjeta co-estado co-estado--vacio">{vacio}</p>
                )
              ) : (
                <ul className="gr-grilla">
                  {lista.map((g) => (
                    <TarjetaGrupo key={g.id} g={g} acciones={acciones} />
                  ))}
                </ul>
              )}
            </section>
          )}
          <NoEncuentras alProponer={() => setHoja({ tipo: "proponer" })} clase="gr-solo-movil" />
        </div>
        <aside className="gr-lateral" aria-label={`${T.misGrupos} y ${T.sugeridosTitulo}`}>
          <Lateral titulo={T.misGrupos} id="gr-mios-t" extra={<Link to="?vista=mios">{T.verTodos}</Link>}>
            {grupos && (
              <FilasGrupos grupos={todos.filter((g) => g.soyMiembro).slice(0, 3)} vacio={T.sinMios} fila={(g) => <FilaMia g={g} a={entrar(g)} />} />
            )}
          </Lateral>
          <Lateral titulo={T.sugeridosTitulo} id="gr-sug-t">
            {grupos && (
              <FilasGrupos
                grupos={todos.filter((g) => g.sugerido).slice(0, 3)}
                vacio={T.sinSugeridos}
                fila={(g) => <FilaSugerida g={g} acciones={acciones} />}
              />
            )}
            <p className="gr-regla">{T.reglaSugeridos}</p>
          </Lateral>
          <NoEncuentras alProponer={() => setHoja({ tipo: "proponer" })} />
        </aside>
      </div>

      <Hoja abierta={!!enHoja} onCerrar={() => setHoja(null)} titulo={enHoja?.nombre ?? ""} className="co-hoja gr-hoja">
        {enHoja && <Detalle g={enHoja} acciones={acciones} />}
      </Hoja>
      <Hoja abierta={hoja?.tipo === "proponer"} onCerrar={() => setHoja(null)} titulo={T.propuesta.titulo} className="co-hoja gr-hoja">
        {hoja?.tipo === "proponer" && (
          <Proponer
            fuente={fuente}
            alCancelar={() => setHoja(null)}
            alEnviar={() => {
              setHoja(null);
              setMensaje(T.propuesta.listo);
            }}
          />
        )}
      </Hoja>
      <Tostada mensaje={mensaje} onCerrar={() => setMensaje(null)} />
    </>
  );
}

type Acciones = {
  entrar: (g: Grupo) => string;
  cambiar: (g: Grupo, unirme: boolean) => Promise<void>;
  ocupado: string | null;
  detalle: (g: Grupo) => void;
};

function Datos({ g }: { g: Grupo }) {
  return (
    <ul className="gr-datos">
      <li>
        <Icono nombre="users" tamaño={16} />
        {T_COMU.grupos.miembros(g.miembros)}
      </li>
      <li>
        <Icono nombre="file-text" tamaño={16} />
        {T_COMU.grupos.publicaciones(g.publicaciones)}
      </li>
    </ul>
  );
}

// Miembro: «Entrar» lleva a las publicaciones del grupo. Si no: «Unirse», que valida la base.
function Accion({ g, acciones, larga, clase = "boton--secundario" }: { g: Grupo; acciones: Acciones; larga?: boolean; clase?: string }) {
  return g.soyMiembro ? (
    <Link to={acciones.entrar(g)} className={`boton ${clase} gr-accion`} aria-label={larga ? undefined : `${T.entrar}: ${g.nombre}`}>
      {larga ? T.entrarGrupo : T.entrar}
    </Link>
  ) : (
    <button
      type="button"
      className={`boton ${clase} gr-accion`}
      disabled={acciones.ocupado === g.id}
      onClick={() => void acciones.cambiar(g, true)}
      aria-label={larga ? undefined : `${T.unirseCorto}: ${g.nombre}`}
    >
      {larga ? T.unirse : T.unirseCorto}
    </button>
  );
}

function Destacado({ g, acciones }: { g: Grupo; acciones: Acciones }) {
  return (
    <section className="co-tarjeta gr-destacado" aria-labelledby="gr-destacado-t">
      <div className="gr-destacado__texto">
        <p className="gr-sello">{T.destacado}</p>
        <h2 id="gr-destacado-t" className="gr-destacado__nombre">
          {g.nombre}
        </h2>
        {g.descripcion && <p className="gr-destacado__desc">{g.descripcion}</p>}
        <Datos g={g} />
        <div className="gr-destacado__botones">
          <Accion g={g} acciones={acciones} larga clase="boton--primario" />
          <button type="button" className="boton boton--terciario" onClick={() => acciones.detalle(g)} aria-describedby="gr-destacado-t">
            {T.verDetalles}
          </button>
        </div>
      </div>
      <PaisajeMini nombre={g.ilustracion} className="gr-destacado__img" />
    </section>
  );
}

function TarjetaGrupo({ g, acciones }: { g: Grupo; acciones: Acciones }) {
  return (
    <li className="co-tarjeta gr-tarjeta">
      <PaisajeMini nombre={g.ilustracion} className="gr-tarjeta__img" />
      <div className="gr-tarjeta__texto">
        <h3 className="gr-tarjeta__nombre">
          <button type="button" className="gr-enlace" onClick={() => acciones.detalle(g)}>
            {g.nombre}
          </button>
        </h3>
        {g.descripcion && <p className="gr-tarjeta__desc">{g.descripcion}</p>}
        <Datos g={g} />
      </div>
      <Accion g={g} acciones={acciones} />
    </li>
  );
}

function Lateral({ titulo, id, extra, children }: { titulo: string; id: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="co-tarjeta co-lateral gr-lateral__tarjeta" aria-labelledby={id}>
      <div className="gr-lateral__cabeza">
        <h2 id={id} className="co-lateral__titulo">
          {titulo}
        </h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

function FilasGrupos({ grupos, vacio, fila }: { grupos: Grupo[]; vacio: string; fila: (g: Grupo) => ReactNode }) {
  if (!grupos.length) return <p className="co-lateral__vacio">{vacio}</p>;
  return (
    <ul className="co-grupos-lista">
      {grupos.map((g) => (
        <li key={g.id}>{fila(g)}</li>
      ))}
    </ul>
  );
}

function FilaMia({ g, a }: { g: Grupo; a: string }) {
  return (
    <Link to={a} className="co-grupo-fila gr-fila">
      <PaisajeMini nombre={g.ilustracion} className="co-grupo-fila__img gr-fila__img" />
      <span className="co-grupo-fila__texto">
        <span className="co-grupo-fila__nombre">{g.nombre}</span>
        <span className="co-grupo-fila__dato">{T_COMU.grupos.miembros(g.miembros)}</span>
      </span>
      <Icono nombre="chevron-right" tamaño={20} />
    </Link>
  );
}

function FilaSugerida({ g, acciones }: { g: Grupo; acciones: Acciones }) {
  return (
    <div className="co-grupo-fila gr-fila">
      <PaisajeMini nombre={g.ilustracion} className="co-grupo-fila__img gr-fila__img" />
      <span className="co-grupo-fila__texto">
        <button type="button" className="gr-enlace co-grupo-fila__nombre" onClick={() => acciones.detalle(g)}>
          {g.nombre}
        </button>
        <span className="co-grupo-fila__dato">{T_COMU.grupos.miembros(g.miembros)}</span>
      </span>
      <Accion g={g} acciones={acciones} />
    </div>
  );
}

function NoEncuentras({ alProponer, clase = "" }: { alProponer: () => void; clase?: string }) {
  return (
    <section className={`co-tarjeta gr-proponer ${clase}`} aria-labelledby={`gr-noenc-${clase || "lat"}`}>
      <Icono nombre="users" tamaño={24} />
      <h2 id={`gr-noenc-${clase || "lat"}`} className="gr-proponer__titulo">
        {T.noEncuentras}
      </h2>
      <p>{T.noEncuentrasTexto}</p>
      <button type="button" className="boton boton--secundario" onClick={alProponer}>
        <Icono nombre="plus" tamaño={20} />
        {T.proponer}
      </button>
    </section>
  );
}

function Detalle({ g, acciones }: { g: Grupo; acciones: Acciones }) {
  return (
    <div className="gr-detalle">
      <PaisajeMini nombre={g.ilustracion} className="gr-detalle__img" />
      {g.destacado && <p className="gr-sello">{T.destacado}</p>}
      {g.descripcion && <p>{g.descripcion}</p>}
      <dl className="gr-detalle__datos">
        <div>
          <dt>{T.detalle.miembros}</dt>
          <dd>{g.miembros}</dd>
        </div>
        <div>
          <dt>{T.detalle.publicaciones}</dt>
          <dd>{g.publicaciones}</dd>
        </div>
        <div>
          <dt>{T.detalle.categoria}</dt>
          <dd>{g.categoria ? T.categorias[g.categoria] : T.detalle.sinCategoria}</dd>
        </div>
      </dl>
      <p className="co-form__nota">{T.detalle.privacidad}</p>
      {g.soyMiembro && <p className="gr-detalle__parte">{T.detalle.eresParte}</p>}
      <div className="co-form__botones">
        <Accion g={g} acciones={acciones} larga clase="boton--primario" />
        {g.soyMiembro && (
          <button type="button" className="boton boton--secundario" disabled={acciones.ocupado === g.id} onClick={() => void acciones.cambiar(g, false)}>
            {T.detalle.salir}
          </button>
        )}
      </div>
    </div>
  );
}

function Proponer({ fuente, alEnviar, alCancelar }: { fuente: FuenteComunidad; alEnviar: () => void; alCancelar: () => void }) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mias, setMias] = useState<PropuestaGrupo[]>([]);
  const ids = { nombre: useId(), ayuda: useId(), desc: useId(), error: useId() };

  useEffect(() => {
    let vivo = true;
    fuente
      .misPropuestas()
      .then((p) => vivo && setMias(p))
      .catch(() => vivo && setMias([]));
    return () => {
      vivo = false;
    };
  }, [fuente]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const n = nombre.trim();
    if (n.length < 2 || n.length > 60) return setError(T.propuesta.errores.largo);
    if (descripcion.trim().length > 300) return setError(T.propuesta.errores.descripcion);
    setEnviando(true);
    setError(null);
    try {
      await fuente.proponerGrupo(n, descripcion.trim() || null);
      alEnviar();
    } catch (err) {
      const c = err instanceof ErrorBase ? `${err.campo}:${err.codigo}` : "";
      setError(
        c === "nombre:en_uso"
          ? T.propuesta.errores.enUso
          : c === "propuestas:demasiadas"
            ? T.propuesta.errores.demasiadas
            : c === "nombre:largo"
              ? T.propuesta.errores.largo
              : c === "descripcion:largo"
                ? T.propuesta.errores.descripcion
                : T_COMU.errorGeneral,
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="co-form" onSubmit={enviar} noValidate>
      <p>{T.propuesta.texto}</p>
      <div className="co-form__grupo">
        <label htmlFor={ids.nombre} className="co-form__etiqueta">
          {T.propuesta.nombre}
        </label>
        <input
          id={ids.nombre}
          className="co-form__campo gr-campo"
          maxLength={60}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          aria-describedby={error ? `${ids.ayuda} ${ids.error}` : ids.ayuda}
          aria-invalid={error === T.propuesta.errores.largo || error === T.propuesta.errores.enUso ? true : undefined}
        />
        <span id={ids.ayuda} className="co-form__nota">
          {T.propuesta.nombreAyuda}
        </span>
      </div>
      <div className="co-form__grupo">
        <label htmlFor={ids.desc} className="co-form__etiqueta">
          {T.propuesta.descripcion}
        </label>
        <textarea id={ids.desc} className="co-form__area" rows={3} maxLength={300} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>
      <p className="co-form__nota">{T.propuesta.nota}</p>
      {error && (
        <p className="co-form__error" role="alert" id={ids.error}>
          {error}
        </p>
      )}
      <div className="co-form__botones">
        <button type="submit" className="boton boton--primario" disabled={enviando}>
          {T.propuesta.enviar}
        </button>
        <button type="button" className="boton boton--secundario" onClick={alCancelar}>
          {T.propuesta.cancelar}
        </button>
      </div>
      {mias.length > 0 && (
        <section className="gr-mias" aria-labelledby="gr-mias-t">
          <h3 id="gr-mias-t" className="co-h3">
            {T.propuesta.tuyas}
          </h3>
          <ul>
            {mias.map((p) => (
              <li key={p.id}>
                <span>{p.nombre}</span>
                <span className="gr-mias__estado">{T.propuesta.estados[p.estado] ?? p.estado}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </form>
  );
}
