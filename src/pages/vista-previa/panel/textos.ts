// Textos del panel de Diego (especificación de la plataforma 5) y los textos de /estado/ (3.14)
// que el panel muestra como vista previa al registrar un acuerdo o cerrar una solicitud.
// Texto final de la especificación, tal cual; las funciones reciben el dato ya escrito (nunca se
// publica una llave). Solo vista previa (grupo «panel»): en la etapa 2 se mudan a formularios.ts
// y a plantillas.ts. Los rótulos marcados «(vista previa)» no están en la especificación: son
// el mínimo para que la pantalla se entienda y Diego los revisa.

// ---------------------------------------------------------------------------
// Comunes

export const T_PANEL = {
  ejemplo: "Ejemplo",
  semanaDe: (n: number, de: number) => `Semana ${n} de ${de}`,
  copiar: "Copiar respuesta",
  copiada: "Respuesta copiada.", // (vista previa) anuncio role="status"
  abrirCorreo: "Abrir en el correo",
  cancelar: "Cancelar",
  sinPlazo: "Sin plazo", // (vista previa) grupo de la cola sin fecha
  vistaPrevia: "Vista previa", // punteado = vista previa (5.1)
  copiarEnlace: "Copiar enlace", // 3.13
  enlaceCopiado: "Enlace copiado.", // 3.13
  vence: "Vence",
} as const;

// «hoy», «mañana», «el jueves 16», «pasó su plazo hace 1 día hábil» (5.3)
export const VENCE = {
  hoy: "hoy",
  manana: "mañana",
  el: (dia: string) => `el ${dia}`,
  paso: (n: number) => `pasó su plazo hace ${n} día${n === 1 ? "" : "s"} hábil${n === 1 ? "" : "es"}`,
} as const;

// ---------------------------------------------------------------------------
// 5.3 Hoy

export const HOY_PANEL = {
  ojo: "Panel",
  titulo: "Hoy.",
  vacio: "No tienes nada pendiente con plazo. Las solicitudes nuevas aparecerán aquí.",
  tipos: {
    solicitud: "Solicitud sin primera respuesta",
    revision: "Revisión semanal",
    videollamada: "Resumen de la videollamada",
    reordenamiento: "Reordenamiento",
    ajuste: "Solicitud de ajuste",
    fotos: "Fotos y explicaciones",
    datos: "Petición sobre datos",
    mensaje: "Mensaje de contacto sin responder",
    mantencion: "Mantención",
  },
  reordenamientosUsados: (n: number, de: number) => `Reordenamientos usados: ${n} de ${de} este ciclo`,
  paraRevision: (dia: string) => `Para tu revisión del ${dia}`,
  porRevisar: (n: number) => `${n} por revisar`,
  fijaFecha: "Fija la fecha límite",
  fotosDepurar: (n: number) => `${n} fotos para depurar`,
  respaldo: "Respaldo de esta semana sin confirmar",
  feriados: (anio: number) => `Carga los feriados de ${anio}`,
  cerradas: (fecha: string) => `Postulaciones cerradas desde el ${fecha}`,
  // (vista previa) texto del botón primario de cada tarjeta
  botones: {
    solicitud: "Abrir la solicitud",
    revision: "Hacer la revisión",
    ajuste: "Ver la solicitud de ajuste",
    fotos: "Revisar",
    datos: "Ver la petición",
    mensaje: "Ver el mensaje",
    mantencion: "Ir a mantención",
  },
} as const;

// ---------------------------------------------------------------------------
// 5.4 Solicitudes

export const SOLICITUDES = {
  ojo: "Panel",
  titulo: "Solicitudes.",
  filtros: [
    { valor: "responder", texto: "Por responder" },
    { valor: "conversacion", texto: "En conversación" },
    { valor: "cerradas", texto: "Cerradas" },
    { valor: "intereses", texto: "Intereses" },
    { valor: "marcadas", texto: "Marcadas" },
  ],
  leyendaFiltros: "Filtrar solicitudes", // (vista previa)
  columnas: { apoyo: "Apoyo", recibida: "Recibida", vence: "Vence", marcas: "Marcas", area: "Área" },
  vacio: "No hay solicitudes en este filtro.", // (vista previa)
  marcas: { posible_spam: "Posible spam", posible_duplicado: "Posible duplicado" } as Record<string, string>,
} as const;

// Estados de la solicitud (enum único, 3.14 y 5.4): lo que la persona ve.
export const ESTADO_SOLICITUD: Record<string, { texto: string; variante: "activo" | "nota" }> = {
  recibida: { texto: "Recibida", variante: "activo" },
  en_revision: { texto: "En revisión", variante: "nota" },
  respondida: { texto: "Te escribimos", variante: "activo" },
  acordada: { texto: "Acuerdo listo", variante: "activo" },
  con_espacio: { texto: "Tu espacio está listo", variante: "activo" },
  cerrada: { texto: "Cerrada", variante: "nota" },
  retirada: { texto: "Retirada", variante: "nota" },
  interes: { texto: "Interés anotado", variante: "nota" },
};

export const FICHA_SOLICITUD = {
  ojo: "Solicitud",
  datos: {
    titulo: "Datos", // (vista previa)
    nombre: "Nombre",
    correo: "Correo",
    area: "Área",
    meta: "Meta",
    apoyo: "Apoyo",
    horarios: "Días y franjas",
    zona: "Zona horaria",
    recibida: "Recibida",
    vence: "Vence",
    origen: "Origen",
    marcas: "Marcas",
    duplicada: "Solicitud anterior",
    sinMarcas: "Sin marcas", // (vista previa)
  },
  laPersonaVe: "La persona ve", // (vista previa) rótulo del estado visible en /estado/
  responder: {
    titulo: "Responder", // (vista previa)
    plantilla: "Plantilla",
    copiar: "Copiar respuesta",
    abrir: "Abrir en el correo",
    respondida: "Marcar como respondida",
    porCompletar: "Lo resaltado lo completas tú antes de enviar.", // (vista previa)
  },
  acuerdo: {
    boton: "Registrar acuerdo",
    plan: "Plan",
    precio: "Precio acordado en CLP",
    inicio: "Lunes de inicio",
    semanas: "Semanas",
    diaRevision: "Día de revisión",
    hora: "Hora de videollamada en hora de Chile",
    vistaPrevia: "Lo que verá la persona en /estado/", // (vista previa)
    guardar: "Registrar acuerdo",
  },
  crearEspacio: {
    boton: "Crear su espacio",
    nota: "Solo con el acuerdo aceptado.", // (vista previa) motivo del botón desactivado
  },
  cerrar: {
    boton: "Cerrar",
    motivo: "Motivo",
    motivos: [
      { valor: "capacidad", texto: "Capacidad" },
      { valor: "alcance", texto: "Alcance" },
      { valor: "sin_respuesta", texto: "Sin respuesta" },
    ],
    nota: "Nota para la persona",
    vistaPrevia: "Lo que verá la persona en /estado/", // (vista previa)
    confirmar: "Cerrar la solicitud", // (vista previa)
  },
  enlace: {
    boton: "Nuevo enlace privado",
    ayuda: "Invalida el anterior. El enlace se muestra una sola vez: cópialo al correo.", // (vista previa)
  },
  borrar: {
    boton: "Borrar ahora",
    titulo: "¿Borrar ahora esta solicitud?", // (vista previa)
    texto: "Solo para spam evidente. No se puede deshacer.", // (vista previa)
    cancelar: "Cancelar",
    confirmar: "Borrar ahora",
  },
  notas: {
    etiqueta: "Notas internas",
    ayuda: "Nunca visibles para la persona.", // (vista previa)
  },
} as const;

