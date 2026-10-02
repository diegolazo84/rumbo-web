// Textos de la portada (5.2) que se repiten entre capítulos o que cambian según
// `operacion`. Con los datos actuales se publica siempre la versión «sin dato».
import { operacion, rayas, t, type Operacion } from "../../data/rumbo";

// Nota bajo los CTA de los capítulos 1 y 6.
export const NOTA_SALIDA = "El formulario se abre en la plataforma de Rumbo, en otra dirección web.";

// Paso 2 del método: según plazo de primera respuesta y si se responde a todas las solicitudes.
export function textoRevision(op: Operacion = operacion) {
  const base = "Una persona del equipo la lee; no es una selección automática ni una venta. ";
  const plazo = op.plazoPrimeraRespuesta;
  if (!plazo)
    return (
      base +
      "Te escribimos si el piloto puede acompañarte en esta etapa. Mientras tanto, puedes ver su estado con tu enlace privado."
    );
  if (op.respondemosTodas)
    return base + t("Te respondemos dentro de {plazo}, también si en esta etapa no podemos acompañarte.", { plazo });
  return (
    base +
    t(
      "Te escribimos dentro de {plazo} si el piloto puede acompañarte en esta etapa. Mientras tanto, puedes ver su estado con tu enlace privado.",
      { plazo },
    )
  );
}

// Bajada del cierre (capítulo 6).
export function bajadaCierre(op: Operacion = operacion) {
  const base = "Cuéntanos tu meta en un formulario breve; no necesitas cuenta. Una persona lee cada solicitud y ";
  const plazo = op.plazoPrimeraRespuesta;
  if (!plazo) return base + "te escribe si podemos acompañarte en esta etapa del piloto.";
  if (op.respondemosTodas) return base + t("te responde dentro de {plazo}.", { plazo });
  return base + t("te escribe dentro de {plazo} si podemos acompañarte en esta etapa del piloto.", { plazo });
}

// Bajada de los planes (5a): cambia cuando los precios ya incluyen impuestos. Lo que se
// acuerda antes de empezar es lo de seAcuerdaContigo (rumbo.ts): día de revisión, fecha y pago.
export function bajadaPlanes(op: Operacion = operacion) {
  return rayas(
    op.preciosConImpuestos
      ? "Precios del piloto en pesos chilenos, impuestos incluidos: es el valor total de cada ciclo de 4 semanas, sin renovación automática. Postular no tiene costo ni te compromete; antes de cualquier cobro acordamos contigo el día de tu revisión, la fecha de inicio y el medio de pago. Hoy no hay pagos en línea."
      : "Precios de referencia del piloto, en pesos chilenos. Postular no tiene costo ni te compromete. Si avanzamos, acordamos contigo el día de tu revisión, la fecha de inicio y el precio final —con impuestos incluidos— antes de cualquier cobro. Hoy no hay pagos en línea.",
  );
}

// Aviso de «Más adelante» (capítulo 2): quien deja su interés también recibe la primera
// respuesta cuando se responde a todas las solicitudes.
export function avisoMasAdelante(op: Operacion = operacion) {
  const base = "Si dejas tu interés, no incluyas diagnósticos ni detalles de salud: basta con el área. ";
  const plazo = op.plazoPrimeraRespuesta;
  if (!plazo || !op.respondemosTodas) return base + "No te contactaremos por estas áreas hasta que se abran.";
  return (
    base +
    t("Como a toda solicitud, te respondemos dentro de {plazo}. ", { plazo }) +
    "Fuera de esa primera respuesta, no te contactaremos por estas áreas hasta que se abran."
  );
}
