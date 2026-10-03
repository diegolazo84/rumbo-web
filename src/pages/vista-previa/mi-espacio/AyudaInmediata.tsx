// Vista previa · Ayuda inmediata (plataforma 4.15): la hoja abierta completa, como página.
// En Mi espacio se abre como .hoja desde la cabecera, la hoja «Más», la barra lateral, el pie
// de Hoy, bajo cada texto libre y en el aviso de carga. Las líneas son reales (recursosAyuda()),
// no datos de ejemplo: esta pantalla no lleva la etiqueta «Ejemplo» propia.
import { ContenidoAyuda, TEXTOS_AYUDA } from "../../../components/app";
import { Cabeza } from "./comun";

export default function AyudaInmediata() {
  return (
    <div className="me-pantalla me-pantalla--angosta me-ayuda">
      <Cabeza titulo={TEXTOS_AYUDA.titulo} ejemplo={false} />
      <ContenidoAyuda nivelNombres={2} />
    </div>
  );
}
