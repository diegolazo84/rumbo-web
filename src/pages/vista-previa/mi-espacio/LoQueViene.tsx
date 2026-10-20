// Rumbo 2.0, etapa 2 · «Lo que viene en Rumbo» dentro de Mi espacio (menú de la cabecera y pie de
// la barra lateral). Las mismas funciones que la portada (loQueViene de data/rumbo.ts), con su
// descripción. Tarjetas apagadas (tarjeta--pronto): no son enlaces, no tienen botones de
// contratar, reservar ni comprar, y no tienen fechas.
import Etiqueta from "../../../components/Etiqueta";
import { Icono } from "../../../components/app";
import { TituloSeccion } from "./Seccion";
import { T_LO_QUE_VIENE, T_SECCIONES } from "./textos";

export default function LoQueViene() {
  return (
    <div className="me-pantalla me-lo-que-viene">
      <TituloSeccion titulo={T_SECCIONES.loQueViene} icono="sparkles" bajada={T_LO_QUE_VIENE.bajada} />
      {T_LO_QUE_VIENE.grupos.map((g, i) => (
        <section key={g.titulo} className="me-bloque" aria-labelledby={`lqv-${i}`}>
          <h2 id={`lqv-${i}`} className="me-h2">
            {g.titulo}
          </h2>
          <ul className="me-lqv">
            {g.items.map((it) => (
              <li key={it.titulo} className="tarjeta tarjeta--pronto me-lqv__item">
                <div className="me-lqv__cabeza">
                  <Icono nombre="sparkles" tamaño={20} />
                  <h3 className="me-lqv__titulo">{it.titulo}</h3>
                </div>
                <p>{it.texto}</p>
                <Etiqueta variante="pronto">{T_SECCIONES.proximamente}</Etiqueta>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="microcopia">{T_LO_QUE_VIENE.nota}</p>
    </div>
  );
}
