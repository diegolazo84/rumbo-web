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

const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);
export const acciones = (n: number) => `${n} ${plural(n, "acción", "acciones")}`;

export const nombrePlan = (p: PlanParam) => planes.find((x) => x.param === p)?.nombre ?? "";

// ---------------------------------------------------------------------------
// Comunes

export const T_COMUN = {
  ejemplo: "Ejemplo",
  pedirAjuste: "Pedir un ajuste",
  ayudaInmediata: "Ayuda inmediata",
  verMiProgreso: "Ver mi progreso",
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
  saludo: (nombre: string) => `Hola, ${nombre}.`,
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
    revision: "Hoy es tu revisión semanal.",
    videollamada: (hora: string) => `Hoy es tu videollamada, a las ${hora}.`,
  },
  diaCompleto: (bono: number) => `Día completo · +${bono}`,
  foco: { rotulo: "Tu foco esta semana · de tu coach" },
  grupos: {
    conHorario: "Con horario",
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
    enlace: "Ver mi progreso",
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
  ajuste: "Pedir un ajuste",
  foto: {
    aviso:
      "Sube una foto de lo que hiciste, por ejemplo tu escritorio ordenado o la página que escribiste. Solo la ven tú y quien te acompaña. No subas fotos de tu cuerpo, fotos íntimas, documentos ni fotos de otras personas.",
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
  ojo: "Progreso",
  titulo: "Lo que vas avanzando.",
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

export const T_CREDITOS = {
  ojo: "Progreso",
  // La especificación no fija el H1 del historial: se usa el texto del enlace que lleva aquí.
  titulo: "El detalle de tus créditos.",
  volver: "Progreso",
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
} as const;
