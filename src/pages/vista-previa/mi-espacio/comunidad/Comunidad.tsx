// Comunidad con la maqueta de ChatGPT (21-oct-2026) y el prompt de implementación de Diego.
//   · Portada panorámica: «Comunidad», la bajada y «Historias reales que también te inspiran.»
//     El paisaje es una ilustración propia mientras no llegue la fotografía definitiva.
//   · Pestañas: Todas las publicaciones, Mis grupos, Desafíos e Historias de logro (pastilla verde
//     bosque en la elegida) y «Crear publicación».
//   · Escritorio, tres columnas de ancho distinto: grupos y desafío destacado | crear y
//     publicaciones (la más ancha) | temas populares y tu impacto.
//   · Móvil: una columna con crear publicación primero; grupos y desafíos en sus pestañas y los
//     temas como fila deslizable.
// Antes de participar: módulo habilitado por el dueño, alias y reglas aceptadas (lo dice la base).
// Mi espacio real: todo sale de la base (C6 a C9). Vista previa: datos rotulados «Ejemplo».
import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Icono, Tostada } from "../../../../components/app";
import { ErrorBase } from "../../../../lib/supabase";
import { EtiquetaEjemplo, useEspacio } from "../comun";
import { ComunidadCtx, VISTAS, useComunidad, type Comunidad as Ctx, type Vista } from "./contexto";
import { Compositor } from "./Crear";
import { fuenteEjemploCompartida, fuenteReal, type Acceso, type FuenteComunidad } from "./fuente";
import { DesafioDestacado, TarjetaGrupos, TarjetaImpacto, TarjetaTemas, useDato } from "./Laterales";
import { FOTO_PORTADA, PaisajePortada } from "./Paisaje";
import GrupoInterior from "./GrupoInterior";
import { Feed } from "./Publicaciones";
import { T_COMU as T } from "./textos";
import { VistaActividad, VistaDesafios, VistaGrupos, VistaLogros } from "./Vistas";
import "../../../../styles/vista-comunidad.css";

export function Portada() {
  return (
    <header className="co-portada">
      {FOTO_PORTADA ? <img className="co-portada__fondo" src={FOTO_PORTADA} alt="" /> : <PaisajePortada className="co-portada__fondo" />}
      <div className="co-portada__texto">
        <h1 className="co-portada__h1">{T.portada.titulo}</h1>
        <p className="co-portada__bajada">{T.portada.bajada}</p>
      </div>
      <p className="co-portada__mano mano" aria-hidden="true">
        {T.portada.mano}
      </p>
    </header>
  );
}

const ACCESOS_PREVIA: Acceso[] = ["abierta", "cerrada", "sin_alias", "sin_reglas", "no_activo"];

export default function Comunidad() {
  const esp = useEspacio();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  // Vista previa: ?acceso= muestra cada estado de ingreso (cerrada, sin alias, sin reglas).
  // Interior de un grupo (C14): su propia portada en lugar de la de Comunidad.
  const interior = params.get("vista") === "grupos" && !!params.get("grupo");
  const accesoPrevia = (ACCESOS_PREVIA as string[]).includes(params.get("acceso") ?? "") ? (params.get("acceso") as Acceso) : "abierta";
  const fuente = useMemo<FuenteComunidad>(() => (esp.real ? fuenteReal() : fuenteEjemploCompartida(accesoPrevia)), [esp.real, accesoPrevia]);
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
    <div className={`me-pantalla co-comunidad${interior ? " co-comunidad--grupo" : ""}`}>
      {!(interior && acceso?.estado === "abierta") && <Portada />}
      {fuente.ejemplo && (
        <p className="co-ejemplo">
          <EtiquetaEjemplo />
          <span>{T.ejemplo}</span>
        </p>
      )}
      {errorAcceso && (
        <div className="co-tarjeta co-estado co-angosta" role="alert">
          <p>{T.errorGeneral}</p>
          <button type="button" className="boton boton--secundario" onClick={() => setIntento(intento + 1)}>
            {T.feed.reintentar}
          </button>
        </div>
      )}
      {!acceso && !errorAcceso && <p className="co-tarjeta co-estado co-angosta">{T.cargando}</p>}
      {acceso && acceso.estado !== "abierta" && (
        <Ingreso estado={acceso.estado} fuente={fuente} onListo={() => setIntento(intento + 1)} />
      )}
      {acceso?.estado === "abierta" && <Abierta fuente={fuente} alias={acceso.alias ?? ""} ruta={pathname} />}
    </div>
  );
}

