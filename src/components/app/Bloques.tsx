// Piezas simples de la aplicación (plataforma 4.1.3 y 4.1.4): tarjeta de meta, estado vacío,
// banda de avisos globales, carga y errores.
import type { ReactNode } from "react";
import type { CategoriaId } from "../../data/rumbo";
import RutaPuntos from "../RutaPuntos";
import Icono, { type NombreIconoApp } from "./Icono";

// ---------------------------------------------------------------------------
// .meta-tarjeta: tarjeta de progreso por meta con barra izquierda de 3 px en var(--cat).

export function MetaTarjeta({
  cat,
  children,
  como = "article",
  className,
}: {
  cat: CategoriaId;
  children: ReactNode;
  como?: "article" | "section" | "div" | "li";
  className?: string;
}) {
  const Elemento = como;
  return (
    <Elemento className={["tarjeta", "meta-tarjeta", className].filter(Boolean).join(" ")} data-cat={cat}>
      {children}
    </Elemento>
  );
}

// ---------------------------------------------------------------------------
// .estado-vacio: ilustración RutaPuntos (aria-hidden), encabezado, texto y una sola acción principal.
// Los estados del programa (4.3) son pantallas completas con este bloque y su H1.

type EstadoVacioProps = {
  titulo: ReactNode;
  nivel?: 1 | 2;
  ojo?: string;
  antes?: ReactNode; // saludo o etiquetas sobre el título
  children?: ReactNode; // texto
  accion?: ReactNode; // una sola acción principal (y, si corresponde, terciarias)
  ilustracion?: boolean;
  className?: string;
};

export function EstadoVacio({ titulo, nivel = 2, ojo, antes, children, accion, ilustracion = true, className }: EstadoVacioProps) {
  const Titulo = nivel === 1 ? "h1" : "h2";
  return (
    <div className={className ? `estado-vacio ${className}` : "estado-vacio"}>
      {ilustracion && <RutaPuntos className="estado-vacio__ruta" />}
      {ojo && <p className="ojo">{ojo}</p>}
      {antes}
      <Titulo className="estado-vacio__titulo" tabIndex={nivel === 1 ? -1 : undefined}>
        {titulo}
      </Titulo>
      {children && <div className="estado-vacio__texto">{typeof children === "string" ? <p>{children}</p> : children}</div>}
      {accion && <div className="acciones">{accion}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// .banda: banda superior en papel hondo para avisos globales (sin conexión, ausencia de
// Diego, sesión por terminar). En la vista previa, también el aviso de datos de ejemplo.

export function Banda({
  icono = "info",
  children,
  rol,
  className,
}: {
  icono?: NombreIconoApp | null;
  children: ReactNode;
  rol?: "status";
  className?: string;
}) {
  return (
    <div className={className ? `banda ${className}` : "banda"} role={rol}>
      <div className="banda__fila">
        {icono && <Icono nombre={icono} tamaño={16} className="banda__icono" />}
        <div className="banda__texto">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Carga, errores y conexión (4.1.4). Sin brillo animado ni esqueletos.

export const TEXTOS_CARGA = {
  cargando: "Cargando…",
  lento: "Esto está tardando más de lo normal. Puede ser tu conexión.",
  reintentar: "Reintentar",
  errorGlobalTitulo: "No pudimos cargar tu espacio.",
  errorGlobalTexto: "Puede ser tu conexión o un problema nuestro. Lo que ya registraste está guardado.",
  errorBloque: "No pudimos cargar esta parte.",
  sinConexion: "Sin conexión. Puedes ver lo que ya cargó; para marcar o enviar algo necesitas conexión.",
  necesitasConexion: "Necesitas conexión para guardar esto.",
} as const;

export function Cargando({ lento, onReintentar }: { lento?: boolean; onReintentar?: () => void }) {
  return (
    <div className="cargando" role="status">
      <p>{TEXTOS_CARGA.cargando}</p>
      {lento && (
        <>
          <p>{TEXTOS_CARGA.lento}</p>
          <button type="button" className="boton boton--secundario" onClick={onReintentar}>
            {TEXTOS_CARGA.reintentar}
          </button>
        </>
      )}
    </div>
  );
}

export function ErrorGlobal({ onReintentar }: { onReintentar?: () => void }) {
  return (
    <div className="aviso">
      <Icono nombre="info" tamaño={20} className="aviso-icono" />
      <div className="aviso-cuerpo">
        <p className="aviso-titulo">{TEXTOS_CARGA.errorGlobalTitulo}</p>
        <p>{TEXTOS_CARGA.errorGlobalTexto}</p>
        <button type="button" className="boton boton--secundario" onClick={onReintentar}>
          {TEXTOS_CARGA.reintentar}
        </button>
      </div>
    </div>
  );
}

export function ErrorBloque({ onReintentar }: { onReintentar?: () => void }) {
  return (
    <p className="error-bloque">
      {TEXTOS_CARGA.errorBloque}{" "}
      <button type="button" className="boton boton--terciario" onClick={onReintentar}>
        {TEXTOS_CARGA.reintentar}
      </button>
    </p>
  );
}

export function BandaSinConexion() {
  return (
    <Banda rol="status" icono="info">
      {TEXTOS_CARGA.sinConexion}
    </Banda>
  );
}
