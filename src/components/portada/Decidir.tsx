// Capítulo 5: Decidir (5.2). Papel hondo: los dos planes con el mismo peso visual y,
// tras el separador, las preguntas frecuentes (src/data/preguntas.ts).
import { preguntasPorGrupo } from "../../data/preguntas";
import { operacion, postularHref, rutas, t } from "../../data/rumbo";
import { Acordeon, Encabezado, Segmentos } from "../Bloques";
import { EnlaceFlecha, SeAbrePlataforma } from "../Enlaces";
import GrillaPlanes from "../Planes";
import { bajadaPlanes } from "./textos";

// Cuatro grupos, cada uno con su h3 y su acordeón. Las preguntas que dependen de un
// dato ausente no se publican (preguntasVisibles).
function Preguntas() {
  return (
    <div className="partido-contenido preguntas" data-revelar="">
      {preguntasPorGrupo().map((g) => (
        <div key={g.id} className="preguntas-grupo">
          <h3>{g.titulo}</h3>
          <Acordeon
            items={g.preguntas.map((p) => ({
              id: p.id,
              resumen: p.pregunta,
              contenido: (
                <>
                  <p>
                    <Segmentos segmentos={p.respuesta} />
                  </p>
                  {p.enlaceExtra && (
                    <EnlaceFlecha href={p.enlaceExtra.href} evento="ayuda-inmediata">
                      {p.enlaceExtra.texto}
                    </EnlaceFlecha>
                  )}
                </>
              ),
            }))}
          />
        </div>
      ))}
    </div>
  );
}

export default function Decidir() {
  const grupo = operacion.tamanoPrimerGrupo;
  return (
    <section className="capitulo capitulo--hondo">
      <div className="contenedor">
        <div id="planes">
          <Encabezado
            revelar
            ojo="Planes"
            titulo="Ciclos de 4 semanas, con revisión humana cada semana."
            bajada={bajadaPlanes()}
          >
            {grupo && (
              <p className="bajada">
                {t("El primer grupo es pequeño, de {n} personas, para poder acompañar bien a cada una.", { n: grupo })}
              </p>
            )}
          </Encabezado>
          <div data-revelar="">
            <GrillaPlanes />
          </div>
          <p className="planes-ayuda">
            ¿No sabes cuál elegir?{" "}
            <strong>
              <a href={postularHref()} data-umami-event="postular" data-umami-event-ubicacion="plan-sin-elegir">
                Postula sin elegir plan
                <SeAbrePlataforma />
              </a>
            </strong>{" "}
            y lo vemos contigo antes de empezar. En el formulario, elige “Quiero que me orienten”.
          </p>
        </div>

        <hr className="separador" />
        {/* 5 columnas, como el método: con 4, «postular.» quedaría sola en su línea (aceptación 20). */}
        <div id="preguntas" className="partido">
          <Encabezado
            revelar
            variante="partido"
            ojo="Preguntas"
            titulo="Antes de postular."
            bajada="Lo que conviene saber antes de enviar tu solicitud."
          >
            <div className="preguntas-contacto">
              <EnlaceFlecha href={rutas.contacto} plataforma evento="contacto">
                ¿Otra duda? Escríbenos
              </EnlaceFlecha>
              <p className="microcopia">Si aún no postulas, escribe el correo donde quieres recibir la respuesta.</p>
            </div>
          </Encabezado>
          <Preguntas />
        </div>
      </div>
    </section>
  );
}
