// Piezas compartidas de las pantallas del panel real: los datos leídos (contexto), la alerta de
// error de una escritura, la ficha que no existe y la persona de ?id=.
import { createContext, useContext, useState } from "react";
import { Link } from "react-router-dom";
import { Icono } from "../../../components/app";
import type { Cliente } from "../../../lib/supabase";
import { Cabeza, useParametro } from "../../vista-previa/panel/comun";
import { textoError } from "../../vista-previa/panel/FichaSolicitud";
import { PANEL_REAL } from "../../vista-previa/panel/textos";
import { cicloDe, type DatosPanel } from "./datos";

export type PanelDatos = { sb: Cliente; d: DatosPanel; recargar: () => Promise<void> };
export const DatosContexto = createContext<PanelDatos | null>(null);
export function useDatosPanel(): PanelDatos {
  const v = useContext(DatosContexto);
  if (!v) throw new Error("sin datos del panel");
  return v;
}

// Alerta de error de una escritura (la región existe siempre para que se anuncie).
export function Alerta({ texto }: { texto: string | null }) {
  return (
    <div role="alert" className="envio__alerta">
      {texto && (
        <p className="aviso aviso--error-envio">
          <Icono nombre="info" tamaño={20} className="aviso-icono" />
          <span>{texto}</span>
        </p>
      )}
    </div>
  );
}

export function NoEncontrada({ volver }: { volver: string }) {
  return (
    <div className="pa-pantalla pa-pantalla--angosta">
      <Cabeza titulo={PANEL_REAL.noEncontrada} />
      <p>
        <Link to={volver}>{PANEL_REAL.volver}</Link>
      </p>
    </div>
  );
}

// Escritura con su error a la vista: [correr, error, ocupado].
export function useEscritura() {
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const correr = async (fn: () => Promise<unknown>) => {
    if (ocupado) return false;
    setOcupado(true);
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(textoError(e));
      return false;
    } finally {
      setOcupado(false);
    }
  };
  return [correr, error, ocupado] as const;
}

// Ids presentes al abrir la pantalla: lo resuelto sigue a la vista (con su estado) hasta salir.
export function useInstantanea(ids: string[]) {
  const [fijos] = useState(() => new Set(ids));
  return fijos;
}

// Persona de ?id= y su ciclo abierto (o el último).
export function useParticipante() {
  const id = useParametro("id");
  const { d } = useDatosPanel();
  const p = id ? d.participantes.find((x) => x.id === id) ?? null : null;
  const c = p ? cicloDe(d, p.id) : null;
  return { id, p, c };
}
