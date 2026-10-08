import { Link } from "react-router-dom";
import { Aviso, Encabezado, ListaCheck, Pasos, puntuar, type Paso } from "../components/Bloques";
import { Boton } from "../components/Enlaces";
import {
  BotonImprimir,
  EnlaceContacto,
  EnlaceCorreo,
  LineasAyuda,
  ListaLectura,
  PaginaLectura,
  identificacion,
} from "../components/lectura/Lectura";
import { VERSION_PUBLICADA } from "../data/paginas";
import { trasDosPuntos } from "../data/preguntas";
import {
  SANTIAGO,
  TEXTO_REVISIONES,
  TEXTO_TOPE,
  ayuda,
  noEsParaTi,
  noIncluyeEn,
  operacion as op,
  planes,
  planesIncluyen,
  recursosAyuda,
  reglasCreditos,
  t,
} from "../data/rumbo";

// Condiciones del piloto (5.4), imprimibles. La fecha es la de la versión publicada
// (VERSION_PUBLICADA en paginas.ts), literal y escrita en el mismo commit que la publica.
// Momento A (plataforma 7.2): con operacion.formularioPropio pasa a 1.1 y §3 describe el
// formulario propio y el enlace privado. La misma versión debe quedar en
// ajustes_operacion.version_condiciones (es la que se registra al aceptar el acuerdo).
const A = op.formularioPropio;
const VERSION_CONDICIONES = { numero: A ? "1.1" : "1.0", fecha: VERSION_PUBLICADA.texto };

const ACEPTACION =
  "La aceptación depende de que el piloto pueda ayudarte con tu meta y de nuestra capacidad en esta etapa.";
const plazo = op.plazoPrimeraRespuesta;
const revision = !plazo
  ? "Una persona revisa cada solicitud."
  : op.respondemosTodas
    ? t("Una persona revisa cada solicitud y te responde dentro de {plazo}, también si en esta etapa no podemos acompañarte.", { plazo })
    : t("Una persona revisa cada solicitud y, si el piloto puede acompañarte, te escribe dentro de {plazo}.", { plazo });
// La misma idea en las palabras del momento A (7.2, punto 3).
const lectura = !plazo
  ? "Una persona lee tu solicitud."
  : op.respondemosTodas
    ? t("Una persona lee tu solicitud y te escribe dentro de {plazo}, también si en esta etapa no podemos acompañarte.", { plazo })
    : t("Una persona lee tu solicitud y, si el piloto puede acompañarte, te escribe dentro de {plazo}.", { plazo });
const ENTRADA = A
  ? [
      "Nos cuentas tu meta en la web. Postular es gratis y no te compromete.",
      "Al enviar, ves en pantalla un enlace privado para consultar el estado de tu solicitud o retirarla. Guárdalo: por ahora no lo enviamos por correo.",
      `${lectura} ${ACEPTACION}`,
      "Si el piloto puede ayudarte, conversamos tu meta, tu disponibilidad, el plan, el precio y estas condiciones.",
      "Te dejamos el acuerdo en tu enlace privado. El acuerdo existe solo cuando lo aceptas ahí. Nada empieza ni se cobra antes.",
    ]
  : [
      "Postular es gratis y no es una compra, una reserva ni una venta. No crea obligaciones para ti ni para Rumbo.",
      `${revision} ${ACEPTACION}`,
      "Al enviar tu solicitud verás en pantalla un enlace privado para consultar su estado o retirarla. No enviamos correos automáticos.",
      "Si podemos acompañarte, te contactamos para aclarar tu meta, tu disponibilidad, el plan, el precio y estas condiciones. El acuerdo existe solo cuando lo aceptas.",
    ];

const SIN_RENOVACION =
  "No hay cobros adicionales a los acordados ni renovación automática: cada ciclo nuevo requiere un nuevo acuerdo.";
const { formaDePago, documentoTributario } = op;
const precio =
  op.preciosConImpuestos && formaDePago && documentoTributario
    ? `${t(
        "Los precios publicados son el valor total de cada ciclo de 4 semanas, en pesos chilenos e impuestos incluidos. Forma de pago: {formaDePago}. Por cada pago recibes {documentoTributario}.",
        { formaDePago, documentoTributario },
      )} ${SIN_RENOVACION}`
    : `Los precios están en pesos chilenos y son de referencia para el piloto. Antes de cualquier cobro te informamos el precio final, con impuestos incluidos, y la forma de pago.${
        op.topePrecio ? ` ${TEXTO_TOPE}` : ""
      }${
        op.cobertura ? " Fuera de Chile el pago es en dólares, por el monto que te informamos antes de cualquier cobro." : ""
      } ${SIN_RENOVACION} Hoy no hay pagos en línea.`;

