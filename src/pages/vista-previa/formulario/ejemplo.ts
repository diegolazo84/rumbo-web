// DATOS DE EJEMPLO de /postular/, /estado/ y /contacto/ en la vista previa (etapa 0). Nada de
// esto es de una persona real: es Sofía, la postulante ficticia del guion de
// src/data/ejemplo-app.ts (la misma solicitud que el panel tiene en su bandeja), y toda pantalla
// que lo muestra lleva la etiqueta «Ejemplo». La meta es el ejemplo de la especificación (3.5).
// Las fechas son las del «hoy» de la vista previa y los plazos se cuentan con los mismos feriados
// que el panel; en la v1 real las fija el servidor (estado_postulaciones(), 6.6).
import { AUSENCIA, DIAS_PLAZO, HOY, POSTULANTE, plazoRespuesta, sumarHabilesEjemplo } from "../../../data/ejemplo-app";
import { POSTULAR, type DatosPostular } from "../../../data/formularios";
import { areas, planes } from "../../../data/rumbo";
import { fechaLarga, mayuscula, sumarDias, type Iso } from "../../../lib/fechas";

export { DIAS_PLAZO };

// «c•••@ejemplo.cl»
export function enmascararCorreo(correo: string): string {
  const [usuario, dominio] = correo.trim().toLowerCase().split("@");
  if (!dominio) return correo;
  return `${usuario.charAt(0)}•••@${dominio}`;
}

export const SOLICITUD = {
  ejemplo: true as const,
  nombre: POSTULANTE.nombre,
  correo: POSTULANTE.correo,
  correoEnmascarado: POSTULANTE.correoEnmascarado,
  area: "proyectos",
  apoyo: "coach",
  meta: POSTULAR.meta.ejemplos.proyectos,
  dias: ["Martes", "Jueves"],
  franjas: ["tarde"],
  avisos: true,
  enviada: POSTULANTE.recibida,
  hora: POSTULANTE.hora,
  token: "ejemplo-7c41e9a2d05b4f36",
  respondida: sumarDias(HOY, 1),
  aceptada: sumarDias(HOY, 7),
  inicioCiclo: sumarDias(HOY, 13), // lunes 26 de octubre
  retirada: HOY,
  // «Con atraso»: una solicitud de la semana anterior cuyo plazo ya pasó.
  enviadaConAtraso: sumarDias(HOY, -6),
  // Interés: Bienestar y autoestima.
  areaInteres: "bienestar",
  // Acuerdo: Con acompañamiento, revisión escrita los jueves. La forma de pago es el formato
  // de ejemplo de rumbo.ts (operacion.formaDePago todavía es null).
  formaDePago: "Por transferencia, una vez aceptadas las condiciones",
  diaRevision: "jueves",
  // Nota de cierre de ejemplo (nota_cierre, máx. 600): la escribe Diego al cerrar por capacidad.
  notaCierre: "Gracias por contarnos tu idea con tanto detalle. Si abrimos una nueva etapa, nos encantaría volver a leerte.",
};

export const plazoDe = plazoRespuesta;

// Ausencia de Diego (3.3): las solicitudes que lleguen hasta el día antes de su regreso se
// responden contando el plazo desde el regreso (la fecha válida la calcula el servidor, 6.6).
export const AUSENCIA_POSTULAR = {
  texto: AUSENCIA.texto.replace(/\.$/, ""),
  hasta: fechaLarga(AUSENCIA.hasta),
  fecha: fechaLarga(sumarHabilesEjemplo(AUSENCIA.vuelve, DIAS_PLAZO)),
};

// «Martes 13 de octubre, 10:42»
export const fechaHora = (fecha: Iso, hora: string) => `${mayuscula(fechaLarga(fecha))}, ${hora}`;

export const nombreArea = (id: string) => areas.find((a) => a.id === id)?.nombre ?? id;
export const nombreApoyo = (valor: string) =>
  planes.find((p) => p.param === valor)?.nombre ?? (valor === "nose" ? "Todavía no lo sé" : valor);

// Solicitud completa y válida (estados «enviando» y «error de red» del formulario).
export const DATOS_COMPLETOS: DatosPostular = {
  area: SOLICITUD.area,
  meta: SOLICITUD.meta,
  apoyo: SOLICITUD.apoyo,
  nombre: SOLICITUD.nombre,
  correo: SOLICITUD.correo,
  mayorEdad: true,
  autorizacion: true,
};

// Solicitud con errores (estado «con errores al enviar»): área y apoyo sin elegir, una meta
// demasiado corta, un correo con un dominio mal escrito (muestra la sugerencia) y las dos
// casillas obligatorias sin marcar.
export const DATOS_CON_ERRORES: DatosPostular = {
  area: "",
  meta: "Ordenar mi semana.",
  apoyo: "",
  nombre: SOLICITUD.nombre,
  correo: POSTULANTE.correoMalEscrito,
  mayorEdad: false,
  autorizacion: false,
};
