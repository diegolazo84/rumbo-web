// Vista previa · panel, Hoy (plataforma 5.3): una sola cola ordenada por vencimiento, no por
// tipo. Tarjetas .tarjeta--enlazada con qué es, de quién (nombre de pila), cuándo vence y un solo
// botón primario. Orden: plazo pasado → hoy → mañana → después → sin plazo. Sin celebraciones.
// Variantes (registro.ts): «cola» y «vacio».
import { Link } from "react-router-dom";
import { Icono } from "../../../components/app";
import { fechaLarga, mayuscula } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { cola, type Item } from "./cola";
import { Cabeza, venceTexto } from "./comun";
import { HOY } from "./ejemplo";
import { HOY_PANEL, T_PANEL } from "./textos";

function Tarjeta({ item }: { item: Item }) {
  const idQue = `${item.id}-que`;
  const idDetalle = `${item.id}-detalle`;
  const vence = item.vence ? venceTexto(item.vence) : null;
  const pasado = !!item.vence && item.vence < HOY;
  return (
    <li>
      <article className="tarjeta tarjeta--enlazada pa-cola__tarjeta" aria-labelledby={idQue}>
        <h2 id={idQue} className="pa-cola__que">
          {item.que}
        </h2>
        <div id={idDetalle} className="pa-cola__detalle">
          {item.quien && <p className="pa-cola__quien">{item.quien}</p>}
          {vence ? (
            <p className={pasado ? "pa-vence pa-vence--pasado" : "pa-vence"}>
              <Icono nombre="clock" tamaño={16} />
              <span>{pasado ? mayuscula(vence) : `${T_PANEL.vence} ${vence}`}</span>
            </p>
          ) : (
            <p className="pa-vence pa-vence--sin">{T_PANEL.sinPlazo}</p>
          )}
          {item.nota && <p className="pa-cola__nota">{item.nota}</p>}
        </div>
        <div className="tarjeta-pie">
          <Link to={item.href} className="boton boton--primario" aria-describedby={`${idQue} ${idDetalle}`}>
            {item.boton}
          </Link>
        </div>
      </article>
    </li>
  );
}

export default function Hoy({ estado }: PropsPantalla) {
  const vacio = estado === "vacio";
  const items = vacio ? [] : cola();
  return (
    <div className="pa-pantalla">
      <Cabeza ojo={HOY_PANEL.ojo} titulo={HOY_PANEL.titulo} bajada={mayuscula(fechaLarga(HOY))} />
      {items.length ? (
        <ol className="pa-cola">
          {items.map((it) => (
            <Tarjeta key={it.id} item={it} />
          ))}
        </ol>
      ) : (
        <p className="pa-vacio">{HOY_PANEL.vacio}</p>
      )}
    </div>
  );
}
