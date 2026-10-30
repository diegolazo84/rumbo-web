// Textos de las pantallas de Mi espacio (especificación de la plataforma, sección 4), tal cual.
// Los de formularios (ingreso, registro semanal, ajuste, foto, preferencias) viven en
// src/data/formularios.ts y se importan desde ahí. Las llaves {así} de la especificación son
// argumentos de funciones: nunca se publican.
//
// Cuando la especificación da el texto en plural y el dato puede ser 1, se escribe la forma
// singular equivalente («1 acción»). Los pocos textos que la especificación no fija (errores de
// la solicitud de ajuste y de la eliminación, confirmación de «Guardar») están marcados con
// «PROPUESTO» en el comentario: los decide Diego.
import { ciclo, type PlanParam } from "../../../data/ejemplo-app";
import { planes } from "../../../data/rumbo";
import { miles } from "../../../lib/fechas";
import { FOTO } from "../../../data/formularios";

const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);
export const acciones = (n: number) => `${n} ${plural(n, "acción", "acciones")}`;

export const nombrePlan = (p: PlanParam) => planes.find((x) => x.param === p)?.nombre ?? "";

// ---------------------------------------------------------------------------
// Comunes

export const T_COMUN = {
  ejemplo: "Ejemplo",
  pedirAjuste: "Pedir un ajuste",
  ayudaInmediata: "Ayuda inmediata",
  verMiProgreso: "Ver mis logros",
  cerrar: "Cerrar",
} as const;

// ---------------------------------------------------------------------------
// 4.3 Estados del programa

export const T_ESTADOS = {
  preparacion: {
    ojo: "Antes de empezar",
    saludo: (nombre: string) => `Hola, ${nombre}.`,
    titulo: "Estamos preparando tu programa.",
    texto: {
      antes: "Acordamos empezar el ",
      // la fecha va en negrita
      despues:
        ". Quien te acompaña está armando tus acciones con lo que conversamos, y aparecerán aquí antes de esa fecha. Por ahora no tienes que hacer nada.",
    },
    acordamos: {
      titulo: "Lo que acordamos",
      plan: (plan: string) => `Plan: ${plan}`,
      revisionEscrita: (dia: string) => `Tu revisión semanal: los ${dia}, por escrito, aquí`,
      videollamada: (dia: string, hora: string) => `Tu videollamada semanal: los ${dia} a las ${hora} (hora de Chile)`,
      ciclo: (semanas: number) => `Ciclo de ${semanas} semanas`,
      metas: (lista: string) => `Tus metas: ${lista}`,
    },
    mientras: {
      titulo: "Mientras tanto",
      nombre: "Revisa cómo quieres que te llamemos",
      creditos: "Lee cómo se cuentan los créditos",
      cambio: "Si algo cambió desde nuestra conversación, cuéntanoslo",
    },
    ejemploPie: "Así se verá tu semana. Las acciones de este ejemplo no son las tuyas.",
    // 4.3.5: con un ciclo nuevo acordado, el estado vuelve a «preparación» con esta línea.
    cicloNuevo: (n: number, fecha: string) => `Tu ciclo ${n} empieza el ${fecha}.`,
  },
  inicioFuturo: {
    titulo: (dia: string) => `Tu programa empieza el ${dia}.`,
    texto: "Ya puedes ver tu primera semana. Las acciones se marcan desde su día.",
    boton: "Ver mi primera semana",
    nota: (dia: string) => `Podrás marcarla desde el ${dia}.`,
  },
  pausa: {
    etiqueta: "En pausa",
    pedida: {
      titulo: "Tu programa está en pausa.",
      desde: (fecha: string) => `Desde el ${fecha}. Lo retomamos cuando lo acordemos contigo.`,
      hasta: (fecha: string) => `Acordamos retomarlo el ${fecha}.`,
    },
    cuidado: {
      titulo: "Pausamos tu programa.",
      texto: "Lo pausamos mientras lo conversamos contigo. No tienes que hacer nada ahora.",
      ayuda: "Si necesitas ayuda ahora: ",
    },
  },
  cerrado: {
    ojo: "Ciclo cerrado",
    titulo: (semanas: number) => `Cerraste tu ciclo de ${semanas} semanas.`,
    texto: "Lo que hiciste queda registrado aquí. Lo que sigue lo conversamos contigo: continuar, reformular o cerrar.",
    registradas: (n: number) => `${acciones(n)} ${plural(n, "registrada", "registradas")}`,
    voz: "Tu valor no se mide en una racha.",
    descargar: "Descargar mis registros",
    ultimaRevision: "Ver mi última revisión",
    nota: "Tus registros siguen aquí mientras no pidas eliminarlos.",
  },
} as const;

// ---------------------------------------------------------------------------
// 4.4 y 4.5 Hoy, marcar y desmarcar

