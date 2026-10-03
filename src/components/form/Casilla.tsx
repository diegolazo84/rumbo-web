// Casilla (.casilla, plataforma 3.1): casilla nativa de 24 px en un <label> con grilla
// 24px 1fr; toda la fila es objetivo táctil (≥44 px). Los enlaces de la etiqueta (Privacidad,
// Condiciones) abren en la misma pestaña: el borrador queda guardado.
import type { ChangeEventHandler, ReactNode, Ref } from "react";
import { AyudaCampo, ErrorCampo, TextoEtiqueta, describir } from "./Campo";

type Props = {
  id: string;
  children: ReactNode; // texto de la etiqueta (puede llevar enlaces)
  ayuda?: ReactNode;
  error?: string | null;
  opcional?: boolean;
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
};

export default function Casilla({
  id,
  children,
  ayuda,
  error,
  opcional,
  name,
  checked,
  defaultChecked,
  onChange,
  disabled,
  inputRef,
  className,
}: Props) {
  const control = onChange ? { checked: !!checked, onChange } : { defaultChecked: defaultChecked ?? checked };
  return (
    <div className={className ? `campo campo--casilla ${className}` : "campo campo--casilla"}>
      <label className="casilla" htmlFor={id}>
        <input
          ref={inputRef}
          id={id}
          name={name ?? id}
          type="checkbox"
          disabled={disabled}
          aria-describedby={describir(id, !!ayuda)}
          aria-invalid={error ? true : undefined}
          aria-required={opcional ? undefined : true}
          {...control}
        />
        <span>
          <TextoEtiqueta opcional={opcional}>{children}</TextoEtiqueta>
        </span>
      </label>
      <AyudaCampo id={id}>{ayuda}</AyudaCampo>
      <ErrorCampo id={id} error={error} />
    </div>
  );
}
