// Opción en tarjeta (.opcion, plataforma 3.1): <label> que envuelve un radio o una casilla
// nativos y visibles (22 px). Marcada (:has(:checked)): borde 2 px bosque y fondo niebla; en
// áreas, borde var(--cat) y mosaico var(--cat-fondo). «Más adelante»: contorno, fondo
// transparente. El grupo es un <fieldset> con su <legend> (GrupoOpciones).
import type { ChangeEventHandler, ReactNode, Ref } from "react";
import type { CategoriaId } from "../../data/rumbo";
import Icono, { type NombreIconoApp } from "../app/Icono";
import { AyudaCampo, ErrorCampo, TextoEtiqueta, describir } from "./Campo";

export type OpcionProps = {
  tipo?: "radio" | "checkbox";
  name: string;
  value: string;
  titulo: ReactNode;
  linea?: ReactNode; // línea secundaria en --t-xs tinta suave
  etiquetas?: ReactNode; // <Etiqueta> («Seguimiento semanal», «Más adelante», «No es terapia»…)
  extra?: ReactNode; // contenido adicional (p. ej. el precio)
  icono?: NombreIconoApp; // mosaico de icono
  cat?: CategoriaId | null; // color de categoría (áreas)
  masAdelante?: boolean; // área «Más adelante» (contorno)
  chica?: boolean; // días de la semana: tarjeta compacta en fila
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
  describedBy?: string;
  inputRef?: Ref<HTMLInputElement>;
  id?: string;
};

export function Opcion({
  tipo = "radio",
  name,
  value,
  titulo,
  linea,
  etiquetas,
  extra,
  icono,
  cat,
  masAdelante,
  chica,
  checked,
  defaultChecked,
  onChange,
  disabled,
  describedBy,
  inputRef,
  id,
}: OpcionProps) {
  const clases = ["opcion", masAdelante && "opcion--mas-adelante", chica && "opcion--chica", icono && "opcion--con-icono"]
    .filter(Boolean)
    .join(" ");
  // Sin onChange no hay control: se usa defaultChecked para no dejar un campo de solo lectura.
  const control = onChange ? { checked: !!checked, onChange } : { defaultChecked: defaultChecked ?? checked };
  return (
    <label className={clases} data-cat={cat ?? undefined}>
      <input
        ref={inputRef}
        id={id}
        className="opcion__control"
        type={tipo}
        name={name}
        value={value}
        disabled={disabled}
        aria-describedby={describedBy}
        {...control}
      />
      <span className="opcion__cuerpo">
        <span className="opcion__cabeza">
          {icono && (
            <span className="icono-mosaico opcion__mosaico">
              <Icono nombre={icono} tamaño={22} />
            </span>
          )}
          <span className="opcion__titulo">{titulo}</span>
        </span>
        {linea && <span className="opcion__linea">{linea}</span>}
        {etiquetas && <span className="opcion__etiquetas">{etiquetas}</span>}
        {extra}
      </span>
    </label>
  );
}

type GrupoProps = {
  id: string; // base de los ids de ayuda y error
  leyenda: ReactNode;
  ayuda?: ReactNode;
  error?: string | null;
  opcional?: boolean;
  tipo?: "radio" | "checkbox"; // radio: role="radiogroup"
  columnas?: 1 | 2 | "fila"; // 2 desde 600 px; «fila» para opciones chicas (días)
  antes?: ReactNode; // contenido entre la ayuda y las opciones
  despues?: ReactNode; // contenido tras las opciones y antes del error (p. ej. <details> «¿Tu meta es de otra área?»)
  children: ReactNode;
  className?: string;
};

// Grupo de opciones: <fieldset> + <legend>, ayuda y error ligados al grupo.
export function GrupoOpciones({
  id,
  leyenda,
  ayuda,
  error,
  opcional,
  tipo = "radio",
  columnas = 1,
  antes,
  despues,
  children,
  className,
}: GrupoProps) {
  const clases = ["grupo-opciones", className].filter(Boolean).join(" ");
  return (
    <fieldset
      id={id}
      className={clases}
      role={tipo === "radio" ? "radiogroup" : undefined}
      aria-describedby={describir(id, !!ayuda)}
      aria-required={tipo === "radio" && !opcional ? true : undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className="campo__etiqueta">
        <TextoEtiqueta opcional={opcional}>{leyenda}</TextoEtiqueta>
      </legend>
      <AyudaCampo id={id}>{ayuda}</AyudaCampo>
      {antes}
      <div className={`grupo-opciones__lista grupo-opciones__lista--${columnas}`}>{children}</div>
      {despues}
      <ErrorCampo id={id} error={error} />
    </fieldset>
  );
}
