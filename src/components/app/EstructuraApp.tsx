// Estructura común de Mi espacio y del panel (plataforma 4.1 y 5.2): cabecera propia, banda
// de avisos globales, barra lateral (≥1024 px) o barra inferior (móvil), el contenedor del
// contenido (--ancho-medio) y las hojas «Más» y «Ayuda inmediata».
// - main#contenido: destino de «Saltar al contenido»; al navegar, App.tsx lleva el foco al h1.
// - La barra inferior no tapa el foco (scroll-padding-bottom en app.css) y se oculta mientras
//   hay foco en un texto de un formulario largo (<Formulario largo>, 4.1.2).
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { TEXTOS_FORM } from "../../data/formularios";
import EncabezadoApp, { TEXTOS_CABECERA } from "./EncabezadoApp";
import Hoja from "./Hoja";
import HojaAyuda from "./AyudaInmediata";
import Icono from "./Icono";
import { BarraInferior, DESTINOS_MI_ESPACIO, DESTINOS_PANEL, Lateral, ListaMas, type DestinoNav, type FilaMas } from "./Navegacion";

export const TEXTOS_ESTRUCTURA = {
  miEspacio: "Mi espacio",
  panel: "Panel",
  logoMiEspacio: "Mi espacio, Hoy",
  logoPanel: "Panel, Hoy",
  mas: "Más",
  ajuste: "Pedir un ajuste",
  preferencias: "Preferencias",
  salir: "Salir",
} as const;

// Rutas de cada destino. Mi espacio: hoy, calendario, progreso, semana, ajuste, preferencias,
// salir. Panel: hoy, solicitudes, participantes, revisar, mas.
export type RutasApp = Record<string, string>;

type Props = {
  tipo: "mi-espacio" | "panel";
  rutas: RutasApp;
  seccion?: string; // título de la sección en la cabecera móvil
  activo?: string; // id del destino actual
  novedades?: string[]; // Mi espacio: destinos con respuesta nueva (punto, nunca número)
  contadores?: Record<string, number>; // panel: números por destino
  banda?: ReactNode; // <Banda> de aviso global (sin conexión, ausencia, sesión por terminar)
  sinNavegacion?: boolean; // ingreso: solo cabecera y contenido
  rutaWeb?: string; // «Volver a la web»
  children: ReactNode;
};

const ES_TEXTO = "textarea, input:not([type]), input[type=text], input[type=email], input[type=search]";

export default function EstructuraApp({
  tipo,
  rutas,
  seccion,
  activo,
  novedades,
  contadores = {},
  banda,
  sinNavegacion,
  rutaWeb = "/",
  children,
}: Props) {
  const [ayuda, setAyuda] = useState(false);
  const [mas, setMas] = useState(false);
  const [ocultarBarra, setOcultarBarra] = useState(false);
  const miEspacio = tipo === "mi-espacio";

  // Formularios largos: la barra inferior se oculta mientras hay foco en un campo de texto.
  useEffect(() => {
    const alEnfocar = (e: FocusEvent) => {
      const t = e.target as Element | null;
      setOcultarBarra(!!t?.closest?.("[data-formulario-largo]") && !!t.matches?.(ES_TEXTO));
    };
    const alSalir = () => setOcultarBarra(false);
    document.addEventListener("focusin", alEnfocar);
    document.addEventListener("focusout", alSalir);
    return () => {
      document.removeEventListener("focusin", alEnfocar);
      document.removeEventListener("focusout", alSalir);
    };
  }, []);

  const base = miEspacio ? DESTINOS_MI_ESPACIO : DESTINOS_PANEL;
  const destinos: DestinoNav[] = base.map((d) => ({
    ...d,
    // En Mi espacio «Más» es una hoja (sin ruta); en el panel es una página.
    href: miEspacio && d.id === "mas" ? undefined : rutas[d.id],
    contador: miEspacio ? undefined : contadores[d.id],
  }));
  const etiqueta = miEspacio ? TEXTOS_ESTRUCTURA.miEspacio : TEXTOS_ESTRUCTURA.panel;

  const filasMas: FilaMas[] = [
    { id: "ajuste", texto: TEXTOS_ESTRUCTURA.ajuste, icono: "sliders-horizontal", href: rutas.ajuste },
    { id: "preferencias", texto: TEXTOS_ESTRUCTURA.preferencias, icono: "settings", href: rutas.preferencias },
    { id: "ayuda", texto: TEXTOS_FORM.ayudaInmediata, icono: "phone", onClick: () => setAyuda(true) },
    { id: "web", texto: TEXTOS_CABECERA.volver, icono: "arrow-up-right", href: rutaWeb, separadorAntes: true },
    { id: "salir", texto: TEXTOS_ESTRUCTURA.salir, icono: "log-out", href: rutas.salir },
  ];

  const pieLateral = miEspacio ? (
    <>
      <hr />
      {rutas.ajuste && (
        <Link to={rutas.ajuste} className="boton boton--secundario boton--ancho">
          {TEXTOS_ESTRUCTURA.ajuste}
        </Link>
      )}
      {rutas.preferencias && (
        <Link to={rutas.preferencias} className="enlace-util">
          <Icono nombre="settings" tamaño={16} />
          {TEXTOS_ESTRUCTURA.preferencias}
        </Link>
      )}
      <button type="button" className="enlace-util" aria-haspopup="dialog" onClick={() => setAyuda(true)}>
        <Icono nombre="phone" tamaño={16} />
        {TEXTOS_FORM.ayudaInmediata}
      </button>
    </>
  ) : undefined;

  return (
    <div className={`app app--${tipo}${sinNavegacion ? " app--sin-navegacion" : ""}`}>
      <EncabezadoApp
        inicio={rutas.hoy ?? rutaWeb}
        etiquetaLogo={miEspacio ? TEXTOS_ESTRUCTURA.logoMiEspacio : TEXTOS_ESTRUCTURA.logoPanel}
        seccion={seccion}
        onAyuda={miEspacio ? () => setAyuda(true) : undefined}
        ayudaAbierta={ayuda}
        rutaWeb={rutaWeb}
      />
      {banda}
      <div className="app__cuerpo">
        {!sinNavegacion && (
          <Lateral etiqueta={etiqueta} destinos={destinos} activo={activo} novedades={novedades} pie={pieLateral} />
        )}
        <main id="contenido" className="app__main">
          <div className="app__contenido">{children}</div>
        </main>
      </div>
      {!sinNavegacion && (
        <BarraInferior
          etiqueta={etiqueta}
          destinos={destinos}
          activo={activo}
          novedades={novedades}
          onMas={() => setMas(true)}
          masAbierta={mas}
          oculta={ocultarBarra}
        />
      )}
      {miEspacio && !sinNavegacion && (
        <Hoja abierta={mas} onCerrar={() => setMas(false)} titulo={TEXTOS_ESTRUCTURA.mas} className="hoja--mas">
          <ListaMas filas={filasMas} onElegir={() => setMas(false)} />
        </Hoja>
      )}
      {miEspacio && <HojaAyuda abierta={ayuda} onCerrar={() => setAyuda(false)} />}
    </div>
  );
}
