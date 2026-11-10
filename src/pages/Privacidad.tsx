import { Aviso, Encabezado, Pasos, puntuar, type Paso } from "../components/Bloques";
import { Boton, EnlaceUtil } from "../components/Enlaces";
import Icono from "../components/Icono";
import {
  EnlaceContacto,
  EnlaceCorreo,
  ListaLectura,
  PaginaLectura,
  identificacion,
} from "../components/lectura/Lectura";
import { VERSION_PUBLICADA } from "../data/paginas";
import {
  ANALITICA_ACTIVA as ANALITICA,
  FORMULARIO_EXTERNO,
  SANTIAGO,
  operacion as op,
  rayas,
  rutas,
  t,
} from "../data/rumbo";

// Política de privacidad (5.3). La fecha es la de la versión publicada (VERSION_PUBLICADA en
// paginas.ts), literal y escrita en el mismo commit que la publica (nunca un marcador).
// Momento A (plataforma 7.1): con operacion.formularioPropio la política pasa a 1.1 y nombra a
// Supabase, el enlace privado y el código derivado de la IP. La misma versión debe quedar en
// ajustes_operacion.version_privacidad. Todo el momento A pasa por revisión legal (8.10).
// Versión 1.2 (Etapa 0 de Rumbo 2.0): con Mi espacio propio (B) nombra a los proveedores reales
// (GitHub, Supabase, Brevo y Google) y no a OpenAI; comunidad, ranking, fotos e IA quedan como
// funciones que todavía no existen. ajustes_operacion.version_privacidad NO se cambia sola:
// Diego la pasa a '1.2' el día que se publica. Los puntos «REVISIÓN LEGAL» están en
// docs/revision-legal.md.
// Versión 1.3 (Rumbo 1.0, operacion.legal13, apagada): describe comunidad, ranking, fotografías de
// acciones, reconocimientos y beneficio, y el pago en Mi espacio. El asistente con IA sigue
// descrito como inactivo. Cada afirmación está contrastada con las migraciones en
// docs/revision-legal.md (sección «Versión 1.3»).
const A = op.formularioPropio;
const B = A && op.miEspacioPropio;
const C = B && op.legal13;
const VERSION_PRIVACIDAD = { numero: C ? "1.3" : B ? "1.2" : A ? "1.1" : "1.0", fecha: VERSION_PUBLICADA.texto };

const RETIRAR = "Si retiras tu solicitud con tu enlace privado, la borramos de inmediato.";
const FOTOS_PLAZO =
  "Fotografías de tus acciones: se eliminan 30 días después de su revisión o, si son opcionales, 30 días después de adjuntarlas. Las que esperan revisión se guardan hasta que se revisen";
const ELIMINAR =
  "Puedes pedirnos que los eliminemos en cualquier momento, y lo haremos, salvo lo que la ley nos obligue a conservar, como los documentos tributarios.";

