// DATOS DE EJEMPLO de la vista previa (etapa 0 de la plataforma). Nada de este archivo es de
// una persona real: la participante, sus metas, sus acciones y sus registros son ficticios y
// toda pantalla que los muestre lleva la etiqueta «Ejemplo» (gramática punteada). Ningún dato
// de este archivo puede aparecer fuera de /vista-previa/ (plataforma 1.2-1).
//
// Los créditos, la racha y el nivel se calculan con las reglas de rumbo.ts (reglasCreditos,
// bonoDiario, nivelPara), con los mismos casos de la prueba K (plataforma 8.2). En la v1 real
// ese cálculo vive en SQL (D4) y el navegador solo lo muestra.
import { bonoDiario, nivelPara, reglasCreditos, type CategoriaId } from "./rumbo";
import { diaSemana, diasEntre, sumarDias, sumarDiasHabiles, type Iso } from "../lib/fechas";

export const ES_EJEMPLO = true as const;

// Guion único de la vista previa: un solo «hoy», un solo calendario de feriados y las mismas
// personas en Mi espacio, el panel y los formularios públicos.
// - Camila: participante de «Con acompañamiento» (Mi espacio por defecto; ciclo desde el lunes 5).
// - Martín: participante de «Acompañamiento cercano» (variantes «cercano» y acciones con foto).
// - Sofía: postula hoy en /postular/ y su solicitud es la de /estado/ (POSTULANTE, más abajo).

// «Hoy» de la vista previa: martes de la semana 2 de 4. Fijo, para que el prerender sea estable.
export const HOY: Iso = "2026-10-13";

// Feriados de ejemplo (Diego confirma la lista contra el calendario oficial, 9.11). La misma
// lista calcula los plazos del formulario, del estado y del panel.
export type Feriado = { fecha: Iso; nombre: string };
export const FERIADOS: Feriado[] = [
  { fecha: "2026-10-12", nombre: "Encuentro de Dos Mundos" },
  { fecha: "2026-10-31", nombre: "Día de las Iglesias Evangélicas y Protestantes" },
  { fecha: "2026-11-01", nombre: "Día de Todos los Santos" },
  { fecha: "2026-12-08", nombre: "Inmaculada Concepción" },
  { fecha: "2026-12-25", nombre: "Navidad" },
];
export const FECHAS_FERIADO: Iso[] = FERIADOS.map((f) => f.fecha);
export const sumarHabilesEjemplo = (desde: Iso, dias: number) => sumarDiasHabiles(desde, dias, FECHAS_FERIADO);

// Plazo publicado de primera respuesta (operacion.plazoPrimeraRespuesta): 2 días hábiles.
export const DIAS_PLAZO = 2;
export const plazoRespuesta = (recibida: Iso) => sumarHabilesEjemplo(recibida, DIAS_PLAZO);

// Ausencia de Diego de ejemplo (operacion.ausencia, 5.11): fuera hasta el domingo 18, vuelve el
// lunes 19. Banda en Mi espacio y aviso en /postular/ (las variantes «ausencia»).
export const AUSENCIA = {
  ejemplo: true as const,
  hasta: "2026-10-18" as Iso,
  vuelve: "2026-10-19" as Iso,
  texto: "Tu coach vuelve el lunes 19 de octubre.",
  banda: "Tu coach vuelve el lunes 19 de octubre. Las revisiones de esta semana pasan a ese día.",
};

// ---------------------------------------------------------------------------
// Participante y ciclo

export type PlanParam = "coach" | "cercano";

export const participante = {
  ejemplo: true as const,
  nombre: "Camila",
  correo: "camila@ejemplo.cl",
  correoEnmascarado: "c•••@ejemplo.cl",
  zonaHoraria: "America/Santiago",
  mostrarCreditosEnHoy: true,
};

