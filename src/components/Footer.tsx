// Pie (3.11, 5.1.2): en todas las páginas, también en la 404. El aviso de crisis va
// siempre visible, sin interacción. El *4141 va sin enlace (iOS no marca tel: con «*»).
import { Link } from "react-router-dom";
import { LEMA, SANTIAGO, operacion, postularHref, rutas } from "../data/rumbo";
import { Aviso } from "./Bloques";
import { EnlaceUtil } from "./Enlaces";
import { anclas } from "./Header";

// Dónde se opera, con espacios duros: «Santiago de Chile» nunca se parte.
const ESTADO_LEGAL = `© ${__ANIO__} Rumbo · Piloto en preparación · ${SANTIAGO}`;

function FilaLegal() {
  const r = operacion.responsable;
  const texto = r
    ? `${ESTADO_LEGAL}. Rumbo es operado por ${r.nombre}${r.rut ? `, RUT ${r.rut}` : ""}, ${r.comuna}, Chile.`
    : ESTADO_LEGAL;
  return (
    <div className="pie-legal">
      <p>{texto}</p>
      <ul>
        <li>
          <EnlaceUtil href="/privacidad/">Privacidad</EnlaceUtil>
        </li>
        <li>
          <EnlaceUtil href="/condiciones/">Condiciones</EnlaceUtil>
        </li>
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="pie">
      <div className="contenedor">
        <div className="pie-grilla">
          <div className="pie-marca">
            <p className="logo">
              rumbo<span className="logo-punto">.</span>
            </p>
            <p className="voz pie-lema">{LEMA}</p>
            <p className="pie-descripcion">
              {`Planificación personal con acompañamiento humano. Piloto en preparación, en línea y en español, desde ${SANTIAGO}.`}
            </p>
            {operacion.correo && (
              <p className="pie-descripcion">
                Escríbenos a <a href={`mailto:${operacion.correo}`}>{operacion.correo}</a>.
              </p>
            )}
          </div>

          <nav aria-labelledby="pie-rumbo" className="pie-nav">
            <h2 id="pie-rumbo">Rumbo</h2>
            <ul>
              {anclas.map((a) => (
                <li key={a.href}>
                  <EnlaceUtil href={a.href}>{a.texto}</EnlaceUtil>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="pie-piloto" className="pie-nav">
            <h2 id="pie-piloto">Piloto</h2>
            <ul>
              <li>
                <EnlaceUtil href={postularHref()} plataforma evento="postular" ubicacion="pie">
                  Postular
                </EnlaceUtil>
              </li>
              <li>
                <EnlaceUtil href={rutas.miEspacio} plataforma>
                  Mi espacio
                </EnlaceUtil>
              </li>
              <li>
                <EnlaceUtil href={rutas.comunidad} plataforma>
                  Comunidad para participantes
                </EnlaceUtil>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="pie-ayuda" className="pie-nav">
            <h2 id="pie-ayuda">Ayuda</h2>
            <ul>
              <li>
                <EnlaceUtil href={rutas.contacto} plataforma>
                  Contacto
                </EnlaceUtil>
              </li>
              <li>
                <EnlaceUtil href="/ayuda/">Ayuda inmediata</EnlaceUtil>
              </li>
              <li>
                <EnlaceUtil href="/condiciones/">Condiciones del piloto</EnlaceUtil>
              </li>
              <li>
                <EnlaceUtil href="/privacidad/">Privacidad</EnlaceUtil>
              </li>
            </ul>
          </nav>
        </div>

        <Aviso icono="phone" titulo="Rumbo no es un servicio de salud ni de urgencias." className="pie-aviso">
          <p>
            No diagnostica ni reemplaza a profesionales.{" "}
            <strong>Si piensas en hacerte daño o en quitarte la vida, llama gratis al *4141 desde tu celular</strong>{" "}
            (Línea de Prevención del Suicidio, 24 horas). En una emergencia médica, llama al{" "}
            <strong>
              <a href="tel:131">131</a>
            </strong>{" "}
            (SAMU) o acude a la urgencia más cercana. Orientación en salud:{" "}
            <strong>
              Salud Responde, <a href="tel:6003607777">600 360 7777</a>
            </strong>{" "}
            (24 horas, con costo de llamada local). Si no estás en Chile, llama al número de emergencias de tu país. Más recursos en{" "}
            <Link to="/ayuda/">Ayuda inmediata</Link>.
          </p>
        </Aviso>

        <FilaLegal />
      </div>
    </footer>
  );
}
