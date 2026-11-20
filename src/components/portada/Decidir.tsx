// Capítulo 5: Decidir (5.2). Papel hondo: los dos planes con el mismo peso visual y,
// tras el separador, las preguntas frecuentes (src/data/preguntas.ts).
import { fotos } from "../../data/fotos";
import { preguntasPorGrupo } from "../../data/preguntas";
import { FORMULARIO_EXTERNO, operacion, postularHref, rutas, t } from "../../data/rumbo";
import { Acordeon, Encabezado, Segmentos } from "../Bloques";
import { Enlace, EnlaceFlecha, SeAbrePlataforma } from "../Enlaces";
import Foto from "../Foto";
import GrillaPlanes from "../Planes";
import { bajadaPlanes } from "./textos";

// Cuatro grupos, cada uno con su h3 y su acordeón. Las preguntas que dependen de un
// dato ausente no se publican (preguntasVisibles).
function Preguntas() {
  return (
    <div className="partido-contenido preguntas">
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

// Oferta del grupo fundador: cada pieza aparece solo cuando su dato existe en rumbo.ts
// (conversación de encaje con su agenda; garantía cuando la revisión legal la apruebe).
function OfertaFundador() {
  const { conversacionEncaje: c, garantiaPrimeraSemana } = operacion;
  if (!c && !garantiaPrimeraSemana) return null;
  return (
    <div className="oferta">
      {c && (
        <div className="oferta-item">
          <h3>{t("Conversa {m} minutos antes de pagar.", { m: c.minutos })}</h3>
          <p>Una conversación gratis con quien te acompañaría, para ver si Rumbo calza con tu meta y tu semana.</p>
          <Enlace href={c.agenda} evento="conversacion" ubicacion="planes" className="boton boton--secundario">
            {t("Agendar {m} minutos", { m: c.minutos })}
          </Enlace>
        </div>
      )}
      {garantiaPrimeraSemana && (
        <div className="oferta-item">
          <h3>Primera semana sin riesgo.</h3>
          <p>Si después de tu primera revisión sientes que no te sirve, te devolvemos el 100 % de lo que pagaste.</p>
        </div>
      )}
    </div>
  );
}

export default function Decidir() {
  const grupo = operacion.tamanoPrimerGrupo;
  return (
    <section className="capitulo capitulo--hondo">
      <div className="contenedor">
        <div id="planes">
          <div className="planes-cabeza">
            <Encabezado
              titulo="Ciclos de 4 semanas, con revisión humana cada semana."
              bajada={bajadaPlanes()}
            >
              {grupo && (
                <p className="bajada">
                  {t("El primer grupo es pequeño, de {n} personas, para poder acompañar bien a cada una.", { n: grupo })}
                </p>
              )}
            </Encabezado>
            <div className="planes-foto">
              <Foto foto={fotos.planes} sizes="(min-width: 1024px) 420px, calc(100vw - 32px)" />
            </div>
          </div>
          <OfertaFundador />
          <GrillaPlanes />
          <p className="planes-ayuda">
            ¿No sabes cuál elegir?{" "}
            <strong>
              <Enlace href={postularHref()} evento="postular" ubicacion="plan-sin-elegir">
                Postula sin elegir plan
                {FORMULARIO_EXTERNO && <SeAbrePlataforma />}
              </Enlace>
            </strong>{" "}
            {/* La opción de la plataforma de ChatGPT; en el formulario propio es «Todavía no lo sé» (3.6). */}
            {`y lo vemos contigo antes de empezar. En el formulario, elige “${FORMULARIO_EXTERNO ? "Quiero que me orienten" : "Todavía no lo sé"}”.`}
          </p>
        </div>

        <hr className="separador" />
        {/* 5 columnas, como el método: con 4, «postular.» quedaría sola en su línea (aceptación 20). */}
        <div id="preguntas" className="partido">
          <Encabezado
            variante="partido"
            titulo="Antes de postular."
            bajada="Lo que conviene saber antes de enviar tu solicitud."
          >
            <div className="preguntas-contacto">
              <EnlaceFlecha href={rutas.contacto} plataforma={FORMULARIO_EXTERNO} evento="contacto">
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