// Urgencias (propuesta de precios 7.1): antes y después de las líneas de ayuda.
const URGENCIAS =
  "Rumbo no es un servicio de urgencias ni de salud. Si estás en riesgo o piensas en hacerte daño, en Chile llama al *4141 desde un celular (gratuito, 24 horas); fuera de Chile, al número de emergencias de tu país.";
const SENALES_DE_RIESGO =
  "Si en una revisión aparecen señales de riesgo, te lo diremos, te daremos esos contactos y pausaremos sin costo.";

const secciones: Paso[] = [
  {
    titulo: "Qué es Rumbo y qué es este piloto",
    contenido: (
      <>
        <p>
          {`Rumbo es un servicio de planificación personal con acompañamiento humano: convertimos una meta en un programa calendarizado, con acciones concretas, y lo revisamos contigo. Este es un piloto en preparación, en línea y en español, que se opera desde ${SANTIAGO}, con un grupo pequeño de personas adultas y en ciclos de 4 semanas, para aprender y mejorar el servicio.`}
        </p>
        {op.responsable && (
          <p>
            {`Lo opera ${identificacion(op.responsable)}.`}
            {op.correo && (
              <>
                {" "}
                Contacto: <EnlaceCorreo correo={op.correo} />.
              </>
            )}
          </p>
        )}
      </>
    ),
  },
  {
    titulo: "Quién puede participar",
    contenido: (
      <>
        <p>Personas de 18 años o más.</p>
        <p>
          En esta etapa nos enfocamos en proyectos y emprendimiento, estudio y aprendizaje, y organización y hábitos.
          Bienestar y autoestima, cambios y relaciones, alimentación y movimiento todavía no están abiertos.
        </p>
        {op.cobertura && <p>{op.cobertura.condiciones}</p>}
        <p>Rumbo todavía no es adecuado si…</p>
        <ListaCheck tipo="no-incluye" items={puntuar(noEsParaTi)} />
        <p>
          En esos casos mereces apoyo especializado: revisa <Link to="/ayuda/">Ayuda inmediata</Link>.
        </p>
      </>
    ),
  },
  {
    titulo: "Cómo se entra al piloto",
    contenido: (
      <ListaLectura
        numerada
        items={ENTRADA}
      />
    ),
  },
  {
    // Mismos datos y textos que los planes de la portada (prueba de coherencia 17).
    titulo: "Qué incluye cada plan",
    contenido: (
      <>
        {planes.map((p) => (
          <div key={p.id} className="lectura-plan">
            <h3>{p.nombre}</h3>
            <p>
              <strong className="tabular">{p.precio}</strong> {p.periodo}. {p.porSemana}.
            </p>
            <h4>Incluye</h4>
            <ListaCheck items={p.incluye} />
          </div>
        ))}
        <div className="lectura-plan">
          <h3>Los dos incluyen</h3>
          <ListaCheck items={planesIncluyen} />
        </div>
      </>
    ),
  },
  {
    // El mismo texto de la pregunta «¿Cómo son las revisiones semanales?».
    titulo: "Cómo funcionan las revisiones",
    contenido: TEXTO_REVISIONES,
  },
  {
    titulo: "Qué no incluye",
    contenido: (
      <>
        <p>El piloto no incluye:</p>
        <ListaCheck tipo="no-incluye" items={noIncluyeEn("condiciones")} />
      </>
    ),
  },
  { titulo: "Precio y pago", contenido: precio },
  {
    titulo: "Tu programa, tus registros y tu progreso",
    contenido: (
      <>
        <p>
          Preparamos tu programa a partir de lo que conversamos y lo publicamos en Mi espacio, dentro de la plataforma
          de Rumbo, que por ahora pide iniciar sesión con una cuenta de ChatGPT. Puedes pedir ajustes y participar en
          las decisiones.
        </p>
        <p>
          La duración se adapta a tu meta: 4, 8 o 12 semanas. En el piloto empezamos con un ciclo de 4 semanas;
          continuar se acuerda al cerrarlo. No garantizamos resultados; si algo no funciona, lo revisamos y lo
          ajustamos contigo.
        </p>
        <p>
          {t(
            "Créditos: +{porAccion} por acción completada y +{bonoDiaCompleto} por completar todas las acciones programadas de un día. Con {diasRachaMedia} días completos seguidos ese bono sube a +{bonoRacha3}, y con {diasRachaLarga}, a +{bonoRacha7}. Un día sin acciones programadas no corta la racha. Una foto en revisión no suma hasta que se aprueba. Los créditos no son dinero, no se canjean y no evalúan a la persona.",
            reglasCreditos,
          )}
        </p>
        <p>
          Fotos de acciones (solo en Acompañamiento cercano y si las acordamos): son privadas; se aceptan JPG, PNG o
          WebP de hasta 4 MB. Las revisamos para aprobarlas o rechazarlas con una nota. No pedimos fotos de tu cuerpo,
          fotos íntimas, documentos ni fotos de otras personas.
        </p>
        <p>
          Comunidad: el foro y el ranking son opcionales y solo muestran tu alias. Las publicaciones, de 10 a 400
          caracteres y hasta 3 al día, se revisan antes de mostrarse. Puedes borrar lo tuyo o retirarte cuando quieras.
        </p>
      </>
    ),
  },
  {
    titulo: "Alcance de salud",
    contenido:
      "Rumbo es un servicio de organización personal y acompañamiento. No es un servicio de salud: no diagnostica, no indica tratamientos ni dietas, no prescribe ejercicio y no reemplaza a psicólogos, médicos, nutricionistas, kinesiólogos ni entrenadores. Si tienes indicaciones de un profesional, podemos ayudarte a llevarlas a tu semana tal como te las dieron, sin modificarlas. Ante cualquier duda de salud, consulta a tu profesional.",
  },
  {
    titulo: "Seguridad y situaciones de crisis",
    contenido: (
      <>
        <p>{URGENCIAS}</p>
        {/* Las cuatro líneas de 5.4 §10, con los textos de Ayuda inmediata (sin el 1455). */}
        <LineasAyuda recursos={recursosAyuda({ ...ayuda, incluir1455: false })} />
        <p>{SENALES_DE_RIESGO}</p>
      </>
    ),
  },
  {
    titulo: "Pausa, cambios y término",
    contenido: (
      <>
        <p>Antes de aceptar el acuerdo puedes desistir sin costo y retirar tu solicitud con tu enlace privado.</p>
        <p>
          {op.politicaTermino
            ? t("Si ya empezaste un ciclo: {politicaTermino}", { politicaTermino: trasDosPuntos(op.politicaTermino) })
            : "Las condiciones de pausa, término anticipado y devolución se acuerdan contigo antes de cualquier pago y respetan siempre los derechos que te da la ley chilena."}
        </p>
        <p>
          Si durante el ciclo vemos que tu meta necesita atención profesional que Rumbo no presta, te lo diremos y
          podremos pausar o terminar el ciclo según lo acordado.
        </p>
        <p>Rumbo no cambiará estas condiciones en tu perjuicio durante tu ciclo; los cambios aplican a ciclos nuevos.</p>
      </>
    ),
  },
  {
    titulo: "Tus datos",
    contenido: (
      <p>
        Tratamos tus datos según la <Link to="/privacidad/">Política de privacidad</Link>: pedimos lo mínimo, no los
        vendemos y puedes ejercer tus derechos cuando quieras.
      </p>
    ),
  },
  {
    titulo: "Consultas y reclamos",
    contenido: (
      <p>
        {op.correo ? (
          <>
            Escríbenos a <EnlaceCorreo correo={op.correo} /> o desde la <EnlaceContacto />.
          </>
        ) : (
          <>
            Escríbenos desde la <EnlaceContacto />; si aún no postulas, indica el correo donde quieres recibir la
            respuesta.
          </>
        )}{" "}
        Si no quedas conforme, puedes acudir al Servicio Nacional del Consumidor (SERNAC).
      </p>
    ),
  },
  {
    titulo: "Cambios a estas condiciones",
    contenido:
      "Cada versión indica su número y fecha. Las condiciones que rigen tu ciclo son las que aceptaste. Estas condiciones se rigen por las leyes de Chile.",
  },
];

export default function Condiciones() {
  return (
    <PaginaLectura>
      <Encabezado
        ojo="Condiciones"
        titulo="Condiciones del piloto."
        nivel={1}
        bajada={t(
          "Lo que necesitas saber antes de acordar un ciclo con Rumbo. Versión {numero}, vigente desde el {fecha}. Puedes imprimir o guardar esta página.",
          VERSION_CONDICIONES,
        )}
        acciones={<BotonImprimir />}
      />
      <Aviso icono="info" titulo="En corto">
        <ul>
          <li>Postular es gratis y no te compromete.</li>
          <li>Nada empieza ni se cobra sin tu acuerdo.</li>
          <li>Rumbo no es un servicio de salud ni de urgencias.</li>
          <li>Hoy no hay pagos en línea.</li>
        </ul>
      </Aviso>
      <Pasos lectura nivelTitulo="h2" pasos={secciones} />
      <div className="lectura-cierre">
        <div className="acciones">
          <Boton href="/" variante="secundario">
            Volver al inicio
          </Boton>
          <Boton href="/privacidad/" variante="terciario">
            Ver la política de privacidad
          </Boton>
        </div>
      </div>
    </PaginaLectura>
  );
}