// Textos de /estado/ (3.14) para la vista previa de acuerdo y cierre.
export const ESTADO_PERSONA = {
  acordadaTitulo: "Revisa y acepta tu acuerdo.",
  acuerdo: {
    titulo: "Tu acuerdo",
    ciclo: (semanas: number, fecha: string) => `Ciclo de ${semanas} semanas desde el lunes ${fecha}`,
    revision: (dia: string) => `Tu revisión semanal: los ${dia}`,
    videollamada: (diaHora: string) => `Tu videollamada semanal: ${diaHora} (hora de Chile)`,
    condiciones: (v: string) => `Lee las Condiciones del piloto (versión ${v})`,
    sinDetalles: "Te escribiremos para cerrar los últimos detalles antes de que aceptes.",
  },
  cerrada: {
    capacidad: {
      titulo: "Por ahora no podremos acompañarte.",
      texto: (conAviso: boolean) =>
        `En esta etapa el piloto acompaña a un grupo pequeño de personas y ya no tenemos espacio. No tiene que ver contigo ni con tu meta. Si abrimos una nueva etapa, lo publicaremos en la web${conAviso ? " y te avisaremos, como nos autorizaste" : ""}.`,
    },
    alcance: {
      titulo: "Por ahora Rumbo no es el apoyo adecuado para tu meta.",
      texto: () =>
        "Lo que nos cuentas está fuera de lo que Rumbo acompaña en este piloto: proyectos, estudio y organización. No es un juicio sobre ti ni sobre tu meta. Si te sirve, un profesional de salud puede orientarte mejor.",
    },
    sin_respuesta: {
      titulo: "Cerramos tu solicitud.",
      texto: () => "Te escribimos dos veces y no tuvimos respuesta. Si todavía te interesa, puedes volver a postular cuando quieras.",
    },
  } as Record<string, { titulo: string; texto: (conAviso: boolean) => string }>,
  notaDe: (nombre: string) => `Nota de ${nombre}`,
} as const;

// «Nota de {nombreCoach}»: la misma función de formularios.ts (glosario 1.4).
export { nombreCoach } from "../../../data/formularios";

// ---------------------------------------------------------------------------
// 5.5 Participantes

export const PARTICIPANTES = {
  ojo: "Panel",
  titulo: "Participantes.",
  vacio: "Todavía no hay participantes. Se crean desde una solicitud con acuerdo aceptado.",
  columnas: { plan: "Plan", semana: "Semana", proxima: "Próxima revisión", estado: "Estado del ciclo" },
  estadosCiclo: {
    preparacion: "Programa en preparación", // (vista previa) 4.3.1
    en_curso: "En curso", // (vista previa)
    pausa: "En pausa",
    cerrado: "Cerrado", // (vista previa)
  } as Record<string, string>,
} as const;

// Panel del coach con la referencia de ChatGPT (21-oct-2026, 21:35 UTC): «Mis participantes».
export const MIS_PARTICIPANTES = {
  titulo: "Mis participantes",
  filtros: {
    etiqueta: "Filtrar participantes",
    todos: "Todos",
    revision: "Revisión esta semana",
    atencion: "Necesita atención",
    sinRegistro: "Sin registro",
  },
  buscar: "Buscar participante…",
  buscarEtiqueta: "Buscar participante por nombre",
  columnas: { participante: "Participante", progreso: "Progreso semana", proxima: "Próxima revisión", estado: "Estado", ver: "Ver" },
  plan: (nombre: string) => `Plan: ${nombre}`,
  progreso: (hechas: number, total: number) => `${hechas} de ${total}`,
  sinAcciones: "Sin acciones",
  estados: {
    al_dia: "Al día",
    sin_registro: "Sin registro",
    necesita_apoyo: "Necesita apoyo",
    preparacion: "Programa en preparación",
    pausa: "En pausa",
    cerrado: "Cerrado",
  },
  motivos: {
    ajuste: "ajuste sin responder",
    evidencia: "evidencia por revisar",
    sin_actividad: "3 días o más sin registrar",
    registro: "no envió su registro semanal",
  },
  ver: (nombre: string) => `Ver a ${nombre}`,
  ninguno: "No hay participantes con este filtro.",
  vacio: "Todavía no hay participantes. Se crean desde una solicitud con acuerdo aceptado.",
  actividad: {
    titulo: "Actividad reciente",
    accion: (n: string) => `${n} completó una acción`,
    registro: (n: string) => `${n} envió su registro semanal`,
    ajuste: (n: string) => `${n} envió una solicitud de ajuste`,
    hoy: (h: string) => `Hoy, ${h}`,
    ayer: (h: string) => `Ayer, ${h}`,
    vacio: "Todavía no hay actividad esta semana.",
  },
  hoy: {
    titulo: "Revisiones de hoy",
    escrita: (n: string) => `Revisión escrita de ${n}`,
    videollamada: (n: string) => `Videollamada con ${n}`,
    duracion: (h: string) => `${h} · 20 min`,
    porEscrito: "Por escrito",
    iniciar: "Iniciar",
    iniciarDe: (n: string) => `Iniciar la revisión de ${n}`,
    vacio: "Hoy no tienes revisiones pendientes.",
  },
} as const;

export const FICHA_PARTICIPANTE = {
  ojo: "Participante",
  proxima: (dia: string) => `Próxima revisión: ${dia}`, // (vista previa)
  pestanas: [
    { valor: "programa", texto: "Programa" },
    { valor: "semana", texto: "Semana" },
    { valor: "revisiones", texto: "Revisiones" },
    { valor: "ajustes", texto: "Ajustes" },
    { valor: "fotos", texto: "Fotos" },
    { valor: "datos", texto: "Datos" },
  ],
  programa: {
    version: (v: number) => `Versión ${v}`, // (vista previa)
    publicada: (v: number) => `Versión ${v} · publicada`, // (vista previa)
    publicadaEtiqueta: "Publicada", // (vista previa)
    publicadaEl: (v: number, fecha: string) => `Versión ${v} · publicada el ${fecha}`, // (vista previa)
    todosLosDias: "Todos los días", // (vista previa)
    borrador: "Borrador · todavía no lo ve",
    historial: "Historial de versiones", // (vista previa)
    editar: "Editar en el constructor",
    verComo: (nombre: string) => `Ver como ${nombre}`,
  },
  semana: {
    hecha: "Hecha",
    corta: "Hecha (versión corta)",
    dejada: "La dejó pasar", // (vista previa) solo lectura del lado de Diego
    revision: "En revisión",
    sinRegistro: "Sin registro", // (vista previa)
    sinAcciones: "Sin acciones programadas",
    diaCompleto: (n: number) => `Día completo · +${n}`,
    noEmpieza: "Esta semana aún no empieza.", // 4.11
    pie: (hechas: number, de: number) => `Esta semana registró ${hechas} de ${de} acciones programadas hasta hoy.`, // (vista previa) 4.7.3 en tercera persona
  },
  revisiones: {
    semana: (n: number) => `Semana ${n}`,
    registro: "Registro de la persona", // (vista previa)
    revision: "Revisión publicada", // (vista previa)
    sinRegistro: "No escribió registro esta semana.", // (vista previa)
    sinRevision: "Todavía sin revisión.", // (vista previa)
  },
  ajustes: { reordenamientos: (n: number, de: number) => `Reordenamientos usados: ${n} de ${de} este ciclo` },
  fotos: { vacio: "No hay fotos en este ciclo." }, // (vista previa)
  datos: {
    correo: "Correo",
    zona: "Zona horaria",
    zonaAyuda: "Editable solo aquí.", // (vista previa)
    ciclos: "Ciclos",
    exportar: "Exportar sus datos (JSON)",
    peticiones: "Peticiones abiertas",
    sinPeticiones: "Sin peticiones abiertas.", // (vista previa)
    eliminar: "Eliminar participante",
    eliminarAyuda: "Procedimiento de 3 pasos (6.11).", // (vista previa)
    // 6.11, resumido para Diego (vista previa)
    eliminarPasos: [
      "Panel: lista y borra sus archivos del bucket con la API de Storage.",
      "Panel: eliminar_participante anonimiza su solicitud y borra la ficha, su programa, registros, progreso, revisiones y solicitudes de ajuste; deja constancia en auditoría sin contenido.",
      "Diego: borra el usuario en Supabase → Authentication → Users.",
    ],
    cancelar: "Cancelar",
    ciclo: (inicio: string, fin: string | null) => `Ciclo 1 · desde el ${inicio}${fin ? ` al ${fin}` : ""}`, // (vista previa)
  },
  ciclo: {
    titulo: "Acciones del ciclo", // (vista previa)
    pausar: "Pausar",
    motivo: "Motivo",
    motivos: [
      { valor: "pedida", texto: "Pedida" },
      { valor: "cuidado", texto: "Cuidado" },
    ],
    desde: "Desde",
    hasta: "Hasta",
    reanudar: "Reanudar",
    cerrar: "Cerrar ciclo",
    nuevo: "Nuevo ciclo",
    extender: "Extender el ciclo",
    fin: "Fecha de fin", // (vista previa)
  },
} as const;

