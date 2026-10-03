// Textos de /postular/ (confirmación), /estado/ y del aside de las páginas públicas de la
// plataforma (especificación de la plataforma 3.4, 3.13 y 3.14) que todavía no están en
// src/data/formularios.ts. Texto final de la especificación, tal cual; las funciones reciben el
// dato ya escrito (nunca se publica una llave). Al pasar a la etapa 2 se mudan a formularios.ts.
// Solo vista previa (grupo «formulario»).
import { operacion } from "../../../data/rumbo";

// ---------------------------------------------------------------------------
// Aside de /postular/, /estado/ y /contacto/ (3.4 y 3.14): «Qué pasa después», «En simple» y
// «¿Dudas? Escríbenos», siempre en el mismo lugar (WCAG 3.2.6).

export const ASIDE = {
  etiqueta: "Qué pasa después",
  // «En simple» (lock): los mismos cinco puntos de la Política de privacidad (rediseño 5.3).
  enSimple: {
    titulo: "En simple",
    items: [
      "Pedimos solo lo necesario para revisar tu solicitud y acompañarte.",
      "No vendemos tus datos ni los usamos para publicidad.",
      "No necesitas contarnos diagnósticos ni enviarnos documentos de salud.",
      "Tu calendario y tus fotos son privados.",
      "Puedes pedir ver, corregir, llevarte o eliminar tus datos, y retirar tu autorización.",
    ],
    // Solo aplica a quien ya tiene (o puede tener) programa: no se muestra en /contacto/ ni en el modo interés.
    soloConPrograma: "Tu calendario y tus fotos son privados.",
  },
  dudas: "¿Dudas? Escríbenos",
} as const;

// «Qué pasa después» (4 pasos compactos, 3.4). La especificación no fija su texto: se arma con el
// primer paso del método de la portada y los pasos 2 a 4 de la confirmación (3.13).
export const pasosAntesDeEnviar = (fecha: string | null) => [
  {
    titulo: "Cuéntanos tu meta",
    contenido:
      "Un formulario breve: tu meta (aunque sea difusa), el área y el tipo de apoyo que te interesa. Sin cuenta y sin pago.",
  },
  { titulo: "La leemos", contenido: pasoLeemos(fecha) },
  { titulo: "Te escribimos", contenido: PASO_ESCRIBIMOS },
  { titulo: "Decides tú", contenido: "El acuerdo existe solo cuando lo aceptas. Nada empieza ni se cobra antes." },
];

const pasoLeemos = (fecha: string | null) =>
  operacion.respondemosTodas && fecha
    ? `Una persona la revisa. Respondemos a todas las solicitudes, a más tardar el ${fecha}.`
    : "Una persona la revisa.";

const PASO_ESCRIBIMOS =
  "Si el piloto puede ayudarte, te escribimos para aclarar tu meta, tu disponibilidad, el plan, el precio y las condiciones. Si no, también te avisamos." +
  (operacion.tamanoPrimerGrupo ? ` El primer grupo es de ${operacion.tamanoPrimerGrupo} personas.` : "");

// ---------------------------------------------------------------------------
// Confirmación (estado de /postular/, 3.13)

