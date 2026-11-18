// Capítulo 1: Promesa. Rediseño de nov-2026: la audacia de la portada está aquí, en una sola
// fotografía real, grande y cálida, a sangre hacia el borde derecho desde 1024 px. El texto es
// general (Diego, 18-nov-2026): Rumbo sirve para metas de muchos tipos, también las cotidianas y
// los hábitos que hacen bien, sin recalcar un nicho ni insistir en lo que no es. Sin revelado al desplazar: es el primer pantallazo.
import { fotos } from "../../data/fotos";
import { ListaCheck } from "../Bloques";
import { Boton, BotonPostular } from "../Enlaces";
import { EtiquetaEstado } from "../Etiqueta";
import Foto from "../Foto";
import { NOTA_SALIDA } from "./textos";

export default function Promesa() {
  return (
    <section className="portada" aria-labelledby="portada-titulo">
      <div className="portada-grilla">
        <div className="portada-texto">
          <EtiquetaEstado estado="pilotoEnPreparacion" />
          <h1 id="portada-titulo" className="h1--display">
            Tu meta, convertida en una semana posible.
          </h1>
          <p className="portada-nicho">
            Un proyecto que no despega, tus estudios, el orden de tu semana o esos hábitos que te hacen bien y siempre
            quedan para después. Te armamos un plan a tu medida, y cada semana una persona revisa contigo cómo te fue
            y lo ajusta a tu vida.
          </p>
          <p className="portada-foco">
            Porque lo que cambia tu vida no suele ser un gran salto, sino lo que logras sostener semana a semana. En
            línea y en español.
          </p>
          <div className="acciones">
            <BotonPostular ubicacion="portada" />
            <Boton href="#como-funciona" variante="secundario">
              Ver cómo funciona
            </Boton>
          </div>
          <p className="microcopia portada-salida">{NOTA_SALIDA}</p>
          <ListaCheck
            enLinea
            className="portada-confianza"
            items={["Postular es gratis", "No necesitas cuenta", "Una persona lee cada solicitud"]}
          />
        </div>
        <Foto
          foto={fotos.portada}
          className="portada-foto"
          sizes="(min-width: 1024px) 50vw, 100vw"
          prioridad
        />
      </div>
    </section>
  );
}