// ---------------------------------------------------------------------------
// 5.6 Constructor

export const CONSTRUCTOR = {
  ojo: "Constructor",
  titulo: (nombre: string) => `Programa de ${nombre}.`, // (vista previa)
  movil: "El constructor se usa en un computador. Desde aquí puedes ver el programa publicado.",
  borrador: "Borrador · todavía no lo ve",
  publicado: (v: number) => `Versión ${v} · publicada`, // (vista previa) en el teléfono se ve el programa publicado
  metas: {
    titulo: "Metas",
    tituloCampo: "Título",
    paraQue: "Para qué",
    paraQueAyuda: "En palabras de la persona.",
    categoria: "Categoría",
    hitos: "Hitos",
    subir: "Subir",
    bajar: "Bajar",
  },
  semana: {
    titulo: "Semana", // (vista previa)
    minutos: (n: number) => `${n} min`,
    sinAcciones: "Sin acciones programadas",
    cruce: (otra: string) => `Se cruza con “${otra}”`,
    seMarcaDesde: (dia: string) => `Se marca desde el ${dia}.`, // 4.7.2
    semanaN: (n: number) => `Semana ${n}`,
  },
  accion: {
    titulo: "Acción", // (vista previa)
    nueva: "Nueva acción", // (vista previa)
    tituloCampo: "Título",
    tituloAyuda: "Verbo + objeto, 2 a 60 («Reservar 2 bloques de trabajo»).",
    meta: "Meta",
    horario: "Horario",
    conHorario: "Con horario",
    flexible: "Flexible",
    hora: "Hora de inicio",
    duracion: "Duración (minutos)",
    duracionAyuda: "5 a 240 min.",
    dias: "Días",
    desdeSemana: "Desde la semana",
    durante: "Durante (semanas)",
    duranteAyuda: "La rutina de 1 a 4 semanas.",
    instrucciones: "Instrucciones",
    instruccionesAyuda: "Qué, cómo y dónde.",
    versionCorta: "Versión corta",
    versionCortaAyuda: "«Si el día se complica, la versión corta es…»",
    conFoto: "Con foto",
    conFotoAyuda: "Solo en Acompañamiento cercano.",
    // Acción medible (C4; maqueta «Registrar acción», 30-oct-2026). PROPUESTO.
    medible: "Se mide con una cantidad",
    medibleAyuda: "La persona anota cuánto hizo al registrarla. No cambia los créditos.",
    objetivo: "Cantidad propuesta",
    objetivoAyuda: "Un número entero, de 1 a 10.000.",
    unidad: "Unidad",
    unidadOtra: "otra",
    unidadCual: "¿Cuál unidad?",
    errores: {
      titulo: "Escribe un título de 2 a 60 caracteres.", // (vista previa)
      duracion: "La duración va de 5 a 240 minutos.", // (vista previa)
      dias: "Elige al menos un día.", // (vista previa)
      instrucciones: "Escribe las instrucciones.", // (vista previa)
      objetivo: "La cantidad propuesta va de 1 a 10.000.",
      unidad: "Escribe la unidad (hasta 20 caracteres).",
    },
    fotoAviso: "Más de 1 acción con foto por semana: es alcance comercial, no cuota técnica.", // (vista previa) 5.6
  },
  resumen: { titulo: "Resumen por meta", porSemana: (n: number) => `${n} min por semana` },
  cruces: {
    aviso: (n: number) => `${n} solapamiento${n === 1 ? "" : "s"}`, // (vista previa)
    compatibles: "Sí, son compatibles",
    permitidos: "Hay acciones a la misma hora. Se publican igual: revisa que la persona pueda hacerlas juntas o cambia una de hora.",
  },
  vistaPrevia: "Vista previa",
  cerrarVistaPrevia: "Volver al constructor", // (vista previa)
  publicar: {
    boton: "Publicar",
    titulo: "Antes de publicar", // (vista previa)
    inicio: "Fecha de inicio (lunes)",
    metas: "Cada meta con al menos 1 acción",
    instrucciones: "Cada acción con instrucciones",
    cruces: "Solapamientos resueltos o aceptados",
    vigencia: "Vigencia",
    vigenciaAyuda: "Desde qué día ve la persona el programa nuevo. Por defecto, desde mañana. No puede ser un día en que ya marcó acciones.", // (vista previa)
    nota: "Nota de cambios",
    notaAyuda: "La persona la ve como novedad.",
    foco: "Foco inicial",
    confirmar: "Publicar", // (vista previa)
    listo: ": listo", // (vista previa) texto oculto de cada punto de la lista
    falta: ": falta", // (vista previa)
    simulado: "Vista previa: no se publicó nada. En la etapa 3, aquí corre publicar_programa.", // (vista previa)
  },
  dias: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
} as const;

// ---------------------------------------------------------------------------
// 5.7 Revisión semanal

export const REVISION = {
  ojo: "Revisión semanal",
  tituloCercano: "Resumen de la videollamada",
  titulo: (nombre: string, semana: number) => `Revisión de ${nombre} · semana ${semana}.`, // (vista previa)
  izquierda: {
    semana: "Su semana", // (vista previa)
    porMeta: (hechas: number, de: number) => `${hechas} de ${de} acciones programadas`,
    diasCompletos: (n: number) => `Días completos: ${n}`, // (vista previa)
    dejadas: (n: number) => `Dejadas pasar: ${n}`, // (vista previa)
    registro: "Su registro", // (vista previa)
    carga: "Carga",
    ajustes: "Solicitudes de ajuste", // (vista previa)
    fotos: "Fotos", // (vista previa)
    sinAjustes: "Sin solicitudes de ajuste esta semana.", // (vista previa)
    sinFotos: "Sin fotos esta semana.", // (vista previa)
  },
  sinRegistro: "Revisión a partir de lo que marcó en el calendario",
  funciono: { etiqueta: "Qué funcionó" },
  ajustamos: { etiqueta: "Qué ajustamos", constructor: "Abrir el constructor" },
  foco: { etiqueta: "Tu foco de la semana" },
  publicar: "Publicar revisión",
  publicada: "Vista previa: la revisión no se publicó.", // (vista previa)
  // Recordatorio fijo de 5.7, completo. Cita palabras prohibidas para pedir que no se usen: es
  // una excepción explícita del guardián (scripts/marcadores.mjs, EXCEPCIONES).
  recordatorio: "Escribe sobre la dificultad, no sobre la persona. Evita “fallaste”, “disciplina”, “fuerza de voluntad”, “sin excusas”.",
  errores: {
    funciono: "Escribe qué funcionó.", // (vista previa)
    foco: "Escribe el foco de la semana.", // (vista previa)
  },
} as const;

// ---------------------------------------------------------------------------
// 5.8 Fotos y explicaciones

export const FOTOS = {
  ojo: "Panel",
  titulo: "Fotos y explicaciones.",
  vacio: "No hay fotos por revisar.",
  fijo: "No pedimos fotos íntimas ni documentos de salud. Si llega una, no la apruebes, usa la plantilla de privacidad y elimínala.",
  eliminarArchivo: "Eliminar archivo ahora",
  aprobar: "Aprobar",
  noAprobar: "No aprobar",
  aprobada: "Aprobada · +1 crédito",
  noAprobada: "No aprobada",
  nota: "Nota para la persona", // (vista previa)
  plantillas: [
    "No alcanzo a ver la acción en la foto. ¿Puedes enviar otra?",
    "La foto muestra a otra persona o datos personales; por privacidad no podemos guardarla.",
    "Para esta acción basta con marcarla; no necesitas foto.",
  ],
  plantillasLeyenda: "Plantillas", // (vista previa)
  confirmarNo: "No aprobar", // (vista previa)
  miniatura: "Miniatura de ejemplo: aquí va la foto con una URL firmada de 120 s", // (vista previa)
  explicacion: "Explicación", // (vista previa)
  sinFoto: "Sin foto: «No puedo subir una foto»", // (vista previa)
  errorNota: "Escribe la nota para la persona.", // (vista previa)
  archivoEliminado: "Archivo eliminado.", // (vista previa)
} as const;

