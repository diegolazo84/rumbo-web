// Campo (.campo, plataforma 3.1). Orden en el DOM: label → ayuda → control → error.
// El control lleva aria-describedby="ayuda-x error-x" y aria-required si es obligatorio.
// El contenedor del error existe siempre (vacío y sin alto) para no mover el diseño ni
// romper aria-describedby. Sin asteriscos: lo opcional dice «(opcional)» en la etiqueta.
import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { TEXTOS_FORM } from "../../data/formularios";
import Icono from "../app/Icono";
import Contador from "./Contador";

export const idAyuda = (id: string) => `ayuda-${id}`;
export const idError = (id: string) => `error-${id}`;

// Ids para aria-describedby: ayuda (si hay), error (siempre) y extras (contador, sugerencia…).
export const describir = (id: string, conAyuda: boolean, ...extra: (string | false | undefined)[]) =>
  [conAyuda && idAyuda(id), idError(id), ...extra].filter(Boolean).join(" ");

// Etiqueta con «(opcional)» en tinta suave y peso 400.
export function TextoEtiqueta({ children, opcional }: { children: ReactNode; opcional?: boolean }) {
  return (
    <>
      {children}
      {opcional && <span className="campo__opcional"> {TEXTOS_FORM.opcional}</span>}
    </>
  );
}

export function AyudaCampo({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <div id={idAyuda(id)} className="campo__ayuda">
      {typeof children === "string" ? <p>{children}</p> : children}
    </div>
  );
}

// Siempre presente. Con error: icono circle-alert, prefijo oculto «Error:» y el texto.
export function ErrorCampo({ id, error }: { id: string; error?: string | null }) {
  return (
    <p id={idError(id)} className="campo__error">
      {error && (
        <>
          <Icono nombre="circle-alert" tamaño={16} />
          <span className="sr-only">{`${TEXTOS_FORM.prefijoError} `}</span>
          {error}
        </>
      )}
    </p>
  );
}

export type BaseCampo = {
  id: string;
  etiqueta: ReactNode;
  ayuda?: ReactNode; // texto o nodos (p. ej. un ejemplo con la etiqueta «Ejemplo»)
  error?: string | null;
  opcional?: boolean;
  className?: string;
  pie?: ReactNode; // bajo el control y antes del error (p. ej. sugerencia de correo)
};

// Envoltorio genérico para controles propios: recibe los atributos de accesibilidad ya armados.
export function Campo({
  id,
  etiqueta,
  ayuda,
  error,
  opcional,
  className,
  pie,
  children,
}: BaseCampo & {
  children: (a11y: { id: string; "aria-describedby": string; "aria-invalid"?: true; "aria-required"?: true }) => ReactNode;
}) {
  return (
    <div className={className ? `campo ${className}` : "campo"}>
      <label htmlFor={id} className="campo__etiqueta">
        <TextoEtiqueta opcional={opcional}>{etiqueta}</TextoEtiqueta>
      </label>
      <AyudaCampo id={id}>{ayuda}</AyudaCampo>
      {children({
        id,
        "aria-describedby": describir(id, !!ayuda),
        "aria-invalid": error ? true : undefined,
        "aria-required": opcional ? undefined : true,
      })}
      {pie}
      <ErrorCampo id={id} error={error} />
    </div>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> & { ref?: Ref<HTMLInputElement> };

// Texto de una línea (nombre, correo, código).
export function CampoTexto({ id, etiqueta, ayuda, error, opcional, className, pie, ref, ...input }: BaseCampo & InputProps) {
  return (
    <Campo id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} opcional={opcional} className={className} pie={pie}>
      {(a11y) => <input ref={ref} className="control" type="text" {...a11y} {...input} />}
    </Campo>
  );
}

type AreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "className" | "maxLength" | "minLength" | "value"> & {
  value: string;
  max: number; // maxlength: nunca se pasa
  min?: number;
  ref?: Ref<HTMLTextAreaElement>;
};

// Texto libre con contador siempre visible («{n} de {máx}»).
export function CampoArea({ id, etiqueta, ayuda, error, opcional, className, pie, max, min = 0, value, ref, ...area }: BaseCampo & AreaProps) {
  const idContador = `contador-${id}`;
  return (
    <div className={className ? `campo ${className}` : "campo"}>
      <label htmlFor={id} className="campo__etiqueta">
        <TextoEtiqueta opcional={opcional}>{etiqueta}</TextoEtiqueta>
      </label>
      <AyudaCampo id={id}>{ayuda}</AyudaCampo>
      <textarea
        ref={ref}
        id={id}
        className="control"
        maxLength={max}
        value={value}
        aria-describedby={describir(id, !!ayuda, idContador)}
        aria-invalid={error ? true : undefined}
        aria-required={opcional ? undefined : true}
        {...area}
      />
      <Contador id={idContador} n={value.length} recortado={value.trim().length} max={max} min={min} />
      {pie}
      <ErrorCampo id={id} error={error} />
    </div>
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "className"> & { ref?: Ref<HTMLSelectElement> };

export function CampoSelect({ id, etiqueta, ayuda, error, opcional, className, pie, ref, children, ...select }: BaseCampo & SelectProps) {
  return (
    <Campo id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} opcional={opcional} className={className} pie={pie}>
      {(a11y) => (
        <select ref={ref} className="control" {...a11y} {...select}>
          {children}
        </select>
      )}
    </Campo>
  );
}
