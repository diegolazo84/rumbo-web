// DATOS DE EJEMPLO del panel en la vista previa (etapa 0). Nada de este archivo es de una
// persona real: nombres, metas, mensajes y fechas son ficticios y toda pantalla que los muestra
// lleva la etiqueta «Ejemplo» (gramática punteada, plataforma 1.2-1). Camila y su programa
// salen de src/data/ejemplo-app.ts (lo mismo que ve Mi espacio); lo demás es propio del panel.
//
// «Hoy» es el mismo de Mi espacio: martes 13 de octubre de 2026.
import {
  FECHAS_FERIADO,
  FERIADOS,
  HOY,
  POSTULANTE,
  ciclo,
  cicloCercano,
  cuentaComoHecha,
  fechaRevision,
  metasCercano,
  ocurrenciasCercano,
  participante,
  participanteCercano,
  plazoRespuesta,
  registrosSemanalesCercano,
  semanaDelCiclo,
  solicitudesAjuste,
  sumarHabilesEjemplo,
} from "../../../data/ejemplo-app";
import { POSTULAR } from "../../../data/formularios";
import { habilesEntre as habilesEntreCon, type Iso } from "../../../lib/fechas";
import type { CategoriaId } from "../../../data/rumbo";

export { HOY, FERIADOS };
export type { Feriado } from "../../../data/ejemplo-app";

// ---------------------------------------------------------------------------
// Días hábiles: la misma función de src/lib/fechas.ts con los feriados de ejemplo de
// ejemplo-app.ts (solo para mostrar estimaciones: la fecha válida la calcula la base, 6.5).

export const habilesEntre = (a: Iso, b: Iso) => habilesEntreCon(a, b, FECHAS_FERIADO);
export const sumarHabiles = sumarHabilesEjemplo;

// ---------------------------------------------------------------------------
// Solicitudes (5.4)

export type EstadoSolicitud = "recibida" | "en_revision" | "respondida" | "acordada" | "con_espacio" | "cerrada" | "retirada";
export type Solicitud = {
  id: string;
  tipo: "solicitud" | "interes";
  nombre: string;
  correo: string;
  area: string; // Area.id
  meta: string;
  apoyo: "coach" | "cercano" | "nose";
  dias: string[];
  franjas: string[];
  zona: string;
  recibida: Iso;
  hora: string; // hora de Chile
  responderAntes: Iso | null;
  respondidaEl: Iso | null;
  origen: string | null; // «?area=organizacion»
  marcas: ("posible_spam" | "posible_duplicado")[];
  anterior?: string; // id de la solicitud anterior si es duplicada
  estado: EstadoSolicitud;
  motivoCierre?: "capacidad" | "alcance" | "sin_respuesta";
  avisos: boolean; // autorizó avisos de nuevas etapas
};

const plazo = plazoRespuesta;