export const CONFIRMACION = {
  ojo: "Solicitud enviada",
  titulo: (nombre: string) => `Recibimos tu solicitud, ${nombre}.`,
  yaEnviada: "Ya enviaste esta solicitud.",
  // «Una persona la va a leer y te escribirá a **{correo}** a más tardar el **{fecha}**, también si…»
  bajada: {
    antes: "Una persona la va a leer y te escribirá a ",
    plazo: " a más tardar el ",
    despues: operacion.respondemosTodas ? ", también si en esta etapa no podemos acompañarte." : ".",
  },
  enlace: {
    titulo: "Tu enlace privado",
    texto: "Con este enlace puedes ver el estado de tu solicitud o retirarla. ",
    guardar: "No te lo enviamos por correo: guárdalo ahora.",
    textoInteres: "Con este enlace puedes dejar de recibir este aviso cuando quieras.",
    copiar: "Copiar enlace",
    copiado: "Enlace copiado.",
    ver: "Ver mi solicitud",
    lock: "Este enlace es solo para ti: quien lo tenga puede ver lo que nos contaste. No lo compartas.",
  },
  quePasa: "Qué pasa ahora",
  pasos: (fechaHora: string, fecha: string | null) => [
    { titulo: "Enviaste tu solicitud", contenido: `${fechaHora}, hora de Chile.` },
    { titulo: "La leemos", contenido: pasoLeemos(fecha) },
    { titulo: "Te escribimos", contenido: PASO_ESCRIBIMOS },
    { titulo: "Decides tú", contenido: "El acuerdo existe solo cuando lo aceptas. Nada empieza ni se cobra antes." },
  ],
  // «Mientras tanto, puedes leer las [Condiciones del piloto] y qué incluye cada [plan]. …»
  info: {
    antes: "Mientras tanto, puedes leer las ",
    condiciones: "Condiciones del piloto",
    medio: " y qué incluye cada ",
    plan: "plan",
    despues: ". Cuando esperes nuestra respuesta, revisa también tu carpeta de spam o promociones.",
  },
  volver: "Volver al inicio",
  otra: "Enviar otra solicitud",
  interes: {
    ojo: "Más adelante",
    titulo: (nombre: string) => `Anotamos tu interés, ${nombre}.`,
    // «Si {área} abre, te escribiremos a **{correo}**. No te enviaremos otros correos.»
    antes: "Si ",
    medio: " abre, te escribiremos a ",
    despues: ". No te enviaremos otros correos.",
    flecha: "¿Tienes también una meta de proyectos, estudio u organización? Cuéntanos tu meta",
  },
  // PROPUESTO (lo decide Diego): bajada del aviso de reapertura, que no tiene área.
  reapertura: {
    antes: "Te escribiremos a ",
    despues: " cuando volvamos a recibir solicitudes. No te enviaremos otros correos.",
  },
} as const;

// ---------------------------------------------------------------------------
// Estado de la solicitud (/estado/#token, 3.14)