export const ciclo = {
  ejemplo: true as const,
  numero: 1,
  plan: "coach" as PlanParam,
  semanas: 4,
  inicio: "2026-10-05" as Iso, // siempre un lunes (6.4)
  fin: "2026-11-01" as Iso,
  diaRevision: 4, // 1 = lunes … 5 = viernes: los jueves
  horaVideollamada: "19:00", // solo Acompañamiento cercano (hora de Chile)
  reordenamientosUsados: 0, // solo Acompañamiento cercano
  reordenamientosMax: 2,
  estado: "en_curso" as "preparacion" | "en_curso" | "pausa" | "cerrado",
};

// Semana del ciclo (1 a 4) de una fecha.
export const semanaDelCiclo = (fecha: Iso) => Math.floor(diasEntre(ciclo.inicio, fecha) / 7) + 1;
export const lunesDeSemana = (n: number) => sumarDias(ciclo.inicio, (n - 1) * 7);
export const fechaRevision = (n: number, dia: number = ciclo.diaRevision) => sumarDias(lunesDeSemana(n), dia - 1);
export const enPrograma = (fecha: Iso) => fecha >= ciclo.inicio && fecha <= ciclo.fin;

// ---------------------------------------------------------------------------
// Metas (categoría solo Proyecto, Organización o Bienestar, 5.6)

export type Hito = { texto: string; logrado: boolean };
export type Meta = {
  id: string;
  titulo: string;
  corto: string; // nombre corto para el detalle de la fila con dos metas de la misma categoría
  categoria: CategoriaId;
  paraQue: string | null; // en palabras de la persona
  hitos: Hito[];
};

export const metas: Meta[] = [
  {
    id: "m1",
    titulo: "Lanzar mi taller en línea",
    corto: "Mi taller",
    categoria: "proyecto",
    paraQue: "Quiero probar si mi taller le sirve a alguien antes de fin de año.",
    hitos: [
      { texto: "Definir a quién quieres ayudar", logrado: true },
      { texto: "Conversar con 3 posibles clientes", logrado: false },
    ],
  },
  { id: "m2", titulo: "Ordenar mi semana", corto: "Mi semana", categoria: "orden", paraQue: null, hitos: [] },
  { id: "m3", titulo: "Darme pausas en el día", corto: "Pausas", categoria: "bienestar", paraQue: null, hitos: [] },
];
// Busca en las metas de Camila y en las de Martín (más abajo).
export const metaPorId = (id: string) => [...metas, ...metasCercano].find((m) => m.id === id)!;
// Metas de la misma persona que la meta dada (para el nombre corto con dos metas de una categoría).
export const metasDeLaPersona = (metaId: string) => (metas.some((m) => m.id === metaId) ? metas : metasCercano);

// ---------------------------------------------------------------------------
// Programa publicado: acciones con horario o flexibles, días de la semana y semanas

export type AccionPrograma = {
  id: string;
  metaId: string;
  titulo: string; // verbo + objeto, 2 a 60
  hora: string | null; // null = flexible
  duracion: number; // minutos
  dias: number[]; // 1 = lunes … 7 = domingo
  semanas: number[];
  instrucciones: string[];
  versionCorta: string | null;
  conFoto: boolean; // solo Acompañamiento cercano
};

const TODAS = [1, 2, 3, 4];

