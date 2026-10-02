// Tabla de transparencia (3.18): qué existe hoy, qué se acuerda y qué no se ofrece.
// Tres tarjetas, no una <table>: son listas de largo distinto.
import { enMiEspacio, noIncluyeEn, seAcuerdaContigo } from "../data/rumbo";
import { ListaCheck } from "./Bloques";
import { EtiquetaEstado } from "./Etiqueta";

export default function Transparencia() {
  return (
    <div className="transparencia">
      <article className="tarjeta">
        <EtiquetaEstado estado="listo" />
        <h3>Lo que recibes en Mi espacio</h3>
        <ListaCheck items={enMiEspacio} />
      </article>
      <article className="tarjeta">
        <EtiquetaEstado estado="seAcuerda" />
        <h3>Lo que definimos antes de empezar</h3>
        <ListaCheck tipo="neutra" items={seAcuerdaContigo} />
      </article>
      <article className="tarjeta tarjeta--pronto">
        <EtiquetaEstado estado="noDisponible" />
        <h3>Lo que hoy no ofrecemos</h3>
        <ListaCheck tipo="no-incluye" items={noIncluyeEn("transparencia")} />
      </article>
    </div>
  );
}
