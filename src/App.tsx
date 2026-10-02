import { useEffect, useRef, type ReactElement } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Privacidad from "./pages/Privacidad";
import NoEncontrada from "./pages/NoEncontrada";
import { PAGINA_404, paginaPorRuta, paginas, type PaginaId } from "./data/paginas";

// TypeScript exige una vista por cada página declarada en data/paginas.ts.
const vistas: Record<PaginaId, ReactElement> = {
  inicio: <Home />,
  privacidad: <Privacidad />,
};

function AlCambiarDeRuta() {
  const { pathname, hash } = useLocation();
  const primeraCarga = useRef(true);
  useEffect(() => {
    // En la carga inicial el navegador ya ubica el #ancla o restaura la posición al recargar.
    if (primeraCarga.current) {
      primeraCarga.current = false;
      return;
    }
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname, hash]);

  // El HTML prerenderizado ya trae <head> completo; al navegar dentro de la app
  // solo hay que mantener el título y la descripción al día.
  useEffect(() => {
    const pagina = paginaPorRuta(pathname);
    document.title = pagina?.titulo ?? PAGINA_404.titulo;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", pagina?.descripcion ?? PAGINA_404.descripcion);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <a className="saltar" href="#contenido">
        Saltar al contenido
      </a>
      <AlCambiarDeRuta />
      <Header />
      <main id="contenido">
        <Routes>
          {paginas.map((p) => (
            <Route key={p.id} path={p.ruta} element={vistas[p.id]} />
          ))}
          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
