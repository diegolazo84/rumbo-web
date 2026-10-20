// Tarjeta de ranking de ejemplo y barra de nivel (3.14). Nombres ficticios, rotulados.
// El ranking todavía no existe: va rotulado «Todavía no disponible» y compara el cumplimiento
// de la propia semana (porcentaje), no créditos acumulados. Los niveles sí existen hoy.
import { estados, niveles, nivelPara } from "../data/rumbo";
import { Acordeon } from "./Bloques";
import Etiqueta, { EtiquetaEstado } from "./Etiqueta";

// Créditos de «tú» en el ejemplo.
const CREDITOS_EJEMPLO = 18;
// Porcentaje de las acciones programadas de la semana que se completaron.
const CUMPLIMIENTO_TU = 75;
const FILAS = [
  { alias: "luna_andina", cumplimiento: 90 },
  { alias: "pasito_a_pasito", cumplimiento: 80 },
];

export default function TarjetaRanking() {
  const { actual, siguiente } = nivelPara(CREDITOS_EJEMPLO);
  const hasta = siguiente?.minimo ?? actual.minimo;
  const avance = siguiente
    ? Math.round(((CREDITOS_EJEMPLO - actual.minimo) / (hasta - actual.minimo)) * 100)
    : 100;

  return (
    <div className="tarjeta tarjeta--producto ranking-tarjeta">
      <div className="fila-futura-etiquetas">
        <EtiquetaEstado estado="noDisponible" />
        <Etiqueta variante={estados.ejemploIlustrativo.variante}>{estados.ejemploIlustrativo.texto}</Etiqueta>
      </div>
      <div>
        <h3>Ranking semanal</h3>
        <p className="ranking-bajada">Voluntario. Compara cuánto cumpliste de tu semana. Solo se ven alias.</p>
      </div>
      <ol className="ranking">
        {FILAS.map((f) => (
          <li key={f.alias}>
            <span>{f.alias}</span>
            <span className="ranking-creditos">{f.cumplimiento} %</span>
          </li>
        ))}
        <li className="ranking-tu">
          <span>tú</span>
          <span className="ranking-creditos">{CUMPLIMIENTO_TU} %</span>
        </li>
      </ol>
      <div className="ranking-nivel">
        <p>
          <Etiqueta variante="activo" nowrap>
            Nivel {actual.nivel} · {actual.nombre}
          </Etiqueta>
        </p>
        {/* Barra estática: el texto visible da el dato. */}
        <div className="barra" aria-hidden="true">
          <span className="barra-relleno" style={{ inlineSize: `${avance}%` }} />
        </div>
        <p className="barra-texto">
          {siguiente ? `${CREDITOS_EJEMPLO} de ${hasta} créditos para llegar a ${siguiente.nombre}` : "Nivel máximo"}
        </p>
      </div>
      <Acordeon
        compacto
        items={[
          {
            id: "niveles",
            resumen: `Ver los ${niveles.length} niveles`,
            contenido: (
              <ol className="niveles">
                {niveles.map((n) => (
                  <li key={n.nivel}>
                    <span>
                      {n.nivel}. {n.nombre}
                    </span>
                    <span className="tabular">desde {n.minimo} créditos</span>
                  </li>
                ))}
              </ol>
            ),
          },
        ]}
      />
    </div>
  );
}
