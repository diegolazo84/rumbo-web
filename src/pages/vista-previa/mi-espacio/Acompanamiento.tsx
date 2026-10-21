// Mi acompañamiento con la referencia de ChatGPT (21-oct-2026, 21:35 UTC): el coach y la relación
// humana son lo principal. De arriba abajo:
//   · portada con paisaje, título, bajada, frase a mano y «Escribir a mi coach»;
//   · tu coach (nombre real de mi_coach, A3) con su mensaje de la semana como nota escrita a mano;
//   · cuatro acciones: registrar la semana, me está costando, la videollamada (plan cercano) o la
//     revisión escrita (plan con acompañamiento) y solicitar un ajuste;
//   · esta semana (acciones hechas y los siete días) y la próxima revisión, según el plan;
//   · historial reciente y, debajo, la semana completa con tu registro y la revisión (Semana.tsx).
//
// Todo sale de la plataforma; nada se inventa:
//   · coach = mi_coach() (nombre y presentación). Sin foto ni «En línea»: no existen en la base.
//     Sin coach asignado (o en la vista previa): «Tu coach» con avatar genérico.
//   · mensaje = foco de la última revisión publicada (lo escribe el coach), o el foco inicial.
//   · videollamada = tabla videollamadas (C2): la agenda el coach; la persona solo se une.
//   · historial = revisiones publicadas, solicitudes de ajuste y videollamadas, con su estado real.
// Sin «Nuevo»: lo visto se guarda solo en cada dispositivo (ver mi-acompanamiento/analisis-tecnico.md).
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { HojaAyuda, Icono, Ilustracion, type NombreIconoApp } from "../../../components/app";
import { cuentaComoHecha, type Escenario, type Revision } from "../../../data/ejemplo-app";
import { diaCorto, fechaLarga, mayuscula, nombreDia, numeroDia, rangoSemana, semanaDesde, type Iso } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { EtiquetaEjemplo, useEspacio } from "./comun";
import { HojaCostando, useProximaRevision } from "./Costando";
import type { VideollamadaEspacio } from "./espacio";
import Semana, { ESCENARIOS } from "./Semana";
import { T_ACOMPANAMIENTO as T, T_SECCIONES } from "./textos";

export default function Acompanamiento({ estado = "sin-enviar" }: PropsPantalla) {
  const esp = useEspacio();
  const { search } = useLocation();
  // Vista previa: el mismo día y la misma persona que el estado de la semana.
  const caso = esp.real ? null : (ESCENARIOS[estado] ?? ESCENARIOS["sin-enviar"]);
  const hoy = caso?.hoy ?? esp.hoy;
  const esc = caso?.esc ?? esp.esc;
  const [costando, setCostando] = useState(false);
  const [ayuda, setAyuda] = useState(false);

  return (
    <div className="me-pantalla me-acomp">
      <Portada />
      {!esp.real && <EtiquetaEjemplo />}
      <TuCoach hoy={hoy} esc={esc} />
      <Acciones hoy={hoy} esc={esc} onCostando={() => setCostando(true)} />
      <div className="me-acomp__fila">
        <EstaSemana hoy={hoy} esc={esc} />
        <ProximaRevision hoy={hoy} esc={esc} />
      </div>
      <Historial hoy={hoy} esc={esc} />

      {/* key: «Leer la revisión» cambia ?n= y la semana vuelve a leerlo. */}
      <div id="mis-semanas" className="me-acomp__semanas">
        <Semana key={search} estado={estado} />
      </div>

      <p className="me-acomp__cierre voz">{T.cierre}</p>

      <HojaCostando
        abierta={costando}
        hoy={hoy}
        esc={esc}
        ausencia={esp.real}
        onCerrar={() => setCostando(false)}
        onAyuda={() => {
          setCostando(false);
          setAyuda(true);
        }}
      />
      <HojaAyuda abierta={ayuda} onCerrar={() => setAyuda(false)} />
    </div>
  );
}

