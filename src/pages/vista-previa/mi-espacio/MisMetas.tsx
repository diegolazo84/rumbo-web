// Rumbo 2.0, etapa 2 · Mi plan → Mis metas: cada meta del programa publicado con su categoría,
// su «para qué» y sus hitos (los mismos datos que ya lee Mi espacio). Reutiliza la tarjeta de
// meta de Mis logros sin la barra de avance, para no repetir lo que se mide allá.
import { Link } from "react-router-dom";
import { Icono } from "../../../components/app";
import { prepararLista, useEspacio } from "./comun";
import { TarjetaMeta } from "./Progreso";
import { AjustePlan, PestanasPlan, TituloSeccion } from "./Seccion";
import { T_PLAN, T_SECCIONES } from "./textos";

export default function MisMetas() {
  const { hoy, esc, R } = useEspacio();
  const lista = prepararLista({}, hoy, esc.ocurrencias);
  return (
    <div className="me-pantalla me-mis-metas">
      <TituloSeccion titulo={T_SECCIONES.plan} icono="calendar-days" ejemplo>
        <PestanasPlan activa="metas" />
      </TituloSeccion>
      <section className="me-bloque" aria-labelledby="metas-titulo">
        <div className="me-bloque__cabeza">
          <h2 id="metas-titulo" className="me-h2">
            {T_PLAN.metas}
          </h2>
          <p className="me-bloque__bajada">{T_PLAN.metasBajada}</p>
        </div>
        {esc.metas.length ? (
          <div className="me-metas">
            {esc.metas.map((m) => (
              <TarjetaMeta key={m.id} meta={m} lista={lista} hoy={hoy} sinAvance />
            ))}
          </div>
        ) : (
          <p className="me-bloque__bajada">{T_PLAN.metasVacio}</p>
        )}
        <p>
          <Link to={R.progreso} className="enlace-flecha">
            {T_PLAN.verAvance}
            <Icono nombre="arrow-right" tamaño={16} />
          </Link>
        </p>
      </section>
      <AjustePlan />
    </div>
  );
}
