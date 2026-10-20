// Capítulo 4: Dentro de Rumbo (5.2). Papel: qué existe hoy y qué no (transparencia) y,
// tras el separador, progreso y «Lo que viene en Rumbo». Sin CTA: los planes vienen a continuación.
import { loQueViene, reglasCreditosTextos } from "../../data/rumbo";
import { Encabezado, ListaCheck } from "../Bloques";
import { EtiquetaEstado } from "../Etiqueta";
import TarjetaRanking from "../TarjetaRanking";
import Transparencia from "../Transparencia";

export default function DentroDeRumbo() {
  return (
    <section className="capitulo">
      <div className="contenedor">
        <div id="que-recibes">
          <Encabezado
            revelar
            ojo="Qué recibes"
            titulo={
              // «Una persona» junta: que la segunda oración no empiece al final de la primera línea.
              <>
                Un calendario claro. <span className="nowrap-amplio">Una persona</span> que lo revisa contigo.
              </>
            }
            bajada="Tu espacio mantiene visible el programa entre una revisión y otra, y quien te acompaña ve tus avances y tus dificultades para que cada conversación tenga contexto. Aquí está, con claridad, qué existe hoy y qué no."
          />
          <div data-revelar="">
            <Transparencia />
          </div>
          <p className="microcopia que-recibes-nota">
            Mi espacio está en esta misma web. Entras con un código que te llega al correo que nos diste, sin contraseñas
            ni cuentas de otras empresas.
          </p>
        </div>

        <hr className="separador" />
        <div id="comunidad" className="comunidad">
          <div className="comunidad-texto" data-revelar="">
            <Encabezado
              ojo="Progreso"
              titulo={
                <>
                  Cada paso cuenta. <span className="frase">Y lo ves avanzar.</span>
                </>
              }
            >
              <p className="comunidad-intro">
                Cada acción que registras suma créditos, y completar un día programado suma más. Así subes de nivel a tu
                ritmo. <strong>Los créditos muestran tu avance: no son dinero, no se canjean y no miden tu valor.</strong>
              </p>
            </Encabezado>
            <ListaCheck items={reglasCreditosTextos()} />
          </div>
          <div className="comunidad-ranking" data-revelar="">
            <TarjetaRanking />
          </div>
        </div>

        <hr className="separador" />
        {/* «Lo que viene en Rumbo»: rotulado como no disponible, sin fechas ni botones de contratación. */}
        <div id="lo-que-viene">
          <Encabezado
            revelar
            ojo="Lo que viene en Rumbo"
            titulo="Lo que estamos construyendo."
            bajada="Nada de esto está disponible todavía. Cada parte se abre solo cuando funcione y esté probada."
          />
          <div className="transparencia transparencia--dos" data-revelar="">
            <article className="tarjeta tarjeta--pronto">
              <EtiquetaEstado estado="noDisponible" />
              <h3>Para el lanzamiento</h3>
              <ListaCheck tipo="neutra" items={loQueViene.lanzamiento} />
            </article>
            <article className="tarjeta tarjeta--pronto">
              <EtiquetaEstado estado="masAdelante" />
              <h3>En etapas posteriores</h3>
              <ListaCheck tipo="neutra" items={loQueViene.despues} />
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