export const T_HOY = {
  ojo: (n: number, total: number) => `Semana ${n} de ${total}`,
  saludo: (nombre: string) => `¡Hola, ${nombre}!`,
  // Referencia visual (21-oct-2026): línea de la bienvenida, «Martes 13 · Semana 2 de 4».
  fechaSemana: (dia: string, n: number, total: number) => `${dia} · Semana ${n} de ${total}`,
  // Frase de la bienvenida: elegida por el estado real del día y nombrando la meta real a la que
  // aporta (nunca una frase motivacional al azar ni números que no existen). Sin culpa.
  bienvenida: {
    // Varias frases por estado: se elige una por fecha (fraseDelDia), para no repetir la misma.
    ninguna: [
      (m: string) => `Hoy das un paso más hacia «${m}».`,
      (m: string) => `Lo de hoy aporta a «${m}». Empieza por lo que te quede más a mano.`,
      (m: string) => `Hoy sigues construyendo «${m}», a tu ritmo.`,
    ],
    ningunaSinMeta: "Hoy das un paso más en tu plan. Empieza por lo que te quede más a mano.",
    algunas: [
      (m: string) => `Ya avanzaste en «${m}». Lo que hiciste cuenta.`,
      (m: string) => `Hoy ya sumaste a «${m}». Sigue a tu ritmo.`,
    ],
    algunasSinMeta: "Ya avanzaste hoy. Lo que hiciste cuenta.",
    completo: [(m: string) => `Hoy hiciste todo lo que te propusiste para «${m}».`, () => "Día completo. Hiciste todo lo que te propusiste hoy."],
    completoCoach: " Tu coach lo verá en tu revisión.",
    ayerCosto: [
      (m: string) => `Ayer costó un poco. Hoy basta con un paso pequeño hacia «${m}».`,
      (m: string) => `Un día difícil no borra lo avanzado. Hoy basta con un paso hacia «${m}».`,
    ],
    sinActividad: [
      (m: string) => `Qué bueno verte. Retomar también es avanzar: hoy basta con un paso hacia «${m}».`,
      (m: string) => `Volver es lo importante. Hoy puedes empezar por lo más simple de «${m}».`,
    ],
    sinAcciones: ["Hoy no hay acciones. Descansar también es parte del plan, y tu racha no se corta.", "Hoy es un día libre en tu plan. Tu racha no se corta."],
  },

  // Tarjeta de la meta principal (lib/mi-rumbo.ts: hoy la primera meta del programa).
  metaPrincipal: {
    rotulo: "Tu meta principal",
    hitos: (h: number, n: number) => `${h} de ${n} ${n === 1 ? "hito" : "hitos"}`,
    otras: (n: number) => (n === 1 ? "Y 1 meta más en tu plan" : `Y ${n} metas más en tu plan`),
    ver: "Ver mis metas",
  },
  acciones: {
    titulo: "Tus acciones de hoy",
    cuenta: (h: number, n: number) => (h >= n ? "Día completo" : `${h} de ${n} ${n === 1 ? "hecha" : "hechas"}`),
  },
  vacio: { texto: "Puedes mirar lo que viene en tu plan.", verPlan: "Ver mi plan" },
  // Nuevo nivel: una celebración especial (no por cada acción). Reglas y umbrales sin cambios.
  celebracion: {
    ojo: "Nuevo nivel",
    titulo: (nombre: string) => `Llegaste a ${nombre}`,
    texto: (n: number, total: number) => `Nivel ${n} de ${total}. Cada paso cuenta, también los días cortos.`,
    siguiente: (nombre: string, faltan: number) => `Siguiente parada: ${nombre}, a ${faltan} ${faltan === 1 ? "crédito" : "créditos"} más.`,
    maximo: "Llegaste al último nivel del camino.",
    seguir: "Seguir",
    verCamino: "Ver mi camino",
  },
  titulo: (dia: string) => `Hoy, ${dia}.`,
  bajada: {
    ninguna: (n: number) =>
      n === 1
        ? "Tienes 1 acción para hoy. Empieza por la que te quede más a mano."
        : `Tienes ${n} acciones para hoy. Empieza por la que te quede más a mano.`,
    algunas: (h: number, n: number) => `Llevas ${h} de ${n}. Lo que hiciste ya cuenta.`,
    todas: "Completaste las acciones de hoy.",
    fotoEnRevision: "Hiciste todo lo de hoy. Tu día y tu racha se actualizan cuando revisemos tu foto.",
    sinAcciones: "Hoy no hay acciones programadas. Tu racha no se corta.",
    // Etapa 2A: si ayer quedó a medias y hoy todavía no marca nada (sin culpa, sin números).
    ayerCosto: "Ayer costó un poco. Hoy empieza por lo más simple: lo que hagas, cuenta.",
    revision: "Hoy es tu revisión semanal.",
    videollamada: (hora: string) => `Hoy es tu videollamada, a las ${hora}.`,
  },
  diaCompleto: (bono: number) => `Día completo · +${bono}`,
  foco: { rotulo: "Foco de tu coach", nuevo: "Nuevo", ver: "Ver la revisión", ir: "Ir a mi acompañamiento" },
  grupos: {
    conHorario: "Con horario",
    // Etapa 2A: momentos del día (lib/mi-rumbo.ts, cortes a las 12:00 y a las 19:00).
    manana: "Mañana",
    tarde: "Tarde",
    noche: "Noche",
    flexibles: "Cuando puedas hoy",
    retomadas: "Retomadas",
    del: (dia: string) => `Del ${dia}`,
  },
  resumen: {
    nivel: (n: number, nombre: string) => `Nivel ${n} · ${nombre}`,
    creditos: (c: number) => `${c} ${plural(c, "crédito", "créditos")}`,
    barra: (c: number, minimo: number, nombre: string) => `${c} de ${minimo} créditos para llegar a ${nombre}`,
    barraEtiqueta: (nombre: string) => `Créditos para llegar a ${nombre}`,
    maximo: "Nivel máximo",
    bono: (b: number) => `Bono por día completo: +${b}`,
    racha: (r: number) => `${r} ${plural(r, "día completo seguido", "días completos seguidos")}`,
    enlace: "Ver mis logros",
  },
  // Etapa 2A: tarjeta «Tu acompañamiento» (próxima revisión, «Me está costando» y novedades).
  acompanamiento: {
    titulo: "Tu acompañamiento",
    // Sin nombre ni foto hasta la etapa 4A (el participante todavía no puede leer quién lo acompaña).
    quien: "Tu coach lee tu semana",
    costando: "Me está costando",
  },
  revision: {
    titulo: "Tu próxima revisión",
    coachAntes: { antes: "Tu revisión semanal es el ", despues: ", por escrito, aquí en tu espacio. Si alcanzas, escribe antes tu registro." },
    coachEnviado: { antes: "Recibimos tu registro. Tu revisión llega el ", despues: "." },
    escribir: "Escribir mi registro",
    // «Tu videollamada es el **{jueves 16} a las {19:00}** (hora de Chile). …» (4.4.7)
    cercano: {
      antes: "Tu videollamada es el ",
      a: " a las ",
      despues: " (hora de Chile). La coordinamos fuera de la plataforma. Después te dejamos un resumen escrito aquí.",
    },
    escribirOpcional: "Escribir mi registro (opcional)",
    // Fuera de Chile (Preferencias: «Tus horarios se muestran en esta zona»). PROPUESTO.
    enTuZona: (hora: string) => `En tu zona horaria: ${hora}.`,
  },
  pie: { semana: "¿Tu semana cambió? " },
  novedades: { etiqueta: "Novedades" },
  marcar: {
    marcaste: (t: string) => `Marcaste “${t}” · +1 crédito`,
    completaste: (n: number) => `Completaste el día · +${n} créditos`,
    deshacer: "Deshacer",
    vivo: (c: number, n: number, nombre: string) => `${c} créditos. Nivel ${n}, ${nombre}.`,
    desmarcaste: (t: string, c: number) => `Desmarcaste “${t}”. Tus créditos se actualizaron: ahora tienes ${c}.`,
    error: (t: string) => `No pudimos guardar “${t}”. Revisa tu conexión e inténtalo de nuevo.`,
    reintentar: "Reintentar",
  },
} as const;

// 4.6 De días anteriores (sin culpa)
export const T_ANTERIORES = {
  // Etapa 2A: el bloque parte plegado en Mi Rumbo (salvo con el aviso de carga).
  ver: "Ver las acciones",
  ocultar: "Ocultar",
  titulo: "De días anteriores",
  bajada: (n: number) =>
    n === 1
      ? "Quedó 1 acción sin marcar. Puedes marcarla si ya la hiciste, retomarla hoy o dejarla pasar."
      : `Quedaron ${n} acciones sin marcar. Puedes marcarlas si ya las hiciste, retomarlas hoy o dejarlas pasar.`,
  verLas: (n: number) => `Ver las ${n}`,
  yaLaHice: "Ya la hice",
  retomar: "Retomar hoy",
  masOpciones: "Más opciones",
  masOpcionesDe: (t: string) => `Más opciones para “${t}”`,
  dejar: "Dejarla pasar",
  ajuste: "Pedir un ajuste",
  registrada: (dia: string) => `Registrada en el ${dia} · +1. Tus créditos se actualizaron.`,
  retomada: "La verás hoy en Retomadas.",
  dejada: "Listo. Si quieres, lo conversamos en tu revisión.",
  carga: {
    titulo: "¿Esta semana te está costando?",
    texto: "Pasa, y no es falta de voluntad. A veces la semana cambia o el programa quedó más cargado de lo que cabe. Podemos ajustarlo contigo.",
    boton: "Pedir un ajuste",
    ayuda: "Si lo que pesa es algo más grande, aquí tienes ",
  },
} as const;

