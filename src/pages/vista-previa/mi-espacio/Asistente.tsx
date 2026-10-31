// Asistente de Rumbo (maqueta de ChatGPT, 30-oct-2026). Usa lo que ya está en la base (E2):
//   · ia_disponible: el dueño lo encendió, hay clave y el módulo «asistente_ia» está visible.
//   · Consentimiento (ia_guardar_consentimiento / ia_retirar_consentimiento) con el contexto que la
//     persona elige: metas, acciones de la semana, último registro semanal.
//   · ia_preguntar: la pregunta va a la IA con ese contexto; si sugiere riesgo NO se envía (crisis).
//   · mis_consultas_ia: la persona nunca ve borradores; la respuesta aparece solo cuando su coach la
//     aprobó (tal cual o corregida). «Más ideas» y «Profundizar» preparan una pregunta nueva.
// Ayuda en crisis siempre visible, aunque el asistente esté apagado. Maqueta definitiva (31-oct):
// bienvenida, autorización, enviada, aprobada, no compartida, Mis conversaciones, configuración y
// desactivado. «Crear plan» prepara una pregunta que también revisa el coach: nunca cambia el plan.
// Sin «Me sirvió» ni «No me sirvió» (no hay dónde guardarlo sin una migración). En la vista previa
// nada se envía.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Icono, type NombreIconoApp } from "../../../components/app";
import { recursosAyuda } from "../../../data/rumbo";
import { diaCorto, fechaLarga, mayuscula } from "../../../lib/fechas";
import { ErrorBase } from "../../../lib/supabase";
import { diaDe, horaDe } from "./avisos/datos";
import { EtiquetaEjemplo, MensajeAviso, useEspacio } from "./comun";
import { ASISTENTE_HISTORIAL, ASISTENTE_NO_COMPARTIDA, type Asistente as DatosAsistente, type ConsultaAsistente, type ContextoAsistente, type ValoracionAsistente } from "./espacio";
import portada1200 from "../../../assets/asistente/portada-1200.webp";
import portada2400 from "../../../assets/asistente/portada-2400.webp";
import portadaMovil600 from "../../../assets/asistente/portada-movil-600.webp";
import portadaMovil1146 from "../../../assets/asistente/portada-movil-1146.webp";
import bienvenida600 from "../../../assets/asistente/bienvenida-600.webp";
import bienvenida1200 from "../../../assets/asistente/bienvenida-1200.webp";
import desactivado400 from "../../../assets/asistente/desactivado-400.webp";
import desactivado800 from "../../../assets/asistente/desactivado-800.webp";
import type { PropsPantalla } from "../registro";
import { T_ASISTENTE as T } from "./textos";

const MAX = 1000;

type Vista = "chat" | "conversaciones" | "configuracion";

