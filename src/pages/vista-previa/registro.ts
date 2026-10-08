// Registro de la vista previa (etapa 0, plataforma 10): una fila por pantalla o estado.
// App.tsx, entry-server.tsx y postbuild.mjs leen solo este archivo; nadie más los toca.
// - Cada pantalla vive en formulario/, mi-espacio/ o panel/ y exporta por defecto un
//   componente que recibe `estado` (la variante de esta fila). Lo mismo un archivo, varias filas.
// - El marco (cabecera pública, estructura de Mi espacio o del panel) lo pone VistaPrevia.tsx:
//   la pantalla rinde solo su contenido, con su único <h1>.
// - Las tres listas están separadas a propósito: cada grupo edita solo la suya.
// Todo esto se borra al pasar a la etapa 3 (plataforma 2.1).
import type { ComponentType } from "react";
import { rutaPrevia } from "./rutas";

export type GrupoPrevia = "base" | "formulario" | "mi-espacio" | "panel";

// publico: cabecera pública con CTA (como /estado/ y /contacto/) y pie.
// publico-sin-cta: cabecera sin CTA (como /postular/) y pie.
// ingreso: cabecera de Mi espacio sin navegación (mi-espacio/entrar/).
// mi-espacio y panel: EstructuraApp completa.
export type MarcoPrevia = "publico" | "publico-sin-cta" | "ingreso" | "mi-espacio" | "panel";

export type PropsPantalla = { estado?: string };
type Modulo = { default: ComponentType<PropsPantalla> };

export type PantallaPrevia = {
  ruta: string; // absoluta, con barra final: "/vista-previa/mi-espacio/calendario/dia/"
  titulo: string; // <title> (plataforma 2.1 y 3.2)
  nombre: string; // texto del enlace en el índice
  grupo: GrupoPrevia;
  apartado: string; // subtítulo dentro del grupo en el índice
  marco: MarcoPrevia;
  estado?: string; // variante que recibe el componente
  seccion?: string; // título de la sección en la cabecera de Mi espacio o del panel
  activo?: string; // destino activo de la navegación (hoy, calendario, progreso, semana…)
  novedades?: string[]; // Mi espacio: destinos con punto de novedad
  banda?: "sin-conexion" | "ausencia"; // Mi espacio: banda de aviso global (4.1.4)
  sinDatos?: boolean; // la pantalla no muestra datos de ejemplo (no lleva «Ejemplo» en su contenido)
  cargar: () => Promise<Modulo>;
};

type Fila = Omit<PantallaPrevia, "grupo" | "ruta"> & { ruta: string };

const MI_ESPACIO = (seccion: string) => `${seccion} · Mi espacio · Rumbo`;
const PANEL = (seccion: string) => `${seccion} · Panel · Rumbo`;

// ---------------------------------------------------------------------------
// Formularios públicos: /postular/ (tres modos y confirmación), /estado/ (cada estado), /contacto/.
const postular = () => import("./formulario/Postular");
const confirmacion = () => import("./formulario/Confirmacion");
const estado = () => import("./formulario/Estado");
const contacto = () => import("./formulario/Contacto");

const T_POSTULAR = "Cuéntanos tu meta · Rumbo";
const T_INTERES = "Deja tu interés · Rumbo";
const T_ENVIADA = "Solicitud enviada · Rumbo";
const T_ESTADO = "Tu solicitud · Rumbo";
const T_CONTACTO = "Contacto · Rumbo";

