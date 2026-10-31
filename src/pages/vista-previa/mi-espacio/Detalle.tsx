// Contenido del detalle de una acción (plataforma 4.8) y su bloque de foto privada (4.9).
// Lo usan la página completa (accion/?id=) y la hoja que se abre al tocar una fila en Hoy o en
// el calendario (en escritorio, panel derecho). En la hoja el título lo pone la hoja (h2) y los
// subtítulos bajan a h3.
import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { Aviso } from "../../../components/Bloques";
import Etiqueta from "../../../components/Etiqueta";
import MiniaturaPrivada from "../../../components/MiniaturaPrivada";
import { ChipMeta, Hoja, Icono, Ilustracion, TEXTOS_CARGA } from "../../../components/app";
import { AvisoAyuda, CampoArea, Formulario, NoEsChat } from "../../../components/form";
import {
  DIAS_DEPURACION,
  NOTA_FOTO_APROBADA,
  NOTA_FOTO_NO_APROBADA,
  cuentaComoHecha,
  type EstadoRegistro,
  type Ocurrencia,
} from "../../../data/ejemplo-app";
import { FOTO } from "../../../data/formularios";
import { FotoRechazada, prepararFotoPrivada } from "../../../lib/foto-privada";
import { reglasCreditos } from "../../../data/rumbo";
import { diaCorto, diaMes, duracionTexto, fechaLarga, mayuscula, sumarMinutos, type Iso } from "../../../lib/fechas";
import { EtiquetaEjemplo, useEspacio } from "./comun";
import RegistroMedible from "./RegistroMedible";
import { T_CALENDARIO, T_COMUN, T_DETALLE, T_REGISTRAR, cantidadTexto } from "./textos";

type Props = {
  o: Ocurrencia;
  hoy: Iso;
  enHoja?: boolean;
  onRegistrar?: (estado: EstadoRegistro | null) => void;
  fotoInicial?: FotoInicial; // por defecto, la que corresponde al registro
  sinConexion?: boolean; // 4.1.4: «Necesitas conexión para guardar esto.»
};

export type FotoInicial = "sin" | "revision" | "aprobada" | "no-aprobada" | "depurada";
const fotoDelRegistro = (r: EstadoRegistro | null): FotoInicial =>
  r === "revision" ? "revision" : r === "aprobada" ? "aprobada" : r === "no_aprobada" ? "no-aprobada" : "sin";

// Botón grande de registro (referencia de ChatGPT): el nombre accesible es solo el texto
// principal; la bajada se lee como descripción.
function BotonMarcar({ variante, texto, bajada, idBajada, deshabilitado, onClick, descrito }: {
  variante: "primario" | "secundario";
  texto: string;
  bajada: string;
  idBajada: string;
  deshabilitado?: boolean;
  onClick?: () => void;
  descrito?: string;
}) {
  return (
  <button
    type="button"
    className={`me-marcar me-marcar--${variante}`}
    aria-disabled={deshabilitado || undefined}
    aria-describedby={[idBajada, descrito].filter(Boolean).join(" ")}
    onClick={deshabilitado ? undefined : onClick}
  >
    {variante === "primario" && (
      <span className="me-marcar__circulo" aria-hidden="true">
        <Icono nombre="check" tamaño={20} />
      </span>
    )}
    <span className="me-marcar__textos">
      <span className="me-marcar__texto">{texto}</span>
      <span id={idBajada} className="me-marcar__bajada" aria-hidden="true">
        {bajada}
      </span>
    </span>
  </button>
);
}

