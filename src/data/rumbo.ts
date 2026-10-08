// Fuente única de los datos de negocio de la web: áreas, planes, precios, créditos,
// niveles, estados, listas de lo que no se incluye, quién puede participar y datos
// operativos. Ningún componente escribe a mano un dato de negocio ni una lista que
// aparezca en más de un lugar. Deben coincidir con la plataforma original
// (chatgpt.site): si cambian allí, se cambian aquí. Ver docs/coherencia.md.
import type { NombreIcono } from "../components/Icono";

export const PLATAFORMA = "https://rumbo-acompanamiento-diego.diegolazo84.chatgpt.site";

// Interruptor D8 de la plataforma (2.4 y 7, momento A): «Cuéntanos tu meta» (/postular/), el
// estado de la solicitud (/estado/#token) y el contacto (/contacto/) en esta web, con Supabase.
// Diego lo cambia a `true` aquí, en el mismo commit que publica Privacidad y Condiciones del
// momento A, cuando el SQL de supabase/ esté pegado en el proyecto real y verificacion.sql diga
// «ok». Mientras sea `false`, todo sigue como hoy: los enlaces van a la plataforma de ChatGPT y
// postbuild.mjs genera los reenvíos de /postular, /contacto y /estado.
// Al encenderlo: VERSION_PUBLICADA (paginas.ts) pasa a la fecha de ese día, Privacidad y
// Condiciones pasan solas a la versión 1.1 y ajustes_operacion.version_privacidad y
// version_condiciones deben decir también '1.1' (hoy su valor por defecto es '1.0').
const FORMULARIO_PROPIO = false;
// FORMULARIO_PROPIO=1 en el entorno lo fuerza encendido sin tocar este archivo: al compilar
// (vite.config.ts lo pasa como __FORMULARIO_PROPIO__) y al correr las pruebas (fuera de Vite).
const FORMULARIO_FORZADO =
  typeof __FORMULARIO_PROPIO__ !== "undefined"
    ? __FORMULARIO_PROPIO__ === true
    : (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.FORMULARIO_PROPIO === "1";
const PROPIO = FORMULARIO_PROPIO || FORMULARIO_FORZADO;
// Los enlaces a postular y contacto salen a la plataforma (flecha diagonal y texto oculto).
export const FORMULARIO_EXTERNO = !PROPIO;

// Rutas que viven en la plataforma original. scripts/postbuild.mjs además genera
// reenvíos con las mismas rutas en este dominio, para enlaces escritos a mano.
// Con el formulario propio, postular y contacto son páginas de esta web (con barra final).
export const rutas = {
  postular: PROPIO ? "/postular/" : `${PLATAFORMA}/postular`,
  contacto: PROPIO ? "/contacto/" : `${PLATAFORMA}/contacto`,
  estado: PROPIO ? "/estado/" : `${PLATAFORMA}/estado`,
  miEspacio: `${PLATAFORMA}/mi-programa`,
  comunidad: `${PLATAFORMA}/comunidad`,
  privacidadPlataforma: `${PLATAFORMA}/privacidad-piloto`,
} as const;

export const LEMA = "Ordena lo que importa. Avanza con apoyo.";
// Insignia de la portada: cabe en una línea a 320 px (199 de 246 px útiles). «Piloto en
// preparación · En línea y en español» mide 283 px y se partía en dos líneas hasta los 374 px;
// «en español» lo dicen «¿Es para ti?», las preguntas y Condiciones §2. Dónde se opera va aparte, con SANTIAGO.
export const ESTADO_PILOTO = "Piloto en preparación · En línea";
// «Santiago de Chile» con espacios duros: nunca se parte al final de una línea.
export const SANTIAGO = "Santiago\u00a0de\u00a0Chile";

// Analítica (Umami) activa: solo si la compilación trae VITE_UMAMI_WEBSITE_ID en el entorno
// (no en un .env: postbuild.mjs solo lee process.env y el texto debe coincidir con el script).
export const ANALITICA_ACTIVA = Boolean(import.meta.env?.VITE_UMAMI_WEBSITE_ID); // «?.»: las pruebas importan este archivo fuera de Vite

// Texto oculto que lleva todo enlace que sale a la plataforma.
export const TEXTO_PLATAFORMA = "(se abre en la plataforma de Rumbo)";

// Rayas de inciso («programa —acciones…— y lo publica»): U+2060 (unión de palabras) pega
// cada raya a su palabra, para que ninguna quede sola al final o al comienzo de una línea.
// Se usa en todo texto con incisos, en datos y en componentes.
export const UNION = "\u2060";
export const rayas = (texto: string) =>
  texto.replace(/—(?=\S)/g, `—${UNION}`).replace(/(?<=\S)—/g, `${UNION}—`);

// Arma un texto condicional y falla si queda una llave {…} sin reemplazar:
// nunca se publica un marcador.
export function t(plantilla: string, datos: Record<string, string | number> = {}): string {
  const texto = plantilla.replace(/\{(\w+)\}/g, (llave, nombre: string) =>
    nombre in datos ? String(datos[nombre]) : llave,
  );
  if (/\{[^{}\n]{1,60}\}/.test(texto)) throw new Error(`Texto con llaves sin reemplazar: «${texto}»`);
  return texto;
}

// ---------------------------------------------------------------------------
// Categorías y estados

export type CategoriaId = "proyecto" | "orden" | "bienestar";
export const categorias: Record<CategoriaId, { nombre: string; color: string; texto: string; fondo: string }> = {
  proyecto: { nombre: "Proyecto", color: "#158b83", texto: "#11716a", fondo: "#e3efea" },
  orden: { nombre: "Organización", color: "#3973c5", texto: "#3265ad", fondo: "#e7ecf2" },
  bienestar: { nombre: "Bienestar", color: "#b77b16", texto: "#895c10", fondo: "#f6eddd" },
};
// Los hex se repiten en styles.css como tokens; la prueba de coherencia verifica que sean iguales.

export type VarianteEtiqueta = "activo" | "pronto" | "nota" | "categoria" | "ejemplo";
export const estados = {
  pilotoEnPreparacion: { texto: ESTADO_PILOTO, variante: "pronto" },
  masAdelante: { texto: "Más adelante", variante: "pronto" },
  listo: { texto: "Ya está en la plataforma", variante: "activo" },
  seAcuerda: { texto: "Se acuerda contigo", variante: "nota" },
  noDisponible: { texto: "Todavía no disponible", variante: "pronto" },
  enPreparacion: { texto: "En preparación", variante: "pronto" },
  ejemplo: { texto: "Ejemplo", variante: "ejemplo" },
  ejemploIlustrativo: { texto: "Ejemplo ilustrativo · nombres ficticios", variante: "ejemplo" },
} as const satisfies Record<string, { texto: string; variante: VarianteEtiqueta }>;
export type EstadoId = keyof typeof estados;

// ---------------------------------------------------------------------------
// Datos operativos que SOLO Diego puede aportar. null = no publicado; la web usa el texto alternativo.

export const operacion = {
  formularioPropio: PROPIO, // D8: postular, estado y contacto en la web propia (arriba, FORMULARIO_PROPIO)
  responsable: { nombre: "Diego Alfonso Muñoz Abeleida", comuna: "Providencia" } as null | { nombre: string; rut?: string; comuna: string }, // bloquea el lanzamiento público
  correo: null as string | null, // bloquea el lanzamiento público
  acompanante: null as null | { nombre: string; rol: string; bio: string; foto?: string }, // foto: archivo en public/, p. ej. «acompanante.jpg» (la portada le antepone la base)
  // Decisión del 2 de octubre de 2026: se responde a todas las solicitudes, también a quien no avanza.
  plazoPrimeraRespuesta: "2\u00a0días hábiles" as string | null, // bloquea el lanzamiento público
  respondemosTodas: true,
  // Sin uso en las preguntas ni en Condiciones: las revisiones tienen un texto fijo por plan
  // (TEXTO_REVISIONES). Privacidad los usa si algún día se cargan.
  canalRevisiones: null as string | null,
  canalRespuestas: null as string | null,
  plazoRespuestas: null as string | null,
  formaDePago: null as string | null, // formato: «Por transferencia, una vez aceptadas las condiciones»
  documentoTributario: null as string | null, // formato: «una boleta de honorarios»
  preciosConImpuestos: false, // true cuando el contador confirme que $64.000 y $100.000 son el total con impuestos
  topePrecio: true, // compromiso: en Chile, el precio final con impuestos no supera el publicado
  // (el lanzamiento público exige preciosConImpuestos o topePrecio)
  // Con mayúscula inicial. Condiciones §11 y la pregunta «¿Puedo pausar o retirarme?» la muestran
  // tras «Si ya empezaste un ciclo:» y la pasan a minúscula (trasDosPuntos en preguntas.ts).
  politicaTermino: null as string | null,
  conservacion: null as null | { tipo: string; plazo: string }[],
  // Desde dónde se puede participar (bloquea el lanzamiento público). encaje: ítem de «Es para ti si…»,
  // sin punto final. respuesta: pregunta «¿Puedo participar…?». condiciones: Condiciones §2, en tono de condición.
  cobertura: {
    encaje: "hablas español y puedes conectarte en línea, desde Chile o desde otro país",
    respuesta:
      "Sí, en línea y en español, desde la mayoría de los países. Para entrar a Mi espacio necesitas una cuenta de ChatGPT, que no está disponible en algunos países, como Venezuela o Cuba; en ese caso hoy no podemos acompañarte. Fuera de Chile se paga en dólares. Las videollamadas son en franjas fijas de hora de Chile y los plazos se cuentan en días hábiles de Chile.",
    condiciones:
      "Se participa en línea y en español, desde Chile o desde la mayoría de los países. Mi espacio requiere una cuenta de ChatGPT, que no está disponible en algunos países, como Venezuela o Cuba: desde ellos hoy no podemos acompañarte. Fuera de Chile el pago es en dólares. Las videollamadas se agendan en franjas fijas de hora de Chile, y todos los plazos se cuentan en días hábiles de Chile, de lunes a viernes, sin contar sus feriados.",
  } as null | { encaje: string; respuesta: string; condiciones: string },
  alojamientoVerificado: false, // true cuando Diego confirme qué infraestructura usa ChatGPT Sites (Privacidad §6)
  tamanoPrimerGrupo: 5 as number | null,
  preseleccionVerificada: false, // ?area= y ?apoyo= preseleccionan el formulario (probado)
  // Valores de ?area= que solo entiende el formulario propio (plataforma 2.4 y 3.10).
  paramEstudio: (PROPIO ? "estudio" : null) as string | null, // valor de ?area= para «Estudio y aprendizaje»
  paramCambios: (PROPIO ? "cambios" : null) as string | null, // valor de ?area= para «Cambios y relaciones»
};
export type Operacion = typeof operacion;

// Ayuda inmediata (5.5). Se completa el día del lanzamiento.
export const ayuda = {
  verificadoEl: null as string | null, // «15 de octubre de 2026»: día en que se revisaron los números en las fuentes oficiales
  incluir1455: false, // true solo si el 1455 se verificó en sernameg.gob.cl ese día
};

// Líneas de ayuda de Chile (Ayuda inmediata 5.5 y Condiciones §10). El *4141 va sin
// enlace: iOS no marca enlaces tel: con «*». El 1455 solo con ayuda.incluir1455.
export type RecursoAyuda = { numero: string; tel: string | null; nombre: string; descripcion: string };
export const recursosAyuda = (a = ayuda): RecursoAyuda[] => [
  {
    numero: "*4141",
    tel: null,
    nombre: "Línea de Prevención del Suicidio",
    descripcion:
      "Ministerio de Salud. Gratis, las 24 horas, todos los días. Márcala desde tu celular; te atiende una persona capacitada.",
  },
  {
    numero: "131",
    tel: "tel:131",
    nombre: "SAMU, emergencias médicas",
    descripcion: "Llama si tu vida o la de otra persona corre peligro. También puedes acudir a la urgencia más cercana.",
  },
  {
    numero: "600 360 7777",
    tel: "tel:6003607777",
    nombre: "Salud Responde",
    // No es gratuita: tiene el costo de una llamada local, desde teléfonos fijos y celulares.
    descripcion:
      "Ministerio de Salud. Orientación en salud, también en salud mental, las 24 horas. Desde teléfonos fijos y celulares, con costo de llamada local.",
  },
  {
    numero: "1412",
    tel: "tel:1412",
    nombre: "Fono Drogas y Alcohol",
    descripcion: "SENDA. Orientación confidencial y gratuita sobre el consumo de alcohol y otras drogas, las 24 horas.",
  },
  ...(a.incluir1455
    ? [
        {
          numero: "1455",
          tel: "tel:1455",
          nombre: "Fono Orientación en violencia contra las mujeres",
          descripcion: "SernamEG. Orientación gratuita.",
        },
      ]
    : []),
];

// ---------------------------------------------------------------------------
// Lo que no se incluye: una sola lista con textos únicos; cada contexto muestra su subconjunto, en este orden.

export type ContextoNoIncluye = "transparencia" | "planes" | "condiciones";
export const noIncluye: { id: string; texto: string; en: ContextoNoIncluye[] }[] = [
  { id: "especialistas", texto: "Consultas de psicología, nutrición, medicina, kinesiología o entrenamiento personal", en: ["transparencia", "planes", "condiciones"] },
  { id: "inmediata", texto: "Chat en vivo o respuesta inmediata", en: ["transparencia", "planes", "condiciones"] },
  { id: "urgencia", texto: "Atención de urgencia", en: ["planes", "condiciones"] },
  { id: "ia", texto: "Guía con inteligencia artificial (en preparación)", en: ["transparencia", "planes", "condiciones"] },
  { id: "recordatorios", texto: "Recordatorios automáticos por WhatsApp o correo", en: ["transparencia", "condiciones"] },
  { id: "reservas", texto: "Reservas o videollamadas dentro de la plataforma", en: ["transparencia", "condiciones"] },
  { id: "pagos", texto: "Pagos en línea", en: ["transparencia", "condiciones"] },
  { id: "premios", texto: "Premios, canjes o recompensas materiales", en: ["condiciones"] },
  { id: "garantia", texto: "Resultados garantizados", en: ["condiciones"] },
];
export const noIncluyeEn = (c: ContextoNoIncluye) => noIncluye.filter((i) => i.en.includes(c)).map((i) => i.texto);
// «Atención de urgencia» y «Resultados garantizados» no van en «Todavía no disponible»: nunca estarán disponibles.

// Quién puede participar (portada «¿Es para ti?» y Condiciones §2). El componente agrega «;» a cada ítem y «.» al último.
export const esParaTi = (op: Operacion = operacion) => [
  "tienes 18 años o más",
  ...(op.cobertura ? [op.cobertura.encaje] : []),
  "quieres avanzar en un proyecto, en tus estudios o en el orden de tu semana",
  "puedes reservar algo de tiempo cada semana y revisar tu avance con alguien",
  "prefieres recibir un programa hecho para ti y ajustarlo en el camino",
];
export const noEsParaTi = [
  "buscas un diagnóstico, una terapia o un tratamiento",
  "necesitas un plan de alimentación o de ejercicio por una condición de salud o una lesión",
  "quieres dejar el consumo de alcohol u otras drogas",
  "necesitas respuesta inmediata o acompañamiento permanente",
  "estás pasando por una crisis o piensas en hacerte daño",
];

// Lo que existe hoy y lo que se acuerda (portada, «Qué recibes»).
export const enMiEspacio = [
  "Tu programa calendarizado, con vistas de día, semana y mes",
  "Acciones con color por área, con horario o flexibles, duración e instrucciones",
  "Registro de lo que haces, progreso por meta, créditos y niveles",
  // «Registro semanal» es lo que escribe la persona; «revisión semanal», lo que hace su coach (docs/coherencia.md).
  "Registro semanal escrito: lo que anotas, la respuesta de tu coach y el siguiente foco",
  "Solicitud de ajustes cuando tu semana cambia",
  "Acciones con foto privada, en Acompañamiento cercano y si se acuerdan",
  "Comunidad opcional: foro moderado y ranking por alias",
];
export const seAcuerdaContigo = [
  "El día de tu revisión semanal, de lunes a viernes, y, en Acompañamiento cercano, la hora de tu videollamada (en hora de Chile)",
  "La duración del programa según tu meta: 4, 8 o 12 semanas. En el piloto empezamos con un ciclo de 4 semanas; continuar se acuerda al cerrarlo.",
  "La fecha de inicio y el medio de pago",
];

// ---------------------------------------------------------------------------
// Áreas: 3 caminos del piloto, «No lo tengo claro aún» y 4 «Más adelante».

export type Area = {
  id: string;
  nombre: string;
  frase: string; // voz (Fraunces itálica)
  texto: string;
  // null solo en «No lo tengo claro aún»: sin color de categoría.
  categoria: CategoriaId | null;
  icono: NombreIcono;
  // Valor de ?area= que entiende el formulario de la plataforma. null: la persona elige en el formulario.
  param: string | null;
  enPiloto: boolean;
  enlace: string; // texto visible del enlace
  ubicacion: string; // data-umami-event-ubicacion
  notaSeguridad?: string; // etiqueta --nota de las filas «Más adelante»
  opcionFormulario: string; // opción exacta del formulario de /postular (leída el 2 de octubre de 2026)
};

export const areas: Area[] = [
  {
    id: "proyectos",
    nombre: "Proyectos y emprendimiento",
    frase: "Aquí ganan las ideas que se ponen en marcha.",
    texto:
      "Para cuando tienes una idea o un proyecto que solo avanza si sobra tiempo. Lo bajamos a acciones concretas: definir la idea, validar una oferta, conversar con posibles clientes y registrar tus avances.",
    categoria: "proyecto",
    icono: "lightbulb",
    param: "emprendimiento",
    enPiloto: true,
    enlace: "Empezar con mi proyecto",
    ubicacion: "area-proyectos",
    opcionFormulario: "Emprendimiento o proyecto",
  },
  {
    id: "estudio",
    nombre: "Estudio y aprendizaje",
    frase: "Una prueba a la vez, con horario reservado.",
    texto:
      "Para cuando tienes evaluaciones o un curso y todo termina quedando para el último día. Ordenamos materias, fechas y bloques de estudio con horario reservado, y rutinas que puedas sostener.",
    categoria: "orden",
    icono: "book-open",
    param: operacion.paramEstudio,
    enPiloto: true,
    enlace: "Empezar con mis estudios",
    ubicacion: "area-estudio",
    opcionFormulario: "Estudio y aprendizaje",
  },
  {
    id: "organizacion",
    nombre: "Organización y hábitos",
    frase: "No tienes que hacerlo perfecto para seguir.",
    texto:
      "Para cuando tu semana se desordena y lo importante queda para después. Bloques de trabajo, rutinas cortas, menos postergación y un sistema que se ajusta cuando la semana cambia.",
    categoria: "orden",
    icono: "list-checks",
    param: "organizacion",
    enPiloto: true,
    enlace: "Empezar a ordenar mi semana",
    ubicacion: "area-organizacion",
    opcionFormulario: "Organización y hábitos",
  },
  {
    id: "abierta",
    nombre: "No lo tengo claro aún",
    frase: "También se puede empezar por ahí.",
    texto: "Cuéntanos lo que te inquieta y te ayudamos a definir por dónde comenzar.",
    categoria: null,
    icono: "compass",
    param: null,
    enPiloto: true,
    enlace: "Contarlo a mi manera",
    ubicacion: "area-abierta",
    opcionFormulario: "No lo tengo claro aún",
  },
  {
    id: "bienestar",
    nombre: "Bienestar y autoestima",
    frase: "Tu valor no se mide en una racha.",
    texto: "Pasos pequeños para volver a lo que te importa y notar lo que sí haces.",
    categoria: "bienestar",
    icono: "heart",
    param: "bienestar",
    enPiloto: false,
    enlace: "Dejar mi interés",
    ubicacion: "interes-bienestar",
    notaSeguridad: "No es terapia",
    opcionFormulario: "Bienestar cotidiano",
  },
  {
    id: "cambios",
    nombre: "Cambios y relaciones",
    frase: "Volver a empezar también cuenta.",
    texto: "Ordenar lo cotidiano después de una ruptura o de una etapa compleja.",
    categoria: "bienestar",
    icono: "refresh-cw",
    param: operacion.paramCambios,
    enPiloto: false,
    enlace: "Dejar mi interés",
    ubicacion: "interes-cambios",
    notaSeguridad: "No es terapia",
    opcionFormulario: "Cambios y relaciones",
  },
  {
    id: "alimentacion",
    nombre: "Alimentación",
    frase: "Una pauta sirve más cuando cabe en tu día.",
    texto:
      "Horarios, compras y preparación. Si tienes una pauta de tu nutricionista, la llevamos a tu semana tal como te la indicaron.",
    categoria: "proyecto",
    icono: "apple",
    param: "alimentacion",
    enPiloto: false,
    enlace: "Dejar mi interés",
    ubicacion: "interes-alimentacion",
    notaSeguridad: "Sin dietas ni metas de peso",
    opcionFormulario: "Alimentación cotidiana",
  },
  {
    id: "movimiento",
    nombre: "Movimiento",
    frase: "La constancia se construye con un ritmo posible.",
    texto: "Agendamos la actividad que elijas o que te indicó un profesional, con descanso incluido.",
    categoria: "proyecto",
    icono: "footprints",
    param: "movimiento",
    enPiloto: false,
    enlace: "Dejar mi interés",
    ubicacion: "interes-movimiento",
    notaSeguridad: "Sin rutinas de entrenamiento",
    opcionFormulario: "Movimiento",
  },
];
export const areasPiloto = areas.filter((a) => a.enPiloto);
export const areasMasAdelante = areas.filter((a) => !a.enPiloto);

// Microcopia bajo los enlaces mientras ?area= y ?apoyo= no estén probados (5.2).
// Con el formulario propio no hace falta (plataforma 7.3): ?area= y ?apoyo= están probados (8.2-F4).
export const microcopiaFormulario = (opcion: string, op: Operacion = operacion) =>
  op.formularioPropio || op.preseleccionVerificada ? null : `En el formulario, elige “${opcion}”.`;

// ---------------------------------------------------------------------------
// Planes: precios propuestos por ciclo de 4 semanas (propuesta del 2-10-2026; hipótesis por validar en el piloto).
// rotulo, param, cta, ubicacion y opcionFormulario deben coincidir con la plataforma (docs/coherencia.md).

export type Plan = {
  id: "acompanamiento" | "cercano";
  rotulo: string; // etiqueta --nota, igual que en la plataforma
  nombre: string;
  paraQuien: string;
  precio: string; // total del ciclo: es la cifra principal (Ley N.º 19.496, art. 30)
  periodo: string;
  porSemana: string; // equivalencia en letra chica, bajo la nota de precio; nunca como cifra principal
  param: "coach" | "cercano"; // ?apoyo=
  incluye: string[]; // solo lo propio de cada plan; lo común está en planesIncluyen
  cta: string;
  ubicacion: string;
  opcionFormulario: string;
};

export const planes: Plan[] = [
  {
    id: "acompanamiento",
    rotulo: "Seguimiento semanal",
    nombre: "Con acompañamiento",
    paraQuien: "Para quien prefiere avanzar con autonomía y por escrito: tu programa listo y una revisión escrita cada semana.",
    precio: "$64.000",
    periodo: "CLP / ciclo de 4 semanas",
    porSemana: "Equivale a $16.000 por semana",
    param: "coach",
    incluye: [
      "Conversación inicial de 30 minutos por videollamada",
      "Revisión escrita cada semana en Mi espacio, en el día que acordamos: qué funcionó, qué ajustamos y tu foco de la semana",
      "Si no alcanzaste a escribir tu registro, revisamos lo que marcaste en el calendario",
    ],
    cta: "Postular con acompañamiento",
    ubicacion: "plan-acompanamiento",
    opcionFormulario: "Con acompañamiento · revisión semanal",
  },
  {
    id: "cercano",
    rotulo: "Más espacio para ajustar",
    nombre: "Acompañamiento cercano",
    paraQuien: "Para quien prefiere conversarlo: tu programa listo y una videollamada cada semana para ajustarlo juntos.",
    precio: "$100.000",
    periodo: "CLP / ciclo de 4 semanas",
    porSemana: "Equivale a $25.000 por semana",
    param: "cercano",
    incluye: [
      "Conversación inicial de 45 minutos por videollamada",
      "Videollamada de 20 minutos cada semana, en un día y hora fijos en hora de Chile, con resumen escrito en Mi espacio",
      "Si tu semana se desarma, la reordenamos dentro de 1 día hábil (hasta 2 veces por ciclo)",
      "Hasta una acción semanal con foto privada, si se acuerda",
    ],
    cta: "Postular con acompañamiento cercano",
    ubicacion: "plan-cercano",
    opcionFormulario: "Acompañamiento cercano · más tiempo de revisión",
  },
];

// Lo que incluyen los dos planes (panel «Los dos planes» y Condiciones §4).
export const planesIncluyen = [
  "Programa calendarizado preparado para ti",
  "Mi espacio con calendario, instrucciones y progreso",
  "Créditos y niveles por las acciones que registras",
  "Solicitud de ajustes desde tu espacio",
];

// Cómo son las revisiones en cada plan (pregunta «¿Cómo son las revisiones semanales?» y
// Condiciones §5). Texto fijo: los dos planes no comparten canal ni plazo.
export const TEXTO_REVISIONES =
  "En Con acompañamiento, la revisión es escrita y se hace el día de la semana que acordamos, de lunes a viernes: qué funcionó, qué ajustamos y tu foco de la semana. Si no alcanzaste a escribir tu registro, revisamos lo que marcaste en el calendario. En Acompañamiento cercano, conversamos 20 minutos por videollamada, fuera de la plataforma, en un día y hora fijos en hora de Chile, y te dejamos un resumen escrito en Mi espacio. Si cambia el horario de verano en Chile o en tu país, te confirmamos la hora en tu zona. Contamos días hábiles de lunes a viernes, sin feriados de Chile. No hay chat ni respuesta inmediata.";

// Compromiso de precio (operacion.topePrecio). Rige en Chile: fuera de Chile se paga en dólares.
export const TEXTO_TOPE = "En Chile, el precio final, con impuestos incluidos, no será mayor que el publicado.";

// Nota bajo cada precio (5.2-5a).
export function notaPrecio(op: Operacion = operacion): string {
  if (op.preciosConImpuestos) return "Impuestos incluidos";
  if (op.topePrecio) return `Precio de referencia del piloto. ${TEXTO_TOPE}`;
  return "Precio de referencia del piloto";
}

// ---------------------------------------------------------------------------
// Créditos y niveles: idénticos a la plataforma original.

export const reglasCreditos = {
  porAccion: 1,
  bonoDiaCompleto: 2,
  diasRachaMedia: 3,
  bonoRacha3: 3, // 3 días programados completos seguidos: 1,5× el bono
  diasRachaLarga: 7,
  bonoRacha7: 4, // 7 días programados completos seguidos: 2× el bono
};

// Reglas en palabras (portada, «Progreso y comunidad»). Los números salen de reglasCreditos.
export const reglasCreditosTextos = (r = reglasCreditos) => [
  t("+{porAccion} crédito por cada acción y +{bonoDiaCompleto} extra cuando completas todas las acciones programadas del día.", r),
  t("Con {diasRachaMedia} días completos seguidos, ese bono sube a +{bonoRacha3}; con {diasRachaLarga}, a +{bonoRacha7}. Si la racha se corta, vuelve a +{bonoDiaCompleto}.", r),
  "Un día sin acciones programadas no corta la racha.",
  "Las acciones con foto son privadas y suman solo cuando quien te acompaña las aprueba.",
  "El foro y el ranking son opcionales y solo muestran tu alias. Las publicaciones se revisan antes de mostrarse, y puedes borrar lo tuyo o retirarte cuando quieras.",
];

export const niveles = [
  { nivel: 1, minimo: 0, nombre: "Inicio" },
  { nivel: 2, minimo: 10, nombre: "Impulso" },
  { nivel: 3, minimo: 25, nombre: "Ritmo" },
  { nivel: 4, minimo: 50, nombre: "Constancia" },
  { nivel: 5, minimo: 100, nombre: "Trayectoria" },
  { nivel: 6, minimo: 200, nombre: "Horizonte" },
  { nivel: 7, minimo: 350, nombre: "Exploración" },
  { nivel: 8, minimo: 550, nombre: "Progreso" },
  { nivel: 9, minimo: 800, nombre: "Comunidad" },
  { nivel: 10, minimo: 1100, nombre: "Legado" },
];

export function nivelPara(creditos: number) {
  let actual = niveles[0];
  for (const n of niveles) if (creditos >= n.minimo) actual = n;
  const siguiente = niveles.find((n) => n.nivel === actual.nivel + 1);
  return { actual, siguiente };
}

export function bonoDiario(rachaDiasCompletos: number) {
  if (rachaDiasCompletos >= reglasCreditos.diasRachaLarga) return reglasCreditos.bonoRacha7;
  if (rachaDiasCompletos >= reglasCreditos.diasRachaMedia) return reglasCreditos.bonoRacha3;
  return reglasCreditos.bonoDiaCompleto;
}

// ---------------------------------------------------------------------------
// Enlaces a la plataforma

export function postularHref(params: { area?: string | null; apoyo?: string | null } = {}) {
  const q = new URLSearchParams();
  if (params.area) q.set("area", params.area);
  if (params.apoyo) q.set("apoyo", params.apoyo);
  const s = q.toString();
  return s ? `${rutas.postular}?${s}` : rutas.postular;
}
