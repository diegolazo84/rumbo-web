// Registrar acción medible (maqueta de ChatGPT, 30-oct-2026): dentro del detalle de una acción
// que tiene cantidad objetivo y unidad (C4). La persona anota cuánto hizo y, si la base ya tiene
// la columna nota (migración 20261123000000), cómo se sintió. «Guardar acción» marca la acción
// (marcar_accion, +1 crédito como siempre) y después guarda la cantidad (anotar_cantidad) y la nota
// (anotar_nota). Editar lo anotado no vuelve a marcar: los créditos no cambian.
// Vista previa: lo anotado queda solo en la pantalla.
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icono, TEXTOS_CARGA } from "../../../components/app";
import { Campo, CampoArea, Formulario } from "../../../components/form";
import { cuentaComoHecha, type EstadoRegistro, type Ocurrencia } from "../../../data/ejemplo-app";
import { useEspacio } from "./comun";
import { T_DETALLE, T_REGISTRAR, cantidadTexto } from "./textos";

const MAX_NOTA = 200;
const MAX_CANTIDAD = 100000; // tope de anotar_cantidad

// Botones rápidos a partir de lo propuesto: hasta 6 se ofrece de 1 en 1; si no, mitad, lo
// propuesto, una vez y media y el doble (redondeados a 5 desde 20).
export function valoresRapidos(objetivo: number): number[] {
  if (objetivo <= 6) return Array.from({ length: objetivo }, (_, i) => i + 1);
  const redondear = (n: number) => (n >= 20 ? Math.max(5, Math.round(n / 5) * 5) : Math.max(1, Math.round(n)));
  return [...new Set([0.5, 1, 1.5, 2].map((f) => (f === 1 ? objetivo : redondear(objetivo * f))))].filter((n) => n <= MAX_CANTIDAD);
}

