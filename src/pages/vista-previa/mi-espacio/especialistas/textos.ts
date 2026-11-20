// Especialistas Rumbo (20-nov-2026, siempre presente). Textos de la sección de Mi espacio.
// Sin cifras, testimonios ni personas inventadas: en Mi espacio real solo aparecen perfiles que el
// dueño verificó y publicó (especialistas_publicados).
export const T_ESPECIALISTAS = {
  titulo: "Especialistas Rumbo",
  ojo: "Una red que suma a tu plan",
  bajada:
    "Profesionales con credenciales revisadas por Rumbo, para cuando tu meta pide algo más: nutrición, actividad física, descanso, finanzas o salud emocional.",
  sellos: [
    { icono: "shield-check", texto: "Credenciales revisadas" },
    { icono: "eye", texto: "Tú decides qué compartes" },
    { icono: "user-round", texto: "Tu coach sigue a tu lado" },
  ],
  pasos: {
    titulo: "Así funciona",
    lista: [
      { titulo: "Elige", texto: "Mira perfiles, especialidades y cómo trabaja cada persona." },
      { titulo: "Pide tu hora", texto: "Escríbele en pocas líneas qué necesitas. Te responde aquí." },
      { titulo: "Comparte si quieres", texto: "Puedes mostrarle tus metas o tu avance. Lo cambias cuando quieras." },
    ],
  },
  filtros: { titulo: "Especialidades", todas: "Todas" },
  directorio: "Red de especialistas",
  cuenta: (n: number) => (n === 1 ? "1 especialista" : `${n} especialistas`),
  vacio: {
    titulo: "Estamos sumando especialistas a la red.",
    texto:
      "Cada perfil pasa por una revisión de credenciales antes de aparecer aquí. Si ya sabes qué tipo de apoyo buscas, cuéntaselo a tu coach: te orienta mientras tanto.",
    boton: "Escribir a mi coach",
  },
  vacioFiltro: "No hay especialistas en esta especialidad todavía.",
  tarjeta: {
    verificado: "Credenciales revisadas",
    modalidad: { en_linea: "En línea", presencial: "Presencial", ambas: "En línea y presencial" } as Record<string, string>,
    servicios: "Servicios",
    minutos: (n: number) => `${n} min`,
    ver: "Ver perfil",
  },
  perfil: {
    presentacion: "Cómo trabaja",
    alinea: "Por qué está en Rumbo",
    credenciales: "Credenciales revisadas",
    servicios: "Elige un servicio",
    precio: (clp: number | null, usd: number | null) =>
      clp ? `$${clp.toLocaleString("es-CL")}` : usd ? `USD ${usd}` : "Precio a conversar",
    pago: "El pago lo acuerdas directamente con el especialista. Rumbo no cobra dentro de la plataforma.",
    mensaje: "¿Qué te gustaría trabajar? (opcional)",
    mensajeAyuda: "Hasta 500 caracteres. Solo lo verá este especialista.",
    pedir: "Pedir hora",
    pidiendo: "Enviando…",
    pedida: "Listo. Le avisamos y te responderá en Mis avisos.",
    errores: {
      reservas: "Las reservas están en pausa por ahora. Escríbele a tu coach y te ayuda a coordinar.",
      demasiadas: "Ya tienes 3 solicitudes esperando respuesta. Espera una respuesta o cancela una.",
      ciclo: "Necesitas un plan activo para pedir hora.",
      conexion: "No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo.",
    },
    ejemplo: "En la vista previa no se envía nada.",
  },
  reservas: {
    titulo: "Tus solicitudes",
    vacio: "Cuando pidas una hora, la verás aquí con su estado.",
    estados: {
      pedida: "Esperando respuesta",
      aceptada: "Confirmada",
      rechazada: "No disponible",
      realizada: "Realizada",
      no_asistio: "No asististe",
      cancelada: "Cancelada",
    } as Record<string, string>,
    entrar: "Entrar a la sesión",
    cancelar: "Cancelar",
    cancelada: "Cancelaste la solicitud.",
  },
} as const;
