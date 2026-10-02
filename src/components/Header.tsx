import { useState } from "react";
import { Link } from "react-router-dom";
import { postularHref, rutas } from "../data/rumbo";

const secciones = [
  { href: "/#como-funciona", texto: "Cómo funciona" },
  { href: "/#areas", texto: "Para quién" },
  { href: "/#planes", texto: "Planes" },
  { href: "/#comunidad", texto: "Comunidad" },
  { href: "/#preguntas", texto: "Preguntas" },
];

export default function Header() {
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);

  return (
    <header className="cabecera">
      <div className="contenedor cabecera-fila">
        <Link to="/" className="logo" onClick={cerrar} aria-label="Rumbo, inicio">
          rumbo<span>.</span>
        </Link>
        <button
          type="button"
          className="menu-boton"
          aria-expanded={abierto}
          aria-controls="menu-principal"
          onClick={() => setAbierto((v) => !v)}
        >
          {abierto ? "Cerrar" : "Menú"}
        </button>
        <nav id="menu-principal" className={abierto ? "menu abierto" : "menu"} aria-label="Principal">
          {secciones.map((s) => (
            <Link key={s.href} to={s.href} onClick={cerrar}>
              {s.texto}
            </Link>
          ))}
          <a href={rutas.miEspacio} className="menu-espacio" onClick={cerrar}>
            Mi espacio
          </a>
          <a href={postularHref()} className="boton boton-primario boton-chico" onClick={cerrar}>
            Cuéntanos tu meta
          </a>
        </nav>
      </div>
    </header>
  );
}
