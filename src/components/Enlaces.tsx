// Enlaces y botones compartidos (3.1, 3.2). Todo enlace que sale a la plataforma lleva
// el texto oculto «(se abre en la plataforma de Rumbo)»; todo enlace a /postular lleva
// data-umami-event="postular" y una ubicación única dentro de la página.
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { TEXTO_PLATAFORMA, postularHref } from "../data/rumbo";
import Icono, { type NombreIcono } from "./Icono";

// Texto oculto de salida. `antes` se lee justo antes, p. ej. «, Movimiento ».
export function SeAbrePlataforma({ antes = " " }: { antes?: string }) {
  return <span className="sr-only">{`${antes}${TEXTO_PLATAFORMA}`}</span>;
}

// Rutas internas ("/", "/privacidad/", "/#planes") van por el router; el resto es <a>.
const esInterna = (href: string) => href.startsWith("/") && !href.startsWith("//");

type Analitica = { evento?: string; ubicacion?: string };
const atributosAnalitica = ({ evento, ubicacion }: Analitica) => ({
  "data-umami-event": evento,
  "data-umami-event-ubicacion": ubicacion,
});

type EnlaceProps = Analitica & {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

// Enlace genérico: interno con <Link>, externo con <a>.
export function Enlace({ href, children, className, onClick, ...analitica }: EnlaceProps) {
  const extra = atributosAnalitica(analitica);
  if (esInterna(href)) {
    return (
      <Link to={href} className={className} onClick={onClick} {...extra}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className} onClick={onClick} {...extra}>
      {children}
    </a>
  );
}

type FlechaProps = Analitica & {
  href: string;
  children: string; // texto visible; la última palabra va pegada a la flecha
  plataforma?: boolean; // sale a la plataforma: flecha diagonal y texto oculto
  antesOculto?: string; // texto oculto adicional antes de «(se abre…)», p. ej. «, Movimiento »
  className?: string;
};

// Enlace con flecha (.enlace-flecha). La flecha nunca cae sola a la línea siguiente.
export function EnlaceFlecha({ href, children, plataforma, antesOculto, className, ...analitica }: FlechaProps) {
  const corte = children.lastIndexOf(" ");
  const inicio = corte >= 0 ? children.slice(0, corte + 1) : "";
  const ultima = children.slice(corte + 1);
  return (
    <Enlace href={href} className={className ? `enlace-flecha ${className}` : "enlace-flecha"} {...analitica}>
      <span>
        {inicio}
        <span className="nowrap">
          {ultima}
          <Icono nombre={plataforma ? "arrow-up-right" : "arrow-right"} tamaño={16} />
        </span>
        {plataforma && <SeAbrePlataforma antes={antesOculto ?? " "} />}
      </span>
    </Enlace>
  );
}

type UtilProps = Analitica & {
  href: string;
  children: string;
  icono?: NombreIcono; // icono antes del texto
  plataforma?: boolean; // agrega arrow-up-right (pegada a la última palabra) y el texto oculto
  className?: string;
  onClick?: () => void;
};

// Enlace utilitario (.enlace-util) de cabecera y pie.
export function EnlaceUtil({ href, children, icono, plataforma, className, onClick, ...analitica }: UtilProps) {
  const corte = plataforma ? children.lastIndexOf(" ") : -1;
  return (
    <Enlace
      href={href}
      className={className ? `enlace-util ${className}` : "enlace-util"}
      onClick={onClick}
      {...analitica}
    >
      {icono && <Icono nombre={icono} tamaño={16} />}
      {plataforma ? (
        <span>
          {children.slice(0, corte + 1)}
          <span className="nowrap">
            {children.slice(corte + 1)}
            <Icono nombre="arrow-up-right" tamaño={16} className="icono-salida" />
          </span>
          <SeAbrePlataforma />
        </span>
      ) : (
        <span>{children}</span>
      )}
    </Enlace>
  );
}

type BotonProps = Analitica & {
  href: string;
  children: ReactNode;
  variante?: "primario" | "secundario" | "terciario";
  chico?: boolean; // solo cabecera
  ancho?: boolean; // planes, menú móvil
  plataforma?: boolean;
  icono?: NombreIcono;
  className?: string;
  onClick?: () => void;
};

// Enlace con aspecto de botón (.boton). Sin icono de salida: el aviso es el texto oculto.
export function Boton({
  href,
  children,
  variante = "primario",
  chico,
  ancho,
  plataforma,
  icono,
  className,
  onClick,
  ...analitica
}: BotonProps) {
  const clases = ["boton", `boton--${variante}`, chico && "boton--chico", ancho && "boton--ancho", className]
    .filter(Boolean)
    .join(" ");
  return (
    <Enlace href={href} className={clases} onClick={onClick} {...analitica}>
      {icono && <Icono nombre={icono} tamaño={16} />}
      {children}
      {plataforma && <SeAbrePlataforma />}
    </Enlace>
  );
}

type PostularProps = {
  ubicacion: string; // única dentro de la página
  area?: string | null;
  apoyo?: string | null;
  children?: ReactNode;
  variante?: "primario" | "secundario";
  chico?: boolean;
  ancho?: boolean;
  className?: string;
};

// Botón a /postular con analítica y texto oculto. Por defecto, el CTA principal.
export function BotonPostular({ ubicacion, area, apoyo, children = "Cuéntanos tu meta", ...resto }: PostularProps) {
  return (
    <Boton href={postularHref({ area, apoyo })} plataforma evento="postular" ubicacion={ubicacion} {...resto}>
      {children}
    </Boton>
  );
}