export const ESTADO = {
  sinToken: {
    titulo: "¿Buscas tu solicitud?",
    antes:
      "Para ver tu solicitud necesitas el enlace privado que apareció al enviarla. Si lo perdiste, ",
    enlace: "escríbenos",
    despues: " con el correo de tu solicitud y te enviamos uno nuevo.",
  },
  cargando: "Buscando tu solicitud…",
  noEncontrada: {
    titulo: "No encontramos esta solicitud.",
    texto:
      "Puede que el enlace esté incompleto, que la solicitud se haya retirado o que sea un enlace de nuestra plataforma anterior. Revisa que lo copiaste completo; si sigue sin funcionar, escríbenos.",
    primario: "Cuéntanos tu meta",
    terciario: "Escríbenos",
  },
  // «No pudimos cargar tu solicitud. Revisa tu conexión e inténtalo de nuevo.»: la primera frase es el H1.
  errorRed: { titulo: "No pudimos cargar tu solicitud.", texto: "Revisa tu conexión e inténtalo de nuevo.", boton: "Intentar de nuevo" },
  pasoActual: "(paso actual)",
  pasos: ["Enviaste tu solicitud", "La leemos", "Te escribimos", "Aceptas tu acuerdo", "Entras a Mi espacio"],
  pasoCerrada: "Cerramos tu solicitud",
  pasoRetirada: "La retiraste",
  tarjeta: {
    titulo: "Lo que nos contaste",
    // Rótulos de la lista de definición: la especificación nombra los datos, no sus rótulos.
    area: "Área",
    apoyo: "Tipo de apoyo",
    horarios: "Horarios",
    nombre: "Nombre",
    correo: "Correo",
    fecha: "Fecha",
    verMeta: "Ver lo que escribiste",
  },
  recibida: {
    etiqueta: "Recibida",
    titulo: "Recibimos tu solicitud.",
    texto: (correo: string, fecha: string) =>
      `Una persona la va a leer y te escribirá a ${correo} a más tardar el ${fecha}${operacion.respondemosTodas ? ", también si en esta etapa no podemos acompañarte" : ""}.`,
  },
  enRevision: { etiqueta: "En revisión", titulo: "Estamos leyendo tu solicitud." },
  conAtraso: {
    etiqueta: "Con atraso",
    texto:
      "Nos estamos demorando más de lo que dijimos. Perdón: tu solicitud sigue en revisión y te escribiremos lo antes posible.",
  },
  respondida: {
    etiqueta: "Te escribimos",
    titulo: "Te escribimos.",
    texto: (fecha: string, correo: string) =>
      `El ${fecha} te enviamos un correo a ${correo}. Si no lo ves, revisa spam o promociones, o escríbenos.`,
  },
  acordada: { etiqueta: "Acuerdo listo", titulo: "Revisa y acepta tu acuerdo." },
  aceptada: {
    etiqueta: "Acuerdo aceptado",
    titulo: "Aceptaste tu acuerdo.",
    texto: (fecha: string, version: string) =>
      `El ${fecha} aceptaste las Condiciones del piloto (versión ${version}). Estamos preparando tu espacio; te escribiremos cuando puedas entrar.`,
  },
  conEspacio: {
    etiqueta: "Tu espacio está listo",
    titulo: "Tu espacio está listo.",
    texto: "Entra a Mi espacio con tu correo: te enviamos un código para entrar, sin contraseña.",
    boton: "Entrar a Mi espacio",
  },
  cerrada: {
    etiqueta: "Cerrada",
    capacidad: {
      titulo: "Por ahora no podremos acompañarte.",
      texto: (conAvisos: boolean) =>
        `En esta etapa el piloto acompaña a un grupo pequeño de personas y ya no tenemos espacio. No tiene que ver contigo ni con tu meta. Si abrimos una nueva etapa, lo publicaremos en la web${conAvisos ? " y te avisaremos, como nos autorizaste" : ""}.`,
    },
    alcance: {
      titulo: "Por ahora Rumbo no es el apoyo adecuado para tu meta.",
      texto:
        "Lo que nos cuentas está fuera de lo que Rumbo acompaña en este piloto: proyectos, estudio y organización. No es un juicio sobre ti ni sobre tu meta. Si te sirve, un profesional de salud puede orientarte mejor.",
    },
    sinRespuesta: {
      titulo: "Cerramos tu solicitud.",
      texto: "Te escribimos dos veces y no tuvimos respuesta. Si todavía te interesa, puedes volver a postular cuando quieras.",
    },
  },
  retirada: {
    etiqueta: "Retirada",
    titulo: "Retiraste tu solicitud.",
    texto: (fecha: string) =>
      `El ${fecha} borramos lo que nos contaste y tus datos de contacto. Puedes volver a postular cuando quieras.`,
    boton: "Cuéntanos tu meta",
  },
  interes: {
    etiqueta: "Interés anotado",
    titulo: (area: string) => `Tu interés en ${area} está anotado.`,
    texto: (correo: string) => `Si esta área abre, te escribiremos a ${correo}.`,
  },
  interesCerrado: { etiqueta: "Cerrada", titulo: "Ya no te enviaremos avisos." },
  // «Nota de {nombreCoach}» (nota_cierre, opcional): va bajo el texto fijo, nunca lo reemplaza.
  notaDe: (nombre: string) => `Nota de ${nombre}`,
  // Bloque de aceptación del acuerdo (estado acordada).
  acuerdo: {
    titulo: "Tu acuerdo",
    ciclo: (semanas: number, fecha: string) => `Ciclo de ${semanas} semanas desde el lunes ${fecha}`,
    revision: (dia: string) => `Tu revisión semanal: los ${dia}`,
    videollamada: (dia: string, hora: string) => `Tu videollamada semanal: ${dia}, ${hora} (hora de Chile)`,
    condiciones: (version: string) => `Lee las Condiciones del piloto (versión ${version})`,
  },
} as const;