// ---------------------------------------------------------------------------
// 4.7 Calendario

export const T_CALENDARIO = {
  vistas: [
    { valor: "dia", texto: "Día" },
    { valor: "semana", texto: "Semana" },
    { valor: "mes", texto: "Mes" },
  ],
  leyendaVistas: "Vista del calendario",
  anterior: { dia: "Día anterior", semana: "Semana anterior", mes: "Mes anterior" },
  siguiente: { dia: "Día siguiente", semana: "Semana siguiente", mes: "Mes siguiente" },
  hoy: "Hoy",
  tituloSemana: (n: number, total: number, rango: string) => `Semana ${n} de ${total} · ${rango}`,
  colores: "Colores de tus metas",
  fuera: "Fuera de tu programa",
  diaRevision: ", día de tu revisión semanal",
  dia: {
    vacio: "Este día no tiene acciones programadas.",
    noCorta: "No corta tu racha.",
    futura: (dia: string) => `Se marca desde el ${dia}.`,
    // Más atrás de la ventana: solo lectura (texto de 4.8, primera oración).
    cerrada: "Esta acción ya quedó cerrada en tu registro.",
    conHorario: "Con horario",
    flexiblesHoy: "Cuando puedas hoy",
    flexibles: "Cuando puedas este día",
    dejada: "La dejaste pasar",
  },
  semana: {
    sinAcciones: "Sin acciones programadas",
    pie: (r: number, n: number) => `Esta semana registraste ${r} de ${n} acciones programadas hasta hoy.`,
    diasDeLaSemana: "Días de la semana",
  },
  mes: {
    dias: ["L", "M", "M", "J", "V", "S", "D"],
    nombresDias: ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"],
    celda: (fecha: string, n: number, h: number | null) =>
      // Sin nada marcado no se dice «0 hechas» (nunca un cero que suene a falta).
      !h ? `${fecha}: ${acciones(n)}.` : `${fecha}: ${acciones(n)}, ${h} ${plural(h, "hecha", "hechas")}.`,
    completo: (fecha: string) => `${fecha}: día completo.`,
    sinAcciones: (fecha: string) => `${fecha}: sin acciones programadas.`,
    fuera: (fecha: string) => `${fecha}: fuera de tu programa.`,
    pie: (mes: string, a: number, d: number) =>
      `En ${mes} registraste ${acciones(a)} y completaste ${d} ${plural(d, "día", "días")}.`,
    vacio: "Aún no hay registros este mes.",
  },
} as const;

// ---------------------------------------------------------------------------
// 4.8 y 4.9 Detalle de acción y fotos privadas

export const T_DETALLE = {
  meta: (m: string) => `Meta: ${m}`,
  horario: (desde: string, hasta: string, duracion: string) => `${desde} a ${hasta} · ${duracion}`,
  flexible: (duracion: string) => `Flexible · ${duracion}, cuando puedas este día`,
  marcar: "Marcar como hecha",
  corta: "Hice la versión corta",
  dejar: "Dejarla pasar",
  futura: (dia: string) => `Podrás marcarla desde el ${dia}.`,
  hecha: "Hecha · +1 crédito",
  hechaCorta: "Hecha (versión corta) · +1 crédito",
  desmarcar: "Desmarcar",
  dejada: "La dejaste pasar",
  deshacer: "Deshacer",
  cerrada: "Esta acción ya quedó cerrada en tu registro. Si quieres, coméntala en tu registro semanal.",
  anuladaAjuste: (fecha: string) => `Ya no está en tu programa · se quitó en un ajuste del ${fecha}`,
  anuladaPausa: "Sin acción ese día: tu programa estaba en pausa",
  como: "Cómo hacerla",
  siNo: "Si hoy no alcanzas",
  versionCorta: (t: string) => `Versión corta: ${t}. También cuenta como hecha.`,
  paraQue: "Para qué",
  atribucion: "Lo que nos contaste",
  pieAjuste: "¿Esta acción no calza con tu semana? ",
  // Rediseño con la referencia de ChatGPT (29-oct-2026)
  migas: {
    etiqueta: "Dónde estás",
    volver: "Volver a Mi plan",
    plan: "Mi plan",
    semana: (n: number, total: number) => `Semana ${n} de ${total}`,
    accion: (dia: string) => `Acción del ${dia}`,
  },
  marcarSub: (n: number) => `Completa la acción y suma +${n} ${plural(n, "crédito", "créditos")}.`,
  cortaSub: "Registra solo lo esencial de hoy.",
  comoSub: (duracion: string, pasos: boolean) => (pasos ? `Sigue estos pasos y dedica ${duracion}.` : `Dedica ${duracion}.`),
  ajusteCard: {
    titulo: "¿Esta acción no calza con tu semana?",
    texto: "Pide un ajuste y lo revisamos contigo. Tu plan se adapta a tu vida, no al revés.",
    boton: "Pedir un ajuste",
  },
  noEncontrada: "No encontramos esta acción.", // PROPUESTO (accion/?id= de otra persona o borrada)
  irAlCalendario: "Ir a tu calendario", // PROPUESTO
  ajuste: "Pedir un ajuste",
  foto: {
    aviso:
      "Sube una foto de lo que hiciste, por ejemplo tu escritorio ordenado o la página que escribiste. Solo la ven tú y quien te acompaña. No subas fotos de tu cuerpo, fotos íntimas, documentos ni fotos de otras personas.",
    porAhora:
      "Por ahora no puedes subir fotos desde aquí. Usa «No puedo subir una foto» y cuéntanos qué hiciste: queda en revisión igual que una foto.", // PROPUESTO (la subida real aún no funciona)
    subir: "Subir foto",
    noPuedo: "No puedo subir una foto",
    subiendo: "Subiendo foto…",
    enRevision: "En revisión",
    suma: "Suma +1 cuando quien te acompaña la apruebe, a más tardar en tu próxima revisión semanal.",
    eliminar: "Eliminar foto",
    aprobada: "Aprobada · +1 crédito",
    notaCoach: "Nota de tu coach",
    noAprobada: "No aprobada",
    subirOtra: "Puedes subir otra.",
    botonOtra: "Subir otra foto",
    depurada: (dias: number) => `La foto se borró a los ${dias} días de revisada, como dice nuestra política. El crédito se mantiene.`,
    miniatura: "Tu foto",
    preparando: "Preparando foto…", // PROPUESTO (la foto se reduce y se limpia antes de subirla)
    errores: {
      tipo: FOTO.errores.tipo,
      peso: FOTO.errores.peso,
      // PROPUESTO: el navegador no pudo convertir la foto a WebP sin metadatos.
      proceso: "No pudimos preparar esta foto de forma segura en este navegador. Prueba con otra foto o usa «No puedo subir una foto».",
    },
    // PROPUESTO: foto opcional en una acción que no la exige (decisión del 21-oct-2026).
    opcional: {
      titulo: "Foto de esta acción (opcional)",
      texto: "Solo la ven tú y quien te acompaña. No cambia tus créditos.",
      agregar: "Agregar una foto",
      quitar: "Quitar foto",
    },
    errorGuardar: "No pudimos guardarlo. Revisa tu conexión e inténtalo de nuevo; nada se perdió.", // PROPUESTO (como el de la foto, 4.9)
    dialogo: {
      titulo: "¿Eliminar esta foto?",
      texto: "Se borra de inmediato. Si estaba aprobada, se resta el crédito y se recalcula tu día.",
      eliminar: "Eliminar",
      cancelar: "Cancelar",
    },
  },
} as const;

