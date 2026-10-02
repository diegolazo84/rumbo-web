import { Aviso, Encabezado } from "../components/Bloques";
import { Boton } from "../components/Enlaces";

// Página mínima temporal: encabezado y resumen «En corto». Las 14 secciones (5.4),
// la versión y el botón de imprimir se agregan al completar las páginas de lectura.
export default function Condiciones() {
  return (
    <div className="lectura">
      <div className="contenedor contenedor--lectura lectura-cuerpo">
        <Encabezado ojo="Condiciones" titulo="Condiciones del piloto." nivel={1} />
        <Aviso icono="info" titulo="En corto">
          <ul>
            <li>Postular es gratis y no te compromete.</li>
            <li>Nada empieza ni se cobra sin tu acuerdo.</li>
            <li>Rumbo no es un servicio de salud ni de urgencias.</li>
            <li>Hoy no hay pagos en línea.</li>
          </ul>
        </Aviso>
        <div className="acciones">
          <Boton href="/" variante="secundario">
            Volver al inicio
          </Boton>
          <Boton href="/privacidad/" variante="terciario">
            Ver la política de privacidad
          </Boton>
        </div>
      </div>
    </div>
  );
}