// ---------------------------------------------------------------------------
// 5.9 Solicitudes de ajuste

export const AJUSTES = {
  ojo: "Panel",
  titulo: "Solicitudes de ajuste.",
  estados: {
    enviada: { texto: "Enviada", variante: "nota" },
    en_revision: { texto: "En revisión", variante: "nota" },
    respondida: { texto: "Respondida", variante: "activo" },
    sin_cambios: { texto: "Sin cambios", variante: "nota" },
  } as Record<string, { texto: string; variante: "activo" | "nota" }>,
  cuentaReordenamiento: "Cuenta como reordenamiento",
  resolver: "Resolver en el constructor",
  respuesta: "Respuesta", // (vista previa)
  responder: "Responder", // (vista previa)
  sinCambios: "Sin cambios",
  explicacion: "Explicación", // (vista previa)
  acciones: "Acciones", // (vista previa)
  desde: "Desde", // (vista previa)
  detalle: "Detalle", // (vista previa)
  enviadaEl: (dia: string) => `Enviada el ${dia}`, // (vista previa)
  errorRespuesta: "Escribe la respuesta.", // (vista previa)
  ayudaRespuesta: "La persona la ve en Mi espacio. Si no hay cambios, explica por qué.", // (vista previa)
} as const;

// ---------------------------------------------------------------------------
// 5.10 Contacto y derechos

export const CONTACTO_PANEL = {
  ojo: "Panel",
  correo: "Correo",
  titulo: "Contacto y derechos.",
  mensajes: {
    titulo: "Mensajes",
    ayuda: "Consultas generales que llegan por el formulario de contacto.",
    cerrados: "Respondidos y archivados",
    reabrir: "Volver a abrir",
    estados: { nuevo: "Nuevo", respondido: "Respondido", archivado: "Archivado" } as Record<string, string>,
    motivo: "Motivo", // (vista previa)
    recibido: "Recibido", // (vista previa)
    respuesta: "Tu respuesta", // (vista previa)
    archivar: "Archivar", // (vista previa)
    respondido: "Marcar como respondido", // (vista previa)
  },
  peticiones: {
    titulo: "Peticiones sobre datos",
    ayuda: "Pedidos legales sobre datos personales (ver, corregir o borrar sus datos). Tienen plazo legal para responder. Llegan desde Mi espacio o cuando alguien elige «Mis datos personales» en el formulario de contacto.",
    cerradas: "Resueltas",
    reabrir: "Volver a abrir",
    tipo: "Tipo",
    tipoAyuda: "Si vino por contacto, clasifícala.", // (vista previa)
    recibida: "Recibida",
    fechaLimite: "Fecha límite",
    fijaFecha: "Fija la fecha límite",
    estado: "Estado",
    exportar: "Exportar sus datos (JSON)",
    eliminar: "Eliminar participante",
    resuelta: "Marcar como resuelta",
    respuesta: "Respuesta", // (vista previa)
    abierta: "Abierta", // (vista previa)
    resueltaEtiqueta: "Resuelta", // (vista previa)
    soloParticipantes: "Esta persona no es participante: no hay un espacio que eliminar.", // (vista previa)
  },
} as const;

// ---------------------------------------------------------------------------
// 5.11 Más

export const MAS = {
  ojo: "Panel",
  titulo: "Más.",
  contacto: "Contacto y derechos",
  postulaciones: {
    titulo: "Postulaciones",
    recibir: "Recibir solicitudes",
    tope: "Tope por día",
    ayuda: "Con el tope alcanzado, la página muestra un aviso honesto y ofrece dejar el correo.",
  },
  ausencia: {
    titulo: "Ausencia",
    hasta: "Estoy fuera hasta el",
    texto: "Texto",
    ejemplo: "Tu coach vuelve el lunes 19 de octubre.",
    efecto: "Mientras dure: banda en Mi espacio, aviso en /postular/ y los plazos de solicitudes se cuentan desde el regreso.", // 5.11
  },
  feriados: {
    titulo: "Feriados",
    agregar: "Agregar feriado",
    fecha: "Fecha", // (vista previa)
    nombre: "Nombre", // (vista previa)
    fuente: "Fuente: el calendario oficial de feriados de Chile.",
  },
  mantencion: {
    titulo: "Mantención",
    fotos: "Fotos para depurar",
    depurar: "Depurar",
    // 5.11 en palabras simples (la especificación técnica: API de Storage y la fecha de depuración).
    depurarAyuda: "Borra los archivos de las fotos revisadas hace más de 30 días y deja anotada la fecha. El crédito de cada acción se mantiene.",
    huerfanos: "Archivos huérfanos",
    sinHuerfanos: "Sin archivos huérfanos.", // (vista previa)
    respaldo: "Último respaldo",
    confirmo: "Confirmo que revisé el respaldo de esta semana",
  },
  cuenta: {
    titulo: "Cuenta",
    factores: "Factores MFA registrados",
    deben: "Deben ser 2.", // 5.11
    salir: "Salir",
  },
} as const;

// ---------------------------------------------------------------------------
// Panel real (etapa 3). PROPUESTO: la especificación no fija estos textos (errores, avisos de
// guardado y el segundo factor); Diego los revisa.

