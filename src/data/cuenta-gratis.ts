// Cuenta gratis «Rumbo Inicial» (Diego, 18-nov-2026). Textos y plantillas de acciones por área.
// Las plantillas son sugerencias generales para que la persona arme su semana sola: no son un plan
// personalizado ni consejo de salud (eso es lo que hace el coach en los planes pagados).

export const TOPE_ACCIONES_GRATIS = 3;

export const PLANTILLAS_GRATIS: Record<string, string[]> = {
  proyectos: [
    "Trabajar 30 minutos en mi proyecto",
    "Escribir la siguiente tarea concreta",
    "Conversar con una persona sobre mi idea",
    "Anotar lo que avancé hoy",
  ],
  estudio: [
    "Estudiar 30 minutos con el teléfono lejos",
    "Repasar los apuntes de ayer",
    "Hacer un ejercicio de práctica",
    "Anotar qué me queda por estudiar",
  ],
  organizacion: [
    "Revisar mi lista de pendientes",
    "Ordenar un espacio por 15 minutos",
    "Planificar el día de mañana",
    "Responder lo pendiente de hoy",
  ],
  abierta: [
    "Dedicar 20 minutos a mi meta",
    "Dar un paso pequeño hacia mi meta",
    "Anotar lo que avancé hoy",
  ],
};
export const plantillasDe = (area: string) => PLANTILLAS_GRATIS[area] ?? PLANTILLAS_GRATIS.abierta;

export const DIAS_SEMANA = [
  { n: 1, corto: "Lun", largo: "lunes" },
  { n: 2, corto: "Mar", largo: "martes" },
  { n: 3, corto: "Mié", largo: "miércoles" },
  { n: 4, corto: "Jue", largo: "jueves" },
  { n: 5, corto: "Vie", largo: "viernes" },
  { n: 6, corto: "Sáb", largo: "sábado" },
  { n: 7, corto: "Dom", largo: "domingo" },
] as const;

export const T_GRATIS = {
  partida: {
    ojo: "Rumbo Inicial · gratis",
    titulo: "Tu punto de partida.",
    bajada: "En dos minutos armamos tu primera semana. Es gratis y puedes cambiarlo cuando quieras.",
    nombre: "¿Cómo quieres que te llamemos?",
    area: "¿En qué quieres avanzar?",
    meta: "¿Qué quieres lograr en las próximas 4 semanas?",
    metaAyuda: "Una frase concreta. Por ejemplo: «Terminar el primer capítulo de mi tesis».",
    dias: "¿Qué días puedes dedicarle?",
    acciones: "Elige hasta 3 acciones para cada uno de esos días",
    accionesAyuda: "Empieza con poco: es mejor cumplir 2 acciones que dejar 5 a medias.",
    propia: "Escribir una acción propia",
    agregar: "Agregar",
    mayorEdad: "Tengo 18 años o más",
    consentimiento: (condiciones: string, privacidad: string) =>
      `Acepto las Condiciones (${condiciones}) y la Política de privacidad (${privacidad}) de Rumbo.`,
    avisos: "Quiero recibir novedades de Rumbo por correo (como mucho una vez al mes)",
    boton: "Empezar mi semana",
    enviando: "Creando tu espacio…",
    errores: {
      nombre: "Escribe un nombre de 2 a 60 letras.",
      area: "Elige un área.",
      meta: "Cuéntanos tu meta en al menos 20 caracteres.",
      dias: "Elige al menos un día.",
      acciones: "Elige entre 1 y 3 acciones.",
      mayorEdad: "Rumbo es para personas mayores de edad.",
      consentimiento: "Necesitamos que aceptes las Condiciones y la Privacidad para crear tu cuenta.",
      red: "No pudimos crear tu cuenta. Revisa tu conexión e inténtalo de nuevo.",
    },
  },
  espacio: {
    ojo: "Rumbo Inicial · gratis",
    saludo: (nombre: string) => `Hola, ${nombre}.`,
    tuMeta: "Tu meta",
    hoy: "Lo que puedes hacer hoy",
    hoyLibre: "Hoy no es uno de tus días. Descansa o adelanta si quieres: tu racha no se corta.",
    ayer: "¿Quedó algo de ayer?",
    ayerAyuda: "Puedes marcar lo de ayer hasta el final de hoy.",
    hecha: "Hecha",
    marcar: (t: string) => `Marcar «${t}» como hecha`,
    desmarcar: (t: string) => `Desmarcar «${t}»`,
    diaCompleto: "¡Día completo! Sumaste el bono del día.",
    semana: "Así va tu semana",
    logros: "Lo que llevas",
    creditos: "créditos",
    nivel: "Nivel",
    racha: (n: number) => (n === 1 ? "1 día seguido" : `${n} días seguidos`),
    proximoBono: (n: number) => `Si completas tu próximo día sumas ${n} de bono.`,
    error: "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.",
  },
  coach: {
    titulo: "Lo que cambia con un coach",
    puntos: [
      "Un plan hecho para ti, no desde plantillas",
      "Alguien que lee cómo te fue y te responde cada semana",
      "Ajustes cuando algo no funciona, antes de que lo dejes",
    ],
    boton: "Quiero acompañamiento",
    elegir: "¿Qué tipo de acompañamiento te interesa?",
    noSe: "Todavía no sé: quiero conversarlo",
    enviar: "Avisar a Rumbo",
    enviado: (plazo: string) =>
      `Listo. Te escribiremos a tu correo en hasta ${plazo} para conversar. Mientras, sigue con tu semana: nada de lo que hiciste se pierde.`,
    pedido: "Ya nos avisaste que quieres acompañamiento. Te escribiremos a tu correo.",
    cerrar: "Ahora no",
  },
  ajustes: {
    titulo: "Ajustemos tu semana",
    abrir: "Cambiar mis acciones o mis días",
    guardar: "Guardar cambios",
    cancelar: "Cancelar",
    guardado: "Listo. Lo que ya marcaste se mantiene.",
    borrarTitulo: "Borrar mi cuenta gratis",
    borrarTexto: "Se borran tu meta, tus acciones y lo que marcaste. No se puede deshacer.",
    borrarBoton: "Borrar mi cuenta gratis",
    borrarConfirmar: "Sí, borrar todo",
    salir: "Salir",
  },
  cerrada: {
    titulo: "No encontramos un espacio abierto con este correo.",
    texto: "Mi espacio es para personas que ya acordaron un programa con Rumbo. Si quieres empezar, cuéntanos tu meta.",
    postular: "Cuéntanos tu meta",
    salir: "Salir",
  },
} as const;
