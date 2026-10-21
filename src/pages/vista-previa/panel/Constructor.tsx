// Panel, constructor de programa (plataforma 5.6). Es de escritorio (≥1024 px): metas a la
// izquierda (280 px) · semana en el centro (lista por día con columna de horas y suma de minutos
// por día) · panel derecho con el formulario de la acción. En el teléfono muestra «El constructor
// se usa en un computador…» y el programa publicado.
// - Revisión de carga y solapamientos en vivo: la suma por día es informativa y nunca bloquea; un
//   solapamiento marca ambas acciones y se avisa al publicar, sin bloquear (se publica aceptándolo).
// - «Vista previa» punteada con las filas de Mi espacio; «Publicar» abre la lista de comprobación.
// Vista previa: todo en memoria, no se guarda ni se publica nada. El borrador es la v2 del
// programa de Camila (ejemplo-app.ts) con dos cambios de ejemplo: «Escribir 3 ideas» pasa del
// jueves al miércoles y «Reservar 2 bloques» queda a las 08:45, cruzada con «Escribir a quién
// quieres ayudar».
// Panel real (etapa 3, con `servidor`): el borrador de la base; «Guardar borrador» escribe metas
// y acciones (solo se puede mientras es borrador) y «Publicar» corre publicar_programa, después de
// revisar con la base los solapamientos y la carga prevista.
import { useEffect, useMemo, useRef, useState } from "react";
import Etiqueta from "../../../components/Etiqueta";
import { ChipMeta, FilaAccion, Hoja, Icono, LeyendaMetas, Segmentado } from "../../../components/app";
import { CampoArea, CampoSelect, CampoTexto, GrupoOpciones, Opcion } from "../../../components/form";
import { LIMITES } from "../../../data/formularios";
import { HOY, ciclo, metas as metasPublicadas, programa } from "../../../data/ejemplo-app";
import { categorias, type CategoriaId } from "../../../data/rumbo";
import { diaCorto, duracionTexto, fechaLarga, sumarDias, sumarMinutos, type Iso } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { Cabeza, CasillaAjuste } from "./comun";
import { participantes } from "./ejemplo";
import { textoError } from "./FichaSolicitud";
import { CONSTRUCTOR as C, PANEL_REAL, T_PANEL } from "./textos";

export type MetaB = { id: string; titulo: string; paraQue: string; categoria: CategoriaId; hitos: { texto: string; logrado: boolean }[] };
export type AccionB = {
  id: string;
  metaId: string;
  titulo: string;
  hora: string | null;
  duracion: number;
  dias: number[];
  desde: number;
  durante: number;
  instrucciones: string;
  versionCorta: string;
  conFoto: boolean;
};

// Lo publicado, para el teléfono (solo lectura).
export type ProgramaLectura = {
  version: number;
  metas: { id: string; titulo: string; categoria: CategoriaId }[];
  acciones: { id: string; metaId: string; titulo: string; dias: number[]; hora: string | null; duracion: number }[];
};

export type RevisionBase = { cruces: number; carga: { fecha: Iso; minutos: number } | null };

// Panel real: escrituras en la base. Sin servidor (vista previa), nada se guarda.
export type ServidorConstructor = {
  guardar: (metas: MetaB[], acciones: AccionB[]) => Promise<void>;
  revisar: () => Promise<RevisionBase>; // solapamientos() y carga_prevista() del borrador guardado
  publicar: (p: { vigencia: Iso; aceptar: boolean; nota: string; foco: string }) => Promise<number>;
};

export type DatosConstructor = {
  nombre: string;
  cercano: boolean;
  inicio: Iso; // lunes de inicio del ciclo
  semanas: number; // 4, 8 o 12
  hoy: Iso;
  version: number; // versión del borrador
  publicada: ProgramaLectura | null;
  metas: MetaB[];
  acciones: AccionB[];
  elegida?: string; // acción abierta al entrar
  semanaInicial?: number;
  servidor?: ServidorConstructor;
  alPublicar?: () => void; // panel real: al cerrar la hoja tras publicar, vuelve a leer la base
};

const COLORES_META = 8;
// El color es de la meta; la categoría se reconoce por su símbolo y su nombre.
const SIMBOLO_CAT: Record<CategoriaId, string> = { proyecto: "◆", orden: "■", bienestar: "●" };
function EtiquetaCat({ cat }: { cat: CategoriaId }) {
  return (
    <span className="pa-cat">
      <span className="pa-cat__simbolo" aria-hidden="true">
        {SIMBOLO_CAT[cat]}
      </span>
      {categorias[cat].nombre}
    </span>
  );
} // paleta de vista-panel.css ([data-meta-color])
const LIMITE_NOTA_CAMBIOS = 600; // nota_cambios (6.4)
const camila = participantes[0];

const metasIniciales = (): MetaB[] =>
  metasPublicadas.map((m) => ({ id: m.id, titulo: m.titulo, paraQue: m.paraQue ?? "", categoria: m.categoria, hitos: m.hitos.map((h) => ({ ...h })) }));

const accionesIniciales = (): AccionB[] =>
  programa.acciones.map((a) => ({
    id: a.id,
    metaId: a.metaId,
    titulo: a.titulo,
    hora: a.id === "a4" ? "08:45" : a.hora,
    duracion: a.duracion,
    dias: a.id === "a3" ? [2, 3] : [...a.dias],
    desde: Math.min(...a.semanas),
    durante: a.semanas.length,
    instrucciones: a.instrucciones.join("\n"),
    versionCorta: a.versionCorta ?? "",
    conFoto: a.conFoto,
  }));