export const solicitudes: Solicitud[] = [
  {
    id: "s-096",
    tipo: "solicitud",
    nombre: "Andrea",
    correo: "andrea@ejemplo.cl",
    area: "abierta",
    meta: "Quiero sentirme mejor conmigo y dejar de compararme con los demás.",
    apoyo: "nose",
    dias: ["Miércoles"],
    franjas: ["Tarde (15:00–19:00)"],
    zona: "America/Santiago",
    recibida: "2026-10-01",
    hora: "11:20",
    responderAntes: plazo("2026-10-01"),
    respondidaEl: "2026-10-02",
    origen: null,
    marcas: [],
    estado: "cerrada",
    motivoCierre: "alcance",
    avisos: false,
  },
  {
    id: "s-099",
    tipo: "solicitud",
    nombre: "Javiera",
    correo: "javiera@ejemplo.cl",
    area: "estudio",
    meta: "Tengo exámenes en diciembre y siempre termino estudiando el último día. Quiero llegar con las materias repasadas.",
    apoyo: "cercano",
    dias: ["Lunes", "Jueves"],
    franjas: ["Noche (19:00–21:00)"],
    zona: "America/Santiago",
    recibida: "2026-10-05",
    hora: "21:05",
    responderAntes: plazo("2026-10-05"),
    respondidaEl: "2026-10-06",
    origen: "?apoyo=cercano",
    marcas: [],
    estado: "respondida",
    avisos: true,
  },
  {
    id: "s-100",
    tipo: "solicitud",
    nombre: "Valentina",
    correo: "valentina@ejemplo.cl",
    area: "organizacion",
    meta: "Mi semana se desordena y lo importante queda para el viernes. Me gustaría tener un sistema que pueda sostener.",
    apoyo: "coach",
    dias: ["Martes", "Miércoles"],
    franjas: ["Mañana (09:00–12:00)"],
    zona: "America/Santiago",
    recibida: "2026-10-07",
    hora: "08:42",
    responderAntes: plazo("2026-10-07"),
    respondidaEl: null,
    origen: "?area=organizacion",
    marcas: [],
    estado: "en_revision",
    avisos: true,
  },
  {
    id: "s-101",
    tipo: "solicitud",
    nombre: "Tomás",
    correo: "tomas@ejemplo.cl",
    area: "proyectos",
    meta: "Tengo una idea de negocio hace un año y solo avanzo cuando me sobra tiempo.",
    apoyo: "coach",
    dias: [],
    franjas: [],
    zona: "America/Argentina/Buenos_Aires",
    recibida: "2026-10-08",
    hora: "19:30",
    responderAntes: plazo("2026-10-08"),
    respondidaEl: "2026-10-09",
    origen: "?area=emprendimiento",
    marcas: [],
    estado: "respondida",
    avisos: false,
  },
  {
    id: "s-102",
    tipo: "solicitud",
    nombre: "Tomás",
    correo: "tomas@ejemplo.cl",
    area: "proyectos",
    meta: "Les escribí la semana pasada: quiero lanzar mi tienda en línea antes de fin de año y no avanzo.",
    apoyo: "nose",
    dias: ["Viernes"],
    franjas: ["Tarde (15:00–19:00)"],
    zona: "America/Argentina/Buenos_Aires",
    recibida: HOY,
    hora: "07:55",
    responderAntes: plazo(HOY),
    respondidaEl: null,
    origen: null,
    marcas: ["posible_duplicado"],
    anterior: "s-101",
    estado: "recibida",
    avisos: false,
  },
  // Sofía: la solicitud que muestran /postular/ y /estado/ (POSTULANTE en ejemplo-app.ts).
  {
    id: "s-103",
    tipo: "solicitud",
    nombre: POSTULANTE.nombre,
    correo: POSTULANTE.correo,
    area: "proyectos",
    meta: POSTULAR.meta.ejemplos.proyectos,
    apoyo: "coach",
    dias: ["Martes", "Jueves"],
    franjas: ["Tarde (15:00–19:00)"],
    zona: "America/Santiago",
    recibida: POSTULANTE.recibida,
    hora: POSTULANTE.hora,
    responderAntes: plazo(POSTULANTE.recibida),
    respondidaEl: null,
    origen: null,
    marcas: [],
    estado: "recibida",
    avisos: true,
  },
  {
    id: "i-201",
    tipo: "interes",
    nombre: "Felipe",
    correo: "felipe@ejemplo.cl",
    area: "movimiento",
    meta: "",
    apoyo: "nose",
    dias: [],
    franjas: [],
    zona: "America/Santiago",
    recibida: "2026-10-10",
    hora: "16:12",
    responderAntes: null,
    respondidaEl: null,
    origen: "?area=movimiento",
    marcas: [],
    estado: "recibida",
    avisos: false,
  },
];

export const solicitudPorId = (id: string | null | undefined) => solicitudes.find((s) => s.id === id);
export const sinPrimeraRespuesta = (s: Solicitud) =>
  s.tipo === "solicitud" && (s.estado === "recibida" || s.estado === "en_revision") && !s.respondidaEl;

// ---------------------------------------------------------------------------
// Participantes (5.5). Camila es la de Mi espacio; Martín y Josefa son solo del panel.

export type PlanParam = "coach" | "cercano";
export type FichaParticipante = {
  id: string;
  nombre: string;
  correo: string;
  zona: string;
  plan: PlanParam;
  semana: number | null; // null: el ciclo no empieza
  semanas: number;
  inicio: Iso;
  proximaRevision: Iso;
  horaVideollamada?: string;
  estadoCiclo: "preparacion" | "en_curso" | "pausa" | "cerrado";
  reordenamientosUsados?: number;
};