// Versión 1.3: las funciones opcionales de Rumbo 1.0, cada una en su sección.
const FUNCIONES_13: Paso[] = [
  {
    titulo: "Comunidad (opcional)",
    contenido: (
      <>
        <p>
          Participar en la comunidad es voluntario. Para entrar eliges un alias y aceptas sus reglas. Publicas siempre
          con tu alias, nunca con tu nombre ni tu correo.
        </p>
        <ListaLectura
          items={[
            "Qué guardamos: tu alias, lo que publicas y respondes (con su tipo, temas y fecha), hasta 5 fotos por publicación si decides agregarlas, tus apoyos («me gusta»), lo que guardas, los grupos y desafíos en que participas, las personas que bloqueas y los reportes que haces.",
            "Quién lo ve: las demás personas que participan en la comunidad. Lo que publicas en un grupo lo ven solo sus miembros. De los apoyos solo se ve cuántos hay, nunca quién los dio. De un desafío se ve cuántas personas participan, nunca quiénes; tu avance lo ves solo tú.",
            "Moderación: la persona responsable de Rumbo y los coaches con permiso de moderar pueden ver quién escribió cada publicación, para atender reportes y cuidar las reglas. Ocultar una publicación no la borra: queda guardada para revisión.",
            "Si bloqueas a alguien, desde ese momento ninguna de las dos personas ve lo que publica la otra. La otra persona no recibe aviso.",
            "Las fotos de la comunidad se guardan en un almacenamiento privado de Supabase y solo las ven quienes participan, mientras la publicación esté visible. Antes de subir una foto, revisa que no muestre a otras personas, documentos ni datos de salud.",
            "Puedes borrar lo que publicaste cuando quieras. Deja de verse de inmediato y sus fotos se eliminan. Guardamos un registro interno del texto, que nadie más ve, para atender reportes; se elimina cuando eliminas tu cuenta.",
          ]}
        />
      </>
    ),
  },
  {
    titulo: "Ranking semanal (opcional)",
    contenido:
      "Entrar al ranking es voluntario y puedes salir cuando quieras. Compara el porcentaje de tus acciones programadas de la semana que marcaste como hechas, no la cantidad. Se muestra con tu alias, sin tu nombre ni el número de tus acciones, y solo lo ven quienes participan en él y el equipo de Rumbo. Si en una semana participan menos de 3 personas, no se muestra, para que nadie pueda saber quién es quién.",
  },
  {
    titulo: "Fotografías de tus acciones",
    contenido: (
      <>
        <p>
          Algunas acciones piden una foto que muestre lo que hiciste; en las demás, adjuntarla es opcional. Las usamos
          solo para que quien te acompaña revise tu avance. No las mostramos en la comunidad ni en el ranking, y no las
          enviamos a servicios de inteligencia artificial. Si no puedes subir una foto, elige «No puedo subir una foto»
          y cuéntanos con tus palabras lo que hiciste.
        </p>
        <ListaLectura
          items={[
            "Qué no debes subir: fotos de tu cuerpo, fotos íntimas, documentos de identidad o de salud, ni fotos donde aparezcan otras personas. Si llega una foto así, no la aprobamos y se elimina 30 días después de esa revisión, o antes si nos lo pides.",
            "Quién puede verlas: tú, la persona del equipo que te acompaña (entra con un segundo factor de verificación) y el responsable de Rumbo. Ninguna otra persona participante. Si cambias de coach, el anterior deja de tener acceso.",
            "Cómo las guardamos: tu navegador achica la foto a un máximo de 1600 píxeles y le quita los datos que vienen en el archivo, como la ubicación GPS, la fecha y el modelo del teléfono; si no puede hacerlo, la foto no se sube. Eso no la hace anónima: revisa qué se ve antes de subirla. Se guarda en un almacenamiento privado de Supabase, en Brasil, y se muestra con enlaces que dejan de funcionar a los 5 minutos.",
            "Cuánto tiempo: una foto que pedía tu acción se elimina 30 días después de revisarla; una opcional, 30 días después de adjuntarla; una que espera revisión, se guarda hasta que se revise. Un proceso automático las elimina cada día, así que puede tardar hasta un día más. Puedes eliminarla antes desde la acción mientras esté abierta, o escribiéndonos.",
            "Qué queda: el registro de la acción (que la hiciste, el resultado de la revisión, las notas y la fecha en que se eliminó la foto), para que tu progreso no cambie. Nuestros proveedores pueden conservar copias técnicas de seguridad por un tiempo limitado.",
            "La descarga de «Tus datos» en Mi espacio incluye el registro de tus acciones, pero no los archivos de las fotos. Si quieres una copia de las fotos que sigan guardadas, escríbenos.",
          ]}
        />
      </>
    ),
  },
  {
    titulo: "Reconocimientos y descuento por renovación",
    contenido:
      "Los reconocimientos (por ejemplo, «Primer paso» o «Ciclo completado») se otorgan solos a partir de tus acciones. Los ves tú y el equipo que te acompaña; no se muestran a otras personas participantes. Si Rumbo ofrece un descuento por renovación, revisamos si completaste todas las acciones programadas de tu ciclo para aplicarlo en tu siguiente pago. No usamos estos datos para nada más.",
  },
  {
    titulo: "Pago dentro de Mi espacio",
    contenido:
      "Después de aceptar tu acuerdo, Mi espacio te muestra el monto, la fecha de vencimiento y los datos para transferir. Esos datos solo se muestran con tu sesión iniciada y nunca van en un correo. Si avisas «Ya transferí», guardamos tu aviso, la fecha y la referencia que escribas. El pago queda registrado solo cuando una persona del equipo lo confirma. No guardamos datos de tu cuenta bancaria ni de tarjetas.",
  },
  {
    titulo: "Asistente con inteligencia artificial",
    contenido:
      "El asistente con inteligencia artificial todavía no está activo y hoy no trata ningún dato. Antes de activarlo, esta política dirá qué datos usa, con qué proveedor y para qué, y te pediremos tu autorización. Será opcional y nunca reemplazará a quien te acompaña.",
  },
];

