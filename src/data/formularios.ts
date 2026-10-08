// Fuente única de los formularios de la plataforma (especificación de la plataforma 3.1):
// campos, etiquetas, ayudas, opciones, límites, textos de error, estados del envío y mapas
// de parámetros. Los componentes de src/components/form/ y las pantallas no escriben estos
// textos a mano; las pruebas de interfaz comparan contra este archivo y los CHECK de la base
// (6.4) usan los mismos límites (8.2-D3).
//
// Regla de marcadores: ningún texto publicado lleva llaves. Los textos con datos son
// funciones que reciben el dato ya escrito.
import { areas, areasMasAdelante, operacion, planes, recursosAyuda, type Area } from "./rumbo";
import { miles } from "../lib/fechas";

// ---------------------------------------------------------------------------
// Límites (caracteres tras recortar espacios, salvo que se diga otra cosa)

export const LIMITES = {
  // «Cuéntanos tu meta» (3.5–3.7)
  meta: { min: 20, max: 1500 },
  enlacesMeta: 3, // más de 3 enlaces → error en el cliente y posible_spam en la base (3.11)
  nombre: { min: 2, max: 60 },
  correo: { max: 254 },
  notaHorarios: { max: 200 },
  // Contacto (3.15)
  mensajeContacto: { min: 10, max: 2000 },
  // Ingreso (4.2.2)
  codigo: { largo: 6 },
  // Mi espacio
  registroSemanal: { max: 1000 }, // cada uno de los tres textos (4.11)
  detalleAjuste: { min: 10, max: 800 }, // 4.13
  explicacionFoto: { min: 10, max: 280 }, // «No puedo subir una foto» (4.9)
  nombrePreferido: { min: 2, max: 60 }, // 4.14
  detalleDerecho: { max: 600 }, // «Otro pedido sobre mis datos» (4.14)
  fotoMb: 4, // 4.9
  fotoLadoMaximo: 1600, // px, 4.9
  diasRegistroTardio: 7, // ventana de «De días anteriores» (4.6; lo decide Diego, propuesto 7)
  // Panel (5.4–5.7)
  notaCierre: { max: 600 },
  notasInternas: { max: 4000 },
  tituloMeta: { max: 80 },
  paraQue: { max: 200 },
  hito: { max: 80 },
  hitosPorMeta: 5,
  tituloAccion: { min: 2, max: 60 },
  duracionAccion: { min: 5, max: 240 }, // minutos
  instrucciones: { min: 1, max: 800 },
  versionCorta: { max: 200 },
  semanasRutina: { min: 1, max: 4 },
  revisionFunciono: { max: 800 },
  revisionAjustamos: { max: 800 },
  revisionFoco: { max: 200 },
  notaRechazoFoto: { min: 1, max: 600 },
} as const;

// ---------------------------------------------------------------------------
// Textos comunes de los componentes (3.1)

export const TEXTOS_FORM = {
  avisoObligatorios: "Todos los campos son obligatorios, salvo los que dicen “opcional”.",
  opcional: "(opcional)",
  prefijoError: "Error:",
  noEsChat: "No es un chat: no hay respuesta inmediata.",
  ayudaInmediata: "Ayuda inmediata",
  politicaPrivacidad: "Política de privacidad",
  trampa: { nombre: "campo_extra_7", etiqueta: "Deja este campo vacío" },
} as const;

// «Revisa 1 campo antes de enviar» / «Revisa 3 campos antes de enviar»
export const tituloResumenErrores = (n: number) => `Revisa ${n} campo${n === 1 ? "" : "s"} antes de enviar`;

// «12 de 1.500» · «12 de 1.500 · faltan 8 para el mínimo». El mínimo se cuenta sin los
// espacios del borde (recortado); el máximo, con todo (es el maxlength del textarea).
export function textoContador(n: number, max: number, min = 0, recortado = n): string {
  const base = `${miles(n)} de ${miles(max)}`;
  return recortado < min ? `${base} · faltan ${miles(min - recortado)} para el mínimo` : base;
}

// Aviso bajo todo texto libre (.aviso-ayuda, 3.1). Los números salen de recursosAyuda().
const [linea4141, linea131] = recursosAyuda();
export const AVISO_AYUDA = {
  antes: "Rumbo no atiende urgencias. Si piensas en hacerte daño, llama gratis al ",
  numero4141: linea4141.numero,
  medio: " desde tu celular; en una emergencia, al ",
  numero131: linea131.numero,
  tel131: linea131.tel,
  despues: ". Más líneas en ",
  enlace: "Ayuda inmediata",
  // Variante del registro semanal (4.11).
  revision: "Si estás pasando por un momento muy difícil, no esperes la revisión: ",
} as const;

