// Índice de la vista previa (/vista-previa/): enlaces a cada pantalla y estado, por grupo.
// Diego lo abre en su teléfono y recorre cada pantalla (plataforma 9.10).
import { Link } from "react-router-dom";
import { Encabezado } from "../../components/Bloques";
import Etiqueta from "../../components/Etiqueta";
import { GRUPOS, pantallas, type PantallaPrevia } from "./registro";

export const TEXTOS_INDICE = {
  ojo: "Etapa 0 · Piel",
  titulo: "Vista previa de la plataforma.",
  bajada:
    "Cada pantalla y cada estado de la plataforma, con datos de ejemplo. Los datos que verás son de ejemplo y lo dicen.",
  ejemplo: "Ejemplo",
} as const;

// Agrupa conservando el orden del registro.
function porApartado(lista: PantallaPrevia[]) {
  const grupos = new Map<string, PantallaPrevia[]>();
  for (const p of lista) grupos.set(p.apartado, [...(grupos.get(p.apartado) ?? []), p]);
  return [...grupos.entries()];
}

export default function Indice() {
  return (
    <div className="contenedor contenedor--medio lectura previa-indice">
      <Encabezado ojo={TEXTOS_INDICE.ojo} titulo={TEXTOS_INDICE.titulo} nivel={1} bajada={TEXTOS_INDICE.bajada}>
        <p>
          <Etiqueta variante="ejemplo">{TEXTOS_INDICE.ejemplo}</Etiqueta>
        </p>
      </Encabezado>
      {GRUPOS.map((g) => (
        <section key={g.id} className="previa-indice__grupo" aria-labelledby={`previa-${g.id}`}>
          <h2 id={`previa-${g.id}`}>{g.titulo}</h2>
          {porApartado(pantallas.filter((p) => p.grupo === g.id)).map(([apartado, lista]) => (
            <div key={apartado} className="previa-indice__apartado">
              <h3>{apartado}</h3>
              <ul className="previa-indice__lista">
                {lista.map((p) => (
                  <li key={p.ruta}>
                    <Link to={p.ruta}>{p.nombre}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