// ---------------------------------------------------------------------------
// 4.10 Progreso e historial de créditos

export const T_PROGRESO = {
  ojo: "Lo que vas avanzando",
  titulo: "Mis logros",
  bajada: "Muestra lo que registraste. No mide todo lo que hiciste ni lo que vales.",
  metas: "Tus metas",
  barraMeta: (h: number, n: number) => `${h} de ${n} acciones programadas hasta hoy`,
  barraMetaEtiqueta: (meta: string) => `Acciones de ${meta}`,
  semanasEtiqueta: "Por semana",
  hitos: "Hitos de esta meta",
  hitoLogrado: "Logrado: ",
  hitoPendiente: "Por venir: ",
  metaVacia: "Esta meta todavía no tiene acciones registradas. Lo primero cuenta igual que lo demás.",
  semana: "Lo que sí hiciste esta semana",
  semanaVacia: "Todavía no hay registros esta semana. Cuando marques una acción, aparecerá aquí.",
  creditos: "Créditos, racha y nivel",
  bono: (b: number, r: number) =>
    r > 0 ? `Bono por día completo: +${b} · ${r} ${plural(r, "día completo seguido", "días completos seguidos")}` : `Bono por día completo: +${b}`,
  niveles: "Ver los 10 niveles",
  nivelCreditos: (minimo: number) => `desde ${minimo} créditos`,
  reglas: "Cómo se cuentan los créditos",
  reglasExtra: [
    "Si desmarcas una acción o eliminas una foto aprobada, recalculamos tus créditos, tu racha y tu nivel.",
    (dias: number) => `Puedes registrar acciones de hasta ${dias} días atrás.`,
  ] as const,
  nota: "Los créditos muestran tu avance: no son dinero, no se canjean y no miden tu valor.",
  detalle: "Ver el detalle de tus créditos",
} as const;

// Mis logros (maqueta de ChatGPT, 29-oct-2026). Cifras, fechas y beneficios salen de la base.
export const T_LOGROS = {
  portada: {
    ojo: "Mis logros",
    titulo: "Cada paso cuenta",
    bajada: ["Has avanzado más de lo que imaginas.", "Aquí puedes ver tu progreso, reconocer tus logros", "y descubrir todo lo que has conseguido en tu camino."],
  },
  nivel: {
    titulo: "Mi nivel",
    ver: "Ver los 10 niveles",
    nivel: (n: number) => `Nivel ${n}`,
    faltan: (c: number, n: number) => `Te faltan ${c} ${plural(c, "crédito", "créditos")} para el nivel ${n}.`,
    maximo: "Llegaste al nivel más alto. Tus créditos siguen sumando.",
    barra: (n: number) => `Créditos hacia el nivel ${n}`,
    hoja: "Los 10 niveles",
    desde: (c: number) => `desde ${miles(c)} créditos`,
    actual: "Tu nivel",
    reglas: "Cómo se cuentan los créditos",
  },
  creditos: {
    titulo: "Mis créditos",
    historial: "Ver historial",
    acumulados: (c: number) => `${plural(c, "crédito acumulado", "créditos acumulados")}`,
    semana: "Créditos de esta semana, por día",
    dia: (dia: string, c: number | null) => (c === null ? `${dia}: todavía no llega` : `${dia}: ${c} ${plural(c, "crédito", "créditos")}`),
    bono: (b: number) => `+${b}`,
    bonoTexto: "Bono al completar tu próximo día",
    sube: (b: number, d: number) => `Sube a +${b} con ${d} ${plural(d, "día completo", "días completos")} más`,
  },
  constancia: {
    titulo: "Mi constancia",
    actual: "Racha actual",
    mejor: "Mejor racha",
    mejorTexto: "Tu mejor racha en este ciclo.",
    dias: (n: number) => `${n} ${plural(n, "día", "días")}`,
    llamas: (n: number) => `${Math.min(n, 7)} de 7 días seguidos hacia el bono más alto`,
    ayuda: "Un día cuenta cuando completas todas tus acciones programadas. Un día sin acciones no corta la racha.",
  },
  evolucion: {
    titulo: "Mi evolución",
    bajada: (n: number) => `Tu progreso en ${n === 4 ? "las últimas 4 semanas" : `las ${n} semanas de tu ciclo`}`,
    semana: (n: number) => `Semana ${n}`,
    semanaCorta: (n: number) => `Sem. ${n}`,
    futura: "Por venir",
    sinAcciones: "Sin acciones",
    pct: (p: number) => `${p} %`,
    etiqueta: (n: number, p: number | null, futura: boolean) =>
      futura ? `Semana ${n}: todavía no llega` : p === null ? `Semana ${n}: sin acciones programadas` : `Semana ${n}: ${p} % de lo programado hecho`,
    nota: "Porcentaje de acciones hechas sobre las programadas de cada semana, hasta hoy.",
  },
  estaSemana: {
    titulo: "Esta semana",
    texto: (h: number, n: number) => `Has completado ${h} de ${n} ${plural(n, "acción", "acciones")} de tu plan esta semana.`,
    de: (n: number) => `de ${n}`,
    rotulo: (n: number) => `${plural(n, "acción completada", "acciones completadas")} de las programadas`,
    sinAcciones: "Esta semana no tienes acciones programadas.",
    verPlan: "Ver mi plan",
    hechas: "Ver lo que hiciste",
  },
  frase: ["La constancia de hoy", "te acerca a la vida que quieres."],
  reconocimientos: {
    titulo: "Mis reconocimientos",
    bajada: "Insignias que celebran tus avances en Rumbo.",
    ver: "Ver todos",
    obtenido: (fecha: string) => `Conseguido el ${fecha}`,
    porLograr: "Por desbloquear",
    estado: { conseguido: "Conseguido", progreso: "En progreso", bloqueado: "Por desbloquear" },
    // Cómo conseguir cada uno, con las mismas reglas de la base (privado.otorgar_reconocimientos).
    como: {
      primer_paso: "Marca tu primera acción como hecha.",
      primera_semana: "Haz al menos una acción en tu primera semana.",
      constancia: (u: number) => `Completa todas tus acciones ${u} días seguidos.`,
      mitad_del_camino: (u: number) => `Llega a la mitad del ciclo con el ${u} % de lo programado hecho.`,
      ciclo_completado: "Llega al final de tu ciclo con acciones hechas.",
      meta_alcanzada: "Logra todos los hitos de una de tus metas.",
    },
    avance: {
      primera_semana: (d: number) => `Día ${d} de 7`,
      constancia: (a: number, u: number) => `${a} de ${u} días`,
      mitad_del_camino: (p: number, u: number) => `Llevas ${p} % · se pide ${u} %`,
      ciclo_completado: (d: number, t: number) => `Día ${d} de ${t}`,
      meta_alcanzada: (a: number, t: number) => `${a} de ${t} hitos`,
    },
    veces: (n: number) => `${n} ${plural(n, "meta", "metas")}`,
    progreso: (a: number, b: number) => `${a}/${b}`,
    corto: {
      primer_paso: "¡Comenzaste tu camino!",
      primera_semana: "Tu primera semana con acciones hechas",
      constancia: (u: number) => `${u} días seguidos completos`,
      mitad_del_camino: (u: number) => `${u} % de lo programado a mitad del ciclo`,
      ciclo_completado: "Llega al final de tu ciclo",
      meta_alcanzada: "Logra todos los hitos de una meta",
    },
    hoja: "Tus reconocimientos",
    hojaNota: "Se otorgan solos con tus registros. No suman créditos ni cambian tu nivel.",
    resumen: (n: number, t: number) => `${n} de ${t} obtenidos`,
  },
  recompensas: {
    titulo: "Mis recompensas",
    bajada: "Beneficios que puedes obtener al alcanzar tus objetivos.",
    detalles: "Ver detalles",
    descuento: (p: number) => `${p} % de descuento`,
    renovacion: "en tu próxima renovación",
    progreso: (h: number, n: number) => `${h}/${n} acciones`,
    barra: "Acciones hechas del ciclo",
    condicion: (d: number, p: number) => `Completa todas las acciones de tus ${d} días para obtener tu descuento del ${p} %.`,
    alFinal: "El beneficio se activa al finalizar el ciclo.",
    noAlcanza: "En este ciclo quedó alguna acción sin hacer. Puedes lograrlo en el próximo.",
    obtenido: (p: number | null) => (p ? `Obtuviste ${p} % de descuento` : "Obtuviste un beneficio"),
    obtenidoTexto: "Se descuenta en tu próxima renovación.",
    hoja: "Tu descuento por renovación",
    hojaNota: "Cuentan las acciones programadas y los ajustes autorizados. Lo anulado por un ajuste o una pausa no cuenta. Se usa en una renovación y no se suma a otros descuentos.",
  },
  ranking: {
    titulo: "Ranking (opcional)",
    ver: "Ver ranking",
    bajada: "Participa solo si lo deseas.",
    texto: ["Motívate con otras personas", "que también están en su camino."],
    participar: "Quiero participar",
    saberMas: "Saber más",
    alias: "Elige tu alias",
    aliasAyuda: "Es el nombre que verán las demás personas. De 3 a 24 caracteres.",
    entrar: "Entrar al ranking",
    cancelar: "Cancelar",
    puesto: (p: number, t: number, c: number) => `La semana pasada quedaste en el puesto ${p} de ${t}, con ${c} % de tus acciones.`,
    sinPuesto: "El ranking se muestra cuando hay al menos 3 personas participando con acciones la semana pasada.",
    como: (a: string) => `Participas como «${a}».`,
    salir: "Salir del ranking",
    hoja: "Cómo funciona el ranking",
    reglas: [
      "Es voluntario: entras y sales cuando quieras.",
      "Cada semana compara el porcentaje de tus acciones hechas sobre las programadas, no la cantidad.",
      "Solo se ve tu alias. Nadie ve tu nombre ni tus acciones.",
      "Con menos de 3 participantes no se muestra.",
    ],
    errores: {
      "alias:invalido": "El alias debe tener de 3 a 24 caracteres: letras, números, espacios, punto, guion o guion bajo.",
      "alias:en_uso": "Ese alias ya lo usa otra persona. Prueba con otro.",
    } as Record<string, string>,
    error: "No se pudo guardar. Inténtalo de nuevo.",
  },
  metas: "Tus metas",
  error: "No pudimos cargar esta parte. Inténtalo de nuevo más tarde.",
} as const;

