// Vista previa · historial de créditos (plataforma 4.10, progreso/creditos/): de lo más
// reciente a lo más antiguo, desde progreso_diario. Un día sin acciones programadas dice que la
// racha sigue. Los días sin créditos ni acciones marcadas no se listan: este historial explica
// créditos, no cuenta lo que faltó.
import { Link } from "react-router-dom";
import Etiqueta from "../../../components/Etiqueta";
import { Icono } from "../../../components/app";
import { HOY, calcularProgreso, type DiaProgreso } from "../../../data/ejemplo-app";
import { diaCorto, mayuscula } from "../../../lib/fechas";
import { Cabeza, R, prepararLista } from "./comun";
import { T_CREDITOS, T_HOY } from "./textos";

export default function Creditos() {
  const progreso = calcularProgreso(prepararLista({}, HOY), HOY);
  const dias = [...progreso.dias].reverse().filter((d) => d.estado === "sin_acciones" || d.estado === "suspenso" || d.creditos > 0);

  return (
    <div className="me-pantalla me-pantalla--angosta me-creditos-historial">
      <p>
        <Link to={R.progreso} className="enlace-util me-volver">
          <Icono nombre="chevron-left" tamaño={16} />
          {T_CREDITOS.volver}
        </Link>
      </p>
      <Cabeza
        ojo={T_CREDITOS.ojo}
        titulo={T_CREDITOS.titulo}
        bajada={
          <p className="me-resumen__fila me-resumen__fila--inicio">
            <Etiqueta variante="activo" grande nowrap>
              {T_HOY.resumen.nivel(progreso.nivel.nivel, progreso.nivel.nombre)}
            </Etiqueta>
            <span className="me-resumen__creditos">{T_HOY.resumen.creditos(progreso.creditos)}</span>
          </p>
        }
      />
      {dias.length ? (
        <ol className="me-historial">
          {dias.map((d) => (
            <DiaHistorial key={d.fecha} d={d} />
          ))}
        </ol>
      ) : (
        <p className="me-bloque__bajada">{T_CREDITOS.vacio}</p>
      )}
    </div>
  );
}

function DiaHistorial({ d }: { d: DiaProgreso }) {
  const dia = mayuscula(diaCorto(d.fecha));
  if (d.estado === "sin_acciones")
    return (
      <li className="me-historial__dia me-historial__dia--neutro">
        <p className="me-historial__titulo">{T_CREDITOS.sinAcciones(dia)}</p>
      </li>
    );
  if (d.estado === "suspenso")
    return (
      <li className="me-historial__dia me-historial__dia--neutro">
        <p className="me-historial__titulo">{T_CREDITOS.fotoEnRevision(dia)}</p>
      </li>
    );
  return (
    <li className="me-historial__dia">
      <p className="me-historial__titulo">{T_CREDITOS.dia(dia, d.creditos)}</p>
      <ul className="me-historial__detalle">
        {d.estado === "completo" ? (
          <>
            <li>{T_CREDITOS.acciones(d.hechas)}</li>
            <li>{T_CREDITOS.diaCompleto(d.bono, d.racha)}</li>
          </>
        ) : (
          <li>{T_CREDITOS.parcial(d.hechas, d.programadas)}</li>
        )}
      </ul>
    </li>
  );
}
