// Mi acompañamiento. El acompañamiento personalizado es lo que distingue a Rumbo.
//
// Referencia visual v2 (21-oct-2026, pantalla 3): «Tu coach» con el mensaje de la semana, los
// botones «Me está costando» y «Escribir mi registro», la próxima revisión, el historial reciente
// y un paisaje al pie. Debajo sigue la semana con tu registro y la revisión completa (Semana.tsx,
// sin cambios en su lógica). En escritorio, la misma pieza en dos columnas, como Mi Rumbo.
//
// Textos y estructura exactos de Diego (21-oct-2026, 05:53 UTC).
//
// Todo sale de datos que existen y que el coach maneja desde el panel /equipo/:
//   · mensaje de la semana = foco de la última revisión publicada (o el foco inicial del programa);
//   · próxima revisión = día y modalidad del plan (y la ausencia del coach, si la hay);
//   · historial = revisiones publicadas y solicitudes de ajuste, con su estado y su fecha reales.
// Nada se inventa: «Tu coach» con avatar genérico hasta la asignación de coaches (etapa 4A), sin
// nombre ni foto. Sin promesas de chat ni de respuesta inmediata.
// Sin etiqueta «Nuevo»: lo visto se guarda solo en el navegador de cada dispositivo, así que no
// es fiable (ver mi-acompanamiento/analisis-tecnico.md). Vuelve cuando se registre en la base.
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { HojaAyuda, Icono, Ilustracion, type NombreIconoApp } from "../../../components/app";
import type { Escenario, Revision } from "../../../data/ejemplo-app";
import { diaCorto, fechaLarga, mayuscula, type Iso } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { EtiquetaEjemplo, useEspacio } from "./comun";
import { HojaCostando, useProximaRevision } from "./Costando";
import { TarjetaPronto } from "./Seccion";
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
      <header className="me-acomp__cabeza">
        <h1 className="me-acomp__h1">{T_SECCIONES.acompanamiento}</h1>
        <p className="me-acomp__intro">{T.intro}</p>
        {!esp.real && <EtiquetaEjemplo />}
      </header>

      <div className="me-acomp__principal">
        <TuCoach hoy={hoy} esc={esc} />
        <Botones onCostando={() => setCostando(true)} />
        <ProximaRevision hoy={hoy} esc={esc} />
      </div>

      <div className="me-acomp__lado">
        <Historial hoy={hoy} esc={esc} />
      </div>

      {/* key: «Leer la revisión» cambia ?n= y la semana vuelve a leerlo. */}
      <div id="mis-semanas" className="me-acomp__semanas">
        <Semana key={search} estado={estado} />
      </div>

      <TarjetaPronto id="acomp-pronto" titulo={T.pronto.titulo} items={T.pronto.items} />
      <div className="me-acomp__cierre">
        <p className="voz">{T.cierre}</p>
        <Ilustracion nombre="colinas" className="me-acomp__paisaje" />
      </div>

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

// «Tu coach»: el mensaje de la semana (el foco vigente, que el coach escribe en su revisión) es
// lo más destacado de la tarjeta después del título.
function TuCoach({ hoy, esc }: { hoy: Iso; esc: Escenario }) {
  const { semanaDelCiclo, focoDeLaSemana } = useEspacio();
  const ultima = publicadas(esc.revisiones, hoy)[0];
  const foco = ultima?.foco || focoDeLaSemana(semanaDelCiclo(hoy), esc.revisiones, esc.focoInicial);
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
      {foco && (
        <div className="me-coach__mensaje">
          <div className="me-coach__mensaje-cabeza">
            <h3 className="me-coach__rotulo">{T.mensaje.rotulo}</h3>
            <span className="me-coach__fecha">{ultima?.publicadaEl ? mayuscula(diaCorto(ultima.publicadaEl)) : T.mensaje.inicial}</span>
          </div>
          <p className="me-coach__cita">
            <q>{foco}</q>
          </p>
        </div>
      )}
    </section>
  );
}

// «Me está costando» abre la misma hoja de Mi Rumbo (ajuste, registro o ayuda inmediata);
// «Escribir mi registro» lleva a «Lo que compartiste» y abre el formulario existente.
function Botones({ onCostando }: { onCostando: () => void }) {
  return (
    <div className="me-acomp__botones">
      <button type="button" className="boton boton--primario" aria-haspopup="dialog" onClick={onCostando}>
        <Icono nombre="hand" tamaño={20} />
        {T.botones.costando}
      </button>
      <a href="#tu-registro" className="boton boton--secundario">
        <Icono nombre="pen-line" tamaño={20} />
        {T.botones.escribir}
      </a>
    </div>
  );
}

// Próxima revisión: fecha real del programa (con la ausencia del coach), la modalidad contratada y
// una explicación breve. La aclaración «no es un chat» va solo aquí.
function ProximaRevision({ hoy, esc }: { hoy: Iso; esc: Escenario }) {
  const { ciclo, real } = useEspacio();
  const { n, fecha } = useProximaRevision(hoy, esc, real);
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
        <p className="me-proxima__modalidad">{cercano ? T.proxima.videollamada(esc.horaVideollamada) : T.proxima.escrita}</p>
        <p>{cercano ? T.proxima.explicaVideollamada : T.proxima.explicaEscrita}</p>
        <p className="microcopia">{T.proxima.noEsChat}</p>
      </div>
    </section>
  );
}

type Item = { id: string; fecha: Iso; icono: NombreIconoApp; tipo: string; estado: string; enlace: string; ruta: string };

// Historial reciente: cada tarjeta dice el tipo de interacción, su estado real, la fecha y cómo
// ver el detalle. Revisiones publicadas y solicitudes de ajuste (las que el coach responde en el
// panel). Una solicitud respondida lleva la fecha de la respuesta; las demás, la de envío.
function Historial({ hoy, esc }: { hoy: Iso; esc: Escenario }) {
  const { R, fechaRevision, real } = useEspacio();
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
  const items = [...revisiones, ...ajustes].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)).slice(0, 4);
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
                <Link to={it.ruta} className="enlace-flecha">
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
