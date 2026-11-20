// Funciones siempre presentes (20-nov-2026, migración 20261206): no dependen de un interruptor del
// dueño. Lo que cada persona decide (recordatorios, correo, ranking, foto) es su preferencia.
// Las demás claves de la tabla «modulos» se abren cuando el dueño lo decide.
export const SIEMPRE_PRESENTES: ReadonlySet<string> = new Set([
  "notificaciones",
  "recordatorios",
  "reconocimientos",
  "fotos",
  "ranking",
  "informes",
  "app_movil",
]);