export const participantes: FichaParticipante[] = [
  {
    id: "p-1",
    nombre: participante.nombre,
    correo: participante.correo,
    zona: participante.zonaHoraria,
    plan: ciclo.plan,
    semana: semanaDelCiclo(HOY),
    semanas: ciclo.semanas,
    inicio: ciclo.inicio,
    proximaRevision: fechaRevision(semanaDelCiclo(HOY)),
    estadoCiclo: "en_curso",
  },
  {
    id: "p-2",
    nombre: participanteCercano.nombre,
    correo: participanteCercano.correo,
    zona: participanteCercano.zonaHoraria,
    plan: "cercano",
    semana: semanaDelCiclo(HOY),
    semanas: cicloCercano.semanas,
    inicio: cicloCercano.inicio,
    proximaRevision: fechaRevision(semanaDelCiclo(HOY), cicloCercano.diaRevision), // videollamada los martes: hoy
    horaVideollamada: cicloCercano.horaVideollamada,
    estadoCiclo: "en_curso",
    reordenamientosUsados: cicloCercano.reordenamientosUsados,
  },
  {
    id: "p-3",
    nombre: "Josefa",
    correo: "josefa@ejemplo.cl",
    zona: "America/Santiago",
    plan: "coach",
    semana: null,
    semanas: 4,
    inicio: "2026-10-19",
    proximaRevision: "2026-10-23",
    estadoCiclo: "preparacion",
  },
];

// ---------------------------------------------------------------------------
// Semana 2 de Martín (Acompañamiento cercano): lo que la revisión muestra a la izquierda.

// Calculado con las acciones de Martín de ejemplo-app.ts (lo mismo que ve en Mi espacio).
const deSemana2 = ocurrenciasCercano.filter((o) => o.semana === semanaDelCiclo(HOY) && o.fecha <= HOY);
export const semanaMartin = {
  semana: semanaDelCiclo(HOY),
  porMeta: metasCercano.map((m) => {
    const l = deSemana2.filter((o) => o.metaId === m.id);
    return { titulo: m.titulo, categoria: m.categoria as CategoriaId, programadas: l.length, hechas: l.filter((o) => cuentaComoHecha(o.registro)).length };
  }),
  // Lunes 12 (feriado) sin registros y hoy con una foto por revisar: ningún día completo todavía.
  diasCompletos: 0,
  dejadas: deSemana2.filter((o) => o.registro === "dejada").length,
  registro: {
    carga: "Pesada",
    funciono: "Hacer primero la acción del portafolio, antes de abrir el correo.",
    costo: "El lunes fue feriado y se me corrió toda la semana.",
    cambiar: "Que las acciones de la tarde sean más cortas.",
  },
  registroSemana1: registrosSemanalesCercano[0],
};

// ---------------------------------------------------------------------------
// Solicitudes de ajuste pendientes (5.9)

export type AjustePanel = {
  id: string;
  participanteId: string;
  nombre: string;
  plan: PlanParam;
  tipo: string; // AJUSTE.tipo.opciones (formularios.ts)
  acciones: string[];
  desde: Iso;
  detalle: string;
  enviadaEl: Iso;
  estado: "enviada" | "en_revision" | "respondida" | "sin_cambios";
  reordenar: boolean; // marcó «Necesito que reordenemos mi semana» (Cercano)
  venceEl: Iso | null; // Cercano con reordenamiento: 1 día hábil
  paraRevision: Iso | null; // Con acompañamiento: sin plazo propio
};

export const ajustes: AjustePanel[] = [
  {
    id: "aj-1",
    participanteId: "p-2",
    nombre: "Martín",
    plan: "cercano",
    tipo: "horarios",
    acciones: ["Revisar el portafolio · miércoles 14, 18:30", "Preparar la semana · viernes 16, 18:00"], // s3 en ejemplo-app.ts
    desde: "2026-10-14",
    detalle: "El lunes fue feriado y se me corrió toda la semana. Esta semana salgo más tarde del trabajo.",
    enviadaEl: HOY,
    estado: "enviada",
    reordenar: true,
    venceEl: sumarHabiles(HOY, 1),
    paraRevision: null,
  },
  {
    id: "aj-2",
    participanteId: "p-1",
    nombre: participante.nombre,
    plan: "coach",
    tipo: "accion",
    acciones: ["Escribir 3 ideas para tu taller · jueves 15, 08:30"],
    // La misma solicitud que Camila ve como «Enviada» en Mi espacio (s2 en ejemplo-app.ts).
    desde: solicitudesAjuste.find((x) => x.id === "s2")!.desde,
    detalle: solicitudesAjuste.find((x) => x.id === "s2")!.detalle,
    enviadaEl: solicitudesAjuste.find((x) => x.id === "s2")!.enviadaEl,
    estado: "enviada",
    reordenar: false,
    venceEl: null,
    paraRevision: fechaRevision(semanaDelCiclo(HOY)),
  },
];

