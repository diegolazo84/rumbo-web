// Contexto de las pantallas de Mi espacio (plataforma 4): las mismas pantallas corren en la vista
// previa (datos de ejemplo de ejemplo-app.ts, rutas bajo /vista-previa/, marcar simulado) y en
// Mi espacio real (datos de la base por RLS, rutas /mi-espacio/…, marcar con las RPC de 6.7).
// Por defecto, vista previa: el registro de la vista previa no cambia. El modo real lo pone
// src/pages/plataforma/mi-espacio/ProveedorEspacio.tsx con los datos de la persona.
// Es el mismo patrón que vista-previa/formulario/modo.ts para /postular/, /estado/ y /contacto/.
import { createContext, useContext } from "react";
import * as E from "../../../data/ejemplo-app";
import type { Escenario, EstadoRegistro, Meta, Novedad, Ocurrencia, PlanParam, Revision, SolicitudAjuste, calcularProgreso } from "../../../data/ejemplo-app";
import { LIMITES } from "../../../data/formularios";
import { diasEntre, sumarDias, type Iso } from "../../../lib/fechas";
import { RUTAS_MI_ESPACIO, RUTAS_PUBLICAS, rutaPrevia } from "../rutas";
import type { Aviso } from "./avisos/datos";

export type Progreso = ReturnType<typeof calcularProgreso>;

// ---------------------------------------------------------------------------
// Rutas entre pantallas

// Rumbo 2.0 (etapa 2): `calendario` es Mi plan, `semana` es Mi acompañamiento y `progreso` es
// Mis logros (las claves se mantienen para no tocar cada pantalla; cambian las rutas).
export type RutasEspacio = {
  hoy: string;
  calendario: string;
  metas: string;
  progreso: string;
  semana: string;
  comunidad: string;
  comunidadCrear: string;
  comunidadGrupos: string;
  loQueViene: string;
  misDatos: string;
  ajuste: string;
  preferencias: string;
  salir: string;
  postular: string;
  entrar: string;
  revisaCorreo: string;
  calendarioDia: string;
  calendarioMes: string;
  accion: string;
  creditos: string;
  semanaPublicada: string;
  semanaEnviado: string;
  ajusteLista: string;
  eliminar: string;
  ayuda: string;
  privacidad: string;
  condiciones: string;
  avisos: string;
  recordatorios: string;
};

export const R_PREVIA: RutasEspacio = {
  hoy: RUTAS_MI_ESPACIO.rumbo,
  calendario: RUTAS_MI_ESPACIO.plan,
  metas: rutaPrevia("mi-espacio/plan/metas/"),
  progreso: RUTAS_MI_ESPACIO.logros,
  semana: RUTAS_MI_ESPACIO.acompanamiento,
  comunidad: RUTAS_MI_ESPACIO.comunidad,
  comunidadCrear: rutaPrevia("mi-espacio/comunidad/crear/"),
  comunidadGrupos: rutaPrevia("mi-espacio/comunidad/grupos/"),
  loQueViene: RUTAS_MI_ESPACIO.loQueViene,
  misDatos: RUTAS_MI_ESPACIO.misDatos,
  ajuste: RUTAS_MI_ESPACIO.ajuste,
  preferencias: RUTAS_MI_ESPACIO.preferencias,
  salir: RUTAS_MI_ESPACIO.salir,
  postular: RUTAS_PUBLICAS.postular,
  entrar: rutaPrevia("mi-espacio/entrar/"),
  revisaCorreo: rutaPrevia("mi-espacio/entrar/revisa-tu-correo/"),
  calendarioDia: rutaPrevia("mi-espacio/plan/dia/"),
  calendarioMes: rutaPrevia("mi-espacio/plan/mes/"),
  accion: rutaPrevia("mi-espacio/plan/accion/"),
  creditos: rutaPrevia("mi-espacio/logros/creditos/"),
  semanaPublicada: rutaPrevia("mi-espacio/acompanamiento/publicada/"),
  semanaEnviado: rutaPrevia("mi-espacio/acompanamiento/enviado/"),
  ajusteLista: `${RUTAS_MI_ESPACIO.ajuste}#tus-solicitudes`,
  eliminar: rutaPrevia("mi-espacio/preferencias/eliminar/"),
  ayuda: rutaPrevia("mi-espacio/ayuda/"),
  privacidad: "/privacidad/",
  condiciones: "/condiciones/",
  avisos: rutaPrevia("mi-espacio/avisos/"),
  recordatorios: rutaPrevia("mi-espacio/preferencias/recordatorios/"),
};

