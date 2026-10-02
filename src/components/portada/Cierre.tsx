// Capítulo 6: Cierre (5.2). Bosque, centrado: la última invitación, sin presión.
import { Encabezado, ListaCheck } from "../Bloques";
import { BotonPostular } from "../Enlaces";
import { NOTA_SALIDA, bajadaCierre } from "./textos";

export default function Cierre() {
  return (
    <section className="capitulo capitulo--oscuro cierre">
      <div className="contenedor contenedor--medio">
        <Encabezado
          revelar
          variante="centrado"
          titulo={
            <>
              No necesitas tener todo resuelto para <em>empezar.</em>
            </>
          }
          bajada={bajadaCierre()}
          acciones={<BotonPostular ubicacion="cierre" />}
        >
          <p className="microcopia cierre-salida">{NOTA_SALIDA}</p>
          <ListaCheck
            enLinea
            oscuro
            items={["Postular es gratis", "No es una compra ni una reserva", "No es un servicio de urgencias"]}
          />
        </Encabezado>
      </div>
    </section>
  );
}
