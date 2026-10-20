// Rumbo 2.0, etapa 2 · Mi acompañamiento (antes «Semana»). El acompañamiento personalizado es lo
// que distingue a Rumbo: primero quién te acompaña y cómo, luego los acuerdos de la semana, la
// próxima revisión y las observaciones de tu coach, y debajo la semana con tu registro y la
// revisión (Semana.tsx, sin cambios en su lógica).
// Cada tarjeta se muestra solo con datos que existen: el foco y los ajustes salen de la última
// revisión publicada (o del foco inicial del programa); las observaciones, del «Qué funcionó» de
// esa revisión. Nada se inventa: sin revisión publicada, se dice cuándo llega la primera.
// Estructura lista para lo que viene: la tarjeta «Quién te acompaña» mostrará la ficha del coach
// asignado (etapa 4) y el asistente con IA entrará como otra tarjeta de esta grilla. Mientras no
// existan, van en la tarjeta «Próximamente» del final, sin botones.
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icono } from "../../../components/app";
import type { Escenario, Revision } from "../../../data/ejemplo-app";
import { diaCorto, nombreDia, type Iso } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { useEspacio } from "./comun";
import { TarjetaPronto, TituloSeccion } from "./Seccion";
import Semana, { ESCENARIOS } from "./Semana";
import { nombrePlan, T_ACOMPANAMIENTO as T, T_HOY, T_SECCIONES } from "./textos";

export default function Acompanamiento({ estado = "sin-enviar" }: PropsPantalla) {
  const esp = useEspacio();
  const { search } = useLocation();
  // Vista previa: el mismo día y la misma persona que el estado de la semana.
  const caso = esp.real ? null : (ESCENARIOS[estado] ?? ESCENARIOS["sin-enviar"]);
  const hoy = caso?.hoy ?? esp.hoy;
  const esc = caso?.esc ?? esp.esc;
  const cercano = esc.plan === "cercano";

  return (
    <div className="me-pantalla me-acomp">
      <TituloSeccion
        titulo={T_SECCIONES.acompanamiento}
        icono="message-circle"
        ojo={T.ojo}
        bajada={cercano ? T.bajadaCercano : T.bajadaCoach}
        ejemplo
      />

      <section className="me-acomp__resumen" aria-labelledby="acomp-resumen">
        <h2 id="acomp-resumen" className="sr-only">
          {T.resumen}
        </h2>
        <QuienTeAcompana esc={esc} />
        <Acuerdos hoy={hoy} esc={esc} />
        <ProximaRevision hoy={hoy} esc={esc} />
        <Observaciones hoy={hoy} esc={esc} />
      </section>

      {/* key: «Leer la revisión completa» cambia ?n= y la semana vuelve a leerlo. */}
      <div id="mis-semanas" className="me-acomp__semanas">
        <Semana key={search} estado={estado} />
      </div>

      <TarjetaPronto id="acomp-pronto" titulo={T.pronto.titulo} items={T.pronto.items} />
    </div>
  );
}

// Revisiones publicadas hasta hoy, de la más reciente a la más antigua.
const publicadas = (revs: Revision[], hoy: Iso) =>
  revs.filter((r) => r.publicadaEl && r.publicadaEl <= hoy).sort((a, b) => b.semana - a.semana);

function Tarjeta({ id, icono, titulo, children, destacada }: { id: string; icono: "user-round" | "compass" | "calendar-days" | "message-circle"; titulo: string; children: ReactNode; destacada?: boolean }) {
  return (
    <article className={destacada ? "tarjeta me-acomp__tarjeta es-destacada" : "tarjeta me-acomp__tarjeta"} aria-labelledby={id}>
      <div className="me-acomp__tarjeta-cabeza">
        <span className="icono-mosaico">
          <Icono nombre={icono} tamaño={20} />
        </span>
        <h3 id={id} className="me-acomp__tarjeta-titulo">
          {titulo}
        </h3>
      </div>
      {children}
    </article>
  );
}

// Quién te acompaña y cómo (lo acordado): hoy, el equipo de Rumbo; con la etapa 4, el coach asignado.
function QuienTeAcompana({ esc }: { esc: Escenario }) {
  const { fechaRevision } = useEspacio();
  const dia = nombreDia(fechaRevision(1, esc.diaRevision));
  return (
    <Tarjeta id="acomp-quien" icono="user-round" titulo={T.quien.titulo} destacada>
      <p className="me-acomp__dato">{T.quien.equipo}</p>
      <p className="me-acomp__plan">{nombrePlan(esc.plan)}</p>
      <p className="me-bloque__bajada">
        {esc.plan === "cercano" ? T.quien.videollamada(dia, esc.horaVideollamada) : T.quien.escrita(dia)}
      </p>
    </Tarjeta>
  );
}