// Rutas reales (plataforma 2.1). Los identificadores van en la búsqueda (?id=, ?n=), nunca en la ruta.
export const R_REAL: RutasEspacio = {
  hoy: "/mi-espacio/",
  calendario: "/mi-espacio/plan/",
  metas: "/mi-espacio/plan/metas/",
  progreso: "/mi-espacio/logros/",
  semana: "/mi-espacio/acompanamiento/",
  comunidad: "/mi-espacio/comunidad/",
  comunidadCrear: "/mi-espacio/comunidad/crear/",
  comunidadGrupos: "/mi-espacio/comunidad/grupos/",
  loQueViene: "/mi-espacio/lo-que-viene/",
  misDatos: "/mi-espacio/preferencias/#mis-datos",
  ajuste: "/mi-espacio/plan/ajuste/",
  preferencias: "/mi-espacio/preferencias/",
  salir: "/mi-espacio/entrar/?salir=1",
  postular: "/postular/",
  entrar: "/mi-espacio/entrar/",
  revisaCorreo: "/mi-espacio/entrar/",
  calendarioDia: "/mi-espacio/plan/?vista=dia",
  calendarioMes: "/mi-espacio/plan/?vista=mes",
  accion: "/mi-espacio/plan/accion/",
  creditos: "/mi-espacio/logros/creditos/",
  semanaPublicada: "/mi-espacio/acompanamiento/",
  semanaEnviado: "/mi-espacio/acompanamiento/",
  ajusteLista: "/mi-espacio/plan/ajuste/#tus-solicitudes",
  eliminar: "/mi-espacio/preferencias/eliminar/",
  ayuda: "/mi-espacio/ayuda/",
  privacidad: "/privacidad/",
  condiciones: "/condiciones/",
  avisos: "/mi-espacio/avisos/",
  recordatorios: "/mi-espacio/preferencias/recordatorios/",
};

// ---------------------------------------------------------------------------
// Datos

export type EstadoCiclo = "preparacion" | "en_curso" | "pausa" | "cerrado";

export type CicloEspacio = {
  numero: number;
  plan: PlanParam;
  semanas: number;
  inicio: Iso; // siempre un lunes (6.4)
  fin: Iso;
  diaRevision: number; // 1 = lunes … 5 = viernes
  horaVideollamada: string; // «19:00», hora de Chile (solo cercano)
  reordenamientosUsados: number;
  reordenamientosMax: number;
  estado: EstadoCiclo;
  pausa?: { motivo: "pedida" | "cuidado"; desde: Iso | null; hasta: Iso | null } | null;
};

export type ParticipanteEspacio = { nombre: string; correo: string; zonaHoraria: string; mostrarCreditosEnHoy: boolean };

export type Ausencia = { hasta: Iso; vuelve: Iso; texto: string; banda: string };

// Coach asignado (A3, mi_coach): solo nombre y presentación. Sin foto ni disponibilidad hasta que
// existan en la base. null: sin coach asignado, o la función todavía no está en la base.
export type CoachEspacio = { nombre: string; presentacion: string | null };

// Videollamada semanal del plan cercano (C2, tabla videollamadas): la agenda el coach.
export type VideollamadaEspacio = {
  semana: number;
  programadaPara: string; // timestamptz
  enlace: string;
  estado: "programada" | "realizada" | "no_asistio" | "cancelada";
};

export type NotaCambios = { version: number; nota: string; publicadoEl: Iso | null };

export type DatosRegistroSemanal = { carga: string | null; funciono: string; costo: string; cambiar: string };
export type DatosAjuste = { tipo: string; ocurrencias: string[]; desde: Iso; texto: string; pideReorden: boolean };

// Acciones contra la base (solo en Mi espacio real). Cada una actualiza el contexto al terminar.
export type Servidor = {
  // Marcar (hecha o corta), desmarcar (null) o dejar pasar: devuelve el progreso del servidor (D4).
  registrar: (id: string, estado: EstadoRegistro | null) => Promise<Progreso>;
  // «No puedo subir una foto» (4.9): la explicación queda «En revisión».
  registrarEvidencia: (id: string, explicacion: string) => Promise<Progreso>;
  eliminarEvidencia: (id: string) => Promise<Progreso>;
  // Fotos privadas (módulo «fotos»): sube una foto ya preparada (WebP, sin EXIF). «evidencia» en
  // acciones que la exigen (queda en revisión); «opcional» en las demás (complemento de «hecha»).
  subirFoto: (id: string, foto: Blob, modo: "evidencia" | "opcional") => Promise<Progreso>;
  quitarFoto: (id: string) => Promise<Progreso>; // foto opcional; la acción sigue hecha
  urlFoto: (ruta: string) => Promise<string>; // enlace firmado de 5 minutos
  guardarRegistroSemanal: (semana: number, datos: DatosRegistroSemanal, enviar: boolean) => Promise<void>;
  pedirAjuste: (datos: DatosAjuste) => Promise<SolicitudAjuste>;
  guardarNombre: (nombre: string) => Promise<void>;
  mostrarCreditos: (mostrar: boolean) => Promise<void>;
  pedirDerecho: (tipo: string, detalle: string | null) => Promise<Iso | null>; // fecha límite, si hay
  exportar: () => Promise<unknown>;
  verNovedad: (id: string) => void; // la novedad deja de mostrarse en Hoy
  // Mis avisos: marca como leídos los indicados (o todos con null); queda igual en todos los equipos.
  marcarAvisos: (ids: string[] | null) => Promise<void>;
  // Recordatorios: guarda todas las preferencias de una vez (guardar_recordatorios).
  guardarRecordatorios: (p: PrefRecordatorios) => Promise<void>;
  recargar: () => void;
};