export const PANEL_REAL = {
  error: "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.",
  guardado: "Guardado.",
  noEncontrada: "No encontramos esta ficha. Puede que se haya borrado.",
  volver: "Volver",
  errores: {
    "acuerdo:requerido": "Registra el acuerdo antes de cambiar el estado.",
    "consulta:no_por_revisar": "Esta respuesta ya fue revisada o ya no está pendiente.",
    "ia:sin_clave": "Falta la clave de OpenAI en el Vault de Supabase. Sin ella el asistente no se puede encender.",
    "ia:config_invalida": "Algún valor está fuera de rango. Revisa los límites.",
    "texto:invalido": "La respuesta puede tener hasta 2000 caracteres.",
    "solicitud:sin_aceptar": "La persona todavía no acepta el acuerdo.",
    "token:invalido": "No se pudo generar el enlace. Inténtalo de nuevo.",
    "vigencia:pasada": "La vigencia no puede ser una fecha pasada.",
    "vigencia:con_registros": "Esa fecha ya tiene acciones registradas: elige una vigencia posterior.",
    "meta:sin_acciones": "Cada meta necesita al menos 1 acción.",
    "programa:solapamientos": "Hay solapamientos: márcalos como compatibles o resuélvelos.",
    "programa:no_es_borrador": "Este programa ya se publicó y no se puede editar. Para cambiarlo, crea un borrador nuevo.",
    "nota:requerida": "Escribe la nota para la persona.",
    "registro:no_pendiente": "Esta evidencia ya fue revisada.",
    "fotos:borrar_primero": "Primero hay que borrar sus fotos del almacenamiento.",
    "sesion:no_autorizado": "Tu sesión no tiene el segundo factor. Vuelve a entrar al panel.",
    "mensaje:corto": "Escribe un mensaje de al menos 10 caracteres.",
    "mensaje:largo": "El mensaje puede tener hasta 800 caracteres.",
    "ciclo:no_termina": "El mensaje de cierre se escribe desde la última semana del ciclo.",
    "nombre:largo": "Escribe un nombre de 2 a 60 caracteres.",
    "nombre:en_uso": "Ya existe un grupo con ese nombre.",
    "descripcion:largo": "La descripción es demasiado larga.",
    "titulo:largo": "Escribe un título de 3 a 80 caracteres.",
    "reglas:largo": "Escribe las reglas (10 a 1000 caracteres).",
    "dias:invalido": "La duración va de 7 a 60 días.",
    "inicio:invalido": "Elige la fecha de inicio.",
    "inicio:pasado": "La fecha de inicio no puede ser pasada.",
    "desafio:con_participantes": "Ya hay personas participando: la duración y el inicio no se pueden cambiar.",
    "publicacion:no_encontrada": "La publicación ya no está disponible.",
    "motivo:invalido": "Elige el motivo para ocultarla.",
    "destacado:inactivo": "Un grupo inactivo no puede ser el destacado.",
    "categoria:invalida": "Elige una categoría de la lista.",
    "propuesta:no_encontrada": "Esa propuesta ya fue respondida.",
    "modulo:no_encontrado": "Ese módulo ya no existe.",
    "estado:invalido": "Elige un estado de la lista.",
    "estado:sin_probar": "Para habilitarlo, primero márcalo como probado.",
    "respaldo:requerido": "Anota qué lo respalda para marcarlo operativo.",
    "correo:invalido": "Escribe un correo válido, por ejemplo nombre@correo.cl.",
    "invitacion:ya_en_equipo": "Esa persona ya es parte del equipo.",
    "invitacion:es_participante": "Ese correo es de una persona participante. Para el equipo, usa otro correo.",
    "invitacion:ya_invitada": "Ese correo ya tiene una invitación vigente.",
    "invitacion:no_encontrada": "Esa invitación ya no está vigente.",
    "coach:no_encontrado": "Esa persona ya no está activa en el equipo.",
    "coach:con_participantes": "Todavía acompaña a personas: asígnalas a otro coach antes de desactivarlo.",
    "equipo:sin_dueno": "Siempre debe quedar un dueño activo.",
    "participante:no_encontrado": "No encontramos a esa persona. Puede que se haya borrado.",
    "presentacion:largo": "La presentación puede tener hasta 400 caracteres.",
    "motivo:corto": "Escribe el motivo con al menos 10 caracteres.",
    "plan:sin_videollamada": "Este ciclo es del plan con revisión escrita: no lleva videollamadas.",
    "ciclo:no_activo": "El ciclo no está activo (está en pausa o cerrado).",
    "semana:invalida": "Elige una semana del ciclo.",
    "fecha:invalida": "Elige una fecha y una hora que todavía no hayan pasado.",
    "enlace:invalido": "Pega el enlace completo de la videollamada; debe empezar con https://.",
    "videollamada:ya_registrada": "Esa videollamada ya quedó anotada y no se puede reprogramar.",
    "fecha:aun_no_ocurre": "Todavía no llega la hora de la videollamada. Por ahora solo se puede cancelar.",
  } as Record<string, string>,
  solicitud: {
    aceptada: (fecha: string) => `La persona aceptó el acuerdo el ${fecha}.`,
    sinAceptar: "La persona todavía no acepta el acuerdo.",
    inicioLunes: "El inicio tiene que ser un lunes.",
    precio: "Escribe el precio acordado.",
    espacioCreado: "Su espacio está creado. Copia la plantilla «Tu espacio está listo» y envíasela.",
    verParticipante: "Abrir su ficha",
    notasGuardadas: "Notas guardadas.",
  },
  participante: {
    sinPrograma: "Todavía no hay un programa publicado.",
    zonaGuardada: "Zona horaria guardada.",
    cerrarConfirmar: "¿Cerrar este ciclo? La persona deja de ver su espacio.",
    eliminarEscribe: "Escribe ELIMINAR para confirmar el paso 2.",
    eliminarBoton: "Eliminar la ficha (paso 2)",
    eliminado: "Ficha eliminada. Falta el paso 3: borrar el usuario en Supabase → Authentication → Users.",
  },
  constructor: {
    nuevaMeta: "Nueva meta",
    eliminarMeta: "Eliminar meta",
    eliminarAccion: "Eliminar acción",
    hito: "Nuevo hito",
    agregarHito: "Agregar hito",
    guardar: "Guardar borrador",
    guardado: "Borrador guardado. Solo lo ve el equipo hasta que lo publiques.",
    alDia: "El borrador ya está guardado: no hay cambios pendientes.",
    yaPublicado: (n: number) => `La versión ${n} está publicada y la persona ya la ve. Para cambiarla, crea un borrador nuevo: copia lo publicado.`,
    sinMetas: "Todavía no hay metas. Agrega la primera.",
    sinAcciones: "Elige una acción de la semana o agrega una nueva.",
    agregarA: (meta: string) => (meta.trim() ? `Agregar una acción a «${meta.trim()}»` : "Agregar una acción a esta meta"),
    crear: "Crear el borrador",
    crearAyuda: "El borrador copia el programa publicado (si hay) como versión nueva. La persona no lo ve hasta publicar.",
    publicado: (n: number) => `Programa publicado: ${n} acciones fechadas en Mi espacio.`,
    cargaBase: (min: number, fecha: string) => `Revisión final: el día más cargado es el ${fecha}, con ${min} min.`,
    crucesBase: (n: number) => (n ? `Revisión final: hay ${n} ${n === 1 ? "choque" : "choques"} de horario entre acciones.` : "Revisión final: ninguna acción choca de horario con otra."),
    erroresMeta: "Cada meta necesita un título de 2 a 80 caracteres.",
    erroresAccion: (titulo: string, semana: number, faltan: string[]) =>
      `Falta completar la acción ${titulo ? `«${titulo}»` : "sin título"} (semana ${semana}): ${faltan.join(", ")}. Te la dejamos abierta.`,
    campos: { titulo: "título", dias: "días", duracion: "duración de 5 a 240 minutos", instrucciones: "instrucciones", objetivo: "cantidad propuesta de 1 a 10.000", unidad: "unidad" },
    sinDias: "Sin día asignado",
  },
  revision: {
    publicada: "Revisión publicada. La persona la ve en Mi espacio.",
    yaPublicada: (fecha: string) => `Publicada el ${fecha}.`,
  },
  ajustes: {
    vacio: "No hay solicitudes de ajuste abiertas.",
  },
  revisar: {
    sinMiniatura: "Las fotos llegan en la etapa 4; por ahora solo hay explicaciones.",
  },
  mas: {
    factoresTexto: (n: number) => `${n} registrado${n === 1 ? "" : "s"}.`,
    agregarFactor: "Registrar otro factor",
  },
  mfa: {
    ojo: "Panel",
    titulo: "Segundo factor.",
    pedir: "Escribe el código de 6 dígitos de tu app de autenticación.",
    registrar: "Registra un factor TOTP: escanea el código con tu app de autenticación (o escribe la clave a mano) y escribe el código que te muestra.",
    segundo: "Registra también un segundo factor en otro dispositivo o gestor de claves: deben ser 2.",
    qr: "Código QR del factor TOTP",
    clave: "Clave para escribirla a mano",
    codigo: "Código de 6 dígitos",
    verificar: "Verificar",
    noCoincide: "Ese código no coincide. Revisa la hora de tu teléfono y escribe el código nuevo.",
    error: "No se pudo verificar. Revisa tu conexión e inténtalo de nuevo.",
    sinAcceso: "Esta cuenta no tiene acceso al panel.",
    sinAccesoTexto: "El panel es solo para el equipo de Rumbo. Si tienes un programa, está en Mi espacio.",
    invitacion: {
      titulo: "¿Te invitaron al equipo?",
      texto: "No encontramos una invitación vigente para el correo con que entraste. Si te acaban de invitar, pulsa el botón para buscarla de nuevo. Después vas a registrar tu segundo factor.",
      buscando: "Buscando tu invitación…",
      buscandoTexto: "Si te invitaron al equipo con este correo, la aceptamos y pasas a registrar tu segundo factor.",
      boton: "Aceptar mi invitación",
      noHay: "No encontramos una invitación vigente para este correo. Pide que te inviten de nuevo, con el correo con que entraste.",
    },
    irAMiEspacio: "Ir a Mi espacio",
    salir: "Salir",
    nombreFactor: (n: number) => `TOTP ${n}`,
  },
} as const;