export default function Asistente({ estado }: PropsPantalla) {
  const esp = useEspacio();
  const { search } = useLocation();
  const navegar = useNavigate();
  const [aceptadaPrevia, setAceptadaPrevia] = useState(false);
  const a = asistenteDe(esp.real, esp.asistente, estado, aceptadaPrevia);
  // Vista: la conversación, «Mis conversaciones» o la configuración (?ver=…; se puede volver atrás).
  const ver = new URLSearchParams(search).get("ver");
  const porEstado: Vista = !esp.real && (estado === "conversaciones" || estado === "configuracion") ? estado : "chat";
  const vista: Vista = ver === "conversaciones" || ver === "configuracion" || ver === "chat" ? ver : porEstado;
  // En la vista previa, «volver» necesita ?ver=chat porque la ruta ya abre otra vista.
  const irA = (v: Vista) => navegar({ search: v === "chat" && porEstado === "chat" ? "" : `?ver=${v}` });
  const [cambiando, setCambiando] = useState(false); // el formulario de consentimiento abierto a pedido
  const [comenzar, setComenzar] = useState(!esp.real && estado === "consentimiento"); // de la bienvenida a la autorización
  const k = a?.consentimiento;
  const autorizado = !!k?.aceptadoEn && !k.retiradoEn;
  const enCurso = esp.ciclo.estado === "en_curso";
  const puedePreguntar = !!a?.disponible && autorizado && enCurso && !cambiando;
  const abrirAutorizacion = () => {
    setComenzar(true);
    setCambiando(false);
    if (vista !== "chat") irA("chat");
  };

  let principal: React.ReactNode;
  if (a === null)
    principal = (
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
    );
  else if (!a.disponible)
    // Apagado por el equipo (dueño, clave o módulo): la persona no puede activarlo.
    principal = (
      <>
        <Desactivado titulo={T.apagado.titulo} texto={T.apagado.texto} accion={<Link to={esp.R.semana} className="boton boton--secundario">{T.apagado.ir}</Link>} />
        {a.consultas.length > 0 && <Conversacion consultas={a.consultas} />}
      </>
    );
  else if (cambiando || (!autorizado && comenzar))
    principal = (
      <Consentimiento
        inicial={k && autorizado ? k : { metas: false, acciones: false, registroSemanal: false }}
        cambio={cambiando}
        alListo={() => {
          setCambiando(false);
          setComenzar(false);
          if (!esp.real) setAceptadaPrevia(true);
        }}
      />
    );
  else if (!k?.aceptadoEn) principal = <Bienvenida alComenzar={() => setComenzar(true)} />;
  else if (k.retiradoEn)
    // La persona retiró su autorización: puede volver a activarlo. Lo anterior sigue a la vista.
    principal = (
      <>
        <Desactivado
          titulo={T.desactivado.titulo}
          texto={T.desactivado.texto}
          detalle={T.retirado.texto(fechaLarga(diaDe(k.retiradoEn, esp.participante.zonaHoraria)))}
          accion={
            <>
              <button type="button" className="boton boton--primario" onClick={abrirAutorizacion}>
                {T.desactivado.activar}
              </button>
              <a href="#as-info" className="enlace-util">
                {T.desactivado.saberMas}
              </a>
            </>
          }
        />
        {a.consultas.length > 0 && <Conversacion consultas={a.consultas} />}
      </>
    );
  else if (vista === "conversaciones") principal = <Historial consultas={a.consultas} alVolver={() => irA("chat")} />;
  else if (vista === "configuracion")
    principal = (
      <Configuracion
        datos={a}
        alVolver={() => irA("chat")}
        alCambiar={() => {
          setCambiando(true);
          irA("chat");
        }}
        alVerConversaciones={() => irA("conversaciones")}
      />
    );
  else principal = <Chat datos={a} puedePreguntar={puedePreguntar} enCurso={enCurso} irA={irA} />;

  const conLateral = !!a?.disponible && autorizado && !cambiando;
  return (
    <div className="me-pantalla as">
      <header className="rc-portada as-portada">
        {/* Ilustraciones definitivas de ChatGPT (31-oct-2026): panorámica en escritorio, recorte propio en móvil. */}
        <picture>
          <source media="(min-width: 1024px)" srcSet={`${portada1200} 1200w, ${portada2400} 2400w`} sizes="(min-width: 1024px) 70vw, 100vw" />
          <img
            className="rc-portada__fondo as-portada__img"
            src={portadaMovil1146}
            srcSet={`${portadaMovil600} 600w, ${portadaMovil1146} 1146w`}
            sizes="100vw"
            width={1146}
            height={500}
            alt=""
            decoding="async"
            fetchPriority="high"
          />
        </picture>
        <div className="rc-portada__texto">
          <h1 className="rc-portada__h1">{T.titulo}</h1>
          <p className="as-sellos">
            <span className="as-beta">{T.beta}</span>
            <span className="as-supervision">{T.supervision}</span>
            <EtiquetaEjemplo />
          </p>
          <p className="rc-portada__bajada">{T.bajada}</p>
        </div>
      </header>

      <ul className="as-claves" aria-label={T.titulo}>
        {T.claves.map((c, i) => (
          <li key={c.texto} className={`as-clave as-clave--${i + 1}`}>
            <span className="as-clave__icono" aria-hidden="true">
              <Icono nombre={c.icono as NombreIconoApp} tamaño={22} />
            </span>
            {c.texto}
          </li>
        ))}
      </ul>
      <p className="as-revisa">
        <span className="as-revisa__icono" aria-hidden="true">
          <Icono nombre="user-round" tamaño={22} />
        </span>
        <span>
          {T.revisaCoach}{" "}
          <a href="#as-info" className="enlace-flecha">
            {T.saberMas}
            <Icono nombre="arrow-right" tamaño={16} />
          </a>
        </span>
      </p>

      <div className="as-cuerpo">
        <div className="as-principal">{principal}</div>

        <aside className="as-lateral" aria-label={T.info.titulo}>
          {puedePreguntar && vista === "chat" && <Ejemplos />}
          {conLateral && <LoQueCompartes datos={a!} alCambiar={() => setCambiando(true)} />}
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

// Vista previa: cada estado de la maqueta con datos de ejemplo (en Mi espacio real, los de la base).
function asistenteDe(real: boolean, base: DatosAsistente | null, estado: string | undefined, aceptadaPrevia: boolean): DatosAsistente | null {
  if (real || !base) return base;
  const sinAutorizar = { ...base, consentimiento: aceptadaPrevia ? base.consentimiento : null, consultas: [] };
  switch (estado) {
    case "bienvenida":
    case "consentimiento":
      return sinAutorizar;
    case "apagado":
      return { ...base, disponible: false, consultas: [] };
    case "desactivado":
      return aceptadaPrevia ? base : { ...base, consentimiento: { ...base.consentimiento!, metas: false, acciones: false, registroSemanal: false, retiradoEn: "2026-10-14T12:00:00Z" } };
    case "enviada":
      return { ...base, consultas: base.consultas.filter((c) => c.estado === "en_revision") };
    case "aprobada":
      return { ...base, consultas: base.consultas.filter((c) => c.estado === "aprobada") };
    case "no-compartida":
      return { ...base, consultas: ASISTENTE_NO_COMPARTIDA };
    case "conversaciones":
      return { ...base, consultas: ASISTENTE_HISTORIAL };
    default:
      return base;
  }
}

function Chat({ datos, puedePreguntar, enCurso, irA }: { datos: DatosAsistente; puedePreguntar: boolean; enCurso: boolean; irA: (v: Vista) => void }) {
  const [texto, setTexto] = useState("");
  const campo = useRef<HTMLTextAreaElement>(null);
  const preparar = (t: string) => {
    setTexto(t.slice(0, MAX));
    campo.current?.focus();
  };
  return (
    <>
      <Conversacion
        consultas={datos.consultas}
        onSeguir={puedePreguntar ? preparar : undefined}
        onNueva={puedePreguntar ? () => campo.current?.focus() : undefined}
        pie={
          !enCurso ? (
            <MensajeAviso icono="info" titulo={T.sinCiclo.titulo} texto={T.sinCiclo.texto} />
          ) : (
            <Escribir texto={texto} setTexto={setTexto} campo={campo} />
          )
        }
        barra={
          <nav className="as-barra" aria-label={T.configuracion.titulo}>
            <button type="button" className="enlace-util" onClick={() => irA("conversaciones")}>
              <Icono nombre="clock" tamaño={16} />
              {T.historial.abrir}
            </button>
            <button type="button" className="enlace-util" onClick={() => irA("configuracion")}>
              <Icono nombre="settings" tamaño={16} />
              {T.configuracion.abrir}
            </button>
          </nav>
        }
      />
    </>
  );
}

function Conversacion({
  consultas,
  onSeguir,
  onNueva,
  barra,
  pie,
}: {
  consultas: ConsultaAsistente[];
  onSeguir?: (t: string) => void;
  onNueva?: () => void;
  barra?: React.ReactNode;
  pie?: React.ReactNode;
}) {
  const esp = useEspacio();
  const zona = esp.participante.zonaHoraria;
  const lista = [...consultas].reverse(); // la base las entrega de la más nueva a la más antigua
  const ultimaAprobada = [...lista].reverse().find((c) => c.estado === "aprobada")?.id;
  // «Tu coach ya revisó la respuesta»: solo sobre la consulta más reciente, si está aprobada.
  const recienRevisada = lista.length > 0 && lista[lista.length - 1].estado === "aprobada" ? lista[lista.length - 1].id : null;
  const yo = iniciales(esp.participante.nombre);
  return (
    <section className="rc-tarjeta as-chat" aria-labelledby="as-chat-t">
      <div className="as-chat__cabeza">
        <h2 id="as-chat-t" className="sr-only">
          {T.conversacion}
        </h2>
        {barra}
      </div>
      {lista.length === 0 ? (
        <div className="as-vacia">
          <span className="as-avatar" aria-hidden="true">
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
              <li key={c.id} id={`as-c-${c.id}`} className="as-par" tabIndex={-1}>
                {dia !== diaAnterior && <p className="as-dia">{dia === esp.hoy ? "Hoy" : mayuscula(fechaLarga(dia))}</p>}
                <div className="as-pregunta">
                  <div className="as-burbuja as-burbuja--tu">
                    <span className="sr-only">{T.tu}: </span>
                    <p className="as-texto">{c.pregunta}</p>
                    <span className="as-hora">{horaDe(c.creadaEn, zona)}</span>
                  </div>
                  <span className="as-yo" aria-hidden="true">
                    {yo}
                  </span>
                </div>
                {c.id === recienRevisada && (
                  <p className="as-lista">
                    <Icono nombre="sprout" tamaño={20} />
                    <span>
                      <strong>{T.lista.titulo}</strong> {T.lista.texto}
                    </span>
                  </p>
                )}
                <Respuesta c={c} onSeguir={c.id === ultimaAprobada ? onSeguir : undefined} onNueva={onNueva} />
              </li>
            );
          })}
        </ol>
      )}
      {pie}
    </section>
  );
}

