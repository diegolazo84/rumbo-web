// Piezas comunes de las pantallas del panel en la vista previa (plataforma 5). Solo las usa este
// grupo: encabezado de pantalla, rutas entre pantallas, plazos («vence»), botón de copiar,
// lista de datos y desplegables.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Etiqueta from "../../../components/Etiqueta";
import { Icono } from "../../../components/app";
import { areas, planes, type CategoriaId } from "../../../data/rumbo";
import { diaCorto, sumarDias, type Iso } from "../../../lib/fechas";
import { HOY, habilesEntre } from "./ejemplo";
import { T_PANEL, VENCE } from "./textos";
// Estilos propios de este grupo (solo tokens de :root). Lo importan todas sus pantallas.
import "../../../styles/vista-panel.css";

// ---------------------------------------------------------------------------
// Rutas de la vista previa entre pantallas del panel (los ?id= se leen tras hidratar)

export { R, conId, ordenPorPlazo } from "./base";

// Lee un parámetro de la búsqueda DESPUÉS de hidratar: el HTML prerenderizado no tiene búsqueda,
// así que leerlo durante el primer render rompería la hidratación.
export function useParametro(nombre: string): string | null {
  const { search } = useLocation();
  const [valor, setValor] = useState<string | null>(null);
  useEffect(() => {
    setValor(new URLSearchParams(search).get(nombre));
  }, [search, nombre]);
  return valor;
}

// ---------------------------------------------------------------------------
// Plazos (5.3): «hoy», «mañana», «el jueves 16», «pasó su plazo hace 1 día hábil»

export function venceTexto(fecha: Iso, hoy: Iso = HOY): string {
  if (fecha < hoy) return VENCE.paso(Math.max(1, habilesEntre(fecha, hoy)));
  if (fecha === hoy) return VENCE.hoy;
  if (fecha === sumarDias(hoy, 1)) return VENCE.manana;
  return VENCE.el(diaCorto(fecha));
}

// Orden de la cola: plazo pasado → hoy → mañana → después → sin plazo.
// ---------------------------------------------------------------------------
// Encabezado de pantalla: ojo con la etiqueta «Ejemplo» (punteada), H1 y bajada.

export function EtiquetaEjemplo() {
  return <Etiqueta variante="ejemplo">{T_PANEL.ejemplo}</Etiqueta>;
}

type CabezaProps = {
  ojo?: string;
  titulo: ReactNode;
  antes?: ReactNode;
  bajada?: ReactNode;
  children?: ReactNode;
};

