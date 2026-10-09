// Contenido del detalle de una acción (plataforma 4.8) y su bloque de foto privada (4.9).
// Lo usan la página completa (accion/?id=) y la hoja que se abre al tocar una fila en Hoy o en
// el calendario (en escritorio, panel derecho). En la hoja el título lo pone la hoja (h2) y los
// subtítulos bajan a h3.
import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { Aviso } from "../../../components/Bloques";
import Etiqueta from "../../../components/Etiqueta";
import { ChipMeta, Hoja, Icono, TEXTOS_CARGA } from "../../../components/app";
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
import { diaCorto, diaMes, duracionTexto, fechaLarga, mayuscula, sumarMinutos, type Iso } from "../../../lib/fechas";
import { EtiquetaEjemplo, useEspacio } from "./comun";
import { T_CALENDARIO, T_COMUN, T_DETALLE } from "./textos";

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

export default function Detalle({ o, hoy, enHoja, onRegistrar, fotoInicial, sinConexion }: Props) {
  const { metaPorId, fechaRevision, semanaDelCiclo, dentroDeVentana, rutaAjuste } = useEspacio();
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

  let control;
  if (o.anulada) {
    control = (
      <Etiqueta variante="nota" grande>
        {o.anulada.motivo === "ajuste" ? T_DETALLE.anuladaAjuste(diaMes(o.anulada.en)) : T_DETALLE.anuladaPausa}
      </Etiqueta>
    );
  } else if (o.conFoto) {
    control = <BloqueFoto o={o} inicial={fotoInicial ?? fotoDelRegistro(o.registro)} sinConexion={sinConexion} />;
  } else if (futura) {
    control = (
      <>
        <button type="button" className="boton boton--primario boton--ancho" aria-disabled="true" aria-describedby={idNota}>
          {T_DETALLE.marcar}
        </button>
        <p id={idNota} className="microcopia">
          {T_DETALLE.futura(diaCorto(o.fecha))}
        </p>
      </>
    );
  } else if (cuentaComoHecha(o.registro)) {
    control = (
      <div className="me-detalle__fila-estado">
        <Etiqueta variante="activo" grande>
          {o.registro === "corta" ? T_DETALLE.hechaCorta : T_DETALLE.hecha}
        </Etiqueta>
        {ventana && (
          <button type="button" className="boton boton--terciario" onClick={() => registrar(null, T_DETALLE.marcar)}>
            {T_DETALLE.desmarcar}
          </button>
        )}
      </div>
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
  } else if (sinConexion) {
    control = (
      <>
        <button type="button" className="boton boton--primario boton--ancho" aria-disabled="true" aria-describedby={idNota}>
          {T_DETALLE.marcar}
        </button>
        <p id={idNota} className="microcopia">
          {TEXTOS_CARGA.necesitasConexion}
        </p>
      </>
    );
  } else {
    control = (
      <div className="me-detalle__botones">
        <button type="button" className="boton boton--primario boton--ancho" onClick={() => registrar("hecha", T_DETALLE.hecha)}>
          {T_DETALLE.marcar}
        </button>
        {o.versionCorta && (
          <button type="button" className="boton boton--secundario boton--ancho" onClick={() => registrar("corta", T_DETALLE.hechaCorta)}>
            {T_DETALLE.corta}
          </button>
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

  return (
    <div className={enHoja ? "me-detalle me-detalle--hoja" : "me-detalle"}>
      <div className="me-detalle__cabeza">
        <div className="me-detalle__etiquetas">
          <ChipMeta cat={o.categoria} />
          <EtiquetaEjemplo />
        </div>
        <p className="microcopia">{T_DETALLE.meta(meta.titulo || o.metaTitulo || "")}</p>
        {!enHoja && <h1 className="me-h1 me-h1--h2">{o.titulo}</h1>}
        <ul className="me-datos">
          <li>
            <Icono nombre="calendar-days" tamaño={16} />
            <span>
              {mayuscula(fechaLarga(o.fecha))}
              {esRevision && <span className="sr-only">{T_CALENDARIO.diaRevision}</span>}
            </span>
          </li>
          <li>
            <Icono nombre="clock" tamaño={16} />
            <span>
              {o.hora && fin
                ? T_DETALLE.horario(o.hora, fin, duracionTexto(o.duracion))
                : T_DETALLE.flexible(duracionTexto(o.duracion))}
            </span>
          </li>
        </ul>
      </div>

      <div className="me-detalle__estado" ref={estadoRef}>
        {control}
      </div>
      <p className="sr-only" aria-live="polite">
        {anuncio}
      </p>

      <section className="me-detalle__seccion">
        <Sub className="me-subtitulo">{T_DETALLE.como}</Sub>
        {o.instrucciones.length > 1 ? (
          <ol className="me-pasos">
            {o.instrucciones.map((paso) => (
              <li key={paso}>{paso}</li>
            ))}
          </ol>
        ) : (
          <p>{o.instrucciones[0]}</p>
        )}
      </section>

      {o.versionCorta && (
        <Aviso icono="info" titulo={T_DETALLE.siNo} className="me-aviso-hondo">
          {T_DETALLE.versionCorta(o.versionCorta)}
        </Aviso>
      )}

      {meta.paraQue && (
        <section className="me-detalle__seccion">
          <Sub className="me-subtitulo">{T_DETALLE.paraQue}</Sub>
          <figure className="me-para-que">
            <blockquote className="voz">
              <p>
                <q>{meta.paraQue}</q>
              </p>
            </blockquote>
            <figcaption className="microcopia">{T_DETALLE.atribucion}</figcaption>
          </figure>
        </section>
      )}

      <footer className="me-detalle__pie">
        <p>
          {T_DETALLE.pieAjuste}
          <Link to={rutaAjuste(o.id)}>{T_DETALLE.ajuste}</Link>
        </p>
        <NoEsChat />
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Foto privada (4.9). En la vista previa la foto no sale del navegador: se muestra con una URL
// blob: local (la CSP de la vista previa la permite) y se borra al eliminarla.
// En Mi espacio real (etapa 3) las fotos todavía no se suben (etapa 4: bucket, recompresión y
// revisión): solo existe «No puedo subir una foto», que guarda la explicación con
// registrar_evidencia y queda «En revisión», igual que una foto.

type EstadoFoto = FotoInicial | "subiendo" | "explicar";
const TIPOS = FOTO.accept.split(",");

function BloqueFoto({ o, inicial, sinConexion }: { o: Ocurrencia; inicial: FotoInicial; sinConexion?: boolean }) {
  const { servidor, R } = useEspacio();
  const real = !!servidor;
  const [estado, setEstado] = useState<EstadoFoto>(inicial);
  const [url, setUrl] = useState<string | null>(null);
  const [explicacion, setExplicacion] = useState<string | null>(o.explicacion ?? null);
  const [texto, setTexto] = useState("");
  const [errorTexto, setErrorTexto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avance, setAvance] = useState(0);
  const [confirmar, setConfirmar] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  const zona = useRef<HTMLDivElement>(null);
  const idBloque = useId();

  // Libera la URL local al salir.
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  // El foco sigue al estado nuevo (subiendo → en revisión, eliminar → sin foto).
  const moverFoco = () => requestAnimationFrame(() => zona.current?.querySelector<HTMLElement>("button, textarea, [tabindex]")?.focus());

  const elegir = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!TIPOS.includes(f.type)) {
      setError(FOTO.errores.tipo);
      return;
    }
    setError(null);
    setEstado("subiendo");
    setAvance(0);
    const nueva = URL.createObjectURL(f);
    let p = 0;
    const t = window.setInterval(() => {
      p += 20;
      setAvance(p);
      if (p >= 100) {
        window.clearInterval(t);
        setUrl(nueva);
        setExplicacion(null);
        setEstado("revision");
        moverFoco();
      }
    }, 180);
  };

  const eliminar = () => {
    setConfirmar(false);
    if (real) {
      servidor
        .eliminarEvidencia(o.id)
        .then(() => {
          setExplicacion(null);
          setEstado("sin");
          moverFoco();
        })
        .catch(() => setError(T_DETALLE.foto.errorGuardar));
      return;
    }
    if (url) URL.revokeObjectURL(url);
    setUrl(null);
    setEstado("sin");
    moverFoco();
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

  return (
    <div className="me-foto">
      <Aviso icono="lock">{T_DETALLE.foto.aviso}</Aviso>
      <div ref={zona} className="me-foto__zona">
        {estado === "aprobada" && (
          <div className="me-foto__revision" tabIndex={-1}>
            <MiniaturaEjemplo />
            <div className="me-foto__texto">
              <Etiqueta variante="activo">{T_DETALLE.foto.aprobada}</Etiqueta>
              <figure className="me-foto__nota">
                <figcaption className="me-rotulo">{T_DETALLE.foto.notaCoach}</figcaption>
                <blockquote>
                  <p>{real ? o.notaRevision : NOTA_FOTO_APROBADA}</p>
                </blockquote>
              </figure>
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
            {!real && <p>{T_DETALLE.foto.subirOtra}</p>}
            <div className="me-detalle__botones">
              {real ? (
                <button type="button" className="boton boton--terciario" onClick={() => setEstado("explicar")}>
                  {T_DETALLE.foto.noPuedo}
                </button>
              ) : (
              <button
                type="button"
                className="boton boton--primario boton--ancho"
                aria-disabled={sinConexion || undefined}
                onClick={sinConexion ? undefined : () => archivo.current?.click()}
              >
                <Icono nombre="camera" tamaño={20} />
                {T_DETALLE.foto.botonOtra}
              </button>
              )}
            </div>
            <input ref={archivo} type="file" accept={FOTO.accept} hidden onChange={elegir} tabIndex={-1} />
          </div>
        )}

        {estado === "sin" && (
          <>
            <div className="me-detalle__botones">
              {!real && (
              <button
                type="button"
                className="boton boton--primario boton--ancho"
                aria-disabled={sinConexion || undefined}
                onClick={sinConexion ? undefined : () => archivo.current?.click()}
              >
                <Icono nombre="camera" tamaño={20} />
                {T_DETALLE.foto.subir}
              </button>
              )}
              <button type="button" className="boton boton--terciario" onClick={() => setEstado("explicar")}>
                {T_DETALLE.foto.noPuedo}
              </button>
            </div>
            <input ref={archivo} type="file" accept={FOTO.accept} hidden onChange={elegir} tabIndex={-1} />
            <div role="alert">
              {error && (
                <p className="campo__error">
                  <Icono nombre="circle-alert" tamaño={16} />
                  {error}
                </p>
              )}
            </div>
          </>
        )}

        {estado === "subiendo" && (
          <div className="me-foto__subiendo">
            <p id={`${idBloque}-subiendo`}>{T_DETALLE.foto.subiendo}</p>
            <div className="barra" role="progressbar" aria-labelledby={`${idBloque}-subiendo`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={avance}>
              <span className="barra-relleno" style={{ inlineSize: `${avance}%` }} />
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
          <div className="me-foto__revision" tabIndex={-1}>
            {explicacion ? (
              <blockquote className="me-foto__explicacion">
                <p>{explicacion}</p>
              </blockquote>
            ) : url ? (
              <img className="me-foto__miniatura" src={url} alt={T_DETALLE.foto.miniatura} width={120} height={120} />
            ) : (
              <MiniaturaEjemplo />
            )}
            <div className="me-foto__texto">
              <Etiqueta variante="nota">{T_DETALLE.foto.enRevision}</Etiqueta>
              <p>{T_DETALLE.foto.suma}</p>
              {!explicacion && !real && (
                <button type="button" className="boton boton--terciario me-boton-izq" onClick={() => setConfirmar(true)}>
                  {T_DETALLE.foto.eliminar}
                </button>
              )}
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

// Miniatura de ejemplo (sin foto real): marco punteado con la etiqueta «Ejemplo».
function MiniaturaEjemplo() {
  return (
    <div className="me-foto__miniatura me-foto__miniatura--ejemplo" role="img" aria-label={`${T_DETALLE.foto.miniatura} · ${T_COMUN.ejemplo}`}>
      <Icono nombre="camera" tamaño={24} />
      <EtiquetaEjemplo />
    </div>
  );
}
