/*
 * Prueba completa de 14 días (Diego, 19-nov-2026): aviso en Mi Rumbo con los días que quedan,
 * la revisión de la primera semana y qué pasa al terminar. Sin la migración 20261205 (o fuera de
 * la prueba) no se muestra nada.
 */
import { useEffect, useState } from "react";
import { Icono } from "../../../components/app";
import { diaMes, type Iso } from "../../../lib/fechas";
import { supabase } from "../../../lib/supabase";

type MiPrueba = { desde: Iso; hasta: Iso; quedan: number; acceso_pedido: boolean };

export const T_PRUEBA = {
  titulo: "Estás probando Rumbo completo",
  quedan: (n: number, hasta: string) =>
    n <= 1 ? `Hoy es tu último día de prueba.` : `Te quedan ${n} días de prueba, hasta el ${hasta}.`,
  revision: "Al final de tu primera semana te llega una revisión escrita de un coach de Rumbo.",
  despues: "Cuando termine sigues gratis con lo básico: tu meta, hasta 3 acciones al día, créditos y racha. Lo que hiciste se mantiene.",
  boton: "Quiero seguir con acompañamiento",
  enviando: "Avisando…",
  enviado: "Listo. Te escribiremos a tu correo para conversar los planes.",
  pedido: "Ya nos avisaste que quieres seguir con acompañamiento. Te escribiremos a tu correo.",
  error: "No pudimos avisar. Revisa tu conexión e inténtalo de nuevo.",
};

export function TarjetaPrueba() {
  const [prueba, setPrueba] = useState<MiPrueba | null>(null);
  const [estado, setEstado] = useState<"listo" | "enviando" | "enviado" | "error">("listo");
  useEffect(() => {
    let vivo = true;
    void supabase()
      .then((sb) => sb.rpc("mi_prueba"))
      .then(({ data, error }) => vivo && !error && data && setPrueba(data as MiPrueba))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);
  if (!prueba) return null;
  const avisar = () => {
    setEstado("enviando");
    void supabase()
      .then((sb) => sb.rpc("pedir_acompanamiento_libre", { p_apoyo: "nose" }))
      .then(({ error }) => setEstado(error ? "error" : "enviado"))
      .catch(() => setEstado("error"));
  };
  return (
    <div className="me-pantalla me-prueba__inicio">
      <section className="tarjeta me-prueba" aria-labelledby="tarjeta-prueba">
        <p className="me-prueba__ojo">
          <Icono nombre="sparkles" tamaño={16} /> {T_PRUEBA.quedan(prueba.quedan, diaMes(prueba.hasta))}
        </p>
        <h2 id="tarjeta-prueba" className="me-h2">
          {T_PRUEBA.titulo}
        </h2>
        <p>{T_PRUEBA.revision}</p>
        <p className="me-prueba__despues">{T_PRUEBA.despues}</p>
        {prueba.acceso_pedido || estado === "enviado" ? (
          <p role="status" className="me-prueba__ok">
            {estado === "enviado" ? T_PRUEBA.enviado : T_PRUEBA.pedido}
          </p>
        ) : (
          <>
            <button type="button" className="boton boton--primario" onClick={avisar} disabled={estado === "enviando"} aria-busy={estado === "enviando" || undefined}>
              {estado === "enviando" ? T_PRUEBA.enviando : T_PRUEBA.boton}
            </button>
            {estado === "error" && <p role="alert" className="me-prueba__error">{T_PRUEBA.error}</p>}
          </>
        )}
      </section>
    </div>
  );
}
