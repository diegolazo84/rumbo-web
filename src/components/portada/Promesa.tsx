// Capítulo 1: Promesa (5.2). Papel con cuadrícula de agenda; texto y calendario de
// ejemplo, en dos columnas desde 1024 px. Sin revelado al desplazar: es el primer pantallazo.
import { rayas } from "../../data/rumbo";
import { ListaCheck } from "../Bloques";
import CalendarioEjemplo from "../CalendarioEjemplo";
import { Boton, BotonPostular } from "../Enlaces";
import { EtiquetaEstado } from "../Etiqueta";
import Icono from "../Icono";
import RutaPuntos from "../RutaPuntos";
import { NOTA_SALIDA } from "./textos";

export default function Promesa() {
  return (
    <section className="capitulo portada">
      <div className="contenedor portada-grilla">
        <div className="portada-texto">
          <EtiquetaEstado estado="pilotoEnPreparacion" grande />
          <h1 className="h1--display">
            Tu meta, convertida en una <em>semana posible.</em>
          </h1>
          <p className="bajada">
            {rayas(
              "Rumbo es planificación personal con acompañamiento humano. Nos cuentas qué quieres lograr y cuánto tiempo tienes de verdad; te entregamos un calendario listo —qué hacer, cuándo y cómo— y una persona lo revisa contigo cada semana.",
            )}
          </p>
          <p className="portada-foco">
            <Icono nombre="compass" tamaño={16} />
            <span>
              Primer piloto: personas adultas que quieren avanzar en un proyecto, en sus estudios o en el orden de su
              semana.
            </span>
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
        <CalendarioEjemplo />
        {/* Desde 1024 px: la ruta une el texto con el calendario, bajo el texto. */}
        <RutaPuntos variante="fondo" className="portada-ruta" />
      </div>
    </section>
  );
}
