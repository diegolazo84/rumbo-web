// Contador bajo un textarea (.contador, plataforma 3.1): siempre visible, tabular.
// «{n} de {máx}» y, bajo el mínimo, «· faltan {m} para el mínimo». La región viva anuncia
// solo al cruzar el mínimo y al quedar 50 y 0 caracteres, con 800 ms de retardo.
import { useEffect, useRef, useState } from "react";
import { textoContador } from "../../data/formularios";

type Props = {
  id: string;
  n: number; // largo actual (el maxlength del textarea impide pasarse)
  max: number;
  min?: number;
  recortado?: number; // largo sin espacios al borde, para el mínimo (por defecto n)
};

export default function Contador({ id, n, max, min = 0, recortado = n }: Props) {
  const [anuncio, setAnuncio] = useState("");
  const anterior = useRef({ n, recortado });

  useEffect(() => {
    const antes = anterior.current;
    anterior.current = { n, recortado };
    const cruzoMinimo = min > 0 && antes.recortado < min && recortado >= min;
    const quedan = max - n;
    const quedabanAntes = max - antes.n;
    const hito = (q: number) => quedan === q && quedabanAntes !== q;
    if (!cruzoMinimo && !hito(50) && !hito(0)) return;
    const texto = textoContador(n, max);
    const t = window.setTimeout(() => setAnuncio(texto), 800);
    return () => window.clearTimeout(t);
  }, [n, recortado, min, max]);

  return (
    <>
      <p id={id} className="contador">
        {textoContador(n, max, min, recortado)}
      </p>
      <span className="sr-only" aria-live="polite">
        {anuncio}
      </span>
    </>
  );
}
