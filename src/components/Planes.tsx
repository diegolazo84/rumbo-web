// Planes (3.15): dos tarjetas con el mismo peso visual y el panel «Los dos planes».
// No existe variante destacada: no hay datos para recomendar uno.
import { microcopiaFormulario, noIncluyeEn, notaPrecio, operacion, planes, planesIncluyen, type Plan } from "../data/rumbo";
import { ListaCheck } from "./Bloques";
import { BotonPostular, EnlaceFlecha } from "./Enlaces";
import Etiqueta from "./Etiqueta";

export function TarjetaPlan({ plan }: { plan: Plan }) {
  const micro = microcopiaFormulario(plan.opcionFormulario);
  return (
    <article className="tarjeta plan">
      <Etiqueta variante="nota">{plan.rotulo}</Etiqueta>
      <h3>{plan.nombre}</h3>
      <p className="plan-para">{plan.paraQuien}</p>
      <p className="plan-precio">
        <span className="precio">{plan.precio}</span> <span className="plan-periodo">{plan.periodo}</span>
      </p>
      <p className="plan-nota">{notaPrecio(operacion)}</p>
      <p className="plan-semana">{plan.porSemana}</p>
      <hr />
      <ListaCheck items={plan.incluye} />
      <hr />
      <BotonPostular ancho apoyo={plan.param} ubicacion={plan.ubicacion}>
        {plan.cta}
      </BotonPostular>
      {micro && <p className="microcopia">{micro}</p>}
    </article>
  );
}

// Lo que incluyen y no incluyen los dos planes, con enlace a las condiciones.
export function PanelPlanes() {
  return (
    <div className="tarjeta panel-planes">
      <div className="panel-planes-columnas">
        <div>
          <h3>Los dos incluyen</h3>
          <ListaCheck items={planesIncluyen} />
        </div>
        <div>
          <h3>No incluyen</h3>
          <ListaCheck tipo="no-incluye" items={noIncluyeEn("planes")} />
        </div>
      </div>
      <EnlaceFlecha href="/condiciones/">Ver las condiciones del piloto</EnlaceFlecha>
    </div>
  );
}

// Grilla: dos planes lado a lado desde 600 px y el panel debajo, a ancho completo.
export default function GrillaPlanes() {
  return (
    <div className="planes">
      {planes.map((p) => (
        <TarjetaPlan key={p.id} plan={p} />
      ))}
      <PanelPlanes />
    </div>
  );
}