// ---------------------------------------------------------------------------
// Validación compartida

const RE_ENLACE = /(https?:\/\/|www\.)\S+/gi;
export const contarEnlaces = (texto: string) => (texto.match(RE_ENLACE) ?? []).length;
const esSoloEnlace = (texto: string) => /^(https?:\/\/|www\.)\S+$/i.test(texto.trim());
const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const tieneEnlaceOArroba = (texto: string) => texto.includes("@") || contarEnlaces(texto) > 0;

// Sugerencias de tipeo del correo (3.7). No bloquean el envío.
const DOMINIOS_CORREGIDOS: [RegExp, string][] = [
  [/@gmial\./, "@gmail."],
  [/@gmal\./, "@gmail."],
  [/@hotmial\./, "@hotmail."],
  [/@outlok\./, "@outlook."],
  [/@yahoo\.cl$/, "@yahoo.com"],
  [/\.con$/, ".com"],
  [/\.cl\.cl$/, ".cl"],
];
export function sugerirCorreo(correo: string): string | null {
  const limpio = correo.trim().toLowerCase();
  if (!RE_CORREO.test(limpio)) return null;
  let sugerido = limpio;
  for (const [re, reemplazo] of DOMINIOS_CORREGIDOS) sugerido = sugerido.replace(re, reemplazo);
  return sugerido === limpio ? null : sugerido;
}

// ---------------------------------------------------------------------------
// Campos de correo y nombre (iguales en postular, interés y contacto)

export const CORREO = {
  etiqueta: "Tu correo",
  ayuda: "Te responderemos aquí. No lo publicamos ni lo usamos para publicidad.",
  ayudaInteres: "Solo para avisarte si esta área abre.",
  atributos: { type: "email", autoComplete: "email", inputMode: "email", autoCapitalize: "off", maxLength: LIMITES.correo.max },
  errores: {
    vacio: "Escribe tu correo: ahí te vamos a responder.",
    formato: "Revisa tu correo: debe tener la forma nombre@ejemplo.cl.",
  },
  sugerencia: (sugerido: string) => `¿Quisiste escribir ${sugerido}?`,
  usarSugerencia: (sugerido: string) => `Usar ${sugerido}`,
} as const;

// Días del formulario ↔ códigos que acepta la base (solicitudes.dias).
export const CODIGO_DIA: Record<string, string> = { Lunes: "lun", Martes: "mar", "Miércoles": "mie", Jueves: "jue", Viernes: "vie" };
export const NOMBRE_DIA: Record<string, string> = Object.fromEntries(Object.entries(CODIGO_DIA).map(([n, c]) => [c, n]));

export function validarCorreo(valor: string): string | null {
  const v = valor.trim();
  if (!v) return CORREO.errores.vacio;
  if (!RE_CORREO.test(v) || v.length > LIMITES.correo.max) return CORREO.errores.formato;
  return null;
}

export const NOMBRE = {
  etiqueta: "¿Cómo te llamas?",
  ayuda: "Basta con tu nombre o como prefieras que te llamemos.",
  atributos: { autoComplete: "given-name", autoCapitalize: "words", spellCheck: false, maxLength: LIMITES.nombre.max },
  errores: {
    vacio: "Escribe tu nombre o cómo quieres que te llamemos.",
    invalido: "Escribe solo tu nombre, sin correos ni enlaces.",
  },
} as const;

export function validarNombre(valor: string): string | null {
  const v = valor.trim();
  if (v.length < LIMITES.nombre.min) return NOMBRE.errores.vacio;
  if (tieneEnlaceOArroba(v)) return NOMBRE.errores.invalido;
  return null;
}

// ---------------------------------------------------------------------------
// «Cuéntanos tu meta» (/postular/, 3.3–3.12)

export type ModoPostular = "solicitud" | "interes" | "cerradas";

