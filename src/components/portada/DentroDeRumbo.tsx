// Capítulo 4: Dentro de Rumbo (5.2). Papel: qué existe hoy y qué no (transparencia) y,
// tras el separador, progreso y comunidad. Sin CTA: los planes vienen a continuación.
import { reglasCreditosTextos } from "../../data/rumbo";
import { Encabezado, ListaCheck } from "../Bloques";
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
            Mi espacio se abre en la plataforma de Rumbo, en otra dirección web, y por ahora pide iniciar sesión con una
            cuenta de ChatGPT.
          </p>
        </div>

        <hr className="separador" />
        <div id="comunidad" className="comunidad">
          <div className="comunidad-texto" data-revelar="">
            <Encabezado
              ojo="Progreso y comunidad"
              titulo={
                <>
                  Cada paso cuenta. <span className="frase">Tú decides cuáles compartes.</span>
                </>
              }
            >
              <p className="comunidad-intro">
                Cada acción que registras suma créditos, y completar un día programado suma más. Así subes de nivel a tu
                ritmo. <strong>Los créditos muestran tu avance: no son dinero, no se canjean y no miden tu valor.</strong>
              </p>
            </Encabezado>
            <ListaCheck items={reglasCreditosTextos()} />
            <p className="microcopia">La comunidad es solo para participantes del piloto. No hay chat.</p>
          </div>
          <div className="comunidad-ranking" data-revelar="">
            <TarjetaRanking />
          </div>
        </div>
      </div>
    </section>
  );
}