function Abierta({ fuente, alias, ruta }: { fuente: FuenteComunidad; alias: string; ruta: string }) {
  const [params] = useSearchParams();
  const vista = (VISTAS as string[]).includes(params.get("vista") ?? "") ? (params.get("vista") as Vista) : "todas";
  const grupo = params.get("grupo");
  const tema = params.get("tema");
  const desafio = params.get("desafio");
  const [version, setVersion] = useState(0);
  const { state } = useLocation();
  const navegar = useNavigate();
  const { R } = useEspacio();
  // Al volver de Crear publicación llega su confirmación.
  const [mensaje, setMensaje] = useState<string | null>(() => {
    const a = (state as { aviso?: unknown } | null)?.aviso;
    return typeof a === "string" ? a : null;
  });
  const primera = useRef(true);

  const enlace = useCallback<Ctx["enlace"]>(
    (p) => {
      const q = new URLSearchParams();
      const v = p.vista ?? (p.tema ? "todas" : undefined);
      if (v && v !== "todas") q.set("vista", v);
      if (p.grupo) q.set("grupo", p.grupo);
      if (p.tema) q.set("tema", p.tema);
      if (p.desafio) q.set("desafio", p.desafio);
      const s = q.toString();
      return s ? `${ruta}?${s}` : ruta;
    },
    [ruta],
  );
  const ctx = useMemo<Ctx>(
    () => ({
      fuente,
      alias,
      version,
      cambio: () => setVersion((v) => v + 1),
      aviso: setMensaje,
      // Crear publicación es su propia pantalla; el acceso elegido viaja en la dirección.
      abrirCrear: (p) => {
        const q = new URLSearchParams();
        if (p?.tipo) q.set("tipo", p.tipo);
        if (p?.grupo) q.set("grupo", p.grupo);
        if (p?.foto) q.set("foto", "1");
        if (p?.emoji) q.set("emoji", "1");
        const s = q.toString();
        navegar(s ? `${R.comunidadCrear}?${s}` : R.comunidadCrear, { state: p?.texto ? { texto: p.texto } : null });
      },
      enlace,
    }),
    [fuente, alias, version, enlace, navegar, R.comunidadCrear],
  );

  // Al cambiar de pestaña, el aviso anterior ya no corresponde.
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    setMensaje(null);
  }, [vista, grupo, tema]);

  if (vista === "grupos" && grupo)
    return (
      <ComunidadCtx.Provider value={ctx}>
        <GrupoInterior grupo={grupo} />
        <Tostada mensaje={mensaje} onCerrar={() => setMensaje(null)} />
      </ComunidadCtx.Provider>
    );

  return (
    <ComunidadCtx.Provider value={ctx}>
      <Pestanas vista={vista} />
      <div className={`co-columnas co-columnas--${vista}`}>
        <aside className="co-col co-col--izq" aria-label={`${T.grupos.titulo} y ${T.desafios.destacado}`}>
          <TarjetaGrupos />
          <DesafioDestacado />
        </aside>
        <div className="co-col co-col--centro">
          {vista === "todas" && <VistaTodas tema={tema} />}
          {vista === "grupos" && <VistaGrupos />}
          {vista === "desafios" && <VistaDesafios desafio={desafio} />}
          {vista === "logros" && <VistaLogros />}
          {vista === "actividad" && <VistaActividad />}
        </div>
        <aside className="co-col co-col--der" aria-label={`${T.temas.titulo} y ${T.impacto.titulo}`}>
          <TarjetaTemas />
          <TarjetaImpacto />
        </aside>
      </div>
      <Tostada mensaje={mensaje} onCerrar={() => setMensaje(null)} />
    </ComunidadCtx.Provider>
  );
}