export const POSTULAR = {
  encabezado: {
    ojo: "Postular al piloto",
    // H1 «Cuéntanos tu *meta.*»: la cursiva terracota va en «meta.».
    titulo: { antes: "Cuéntanos tu ", cursiva: "meta." },
    bajada: operacion.plazoPrimeraRespuesta
      ? `Una persona lee cada solicitud y te responde dentro de ${operacion.plazoPrimeraRespuesta}${operacion.respondemosTodas ? ", también si en esta etapa no podemos acompañarte" : ""}. Te toma unos 5 minutos.`
      : "Una persona lee cada solicitud y te escribe. Te toma unos 5 minutos.",
    tranquilidades: ["Gratis y sin compromiso", "No necesitas tenerlo claro", "Nada se cobra sin tu acuerdo"],
    ausencia: (texto: string, hasta: string, fecha: string) =>
      `${texto}. Las solicitudes que lleguen hasta el ${hasta} las respondemos a más tardar el ${fecha}.`,
  },
  interes: {
    ojo: "Más adelante",
    titulo: (area: string) => `Deja tu interés en ${area}.`,
    bajada:
      "Esta área todavía no está abierta en el piloto. Déjanos tu correo y te avisamos si abre. No es una solicitud para participar y no te compromete.",
    volver: "¿Tu meta es de proyectos, estudio u organización? Cuéntanos tu meta",
    cambiarArea: "Cambiar área",
    boton: "Dejar mi interés",
    frase: "No es una solicitud para participar. Solo te escribiremos si esta área abre.",
  },
  cerradas: {
    ojo: "Postular al piloto",
    titulo: "Por ahora no estamos recibiendo solicitudes.",
    tope: "Hoy recibimos más solicitudes de las que podemos responder en 2 días hábiles. Vuelve a intentarlo mañana, o déjanos tu correo y te avisamos cuando volvamos a recibir.",
    porDiego:
      "En este momento el piloto no está recibiendo solicitudes nuevas. Déjanos tu correo y te avisamos cuando volvamos a recibir.",
    avisarme: "Avisarme cuando vuelvan a recibir",
    areaReapertura: { valor: "reapertura", nombre: "Aviso de reapertura" },
    // PROPUESTO (los decide Diego): textos propios del aviso de reapertura. Los del modo interés
    // hablan de «el área que elegí» y «si esta área abre», y aquí no hay área.
    correoAyuda: "Solo para avisarte cuando volvamos a recibir solicitudes.",
    autorizacion: {
      antes: "Autorizo a Rumbo a guardar mi nombre y mi correo para avisarme cuando vuelvan a recibir solicitudes. Leí la ",
      enlace: "Política de privacidad",
      despues: ".",
      error: "Necesitamos tu autorización para avisarte. Sin ella no podemos guardar tu correo.",
    },
    frase: "No es una solicitud para participar. Solo te escribiremos cuando volvamos a recibir solicitudes.",
  },
  bloques: [
    { numero: 1, titulo: "Tu meta", bajada: "Lo que quieres lograr, con tus palabras." },
    { numero: 2, titulo: "Cómo te acompañamos", bajada: "Puedes cambiarlo después: lo conversamos antes de acordar nada." },
    { numero: 3, titulo: "Tus datos", bajada: "Solo para responderte." },
  ],
  area: {
    leyenda: "¿En qué área está tu meta?",
    ayuda: "Elige la que más se acerque. Si no lo tienes claro, también es una respuesta.",
    // Línea adicional de «Organización y hábitos».
    lineaOrganizacion: "Incluye cambiar un hábito cotidiano. No incluye dejar el consumo de alcohol u otras drogas.",
    otraArea: "¿Tu meta es de otra área?",
    otraAreaTexto:
      "Estas áreas todavía no están abiertas. Si eliges una, el formulario cambia a un aviso de interés: te avisamos si abre.",
    cambioAInteres: (area: string) => `Cambiaste a dejar tu interés en ${area}. Esta área todavía no está abierta.`,
    error: "Elige un área. Si no lo tienes claro, elige “No lo tengo claro aún”.",
  },
  meta: {
    etiqueta: "¿Qué te gustaría conseguir?",
    ayuda:
      "Cuéntalo como te salga: qué quieres lograr y qué te ha costado. No incluyas diagnósticos ni información de salud tuya o de otras personas.",
    // Ejemplo según el área, en la ayuda (nunca como placeholder), con la etiqueta «Ejemplo».
    ejemplos: {
      proyectos: "Tengo una idea de negocio hace un año y solo avanzo cuando me sobra tiempo.",
      estudio: "Tengo exámenes en diciembre y siempre termino estudiando el último día.",
      organizacion: "Mi semana se desordena y lo importante queda para el viernes.",
      abierta: "Siento que tengo muchas cosas pendientes y no sé por cuál empezar.",
    } as Record<string, string>,
    errores: {
      vacio: "Cuéntanos tu meta. No necesitas tenerla clara: un par de frases basta.",
      corto: "Cuéntanos un poco más: con un par de frases basta (mínimo 20 caracteres).",
      enlaces: "Quita los enlaces y cuéntalo con tus palabras.",
    },
  },
  apoyo: {
    leyenda: "¿Qué tipo de apoyo prefieres?",
    fueraDeChile: "Fuera de Chile se paga en dólares.",
    verPlanes: "Ver qué incluye cada plan",
    elegisteDesdePlanes: (plan: string) => `Elegiste desde Planes: ${plan}.`,
    error: "Elige un tipo de apoyo. Si aún no lo sabes, elige “Todavía no lo sé”.",
  },
  horarios: {
    leyenda: "¿Cuándo te acomoda conversar? (opcional)",
    ayuda: "Nos sirve para proponerte horarios. Las conversaciones son de lunes a viernes, en hora de Chile.",
    dias: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
    // Las confirma Diego (operacion.franjas cuando exista, 2.4).
    franjas: [
      { valor: "manana", texto: "Mañana (09:00–12:00)" },
      { valor: "mediodia", texto: "Mediodía (12:00–15:00)" },
      { valor: "tarde", texto: "Tarde (15:00–19:00)" },
      { valor: "noche", texto: "Noche (19:00–21:00)" },
    ],
    zonaChile: "Detectamos que estás en hora de Chile.",
    zonaOtra: (zona: string) => `Detectamos tu zona horaria: ${zona}. Te confirmaremos cada horario en tu hora local.`,
    nota: { etiqueta: "¿Algo más sobre tus horarios? (opcional)", max: LIMITES.notaHorarios.max },
  },
  mayorEdad: {
    etiqueta: "Tengo 18 años o más.",
    error: "Rumbo es solo para personas de 18 años o más. Marca esta casilla para confirmar que los tienes.",
  },
  // La autorización nunca va marcada ni se restaura del borrador.
  autorizacion: {
    antes: "Autorizo a Rumbo a usar estos datos para revisar mi solicitud y escribirme sobre el piloto. Leí la ",
    enlace: "Política de privacidad",
    despues: ".",
    ayuda: "Puedes retirar tu autorización cuando quieras con tu enlace privado; borramos tu solicitud.",
    error: "Necesitamos tu autorización para guardar y revisar tu solicitud. Sin ella no podemos recibirla.",
  },
  autorizacionInteres: {
    antes: "Autorizo a Rumbo a guardar mi nombre, mi correo y el área que elegí para avisarme si se abre. Leí la ",
    enlace: "Política de privacidad",
    despues: ".",
    error: "Necesitamos tu autorización para avisarte. Sin ella no podemos guardar tu interés.",
  },
  avisos: {
    etiqueta: "Quiero que me avisen por correo si se abre una nueva etapa del piloto o un área nueva.",
  },
  borrador: {
    recuperado: "Recuperamos lo que habías escrito en esta pestaña.",
    empezarDeCero: "Empezar de cero",
  },
  envio: {
    boton: "Enviar mi solicitud",
    frase: "Postular es gratis y no es una compra, una reserva ni una venta. Nada empieza ni se cobra sin tu acuerdo.",
    conPlazo: (fecha: string) => `Te responderemos a más tardar el ${fecha}.`,
  },
} as const;

