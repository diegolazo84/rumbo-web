// Validación de la plataforma (3.12): se valida al salir del campo solo después de una
// primera edición; un campo con error se revalida al escribir y el error desaparece apenas se
// corrige; al enviar se muestran todos los errores (y el resumen). Nunca se deshabilita
// «Enviar» mientras falten campos ni se valida antes del primer blur.
import { useCallback, useMemo, useRef, useState } from "react";
import type { ErrorResumen } from "./ResumenErrores";

export type Errores<V> = Partial<Record<keyof V & string, string | null | undefined>>;

export function useFormulario<V extends Record<string, unknown>>(
  inicial: V,
  validar: (valores: V) => Errores<V>,
  // id del control en el DOM por campo (por defecto, el nombre del campo)
  idDe: (campo: keyof V & string) => string = (c) => c,
) {
  const [valores, setValores] = useState<V>(inicial);
  const [editados, setEditados] = useState<Set<string>>(() => new Set());
  const [visibles, setVisibles] = useState<Errores<V>>({});

  // Valores más recientes, para revalidar sin efectos dentro de un actualizador de estado.
  const actuales = useRef(valores);
  actuales.current = valores;

  const cambiar = useCallback(
    <K extends keyof V & string>(campo: K, valor: V[K]) => {
      const nuevos = { ...actuales.current, [campo]: valor };
      actuales.current = nuevos;
      setValores(nuevos);
      // Un campo que ya muestra error se revalida al escribir.
      setVisibles((v) => (v[campo] ? { ...v, [campo]: validar(nuevos)[campo] ?? null } : v));
      setEditados((e) => (e.has(campo) ? e : new Set(e).add(campo)));
    },
    [validar],
  );

  // Al salir del campo: solo si ya se editó.
  const salir = useCallback(
    (campo: keyof V & string) => {
      if (!editados.has(campo)) return;
      setVisibles((v) => ({ ...v, [campo]: validar(valores)[campo] ?? null }));
    },
    [editados, validar, valores],
  );

  // Al enviar: todos los errores visibles; devuelve la lista para el resumen (vacía = válido).
  const enviar = useCallback((): ErrorResumen[] => {
    const todos = validar(valores);
    setVisibles(todos);
    return (Object.keys(todos) as (keyof V & string)[])
      .filter((c) => todos[c])
      .map((c) => ({ id: idDe(c), texto: todos[c] as string }));
  }, [validar, valores, idDe]);

  const reiniciar = useCallback((nuevos: V = inicial) => {
    setValores(nuevos);
    setEditados(new Set());
    setVisibles({});
  }, [inicial]);

  const errores = useMemo(() => visibles, [visibles]);
  return { valores, cambiar, salir, errores, enviar, reiniciar, setValores };
}