export const programa = {
  ejemplo: true as const,
  version: 1,
  publicadoEl: "2026-10-02" as Iso,
  focoInicial: "Marcar lo que hagas, aunque sea poco.",
  notaCambios: null as string | null,
  acciones: [
    {
      id: "a1",
      metaId: "m1",
      titulo: "Escribir a quién quieres ayudar",
      hora: "08:30",
      duracion: 30,
      dias: [1],
      semanas: TODAS,
      instrucciones: [
        "Abre una nota en tu teléfono o en un cuaderno.",
        "Escribe en pocas líneas a quién te gustaría ayudar con tu taller y qué le cuesta hoy.",
        "No lo corrijas: basta con que quede escrito.",
      ],
      versionCorta: "escribe solo 3 ideas en 10 minutos",
      conFoto: false,
    },
    {
      id: "a2",
      metaId: "m1",
      titulo: "Conversar con un posible cliente",
      hora: "18:00",
      duracion: 45,
      dias: [3],
      semanas: TODAS,
      instrucciones: [
        "Escríbele a una persona que podría tomar tu taller y pregúntale si tiene 30 minutos para conversar.",
        "Pregúntale qué le cuesta hoy y anota sus palabras, sin venderle nada.",
      ],
      versionCorta: null,
      conFoto: false,
    },
    {
      id: "a3",
      metaId: "m1",
      titulo: "Escribir 3 ideas para tu taller",
      hora: "08:30",
      duracion: 30,
      dias: [2, 4],
      semanas: TODAS,
      instrucciones: ["Antes de revisar el teléfono, escribe 3 ideas de temas para tu taller.", "Marca la que más te entusiasma."],
      versionCorta: "escribe solo 1 idea en 5 minutos",
      conFoto: false,
    },
    {
      id: "a4",
      metaId: "m2",
      titulo: "Reservar 2 bloques de trabajo",
      hora: "09:00",
      duracion: 20,
      dias: [1],
      semanas: TODAS,
      instrucciones: ["Abre tu calendario y reserva 2 bloques de 1 hora para esta semana.", "Ponles nombre: qué vas a hacer en cada uno."],
      versionCorta: null,
      conFoto: false,
    },
    {
      id: "a5",
      metaId: "m2",
      titulo: "Revisar la agenda",
      hora: "19:00",
      duracion: 15,
      dias: [2, 5],
      semanas: TODAS,
      instrucciones: ["Mira lo que tienes mañana y elige lo primero que vas a hacer."],
      versionCorta: "mira solo lo que tienes mañana en la mañana",
      conFoto: false,
    },
    {
      id: "a7",
      metaId: "m3",
      titulo: "Pausa de 5 minutos lejos de la pantalla",
      hora: null,
      duracion: 5,
      dias: [1, 2, 3, 4, 5],
      semanas: TODAS,
      instrucciones: ["Cuando puedas este día, levántate y camina 5 minutos sin el teléfono."],
      versionCorta: null,
      conFoto: false,
    },
    {
      id: "a8",
      metaId: "m3",
      titulo: "Cerrar el día: 3 cosas que hiciste",
      hora: "21:00",
      duracion: 10,
      dias: [1, 3, 5],
      semanas: TODAS,
      instrucciones: ["Antes de dormir, anota 3 cosas que hiciste hoy, por pequeñas que sean."],
      versionCorta: null,
      conFoto: false,
    },
  ] as AccionPrograma[],
};

// ---------------------------------------------------------------------------
// Ocurrencias fechadas (D5) y registros

// hecha · corta (versión corta, suma igual) · dejada (Dejarla pasar) · fotos: revision, aprobada, no_aprobada
export type EstadoRegistro = "hecha" | "corta" | "dejada" | "revision" | "aprobada" | "no_aprobada";
export const cuentaComoHecha = (e: EstadoRegistro | null) => e === "hecha" || e === "corta" || e === "aprobada";

export type Ocurrencia = {
  id: string; // «a1-2026-10-05»
  accionId: string;
  metaId: string;
  categoria: CategoriaId;
  fecha: Iso;
  semana: number;
  titulo: string;
  hora: string | null;
  duracion: number;
  instrucciones: string[];
  versionCorta: string | null;
  conFoto: boolean;
  vigente: boolean;
  anulada?: { motivo: "ajuste" | "pausa"; en: Iso }; // solo si vigente es false (6.4)
  registro: EstadoRegistro | null;
};

// Registros de la semana 1 y de la semana 2 hasta hoy («accion@fecha»).
const REGISTROS: Record<string, EstadoRegistro> = {
  // Lunes 5: 3 de 4 (queda fuera de la ventana de 7 días: «ya quedó cerrada»)
  "a1@2026-10-05": "hecha",
  "a4@2026-10-05": "hecha",
  "a7@2026-10-05": "hecha",
  // Martes 6: 2 de 3, una dejada pasar
  "a3@2026-10-06": "hecha",
  "a7@2026-10-06": "hecha",
  "a5@2026-10-06": "dejada",
  // Miércoles 7: día completo
  "a2@2026-10-07": "hecha",
  "a7@2026-10-07": "hecha",
  "a8@2026-10-07": "hecha",
  // Jueves 8: sin registros (quedan en «De días anteriores»)
  // Viernes 9: día completo (una en versión corta)
  "a5@2026-10-09": "corta",
  "a7@2026-10-09": "hecha",
  "a8@2026-10-09": "hecha",
  // Lunes 12: día completo
  "a1@2026-10-12": "hecha",
  "a4@2026-10-12": "hecha",
  "a7@2026-10-12": "hecha",
  "a8@2026-10-12": "hecha",
  // Martes 13 (hoy): 1 de 3
  "a3@2026-10-13": "hecha",
};

