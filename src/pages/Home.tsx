// Portada (5.2), a medio migrar: el contenido ya sale de los componentes y de rumbo.ts;
// falta la maquetación propia de cada capítulo (styles/portada.css), el revelado al
// desplazar y la ruta de puntos de fondo.
import { Link } from "react-router-dom";
import { Acordeon, Aviso, Encabezado, ListaCheck, Pasos, Segmentos } from "../components/Bloques";
import { FilaFutura, TarjetaCamino } from "../components/Areas";
import CalendarioEjemplo from "../components/CalendarioEjemplo";
import Encaje from "../components/Encaje";
import { Boton, BotonPostular, EnlaceFlecha, SeAbrePlataforma } from "../components/Enlaces";
import { EtiquetaEstado } from "../components/Etiqueta";
import Icono, { type NombreIcono } from "../components/Icono";
import GrillaPlanes from "../components/Planes";
import TarjetaRanking from "../components/TarjetaRanking";
import Transparencia from "../components/Transparencia";
import { preguntasPorGrupo } from "../data/preguntas";
import {
  areasMasAdelante,
  areasPiloto,
  operacion,
  postularHref,
  reglasCreditosTextos,
  rutas,
  t,
} from "../data/rumbo";

const NOTA_SALIDA = "El formulario se abre en la plataforma de Rumbo, en otra dirección web.";

// Paso 2 del método y textos del cierre según plazo y respuesta a todas las solicitudes.
function textoRevision() {
  const base = "Una persona del equipo la lee; no es una selección automática ni una venta. ";
  const plazo = operacion.plazoPrimeraRespuesta;
  if (!plazo)
    return (
      base +
      "Te escribimos si el piloto puede acompañarte en esta etapa. Mientras tanto, puedes ver su estado con tu enlace privado."
    );
  if (operacion.respondemosTodas)
    return base + t("Te respondemos dentro de {plazo}, también si en esta etapa no podemos acompañarte.", { plazo });
  return (
    base +
    t(
      "Te escribimos dentro de {plazo} si el piloto puede acompañarte en esta etapa. Mientras tanto, puedes ver su estado con tu enlace privado.",
      { plazo },
    )
  );
}

function bajadaCierre() {
  const base = "Cuéntanos tu meta en un formulario breve; no necesitas cuenta. Una persona lee cada solicitud y ";
  const plazo = operacion.plazoPrimeraRespuesta;
  if (!plazo) return base + "te escribe si podemos acompañarte en esta etapa del piloto.";
  if (operacion.respondemosTodas) return base + t("te responde dentro de {plazo}.", { plazo });
  return base + t("te escribe dentro de {plazo} si podemos acompañarte en esta etapa del piloto.", { plazo });
}

const pasos = [
  {
    titulo: "Cuéntanos tu meta",
    contenido:
      "Un formulario breve: tu meta (aunque sea difusa), el área y el tipo de apoyo que te interesa. Sin cuenta y sin pago.",
  },
  { titulo: "Revisamos tu solicitud", contenido: textoRevision() },
  {
    titulo: "Acordamos antes de empezar",
    contenido:
      "Si podemos acompañarte, te contactamos para aclarar tu meta, tu tiempo disponible, lo que te ha frenado, el tipo de apoyo, el precio y las condiciones. Nada empieza ni se cobra sin tu acuerdo.",
  },
  {
    titulo: "Recibes tu programa",
    contenido:
      "El equipo diseña tu calendario —acciones con horario o flexibles, duración e instrucciones— y lo publica en Mi espacio. Marcas lo que haces y ves tu progreso.",
  },
  {
    titulo: "Revisamos cada semana",
    contenido:
      "Tu coach revisa contigo qué funcionó. Si algo no se cumplió, buscamos la dificultad y ajustamos la carga. Al cerrar el ciclo decidimos juntos si continuar, reformular o terminar.",
  },
];

const esperar: { icono: NombreIcono; titulo: string; texto: string }[] = [
  {
    icono: "check",
    titulo: "Postular no te compromete.",
    texto: "Es gratis, y puedes retirar tu solicitud cuando quieras con tu enlace privado.",
  },
  {
    icono: "user-round",
    titulo: "Una persona lee cada solicitud.",
    texto: operacion.respondemosTodas
      ? "Sin filtros automáticos. Si en esta etapa no podemos acompañarte, te lo diremos."
      : "Sin filtros automáticos: la decisión siempre la toma alguien del equipo.",
  },
  {
    icono: "info",
    titulo: "Nada se cobra sin acuerdo.",
    texto: "El alcance, el canal, los plazos y el precio quedan claros antes de empezar.",
  },
  {
    icono: "lock",
    titulo: "Lo tuyo es privado.",
    texto:
      "Tu calendario y tus fotos solo los ven tú y las personas del equipo de Rumbo autorizadas para acompañarte. La comunidad es opcional y solo muestra tu alias.",
  },
];