// ---------------------------------------------------------------------------
// Fotos y explicaciones por revisar (5.8)

export type Evidencia = {
  id: string;
  nombre: string;
  accion: string;
  instrucciones: string[];
  fecha: Iso;
  foto: boolean;
  explicacion: string | null;
};

export const evidencias: Evidencia[] = [
  {
    id: "e-1",
    nombre: "Martín",
    accion: "Ordenar tu escritorio",
    instrucciones: ["Despeja tu escritorio y deja a mano solo lo que usas para trabajar.", "Sácale una foto al terminar."],
    fecha: "2026-10-13",
    foto: true,
    explicacion: null,
  },
  {
    id: "e-2",
    nombre: "Martín",
    accion: "Imprimir tu plan de la semana",
    instrucciones: ["Imprime o escribe a mano tu plan de la semana y déjalo a la vista.", "Sácale una foto."],
    fecha: "2026-10-08",
    foto: false,
    explicacion: "No tengo impresora en la casa, así que lo escribí a mano en una hoja y la pegué en el refrigerador.",
  },
];

// ---------------------------------------------------------------------------
// Contacto y derechos (5.10)

export type Mensaje = {
  id: string;
  nombre: string | null;
  correo: string;
  motivo: string; // CONTACTO.motivo.opciones
  texto: string;
  recibido: Iso;
  estado: "nuevo" | "respondido" | "archivado";
};

export const mensajes: Mensaje[] = [
  {
    id: "c-1",
    nombre: "Ignacio",
    correo: "ignacio@ejemplo.cl",
    motivo: "duda",
    texto: "Hola, ¿puedo postular si vivo en Uruguay? Mi meta es terminar mi tesis.",
    recibido: "2026-10-12",
    estado: "nuevo",
  },
  {
    id: "c-2",
    nombre: null,
    correo: "lectora@ejemplo.cl",
    motivo: "problema",
    texto: "En el teléfono el botón de postular quedaba tapado por el menú.",
    recibido: "2026-10-06",
    estado: "respondido",
  },
];

export type Peticion = {
  id: string;
  nombre: string;
  correo: string;
  tipo: string | null; // null: vino por contacto y Diego la clasifica
  detalle: string;
  recibida: Iso;
  fechaLimite: Iso | null;
  estado: "abierta" | "resuelta";
};

export const peticiones: Peticion[] = [
  {
    id: "d-1",
    nombre: "Rosa",
    correo: "rosa@ejemplo.cl",
    tipo: null,
    detalle: "Postulé en septiembre y quiero saber qué datos tienen de mí.",
    recibida: "2026-10-09",
    fechaLimite: null,
    estado: "abierta",
  },
];

// Tipos de petición (4.14): los mismos de PREFERENCIAS.derechos, más «Eliminar».
export const TIPOS_PETICION = [
  { valor: "ver", texto: "Ver" },
  { valor: "corregir", texto: "Corregir" },
  { valor: "eliminar", texto: "Eliminar" },
  { valor: "copia_fotos", texto: "Copia de mis fotos" },
  { valor: "oposicion", texto: "Que dejen de usar mis datos para algo" },
  { valor: "bloqueo", texto: "Bloquear" },
];

// ---------------------------------------------------------------------------
// Mantención y cuenta (5.11)

export const mantencion = {
  fotosParaDepurar: [
    { id: "x-1", nombre: "Martín", accion: "Ordenar tu escritorio", revisadaEl: "2026-09-08" as Iso },
    { id: "x-2", nombre: "Martín", accion: "Despejar tu mesa", revisadaEl: "2026-09-10" as Iso },
  ],
  ultimoRespaldo: "2026-10-04" as Iso,
  respaldoConfirmado: false,
  factores: ["Teléfono", "Gestor de claves"],
};