export const T_CREDITOS = {
  ojo: "Mis logros",
  // La especificación no fija el H1 del historial: se usa el texto del enlace que lleva aquí.
  titulo: "El detalle de tus créditos.",
  volver: "Mis logros",
  dia: (dia: string, c: number) => `${dia} · +${c}`,
  sinAcciones: (dia: string) => `${dia} · sin acciones programadas · la racha sigue`,
  fotoEnRevision: (dia: string) => `${dia} · foto en revisión · la racha espera`,
  acciones: (n: number) => `${acciones(n)} · +${n}`,
  parcial: (h: number, n: number) => `${h} de ${acciones(n)} · +${h}`,
  diaCompleto: (b: number, r: number) => `Día completo · +${b} (${r} ${plural(r, "día seguido", "días seguidos")})`,
  vacio: "Aún no tienes créditos. Tu primera acción marcada suma +1.",
} as const;

// ---------------------------------------------------------------------------
// 4.11 Semana: registro y revisión

export const T_SEMANA = {
  selector: "Semana",
  ojo: "Revisión semanal",
  titulo: (n: number, total: number) => `Semana ${n} de ${total}.`,
  // Textos exactos de Diego (21-oct-2026): «Así fue tu semana».
  asiFue: "Así fue tu semana",
  subtitulo: (n: number, total: number) => `Semana ${n} de ${total}`,
  vimos: "Lo que vimos juntos",
  publicadaEl: (dia: string) => `Publicada el ${dia}`,
  videollamadaDel: (dia: string) => `Resumen de tu videollamada del ${dia}`,
  loQueFunciono: "Lo que funcionó",
  podemosAjustar: "Lo que podemos ajustar",
  focoProxima: "Tu foco para la próxima semana",
  cambiosPrograma: "Cambios en tu programa:",
  leerCompleta: "Leer revisión completa",
  verMenos: "Ver menos",
  sinRevision: "Tu revisión aparecerá aquí cuando esté lista.",
  compartiste: "Lo que compartiste",
  invitacion: "¿Cómo te has sentido esta semana? Puedes contarnos qué funcionó, qué te costó y qué te gustaría cambiar.",
  escribir: "Escribir mi registro",
  avances: "Tus avances de esta semana",
  bajadaCoach: { antes: "Tu revisión es por escrito, el ", despues: ". Si no alcanzas a escribir, revisamos lo que marcaste en el calendario." },
  bajadaCercano: {
    antes: "Conversamos por videollamada el ",
    despues: " (hora de Chile), fuera de la plataforma. Después te dejamos aquí un resumen escrito.",
  },
  registro: "Tu registro",
  sinEnviar: "Puedes escribirlo hasta que empecemos tu revisión. Es opcional.",
  enviado: (dia: string) => `Enviado el ${dia}`,
  editar: "Editar",
  enRevision: "En revisión",
  llega: (dia: string) => `Tu revisión llega el ${dia}.`,
  pendiente: "Tu revisión de esta semana todavía no está lista. Te la dejamos aquí apenas esté.",
  futura: "Esta semana aún no empieza.",
  semana1: (dia: string) => `Tu primera revisión es el ${dia}. Hasta entonces, marca lo que vayas haciendo.`,
  marcaste: "Lo que marcaste",
  deMeta: (h: number, n: number) => `${h} de ${acciones(n)} programadas`,
  diasCompletos: (d: number) => `${d} ${plural(d, "día completo", "días completos")}`,
  respuesta: "Respuesta de tu coach",
  resumenVideollamada: "Resumen de tu videollamada",
  funciono: "Qué funcionó",
  ajustamos: "Qué ajustamos",
  foco: (n: number) => `Tu foco para la semana ${n}`,
  cambios: "Cambios en tu programa",
  sinRespuesta: "Sin respuesta",
} as const;

