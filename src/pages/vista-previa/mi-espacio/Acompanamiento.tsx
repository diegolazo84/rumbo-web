// Mi acompañamiento. El acompañamiento personalizado es lo que distingue a Rumbo.
//
// Referencia visual v2 (21-oct-2026, pantalla 3): «Tu coach» con el mensaje de la semana, los
// botones «Me está costando» y «Escribir mi registro», la próxima revisión, el historial reciente
// y un paisaje al pie. Debajo sigue la semana con tu registro y la revisión completa (Semana.tsx,
// sin cambios en su lógica). En escritorio, la misma pieza en dos columnas, como Mi Rumbo.
//
// Todo sale de datos que existen y que el coach maneja desde el panel /equipo/:
//   · mensaje de la semana = foco de la última revisión publicada (o el foco inicial del programa);
//   · próxima revisión = día y modalidad del plan (y la ausencia del coach, si la hay);
//   · historial = revisiones publicadas y solicitudes de ajuste, con «Nuevo» si no se han visto.
// Nada se inventa: «Tu coach» con avatar genérico hasta la asignación de coaches (etapa 4A), sin
// nombre ni foto. Sin promesas de chat ni de respuesta inmediata.
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Etiqueta from "../../../components/Etiqueta";
import { HojaAyuda, Icono, Ilustracion, type NombreIconoApp } from "../../../components/app";
import type { Escenario, Revision } from "../../../data/ejemplo-app";
import { diaCorto, fechaLarga, mayuscula, nombreDia, type Iso } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { EtiquetaEjemplo, useEspacio } from "./comun";
import { HojaCostando, useProximaRevision } from "./Costando";
import { TarjetaPronto } from "./Seccion";
import Semana, { ESCENARIOS } from "./Semana";
import { nombrePlan, T_ACOMPANAMIENTO as T, T_SECCIONES } from "./textos";

