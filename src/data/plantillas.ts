// Plantillas que Diego envía a mano desde el correo de Rumbo (especificación de la plataforma
// 3.16). El panel las copia con los datos ya puestos (5.4). Texto final, tal cual.
// - Lo que solo Diego sabe al escribir (resumen, horarios, pregunta) queda entre corchetes en
//   minúscula, sin llaves: el guardián de marcadores rechaza cualquier llave publicada. El panel
//   los resalta como campos por completar (CAMPO_POR_COMPLETAR).
// - «Aviso de traslado» no está: es solo para quienes postularon en ChatGPT (etapa 5).

export type DatosPlantilla = {
  nombre: string;
  fecha?: string; // «jueves 8 de octubre»: fecha de la primera solicitud o lunes de inicio
  enlaceCondiciones: string;
  enlaceAyuda: string;
  enlaceEntrar: string;
  quienAcompana: string; // nombre de quien acompaña
  conAviso?: boolean; // la persona autorizó avisos de nuevas etapas
};

export type Plantilla = { id: string; nombre: string; cuerpo: (d: DatosPlantilla) => string };

const RESUMEN = "[resumen en una línea]";
const HORARIOS = "[horarios]";
const PREGUNTA = "[pregunta]";

export const PLANTILLAS: Plantilla[] = [
  {
    id: "primer-contacto",
    nombre: "Primer contacto",
    cuerpo: (d) =>
      [
        `Hola, ${d.nombre}: gracias por contarnos tu meta. La leímos y creemos que el piloto puede ayudarte con ${RESUMEN}.`,
        `Antes de acordar nada, nos gustaría aclarar contigo tu meta y tu disponibilidad, y contarte el plan, el precio y las condiciones. ¿Te acomoda conversarlo en alguno de estos horarios (hora de Chile)? ${HORARIOS}`,
        `Las condiciones del piloto están aquí: ${d.enlaceCondiciones}. Nada empieza ni se cobra sin tu acuerdo.`,
        `Un saludo, ${d.quienAcompana}, Rumbo.`,
      ].join("\n\n"),
  },
  {
    id: "mas-informacion",
    nombre: "Pedir más información",
    cuerpo: (d) =>
      `Hola, ${d.nombre}: gracias por tu solicitud. Para entender mejor tu meta, ¿nos cuentas ${PREGUNTA}? Puedes responder a este correo. Un saludo, Rumbo.`,
  },
  {
    id: "capacidad",
    nombre: "No avanza por capacidad",
    cuerpo: (d) =>
      `Hola, ${d.nombre}: gracias por contarnos tu meta. En esta primera etapa el piloto acompaña a un grupo pequeño de personas y no podremos acompañarte ahora. No tiene que ver contigo ni con tu meta. Si abrimos una nueva etapa, lo publicaremos en la web de Rumbo${d.conAviso ? " y te avisaremos, como nos autorizaste" : ""}. Un saludo, Rumbo.`,
  },
  {
    id: "alcance",
    nombre: "No avanza por alcance",
    cuerpo: (d) =>
      `Hola, ${d.nombre}: gracias por contarnos tu meta. Lo que nos cuentas está fuera de lo que Rumbo acompaña en este piloto: proyectos, estudio y organización. No es un juicio sobre ti ni sobre tu meta. Si te sirve, un profesional de salud puede orientarte mejor. Si en algún momento necesitas ayuda inmediata, aquí hay líneas gratuitas: ${d.enlaceAyuda}. Un saludo, Rumbo.`,
  },
  {
    id: "repetida",
    nombre: "Solicitud repetida",
    cuerpo: (d) =>
      `Hola, ${d.nombre}: recibimos una segunda solicitud con este correo. Seguimos con la primera, del ${d.fecha ?? "[fecha]"}, y la nueva la sumamos a esa. Si quieres ver su estado, usa el enlace privado de la primera; si lo perdiste, responde este correo y te enviamos uno nuevo. Un saludo, Rumbo.`,
  },
  {
    id: "espacio-listo",
    nombre: "Tu espacio está listo",
    cuerpo: (d) =>
      `Hola, ${d.nombre}: tu espacio en Rumbo está listo. Entra en ${d.enlaceEntrar} con este correo: te enviaremos un código de 6 dígitos para entrar, sin contraseña. Revisa también spam o promociones. Tu programa parte el lunes ${d.fecha ?? "[fecha]"}. Un saludo, ${d.quienAcompana}, Rumbo.`,
  },
];

// Un campo por completar: «[resumen en una línea]», «[horarios]», «[pregunta]», «[tu nombre]».
export const CAMPO_POR_COMPLETAR = /(\[[^\]\n]{1,40}\])/;

export const plantillaPorId = (id: string) => PLANTILLAS.find((p) => p.id === id) ?? PLANTILLAS[0];