// ---------------------------------------------------------------------------
// Comunidad (panel real): reportes, grupos y desafíos. Solo quienes moderan (dueño o coach con permiso).
export const COMUNIDAD_PANEL = {
  ojo: "Panel",
  titulo: "Comunidad.",
  bajada: "Revisa los reportes y prepara los grupos y desafíos. Las personas solo ven la comunidad cuando el módulo está habilitado.",
  enlace: "Comunidad: reportes, grupos y desafíos",
  sinPermiso: "Tu cuenta no tiene permiso para moderar la comunidad. El dueño puede dártelo en el equipo.",
  modulo: {
    titulo: "Estado del módulo",
    estados: {
      planificado: "Planificado",
      desarrollado: "Desarrollado",
      probado: "Probado",
      habilitado: "Habilitado",
      operativo: "Operativo",
    } as Record<string, string>,
    cerrada: "Cerrada para participantes: solo el equipo la ve.",
    abierta: "Abierta para participantes.",
    sinFila: "Sin registro del módulo «comunidad»: está cerrada para participantes.",
  },
  motivos: {
    respeto: "Falta de respeto o acoso",
    privacidad: "Expone datos personales",
    salud: "Consejo de salud riesgoso",
    spam: "Publicidad o spam",
    otro: "Otro motivo",
  } as Record<string, string>,
  tipos: { general: "Publicación", progreso: "Progreso", pregunta: "Pregunta", consejo: "Consejo", logro: "Logro" } as Record<string, string>,
  reportes: {
    titulo: "Reportes abiertos",
    vacio: "No hay reportes abiertos.",
    reportes: (n: number) => `${n} reporte${n === 1 ? "" : "s"}`,
    respuesta: "Comentario",
    publicada: "Publicada",
    contenido: "Contenido reportado",
    motivos: "Motivos de los reportes",
    detalle: "Lo que escribieron quienes reportaron",
    decision: "Decisión de moderación",
    motivoAyuda: "Solo se usa si la ocultas. Ocultar no borra: queda para revisión y auditoría.",
    conFoto: "Con foto",
    verFoto: "Foto adjunta",
    motivo: "Motivo para ocultar",
    ocultar: "Ocultar",
    dejar: "Dejar visible",
    ocultada: "Ocultada. Los reportes quedan resueltos.",
    dejada: "Sigue visible. Los reportes quedan resueltos.",
    noDisponible: "La publicación ya no está disponible (su autor la borró).",
  },
  ocultas: {
    titulo: "Ocultas recientemente",
    vacio: "No hay publicaciones ocultas.",
    motivo: "Motivo",
    ocultaEl: "Ocultada",
    mostrar: "Volver a mostrar",
  },
  grupos: {
    titulo: "Grupos",
    vacio: "Todavía no hay grupos.",
    nuevo: "Nuevo grupo",
    editar: "Editar",
    cancelar: "Cancelar",
    guardar: "Guardar grupo",
    nombre: "Nombre",
    descripcion: "Descripción",
    ilustracion: "Ilustración",
    sinIlustracion: "Sin ilustración",
    activo: "Activo (las personas lo ven y pueden unirse)",
    inactivo: "Inactivo",
    miembros: (n: number) => `${n} miembro${n === 1 ? "" : "s"}`,
    guardado: "Grupo guardado.",
    errorNombre: "Escribe un nombre de 2 a 60 caracteres.",
    categoria: "Categoría",
    sinCategoria: "Sin categoría",
    categoriaAyuda: "Se sugiere a quienes tienen metas de esa área.",
    categorias: { proyecto: "Proyecto", orden: "Organización", bienestar: "Bienestar" } as Record<string, string>,
    destacado: "Grupo destacado (aparece primero en Grupos de la comunidad; solo uno a la vez)",
    esDestacado: "Destacado",
  },
  propuestas: {
    titulo: "Propuestas de grupos",
    ayuda: "Lo que proponen las personas, con su alias. Si creas el grupo, márcala como creada.",
    vacio: "No hay propuestas.",
    propuso: (alias: string, fecha: string) => `Propuesto por ${alias} el ${fecha}`,
    sinAlias: "una persona",
    estados: { pendiente: "Pendiente", creada: "Creada", descartada: "Descartada" } as Record<string, string>,
    creada: "Marcar como creada",
    descartar: "Descartar",
  },
  desafios: {
    titulo: "Desafíos",
    vacio: "Todavía no hay desafíos.",
    ayuda: "Participar es voluntario. Un día cuenta cuando la persona hace todas sus acciones programadas. No suman créditos ni cambian rachas.",
    nuevo: "Nuevo desafío",
    editar: "Editar",
    cancelar: "Cancelar",
    guardar: "Guardar desafío",
    tituloCampo: "Título",
    descripcion: "Objetivo",
    reglas: "Reglas",
    dias: "Duración (días)",
    diasAyuda: "De 7 a 60 días.",
    inicio: "Fecha de inicio",
    fechasEtiqueta: "Fechas",
    inicioAyuda: "No puede ser una fecha pasada. Con personas participando, la duración y el inicio ya no cambian.",
    ilustracion: "Ilustración",
    activo: "Activo (las personas lo ven y pueden unirse)",
    inactivo: "Inactivo",
    participantes: (n: number) => `${n} participante${n === 1 ? "" : "s"}`,
    fechas: (inicio: string, fin: string) => `Del ${inicio} al ${fin}`,
    guardado: "Desafío guardado.",
    errores: {
      titulo: "Escribe un título de 3 a 80 caracteres.",
      reglas: "Escribe las reglas (10 a 1000 caracteres).",
      dias: "La duración va de 7 a 60 días.",
      inicio: "Elige la fecha de inicio.",
    },
  },
  ilustraciones: { colinas: "Colinas", brote: "Brote", atardecer: "Atardecer", sendero: "Sendero", lago: "Lago", montana: "Montaña" } as Record<string, string>,
} as const;

// ---------------------------------------------------------------------------
// Módulos (panel real, A4): solo el dueño. Estado real de cada función; habilitar la muestra a las personas.
export const MODULOS_PANEL = {
  ojo: "Panel",
  titulo: "Módulos.",
  bajada: "El estado real de cada función de Rumbo. Las personas solo ven un módulo cuando está habilitado u operativo.",
  enlace: "Módulos: qué está encendido",
  sinPermiso: "Solo el dueño puede ver y cambiar los módulos.",
  resumen: (abiertos: number, total: number) => `${abiertos} de ${total} ${total === 1 ? "módulo está" : "módulos están"} a la vista de las personas.`,
  vacio: "No hay módulos registrados.",
  estados: {
    planificado: "Planificado",
    desarrollado: "Desarrollado",
    probado: "Probado",
    habilitado: "Habilitado",
    operativo: "Operativo",
  } as Record<string, string>,
  visible: "Las personas lo ven.",
  oculto: "Las personas no lo ven.",
  queFalta: "Qué falta",
  nada: "Nada anotado.",
  respaldo: "Qué lo respalda",
  sinRespaldo: "Sin anotar.",
  probadoEl: "Probado por primera vez",
  sinProbar: "Todavía no",
  cambiadoEl: "Último cambio",
  cambiar: "Cambiar estado",
  estado: "Estado",
  ayudaEstado: "Habilitado u operativo lo muestra a las personas.",
  ayudaSinProbar: "Para habilitarlo, primero márcalo como probado.",
  respaldoCampo: "Qué lo respalda",
  ayudaRespaldo: "Por ejemplo: las pruebas que pasó o el primer ciclo en que funcionó. Es obligatorio para marcarlo operativo.",
  respaldoActual: (r: string) => `Anotado: «${r}». Escribe solo si quieres reemplazarlo.`,
  errorRespaldo: "Anota qué lo respalda para marcarlo operativo.",
  avisoAbre: "Al guardar, las personas empezarán a ver este módulo.",
  avisoCierra: "Al guardar, las personas dejarán de ver este módulo.",
  guardar: "Guardar",
  cancelar: "Cancelar",
  guardado: (nombre: string) => `«${nombre}» quedó guardado.`,
} as const;


// Mensaje de cierre en la ficha (informe de cierre de ciclo, 30-oct-2026): lo escribe el coach;
// la persona lo ve en su informe con el nombre de quien lo escribió.
export const MENSAJE_CIERRE_PANEL = {
  titulo: "Mensaje de cierre",
  ayuda: "La persona lo ve en su informe de cierre de ciclo, con tu nombre. Escríbelo tú: no se genera solo. Si lo dejas vacío, el informe muestra tu último foco.",
  campo: "Tu mensaje para cerrar el ciclo",
  ejemplo: "Lo que más se notó en este ciclo, lo que vale la pena llevarse y cómo seguir.",
  guardar: "Guardar mensaje",
  quitar: "Quitar mensaje",
  guardado: "Mensaje guardado. La persona lo verá en su informe de cierre.",
  quitado: "Mensaje quitado. El informe mostrará tu último foco.",
  escrito: (quien: string, cuando: string) => `Escrito por ${quien} el ${cuando}.`,
  error: "Escribe entre 10 y 800 caracteres.",
} as const;