// Opciones de área (tarjetas): las 3 del piloto + «No lo tengo claro aún»; aparte, las «Más adelante».
export type OpcionArea = { valor: string; area: Area; lineaExtra?: string };
export const opcionesArea: OpcionArea[] = areas
  .filter((a) => a.enPiloto)
  .map((a) => ({ valor: a.id, area: a, lineaExtra: a.id === "organizacion" ? POSTULAR.area.lineaOrganizacion : undefined }));
export const opcionesAreaMasAdelante: OpcionArea[] = areasMasAdelante.map((a) => ({ valor: a.id, area: a }));

// Tipo de apoyo (3.6): generado desde `planes`. «Todavía no lo sé» reemplaza a «Solo orientación».
export type OpcionApoyo = { valor: "coach" | "cercano" | "nose"; titulo: string; etiqueta?: string; linea: string; precio?: string };
export const opcionesApoyo: OpcionApoyo[] = [
  ...planes.map((p) => ({
    valor: p.param,
    titulo: p.nombre,
    etiqueta: p.rotulo,
    linea: p.paraQuien,
    precio: `${p.precio} por ciclo de 4 semanas`,
  })),
  { valor: "nose", titulo: "Todavía no lo sé", linea: "Te ayudamos a elegir cuando te escribamos." },
];