// Orden del día: con horario por hora, después las flexibles.
const ordenDelDia = (a: Ocurrencia, b: Ocurrencia) =>
  a.hora && b.hora ? a.hora.localeCompare(b.hora) : a.hora ? -1 : b.hora ? 1 : a.titulo.localeCompare(b.titulo);

function generar(acciones: AccionPrograma[] = programa.acciones, registros: Record<string, EstadoRegistro> = REGISTROS, lista_metas: Meta[] = metas): Ocurrencia[] {
  const lista: Ocurrencia[] = [];
  for (let semana = 1; semana <= ciclo.semanas; semana++) {
    for (let d = 0; d < 7; d++) {
      const fecha = sumarDias(lunesDeSemana(semana), d);
      for (const a of acciones) {
        if (!a.semanas.includes(semana) || !a.dias.includes(diaSemana(fecha))) continue;
        const meta = lista_metas.find((m) => m.id === a.metaId)!;
        lista.push({
          id: `${a.id}-${fecha}`,
          accionId: a.id,
          metaId: a.metaId,
          categoria: meta.categoria,
          fecha,
          semana,
          titulo: a.titulo,
          hora: a.hora,
          duracion: a.duracion,
          instrucciones: a.instrucciones,
          versionCorta: a.versionCorta,
          conFoto: a.conFoto,
          vigente: true,
          registro: registros[`${a.id}@${fecha}`] ?? null,
        });
      }
    }
  }
  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha) || ordenDelDia(a, b));
}

export const ocurrencias: Ocurrencia[] = generar();
export const ocurrenciaPorId = (id: string) => ocurrencias.find((o) => o.id === id);
export const ocurrenciasDel = (fecha: Iso, lista = ocurrencias) => lista.filter((o) => o.fecha === fecha && o.vigente);

// «De días anteriores» (4.6): últimos 7 días, sin registro, vigentes.
export function pendientesAnteriores(hoy: Iso = HOY, lista = ocurrencias, ventana = 7): Ocurrencia[] {
  const desde = sumarDias(hoy, -ventana);
  return lista.filter((o) => o.vigente && o.registro === null && o.fecha < hoy && o.fecha >= desde);
}

// ---------------------------------------------------------------------------
// Créditos, racha y nivel (mismas reglas que la base: plataforma 8.2-K)

export type EstadoDia = "sin_acciones" | "completo" | "incompleto" | "suspenso" | "en_curso";
export type DiaProgreso = {
  fecha: Iso;
  programadas: number;
  hechas: number;
  enRevision: number;
  dejadas: number;
  estado: EstadoDia;
  bono: number; // bono de día completo ganado ese día (0 si no)
  creditos: number; // créditos del día: acciones + bono
  racha: number; // días completos seguidos al cerrar el día
};

