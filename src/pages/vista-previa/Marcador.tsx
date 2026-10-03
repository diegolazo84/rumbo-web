// Lugar reservado de una pantalla de la vista previa (base de la etapa 0). Cada grupo lo
// reemplaza por la pantalla real en su archivo; no se usa fuera de la vista previa.
// Sin llaves, «null» ni «TODO» en el texto: el guardián de marcadores revisa este HTML.
import { usePantallaPrevia } from "./contexto";

type Props = {
  titulo: string; // H1 de la pantalla
  apartado: string; // sección de la especificación de la plataforma, p. ej. «3.3 a 3.12»
  estado?: string;
};

export default function Marcador({ titulo, apartado, estado }: Props) {
  const pantalla = usePantallaPrevia();
  const publico = pantalla?.marco === "publico" || pantalla?.marco === "publico-sin-cta";
  const contenido = (
    <div className="previa-marcador">
      <h1>{titulo}</h1>
      <p>
        Pantalla en preparación (especificación de la plataforma, {apartado}).
        {estado ? ` Variante: «${estado}».` : ""}
      </p>
    </div>
  );
  return publico ? <div className="contenedor contenedor--medio lectura">{contenido}</div> : contenido;
}
