// Videollamadas del plan cercano en la ficha (C2): el coach (o el dueño) agenda cada semana con
// su enlace y después anota cómo fue. Las reglas las impone la base (programar_videollamada y
// anotar_videollamada): solo ciclos cercanos y activos, fecha futura, enlace https, y una ya
// anotada no se reprograma. Al agendar, la persona recibe un aviso en Mi espacio.
import { useState } from "react";
import Etiqueta from "../../../components/Etiqueta";
import { Icono } from "../../../components/app";
import { CampoTexto } from "../../../components/form";
import { fechaLarga, sumarDias, type Iso } from "../../../lib/fechas";
import { datos } from "../../../lib/supabase";
import { Datos, Seccion } from "../../vista-previa/panel/comun";
import { VIDEOLLAMADAS_PANEL as T } from "../../vista-previa/panel/textos";
import { Alerta, useDatosPanel, useEscritura } from "./comun";
import { lunesSemana, type FilaCicloPanel } from "./datos";

export type FilaVideollamada = { id: string; semana: number; programada_para: string; enlace: string; estado: string };

const dos = (n: number) => String(n).padStart(2, "0");
// Valor de <input type="datetime-local"> en la hora de este dispositivo.
const aLocal = (d: Date) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`;
const hora = (d: Date) => `${dos(d.getHours())}:${dos(d.getMinutes())}`;
const cuandoTexto = (ts: string) => {
  const d = new Date(ts);
  return `${fechaLarga(aLocal(d).slice(0, 10) as Iso)}, ${hora(d)}`;
};

// Sugerencia: el día de revisión de esa semana a la hora acordada (o vacío si no hay hora).
function sugerencia(c: FilaCicloPanel, n: number) {
  if (!c.hora_videollamada) return "";
  const dia = sumarDias(lunesSemana(c, n), (c.dia_revision ?? 1) - 1);
  return `${dia}T${c.hora_videollamada.slice(0, 5)}`;
}

export function VideollamadasFicha({ c, zona, lista, alCambiar }: { c: FilaCicloPanel; zona: string; lista: FilaVideollamada[]; alCambiar: () => Promise<void> }) {
  const [aviso, setAviso] = useState("");
  const semanas = Array.from({ length: c.semanas }, (_, i) => i + 1);
  return (
    <Seccion titulo={T.titulo} id="videollamadas" className="tarjeta pa-tarjeta">
      <p className="microcopia">{T.ayuda(zona)}</p>
      <p role="status" className="microcopia">
        {aviso}
      </p>
      <ul className="pa-filas">
        {semanas.map((n) => (
          <FilaSemana
            key={n}
            c={c}
            n={n}
            v={lista.find((x) => x.semana === n) ?? null}
            alGuardar={async (texto) => {
              setAviso(texto);
              await alCambiar();
            }}
          />
        ))}
      </ul>
    </Seccion>
  );
}

function FilaSemana({ c, n, v, alGuardar }: { c: FilaCicloPanel; n: number; v: FilaVideollamada | null; alGuardar: (aviso: string) => Promise<void> }) {
  const { sb } = useDatosPanel();
  const [editando, setEditando] = useState(false);
  const [correr, error, ocupado] = useEscritura();
  const id = `vl-${n}`;
  const estado = v ? T.estados[v.estado] : null;
  const yaPaso = v ? new Date(v.programada_para).getTime() <= Date.now() : false;
  const anotar = (e: string) =>
    correr(async () => {
      datos(await sb.rpc("anotar_videollamada", { p_videollamada: v!.id, p_estado: e }));
      await alGuardar(T.anotada(n));
    });
  return (
    <li className="tarjeta pa-fila" aria-labelledby={`${id}-titulo`}>
      <div className="pa-fila__cabeza">
        <h3 id={`${id}-titulo`} className="pa-h3">
          {T.semana(n)}
        </h3>
        {estado ? <Etiqueta variante={estado.variante}>{estado.texto}</Etiqueta> : <Etiqueta variante="pronto">{T.sinAgendar}</Etiqueta>}
      </div>
      {v && !editando && (
        <Datos
          className="pa-datos--apilada"
          filas={[
            [T.cuando, cuandoTexto(v.programada_para)],
            [
              T.enlace,
              <a href={v.enlace} target="_blank" rel="noopener noreferrer" className="pa-largo">
                {v.enlace}
                <span className="sr-only"> ({T.abrir})</span>
              </a>,
            ],
          ]}
        />
      )}
      {editando ? (
        <FormAgendar
          id={id}
          c={c}
          n={n}
          v={v}
          alGuardar={async () => {
            setEditando(false);
            await alGuardar(T.agendada(n));
          }}
          alCancelar={() => setEditando(false)}
        />
      ) : (
        <>
          <Alerta texto={error} />
          {(!v || v.estado === "programada") && c.estado === "activo" && (
            <div className="acciones">
              <button type="button" className="boton boton--terciario" aria-describedby={`${id}-titulo`} onClick={() => setEditando(true)}>
                <Icono nombre={v ? "pencil" : "video"} tamaño={20} />
                {v ? T.cambiar : T.agendar}
              </button>
            </div>
          )}
          {v?.estado === "programada" && (
            <div className="pa-pila pa-pila--chica">
              <h4 className="pa-h3">{T.anotar}</h4>
              <div className="acciones">
                {yaPaso && (
                  <>
                    <button type="button" className="boton boton--secundario" disabled={ocupado} aria-describedby={`${id}-titulo`} onClick={() => void anotar("realizada")}>
                      <Icono nombre="check" tamaño={20} />
                      {T.realizada}
                    </button>
                    <button type="button" className="boton boton--terciario" disabled={ocupado} aria-describedby={`${id}-titulo`} onClick={() => void anotar("no_asistio")}>
                      {T.noAsistio}
                    </button>
                  </>
                )}
                <button type="button" className="boton boton--terciario" disabled={ocupado} aria-describedby={`${id}-titulo`} onClick={() => void anotar("cancelada")}>
                  <Icono nombre="x" tamaño={20} />
                  {T.cancelarLlamada}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </li>
  );
}

function FormAgendar({ id, c, n, v, alGuardar, alCancelar }: { id: string; c: FilaCicloPanel; n: number; v: FilaVideollamada | null; alGuardar: () => Promise<void>; alCancelar: () => void }) {
  const { sb } = useDatosPanel();
  const [cuando, setCuando] = useState(v ? aLocal(new Date(v.programada_para)) : sugerencia(c, n));
  const [enlace, setEnlace] = useState(v?.enlace ?? "");
  const [errores, setErrores] = useState<{ cuando?: string; enlace?: string }>({});
  const [correr, error, ocupado] = useEscritura();
  return (
    <form
      className="pa-form"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const url = enlace.trim();
        const err = {
          cuando: !cuando || Number.isNaN(new Date(cuando).getTime()) ? T.errorCuando : undefined,
          enlace: !/^https:\/\/\S+$/.test(url) || url.length > 300 ? T.errorEnlace : undefined,
        };
        setErrores(err);
        if (err.cuando || err.enlace) {
          document.getElementById(err.cuando ? `${id}-cuando` : `${id}-enlace`)?.focus();
          return;
        }
        const ok = await correr(async () =>
          datos(
            await sb.rpc("programar_videollamada", {
              p_ciclo: c.id,
              p_semana: n,
              p_programada_para: new Date(cuando).toISOString(),
              p_enlace: url,
            }),
          ),
        );
        if (ok) await alGuardar();
      }}
    >
      <div className="pa-dos">
        <CampoTexto id={`${id}-cuando`} etiqueta={T.cuando} type="datetime-local" value={cuando} error={errores.cuando} onChange={(e) => setCuando(e.target.value)} />
        <CampoTexto
          id={`${id}-enlace`}
          etiqueta={T.enlace}
          ayuda={T.enlaceAyuda}
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://"
          value={enlace}
          error={errores.enlace}
          onChange={(e) => setEnlace(e.target.value)}
        />
      </div>
      <Alerta texto={error} />
      <div className="acciones">
        <button type="submit" className="boton boton--primario" disabled={ocupado}>
          {T.guardar}
        </button>
        <button type="button" className="boton boton--terciario" onClick={alCancelar}>
          {T.cancelar}
        </button>
      </div>
    </form>
  );
}
