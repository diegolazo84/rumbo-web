// Bloque «¿Es para ti?» (3.17). Las listas salen de esParaTi() y noEsParaTi (rumbo.ts),
// las mismas de Condiciones §2.
import { Link } from "react-router-dom";
import { esParaTi, noEsParaTi } from "../data/rumbo";
import { ListaCheck, puntuar } from "./Bloques";

export default function Encaje() {
  return (
    <div className="encaje">
      <h3>¿Es para ti?</h3>
      <div className="encaje-columnas">
        <div>
          <h4>Es para ti si…</h4>
          <ListaCheck items={puntuar(esParaTi())} />
        </div>
        <div>
          <h4>Todavía no es para ti si…</h4>
          <ListaCheck tipo="no-incluye" items={puntuar(noEsParaTi)} />
        </div>
      </div>
      <p className="encaje-cierre">
        En esos casos mereces apoyo especializado. En{" "}
        <strong>
          <Link to="/ayuda/" data-umami-event="ayuda-inmediata">
            Ayuda inmediata
          </Link>
        </strong>{" "}
        encontrarás a quién llamar en Chile, a cualquier hora.
      </p>
    </div>
  );
}