// «Me sirvió» / «No me sirvió» (maqueta definitiva). Una valoración vigente por respuesta aprobada:
// tocar la elegida la quita; «No me sirvió» admite un comentario opcional. Si la base todavía no
// tiene ia_valoraciones (migración 20261127000000 sin aplicar), no se muestra nada.
function Valorar({ consulta }: { consulta: string }) {
  const esp = useEspacio();
  const guardadas = esp.asistente?.valoraciones;
  const [local, setLocal] = useState<ValoracionAsistente | null | undefined>(undefined);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean }>({ texto: "" });
  const [ocupado, setOcupado] = useState(false);
  if (!guardadas) return null;
  const actual = local !== undefined ? local : (guardadas[consulta] ?? null);
  const guardar = async (util: boolean | null, m: string | null, texto: string) => {
    setOcupado(true);
    try {
      if (esp.servidor) await esp.servidor.valorarAsistente(consulta, util, m);
      setLocal(util === null ? null : { util, motivo: util ? null : m?.trim() || null });
      setAviso({ texto });
    } catch {
      setAviso({ texto: T.valorar.error, error: true });
    } finally {
      setOcupado(false);
    }
  };
  const elegir = (util: boolean) => {
    setMotivo(null);
    if (actual?.util === util) return void guardar(null, null, T.valorar.quitada);
    void guardar(util, null, T.valorar.gracias);
  };
  const idMotivo = `as-motivo-${consulta}`;
  return (
    <>
      <div className="as-valorar" role="group" aria-label={T.valorar.grupo}>
        <button type="button" className="as-chip" aria-pressed={actual?.util === true} disabled={ocupado} onClick={() => elegir(true)}>
          <Icono nombre="thumbs-up" tamaño={16} className="as-chip__sol" />
          {T.valorar.sirvio}
        </button>
        <button type="button" className="as-chip" aria-pressed={actual?.util === false} disabled={ocupado} onClick={() => elegir(false)}>
          <Icono nombre="thumbs-down" tamaño={16} className="as-chip__sol" />
          {T.valorar.noSirvio}
        </button>
      </div>
      {actual?.util === false && (
        <form
          className="as-motivo"
          data-formulario-largo
          onSubmit={(e) => {
            e.preventDefault();
            void guardar(false, motivo ?? actual.motivo, T.valorar.motivoGuardado);
          }}
        >
          <label htmlFor={idMotivo}>{T.valorar.motivo}</label>
          <textarea
            id={idMotivo}
            rows={2}
            maxLength={300}
            value={motivo ?? actual.motivo ?? ""}
            onChange={(e) => setMotivo(e.target.value)}
            aria-describedby={`${idMotivo}-ayuda`}
          />
          <p id={`${idMotivo}-ayuda`} className="as-largo">
            {T.valorar.motivoAyuda}
          </p>
          <button type="submit" className="boton boton--secundario" disabled={ocupado}>
            {T.valorar.guardarMotivo}
          </button>
        </form>
      )}
      <p className={`as-estado${aviso.error ? " as-estado--error" : ""}`} role="status">
        {aviso.texto}
      </p>
    </>
  );
}

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