export function Cabeza({ ojo, titulo, antes, bajada, children }: CabezaProps) {
  return (
    <header className="pa-cabeza">
      <div className="pa-cabeza__fila">
        {ojo ? <p className="ojo">{ojo}</p> : <span />}
        <EtiquetaEjemplo />
      </div>
      {antes}
      <h1 className="pa-h1">{titulo}</h1>
      {bajada && <div className="pa-cabeza__bajada">{typeof bajada === "string" ? <p>{bajada}</p> : bajada}</div>}
      {children}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Etiquetas de plan, área y estado

export const planDe = (param: "coach" | "cercano") => planes.find((p) => p.param === param)!;

export function EtiquetaPlan({ plan }: { plan: "coach" | "cercano" }) {
  return <Etiqueta variante="nota">{planDe(plan).nombre}</Etiqueta>;
}

export function EtiquetaArea({ area }: { area: string }) {
  const a = areas.find((x) => x.id === area);
  if (!a) return null;
  return a.categoria ? (
    <Etiqueta variante="categoria" cat={a.categoria as CategoriaId} className="pa-etiqueta-larga">
      {a.nombre}
    </Etiqueta>
  ) : (
    <Etiqueta variante="nota" className="pa-etiqueta-larga">
      {a.nombre}
    </Etiqueta>
  );
}

export const nombreArea = (area: string) => areas.find((x) => x.id === area)?.nombre ?? area;

// ---------------------------------------------------------------------------
// Lista de datos (dl) en dos columnas desde 600 px

type FilaDato = readonly [ReactNode, ReactNode] | false | null | undefined | "" | 0;
export function Datos({ filas, className }: { filas: FilaDato[]; className?: string }) {
  return (
    <dl className={className ? `pa-datos ${className}` : "pa-datos"}>
      {filas.filter(Boolean).map((f, i) => {
        const [dt, dd] = f as readonly [ReactNode, ReactNode];
        return (
          <div key={i} className="pa-datos__fila">
            <dt>{dt}</dt>
            <dd>{dd}</dd>
          </div>
        );
      })}
    </dl>
  );
}

// ---------------------------------------------------------------------------
// Copiar al portapapeles con anuncio role="status" (la región existe siempre)

export function BotonCopiar({
  texto,
  etiqueta = T_PANEL.copiar,
  anuncio = T_PANEL.copiada,
  variante = "secundario",
}: {
  texto: string;
  etiqueta?: string;
  anuncio?: string;
  variante?: "primario" | "secundario" | "terciario";
}) {
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(temporizador.current), []);
  return (
    <span className="pa-copiar">
      <button
        type="button"
        className={`boton boton--${variante}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(texto);
          } catch {
            // Sin permiso de portapapeles (o en una vista previa sin https): no se rompe nada.
          }
          setCopiado(true);
          window.clearTimeout(temporizador.current);
          temporizador.current = window.setTimeout(() => setCopiado(false), 4000);
        }}
      >
        <Icono nombre="copy" tamaño={20} />
        {etiqueta}
      </button>
      <span role="status" className="pa-copiar__estado">
        {copiado ? anuncio : ""}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Descarga de un JSON de ejemplo («Exportar sus datos (JSON)»): se arma en el navegador.

export function descargarJson(nombreArchivo: string, datos: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ ejemplo: true, ...(datos as object) }, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// Desplegable: botón con aria-expanded que muestra un bloque debajo (formularios del panel)

export function Desplegable({
  boton,
  children,
  variante = "secundario",
  abierto: abiertoInicial = false,
  desactivado,
}: {
  boton: string;
  children: ReactNode;
  variante?: "primario" | "secundario" | "terciario";
  abierto?: boolean;
  desactivado?: string; // motivo: el botón queda con aria-disabled y la nota debajo
}) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const id = useId();
  const idNota = `${id}-nota`;
  return (
    <div className="pa-desplegable">
      <button
        type="button"
        className={`boton boton--${variante}`}
        aria-expanded={desactivado ? undefined : abierto}
        aria-controls={desactivado ? undefined : id}
        aria-disabled={desactivado ? true : undefined}
        aria-describedby={desactivado ? idNota : undefined}
        onClick={() => !desactivado && setAbierto((a) => !a)}
      >
        {boton}
      </button>
      {desactivado && (
        <p id={idNota} className="microcopia">
          {desactivado}
        </p>
      )}
      <div id={id} className="pa-desplegable__cuerpo" hidden={!abierto || !!desactivado}>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sección con h2 (estilo --t-h3)

export function Seccion({
  titulo,
  children,
  id,
  className,
  extra,
}: {
  titulo: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
  extra?: ReactNode; // a la derecha del título (etiqueta, contador)
}) {
  return (
    <section className={className ? `pa-seccion ${className}` : "pa-seccion"} aria-labelledby={id ? `${id}-titulo` : undefined}>
      <div className="pa-seccion__cabeza">
        <h2 id={id ? `${id}-titulo` : undefined} className="pa-h2">
          {titulo}
        </h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Casilla de ajuste (sin «(opcional)» ni aria-required): interruptores y marcas del panel.

export function CasillaAjuste({
  id,
  children,
  ayuda,
  checked,
  onChange,
}: {
  id: string;
  children: ReactNode;
  ayuda?: ReactNode;
  checked: boolean;
  onChange: (marcada: boolean) => void;
}) {
  return (
    <div className="campo campo--casilla">
      <label className="casilla" htmlFor={id}>
        <input id={id} type="checkbox" checked={checked} aria-describedby={ayuda ? `ayuda-${id}` : undefined} onChange={(e) => onChange(e.target.checked)} />
        <span>{children}</span>
      </label>
      {ayuda && (
        <div id={`ayuda-${id}`} className="campo__ayuda">
          {typeof ayuda === "string" ? <p>{ayuda}</p> : ayuda}
        </div>
      )}
    </div>
  );
}
