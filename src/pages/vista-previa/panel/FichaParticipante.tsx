// Vista previa · panel, ficha de participante (plataforma 5.5): encabezado con nombre, plan
// (etiqueta --nota con el rótulo), «Semana 2 de 4», próxima revisión y estado; pestañas
// Programa · Semana · Revisiones · Ajustes · Fotos · Datos; y las acciones del ciclo (pausar,
// reanudar, cerrar, nuevo ciclo, extender). Todo simulado.
// Participante y pestaña salen de ?id= y ?pestana= (se leen tras hidratar); sin id, Camila.
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import Etiqueta from "../../../components/Etiqueta";
import { ChipMeta, Hoja, Icono } from "../../../components/app";
import { CampoSelect, CampoTexto, GrupoOpciones, Opcion } from "../../../components/form";
import { AJUSTE, REGISTRO_SEMANAL } from "../../../data/formularios";
import {
  HOY,
  ciclo,
  cuentaComoHecha,
  lunesDeSemana,
  metaPorId,
  metas,
  ocurrencias,
  ocurrenciasDel,
  programa,
  progreso,
  registrosSemanales,
  revisiones,
  solicitudesAjuste,
} from "../../../data/ejemplo-app";
import { DIAS, diaCorto, duracionTexto, fechaLarga, mayuscula, semanaDesde, type Iso } from "../../../lib/fechas";
import { Cabeza, Datos, Desplegable, R, Seccion, descargarJson, planDe, useParametro, usePanel } from "./comun";
import { textoError } from "./FichaSolicitud";
import { ajustes, evidencias, participantes, semanaMartin, type FichaParticipante as Ficha } from "./ejemplo";
import { EtiquetaCiclo, semanaTexto } from "./Participantes";
import { AJUSTES, CONSTRUCTOR, FICHA_PARTICIPANTE as F, FOTOS, PANEL_REAL, REVISION } from "./textos";

export type Pestana = (typeof F.pestanas)[number]["valor"];
export const PESTANAS = F.pestanas.map((p) => p.valor) as Pestana[];

export default function FichaParticipante() {
  const id = useParametro("id");
  const pestana = useParametro("pestana");
  const p = participantes.find((x) => x.id === id) ?? participantes[0];
  return <Contenido key={p.id} p={p} inicial={PESTANAS.includes(pestana as Pestana) ? (pestana as Pestana) : "programa"} />;
}