// Preselección por URL (3.10): solo valores de una lista cerrada; lo demás se ignora en silencio.
export const AREA_POR_PARAM: Record<string, string> = {
  emprendimiento: "proyectos",
  proyectos: "proyectos",
  estudio: "estudio",
  organizacion: "organizacion",
  habitos: "organizacion",
  abierta: "abierta",
  bienestar: "bienestar",
  autoestima: "bienestar",
  cambios: "cambios",
  relaciones: "cambios",
  alimentacion: "alimentacion",
  movimiento: "movimiento",
};
export const APOYO_POR_PARAM: Record<string, OpcionApoyo["valor"]> = { coach: "coach", cercano: "cercano", nose: "nose" };
export const esAreaMasAdelante = (id: string) => areasMasAdelante.some((a) => a.id === id);

export function validarMeta(valor: string): string | null {
  const v = valor.trim();
  if (!v) return POSTULAR.meta.errores.vacio;
  if (esSoloEnlace(v) || contarEnlaces(v) > LIMITES.enlacesMeta) return POSTULAR.meta.errores.enlaces;
  if (v.length < LIMITES.meta.min) return POSTULAR.meta.errores.corto;
  return null;
}

export type DatosPostular = {
  area: string;
  meta: string;
  apoyo: string;
  nombre: string;
  correo: string;
  mayorEdad: boolean;
  autorizacion: boolean;
};
// Orden del DOM: el resumen de errores enlaza los campos en este orden.
export function validarPostular(d: DatosPostular, modo: ModoPostular = "solicitud"): Partial<Record<keyof DatosPostular, string>> {
  const e: Partial<Record<keyof DatosPostular, string>> = {};
  if (modo === "solicitud") {
    if (!d.area) e.area = POSTULAR.area.error;
    const meta = validarMeta(d.meta);
    if (meta) e.meta = meta;
    if (!d.apoyo) e.apoyo = POSTULAR.apoyo.error;
  }
  const nombre = validarNombre(d.nombre);
  if (nombre) e.nombre = nombre;
  const correo = validarCorreo(d.correo);
  if (correo) e.correo = correo;
  if (!d.mayorEdad) e.mayorEdad = POSTULAR.mayorEdad.error;
  if (!d.autorizacion)
    e.autorizacion =
      modo === "solicitud"
        ? POSTULAR.autorizacion.error
        : modo === "cerradas"
          ? POSTULAR.cerradas.autorizacion.error
          : POSTULAR.autorizacionInteres.error;
  return e;
}

// ---------------------------------------------------------------------------
// Estados del envío (3.12), para «solicitud» y «mensaje» (contacto)

export function estadosEnvio(cosa: "solicitud" | "mensaje", boton: string, correo = operacion.correo) {
  return {
    enviando: `Enviando tu ${cosa}…`,
    anuncioEnviando: `Enviando tu ${cosa}`,
    red: `No pudimos enviar tu ${cosa}. Revisa tu conexión a internet e inténtalo de nuevo. Lo que escribiste sigue aquí.`,
    sinConexion: `Parece que no tienes conexión. Cuando vuelva, toca “${boton}” otra vez. Lo que escribiste sigue aquí.`,
    segundoFallo: correo
      ? `Si sigue fallando, escríbenos a ${correo}.`
      : "Si sigue fallando, inténtalo en unos minutos: tu borrador queda guardado en esta pestaña.",
    servidor: "La plataforma no está respondiendo en este momento. Lo que escribiste sigue aquí. Inténtalo de nuevo en unos minutos.",
    limite: "Recibimos varias solicitudes desde esta conexión en poco tiempo. Espera unos minutos y vuelve a intentarlo.",
    reintentar: "Intentar de nuevo",
    noscript: "Para enviar este formulario necesitas activar JavaScript.",
    noscriptCorreo: correo ? `Si no puedes, escríbenos a ${correo}.` : null,
  };
}

// ---------------------------------------------------------------------------
// Contacto (/contacto/, 3.15)

