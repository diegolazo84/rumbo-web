// Navegación principal de Mi espacio y del panel (plataforma 4.1.2 y 5.2).
// - Móvil (<1024 px): .barra-inferior fija con 5 destinos de 56 px (icono 24 px, texto --t-micro).
// - Escritorio (≥1024 px): .lateral de 240 px en papel hondo con los mismos destinos y un pie.
// Activo: bosque con pastilla niebla y aria-current="page". Novedad (Mi espacio): punto
// terracota de 8 px y texto oculto, nunca un número. Contadores (solo panel): números.
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Icono, { type NombreIconoApp } from "./Icono";

export type DestinoNav = {
  id: string;
  texto: string;
  icono: NombreIconoApp;
  href?: string; // sin href: botón (p. ej. «Más», que abre la hoja)
  contador?: number; // solo el panel
  // Rótulo visible con corte silábico (guion suave) para la barra inferior: a 320 px un rótulo
  // largo pasa a dos líneas en vez de encimarse. El nombre accesible sigue siendo `texto`.
  corte?: string;
  // Nombre completo para la barra lateral de escritorio, donde sí cabe («Mi acompañamiento»).
  largo?: string;
};

// Destinos de Mi espacio (Rumbo 2.0, etapa 2): cinco secciones. «Más» ya no está en la barra:
// Preferencias, Mis datos, «Lo que viene en Rumbo» y Salir van en el menú de la cabecera.
// El href lo pone quien monta la estructura (ruta real o vista previa).
// Rótulos cortos en la barra (opción B, evaluada a 320, 360 y 390 px): el nombre accesible es
// el mismo texto visible (WCAG 2.5.3) y el nombre completo de la sección es el H1 de cada pantalla.
export const ROTULOS_BARRA = {
  A: { rumbo: "Mi Rumbo", plan: "Mi plan", acompanamiento: "Acompañamiento", comunidad: "Comunidad", logros: "Mis logros" },
  B: { rumbo: "Inicio", plan: "Plan", acompanamiento: "Acompañamiento", comunidad: "Comunidad", logros: "Logros" },
} as const;
const R = ROTULOS_BARRA.B;
export const DESTINOS_MI_ESPACIO: Omit<DestinoNav, "href">[] = [
  { id: "rumbo", texto: R.rumbo, icono: "compass", largo: "Mi Rumbo" },
  { id: "plan", texto: R.plan, icono: "calendar-days", largo: "Mi plan" },
  { id: "acompanamiento", texto: R.acompanamiento, icono: "message-circle", corte: "Acompa\u00ADñamiento", largo: "Mi acompañamiento" },
  { id: "comunidad", texto: R.comunidad, icono: "users", corte: "Comu\u00ADnidad", largo: "Comunidad" },
  { id: "logros", texto: R.logros, icono: "award", largo: "Mis logros" },
];

// Destinos del panel (5.2).
export const DESTINOS_PANEL: Omit<DestinoNav, "href">[] = [
  { id: "hoy", texto: "Hoy", icono: "sun" },
  { id: "solicitudes", texto: "Solicitudes", icono: "inbox", corte: "Solici\u00ADtudes" },
  { id: "participantes", texto: "Participantes", icono: "users", corte: "Partici\u00ADpantes" },
  { id: "revisar", texto: "Revisar", icono: "camera" },
  { id: "mas", texto: "Más", icono: "menu" },
];

export const TEXTO_NOVEDAD = ", hay una respuesta nueva";

type ItemProps = {
  destino: DestinoNav;
  activo?: string;
  novedad?: boolean;
  onBoton?: () => void;
  expandido?: boolean;
};

function Item({ destino, activo, novedad, onBoton, expandido }: ItemProps) {
  const contenido = (
    <>
      <span className="nav-app__icono">
        <Icono nombre={destino.icono} tamaño={24} />
        {novedad && <span className="nav-app__punto" aria-hidden="true" />}
      </span>
      {destino.corte ? (
        <>
          <span className="nav-app__texto" aria-hidden="true">
            {destino.corte}
          </span>
          <span className="sr-only">{destino.texto}</span>
        </>
      ) : (
        <span className="nav-app__texto">{destino.texto}</span>
      )}
      {novedad && <span className="sr-only">{TEXTO_NOVEDAD}</span>}
      {destino.contador ? <span className="nav-app__contador">{destino.contador}</span> : null}
    </>
  );
  if (!destino.href) {
    return (
      <button type="button" className="nav-app__item" aria-haspopup="dialog" aria-expanded={!!expandido} onClick={onBoton}>
        {contenido}
      </button>
    );
  }
  return (
    <Link to={destino.href} className="nav-app__item" aria-current={activo === destino.id ? "page" : undefined}>
      {contenido}
    </Link>
  );
}

type Props = {
  etiqueta: string; // nombre del landmark: «Mi espacio» o «Panel»
  destinos: DestinoNav[];
  activo?: string;
  novedades?: string[]; // ids con novedad
  onMas?: () => void;
  masAbierta?: boolean;
};

export function BarraInferior({ etiqueta, destinos, activo, novedades = [], onMas, masAbierta, oculta }: Props & { oculta?: boolean }) {
  return (
    <nav aria-label={etiqueta} className="barra-inferior nav-app" data-oculta={oculta ? "" : undefined}>
      <ul>
        {destinos.map((d) => (
          <li key={d.id}>
            <Item destino={d} activo={activo} novedad={novedades.includes(d.id)} onBoton={onMas} expandido={masAbierta} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

// En escritorio no se lista «Más» si no tiene ruta: su contenido va en el pie de la lateral.
export function Lateral({ etiqueta, destinos, activo, novedades = [], pie }: Props & { pie?: ReactNode }) {
  return (
    <nav aria-label={etiqueta} className="lateral nav-app">
      <ul>
        {destinos
          .filter((d) => d.href)
          .map((d) => (
            <li key={d.id}>
              <Item destino={d.largo ? { ...d, texto: d.largo, corte: undefined } : d} activo={activo} novedad={novedades.includes(d.id)} />
            </li>
          ))}
      </ul>
      {pie && <div className="lateral__pie">{pie}</div>}
    </nav>
  );
}

// Filas de la hoja del menú (52 px): «Pedir un ajuste» · «Preferencias» · «Mis datos» ·
// «Lo que viene en Rumbo» · separador · «Volver a la web» · «Salir».
export type FilaMas = { id: string; texto: string; icono: NombreIconoApp; href?: string; onClick?: () => void; separadorAntes?: boolean };

export function ListaMas({ filas, onElegir }: { filas: FilaMas[]; onElegir?: () => void }) {
  return (
    <ul className="lista-mas">
      {filas.map((f) => (
        <li key={f.id} className={f.separadorAntes ? "lista-mas__separada" : undefined}>
          {f.href ? (
            <Link to={f.href} className="lista-mas__fila" onClick={onElegir}>
              <Icono nombre={f.icono} tamaño={20} />
              {f.texto}
            </Link>
          ) : (
            <button
              type="button"
              className="lista-mas__fila"
              onClick={() => {
                onElegir?.();
                f.onClick?.();
              }}
            >
              <Icono nombre={f.icono} tamaño={20} />
              {f.texto}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