// ---------------------------------------------------------------------------
// 4.13 Pedir un ajuste

export const T_AJUSTE = {
  ojo: "Pedir un ajuste",
  titulo: "¿Qué necesitas cambiar?",
  bajada: "Tu programa tiene que caber en tu semana, no al revés. Cuéntanos qué pasa y lo ajustamos contigo.",
  plazoCoach: { antes: "Lo vemos en tu próxima revisión semanal, el ", despues: ". Mientras tanto, tu calendario sigue igual: haz lo que puedas." },
  plazoCercano: (quedan: number) => ({
    antes: `Si tu semana se desarmó, la reordenamos dentro de 1 día hábil. Puedes pedirlo hasta ${ciclo.reordenamientosMax} veces por ciclo; te quedan `,
    dato: String(quedan),
    despues: ".",
  }),
  sinReordenamientos: {
    antes: `Ya usaste los ${ciclo.reordenamientosMax} reordenamientos de este ciclo. Lo vemos en tu próxima videollamada, el `,
    despues: ".",
  },
  plazoPausa: "Si necesitas parar, está bien. Lo conversamos contigo antes de cambiar nada.",
  confirmacion: {
    titulo: "Recibimos tu solicitud de ajuste.",
    texto: "Te respondemos aquí, en Mi espacio. No enviamos avisos por correo.",
    volver: "Volver a Hoy",
    ver: "Ver tus solicitudes de ajuste",
  },
  lista: {
    titulo: "Tus solicitudes de ajuste",
    enviada: "Enviada",
    enRevision: "En revisión",
    respondida: "Respondida",
    sinCambios: "Sin cambios",
    verCambios: "Ver qué cambió en tu calendario",
    vacio: "No has pedido ajustes. Si tu semana cambia, aquí puedes avisarnos.",
    enviadaEl: (dia: string) => `Enviada el ${dia}`,
    desde: (dia: string) => `Desde el ${dia}`,
  },
  errores: {
    // PROPUESTO: la especificación no define los errores de este formulario.
    tipo: "Elige qué necesitas cambiar.",
    detalle: "Cuéntanos un poco más (mínimo 10 caracteres).",
    // PROPUESTO: Mi espacio real, si no se pudo guardar la solicitud.
    envio: "No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo; lo que escribiste sigue aquí.",
    // PROPUESTO: tope de 5 solicitudes en 7 días (pedir_ajuste, 429).
    demasiadas: "Ya enviaste varias solicitudes esta semana. Lo vemos todo junto en tu próxima revisión.",
  },
} as const;

// ---------------------------------------------------------------------------
// 4.14 Preferencias y Mis datos

export const T_PREFERENCIAS = {
  titulo: "Preferencias.",
  nombre: { titulo: "Cómo te llamamos", guardado: "Guardado." }, // «Guardado.»: PROPUESTO
  cuenta: {
    titulo: "Tu cuenta",
    correo: (c: string) => `Correo: ${c}`,
    cambiar: "Para cambiar tu correo, escríbenos.",
    zona: (z: string) => `Zona horaria: ${z}`,
    zonaAyuda:
      "Tus horarios se muestran en esta zona. Las videollamadas siempre se acuerdan en hora de Chile. Si cambiaste de país, avísanos en una solicitud de ajuste.",
  },
  avance: { titulo: "Avance" },
  datos: {
    titulo: "Mis datos",
    aviso: "Tu calendario, tus registros y tus fotos solo los ves tú y quien te acompaña en Rumbo.",
    descargar: "Descargar mis datos",
    descargarTexto: "Se descarga en este dispositivo. Si también quieres una copia de tus fotos, pídela abajo.",
    eliminar: "Pedir que eliminemos mis datos",
    otro: "Otro pedido sobre mis datos",
    otroDetalle: "Cuéntanos un poco más",
    enviar: "Enviar",
  },
  sesion: { titulo: "Sesión", salir: "Salir de este dispositivo" },
  pie: { privacidad: "Privacidad", condiciones: "Condiciones del piloto", ayuda: "Ayuda inmediata" },
  eliminar: {
    titulo: "Pedir que eliminemos tus datos.",
    seBorra: "Cuando lo hagamos se borra y no se puede recuperar:",
    lista: ["tu programa y tus acciones", "tus registros y revisiones", "tus fotos", "tu acceso a Mi espacio"],
    conservamos: "Lo que conservamos:",
    conservamosTexto: "Solo lo que la ley nos obliga a guardar, como el registro de un pago, si lo hubo.",
    cicloEnCurso: "Tienes un ciclo en curso. Antes de eliminar, te escribiremos para cerrar lo que corresponda.",
    antes: "Antes, puedes descargar tus datos.",
    error: "Para pedir la eliminación, marca la casilla.", // PROPUESTO
    volver: "Preferencias",
  },
  confirmacion: (fecha: string) => `Recibimos tu pedido. Lo haremos a más tardar el ${fecha} y te avisaremos por correo.`,
  // PROPUESTO: Mi espacio real, si la base no devuelve una fecha límite.
  confirmacionSinFecha: "Recibimos tu pedido. Te avisaremos por correo cuando esté hecho.",
  // PROPUESTO: Mi espacio real, si no se pudo guardar.
  errorGuardar: "No pudimos guardarlo. Revisa tu conexión e inténtalo de nuevo.",
  // PROPUESTO: Mi espacio real, si no se pudo armar la descarga.
  errorDescargar: "No pudimos preparar la descarga. Revisa tu conexión e inténtalo de nuevo.",
} as const;

// ---------------------------------------------------------------------------
// 4.4.3 Novedades (Mi espacio real: las arma ProveedorEspacio con los datos de la base)

export const T_NOVEDADES = {
  revision: (n: number) => `Tu coach respondió tu registro de la semana ${n}.`,
  verRevision: "Ver la revisión",
  ajuste: "Respondimos tu solicitud de ajuste.",
  verAjuste: "Ver la respuesta",
  programa: (fecha: string) => `Hubo cambios en tu programa desde el ${fecha}.`,
  verPrograma: "Ver qué cambió",
  aprobada: (accion: string) => `Tu foto de “${accion}” fue aprobada · +1`,
  rechazada: (accion: string) => `Tu foto de “${accion}” no se aprobó. Puedes subir otra.`,
  verAccion: "Ver la acción",
} as const;

// Mi espacio real: la cuenta no tiene una ficha abierta (cerrada o eliminada). PROPUESTO.
export const T_SIN_FICHA = {
  titulo: "No encontramos un espacio abierto con este correo.",
  texto: "Si tu programa terminó o crees que es un error, escríbenos y lo revisamos contigo.",
  salir: "Salir",
} as const;