export const CONTACTO = {
  encabezado: {
    ojo: "Contacto",
    titulo: "Escríbenos.",
    bajada: "Respondemos por correo en días hábiles, de lunes a viernes. No hay chat ni atención inmediata.",
    conPlazo: (plazo: string) => `Te responderemos dentro de ${plazo}.`,
    correoDirecto: (correo: string) => `También puedes escribirnos directo a ${correo}.`,
  },
  // Aviso phone antes del formulario (números de recursosAyuda()).
  urgencia: {
    antes: "Si es una urgencia, no escribas aquí. Si piensas en hacerte daño, llama gratis al ",
    numero4141: linea4141.numero,
    medio: "; en una emergencia, al ",
    numero131: linea131.numero,
    despues: ". Más líneas en Ayuda inmediata.",
  },
  motivo: {
    leyenda: "¿Sobre qué nos escribes?",
    opciones: [
      { valor: "duda", texto: "Tengo una duda antes de postular" },
      { valor: "solicitud", texto: "Sobre mi solicitud" },
      { valor: "datos", texto: "Mis datos personales (ver, corregir, borrar u otro derecho)" },
      { valor: "problema", texto: "Encontré un problema en la web" },
      { valor: "otro", texto: "Otro tema" },
    ],
    ayudaDatos:
      "Es gratis. Cuéntanos qué quieres hacer con tus datos. Puede que te pidamos confirmar que eres tú respondiendo desde el correo con que postulaste. Respondemos dentro del plazo que fija la ley.",
    error: "Elige el motivo de tu mensaje.",
  },
  nombre: { etiqueta: "¿Cómo te llamas? (opcional)", max: LIMITES.nombre.max },
  correo: { etiqueta: "Tu correo (el de tu solicitud, si ya postulaste)", ayuda: "Te responderemos aquí." },
  mensaje: {
    etiqueta: "Tu mensaje",
    ayuda: "No incluyas diagnósticos, información de salud ni datos de otras personas.",
    errores: { vacio: "Escribe tu mensaje.", corto: "Cuéntanos un poco más (mínimo 10 caracteres)." },
  },
  informacion: { antes: "Usamos tu correo y tu mensaje solo para responderte. Más en ", enlace: "Política de privacidad", despues: "." },
  boton: "Enviar mensaje",
  confirmacion: {
    titulo: "Recibimos tu mensaje.",
    texto: (correo: string) => `Te responderemos a ${correo} en días hábiles.`,
    conPlazo: (correo: string, fecha: string) => `Te responderemos a ${correo} a más tardar el ${fecha}.`,
    datos: "Responderemos tu solicitud sobre tus datos dentro del plazo que fija la ley.",
    volver: "Volver al inicio",
    otro: "Escribir otro mensaje",
  },
} as const;
export const MOTIVOS_CONTACTO = CONTACTO.motivo.opciones.map((o) => o.valor);

export type DatosContacto = { motivo: string; nombre: string; correo: string; mensaje: string };
export function validarContacto(d: DatosContacto): Partial<Record<keyof DatosContacto, string>> {
  const e: Partial<Record<keyof DatosContacto, string>> = {};
  if (!d.motivo) e.motivo = CONTACTO.motivo.error;
  const correo = validarCorreo(d.correo);
  if (correo) e.correo = correo;
  const m = d.mensaje.trim();
  if (!m) e.mensaje = CONTACTO.mensaje.errores.vacio;
  else if (m.length < LIMITES.mensajeContacto.min) e.mensaje = CONTACTO.mensaje.errores.corto;
  return e;
}

// «Tu coach» en rótulos cortos; con operacion.acompanante, su nombre de pila (glosario 1.4).
// Una sola función para toda la plataforma: «Nota de {nombreCoach}» (3.14) y el panel.
export const nombreCoach = (op = operacion) => op.acompanante?.nombre.split(" ")[0] ?? "tu coach";

// ---------------------------------------------------------------------------
// Estado de la solicitud: aceptar el acuerdo y retirar (3.14)

export const ACEPTAR_ACUERDO = {
  casilla: "Leí y acepto las Condiciones del piloto y este acuerdo.",
  error: "Para aceptar, marca la casilla.",
  boton: "Acepto el acuerdo",
  nota: "Nada se cobra antes de que aceptes. Si algo no calza, escríbenos antes de aceptar.",
  sinDetalles: "Te escribiremos para cerrar los últimos detalles antes de que aceptes.",
} as const;