export function calcularProgreso(lista: Ocurrencia[] = ocurrencias, hoy: Iso = HOY, inicio: Iso = ciclo.inicio) {
  const dias: DiaProgreso[] = [];
  let racha = 0;
  let total = 0;
  for (let fecha = inicio; fecha <= hoy; fecha = sumarDias(fecha, 1)) {
    const del = ocurrenciasDel(fecha, lista);
    const hechas = del.filter((o) => cuentaComoHecha(o.registro)).length;
    const enRevision = del.filter((o) => o.registro === "revision").length;
    const dejadas = del.filter((o) => o.registro === "dejada").length;
    let estado: EstadoDia;
    let bono = 0;
    if (!del.length) estado = "sin_acciones"; // no corta la racha
    else if (hechas === del.length) {
      racha += 1;
      bono = bonoDiario(racha);
      estado = "completo";
    } else if (hechas + enRevision === del.length) estado = "suspenso"; // ni suma bono ni corta
    else if (fecha === hoy) estado = "en_curso"; // hoy incompleto no corta
    else {
      racha = 0;
      estado = "incompleto";
    }
    const creditos = hechas * reglasCreditos.porAccion + bono;
    total += creditos;
    dias.push({ fecha, programadas: del.length, hechas, enRevision, dejadas, estado, bono, creditos, racha });
  }
  const { actual, siguiente } = nivelPara(total);
  return {
    dias,
    creditos: total,
    racha,
    nivel: actual,
    siguiente, // undefined en el nivel máximo
    bonoSiguiente: bonoDiario(racha + 1), // bono que daría completar el próximo día
  };
}

export const progreso = calcularProgreso();

// Resumen de una semana hasta hoy, por meta (nunca cuenta acciones futuras como faltantes).
export function resumenSemana(n: number, hoy: Iso = HOY, lista = ocurrencias) {
  const hasta = (o: Ocurrencia) => o.fecha <= hoy;
  const deSemana = lista.filter((o) => o.semana === n && o.vigente && hasta(o));
  const porMeta = metas.map((m) => {
    const delaMeta = deSemana.filter((o) => o.metaId === m.id);
    return { meta: m, programadas: delaMeta.length, hechas: delaMeta.filter((o) => cuentaComoHecha(o.registro)).length };
  });
  const diasCompletos = progreso.dias.filter((d) => semanaDelCiclo(d.fecha) === n && d.estado === "completo").length;
  return {
    semana: n,
    futura: lunesDeSemana(n) > hoy,
    programadas: deSemana.length,
    hechas: deSemana.filter((o) => cuentaComoHecha(o.registro)).length,
    porMeta,
    diasCompletos,
  };
}

// ---------------------------------------------------------------------------
// Registro semanal (lo escribe la persona) y revisión semanal (la hace su coach)

export type Carga = "liviana" | "justa" | "pesada";
export type RegistroSemanal = {
  semana: number;
  carga: Carga | null;
  funciono: string;
  costo: string;
  cambiar: string;
  enviadoEl: Iso | null; // null = borrador
};
export type Revision = {
  semana: number;
  iniciadaEl: Iso | null;
  publicadaEl: Iso | null;
  funciono: string;
  ajustamos: string;
  foco: string; // 1 a 3 frases: es el foco de «Hoy» de la semana siguiente
};

export const registrosSemanales: RegistroSemanal[] = [
  {
    semana: 1,
    carga: "justa",
    funciono: "Escribir temprano, antes de revisar el teléfono.",
    costo: "El jueves se me juntó todo y no alcancé nada.",
    cambiar: "Me gustaría que el jueves tuviera menos cosas.",
    enviadoEl: "2026-10-07",
  },
];

export const revisiones: Revision[] = [
  {
    semana: 1,
    iniciadaEl: "2026-10-08",
    publicadaEl: "2026-10-08",
    funciono: "Las acciones de la mañana te están resultando: las marcaste casi todas.",
    ajustamos: "Por ahora nada: la carga se ve posible. Si el jueves se vuelve a juntar todo, lo conversamos.",
    foco: "Empezar por lo más chico.",
  },
];

// Foco vigente en «Hoy»: el de la última revisión publicada; en la semana 1, el foco inicial.
export const focoDeLaSemana = (n: number, revs: Revision[] = revisiones, focoInicial: string = programa.focoInicial) =>
  n === 1 ? focoInicial : (revs.find((r) => r.semana === n - 1 && r.publicadaEl)?.foco ?? null);

// ---------------------------------------------------------------------------
// Solicitudes de ajuste (4.13) y novedades de «Hoy» (4.4.3)

export type EstadoAjuste = "enviada" | "en_revision" | "respondida" | "sin_cambios";
export type SolicitudAjuste = {
  id: string;
  tipo: string; // valor de AJUSTE.tipo.opciones (formularios.ts)
  acciones: string[]; // ids de ocurrencias
  desde: Iso;
  detalle: string;
  enviadaEl: Iso;
  estado: EstadoAjuste;
  respuesta: string | null;
};