function Pestanas({ vista }: { vista: Vista }) {
  const { enlace, abrirCrear } = useComunidad();
  const pestañas: { v: Vista; texto: string; corta?: string }[] = [
    { v: "todas", texto: T.pestanas.todas, corta: T.pestanas.todasCorta },
    { v: "grupos", texto: T.pestanas.grupos },
    { v: "desafios", texto: T.pestanas.desafios },
    { v: "logros", texto: T.pestanas.logros },
    { v: "actividad", texto: T.pestanas.actividad },
  ];
  return (
    <div className="co-pestanas-fila">
      <nav className="co-pestanas" aria-label={T.navegacion}>
        <ul>
          {pestañas.map((p) => (
            <li key={p.v} className={p.v === "actividad" ? "co-pestanas__item co-pestanas__item--movil" : "co-pestanas__item"}>
              <Link to={enlace({ vista: p.v })} className="co-pestana" aria-current={vista === p.v ? "page" : undefined}>
                {p.corta ? (
                  <>
                    <span className="co-pestana__larga">{p.texto}</span>
                    <span className="co-pestana__corta" aria-hidden="true">
                      {p.corta}
                    </span>
                  </>
                ) : (
                  p.texto
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <button type="button" className="boton boton--primario co-crear-boton" onClick={() => abrirCrear()}>
        <Icono nombre="plus" tamaño={16} />
        {T.crear}
      </button>
    </div>
  );
}

function VistaTodas({ tema }: { tema: string | null }) {
  const { enlace } = useComunidad();
  return (
    <div className="co-vista">
      <Compositor />
      <TemasMovil />
      {tema && (
        <p className="co-filtro">
          <span>{T.temas.filtrando(tema)}</span>
          <Link to={enlace({})} className="co-filtro__quitar">
            <Icono nombre="x" tamaño={16} />
            {T.temas.quitar}
          </Link>
        </p>
      )}
      <Feed filtro={{ tema }} />
    </div>
  );
}

// Móvil: los temas populares como fila deslizable bajo «crear publicación».
function TemasMovil() {
  const { enlace } = useComunidad();
  const { dato } = useDato((f) => f.temas());
  if (!dato?.length) return null;
  return (
    <nav className="co-temas-movil co-solo-movil" aria-label={T.temas.titulo}>
      <ul>
        {dato.map((t) => (
          <li key={t.tema}>
            <Link to={enlace({ tema: t.tema })} className="co-chip-tema">
              #{t.tema}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// Antes de participar: comunidad cerrada, ficha no activa, elegir alias o aceptar las reglas.
function Ingreso({ estado, fuente, onListo }: { estado: Exclude<Acceso, "abierta">; fuente: FuenteComunidad; onListo: () => void }) {
  const [alias, setAlias] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const idAlias = useId();
  const idAyuda = useId();

  const guardarAlias = async (e: FormEvent) => {
    e.preventDefault();
    const a = alias.trim();
    if (!/^[\p{L}\p{N}][\p{L}\p{N} _.-]{2,23}$/u.test(a)) return setError(T.acceso.sin_alias.invalido);
    setEnviando(true);
    setError(null);
    try {
      await fuente.guardarAlias(a);
      onListo();
    } catch (err) {
      setError(err instanceof ErrorBase && err.estado === 409 ? T.acceso.sin_alias.enUso : err instanceof ErrorBase && err.estado === 400 ? T.acceso.sin_alias.invalido : T.errorGeneral);
    } finally {
      setEnviando(false);
    }
  };
  const aceptar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await fuente.aceptarReglas();
      onListo();
    } catch {
      setError(T.errorGeneral);
    } finally {
      setEnviando(false);
    }
  };

  if (estado === "cerrada" || estado === "no_activo")
    return (
      <section className="co-tarjeta co-ingreso co-angosta" aria-labelledby="co-ingreso-h">
        <h2 id="co-ingreso-h" className="co-h2">
          {T.acceso[estado].titulo}
        </h2>
        <p>{T.acceso[estado].texto}</p>
        <CuidadoBreve />
      </section>
    );

  if (estado === "sin_alias")
    return (
      <section className="co-tarjeta co-ingreso co-angosta" aria-labelledby="co-ingreso-h">
        <h2 id="co-ingreso-h" className="co-h2">
          {T.acceso.sin_alias.titulo}
        </h2>
        <p>{T.acceso.sin_alias.texto}</p>
        <form className="co-form" onSubmit={guardarAlias} noValidate>
          <div className="co-form__grupo">
            <label htmlFor={idAlias} className="co-form__etiqueta">
              {T.acceso.sin_alias.campo}
            </label>
            <input
              id={idAlias}
              className="co-form__campo"
              value={alias}
              maxLength={24}
              autoComplete="nickname"
              onChange={(e) => setAlias(e.target.value)}
              aria-describedby={idAyuda}
              aria-invalid={!!error}
            />
            <p id={idAyuda} className="co-form__ayuda">
              {T.acceso.sin_alias.ayuda}
            </p>
          </div>
          {error && (
            <p className="co-form__error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="boton boton--primario" disabled={enviando}>
            {T.acceso.sin_alias.guardar}
          </button>
        </form>
      </section>
    );

  return (
    <section className="co-tarjeta co-ingreso co-angosta" aria-labelledby="co-ingreso-h">
      <h2 id="co-ingreso-h" className="co-h2">
        {T.acceso.sin_reglas.titulo}
      </h2>
      <ol className="co-reglas">
        {T.acceso.sin_reglas.reglas.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ol>
      <p className="co-form__nota">{T.acceso.sin_reglas.nota}</p>
      {error && (
        <p className="co-form__error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="boton boton--primario" disabled={enviando} onClick={() => void aceptar()}>
        {T.acceso.sin_reglas.aceptar}
      </button>
    </section>
  );
}

function CuidadoBreve() {
  return (
    <ul className="co-cuidado-breve">
      {T.cuidado.puntos.map((p) => (
        <li key={p}>
          <Icono nombre="shield-check" tamaño={16} />
          <span>{p}</span>
        </li>
      ))}
    </ul>
  );
}
