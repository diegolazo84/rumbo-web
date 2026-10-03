// Vista previa · panel, Participantes (plataforma 5.5): nombre, plan, «Semana {2} de {4}»,
// próxima revisión y estado del ciclo. Estados (registro.ts): lista y vacio («Todavía no hay
// participantes…»).
import { Link } from "react-router-dom";
import Etiqueta from "../../../components/Etiqueta";
import { diaCorto } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { Cabeza, R, conId, planDe } from "./comun";
import { participantes, type FichaParticipante } from "./ejemplo";
import { PARTICIPANTES as P, T_PANEL } from "./textos";

export function EtiquetaCiclo({ estado }: { estado: FichaParticipante["estadoCiclo"] }) {
  return <Etiqueta variante={estado === "en_curso" ? "activo" : "nota"}>{P.estadosCiclo[estado]}</Etiqueta>;
}

export const semanaTexto = (p: FichaParticipante) => (p.semana ? T_PANEL.semanaDe(p.semana, p.semanas) : "—");

export default function Participantes({ estado }: PropsPantalla) {
  const lista = estado === "vacio" ? [] : participantes;
  return (
    <div className="pa-pantalla">
      <Cabeza ojo={P.ojo} titulo={P.titulo} />
      {lista.length ? (
        <ul className="pa-filas">
          {lista.map((p) => (
            <li key={p.id} className="tarjeta tarjeta--enlazada pa-fila">
              <div className="pa-fila__cabeza">
                <h2 className="pa-fila__nombre">
                  <Link to={conId(R.participante, p.id)}>{p.nombre}</Link>
                </h2>
                <EtiquetaCiclo estado={p.estadoCiclo} />
              </div>
              <dl className="pa-fila__datos">
                <div>
                  <dt>{P.columnas.plan}</dt>
                  <dd>{planDe(p.plan).nombre}</dd>
                </div>
                <div>
                  <dt>{P.columnas.semana}</dt>
                  <dd>{semanaTexto(p)}</dd>
                </div>
                <div>
                  <dt>{P.columnas.proxima}</dt>
                  <dd>{diaCorto(p.proximaRevision)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pa-vacio">{P.vacio}</p>
      )}
    </div>
  );
}
