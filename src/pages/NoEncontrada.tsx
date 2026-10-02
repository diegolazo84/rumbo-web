import { Encabezado } from "../components/Bloques";
import { Boton, BotonPostular } from "../components/Enlaces";
import RutaPuntos from "../components/RutaPuntos";

// Página no encontrada (5.6): lectura centrada, con la ruta de puntos terminada en «?».
export default function NoEncontrada() {
  return (
    <div className="lectura lectura--centrada">
      <div className="contenedor contenedor--lectura">
        <RutaPuntos variante="404" />
        <Encabezado
          ojo="Página no encontrada"
          nivel={1}
          titulo={
            <>
              No encontramos esta <em>página.</em>
            </>
          }
          bajada="Puede que el enlace haya cambiado o que la dirección tenga un error."
          acciones={
            <>
              <Boton href="/">Volver al inicio</Boton>
              <BotonPostular variante="secundario" ubicacion="404" />
            </>
          }
        />
      </div>
    </div>
  );
}
