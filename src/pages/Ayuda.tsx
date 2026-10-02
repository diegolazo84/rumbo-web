import { Encabezado } from "../components/Bloques";
import { Boton } from "../components/Enlaces";
import { recursosAyuda } from "../data/rumbo";

// Página mínima temporal (5.5): encabezado y líneas de ayuda. El diseño final de las
// tarjetas de recurso, el cierre y la nota de fuentes se agregan al completar las páginas
// de lectura. La cabecera de esta página va sin CTA (App.tsx).
export default function Ayuda() {
  return (
    <div className="lectura lectura--centrada">
      <div className="contenedor contenedor--lectura lectura-cuerpo">
        <Encabezado
          ojo="Ayuda inmediata"
          titulo="Si necesitas ayuda ahora."
          nivel={1}
          bajada="Rumbo no es un servicio de urgencias y no ofrece respuesta inmediata. Si estás en peligro o piensas en hacerte daño, llama ahora. Estas líneas de Chile son gratuitas. Si no estás en Chile, llama al número de emergencias de tu país."
        />
        <ul className="recursos">
          {recursosAyuda().map((r) => (
            <li key={r.numero} className="tarjeta">
              {r.tel ? (
                <a className="recurso-numero" href={r.tel}>
                  {r.numero}
                </a>
              ) : (
                <p className="recurso-numero">{r.numero}</p>
              )}
              <h2 className="recurso-nombre">{r.nombre}</h2>
              <p>{r.descripcion}</p>
            </li>
          ))}
        </ul>
        <div className="acciones">
          <Boton href="/" variante="secundario">
            Volver al inicio
          </Boton>
        </div>
      </div>
    </div>
  );
}
