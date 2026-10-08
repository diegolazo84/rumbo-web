import { lazy, Suspense, useEffect, useRef, type ReactElement } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Privacidad from "./pages/Privacidad";
import Condiciones from "./pages/Condiciones";
import Ayuda from "./pages/Ayuda";
import NoEncontrada from "./pages/NoEncontrada";
import { PAGINA_404, paginaPorRuta, paginas, type PaginaId } from "./data/paginas";
import { useRevelar } from "./revelar";
import { esVistaPrevia } from "./vista-previa";
import { esPlataforma } from "./plataforma";

// Vista previa de la plataforma (etapa 0): porción aparte, con su propio marco, título y estilos.
const VistaPrevia = lazy(() => import("./pages/vista-previa/VistaPrevia"));
// Mi espacio propio y panel (etapa 3, solo con operacion.miEspacioPropio): porción aparte.
const Plataforma = lazy(() => import("./pages/plataforma/Plataforma"));
// Postular, estado y contacto (solo con operacion.formularioPropio): porción aparte, con sus estilos.
const PaginaFormulario = lazy(() => import("./pages/formulario/PaginaFormulario"));
const formulario = (pagina: "postular" | "estado" | "contacto") => (
  <Suspense fallback={null}>
    <PaginaFormulario pagina={pagina} />
  </Suspense>
);

// TypeScript exige una vista por cada página declarada en data/paginas.ts.
const vistas: Record<PaginaId, ReactElement> = {
  inicio: <Home />,
  privacidad: <Privacidad />,
  condiciones: <Condiciones />,
  ayuda: <Ayuda />,
  postular: formulario("postular"),
  estado: formulario("estado"),
  contacto: formulario("contacto"),
};

// Desplazamiento, foco y metadatos al navegar dentro de la app.
function AlCambiarDeRuta() {
  const { pathname, hash, key } = useLocation();
  const primeraCarga = useRef(true);

  useEffect(() => {
    // En la carga inicial el navegador ya ubica el #ancla o restaura la posición al recargar.
    if (primeraCarga.current) {
      primeraCarga.current = false;
      return;
    }
    // Depende también de `key`: un segundo clic en la misma ancla vuelve a desplazar.
    const destino = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (destino) {
      destino.scrollIntoView();
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    const foco = destino ?? document.querySelector<HTMLElement>("main h1");
    if (foco) {
      if (!foco.hasAttribute("tabindex")) foco.setAttribute("tabindex", "-1");
      foco.focus({ preventScroll: true });
    }
  }, [pathname, hash, key]);

  // El HTML prerenderizado ya trae <head> completo; al navegar dentro de la app
  // solo hay que mantener el título y la descripción al día.
  useEffect(() => {
    if (esVistaPrevia(pathname) || esPlataforma(pathname)) return; // su título lo ponen VistaPrevia.tsx y Plataforma.tsx
    const pagina = paginaPorRuta(pathname);
    document.title = pagina?.titulo ?? PAGINA_404.titulo;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", pagina?.descripcion ?? PAGINA_404.descripcion);
  }, [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  useRevelar();
  // Ayuda inmediata no lleva llamado comercial en la cabecera; /postular/ tampoco (plataforma 3.2).
  const id = paginaPorRuta(pathname)?.id;
  const conCta = id !== "ayuda" && id !== "postular";

  if (esVistaPrevia(pathname)) {
    return (
      <>
        <a className="saltar" href="#contenido">
          Saltar al contenido
        </a>
        <AlCambiarDeRuta />
        <Suspense fallback={null}>
          <VistaPrevia />
        </Suspense>
      </>
    );
  }

  if (esPlataforma(pathname)) {
    return (
      <>
        <a className="saltar" href="#contenido">
          Saltar al contenido
        </a>
        <AlCambiarDeRuta />
        <Suspense fallback={null}>
          <Plataforma />
        </Suspense>
      </>
    );
  }

  return (
    <>
      <a className="saltar" href="#contenido">
        Saltar al contenido
      </a>
      <AlCambiarDeRuta />
      <Header conCta={conCta} />
      <main id="contenido">
        <Routes>
          {paginas.map((p) => (
            <Route key={p.id} path={p.ruta} element={vistas[p.id]} caseSensitive />
          ))}
          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
