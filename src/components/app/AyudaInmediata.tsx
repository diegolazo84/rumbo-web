// Ayuda inmediata dentro de Mi espacio (plataforma 4.15): hoja abierta completa, nunca un
// <details>. Las líneas salen de recursosAyuda() (*4141 sin enlace; el resto con tel:).
// ContenidoAyuda sirve también como página (vista previa de la hoja abierta).
import { Link } from "react-router-dom";
import { recursosAyuda } from "../../data/rumbo";
import Hoja from "./Hoja";

export const TEXTOS_AYUDA = {
  titulo: "Si necesitas ayuda ahora.",
  texto:
    "Rumbo no es un servicio de urgencias y no ofrece respuesta inmediata. Si estás en peligro o piensas en hacerte daño, llama ahora.",
  todas: "Ver todas las líneas de ayuda",
  nota: "Si no estás en Chile, llama al número de emergencias de tu país. Pedir ayuda no es una falla.",
} as const;

export function ContenidoAyuda({ nivelNombres = 3 }: { nivelNombres?: 2 | 3 }) {
  const Nombre = nivelNombres === 2 ? "h2" : "h3";
  return (
    <div className="ayuda-app">
      <p>{TEXTOS_AYUDA.texto}</p>
      <ul className="ayuda-app__lineas">
        {recursosAyuda().map((r) => (
          <li key={r.numero} className="tarjeta ayuda-app__linea">
            <Nombre className="ayuda-app__nombre">{r.nombre}</Nombre>
            {r.tel ? (
              <a className="ayuda-app__numero" href={r.tel}>
                {r.numero}
              </a>
            ) : (
              <p className="ayuda-app__numero">{r.numero}</p>
            )}
            <p className="ayuda-app__descripcion">{r.descripcion}</p>
          </li>
        ))}
      </ul>
      <p>
        <Link to="/ayuda/" className="enlace-flecha">
          {TEXTOS_AYUDA.todas}
        </Link>
      </p>
      <p className="microcopia">{TEXTOS_AYUDA.nota}</p>
    </div>
  );
}

export default function HojaAyuda({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={TEXTOS_AYUDA.titulo} className="hoja--ayuda">
      <ContenidoAyuda />
    </Hoja>
  );
}
