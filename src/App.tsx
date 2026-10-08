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

// Vista previa de la plataforma (etapa 0): porción aparte, con su propio marco, título y estilos.
const VistaPrevia = lazy(() => import("./pages/vista-previa/VistaPrevia"));

// TypeScript exige una vista por cada página declarada en data/paginas.ts.
const vistas: Record<PaginaId, ReactElement> = {
  inicio: <Home />,
  privacidad: <Privacidad />,
  condiciones: <Condiciones />,
  ayuda: <Ayuda />,
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
    if (esVistaPrevia(pathname)) return; // su título lo pone VistaPrevia.tsx
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
  // Ayuda inmediata no lleva llamado comercial en la cabecera.
  const conCta = paginaPorRuta(pathname)?.id !== "ayuda";

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