// La respuesta aprobada, con sus listas numeradas o con viñetas como listas de verdad.
function TextoRespuesta({ texto }: { texto: string }) {
  const bloques: ({ tipo: "p"; texto: string } | { tipo: "ol" | "ul"; items: string[] })[] = [];
  for (const linea of texto.split("\n")) {
    const l = linea.trim();
    if (!l) continue;
    const num = /^\d+[.)]\s+(.*)$/.exec(l);
    const vin = /^[-•*]\s+(.*)$/.exec(l);
    const tipo = num ? "ol" : vin ? "ul" : "p";
    const ultimo = bloques[bloques.length - 1];
    if (tipo === "p") bloques.push({ tipo: "p", texto: l });
    else if (ultimo && ultimo.tipo === tipo) ultimo.items.push((num ?? vin)![1]);
    else bloques.push({ tipo, items: [(num ?? vin)![1]] });
  }
  return (
    <div className="as-texto as-texto--ia">
      {bloques.map((b, i) =>
        b.tipo === "p" ? (
          <p key={i}>{b.texto}</p>
        ) : b.tipo === "ol" ? (
          <ol key={i}>
            {b.items.map((x, j) => (
              <li key={j}>{x}</li>
            ))}
          </ol>
        ) : (
          <ul key={i}>
            {b.items.map((x, j) => (
              <li key={j}>{x}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

function Respuesta({ c, onSeguir, onNueva }: { c: ConsultaAsistente; onSeguir?: (t: string) => void; onNueva?: () => void }) {
  const esp = useEspacio();
  const zona = esp.participante.zonaHoraria;
  const corta = c.pregunta.length > 60 ? `${c.pregunta.slice(0, 57)}…` : c.pregunta;
  if (c.estado === "aprobada")
    return (
      <>
        <div className="as-respuesta">
          <span className="as-avatar" aria-hidden="true">
            <Icono nombre="sprout" tamaño={24} />
          </span>
          <div className="as-burbuja as-burbuja--ia">
            <span className="sr-only">{T.asistente}: </span>
            <TextoRespuesta texto={c.respuesta ?? ""} />
            <p className="as-pie">
              <span className="as-revisada">
                <span className="as-revisada__marca" aria-hidden="true">
                  <Icono nombre="check" tamaño={12} />
                </span>
                {T.estados.aprobada.etiqueta}
              </span>
              {c.revisadaEn && <span className="as-hora">{horaDe(c.revisadaEn, zona)}</span>}
            </p>
          </div>
        </div>
        <div className="as-acciones">
        {onSeguir && (
          <div className="as-seguir" role="group" aria-label={T.seguir.titulo}>
            <button type="button" className="as-chip" onClick={() => onSeguir(T.seguir.preguntaMasIdeas(corta))}>
              <Icono nombre="sparkles" tamaño={16} className="as-chip__sol" />
              {T.seguir.masIdeas}
            </button>
            <button type="button" className="as-chip" onClick={() => onSeguir(T.seguir.preguntaCrearPlan(corta))}>
              <Icono nombre="calendar-days" tamaño={16} />
              {T.seguir.crearPlan}
            </button>
            <button type="button" className="as-chip" onClick={() => onSeguir(T.seguir.preguntaProfundizar(corta))}>
              <Icono nombre="message-circle" tamaño={16} />
              {T.seguir.profundizar}
            </button>
          </div>
        )}
          <Valorar consulta={c.id} />
        </div>
      </>
    );
  const e = T.estados[c.estado];
  if (c.estado === "en_revision")
    return (
      <div className="as-enviada" role="status">
        <span className="as-enviada__icono" aria-hidden="true">
          <Icono nombre="clock" tamaño={22} />
        </span>
        <p>
          <strong>{e.etiqueta}</strong>
          <span>{e.texto}</span>
        </p>
      </div>
    );
  if (c.estado === "descartada")
    return (
      <div className="as-no-compartida">
        <Icono nombre="circle-alert" tamaño={22} />
        <div>
          <p className="as-etiqueta">{e.etiqueta}</p>
          <p>{e.texto}</p>
          {onNueva && (
            <button type="button" className="boton boton--secundario as-no-compartida__boton" onClick={onNueva}>
              {T.nuevaPregunta}
            </button>
          )}
        </div>
      </div>
    );
  return (
    <div className={`as-respuesta as-respuesta--${c.estado}`}>
      <span className="as-avatar" aria-hidden="true">
        <Icono nombre={c.estado === "crisis" ? "heart" : "info"} tamaño={20} />
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
    <form className="as-escribir" data-formulario-largo onSubmit={(e) => void enviar(e)}>
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
  // Después del cambio de ruta (que mueve el foco al inicio), el foco va al título del formulario.
  useEffect(() => {
    const t = window.setTimeout(() => titulo.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, []);
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
        {cambio ? T.ajustes.cambiar : T.privacidad.titulo}
      </h2>
      {!cambio && <p>{T.privacidad.intro}</p>}
      <p className="as-consentimiento__resumen">
        <Icono nombre="shield-check" tamaño={20} />
        <span>{T.privacidad.resumen}</span>
      </p>
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
          {estado === "guardando" ? T.consentimiento.aceptando : cambio ? T.consentimiento.guardar : T.privacidad.aceptar}
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
      <details className="as-privacidad">
        <summary>{T.privacidad.saberMas}</summary>
        <ul className="as-consentimiento__puntos">
          {T.consentimiento.puntos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </details>
    </form>
  );
}

// Retirar la autorización (con confirmación): lo usan «Lo que compartes» y la configuración.
function useRetirar() {
  const esp = useEspacio();
  const [paso, setPaso] = useState<"" | "confirmar" | "retirando" | "error">("");
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
  const confirmacion =
    paso === "confirmar" || paso === "retirando" ? (
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
    ) : null;
  const error =
    paso === "error" ? (
      <p className="as-estado as-estado--error" role="alert">
        {T.ajustes.error}
      </p>
    ) : null;
  return { confirmando: confirmacion !== null, pedir: () => setPaso("confirmar"), confirmacion, error };
}

const compartido = (k: ContextoAsistente) => {
  const elegidos = (["metas", "acciones", "registroSemanal"] as const).filter((o) => k[o]).map((o) => T.consentimiento.opciones[o].titulo);
  return elegidos.length ? T.ajustes.con(elegidos.join(", ").toLowerCase()) : T.ajustes.nada;
};

function LoQueCompartes({ datos, alCambiar }: { datos: DatosAsistente; alCambiar: () => void }) {
  const esp = useEspacio();
  const k = datos.consentimiento!;
  const r = useRetirar();
  return (
    <section className="rc-tarjeta as-comparte" aria-labelledby="as-comparte-t">
      <h2 id="as-comparte-t" className="rc-h2 as-h2">
        <Icono nombre="shield-check" tamaño={20} />
        {T.ajustes.titulo}
      </h2>
      {k.aceptadoEn && <p>{T.ajustes.autorizadoEl(fechaLarga(diaDe(k.aceptadoEn, esp.participante.zonaHoraria)))}</p>}
      <p>{compartido(k)}</p>
      {r.confirmacion ?? (
        <div className="as-comparte__acciones">
          <button type="button" className="enlace-util" onClick={alCambiar}>
            <Icono nombre="pencil" tamaño={16} />
            {T.ajustes.cambiar}
          </button>
          <button type="button" className="enlace-util" onClick={r.pedir}>
            <Icono nombre="ban" tamaño={16} />
            {T.ajustes.retirar}
          </button>
        </div>
      )}
      {r.error}
    </section>
  );
}

// Estado 1 de la maqueta: primera visita, antes de cualquier autorización.
function Bienvenida({ alComenzar }: { alComenzar: () => void }) {
  return (
    <section className="rc-tarjeta as-bienvenida" aria-labelledby="as-bienvenida-t">
      <div className="as-bienvenida__ilustracion" aria-hidden="true">
        <img src={bienvenida1200} srcSet={`${bienvenida600} 600w, ${bienvenida1200} 1200w`} sizes="(min-width: 1024px) 560px, 100vw" width={1200} height={486} alt="" decoding="async" />
      </div>
      <div className="as-bienvenida__cuerpo">
        <h2 id="as-bienvenida-t" className="rc-h2">
          {T.bienvenida.titulo}
        </h2>
        <p>{T.bienvenida.texto}</p>
        <ul className="as-marcas">
          {T.bienvenida.puntos.map((p) => (
            <li key={p}>
              <span className="as-revisada__marca" aria-hidden="true">
                <Icono nombre="check" tamaño={12} />
              </span>
              {p}
            </li>
          ))}
        </ul>
        <button type="button" className="boton boton--primario boton--ancho" onClick={alComenzar}>
          {T.bienvenida.comenzar}
        </button>
      </div>
    </section>
  );
}

// Estado 8: desactivado por la persona (puede activarlo) o por el equipo (no puede).
function Desactivado({ titulo, texto, detalle, accion }: { titulo: string; texto: string; detalle?: string; accion: React.ReactNode }) {
  return (
    <section className="rc-tarjeta as-desactivado" aria-labelledby="as-desactivado-t">
      <div className="as-desactivado__ilustracion" aria-hidden="true">
        <img src={desactivado800} srcSet={`${desactivado400} 400w, ${desactivado800} 800w`} sizes="320px" width={800} height={388} alt="" decoding="async" />
      </div>
      <h2 id="as-desactivado-t" className="rc-h2">
        {titulo}
      </h2>
      <p>{texto}</p>
      {detalle && <p className="as-desactivado__detalle">{detalle}</p>}
      <div className="as-desactivado__acciones">{accion}</div>
    </section>
  );
}

// Estado 6: «Mis conversaciones», solo las propias (mis_consultas_ia), por fecha y con su estado.
function Historial({ consultas, alVolver }: { consultas: ConsultaAsistente[]; alVolver: () => void }) {
  const esp = useEspacio();
  const zona = esp.participante.zonaHoraria;
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => titulo.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, []);
  const lunes = (iso: string) => {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  };
  const estaSemana = lunes(esp.hoy);
  const pasada = (() => {
    const d = new Date(`${estaSemana}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 7);
    return d.toISOString().slice(0, 10);
  })();
  const grupo = (c: ConsultaAsistente): keyof typeof T.historial.grupos => {
    const dia = diaDe(c.creadaEn, zona);
    if (dia === esp.hoy) return "hoy";
    if (dia >= estaSemana) return "semana";
    if (dia >= pasada) return "pasada";
    return "antes";
  };
  const grupos = (Object.keys(T.historial.grupos) as (keyof typeof T.historial.grupos)[])
    .map((g) => ({ g, lista: consultas.filter((c) => grupo(c) === g) }))
    .filter((x) => x.lista.length > 0);
  return (
    <section className="rc-tarjeta as-historial" aria-labelledby="as-historial-t">
      <button type="button" className="enlace-util as-volver" onClick={alVolver}>
        <Icono nombre="arrow-left" tamaño={16} />
        {T.historial.volver}
      </button>
      <h2 id="as-historial-t" className="rc-h2" ref={titulo} tabIndex={-1}>
        {T.historial.titulo}
      </h2>
      {grupos.length === 0 ? (
        <p>{T.historial.vacio}</p>
      ) : (
        grupos.map(({ g, lista }) => (
          <section key={g} className="as-historial__grupo" aria-labelledby={`as-h-${g}`}>
            <h3 id={`as-h-${g}`} className="as-historial__dia">
              {T.historial.grupos[g]}
            </h3>
            <ul>
              {lista.map((c) => {
                const dia = diaDe(c.creadaEn, zona);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={`as-historial__fila as-historial__fila--${c.estado}`}
                      onClick={() => {
                        alVolver();
                        irAConsulta(c.id);
                      }}
                    >
                      <span className="as-historial__icono" aria-hidden="true">
                        <Icono nombre={c.estado === "aprobada" ? "sprout" : c.estado === "en_revision" ? "clock" : c.estado === "crisis" ? "heart" : "info"} tamaño={20} />
                      </span>
                      <span className="as-historial__texto">
                        <span className="as-historial__pregunta">{c.pregunta}</span>
                        <span className="as-historial__estado">{T.historial.estados[c.estado]}</span>
                      </span>
                      <span className="as-historial__hora">{dia === esp.hoy ? horaDe(c.creadaEn, zona) : diaCorto(dia)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}

// Al volver a la conversación, lleva a esa pregunta (cuando ya está en pantalla).
function irAConsulta(id: string, intentos = 10) {
  window.setTimeout(() => {
    const el = document.getElementById(`as-c-${id}`);
    if (!el) return intentos > 0 && irAConsulta(id, intentos - 1);
    el.scrollIntoView({ block: "start" });
    el.focus({ preventScroll: true });
  }, 120);
}

// Estado 7: configuración. El interruptor refleja la autorización real: apagarlo es retirarla (con
// confirmación) y encenderlo, volver a autorizar. No hay otro «apagado» propio de la persona.
function Configuracion({ datos, alVolver, alCambiar, alVerConversaciones }: { datos: DatosAsistente; alVolver: () => void; alCambiar: () => void; alVerConversaciones: () => void }) {
  const esp = useEspacio();
  const k = datos.consentimiento!;
  const r = useRetirar();
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => titulo.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <section className="rc-tarjeta as-config" aria-labelledby="as-config-t">
      <button type="button" className="enlace-util as-volver" onClick={alVolver}>
        <Icono nombre="arrow-left" tamaño={16} />
        {T.historial.volver}
      </button>
      <h2 id="as-config-t" className="rc-h2" ref={titulo} tabIndex={-1}>
        {T.configuracion.titulo}
      </h2>
      <div className="as-config__estado">
        <span className="as-avatar" aria-hidden="true">
          <Icono nombre="sprout" tamaño={22} />
        </span>
        <span className="as-config__nombre">
          <span id="as-config-nombre">{T.configuracion.interruptor}</span>
          <span className="as-config__activo">{T.configuracion.activado}</span>
        </span>
        <button type="button" role="switch" aria-checked={!r.confirmando} aria-labelledby="as-config-nombre" className="as-interruptor" onClick={r.pedir} disabled={r.confirmando} />
      </div>
      {r.confirmacion}
      {r.error}
      <p className="as-config__comparte">
        {k.aceptadoEn && `${T.ajustes.autorizadoEl(fechaLarga(diaDe(k.aceptadoEn, esp.participante.zonaHoraria)))} `}
        {compartido(k)}
      </p>
      <ul className="as-config__lista">
        <li>
          <button type="button" className="as-config__fila" onClick={alCambiar}>
            <Icono nombre="pencil" tamaño={20} />
            <span>{T.ajustes.cambiar}</span>
            <Icono nombre="chevron-right" tamaño={20} />
          </button>
        </li>
        <li>
          <button type="button" className="as-config__fila" onClick={r.pedir}>
            <Icono nombre="ban" tamaño={20} />
            <span>{T.ajustes.retirar}</span>
            <Icono nombre="chevron-right" tamaño={20} />
          </button>
        </li>
        <li>
          <button type="button" className="as-config__fila" onClick={alVerConversaciones}>
            <Icono nombre="clock" tamaño={20} />
            <span>{T.configuracion.verConversaciones}</span>
            <Icono nombre="chevron-right" tamaño={20} />
          </button>
        </li>
      </ul>
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
