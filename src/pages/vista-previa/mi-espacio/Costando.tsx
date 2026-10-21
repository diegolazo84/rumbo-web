// «Me está costando» y la próxima revisión, compartidos por Mi Rumbo (Hoy.tsx) y Mi acompañamiento
// (Acompanamiento.tsx): la misma hoja y la misma regla de fecha en las dos pantallas.
import { Link } from "react-router-dom";
import { Hoja, Icono } from "../../../components/app";
import type { Escenario, Ocurrencia } from "../../../data/ejemplo-app";
import { diaCorto, type Iso } from "../../../lib/fechas";
import { useEspacio } from "./comun";
import { T_COSTANDO } from "./textos";

// Próxima revisión (4.4.7). Con ausencia de Diego, la revisión de esta semana pasa al día en que
// vuelve (4.1.4). `n` es la semana del ciclo de esa revisión.
export function useProximaRevision(hoy: Iso, esc: Escenario, ausencia: boolean) {
  const { semanaDelCiclo, fechaRevision, ausencia: datosAusencia } = useEspacio();
  let n = semanaDelCiclo(hoy);
  if (fechaRevision(n, esc.diaRevision) < hoy) n += 1;
  let fecha = fechaRevision(n, esc.diaRevision);
  if (ausencia && datosAusencia && fecha <= datosAusencia.hasta) fecha = datosAusencia.vuelve;
  const enviado = esc.registrosSemanales.some((r) => r.semana === n && !!r.enviadoEl && r.enviadoEl <= hoy);
  return { n, fecha, enviado };
}

// «Me está costando» (etapa 2A): tres caminos que ya existen. Desde una acción, el ajuste llega
// con esa acción elegida. Lo que la persona cuente lo ve su coach en el panel (Solicitudes de
// ajuste y Revisar), así que no hace falta otra bandeja.

type PropsCostando = {
  abierta: boolean;
  accion?: Ocurrencia;
  hoy: Iso;
  esc: Escenario;
  ausencia: boolean;
  onCerrar: () => void;
  onAyuda: () => void;
};

export function HojaCostando({ abierta, accion, hoy, esc, ausencia, onCerrar, onAyuda }: PropsCostando) {
  const { R, rutaAjuste } = useEspacio();
  const { fecha } = useProximaRevision(hoy, esc, ausencia);
  const opciones = [
    { id: "ajuste", icono: "sliders-horizontal" as const, ...T_COSTANDO.ajuste, ruta: rutaAjuste(accion?.id) },
    { id: "contar", icono: "pen-line" as const, ...T_COSTANDO.contar, ruta: `${R.semana}#registro-costo` },
  ];
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={T_COSTANDO.titulo} className="hoja--costando">
      {accion && <p className="me-costando__accion">{T_COSTANDO.desdeAccion(accion.titulo)}</p>}
      <p className="me-costando__bajada">{T_COSTANDO.bajada}</p>
      <ul className="me-costando">
        {opciones.map((o) => (
          <li key={o.id}>
            <Link to={o.ruta} className="me-costando__opcion" onClick={onCerrar}>
              <span className="icono-mosaico" aria-hidden="true">
                <Icono nombre={o.icono} tamaño={20} />
              </span>
              <span className="me-costando__texto">
                <span className="me-costando__titulo">{o.titulo}</span>
                <span className="me-costando__detalle">{o.texto}</span>
              </span>
            </Link>
          </li>
        ))}
        <li>
          <button type="button" className="me-costando__opcion me-costando__opcion--ayuda" aria-haspopup="dialog" onClick={onAyuda}>
            <span className="icono-mosaico" aria-hidden="true">
              <Icono nombre="phone" tamaño={20} />
            </span>
            <span className="me-costando__texto">
              <span className="me-costando__titulo">{T_COSTANDO.ayuda.titulo}</span>
              <span className="me-costando__detalle">{T_COSTANDO.ayuda.texto}</span>
            </span>
          </button>
        </li>
      </ul>
      <p className="aviso me-costando__nota">
        <Icono nombre="info" tamaño={20} className="aviso-icono" />
        <span>
          {T_COSTANDO.nota(diaCorto(fecha))}
          {esc.plan === "cercano" && ` ${T_COSTANDO.notaCercano}`}
        </span>
      </p>
    </Hoja>
  );
}
