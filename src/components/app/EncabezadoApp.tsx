// Cabecera propia de Mi espacio y del panel (plataforma 4.1.1): no es la cabecera pública y
// no lleva el CTA comercial.
// - Móvil: logo «rumbo.» (enlace al inicio de la app) · título de la sección en --t-xs 600 ·
//   botón phone «Ayuda inmediata» de 44×44 (el texto visible aparece desde 480 px) que abre la hoja.
// - Mi espacio (Rumbo 2.0, etapa 2): botón «Menú» de 44×44 que abre la hoja con Preferencias,
//   Mis datos, «Lo que viene en Rumbo», «Volver a la web» y Salir (antes, «Más» en la barra).
// - Mi espacio (Mis avisos, 30-oct-2026): campana con el número de avisos sin leer.
// - Escritorio (≥1024 px): logo a la izquierda; a la derecha «Ayuda inmediata» y «Volver a la web».
import { Link } from "react-router-dom";
import Icono from "./Icono";

export const TEXTOS_CABECERA = {
  ayuda: "Ayuda inmediata",
  volver: "Volver a la web",
  menu: "Menú",
  avisos: "Mis avisos",
  sinLeer: (n: number) => (n === 1 ? "1 sin leer" : `${n} sin leer`),
} as const;

// Campana de Mis avisos (Mi espacio): enlace a la lista, con el número de avisos sin leer.
export type AvisosCabecera = { href: string; sinLeer: number; actual?: boolean };

type Props = {
  inicio: string; // destino del logo (Hoy de Mi espacio o del panel)
  etiquetaLogo: string; // «Mi espacio, Hoy» · «Panel, Hoy»
  seccion?: string; // título de la sección (móvil)
  onAyuda?: () => void; // sin onAyuda no se muestra el botón (p. ej. en el panel)
  ayudaAbierta?: boolean;
  rutaWeb?: string; // «Volver a la web» (escritorio); null para ocultarlo
  onMenu?: () => void; // sin onMenu no se muestra el botón «Menú» (panel e ingreso)
  menuAbierto?: boolean;
  avisos?: AvisosCabecera; // sin avisos no se muestra la campana (panel e ingreso)
};

export default function EncabezadoApp({ inicio, etiquetaLogo, seccion, onAyuda, ayudaAbierta, rutaWeb = "/", onMenu, menuAbierto, avisos }: Props) {
  return (
    <header className="cabecera cabecera-app">
      <div className="cabecera-app__fila">
        <Link to={inicio} className="logo" aria-label={etiquetaLogo}>
          rumbo<span className="logo-punto">.</span>
        </Link>
        {seccion && <p className="cabecera-app__seccion">{seccion}</p>}
        <div className="cabecera-app__acciones">
          {avisos && (
            <Link
              to={avisos.href}
              className="cabecera-app__avisos"
              aria-current={avisos.actual ? "page" : undefined}
              aria-label={avisos.sinLeer ? `${TEXTOS_CABECERA.avisos}, ${TEXTOS_CABECERA.sinLeer(avisos.sinLeer)}` : TEXTOS_CABECERA.avisos}
            >
              <Icono nombre="bell" tamaño={22} />
              {avisos.sinLeer > 0 && (
                <span className="cabecera-app__avisos-numero" aria-hidden="true">
                  {avisos.sinLeer > 99 ? "99+" : avisos.sinLeer}
                </span>
              )}
            </Link>
          )}
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
          {onMenu && (
            <button
              type="button"
              className="cabecera-app__menu"
              aria-haspopup="dialog"
              aria-expanded={!!menuAbierto}
              onClick={onMenu}
            >
              <Icono nombre="menu" tamaño={24} />
              <span className="sr-only">{TEXTOS_CABECERA.menu}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