export const solicitudesAjuste: SolicitudAjuste[] = [
  {
    id: "s1",
    tipo: "horarios",
    acciones: ["a5-2026-10-06"],
    desde: "2026-10-06",
    detalle: "Los martes salgo tarde del trabajo.",
    enviadaEl: "2026-10-06",
    estado: "respondida",
    respuesta: "Dejamos «Revisar la agenda» a las 19:00, cuando ya saliste del trabajo.",
  },
  // La misma que el panel muestra pendiente (aj-2): «Para tu revisión del jueves 15».
  {
    id: "s2",
    tipo: "accion",
    acciones: ["a3-2026-10-15"],
    desde: "2026-10-15",
    detalle: "Los jueves se me junta todo. ¿Podemos mover esta acción a otro día?",
    enviadaEl: "2026-10-12",
    estado: "enviada",
    respuesta: null,
  },
];

export type Novedad = { id: string; texto: string; enlace: string; destino: "semana" | "ajuste" | "programa" | "accion" };
export const novedades: Novedad[] = [
  { id: "n1", texto: "Tu coach respondió tu registro de la semana 1.", enlace: "Ver la revisión", destino: "semana" },
  { id: "n2", texto: "Respondimos tu solicitud de ajuste.", enlace: "Ver la respuesta", destino: "ajuste" },
];

// ---------------------------------------------------------------------------
// Martín: Acompañamiento cercano (variantes «cercano» de Mi espacio y acciones con foto, 4.9).
// Es el mismo Martín del panel: videollamada los martes a las 19:00 (hora de Chile; hoy le toca),
// vive en Lima (2 horas menos que Chile en octubre) y está en su ciclo 2: sus fotos del ciclo 1
// son las que el panel tiene para depurar.

export const participanteCercano = {
  ejemplo: true as const,
  nombre: "Martín",
  correo: "martin@ejemplo.cl",
  zonaHoraria: "America/Lima",
  diferenciaConChile: -2, // horas, en octubre (Chile con horario de verano, Lima sin cambio)
};

export const cicloCercano = {
  ...ciclo,
  numero: 2,
  plan: "cercano" as PlanParam,
  diaRevision: 2, // los martes
  horaVideollamada: "19:00",
  reordenamientosUsados: 1,
};

