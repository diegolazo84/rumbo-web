// Panel real (etapa 3): pendiente.
import type { RutaPlataforma } from "../../../plataforma";

export default function PanelReal({ ruta }: { ruta: RutaPlataforma }) {
  return <h1>{ruta.seccion}</h1>;
}
