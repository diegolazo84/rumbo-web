// Vista previa · panel, Hoy (plataforma 5.3): una sola cola ordenada por vencimiento, no por
// tipo, agrupada en tramos (vencido, hoy, mañana, más adelante, sin plazo) con su cantidad, para
// ver de un vistazo qué no puede esperar. Tarjetas .tarjeta--enlazada con qué es, de quién (nombre de pila), cuándo vence y un solo
// botón primario. Orden: plazo pasado → hoy → mañana → después → sin plazo. Sin celebraciones.
// Variantes (registro.ts): «cola» y «vacio».
import { Link } from "react-router-dom";
import { Icono } from "../../../components/app";
import { fechaLarga, mayuscula, sumarDias, type Iso } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { cola, type Item } from "./cola";
import { Cabeza, usePanel, useVence } from "./comun";
import { HOY_PANEL, T_PANEL } from "./textos";

export function Tarjeta({ item }: { item: Item }) {
  const { hoy } = usePanel();
  const venceTexto = useVence();
  const idQue = `${item.id}-que`;
  const idDetalle = `${item.id}-detalle`;
  const vence = item.vence ? venceTexto(item.vence) : null;
  const pasado = !!item.vence && item.vence < hoy;
  const urgencia = pasado ? "pasado" : item.vence === hoy ? "hoy" : undefined;
  return (
    <li>
      <article className="tarjeta tarjeta--enlazada pa-cola__tarjeta" data-urgencia={urgencia} aria-labelledby={idQue}>
        <h3 id={idQue} className="pa-cola__que">
          {item.que}
        </h3>
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
  return <ColaHoy items={estado === "vacio" ? [] : cola()} />;
}

type Tramo = { id: string; titulo: string; items: Item[] };

// Reparte la cola (ya ordenada) en tramos por plazo. Los tramos vacíos no se muestran.
function tramos(items: Item[], hoy: Iso): Tramo[] {
  const manana = sumarDias(hoy, 1);
  const t: Tramo[] = HOY_PANEL.tramos.map((tr) => ({ ...tr, items: [] as Item[] }));
  for (const it of items) {
    const i = !it.vence ? 4 : it.vence < hoy ? 0 : it.vence === hoy ? 1 : it.vence === manana ? 2 : 3;
    t[i].items.push(it);
  }
  return t.filter((tr) => tr.items.length);
}

// La cola con los ítems ya armados (vista previa: cola.ts; panel real: con los datos de la base).
export function ColaHoy({ items }: { items: Item[] }) {
  const { hoy } = usePanel();
  const grupos = tramos(items, hoy);
  const urgentes = grupos.filter((g) => g.id === "pasado" || g.id === "hoy").reduce((n, g) => n + g.items.length, 0);
  return (
    <div className="pa-pantalla">
      <Cabeza ojo={HOY_PANEL.ojo} titulo={HOY_PANEL.titulo} bajada={mayuscula(fechaLarga(hoy))} />
      {items.length ? (
        <>
          <p className="pa-cola__resumen">{HOY_PANEL.resumen(items.length, urgentes)}</p>
          {grupos.map((g) => (
            <section key={g.id} className="pa-tramo" data-tramo={g.id} aria-labelledby={`tramo-${g.id}`}>
              <h2 id={`tramo-${g.id}`} className="pa-tramo__titulo">
                {g.titulo} <span className="pa-tramo__cuenta">{g.items.length}</span>
              </h2>
              <ol className="pa-cola">
                {g.items.map((it) => (
                  <Tarjeta key={it.id} item={it} />
                ))}
              </ol>
            </section>
          ))}
        </>
      ) : (
        <p className="pa-vacio">{HOY_PANEL.vacio}</p>
      )}
    </div>
  );
}
