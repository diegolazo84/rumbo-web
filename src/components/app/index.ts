// Componentes de la aplicación: Mi espacio y panel (especificación de la plataforma 4.1 y 5.2).
// Estilos: styles/app.css.
export { default as Icono, type NombreIconoApp } from "./Icono";
export { default as EstructuraApp, TEXTOS_ESTRUCTURA, type RutasApp } from "./EstructuraApp";
export { default as EncabezadoApp, TEXTOS_CABECERA } from "./EncabezadoApp";
export {
  BarraInferior,
  Lateral,
  ListaMas,
  DESTINOS_MI_ESPACIO,
  DESTINOS_PANEL,
  TEXTO_NOVEDAD,
  type DestinoNav,
  type FilaMas,
} from "./Navegacion";
export { default as Hoja } from "./Hoja";
export { default as HojaAyuda, ContenidoAyuda, TEXTOS_AYUDA } from "./AyudaInmediata";
export { default as FilaAccion, TEXTOS_ACCION, type EstadoFila } from "./FilaAccion";
export { default as ChipMeta, LeyendaMetas } from "./ChipMeta";
export { default as BarraProgreso } from "./BarraProgreso";
export { MetaTarjeta, EstadoVacio, Banda, Cargando, ErrorGlobal, ErrorBloque, BandaSinConexion, TEXTOS_CARGA } from "./Bloques";
export { default as Segmentado } from "./Segmentado";
export { default as FranjaSemana, type DiaFranja } from "./FranjaSemana";
export { default as Tostada } from "./Tostada";
// El aviso de ayuda bajo los textos libres es un componente de formulario (3.1); se reexporta aquí.
export { default as AvisoAyuda, NoEsChat } from "../form/AvisoAyuda";