const FORMULARIO: Fila[] = [
  { ruta: "postular/", nombre: "Modo solicitud", estado: "solicitud", titulo: T_POSTULAR, marco: "publico-sin-cta", apartado: "Cuéntanos tu meta", cargar: postular },
  { ruta: "postular/interes/", nombre: "Modo «Dejar mi interés»", estado: "interes", titulo: T_INTERES, marco: "publico-sin-cta", apartado: "Cuéntanos tu meta", sinDatos: true, cargar: postular },
  { ruta: "postular/cerradas/", nombre: "Postulaciones cerradas", estado: "cerradas", titulo: T_POSTULAR, marco: "publico-sin-cta", apartado: "Cuéntanos tu meta", sinDatos: true, cargar: postular },
  { ruta: "postular/cerradas-tope/", nombre: "Postulaciones cerradas por el tope del día", estado: "cerradas-tope", titulo: T_POSTULAR, marco: "publico-sin-cta", apartado: "Cuéntanos tu meta", sinDatos: true, cargar: postular },
  { ruta: "postular/errores/", nombre: "Con errores al enviar", estado: "errores", titulo: T_POSTULAR, marco: "publico-sin-cta", apartado: "Cuéntanos tu meta", cargar: postular },
  { ruta: "postular/enviando/", nombre: "Enviando", estado: "enviando", titulo: T_POSTULAR, marco: "publico-sin-cta", apartado: "Cuéntanos tu meta", cargar: postular },
  { ruta: "postular/error-red/", nombre: "Error de red", estado: "error-red", titulo: T_POSTULAR, marco: "publico-sin-cta", apartado: "Cuéntanos tu meta", cargar: postular },
  { ruta: "postular/segundo-fallo/", nombre: "Segundo fallo de red", estado: "segundo-fallo", titulo: T_POSTULAR, marco: "publico-sin-cta", apartado: "Cuéntanos tu meta", cargar: postular },
  { ruta: "postular/sin-conexion/", nombre: "Sin conexión", estado: "sin-conexion", titulo: T_POSTULAR, marco: "publico-sin-cta", apartado: "Cuéntanos tu meta", cargar: postular },
  { ruta: "postular/servidor/", nombre: "Servidor no disponible (5xx)", estado: "servidor", titulo: T_POSTULAR, marco: "publico-sin-cta", apartado: "Cuéntanos tu meta", cargar: postular },
  { ruta: "postular/demasiados-envios/", nombre: "Demasiados envíos (429)", estado: "demasiados", titulo: T_POSTULAR, marco: "publico-sin-cta", apartado: "Cuéntanos tu meta", cargar: postular },
  { ruta: "postular/tope-al-enviar/", nombre: "Tope alcanzado al enviar", estado: "tope-al-enviar", titulo: T_POSTULAR, marco: "publico-sin-cta", apartado: "Cuéntanos tu meta", cargar: postular },
  { ruta: "postular/ausencia/", nombre: "Con aviso de ausencia", estado: "ausencia", titulo: T_POSTULAR, marco: "publico-sin-cta", apartado: "Cuéntanos tu meta", cargar: postular },
  { ruta: "postular/borrador/", nombre: "Borrador recuperado", estado: "borrador", titulo: T_POSTULAR, marco: "publico-sin-cta", apartado: "Cuéntanos tu meta", cargar: postular },
  { ruta: "postular/desde-planes/", nombre: "Elegiste desde Planes", estado: "desde-planes", titulo: T_POSTULAR, marco: "publico-sin-cta", apartado: "Cuéntanos tu meta", cargar: postular },
  { ruta: "postular/enviada/", nombre: "Confirmación de la solicitud", estado: "solicitud", titulo: T_ENVIADA, marco: "publico-sin-cta", apartado: "Confirmación", cargar: confirmacion },
  { ruta: "postular/enviada-interes/", nombre: "Confirmación del interés", estado: "interes", titulo: T_ENVIADA, marco: "publico-sin-cta", apartado: "Confirmación", cargar: confirmacion },
  { ruta: "postular/ya-enviada/", nombre: "Ya enviaste esta solicitud", estado: "ya-enviada", titulo: T_ENVIADA, marco: "publico-sin-cta", apartado: "Confirmación", cargar: confirmacion },
  { ruta: "estado/", nombre: "Sin enlace privado", estado: "sin-token", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", sinDatos: true, cargar: estado },
  { ruta: "estado/cargando/", nombre: "Buscando tu solicitud", estado: "cargando", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", sinDatos: true, cargar: estado },
  { ruta: "estado/no-encontrada/", nombre: "No encontrada", estado: "no-encontrada", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", sinDatos: true, cargar: estado },
  { ruta: "estado/error-red/", nombre: "Error de red", estado: "error-red", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", sinDatos: true, cargar: estado },
  { ruta: "estado/recibida/", nombre: "Recibida", estado: "recibida", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", cargar: estado },
  { ruta: "estado/en-revision/", nombre: "En revisión", estado: "en-revision", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", cargar: estado },
  { ruta: "estado/con-atraso/", nombre: "Con atraso", estado: "con-atraso", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", cargar: estado },
  { ruta: "estado/respondida/", nombre: "Te escribimos", estado: "respondida", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", cargar: estado },
  { ruta: "estado/acordada/", nombre: "Acuerdo listo (aceptación)", estado: "acordada", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", cargar: estado },
  { ruta: "estado/acordada-sin-detalles/", nombre: "Acuerdo listo, sin forma de pago todavía", estado: "acordada-sin-detalles", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", cargar: estado },
  { ruta: "estado/acuerdo-aceptado/", nombre: "Acuerdo aceptado", estado: "acuerdo-aceptado", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", cargar: estado },
  { ruta: "estado/con-espacio/", nombre: "Tu espacio está listo", estado: "con-espacio", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", cargar: estado },
  { ruta: "estado/cerrada-capacidad/", nombre: "Cerrada por capacidad", estado: "cerrada-capacidad", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", cargar: estado },
  { ruta: "estado/cerrada-con-nota/", nombre: "Cerrada, con nota de tu coach", estado: "cerrada-con-nota", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", cargar: estado },
  { ruta: "estado/cerrada-alcance/", nombre: "Cerrada por alcance", estado: "cerrada-alcance", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", cargar: estado },
  { ruta: "estado/cerrada-sin-respuesta/", nombre: "Cerrada sin respuesta", estado: "cerrada-sin-respuesta", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", cargar: estado },
  { ruta: "estado/retirada/", nombre: "Retirada", estado: "retirada", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", cargar: estado },
  { ruta: "estado/retirar/", nombre: "Confirmar el retiro", estado: "retirar", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", cargar: estado },
  { ruta: "estado/interes-recibida/", nombre: "Interés anotado", estado: "interes-recibida", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", cargar: estado },
  { ruta: "estado/interes-cerrada/", nombre: "Interés cerrado", estado: "interes-cerrada", titulo: T_ESTADO, marco: "publico", apartado: "Estado de la solicitud", sinDatos: true, cargar: estado },
  { ruta: "contacto/", nombre: "Formulario", estado: "inicial", titulo: T_CONTACTO, marco: "publico", apartado: "Contacto", sinDatos: true, cargar: contacto },
  { ruta: "contacto/errores/", nombre: "Con errores al enviar", estado: "errores", titulo: T_CONTACTO, marco: "publico", apartado: "Contacto", cargar: contacto },
  { ruta: "contacto/datos-personales/", nombre: "Motivo «Mis datos personales»", estado: "datos-personales", titulo: T_CONTACTO, marco: "publico", apartado: "Contacto", sinDatos: true, cargar: contacto },
  { ruta: "contacto/enviado/", nombre: "Mensaje enviado", estado: "enviado", titulo: T_CONTACTO, marco: "publico", apartado: "Contacto", cargar: contacto },
];

// ---------------------------------------------------------------------------
// Mi espacio: ingreso, estados del programa y cada pantalla (plataforma 4).
const entrar = () => import("./mi-espacio/Entrar");
const estadoPrograma = () => import("./mi-espacio/EstadoPrograma");
const hoy = () => import("./mi-espacio/Hoy");
const calendario = () => import("./mi-espacio/Calendario");
const detalle = () => import("./mi-espacio/DetalleAccion");
const anteriores = () => import("./mi-espacio/DiasAnteriores");
const progreso = () => import("./mi-espacio/Progreso");
const creditos = () => import("./mi-espacio/Creditos");
const semana = () => import("./mi-espacio/Semana");
const ajuste = () => import("./mi-espacio/Ajuste");
const preferencias = () => import("./mi-espacio/Preferencias");
const ayudaInmediata = () => import("./mi-espacio/AyudaInmediata");
const carga = () => import("./mi-espacio/Carga");

const MI_ESPACIO_FILAS: Fila[] = [
  { ruta: "mi-espacio/entrar/", nombre: "Entrar con tu correo", estado: "correo", titulo: MI_ESPACIO("Entrar"), marco: "ingreso", seccion: "Entrar", apartado: "Ingreso", cargar: entrar },
  { ruta: "mi-espacio/entrar/revisa-tu-correo/", nombre: "Revisa tu correo", estado: "revisa-correo", titulo: MI_ESPACIO("Entrar"), marco: "ingreso", seccion: "Entrar", apartado: "Ingreso", cargar: entrar },
  { ruta: "mi-espacio/entrar/enlace-vencido/", nombre: "Enlace vencido o ya usado", estado: "enlace-vencido", titulo: MI_ESPACIO("Entrar"), marco: "ingreso", seccion: "Entrar", apartado: "Ingreso", cargar: entrar },
  { ruta: "mi-espacio/entrar/sesion-terminada/", nombre: "Tu sesión terminó", estado: "sesion-terminada", titulo: MI_ESPACIO("Entrar"), marco: "ingreso", seccion: "Entrar", apartado: "Ingreso", cargar: entrar },
  { ruta: "mi-espacio/entrar/saliste/", nombre: "Saliste de Mi espacio", estado: "saliste", titulo: MI_ESPACIO("Entrar"), marco: "ingreso", seccion: "Entrar", apartado: "Ingreso", cargar: entrar },
  { ruta: "mi-espacio/cargando/", nombre: "Cargando", estado: "cargando", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", apartado: "Carga y errores", sinDatos: true, cargar: carga },
  { ruta: "mi-espacio/cargando-lento/", nombre: "Cargando, más de 8 segundos", estado: "cargando-lento", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", apartado: "Carga y errores", sinDatos: true, cargar: carga },
  { ruta: "mi-espacio/error/", nombre: "No pudimos cargar tu espacio", estado: "error", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", apartado: "Carga y errores", sinDatos: true, cargar: carga },
  { ruta: "mi-espacio/hoy/sin-conexion/", nombre: "Sin conexión", estado: "sin-conexion", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", banda: "sin-conexion", apartado: "Carga y errores", cargar: hoy },
  { ruta: "mi-espacio/hoy/error-bloque/", nombre: "Error de un bloque", estado: "error-bloque", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", apartado: "Carga y errores", cargar: hoy },
  { ruta: "mi-espacio/hoy/ausencia/", nombre: "Con ausencia de tu coach", estado: "ausencia", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", banda: "ausencia", apartado: "Carga y errores", cargar: hoy },
  { ruta: "mi-espacio/programa/preparacion/", nombre: "Programa en preparación", estado: "preparacion", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", apartado: "Estados del programa", cargar: estadoPrograma },
  { ruta: "mi-espacio/programa/inicio-futuro/", nombre: "Programa publicado, inicio futuro", estado: "inicio-futuro", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", apartado: "Estados del programa", cargar: estadoPrograma },
  { ruta: "mi-espacio/programa/pausa/", nombre: "En pausa (acordada a pedido)", estado: "pausa-pedida", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", apartado: "Estados del programa", cargar: estadoPrograma },
  { ruta: "mi-espacio/programa/pausa-cuidado/", nombre: "En pausa (pausa de cuidado)", estado: "pausa-cuidado", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", apartado: "Estados del programa", cargar: estadoPrograma },
  { ruta: "mi-espacio/programa/cerrado/", nombre: "Ciclo cerrado", estado: "cerrado", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", apartado: "Estados del programa", cargar: estadoPrograma },
  { ruta: "mi-espacio/programa/ciclo-2/", nombre: "Ciclo nuevo acordado", estado: "ciclo-2", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", apartado: "Estados del programa", cargar: estadoPrograma },
  { ruta: "mi-espacio/", nombre: "Hoy, con acciones por hacer", estado: "algunas", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", novedades: ["semana"], apartado: "Hoy", cargar: hoy },
  { ruta: "mi-espacio/hoy/ninguna-marcada/", nombre: "Hoy, sin nada marcado todavía", estado: "ninguna", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", apartado: "Hoy", cargar: hoy },
  { ruta: "mi-espacio/hoy/dia-completo/", nombre: "Hoy, día completo", estado: "completo", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", apartado: "Hoy", cargar: hoy },
  { ruta: "mi-espacio/hoy/sin-acciones/", nombre: "Hoy, día sin acciones", estado: "sin-acciones", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", apartado: "Hoy", cargar: hoy },
  { ruta: "mi-espacio/hoy/creditos-ocultos/", nombre: "Hoy, con los créditos ocultos", estado: "creditos-ocultos", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", apartado: "Hoy", cargar: hoy },
  { ruta: "mi-espacio/hoy/cercano/", nombre: "Hoy, Acompañamiento cercano (día de videollamada)", estado: "cercano", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", apartado: "Hoy", cargar: hoy },
  { ruta: "mi-espacio/dias-anteriores/", nombre: "De días anteriores", estado: "lista", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", apartado: "Hoy", cargar: anteriores },
  { ruta: "mi-espacio/dias-anteriores/carga/", nombre: "De días anteriores, aviso de carga", estado: "aviso-carga", titulo: MI_ESPACIO("Hoy"), marco: "mi-espacio", seccion: "Hoy", activo: "hoy", apartado: "Hoy", cargar: anteriores },
  { ruta: "mi-espacio/calendario/dia/", nombre: "Vista Día", estado: "dia", titulo: MI_ESPACIO("Calendario"), marco: "mi-espacio", seccion: "Calendario", activo: "calendario", apartado: "Calendario", cargar: calendario },
  { ruta: "mi-espacio/calendario/", nombre: "Vista Semana", estado: "semana", titulo: MI_ESPACIO("Calendario"), marco: "mi-espacio", seccion: "Calendario", activo: "calendario", apartado: "Calendario", cargar: calendario },
  { ruta: "mi-espacio/calendario/mes/", nombre: "Vista Mes", estado: "mes", titulo: MI_ESPACIO("Calendario"), marco: "mi-espacio", seccion: "Calendario", activo: "calendario", apartado: "Calendario", cargar: calendario },
  { ruta: "mi-espacio/accion/", nombre: "Por hacer", estado: "por-hacer", titulo: MI_ESPACIO("Acción"), marco: "mi-espacio", seccion: "Acción", activo: "calendario", apartado: "Detalle de acción", cargar: detalle },
  { ruta: "mi-espacio/accion/hecha/", nombre: "Hecha", estado: "hecha", titulo: MI_ESPACIO("Acción"), marco: "mi-espacio", seccion: "Acción", activo: "calendario", apartado: "Detalle de acción", cargar: detalle },
  { ruta: "mi-espacio/accion/futura/", nombre: "De un día futuro", estado: "futura", titulo: MI_ESPACIO("Acción"), marco: "mi-espacio", seccion: "Acción", activo: "calendario", apartado: "Detalle de acción", cargar: detalle },
  { ruta: "mi-espacio/accion/dejada-pasar/", nombre: "Dejada pasar", estado: "dejada-pasar", titulo: MI_ESPACIO("Acción"), marco: "mi-espacio", seccion: "Acción", activo: "calendario", apartado: "Detalle de acción", cargar: detalle },
  { ruta: "mi-espacio/accion/anulada-ajuste/", nombre: "Anulada por un ajuste", estado: "anulada-ajuste", titulo: MI_ESPACIO("Acción"), marco: "mi-espacio", seccion: "Acción", activo: "calendario", apartado: "Detalle de acción", cargar: detalle },
  { ruta: "mi-espacio/accion/anulada-pausa/", nombre: "Anulada por una pausa", estado: "anulada-pausa", titulo: MI_ESPACIO("Acción"), marco: "mi-espacio", seccion: "Acción", activo: "calendario", apartado: "Detalle de acción", cargar: detalle },
  { ruta: "mi-espacio/accion/con-foto/", nombre: "Con foto privada", estado: "con-foto", titulo: MI_ESPACIO("Acción"), marco: "mi-espacio", seccion: "Acción", activo: "calendario", apartado: "Detalle de acción", cargar: detalle },
  { ruta: "mi-espacio/accion/foto-en-revision/", nombre: "Foto en revisión", estado: "foto-en-revision", titulo: MI_ESPACIO("Acción"), marco: "mi-espacio", seccion: "Acción", activo: "calendario", apartado: "Detalle de acción", cargar: detalle },
  { ruta: "mi-espacio/accion/foto-aprobada/", nombre: "Foto aprobada, con nota", estado: "foto-aprobada", titulo: MI_ESPACIO("Acción"), marco: "mi-espacio", seccion: "Acción", activo: "calendario", apartado: "Detalle de acción", cargar: detalle },
  { ruta: "mi-espacio/accion/foto-no-aprobada/", nombre: "Foto no aprobada", estado: "foto-no-aprobada", titulo: MI_ESPACIO("Acción"), marco: "mi-espacio", seccion: "Acción", activo: "calendario", apartado: "Detalle de acción", cargar: detalle },
  { ruta: "mi-espacio/accion/foto-depurada/", nombre: "Foto depurada", estado: "foto-depurada", titulo: MI_ESPACIO("Acción"), marco: "mi-espacio", seccion: "Acción", activo: "calendario", apartado: "Detalle de acción", cargar: detalle },
  { ruta: "mi-espacio/progreso/", nombre: "Progreso", titulo: MI_ESPACIO("Progreso"), marco: "mi-espacio", seccion: "Progreso", activo: "progreso", apartado: "Progreso", cargar: progreso },
  { ruta: "mi-espacio/progreso/creditos/", nombre: "Historial de créditos", titulo: MI_ESPACIO("Créditos"), marco: "mi-espacio", seccion: "Créditos", activo: "progreso", apartado: "Progreso", cargar: creditos },
  { ruta: "mi-espacio/semana/", nombre: "Registro sin enviar", estado: "sin-enviar", titulo: MI_ESPACIO("Semana"), marco: "mi-espacio", seccion: "Semana", activo: "semana", apartado: "Semana", cargar: semana },
  { ruta: "mi-espacio/semana/enviado/", nombre: "Registro enviado", estado: "enviado", titulo: MI_ESPACIO("Semana"), marco: "mi-espacio", seccion: "Semana", activo: "semana", apartado: "Semana", cargar: semana },
  { ruta: "mi-espacio/semana/en-revision/", nombre: "Revisión en curso", estado: "en-revision", titulo: MI_ESPACIO("Semana"), marco: "mi-espacio", seccion: "Semana", activo: "semana", apartado: "Semana", cargar: semana },
  { ruta: "mi-espacio/semana/publicada/", nombre: "Revisión publicada", estado: "publicada", titulo: MI_ESPACIO("Semana"), marco: "mi-espacio", seccion: "Semana", activo: "semana", novedades: ["semana"], apartado: "Semana", cargar: semana },
  { ruta: "mi-espacio/semana/pendiente/", nombre: "Revisión pendiente", estado: "pendiente", titulo: MI_ESPACIO("Semana"), marco: "mi-espacio", seccion: "Semana", activo: "semana", apartado: "Semana", cargar: semana },
  { ruta: "mi-espacio/semana/futura/", nombre: "Semana futura", estado: "futura", titulo: MI_ESPACIO("Semana"), marco: "mi-espacio", seccion: "Semana", activo: "semana", apartado: "Semana", cargar: semana },
  { ruta: "mi-espacio/semana/semana-1/", nombre: "Semana 1", estado: "semana-1", titulo: MI_ESPACIO("Semana"), marco: "mi-espacio", seccion: "Semana", activo: "semana", apartado: "Semana", cargar: semana },
  { ruta: "mi-espacio/semana/cercano/", nombre: "Resumen de tu videollamada (Acompañamiento cercano)", estado: "cercano", titulo: MI_ESPACIO("Semana"), marco: "mi-espacio", seccion: "Semana", activo: "semana", apartado: "Semana", cargar: semana },
  { ruta: "mi-espacio/ajuste/", nombre: "Pedir un ajuste", estado: "formulario", titulo: MI_ESPACIO("Pedir un ajuste"), marco: "mi-espacio", seccion: "Pedir un ajuste", apartado: "Ajuste", cargar: ajuste },
  { ruta: "mi-espacio/ajuste/cercano/", nombre: "Pedir un ajuste (Acompañamiento cercano)", estado: "cercano", titulo: MI_ESPACIO("Pedir un ajuste"), marco: "mi-espacio", seccion: "Pedir un ajuste", apartado: "Ajuste", cargar: ajuste },
  { ruta: "mi-espacio/ajuste/cercano-sin-reordenamientos/", nombre: "Pedir un ajuste, sin reordenamientos disponibles", estado: "cercano-sin-reordenamientos", titulo: MI_ESPACIO("Pedir un ajuste"), marco: "mi-espacio", seccion: "Pedir un ajuste", apartado: "Ajuste", cargar: ajuste },
  { ruta: "mi-espacio/ajuste/enviado/", nombre: "Ajuste enviado", estado: "enviado", titulo: MI_ESPACIO("Pedir un ajuste"), marco: "mi-espacio", seccion: "Pedir un ajuste", apartado: "Ajuste", cargar: ajuste },
  { ruta: "mi-espacio/preferencias/", nombre: "Preferencias y Mis datos", estado: "preferencias", titulo: MI_ESPACIO("Preferencias"), marco: "mi-espacio", seccion: "Preferencias", apartado: "Preferencias", cargar: preferencias },
  { ruta: "mi-espacio/preferencias/eliminar/", nombre: "Pedir que eliminen mis datos", estado: "eliminar", titulo: MI_ESPACIO("Preferencias"), marco: "mi-espacio", seccion: "Preferencias", apartado: "Preferencias", cargar: preferencias },
  { ruta: "mi-espacio/ayuda/", nombre: "Ayuda inmediata", titulo: MI_ESPACIO("Ayuda inmediata"), marco: "mi-espacio", seccion: "Ayuda inmediata", apartado: "Ayuda", sinDatos: true, cargar: ayudaInmediata },
];

// ---------------------------------------------------------------------------
// Panel de Diego (plataforma 5).
const panelHoy = () => import("./panel/Hoy");
const solicitudes = () => import("./panel/Solicitudes");
const ficha = () => import("./panel/Ficha");
const participantes = () => import("./panel/Participantes");
const constructor = () => import("./panel/Constructor");
const revision = () => import("./panel/Revision");
const fotos = () => import("./panel/Fotos");
const ajustes = () => import("./panel/Ajustes");
const contactoDerechos = () => import("./panel/ContactoDerechos");
const mas = () => import("./panel/Mas");

const PANEL_FILAS: Fila[] = [
  { ruta: "equipo/", nombre: "Hoy", estado: "cola", titulo: PANEL("Hoy"), marco: "panel", seccion: "Hoy", activo: "hoy", apartado: "Hoy", cargar: panelHoy },
  { ruta: "equipo/hoy/vacio/", nombre: "Hoy, sin pendientes", estado: "vacio", titulo: PANEL("Hoy"), marco: "panel", seccion: "Hoy", activo: "hoy", apartado: "Hoy", cargar: panelHoy },
  { ruta: "equipo/solicitudes/", nombre: "Bandeja de solicitudes", titulo: PANEL("Solicitudes"), marco: "panel", seccion: "Solicitudes", activo: "solicitudes", apartado: "Solicitudes", cargar: solicitudes },
  { ruta: "equipo/solicitud/", nombre: "Ficha de una solicitud", estado: "solicitud", titulo: PANEL("Solicitud"), marco: "panel", seccion: "Solicitud", activo: "solicitudes", apartado: "Solicitudes", cargar: ficha },
  { ruta: "equipo/participantes/", nombre: "Participantes", estado: "lista", titulo: PANEL("Participantes"), marco: "panel", seccion: "Participantes", activo: "participantes", apartado: "Participantes", cargar: participantes },
  { ruta: "equipo/participantes/vacio/", nombre: "Participantes, sin participantes todavía", estado: "vacio", titulo: PANEL("Participantes"), marco: "panel", seccion: "Participantes", activo: "participantes", apartado: "Participantes", cargar: participantes },
  { ruta: "equipo/participante/", nombre: "Ficha de participante", estado: "participante", titulo: PANEL("Participante"), marco: "panel", seccion: "Participante", activo: "participantes", apartado: "Participantes", cargar: ficha },
  { ruta: "equipo/constructor/", nombre: "Constructor de programa", titulo: PANEL("Constructor"), marco: "panel", seccion: "Constructor", activo: "participantes", apartado: "Participantes", cargar: constructor },
  { ruta: "equipo/revision/", nombre: "Resumen de la videollamada (Acompañamiento cercano)", estado: "cercano", titulo: PANEL("Revisión semanal"), marco: "panel", seccion: "Revisión semanal", activo: "participantes", apartado: "Participantes", cargar: revision },
  { ruta: "equipo/revision/sin-registro/", nombre: "Revisión semanal sin registro", estado: "sin-registro", titulo: PANEL("Revisión semanal"), marco: "panel", seccion: "Revisión semanal", activo: "participantes", apartado: "Participantes", cargar: revision },
  { ruta: "equipo/ajustes/", nombre: "Solicitudes de ajuste", titulo: PANEL("Solicitudes de ajuste"), marco: "panel", seccion: "Solicitudes de ajuste", activo: "participantes", apartado: "Participantes", cargar: ajustes },
  { ruta: "equipo/revisar/", nombre: "Fotos y explicaciones", estado: "cola", titulo: PANEL("Revisar"), marco: "panel", seccion: "Revisar", activo: "revisar", apartado: "Revisar", cargar: fotos },
  { ruta: "equipo/revisar/vacio/", nombre: "Fotos y explicaciones, sin pendientes", estado: "vacio", titulo: PANEL("Revisar"), marco: "panel", seccion: "Revisar", activo: "revisar", apartado: "Revisar", cargar: fotos },
  { ruta: "equipo/contacto/", nombre: "Contacto y derechos", titulo: PANEL("Contacto y derechos"), marco: "panel", seccion: "Contacto y derechos", activo: "mas", apartado: "Más", cargar: contactoDerechos },
  { ruta: "equipo/mas/", nombre: "Más: postulaciones, ausencia, feriados, mantención y cuenta", titulo: PANEL("Más"), marco: "panel", seccion: "Más", activo: "mas", apartado: "Más", cargar: mas },
];

// ---------------------------------------------------------------------------
// Base compartida (etapa 0): catálogo de componentes de formulario y de la aplicación.
const BASE: Fila[] = [
  { ruta: "componentes/", nombre: "Componentes compartidos", titulo: MI_ESPACIO("Componentes"), marco: "mi-espacio", seccion: "Componentes", apartado: "Formularios y aplicación", cargar: () => import("./Componentes") },
];

const conGrupo = (grupo: GrupoPrevia, filas: Fila[]): PantallaPrevia[] =>
  filas.map((f) => ({ ...f, grupo, ruta: rutaPrevia(f.ruta) }));

export const pantallas: PantallaPrevia[] = [
  ...conGrupo("base", BASE),
  ...conGrupo("formulario", FORMULARIO),
  ...conGrupo("mi-espacio", MI_ESPACIO_FILAS),
  ...conGrupo("panel", PANEL_FILAS),
];

export const GRUPOS: { id: GrupoPrevia; titulo: string }[] = [
  { id: "base", titulo: "Base compartida" },
  { id: "formulario", titulo: "Postular, estado y contacto" },
  { id: "mi-espacio", titulo: "Mi espacio" },
  { id: "panel", titulo: "Panel" },
];

// Índice de la vista previa.
export const INDICE = {
  ruta: rutaPrevia(""),
  titulo: "Vista previa · Rumbo",
  descripcion: "Vista previa de la plataforma de Rumbo con datos de ejemplo. No es una página pública.",
} as const;

// Coincidencia exacta con barra final (como el router, sensible a mayúsculas).
export function pantallaPorRuta(pathname: string): PantallaPrevia | undefined {
  const normal = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return pantallas.find((p) => p.ruta === normal);
}
