// Formulario (.formulario) y bloque numerado (plataforma 3.1). El formulario es una columna
// con novalidate (los mensajes son los de formularios.ts, no los globos del navegador) y,
// si corresponde, el aviso inicial de obligatoriedad. El bloque numerado es un <fieldset> con
// el estilo de .tarjeta tal cual, el número de .paso y el texto oculto «Paso 1 de 3: …».
import type { FormEventHandler, ReactNode, Ref } from "react";
import { TEXTOS_FORM } from "../../data/formularios";

type FormularioProps = {
  children: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  enviando?: boolean; // aria-busy
  avisoObligatorios?: boolean; // «Todos los campos son obligatorios, salvo los que dicen “opcional”.»
  largo?: boolean; // formularios largos de Mi espacio: la barra inferior se oculta con foco en un texto (4.1.2)
  id?: string;
  ref?: Ref<HTMLFormElement>;
  className?: string;
  "aria-labelledby"?: string;
};

export default function Formulario({
  children,
  onSubmit,
  enviando,
  avisoObligatorios,
  largo,
  id,
  ref,
  className,
  ...resto
}: FormularioProps) {
  return (
    <form
      ref={ref}
      id={id}
      className={className ? `formulario ${className}` : "formulario"}
      noValidate
      aria-busy={enviando ? true : undefined}
      data-formulario-largo={largo ? "" : undefined}
      onSubmit={(e) => {
        // Sin backend en la vista previa: nunca se navega por envío nativo.
        e.preventDefault();
        onSubmit?.(e);
      }}
      {...resto}
    >
      {avisoObligatorios && <p className="formulario__aviso">{TEXTOS_FORM.avisoObligatorios}</p>}
      {children}
    </form>
  );
}

type BloqueProps = {
  numero: number;
  total: number;
  titulo: string; // «Tu meta»
  bajada?: ReactNode;
  children: ReactNode;
  id?: string;
};

export function BloqueNumerado({ numero, total, titulo, bajada, children, id }: BloqueProps) {
  return (
    <fieldset className="tarjeta bloque-numerado" id={id}>
      <legend className="bloque-numerado__leyenda">
        <span className="paso-numero" aria-hidden="true">
          {numero}
        </span>
        <span className="sr-only">{`Paso ${numero} de ${total}: `}</span>
        <span>{titulo}</span>
      </legend>
      {bajada && <p className="bloque-numerado__bajada">{bajada}</p>}
      <div className="bloque-numerado__campos">{children}</div>
    </fieldset>
  );
}
