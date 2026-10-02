// Cabecera (3.10, 5.1.1). En móvil el CTA queda siempre visible junto al botón de menú;
// el panel repite solo las anclas y «Mi espacio». Sin JS el botón de menú queda
// invisible (ocupa su lugar) y las anclas siguen disponibles en el pie.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { rutas } from "../data/rumbo";
import { Boton, BotonPostular, EnlaceUtil } from "./Enlaces";
import Icono from "./Icono";

// Anclas de la portada, en el orden de la página (cabecera, menú móvil y pie).
export const anclas = [
  { href: "/#para-quien", texto: "Para quién" },
  { href: "/#como-funciona", texto: "Cómo funciona" },
  { href: "/#planes", texto: "Planes" },
  { href: "/#preguntas", texto: "Preguntas" },
];

// conCta={false} solo en /ayuda/: sin llamado comercial.
export default function Header({ conCta = true }: { conCta?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [desplazado, setDesplazado] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const cerrar = () => setAbierto(false);

  // Línea inferior cuando la página se desplazó más de 8 px.
  useEffect(() => {
    const alDesplazar = () => setDesplazado(window.scrollY > 8);
    alDesplazar();
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => window.removeEventListener("scroll", alDesplazar);
  }, []);

  // Con el menú abierto: Escape (devuelve el foco), toque fuera, paso a escritorio
  // y bloqueo del desplazamiento del fondo.
  useEffect(() => {
    if (!abierto) return;
    const raiz = document.documentElement;
    raiz.style.overflow = "hidden";
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAbierto(false);
      boton.current?.focus();
    };
    const alTocar = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !boton.current?.contains(t)) setAbierto(false);
    };
    const escritorio = window.matchMedia("(min-width: 1024px)");
    const alCambiarAncho = () => {
      if (escritorio.matches) setAbierto(false);
    };
    document.addEventListener("keydown", alTeclear);
    document.addEventListener("pointerdown", alTocar);
    escritorio.addEventListener("change", alCambiarAncho);
    return () => {
      raiz.style.overflow = "";
      document.removeEventListener("keydown", alTeclear);
      document.removeEventListener("pointerdown", alTocar);
      escritorio.removeEventListener("change", alCambiarAncho);
    };
  }, [abierto]);

  return (
    <header className="cabecera" data-desplazado={desplazado ? "" : undefined}>
      <div className="contenedor cabecera-fila">
        <Link to="/" className="logo" aria-label="Rumbo, inicio" onClick={cerrar}>
          rumbo<span className="logo-punto">.</span>
        </Link>

        <nav aria-label="Principal" className="cabecera-nav">
          <ul>
            {anclas.map((a) => (
              <li key={a.href}>
                <EnlaceUtil href={a.href}>{a.texto}</EnlaceUtil>
              </li>
            ))}
          </ul>
        </nav>
        <span className="cabecera-separador" aria-hidden="true" />
        <EnlaceUtil href={rutas.miEspacio} icono="user-round" plataforma evento="mi-espacio" className="cabecera-espacio">
          Mi espacio
        </EnlaceUtil>

        {conCta && <BotonPostular chico ubicacion="cabecera" className="cabecera-cta" />}

        <button
          ref={boton}
          type="button"
          className="menu-boton"
          aria-expanded={abierto}
          aria-controls="menu-movil"
          onClick={() => setAbierto((v) => !v)}
        >
          <Icono nombre={abierto ? "x" : "menu"} tamaño={24} />
          <span className="menu-boton-texto">Menú</span>
        </button>
      </div>

      <div
        id="menu-movil"
        ref={panel}
        className="menu-movil"
        hidden={!abierto}
        onBlur={(e) => {
          // Si el foco sale del panel (Tab tras el último enlace), se cierra para no tapar el contenido.
          const destino = e.relatedTarget as Node | null;
          if (destino && !e.currentTarget.contains(destino) && destino !== boton.current) cerrar();
        }}
      >
        <div className="contenedor">
          <nav aria-label="Principal">
            <ul className="menu-movil-lista">
              {anclas.map((a) => (
                <li key={a.href}>
                  <Link to={a.href} onClick={cerrar}>
                    {a.texto}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Boton
            href={rutas.miEspacio}
            variante="secundario"
            ancho
            plataforma
            icono="user-round"
            evento="mi-espacio"
            onClick={cerrar}
          >
            Mi espacio
          </Boton>
        </div>
      </div>
    </header>
  );
}