// ---------------------------------------------------------------------------
// Rumbo 2.0, etapa 2: cinco secciones (Mi Rumbo, Mi plan, Mi acompañamiento, Comunidad y Mis
// logros) y «Lo que viene en Rumbo». PROPUESTO y aprobado por Diego el 20-10-2026. Lo que todavía
// no existe va rotulado «Próximamente»: sin botones, sin enlaces de compra y sin fechas.

export const T_SECCIONES = {
  rumbo: "Mi Rumbo",
  plan: "Mi plan",
  acompanamiento: "Mi acompañamiento",
  comunidad: "Comunidad",
  logros: "Mis logros",
  loQueViene: "Lo que viene en Rumbo",
  proximamente: "Próximamente",
} as const;

// Resumen del día en Mi Rumbo: solo las acciones programadas para hoy (nunca las futuras).
// Etapa 2A · «Me está costando»: tres caminos que ya existen (pedir un ajuste, el registro
// semanal y Ayuda inmediata). Sin promesas de respuesta inmediata.
export const T_COSTANDO = {
  titulo: "¿Qué está pasando?",
  bajada: "Tu programa tiene que caber en tu semana, no al revés. Elige lo que más se parezca.",
  ajuste: { titulo: "Necesito cambiar el plan", texto: "Otro día, otro horario o una acción más corta: pide un ajuste." },
  contar: { titulo: "Quiero contárselo a mi coach", texto: "Escríbelo en tu registro semanal, en «¿Qué se hizo difícil?»." },
  ayuda: { titulo: "Necesito ayuda ahora", texto: "Teléfonos y servicios de ayuda en crisis." },
  nota: (dia: string) => `Tu coach lo verá a más tardar en tu revisión del ${dia}. Esto no es un chat y no tiene respuesta inmediata.`,
  notaCercano: "Si tu semana se desarmó, en «Necesito cambiar el plan» puedes pedir que la reordenemos.",
  desdeAccion: (titulo: string) => `Sobre «${titulo}»`,
} as const;

export const T_RESUMEN_DIA = {
  etiqueta: (h: number, n: number) => `Hoy: ${h} de ${acciones(n)} ${plural(n, "hecha", "hechas")}.`,
  corto: (h: number, n: number) => `${h} de ${n} hoy`,
  sinAcciones: "Sin acciones para hoy",
} as const;

export const T_PLAN = {
  pestanas: "Vistas de Mi plan",
  calendario: "Calendario",
  metas: "Mis metas",
  metasBajada: "Lo que quieres lograr en este ciclo y para qué. Tu avance está en Mis logros.",
  metasVacio: "Tus metas aparecerán aquí cuando tu programa esté publicado.",
  verAvance: "Ver mi avance",
  // Encabezado y tarjetas de la mejora visual (textos exactos de Diego, 29-oct-2026).
  camino: {
    titulo: "Tu camino, paso a paso",
    bajada: "Cada pequeña acción te acerca a lo que quieres construir.",
    semana: (n: number, total: number) => `Semana ${n} de ${total}`,
  },
  hoy: {
    titulo: "Tu día de hoy",
    cifra: (h: number, n: number) => `${h} de ${n}`,
    rotulo: (n: number) => `${plural(n, "acción completada de la programada", "acciones completadas de las programadas")} para hoy`,
    barra: "Acciones de hoy",
    valor: (h: number, n: number) => `${h} de ${n} ${plural(n, "acción", "acciones")}`,
    ver: "Ver mis acciones de hoy",
    vacio: "Hoy no tienes acciones programadas. Aprovecha para descansar o mirar lo que viene en tu semana.",
    fuera: "Hoy no es parte de tu programa.",
  },
  construyendo: {
    titulo: "Lo que estás construyendo",
    ver: "Mis metas",
    vacio: "Tus metas aparecerán aquí cuando tu programa esté publicado.",
  },
  diaHoy: "Hoy",
  ajusteTitulo: "¿Tu semana cambió?",
  ajusteTexto: "Pide un ajuste y lo revisamos contigo. Tu plan se adapta a tu vida, no al revés.",
} as const;

// Mi acompañamiento (referencia visual v2 y textos exactos de Diego, 21-oct-2026). Le habla a la
// persona; sin prometer chat ni disponibilidad permanente. «Tu coach» con avatar genérico hasta
// que exista la asignación de coaches (etapa 4A).
// Mi acompañamiento con la referencia de ChatGPT (21-oct-2026, 21:35 UTC). Los textos de la
// portada, de las cuatro acciones y de «Esta semana» son los de la imagen; donde la imagen
// promete algo que no existe (perfil del coach, «En línea», agendar o reprogramar desde aquí),
// se usa el texto de la función real (ver docs/inventario-funciones.md, fila 2).
export const T_ACOMPANAMIENTO = {
  portada: {
    bajada: "No tienes que hacerlo solo. Estamos contigo en este camino.",
    mano: "Pequeños pasos también te llevan lejos.",
    escribir: "Escribir a mi coach",
  },
  coach: {
    titulo: "Tu coach",
    quien: "Te acompaña a avanzar a tu ritmo",
    sinNombre: "Te acompaña en tu proceso, revisa lo que compartes y te ayuda a ajustar el plan cuando lo necesites.",
  },
  mensaje: {
    rotulo: "Un mensaje para ti esta semana",
    inicial: "Para empezar",
    firma: (nombre: string) => `${nombre}, tu coach`,
  },
  acciones: {
    titulo: "Lo que puedes hacer",
    registrar: { titulo: "Registrar mi semana", texto: "Cuéntale a tu coach cómo te fue" },
    costando: { titulo: "Me está costando", texto: "Pide apoyo o un ajuste" },
    videollamada: { titulo: "Mi videollamada", texto: "Hablen en vivo", conEnlace: "Unirme a la videollamada", sinEnlace: "Tu coach te enviará el enlace" },
    revision: { titulo: "Leer mi revisión", texto: "Lo que tu coach vio en tu semana", sinRevision: (dia: string) => `Tu primera revisión es el ${dia}` },
    ajuste: { titulo: "Solicitar un ajuste", texto: "Propón un cambio en tu plan" },
  },
  semana: {
    titulo: "Esta semana",
    completadas: (hechas: number, total: number) => `${hechas} de ${total} ${total === 1 ? "acción completada" : "acciones completadas"}`,
    sinAcciones: "Esta semana no tienes acciones programadas.",
    dia: { completo: "todas hechas", parcial: "algunas hechas", pendiente: "sin registrar", futuro: "todavía no llega", sin: "sin acciones" },
    verPlan: "Ver mi plan",
  },
  botones: {
    costando: "Me está costando",
    escribir: "Escribir mi registro",
  },
  proxima: {
    titulo: "Próxima revisión",
    escrita: "Revisión por escrito",
    videollamada: (hora: string) => `Videollamada · 20 min · ${hora} (hora de Chile)`,
    explicaEscrita: "Puedes contarnos cómo te fue en tu registro. Tu coach lo revisará en la fecha indicada.",
    explicaVideollamada: "Nos encontraremos en tu sesión programada para revisar tus avances y ajustar lo que necesites.",
    sinEnlace: "Tu coach agenda la videollamada y te avisa con el enlace.",
    unirme: "Unirme a la videollamada",
    nuevaVentana: " (se abre en otra ventana)",
    detalles: "Ver detalles",
    noEsChat: "Este espacio no es un chat de respuesta inmediata.",
  },
  historial: {
    titulo: "Historial reciente",
    revision: (n: number) => `Revisión de la semana ${n}`,
    ajuste: "Solicitud de ajuste",
    videollamada: (n: number) => `Videollamada de la semana ${n}`,
    estados: {
      publicada: "Publicada",
      enviada: "Enviada",
      en_revision: "En revisión",
      respondida: "Respondida",
      sin_cambios: "Revisada sin cambios",
      realizada: "Realizada",
      no_asistio: "No se realizó",
      cancelada: "Cancelada",
    },
    fecha: (estado: string, dia: string) => `${estado} el ${dia}`,
    enRevision: (dia: string) => `En revisión · enviada el ${dia}`,
    leerRevision: "Leer la revisión",
    verRespuesta: "Ver respuesta",
    verSolicitud: "Ver mi solicitud",
    vacio: (dia: string) => `Aquí verás las respuestas de tu coach. Tu primera revisión es el ${dia}.`,
    vacioSinFecha: "Aquí verás las respuestas de tu coach.",
  },
  cierre: "No tienes que resolverlo todo hoy. Seguimos avanzando contigo.",
} as const;

