import { Link } from "react-router-dom";
import { LEMA, postularHref, rutas } from "../data/rumbo";

export default function Footer() {
  return (
    <footer className="pie">
      <div className="contenedor pie-grilla">
        <div>
          <p className="logo">
            rumbo<span>.</span>
          </p>
          <p className="pie-lema">{LEMA}</p>
          <p className="suave">
            Planificación personal con acompañamiento humano. Piloto en preparación desde Santiago de Chile.
          </p>
        </div>
        <nav aria-label="Rumbo">
          <h2>Rumbo</h2>
          <Link to="/#como-funciona">Cómo funciona</Link>
          <Link to="/#planes">Planes</Link>
          <a href={postularHref()}>Postular al piloto</a>
          <a href={rutas.miEspacio}>Mi espacio</a>
        </nav>
        <nav aria-label="Ayuda">
          <h2>Ayuda</h2>
          <a href={rutas.contacto}>Contacto</a>
          <Link to="/privacidad">Privacidad</Link>
          <a href={rutas.comunidad}>Comunidad</a>
        </nav>
      </div>
      <div className="contenedor">
        <p className="pie-aviso">
          Rumbo no diagnostica ni sustituye tratamientos de salud mental, nutrición ni medicina, y no ofrece atención
          de emergencias. Si estás en riesgo, llama a Salud Responde (600 360 7777) o acude a urgencias. Línea de
          prevención del suicidio: *4141.
        </p>
      </div>
    </footer>
  );
}