const bajadaPlanes = operacion.preciosConImpuestos
  ? "Precios del piloto en pesos chilenos, impuestos incluidos: es el valor total de cada ciclo de 4 semanas, sin renovación automática. Postular no tiene costo ni te compromete; antes de cualquier cobro acordamos contigo el alcance, el canal y los plazos. Hoy no hay pagos en línea."
  : "Precios de referencia del piloto, en pesos chilenos. Postular no tiene costo ni te compromete. Si avanzamos, acordamos contigo el alcance, el canal, los plazos y el precio final —con impuestos incluidos— antes de cualquier cobro. Hoy no hay pagos en línea.";

export default function Home() {
  const acompanante = operacion.acompanante;
  return (
    <>
      {/* Capítulo 1: Promesa */}
      <section className="capitulo portada">
        <div className="contenedor portada-grilla">
          <div className="portada-texto">
            <EtiquetaEstado estado="pilotoEnPreparacion" grande />
            <h1 className="h1--display">
              Tu meta, convertida en una <em>semana posible.</em>
            </h1>
            <p className="bajada">
              Rumbo es planificación personal con acompañamiento humano. Nos cuentas qué quieres lograr y cuánto tiempo
              tienes de verdad; te entregamos un calendario listo —qué hacer, cuándo y cómo— y una persona lo revisa
              contigo cada semana.
            </p>
            <p className="portada-foco">
              <Icono nombre="compass" tamaño={16} />
              <span>
                Primer piloto: personas adultas que quieren avanzar en un proyecto, en sus estudios o en el orden de su
                semana.
              </span>
            </p>
            <div className="acciones">
              <BotonPostular ubicacion="portada" />
              <Boton href="#como-funciona" variante="secundario">
                Ver cómo funciona
              </Boton>
            </div>
            <p className="microcopia">{NOTA_SALIDA}</p>
            <ListaCheck enLinea items={["Postular es gratis", "No necesitas cuenta", "Una persona lee cada solicitud"]} />
          </div>
          <CalendarioEjemplo />
        </div>
      </section>

      {/* Capítulo 2: Para quién */}
      <section id="para-quien" className="capitulo capitulo--hondo">
        <div className="contenedor">
          <Encabezado
            ojo="Para quién"
            titulo="Sabes lo que quieres cambiar. Lo difícil es sostenerlo."
            bajada="Muchas personas tienen clara la intención, pero les cuesta aterrizarla, ordenar prioridades y mantener el ritmo de una semana a otra. Otras todavía no tienen una meta clara. En los dos casos no tienes que armar el programa por tu cuenta ni volverte especialista en planificación: te lo entregamos hecho y te acompañamos a sostenerlo."
          />
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
            <p className="ojo">Más adelante</p>
            <h3>Áreas que abriremos con apoyo profesional.</h3>
            <p>
              Las abriremos cuando contemos con el apoyo profesional que requieren, y siempre como complemento —nunca
              como reemplazo— de tu psicólogo, nutricionista, médico o entrenador. Todavía no tienen fecha.
            </p>
            <p className="mas-adelante-aviso">
              <Icono nombre="lock" tamaño={16} />
              <span>
                Si dejas tu interés, no incluyas diagnósticos ni detalles de salud: basta con el área. No te
                contactaremos por estas áreas hasta que se abran.
              </span>
            </p>
            <div className="filas-futuras">
              {areasMasAdelante.map((a) => (
                <FilaFutura key={a.id} area={a} />
              ))}
            </div>
            <p className="microcopia">
              Dejar tu interés usa el mismo formulario para postular. Usaremos tu solicitud para avisarte si abrimos esa
              área, y puedes retirarla cuando quieras con tu enlace privado.
            </p>
          </div>

          <Aviso icono="shield-check" titulo="Rumbo no es un servicio de salud." className="aviso-salud">
            <p>
              Es un servicio de organización personal y acompañamiento: no diagnostica, no indica tratamientos ni dietas
              y no reemplaza a psicólogos, médicos, nutricionistas ni otros profesionales. Si tienes indicaciones de un
              profesional, te ayudamos a llevarlas a tu semana sin modificarlas.{" "}
              <strong>
                Si hoy te sientes en peligro o sin salida, no esperes a postular: llama gratis al *4141 desde tu
                celular (24 horas) o al <a href="tel:131">131</a>.
              </strong>
            </p>
          </Aviso>
        </div>
      </section>

      {/* Capítulo 3: Método */}
      <section id="como-funciona" className="capitulo capitulo--oscuro">
        <div className="contenedor">
          <div className="partido">
            <Encabezado
              variante="partido"
              ojo="Cómo funciona"
              titulo="Cumplirte empieza con un paso posible."
              bajada="Ordenar, hacer y revisar. Así funciona el piloto, desde tu solicitud hasta el cierre de cada ciclo."
              acciones={<BotonPostular ubicacion="metodo" />}
            />
            <div className="partido-contenido metodo">
              <Pasos pasos={pasos} />
              <Aviso icono="info">
                <p>
                  <strong>Postular no es una compra ni una reserva.</strong> Al enviar tu solicitud verás en pantalla un
                  enlace privado: guárdalo para consultar su estado o retirarla. No enviamos correos automáticos.
                </p>
              </Aviso>
            </div>
          </div>

          <hr className="separador" />
          <h3 className="esperar-titulo">Lo que puedes esperar del piloto</h3>
          <ul className="esperar">
            {esperar.map((e) => (
              <li key={e.titulo}>
                <Icono nombre={e.icono} tamaño={24} />
                <h4>{e.titulo}</h4>
                <p>{e.texto}</p>
              </li>
            ))}
          </ul>

          {acompanante && (
            <Aviso icono="info" className="acompanante">
              <h3>Quién te acompaña</h3>
              <p>
                {t("{nombre}, {rol}. {bio}", {
                  nombre: acompanante.nombre,
                  rol: acompanante.rol,
                  bio: acompanante.bio,
                })}{" "}
                Su rol es organizar, revisar y ajustar tu programa contigo; no es atención psicológica, nutricional ni
                médica.
              </p>
            </Aviso>
          )}
        </div>
      </section>

      {/* Capítulo 4: Dentro de Rumbo */}
      <section className="capitulo">
        <div className="contenedor">
          <div id="que-recibes">
            <Encabezado
              ojo="Qué recibes"
              titulo="Un calendario claro. Una persona que lo revisa contigo."
              bajada="Tu espacio mantiene visible el programa entre una revisión y otra, y quien te acompaña ve tus avances y tus dificultades para que cada conversación tenga contexto. Aquí está, con claridad, qué existe hoy y qué no."
            />
            <Transparencia />
            <p className="microcopia nota-bajo">
              Mi espacio se abre en la plataforma de Rumbo, en otra dirección web, y por ahora pide iniciar sesión con
              una cuenta de ChatGPT.
            </p>
          </div>

          <hr className="separador" />
          <div id="comunidad" className="comunidad">
            <div className="comunidad-texto">
              <Encabezado ojo="Progreso y comunidad" titulo="Cada paso cuenta. Tú decides cuáles compartes.">
                <p className="comunidad-intro">
                  Cada acción que registras suma créditos, y completar un día programado suma más. Así subes de nivel a
                  tu ritmo.{" "}
                  <strong>Los créditos muestran tu avance: no son dinero, no se canjean y no miden tu valor.</strong>
                </p>
              </Encabezado>
              <ListaCheck items={reglasCreditosTextos()} />
              <p className="microcopia nota-bajo">La comunidad es solo para participantes del piloto. No hay chat.</p>
            </div>
            <TarjetaRanking />
          </div>
        </div>
      </section>

      {/* Capítulo 5: Decidir */}
      <section className="capitulo capitulo--hondo">
        <div className="contenedor">
          <div id="planes">
            <Encabezado
              ojo="Planes"
              titulo="Ciclos de 4 semanas, con revisión humana cada semana."
              bajada={bajadaPlanes}
            >
              {operacion.tamanoPrimerGrupo && (
                <p className="bajada">
                  {t("El primer grupo es pequeño, de {n} personas, para poder acompañar bien a cada una.", {
                    n: operacion.tamanoPrimerGrupo,
                  })}
                </p>
              )}
            </Encabezado>
            <GrillaPlanes />
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
          <div id="preguntas" className="partido partido--4">
            <Encabezado
              variante="partido"
              ojo="Preguntas"
              titulo="Antes de postular."
              bajada="Lo que conviene saber antes de enviar tu solicitud."
            >
              <p>
                <EnlaceFlecha href={rutas.contacto} plataforma evento="contacto">
                  ¿Otra duda? Escríbenos
                </EnlaceFlecha>
              </p>
              <p className="microcopia">Si aún no postulas, escribe el correo donde quieres recibir la respuesta.</p>
            </Encabezado>
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
                            <p>
                              <Link to={p.enlaceExtra.href}>{p.enlaceExtra.texto}</Link>
                            </p>
                          )}
                        </>
                      ),
                    }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Capítulo 6: Cierre */}
      <section className="capitulo capitulo--oscuro cierre">
        <div className="contenedor contenedor--medio">
          <Encabezado
            variante="centrado"
            titulo={
              <>
                No necesitas tener todo resuelto para <em>empezar.</em>
              </>
            }
            bajada={bajadaCierre()}
            acciones={<BotonPostular ubicacion="cierre" />}
          >
            <p className="microcopia">{NOTA_SALIDA}</p>
            <ListaCheck
              enLinea
              oscuro
              items={["Postular es gratis", "No es una compra ni una reserva", "No es un servicio de urgencias"]}
            />
          </Encabezado>
        </div>
      </section>
    </>
  );
}
