// Capítulo 1: Promesa. Rediseño de nov-2026: la audacia de la portada está aquí, en una sola
// fotografía real, grande y cálida, a sangre hacia el borde derecho desde 1024 px. El texto le
// habla primero al nicho del grupo fundador (tesis o emprendimiento detenido) sin cerrar los
// otros caminos. Sin revelado al desplazar: es el primer pantallazo.
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
            ¿Llevas meses con la tesis o el emprendimiento detenido? Te armamos el plan, y cada semana una persona
            revisa contigo cómo te fue y lo ajusta a tu vida.
          </p>
          <p className="portada-foco">
            También acompañamos metas de estudio y el orden de tu semana. Es en línea, en español y no es un servicio de
            salud.
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
