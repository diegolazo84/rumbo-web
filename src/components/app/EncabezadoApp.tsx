// Cabecera propia de Mi espacio y del panel (plataforma 4.1.1): no es la cabecera pública y
// no lleva el CTA comercial.
// - Móvil: logo «rumbo.» (enlace al inicio de la app) · título de la sección en --t-xs 600 ·
//   botón phone «Ayuda inmediata» de 44×44 (el texto visible aparece desde 480 px) que abre la hoja.
// - Escritorio (≥1024 px): logo a la izquierda; a la derecha «Ayuda inmediata» y «Volver a la web».
import { Link } from "react-router-dom";
import Icono from "./Icono";

export const TEXTOS_CABECERA = {
  ayuda: "Ayuda inmediata",
  volver: "Volver a la web",
} as const;

type Props = {
  inicio: string; // destino del logo (Hoy de Mi espacio o del panel)
  etiquetaLogo: string; // «Mi espacio, Hoy» · «Panel, Hoy»
  seccion?: string; // título de la sección (móvil)
  onAyuda?: () => void; // sin onAyuda no se muestra el botón (p. ej. en el panel)
  ayudaAbierta?: boolean;
  rutaWeb?: string; // «Volver a la web» (escritorio); null para ocultarlo
};

export default function EncabezadoApp({ inicio, etiquetaLogo, seccion, onAyuda, ayudaAbierta, rutaWeb = "/" }: Props) {
  return (
    <header className="cabecera cabecera-app">
      <div className="cabecera-app__fila">
        <Link to={inicio} className="logo" aria-label={etiquetaLogo}>
          rumbo<span className="logo-punto">.</span>
        </Link>
        {seccion && <p className="cabecera-app__seccion">{seccion}</p>}
        <div className="cabecera-app__acciones">
          {onAyuda && (
            <button
              type="button"
              className="cabecera-app__ayuda"
              aria-haspopup="dialog"
              aria-expanded={!!ayudaAbierta}
              onClick={onAyuda}
            >
              <Icono nombre="phone" tamaño={20} />
              <span className="cabecera-app__ayuda-texto">{TEXTOS_CABECERA.ayuda}</span>
            </button>
          )}
          {rutaWeb && (
            <Link to={rutaWeb} className="enlace-util cabecera-app__web">
              {TEXTOS_CABECERA.volver}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
