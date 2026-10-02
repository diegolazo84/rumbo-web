// Fuente única de los datos de negocio de la web: áreas, planes, precios, créditos,
// niveles, estados, listas de lo que no se incluye, quién puede participar y datos
// operativos. Ningún componente escribe a mano un dato de negocio ni una lista que
// aparezca en más de un lugar. Deben coincidir con la plataforma original
// (chatgpt.site): si cambian allí, se cambian aquí. Ver docs/coherencia.md.
import type { NombreIcono } from "../components/Icono";

export const PLATAFORMA = "https://rumbo-acompanamiento-diego.diegolazo84.chatgpt.site";

// Rutas que viven en la plataforma original. scripts/postbuild.mjs además genera
// reenvíos con las mismas rutas en este dominio, para enlaces escritos a mano.
export const rutas = {
  postular: `${PLATAFORMA}/postular`,
  contacto: `${PLATAFORMA}/contacto`,
  miEspacio: `${PLATAFORMA}/mi-programa`,
  comunidad: `${PLATAFORMA}/comunidad`,
  privacidadPlataforma: `${PLATAFORMA}/privacidad-piloto`,
} as const;

export const LEMA = "Ordena lo que importa. Avanza con apoyo.";
export const ESTADO_PILOTO = "Piloto en preparación · Santiago de Chile";

// Analítica (Umami) activa: solo si la compilación trae VITE_UMAMI_WEBSITE_ID en el entorno
// (no en un .env: postbuild.mjs solo lee process.env y el texto debe coincidir con el script).
export const ANALITICA_ACTIVA = Boolean(import.meta.env?.VITE_UMAMI_WEBSITE_ID); // «?.»: las pruebas importan este archivo fuera de Vite

