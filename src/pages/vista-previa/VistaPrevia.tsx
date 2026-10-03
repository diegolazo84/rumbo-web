// Vista previa de la plataforma (etapa 0 «Piel», plataforma 2.1 y 10): todas las pantallas
// con datos de ejemplo punteados, bajo /vista-previa/. noindex y nofollow, fuera del sitemap y
// sin enlaces desde la web pública. Se borra al pasar a la etapa 3.
// - Es una porción aparte (App.tsx la carga con lazy): ni su JS ni su CSS pesan en la portada.
// - Pone el marco de cada pantalla (público, ingreso, Mi espacio o panel), el aviso «Ejemplo»
//   y el <title>. Las pantallas (registro.ts) rinden solo su contenido.
import { lazy, Suspense, useEffect, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Etiqueta from "../../components/Etiqueta";
import { Banda, BandaSinConexion, Cargando, EstructuraApp } from "../../components/app";
import { AUSENCIA } from "../../data/ejemplo-app";
import { contadores } from "./panel/cola";
import { PantallaPreviaContexto } from "./contexto";
import Indice from "./Indice";
import { INDICE, pantallaPorRuta, pantallas, type PantallaPrevia, type PropsPantalla } from "./registro";
import { PREVIA, RUTAS_MI_ESPACIO, RUTAS_PANEL } from "./rutas";
// Estilos de la plataforma: solo aquí, nunca en main.tsx (presupuesto de peso de la portada).
import "../../styles/form.css";
import "../../styles/app.css";
import "../../styles/formulario.css";
import "../../styles/mi-espacio.css";
import "../../styles/panel.css";
import "../../styles/vista-previa.css";

export const TEXTOS_PREVIA = {
  etiqueta: "Vista previa",
  ejemplo: "Ejemplo",
  aviso: "Vista previa de la plataforma con datos de ejemplo. Ninguna persona, meta ni acción es real.",
  indice: "Todas las pantallas",
  noExiste: "Esta pantalla no existe en la vista previa.",
} as const;

// Un componente perezoso por fila (varias filas comparten archivo: el módulo se carga una vez).
const perezosos = new Map<string, LazyExoticComponent<ComponentType<PropsPantalla>>>(
  pantallas.map((p) => [p.ruta, lazy(p.cargar)]),
);

function AvisoPrevia() {
  return (
    <aside className="previa-aviso" aria-label={TEXTOS_PREVIA.etiqueta}>
      <Banda icono={null}>
        <Etiqueta variante="ejemplo">{TEXTOS_PREVIA.ejemplo}</Etiqueta>
        <span className="previa-aviso__texto">{TEXTOS_PREVIA.aviso}</span>
        <Link to={PREVIA} className="previa-aviso__enlace">
          {TEXTOS_PREVIA.indice}
        </Link>
      </Banda>
    </aside>
  );
}

function Marco({ pantalla, children }: { pantalla?: PantallaPrevia; children: ReactNode }) {
  const marco = pantalla?.marco ?? "publico-sin-cta";
  if (marco === "mi-espacio" || marco === "ingreso" || marco === "panel") {
    const panel = marco === "panel";
    return (
      <>
        <AvisoPrevia />
        <EstructuraApp
          tipo={panel ? "panel" : "mi-espacio"}
          rutas={marco === "ingreso" ? {} : panel ? RUTAS_PANEL : RUTAS_MI_ESPACIO}
          seccion={pantalla?.seccion}
          activo={pantalla?.activo}
          novedades={pantalla?.novedades}
          contadores={panel ? CONTADORES_EJEMPLO : undefined}
          sinNavegacion={marco === "ingreso"}
          banda={
            pantalla?.banda === "sin-conexion" ? (
              <BandaSinConexion />
            ) : pantalla?.banda === "ausencia" ? (
              <Banda rol="status" icono="info">
                {AUSENCIA.banda}
                <Etiqueta variante="ejemplo">{TEXTOS_PREVIA.ejemplo}</Etiqueta>
              </Banda>
            ) : undefined
          }
        >
          {children}
        </EstructuraApp>
      </>
    );
  }
  return (
    <>
      <AvisoPrevia />
      <Header conCta={marco === "publico"} />
      <main id="contenido">{children}</main>
      <Footer />
    </>
  );
}

// Contadores del panel (5.2: ahí sí son números), calculados con los datos de ejemplo.
const CONTADORES_EJEMPLO = contadores();

// Foco al h1 cuando la pantalla aparece tras navegar (plataforma 2.1). App.tsx ya lo intenta al
// cambiar de ruta, pero una pantalla perezosa que aún no carga todavía no tiene h1: este
// componente se monta junto con ella, dentro del mismo Suspense. En la carga inicial
// (location.key "default") no mueve el foco.
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

function Pantalla({ pantalla }: { pantalla: PantallaPrevia }) {
  const Componente = perezosos.get(pantalla.ruta)!;
  return (
    <PantallaPreviaContexto.Provider value={pantalla}>
      <Marco pantalla={pantalla}>
        <Suspense fallback={<Cargando />}>
          <Componente estado={pantalla.estado} />
          <FocoAlMostrar />
        </Suspense>
      </Marco>
    </PantallaPreviaContexto.Provider>
  );
}

function NoExiste() {
  return (
    <Marco>
      <div className="contenedor contenedor--medio lectura previa-marcador">
        <h1>{TEXTOS_PREVIA.noExiste}</h1>
        <p>
          <Link to={PREVIA}>{TEXTOS_PREVIA.indice}</Link>
        </p>
      </div>
    </Marco>
  );
}

// Título al navegar dentro de la vista previa (el HTML prerenderizado ya lo trae).
function Titulo() {
  const { pathname } = useLocation();
  useEffect(() => {
    const p = pantallaPorRuta(pathname);
    document.title = p?.titulo ?? INDICE.titulo;
  }, [pathname]);
  return null;
}

export default function VistaPrevia() {
  return (
    <>
      <Titulo />
      <Routes>
        <Route
          path={INDICE.ruta}
          element={
            <Marco>
              <Indice />
            </Marco>
          }
          caseSensitive
        />
        {pantallas.map((p) => (
          <Route key={p.ruta} path={p.ruta} element={<Pantalla pantalla={p} />} caseSensitive />
        ))}
        <Route path="*" element={<NoExiste />} />
      </Routes>
    </>
  );
}
