// Preguntas frecuentes de la portada (5.2-5b) como datos. Cada respuesta depende de
// `operacion`: preguntasVisibles() omite las que necesitan un dato que aún no existe.
// La portada y las pruebas usan esta función; el número de preguntas no se escribe a mano.
import { operacion, t, type Operacion } from "./rumbo";

// Un trozo de respuesta: texto o enlace. Así las respuestas siguen siendo datos (sin JSX).
export type Segmento =
  | string
  | { texto: string; href: string; tipo: "interno" | "tel" | "correo" | "plataforma" };

export type GrupoId = "servicio" | "precio" | "cuenta" | "salud";
export const grupos: { id: GrupoId; titulo: string }[] = [
  { id: "servicio", titulo: "El servicio" },
  { id: "precio", titulo: "Precio y condiciones" },
  { id: "cuenta", titulo: "Cuenta y datos" },
  { id: "salud", titulo: "Salud y cuidado" },
];

export type Pregunta = {
  id: string; // data-faq
  grupo: GrupoId;
  pregunta: string;
  respuesta: Segmento[];
  // Enlace que va después de la respuesta, fuera del párrafo.
  enlaceExtra?: { texto: string; href: string };
};

// Una pregunta por función: null = no se publica con los datos actuales.
type Fabrica = (op: Operacion) => Pregunta | null;

const ROL_COACH =
  "Su rol es ayudarte a organizar, revisar y ajustar tu programa; no es atención psicológica, nutricional ni médica.";