export const T_COMUNIDAD = {
  ojo: "Próximamente",
  bajada:
    "Avanzar se siente distinto cuando otras personas entienden el esfuerzo. La comunidad será un lugar para compartir tus avances y conectar con quienes también están ordenando lo que les importa.",
  beneficiosTitulo: "Lo que podrás hacer",
  beneficios: [
    "Celebrar tus avances, grandes o pequeños, con personas que saben lo que cuesta.",
    "Contar lo que te está costando y leer cómo lo resuelven otras personas.",
    "Sentirte parte de un grupo que avanza, cada persona a su ritmo.",
  ],
  // Garantías resumidas: es como la estamos diseñando, no algo que ya funcione.
  privacidad:
    "La estamos diseñando para que participes solo si quieres, con un alias y con moderación de nuestro equipo. Tu plan y tus registros seguirán siendo privados.",
  cuando: "Abriremos la comunidad cuando haya participantes y moderación suficientes. Mientras tanto, tu acompañamiento sigue igual.",
  verMas: "Ver todo lo que viene en Rumbo",
} as const;

// Tarjetas de «Lo que viene en Rumbo» en Mi espacio. Coinciden con loQueViene de data/rumbo.ts
// (la portada); aquí van con su descripción. Ninguna es un enlace ni tiene fecha.
export const T_LO_QUE_VIENE = {
  bajada: "Funciones en las que estamos trabajando. Todavía no están disponibles: las verás en tu espacio cuando funcionen y estén probadas.",
  grupos: [
    {
      titulo: "Para el lanzamiento",
      items: [
        { clave: "comunidad", titulo: "Comunidad con foro moderado", texto: "Comparte avances con un alias, solo si quieres." },
        { clave: "ranking", titulo: "Ranking semanal voluntario", texto: "Por cumplimiento relativo a tu propio plan, con participación opcional." },
        { clave: "fotos", titulo: "Fotografías opcionales y privadas", texto: "Respalda una acción con una foto que solo ve tu coach." },
        { clave: "asistente_ia", titulo: "Asistente con inteligencia artificial", texto: "Propone ideas para tu plan y tu registro. Tu coach revisa y aprueba." },
      ],
    },
    {
      titulo: "Más adelante",
      items: [
        { clave: "especialistas", titulo: "Marketplace de especialistas", texto: "Sesiones con profesionales verificados de distintas áreas." },
        { clave: "reconocimientos", titulo: "Premios y recompensas", texto: "Beneficios por tu constancia, con criterios iguales para todos los planes." },
        { clave: "ia_avanzada", titulo: "Inteligencia artificial avanzada", texto: "Análisis más profundos de tus patrones y tu evolución." },
        { clave: "app_movil", titulo: "Aplicación móvil", texto: "Una aplicación para iOS y Android." },
      ],
    },
  ],
  nota: "No tienen fecha todavía. No necesitas hacer nada para recibirlas.",
} as const;

// ---------------------------------------------------------------------------
// Informe de cierre de ciclo (maqueta de ChatGPT, 30-oct-2026). Todo sale de informe_ciclo, de las
// metas y de los reconocimientos reales; el mensaje lo escribe el coach (sin él, su último foco).

export const T_CIERRE = {
  chip: "Ciclo completado",
  titulo: "Mira todo lo que has avanzado",
  bajada: ["Cada pequeño paso te trajo hasta aquí.", "Este es el camino que construiste."],
  cargando: "Preparando tu informe…",
  objetivo: { uno: "Tu objetivo principal", varios: "Tus objetivos de este ciclo", sinMetas: "Tu plan de este ciclo no tuvo metas cargadas." },
  progreso: {
    titulo: "Tu progreso del ciclo",
    barra: "Acciones hechas de las programadas en el ciclo",
    deTotal: (h: number, p: number) => `${h} de ${p} ${plural(p, "acción hecha", "acciones hechas")}`,
    sinAcciones: "Este ciclo no tuvo acciones programadas.",
    hechas: (n: number) => plural(n, "acción completada", "acciones completadas"),
    racha: (n: number) => plural(n, "día de racha máxima", "días de racha máxima"),
    reconocimientos: (n: number) => plural(n, "reconocimiento ganado", "reconocimientos ganados"),
    completos: (n: number) => plural(n, "día con todo hecho", "días con todo hecho"),
    creditos: (c: number, nivel: number, nombre: string) => `Sumaste ${c} ${plural(c, "crédito", "créditos")} en este ciclo · Nivel ${nivel}: ${nombre}`,
  },
  evolucion: {
    titulo: "Evolución semanal",
    hechas: "Acciones hechas",
    programadas: "Programadas",
    semana: (n: number) => `S${n}`,
    resumen: (s: { semana: number; hechas: number; programadas: number }[]) =>
      `Acciones hechas por semana: ${s.map((x) => `semana ${x.semana}, ${x.hechas} de ${x.programadas}`).join("; ")}.`,
    columnas: ["Semana", "Hechas", "Programadas"] as const,
  },
  areas: { titulo: "Áreas de tu plan", pct: (n: number) => `${n} %`, barra: (m: string) => `Acciones hechas de «${m}»`, valor: (h: number, p: number) => `${h} de ${p} acciones` },
  logros: { titulo: "Logros más destacados", ninguno: "Los reconocimientos que consigas aparecerán aquí.", ver: "Ver Mis logros" },
  coach: {
    mensaje: "Mensaje de tu coach",
    foco: "El último foco de tu coach",
    rol: "Tu coach",
    semana: (n: number) => `Revisión de la semana ${n}`,
  },
  sigue: {
    titulo: "¿Qué sigue ahora?",
    texto: "Lo que sigue lo conversamos contigo: continuar con un nuevo ciclo, reformular tu plan o cerrar aquí.",
    nuevo: "Quiero seguir con un nuevo ciclo",
    descargar: "Descargar mis registros",
    revision: "Ver mi última revisión",
  },
  voz: "Tu valor no se mide en una racha.",
  nota: "Tus registros siguen aquí mientras no pidas eliminarlos.",
} as const;
