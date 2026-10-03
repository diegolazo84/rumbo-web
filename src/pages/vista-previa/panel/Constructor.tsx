// Vista previa · panel, constructor de programa (plataforma 5.6). Es de escritorio (≥1024 px):
// metas a la izquierda (280 px) · semana en el centro (lista por día con columna de horas y suma
// de minutos por día) · panel derecho con el formulario de la acción. En el teléfono muestra
// «El constructor se usa en un computador…» y el programa publicado.
// - Revisión de carga y solapamientos en vivo: la suma por día es informativa y nunca bloquea; un
//   solapamiento marca ambas acciones y bloquea publicar salvo «Sí, son compatibles».
// - «Vista previa» punteada con las filas de Mi espacio; «Publicar» abre la lista de comprobación.
// Todo en memoria: no se guarda ni se publica nada. El borrador es la v2 del programa de Camila
// (ejemplo-app.ts) con dos cambios de ejemplo: «Escribir 3 ideas» pasa del jueves al miércoles y
// «Reservar 2 bloques» queda a las 08:45, cruzada con «Escribir a quién quieres ayudar».
import { useMemo, useState } from "react";
import Etiqueta from "../../../components/Etiqueta";
import { ChipMeta, FilaAccion, Hoja, Icono, LeyendaMetas, Segmentado } from "../../../components/app";
import { Casilla, CampoArea, CampoSelect, CampoTexto, GrupoOpciones, Opcion } from "../../../components/form";
import { LIMITES } from "../../../data/formularios";
import { HOY, ciclo, metas as metasPublicadas, programa } from "../../../data/ejemplo-app";
import { categorias, type CategoriaId } from "../../../data/rumbo";
import { diaCorto, duracionTexto, fechaLarga, sumarDias, sumarMinutos, type Iso } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { Cabeza, CasillaAjuste } from "./comun";
import { participantes } from "./ejemplo";
import { CONSTRUCTOR as C, T_PANEL } from "./textos";