const fabricas: Fabrica[] = [
  // El servicio
  () => ({
    id: "servicio-diferencia",
    grupo: "servicio",
    pregunta: "¿En qué se diferencia Rumbo de una app de hábitos o de mi propio calendario?",
    respuesta: [
      "En que no tienes que armar el programa tú. El equipo prepara tu programa —acciones con horario o flexibles, duración e instrucciones— y lo publica en tu espacio. Puedes pedir ajustes, y cada semana una persona revisa contigo qué funcionó.",
    ],
  }),
  () => ({
    id: "servicio-sin-meta",
    grupo: "servicio",
    pregunta: "¿Y si no tengo una meta clara?",
    respuesta: [
      "No hace falta tenerla. Cuéntanos lo que te inquieta y en la conversación inicial la definimos contigo.",
    ],
  }),
  () => ({
    id: "servicio-tiempo",
    grupo: "servicio",
    pregunta: "¿Cuánto tiempo necesito y cuánto dura?",
    respuesta: [
      "El tiempo que tengas de verdad: nos lo cuentas al postular y el programa se arma con acciones cortas que quepan en tu semana. Trabajamos en ciclos de 4 semanas y, según tu meta, el programa puede durar 4, 8 o 12 semanas. En el piloto empezamos con un ciclo de 4 semanas; continuar se acuerda al cerrarlo, cuando decidimos contigo si seguir, reformular o terminar. No prometemos resultados: revisamos contigo lo que va pasando.",
    ],
  }),
  (op) => ({
    id: "servicio-quien",
    grupo: "servicio",
    pregunta: "¿Quién me acompaña?",
    respuesta: [
      op.acompanante
        ? t("En el piloto te acompaña {nombre}, {rol}. {bio} ", {
            nombre: op.acompanante.nombre,
            rol: op.acompanante.rol,
            bio: op.acompanante.bio,
          }) + ROL_COACH
        : "Una persona del equipo de Rumbo, que prepara tu programa y revisa tu semana contigo. La conocerás antes de empezar. " +
          ROL_COACH,
    ],
  }),
  (op) => ({
    id: "servicio-revisiones",
    grupo: "servicio",
    pregunta: "¿Cómo son las revisiones y las respuestas entre semanas?",
    respuesta: [
      op.canalRevisiones && op.canalRespuestas && op.plazoRespuestas
        ? t(
            "Las revisiones semanales son por {canalRevisiones}, en el horario que acordemos. Las respuestas breves llegan por {canalRespuestas} dentro de {plazoRespuestas}. La plataforma no tiene chat ni videollamadas, y no hay respuesta inmediata.",
            { canalRevisiones: op.canalRevisiones, canalRespuestas: op.canalRespuestas, plazoRespuestas: op.plazoRespuestas },
          )
        : "Se coordinan con el equipo fuera de la plataforma, por el canal que acordemos antes de empezar. La plataforma no tiene chat ni videollamadas, y no hay respuesta inmediata.",
    ],
  }),
  () => ({
    id: "servicio-no-cumplo",
    grupo: "servicio",
    pregunta: "¿Qué pasa si una semana no cumplo?",
    respuesta: [
      "Lo que ya registraste sigue contando y no recibirás reproches. Para eso está la revisión: entender qué pasó y ajustar tu programa a algo que sí quepa en tu semana. Volver a empezar también cuenta.",
    ],
  }),

  // Precio y condiciones
  (op) => {
    const precios = op.preciosConImpuestos
      ? "son el valor total del ciclo, con impuestos incluidos"
      : "son de referencia para el piloto";
    const tope =
      !op.preciosConImpuestos && op.topePrecio
        ? " El precio final, con impuestos incluidos, no será mayor que el publicado."
        : "";
    return {
      id: "precio-postular",
      grupo: "precio",
      pregunta: "¿Me van a cobrar al postular?",
      respuesta: [
        `No. Postular es gratis y no es una compra ni una reserva. Los precios publicados ${precios}; antes de cualquier cobro acordamos contigo el alcance, el canal, los plazos y el precio final.${tope} Hoy no hay pagos en línea.`,
      ],
    };
  },
  (op) => ({
    id: "precio-pago",
    grupo: "precio",
    pregunta: "¿Cómo se paga?",
    respuesta: [
      op.formaDePago && op.documentoTributario
        ? t("{formaDePago}. Por cada pago recibes {documentoTributario}. Hoy no hay pagos en línea.", {
            formaDePago: op.formaDePago,
            documentoTributario: op.documentoTributario,
          })
        : "Lo acordamos contigo antes de empezar, junto con el precio final. Hoy no hay pagos en línea.",
    ],
  }),
  (op) => ({
    id: "precio-retirarme",
    grupo: "precio",
    pregunta: "¿Puedo pausar o retirarme?",
    respuesta: op.politicaTermino
      ? [
          "Antes de empezar, sí, cuando quieras: retiras tu solicitud con tu enlace privado, sin costo. ",
          t("Si ya empezaste un ciclo: {politicaTermino}", { politicaTermino: op.politicaTermino }),
        ]
      : [
          "Antes de empezar, sí, cuando quieras: retiras tu solicitud con tu enlace privado, sin costo. Si ya empezaste un ciclo, las condiciones de pausa, término y devolución se acuerdan contigo antes de cualquier pago y quedan en las ",
          { texto: "Condiciones del piloto", href: "/condiciones/", tipo: "interno" },
          ".",
        ],
  }),
  () => ({
    id: "precio-plan",
    grupo: "precio",
    pregunta: "¿Qué plan me conviene?",
    respuesta: [
      "Con acompañamiento, si buscas un programa preparado y una revisión breve cada semana. Acompañamiento cercano, si necesitas más tiempo de conversación y seguimiento. Si no lo tienes claro, postula sin elegir plan y lo vemos contigo.",
    ],
  }),
  (op) =>
    op.cobertura
      ? {
          id: "precio-cobertura",
          grupo: "precio",
          pregunta: "¿Puedo participar si no vivo en Santiago?",
          respuesta: [op.cobertura.respuesta],
        }
      : null,

  // Cuenta y datos
  () => ({
    id: "cuenta",
    grupo: "cuenta",
    pregunta: "¿Necesito una cuenta?",
    respuesta: [
      "Para postular, no. Si avanzamos, tu programa se publica en Mi espacio, que se abre en la plataforma de Rumbo —otra dirección web— y pide iniciar sesión con una cuenta de ChatGPT. Si no tienes una, puedes crearla gratis. Hoy no hay otra forma de entrar a Mi espacio: si prefieres no crearla, dínoslo antes de acordar nada.",
    ],
  }),
  () => ({
    id: "datos",
    grupo: "cuenta",
    pregunta: "¿Qué hacen con lo que les cuento?",
    respuesta: [
      "Lo usamos solo para revisar tu solicitud y acompañarte. No vendemos tus datos ni los usamos para publicidad, y no necesitas contarnos diagnósticos. Tu calendario y tus fotos son privados, y la comunidad solo muestra tu alias. Puedes pedir ver, corregir o eliminar tus datos. Los detalles están en ",
      { texto: "Privacidad", href: "/privacidad/", tipo: "interno" },
      ".",
    ],
  }),

  // Salud y cuidado
  () => ({
    id: "salud-reemplazo",
    grupo: "salud",
    pregunta: "¿Rumbo reemplaza a un psicólogo, nutricionista o médico?",
    respuesta: [
      "No. Rumbo no diagnostica, no indica tratamientos y no reemplaza a ningún profesional de salud. Si tienes indicaciones de un profesional, te ayudamos a llevarlas a tu semana tal como te las dieron, sin cambiarlas. No nos comunicamos con tu profesional salvo que tú lo pidas y lo autorices por escrito.",
    ],
  }),
  () => ({
    id: "salud-inmediata",
    grupo: "salud",
    pregunta: "¿Hay atención inmediata o inteligencia artificial?",
    respuesta: [
      "No. Las respuestas son humanas y llegan por el canal y en el plazo que acordemos antes de empezar. La guía con inteligencia artificial está en preparación y no es parte del servicio; cuando exista, ninguna propuesta cambiará tu calendario sin tu confirmación.",
    ],
  }),
  () => ({
    id: "salud-crisis",
    grupo: "salud",
    pregunta: "¿Qué hago si estoy pasando por un momento muy difícil?",
    respuesta: [
      "No esperes a postular. Si piensas en hacerte daño o en quitarte la vida, llama gratis al *4141 desde tu celular (Línea de Prevención del Suicidio, 24 horas). En una emergencia médica, llama al ",
      { texto: "131", href: "tel:131", tipo: "tel" },
      " o ve a la urgencia más cercana. Para orientación en salud, Salud Responde: ",
      { texto: "600 360 7777", href: "tel:6003607777", tipo: "tel" },
      ". Si no estás en Chile, llama al número de emergencias de tu país. Pasar por un momento difícil no es falta de voluntad, y pedir ayuda no es una falla.",
    ],
    enlaceExtra: { texto: "Ayuda inmediata", href: "/ayuda/" },
  }),
];

export function preguntasVisibles(op: Operacion = operacion): Pregunta[] {
  return fabricas.map((f) => f(op)).filter((p): p is Pregunta => p !== null);
}

// Preguntas visibles agrupadas, en el orden de `grupos`.
export function preguntasPorGrupo(op: Operacion = operacion) {
  const visibles = preguntasVisibles(op);
  return grupos.map((g) => ({ ...g, preguntas: visibles.filter((p) => p.grupo === g.id) }));
}

// Texto plano de una respuesta (pruebas y búsquedas).
export const textoPlano = (segmentos: Segmento[]) =>
  segmentos.map((s) => (typeof s === "string" ? s : s.texto)).join("");
