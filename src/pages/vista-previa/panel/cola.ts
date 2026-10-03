// Cola de «Hoy» del panel (plataforma 5.3) y contadores de la navegación (5.2), calculados con
// los mismos datos de ejemplo: así el número de cada destino coincide con lo que muestra.
// - Hoy: pendientes con plazo · Solicitudes: sin primera respuesta · Participantes: revisiones
//   que vencen hoy · Revisar: fotos y explicaciones pendientes · Más: peticiones de datos abiertas.
import { diaCorto, type Iso } from "../../../lib/fechas";
import { R, conId, ordenPorPlazo } from "./base";
import { HOY, ajustes, evidencias, mantencion, mensajes, participantes, peticiones, sinPrimeraRespuesta, solicitudes } from "./ejemplo";
import { HOY_PANEL } from "./textos";

export type Item = {
  id: string;
  que: string;
  quien?: string;
  vence: Iso | null;
  nota?: string; // «Para tu revisión del jueves 15», «Fija la fecha límite», «Reordenamientos usados…»
  boton: string;
  href: string;
};

export function cola(): Item[] {
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

export function contadores() {
  return {
    hoy: cola().filter((i) => i.vence).length,
    solicitudes: solicitudes.filter(sinPrimeraRespuesta).length,
    participantes: participantes.filter((p) => p.estadoCiclo === "en_curso" && p.proximaRevision === HOY).length,
    revisar: evidencias.length,
    mas: peticiones.filter((d) => d.estado === "abierta").length,
  };
}