export default function Acompanamiento({ estado = "sin-enviar" }: PropsPantalla) {
  const esp = useEspacio();
  const { search } = useLocation();
  // Vista previa: el mismo día y la misma persona que el estado de la semana.
  const caso = esp.real ? null : (ESCENARIOS[estado] ?? ESCENARIOS["sin-enviar"]);
  const hoy = caso?.hoy ?? esp.hoy;
  const esc = caso?.esc ?? esp.esc;
  const enviadoPrevia = caso?.situacion === "enviado";
  const [costando, setCostando] = useState(false);
  const [ayuda, setAyuda] = useState(false);

  return (
    <div className="me-pantalla me-acomp">
      <header className="me-acomp__cabeza">
        <h1 className="me-acomp__h1">{T_SECCIONES.acompanamiento}</h1>
        <p className="me-acomp__intro">{T.intro}</p>
        {!esp.real && <EtiquetaEjemplo />}
      </header>

      <div className="me-acomp__principal">
        <TuCoach hoy={hoy} esc={esc} />
        <Botones hoy={hoy} esc={esc} enviadoPrevia={enviadoPrevia} onCostando={() => setCostando(true)} />
        <ProximaRevision hoy={hoy} esc={esc} enviadoPrevia={enviadoPrevia} />
      </div>

      <div className="me-acomp__lado">
        <Historial hoy={hoy} esc={esc} />
      </div>

      {/* key: «Ver la revisión» cambia ?n= y la semana vuelve a leerlo. */}
      <div id="mis-semanas" className="me-acomp__semanas">
        <Semana key={search} estado={estado} />
      </div>

      <TarjetaPronto id="acomp-pronto" titulo={T.pronto.titulo} items={T.pronto.items} />
      <Ilustracion nombre="colinas" className="me-acomp__paisaje" />

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

// Revisiones publicadas hasta hoy, de la más reciente a la más antigua.
const publicadas = (revs: Revision[], hoy: Iso) =>
  revs.filter((r) => r.publicadaEl && r.publicadaEl <= hoy).sort((a, b) => b.semana - a.semana);

// «Tu coach» y el mensaje de la semana (el foco vigente, que el coach escribe en su revisión).
function TuCoach({ hoy, esc }: { hoy: Iso; esc: Escenario }) {
  const { semanaDelCiclo, focoDeLaSemana, fechaRevision, novedades } = useEspacio();
  const ultima = publicadas(esc.revisiones, hoy)[0];
  const foco = ultima?.foco || focoDeLaSemana(semanaDelCiclo(hoy), esc.revisiones, esc.focoInicial);
  const nuevo = !!ultima && novedades.some((n) => n.destino === "semana");
  const dia = nombreDia(fechaRevision(1, esc.diaRevision));
  return (
    <section className="me-coach" aria-labelledby="acomp-coach">
      <div className="me-coach__cabeza">
        <span className="me-avatar me-avatar--xl" aria-hidden="true">
          <Icono nombre="user-round" tamaño={24} />
        </span>
        <div className="me-coach__quien">
          <h2 id="acomp-coach" className="me-coach__titulo">
            {T.coach.titulo}
          </h2>
          <p>{T.coach.quien}</p>
        </div>
      </div>
      <p className="me-coach__plan">
        <strong>{nombrePlan(esc.plan)}.</strong> {esc.plan === "cercano" ? T.coach.videollamada(dia, esc.horaVideollamada) : T.coach.escrita(dia)}
      </p>
      {foco && (
        <div className="me-coach__mensaje">
          <div className="me-coach__mensaje-cabeza">
            <h3 className="me-coach__rotulo">{T.mensaje.rotulo}</h3>
            {nuevo && <Etiqueta variante="nota" className="me-nuevo">{T.mensaje.nuevo}</Etiqueta>}
            <span className="me-coach__fecha">{ultima?.publicadaEl ? mayuscula(diaCorto(ultima.publicadaEl)) : T.mensaje.inicial}</span>
          </div>
          <p className="voz me-coach__cita">
            <q>{foco}</q>
          </p>
        </div>
      )}
    </section>
  );
}

// «Me está costando» abre la misma hoja que en Mi Rumbo (ajuste, registro o ayuda inmediata);
// «Escribir mi registro» lleva al registro de esta semana, más abajo en la misma pantalla.
function Botones({ hoy, esc, enviadoPrevia, onCostando }: { hoy: Iso; esc: Escenario; enviadoPrevia: boolean; onCostando: () => void }) {
  const { real } = useEspacio();
  const enviado = useProximaRevision(hoy, esc, real).enviado || enviadoPrevia;
  const cercano = esc.plan === "cercano";
  return (
    <div className="me-acomp__botones">
      <button type="button" className="boton boton--primario" aria-haspopup="dialog" onClick={onCostando}>
        <Icono nombre="hand" tamaño={20} />
        {T.botones.costando}
      </button>
      <a href="#tu-registro" className="boton boton--secundario">
        <Icono nombre="pen-line" tamaño={20} />
        {enviado ? T.botones.ver : cercano ? T.botones.escribirOpcional : T.botones.escribir}
      </a>
    </div>
  );
}

// Próxima revisión: la misma regla que en Mi Rumbo (con la ausencia del coach).
function ProximaRevision({ hoy, esc, enviadoPrevia }: { hoy: Iso; esc: Escenario; enviadoPrevia: boolean }) {
  const { ciclo, real } = useEspacio();
  const { n, fecha, enviado: enviadoDatos } = useProximaRevision(hoy, esc, real);
  const enviado = enviadoDatos || enviadoPrevia;
  if (n > ciclo.semanas) return null;
  const cercano = esc.plan === "cercano";
  return (
    <section className="me-proxima" aria-labelledby="acomp-proxima">
      <span className="me-proxima__icono" aria-hidden="true">
        <Icono nombre="clock" tamaño={22} />
      </span>
      <div className="me-proxima__texto">
        <h2 id="acomp-proxima" className="me-proxima__titulo">
          {T.proxima.titulo}
        </h2>
        <p className="me-proxima__fecha">{fecha === hoy ? `Hoy, ${fechaLarga(fecha)}` : mayuscula(fechaLarga(fecha))}</p>
        <p>{cercano ? T.proxima.videollamada(esc.horaVideollamada) : T.proxima.escrita}</p>
        <p className="microcopia">
          {enviado ? T.proxima.registroEnviado : T.proxima.registroPendiente} {T.proxima.noEsChat}
        </p>
      </div>
    </section>
  );
}

type Item = { id: string; fecha: Iso; icono: NombreIconoApp; texto: string; enlace: string; ruta: string; nuevo: boolean; novedad?: string };

// Historial reciente: revisiones publicadas y solicitudes de ajuste (lo que el coach responde
// desde el panel). «Nuevo» marca lo que trae una novedad todavía sin ver.
function Historial({ hoy, esc }: { hoy: Iso; esc: Escenario }) {
  const { R, novedades, servidor, fechaRevision, real } = useEspacio();
  const novRevision = novedades.find((n) => n.destino === "semana");
  const novAjuste = novedades.find((n) => n.destino === "ajuste");
  const revisiones: Item[] = publicadas(esc.revisiones, hoy).map((r, i) => ({
    id: `r${r.semana}`,
    fecha: r.publicadaEl!,
    icono: "message-circle",
    texto: T.historial.revision(r.semana, esc.registrosSemanales.some((x) => x.semana === r.semana && x.enviadoEl)),
    enlace: T.historial.verRevision,
    // En la vista previa, la revisión publicada de ejemplo tiene su propia pantalla.
    ruta: real ? `${R.semana}?n=${r.semana}#mis-semanas` : `${R.semanaPublicada}#mis-semanas`,
    nuevo: i === 0 && !!novRevision,
    novedad: i === 0 ? novRevision?.id : undefined,
  }));
  let ajusteNuevo = !!novAjuste;
  const ajustes: Item[] = esc.solicitudesAjuste
    .filter((s) => s.enviadaEl <= hoy)
    .sort((a, b) => (a.enviadaEl < b.enviadaEl ? 1 : -1))
    .map((s) => {
      const respondida = s.estado === "respondida" || s.estado === "sin_cambios";
      const nuevo = respondida && ajusteNuevo;
      if (nuevo) ajusteNuevo = false;
      return {
        id: s.id,
        fecha: s.enviadaEl,
        icono: "sliders-horizontal",
        texto: s.estado === "respondida" ? T.historial.ajusteRespondido : s.estado === "sin_cambios" ? T.historial.ajusteSinCambios : T.historial.ajustePendiente,
        enlace: respondida ? T.historial.verRespuesta : T.historial.verSolicitud,
        ruta: R.ajusteLista,
        nuevo,
        novedad: nuevo ? novAjuste?.id : undefined,
      };
    });
  const items = [...revisiones, ...ajustes].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)).slice(0, 4);
  const primera = fechaRevision(1, esc.diaRevision);
  return (
    <section className="me-acomp-historial" aria-labelledby="acomp-historial">
      <h2 id="acomp-historial" className="me-acomp-historial__titulo">
        {T.historial.titulo}
      </h2>
      {items.length === 0 ? (
        <p className="me-bloque__bajada">{primera >= hoy ? T.historial.vacio(diaCorto(primera)) : T.historial.vacioSinFecha}</p>
      ) : (
        <ul className="me-acomp-historial__lista">
          {items.map((it) => (
            <li key={it.id} className="me-acomp-historial__item">
              <span className="me-acomp-historial__icono" aria-hidden="true">
                <Icono nombre={it.icono} tamaño={16} />
              </span>
              <div className="me-acomp-historial__texto">
                <p>
                  {it.texto}
                  {it.nuevo && (
                    <>
                      {" "}
                      <Etiqueta variante="nota" className="me-nuevo">{T.mensaje.nuevo}</Etiqueta>
                    </>
                  )}
                </p>
                <Link to={it.ruta} className="enlace-flecha" onClick={() => it.novedad && servidor?.verNovedad(it.novedad)}>
                  {it.enlace}
                  <Icono nombre="arrow-right" tamaño={16} />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