// Datos de ejemplo de la vista previa.
const EJEMPLO = (): DatosConstructor => ({
  nombre: camila.nombre,
  cercano: camila.plan === "cercano",
  inicio: ciclo.inicio,
  semanas: ciclo.semanas,
  hoy: HOY,
  version: programa.version + 1,
  publicada: {
    version: programa.version,
    metas: metasPublicadas.map((m) => ({ id: m.id, titulo: m.titulo, categoria: m.categoria })),
    acciones: programa.acciones.map((a) => ({ id: a.id, metaId: a.metaId, titulo: a.titulo, dias: [...a.dias], hora: a.hora, duracion: a.duracion })),
  },
  metas: metasIniciales(),
  acciones: accionesIniciales(),
  elegida: "a4",
  semanaInicial: 2,
});

const aMinutos = (h: string) => {
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
};
const enSemana = (a: AccionB, n: number) => n >= a.desde && n < a.desde + a.durante;
const ordenDia = (a: AccionB, b: AccionB) => (a.hora && b.hora ? a.hora.localeCompare(b.hora) : a.hora ? -1 : b.hora ? 1 : a.titulo.localeCompare(b.titulo));
const SEMANAS_MAX = Array.from({ length: 12 }, (_, i) => i + 1);

// Solapamientos: dos acciones con horario que se cruzan el mismo día de la misma semana.
function cruces(acciones: AccionB[]) {
  const mapa = new Map<string, Set<string>>();
  for (let i = 0; i < acciones.length; i++) {
    for (let j = i + 1; j < acciones.length; j++) {
      const a = acciones[i];
      const b = acciones[j];
      if (!a.hora || !b.hora) continue;
      const mismoDia = a.dias.some((d) => b.dias.includes(d));
      const mismaSemana = SEMANAS_MAX.some((n) => enSemana(a, n) && enSemana(b, n));
      const ia = aMinutos(a.hora);
      const ib = aMinutos(b.hora);
      if (mismoDia && mismaSemana && ia < ib + b.duracion && ib < ia + a.duracion) {
        if (!mapa.has(a.id)) mapa.set(a.id, new Set());
        if (!mapa.has(b.id)) mapa.set(b.id, new Set());
        mapa.get(a.id)!.add(b.id);
        mapa.get(b.id)!.add(a.id);
      }
    }
  }
  return mapa;
}

function errorDe(a: AccionB) {
  const t = a.titulo.trim().length;
  return {
    titulo: t < LIMITES.tituloAccion.min || t > LIMITES.tituloAccion.max ? C.accion.errores.titulo : null,
    duracion:
      !Number.isFinite(a.duracion) || a.duracion < LIMITES.duracionAccion.min || a.duracion > LIMITES.duracionAccion.max
        ? C.accion.errores.duracion
        : null,
    dias: a.dias.length ? null : C.accion.errores.dias,
    instrucciones: a.instrucciones.trim().length < LIMITES.instrucciones.min ? C.accion.errores.instrucciones : null,
  };
}
const accionValida = (a: AccionB) => Object.values(errorDe(a)).every((e) => !e);
const metaValida = (m: MetaB) => m.titulo.trim().length >= 2 && m.titulo.trim().length <= LIMITES.tituloMeta.max;

// Identificador nuevo: en el panel real es el uuid con que se guarda la fila.
const idNuevo = (real: boolean, prefijo: string, n: number) => (real ? crypto.randomUUID() : `${prefijo}${n}`);

export default function Constructor(_: PropsPantalla) {
  return <PantallaConstructor {...EJEMPLO()} />;
}

export function PantallaConstructor(d: DatosConstructor) {
  return (
    <div className="pa-pantalla pa-constructor">
      <Cabeza
        ojo={C.ojo}
        titulo={C.titulo(d.nombre)}
        antes={
          // En el teléfono se ve el programa publicado; el borrador solo existe en el editor.
          <div className="pa-etiquetas">
            {d.publicada && (
              <Etiqueta variante="activo" className="pa-constructor__solo-movil">
                {C.publicado(d.publicada.version)}
              </Etiqueta>
            )}
            <Etiqueta variante="nota" className="pa-constructor__solo-escritorio">
              {C.borrador}
            </Etiqueta>
          </div>
        }
      />
      <div className="pa-constructor__movil">
        <p className="aviso">
          <Icono nombre="info" tamaño={20} className="aviso-icono" />
          <span>{C.movil}</span>
        </p>
        {d.publicada ? <ProgramaPublicado p={d.publicada} /> : <p className="pa-vacio">{PANEL_REAL.participante.sinPrograma}</p>}
      </div>
      <div className="pa-constructor__escritorio">
        <Editor d={d} />
      </div>
    </div>
  );
}

