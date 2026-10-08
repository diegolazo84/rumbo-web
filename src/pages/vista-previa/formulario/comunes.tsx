// Piezas comunes de /postular/, /estado/ y /contacto/ en la vista previa (grupo «formulario»):
// disposición con aside (3.4), aside «En simple» y «¿Dudas? Escríbenos», línea de tiempo con
// estados (3.13 y 3.14), diálogo modal (3.14), título y foco al H1, y un useFormulario que
// además acepta errores iniciales (para prerenderizar el estado «con errores al enviar»).
// Solo vista previa; no toca los componentes compartidos.
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Link } from "react-router-dom";
import { Aviso } from "../../../components/Bloques";
import Etiqueta from "../../../components/Etiqueta";
import { Icono } from "../../../components/app";
import type { ErrorResumen } from "../../../components/form";
import { estados } from "../../../data/rumbo";
import { RUTAS_PUBLICAS } from "../rutas";
import { ASIDE, ESTADO } from "./textos";
import "../../../styles/vista-formulario.css";

// ---------------------------------------------------------------------------
// Validación (misma regla que components/form/useFormulario.ts, 3.12): al salir del campo solo
// tras una primera edición; un campo con error se revalida al escribir; al enviar, todos.

export type Errores<V> = Partial<Record<keyof V & string, string | null | undefined>>;

export function useFormularioPrevia<V extends Record<string, unknown>>(
  inicial: V,
  validar: (valores: V) => Errores<V>,
  opciones: { idDe?: (campo: keyof V & string) => string; erroresIniciales?: Errores<V>; bloqueado?: boolean } = {},
) {
  const { idDe = (c) => c, erroresIniciales = {}, bloqueado = false } = opciones;
  const [valores, setValores] = useState<V>(inicial);
  const [editados, setEditados] = useState<Set<string>>(() => new Set());
  const [visibles, setVisibles] = useState<Errores<V>>(erroresIniciales);
  const actuales = useRef(valores);
  actuales.current = valores;
  const validarRef = useRef(validar);
  validarRef.current = validar;

  const cambiar = useCallback(
    <K extends keyof V & string>(campo: K, valor: V[K]) => {
      if (bloqueado) return; // «Enviando»: los campos quedan de solo lectura
      const nuevos = { ...actuales.current, [campo]: valor };
      actuales.current = nuevos;
      setValores(nuevos);
      // Los errores visibles se revalidan al escribir y desaparecen apenas se corrigen. Se
      // revisan todos (no solo el campo editado): elegir un área puede cambiar el modo y, con él,
      // qué campos se piden.
      setVisibles((v) => {
        if (!Object.values(v).some(Boolean)) return v;
        const r = validarRef.current(nuevos);
        const out: Errores<V> = {};
        for (const k of Object.keys(v) as (keyof V & string)[]) out[k] = v[k] ? (r[k] ?? null) : v[k];
        return out;
      });
      setEditados((e) => (e.has(campo) ? e : new Set(e).add(campo)));
    },
    [bloqueado],
  );

  const salir = useCallback(
    (campo: keyof V & string) => {
      if (!editados.has(campo)) return;
      setVisibles((v) => ({ ...v, [campo]: validarRef.current(actuales.current)[campo] ?? null }));
    },
    [editados],
  );

  const enviar = useCallback((): ErrorResumen[] => {
    const todos = validarRef.current(actuales.current);
    setVisibles(todos);
    return resumir(todos, idDe);
  }, [idDe]);

  const reiniciar = useCallback((nuevos: V) => {
    actuales.current = nuevos;
    setValores(nuevos);
    setEditados(new Set());
    setVisibles({});
  }, []);

  return { valores, cambiar, salir, errores: visibles, enviar, reiniciar };
}

// Lista para el resumen de errores, en el orden del DOM (el de la validación).
export function resumir<V>(errores: Errores<V>, idDe: (campo: keyof V & string) => string = (c) => c): ErrorResumen[] {
  return (Object.keys(errores) as (keyof V & string)[])
    .filter((c) => errores[c])
    .map((c) => ({ id: idDe(c), texto: errores[c] as string }));
}

// ---------------------------------------------------------------------------
// Título del documento y foco al H1 tras un cambio de estado en la misma página.

export function useTituloDocumento(titulo: string) {
  useEffect(() => {
    document.title = titulo;
  }, [titulo]);
}

// Lleva el foco al H1 (tabindex="-1") cada vez que cambia `clave`, salvo en la carga inicial.
export function useFocoAlTitulo(clave: unknown): RefObject<HTMLHeadingElement | null> {
  const ref = useRef<HTMLHeadingElement>(null);
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    ref.current?.focus({ preventScroll: false });
  }, [clave]);
  return ref;
}

// ---------------------------------------------------------------------------
// Disposición: en móvil una columna; desde 1024 px, columnas 1–7 y aside en 9–12 (3.4, 3.14).
// El aside va después del contenido en el DOM.