export type Espacio = {
  real: boolean;
  R: RutasEspacio;
  hoy: Iso;
  ventana: number; // días de registro tardío (4.6)
  participante: ParticipanteEspacio;
  ciclo: CicloEspacio;
  esc: Escenario; // metas, ocurrencias, registros semanales, revisiones y ajustes de la persona
  metasTodas: Meta[]; // también las de versiones anteriores (para el detalle de acciones pasadas)
  progreso: Progreso | null; // real: el que calcula la base; vista previa: null (se simula)
  novedades: Novedad[];
  notasCambios: NotaCambios[];
  semanasEnRevision: number[]; // revisión iniciada y aún no publicada (6.4: iniciada_en)
  ausencia: Ausencia | null;
  coach: CoachEspacio | null;
  videollamadas: VideollamadaEspacio[];
  servidor: Servidor | null;
  fotos: boolean; // módulo «fotos» visible para las personas (solo Mi espacio real)
  avisos: Aviso[] | null; // Mis avisos (null: no se pudieron leer)
  comunidad: boolean; // módulo «comunidad» visible: su filtro y sus enlaces existen
  // Recordatorios: las preferencias guardadas (o las de por defecto); «no-disponible» si la base
  // todavía no tiene la migración de recordatorios completos; null si no se pudieron leer.
  recordatorios: PrefRecordatorios | "no-disponible" | null;
  correoDisponible: boolean | null; // Brevo configurado (correo_disponible); null: no se sabe
};

// Preferencias de recordatorios (tabla recordatorios). dias: 1 = lunes … 7 = domingo.
export type PrefRecordatorios = {
  activos: boolean;
  accionesDelDia: boolean;
  registroSemanal: boolean;
  videollamadas: boolean;
  mensajesCoach: boolean;
  comunidad: boolean;
  logros: boolean;
  porCorreo: boolean;
  desde: number;
  hasta: number;
  hora: number;
  dias: number[];
};

// Como vienen en la base si la persona nunca las guardó: todo apagado salvo lo que se activa al
// encender el interruptor general.
export const RECORDATORIOS_POR_DEFECTO: PrefRecordatorios = {
  activos: false,
  accionesDelDia: false,
  registroSemanal: false,
  videollamadas: true,
  mensajesCoach: true,
  comunidad: false,
  logros: true,
  porCorreo: false,
  desde: 7,
  hasta: 22,
  hora: 20,
  dias: [1, 2, 3, 4, 5, 6, 7],
};

// ---------------------------------------------------------------------------
// Vista previa (por defecto)

// Mis avisos de ejemplo: los mismos textos fijos que crea la base (sin nombres ni mensajes
// inventados). Fechas alrededor de E.HOY (13-oct-2026), hora de Chile (UTC−3).
const aviso = (id: string, tipo: string, titulo: string, enlace: string, creadoEn: string, leido = false): Aviso => ({
  id, tipo, titulo, enlace, creadoEn, leidoEn: leido ? creadoEn : null,
});
export const AVISOS_EJEMPLO: Aviso[] = [
  aviso("av-1", "recordatorio_acciones", "Hoy tienes acciones por marcar", "/mi-espacio/", "2026-10-13T11:00:00Z"),
  aviso("av-2", "revision_publicada", "Tu coach publicó la revisión de la semana 2", "/mi-espacio/acompanamiento/", "2026-10-13T12:15:00Z"),
  aviso("av-3", "reconocimiento", "Nuevo reconocimiento: Primera semana", "/mi-espacio/", "2026-10-12T22:40:00Z"),
  aviso("av-4", "recordatorio_registro", "Mañana es tu revisión: cuéntale a tu coach cómo te fue esta semana", "/mi-espacio/", "2026-10-12T21:00:00Z", true),
  aviso("av-5", "ajuste_respondido", "Tu coach respondió tu solicitud de ajuste", "/mi-espacio/acompanamiento/", "2026-10-12T15:30:00Z", true),
  aviso("av-6", "programa_publicado", "Tu plan tiene cambios", "/mi-espacio/plan/", "2026-10-12T15:25:00Z", true),
  aviso("av-7", "recordatorio_acciones", "Hoy tienes acciones por marcar", "/mi-espacio/", "2026-10-09T12:00:00Z", true),
  aviso("av-8", "reconocimiento", "Nuevo reconocimiento: Primer paso", "/mi-espacio/", "2026-10-06T23:10:00Z", true),
];

