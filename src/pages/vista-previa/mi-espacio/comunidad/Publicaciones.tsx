// Publicaciones de Comunidad: la tarjeta (alias, fecha relativa, grupo, contenido, foto,
// apoyos, comentarios, guardar y menú), los comentarios de un hilo y la lista con «ver anteriores».
// Todo lo que se ve viene de la fuente (la base en Mi espacio real); la base ya filtra grupos,
// bloqueos y lo ocultado por moderación.
import { Fragment, useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Hoja, Icono } from "../../../../components/app";
import Ilustracion from "../../../../components/app/Ilustracion";
import { ErrorBase } from "../../../../lib/supabase";
import { fechaRelativa, iniciales, tonoAvatar, useComunidad } from "./contexto";
import { LIMITE_TEXTO, type Filtro, type MotivoReporte, type Publicacion } from "./fuente";
import { PaisajeMini } from "./Paisaje";
import { T_COMU as T } from "./textos";

export function Avatar({ alias, grande = false }: { alias: string; grande?: boolean }) {
  return (
    <span className={`co-avatar co-avatar--${tonoAvatar(alias)}${grande ? " co-avatar--grande" : ""}`} aria-hidden="true">
      {iniciales(alias)}
    </span>
  );
}

// Texto con saltos de línea y temas (#Tema) que llevan a sus publicaciones.
function TextoConTemas({ texto }: { texto: string }) {
  const { enlace } = useComunidad();
  const partes = texto.split(/(#[\p{L}\p{N}_]{2,30})/u);
  return (
    <>
      {partes.map((p, i) =>
        /^#[\p{L}\p{N}_]{2,30}$/u.test(p) ? (
          <Link key={i} className="co-tema-enlace" to={enlace({ tema: p.slice(1) })}>
            {p}
          </Link>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

function UnaFoto({ ruta, alt }: { ruta: string; alt: string }) {
  const { fuente } = useComunidad();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    void fuente.urlFoto(ruta).then((u) => vivo && setUrl(u));
    return () => {
      vivo = false;
    };
  }, [fuente, ruta]);
  return url ? <img src={url} alt={alt} loading="lazy" decoding="async" /> : <span className="co-pub__foto-carga" />;
}

// Hasta 5 fotos (C11): una grande, o una cuadrícula con todas.
function Foto({ p }: { p: Publicacion }) {
  if (p.ilustracionEjemplo)
    return (
      <figure className="co-pub__foto co-pub__foto--ilustracion">
        {p.ilustracionEjemplo === "atardecer" ? <Ilustracion nombre="atardecer" /> : <PaisajeMini nombre={p.ilustracionEjemplo} />}
        <figcaption className="sr-only">{T.publicacion.ilustracionEjemplo}</figcaption>
      </figure>
    );
  const fotos = p.fotos.length ? p.fotos : p.foto ? [p.foto] : [];
  if (!fotos.length) return null;
  return (
    <figure className={`co-pub__foto co-pub__fotos co-pub__fotos--${Math.min(fotos.length, 5)}`}>
      {fotos.map((r, i) => (
        <UnaFoto key={r} ruta={r} alt={fotos.length > 1 ? T.publicacion.fotoAltN(p.alias, i + 1, fotos.length) : T.publicacion.fotoAlt(p.alias)} />
      ))}
    </figure>
  );
}

// Menú «…»: guardar, reportar, bloquear o borrar (lo propio). Se cierra con Escape o al tocar fuera.
function Menu({ p, onAccion }: { p: Publicacion; onAccion: (a: "reportar" | "bloquear" | "borrar") => void }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => !caja.current?.contains(e.target as Node) && setAbierto(false);
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);
  const elegir = (a: "reportar" | "bloquear" | "borrar") => {
    setAbierto(false);
    onAccion(a);
  };
  return (
    <div className="co-menu" ref={caja}>
      <button type="button" className="co-menu__boton" aria-expanded={abierto} aria-controls={id} onClick={() => setAbierto(!abierto)}>
        <Icono nombre="ellipsis" />
        <span className="sr-only">{T.publicacion.acciones(p.alias)}</span>
      </button>
      {abierto && (
        <ul className="co-menu__lista" id={id}>
          {p.mia ? (
            <li>
              <button type="button" onClick={() => elegir("borrar")}>
                <Icono nombre="trash-2" tamaño={16} />
                {T.publicacion.borrar}
              </button>
            </li>
          ) : (
            <>
              <li>
                <button type="button" onClick={() => elegir("reportar")}>
                  <Icono nombre="flag" tamaño={16} />
                  {T.publicacion.reportar}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => elegir("bloquear")}>
                  <Icono nombre="ban" tamaño={16} />
                  {T.publicacion.bloquear(p.alias)}
                </button>
              </li>
            </>
          )}
        </ul>
      )}
    </div>
  );
}

// Las acciones del menú abren una hoja propia (reportar, confirmar bloqueo o borrado).
export function useAccionesPublicacion() {
  const { fuente, aviso, cambio } = useComunidad();
  const [hoja, setHoja] = useState<{ tipo: "reportar" | "bloquear" | "borrar"; p: Publicacion } | null>(null);
  const [motivo, setMotivo] = useState<MotivoReporte | null>(null);
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cerrar = () => {
    setHoja(null);
    setMotivo(null);
    setDetalle("");
    setError(null);
  };
  const confirmar = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!hoja) return;
    if (hoja.tipo === "reportar" && !motivo) return setError(T.reporte.pregunta);
    setEnviando(true);
    try {
      if (hoja.tipo === "reportar") await fuente.reportar(hoja.p.id, motivo!, detalle.trim() || null);
      if (hoja.tipo === "bloquear") await fuente.bloquear(hoja.p.id);
      if (hoja.tipo === "borrar") await fuente.borrar(hoja.p.id);
      aviso(hoja.tipo === "reportar" ? T.reporte.listo : hoja.tipo === "bloquear" ? T.bloqueo.listo(hoja.p.alias) : T.borrar.listo);
      cerrar();
      cambio();
    } catch {
      setError(T.errorGeneral);
    } finally {
      setEnviando(false);
    }
  };
  const elemento = (
    <Hoja
      abierta={!!hoja}
      onCerrar={cerrar}
      titulo={hoja?.tipo === "reportar" ? T.reporte.titulo : hoja?.tipo === "bloquear" ? T.bloqueo.titulo(hoja.p.alias) : T.borrar.titulo}
      className="co-hoja"
    >
      {hoja?.tipo === "reportar" ? (
        <form className="co-form" onSubmit={confirmar} noValidate>
          <fieldset className="co-form__grupo">
            <legend className="co-form__etiqueta">{T.reporte.pregunta}</legend>
            {(Object.keys(T.reporte.motivos) as MotivoReporte[]).map((m) => (
              <label key={m} className="co-opcion">
                <input type="radio" name="motivo" value={m} checked={motivo === m} onChange={() => setMotivo(m)} />
                <span>{T.reporte.motivos[m]}</span>
              </label>
            ))}
          </fieldset>
          <label className="co-form__grupo">
            <span className="co-form__etiqueta">{T.reporte.detalle}</span>
            <textarea className="co-form__area" rows={3} maxLength={300} value={detalle} onChange={(e) => setDetalle(e.target.value)} />
          </label>
          <p className="co-form__nota">{T.reporte.nota}</p>
          {error && (
            <p className="co-form__error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="boton boton--primario" disabled={enviando}>
            {T.reporte.enviar}
          </button>
        </form>
      ) : (
        <div className="co-form">
          <p>{hoja?.tipo === "bloquear" ? T.bloqueo.explica : T.borrar.explica}</p>
          {error && (
            <p className="co-form__error" role="alert">
              {error}
            </p>
          )}
          <div className="co-form__botones">
            <button type="button" className="boton boton--primario" disabled={enviando} onClick={() => void confirmar()}>
              {hoja?.tipo === "bloquear" ? T.bloqueo.confirmar : T.borrar.confirmar}
            </button>
            <button type="button" className="boton boton--secundario" onClick={cerrar}>
              {T.formulario.cancelar}
            </button>
          </div>
        </div>
      )}
    </Hoja>
  );
  return { abrir: (tipo: "reportar" | "bloquear" | "borrar", p: Publicacion) => setHoja({ tipo, p }), elemento };
}

type Acciones = ReturnType<typeof useAccionesPublicacion>["abrir"];

// enGrupo (C14, interior del grupo): sin «en <grupo>» y con «Me gusta» y «Comentar» escritos.
export function Tarjeta({ p, acciones, enGrupo = false }: { p: Publicacion; acciones: Acciones; enGrupo?: boolean }) {
  const { fuente, aviso, enlace } = useComunidad();
  const [estado, setEstado] = useState({ reacciones: p.reacciones, mia: p.miReaccion, guardada: p.guardada, respuestas: p.respuestas });
  const [abierto, setAbierto] = useState(false);
  const [largo, setLargo] = useState(false);
  const idHilo = useId();
  useEffect(() => setEstado({ reacciones: p.reacciones, mia: p.miReaccion, guardada: p.guardada, respuestas: p.respuestas }), [p]);

  const reaccionar = async () => {
    const antes = estado;
    setEstado({ ...estado, mia: !estado.mia, reacciones: estado.reacciones + (estado.mia ? -1 : 1) });
    try {
      const puesta = await fuente.reaccionar(p.id);
      setEstado((e) => ({ ...e, mia: puesta, reacciones: antes.reacciones + (puesta === antes.mia ? 0 : puesta ? 1 : -1) }));
    } catch {
      setEstado(antes);
      aviso(T.errorGeneral);
    }
  };
  const guardar = async () => {
    const antes = estado.guardada;
    setEstado((e) => ({ ...e, guardada: !antes }));
    try {
      const g = await fuente.guardar(p.id);
      setEstado((e) => ({ ...e, guardada: g }));
    } catch {
      setEstado((e) => ({ ...e, guardada: antes }));
      aviso(T.errorGeneral);
    }
  };
  const corto = p.texto.length > 320 && !largo;
  const meta = [fechaRelativa(p.creadaEn), p.grupo ? `${T.publicacion.en} ${p.grupo}` : null, T.rotuloTipo[p.tipo] || null].filter(Boolean).join(" · ");

  return (
    <article className={`co-pub co-pub--${p.tipo}`} aria-label={`${p.alias}, ${meta}`}>
      <header className="co-pub__cabeza">
        <Avatar alias={p.alias} />
        <div className="co-pub__quien">
          <p className="co-pub__alias">{p.alias}</p>
          <p className="co-pub__meta">
            {fechaRelativa(p.creadaEn)}
            {!enGrupo && p.grupo && p.grupoId && (
              <>
                {" · "}
                {T.publicacion.en}{" "}
                <Link to={enlace({ vista: "grupos", grupo: p.grupoId })} className="co-pub__grupo">
                  {p.grupo}
                </Link>
              </>
            )}
            {T.rotuloTipo[p.tipo] && <span className={`co-pub__tipo co-pub__tipo--${p.tipo}`}>{T.rotuloTipo[p.tipo]}</span>}
          </p>
        </div>
        <Menu p={p} onAccion={(a) => acciones(a, p)} />
      </header>
      <div className="co-pub__texto">
        <p>
          <TextoConTemas texto={corto ? `${p.texto.slice(0, 300).trimEnd()}…` : p.texto} />
        </p>
        {p.texto.length > 320 && (
          <button type="button" className="co-pub__ver-mas" aria-expanded={largo} onClick={() => setLargo(!largo)}>
            {largo ? T.publicacion.verMenos : T.publicacion.verMas}
          </button>
        )}
      </div>
      <Foto p={p} />
      <footer className={`co-pub__pie${enGrupo ? " co-pub__pie--grupo" : ""}`}>
        <button type="button" className="co-pub__accion co-pub__accion--apoyo" aria-pressed={estado.mia} onClick={() => void reaccionar()}>
          <Icono nombre="heart" />
          {enGrupo && <span aria-hidden="true">{T.publicacion.meGusta}</span>}
          {(!enGrupo || estado.reacciones > 0) && (
            <span aria-hidden="true" className={enGrupo ? "co-pub__cuenta" : undefined}>
              {estado.reacciones}
            </span>
          )}
          <span className="sr-only">{enGrupo ? T.publicacion.meGustaSr(estado.reacciones, estado.mia) : T.publicacion.reacciones(estado.reacciones, estado.mia)}</span>
        </button>
        <button type="button" className="co-pub__accion" aria-expanded={abierto} aria-controls={idHilo} onClick={() => setAbierto(!abierto)}>
          <Icono nombre="message-circle" />
          {enGrupo && <span aria-hidden="true">{T.publicacion.comentar}</span>}
          {(!enGrupo || estado.respuestas > 0) && (
            <span aria-hidden="true" className={enGrupo ? "co-pub__cuenta" : undefined}>
              {estado.respuestas}
            </span>
          )}
          <span className="sr-only">{enGrupo ? T.publicacion.comentarSr(estado.respuestas) : T.publicacion.comentarios(estado.respuestas)}</span>
        </button>
        <button type="button" className="co-pub__accion co-pub__accion--guardar" aria-pressed={estado.guardada} onClick={() => void guardar()}>
          <Icono nombre="bookmark" />
          <span className="sr-only">{estado.guardada ? T.publicacion.guardada : T.publicacion.guardar}</span>
        </button>
      </footer>
      <div id={idHilo} hidden={!abierto}>
        {abierto && <Hilo p={p} acciones={acciones} onRespuestas={(n) => setEstado((e) => ({ ...e, respuestas: n }))} />}
      </div>
    </article>
  );
}

// Comentarios de una publicación (un solo nivel) y el campo para responder.
function Hilo({ p, acciones, onRespuestas }: { p: Publicacion; acciones: Acciones; onRespuestas: (n: number) => void }) {
  const { fuente, version, cambio } = useComunidad();
  const [lista, setLista] = useState<Publicacion[] | null>(null);
  const [error, setError] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const idCampo = useId();
  // Quien publicó apagó los comentarios: solo esa persona puede seguir respondiendo (lo exige la base).
  const cerrados = !p.permiteComentarios && !p.mia;
  const leer = useCallback(async () => {
    try {
      const h = await fuente.hilo(p.id);
      const r = h.filter((x) => x.respuestaA === p.id);
      setLista(r);
      onRespuestas(r.length);
      setError(false);
    } catch {
      setError(true);
    }
    // onRespuestas cambia en cada render de la tarjeta; basta con la publicación y la versión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuente, p.id, version]);
  useEffect(() => void leer(), [leer]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return setErrorEnvio(T.formulario.errores.vacio);
    if (t.length > LIMITE_TEXTO) return setErrorEnvio(T.formulario.errores.largo(LIMITE_TEXTO));
    setEnviando(true);
    setErrorEnvio(null);
    try {
      await fuente.publicar({ texto: t, tipo: "general", grupo: null, respuestaA: p.id });
      setTexto("");
      await leer();
      cambio();
    } catch (err) {
      setErrorEnvio(
        err instanceof ErrorBase && err.codigo === "demasiadas"
          ? T.formulario.errores.demasiadas
          : err instanceof ErrorBase && err.codigo === "cerrados"
            ? T.hilo.cerrados
            : T.formulario.errores.general,
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="co-hilo" aria-label={T.publicacion.comentarios(lista?.length ?? p.respuestas)}>
      {error && <p className="co-hilo__estado">{T.hilo.error}</p>}
      {!lista && !error && <p className="co-hilo__estado">{T.hilo.cargando}</p>}
      {lista && lista.length === 0 && <p className="co-hilo__estado">{cerrados ? T.hilo.cerrados : T.hilo.vacio}</p>}
      {lista && lista.length > 0 && (
        <ul className="co-hilo__lista">
          {lista.map((r) => (
            <li key={r.id} className="co-com">
              <Avatar alias={r.alias} />
              <div className="co-com__burbuja">
                <p className="co-com__cabeza">
                  <span className="co-com__alias">{r.alias}</span>
                  <span className="co-com__fecha">{fechaRelativa(r.creadaEn)}</span>
                </p>
                <p className="co-com__texto">
                  <TextoConTemas texto={r.texto} />
                </p>
              </div>
              <Menu p={r} onAccion={(a) => acciones(a, r)} />
            </li>
          ))}
        </ul>
      )}
      {cerrados && lista && lista.length > 0 && <p className="co-hilo__estado">{T.hilo.cerrados}</p>}
      {!cerrados && (
      <form className="co-hilo__form" onSubmit={enviar} noValidate>
        <label htmlFor={idCampo} className="sr-only">
          {T.hilo.escribir}
        </label>
        <textarea
          id={idCampo}
          className="co-hilo__campo"
          rows={1}
          maxLength={LIMITE_TEXTO}
          placeholder={T.hilo.escribir}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-invalid={!!errorEnvio}
        />
        <button type="submit" className="co-hilo__enviar" disabled={enviando}>
          <Icono nombre="send" tamaño={16} />
          <span className="sr-only">{T.hilo.responder}</span>
        </button>
        {errorEnvio && (
          <p className="co-form__error" role="alert">
            {errorEnvio}
          </p>
        )}
      </form>
      )}
    </section>
  );
}

// Lista de publicaciones con su filtro, «Ver publicaciones anteriores» y estados.
export function Feed({ filtro, vacio, antes, enGrupo = false }: { filtro: Filtro; vacio?: string; antes?: ReactNode; enGrupo?: boolean }) {
  const { fuente, version } = useComunidad();
  const [lista, setLista] = useState<Publicacion[] | null>(null);
  const [error, setError] = useState(false);
  const [hayMas, setHayMas] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const { abrir, elemento } = useAccionesPublicacion();
  const clave = JSON.stringify(filtro);

  useEffect(() => {
    let vivo = true;
    setError(false);
    fuente
      .publicaciones(JSON.parse(clave) as Filtro)
      .then((l) => {
        if (!vivo) return;
        setLista(l);
        setHayMas(l.length >= 20);
      })
      .catch(() => vivo && setError(true));
    return () => {
      vivo = false;
    };
  }, [fuente, clave, version]);

  const mas = async () => {
    if (!lista?.length) return;
    setCargandoMas(true);
    try {
      const l = await fuente.publicaciones({ ...filtro, antes: lista[lista.length - 1].creadaEn });
      setLista([...lista, ...l]);
      setHayMas(l.length >= 20);
    } catch {
      setError(true);
    } finally {
      setCargandoMas(false);
    }
  };

  return (
    <div className="co-feed">
      {antes}
      {error && (
        <div className="co-tarjeta co-estado" role="alert">
          <p>{T.feed.error}</p>
          <button type="button" className="boton boton--secundario" onClick={() => location.reload()}>
            {T.feed.reintentar}
          </button>
        </div>
      )}
      {!lista && !error && (
        <p className="co-tarjeta co-estado" aria-live="polite">
          {T.feed.cargando}
        </p>
      )}
      {lista && lista.length === 0 && !error && <p className="co-tarjeta co-estado co-estado--vacio">{vacio ?? T.feed.vacio}</p>}
      {lista?.map((p) => <Tarjeta key={p.id} p={p} acciones={abrir} enGrupo={enGrupo} />)}
      {hayMas && (
        <button type="button" className="boton boton--secundario co-feed__mas" disabled={cargandoMas} onClick={() => void mas()}>
          {T.feed.masAntiguas}
        </button>
      )}
      {elemento}
    </div>
  );
}