export function PaginaConAside({
  children,
  aside,
  medio,
  className,
}: {
  children: ReactNode;
  aside: ReactNode;
  medio?: boolean; // /estado/: .contenedor--medio
  className?: string;
}) {
  const clases = ["contenedor", medio && "contenedor--medio", "vf-pagina", className].filter(Boolean).join(" ");
  return (
    <div className={clases}>
      <div className="vf-principal">{children}</div>
      {aside}
    </div>
  );
}

export type PasoCompacto = { titulo: string; contenido: string };

// Aside: «Qué pasa después» (opcional), aviso lock «En simple» y «¿Dudas? Escríbenos».
// `sinPrograma`: en /contacto/ y en el modo interés no hay calendario ni fotos que proteger, así
// que «Tu calendario y tus fotos son privados» no se muestra.
export function AsideAyuda({ pasos, actual, sinPrograma }: { pasos?: PasoCompacto[]; actual?: "contacto"; sinPrograma?: boolean }) {
  const items = ASIDE.enSimple.items.filter((i) => !(sinPrograma && i === ASIDE.enSimple.soloConPrograma));
  return (
    <aside className="vf-aside" aria-label={ASIDE.etiqueta}>
      {pasos && (
        <div className="vf-aside__pasos">
          <h2 className="vf-aside__titulo">{ASIDE.etiqueta}</h2>
          <LineaTiempo pasos={pasos.map((p) => ({ ...p, estado: "pendiente" as const }))} compacta numerada />
        </div>
      )}
      <Aviso icono="lock" titulo={ASIDE.enSimple.titulo} className="vf-aside__simple">
        <ul>
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </Aviso>
      <p className="vf-aside__dudas">
        <Link to={RUTAS_PUBLICAS.contacto} className="enlace-util" aria-current={actual === "contacto" ? "page" : undefined}>
          <Icono nombre="mail" tamaño={16} />
          <span>{ASIDE.dudas}</span>
        </Link>
      </p>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Línea de tiempo con estados (Pasos, 3.13 y 3.14): completos llenos; el actual con borde
// bosque y el texto oculto «(paso actual)»; pendientes en contorno.

export type EstadoPaso = "completo" | "actual" | "pendiente";
export type PasoLinea = { titulo: string; contenido?: ReactNode; estado: EstadoPaso };

export function LineaTiempo({
  pasos,
  compacta,
  numerada,
  nivelTitulo,
  className,
}: {
  pasos: PasoLinea[];
  compacta?: boolean;
  numerada?: boolean; // número en el círculo; sin él, check en los completos
  nivelTitulo?: "h3";
  className?: string;
}) {
  const clases = ["vf-linea", compacta && "vf-linea--compacta", className].filter(Boolean).join(" ");
  const Titulo = nivelTitulo ?? "p";
  return (
    <ol className={clases}>
      {pasos.map((p, i) => (
        <li key={p.titulo} className={`vf-linea__paso vf-linea__paso--${p.estado}`} aria-current={p.estado === "actual" ? "step" : undefined}>
          <span className="vf-linea__marca" aria-hidden="true">
            {p.estado === "completo" && !numerada ? <Icono nombre="check" tamaño={16} trazo={2.25} /> : i + 1}
          </span>
          <div className="vf-linea__cuerpo">
            <Titulo className="vf-linea__titulo">
              {p.titulo}
              {p.estado === "actual" && <span className="sr-only">{` ${ESTADO.pasoActual}`}</span>}
            </Titulo>
            {p.contenido && (typeof p.contenido === "string" ? <p>{p.contenido}</p> : p.contenido)}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Diálogo modal (<dialog> nativo con showModal: foco atrapado, Escape cierra). El foco inicial
// va al botón seguro (autoFocus) y, al cerrar, vuelve a quien lo abrió.

export function Dialogo({
  abierto,
  onCerrar,
  titulo,
  children,
  id,
  devolverA,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  id: string;
  devolverA?: RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) {
      d.close();
      devolverA?.current?.focus();
    }
  }, [abierto, devolverA]);
  return (
    <dialog
      ref={ref}
      id={id}
      className="vf-dialogo"
      aria-labelledby={`${id}-titulo`}
      onCancel={(e) => {
        e.preventDefault();
        onCerrar();
      }}
    >
      {abierto && (
        <div className="vf-dialogo__cuerpo">
          <h2 id={`${id}-titulo`} className="vf-dialogo__titulo">
            {titulo}
          </h2>
          {children}
        </div>
      )}
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// Rótulos de ejemplo (gramática punteada, 1.2): datos ficticios dentro de una pantalla.

export function EtiquetaEjemplo({ ilustrativo }: { ilustrativo?: boolean }) {
  const e = ilustrativo ? estados.ejemploIlustrativo : estados.ejemplo;
  return <Etiqueta variante={e.variante}>{e.texto}</Etiqueta>;
}