// Texto oculto que lleva todo enlace que sale a la plataforma.
export const TEXTO_PLATAFORMA = "(se abre en la plataforma de Rumbo)";

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
  responsable: null as null | { nombre: string; rut?: string; comuna: string }, // bloquea el lanzamiento público
  correo: null as string | null, // bloquea el lanzamiento público
  acompanante: null as null | { nombre: string; rol: string; bio: string; foto?: string }, // foto: archivo en public/, p. ej. «acompanante.jpg» (la portada le antepone la base)
  plazoPrimeraRespuesta: null as string | null, // formato: «5 días hábiles»; bloquea el lanzamiento público
  respondemosTodas: false, // recomendado true para el lanzamiento: responder también a quien no avanza (8.3)
  canalRevisiones: null as string | null, // formato: «videollamada»
  canalRespuestas: null as string | null, // formato: «correo»
  plazoRespuestas: null as string | null, // formato: «un día hábil, de lunes a viernes»
  formaDePago: null as string | null, // formato: «Por transferencia, una vez aceptadas las condiciones»
  documentoTributario: null as string | null, // formato: «una boleta de honorarios»
  preciosConImpuestos: false, // true cuando $49.900 y $89.900 sean el total con impuestos
  topePrecio: false, // true si Diego se compromete a que el precio final con impuestos no supera el publicado
  // (el lanzamiento público exige preciosConImpuestos o topePrecio)
  politicaTermino: null as string | null,
  conservacion: null as null | { tipo: string; plazo: string }[],
  cobertura: null as null | { encaje: string; respuesta: string },
  // bloquea el lanzamiento público. encaje: ítem de «Es para ti si…», sin punto final, p. ej. «vives en Chile y puedes conversar en línea».
  // respuesta: respuesta de la pregunta 11, p. ej. «Sí, si vives en Chile: todo el acompañamiento es en línea. Por ahora no recibimos solicitudes desde fuera de Chile.»
  alojamientoVerificado: false, // true cuando Diego confirme qué infraestructura usa ChatGPT Sites (Privacidad §6)
  tamanoPrimerGrupo: null as number | null,
  preseleccionVerificada: false, // ?area= y ?apoyo= preseleccionan el formulario (probado)
  paramEstudio: null as string | null, // valor de ?area= para «Estudio y aprendizaje»
  paramCambios: null as string | null, // valor de ?area= para «Cambios y relaciones»
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
    descripcion: "Si tu vida o la de otra persona corre peligro. También puedes acudir a la urgencia más cercana.",
  },
  {
    numero: "600 360 7777",
    tel: "tel:6003607777",
    nombre: "Salud Responde",
    descripcion: "Ministerio de Salud. Orientación en salud, también en salud mental. Gratis, las 24 horas.",
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
  "Revisión semanal escrita: tu registro, la respuesta de tu coach y el siguiente foco",
  "Solicitud de ajustes cuando tu semana cambia",
  "Acciones con foto privada, en Acompañamiento cercano y si se acuerdan",
  "Comunidad opcional: foro moderado y ranking por alias",
];
export const seAcuerdaContigo = [
  "El canal y el plazo de las respuestas breves",
  "El día y la hora de tus revisiones semanales",
  "La duración del programa según tu meta: 4, 8 o 12 semanas. En el piloto empezamos con un ciclo de 4 semanas; continuar se acuerda al cerrarlo.",
  "El precio final y la forma de pago",
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
export const microcopiaFormulario = (opcion: string, op: Operacion = operacion) =>
  op.preseleccionVerificada ? null : `En el formulario, elige “${opcion}”.`;

// ---------------------------------------------------------------------------
// Planes: precios de referencia del piloto (hipótesis por validar, no tarifas cerradas).

export type Plan = {
  id: "acompanamiento" | "cercano";
  rotulo: string; // etiqueta --nota, igual que en la plataforma
  nombre: string;
  paraQuien: string;
  precio: string;
  periodo: string;
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
    paraQuien: "Para quien quiere un programa preparado y una revisión breve cada semana.",
    precio: "$49.900",
    periodo: "CLP / ciclo de 4 semanas",
    param: "coach",
    incluye: [
      "Conversación inicial de 30 minutos",
      "4 revisiones semanales de 10 minutos",
      "Hasta 2 respuestas breves en el ciclo, con canal y plazo acordados antes de empezar",
    ],
    cta: "Postular con acompañamiento",
    ubicacion: "plan-acompanamiento",
    opcionFormulario: "Con acompañamiento · revisión semanal",
  },
  {
    id: "cercano",
    rotulo: "Más espacio para ajustar",
    nombre: "Acompañamiento cercano",
    paraQuien: "Para quien necesita más tiempo de conversación y seguimiento.",
    precio: "$89.900",
    periodo: "CLP / ciclo de 4 semanas",
    param: "cercano",
    incluye: [
      "Conversación inicial de 45 minutos",
      "4 revisiones semanales de 20 minutos",
      "Hasta 4 respuestas breves en el ciclo, con canal y plazo acordados antes de empezar",
      "Hasta una acción semanal con foto privada, si se acuerda",
    ],
    cta: "Postular con acompañamiento cercano",
    ubicacion: "plan-cercano",
    opcionFormulario: "Acompañamiento cercano · más tiempo de revisión",
  },
];

// Lo que incluyen los dos planes (panel «Los dos planes» y Condiciones §4).
export const planesIncluyen = [
  "Programa calendarizado preparado por el equipo",
  "Mi espacio con calendario, instrucciones y progreso",
  "Créditos y niveles por las acciones que registras",
  "Solicitud de ajustes desde tu espacio",
];

// Nota bajo cada precio (5.2-5a).
export function notaPrecio(op: Operacion = operacion): string {
  if (op.preciosConImpuestos) return "Impuestos incluidos";
  if (op.topePrecio)
    return "Precio de referencia del piloto. El precio final, con impuestos incluidos, no será mayor que el publicado.";
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
  "Las acciones con foto son privadas y suman solo cuando el equipo las aprueba.",
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