// «19:00» de Chile → hora local de Martín («17:00»).
export const horaLocalCercano = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return `${String((h + participanteCercano.diferenciaConChile + 24) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const metasCercano: Meta[] = [
  {
    id: "n1",
    titulo: "Terminar mi portafolio",
    corto: "Portafolio",
    categoria: "proyecto",
    paraQue: "Quiero postular a trabajos de diseño con algo que muestre lo que sé hacer.",
    hitos: [{ texto: "Elegir los 5 proyectos del portafolio", logrado: true }],
  },
  { id: "n2", titulo: "Ordenar mis mañanas", corto: "Mañanas", categoria: "orden", paraQue: null, hitos: [] },
];

export const programaCercano = {
  ejemplo: true as const,
  version: 1,
  publicadoEl: "2026-10-02" as Iso,
  focoInicial: "Una pieza del portafolio por vez.",
  acciones: [
    {
      id: "b1",
      metaId: "n1",
      titulo: "Avanzar una pieza del portafolio",
      hora: "08:00",
      duracion: 45,
      dias: [1, 3, 5],
      semanas: TODAS,
      instrucciones: ["Elige una pieza y trabájala 45 minutos, antes de abrir el correo.", "Al terminar, anota qué le falta."],
      versionCorta: "trabaja 15 minutos en la misma pieza",
      conFoto: false,
    },
    {
      id: "b2",
      metaId: "n1",
      titulo: "Revisar el portafolio",
      hora: "18:30",
      duracion: 30,
      dias: [3],
      semanas: TODAS,
      instrucciones: ["Mira el portafolio completo como si fueras quien te va a contratar.", "Anota una sola mejora para la próxima semana."],
      versionCorta: null,
      conFoto: false,
    },
    {
      id: "b3",
      metaId: "n2",
      titulo: "Preparar la semana",
      hora: "18:00",
      duracion: 20,
      dias: [5],
      semanas: TODAS,
      instrucciones: ["Mira tu calendario de la semana que viene y elige tus 3 mañanas de portafolio."],
      versionCorta: null,
      conFoto: false,
    },
    {
      id: "b6",
      metaId: "n2",
      titulo: "Desayunar sin pantallas",
      hora: "07:30",
      duracion: 20,
      dias: [2, 4],
      semanas: TODAS,
      instrucciones: ["Deja el teléfono en otra pieza mientras tomas desayuno."],
      versionCorta: null,
      conFoto: false,
    },
    // Una acción con foto por semana (5.6: más de una es alcance comercial).
    {
      id: "b5",
      metaId: "n2",
      titulo: "Imprimir tu plan de la semana",
      hora: null,
      duracion: 10,
      dias: [4],
      semanas: [1],
      instrucciones: ["Imprime o escribe a mano tu plan de la semana y déjalo a la vista.", "Sácale una foto."],
      versionCorta: null,
      conFoto: true,
    },
    {
      id: "b4",
      metaId: "n2",
      titulo: "Ordenar tu escritorio",
      hora: null,
      duracion: 15,
      dias: [2],
      semanas: [2, 3, 4],
      instrucciones: ["Despeja tu escritorio y deja a mano solo lo que usas para trabajar.", "Sácale una foto al terminar."],
      versionCorta: null,
      conFoto: true,
    },
  ] as AccionPrograma[],
};

const REGISTROS_CERCANO: Record<string, EstadoRegistro> = {
  "b1@2026-10-05": "hecha",
  "b6@2026-10-06": "hecha",
  "b1@2026-10-07": "hecha",
  "b2@2026-10-07": "hecha",
  "b6@2026-10-08": "hecha",
  "b5@2026-10-08": "revision", // «No puedo subir una foto»: explicación por revisar en el panel
  "b1@2026-10-09": "corta",
  "b3@2026-10-09": "hecha",
  // Lunes 12, feriado: «se me corrió toda la semana» (registro de la semana 2 en el panel).
  "b6@2026-10-13": "hecha",
  "b4@2026-10-13": "revision", // foto de hoy por revisar en el panel
};

export const ocurrenciasCercano: Ocurrencia[] = generar(programaCercano.acciones, REGISTROS_CERCANO, metasCercano);

export const registrosSemanalesCercano: RegistroSemanal[] = [
  {
    semana: 1,
    carga: "justa",
    funciono: "Las mañanas de portafolio antes del correo.",
    costo: "Imprimir el plan: no tengo impresora en la casa.",
    cambiar: "",
    enviadoEl: "2026-10-05",
  },
];

export const revisionesCercano: Revision[] = [
  {
    semana: 1,
    iniciadaEl: "2026-10-06",
    publicadaEl: "2026-10-06",
    funciono: "Las mañanas de portafolio te están resultando: llegaste a la videollamada con dos piezas avanzadas.",
    ajustamos: "El plan de la semana puede ir escrito a mano; no necesitas impresora.",
    foco: "Una pieza por vez, antes de abrir el correo.",
  },
];

export const solicitudesAjusteCercano: SolicitudAjuste[] = [
  {
    id: "s3",
    tipo: "horarios",
    acciones: ["b2-2026-10-14", "b3-2026-10-16"],
    desde: "2026-10-14",
    detalle: "El lunes fue feriado y se me corrió toda la semana. Esta semana salgo más tarde del trabajo.",
    enviadaEl: HOY,
    estado: "enviada",
    respuesta: null,
  },
];

// Acción con foto de hoy (la misma que el panel tiene por revisar) y una del ciclo 1 ya depurada.
export const accionConFoto: Ocurrencia = ocurrenciasCercano.find((o) => o.id === "b4-2026-10-13")!;
export const accionFotoDepurada: Ocurrencia = {
  ...accionConFoto,
  id: "b4-2026-09-01",
  fecha: "2026-09-01",
  semana: 2,
  registro: "aprobada",
};

// Lo que puede pasar con la foto de hoy de Martín cuando su coach la revise (4.9): aprobada con
// nota, o no aprobada con la nota de la primera plantilla del panel. Plazo de depuración: 30
// días desde la revisión (5.11).
export const DIAS_DEPURACION = 30;
export const accionFotoAprobada: Ocurrencia = { ...accionConFoto, registro: "aprobada" };
export const NOTA_FOTO_APROBADA = "Se ve ordenado y con lo justo a mano.";
export const accionFotoNoAprobada: Ocurrencia = { ...accionConFoto, registro: "no_aprobada" };
export const NOTA_FOTO_NO_APROBADA = "No alcanzo a ver la acción en la foto. ¿Puedes enviar otra?";

// Acciones anuladas (4.8): la versión de «Revisar la agenda» de las 18:00 que Camila tenía los
// martes, quitada en el ajuste del 6 de octubre (s1), y una mañana de portafolio de Martín en
// la semana de pausa de su ciclo 1.
export const accionAnuladaAjuste: Ocurrencia = {
  ...ocurrencias.find((o) => o.id === "a5-2026-10-13")!,
  id: "a5v1-2026-10-13",
  hora: "18:00",
  vigente: false,
  anulada: { motivo: "ajuste", en: "2026-10-06" },
  registro: null,
};
export const accionAnuladaPausa: Ocurrencia = {
  ...ocurrenciasCercano.find((o) => o.id === "b1-2026-10-05")!,
  id: "b1-2026-09-16",
  fecha: "2026-09-16",
  semana: 3,
  vigente: false,
  anulada: { motivo: "pausa", en: "2026-09-14" },
  registro: null,
};

// Escenarios de Mi espacio: lo que cambia entre Camila y Martín.
export type Escenario = {
  participante: { nombre: string; zonaHoraria: string };
  plan: PlanParam;
  diaRevision: number;
  horaVideollamada: string;
  horaLocal: ((hora: string) => string) | null; // null: en hora de Chile
  reordenamientosUsados: number;
  metas: Meta[];
  ocurrencias: Ocurrencia[];
  focoInicial: string;
  registrosSemanales: RegistroSemanal[];
  revisiones: Revision[];
  solicitudesAjuste: SolicitudAjuste[];
};

export const ESCENARIO_COACH: Escenario = {
  participante,
  plan: "coach",
  diaRevision: ciclo.diaRevision,
  horaVideollamada: ciclo.horaVideollamada,
  horaLocal: null,
  reordenamientosUsados: 0,
  metas,
  ocurrencias,
  focoInicial: programa.focoInicial,
  registrosSemanales,
  revisiones,
  solicitudesAjuste,
};

export const ESCENARIO_CERCANO: Escenario = {
  participante: participanteCercano,
  plan: "cercano",
  diaRevision: cicloCercano.diaRevision,
  horaVideollamada: cicloCercano.horaVideollamada,
  horaLocal: horaLocalCercano,
  reordenamientosUsados: cicloCercano.reordenamientosUsados,
  metas: metasCercano,
  ocurrencias: ocurrenciasCercano,
  focoInicial: programaCercano.focoInicial,
  registrosSemanales: registrosSemanalesCercano,
  revisiones: revisionesCercano,
  solicitudesAjuste: solicitudesAjusteCercano,
};

// ---------------------------------------------------------------------------
// Sofía: postula hoy en /postular/ («Proyectos y emprendimiento», «Con acompañamiento»). Su
// solicitud es la que muestran la confirmación y cada estado de /estado/, y la misma que el panel
// tiene en su bandeja (recibida hoy a las 10:42). Las fechas de los estados posteriores (acuerdo,
// inicio del ciclo) son las que tendría si avanza.

export const POSTULANTE = {
  ejemplo: true as const,
  nombre: "Sofía",
  correo: "sofia@ejemplo.cl",
  correoEnmascarado: "s•••@ejemplo.cl",
  correoMalEscrito: "sofia@gmial.com",
  recibida: HOY,
  hora: "10:42",
};
