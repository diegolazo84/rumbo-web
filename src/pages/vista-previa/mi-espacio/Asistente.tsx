// Asistente de Rumbo (maqueta de ChatGPT, 30-oct-2026). Usa lo que ya está en la base (E2):
//   · ia_disponible: el dueño lo encendió, hay clave y el módulo «asistente_ia» está visible.
//   · Consentimiento (ia_guardar_consentimiento / ia_retirar_consentimiento) con el contexto que la
//     persona elige: metas, acciones de la semana, último registro semanal.
//   · ia_preguntar: la pregunta va a la IA con ese contexto; si sugiere riesgo NO se envía (crisis).
//   · mis_consultas_ia: la persona nunca ve borradores; la respuesta aparece solo cuando su coach la
//     aprobó (tal cual o corregida). «Más ideas» y «Profundizar» preparan una pregunta nueva.
// Ayuda en crisis siempre visible, aunque el asistente esté apagado. Sin «Crear plan» ni «Me sirvió»
// (no hay integración ni dónde guardarlo). En la vista previa nada se envía.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Icono, type NombreIconoApp } from "../../../components/app";
import { recursosAyuda } from "../../../data/rumbo";
import { fechaLarga } from "../../../lib/fechas";
import { ErrorBase } from "../../../lib/supabase";
import { diaDe, horaDe } from "./avisos/datos";
import { EtiquetaEjemplo, MensajeAviso, useEspacio } from "./comun";
import { FOTO_PORTADA, PaisajePortada } from "./comunidad/Paisaje";
import type { Asistente as DatosAsistente, ConsultaAsistente, ContextoAsistente } from "./espacio";
import type { PropsPantalla } from "../registro";
import { T_ASISTENTE as T } from "./textos";

const MAX = 1000;

