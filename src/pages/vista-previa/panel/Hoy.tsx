// Vista previa · panel, Hoy (plataforma 5.3): una sola cola ordenada por vencimiento, no por
// tipo. Tarjetas .tarjeta--enlazada con qué es, de quién (nombre de pila), cuándo vence y un solo
// botón primario. Orden: plazo pasado → hoy → mañana → después → sin plazo. Sin celebraciones.
// Variantes (registro.ts): «cola» y «vacio».
import { Link } from "react-router-dom";
import { Icono } from "../../../components/app";
import { diaCorto, fechaLarga, mayuscula, type Iso } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { Cabeza, R, conId, ordenPorPlazo, venceTexto } from "./comun";
import { HOY, ajustes, evidencias, mantencion, mensajes, participantes, peticiones, sinPrimeraRespuesta, solicitudes } from "./ejemplo";
import { HOY_PANEL, T_PANEL } from "./textos";

type Item = {
  id: string;
  que: string;
  quien?: string;
  vence: Iso | null;
  nota?: string; // «Para tu revisión del jueves 15», «Fija la fecha límite», «Reordenamientos usados…»
  boton: string;
  href: string;
};

function cola(): Item[] {
  const items: Item[] = [];
  // 1. Solicitudes sin primera respuesta (vence responder_antes)
  for (const s of solicitudes.filter(sinPrimeraRespuesta)) {
    items.push({ id: s.id, que: HOY_PANEL.tipos.solicitud, quien: s.nombre, vence: s.responderAntes, boton: HOY_PANEL.botones.solicitud, href: conId(R.solicitud, s.id) });
  }
  // 2. Revisión semanal del día (en Cercano, el resumen de la videollamada)
  for (const p of participantes.filter((p) => p.estadoCiclo === "en_curso" && p.proximaRevision === HOY)) {
    items.push({
      id: `rev-${p.id}`,
      que: p.plan === "cercano" ? HOY_PANEL.tipos.videollamada : HOY_PANEL.tipos.revision,
      quien: p.nombre,
      vence: p.proximaRevision,
      boton: HOY_PANEL.botones.revision,
      href: R.revision,
    });
  }
  // 3 y 4. Reordenamientos (Cercano, 1 día hábil) y solicitudes de ajuste (sin plazo propio)
  for (const a of ajustes) {
    const p = participantes.find((x) => x.id === a.participanteId)!;
    items.push({
      id: a.id,
      que: a.reordenar ? HOY_PANEL.tipos.reordenamiento : HOY_PANEL.tipos.ajuste,
      quien: a.nombre,
      vence: a.reordenar ? a.venceEl : null,
      nota: a.reordenar
        ? HOY_PANEL.reordenamientosUsados(p.reordenamientosUsados ?? 0, 2)
        : a.paraRevision
          ? HOY_PANEL.paraRevision(diaCorto(a.paraRevision))
          : undefined,
      boton: HOY_PANEL.botones.ajuste,
      href: R.ajustes,
    });
  }
  // 5. Fotos y explicaciones por revisar (agrupadas; sin plazo mientras Diego no lo publique)
  if (evidencias.length) {
    items.push({ id: "fotos", que: HOY_PANEL.tipos.fotos, vence: null, nota: HOY_PANEL.porRevisar(evidencias.length), boton: HOY_PANEL.botones.fotos, href: R.revisar });
  }
  // 6. Peticiones sobre datos (vence fecha_limite; sin fecha: «Fija la fecha límite»)
  for (const d of peticiones.filter((d) => d.estado === "abierta")) {
    items.push({
      id: d.id,
      que: HOY_PANEL.tipos.datos,
      quien: d.nombre,
      vence: d.fechaLimite,
      nota: d.fechaLimite ? undefined : HOY_PANEL.fijaFecha,
      boton: HOY_PANEL.botones.datos,
      href: R.contacto,
    });
  }
  // 7. Mensajes de contacto sin responder (sin plazo mientras no exista plazoContacto)
  for (const m of mensajes.filter((m) => m.estado === "nuevo")) {
    items.push({ id: m.id, que: HOY_PANEL.tipos.mensaje, quien: m.nombre ?? m.correo, vence: null, boton: HOY_PANEL.botones.mensaje, href: R.contacto });
  }
  // 8. Mantención
  if (!mantencion.respaldoConfirmado) {
    items.push({ id: "respaldo", que: HOY_PANEL.tipos.mantencion, vence: null, nota: HOY_PANEL.respaldo, boton: HOY_PANEL.botones.mantencion, href: `${R.mas}#mantencion` });
  }
  if (mantencion.fotosParaDepurar.length) {
    items.push({
      id: "depurar",
      que: HOY_PANEL.tipos.mantencion,
      vence: null,
      nota: HOY_PANEL.fotosDepurar(mantencion.fotosParaDepurar.length),
      boton: HOY_PANEL.botones.mantencion,
      href: `${R.mas}#mantencion`,
    });
  }
  // Orden estable: por plazo y, dentro del mismo plazo, en el orden de los tipos.
  return items.map((it, i) => ({ it, i })).sort((a, b) => ordenPorPlazo(a.it, b.it) || a.i - b.i).map((x) => x.it);
}

function Tarjeta({ item }: { item: Item }) {
  const idQue = `${item.id}-que`;
  const idDetalle = `${item.id}-detalle`;
  const vence = item.vence ? venceTexto(item.vence) : null;
  const pasado = !!item.vence && item.vence < HOY;
  return (
    <li>
      <article className="tarjeta tarjeta--enlazada pa-cola__tarjeta" aria-labelledby={idQue}>
        <h2 id={idQue} className="pa-cola__que">
          {item.que}
        </h2>
        <div id={idDetalle} className="pa-cola__detalle">
          {item.quien && <p className="pa-cola__quien">{item.quien}</p>}
          {vence ? (
            <p className={pasado ? "pa-vence pa-vence--pasado" : "pa-vence"}>
              <Icono nombre="clock" tamaño={16} />
              <span>{pasado ? mayuscula(vence) : `${T_PANEL.vence} ${vence}`}</span>
            </p>
          ) : (
            <p className="pa-vence pa-vence--sin">{T_PANEL.sinPlazo}</p>
          )}
          {item.nota && <p className="pa-cola__nota">{item.nota}</p>}
        </div>
        <div className="tarjeta-pie">
          <Link to={item.href} className="boton boton--primario" aria-describedby={`${idQue} ${idDetalle}`}>
            {item.boton}
          </Link>
        </div>
      </article>
    </li>
  );
}

export default function Hoy({ estado }: PropsPantalla) {
  const vacio = estado === "vacio";
  const items = vacio ? [] : cola();
  return (
    <div className="pa-pantalla">
      <Cabeza ojo={HOY_PANEL.ojo} titulo={HOY_PANEL.titulo} bajada={mayuscula(fechaLarga(HOY))} />
      {items.length ? (
        <ol className="pa-cola">
          {items.map((it) => (
            <Tarjeta key={it.id} item={it} />
          ))}
        </ol>
      ) : (
        <p className="pa-vacio">{HOY_PANEL.vacio}</p>
      )}
    </div>
  );
}