// Número entero válido para la base (1 a 100.000) o null.
export function leerCantidad(texto: string): number | null {
  const t = texto.trim();
  if (!/^\d{1,6}$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= MAX_CANTIDAD ? n : null;
}

type Props = {
  o: Ocurrencia & { medible: NonNullable<Ocurrencia["medible"]> };
  ventana: boolean; // dentro del plazo de registro
  anterior: boolean; // día pasado: se puede dejar pasar
  enHoja?: boolean;
  sinConexion?: boolean;
  registrar: (estado: EstadoRegistro | null, anuncio: string) => void; // marcar sin cantidad, desmarcar, dejar pasar
  anunciar: (texto: string) => void;
};

export default function RegistroMedible({ o, ventana, anterior, enHoja, sinConexion, registrar, anunciar }: Props) {
  const { servidor, R } = useEspacio();
  const { objetivo, unidad } = o.medible;
  const hecha = cuentaComoHecha(o.registro);
  const conNota = o.nota !== undefined; // la base ya guarda notas (o vista previa)
  const id = useId();

  // En la vista previa lo anotado vive aquí; en Mi espacio real llega con el contexto.
  const [local, setLocal] = useState<{ cantidad: number; nota: string | null } | null>(null);
  const cantidad = local?.cantidad ?? o.medible.cantidad;
  const nota = local ? local.nota : (o.nota ?? null);

  const [editando, setEditando] = useState(!hecha);
  const [valor, setValor] = useState(String(cantidad ?? objetivo));
  const [texto, setTexto] = useState(nota ?? "");
  const [invalido, setInvalido] = useState(false);
  const [estado, setEstado] = useState<"listo" | "guardando" | "error" | "error-despues">("listo");
  const [recien, setRecien] = useState(false);
  const zona = useRef<HTMLDivElement>(null);
  const moverFoco = useRef(false);

  // Si la acción se desmarca (aquí o en otra pestaña), vuelve el formulario.
  useEffect(() => {
    if (!hecha) {
      setEditando(true);
      setRecien(false);
    }
  }, [hecha]);
  useEffect(() => {
    if (!moverFoco.current) return;
    moverFoco.current = false;
    zona.current?.querySelector<HTMLElement>("h3, h4, [tabindex='-1'], input, button")?.focus();
  }, [editando]);

  const abrir = () => {
    setValor(String(cantidad ?? objetivo));
    setTexto(nota ?? "");
    setInvalido(false);
    setEstado("listo");
    moverFoco.current = true;
    setEditando(true);
  };

  const guardar = async () => {
    const n = leerCantidad(valor);
    if (n === null) {
      setInvalido(true);
      return;
    }
    if (sinConexion || estado === "guardando") return;
    const notaNueva = texto.trim() || null;
    const listo = () => {
      setEstado("listo");
      setRecien(!hecha);
      moverFoco.current = true;
      setEditando(false);
      anunciar(hecha ? T_REGISTRAR.anotaste(cantidadTexto(n, unidad)) : T_REGISTRAR.registrada);
    };
    if (!servidor) {
      setLocal({ cantidad: n, nota: notaNueva });
      if (!hecha) registrar("hecha", T_DETALLE.hecha);
      listo();
      return;
    }
    setEstado("guardando");
    let marcada = hecha;
    try {
      if (!marcada) {
        await servidor.registrar(o.id, "hecha");
        marcada = true;
      }
      await servidor.anotar(o.id, { cantidad: n, ...(conNota ? { nota: notaNueva } : {}) });
      listo();
    } catch {
      setEstado(marcada && !hecha ? "error-despues" : "error");
    }
  };

  if (hecha && !editando) {
    return (
      <div className="me-registrada" ref={zona}>
        <span className="me-hecha__circulo" aria-hidden="true">
          <Icono nombre="check" tamaño={20} />
        </span>
        <div className="me-registrada__textos">
          <p className="me-registrada__titulo" tabIndex={-1}>
            {recien ? T_REGISTRAR.registrada : o.registro === "corta" ? T_REGISTRAR.hechaCorta : T_REGISTRAR.hecha}
            <span className="me-registrada__credito">{T_REGISTRAR.credito}</span>
          </p>
          <p>{cantidad != null ? T_REGISTRAR.anotaste(cantidadTexto(cantidad, unidad)) : T_REGISTRAR.sinCantidad}</p>
          {nota && (
            <figure className="me-registrada__nota">
              <figcaption className="me-rotulo">{T_REGISTRAR.tuNota}</figcaption>
              <blockquote>
                <p>{nota}</p>
              </blockquote>
            </figure>
          )}
        </div>
        <div className="me-registrada__botones">
          {!enHoja && (
            <Link to={R.calendario} className="boton boton--primario">
              {T_REGISTRAR.verPlan}
            </Link>
          )}
          {ventana && (
            <button type="button" className="boton boton--secundario" aria-disabled={sinConexion || undefined} onClick={sinConexion ? undefined : abrir}>
              <Icono nombre="pencil" tamaño={16} />
              {T_REGISTRAR.editar}
            </button>
          )}
          {ventana && (
            <button type="button" className="boton boton--terciario" onClick={() => registrar(null, T_DETALLE.marcar)}>
              {T_DETALLE.desmarcar}
            </button>
          )}
        </div>
        {sinConexion && ventana && <p className="microcopia">{TEXTOS_CARGA.necesitasConexion}</p>}
      </div>
    );
  }

  const rapidos = valoresRapidos(objetivo);
  const elegido = leerCantidad(valor);
  const guardando = estado === "guardando";
  const bloqueado = guardando || sinConexion;
  return (
    <div ref={zona}>
      <Formulario onSubmit={() => void guardar()} className="me-registrar">
        <Campo
          id={`${id}-cantidad`}
          etiqueta={T_REGISTRAR.pregunta(unidad)}
          error={invalido ? T_REGISTRAR.invalido(unidad) : undefined}
          className="me-registrar__campo"
        >
          {(a11y) => (
            <div className="me-registrar__fila">
              <input
                {...a11y}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className="control me-registrar__numero"
                value={valor}
                onChange={(e) => {
                  setValor(e.target.value);
                  if (invalido && leerCantidad(e.target.value) !== null) setInvalido(false);
                }}
              />
              <span className="me-registrar__unidad">{unidad}</span>
            </div>
          )}
        </Campo>
        <div className="me-registrar__rapidos" role="group" aria-label={T_REGISTRAR.rapidos}>
          {rapidos.map((n) => (
            <button
              key={n}
              type="button"
              className="me-registrar__rapido"
              aria-pressed={elegido === n}
              aria-label={T_REGISTRAR.rapido(cantidadTexto(n, unidad))}
              onClick={() => {
                setValor(String(n));
                setInvalido(false);
              }}
            >
              {n}
            </button>
          ))}
        </div>
        {conNota && (
          <CampoArea
            id={`${id}-nota`}
            etiqueta={T_REGISTRAR.nota}
            opcional
            ayuda={T_REGISTRAR.notaAyuda}
            max={MAX_NOTA}
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="me-registrar__nota"
          />
        )}
        <div role="alert">
          {(estado === "error" || estado === "error-despues") && (
            <p className="campo__error">
              <Icono nombre="circle-alert" tamaño={16} />
              {estado === "error" ? T_REGISTRAR.error : T_REGISTRAR.errorDespues}
            </p>
          )}
        </div>
        <div className="me-registrar__botones">
          <button type="submit" className="boton boton--primario" aria-disabled={bloqueado || undefined}>
            {guardando ? T_REGISTRAR.guardando : hecha ? T_REGISTRAR.guardarCambios : T_REGISTRAR.guardar}
          </button>
          {hecha && (
            <button type="button" className="boton boton--terciario" onClick={() => setEditando(false)}>
              {T_REGISTRAR.cancelar}
            </button>
          )}
          {!hecha && o.versionCorta && (
            <button type="button" className="boton boton--secundario" aria-disabled={bloqueado || undefined} onClick={bloqueado ? undefined : () => registrar("corta", T_DETALLE.hechaCorta)}>
              {T_DETALLE.corta}
            </button>
          )}
          {!hecha && anterior && (
            <button type="button" className="boton boton--terciario" aria-disabled={bloqueado || undefined} onClick={bloqueado ? undefined : () => registrar("dejada", T_DETALLE.dejada)}>
              {T_DETALLE.dejar}
            </button>
          )}
        </div>
        {sinConexion && <p className="microcopia">{TEXTOS_CARGA.necesitasConexion}</p>}
      </Formulario>
    </div>
  );
}
