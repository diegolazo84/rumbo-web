// Bloques de texto compartidos: encabezado de sección (3.5), aviso (3.8),
// lista con check (3.7), acordeón (3.9) y pasos numerados (3.12).
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Segmento } from "../data/preguntas";
import { TEXTO_PLATAFORMA } from "../data/rumbo";
import Icono from "./Icono";
import RutaPuntos from "./RutaPuntos";

// ---------------------------------------------------------------------------
// Encabezado de sección: .ojo → h2 → .bajada → .acciones

type EncabezadoProps = {
  ojo?: string; // el cierre no lleva etiqueta superior
  titulo: ReactNode;
  nivel?: 1 | 2; // h1 en páginas de lectura, h2 en secciones
  bajada?: ReactNode;
  acciones?: ReactNode;
  children?: ReactNode; // contenido extra bajo las acciones (notas, enlaces)
  variante?: "partido" | "centrado";
  revelar?: boolean; // [data-revelar]: solo bajo el primer pantallazo
  className?: string;
};

export function Encabezado({ ojo, titulo, nivel = 2, bajada, acciones, children, variante, revelar, className }: EncabezadoProps) {
  const Titulo = nivel === 1 ? "h1" : "h2";
  const clases = ["encabezado", variante && `encabezado--${variante}`, className].filter(Boolean).join(" ");
  return (
    <div className={clases} data-revelar={revelar ? "" : undefined}>
      {ojo && <p className="ojo">{ojo}</p>}
      <Titulo>{titulo}</Titulo>
      {bajada && <p className="bajada">{bajada}</p>}
      {acciones && <div className="acciones">{acciones}</div>}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aviso: grilla icono + texto. Las variantes solo cambian el icono.
// Regla de seguridad: un aviso "phone" nunca va dentro de un <details> cerrado.

type AvisoProps = {
  icono: "info" | "shield-check" | "phone" | "lock";
  titulo?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Aviso({ icono, titulo, children, className }: AvisoProps) {
  return (
    <div className={className ? `aviso ${className}` : "aviso"}>
      <Icono nombre={icono} tamaño={20} className="aviso-icono" />
      <div className="aviso-cuerpo">
        {titulo && <p className="aviso-titulo">{titulo}</p>}
        {typeof children === "string" ? <p>{children}</p> : children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lista con check. Los iconos son decorativos (máscaras SVG en styles.css, así no se
// repite el SVG en cada ítem): la lista se lee como lista normal.

type ListaProps = {
  items: ReactNode[];
  tipo?: "check" | "no-incluye" | "neutra";
  enLinea?: boolean; // confianza bajo los CTA
  oscuro?: boolean; // sobre bosque
  className?: string;
};

export function ListaCheck({ items, tipo = "check", enLinea, oscuro, className }: ListaProps) {
  const clases = [
    "lista-check",
    tipo !== "check" && `lista-check--${tipo}`,
    enLinea && "lista-check--en-linea",
    oscuro && "lista-check--oscuro",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <ul className={clases}>
      {items.map((item, i) => (
        <li key={i}>
          <span className="lista-check-icono" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// Agrega «;» a cada ítem y «.» al último («Es para ti si…», Condiciones §2).
export const puntuar = (items: string[]) => items.map((t, i) => t + (i === items.length - 1 ? "." : ";"));

// ---------------------------------------------------------------------------
// Acordeón con <details>: funciona sin JS.

export type ItemAcordeon = { id: string; resumen: ReactNode; contenido: ReactNode };

type AcordeonProps = {
  items: ItemAcordeon[];
  compacto?: boolean; // niveles del ranking
  className?: string;
};

export function Acordeon({ items, compacto, className }: AcordeonProps) {
  const clases = ["acordeon", compacto && "acordeon--compacto", className].filter(Boolean).join(" ");
  return (
    <div className={clases}>
      {items.map((item) => (
        <details
          key={item.id}
          data-faq={compacto ? undefined : item.id}
          onToggle={(e) => {
            if (!compacto && e.currentTarget.open) window.umami?.track("faq-abrir", { id: item.id });
          }}
        >
          <summary>
            <span>{item.resumen}</span>
            <span className="acordeon-indicador" aria-hidden="true" />
          </summary>
          <div className="acordeon-respuesta">{item.contenido}</div>
        </details>
      ))}
    </div>
  );
}

// Respuesta armada con segmentos de datos (src/data/preguntas.ts).
export function Segmentos({ segmentos }: { segmentos: Segmento[] }) {
  return (
    <>
      {segmentos.map((s, i) => {
        if (typeof s === "string") return s;
        if (s.tipo === "interno")
          return (
            <Link key={i} to={s.href}>
              {s.texto}
            </Link>
          );
        return (
          <a key={i} href={s.href}>
            {s.texto}
            {s.tipo === "plataforma" && <span className="sr-only">{` ${TEXTO_PLATAFORMA}`}</span>}
          </a>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Pasos numerados: línea de tiempo del método (con ruta) o lista legal (lectura, sin ruta).

export type Paso = { titulo: ReactNode; contenido: ReactNode };

type PasosProps = {
  pasos: Paso[];
  lectura?: boolean; // páginas de lectura: número en terracota-texto y sin ruta
  nivelTitulo?: "h2" | "h3"; // h2 con estilo h3 en Privacidad y Condiciones
  className?: string;
};

export function Pasos({ pasos, lectura, nivelTitulo = "h3", className }: PasosProps) {
  const Titulo = nivelTitulo;
  const clases = ["pasos", lectura && "pasos--lectura", className].filter(Boolean).join(" ");
  return (
    <ol className={clases}>
      {pasos.map((p, i) => (
        <li key={i}>
          <span className="paso-numero" aria-hidden="true">
            {i + 1}
          </span>
          {!lectura && i < pasos.length - 1 && (
            <span className="paso-ruta">
              <RutaPuntos variante="vertical" />
            </span>
          )}
          <div className="paso-cuerpo">
            <Titulo className="paso-titulo">{p.titulo}</Titulo>
            {typeof p.contenido === "string" ? <p>{p.contenido}</p> : p.contenido}
          </div>
        </li>
      ))}
    </ol>
  );
}
