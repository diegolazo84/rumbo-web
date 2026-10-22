// Rumbo 2.0, etapa 2 · «Lo que viene en Rumbo» dentro de Mi espacio (menú de la cabecera y pie de
// la barra lateral). Las mismas funciones que la portada (loQueViene de data/rumbo.ts), con su
// descripción. Tarjetas apagadas (tarjeta--pronto): no son enlaces, no tienen botones de
// contratar, reservar ni comprar, y no tienen fechas.
// C14 · En Mi espacio real se lee la tabla «modulos» (A4): lo que el dueño ya habilitó para las
// personas deja de aparecer aquí. Si la tabla no se puede leer, se muestra la lista completa.
import { useEffect, useState } from "react";
import Etiqueta from "../../../components/Etiqueta";
import { Icono } from "../../../components/app";
import { datos, supabase } from "../../../lib/supabase";
import { useEspacio } from "./espacio";
import { TituloSeccion } from "./Seccion";
import { T_LO_QUE_VIENE, T_SECCIONES } from "./textos";

const DISPONIBLE = new Set(["habilitado", "operativo"]);

// Claves de los módulos que ya ven las personas (vacío si no hay datos).
export async function modulosDisponibles(): Promise<Set<string>> {
  const sb = await supabase();
  const filas = datos(await sb.from("modulos").select("clave,estado")) as { clave: string; estado: string }[] | null;
  return new Set((filas ?? []).filter((f) => DISPONIBLE.has(f.estado)).map((f) => f.clave));
}

export default function LoQueViene() {
  const { real } = useEspacio();
  const [disponibles, setDisponibles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!real) return;
    let vivo = true;
    modulosDisponibles()
      .then((d) => vivo && setDisponibles(d))
      .catch(() => undefined); // sin tabla (migración sin aplicar) o sin conexión: la lista completa
    return () => {
      vivo = false;
    };
  }, [real]);

  const grupos = T_LO_QUE_VIENE.grupos
    .map((g) => ({ ...g, items: g.items.filter((it) => !disponibles.has(it.clave)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="me-pantalla me-lo-que-viene">
      <TituloSeccion titulo={T_SECCIONES.loQueViene} icono="sparkles" bajada={T_LO_QUE_VIENE.bajada} />
      {grupos.map((g, i) => (
        <section key={g.titulo} className="me-bloque" aria-labelledby={`lqv-${i}`}>
          <h2 id={`lqv-${i}`} className="me-h2">
            {g.titulo}
          </h2>
          <ul className="me-lqv">
            {g.items.map((it) => (
              <li key={it.titulo} className="tarjeta tarjeta--pronto me-lqv__item">
                <div className="me-lqv__cabeza">
                  <Icono nombre="sparkles" tamaño={20} />
                  <h3 className="me-lqv__titulo">{it.titulo}</h3>
                </div>
                <p>{it.texto}</p>
                <Etiqueta variante="pronto">{T_SECCIONES.proximamente}</Etiqueta>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="microcopia">{T_LO_QUE_VIENE.nota}</p>
    </div>
  );
}
