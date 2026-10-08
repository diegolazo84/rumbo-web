// Vista previa · panel, solicitudes de ajuste (plataforma 5.9). Estados enviada → en revisión →
// respondida (con respuesta) o sin cambios (con explicación). En Acompañamiento cercano, casilla
// «Cuenta como reordenamiento» y plazo de 1 día hábil si la persona lo pidió; en Con
// acompañamiento, sin plazo propio («Para tu revisión del jueves 15»). «Resolver en el
// constructor» crea el borrador v+1 y vincula la solicitud. Funciona a 360 px.
import { useState } from "react";
import { Link } from "react-router-dom";
import Etiqueta from "../../../components/Etiqueta";
import { Icono } from "../../../components/app";
import { CampoArea } from "../../../components/form";
import { AJUSTE, LIMITES } from "../../../data/formularios";
import { diaCorto, mayuscula } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { Cabeza, CasillaAjuste, Datos, EtiquetaPlan, R, conId, venceTexto } from "./comun";
import { HOY, ajustes, participantes, type AjustePanel } from "./ejemplo";
import { AJUSTES, HOY_PANEL, T_PANEL } from "./textos";

const TIPO: Record<string, string> = Object.fromEntries(AJUSTE.tipo.opciones.map((o) => [o.valor, o.texto]));

export default function Ajustes(_: PropsPantalla) {
  // Primero lo que vence antes; lo que no tiene plazo, al final (5.1).
  const lista = [...ajustes].sort((a, b) => (a.venceEl && b.venceEl ? a.venceEl.localeCompare(b.venceEl) : a.venceEl ? -1 : b.venceEl ? 1 : 0));
  return (
    <div className="pa-pantalla">
      <Cabeza ojo={AJUSTES.ojo} titulo={AJUSTES.titulo} />
      <ul className="pa-filas">
        {lista.map((a) => (
          <Item key={a.id} a={a} />
        ))}
      </ul>
    </div>
  );
}

function Item({ a }: { a: AjustePanel }) {
  const p = participantes.find((x) => x.id === a.participanteId)!;
  // Abrirla la pasa a «En revisión» (la persona lo ve así).
  const [estado, setEstado] = useState<AjustePanel["estado"]>(a.estado === "enviada" ? "en_revision" : a.estado);
  const [respuesta, setRespuesta] = useState("");
  const [cuenta, setCuenta] = useState(a.reordenar);
  const [error, setError] = useState<string | null>(null);
  const id = `aj-${a.id}`;
  const cerrada = estado === "respondida" || estado === "sin_cambios";
  const resolver = (nuevo: "respondida" | "sin_cambios") => {
    if (!respuesta.trim()) {
      setError(AJUSTES.errorRespuesta);
      document.getElementById(`${id}-respuesta`)?.focus();
      return;
    }
    setError(null);
    setEstado(nuevo);
  };
  const e = AJUSTES.estados[estado];
  return (
    <li className="tarjeta pa-fila" aria-labelledby={`${id}-titulo`}>
      <div className="pa-fila__cabeza">
        <h2 id={`${id}-titulo`} className="pa-h3">
          <Link to={conId(R.participante, p.id, { pestana: "ajustes" })}>{a.nombre}</Link> · {TIPO[a.tipo]}
        </h2>
        <Etiqueta variante={e.variante}>{e.texto}</Etiqueta>
      </div>
      <div className="pa-etiquetas">
        <EtiquetaPlan plan={a.plan} />
        {a.reordenar && <Etiqueta variante="nota">{AJUSTE.reordenar}</Etiqueta>}
      </div>
      {a.venceEl ? (
        <p className={a.venceEl < HOY ? "pa-vence pa-vence--pasado" : "pa-vence"}>
          <Icono nombre="clock" tamaño={16} />
          <span>{`${T_PANEL.vence} ${venceTexto(a.venceEl)}`}</span>
        </p>
      ) : a.paraRevision ? (
        <p className="pa-vence pa-vence--sin">{HOY_PANEL.paraRevision(diaCorto(a.paraRevision))}</p>
      ) : null}
      {a.plan === "cercano" && <p className="microcopia">{HOY_PANEL.reordenamientosUsados(p.reordenamientosUsados ?? 0, 2)}</p>}
      <Datos
        className="pa-datos--apilada"
        filas={[
          [AJUSTES.acciones, a.acciones.length ? a.acciones.join(" · ") : "—"],
          [AJUSTES.desde, mayuscula(diaCorto(a.desde))],
          [AJUSTES.detalle, a.detalle],
        ]}
      />
      <p className="microcopia">{AJUSTES.enviadaEl(diaCorto(a.enviadaEl))}</p>

      {cerrada ? (
        <p className="pa-respuesta">{respuesta}</p>
      ) : (
        <form className="pa-form" noValidate onSubmit={(ev) => ev.preventDefault()}>
          <CampoArea
            id={`${id}-respuesta`}
            etiqueta={AJUSTES.respuesta}
            ayuda={AJUSTES.ayudaRespuesta}
            max={LIMITES.detalleAjuste.max}
            value={respuesta}
            error={error}
            rows={3}
            onChange={(ev) => {
              setRespuesta(ev.target.value);
              if (ev.target.value.trim()) setError(null);
            }}
          />
          {a.plan === "cercano" && (
            <CasillaAjuste id={`${id}-cuenta`} checked={cuenta} onChange={(v) => setCuenta(v)}>
              {AJUSTES.cuentaReordenamiento}
            </CasillaAjuste>
          )}
          <div className="acciones">
            <button type="button" className="boton boton--primario" onClick={() => resolver("respondida")}>
              {AJUSTES.responder}
            </button>
            <button type="button" className="boton boton--secundario" onClick={() => resolver("sin_cambios")}>
              {AJUSTES.sinCambios}
            </button>
            <Link to={R.constructor} className="boton boton--terciario">
              {AJUSTES.resolver}
            </Link>
          </div>
        </form>
      )}
    </li>
  );
}
