import { Encabezado } from "../components/Bloques";
import { Boton } from "../components/Enlaces";
import { EnlaceContacto, PaginaLectura } from "../components/lectura/Lectura";
import { ayuda, recursosAyuda, t } from "../data/rumbo";

// Ayuda inmediata (5.5): corta, sin distracciones y sin llamado comercial (la cabecera
// va sin CTA, App.tsx). Las líneas salen de recursosAyuda(); el 1455 solo con ayuda.incluir1455.
const fuentes = ayuda.incluir1455 ? "Ministerio de Salud, SENDA y SernamEG." : "Ministerio de Salud y SENDA.";
// Salud Responde no es gratuita: tiene el costo de una llamada local.
const gratuitas = ayuda.incluir1455 ? "El *4141, el 131, el 1412 y el 1455 son gratuitos" : "El *4141, el 131 y el 1412 son gratuitos";
const notaFuentes = ayuda.verificadoEl
  ? t("Números revisados el {verificadoEl} en las fuentes oficiales: {fuentes}", { verificadoEl: ayuda.verificadoEl, fuentes })
  : `Números de fuentes oficiales: ${fuentes}`;

// «SAMU, emergencias médicas»: lo que va tras la coma no se parte.
function NombreRecurso({ nombre }: { nombre: string }) {
  const coma = nombre.indexOf(", ");
  if (coma < 0) return <>{nombre}</>;
  return (
    <>
      {nombre.slice(0, coma + 2)}
      <span className="nowrap">{nombre.slice(coma + 2)}</span>
    </>
  );
}

export default function Ayuda() {
  return (
    <PaginaLectura centrada>
      <Encabezado
        ojo="Ayuda inmediata"
        titulo="Si necesitas ayuda ahora."
        nivel={1}
        bajada={`Rumbo no es un servicio de urgencias y no ofrece respuesta inmediata. Si estás en peligro o piensas en hacerte daño, llama ahora. ${gratuitas}; Salud Responde tiene el costo de una llamada local. Si no estás en Chile, llama al número de emergencias de tu país.`}
      />
      <ul className="recursos">
        {recursosAyuda().map((r) => (
          // El nombre va primero en el DOM (quien navega por títulos oye nombre y número
          // seguidos); el número se muestra arriba con CSS (order).
          <li key={r.numero} className="tarjeta recurso">
            <h2 className="recurso-nombre">
              <NombreRecurso nombre={r.nombre} />
            </h2>
            {r.tel ? (
              <a className="recurso-numero" href={r.tel}>
                {r.numero}
              </a>
            ) : (
              <p className="recurso-numero">{r.numero}</p>
            )}
            <p>{r.descripcion}</p>
          </li>
        ))}
      </ul>
      <div className="lectura-cierre">
        <p>
          Si no puedes hablar, acude a la urgencia más cercana o pide a alguien de confianza que te acompañe. Pedir
          ayuda no es una falla. Esta página seguirá aquí cuando la necesites.
        </p>
        <p className="microcopia">
          {notaFuentes} Si alguno no funciona, avísanos desde <EnlaceContacto>Contacto</EnlaceContacto>.
        </p>
        <div className="acciones">
          <Boton href="/" variante="secundario">
            Volver al inicio
          </Boton>
        </div>
      </div>
    </PaginaLectura>
  );
}