export const RETIRAR = {
  // Terciario en --error (3.14): la especificación lo nombra «Retirar».
  boton: "Retirar",
  botonInteres: "Dejar de recibir este aviso",
  titulo: "¿Retirar tu solicitud?",
  texto: "Borraremos ahora lo que nos contaste y tus datos de contacto. No se puede deshacer. Si cambias de opinión, puedes volver a postular.",
  mantener: "No, mantenerla",
  confirmar: "Sí, retirar mi solicitud",
  conEspacio: "Para dejar el programa o borrar tus datos, usa Mis datos en Mi espacio o escríbenos.",
  escribenos: "Escríbenos sobre esta solicitud",
} as const;

// ---------------------------------------------------------------------------
// /mi-espacio/ mientras no haya cuentas: qué es Mi espacio y cómo se entra. Sin datos de nadie.

export const MI_ESPACIO = {
  ojo: "Mi espacio",
  titulo: "Mi espacio se abre cuando tu programa esté publicado.",
  texto:
    "Es donde vas a ver tu programa: tu calendario de acciones y cómo vas avanzando entre una revisión y otra. Lo abrimos cuando acordamos contigo tu programa y lo publicamos.",
  comoEntrar: {
    titulo: "Cómo vas a entrar",
    items: [
      "Te daremos acceso por correo, a la dirección que nos diste al postular.",
      "Si ya postulaste, tu enlace privado de seguimiento muestra el estado de tu solicitud. Es el que apareció al enviarla.",
      "Si aún no postulas, el primer paso es contarnos tu meta. Postular es gratis y no te compromete.",
    ],
  },
  primario: "Cuéntanos tu meta",
  secundario: "Mira cómo será Mi espacio",
  notaEjemplo:
    "Es una vista de ejemplo: la persona, sus metas y sus fechas son inventadas para mostrar cómo se ve. No es una cuenta real.",
} as const;

// ---------------------------------------------------------------------------
// Ingreso a Mi espacio (4.2)

export const ENTRAR = {
  ojo: "Mi espacio",
  titulo: "Entra a tu espacio.",
  bajada: "Escribe el correo con el que acordamos tu programa. Te enviaremos un código para entrar, sin contraseña.",
  correo: { etiqueta: "Tu correo", atributos: { type: "email", autoComplete: "email", inputMode: "email" } },
  compartido: { etiqueta: "Estoy en un computador compartido", ayuda: "Tu sesión se cierra al cerrar el navegador." },
  boton: "Enviarme el código",
  enviando: "Enviando…",
  nota: { antes: "Mi espacio es para personas que ya acordaron un programa con Rumbo. Si todavía no postulas, ", enlace: "Cuéntanos tu meta", despues: "." },
  nota2: "¿Ya enviaste tu solicitud? Revisa su estado con el enlace privado que viste al enviarla.",
  avisoLock: "Solo usamos tu correo para que entres. No enviamos publicidad ni recordatorios.",
  errores: {
    formato: "Revisa tu correo: parece incompleto (falta la @ o lo que va después).",
    limite: "Pediste varios códigos seguidos. Espera unos minutos antes de pedir otro.",
    red: "No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.",
  },
} as const;

export const REVISA_CORREO = {
  titulo: "Revisa tu correo.",
  texto: (correo: string) =>
    `Si ${correo} tiene un espacio en Rumbo, te enviamos un código de 6 dígitos. Llega en unos minutos y sirve una sola vez durante 1 hora.`,
  cambiar: "¿No es tu correo? Cambiarlo",
  codigo: {
    etiqueta: "Código de 6 dígitos",
    atributos: { inputMode: "numeric", autoComplete: "one-time-code", maxLength: LIMITES.codigo.largo },
  },
  boton: "Entrar",
  ayuda: "También puedes tocar el botón del correo, en este u otro dispositivo.",
  noLlego: {
    titulo: "¿No te llegó?",
    texto: (remitente: string) =>
      `Revisa spam y promociones. El correo llega desde ${remitente}. Si tu programa está acordado y no llega, escríbenos.`,
    boton: "Enviarme otro",
    espera: "Podrás pedir otro en un minuto.",
  },
  errores: {
    noCoincide: "Ese código no coincide. Revísalo o pide uno nuevo.",
    vencido: "Ese código venció. Pide uno nuevo; tu programa sigue aquí.",
  },
} as const;