const secciones: Paso[] = [
  {
    titulo: "Quién es responsable de tus datos",
    contenido: op.responsable ? (
      <p>
        {`El responsable del tratamiento de tus datos es ${identificacion(op.responsable)}. Para cualquier asunto de privacidad, `}
        {op.correo ? (
          <>
            escríbenos a <EnlaceCorreo correo={op.correo} /> o usa la <EnlaceContacto />.
          </>
        ) : (
          <>
            usa la <EnlaceContacto />.
          </>
        )}
      </p>
    ) : (
      <p>
        {`Rumbo es un proyecto piloto operado desde ${SANTIAGO}. Mientras completamos su identificación formal como responsable, puedes hacer cualquier consulta o ejercer tus derechos desde la `}
        <EnlaceContacto />, indicando el correo con el que postulaste, si ya lo hiciste.
      </p>
    ),
  },
  {
    titulo: "Qué datos tratamos y de dónde vienen",
    contenido: (
      <>
        <p>Todos los datos los obtenemos directamente de ti. Rumbo es solo para personas de 18 años o más.</p>
        <ListaLectura
          items={[
            <>
              <strong>Cuando visitas esta web:</strong>{" "}
              {A
                ? "Esta web no usa cookies. Si llenas un formulario, tu borrador se guarda solo en esa pestaña de tu navegador hasta que la cierres. GitHub, que aloja la web, registra tu dirección IP por seguridad. Al enviar un formulario, guardamos por 48 horas un código derivado de tu dirección IP, que no permite conocerla, solo para evitar envíos abusivos."
                : "No tiene formularios ni cookies. GitHub, que la aloja, registra tu dirección IP por seguridad."}{" "}
              Las tipografías se sirven desde este mismo sitio.
              {ANALITICA &&
                " Usamos Umami, una herramienta de estadísticas sin cookies que no guarda datos que te identifiquen: solo cifras agregadas, como páginas vistas, origen de la visita y clics en botones."}
            </>,
            ...(A
              ? [
                  <>
                    <strong>Cuando postulas:</strong> Nombre, correo, el área, lo que quieres conseguir, el tipo de
                    apoyo, los días y franjas para conversar, tu zona horaria (la detecta tu navegador), tu declaración
                    de mayoría de edad, el registro de tu autorización (texto, versión y fecha) y, si la das, tu
                    preferencia de recibir avisos.
                  </>,
                  <>
                    <strong>Cuando dejas tu interés:</strong> Nombre, correo y el área.
                  </>,
                  <>
                    <strong>Cuando nos escribes:</strong> Motivo, nombre si lo das, correo y mensaje.
                  </>,
                  <>
                    <strong>Cuando aceptas tu acuerdo:</strong> La versión de las condiciones, el acuerdo y la fecha.
                  </>,
                ]
              : [
                  <>
                    <strong>Cuando postulas:</strong> Nombre, correo, el área que eliges, una descripción breve de tu
                    meta, tu preferencia de apoyo, tu disponibilidad si la indicas y la confirmación de que eres mayor
                    de edad.
                  </>,
                  <>
                    <strong>Cuando nos escribes:</strong> Nombre, correo y tu mensaje.
                  </>,
                ]),
            <>
              <strong>Cuando participas en un ciclo:</strong>{" "}
              {B ? "Tu correo, con el que entras a Mi espacio con un código" : "Los datos de la cuenta con la que inicias sesión"};
              tu programa (metas, acciones, horarios e instrucciones); lo que registras como hecho y lo que escribes sobre
              tus acciones; créditos, niveles y rachas; tus registros semanales y las respuestas de quien te acompaña, y tus
              solicitudes de ajuste.
              {C &&
                " También tus preferencias de recordatorios, las videollamadas agendadas y su asistencia, los reconocimientos que consigues, el aviso «Ya transferí» con la referencia que escribas y los pagos que registramos."}
            </>,
            <>
              <strong>En la conversación inicial y en las revisiones:</strong> Tomamos notas breves para ajustar tu
              programa.{" "}
              {op.canalRevisiones && op.canalRespuestas
                ? t("Se hacen por {canalRevisiones} y {canalRespuestas}.", {
                    canalRevisiones: op.canalRevisiones,
                    canalRespuestas: op.canalRespuestas,
                  })
                : "Las revisiones escritas quedan en Mi espacio. La conversación inicial y las videollamadas de Acompañamiento cercano se hacen por un servicio de videollamadas externo a la plataforma; antes de usarlo te diremos cuál es y qué proveedor lo presta."}
            </>,
          ]}
        />
        <p>Te pedimos no incluir datos de otras personas en tus mensajes.</p>
      </>
    ),
  },
  {
    titulo: "Datos de salud",
    contenido: rayas(
      "La ley considera sensibles los datos de salud y exige tu consentimiento expreso para tratarlos. El piloto se enfoca en proyectos, estudio y organización, y no los necesita: no pedimos diagnósticos, antecedentes clínicos, fotos de tu cuerpo, fotos íntimas ni documentos médicos. Si decides compartir algo relacionado con tu salud —por ejemplo, una indicación de tu nutricionista— o lo mencionas en una conversación, te pediremos autorización expresa y por separado antes de registrarlo o usarlo, solo para adaptar tu programa. Puedes retirar esa autorización cuando quieras, y dejaremos de usar esa información.",
    ),
  },
  {
    titulo: "Para qué usamos tus datos",
    contenido: (
      <>
        <ListaLectura
          items={[
            "Revisar tu solicitud y contactarte sobre el piloto: con tu consentimiento, que das al postular.",
            // Momento A (7.1). La base de cada finalidad nueva la decide la revisión legal (8.10).
            ...(A
              ? [
                  "Avisarte si se abre un área o una etapa: solo si lo autorizas.",
                  "Evitar envíos abusivos en los formularios.",
                  "Registrar tu aceptación del acuerdo.",
                ]
              : []),
            "Acordar contigo el plan, el precio y las condiciones: porque tú lo solicitas, antes de un acuerdo.",
            "Preparar, publicar y ajustar tu programa, hacer las revisiones y calcular créditos y niveles: para cumplir lo que acordamos contigo.",
            ...(C
              ? [
                  "Mostrarte los datos para transferir y registrar tus pagos: para cumplir lo que acordamos contigo.",
                  "Mostrar lo que publicas en la comunidad y tu lugar en el ranking: solo si decides participar.",
                ]
              : []),
            "Emitir documentos tributarios cuando haya pagos: por obligación legal.",
          ]}
        />
        <p>
          No vendemos ni cedemos tus datos, no los usamos para publicidad de terceros y hoy no usamos inteligencia
          artificial para analizarlos.
        </p>
      </>
    ),
  },
  {
    titulo: "Decisiones automatizadas",
    contenido: A ? (
      <>
        <p>
          No tomamos decisiones automatizadas sobre ti. La aceptación al piloto la decide una persona. Algunas
          solicitudes se marcan automáticamente para revisarlas con más cuidado (por ejemplo, si parecen repetidas o
          enviadas por un programa): esa marca solo ordena la bandeja; una persona las lee todas.
        </p>
        <p>
          Los créditos, niveles y rachas se calculan automáticamente, con reglas públicas, a partir de lo que
          registras. Son informativos: no deciden si te aceptamos, cuánto pagas ni si continúas, y no evalúan tu valor
          como persona.
        </p>
        {C && (
          <p>
            Con las mismas reglas se otorgan los reconocimientos, se calcula el ranking y se revisa si cumpliste las
            condiciones del descuento por renovación: todo sale de las acciones programadas que marcaste como hechas.
            Una persona revisa cada pago antes de aplicar un descuento.
          </p>
        )}
      </>
    ) : (
      "Los créditos, niveles y rachas se calculan automáticamente, con reglas públicas, a partir de lo que registras. Son informativos: no deciden si te aceptamos, cuánto pagas ni si continúas, y no evalúan tu valor como persona. La aceptación al piloto siempre la decide una persona."
    ),
  },
  {
    titulo: "Con quién compartimos tus datos",
    contenido: (
      <>
        <p>Solo con los proveedores que necesitamos para operar:</p>
        <ListaLectura
          items={puntuar([
            "GitHub (Estados Unidos), que aloja esta web",
            // Verificar que la infraestructura de la región sea la que Supabase declara (7.1).
            // REVISIÓN LEGAL: razón social, país y contrato de tratamiento de datos de cada proveedor.
            ...(A
              ? [
                  `Supabase Inc. (Estados Unidos), que guarda ${B ? "tu solicitud, tu programa, tus registros y tus mensajes, y gestiona el ingreso a Mi espacio," : "tu solicitud y tus mensajes"} en servidores ubicados en São Paulo, Brasil`,
                ]
              : []),
            ...(B
              ? [
                  "Brevo (Francia), que envía los correos con tu código de ingreso a Mi espacio",
                  "Google (Estados Unidos), que provee el correo de Rumbo, con el que respondemos tus mensajes",
                ]
              : []),
            // Cloudflare solo se nombra cuando Diego confirme la infraestructura de ChatGPT Sites (8.11).
            ...(B
              ? []
              : [
                  rayas(
                    op.alojamientoVerificado
                      ? "OpenAI (Estados Unidos), que provee la plataforma de Rumbo mediante ChatGPT Sites —donde están tu solicitud, tu programa y tus fotos— y el inicio de sesión con ChatGPT. OpenAI usa a su vez proveedores de infraestructura, como Cloudflare, en Estados Unidos u otros países"
                      : "OpenAI (Estados Unidos), que provee la plataforma de Rumbo mediante ChatGPT Sites —donde están tu solicitud, tu programa y tus fotos— y el inicio de sesión con ChatGPT, y los proveedores de infraestructura que OpenAI utiliza",
                  ),
                ]),
            "el servicio de videollamadas que usemos para la conversación inicial y las revisiones de Acompañamiento cercano, que te informaremos antes de usarlo",
            ...(ANALITICA ? ["Umami (Estados Unidos o Unión Europea), para estadísticas sin cookies"] : []),
          ])}
        />
        {!B && <p>Al iniciar sesión con ChatGPT, OpenAI trata los datos de esa cuenta según su propia política.</p>}
        <p>
          Con profesionales de salud, solo si tú lo pides y lo autorizas por escrito. Con autoridades, solo cuando la
          ley lo exija.
        </p>
      </>
    ),
  },
  {
    titulo: "Transferencias fuera de Chile",
    // REVISIÓN LEGAL: base y garantías de la transferencia (7.1).
    contenido: A
      ? `${B ? "Tus datos" : "Tu solicitud y tus mensajes"} se guardan en servidores ubicados en Brasil. Los proveedores son empresas de Estados Unidos${B ? " y Francia" : ""} y pueden guardar o procesar datos en esos u otros países, que podrían no ofrecer un nivel de protección equivalente al chileno.`
      : "Estos proveedores pueden guardar o procesar datos en Estados Unidos u otros países, que podrían no ofrecer un nivel de protección equivalente al chileno.",
  },
  {
    titulo: "Cuánto tiempo guardamos tus datos",
    contenido: op.conservacion ? (
      <>
        <ListaLectura
          items={[
            ...op.conservacion.map((c) => `${c.tipo}: ${c.plazo}`),
            ...(A && !op.conservacion.some((c) => /IP/.test(c.tipo)) ? ["Código derivado de tu dirección IP: 48 horas"] : []),
            ...(C ? [FOTOS_PLAZO] : []),
          ]}
        />
        {A && <p>{RETIRAR}</p>}
        <p>{ELIMINAR}</p>
      </>
    ) : A ? (
      `Los guardamos solo mientras son necesarios para la finalidad por la que nos los entregaste: revisar tu solicitud, acompañarte durante el piloto o cumplir una obligación legal. El código derivado de tu dirección IP se borra a las 48 horas.${C ? ` ${FOTOS_PLAZO}: el detalle está en «Fotografías de tus acciones».` : ""} ${RETIRAR} ${ELIMINAR}`
    ) : (
      `Los guardamos solo mientras son necesarios para la finalidad por la que nos los entregaste: revisar tu solicitud, acompañarte durante el piloto o cumplir una obligación legal. ${ELIMINAR}`
    ),
  },
  {
    titulo: "Cómo protegemos tus datos",
    contenido: (
      <>
        <ListaLectura
          items={[
            ...(A
              ? [
                  "Tu solicitud se consulta con un enlace privado que solo tú recibes. Guardamos ese enlace de una forma que ni siquiera nosotros podemos reconstruir.",
                  "Quien opera Rumbo entra a sus herramientas con un segundo factor de verificación.",
                ]
              : ["Tu solicitud se consulta con un enlace privado que solo tú recibes."]),
            B ? "Entras a tu espacio con un código de un solo uso que llega a tu correo." : "Tu espacio requiere iniciar sesión.",
            "Nunca te pediremos contraseñas.",
          ]}
        />
        <p>
          Si ocurre un incidente de seguridad que afecte tus datos, te lo informaremos y lo comunicaremos a la
          autoridad según lo exija la ley.
        </p>
      </>
    ),
  },
  ...(C
    ? FUNCIONES_13
    : [
        {
          titulo: "Funciones que todavía no existen",
          contenido:
            "La comunidad, el ranking semanal, las fotografías de acciones y el asistente con inteligencia artificial todavía no existen y hoy no tratan ningún dato. Antes de activar cualquiera de ellos, que serán opcionales, esta política dirá qué datos usan, para qué y con qué proveedores.",
        },
      ]),
  {
    titulo: "Tus derechos",
    contenido: (
      <>
        <p>
          Puedes pedir acceso a tus datos, rectificarlos, suprimirlos, oponerte a su uso, recibirlos en un formato que
          puedas llevar a otro servicio (portabilidad) o bloquearlos temporalmente. También puedes retirar tu
          consentimiento en cualquier momento, sin que eso afecte lo hecho antes.
        </p>
        <p>
          <strong>Cómo:</strong>{" "}
          {A ? (
            <>
              con tu enlace privado puedes ver y retirar tu solicitud. Para todo lo demás,{" "}
              {op.correo && (
                <>
                  escríbenos a <EnlaceCorreo correo={op.correo} /> o{" "}
                </>
              )}
              usa la <EnlaceContacto motivo="datos" /> con el motivo «Mis datos personales».
            </>
          ) : op.correo ? (
            <>
              escríbenos a <EnlaceCorreo correo={op.correo} /> o desde la <EnlaceContacto />.
            </>
          ) : (
            <>
              escríbenos desde la <EnlaceContacto />; si ya postulaste, usa el mismo correo de tu solicitud.
            </>
          )}{" "}
          Es gratis. Podemos pedirte confirmar tu identidad. Responderemos dentro del plazo que fija la ley vigente.
        </p>
        <p>
          Si no respondemos o no estás conforme con la respuesta, puedes reclamar ante la Agencia de Protección de
          Datos Personales una vez que entre en funciones, o ante los tribunales según la normativa vigente.
        </p>
        {!A && <p>También puedes retirar tu solicitud cuando quieras con tu enlace privado.</p>}
      </>
    ),
  },
  {
    titulo: "Personas menores de edad",
    contenido:
      "Rumbo es solo para personas de 18 años o más. Si nos enteramos de que una persona menor de edad postuló, eliminaremos sus datos.",
  },
  {
    titulo: "Cambios a esta política",
    contenido:
      "Cada versión indica su número y fecha. Si un cambio afecta cómo usamos tus datos, lo publicaremos en esta página antes de aplicarlo y, cuando la ley lo exija, te pediremos una nueva autorización.",
  },
];