export const ESPACIO_PREVIA: Espacio = {
  real: false,
  R: R_PREVIA,
  hoy: E.HOY,
  ventana: LIMITES.diasRegistroTardio,
  participante: E.participante,
  ciclo: E.ciclo,
  esc: E.ESCENARIO_COACH,
  metasTodas: [...E.metas, ...E.metasCercano],
  progreso: null,
  novedades: E.novedades,
  notasCambios: [],
  semanasEnRevision: [],
  ausencia: E.AUSENCIA,
  // Vista previa: sin nombre de coach (no se inventa) y sin videollamadas agendadas.
  coach: null,
  videollamadas: [],
  servidor: null,
  fotos: false,
  avisos: AVISOS_EJEMPLO,
  comunidad: false,
  // Vista previa: como en la maqueta (interruptor encendido) y el correo sin configurar, como hoy.
  recordatorios: { ...RECORDATORIOS_POR_DEFECTO, activos: true, accionesDelDia: true, registroSemanal: true, dias: [1, 2, 3, 4, 5] },
  correoDisponible: false,
};

export const EspacioContexto = createContext<Espacio>(ESPACIO_PREVIA);

// Herramientas ligadas al ciclo de la persona (en la vista previa, las de ejemplo-app.ts).
export function useEspacio() {
  const esp = useContext(EspacioContexto);
  const { ciclo, R } = esp;
  const semanaDelCiclo = (fecha: Iso) => Math.floor(diasEntre(ciclo.inicio, fecha) / 7) + 1;
  const lunesDeSemana = (n: number) => sumarDias(ciclo.inicio, (n - 1) * 7);
  const fechaRevision = (n: number, dia: number = ciclo.diaRevision) => sumarDias(lunesDeSemana(n), dia - 1);
  const enPrograma = (fecha: Iso) => fecha >= ciclo.inicio && fecha <= ciclo.fin;
  // Busca en las metas de la persona; en la vista previa, también en las de Martín.
  const metaPorId = (id: string): Meta =>
    esp.metasTodas.find((m) => m.id === id) ?? { id, titulo: "", corto: "", categoria: "proyecto", paraQue: null, hitos: [] };
  const metasDeLaPersona = (metaId: string): Meta[] =>
    esp.real ? esp.esc.metas : E.metas.some((m) => m.id === metaId) ? E.metas : E.metasCercano;
  // Foco vigente en «Hoy»: el de la última revisión publicada; en la semana 1, el foco inicial.
  const focoDeLaSemana = (n: number, revs: Revision[] = esp.esc.revisiones, focoInicial: string = esp.esc.focoInicial) =>
    n === 1 ? focoInicial || null : (revs.find((r) => r.semana === n - 1 && r.publicadaEl)?.foco ?? null);
  // Pedir un ajuste con una acción elegida (se preselecciona en el formulario).
  const rutaAjuste = (ocurrencia?: string, tipo?: string) => {
    const q = new URLSearchParams();
    if (ocurrencia) q.set("accion", ocurrencia);
    if (tipo) q.set("tipo", tipo);
    const s = q.toString();
    return s ? `${R.ajuste}?${s}` : R.ajuste;
  };
  // «De días anteriores» (4.6): últimos días de la ventana, sin registro, vigentes.
  const pendientesAnteriores = (hoy: Iso, lista: Ocurrencia[]) => E.pendientesAnteriores(hoy, lista, esp.ventana);
  const dentroDeVentana = (fecha: Iso, hoy: Iso) => fecha <= hoy && fecha >= sumarDias(hoy, -esp.ventana);
  return {
    ...esp,
    semanaDelCiclo,
    lunesDeSemana,
    fechaRevision,
    enPrograma,
    metaPorId,
    metasDeLaPersona,
    focoDeLaSemana,
    rutaAjuste,
    pendientesAnteriores,
    dentroDeVentana,
  };
}