export const ENLACE_VENCIDO = {
  titulo: "Este enlace ya no sirve.",
  texto: "Los enlaces para entrar se usan una vez y vencen en 1 hora. Pide uno nuevo; tu programa y tus registros siguen aquí.",
  boton: "Pedir un código nuevo",
} as const;

// ---------------------------------------------------------------------------
// Mi espacio: registro semanal (4.11), solicitud de ajuste (4.13), foto (4.9), preferencias (4.14)

export const REGISTRO_SEMANAL = {
  carga: {
    leyenda: "¿Cómo sentiste la carga de esta semana?",
    opciones: [
      { valor: "liviana", texto: "Liviana" },
      { valor: "justa", texto: "Justa" },
      { valor: "pesada", texto: "Pesada" },
    ],
  },
  funciono: { etiqueta: "¿Qué funcionó?", ayuda: "Aunque sea algo pequeño.", max: LIMITES.registroSemanal.max },
  costo: { etiqueta: "¿Qué se hizo difícil?", ayuda: "No hace falta justificarlo; nos sirve para ajustar.", max: LIMITES.registroSemanal.max },
  cambiar: { etiqueta: "¿Qué te gustaría cambiar para la próxima semana?", max: LIMITES.registroSemanal.max },
  boton: "Enviar mi registro",
  borrador: "Borrador guardado en este dispositivo",
  errorEnvio: "No pudimos enviar tu registro. Quedó guardado como borrador en este dispositivo; inténtalo de nuevo.",
} as const;

export const AJUSTE = {
  tipo: {
    // Leyenda: la especificación no fija un texto propio; el H1 de la página es «¿Qué necesitas cambiar?».
    opciones: [
      { valor: "horarios", texto: "Cambiar horarios" },
      { valor: "carga", texto: "Bajar la carga" },
      { valor: "accion", texto: "Cambiar una acción" },
      { valor: "pausa", texto: "Pausar unos días" },
      { valor: "antes", texto: "Antes de empezar", soloPreparacion: true },
      { valor: "otra", texto: "Otra cosa" },
    ],
  },
  acciones: { etiqueta: "¿Qué acciones?", diasAdelante: 14 },
  desde: { etiqueta: "¿Desde cuándo?" },
  detalle: {
    etiqueta: "Cuéntanos un poco más",
    ayuda: "Por ejemplo: “Los martes salgo tarde del trabajo” o “Esta semana tengo pruebas”. No necesitas contarnos diagnósticos.",
    min: LIMITES.detalleAjuste.min,
    max: LIMITES.detalleAjuste.max,
  },
  reordenar: "Necesito que reordenemos mi semana",
  boton: "Pedir el ajuste",
} as const;

export const FOTO = {
  accept: "image/jpeg,image/png,image/webp",
  explicacion: {
    etiqueta: "Cuéntanos qué hiciste. Quien te acompaña puede aprobarla igual.",
    min: LIMITES.explicacionFoto.min,
    max: LIMITES.explicacionFoto.max,
    boton: "Enviar",
  },
  errores: {
    tipo: "Ese archivo no es una imagen JPG, PNG o WebP.",
    peso: "La foto pesa más de 4 MB incluso reducida. Prueba con una captura de pantalla.",
    red: "No pudimos subir la foto. Revisa tu conexión e inténtalo de nuevo; nada se perdió.",
  },
} as const;

export const PREFERENCIAS = {
  nombre: { etiqueta: "Cómo quieres que te llamemos", min: LIMITES.nombrePreferido.min, max: LIMITES.nombrePreferido.max, boton: "Guardar" },
  mostrarCreditos: {
    etiqueta: "Mostrar créditos y niveles en Hoy",
    ayuda: "Si prefieres no verlos a diario, apágalo. Se siguen contando y puedes verlos en Progreso.",
  },
  eliminar: { casilla: "Entiendo que esto no se puede deshacer.", boton: "Pedir la eliminación" },
  // Tipos de «Otro pedido sobre mis datos» (4.14): la especificación los lista sin texto final de opción.
  derechos: [
    { valor: "ver", texto: "Ver" },
    { valor: "corregir", texto: "Corregir" },
    { valor: "copia_fotos", texto: "Copia de mis fotos" },
    { valor: "oposicion", texto: "Que dejen de usar mis datos para algo" },
    { valor: "bloqueo", texto: "Bloquear" },
  ],
  detalleDerecho: { max: LIMITES.detalleDerecho.max },
} as const;