function Contenido({ p, inicial }: { p: Ficha; inicial: Pestana }) {
  const [pestana, setPestana] = useState<Pestana>(inicial);
  const [estadoCiclo, setEstadoCiclo] = useState(p.estadoCiclo);
  useEffect(() => setPestana(inicial), [inicial]);
  const plan = planDe(p.plan);

  return (
    <div className="pa-pantalla">
      <Cabeza ojo={F.ojo} titulo={p.nombre}>
        <div className="pa-etiquetas">
          <span className="pa-plan">{plan.nombre}</span>
          <Etiqueta variante="nota">{plan.rotulo}</Etiqueta>
          <EtiquetaCiclo estado={estadoCiclo} />
        </div>
        <p className="pa-cabeza__linea">
          {semanaTexto(p)} · {F.proxima(diaCorto(p.proximaRevision))}
          {p.horaVideollamada ? `, ${p.horaVideollamada}` : ""}
        </p>
      </Cabeza>

      <Pestanas actual={pestana} onCambio={setPestana} />
      <div role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`pestana-${pestana}`} tabIndex={0} className="pa-pestana">
        {pestana === "programa" && <Programa p={p} />}
        {pestana === "semana" && <Semana p={p} />}
        {pestana === "revisiones" && <Revisiones p={p} />}
        {pestana === "ajustes" && <Ajustes p={p} />}
        {pestana === "fotos" && <Fotos p={p} />}
        {pestana === "datos" && <DatosPersona p={p} />}
      </div>

      <AccionesCiclo estado={estadoCiclo} onCambio={setEstadoCiclo} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pestañas accesibles (flechas, Inicio y Fin; foco itinerante)

export function Pestanas({ actual, onCambio }: { actual: Pestana; onCambio: (p: Pestana) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const mover = (e: KeyboardEvent, i: number) => {
    const n = PESTANAS.length;
    const destino =
      e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (destino < 0) return;
    e.preventDefault();
    onCambio(PESTANAS[destino]);
    refs.current[destino]?.focus();
  };
  return (
    <div role="tablist" aria-label={F.ojo} className="pa-pestanas">
      {F.pestanas.map((t, i) => (
        <button
          key={t.valor}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          id={`pestana-${t.valor}`}
          aria-selected={actual === t.valor}
          aria-controls={actual === t.valor ? `panel-${t.valor}` : undefined}
          tabIndex={actual === t.valor ? 0 : -1}
          className="pa-pestanas__tab"
          onClick={() => onCambio(t.valor)}
          onKeyDown={(e) => mover(e, i)}
        >
          {t.texto}
        </button>
      ))}
    </div>
  );
}

const esCamila = (p: Ficha) => p.id === "p-1";

// ---------------------------------------------------------------------------
// Programa: publicada (lleno), borrador (contorno), historial y botones

const textoDias = (dias: number[]) => (dias.length === 7 ? F.programa.todosLosDias : dias.map((d) => DIAS[d - 1]).join(", "));

function Programa({ p }: { p: Ficha }) {
  return (
    <div className="pa-pila">
      {esCamila(p) && (
        <section className="tarjeta pa-tarjeta" aria-labelledby="prog-publicada">
          <div className="pa-seccion__cabeza">
            <h2 id="prog-publicada" className="pa-h2">
              {F.programa.version(programa.version)}
            </h2>
            <Etiqueta variante="activo">{F.programa.publicadaEtiqueta}</Etiqueta>
          </div>
          {metas.map((m) => (
            <div key={m.id} className="pa-prog-meta">
              <ChipMeta cat={m.categoria} meta={m.titulo} />
              <ul className="pa-prog-acciones">
                {programa.acciones
                  .filter((a) => a.metaId === m.id)
                  .map((a) => (
                    <li key={a.id} data-cat={m.categoria}>
                      <span className="pa-prog-acciones__titulo">{a.titulo}</span>
                      <span className="microcopia">
                        {textoDias(a.dias)} · {a.hora ?? CONSTRUCTOR.accion.flexible} · {duracionTexto(a.duracion)}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>
      )}
      {!esCamila(p) && p.estadoCiclo === "en_curso" && (
        <section className="tarjeta pa-tarjeta" aria-labelledby="prog-publicada">
          <div className="pa-seccion__cabeza">
            <h2 id="prog-publicada" className="pa-h2">
              {F.programa.version(1)}
            </h2>
          </div>
          {semanaMartin.porMeta.map((m) => (
            <ChipMeta key={m.titulo} cat={m.categoria} meta={m.titulo} />
          ))}
        </section>
      )}
      {(esCamila(p) || p.estadoCiclo === "preparacion") && (
        <section className="tarjeta tarjeta--pronto pa-tarjeta" aria-labelledby="prog-borrador">
          <div className="pa-seccion__cabeza">
            <h2 id="prog-borrador" className="pa-h2">
              {F.programa.version(esCamila(p) ? programa.version + 1 : 1)}
            </h2>
            <Etiqueta variante="nota">{F.programa.borrador}</Etiqueta>
          </div>
          <div className="acciones">
            <Link to={R.constructor} className="boton boton--secundario">
              {F.programa.editar}
            </Link>
          </div>
        </section>
      )}
      {esCamila(p) && (
        <Seccion titulo={F.programa.historial}>
          <ol className="pa-lista-simple">
            <li>{F.programa.publicadaEl(programa.version, fechaLarga(programa.publicadoEl))}</li>
          </ol>
        </Seccion>
      )}
      <div className="acciones">
        {!(esCamila(p) || p.estadoCiclo === "preparacion") && (
          <Link to={R.constructor} className="boton boton--secundario">
            {F.programa.editar}
          </Link>
        )}
        <Link to={R.verComo} className="boton boton--terciario pa-boton-izq">
          {F.programa.verComo(p.nombre)}
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Semana: la misma vista Semana de Mi espacio, en solo lectura

const ESTADO_FILA: Record<string, string> = {
  hecha: F.semana.hecha,
  aprobada: F.semana.hecha,
  corta: F.semana.corta,
  dejada: F.semana.dejada,
  revision: F.semana.revision,
};

export function SemanaLectura({ semana = 2, hoy = HOY }: { semana?: number; hoy?: Iso }) {
  const dias = semanaDesde(lunesDeSemana(semana));
  const hastaHoy = ocurrencias.filter((o) => o.semana === semana && o.vigente && o.fecha <= hoy);
  const hechas = hastaHoy.filter((o) => cuentaComoHecha(o.registro)).length;
  return (
    <SemanaLista
      dias={dias}
      hoy={hoy}
      filas={(fecha) =>
        ocurrenciasDel(fecha).map((o) => ({ id: o.id, hora: o.hora, titulo: o.titulo, duracion: o.duracion, meta: metaPorId(o.metaId).corto, categoria: o.categoria, fecha: o.fecha, registro: o.registro }))
      }
      completo={(fecha) => {
        const dia = progreso.dias.find((d) => d.fecha === fecha);
        return dia?.estado === "completo" ? dia.creditos : null;
      }}
      hechas={hechas}
      deHoy={hastaHoy.length}
    />
  );
}

// Fila de la semana en solo lectura (vista previa y panel real).
export type FilaSemana = {
  id: string;
  hora: string | null;
  titulo: string;
  duracion: number;
  meta: string;
  categoria: string;
  fecha: Iso;
  registro: string | null; // hecha, aprobada, corta, dejada, revision
};

export function SemanaLista({
  dias,
  hoy,
  filas,
  completo,
  hechas,
  deHoy,
}: {
  dias: Iso[];
  hoy: Iso;
  filas: (fecha: Iso) => FilaSemana[];
  completo: (fecha: Iso) => number | null; // créditos del día completo
  hechas: number;
  deHoy: number;
}) {
  return (
    <div className="pa-semana">
      {dias.map((fecha) => {
        const del = filas(fecha);
        const creditos = completo(fecha);
        return (
          <fieldset key={fecha} className="dia pa-semana__dia">
            <legend>
              <span>{diaCorto(fecha)}</span>
              {creditos !== null && <Etiqueta variante="activo">{F.semana.diaCompleto(creditos)}</Etiqueta>}
            </legend>
            {del.length ? (
              <ul className="pa-sem-filas">
                {del.map((o) => (
                  <li key={o.id} className="pa-sem-fila" data-cat={o.categoria}>
                    <span className="pa-sem-fila__hora">{o.hora ?? CONSTRUCTOR.accion.flexible}</span>
                    <span className="pa-sem-fila__texto">
                      <span className="pa-sem-fila__titulo">{o.titulo}</span>
                      <span className="microcopia">
                        {duracionTexto(o.duracion)} · {o.meta}
                        {o.fecha <= hoy && ` · ${o.registro ? ESTADO_FILA[o.registro] ?? F.semana.sinRegistro : F.semana.sinRegistro}`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="microcopia">{F.semana.sinAcciones}</p>
            )}
          </fieldset>
        );
      })}
      <p className="calendario-pie">{F.semana.pie(hechas, deHoy)}</p>
    </div>
  );
}

function ResumenPorMeta({ filas }: { filas: { titulo: string; categoria: Parameters<typeof ChipMeta>[0]["cat"]; programadas: number; hechas: number }[] }) {
  return (
    <ul className="pa-por-meta">
      {filas.map((m) => (
        <li key={m.titulo}>
          <ChipMeta cat={m.categoria} meta={m.titulo} />
          <span>{REVISION.izquierda.porMeta(m.hechas, m.programadas)}</span>
        </li>
      ))}
    </ul>
  );
}
export { ResumenPorMeta };

function Semana({ p }: { p: Ficha }) {
  if (esCamila(p)) return <SemanaLectura />;
  if (p.estadoCiclo === "preparacion") return <p className="pa-vacio">{F.semana.noEmpieza}</p>;
  return (
    <div className="pa-pila">
      <ResumenPorMeta filas={semanaMartin.porMeta} />
      <p className="microcopia">{REVISION.izquierda.diasCompletos(semanaMartin.diasCompletos)}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revisiones: por semana, registro de la persona y revisión publicada

const CARGA: Record<string, string> = Object.fromEntries(REGISTRO_SEMANAL.carga.opciones.map((o) => [o.valor, o.texto]));

export function RegistroLectura({ carga, funciono, costo, cambiar }: { carga: string | null; funciono: string; costo: string; cambiar: string }) {
  return (
    <Datos
      filas={[
        carga && [REGISTRO_SEMANAL.carga.leyenda, CARGA[carga] ?? carga],
        funciono && [REGISTRO_SEMANAL.funciono.etiqueta, funciono],
        costo && [REGISTRO_SEMANAL.costo.etiqueta, costo],
        cambiar && [REGISTRO_SEMANAL.cambiar.etiqueta, cambiar],
      ]}
      className="pa-datos--apilada"
    />
  );
}

function Revisiones({ p }: { p: Ficha }) {
  const semanas = esCamila(p) ? [1, 2] : p.semana ? [p.semana] : [];
  if (!semanas.length) return <p className="pa-vacio">{F.revisiones.sinRevision}</p>;
  return (
    <div className="pa-pila">
      {semanas.map((n) => {
        const reg = esCamila(p) ? registrosSemanales.find((r) => r.semana === n) : { ...semanaMartin.registro, carga: "pesada" };
        const rev = esCamila(p) ? revisiones.find((r) => r.semana === n && r.publicadaEl) : undefined;
        return (
          <Seccion key={n} titulo={F.revisiones.semana(n)}>
            <div className="pa-dos">
              <div className="tarjeta pa-tarjeta">
                <h3 className="pa-h3">{F.revisiones.registro}</h3>
                {reg ? <RegistroLectura {...reg} /> : <p className="microcopia">{F.revisiones.sinRegistro}</p>}
              </div>
              <div className="tarjeta pa-tarjeta">
                <h3 className="pa-h3">{F.revisiones.revision}</h3>
                {rev ? (
                  <Datos
                    className="pa-datos--apilada"
                    filas={[
                      [REVISION.funciono.etiqueta, rev.funciono],
                      [REVISION.ajustamos.etiqueta, rev.ajustamos],
                      [REVISION.foco.etiqueta, <span className="voz">{rev.foco}</span>],
                    ]}
                  />
                ) : (
                  <p className="microcopia">{F.revisiones.sinRevision}</p>
                )}
              </div>
            </div>
          </Seccion>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ajustes: solicitudes de ajuste del ciclo y reordenamientos usados

const TIPO_AJUSTE: Record<string, string> = Object.fromEntries(AJUSTE.tipo.opciones.map((o) => [o.valor, o.texto]));

function Ajustes({ p }: { p: Ficha }) {
  const pendientes = ajustes.filter((a) => a.participanteId === p.id);
  const antiguas = esCamila(p) ? solicitudesAjuste : [];
  return (
    <div className="pa-pila">
      {p.plan === "cercano" && <p>{F.ajustes.reordenamientos(p.reordenamientosUsados ?? 0, 2)}</p>}
      {pendientes.length + antiguas.length === 0 && <p className="pa-vacio">{REVISION.izquierda.sinAjustes}</p>}
      <ul className="pa-filas">
        {pendientes.map((a) => (
          <li key={a.id} className="tarjeta pa-fila">
            <div className="pa-fila__cabeza">
              <h3 className="pa-h3">{TIPO_AJUSTE[a.tipo]}</h3>
              <Etiqueta variante={AJUSTES.estados[a.estado].variante}>{AJUSTES.estados[a.estado].texto}</Etiqueta>
            </div>
            <p>{a.detalle}</p>
            <p className="microcopia">{AJUSTES.enviadaEl(diaCorto(a.enviadaEl))}</p>
            <Link to={R.ajustes} className="enlace-flecha">
              {AJUSTES.responder}
              <Icono nombre="arrow-right" tamaño={16} />
            </Link>
          </li>
        ))}
        {antiguas.map((a) => (
          <li key={a.id} className="tarjeta pa-fila">
            <div className="pa-fila__cabeza">
              <h3 className="pa-h3">{TIPO_AJUSTE[a.tipo]}</h3>
              <Etiqueta variante={AJUSTES.estados[a.estado].variante}>{AJUSTES.estados[a.estado].texto}</Etiqueta>
            </div>
            <p>{a.detalle}</p>
            {a.respuesta && <p className="pa-respuesta">{a.respuesta}</p>}
            <p className="microcopia">{AJUSTES.enviadaEl(diaCorto(a.enviadaEl))}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fotos: evidencias del ciclo con su estado

function Fotos({ p }: { p: Ficha }) {
  const lista = evidencias.filter((e) => e.nombre === p.nombre);
  if (!lista.length) return <p className="pa-vacio">{F.fotos.vacio}</p>;
  return (
    <ul className="pa-filas">
      {lista.map((e) => (
        <li key={e.id} className="tarjeta pa-fila">
          <div className="pa-fila__cabeza">
            <h3 className="pa-h3">{e.accion}</h3>
            <Etiqueta variante="nota">{F.semana.revision}</Etiqueta>
          </div>
          <p className="microcopia">{e.foto ? mayuscula(fechaLarga(e.fecha)) : `${FOTOS.sinFoto} · ${fechaLarga(e.fecha)}`}</p>
          <Link to={R.revisar} className="enlace-flecha">
            {FOTOS.aprobar} / {FOTOS.noAprobar}
            <Icono nombre="arrow-right" tamaño={16} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Datos: correo, zona horaria (editable solo aquí), ciclos, exportar, peticiones, eliminar

export const ZONAS = ["America/Santiago", "America/Argentina/Buenos_Aires", "America/Montevideo", "America/Lima", "America/Bogota", "America/Mexico_City", "Europe/Madrid"];

function DatosPersona({ p }: { p: Ficha }) {
  const [zona, setZona] = useState(p.zona);
  const [eliminar, setEliminar] = useState(false);
  const exportar = () =>
    descargarJson(`rumbo-ejemplo-${p.nombre.toLowerCase()}.json`, {
      participante: { nombre: p.nombre, correo: p.correo, zonaHoraria: zona },
      ciclos: [{ numero: 1, inicio: p.inicio }],
    });
  return (
    <div className="pa-pila">
      <Datos
        filas={[
          [F.datos.correo, <span className="pa-largo">{p.correo}</span>],
          [F.datos.ciclos, F.datos.ciclo(fechaLarga(p.inicio), esCamila(p) ? fechaLarga(ciclo.fin) : null)],
          [F.datos.peticiones, F.datos.sinPeticiones],
        ]}
      />
      <CampoSelect id="zona" etiqueta={F.datos.zona} ayuda={F.datos.zonaAyuda} value={zona} onChange={(e) => setZona(e.target.value)}>
        {ZONAS.map((z) => (
          <option key={z} value={z}>
            {z}
          </option>
        ))}
      </CampoSelect>
      <div className="acciones">
        <button type="button" className="boton boton--secundario" onClick={exportar}>
          <Icono nombre="download" tamaño={20} />
          {F.datos.exportar}
        </button>
        <button type="button" className="boton boton--terciario" aria-haspopup="dialog" onClick={() => setEliminar(true)}>
          <Icono nombre="trash-2" tamaño={20} />
          {F.datos.eliminar}
        </button>
      </div>
      <Hoja abierta={eliminar} onCerrar={() => setEliminar(false)} titulo={F.datos.eliminar}>
        <p>{F.datos.eliminarAyuda}</p>
        <ol className="pa-pasos">
          {F.datos.eliminarPasos.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
        <div className="acciones">
          <button type="button" className="boton boton--secundario" onClick={() => setEliminar(false)}>
            {F.datos.cancelar}
          </button>
        </div>
      </Hoja>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Acciones del ciclo: pausar (motivo, desde, hasta opcional), reanudar, cerrar, nuevo, extender

// Panel real: escrituras del ciclo (pausar_ciclo, reanudar_ciclo y la fecha de fin o el estado
// del ciclo). Sin servidor (vista previa), solo cambia la etiqueta.
export type ServidorCiclo = {
  fin: Iso;
  pausar: (motivo: string, desde: Iso, hasta: Iso | null) => Promise<void>;
  reanudar: () => Promise<void>;
  extender: (fin: Iso) => Promise<void>;
  cerrar: () => Promise<void>;
};

export function AccionesCiclo({
  estado,
  onCambio,
  servidor,
}: {
  estado: Ficha["estadoCiclo"];
  onCambio: (e: Ficha["estadoCiclo"]) => void;
  servidor?: ServidorCiclo;
}) {
  const { R, hoy } = usePanel();
  const [motivo, setMotivo] = useState("pedida");
  const [desde, setDesde] = useState<Iso>(hoy);
  const [hasta, setHasta] = useState("");
  const finActual = servidor?.fin ?? ciclo.fin;
  const [fin, setFin] = useState<Iso>(finActual);
  const [cerrar, setCerrar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Vista previa: cambia la etiqueta. Panel real: escribe y la ficha se vuelve a leer.
  const hacer = async (nuevo: Ficha["estadoCiclo"], fn?: () => Promise<void>) => {
    setError(null);
    if (servidor && fn) {
      try {
        await fn();
      } catch (e) {
        setError(textoError(e));
        return;
      }
    }
    onCambio(nuevo);
  };
  return (
    <Seccion titulo={F.ciclo.titulo} className="pa-ciclo">
      {servidor && (
        <div role="alert" className="envio__alerta">
          {error && (
            <p className="aviso aviso--error-envio">
              <Icono nombre="info" tamaño={20} className="aviso-icono" />
              <span>{error}</span>
            </p>
          )}
        </div>
      )}
      <div className="pa-ciclo__botones">
        {estado === "pausa" ? (
          <button type="button" className="boton boton--secundario" onClick={() => void hacer("en_curso", servidor?.reanudar)}>
            {F.ciclo.reanudar}
          </button>
        ) : (
          <Desplegable boton={F.ciclo.pausar}>
            <form
              className="pa-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void hacer("pausa", servidor ? () => servidor.pausar(motivo, desde, hasta || null) : undefined);
              }}
            >
              <GrupoOpciones id="pausa-motivo" leyenda={F.ciclo.motivo} columnas="fila">
                {F.ciclo.motivos.map((m) => (
                  <Opcion key={m.valor} name="pausa-motivo" value={m.valor} titulo={m.texto} chica checked={motivo === m.valor} onChange={() => setMotivo(m.valor)} />
                ))}
              </GrupoOpciones>
              <CampoTexto id="pausa-desde" etiqueta={F.ciclo.desde} type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
              <CampoTexto id="pausa-hasta" etiqueta={F.ciclo.hasta} opcional type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
              <button type="submit" className="boton boton--primario">
                {F.ciclo.pausar}
              </button>
            </form>
          </Desplegable>
        )}
        <Desplegable boton={F.ciclo.extender}>
          <form
            className="pa-form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (servidor && fin > finActual) void hacer(estado, () => servidor.extender(fin));
            }}
          >
            <CampoTexto id="ciclo-fin" etiqueta={F.ciclo.fin} type="date" value={fin} min={finActual} onChange={(e) => setFin(e.target.value)} />
            <button type="submit" className="boton boton--primario">
              {F.ciclo.extender}
            </button>
          </form>
        </Desplegable>
        <button
          type="button"
          className="boton boton--secundario"
          aria-haspopup={servidor ? "dialog" : undefined}
          onClick={() => (servidor ? setCerrar(true) : onCambio("cerrado"))}
        >
          {F.ciclo.cerrar}
        </button>
        {!servidor && (
          <Link to={R.constructor} className="boton boton--secundario">
            {F.ciclo.nuevo}
          </Link>
        )}
      </div>
      {servidor && (
        <Hoja abierta={cerrar} onCerrar={() => setCerrar(false)} titulo={F.ciclo.cerrar}>
          <p>{PANEL_REAL.participante.cerrarConfirmar}</p>
          <div className="acciones">
            <button type="button" className="boton boton--secundario" onClick={() => setCerrar(false)}>
              {F.datos.cancelar}
            </button>
            <button
              type="button"
              className="boton boton--primario"
              onClick={() => {
                setCerrar(false);
                void hacer("cerrado", servidor.cerrar);
              }}
            >
              {F.ciclo.cerrar}
            </button>
          </div>
        </Hoja>
      )}
    </Seccion>
  );
}
