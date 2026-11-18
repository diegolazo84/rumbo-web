// Capítulo 1b: el alma de Rumbo (Diego, 18-nov-2026). Lo principal del proyecto, dicho antes que
// las áreas: no te deja solo, ordena tus ideas cuando no sabes por dónde partir y siempre hay una
// persona real orientando el proceso, más seguido en Acompañamiento cercano. Los datos de cada plan
// salen de rumbo.ts (conversación inicial, revisión semanal, videollamada de 20 minutos).
import { Encabezado } from "../Bloques";

const puntos = [
  {
    titulo: "Ordenamos tus ideas contigo.",
    texto:
      "Si no sabes qué hacer o por dónde partir, partimos por ahí: conversamos lo que te inquieta, elegimos qué importa primero y lo convertimos en pasos que caben en tu semana.",
  },
  {
    titulo: "Una persona real, desde el primer día.",
    texto:
      "Tu coach conversa contigo antes de empezar, arma tu plan y orienta todo tu proceso. Cada semana revisa cómo te fue y lo ajusta contigo.",
  },
  {
    titulo: "Más cerca, si lo necesitas.",
    texto:
      "En Acompañamiento cercano, además, conversan 20 minutos por videollamada todas las semanas, en un día y hora fijos.",
  },
  {
    titulo: "Apoyo también entre revisiones.",
    texto:
      "Desde el lanzamiento, un asistente en Mi espacio te sugiere ideas y próximos pasos cuando te trabas. Tu coach revisa lo que propone: nunca lo reemplaza.",
  },
];

export default function Alma() {
  return (
    <section id="acompanamiento" className="capitulo alma">
      <div className="contenedor">
        <Encabezado
          titulo="No vas a estar solo en esto."
          bajada="Sea lo que sea que quieras cambiar, Rumbo te acompaña en todo el proceso: en lo grande y en lo cotidiano, cuando avanzas y también cuando te cuesta."
        />
        <ol className="alma-puntos">
          {puntos.map((p) => (
            <li key={p.titulo}>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
