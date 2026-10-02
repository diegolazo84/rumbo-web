// Fuente única de los datos de negocio que muestra la portada.
// Deben coincidir con la plataforma original (chatgpt.site): si cambian allí,
// se cambian aquí. Ver docs/coherencia.md.

export const PLATAFORMA = "https://rumbo-acompanamiento-diego.diegolazo84.chatgpt.site";

// Rutas que viven en la plataforma original. netlify.toml además redirige
// las mismas rutas en este dominio, para enlaces antiguos o escritos a mano.
export const rutas = {
  postular: `${PLATAFORMA}/postular`,
  contacto: `${PLATAFORMA}/contacto`,
  miEspacio: `${PLATAFORMA}/mi-programa`,
  comunidad: `${PLATAFORMA}/comunidad`,
  privacidadPlataforma: `${PLATAFORMA}/privacidad-piloto`,
} as const;

export const LEMA = "Ordena lo que importa. Avanza con apoyo.";
export const ESTADO_PILOTO = "Piloto en preparación · Santiago de Chile";

export type CategoriaId = "proyecto" | "orden" | "bienestar";

// Colores por categoría acordados con la plataforma (proyecto/cuerpo, orden, bienestar).
export const categorias: Record<CategoriaId, { nombre: string; color: string }> = {
  proyecto: { nombre: "Proyecto", color: "#158b83" },
  orden: { nombre: "Organización", color: "#3973c5" },
  bienestar: { nombre: "Bienestar", color: "#b77b16" },
};

export type Area = {
  id: string;
  nombre: string;
  frase: string;
  texto: string;
  categoria: CategoriaId;
  // Valor de ?area= que entiende el formulario de la plataforma original.
  // Sin valor, la persona elige el área en el formulario.
  param?: string;
  // El primer piloto prioriza organización, estudio y proyectos.
  enPiloto: boolean;
  nota?: string;
};

export const areas: Area[] = [
  {
    id: "proyectos",
    nombre: "Proyectos y emprendimiento",
    frase: "Aquí ganan las ideas que se ponen en marcha.",
    texto: "Bajamos tu idea a tareas de 20 a 45 minutos: validar, conversar con posibles clientes, ordenar tu oferta.",
    categoria: "proyecto",
    param: "emprendimiento",
    enPiloto: true,
  },
  {
    id: "estudio",
    nombre: "Estudio y aprendizaje",
    frase: "Una prueba a la vez, con horario reservado.",
    texto: "Ordenamos materias, fechas y bloques de estudio para que preparar una evaluación no dependa del último día.",
    categoria: "orden",
    enPiloto: true,
  },
  {
    id: "organizacion",
    nombre: "Organización y hábitos",
    frase: "No tienes que hacerlo perfecto para seguir.",
    texto: "Bloques de trabajo, rutinas cortas y un sistema que puedas sostener aunque la semana se desordene.",
    categoria: "orden",
    param: "organizacion",
    enPiloto: true,
  },
  {
    id: "autoestima",
    nombre: "Autoestima",
    frase: "Tu valor no se mide en una racha.",
    texto: "Acciones pequeñas para retomar lo que te importa y reconocer lo que logras.",
    categoria: "bienestar",
    param: "bienestar",
    enPiloto: false,
  },
  {
    id: "bienestar",
    nombre: "Bienestar cotidiano",
    frase: "Volver a empezar también cuenta.",
    texto: "Si atraviesas un periodo difícil, armamos pasos mínimos que complementan, sin reemplazar, el apoyo de tu profesional.",
    categoria: "bienestar",
    param: "bienestar",
    enPiloto: false,
    nota: "Complemento a tratamiento",
  },
  {
    id: "alimentacion",
    nombre: "Alimentación",
    frase: "Una pauta sirve más cuando cabe en tu día.",
    texto: "Organizamos compras y preparación siguiendo la pauta de tu nutricionista, si la tienes. No indicamos dietas.",
    categoria: "proyecto",
    param: "alimentacion",
    enPiloto: false,
    nota: "Según pauta profesional",
  },
  {
    id: "movimiento",
    nombre: "Movimiento",
    frase: "La constancia se construye con un ritmo posible.",
    texto: "Agendamos actividad física respetando descanso, lesiones e indicaciones de tu equipo de salud.",
    categoria: "proyecto",
    param: "movimiento",
    enPiloto: false,
  },
];

export type Plan = {
  id: string;
  nombre: string;
  etiqueta?: string;
  precio: string;
  periodo: string;
  param: string;
  incluye: string[];
};

// Precios de referencia del piloto: hipótesis por validar, no tarifas cerradas.
export const planes: Plan[] = [
  {
    id: "acompanamiento",
    nombre: "Con acompañamiento",
    precio: "$49.900",
    periodo: "CLP por 4 semanas",
    param: "coach",
    incluye: [
      "Conversación inicial de 30 minutos",
      "Programa calendarizado preparado por el equipo",
      "4 revisiones semanales de 10 minutos",
      "Hasta 2 respuestas breves entre revisiones, con canal y plazo acordados antes de empezar",
      "Créditos, niveles y progreso en tu espacio",
    ],
  },
  {
    id: "cercano",
    nombre: "Acompañamiento cercano",
    etiqueta: "Más presencia",
    precio: "$89.900",
    periodo: "CLP por 4 semanas",
    param: "cercano",
    incluye: [
      "Conversación inicial de 45 minutos",
      "Programa calendarizado preparado por el equipo",
      "4 revisiones semanales de 20 minutos",
      "Hasta 4 respuestas breves entre revisiones, con canal y plazo acordados antes de empezar",
      "Hasta una acción semanal con foto privada, si se acuerda",
    ],
  },
];

// Reglas de créditos y niveles: idénticas a la plataforma original.
export const reglasCreditos = {
  porAccion: 1,
  bonoDiaCompleto: 2,
  bonoRacha3: 3, // 3 días programados completos seguidos: 1,5× el bono
  bonoRacha7: 4, // 7 días programados completos seguidos: 2× el bono
};

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
  if (rachaDiasCompletos >= 7) return reglasCreditos.bonoRacha7;
  if (rachaDiasCompletos >= 3) return reglasCreditos.bonoRacha3;
  return reglasCreditos.bonoDiaCompleto;
}

export function postularHref(params: { area?: string; apoyo?: string } = {}) {
  const q = new URLSearchParams();
  if (params.area) q.set("area", params.area);
  if (params.apoyo) q.set("apoyo", params.apoyo);
  const s = q.toString();
  return s ? `${rutas.postular}?${s}` : rutas.postular;
}
