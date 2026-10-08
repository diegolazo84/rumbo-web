// Tarjeta de acción del calendario (.accion.accion--app, plataforma 4.1.3 y 4.4.5): grilla
// 56px 1fr 44px con barra izquierda de 3 px en var(--cat). La fila abre el detalle y el control
// de la derecha marca: dos objetivos separados de 44 px o más.
// - Control: casilla «Marcar “{título}” como hecha»; en acciones con foto, botón camera
//   «Subir foto de “{título}”».
// - Hecha: el check se rellena con var(--cat) y el título queda en tinta (sin tachado).
// - Detalle: «30 min · ● Proyecto» (o el nombre corto de la meta) y «· Hecha» / «· Foto en revisión».
// Sin rojo ni marcas de castigo en ningún estado.
import { useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { categorias, type CategoriaId } from "../../data/rumbo";
import { duracionTexto } from "../../lib/fechas";
import Icono from "./Icono";

export const TEXTOS_ACCION = {
  flexible: "Flexible",
  hecha: "Hecha",
  fotoEnRevision: "Foto en revisión",
  marcar: (titulo: string) => `Marcar “${titulo}” como hecha`,
  subirFoto: (titulo: string) => `Subir foto de “${titulo}”`,
} as const;

export type EstadoFila = "pendiente" | "hecha" | "revision";

type Props = {
  titulo: string;
  hora: string | null; // null = «Flexible»
  duracion: number; // minutos
  cat: CategoriaId;
  etiquetaMeta?: string; // nombre corto de la meta si hay dos de la misma categoría (por defecto, la categoría)
  estado?: EstadoFila;
  href?: string; // abre el detalle (página o vista previa)
  onAbrir?: () => void; // o abre la hoja de detalle
  onMarcar?: (marcada: boolean) => void;
  conFoto?: boolean;
  onFoto?: () => void;
  desactivada?: string; // nota: «Podrás marcarla desde el lunes 19.» / «Necesitas conexión para guardar esto.»
  nota?: ReactNode; // «Del lunes 12», «Se cruza con “…”»
  compacta?: boolean; // vista Semana
  extra?: ReactNode; // acciones extra bajo la fila (p. ej. «Ya la hice» en días anteriores)
  sinControl?: boolean; // sin casilla: las acciones van en `extra` («De días anteriores», 4.6)
};

export default function FilaAccion({
  titulo,
  hora,
  duracion,
  cat,
  etiquetaMeta,
  estado = "pendiente",
  href,
  onAbrir,
  onMarcar,
  conFoto,
  onFoto,
  desactivada,
  nota,
  compacta,
  extra,
  sinControl,
}: Props) {
  const idNota = useId();
  const hecha = estado === "hecha";
  const clases = ["accion", "accion--app", hecha && "accion--hecha", compacta && "accion--compacta", sinControl && "accion--sin-control"].filter(Boolean).join(" ");

  const cuerpo = (
    <>
      <span className="accion-hora">{hora ?? TEXTOS_ACCION.flexible}</span>
      <span className="accion-texto">
        <span className="accion-titulo">{titulo}</span>
        {/* El corte cae antes de «·», nunca después. */}
        <span className="accion-detalle">
          {duracionTexto(duracion)}{" "}
          <span className="nowrap">
            · <span className="accion-cat">{etiquetaMeta ?? categorias[cat].nombre}</span>
          </span>
          {hecha && (
            <>
              {" "}
              <span className="nowrap">· {TEXTOS_ACCION.hecha}</span>
            </>
          )}
          {estado === "revision" && (
            <>
              {" "}
              <span className="nowrap">· {TEXTOS_ACCION.fotoEnRevision}</span>
            </>
          )}
        </span>
        {nota && <span className="accion-nota">{nota}</span>}
        {desactivada && (
          <span id={idNota} className="accion-nota">
            {desactivada}
          </span>
        )}
      </span>
    </>
  );

  const abrir = href ? (
    <Link to={href} className="accion__abrir">
      {cuerpo}
    </Link>
  ) : onAbrir ? (
    <button type="button" className="accion__abrir" onClick={onAbrir}>
      {cuerpo}
    </button>
  ) : (
    <div className="accion__abrir">{cuerpo}</div>
  );

  const control = sinControl ? null : conFoto && estado === "pendiente" ? (
      <button
        type="button"
        className="accion__control"
        aria-disabled={desactivada ? true : undefined}
        aria-describedby={desactivada ? idNota : undefined}
        onClick={desactivada ? undefined : onFoto}
      >
        <Icono nombre="camera" tamaño={20} />
        <span className="sr-only">{TEXTOS_ACCION.subirFoto(titulo)}</span>
      </button>
    ) : (
      <label className="accion__control">
        <input
          type="checkbox"
          checked={hecha || estado === "revision"}
          aria-label={TEXTOS_ACCION.marcar(titulo)}
          aria-disabled={desactivada || estado === "revision" ? true : undefined}
          aria-describedby={desactivada ? idNota : undefined}
          onChange={(e) => {
            if (desactivada || estado === "revision") return;
            onMarcar?.(e.target.checked);
          }}
        />
      </label>
    );

  return (
    <div className={clases} data-cat={cat}>
      {abrir}
      {control}
      {extra && <div className="accion__extra">{extra}</div>}
    </div>
  );
}