// Programa publicado (lo que se ve en el teléfono): metas y sus acciones, en solo lectura.
function ProgramaPublicado({ p }: { p: ProgramaLectura }) {
  return (
    <div className="pa-pila">
      {p.metas.map((m) => (
        <section key={m.id} className="tarjeta meta-tarjeta pa-tarjeta" data-cat={m.categoria} aria-labelledby={`pub-${m.id}`}>
          <h2 id={`pub-${m.id}`} className="pa-h3">
            {m.titulo}
          </h2>
          <ul className="pa-prog-acciones">
            {p.acciones
              .filter((a) => a.metaId === m.id)
              .map((a) => (
                <li key={a.id} data-cat={m.categoria}>
                  <span className="pa-prog-acciones__titulo">{a.titulo}</span>
                  <span className="microcopia">
                    {a.dias.map((x) => C.dias[x - 1]).join(", ")} · {a.hora ?? C.accion.flexible} · {duracionTexto(a.duracion)}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor de escritorio

function Editor({ d }: { d: DatosConstructor }) {
  const real = !!d.servidor;
  const [metas, setMetas] = useState<MetaB[]>(d.metas);
  const [acciones, setAcciones] = useState<AccionB[]>(d.acciones);
  const [metaSel, setMetaSel] = useState(d.metas[0]?.id ?? "");
  const [sel, setSel] = useState<string>(d.elegida ?? d.acciones[0]?.id ?? "");
  const [semana, setSemana] = useState(d.semanaInicial ?? 1);
  const [vista, setVista] = useState(false);
  const [publicar, setPublicar] = useState(false);
  const [sucio, setSucio] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [mostrarErrores, setMostrarErrores] = useState(false);
  const enCurso = useRef<Promise<void> | null>(null);
  const cambios = useRef(0); // sube con cada cambio: lo editado mientras se guarda sigue pendiente
  const mapa = useMemo(() => cruces(acciones), [acciones]);
  const pares = [...mapa.values()].reduce((s, x) => s + x.size, 0) / 2;
  const accion = acciones.find((a) => a.id === sel);
  const nombre = (id: string) => acciones.find((a) => a.id === id)?.titulo ?? "";
  const meta = (id: string) => metas.find((m) => m.id === id);
  const catDe = (id: string) => meta(id)?.categoria ?? "proyecto";
  const nombreMeta = (id: string) => meta(id)?.titulo.trim() || C.metas.tituloCampo;
  // Un color por meta (según su orden), igual en la lista de metas, la semana y el resumen.
  const colorDe = (id: string) => String(Math.max(0, metas.findIndex((m) => m.id === id)) % COLORES_META);
  const semanas = SEMANAS_MAX.slice(0, d.semanas);

  const tocar = () => {
    cambios.current += 1;
    setSucio(true);
    setAviso("");
  };
  const cambiarAccion = (cambio: Partial<AccionB>) => {
    tocar();
    setAcciones((l) => l.map((a) => (a.id === sel ? { ...a, ...cambio } : a)));
  };
  const cambiarMeta = (id: string, cambio: Partial<MetaB>) => {
    tocar();
    setMetas((l) => l.map((m) => (m.id === id ? { ...m, ...cambio } : m)));
  };
  const mover = (i: number, dir: -1 | 1) => {
    tocar();
    setMetas((l) => {
      const n = [...l];
      [n[i], n[i + dir]] = [n[i + dir], n[i]];
      return n;
    });
  };
  const nueva = () => {
    if (!metaSel) return;
    tocar();
    const id = idNuevo(real, "n", acciones.length + 1);
    setAcciones((l) => [
      ...l,
      // Por defecto la acción se repite hasta el fin del ciclo (máx. 4 semanas): así no
      // «desaparece» al pasar a la semana siguiente.
      { id, metaId: metaSel, titulo: "", hora: null, duracion: 10, dias: [], desde: semana, durante: Math.min(LIMITES.semanasRutina.max, d.semanas - semana + 1), instrucciones: "", versionCorta: "", conFoto: false },
    ]);
    setSel(id);
  };
  // Al elegir otra meta, el formulario no queda abierto sobre una acción de la meta anterior
  // (escribir ahí cambiaba esa acción): se abre la primera acción de la meta o ninguna.
  const elegirMeta = (id: string) => {
    setMetaSel(id);
    if (accion && accion.metaId !== id) setSel(acciones.find((a) => a.metaId === id && enSemana(a, semana))?.id ?? "");
  };
  const nuevaMeta = () => {
    tocar();
    const id = idNuevo(real, "m", metas.length + 1);
    setMetas((l) => [...l, { id, titulo: "", paraQue: "", categoria: "proyecto", hitos: [] }]);
    setMetaSel(id);
    setSel("");
  };
  const quitarMeta = (id: string) => {
    tocar();
    setMetas((l) => l.filter((m) => m.id !== id));
    setAcciones((l) => l.filter((a) => a.metaId !== id));
    setMetaSel(metas.find((m) => m.id !== id)?.id ?? "");
  };
  const quitarAccion = (id: string) => {
    tocar();
    setAcciones((l) => l.filter((a) => a.id !== id));
    setSel("");
  };

  // Guarda el borrador en la base (panel real). Devuelve si quedó guardado.
  // desdeBoton: «Guardar borrador» siempre confirma, aunque no haya cambios pendientes.
  const guardar = (desdeBoton = false): Promise<boolean> => guardarAhora(desdeBoton);
  const guardarAhora = async (desdeBoton: boolean): Promise<boolean> => {
    if (!d.servidor) return true;
    if (!metas.every(metaValida)) {
      setError(PANEL_REAL.constructor.erroresMeta);
      return false;
    }
    // Una acción incompleta puede no verse (sin días u otra semana): se abre y se marcan sus campos.
    const incompleta = acciones.find((a) => !accionValida(a));
    if (incompleta) {
      const faltan = (Object.entries(errorDe(incompleta)) as [keyof ReturnType<typeof errorDe>, string | null][])
        .filter(([, e]) => e)
        .map(([c]) => PANEL_REAL.constructor.campos[c]);
      setMetaSel(incompleta.metaId);
      setSemana(incompleta.desde);
      setSel(incompleta.id);
      setMostrarErrores(true);
      setError(PANEL_REAL.constructor.erroresAccion(incompleta.titulo.trim(), incompleta.desde, faltan));
      return false;
    }
    // Si hay un guardado en curso (p. ej. el automático), se espera y se sigue con lo que quede.
    if (enCurso.current) {
      await enCurso.current;
      return guardarAhora(desdeBoton);
    }
    if (!sucio) {
      if (desdeBoton) {
        setError(null);
        setAviso(PANEL_REAL.constructor.alDia);
      }
      return true;
    }
    setOcupado(true);
    setError(null);
    const version = cambios.current;
    const pendiente = d.servidor.guardar(metas, acciones);
    enCurso.current = pendiente.then(
      () => undefined,
      () => undefined,
    );
    try {
      await pendiente;
      setSucio(cambios.current !== version);
      setMostrarErrores(false);
      setAviso(PANEL_REAL.constructor.guardado);
      return true;
    } catch (e) {
      setError(textoError(e));
      return false;
    } finally {
      enCurso.current = null;
      setOcupado(false);
    }
  };

  // Guardado automático (panel real): 1,5 s después del último cambio, si todo está completo.
  // Con algo incompleto no se guarda solo; «Guardar borrador» dice qué falta.
  useEffect(() => {
    if (!real || !sucio || ocupado) return;
    if (!metas.every(metaValida) || !acciones.every(accionValida)) return;
    const t = setTimeout(() => void guardar(), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real, sucio, ocupado, metas, acciones]);

  const delaSemana = acciones.filter((a) => enSemana(a, semana));
  const minutosPorMeta = (id: string) => delaSemana.filter((a) => a.metaId === id).reduce((s, a) => s + a.duracion * a.dias.length, 0);

  return (
    <>
      <div className="pa-constructor__barra">
        {semanas.length <= 4 ? (
          <Segmentado
            leyenda={C.semana.titulo}
            leyendaOculta
            opciones={semanas.map((n) => ({ valor: String(n), texto: C.semana.semanaN(n) }))}
            valor={String(semana)}
            onCambio={(v) => setSemana(Number(v))}
          />
        ) : (
          <CampoSelect id="c-semana-elegida" etiqueta={C.semana.titulo} value={semana} onChange={(e) => setSemana(Number(e.target.value))}>
            {semanas.map((n) => (
              <option key={n} value={n}>
                {C.semana.semanaN(n)}
              </option>
            ))}
          </CampoSelect>
        )}
        <div className="acciones">
          {real && (
            <button type="button" className="boton boton--secundario" aria-disabled={ocupado ? true : undefined} onClick={() => void guardar(true)}>
              {PANEL_REAL.constructor.guardar}
            </button>
          )}
          <button type="button" className="boton boton--secundario" aria-pressed={vista} onClick={() => setVista((v) => !v)}>
            {vista ? C.cerrarVistaPrevia : C.vistaPrevia}
          </button>
          <button
            type="button"
            className="boton boton--primario"
            aria-haspopup="dialog"
            onClick={async () => {
              if (await guardar()) setPublicar(true);
            }}
          >
            {C.publicar.boton}
          </button>
        </div>
      </div>
      {real && (
        <>
          <div role="alert" className="envio__alerta">
            {error && (
              <p className="aviso aviso--error-envio">
                <Icono nombre="info" tamaño={20} className="aviso-icono" />
                <span>{error}</span>
              </p>
            )}
          </div>
          <div role="status" className="pa-constructor__estado">
            {aviso && (
              <p className="aviso">
                <Icono nombre="check" tamaño={20} className="aviso-icono" />
                <span>{aviso}</span>
              </p>
            )}
          </div>
        </>
      )}

      {vista ? (
        <VistaPrevia acciones={delaSemana} metas={metas} semana={semana} mapa={mapa} nombre={nombre} inicio={d.inicio} hoy={d.hoy} />
      ) : (
        <div className="pa-constructor__grilla">
          {/* Metas (izquierda, 280 px) */}
          <section className="pa-constructor__metas" aria-labelledby="c-metas">
            <h2 id="c-metas" className="pa-h2">
              {C.metas.titulo}
            </h2>
            {metas.length ? (
              <ol className="pa-metas">
                {metas.map((m, i) => (
                  <li key={m.id} className={m.id === metaSel ? "pa-metas__item es-elegida" : "pa-metas__item"} data-cat={m.categoria} data-meta-color={colorDe(m.id)}>
                    <button type="button" className="pa-metas__elegir" aria-pressed={m.id === metaSel} onClick={() => elegirMeta(m.id)}>
                      <span className="pa-metas__titulo">{m.titulo || C.metas.tituloCampo}</span>
                      <EtiquetaCat cat={m.categoria} />
                    </button>
                    <div className="pa-metas__orden">
                      <button type="button" className="boton boton--terciario" aria-disabled={i === 0 ? true : undefined} onClick={() => i > 0 && mover(i, -1)}>
                        {C.metas.subir}
                        <span className="sr-only">{`: ${m.titulo}`}</span>
                      </button>
                      <button
                        type="button"
                        className="boton boton--terciario"
                        aria-disabled={i === metas.length - 1 ? true : undefined}
                        onClick={() => i < metas.length - 1 && mover(i, 1)}
                      >
                        {C.metas.bajar}
                        <span className="sr-only">{`: ${m.titulo}`}</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="microcopia">{PANEL_REAL.constructor.sinMetas}</p>
            )}
            {real && (
              <button type="button" className="boton boton--secundario" onClick={nuevaMeta}>
                <Icono nombre="plus" tamaño={20} />
                {PANEL_REAL.constructor.nuevaMeta}
              </button>
            )}
            {meta(metaSel) && (
              <FormMeta
                key={metaSel}
                meta={meta(metaSel)!}
                real={real}
                onCambio={(c) => cambiarMeta(metaSel, c)}
                onQuitar={real ? () => quitarMeta(metaSel) : undefined}
              />
            )}
            <div className="pa-resumen-metas">
              <h3 className="pa-h3">{C.resumen.titulo}</h3>
              <ul>
                {metas.map((m) => (
                  <li key={m.id} data-meta-color={colorDe(m.id)}>
                    <ChipMeta cat={m.categoria} meta={m.titulo} />
                    <span className="microcopia">{C.resumen.porSemana(minutosPorMeta(m.id))}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Semana (centro) */}
          <section className="pa-constructor__semana" aria-labelledby="c-semana">
            <div className="pa-seccion__cabeza">
              <h2 id="c-semana" className="pa-h2">
                {C.semana.semanaN(semana)}
              </h2>
              {mapa.size > 0 && <Etiqueta variante="nota">{C.cruces.aviso(pares)}</Etiqueta>}
            </div>
            {C.dias.map((dia, i) => {
              const del = delaSemana.filter((a) => a.dias.includes(i + 1)).sort(ordenDia);
              const total = del.reduce((s, a) => s + a.duracion, 0);
              return (
                <div key={dia} className="pa-dia" role="group" aria-labelledby={`dia-${i}`}>
                  <div className="pa-dia__cabeza">
                    <h3 id={`dia-${i}`} className="pa-dia__nombre">
                      {dia}
                    </h3>
                    {total > 0 && <span className="pa-dia__total">{C.semana.minutos(total)}</span>}
                  </div>
                  {del.length ? (
                    <ul className="pa-dia__acciones">
                      {del.map((a) => {
                        const con = mapa.get(a.id);
                        const choca = con ? [...con].filter((o) => acciones.find((x) => x.id === o)!.dias.includes(i + 1)) : [];
                        return (
                          <li key={a.id}>
                            <button
                              type="button"
                              className={["pa-bloque", a.id === sel && "es-elegida", choca.length && "con-cruce"].filter(Boolean).join(" ")}
                              data-cat={catDe(a.metaId)}
                              data-meta-color={colorDe(a.metaId)}
                              aria-pressed={a.id === sel}
                              onClick={() => setSel(a.id)}
                            >
                              <span className="pa-bloque__hora">{a.hora ? `${a.hora}–${sumarMinutos(a.hora, a.duracion)}` : C.accion.flexible}</span>
                              <span className="pa-bloque__texto">
                                <span className="pa-bloque__titulo">{a.titulo || C.accion.nueva}</span>
                                <span className="sr-only">{`Meta: ${nombreMeta(a.metaId)}. `}</span>
<EtiquetaCat cat={catDe(a.metaId)} />
                                <span className="microcopia">{duracionTexto(a.duracion)}</span>
                                {choca.map((o) => (
                                  <span key={o} className="pa-bloque__cruce">
                                    <Icono nombre="info" tamaño={16} />
                                    {C.semana.cruce(nombre(o))}
                                  </span>
                                ))}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="microcopia">{C.semana.sinAcciones}</p>
                  )}
                </div>
              );
            })}
            {delaSemana.some((a) => !a.dias.length) && (
              <div className="pa-dia" role="group" aria-labelledby="dia-sin">
                <div className="pa-dia__cabeza">
                  <h3 id="dia-sin" className="pa-dia__nombre">
                    {PANEL_REAL.constructor.sinDias}
                  </h3>
                </div>
                <ul className="pa-dia__acciones">
                  {delaSemana
                    .filter((a) => !a.dias.length)
                    .map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          className={["pa-bloque", a.id === sel && "es-elegida"].filter(Boolean).join(" ")}
                          data-cat={catDe(a.metaId)}
                          data-meta-color={colorDe(a.metaId)}
                          aria-pressed={a.id === sel}
                          onClick={() => setSel(a.id)}
                        >
                          <span className="pa-bloque__hora">{a.hora ?? C.accion.flexible}</span>
                          <span className="pa-bloque__texto">
                            <span className="pa-bloque__titulo">{a.titulo || C.accion.nueva}</span>
                            <span className="sr-only">{`Meta: ${nombreMeta(a.metaId)}. `}</span>
<EtiquetaCat cat={catDe(a.metaId)} />
                            <span className="microcopia">{duracionTexto(a.duracion)}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            )}
            <button type="button" className="boton boton--secundario" aria-disabled={metaSel ? undefined : true} onClick={nueva}>
              <Icono nombre="plus" tamaño={20} />
              {C.accion.nueva}
              {meta(metaSel)?.titulo ? <span className="pa-boton-meta">{` · ${meta(metaSel)!.titulo}`}</span> : null}
            </button>
          </section>

          {/* Acción (derecha) */}
          <section className="pa-constructor__accion" aria-labelledby="c-accion">
            <h2 id="c-accion" className="pa-h2">
              {C.accion.titulo}
            </h2>
            {accion ? (
              <>
                <FormAccion
                  key={accion.id}
                  accion={accion}
                  metas={metas}
                  acciones={acciones}
                  semanas={d.semanas}
                  cercano={d.cercano}
                  mostrarErrores={mostrarErrores}
                  onCambio={cambiarAccion}
                />
                {real && (
                  <button type="button" className="boton boton--terciario pa-boton-izq" onClick={() => quitarAccion(accion.id)}>
                    <Icono nombre="trash-2" tamaño={20} />
                    {PANEL_REAL.constructor.eliminarAccion}
                  </button>
                )}
              </>
            ) : (
              <div className="pa-pila pa-pila--chica">
                <p className="microcopia">{PANEL_REAL.constructor.sinAcciones}</p>
                {meta(metaSel) && (
                  <button type="button" className="boton boton--primario" onClick={nueva}>
                    <Icono nombre="plus" tamaño={20} />
                    {PANEL_REAL.constructor.agregarA(meta(metaSel)!.titulo)}
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      <Publicar abierta={publicar} onCerrar={() => setPublicar(false)} onPublicado={d.alPublicar} d={d} metas={metas} acciones={acciones} cruces={mapa.size > 0} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Formulario de meta: título (hasta 80), «Para qué» (hasta 200), categoría y hitos (hasta 5)

const MAX_HITOS = 5;

function FormMeta({ meta, real, onCambio, onQuitar }: { meta: MetaB; real: boolean; onCambio: (c: Partial<MetaB>) => void; onQuitar?: () => void }) {
  const [hito, setHito] = useState("");
  return (
    <div className="pa-form pa-form--meta" key={meta.id}>
      <CampoTexto id="meta-titulo" etiqueta={C.metas.tituloCampo} maxLength={LIMITES.tituloMeta.max} value={meta.titulo} onChange={(e) => onCambio({ titulo: e.target.value })} />
      <CampoArea
        id="meta-paraque"
        etiqueta={C.metas.paraQue}
        ayuda={C.metas.paraQueAyuda}
        opcional
        max={LIMITES.paraQue.max}
        value={meta.paraQue}
        onChange={(e) => onCambio({ paraQue: e.target.value })}
        rows={3}
      />
      <CampoSelect id="meta-cat" etiqueta={C.metas.categoria} value={meta.categoria} onChange={(e) => onCambio({ categoria: e.target.value as CategoriaId })}>
        {(Object.keys(categorias) as CategoriaId[]).map((c) => (
          <option key={c} value={c}>
            {`${SIMBOLO_CAT[c]} ${categorias[c].nombre}`}
          </option>
        ))}
      </CampoSelect>
      {meta.hitos.length > 0 && (
        <fieldset className="pa-hitos">
          <legend className="campo__etiqueta">{C.metas.hitos}</legend>
          {meta.hitos.map((h, i) => (
            <CasillaAjuste
              key={h.texto}
              id={`hito-${meta.id}-${i}`}
              checked={h.logrado}
              onChange={(v) => onCambio({ hitos: meta.hitos.map((x, j) => (j === i ? { ...x, logrado: v } : x)) })}
            >
              {h.texto}
            </CasillaAjuste>
          ))}
        </fieldset>
      )}
      {real && meta.hitos.length < MAX_HITOS && (
        <div className="pa-pila pa-pila--chica">
          <CampoTexto id="meta-hito" etiqueta={PANEL_REAL.constructor.hito} opcional maxLength={80} value={hito} onChange={(e) => setHito(e.target.value)} />
          <button
            type="button"
            className="boton boton--terciario pa-boton-izq"
            onClick={() => {
              const t = hito.trim();
              if (!t || meta.hitos.some((h) => h.texto === t)) return;
              onCambio({ hitos: [...meta.hitos, { texto: t, logrado: false }] });
              setHito("");
            }}
          >
            <Icono nombre="plus" tamaño={20} />
            {PANEL_REAL.constructor.agregarHito}
          </button>
        </div>
      )}
      {onQuitar && (
        <button type="button" className="boton boton--terciario pa-boton-izq" onClick={onQuitar}>
          <Icono nombre="trash-2" tamaño={20} />
          {PANEL_REAL.constructor.eliminarMeta}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulario de la acción

function FormAccion({
  accion: a,
  metas,
  acciones,
  semanas,
  cercano,
  mostrarErrores,
  onCambio,
}: {
  accion: AccionB;
  metas: MetaB[];
  acciones: AccionB[];
  semanas: number;
  cercano: boolean;
  mostrarErrores?: boolean;
  onCambio: (c: Partial<AccionB>) => void;
}) {
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const tocar = (c: string) => setTocados((s) => new Set(s).add(c));
  const e = errorDe(a);
  const err = (c: keyof typeof e) => (mostrarErrores || tocados.has(c) ? e[c] : null);
  const conFotoSemana = acciones.filter((x) => x.conFoto).length;
  return (
    <form className="pa-form" noValidate onSubmit={(ev) => ev.preventDefault()}>
      <CampoTexto
        id="accion-titulo"
        etiqueta={C.accion.tituloCampo}
        ayuda={C.accion.tituloAyuda}
        maxLength={LIMITES.tituloAccion.max}
        value={a.titulo}
        error={err("titulo")}
        onChange={(ev) => onCambio({ titulo: ev.target.value })}
        onBlur={() => tocar("titulo")}
      />
      <CampoSelect id="accion-meta" etiqueta={C.accion.meta} value={a.metaId} onChange={(ev) => onCambio({ metaId: ev.target.value })}>
        {metas.map((m) => (
          <option key={m.id} value={m.id}>
            {m.titulo}
          </option>
        ))}
      </CampoSelect>
      <Segmentado
        leyenda={C.accion.horario}
        opciones={[
          { valor: "hora", texto: C.accion.conHorario },
          { valor: "flexible", texto: C.accion.flexible },
        ]}
        valor={a.hora ? "hora" : "flexible"}
        onCambio={(v) => onCambio({ hora: v === "hora" ? "09:00" : null })}
      />
      {a.hora && <CampoTexto id="accion-hora" etiqueta={C.accion.hora} type="time" value={a.hora} onChange={(ev) => onCambio({ hora: ev.target.value || "09:00" })} />}
      <CampoTexto
        id="accion-duracion"
        etiqueta={C.accion.duracion}
        ayuda={C.accion.duracionAyuda}
        type="number"
        inputMode="numeric"
        min={LIMITES.duracionAccion.min}
        max={LIMITES.duracionAccion.max}
        step={5}
        value={Number.isFinite(a.duracion) ? a.duracion : ""}
        error={err("duracion")}
        onChange={(ev) => onCambio({ duracion: ev.target.value === "" ? NaN : Number(ev.target.value) })}
        onBlur={() => tocar("duracion")}
      />
      <GrupoOpciones id="accion-dias" leyenda={C.accion.dias} tipo="checkbox" columnas="fila" error={err("dias")}>
        {C.dias.map((dia, i) => (
          <Opcion
            key={dia}
            tipo="checkbox"
            name="accion-dias"
            value={String(i + 1)}
            titulo={dia}
            chica
            checked={a.dias.includes(i + 1)}
            onChange={(ev) => {
              tocar("dias");
              onCambio({ dias: ev.target.checked ? [...a.dias, i + 1].sort() : a.dias.filter((x) => x !== i + 1) });
            }}
          />
        ))}
      </GrupoOpciones>
      <div className="pa-dos pa-dos--siempre">
        <CampoSelect id="accion-desde" etiqueta={C.accion.desdeSemana} value={a.desde} onChange={(ev) => onCambio({ desde: Number(ev.target.value) })}>
          {SEMANAS_MAX.slice(0, semanas).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </CampoSelect>
        <CampoSelect id="accion-durante" etiqueta={C.accion.durante} ayuda={C.accion.duranteAyuda} value={a.durante} onChange={(ev) => onCambio({ durante: Number(ev.target.value) })}>
          {[1, 2, 3, 4].filter((n) => a.desde + n - 1 <= semanas).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </CampoSelect>
      </div>
      <CampoArea
        id="accion-instrucciones"
        etiqueta={C.accion.instrucciones}
        ayuda={C.accion.instruccionesAyuda}
        max={LIMITES.instrucciones.max}
        min={LIMITES.instrucciones.min}
        value={a.instrucciones}
        error={err("instrucciones")}
        onChange={(ev) => onCambio({ instrucciones: ev.target.value })}
        onBlur={() => tocar("instrucciones")}
      />
      <CampoArea
        id="accion-corta"
        etiqueta={C.accion.versionCorta}
        ayuda={C.accion.versionCortaAyuda}
        opcional
        max={LIMITES.versionCorta.max}
        value={a.versionCorta}
        onChange={(ev) => onCambio({ versionCorta: ev.target.value })}
        rows={3}
      />
      {cercano ? (
        <CasillaAjuste id="accion-foto" checked={a.conFoto} onChange={(v) => onCambio({ conFoto: v })} ayuda={conFotoSemana > 1 ? C.accion.fotoAviso : undefined}>
          {C.accion.conFoto}
        </CasillaAjuste>
      ) : (
        <p className="microcopia">{`${C.accion.conFoto}: ${C.accion.conFotoAyuda}`}</p>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Vista previa punteada: las mismas filas de Mi espacio con los datos del borrador

function VistaPrevia({
  acciones,
  metas,
  semana,
  mapa,
  nombre,
  inicio,
  hoy,
}: {
  acciones: AccionB[];
  metas: MetaB[];
  semana: number;
  mapa: Map<string, Set<string>>;
  nombre: (id: string) => string;
  inicio: Iso;
  hoy: Iso;
}) {
  const lunes = sumarDias(inicio, (semana - 1) * 7);
  const catDe = (id: string) => metas.find((m) => m.id === id)?.categoria ?? "proyecto";
  return (
    <section className="pa-punteada pa-vista-previa" aria-labelledby="c-vista">
      <div className="pa-punteada__cabeza">
        <h2 id="c-vista" className="pa-h2">
          {C.vistaPrevia}
        </h2>
        <Etiqueta variante="ejemplo">{T_PANEL.vistaPrevia}</Etiqueta>
      </div>
      <LeyendaMetas metas={metas.map((m) => ({ titulo: m.titulo, categoria: m.categoria }))} />
      {C.dias.map((dia, i) => {
        const fecha: Iso = sumarDias(lunes, i);
        const del = acciones.filter((a) => a.dias.includes(i + 1)).sort(ordenDia);
        return (
          <fieldset key={dia} className="dia">
            <legend>{fechaLarga(fecha)}</legend>
            {del.length ? (
              del.map((a) => {
                const otras = [...(mapa.get(a.id) ?? [])].filter((o) => acciones.some((x) => x.id === o && x.dias.includes(i + 1)));
                return (
                  <FilaAccion
                    key={a.id}
                    titulo={a.titulo || C.accion.nueva}
                    hora={a.hora}
                    duracion={Number.isFinite(a.duracion) ? a.duracion : 0}
                    cat={catDe(a.metaId)}
                    compacta
                    desactivada={fecha > hoy ? C.semana.seMarcaDesde(diaCorto(fecha)) : undefined}
                    nota={otras.length ? C.semana.cruce(nombre(otras[0])) : undefined}
                  />
                );
              })
            ) : (
              <p className="microcopia">{C.semana.sinAcciones}</p>
            )}
          </fieldset>
        );
      })}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Publicar: lista de comprobación

function Publicar({
  abierta,
  onCerrar: cerrar,
  onPublicado,
  d,
  metas,
  acciones,
  cruces: hayCruces,
}: {
  abierta: boolean;
  onCerrar: () => void;
  onPublicado?: () => void;
  d: DatosConstructor;
  metas: MetaB[];
  acciones: AccionB[];
  cruces: boolean;
}) {
  const real = !!d.servidor;
  const manana = sumarDias(d.hoy, 1);
  // En el panel real la base acepta desde hoy (la persona ve el cambio hoy mismo).
  const minimo = real ? d.hoy : manana;
  const [vigencia, setVigencia] = useState<Iso>(manana);
  const [nota, setNota] = useState("");
  const [foco, setFoco] = useState("");
  const [hecho, setHecho] = useState<string | null>(null);
  const [base, setBase] = useState<RevisionBase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [publicado, setPublicado] = useState(false);
  // Tras publicar, el borrador ya no existe: al cerrar, el panel real vuelve a leer la base.
  const onCerrar = () => {
    cerrar();
    if (publicado) onPublicado?.();
  };
  const metasOk = metas.length > 0 && metas.every((m) => acciones.some((a) => a.metaId === m.id));
  const instruccionesOk = acciones.every((a) => a.instrucciones.trim().length >= LIMITES.instrucciones.min);
  const crucesBase = (base?.cruces ?? 0) > 0;
  // Varias acciones a la misma hora se permiten: se avisa y se publican aceptando el cruce.
  const hayAlgunCruce = hayCruces || crucesBase;
  const vigenciaOk = vigencia >= minimo;
  const listo = metasOk && instruccionesOk && vigenciaOk && !hecho;
  const v = d.version;

  // Al abrir (panel real): la base revisa solapamientos y carga del borrador ya guardado.
  const servidor = d.servidor;
  useEffect(() => {
    if (!abierta || !servidor) return;
    let vivo = true;
    setBase(null);
    servidor.revisar().then(
      (r) => vivo && setBase(r),
      () => vivo && setBase(null),
    );
    return () => {
      vivo = false;
    };
  }, [abierta, servidor]);

  const Item = ({ ok, children }: { ok: boolean; children: string }) => (
    <li className={ok ? "pa-check es-ok" : "pa-check"}>
      <span className="pa-check__icono" aria-hidden="true">
        {ok ? <Icono nombre="check" tamaño={16} /> : null}
      </span>
      <span>
        {children}
        <span className="sr-only">{ok ? C.publicar.listo : C.publicar.falta}</span>
      </span>
    </li>
  );

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={C.publicar.titulo} className="pa-hoja-publicar">
      <form
        className="pa-form"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (!listo || ocupado) return;
          if (!servidor) {
            setHecho(C.publicar.simulado);
            return;
          }
          setOcupado(true);
          setError(null);
          try {
            const n = await servidor.publicar({ vigencia, aceptar: hayAlgunCruce, nota: nota.trim(), foco: foco.trim() });
            setHecho(PANEL_REAL.constructor.publicado(n));
            setPublicado(true);
          } catch (x) {
            setError(textoError(x));
          } finally {
            setOcupado(false);
          }
        }}
      >
        <ul className="pa-checks">
          <Item ok>{`${C.publicar.inicio}: ${fechaLarga(d.inicio)}`}</Item>
          <Item ok={metasOk}>{C.publicar.metas}</Item>
          <Item ok={instruccionesOk}>{C.publicar.instrucciones}</Item>
        </ul>
        {base && (
          <div className="pa-pila pa-pila--chica">
            <p className="microcopia">{PANEL_REAL.constructor.crucesBase(base.cruces)}</p>
            {base.carga && <p className="microcopia">{PANEL_REAL.constructor.cargaBase(base.carga.minutos, fechaLarga(base.carga.fecha))}</p>}
          </div>
        )}
        {hayAlgunCruce && (
          <p className="aviso">
            <Icono nombre="info" tamaño={20} className="aviso-icono" />
            <span>{C.cruces.permitidos}</span>
          </p>
        )}
        <CampoTexto
          id="pub-vigencia"
          etiqueta={C.publicar.vigencia}
          ayuda={C.publicar.vigenciaAyuda}
          type="date"
          min={minimo}
          value={vigencia}
          onChange={(e) => setVigencia(e.target.value || manana)}
        />
        {v > 1 ? (
          <CampoArea id="pub-nota" etiqueta={C.publicar.nota} ayuda={C.publicar.notaAyuda} opcional max={LIMITE_NOTA_CAMBIOS} value={nota} onChange={(e) => setNota(e.target.value)} rows={3} />
        ) : (
          <CampoTexto id="pub-foco" etiqueta={C.publicar.foco} maxLength={LIMITES.revisionFoco.max} value={foco} onChange={(e) => setFoco(e.target.value)} />
        )}
        {real && (
          <div role="alert" className="envio__alerta">
            {error && (
              <p className="aviso aviso--error-envio">
                <Icono nombre="info" tamaño={20} className="aviso-icono" />
                <span>{error}</span>
              </p>
            )}
          </div>
        )}
        <button type="submit" className="boton boton--primario" aria-disabled={listo ? undefined : true}>
          {C.publicar.confirmar}
        </button>
        <p role="status" className="microcopia">
          {hecho ?? ""}
        </p>
      </form>
    </Hoja>
  );
}