// Portada: el paisaje ocupa todo el ancho y el título va sobre él, como en la referencia.
// «Escribir a mi coach» lleva a tu registro de la semana, que es como se le escribe hoy (no hay chat).
function Portada() {
  return (
    <header className="me-acomp-portada">
      <Ilustracion nombre="atardecer" className="me-acomp-portada__fondo" />
      <div className="me-acomp-portada__texto">
        <h1 className="me-acomp-portada__h1">{T_SECCIONES.acompanamiento}</h1>
        <p className="me-acomp-portada__bajada">{T.portada.bajada}</p>
      </div>
      <p className="me-acomp-portada__mano mano" aria-hidden="true">
        {T.portada.mano}
      </p>
      <a href="#tu-registro" className="boton boton--primario me-acomp-portada__boton">
        <Icono nombre="message-circle" tamaño={20} />
        {T.portada.escribir}
      </a>
    </header>
  );
}

// Revisiones publicadas hasta hoy, de la más reciente a la más antigua.
const publicadas = (revs: Revision[], hoy: Iso) =>
  revs.filter((r) => r.publicadaEl && r.publicadaEl <= hoy).sort((a, b) => b.semana - a.semana);

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

// «Tu coach»: quién te acompaña (a la izquierda) y su mensaje de la semana como una nota escrita a
// mano (a la derecha en escritorio, debajo en móvil).
function TuCoach({ hoy, esc }: { hoy: Iso; esc: Escenario }) {
  const { semanaDelCiclo, focoDeLaSemana, coach } = useEspacio();
  const ultima = publicadas(esc.revisiones, hoy)[0];
  const foco = ultima?.foco || focoDeLaSemana(semanaDelCiclo(hoy), esc.revisiones, esc.focoInicial);
  return (
    <section className="me-coach" aria-labelledby="acomp-coach">
      <div className="me-coach__persona">
        <span className={`me-coach__avatar${coach ? " me-coach__avatar--letras" : ""}`} aria-hidden="true">
          {coach ? iniciales(coach.nombre) : <Icono nombre="user-round" tamaño={24} />}
        </span>
        <div className="me-coach__quien">
          {coach && <p className="me-coach__rotulo-coach">{T.coach.titulo}</p>}
          <h2 id="acomp-coach" className="me-coach__titulo">
            {coach?.nombre ?? T.coach.titulo}
          </h2>
          <p className="me-coach__presentacion">{coach?.presentacion ?? (coach ? T.coach.sinNombre : T.coach.quien)}</p>
        </div>
      </div>
      {foco && (
        <div className="me-coach__mensaje">
          <h3 className="me-coach__rotulo">{T.mensaje.rotulo}</h3>
          <blockquote className="me-coach__cita mano">
            <p>«{foco}»</p>
          </blockquote>
          <p className="me-coach__pie">
            {coach && <span className="me-coach__firma">{T.mensaje.firma(coach.nombre)}</span>}
            <span className="me-coach__fecha">{ultima?.publicadaEl ? mayuscula(diaCorto(ultima.publicadaEl)) : T.mensaje.inicial}</span>
            <Icono nombre="heart" tamaño={16} className="me-coach__corazon" />
          </p>
        </div>
      )}
    </section>
  );
}

// Videollamada de una semana (solo plan cercano). La que se canceló no cuenta como agendada.
function videollamadaDe(n: number, lista: VideollamadaEspacio[]) {
  return lista.find((v) => v.semana === n && v.estado !== "cancelada") ?? null;
}

const HORA_CHILE = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const FECHA_CHILE = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" });
const enChile = (ts: string) => ({ fecha: FECHA_CHILE.format(new Date(ts)) as Iso, hora: HORA_CHILE.format(new Date(ts)) });

type Accion = { id: string; icono: NombreIconoApp; titulo: string; texto: string; destacada?: boolean } & (
  | { tipo: "enlace"; href: string; externo?: boolean }
  | { tipo: "ruta"; to: string }
  | { tipo: "boton"; onClick: () => void }
);

