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
    errores: {
      titulo: "Escribe un título de 2 a 60 caracteres.", // (vista previa)
      duracion: "La duración va de 5 a 240 minutos.", // (vista previa)
      dias: "Elige al menos un día.", // (vista previa)
      instrucciones: "Escribe las instrucciones.", // (vista previa)
    },
    fotoAviso: "Más de 1 acción con foto por semana: es alcance comercial, no cuota técnica.", // (vista previa) 5.6
  },
  resumen: { titulo: "Resumen por meta", porSemana: (n: number) => `${n} min por semana` },
  cruces: {
    aviso: (n: number) => `${n} solapamiento${n === 1 ? "" : "s"}`, // (vista previa)
    compatibles: "Sí, son compatibles",
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
    vigenciaAyuda: "«Desde mañana» por defecto; no puede ser una fecha que ya tenga acciones registradas.", // (vista previa)
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
    estados: { nuevo: "Nuevo", respondido: "Respondido", archivado: "Archivado" } as Record<string, string>,
    motivo: "Motivo", // (vista previa)
    recibido: "Recibido", // (vista previa)
    respuesta: "Tu respuesta", // (vista previa)
    archivar: "Archivar", // (vista previa)
    respondido: "Marcar como respondido", // (vista previa)
  },
  peticiones: {
    titulo: "Peticiones sobre datos",
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
    "solicitud:sin_aceptar": "La persona todavía no acepta el acuerdo.",
    "token:invalido": "No se pudo generar el enlace. Inténtalo de nuevo.",
    "vigencia:pasada": "La vigencia no puede ser una fecha pasada.",
    "vigencia:con_registros": "Esa fecha ya tiene acciones registradas: elige una vigencia posterior.",
    "meta:sin_acciones": "Cada meta necesita al menos 1 acción.",
    "programa:solapamientos": "Hay solapamientos: márcalos como compatibles o resuélvelos.",
    "programa:no_es_borrador": "Este programa ya no es un borrador. Vuelve a abrir el constructor.",
    "nota:requerida": "Escribe la nota para la persona.",
    "registro:no_pendiente": "Esta evidencia ya fue revisada.",
    "fotos:borrar_primero": "Primero hay que borrar sus fotos del almacenamiento.",
    "sesion:no_autorizado": "Tu sesión no tiene el segundo factor. Vuelve a entrar al panel.",
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
    guardado: "Borrador guardado.",
    sinMetas: "Todavía no hay metas. Agrega la primera.",
    sinAcciones: "Elige una acción de la semana o agrega una nueva.",
    crear: "Crear el borrador",
    crearAyuda: "El borrador copia el programa publicado (si hay) como versión nueva. La persona no lo ve hasta publicar.",
    publicado: (n: number) => `Programa publicado: ${n} acciones fechadas en Mi espacio.`,
    cargaBase: (min: number, fecha: string) => `Según la base, el día más cargado es el ${fecha}, con ${min} min.`,
    crucesBase: (n: number) => (n ? `La base encuentra ${n} solapamiento${n === 1 ? "" : "s"}.` : "La base no encuentra solapamientos."),
    erroresMeta: "Cada meta necesita un título de 2 a 80 caracteres.",
    erroresAcciones: "Revisa las acciones: falta título, días, duración o instrucciones.",
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
    irAMiEspacio: "Ir a Mi espacio",
    salir: "Salir",
    nombreFactor: (n: number) => `TOTP ${n}`,
  },
} as const;
