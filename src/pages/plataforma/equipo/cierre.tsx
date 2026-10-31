// «Mensaje de cierre» en la ficha (informe de cierre de ciclo, 30-oct-2026): el coach de la
// persona (o el dueño) lo escribe desde la última semana del ciclo, y la persona lo ve en su
// informe de cierre. Usa guardar_mensaje_cierre (migración 20261122000000). Mientras la migración
// no esté aplicada, la columna no existe: la tarjeta no se muestra.
import { useEffect, useState } from "react";
import { CampoArea } from "../../../components/form";
import { fechaLarga, sumarDias, type Iso } from "../../../lib/fechas";
import { datos } from "../../../lib/supabase";
import { Seccion, usePanel } from "../../vista-previa/panel/comun";
import { MENSAJE_CIERRE_PANEL as T } from "../../vista-previa/panel/textos";
import { Alerta, useDatosPanel, useEscritura } from "./comun";
import type { FilaCicloPanel } from "./datos";

type Fila = { mensaje_cierre: string | null; mensaje_cierre_en: string | null; mensaje_cierre_por: string | null };

export function MensajeCierreFicha({ c }: { c: FilaCicloPanel }) {
  const { sb } = useDatosPanel();
  const { hoy } = usePanel();
  const [fila, setFila] = useState<Fila | null | undefined>(undefined);
  const [autor, setAutor] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [errCampo, setErrCampo] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [correr, error, ocupado] = useEscritura();
  const abierto = c.estado === "cerrado" || hoy >= sumarDias(c.fin, -6);

  const leer = async () => {
    const r = await sb.from("ciclos").select("mensaje_cierre,mensaje_cierre_en,mensaje_cierre_por").eq("id", c.id).maybeSingle();
    if (r.error) return setFila(null); // migración sin aplicar
    const f = r.data as Fila | null;
    setFila(f ?? null);
    setTexto(f?.mensaje_cierre ?? "");
    if (f?.mensaje_cierre_por) {
      const e = await sb.from("equipo").select("nombre").eq("user_id", f.mensaje_cierre_por).maybeSingle();
      setAutor((e.data as { nombre: string } | null)?.nombre ?? null);
    } else setAutor(null);
  };
  useEffect(() => {
    if (abierto) void leer().catch(() => setFila(null));
  }, [c.id, abierto]);

  if (!abierto || !fila) return null;
  const guardar = async (valor: string) => {
    setAviso("");
    const v = valor.trim();
    if (v && (v.length < 10 || v.length > 800)) {
      setErrCampo(T.error);
      document.getElementById("cierre-mensaje")?.focus();
      return;
    }
    setErrCampo(null);
    const ok = await correr(async () => datos(await sb.rpc("guardar_mensaje_cierre", { p_ciclo: c.id, p_mensaje: v })));
    if (ok) {
      await leer();
      setAviso(v ? T.guardado : T.quitado);
    }
  };
  return (
    <Seccion titulo={T.titulo} id="mensaje-cierre" className="tarjeta pa-tarjeta">
      <p className="microcopia">{T.ayuda}</p>
      <form
        className="pa-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void guardar(texto);
        }}
      >
        <CampoArea id="cierre-mensaje" etiqueta={T.campo} placeholder={T.ejemplo} max={800} min={10} rows={4} value={texto} error={errCampo} onChange={(e) => setTexto(e.target.value)} />
        {fila.mensaje_cierre && fila.mensaje_cierre_en && (
          <p className="microcopia">{T.escrito(autor ?? "el equipo", fechaLarga(fila.mensaje_cierre_en.slice(0, 10) as Iso))}</p>
        )}
        <Alerta texto={error} />
        <div className="acciones">
          <button type="submit" className="boton boton--primario" disabled={ocupado}>
            {T.guardar}
          </button>
          {fila.mensaje_cierre && (
            <button type="button" className="boton boton--terciario" disabled={ocupado} onClick={() => void guardar("")}>
              {T.quitar}
            </button>
          )}
        </div>
        <p role="status" className="microcopia">
          {aviso}
        </p>
      </form>
    </Seccion>
  );
}
