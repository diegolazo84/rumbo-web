// El bloque «¿Qué te gustaría compartir hoy?» de Comunidad con Foto, Progreso, Pregunta y Consejo.
// Cada acceso lleva a la pantalla Crear publicación (CrearPagina.tsx) con ese tipo ya elegido.
import { Icono, type NombreIconoApp } from "../../../../components/app";
import { useComunidad, type PresetCrear } from "./contexto";
import { Avatar } from "./Publicaciones";
import { T_COMU as T } from "./textos";

const ACCESOS: { clave: "foto" | "progreso" | "pregunta" | "consejo"; icono: NombreIconoApp }[] = [
  { clave: "foto", icono: "image" },
  { clave: "progreso", icono: "trending-up" },
  { clave: "pregunta", icono: "circle-help" },
  { clave: "consejo", icono: "lightbulb" },
];

export function Compositor({ preset }: { preset?: PresetCrear }) {
  const { alias, abrirCrear } = useComunidad();
  return (
    <section className="co-tarjeta co-compositor" aria-label={T.crear}>
      <div className="co-compositor__fila">
        <Avatar alias={alias} grande />
        <button type="button" className="co-compositor__invitacion" onClick={() => abrirCrear(preset)}>
          {T.compositor.invitacion}
        </button>
      </div>
      <ul className="co-compositor__accesos">
        {ACCESOS.map((a) => (
          <li key={a.clave}>
            <button
              type="button"
              className="co-compositor__acceso"
              onClick={() => abrirCrear(a.clave === "foto" ? { ...preset, foto: true } : { ...preset, tipo: a.clave })}
            >
              <Icono nombre={a.icono} tamaño={16} />
              {T.compositor.accesos[a.clave]}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
