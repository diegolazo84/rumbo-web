// Mi espacio propio y panel (etapa 3, plataforma 2.1 y 10), con operacion.miEspacioPropio.
// Porción aparte (App.tsx la carga con lazy): ni su JS ni su CSS ni supabase-js pesan en la web
// pública. Las pantallas son las de la vista previa en modo real (EspacioContexto y
// PanelContexto); aquí solo se elige el marco y la pantalla según la ruta.
// postbuild.mjs prerenderiza cada ruta con «Cargando…» (y el formulario de ingreso), noindex.
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { EstructuraApp } from "../../components/app";
import { rutaPlataforma, type RutaPlataforma } from "./rutas";
import { ESPACIO_PREVIA, EspacioContexto, R_REAL, type Espacio } from "../vista-previa/mi-espacio/espacio";
import Carga from "../vista-previa/mi-espacio/Carga";
// Estilos de la plataforma: los mismos de la vista previa, sin los propios del índice de ejemplo.
import "../../styles/form.css";
import "../../styles/app.css";
import "../../styles/formulario.css";
import "../../styles/mi-espacio.css";
import "../../styles/panel.css";

const EntrarReal = lazy(() => import("./EntrarReal"));
const MiEspacioReal = lazy(() => import("./mi-espacio/MiEspacioReal"));
const PanelReal = lazy(() => import("./equipo/PanelReal"));

// PROPUESTO: la especificación no fija la página inexistente dentro de Mi espacio.
export const T_PLATAFORMA = {
  noExiste: "Esta página no existe.",
  irAMiEspacio: "Ir a Mi espacio",
} as const;

// Rutas reales y nada de ejemplo: el ingreso y la carga no muestran datos.
const ESPACIO_VACIO: Espacio = { ...ESPACIO_PREVIA, real: true, R: R_REAL, novedades: [], ausencia: null };

// Foco al h1 cuando la pantalla aparece tras navegar (como en la vista previa): una pantalla
// perezosa todavía no tiene h1 cuando App.tsx lo intenta. En la carga inicial no mueve el foco.
function FocoAlMostrar() {
  const { key } = useLocation();
  useEffect(() => {
    if (key === "default") return;
    const h1 = document.querySelector<HTMLElement>("main h1");
    if (!h1) return;
    if (!h1.hasAttribute("tabindex")) h1.setAttribute("tabindex", "-1");
    h1.focus({ preventScroll: true });
  }, [key]);
  return null;
}

function MarcoIngreso({ children }: { children: ReactNode }) {
  return (
    <EstructuraApp tipo="mi-espacio" rutas={{}} seccion="Entrar" sinNavegacion>
      {children}
    </EstructuraApp>
  );
}

function MarcoCargando({ ruta }: { ruta: RutaPlataforma }) {
  return (
    <EstructuraApp tipo={ruta.marco === "panel" ? "panel" : "mi-espacio"} rutas={{}} seccion={ruta.seccion} sinNavegacion>
      <Carga estado="cargando" />
    </EstructuraApp>
  );
}

function NoExiste() {
  return (
    <EstructuraApp tipo="mi-espacio" rutas={{}} sinNavegacion>
      <div className="me-pantalla me-pantalla--angosta">
        <h1 className="me-h1 me-h1--h2">{T_PLATAFORMA.noExiste}</h1>
        <p>
          <Link to={R_REAL.hoy}>{T_PLATAFORMA.irAMiEspacio}</Link>
        </p>
      </div>
    </EstructuraApp>
  );
}

export default function Plataforma() {
  const { pathname } = useLocation();
  const ruta = rutaPlataforma(pathname);
  useEffect(() => {
    document.title = ruta?.titulo ?? `${T_PLATAFORMA.noExiste.replace(/\.$/, "")} · Rumbo`;
  }, [ruta]);

  if (!ruta) return <NoExiste />;
  return (
    <EspacioContexto.Provider value={ESPACIO_VACIO}>
      {ruta.marco === "ingreso" ? (
        <MarcoIngreso>
          <Suspense fallback={<Carga estado="cargando" />}>
            <EntrarReal />
            <FocoAlMostrar />
          </Suspense>
        </MarcoIngreso>
      ) : (
        <Suspense fallback={<MarcoCargando ruta={ruta} />}>
          {ruta.marco === "mi-espacio" ? <MiEspacioReal ruta={ruta} /> : <PanelReal ruta={ruta} />}
          <FocoAlMostrar />
        </Suspense>
      )}
    </EspacioContexto.Provider>
  );
}
