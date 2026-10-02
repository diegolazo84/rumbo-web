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
import { ANALITICA_ACTIVA as ANALITICA, SANTIAGO, operacion as op, rayas, rutas, t } from "../data/rumbo";

// Política de privacidad (5.3). La fecha es la de la versión publicada (VERSION_PUBLICADA en
// paginas.ts), literal y escrita en el mismo commit que la publica (nunca un marcador).
const VERSION_PRIVACIDAD = { numero: "1.0", fecha: VERSION_PUBLICADA.texto };

const ELIMINAR =
  "Puedes pedirnos que los eliminemos en cualquier momento, y lo haremos, salvo lo que la ley nos obligue a conservar, como los documentos tributarios.";

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
              <strong>Cuando visitas esta web:</strong> No tiene formularios ni cookies. GitHub, que la aloja, registra
              tu dirección IP por seguridad. Las tipografías se sirven desde este mismo sitio.
              {ANALITICA &&
                " Usamos Umami, una herramienta de estadísticas sin cookies que no guarda datos que te identifiquen: solo cifras agregadas, como páginas vistas, origen de la visita y clics en botones."}
            </>,
            <>
              <strong>Cuando postulas:</strong> Nombre, correo, el área que eliges, una descripción breve de tu meta, tu
              preferencia de apoyo, tu disponibilidad si la indicas y la confirmación de que eres mayor de edad.
            </>,
            <>
              <strong>Cuando nos escribes:</strong> Nombre, correo y tu mensaje.
            </>,
            <>
              <strong>Cuando participas en un ciclo:</strong> Los datos de la cuenta con la que inicias sesión; tu
              programa (metas, acciones, horarios e instrucciones); lo que registras como hecho; créditos, niveles y
              rachas; tus registros semanales y las respuestas de quien te acompaña; tus solicitudes de ajuste, y las
              fotos de acciones que acordemos.
            </>,
            <>
              <strong>Si participas en la comunidad:</strong> Tu alias, tus créditos en el ranking y tus publicaciones
              en el foro.
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
        <p>Te pedimos no incluir datos de otras personas en tus mensajes ni en tus fotos.</p>
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
            "Acordar contigo el plan, el precio y las condiciones: porque tú lo solicitas, antes de un acuerdo.",
            "Preparar, publicar y ajustar tu programa, hacer las revisiones y calcular créditos y niveles: para cumplir lo que acordamos contigo.",
            "Mostrar tu alias en el ranking y tus publicaciones en el foro: solo si tú lo activas.",
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
    contenido:
      "Los créditos, niveles y rachas se calculan automáticamente, con reglas públicas, a partir de lo que registras. Son informativos: no deciden si te aceptamos, cuánto pagas ni si continúas, y no evalúan tu valor como persona. La aceptación al piloto siempre la decide una persona.",
  },
  {
    titulo: "Con quién compartimos tus datos",
    contenido: (
      <>
        <p>Solo con los proveedores que necesitamos para operar:</p>
        <ListaLectura
          items={puntuar([
            "GitHub (Estados Unidos), que aloja esta web",
            // Cloudflare solo se nombra cuando Diego confirme la infraestructura de ChatGPT Sites (8.11).
            rayas(
              op.alojamientoVerificado
                ? "OpenAI (Estados Unidos), que provee la plataforma de Rumbo mediante ChatGPT Sites —donde están tu solicitud, tu programa y tus fotos— y el inicio de sesión con ChatGPT. OpenAI usa a su vez proveedores de infraestructura, como Cloudflare, en Estados Unidos u otros países"
                : "OpenAI (Estados Unidos), que provee la plataforma de Rumbo mediante ChatGPT Sites —donde están tu solicitud, tu programa y tus fotos— y el inicio de sesión con ChatGPT, y los proveedores de infraestructura que OpenAI utiliza",
            ),
            "el servicio de videollamadas que usemos para la conversación inicial y las revisiones de Acompañamiento cercano, que te informaremos antes de usarlo",
            ...(ANALITICA ? ["Umami (Estados Unidos o Unión Europea), para estadísticas sin cookies"] : []),
          ])}
        />
        <p>Al iniciar sesión con ChatGPT, OpenAI trata los datos de esa cuenta según su propia política.</p>
        <p>
          Con profesionales de salud, solo si tú lo pides y lo autorizas por escrito. Con autoridades, solo cuando la
          ley lo exija.
        </p>
      </>
    ),
  },
  {
    titulo: "Transferencias fuera de Chile",
    contenido:
      "Estos proveedores pueden guardar o procesar datos en Estados Unidos u otros países, que podrían no ofrecer un nivel de protección equivalente al chileno.",
  },
  {
    titulo: "Cuánto tiempo guardamos tus datos",
    contenido: op.conservacion ? (
      <>
        <ListaLectura items={op.conservacion.map((c) => `${c.tipo}: ${c.plazo}`)} />
        <p>{ELIMINAR}</p>
      </>
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
            "Tu solicitud se consulta con un enlace privado que solo tú recibes.",
            "Tu espacio requiere iniciar sesión.",
            "Las fotos solo las ven tú y las personas del equipo autorizadas para revisarlas. Nunca se publican.",
            "El ranking muestra solo alias y créditos, nunca tu correo, tus fotos, tu calendario ni tus metas.",
            "Las publicaciones del foro se revisan antes de mostrarse.",
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
  {
    titulo: "Comunidad y ranking",
    contenido:
      "Participar es voluntario y solo se muestra tu alias. Puedes borrar tus publicaciones o retirarte cuando quieras, y tu alias deja de mostrarse.",
  },
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
          {op.correo ? (
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
        <p>También puedes retirar tu solicitud cuando quieras con tu enlace privado.</p>
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
          <li>Tu calendario y tus fotos son privados.</li>
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
            plataforma={!op.correo}
          >
            Escríbenos
            <Icono nombre="arrow-up-right" tamaño={16} />
          </Boton>
        </div>
      </div>
    </PaginaLectura>
  );
}
