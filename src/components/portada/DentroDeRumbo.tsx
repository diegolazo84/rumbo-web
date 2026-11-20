// Capítulo 4: Dentro de Rumbo. Papel: cómo se ve tu semana (calendario de ejemplo, sin créditos),
// y qué existe hoy y qué no (transparencia). «Lo que viene» salió el 20-nov-2026: todo está presente. Niveles, créditos y rachas
// salieron de la portada en nov-2026 (decisión de Diego): siguen intactos dentro de Mi espacio.
import { Encabezado } from "../Bloques";
import CalendarioEjemplo from "../CalendarioEjemplo";
import Transparencia from "../Transparencia";

const semana = [
  {
    titulo: "Cada acción tiene su momento.",
    texto: "Qué hacer, cuándo y cuánto dura, con instrucciones simples. Algunas tienen hora fija y otras las haces cuando puedas.",
  },
  {
    titulo: "Marcas lo que hiciste.",
    texto: "Basta un toque. Quien te acompaña ve tu avance y también lo que costó, para que cada conversación tenga contexto.",
  },
  {
    titulo: "Cada semana, una revisión.",
    texto: "Por escrito o en videollamada, según tu plan. Si algo no funcionó, se ajusta la carga de la semana siguiente.",
  },
];

export default function DentroDeRumbo() {
  return (
    <section className="capitulo">
      <div className="contenedor">
        <div id="que-recibes">
          <div className="recibes">
            <div className="recibes-texto">
              <Encabezado
                titulo={
                  // «Una persona» junta: que la segunda oración no empiece al final de la primera línea.
                  <>
                    Un calendario claro. <span className="nowrap-amplio">Una persona</span> que lo revisa contigo.
                  </>
                }
                bajada="Tu programa vive en Mi espacio, en esta misma web. Así se ve una semana:"
              />
              <ol className="recibes-pasos">
                {semana.map((p) => (
                  <li key={p.titulo}>
                    <h3>{p.titulo}</h3>
                    <p>{p.texto}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="recibes-demo">
              <CalendarioEjemplo sinCreditos />
            </div>
          </div>

          <h3 className="subtitulo recibes-claridad">Con claridad: qué existe hoy y qué no.</h3>
          <Transparencia />
          <p className="microcopia que-recibes-nota">
            Entras a Mi espacio con un código que te llega al correo que nos diste, sin contraseñas ni cuentas de otras
            empresas.
          </p>
        </div>

      </div>
    </section>
  );
}