export default function Detalle({ o, hoy, enHoja, onRegistrar, fotoInicial, sinConexion }: Props) {
  const { metaPorId, fechaRevision, semanaDelCiclo, dentroDeVentana, rutaAjuste, enPrograma, ciclo, R, servidor, fotos } = useEspacio();
  const meta = metaPorId(o.metaId);
  const Sub = enHoja ? "h3" : "h2";
  const idNota = useId();
  const estadoRef = useRef<HTMLDivElement>(null);
  const [anuncio, setAnuncio] = useState("");
  const cambio = useRef(false);

  const futura = o.fecha > hoy;
  const ventana = dentroDeVentana(o.fecha, hoy);
  const anterior = o.fecha < hoy;
  const esRevision = fechaRevision(semanaDelCiclo(o.fecha)) === o.fecha;

  // Tras un cambio hecho por la persona, el foco va al primer control del estado nuevo.
  useEffect(() => {
    if (!cambio.current) return;
    cambio.current = false;
    estadoRef.current?.querySelector<HTMLElement>("button, a")?.focus();
  }, [o.registro]);

  const registrar = (estado: EstadoRegistro | null, texto: string) => {
    cambio.current = true;
    setAnuncio(texto);
    onRegistrar?.(estado);
  };

  const marcarSub = T_DETALLE.marcarSub(reglasCreditos.porAccion);

  let control;
  if (o.anulada) {
    control = (
      <Etiqueta variante="nota" grande>
        {o.anulada.motivo === "ajuste" ? T_DETALLE.anuladaAjuste(diaMes(o.anulada.en)) : T_DETALLE.anuladaPausa}
      </Etiqueta>
    );
  } else if (o.conFoto) {
    control = <BloqueFoto o={o} inicial={fotoInicial ?? fotoInicialDe(o, o.registro)} sinConexion={sinConexion} />;
  } else if (futura || (ventana && sinConexion && !o.registro && !o.medible)) {
    control = (
      <>
        <BotonMarcar variante="primario" texto={T_DETALLE.marcar} bajada={marcarSub} idBajada={`${idNota}-b`} deshabilitado descrito={idNota} />
        <p id={idNota} className="microcopia">
          {futura ? T_DETALLE.futura(diaCorto(o.fecha)) : TEXTOS_CARGA.necesitasConexion}
        </p>
      </>
    );
  } else if (o.medible && o.registro !== "dejada" && (ventana || cuentaComoHecha(o.registro))) {
    // Acción medible (maqueta «Registrar acción»): cuánto hizo y, si existe, cómo se sintió.
    control = (
      <RegistroMedible
        o={{ ...o, medible: o.medible }}
        ventana={ventana}
        anterior={anterior}
        enHoja={enHoja}
        sinConexion={sinConexion}
        registrar={registrar}
        anunciar={setAnuncio}
      />
    );
    if (servidor && fotos && ventana && cuentaComoHecha(o.registro))
      control = (
        <>
          {control}
          <FotoOpcional o={o} sinConexion={sinConexion} />
        </>
      );
  } else if (cuentaComoHecha(o.registro)) {
    control = (
      <div className="me-hecha">
        <span className="me-hecha__circulo" aria-hidden="true">
          <Icono nombre="check" tamaño={20} />
        </span>
        <p className="me-hecha__texto">{o.registro === "corta" ? T_DETALLE.hechaCorta : T_DETALLE.hecha}</p>
        {ventana && (
          <button type="button" className="boton boton--terciario me-hecha__boton" onClick={() => registrar(null, T_DETALLE.marcar)}>
            {T_DETALLE.desmarcar}
          </button>
        )}
      </div>
    );
    // Foto opcional (módulo «fotos» habilitado, dentro del plazo): no cambia los créditos.
    if (servidor && fotos && ventana)
      control = (
        <>
          {control}
          <FotoOpcional o={o} sinConexion={sinConexion} />
        </>
      );
  } else if (o.registro === "dejada") {
    control = (
      <div className="me-detalle__fila-estado">
        <Etiqueta variante="nota" grande>
          {T_DETALLE.dejada}
        </Etiqueta>
        {ventana && (
          <button type="button" className="boton boton--terciario" onClick={() => registrar(null, T_DETALLE.marcar)}>
            {T_DETALLE.deshacer}
          </button>
        )}
      </div>
    );
  } else if (!ventana) {
    control = <p className="microcopia">{T_DETALLE.cerrada}</p>;
  } else {
    control = (
      <div className="me-detalle__botones">
        <BotonMarcar variante="primario" texto={T_DETALLE.marcar} bajada={marcarSub} idBajada={`${idNota}-m`} onClick={() => registrar("hecha", T_DETALLE.hecha)} />
        {o.versionCorta && (
          <BotonMarcar variante="secundario" texto={T_DETALLE.corta} bajada={T_DETALLE.cortaSub} idBajada={`${idNota}-c`} onClick={() => registrar("corta", T_DETALLE.hechaCorta)} />
        )}
        {anterior && (
          <button type="button" className="boton boton--terciario" onClick={() => registrar("dejada", T_DETALLE.dejada)}>
            {T_DETALLE.dejar}
          </button>
        )}
      </div>
    );
  }

  const fin = o.hora ? sumarMinutos(o.hora, o.duracion) : null;
  const conPasos = o.instrucciones.length > 1;

  return (
    <div className={enHoja ? "me-detalle me-detalle--hoja" : "me-detalle"} data-cat={o.categoria}>
      {!enHoja && (
        <nav className="me-migas" aria-label={T_DETALLE.migas.etiqueta}>
          <Link to={R.calendario} className="me-migas__volver boton-icono" aria-label={T_DETALLE.migas.volver}>
            <Icono nombre="chevron-left" tamaño={20} />
          </Link>
          <ol className="me-migas__lista">
            <li className="me-migas__plan">
              <Link to={R.calendario}>{T_DETALLE.migas.plan}</Link>
            </li>
            {enPrograma(o.fecha) && <li>{T_DETALLE.migas.semana(Math.min(semanaDelCiclo(o.fecha), ciclo.semanas), ciclo.semanas)}</li>}
            <li className="me-migas__actual" aria-current="page">
              {T_DETALLE.migas.accion(diaCorto(o.fecha))}
            </li>
          </ol>
        </nav>
      )}

      <div className="me-detalle__tarjeta">
        <div className="me-detalle__cabeza">
          <div className="me-detalle__titulos">
            <div className="me-detalle__etiquetas">
              <ChipMeta cat={o.categoria} />
              <p className="microcopia">{T_DETALLE.meta(meta.titulo || o.metaTitulo || "")}</p>
              <EtiquetaEjemplo />
            </div>
            {!enHoja && <h1 className="me-detalle__titulo">{o.titulo}</h1>}
            <ul className="me-datos">
              <li>
                <Icono nombre="calendar-days" tamaño={20} />
                <span>
                  {mayuscula(fechaLarga(o.fecha))}
                  {esRevision && <span className="sr-only">{T_CALENDARIO.diaRevision}</span>}
                </span>
              </li>
              <li>
                <Icono nombre="clock" tamaño={20} />
                <span>
                  {o.hora && fin
                    ? T_DETALLE.horario(o.hora, fin, duracionTexto(o.duracion))
                    : T_DETALLE.flexible(duracionTexto(o.duracion))}
                </span>
              </li>
              {o.medible && (
                <li>
                  <Icono nombre="flag" tamaño={20} />
                  <span>{T_REGISTRAR.objetivo(cantidadTexto(o.medible.objetivo, o.medible.unidad))}</span>
                </li>
              )}
            </ul>
          </div>
          <Ilustracion nombre="cuaderno" className="me-detalle__ilus" />
        </div>

        <div className={o.versionCorta ? "me-detalle__accion me-detalle__accion--doble" : "me-detalle__accion"}>
          <div className="me-detalle__estado" ref={estadoRef}>
            {control}
          </div>
          {o.versionCorta && (
            <Aviso icono="info" titulo={T_DETALLE.siNo} className="me-si-no">
              {T_DETALLE.versionCorta(o.versionCorta)}
            </Aviso>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {anuncio}
        </p>

        <section className="me-detalle__seccion">
          <div className="me-seccion-num">
            <span className="me-seccion-num__n" aria-hidden="true">
              1
            </span>
            <div>
              <Sub className="me-subtitulo me-seccion-num__titulo">{T_DETALLE.como}</Sub>
              <p className="me-seccion-num__bajada">{T_DETALLE.comoSub(duracionTexto(o.duracion), conPasos)}</p>
            </div>
          </div>
          {conPasos ? (
            <ol className="me-pasos" role="list">
              {o.instrucciones.map((paso) => (
                <li key={paso}>{paso}</li>
              ))}
            </ol>
          ) : (
            <p className="me-detalle__texto">{o.instrucciones[0]}</p>
          )}
        </section>

        {meta.paraQue && (
          <section className="me-detalle__seccion">
            <div className="me-seccion-num">
              <span className="me-seccion-num__n" aria-hidden="true">
                2
              </span>
              <Sub className="me-subtitulo me-seccion-num__titulo">{T_DETALLE.paraQue}</Sub>
            </div>
            <div className="me-para-que-fila">
              <figure className="me-para-que">
                <figcaption className="me-para-que__de">{T_DETALLE.atribucion}:</figcaption>
                <blockquote className="me-para-que__cita">
                  <p>
                    <q>{meta.paraQue}</q>
                  </p>
                </blockquote>
              </figure>
              <Ilustracion nombre="paisaje" className="me-para-que__ilus" />
            </div>
          </section>
        )}

        <section className="me-ajuste-tarjeta" aria-labelledby={`${idNota}-ajuste`}>
          <span className="me-ajuste-tarjeta__icono" aria-hidden="true">
            <Icono nombre="sliders-horizontal" tamaño={24} />
          </span>
          <div className="me-ajuste-tarjeta__textos">
            <Sub id={`${idNota}-ajuste`} className="me-ajuste-tarjeta__titulo">
              {T_DETALLE.ajusteCard.titulo}
            </Sub>
            <p>{T_DETALLE.ajusteCard.texto}</p>
          </div>
          <Link to={rutaAjuste(o.id)} className="boton boton--secundario me-ajuste-tarjeta__boton">
            {T_DETALLE.ajusteCard.boton}
            <Icono nombre="arrow-right" tamaño={16} />
          </Link>
        </section>
        <NoEsChat className="me-detalle__no-chat" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Foto privada (4.9).
// · Vista previa: la subida no se muestra (como en Mi espacio real con el módulo «fotos» apagado);
//   los estados de revisión usan una miniatura de ejemplo.
// · Mi espacio real con el módulo «fotos» habilitado: la foto se prepara en el navegador (WebP,
//   1600 px, sin EXIF; si no se puede, se rechaza), se sube al bucket privado «evidencias» y se
//   registra con registrar_evidencia. Las miniaturas usan enlaces firmados de 5 minutos.
// · Siempre: «No puedo subir una foto» guarda la explicación y queda «En revisión».

type EstadoFoto = FotoInicial | "subiendo" | "explicar";

const fotoInicialDe = (o: Ocurrencia, r: EstadoRegistro | null): FotoInicial =>
  r === "aprobada" && o.fotoDepurada ? "depurada" : fotoDelRegistro(r);

// Mensaje para la persona según el motivo del rechazo o el fallo.
function mensajeFoto(e: unknown): string {
  if (e instanceof FotoRechazada) return T_DETALLE.foto.errores[e.motivo];
  return FOTO.errores.red;
}

// Botón que abre la cámara o la galería y entrega la foto ya preparada (o el error).
function BotonFoto({
  texto,
  variante,
  deshabilitado,
  onFoto,
  onError,
}: {
  texto: string;
  variante: "primario" | "secundario";
  deshabilitado?: boolean;
  onFoto: (foto: Blob) => void;
  onError: (mensaje: string) => void;
}) {
  const archivo = useRef<HTMLInputElement>(null);
  const [preparando, setPreparando] = useState(false);
  const elegir = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setPreparando(true);
    try {
      onFoto(await prepararFotoPrivada(f));
    } catch (x) {
      onError(mensajeFoto(x));
    } finally {
      setPreparando(false);
    }
  };
  const bloqueado = deshabilitado || preparando;
  return (
    <>
      <button
        type="button"
        className={`boton boton--${variante} boton--ancho`}
        aria-disabled={bloqueado || undefined}
        onClick={bloqueado ? undefined : () => archivo.current?.click()}
      >
        <Icono nombre="camera" tamaño={20} />
        {preparando ? T_DETALLE.foto.preparando : texto}
      </button>
      <input ref={archivo} type="file" accept={FOTO.accept} hidden onChange={(e) => void elegir(e)} tabIndex={-1} />
    </>
  );
}

function BloqueFoto({ o, inicial, sinConexion }: { o: Ocurrencia; inicial: FotoInicial; sinConexion?: boolean }) {
  const { servidor, R, fotos } = useEspacio();
  const real = !!servidor;
  const subida = real && fotos; // la subida existe solo con el módulo «fotos» habilitado
  const [estado, setEstado] = useState<EstadoFoto>(inicial);
  const [explicacion, setExplicacion] = useState<string | null>(o.explicacion ?? null);
  const [texto, setTexto] = useState("");
  const [errorTexto, setErrorTexto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const zona = useRef<HTMLDivElement>(null);
  const idBloque = useId();

  // El foco sigue al estado nuevo (subiendo → en revisión, eliminar → sin foto).
  const moverFoco = () => requestAnimationFrame(() => zona.current?.querySelector<HTMLElement>("button, textarea, [tabindex]")?.focus());

  const subir = (foto: Blob) => {
    if (!servidor) return;
    const antes = estado;
    setError(null);
    setEstado("subiendo");
    servidor
      .subirFoto(o.id, foto, "evidencia")
      .then(() => {
        setExplicacion(null);
        setEstado("revision");
        moverFoco();
      })
      .catch((x) => {
        setEstado(antes);
        setError(mensajeFoto(x));
      });
  };

  const eliminar = () => {
    setConfirmar(false);
    if (!servidor) return;
    servidor
      .eliminarEvidencia(o.id)
      .then(() => {
        setExplicacion(null);
        setEstado("sin");
        moverFoco();
      })
      .catch(() => setError(T_DETALLE.foto.errorGuardar));
  };

  const enviarExplicacion = () => {
    const v = texto.trim();
    if (v.length < FOTO.explicacion.min) {
      setErrorTexto("Cuéntanos un poco más (mínimo 10 caracteres)."); // PROPUESTO (igual al de contacto)
      return;
    }
    if (real) {
      servidor
        .registrarEvidencia(o.id, v)
        .then(() => {
          setExplicacion(v);
          setEstado("revision");
          moverFoco();
        })
        .catch(() => setErrorTexto(T_DETALLE.foto.errorGuardar));
      return;
    }
    setExplicacion(v);
    setEstado("revision");
    moverFoco();
  };

  // Lo que la persona ve de su evidencia: su explicación, su foto (real) o la miniatura de ejemplo.
  const fotoReal = real && !explicacion && o.fotoRuta ? o.fotoRuta : null;
  const evidencia = explicacion ? (
    <blockquote className="me-foto__explicacion">
      <p>{explicacion}</p>
    </blockquote>
  ) : fotoReal && servidor ? (
    <MiniaturaPrivada ruta={fotoReal} pedirUrl={servidor.urlFoto} alt={T_DETALLE.foto.miniatura} clase="me-foto__miniatura" />
  ) : real ? null : (
    <MiniaturaEjemplo />
  );

  const alerta = (
    <div role="alert">
      {error && (
        <p className="campo__error">
          <Icono nombre="circle-alert" tamaño={16} />
          {error}
        </p>
      )}
    </div>
  );

  return (
    <div className="me-foto">
      <Aviso icono="lock">{subida ? T_DETALLE.foto.aviso : T_DETALLE.foto.porAhora}</Aviso>
      <div ref={zona} className="me-foto__zona">
        {estado === "aprobada" && (
          <div className={evidencia ? "me-foto__revision" : "me-foto__texto"} tabIndex={-1}>
            {evidencia}
            <div className="me-foto__texto">
              <Etiqueta variante="activo">{T_DETALLE.foto.aprobada}</Etiqueta>
              {(!real || o.notaRevision) && (
                <figure className="me-foto__nota">
                  <figcaption className="me-rotulo">{T_DETALLE.foto.notaCoach}</figcaption>
                  <blockquote>
                    <p>{real ? o.notaRevision : NOTA_FOTO_APROBADA}</p>
                  </blockquote>
                </figure>
              )}
            </div>
          </div>
        )}

        {estado === "depurada" && (
          <div className="me-detalle__fila-estado">
            <Etiqueta variante="activo">{T_DETALLE.foto.aprobada}</Etiqueta>
            <p className="microcopia">{T_DETALLE.foto.depurada(DIAS_DEPURACION)}</p>
          </div>
        )}

        {estado === "no-aprobada" && (
          <div className="me-foto__texto" tabIndex={-1}>
            <Etiqueta variante="nota">{T_DETALLE.foto.noAprobada}</Etiqueta>
            <blockquote className="me-foto__explicacion">
              <p>{real ? o.notaRevision : NOTA_FOTO_NO_APROBADA}</p>
            </blockquote>
            {subida && <p>{T_DETALLE.foto.subirOtra}</p>}
            <div className="me-detalle__botones">
              {subida && (
                <BotonFoto texto={T_DETALLE.foto.botonOtra} variante="primario" deshabilitado={sinConexion} onFoto={subir} onError={setError} />
              )}
              <button type="button" className={subida ? "boton boton--terciario" : "boton boton--secundario boton--ancho"} onClick={() => setEstado("explicar")}>
                {T_DETALLE.foto.noPuedo}
              </button>
            </div>
            {alerta}
          </div>
        )}

        {estado === "sin" && (
          <>
            <div className="me-detalle__botones">
              {subida && <BotonFoto texto={T_DETALLE.foto.subir} variante="primario" deshabilitado={sinConexion} onFoto={subir} onError={setError} />}
              <button type="button" className={subida ? "boton boton--terciario" : "boton boton--secundario boton--ancho"} onClick={() => setEstado("explicar")}>
                {T_DETALLE.foto.noPuedo}
              </button>
            </div>
            {sinConexion && subida && <p className="microcopia">{TEXTOS_CARGA.necesitasConexion}</p>}
            {alerta}
          </>
        )}

        {estado === "subiendo" && (
          <div className="me-foto__subiendo">
            <p id={`${idBloque}-subiendo`}>{T_DETALLE.foto.subiendo}</p>
            <div className="barra barra--indeterminada" role="progressbar" aria-labelledby={`${idBloque}-subiendo`}>
              <span className="barra-relleno" />
            </div>
          </div>
        )}

        {estado === "explicar" && (
          <Formulario onSubmit={enviarExplicacion} className="me-foto__explicar">
            <CampoArea
              id={`${idBloque}-explicacion`}
              etiqueta={FOTO.explicacion.etiqueta}
              min={FOTO.explicacion.min}
              max={FOTO.explicacion.max}
              value={texto}
              error={errorTexto}
              onChange={(e) => {
                setTexto(e.target.value);
                if (errorTexto && e.target.value.trim().length >= FOTO.explicacion.min) setErrorTexto(null);
              }}
              pie={<AvisoAyuda href={R.ayuda} />}
            />
            <div className="acciones">
              <button type="submit" className="boton boton--primario">
                {FOTO.explicacion.boton}
              </button>
            </div>
          </Formulario>
        )}

        {estado === "revision" && (
          <div className={evidencia ? "me-foto__revision" : "me-foto__texto"} tabIndex={-1}>
            {evidencia}
            <div className="me-foto__texto">
              <Etiqueta variante="nota">{T_DETALLE.foto.enRevision}</Etiqueta>
              <p>{T_DETALLE.foto.suma}</p>
              {fotoReal && (
                <button type="button" className="boton boton--terciario me-boton-izq" onClick={() => setConfirmar(true)}>
                  {T_DETALLE.foto.eliminar}
                </button>
              )}
              {alerta}
            </div>
          </div>
        )}
      </div>

      <Hoja abierta={confirmar} onCerrar={() => setConfirmar(false)} titulo={T_DETALLE.foto.dialogo.titulo} className="hoja--confirmar">
        <p>{T_DETALLE.foto.dialogo.texto}</p>
        <div className="acciones">
          <button type="button" className="boton boton--primario" onClick={eliminar}>
            {T_DETALLE.foto.dialogo.eliminar}
          </button>
          <button type="button" className="boton boton--secundario" onClick={() => setConfirmar(false)}>
            {T_DETALLE.foto.dialogo.cancelar}
          </button>
        </div>
      </Hoja>
    </div>
  );
}

// Foto opcional en una acción que no la exige (C1, decisión de Diego del 21-oct-2026): un
// complemento privado de «hecha», sin cambiar los créditos. Solo con el módulo «fotos» y dentro
// del plazo de registro.
function FotoOpcional({ o, sinConexion }: { o: Ocurrencia; sinConexion?: boolean }) {
  const { servidor } = useEspacio();
  const [ocupado, setOcupado] = useState<"subiendo" | "quitando" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idTitulo = useId();
  if (!servidor) return null;
  const subir = (foto: Blob) => {
    setError(null);
    setOcupado("subiendo");
    servidor
      .subirFoto(o.id, foto, "opcional")
      .catch((x) => setError(mensajeFoto(x)))
      .finally(() => setOcupado(null));
  };
  const quitar = () => {
    setError(null);
    setOcupado("quitando");
    servidor
      .quitarFoto(o.id)
      .catch(() => setError(T_DETALLE.foto.errorGuardar))
      .finally(() => setOcupado(null));
  };
  return (
    <section className="me-foto-opcional" aria-labelledby={idTitulo}>
      <p id={idTitulo} className="me-foto-opcional__titulo">
        {T_DETALLE.foto.opcional.titulo}
      </p>
      <p className="microcopia">{T_DETALLE.foto.opcional.texto}</p>
      {ocupado === "subiendo" ? (
        <p role="status">{T_DETALLE.foto.subiendo}</p>
      ) : o.fotoRuta ? (
        <div className="me-foto-opcional__fila">
          <MiniaturaPrivada ruta={o.fotoRuta} pedirUrl={servidor.urlFoto} alt={T_DETALLE.foto.miniatura} clase="me-foto__miniatura" />
          <button type="button" className="boton boton--terciario" aria-disabled={ocupado === "quitando" || sinConexion || undefined} onClick={ocupado || sinConexion ? undefined : quitar}>
            {T_DETALLE.foto.opcional.quitar}
          </button>
        </div>
      ) : (
        <div className="me-detalle__botones">
          <BotonFoto texto={T_DETALLE.foto.opcional.agregar} variante="secundario" deshabilitado={sinConexion} onFoto={subir} onError={setError} />
        </div>
      )}
      <div role="alert">
        {error && (
          <p className="campo__error">
            <Icono nombre="circle-alert" tamaño={16} />
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

// Miniatura de ejemplo (sin foto real): marco punteado con la etiqueta «Ejemplo».
function MiniaturaEjemplo() {
  return (
    <div className="me-foto__miniatura me-foto__miniatura--ejemplo" role="img" aria-label={`${T_DETALLE.foto.miniatura} · ${T_COMUN.ejemplo}`}>
      <Icono nombre="camera" tamaño={24} />
      <EtiquetaEjemplo />
    </div>
  );
}