// Acuerdos de la semana: el foco vigente y lo que se ajustó en la última revisión.
function Acuerdos({ hoy, esc }: { hoy: Iso; esc: Escenario }) {
  const { semanaDelCiclo, focoDeLaSemana } = useEspacio();
  const n = semanaDelCiclo(hoy);
  const ultima = publicadas(esc.revisiones, hoy)[0];
  const foco = ultima?.foco || focoDeLaSemana(n, esc.revisiones, esc.focoInicial);
  const ajustamos = ultima?.ajustamos;
  if (!foco && !ajustamos) return null;
  return (
    <Tarjeta id="acomp-acuerdos" icono="compass" titulo={T.acuerdos.titulo}>
      {foco && (
        <div className="me-acomp__acuerdo">
          <p className="me-rotulo">{ultima ? T.acuerdos.foco : T.acuerdos.inicial}</p>
          <p className="voz">
            <q>{foco}</q>
          </p>
        </div>
      )}
      {ajustamos && (
        <div className="me-acomp__acuerdo">
          <p className="me-rotulo">{T.acuerdos.ajustamos}</p>
          <p>{ajustamos}</p>
        </div>
      )}
    </Tarjeta>
  );
}

// Próxima revisión: la misma regla que «Tu próxima revisión» en Mi Rumbo (y la ausencia del coach).
function ProximaRevision({ hoy, esc }: { hoy: Iso; esc: Escenario }) {
  const { semanaDelCiclo, fechaRevision, ausencia, ciclo, real } = useEspacio();
  let n = semanaDelCiclo(hoy);
  if (fechaRevision(n, esc.diaRevision) < hoy) n += 1;
  if (n > ciclo.semanas) return null;
  let fecha = fechaRevision(n, esc.diaRevision);
  if (real && ausencia && fecha <= ausencia.hasta) fecha = ausencia.vuelve;
  const enviado = esc.registrosSemanales.some((r) => r.semana === n && r.enviadoEl);
  const cercano = esc.plan === "cercano";
  return (
    <Tarjeta id="acomp-proxima" icono="calendar-days" titulo={T.proxima.titulo}>
      <p className="me-acomp__dato">{fecha === hoy ? `Hoy, ${diaCorto(fecha)}` : diaCorto(fecha)}</p>
      <p className="me-bloque__bajada">{cercano ? T.proxima.videollamada(esc.horaVideollamada) : T.proxima.escrita}</p>
      <p className="microcopia">{enviado ? T.proxima.registroEnviado : T.proxima.registroPendiente}</p>
      {!enviado && (
        <a href="#mis-semanas" className="enlace-flecha">
          {cercano ? T_HOY.revision.escribirOpcional : T.proxima.escribir}
          <Icono nombre="arrow-right" tamaño={16} />
        </a>
      )}
    </Tarjeta>
  );
}

// Observaciones de tu coach: «Qué funcionó» de la última revisión publicada.
function Observaciones({ hoy, esc }: { hoy: Iso; esc: Escenario }) {
  const { fechaRevision, R } = useEspacio();
  const ultima = publicadas(esc.revisiones, hoy)[0];
  if (!ultima) {
    const primera = fechaRevision(1, esc.diaRevision);
    if (primera < hoy) return null; // la semana muestra «todavía no está lista»
    return (
      <Tarjeta id="acomp-observaciones" icono="message-circle" titulo={T.observaciones.titulo}>
        <p className="me-bloque__bajada">{T.observaciones.sinRevision(diaCorto(primera))}</p>
      </Tarjeta>
    );
  }
  return (
    <Tarjeta id="acomp-observaciones" icono="message-circle" titulo={T.observaciones.titulo}>
      <p className="me-rotulo">{T.observaciones.deSemana(ultima.semana)}</p>
      {ultima.funciono && (
        <p className="voz me-acomp__cita">
          <q>{ultima.funciono}</q>
        </p>
      )}
      <Link to={`${R.semana}?n=${ultima.semana}#mis-semanas`} className="enlace-flecha">
        {T.observaciones.leer}
        <Icono nombre="arrow-right" tamaño={16} />
      </Link>
    </Tarjeta>
  );
}
