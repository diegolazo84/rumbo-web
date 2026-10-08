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

export type Progreso = ReturnType<typeof calcularProgreso>;

// ---------------------------------------------------------------------------
// Rutas entre pantallas

export type RutasEspacio = {
  hoy: string;
  calendario: string;
  progreso: string;
  semana: string;
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
};

export const R_PREVIA: RutasEspacio = {
  ...RUTAS_MI_ESPACIO,
  postular: RUTAS_PUBLICAS.postular,
  entrar: rutaPrevia("mi-espacio/entrar/"),
  revisaCorreo: rutaPrevia("mi-espacio/entrar/revisa-tu-correo/"),
  calendarioDia: rutaPrevia("mi-espacio/calendario/dia/"),
  calendarioMes: rutaPrevia("mi-espacio/calendario/mes/"),
  accion: rutaPrevia("mi-espacio/accion/"),
  creditos: rutaPrevia("mi-espacio/progreso/creditos/"),
  semanaPublicada: rutaPrevia("mi-espacio/semana/publicada/"),
  semanaEnviado: rutaPrevia("mi-espacio/semana/enviado/"),
  ajusteLista: `${RUTAS_MI_ESPACIO.ajuste}#tus-solicitudes`,
  eliminar: rutaPrevia("mi-espacio/preferencias/eliminar/"),
  ayuda: rutaPrevia("mi-espacio/ayuda/"),
  privacidad: "/privacidad/",
  condiciones: "/condiciones/",
};

// Rutas reales (plataforma 2.1). Los identificadores van en la búsqueda (?id=, ?n=), nunca en la ruta.
export const R_REAL: RutasEspacio = {
  hoy: "/mi-espacio/",
  calendario: "/mi-espacio/calendario/",
  progreso: "/mi-espacio/progreso/",
  semana: "/mi-espacio/semana/",
  ajuste: "/mi-espacio/ajuste/",
  preferencias: "/mi-espacio/preferencias/",
  salir: "/mi-espacio/entrar/?salir=1",
  postular: "/postular/",
  entrar: "/mi-espacio/entrar/",
  revisaCorreo: "/mi-espacio/entrar/",
  calendarioDia: "/mi-espacio/calendario/?vista=dia",
  calendarioMes: "/mi-espacio/calendario/?vista=mes",
  accion: "/mi-espacio/accion/",
  creditos: "/mi-espacio/progreso/creditos/",
  semanaPublicada: "/mi-espacio/semana/",
  semanaEnviado: "/mi-espacio/semana/",
  ajusteLista: "/mi-espacio/ajuste/#tus-solicitudes",
  eliminar: "/mi-espacio/preferencias/eliminar/",
  ayuda: "/mi-espacio/ayuda/",
  privacidad: "/privacidad/",
  condiciones: "/condiciones/",
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
  guardarRegistroSemanal: (semana: number, datos: DatosRegistroSemanal, enviar: boolean) => Promise<void>;
  pedirAjuste: (datos: DatosAjuste) => Promise<SolicitudAjuste>;
  guardarNombre: (nombre: string) => Promise<void>;
  mostrarCreditos: (mostrar: boolean) => Promise<void>;
  pedirDerecho: (tipo: string, detalle: string | null) => Promise<Iso | null>; // fecha límite, si hay
  exportar: () => Promise<unknown>;
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
  servidor: Servidor | null;
};

// ---------------------------------------------------------------------------
// Vista previa (por defecto)

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
  servidor: null,
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