export default function Privacidad() {
  return (
    <PaginaLectura>
      <Encabezado
        ojo="Privacidad"
        titulo="Cuidamos lo que nos cuentas."
        nivel={1}
        bajada={t(
          "Política de privacidad de Rumbo, versión {numero}, vigente desde el {fecha}. Explica qué datos tratamos durante el piloto, para qué, dónde se guardan y cómo ejercer tus derechos.",
          VERSION_PRIVACIDAD,
        )}
      />
      <Aviso icono="lock" titulo="En simple">
        <ul>
          <li>Pedimos solo lo necesario para revisar tu solicitud y acompañarte.</li>
          <li>No vendemos tus datos ni los usamos para publicidad.</li>
          <li>No necesitas contarnos diagnósticos ni enviarnos documentos de salud.</li>
          <li>
            {C
              ? "Tu calendario, tu progreso y tus fotos son privados. En la comunidad y el ranking, que son opcionales, solo se ve tu alias."
              : "Tu calendario y tu progreso son privados."}
          </li>
          <li>Puedes pedir ver, corregir, llevarte o eliminar tus datos, y retirar tu autorización.</li>
        </ul>
      </Aviso>
      <Pasos lectura nivelTitulo="h2" pasos={secciones} />
      <div className="lectura-cierre">
        <p className="microcopia">
          Normativa aplicable: Ley N.º 19.628 sobre protección de la vida privada y, desde su entrada en vigencia, las
          modificaciones introducidas por la Ley N.º 21.719.
        </p>
        <EnlaceUtil href={rutas.privacidadPlataforma} plataforma>
          Aviso de privacidad de la plataforma
        </EnlaceUtil>
        <div className="acciones">
          <Boton href="/" variante="secundario">
            Volver al inicio
          </Boton>
          <Boton
            href={op.correo ? `mailto:${op.correo}` : rutas.contacto}
            variante="terciario"
            plataforma={!op.correo && FORMULARIO_EXTERNO}
          >
            Escríbenos
            {(op.correo || FORMULARIO_EXTERNO) && <Icono nombre="arrow-up-right" tamaño={16} />}
          </Boton>
        </div>
      </div>
    </PaginaLectura>
  );
}