type MetaB = { id: string; titulo: string; paraQue: string; categoria: CategoriaId; hitos: { texto: string; logrado: boolean }[] };
type AccionB = {
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

const LIMITE_NOTA_CAMBIOS = 600; // nota_cambios (6.4)
const camila = participantes[0];
const CERCANO = camila.plan === "cercano";

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

const aMinutos = (h: string) => {
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
};
const enSemana = (a: AccionB, n: number) => n >= a.desde && n < a.desde + a.durante;
const ordenDia = (a: AccionB, b: AccionB) => (a.hora && b.hora ? a.hora.localeCompare(b.hora) : a.hora ? -1 : b.hora ? 1 : a.titulo.localeCompare(b.titulo));

// Solapamientos: dos acciones con horario que se cruzan el mismo día de la misma semana.
function cruces(acciones: AccionB[]) {
  const mapa = new Map<string, Set<string>>();
  for (let i = 0; i < acciones.length; i++) {
    for (let j = i + 1; j < acciones.length; j++) {
      const a = acciones[i];
      const b = acciones[j];
      if (!a.hora || !b.hora) continue;
      const mismoDia = a.dias.some((d) => b.dias.includes(d));
      const mismaSemana = [1, 2, 3, 4].some((n) => enSemana(a, n) && enSemana(b, n));
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

export default function Constructor(_: PropsPantalla) {
  return (
    <div className="pa-pantalla pa-constructor">
      <Cabeza
        ojo={C.ojo}
        titulo={C.titulo(camila.nombre)}
        antes={
          // En el teléfono se ve el programa publicado; el borrador solo existe en el editor.
          <div className="pa-etiquetas">
            <Etiqueta variante="activo" className="pa-constructor__solo-movil">
              {C.publicado(programa.version)}
            </Etiqueta>
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
        <ProgramaPublicado />
      </div>
      <div className="pa-constructor__escritorio">
        <Editor />
      </div>
    </div>
  );
}

// Programa publicado (lo que se ve en el teléfono): metas y sus acciones, en solo lectura.
function ProgramaPublicado() {
  return (
    <div className="pa-pila">
      {metasPublicadas.map((m) => (
        <section key={m.id} className="tarjeta meta-tarjeta pa-tarjeta" data-cat={m.categoria} aria-labelledby={`pub-${m.id}`}>
          <h2 id={`pub-${m.id}`} className="pa-h3">
            {m.titulo}
          </h2>
          <ul className="pa-prog-acciones">
            {programa.acciones
              .filter((a) => a.metaId === m.id)
              .map((a) => (
                <li key={a.id} data-cat={m.categoria}>
                  <span className="pa-prog-acciones__titulo">{a.titulo}</span>
                  <span className="microcopia">
                    {a.dias.map((d) => C.dias[d - 1]).join(", ")} · {a.hora ?? C.accion.flexible} · {duracionTexto(a.duracion)}
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

function Editor() {
  const [metas, setMetas] = useState<MetaB[]>(metasIniciales);
  const [acciones, setAcciones] = useState<AccionB[]>(accionesIniciales);
  const [metaSel, setMetaSel] = useState(metas[0].id);
  const [sel, setSel] = useState<string>("a4");
  const [semana, setSemana] = useState(2);
  const [vista, setVista] = useState(false);
  const [publicar, setPublicar] = useState(false);
  const mapa = useMemo(() => cruces(acciones), [acciones]);
  const pares = [...mapa.values()].reduce((s, x) => s + x.size, 0) / 2;
  const accion = acciones.find((a) => a.id === sel);
  const nombre = (id: string) => acciones.find((a) => a.id === id)?.titulo ?? "";
  const meta = (id: string) => metas.find((m) => m.id === id)!;

  const cambiarAccion = (cambio: Partial<AccionB>) => setAcciones((l) => l.map((a) => (a.id === sel ? { ...a, ...cambio } : a)));
  const cambiarMeta = (id: string, cambio: Partial<MetaB>) => setMetas((l) => l.map((m) => (m.id === id ? { ...m, ...cambio } : m)));
  const mover = (i: number, d: -1 | 1) =>
    setMetas((l) => {
      const n = [...l];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });
  const nueva = () => {
    const id = `n${acciones.length + 1}`;
    setAcciones((l) => [
      ...l,
      { id, metaId: metaSel, titulo: "", hora: null, duracion: 10, dias: [], desde: semana, durante: 1, instrucciones: "", versionCorta: "", conFoto: false },
    ]);
    setSel(id);
  };

  const delaSemana = acciones.filter((a) => enSemana(a, semana));
  const minutosPorMeta = (id: string) => delaSemana.filter((a) => a.metaId === id).reduce((s, a) => s + a.duracion * a.dias.length, 0);

  return (
    <>
      <div className="pa-constructor__barra">
        <Segmentado
          leyenda={C.semana.titulo}
          leyendaOculta
          opciones={[1, 2, 3, 4].map((n) => ({ valor: String(n), texto: C.semana.semanaN(n) }))}
          valor={String(semana)}
          onCambio={(v) => setSemana(Number(v))}
        />
        <div className="acciones">
          <button type="button" className="boton boton--secundario" aria-pressed={vista} onClick={() => setVista((v) => !v)}>
            {vista ? C.cerrarVistaPrevia : C.vistaPrevia}
          </button>
          <button type="button" className="boton boton--primario" aria-haspopup="dialog" onClick={() => setPublicar(true)}>
            {C.publicar.boton}
          </button>
        </div>
      </div>

      {vista ? (
        <VistaPrevia acciones={delaSemana} metas={metas} semana={semana} mapa={mapa} nombre={nombre} />
      ) : (
        <div className="pa-constructor__grilla">
          {/* Metas (izquierda, 280 px) */}
          <section className="pa-constructor__metas" aria-labelledby="c-metas">
            <h2 id="c-metas" className="pa-h2">
              {C.metas.titulo}
            </h2>
            <ol className="pa-metas">
              {metas.map((m, i) => (
                <li key={m.id} className={m.id === metaSel ? "pa-metas__item es-elegida" : "pa-metas__item"} data-cat={m.categoria}>
                  <button type="button" className="pa-metas__elegir" aria-pressed={m.id === metaSel} onClick={() => setMetaSel(m.id)}>
                    <span className="pa-metas__titulo">{m.titulo || C.metas.tituloCampo}</span>
                    <span className="pa-metas__cat">{categorias[m.categoria].nombre}</span>
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
            <FormMeta meta={meta(metaSel)} onCambio={(c) => cambiarMeta(metaSel, c)} />
            <div className="pa-resumen-metas">
              <h3 className="pa-h3">{C.resumen.titulo}</h3>
              <ul>
                {metas.map((m) => (
                  <li key={m.id}>
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
                              data-cat={meta(a.metaId).categoria}
                              aria-pressed={a.id === sel}
                              onClick={() => setSel(a.id)}
                            >
                              <span className="pa-bloque__hora">{a.hora ? `${a.hora}–${sumarMinutos(a.hora, a.duracion)}` : C.accion.flexible}</span>
                              <span className="pa-bloque__texto">
                                <span className="pa-bloque__titulo">{a.titulo || C.accion.nueva}</span>
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
            <button type="button" className="boton boton--secundario" onClick={nueva}>
              <Icono nombre="plus" tamaño={20} />
              {C.accion.nueva}
            </button>
          </section>

          {/* Acción (derecha) */}
          <section className="pa-constructor__accion" aria-labelledby="c-accion">
            <h2 id="c-accion" className="pa-h2">
              {C.accion.titulo}
            </h2>
            {accion && <FormAccion key={accion.id} accion={accion} metas={metas} acciones={acciones} onCambio={cambiarAccion} />}
          </section>
        </div>
      )}

      <Publicar abierta={publicar} onCerrar={() => setPublicar(false)} metas={metas} acciones={acciones} cruces={mapa.size > 0} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Formulario de meta: título (hasta 80), «Para qué» (hasta 200), categoría y hitos (hasta 5)

function FormMeta({ meta, onCambio }: { meta: MetaB; onCambio: (c: Partial<MetaB>) => void }) {
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
            {categorias[c].nombre}
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulario de la acción

function FormAccion({ accion: a, metas, acciones, onCambio }: { accion: AccionB; metas: MetaB[]; acciones: AccionB[]; onCambio: (c: Partial<AccionB>) => void }) {
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const tocar = (c: string) => setTocados((s) => new Set(s).add(c));
  const e = errorDe(a);
  const err = (c: keyof typeof e) => (tocados.has(c) ? e[c] : null);
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
        {C.dias.map((d, i) => (
          <Opcion
            key={d}
            tipo="checkbox"
            name="accion-dias"
            value={String(i + 1)}
            titulo={d}
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
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </CampoSelect>
        <CampoSelect id="accion-durante" etiqueta={C.accion.durante} ayuda={C.accion.duranteAyuda} value={a.durante} onChange={(ev) => onCambio({ durante: Number(ev.target.value) })}>
          {[1, 2, 3, 4].filter((n) => a.desde + n - 1 <= ciclo.semanas).map((n) => (
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
      {CERCANO ? (
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
}: {
  acciones: AccionB[];
  metas: MetaB[];
  semana: number;
  mapa: Map<string, Set<string>>;
  nombre: (id: string) => string;
}) {
  const lunes = sumarDias(ciclo.inicio, (semana - 1) * 7);
  const metaDe = (id: string) => metas.find((m) => m.id === id)!;
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
                    cat={metaDe(a.metaId).categoria}
                    compacta
                    desactivada={fecha > HOY ? C.semana.seMarcaDesde(diaCorto(fecha)) : undefined}
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
  onCerrar,
  metas,
  acciones,
  cruces: hayCruces,
}: {
  abierta: boolean;
  onCerrar: () => void;
  metas: MetaB[];
  acciones: AccionB[];
  cruces: boolean;
}) {
  const manana = sumarDias(HOY, 1);
  const [vigencia, setVigencia] = useState<Iso>(manana);
  const [nota, setNota] = useState("");
  const [compatibles, setCompatibles] = useState(false);
  const [hecho, setHecho] = useState(false);
  const metasOk = metas.every((m) => acciones.some((a) => a.metaId === m.id));
  const instruccionesOk = acciones.every((a) => a.instrucciones.trim().length >= LIMITES.instrucciones.min);
  const crucesOk = !hayCruces || compatibles;
  const vigenciaOk = vigencia >= manana;
  const listo = metasOk && instruccionesOk && crucesOk && vigenciaOk;
  const v = programa.version + 1;

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
        onSubmit={(e) => {
          e.preventDefault();
          if (listo) setHecho(true);
        }}
      >
        <ul className="pa-checks">
          <Item ok>{`${C.publicar.inicio}: ${fechaLarga(ciclo.inicio)}`}</Item>
          <Item ok={metasOk}>{C.publicar.metas}</Item>
          <Item ok={instruccionesOk}>{C.publicar.instrucciones}</Item>
          <Item ok={crucesOk}>{C.publicar.cruces}</Item>
        </ul>
        {hayCruces && (
          <Casilla id="pub-compatibles" checked={compatibles} onChange={(e) => setCompatibles(e.target.checked)}>
            {C.cruces.compatibles}
          </Casilla>
        )}
        <CampoTexto
          id="pub-vigencia"
          etiqueta={C.publicar.vigencia}
          ayuda={C.publicar.vigenciaAyuda}
          type="date"
          min={manana}
          value={vigencia}
          onChange={(e) => setVigencia(e.target.value || manana)}
        />
        {v > 1 ? (
          <CampoArea id="pub-nota" etiqueta={C.publicar.nota} ayuda={C.publicar.notaAyuda} opcional max={LIMITE_NOTA_CAMBIOS} value={nota} onChange={(e) => setNota(e.target.value)} rows={3} />
        ) : (
          <CampoTexto id="pub-foco" etiqueta={C.publicar.foco} maxLength={LIMITES.revisionFoco.max} />
        )}
        <button type="submit" className="boton boton--primario" aria-disabled={listo ? undefined : true}>
          {C.publicar.confirmar}
        </button>
        <p role="status" className="microcopia">
          {hecho ? C.publicar.simulado : ""}
        </p>
      </form>
    </Hoja>
  );
}