// ---------------------------------------------------------------------------
// Equipo (panel real, bloque 2 de Rumbo 1.0): solo el dueño invita, activa, da el permiso de
// moderar y asigna. PROPUESTO: Diego revisa estos textos con las capturas.
export const EQUIPO_PANEL = {
  enlace: "Equipo: coaches e invitaciones",
  ojo: "Panel",
  titulo: "Equipo.",
  bajada: "Invita a quienes acompañan y decide a quién acompaña cada uno. Cada coach entra con su correo y un segundo factor, y solo ve a las personas que tiene asignadas.",
  sinPermiso: "Solo el dueño de Rumbo puede gestionar el equipo.",
  personas: {
    titulo: "Personas del equipo",
    dueno: "Dueño",
    coach: "Coach",
    activo: "Activo",
    inactivo: "Inactivo",
    modera: "Modera la comunidad",
    acompana: "Acompaña a",
    personas: (n: number) => (n === 1 ? "1 persona" : `${n} personas`),
    sinPresentacion: "Todavía no escribe su presentación.",
    presentacion: "Presentación",
    desactivar: "Desactivar",
    activar: "Activar",
    darModerar: "Permitir moderar",
    quitarModerar: "Quitar permiso de moderar",
    desactivado: (nombre: string) => `${nombre} quedó inactivo: ya no puede entrar al panel.`,
    activado: (nombre: string) => `${nombre} quedó activo.`,
    moderarCambiado: (nombre: string, puede: boolean) => (puede ? `${nombre} ahora puede moderar la comunidad.` : `${nombre} ya no modera la comunidad.`),
  },
  invitar: {
    titulo: "Invitar a un coach",
    nombre: "Nombre",
    nombreAyuda: "Es el nombre que verán las personas que acompañe. Lo puede cambiar después en su perfil.",
    correo: "Correo",
    correoAyuda: "Con este correo va a entrar. No puede ser el correo de una persona participante.",
    moderar: "Puede moderar la comunidad",
    moderarAyuda: "Revisa reportes y oculta publicaciones. Lo puedes cambiar cuando quieras.",
    boton: "Crear invitación",
    errorNombre: "Escribe un nombre de 2 a 60 caracteres.",
    errorCorreo: "Escribe un correo válido, por ejemplo nombre@correo.cl.",
    creada: (nombre: string) => `Invitación creada para ${nombre}. Copia el mensaje y envíaselo: Rumbo no lo envía solo.`,
  },
  pendientes: {
    titulo: "Invitaciones pendientes",
    vacio: "No hay invitaciones pendientes.",
    vence: (fecha: string) => `Vence el ${fecha}`,
    caducada: "Ya no sirve",
    vigente: "Vigente",
    copiar: "Copiar el mensaje",
    revocar: "Revocar",
    revocada: (correo: string) => `Invitación a ${correo} revocada.`,
    caducadaAyuda: "Para volver a invitar, crea una invitación nueva con el mismo correo.",
  },
  mensaje: (nombre: string, correo: string, enlace: string, vence: string) =>
    [
      `Hola, ${nombre}:`,
      "",
      "Te invité al equipo de Rumbo como coach. Para entrar:",
      `1. Abre ${enlace} y escribe tu correo: ${correo}.`,
      "2. Escribe el código de 6 dígitos que te llega por correo.",
      "3. Tu invitación se acepta sola. Si no pasa, pulsa «Aceptar mi invitación».",
      "4. Registra el segundo factor con una app de autenticación, como Google Authenticator o Microsoft Authenticator.",
      "",
      `La invitación vence el ${vence}.`,
    ].join("\n"),
  asignar: {
    titulo: "Quién acompaña a quién",
    ayuda: "Al cambiar el coach, el anterior deja de ver a la persona de inmediato. El cambio queda registrado.",
    vacio: "Todavía no hay participantes.",
    coach: "Coach",
    sinCoach: "Sin coach asignado",
    cambiar: "Cambiar coach",
    hojaTitulo: (nombre: string) => `Coach de ${nombre}`,
    elegir: "Coach",
    ninguno: "Sin coach (solo el dueño)",
    motivo: "Motivo",
    motivoAyuda: "Queda en el historial. Por ejemplo: «Cambio de horario del coach».",
    guardar: "Guardar",
    cancelar: "Cancelar",
    asignado: (persona: string, coach: string) => `${persona} ahora la acompaña ${coach}.`,
    quitado: (persona: string) => `${persona} quedó sin coach asignado.`,
  },
} as const;

// Perfil de quien acompaña (Más): lo ven sus participantes en «Tu coach» (mi_coach).
export const PERFIL_EQUIPO = {
  titulo: "Tu perfil",
  ayuda: "Las personas que acompañas ven tu nombre y esta presentación en «Tu coach».",
  nombre: "Nombre",
  presentacion: "Presentación",
  presentacionAyuda: "Unas líneas sobre ti y cómo acompañas. Hasta 400 caracteres.",
  ejemplo: "Acompaño a personas que quieren ordenar su semana sin exigirse de más.",
  guardar: "Guardar perfil",
  guardado: "Perfil guardado.",
  errorNombre: "Escribe un nombre de 2 a 60 caracteres.",
} as const;

// Videollamadas del plan cercano (ficha, pestaña Revisiones).
export const VIDEOLLAMADAS_PANEL = {
  titulo: "Videollamadas",
  ayuda: (zona: string) => `Una de 20 minutos por semana. La hora se guarda con la zona de este dispositivo; la persona la ve en la suya (${zona}). Al agendarla le llega un aviso.`,
  semana: (n: number) => `Semana ${n}`,
  sinAgendar: "Sin agendar",
  estados: {
    programada: { texto: "Agendada", variante: "nota" },
    realizada: { texto: "Realizada", variante: "activo" },
    no_asistio: { texto: "No asistió", variante: "nota" },
    cancelada: { texto: "Cancelada", variante: "pronto" },
  } as Record<string, { texto: string; variante: "activo" | "nota" | "pronto" }>,
  cuando: "Fecha y hora",
  enlace: "Enlace de la videollamada",
  enlaceAyuda: "Pega el enlace de Google Meet, Zoom, Teams u otro servicio. Debe empezar con https://.",
  abrir: "Abrir el enlace",
  agendar: "Agendar",
  cambiar: "Cambiar fecha o enlace",
  guardar: "Guardar",
  cancelar: "Cancelar",
  anotar: "Anota qué pasó en esta videollamada",
  anotarAyuda: "Elige una opción. La persona ve el estado en su historial.",
  antesDeLaHora: "Cuando pase la hora, aquí anotas si se realizó o si la persona no asistió.",
  noSeHara: "¿No se hará?",
  porAnotar: "Por anotar",
  realizada: "Se realizó",
  noAsistio: "La persona no asistió",
  proxima: {
    titulo: "Próxima videollamada",
    cuando: (semana: number, cuando: string) => `Semana ${semana} · ${cuando}`,
    abrir: "Abrir la videollamada",
    copiar: "Copiar enlace",
    copiado: "Enlace copiado.",
    noCopiado: "No se pudo copiar. Selecciona el enlace y cópialo.",
  },
  cancelarLlamada: "Cancelar la videollamada",
  errorCuando: "Elige la fecha y la hora.",
  errorEnlace: "Pega el enlace completo de la videollamada; debe empezar con https://.",
  agendada: (n: number) => `Videollamada de la semana ${n} agendada. La persona recibió un aviso.`,
  anotada: (n: number) => `Videollamada de la semana ${n} anotada.`,
} as const;

