// Capítulo 2: Para quién (5.2). Papel hondo: los tres caminos del piloto y «No lo tengo
// claro aún», «¿Es para ti?», las áreas «Más adelante» y el alcance de salud.
import { FilaFutura, TarjetaCamino } from "../Areas";
import { Aviso, Encabezado } from "../Bloques";
import Encaje from "../Encaje";
import Icono from "../Icono";
import { areasMasAdelante, areasPiloto } from "../../data/rumbo";

export default function ParaQuien() {
  return (
    <section id="para-quien" className="capitulo capitulo--hondo">
      <div className="contenedor">
        <Encabezado
          revelar
          ojo="Para quién"
          titulo="Sabes lo que quieres cambiar. Lo difícil es sostenerlo."
          bajada="Muchas personas tienen clara la intención, pero les cuesta aterrizarla, ordenar prioridades y mantener el ritmo de una semana a otra. Otras todavía no tienen una meta clara. En los dos casos no tienes que armar el programa por tu cuenta ni volverte especialista en planificación: te lo entregamos hecho y te acompañamos a sostenerlo."
        />
        {/* Párrafo con estilo h3 y no encabezado: así las tarjetas son h3. */}
        <p className="subtitulo">El primer piloto se enfoca en tres caminos.</p>
        <div id="areas" className="caminos" data-revelar="">
          {areasPiloto.map((a) => (
            <TarjetaCamino key={a.id} area={a} />
          ))}
        </div>

        <hr className="separador" />
        <div data-revelar="">
          <Encaje />
        </div>

        <hr className="separador" />
        <div className="mas-adelante">
          <div className="mas-adelante-cabeza" data-revelar="">
            <p className="ojo">Más adelante</p>
            <h3>Áreas que abriremos con apoyo profesional.</h3>
            <p>
              Las abriremos cuando contemos con el apoyo profesional que requieren, y siempre como complemento —nunca
              como reemplazo— de tu psicólogo, nutricionista, médico o entrenador. Todavía no tienen fecha.
            </p>
          </div>
          <p className="mas-adelante-aviso">
            <Icono nombre="lock" tamaño={16} />
            <span>
              Si dejas tu interés, no incluyas diagnósticos ni detalles de salud: basta con el área. No te contactaremos
              por estas áreas hasta que se abran.
            </span>
          </p>
          <div className="filas-futuras" data-revelar="">
            {areasMasAdelante.map((a) => (
              <FilaFutura key={a.id} area={a} />
            ))}
          </div>
          <p className="microcopia">
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
