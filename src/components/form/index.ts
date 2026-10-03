// Componentes de formulario de la plataforma (especificación de la plataforma 3.1).
// Se usan en /postular/, /estado/, /contacto/, Mi espacio y el panel. Estilos: styles/form.css.
export { default as Formulario, BloqueNumerado } from "./Formulario";
export { Campo, CampoTexto, CampoArea, CampoSelect, AyudaCampo, ErrorCampo, TextoEtiqueta, describir, idAyuda, idError } from "./Campo";
export { default as Contador } from "./Contador";
export { Opcion, GrupoOpciones } from "./Opcion";
export { default as Casilla } from "./Casilla";
export { default as ResumenErrores, enfocarCampo, type ErrorResumen } from "./ResumenErrores";
export { default as Envio } from "./Envio";
export { default as AvisoAyuda, NoEsChat } from "./AvisoAyuda";
export { default as CampoTrampa } from "./CampoTrampa";
export { useFormulario, type Errores } from "./useFormulario";
