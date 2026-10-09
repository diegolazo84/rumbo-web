// Vista previa · panel, Solicitudes (plataforma 5.4): bandeja con filtros «Por responder» (por
// defecto), «En conversación», «Cerradas», «Intereses» y «Marcadas». Cada fila: nombre de pila,
// área (etiqueta de categoría), apoyo, recibida, vence y marcas. Orden: más antigua primero.
// Funciona a 360 px: cada fila es una tarjeta, no una tabla.
import { useState } from "react";
import { Link } from "react-router-dom";
import Etiqueta from "../../../components/Etiqueta";
import { opcionesApoyo } from "../../../data/formularios";
import { diaCorto } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { Cabeza, EtiquetaArea, conId, usePanel, useVence } from "./comun";
import { sinPrimeraRespuesta, solicitudes as solicitudesEjemplo, type Solicitud } from "./ejemplo";
import { ESTADO_SOLICITUD, SOLICITUDES } from "./textos";
import { Segmentado } from "../../../components/app";

type Filtro = (typeof SOLICITUDES.filtros)[number]["valor"];

const FILTROS: Record<Filtro, (s: Solicitud) => boolean> = {
  responder: sinPrimeraRespuesta,
  conversacion: (s) => s.tipo === "solicitud" && ["respondida", "acordada"].includes(s.estado),
  cerradas: (s) => s.tipo === "solicitud" && ["cerrada", "retirada", "con_espacio"].includes(s.estado),
  intereses: (s) => s.tipo === "interes",
  marcadas: (s) => s.marcas.length > 0,
};

export const textoApoyo = (apoyo: string) => opcionesApoyo.find((o) => o.valor === apoyo)?.titulo ?? apoyo;

function Fila({ s }: { s: Solicitud }) {
  const { R, hoy } = usePanel();
  const venceTexto = useVence();
  const estado = s.tipo === "interes" ? ESTADO_SOLICITUD.interes : ESTADO_SOLICITUD[s.estado];
  const pendiente = sinPrimeraRespuesta(s);
  const vence = pendiente && s.responderAntes ? venceTexto(s.responderAntes) : null;
  return (
    <li className="tarjeta tarjeta--enlazada pa-fila">
      <div className="pa-fila__cabeza">
        <h2 className="pa-fila__nombre">
          <Link to={conId(R.solicitud, s.id)}>{s.nombre}</Link>
        </h2>
        <Etiqueta variante={estado.variante}>{estado.texto}</Etiqueta>
      </div>
      <div className="pa-fila__etiquetas">
        <EtiquetaArea area={s.area} />
        {s.marcas.map((m) => (
          <Etiqueta key={m} variante="nota">
            {SOLICITUDES.marcas[m]}
          </Etiqueta>
        ))}
      </div>
      <dl className="pa-fila__datos">
        {s.tipo === "solicitud" && (
          <div>
            <dt>{SOLICITUDES.columnas.apoyo}</dt>
            <dd>{textoApoyo(s.apoyo)}</dd>
          </div>
        )}
        <div>
          <dt>{SOLICITUDES.columnas.recibida}</dt>
          <dd>{diaCorto(s.recibida)}</dd>
        </div>
        {vence && (
          <div>
            <dt>{SOLICITUDES.columnas.vence}</dt>
            <dd className={s.responderAntes! < hoy ? "pa-vence--pasado" : undefined}>{vence}</dd>
          </div>
        )}
      </dl>
    </li>
  );
}

export default function Solicitudes(_: PropsPantalla) {
  return <ListaSolicitudes solicitudes={solicitudesEjemplo} />;
}

// Bandeja con sus filtros (vista previa: datos de ejemplo; panel real: los de la base).
export function ListaSolicitudes({ solicitudes }: { solicitudes: Solicitud[] }) {
  const [filtro, setFiltro] = useState<Filtro>("responder");
  const lista = solicitudes.filter(FILTROS[filtro]).sort((a, b) => (a.recibida + a.hora).localeCompare(b.recibida + b.hora));
  return (
    <div className="pa-pantalla">
      <Cabeza ojo={SOLICITUDES.ojo} titulo={SOLICITUDES.titulo} />
      <Segmentado
        leyenda={SOLICITUDES.leyendaFiltros}
        leyendaOculta
        opciones={SOLICITUDES.filtros}
        valor={filtro}
        onCambio={(v) => setFiltro(v as Filtro)}
        className="pa-filtros"
      />
      <div className="pa-lista">
        {lista.length ? (
          <ul className="pa-filas">
            {lista.map((s) => (
              <Fila key={s.id} s={s} />
            ))}
          </ul>
        ) : (
          <p className="pa-vacio">{SOLICITUDES.vacio}</p>
        )}
      </div>
    </div>
  );
}