// Ver la postulación original con motivo (A2): queda en la auditoría.
export const POSTULACION_PANEL = {
  boton: "Ver su postulación",
  titulo: "Postulación",
  ayuda: "Por privacidad, la postulación se abre solo con un motivo. Queda registrado quién la vio, cuándo y por qué.",
  motivo: "Motivo",
  motivoEjemplo: "Revisar lo que contó sobre sus horarios para agendar.",
  ver: "Ver la postulación",
  cancelar: "Cerrar",
  errorMotivo: "Escribe el motivo con al menos 10 caracteres.",
  sinPostulacion: "Esta persona no llegó por el formulario: no hay postulación.",
  campos: { recibida: "Recibida", area: "Área", meta: "Lo que quería lograr", apoyo: "Apoyo que eligió", dias: "Días", franjas: "Franjas", nota: "Sobre sus horarios" },
  ninguno: "—",
} as const;
// ---------------------------------------------------------------------------
// Asistente de Rumbo: bandeja de revisión (panel real, E2). Cada coach ve solo a sus participantes;
// el dueño, a todos. La persona solo ve lo que aquí se aprueba (tal cual o corregido).
export const ASISTENTE_PANEL = {
  ojo: "Panel",
  titulo: "Asistente: por revisar.",
  bajada: "Lee cada borrador del asistente antes de que llegue a la persona. Apruébalo tal cual, corrígelo o no lo compartas.",
  enlace: "Asistente: respuestas por revisar",
  resumen: (n: number) => (n === 1 ? "1 respuesta espera tu revisión." : `${n} respuestas esperan tu revisión.`),
  vacio: "No hay respuestas por revisar.",
  porRevisar: "Por revisar",
  esperando: "Esperando la respuesta del asistente",
  esperandoTexto: "La pregunta se envió. La respuesta aparecerá aquí para que la revises.",
  alertas: "Alertas",
  alertaTexto: "La pregunta sugiere riesgo. No se envió al asistente y la persona vio las líneas de ayuda. Contáctala.",
  verFicha: "Abrir la ficha",
  errores: "Sin respuesta del asistente",
  errorTexto: (e: string | null) => `El asistente no respondió (${e ?? "error"}). La persona ve que no hubo respuesta y puede volver a preguntar.`,
  borradores: "Borradores para ti",
  borradorTexto: "Lo pediste para tu trabajo con la persona. No le llega a ella.",
  pregunta: "Pregunta",
  borrador: "Borrador del asistente",
  contexto: "Lo que se envió además de la pregunta",
  sinContexto: "Solo la pregunta.",
  claves: { metas: "metas", acciones_de_la_semana: "acciones de la semana", ultimo_registro_semanal: "último registro semanal", semana_del_ciclo: "semana del ciclo", semanas: "semanas del ciclo" } as Record<string, string>,
  respuesta: "Respuesta que verá la persona",
  respuestaAyuda: "Puedes corregirla. Hasta 2000 caracteres.",
  recortada: "El borrador era más largo y se recortó: revisa el final antes de aprobar.",
  muyLarga: "Acorta la respuesta a 2000 caracteres o menos.",
  vacia: "La respuesta no puede quedar vacía.",
  nota: "Nota interna",
  notaAyuda: "Solo la ve el equipo. Hasta 300 caracteres.",
  notaRevisada: "Nota interna",
  valoracion: { rotulo: "Valoración de la persona", sirvio: "Le sirvió", noSirvio: "No le sirvió" },
  aprobar: "Aprobar y compartir",
  aprobarCorregida: "Aprobar con mis cambios",
  descartar: "No compartir",
  descartarConfirmar: "La persona verá que tu coach decidió no compartir esta respuesta. ¿Seguro?",
  descartarSi: "Sí, no compartir",
  cancelar: "Cancelar",
  aprobada: "Aprobada: la persona ya la puede ver.",
  descartada: "No compartida.",
  recibida: (f: string) => `Recibida el ${f}`,
  revisadas: "Revisadas recientemente",
  revisadasVacio: "Todavía no hay respuestas revisadas.",
  estadoRevisada: { aprobada: "Aprobada", descartada: "No compartida" } as Record<string, string>,
  revisadaPor: (quien: string, f: string) => `${quien}, el ${f}`,
  tu: "Por ti",
  otro: "Por otra persona del equipo",
  corregida: "Con cambios",
  persona: "Persona",
  sinNombre: "Persona sin ficha",
  noEquipo: "Solo el equipo de Rumbo puede ver esta bandeja.",
  limite: "Las alertas, los errores y los borradores para ti se muestran 7 días.",
};

// ---------------------------------------------------------------------------
// Asistente de Rumbo: administración (panel real, solo el dueño). Encender, límites y consumo,
// sin mostrar conversaciones.
export const ASISTENTE_ADMIN = {
  ojo: "Panel",
  titulo: "Asistente: administración.",
  bajada: "Enciende o apaga el asistente, fija los límites de gasto y revisa el consumo del mes. Aquí no se ven conversaciones.",
  enlace: "Asistente: encender, límites y consumo",
  sinPermiso: "Solo el dueño puede administrar el asistente.",
  estado: "Estado",
  encendido: "Encendido",
  apagado: "Apagado",
  encendidoDesde: (f: string) => `Encendido desde el ${f}.`,
  apagadoTexto: "Nadie puede enviar preguntas. Lo ya revisado sigue a la vista de cada persona.",
  modulo: (estado: string) => `Módulo «Asistente con inteligencia artificial»: ${estado}.`,
  moduloAyuda: "Las personas ven el asistente solo si está encendido, existe la clave y el módulo está habilitado.",
  irModulos: "Ir a Módulos",
  encender: "Encender el asistente",
  apagar: "Apagar el asistente",
  confirmarEncender: "Al encenderlo, cada pregunta se envía a OpenAI (servicio pagado) con el contexto que cada persona autoriza. Las personas lo verán solo cuando habilites el módulo. ¿Encender?",
  confirmarApagar: "Nadie podrá enviar preguntas nuevas. Lo que espera revisión sigue en la bandeja. ¿Apagar?",
  si: "Sí, continuar",
  cancelar: "Cancelar",
  encendidoOk: "El asistente quedó encendido.",
  apagadoOk: "El asistente quedó apagado.",
  consumo: "Consumo de este mes",
  consumoAyuda: "Mes calendario, hora de Chile. Costo estimado con los precios configurados.",
  gastado: "Gastado",
  reservado: "Reservado en consultas en curso",
  tope: "Límite mensual",
  de: (a: string, b: string) => `${a} de ${b}`,
  consultas: "Consultas enviadas",
  promedio: "Costo promedio por consulta",
  errores: "Errores",
  crisis: "Preguntas con señales de riesgo (no enviadas)",
  sinPresupuesto: "No enviadas por el límite",
  pendientes: "Respuestas por revisar",
  irBandeja: "Ir a la bandeja",
  agotado: "Se alcanzó el límite del mes: no se envían preguntas nuevas hasta el próximo mes o hasta que subas el límite.",
  estimacion: "Costo estimado por persona",
  porConsulta: "Máximo por consulta",
  porPersona: (dias: number) => `Máximo por persona en ${dias} días, usando el tope diario todos los días`,
  limiteReal: "El corte se hace reservando el costo máximo de cada consulta antes de enviarla. Si una respuesta usa más de lo estimado puede pasarse por centavos; para un tope estricto, pon también un límite de gasto en tu cuenta de OpenAI.",
  limites: "Límites y modelo",
  topeMensual: "Límite mensual (USD)",
  topeMensualAyuda: "Al llegar a este monto no se envían más preguntas en el mes.",
  topeDiario: "Preguntas por persona al día",
  topeDiarioAyuda: "De 1 a 50.",
  modeloCampo: "Modelo de OpenAI",
  modeloAyuda: "Nombre exacto del modelo, por ejemplo gpt-4o-mini.",
  maxTokens: "Largo máximo de cada respuesta (tokens)",
  tokensEntrada: "Tokens de entrada estimados por consulta",
  precioEntrada: "Precio de entrada (USD por millón de tokens)",
  precioSalida: "Precio de salida (USD por millón de tokens)",
  preciosAyuda: "Verifica los precios vigentes en OpenAI antes de encender: cambian.",
  guardar: "Guardar límites",
  guardado: "Límites guardados.",
  numero: "Escribe un número válido.",
  modeloInvalido: "Escribe el nombre del modelo en minúsculas, sin espacios.",
  instrucciones: "Instrucciones del asistente",
  instruccionesAyuda: "Lo que el asistente recibe antes de cada pregunta. Solo lectura aquí.",
};
