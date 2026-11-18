// Capítulo 2: Para quién (5.2). Papel hondo: los tres caminos del piloto y «No lo tengo
// claro aún», «¿Es para ti?», las áreas «Más adelante» y el alcance de salud.
import { FilaFutura, TarjetaCamino } from "../Areas";
import { Aviso, Encabezado } from "../Bloques";
import Encaje from "../Encaje";
import Icono from "../Icono";
import { areasMasAdelante, areasPiloto, rayas } from "../../data/rumbo";
import { avisoMasAdelante } from "./textos";

export default function ParaQuien() {
  return (
    <section id="para-quien" className="capitulo capitulo--hondo">
      <div className="contenedor">
        <div className="para-quien-cabeza">
          <Encabezado
            titulo={
              // Dos oraciones: la segunda empieza en su propia línea (.frase).
              <>
                Sabes lo que quieres cambiar. <span className="frase">Lo difícil es sostenerlo.</span>
              </>
            }
            bajada="Muchas personas tienen clara la intención, pero les cuesta aterrizarla, ordenar prioridades y mantener el ritmo de una semana a otra. Otras todavía no tienen una meta clara. En los dos casos no tienes que armar el programa por tu cuenta ni volverte especialista en planificación: te lo entregamos hecho y te acompañamos a sostenerlo."
          />
          {/* Posicionamiento (análisis de negocio, nov-2026): la diferencia con una app o un chat. */}
          <blockquote className="diferencia">
            <p>
              Un plan te lo puede armar una app o un chat. Lo que no hacen es darse cuenta cuando lo dejas. En Rumbo,
              una persona lo nota, te pregunta qué pasó y lo ajusta contigo.
            </p>
          </blockquote>
        </div>
        {/* Párrafo con estilo h3 y no encabezado: así las tarjetas son h3. */}
        <p className="subtitulo">El primer piloto se enfoca en tres caminos.</p>
        <div id="areas" className="caminos">
          {areasPiloto.map((a) => (
            <TarjetaCamino key={a.id} area={a} />
          ))}
        </div>

        <hr className="separador" />
        <Encaje />

        <hr className="separador" />
        <div className="mas-adelante">
          <div className="mas-adelante-cabeza">
            <h3>Áreas que queremos abrir con apoyo profesional.</h3>
            <p>
              {rayas(
                "Las abriremos cuando contemos con el apoyo profesional que requieren, y siempre como complemento —nunca como reemplazo— de tu psicólogo, nutricionista, médico o entrenador. Todavía no tienen fecha.",
              )}
            </p>
          </div>
          <p className="mas-adelante-aviso">
            <Icono nombre="lock" tamaño={16} />
            <span>{avisoMasAdelante()}</span>
          </p>
          <div className="filas-futuras">
            {areasMasAdelante.map((a) => (
              <FilaFutura key={a.id} area={a} />
            ))}
          </div>
          <p className="microcopia mas-adelante-nota">
            Dejar tu interés usa el mismo formulario para postular. Usaremos tu solicitud para avisarte si abrimos esa
            área, y puedes retirarla cuando quieras con tu enlace privado.
          </p>
        </div>

        {/* Aviso de salud: siempre visible, sin revelado. */}
        <Aviso icono="shield-check" titulo="Rumbo no es un servicio de salud." className="aviso-salud">
          <p>
            Es un servicio de organización personal y acompañamiento: no diagnostica, no indica tratamientos ni dietas y
            no reemplaza a psicólogos, médicos, nutricionistas ni otros profesionales. Si tienes indicaciones de un
            profesional, te ayudamos a llevarlas a tu semana sin modificarlas.{" "}
            <strong>
              Si hoy te sientes en peligro o sin salida, no esperes a postular: llama gratis al *4141 desde tu celular
              (24 horas) o al <a href="tel:131">131</a>.
            </strong>
          </p>
        </Aviso>
      </div>
    </section>
  );
}