// Las cuatro acciones de la referencia. La tercera depende del plan contratado: con videollamada,
// la de la semana (la agenda el coach; aquí solo se une la persona); por escrito, la última revisión.
function Acciones({ hoy, esc, onCostando }: { hoy: Iso; esc: Escenario; onCostando: () => void }) {
  const { R, real, videollamadas, semanaDelCiclo, fechaRevision } = useEspacio();
  const A = T.acciones;
  const n = semanaDelCiclo(hoy);
  const llamada = esc.plan === "cercano" ? videollamadaDe(n, videollamadas) : null;
  const ultima = publicadas(esc.revisiones, hoy)[0];
  const tercera: Accion =
    esc.plan === "cercano"
      ? llamada && llamada.estado === "programada"
        ? { id: "videollamada", tipo: "enlace", href: llamada.enlace, externo: true, icono: "video", titulo: A.videollamada.titulo, texto: A.videollamada.conEnlace }
        : { id: "videollamada", tipo: "enlace", href: "#acomp-proxima", icono: "video", titulo: A.videollamada.titulo, texto: A.videollamada.sinEnlace }
      : ultima
        ? {
            id: "revision",
            tipo: "ruta",
            to: real ? `${R.semana}?n=${ultima.semana}#lo-que-vimos` : `${R.semanaPublicada}#lo-que-vimos`,
            icono: "book-open",
            titulo: A.revision.titulo,
            texto: A.revision.texto,
          }
        : { id: "revision", tipo: "enlace", href: "#acomp-proxima", icono: "book-open", titulo: A.revision.titulo, texto: A.revision.sinRevision(diaCorto(fechaRevision(1, esc.diaRevision))) };
  const acciones: Accion[] = [
    { id: "registrar", tipo: "enlace", href: "#tu-registro", icono: "pen-line", titulo: A.registrar.titulo, texto: A.registrar.texto, destacada: true },
    { id: "costando", tipo: "boton", onClick: onCostando, icono: "smile", titulo: A.costando.titulo, texto: A.costando.texto },
    tercera,
    { id: "ajuste", tipo: "ruta", to: R.ajuste, icono: "sparkles", titulo: A.ajuste.titulo, texto: A.ajuste.texto },
  ];
  return (
    <nav className="me-acomp-acciones" aria-label={A.titulo}>
      <ul>
        {acciones.map((a) => {
          const clase = `me-acomp-accion${a.destacada ? " me-acomp-accion--destacada" : ""}`;
          const dentro = (
            <>
              <Icono nombre={a.icono} tamaño={24} className="me-acomp-accion__icono" />
              <span className="me-acomp-accion__titulo">{a.titulo}</span>
              <span className="me-acomp-accion__texto">
                {a.texto}
                {a.tipo === "enlace" && a.externo && <span className="sr-only">{T.proxima.nuevaVentana}</span>}
              </span>
            </>
          );
          return (
            <li key={a.id}>
              {a.tipo === "boton" ? (
                <button type="button" className={clase} aria-haspopup="dialog" onClick={a.onClick}>
                  {dentro}
                </button>
              ) : a.tipo === "ruta" ? (
                <Link to={a.to} className={clase}>
                  {dentro}
                </Link>
              ) : (
                <a href={a.href} className={clase} {...(a.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                  {dentro}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type EstadoDia = keyof typeof T.semana.dia;

// Esta semana: acciones vigentes hechas de lunes a domingo y un círculo por día.
function EstaSemana({ hoy, esc }: { hoy: Iso; esc: Escenario }) {
  const { semanaDelCiclo, lunesDeSemana, R } = useEspacio();
  const S = T.semana;
  const lunes = lunesDeSemana(semanaDelCiclo(hoy));
  const dias = semanaDesde(lunes);
  const delDia = (d: Iso) => esc.ocurrencias.filter((o) => o.vigente && o.fecha === d);
  const total = dias.reduce((s, d) => s + delDia(d).length, 0);
  const hechas = dias.reduce((s, d) => s + delDia(d).filter((o) => cuentaComoHecha(o.registro)).length, 0);
  const estadoDe = (d: Iso): EstadoDia => {
    const lista = delDia(d);
    if (lista.length === 0) return "sin";
    const h = lista.filter((o) => cuentaComoHecha(o.registro)).length;
    if (h === lista.length) return "completo";
    if (h > 0) return "parcial";
    return d > hoy ? "futuro" : "pendiente";
  };
  return (
    <section className="me-acomp-semana" aria-labelledby="acomp-semana">
      <div className="me-acomp-semana__cabeza">
        <div>
          <h2 id="acomp-semana" className="me-acomp-semana__titulo">
            {S.titulo}
          </h2>
          <p className="me-acomp-semana__rango">{rangoSemana(lunes)}</p>
        </div>
        {total > 0 ? (
          <div className="me-acomp-semana__avance">
            <p>{S.completadas(hechas, total)}</p>
            <span className="me-acomp-semana__barra" aria-hidden="true">
              <span style={{ inlineSize: `${Math.round((hechas / total) * 100)}%` }} />
            </span>
          </div>
        ) : (
          <p className="me-acomp-semana__avance">{S.sinAcciones}</p>
        )}
      </div>
      <ol className="me-acomp-semana__dias">
        {dias.map((d) => {
          const e = estadoDe(d);
          return (
            <li key={d} className={`me-acomp-dia me-acomp-dia--${e}`} aria-current={d === hoy ? "date" : undefined}>
              <span className="me-acomp-dia__circulo" aria-hidden="true">
                {e === "completo" && <Icono nombre="check" tamaño={16} trazo={3} />}
              </span>
              <span className="me-acomp-dia__nombre" aria-hidden="true">
                {mayuscula(nombreDia(d).slice(0, 3))}
              </span>
              <span className="me-acomp-dia__numero" aria-hidden="true">
                {numeroDia(d)}
              </span>
              <span className="sr-only">{`${mayuscula(fechaLarga(d))}: ${S.dia[e]}`}</span>
            </li>
          );
        })}
      </ol>
      <Link to={R.calendario} className="enlace-flecha me-acomp-semana__plan">
        {S.verPlan}
        <Icono nombre="arrow-right" tamaño={16} />
      </Link>
    </section>
  );
}

// Próxima revisión: fecha real del programa (con la ausencia del coach), la modalidad contratada y,
// en el plan cercano, la hora y el enlace que dejó el coach. La aclaración «no es un chat» va solo aquí.
function ProximaRevision({ hoy, esc }: { hoy: Iso; esc: Escenario }) {
  const { ciclo, real, videollamadas } = useEspacio();
  const { n, fecha } = useProximaRevision(hoy, esc, real);
  if (n > ciclo.semanas) return null;
  const P = T.proxima;
  const cercano = esc.plan === "cercano";
  const llamada = cercano ? videollamadaDe(n, videollamadas) : null;
  const agendada = llamada && llamada.estado === "programada" ? enChile(llamada.programadaPara) : null;
  const dia = agendada?.fecha ?? fecha;
  return (
    <section id="acomp-proxima" className="me-proxima" aria-labelledby="acomp-proxima-titulo">
      <span className="me-proxima__icono" aria-hidden="true">
        <Icono nombre="calendar-days" tamaño={22} />
      </span>
      <div className="me-proxima__texto">
        <h2 id="acomp-proxima-titulo" className="me-proxima__titulo">
          {P.titulo}
        </h2>
        <p className="me-proxima__fecha">{dia === hoy ? `Hoy, ${fechaLarga(dia)}` : mayuscula(fechaLarga(dia))}</p>
        <p className="me-proxima__modalidad">{cercano ? P.videollamada(agendada?.hora ?? esc.horaVideollamada) : P.escrita}</p>
        <p>{cercano ? (agendada ? P.explicaVideollamada : P.sinEnlace) : P.explicaEscrita}</p>
        <div className="me-proxima__botones">
          {agendada && llamada && (
            <a href={llamada.enlace} className="boton boton--primario" target="_blank" rel="noopener noreferrer">
              <Icono nombre="video" tamaño={20} />
              {P.unirme}
              <span className="sr-only">{P.nuevaVentana}</span>
            </a>
          )}
          <a href="#mis-semanas" className="boton boton--secundario">
            {P.detalles}
          </a>
        </div>
        <p className="microcopia">{P.noEsChat}</p>
      </div>
    </section>
  );
}

type Item = { id: string; fecha: Iso; icono: NombreIconoApp; tipo: string; estado: string; enlace?: string; ruta?: string };

// Historial reciente: cada fila dice el tipo de interacción, su estado real, la fecha y cómo ver el
// detalle. Revisiones publicadas, solicitudes de ajuste (las responde el coach en el panel) y
// videollamadas ya anotadas. Una solicitud respondida lleva la fecha de la respuesta.
function Historial({ hoy, esc }: { hoy: Iso; esc: Escenario }) {
  const { R, fechaRevision, real, videollamadas } = useEspacio();
  const H = T.historial;
  const revisiones: Item[] = publicadas(esc.revisiones, hoy).map((r) => ({
    id: `r${r.semana}`,
    fecha: r.publicadaEl!,
    icono: "message-circle",
    tipo: H.revision(r.semana),
    estado: H.fecha(H.estados.publicada, diaCorto(r.publicadaEl!)),
    enlace: H.leerRevision,
    // En la vista previa, la revisión publicada de ejemplo tiene su propia pantalla.
    ruta: real ? `${R.semana}?n=${r.semana}#lo-que-vimos` : `${R.semanaPublicada}#lo-que-vimos`,
  }));
  const ajustes: Item[] = esc.solicitudesAjuste
    .filter((s) => s.enviadaEl <= hoy)
    .map((s) => {
      // Respondida después de hoy (vista previa): todavía no se ve como respondida.
      const respondida = (s.estado === "respondida" || s.estado === "sin_cambios") && (!s.respondidaEl || s.respondidaEl <= hoy);
      const estado = respondida ? s.estado : s.estado === "en_revision" ? "en_revision" : "enviada";
      return {
        id: s.id,
        fecha: respondida && s.respondidaEl ? s.respondidaEl : s.enviadaEl,
        icono: "sliders-horizontal",
        tipo: H.ajuste,
        estado: estado === "en_revision" ? H.enRevision(diaCorto(s.enviadaEl)) : H.fecha(H.estados[estado], diaCorto(respondida && s.respondidaEl ? s.respondidaEl : s.enviadaEl)),
        enlace: respondida ? H.verRespuesta : H.verSolicitud,
        ruta: R.ajusteLista,
      };
    });
  const llamadas: Item[] = videollamadas
    .filter((v) => v.estado !== "programada")
    .map((v) => {
      const f = enChile(v.programadaPara).fecha;
      return { id: `v${v.semana}`, fecha: f, icono: "video", tipo: H.videollamada(v.semana), estado: H.fecha(H.estados[v.estado as Exclude<typeof v.estado, "programada">], diaCorto(f)) };
    });
  const items = [...revisiones, ...ajustes, ...llamadas].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)).slice(0, 4);
  const primera = fechaRevision(1, esc.diaRevision);
  return (
    <section className="me-acomp-historial" aria-labelledby="acomp-historial">
      <h2 id="acomp-historial" className="me-acomp-historial__titulo">
        {H.titulo}
      </h2>
      {items.length === 0 ? (
        <p className="me-bloque__bajada">{primera >= hoy ? H.vacio(diaCorto(primera)) : H.vacioSinFecha}</p>
      ) : (
        <ul className="me-acomp-historial__lista">
          {items.map((it) => (
            <li key={it.id} className="me-acomp-historial__item">
              <span className="me-acomp-historial__icono" aria-hidden="true">
                <Icono nombre={it.icono} tamaño={16} />
              </span>
              <div className="me-acomp-historial__texto">
                <p className="me-acomp-historial__tipo">{it.tipo}</p>
                <p className="me-acomp-historial__estado">{it.estado}</p>
                {it.ruta && it.enlace && (
                  <Link to={it.ruta} className="enlace-flecha">
                    {it.enlace}
                    <Icono nombre="arrow-right" tamaño={16} />
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