export default function Asistente({ estado }: PropsPantalla) {
  const esp = useEspacio();
  const [aceptadaPrevia, setAceptadaPrevia] = useState(false);
  // Vista previa: variantes para ver la autorización y el asistente apagado.
  const a =
    !esp.real && esp.asistente && estado === "consentimiento"
      ? { ...esp.asistente, consentimiento: aceptadaPrevia ? esp.asistente.consentimiento : null, consultas: [] }
      : !esp.real && esp.asistente && estado === "apagado"
        ? { ...esp.asistente, disponible: false, consultas: [] }
        : esp.asistente;
  const [cambiando, setCambiando] = useState(false); // el formulario de consentimiento abierto a pedido
  const k = a?.consentimiento;
  const autorizado = !!k?.aceptadoEn && !k.retiradoEn;
  const enCurso = esp.ciclo.estado === "en_curso";
  const puedePreguntar = !!a?.disponible && autorizado && enCurso && !cambiando;

  return (
    <div className="me-pantalla as">
      <header className="rc-portada as-portada">
        {FOTO_PORTADA ? <img className="rc-portada__fondo" src={FOTO_PORTADA} alt="" /> : <PaisajePortada className="rc-portada__fondo" />}
        <div className="rc-portada__texto">
          <div className="rc-portada__fila">
            <h1 className="rc-portada__h1">{T.titulo}</h1>
            <span className="as-beta">{T.beta}</span>
            <EtiquetaEjemplo />
          </div>
          <p className="rc-portada__bajada">{T.bajada}</p>
        </div>
      </header>

      <ul className="as-claves" aria-label={T.titulo}>
        {T.claves.map((c) => (
          <li key={c.texto} className="as-clave">
            <span className="rc-icono" aria-hidden="true">
              <Icono nombre={c.icono as NombreIconoApp} tamaño={22} />
            </span>
            {c.texto}
          </li>
        ))}
      </ul>
      <p className="as-revisa">
        <span className="rc-icono" aria-hidden="true">
          <Icono nombre="user-round" tamaño={20} />
        </span>
        <span>
          {T.revisaCoach}{" "}
          <a href="#as-info" className="enlace-flecha">
            {T.saberMas}
          </a>
        </span>
      </p>

      <div className="as-cuerpo">
        <div className="as-principal">
          {a === null ? (
            <MensajeAviso
              icono="info"
              titulo={T.errorCargar.titulo}
              texto={T.errorCargar.texto}
              rol="alert"
              accion={
                esp.servidor && (
                  <button type="button" className="boton boton--secundario" onClick={esp.servidor.recargar}>
                    {T.errorCargar.reintentar}
                  </button>
                )
              }
            />
          ) : !a.disponible ? (
            <>
              <MensajeAviso
                icono="info"
                titulo={T.apagado.titulo}
                texto={T.apagado.texto}
                accion={
                  <Link to={esp.R.semana} className="boton boton--secundario">
                    {T.apagado.ir}
                  </Link>
                }
              />
              {a.consultas.length > 0 && <Conversacion consultas={a.consultas} />}
            </>
          ) : !autorizado || cambiando ? (
            <>
              {k?.retiradoEn && !cambiando && (
                <MensajeAviso
                  icono="info"
                  titulo={T.retirado.titulo}
                  texto={T.retirado.texto(fechaLarga(diaDe(k.retiradoEn, esp.participante.zonaHoraria)))}
                />
              )}
              <Consentimiento
                inicial={k && autorizado ? k : { metas: false, acciones: false, registroSemanal: false }}
                cambio={cambiando}
                alListo={() => {
                  setCambiando(false);
                  if (!esp.real) setAceptadaPrevia(true);
                }}
              />
              {a.consultas.length > 0 && <Conversacion consultas={a.consultas} />}
            </>
          ) : (
            <Chat datos={a} puedePreguntar={puedePreguntar} enCurso={enCurso} />
          )}
        </div>

        <aside className="as-lateral" aria-label={T.info.titulo}>
          {puedePreguntar && <Ejemplos />}
          {a?.disponible && autorizado && !cambiando && <LoQueCompartes datos={a} alCambiar={() => setCambiando(true)} />}
          <section className="rc-tarjeta as-info" id="as-info" aria-labelledby="as-info-t" tabIndex={-1}>
            <h2 id="as-info-t" className="rc-h2 as-h2">
              <Icono nombre="info" tamaño={20} />
              {T.info.titulo}
            </h2>
            <ul className="as-info__lista">
              {T.info.puntos.map((p) => (
                <li key={p.texto}>
                  <Icono nombre={p.icono as NombreIconoApp} tamaño={20} />
                  <span>{p.texto}</span>
                </li>
              ))}
            </ul>
          </section>
          <Crisis />
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Chat({ datos, puedePreguntar, enCurso }: { datos: DatosAsistente; puedePreguntar: boolean; enCurso: boolean }) {
  const [texto, setTexto] = useState("");
  const campo = useRef<HTMLTextAreaElement>(null);
  const preparar = (t: string) => {
    setTexto(t.slice(0, MAX));
    campo.current?.focus();
  };
  return (
    <>
      <Conversacion consultas={datos.consultas} onSeguir={puedePreguntar ? preparar : undefined} />
      {!enCurso ? (
        <MensajeAviso icono="info" titulo={T.sinCiclo.titulo} texto={T.sinCiclo.texto} />
      ) : (
        <Escribir texto={texto} setTexto={setTexto} campo={campo} />
      )}
    </>
  );
}

function Conversacion({ consultas, onSeguir }: { consultas: ConsultaAsistente[]; onSeguir?: (t: string) => void }) {
  const esp = useEspacio();
  const zona = esp.participante.zonaHoraria;
  const lista = [...consultas].reverse(); // la base las entrega de la más nueva a la más antigua
  const ultimaAprobada = [...lista].reverse().find((c) => c.estado === "aprobada")?.id;
  return (
    <section className="rc-tarjeta as-chat" aria-labelledby="as-chat-t">
      <h2 id="as-chat-t" className="sr-only">
        {T.conversacion}
      </h2>
      {lista.length === 0 ? (
        <div className="as-vacia">
          <span className="rc-icono" aria-hidden="true">
            <Icono nombre="sprout" tamaño={22} />
          </span>
          <h3 className="rc-h3">{T.vacia.titulo}</h3>
          <p>{T.vacia.texto}</p>
        </div>
      ) : (
        <ol className="as-mensajes">
          {lista.map((c, i) => {
            const dia = diaDe(c.creadaEn, zona);
            const diaAnterior = i > 0 ? diaDe(lista[i - 1].creadaEn, zona) : null;
            return (
              <li key={c.id} className="as-par">
                {dia !== diaAnterior && <p className="as-dia">{dia === esp.hoy ? "Hoy" : fechaLarga(dia)}</p>}
                <div className="as-burbuja as-burbuja--tu">
                  <span className="sr-only">{T.tu}: </span>
                  <p className="as-texto">{c.pregunta}</p>
                  <span className="as-hora">{horaDe(c.creadaEn, zona)}</span>
                </div>
                <Respuesta c={c} onSeguir={c.id === ultimaAprobada ? onSeguir : undefined} />
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function Respuesta({ c, onSeguir }: { c: ConsultaAsistente; onSeguir?: (t: string) => void }) {
  const esp = useEspacio();
  const zona = esp.participante.zonaHoraria;
  const corta = c.pregunta.length > 60 ? `${c.pregunta.slice(0, 57)}…` : c.pregunta;
  if (c.estado === "aprobada")
    return (
      <div className="as-respuesta">
        <span className="as-avatar" aria-hidden="true">
          <Icono nombre="sprout" tamaño={22} />
        </span>
        <div className="as-burbuja as-burbuja--ia">
          <span className="sr-only">{T.asistente}: </span>
          <p className="as-texto">{c.respuesta}</p>
          <p className="as-pie">
            <span className="as-revisada">
              <Icono nombre="check" tamaño={16} />
              {T.estados.aprobada.etiqueta}
            </span>
            {c.revisadaEn && <span className="as-hora">{horaDe(c.revisadaEn, zona)}</span>}
          </p>
          {onSeguir && (
            <div className="as-seguir">
              <button type="button" className="as-chip" onClick={() => onSeguir(T.seguir.preguntaMasIdeas(corta))}>
                <Icono nombre="sparkles" tamaño={16} />
                {T.seguir.masIdeas}
              </button>
              <button type="button" className="as-chip" onClick={() => onSeguir(T.seguir.preguntaProfundizar(corta))}>
                <Icono nombre="message-circle" tamaño={16} />
                {T.seguir.profundizar}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  const e = T.estados[c.estado];
  return (
    <div className={`as-respuesta as-respuesta--${c.estado}`}>
      <span className="as-avatar" aria-hidden="true">
        <Icono nombre={c.estado === "crisis" ? "heart" : c.estado === "en_revision" ? "clock" : "info"} tamaño={20} />
      </span>
      <div className="as-burbuja as-burbuja--estado">
        <p className="as-etiqueta">{e.etiqueta}</p>
        <p>{e.texto}</p>
        {c.estado === "crisis" && <Lineas />}
      </div>
    </div>
  );
}

function Escribir({ texto, setTexto, campo }: { texto: string; setTexto: (t: string) => void; campo: React.RefObject<HTMLTextAreaElement | null> }) {
  const esp = useEspacio();
  const [estado, setEstado] = useState<"" | "enviando" | "enviada" | "corta" | keyof typeof T.errores>("");
  const limpio = texto.trim();
  const enviar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (estado === "enviando") return; // sin dobles envíos
    if (limpio.length < 3) return setEstado("corta");
    if (esp.real && typeof navigator !== "undefined" && !navigator.onLine) return setEstado("sinConexion");
    if (!esp.servidor) {
      setTexto("");
      return setEstado("enviada");
    }
    setEstado("enviando");
    try {
      await esp.servidor.preguntarAsistente(limpio);
      setTexto("");
      setEstado("enviada");
    } catch (e) {
      const clave = e instanceof ErrorBase ? `${e.campo}:${e.codigo}` : "";
      setEstado(
        clave === "ia:demasiadas"
          ? "demasiadas"
          : clave === "ciclo:no_activo"
            ? "ciclo"
            : clave === "ia:apagada" || clave === "modulo:no_disponible" || clave === "ia:sin_consentimiento"
              ? "apagado"
              : "conexion",
      );
    }
  };
  const mensaje =
    estado === "enviada" ? T.enviadaAviso : estado === "corta" ? T.muyCorta : estado && estado !== "enviando" ? T.errores[estado] : "";
  const esError = estado !== "enviada" && !!mensaje;
  return (
    <form className="as-escribir" onSubmit={(e) => void enviar(e)}>
      <label htmlFor="as-pregunta" className="sr-only">
        {T.escribir}
      </label>
      <div className="as-escribir__caja">
        <textarea
          id="as-pregunta"
          ref={campo}
          rows={2}
          maxLength={MAX}
          value={texto}
          placeholder={T.placeholder}
          aria-describedby="as-pregunta-largo as-pregunta-estado"
          aria-invalid={estado === "corta" || undefined}
          onChange={(e) => {
            setTexto(e.target.value);
            if (estado !== "enviando") setEstado("");
          }}
        />
        <button type="submit" className="as-enviar" aria-label={estado === "enviando" ? T.enviando : T.enviar} disabled={estado === "enviando"}>
          <Icono nombre="send" tamaño={20} />
        </button>
      </div>
      <p id="as-pregunta-largo" className="as-largo">
        {T.largo(texto.length)}
      </p>
      <p id="as-pregunta-estado" className={esError ? "as-estado as-estado--error" : "as-estado"} role="status">
        {mensaje}
      </p>
      <p className="as-aviso-pie">{T.pie}</p>
    </form>
  );
}

function Ejemplos() {
  const elegir = (t: string) => {
    const campo = document.getElementById("as-pregunta") as HTMLTextAreaElement | null;
    if (!campo) return;
    // Mismo camino que escribir: React recibe el cambio y la persona revisa antes de enviar.
    const poner = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    poner?.call(campo, t);
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    campo.focus();
  };
  return (
    <section className="rc-tarjeta as-ejemplos" aria-labelledby="as-ejemplos-t">
      <h2 id="as-ejemplos-t" className="rc-h2 as-h2">
        <Icono nombre="lightbulb" tamaño={20} />
        {T.ejemplos.titulo}
      </h2>
      <ul>
        {T.ejemplos.lista.map((e) => (
          <li key={e}>
            <button type="button" className="as-ejemplo" onClick={() => elegir(e)}>
              <span>{e}</span>
              <Icono nombre="chevron-right" tamaño={16} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Consentimiento({ inicial, cambio, alListo }: { inicial: ContextoAsistente; cambio: boolean; alListo: () => void }) {
  const esp = useEspacio();
  const [c, setC] = useState<ContextoAsistente>(inicial);
  const [estado, setEstado] = useState<"" | "guardando" | "error">("");
  useEffect(() => setC(inicial), [inicial]);
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (cambio) titulo.current?.focus();
  }, [cambio]);
  const aceptar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!esp.servidor) return alListo();
    setEstado("guardando");
    try {
      await esp.servidor.aceptarAsistente(c);
      setEstado("");
      alListo();
    } catch {
      setEstado("error");
    }
  };
  const opciones: (keyof ContextoAsistente)[] = ["metas", "acciones", "registroSemanal"];
  return (
    <form className="rc-tarjeta as-consentimiento" onSubmit={(e) => void aceptar(e)} aria-labelledby="as-cons-t">
      <h2 id="as-cons-t" className="rc-h2" ref={titulo} tabIndex={-1}>
        {cambio ? T.ajustes.titulo : T.consentimiento.titulo}
      </h2>
      {!cambio && (
        <>
          <p>{T.consentimiento.intro}</p>
          <ul className="as-consentimiento__puntos">
            {T.consentimiento.puntos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      )}
      <fieldset className="as-contexto">
        <legend className="rc-h3">{T.consentimiento.contexto}</legend>
        <p>{T.consentimiento.contextoAyuda}</p>
        {opciones.map((o) => (
          <label key={o} className="as-opcion">
            <input type="checkbox" checked={c[o]} onChange={(e) => setC({ ...c, [o]: e.target.checked })} />
            <span>
              <span className="as-opcion__titulo">{T.consentimiento.opciones[o].titulo}</span>
              <span className="as-opcion__texto">{T.consentimiento.opciones[o].texto}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="acciones">
        <button type="submit" className="boton boton--primario" disabled={estado === "guardando"}>
          {estado === "guardando" ? T.consentimiento.aceptando : cambio ? T.consentimiento.guardar : T.consentimiento.aceptar}
        </button>
        {cambio && (
          <button type="button" className="boton boton--secundario" onClick={alListo}>
            {T.ajustes.confirmarNo}
          </button>
        )}
      </div>
      <p className="as-estado as-estado--error" role="status">
        {estado === "error" ? T.consentimiento.error : ""}
      </p>
    </form>
  );
}

function LoQueCompartes({ datos, alCambiar }: { datos: DatosAsistente; alCambiar: () => void }) {
  const esp = useEspacio();
  const k = datos.consentimiento!;
  const [paso, setPaso] = useState<"" | "confirmar" | "retirando" | "error">("");
  const elegidos = (["metas", "acciones", "registroSemanal"] as const).filter((o) => k[o]).map((o) => T.consentimiento.opciones[o].titulo);
  const retirar = async () => {
    if (!esp.servidor) return setPaso("");
    setPaso("retirando");
    try {
      await esp.servidor.retirarAsistente();
      setPaso("");
    } catch {
      setPaso("error");
    }
  };
  return (
    <section className="rc-tarjeta as-comparte" aria-labelledby="as-comparte-t">
      <h2 id="as-comparte-t" className="rc-h2 as-h2">
        <Icono nombre="shield-check" tamaño={20} />
        {T.ajustes.titulo}
      </h2>
      {k.aceptadoEn && <p>{T.ajustes.autorizadoEl(fechaLarga(diaDe(k.aceptadoEn, esp.participante.zonaHoraria)))}</p>}
      <p>{elegidos.length ? T.ajustes.con(elegidos.join(", ").toLowerCase()) : T.ajustes.nada}</p>
      {paso === "confirmar" || paso === "retirando" ? (
        <div className="as-confirmar" role="group" aria-label={T.ajustes.retirar}>
          <p>{T.ajustes.confirmar}</p>
          <div className="acciones">
            <button type="button" className="boton boton--secundario" onClick={() => void retirar()} disabled={paso === "retirando"}>
              {paso === "retirando" ? T.ajustes.retirando : T.ajustes.confirmarSi}
            </button>
            <button type="button" className="boton boton--terciario" onClick={() => setPaso("")}>
              {T.ajustes.confirmarNo}
            </button>
          </div>
        </div>
      ) : (
        <div className="as-comparte__acciones">
          <button type="button" className="enlace-util" onClick={alCambiar}>
            <Icono nombre="pencil" tamaño={16} />
            {T.ajustes.cambiar}
          </button>
          <button type="button" className="enlace-util" onClick={() => setPaso("confirmar")}>
            <Icono nombre="ban" tamaño={16} />
            {T.ajustes.retirar}
          </button>
        </div>
      )}
      {paso === "error" && (
        <p className="as-estado as-estado--error" role="alert">
          {T.ajustes.error}
        </p>
      )}
    </section>
  );
}

function Crisis() {
  return (
    <section className="rc-tarjeta as-crisis" aria-labelledby="as-crisis-t">
      <h2 id="as-crisis-t" className="rc-h2 as-h2">
        <Icono nombre="phone" tamaño={20} />
        {T.crisis.titulo}
      </h2>
      <p>{T.crisis.bajada}</p>
      <Lineas />
    </section>
  );
}

// *4141 sin enlace (se marca desde el celular); el resto con tel:. Las mismas de Ayuda inmediata.
function Lineas() {
  return (
    <ul className="as-lineas">
      {recursosAyuda()
        .slice(0, 2)
        .map((r) => (
          <li key={r.numero}>
            {r.tel ? (
              <a href={r.tel} className="as-linea__numero">
                {r.numero}
              </a>
            ) : (
              <span className="as-linea__numero">{r.numero}</span>
            )}
            <span className="as-linea__nombre">{r.nombre}</span>
          </li>
        ))}
    </ul>
  );
}
