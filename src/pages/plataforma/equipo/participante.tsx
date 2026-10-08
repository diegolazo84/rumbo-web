// Ficha de participante (5.5) y revisión semanal (5.7) del panel real. Leen el detalle de la
// persona al abrirse (calendario, registros, registros semanales, programa y peticiones) y
// usan las piezas de la vista previa: pestañas, semana en solo lectura, resumen por meta,
// registro de la persona, acciones del ciclo y el formulario de la revisión.
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Etiqueta from "../../../components/Etiqueta";
import { ChipMeta, Hoja, Icono } from "../../../components/app";
import { CampoSelect, CampoTexto } from "../../../components/form";
import { AJUSTE } from "../../../data/formularios";
import type { CategoriaId } from "../../../data/rumbo";
import { DIAS, diaCorto, duracionTexto, fechaLarga, semanaDesde, sumarDias, type Iso } from "../../../lib/fechas";
import { datos, type Cliente } from "../../../lib/supabase";
import Carga from "../../vista-previa/mi-espacio/Carga";
import { AJUSTES, CONSTRUCTOR, FICHA_PARTICIPANTE as F, FOTOS, HOY_PANEL, PANEL_REAL, REVISION } from "../../vista-previa/panel/textos";
import { Cabeza, Datos, Seccion, conId, descargarJson, planDe, useParametro, usePanel } from "../../vista-previa/panel/comun";
import {
  AccionesCiclo,
  PESTANAS,
  Pestanas,
  RegistroLectura,
  SemanaLista,
  ZONAS,
  type FilaSemana,
  type Pestana,
} from "../../vista-previa/panel/FichaParticipante";
import { EtiquetaCiclo, semanaTexto } from "../../vista-previa/panel/Participantes";
import { FormularioRevision } from "../../vista-previa/panel/Revision";
import { Alerta, NoEncontrada, useDatosPanel, useEscritura, useParticipante } from "./comun";
import {
  aFicha,
  estadoCiclo,
  lunesSemana,
  reordenesDe,
  reordenesUsados,
  semanaDelCiclo,
  type FilaCicloPanel,
  type FilaParticipantePanel,
  type FilaPeticion,
} from "./datos";

// ---------------------------------------------------------------------------
// Detalle de una persona

type FilaOcurrencia = {
  id: string;
  programa_id: string;
  fecha: Iso;
  hora: string | null;
  duracion_min: number;
  titulo: string;
  meta_titulo: string;
  categoria: CategoriaId;
  vigente: boolean;
};
type FilaRegistro = { id: string; ocurrencia_id: string; estado: string; version: string | null; foto_ruta: string | null; explicacion: string | null; nota_revision: string | null };
type FilaSemanal = { semana: number; carga: string | null; funciono: string | null; costo: string | null; cambiar: string | null; enviado_en: string | null };
type FilaDiaProgreso = { fecha: Iso; programadas: number; hechas: number; creditos_acciones: number; bono: number };
type FilaMetaP = { id: string; programa_id: string; titulo: string; categoria: CategoriaId; orden: number };
type FilaAccionP = { id: string; programa_id: string; meta_id: string; titulo: string; dias: number[]; hora: string | null; duracion_min: number; orden: number };

export type Detalle = {
  ocurrencias: FilaOcurrencia[];
  registros: FilaRegistro[];
  semanales: FilaSemanal[];
  dias: FilaDiaProgreso[];
  metas: FilaMetaP[];
  acciones: FilaAccionP[];
  peticiones: FilaPeticion[];
};

async function leerDetalle(sb: Cliente, p: FilaParticipantePanel, c: FilaCicloPanel | null, programas: string[]): Promise<Detalle> {
  const vacio = Promise.resolve({ data: [], error: null, status: 200 });
  const [ocurrencias, registros, semanales, dias, metas, acciones, peticiones] = await Promise.all([
    c
      ? sb.from("ocurrencias").select("id,programa_id,fecha,hora,duracion_min,titulo,meta_titulo,categoria,vigente").eq("ciclo_id", c.id).order("fecha").order("hora")
      : vacio,
    sb.from("registros").select("id,ocurrencia_id,estado,version,foto_ruta,explicacion,nota_revision").eq("participante_id", p.id),
    c ? sb.from("registros_semanales").select("semana,carga,funciono,costo,cambiar,enviado_en").eq("ciclo_id", c.id) : vacio,
    sb.from("progreso_diario").select("fecha,programadas,hechas,creditos_acciones,bono").eq("participante_id", p.id),
    programas.length ? sb.from("metas").select("id,programa_id,titulo,categoria,orden").in("programa_id", programas).order("orden") : vacio,
    programas.length
      ? sb.from("acciones").select("id,programa_id,meta_id,titulo,dias,hora,duracion_min,orden").in("programa_id", programas).order("orden")
      : vacio,
    sb.from("peticiones_derechos").select("id,recibida_en,origen,participante_id,correo,tipo,detalle,fecha_limite,estado,respuesta").eq("participante_id", p.id),
  ]);
  return {
    ocurrencias: datos(ocurrencias) as FilaOcurrencia[],
    registros: datos(registros) as FilaRegistro[],
    semanales: datos(semanales) as FilaSemanal[],
    dias: datos(dias) as FilaDiaProgreso[],
    metas: datos(metas) as FilaMetaP[],
    acciones: datos(acciones) as FilaAccionP[],
    peticiones: datos(peticiones) as FilaPeticion[],
  };
}

// Lee el detalle al abrir y cuando cambian los datos del panel (después de una escritura).
function useDetalle(p: FilaParticipantePanel | null, c: FilaCicloPanel | null) {
  const { sb, d } = useDatosPanel();
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [error, setError] = useState(false);
  const programas = c ? d.programas.filter((g) => g.ciclo_id === c.id).map((g) => g.id) : [];
  const clave = `${p?.id}|${c?.id}|${programas.join(",")}|${d.ciclos.length}|${d.revisiones.length}`;
  const leer = useCallback(async () => {
    if (!p) return;
    try {
      setDetalle(await leerDetalle(sb, p, c, programas));
      setError(false);
    } catch {
      setError(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, sb]);
  useEffect(() => {
    void leer();
  }, [leer]);
  return { detalle, error, leer };
}

// Estado de la fila de la semana (FichaParticipante, ESTADO_FILA).
function estadoFila(r: FilaRegistro | undefined): string | null {
  if (!r) return null;
  if (r.estado === "hecha") return r.version === "corta" ? "corta" : "hecha";
  if (r.estado === "en_revision") return "revision";
  if (r.estado === "aprobada" || r.estado === "dejada") return r.estado;
  return null;
}
const cuentaComoHecha = (r: FilaRegistro | undefined) => !!r && (r.estado === "hecha" || r.estado === "aprobada");

// Resumen de una semana: por meta, días completos y dejadas pasar.
function resumenSemana(det: Detalle, c: FilaCicloPanel, n: number, hoy: Iso) {
  const lunes = lunesSemana(c, n);
  const domingo = sumarDias(lunes, 6);
  const delas = det.ocurrencias.filter((o) => o.vigente && o.fecha >= lunes && o.fecha <= domingo);
  const reg = (id: string) => det.registros.find((r) => r.ocurrencia_id === id);
  const metas = new Map<string, { titulo: string; categoria: CategoriaId; programadas: number; hechas: number }>();
  for (const o of delas) {
    const m = metas.get(o.meta_titulo) ?? { titulo: o.meta_titulo, categoria: o.categoria, programadas: 0, hechas: 0 };
    m.programadas += 1;
    if (cuentaComoHecha(reg(o.id))) m.hechas += 1;
    metas.set(o.meta_titulo, m);
  }
  const dias = semanaDesde(lunes);
  const diasCompletos = dias.filter((f) => {
    const del = delas.filter((o) => o.fecha === f);
    return f <= hoy && del.length > 0 && del.every((o) => cuentaComoHecha(reg(o.id)));
  }).length;
  const dejadas = delas.filter((o) => reg(o.id)?.estado === "dejada").length;
  const hastaHoy = delas.filter((o) => o.fecha <= hoy);
  return {
    lunes,
    dias,
    delas,
    porMeta: [...metas.values()],
    diasCompletos,
    dejadas,
    hechas: hastaHoy.filter((o) => cuentaComoHecha(reg(o.id))).length,
    deHoy: hastaHoy.length,
  };
}

const textoDias = (dias: number[]) => (dias.length === 7 ? F.programa.todosLosDias : dias.map((x) => DIAS[x - 1]).join(", "));
const TIPO_AJUSTE: Record<string, string> = Object.fromEntries(AJUSTE.tipo.opciones.map((o) => [o.valor, o.texto]));

// ---------------------------------------------------------------------------
// Ficha

export function FichaParticipanteReal() {
  const { id, p, c } = useParticipante();
  const pestanaParam = useParametro("pestana");
  const { R } = usePanel();
  if (!id) return <Carga estado="cargando" />;
  if (!p) return <NoEncontrada volver={R.participantes} />;
  const inicial = PESTANAS.includes(pestanaParam as Pestana) ? (pestanaParam as Pestana) : "programa";
  return <ContenidoFicha key={p.id} p={p} c={c} inicial={inicial} />;
}

function ContenidoFicha({ p, c, inicial }: { p: FilaParticipantePanel; c: FilaCicloPanel | null; inicial: Pestana }) {
  const { sb, d, recargar } = useDatosPanel();
  const [pestana, setPestana] = useState<Pestana>(inicial);
  useEffect(() => setPestana(inicial), [inicial]);
  const { detalle, error, leer } = useDetalle(p, c);
  const ficha = aFicha(d, p);
  const plan = planDe(ficha.plan);
  const estado = estadoCiclo(d, c, d.hoy);

  const ciclo = async (fn: () => Promise<unknown>) => {
    await fn();
    await recargar();
    await leer();
  };

  return (
    <div className="pa-pantalla">
      <Cabeza ojo={F.ojo} titulo={ficha.nombre}>
        <div className="pa-etiquetas">
          <span className="pa-plan">{plan.nombre}</span>
          <Etiqueta variante="nota">{plan.rotulo}</Etiqueta>
          <EtiquetaCiclo estado={estado} />
        </div>
        {c && (
          <p className="pa-cabeza__linea">
            {semanaTexto(ficha)} · {F.proxima(diaCorto(ficha.proximaRevision))}
            {ficha.horaVideollamada ? `, ${ficha.horaVideollamada}` : ""}
          </p>
        )}
      </Cabeza>

      <Pestanas actual={pestana} onCambio={setPestana} />
      <div role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`pestana-${pestana}`} tabIndex={0} className="pa-pestana">
        {error ? (
          <Carga estado="error" alReintentar={() => void leer()} />
        ) : !detalle ? (
          <Carga estado="cargando" />
        ) : (
          <>
            {pestana === "programa" && <ProgramaReal p={p} c={c} det={detalle} />}
            {pestana === "semana" && <SemanaReal c={c} det={detalle} />}
            {pestana === "revisiones" && <RevisionesReal p={p} c={c} det={detalle} />}
            {pestana === "ajustes" && <AjustesFicha c={c} />}
            {pestana === "fotos" && <FotosFicha det={detalle} />}
            {pestana === "datos" && <DatosReal p={p} det={detalle} />}
          </>
        )}
      </div>

      {c && estado !== "cerrado" && (
        <AccionesCiclo
          key={`${c.id}-${c.estado}-${c.fin}`}
          estado={estado}
          onCambio={() => undefined}
          servidor={{
            fin: c.fin,
            pausar: (motivo, desde, hasta) => ciclo(async () => datos(await sb.rpc("pausar_ciclo", { p_ciclo: c.id, p_desde: desde, p_hasta: hasta, p_motivo: motivo }))),
            reanudar: () => ciclo(async () => datos(await sb.rpc("reanudar_ciclo", { p_ciclo: c.id }))),
            extender: (fin) => ciclo(async () => datos(await sb.from("ciclos").update({ fin }).eq("id", c.id))),
            cerrar: () => ciclo(async () => datos(await sb.from("ciclos").update({ estado: "cerrado", cerrado_en: new Date().toISOString() }).eq("id", c.id))),
          }}
        />
      )}
    </div>
  );
}

// Programa: versión publicada (lleno), borrador (contorno), historial y «Editar en el constructor».
function ProgramaReal({ p, c, det }: { p: FilaParticipantePanel; c: FilaCicloPanel | null; det: Detalle }) {
  const { d } = useDatosPanel();
  const { R } = usePanel();
  const programas = c ? d.programas.filter((g) => g.ciclo_id === c.id).sort((a, b) => b.version - a.version) : [];
  const publicado = programas.find((g) => g.estado === "publicado");
  const borrador = programas.find((g) => g.estado === "borrador");
  const historial = programas.filter((g) => g.publicado_en);
  return (
    <div className="pa-pila">
      {publicado ? (
        <section className="tarjeta pa-tarjeta" aria-labelledby="prog-publicada">
          <div className="pa-seccion__cabeza">
            <h2 id="prog-publicada" className="pa-h2">
              {F.programa.version(publicado.version)}
            </h2>
            <Etiqueta variante="activo">{F.programa.publicadaEtiqueta}</Etiqueta>
          </div>
          {det.metas
            .filter((m) => m.programa_id === publicado.id)
            .map((m) => (
              <div key={m.id} className="pa-prog-meta">
                <ChipMeta cat={m.categoria} meta={m.titulo} />
                <ul className="pa-prog-acciones">
                  {det.acciones
                    .filter((a) => a.meta_id === m.id)
                    .map((a) => (
                      <li key={a.id} data-cat={m.categoria}>
                        <span className="pa-prog-acciones__titulo">{a.titulo}</span>
                        <span className="microcopia">
                          {textoDias(a.dias)} · {a.hora?.slice(0, 5) ?? CONSTRUCTOR.accion.flexible} · {duracionTexto(a.duracion_min)}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
        </section>
      ) : (
        <p className="pa-vacio">{PANEL_REAL.participante.sinPrograma}</p>
      )}
      {borrador && (
        <section className="tarjeta tarjeta--pronto pa-tarjeta" aria-labelledby="prog-borrador">
          <div className="pa-seccion__cabeza">
            <h2 id="prog-borrador" className="pa-h2">
              {F.programa.version(borrador.version)}
            </h2>
            <Etiqueta variante="nota">{F.programa.borrador}</Etiqueta>
          </div>
        </section>
      )}
      {historial.length > 0 && (
        <Seccion titulo={F.programa.historial}>
          <ol className="pa-lista-simple">
            {historial.map((g) => (
              <li key={g.id}>
                {F.programa.publicadaEl(g.version, fechaLarga(g.publicado_en!.slice(0, 10)))}
                {g.nota_cambios ? ` · ${g.nota_cambios}` : ""}
              </li>
            ))}
          </ol>
        </Seccion>
      )}
      {c && c.estado !== "cerrado" && (
        <div className="acciones">
          <Link to={conId(R.constructor, p.id)} className="boton boton--secundario">
            {F.programa.editar}
          </Link>
        </div>
      )}
    </div>
  );
}

// Semana: la vista de la persona en solo lectura (semana en curso).
function SemanaReal({ c, det }: { c: FilaCicloPanel | null; det: Detalle }) {
  const { hoy } = usePanel();
  const n = c ? semanaDelCiclo(c, hoy) : null;
  if (!c || !n) return <p className="pa-vacio">{F.semana.noEmpieza}</p>;
  const s = resumenSemana(det, c, Math.min(n, c.semanas), hoy);
  const reg = (id: string) => det.registros.find((r) => r.ocurrencia_id === id);
  return (
    <SemanaLista
      dias={s.dias}
      hoy={hoy}
      filas={(fecha): FilaSemana[] =>
        s.delas
          .filter((o) => o.fecha === fecha)
          .map((o) => ({
            id: o.id,
            hora: o.hora?.slice(0, 5) ?? null,
            titulo: o.titulo,
            duracion: o.duracion_min,
            meta: o.meta_titulo,
            categoria: o.categoria,
            fecha: o.fecha,
            registro: estadoFila(reg(o.id)),
          }))
      }
      completo={(fecha) => {
        const dia = det.dias.find((x) => x.fecha === fecha);
        return dia && dia.programadas > 0 && dia.hechas >= dia.programadas ? dia.creditos_acciones + dia.bono : null;
      }}
      hechas={s.hechas}
      deHoy={s.deHoy}
    />
  );
}

// Revisiones: por semana, el registro de la persona y la revisión publicada.
function RevisionesReal({ p, c, det }: { p: FilaParticipantePanel; c: FilaCicloPanel | null; det: Detalle }) {
  const { d } = useDatosPanel();
  const { R, hoy } = usePanel();
  if (!c) return <p className="pa-vacio">{F.semana.noEmpieza}</p>;
  const hasta = Math.min(semanaDelCiclo(c, hoy) ?? 0, c.semanas);
  if (!hasta) return <p className="pa-vacio">{F.semana.noEmpieza}</p>;
  const semanas = Array.from({ length: hasta }, (_, i) => hasta - i);
  return (
    <div className="pa-pila">
      {semanas.map((n) => {
        const r = det.semanales.find((x) => x.semana === n);
        const rev = d.revisiones.find((x) => x.ciclo_id === c.id && x.semana === n);
        return (
          <section key={n} className="tarjeta pa-tarjeta" aria-labelledby={`rev-${n}`}>
            <h2 id={`rev-${n}`} className="pa-h2">
              {F.revisiones.semana(n)}
            </h2>
            <h3 className="pa-h3">{F.revisiones.registro}</h3>
            {r && (r.enviado_en || r.funciono || r.costo || r.cambiar) ? (
              <RegistroLectura carga={r.carga} funciono={r.funciono ?? ""} costo={r.costo ?? ""} cambiar={r.cambiar ?? ""} />
            ) : (
              <p className="microcopia">{F.revisiones.sinRegistro}</p>
            )}
            <h3 className="pa-h3">{F.revisiones.revision}</h3>
            {rev?.publicada_en ? (
              <Datos
                className="pa-datos--apilada"
                filas={[
                  [REVISION.funciono.etiqueta, rev.que_funciono ?? ""],
                  rev.que_ajustamos && [REVISION.ajustamos.etiqueta, rev.que_ajustamos],
                  [REVISION.foco.etiqueta, rev.foco ?? ""],
                ]}
              />
            ) : (
              <>
                <p className="microcopia">{F.revisiones.sinRevision}</p>
                <Link to={conId(R.revision, p.id, { n: String(n) })} className="boton boton--secundario">
                  {HOY_PANEL.botones.revision}
                </Link>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}

function AjustesFicha({ c }: { c: FilaCicloPanel | null }) {
  const { d } = useDatosPanel();
  if (!c) return <p className="pa-vacio">{PANEL_REAL.ajustes.vacio}</p>;
  const lista = d.ajustes.filter((a) => a.ciclo_id === c.id);
  return (
    <div className="pa-pila">
      {c.plan_id === "cercano" && <p className="microcopia">{F.ajustes.reordenamientos(reordenesUsados(d, c.id), reordenesDe(d, c.plan_id))}</p>}
      {lista.length ? (
        <ul className="pa-lista-simple">
          {lista.map((a) => (
            <li key={a.id}>
              <Etiqueta variante={AJUSTES.estados[a.estado].variante}>{AJUSTES.estados[a.estado].texto}</Etiqueta> {TIPO_AJUSTE[a.tipo] ?? a.tipo} · {a.texto}
              {a.respuesta ? ` → ${a.respuesta}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="pa-vacio">{PANEL_REAL.ajustes.vacio}</p>
      )}
    </div>
  );
}

function FotosFicha({ det }: { det: Detalle }) {
  const lista = det.registros.filter((r) => r.foto_ruta || r.explicacion);
  if (!lista.length) return <p className="pa-vacio">{F.fotos.vacio}</p>;
  const titulo = (id: string) => det.ocurrencias.find((o) => o.id === id)?.titulo ?? "—";
  return (
    <ul className="pa-lista-simple">
      {lista.map((r) => (
        <li key={r.id}>
          <Etiqueta variante={r.estado === "aprobada" ? "activo" : "nota"}>
            {r.estado === "aprobada" ? FOTOS.aprobada : r.estado === "rechazada" ? FOTOS.noAprobada : AJUSTES.estados.en_revision.texto}
          </Etiqueta>{" "}
          {titulo(r.ocurrencia_id)}
          {r.explicacion ? ` · ${r.explicacion}` : ""}
        </li>
      ))}
    </ul>
  );
}

// Datos: correo, zona horaria (editable solo aquí), ciclos, exportar, peticiones y eliminar (6.11).
function DatosReal({ p, det }: { p: FilaParticipantePanel; det: Detalle }) {
  const { sb, d, recargar } = useDatosPanel();
  const { R } = usePanel();
  const navegar = useNavigate();
  const [zona, setZona] = useState(p.zona_horaria);
  const [eliminar, setEliminar] = useState(false);
  const [confirmo, setConfirmo] = useState("");
  const [correr, error] = useEscritura();
  const [correrEliminar, errorEliminar] = useEscritura();
  const [aviso, setAviso] = useState("");
  const ciclos = d.ciclos.filter((x) => x.participante_id === p.id).sort((a, b) => a.numero - b.numero);
  const zonas = ZONAS.includes(p.zona_horaria) ? ZONAS : [p.zona_horaria, ...ZONAS];
  const exportar = () =>
    descargarJson(
      `rumbo-${p.id}.json`,
      {
        participante: { nombre: p.nombre, nombre_preferido: p.nombre_preferido, correo: p.correo, zona_horaria: p.zona_horaria, creado_en: p.creado_en },
        ciclos,
        programas: d.programas.filter((g) => g.participante_id === p.id),
        metas: det.metas,
        acciones: det.acciones,
        calendario: det.ocurrencias,
        registros: det.registros,
        registros_semanales: det.semanales,
        revisiones: d.revisiones.filter((r) => r.participante_id === p.id),
        solicitudes_ajuste: d.ajustes.filter((a) => a.participante_id === p.id),
        peticiones: det.peticiones,
      },
      false,
    );
  const abiertas = det.peticiones.filter((x) => x.estado === "abierta");
  return (
    <div className="pa-pila">
      <Datos
        filas={[
          [F.datos.correo, <span className="pa-largo">{p.correo}</span>],
          [
            F.datos.ciclos,
            ciclos.length ? ciclos.map((x) => `${x.numero} · ${fechaLarga(x.inicio)} – ${fechaLarga(x.fin)}`).join(" · ") : "—",
          ],
          [F.datos.peticiones, abiertas.length ? abiertas.map((x) => x.tipo).join(", ") : F.datos.sinPeticiones],
        ]}
      />
      <CampoSelect
        id="zona"
        etiqueta={F.datos.zona}
        ayuda={F.datos.zonaAyuda}
        value={zona}
        onChange={(e) => {
          const z = e.target.value;
          setZona(z);
          setAviso("");
          void correr(async () => {
            datos(await sb.from("participantes").update({ zona_horaria: z }).eq("id", p.id));
            await recargar();
            setAviso(PANEL_REAL.participante.zonaGuardada);
          });
        }}
      >
        {zonas.map((z) => (
          <option key={z} value={z}>
            {z}
          </option>
        ))}
      </CampoSelect>
      <Alerta texto={error} />
      <p role="status" className="microcopia">
        {aviso}
      </p>
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
        <CampoTexto id="eliminar-confirmo" etiqueta={PANEL_REAL.participante.eliminarEscribe} value={confirmo} onChange={(e) => setConfirmo(e.target.value)} />
        <Alerta texto={errorEliminar} />
        <div className="acciones">
          <button type="button" className="boton boton--secundario" onClick={() => setEliminar(false)}>
            {F.datos.cancelar}
          </button>
          <button
            type="button"
            className="boton boton--primario"
            aria-disabled={confirmo.trim() === "ELIMINAR" ? undefined : true}
            onClick={() => {
              if (confirmo.trim() !== "ELIMINAR") return;
              void correrEliminar(async () => {
                datos(await sb.rpc("eliminar_participante", { p_id: p.id }));
                await recargar();
                navegar(R.participantes, { state: { aviso: PANEL_REAL.participante.eliminado } });
              });
            }}
          >
            {PANEL_REAL.participante.eliminarBoton}
          </button>
        </div>
      </Hoja>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revisión semanal (5.7): /equipo/revision/?id={participante}&n={semana}

export function RevisionReal() {
  const { id, p, c } = useParticipante();
  const nParam = useParametro("n");
  const { R } = usePanel();
  if (!id) return <Carga estado="cargando" />;
  if (!p) return <NoEncontrada volver={R.participantes} />;
  if (!c || c.estado === "cerrado") return <NoEncontrada volver={conId(R.participante, p.id)} />;
  return <ContenidoRevision key={`${c.id}-${nParam}`} p={p} c={c} nParam={nParam} />;
}

function ContenidoRevision({ p, c, nParam }: { p: FilaParticipantePanel; c: FilaCicloPanel; nParam: string | null }) {
  const { sb, d, recargar } = useDatosPanel();
  const { R, hoy } = usePanel();
  const actual = Math.min(Math.max(semanaDelCiclo(c, hoy) ?? 1, 1), c.semanas);
  const pedida = Number(nParam);
  const n = Number.isInteger(pedida) && pedida >= 1 && pedida <= actual ? pedida : actual;
  const rev = d.revisiones.find((x) => x.ciclo_id === c.id && x.semana === n);
  const [iniciada, setIniciada] = useState(!!rev);
  const { detalle, error, leer } = useDetalle(p, c);

  // Al abrirla se fija iniciada_en: el registro de la persona queda cerrado («En revisión»).
  useEffect(() => {
    if (rev) {
      setIniciada(true);
      return;
    }
    let vivo = true;
    void (async () => {
      try {
        datos(
          await sb
            .from("revisiones")
            .upsert({ participante_id: p.id, ciclo_id: c.id, semana: n, tipo: c.plan_id === "cercano" ? "videollamada" : "escrita" }, { onConflict: "ciclo_id,semana", ignoreDuplicates: true }),
        );
        await recargar();
      } finally {
        if (vivo) setIniciada(true);
      }
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <Carga estado="error" alReintentar={() => void leer()} />;
  if (!detalle || !iniciada) return <Carga estado="cargando" />;
  const s = resumenSemana(detalle, c, n, hoy);
  const r = detalle.semanales.find((x) => x.semana === n);
  const registro = r && (r.enviado_en || r.funciono || r.costo || r.cambiar) ? { carga: r.carga, funciono: r.funciono ?? "", costo: r.costo ?? "", cambiar: r.cambiar ?? "" } : null;
  const domingo = sumarDias(s.lunes, 6);
  const ajustes = d.ajustes
    .filter((a) => a.ciclo_id === c.id && a.creada_en.slice(0, 10) >= s.lunes && a.creada_en.slice(0, 10) <= sumarDias(domingo, 1))
    .map((a) => ({ id: a.id, estado: a.estado, detalle: a.texto }));
  const fotos = detalle.registros
    .filter((x) => (x.foto_ruta || x.explicacion) && s.delas.some((o) => o.id === x.ocurrencia_id))
    .map((x) => ({ id: x.id, accion: s.delas.find((o) => o.id === x.ocurrencia_id)?.titulo ?? "—", foto: !!x.foto_ruta }));
  const ficha = aFicha(d, p);
  return (
    <FormularioRevision
        nombre={ficha.nombre}
        semana={n}
        semanas={c.semanas}
        cercano={c.plan_id === "cercano"}
        porMeta={s.porMeta}
        diasCompletos={s.diasCompletos}
        dejadas={s.dejadas}
        registro={registro}
        ajustes={ajustes}
        fotos={fotos}
        constructor={conId(R.constructor, p.id)}
        inicial={rev ? { funciono: rev.que_funciono ?? "", ajustamos: rev.que_ajustamos ?? "", foco: rev.foco ?? "" } : undefined}
        publicadaEl={rev?.publicada_en ? rev.publicada_en.slice(0, 10) : null}
        onPublicar={async (t) => {
          datos(
            await sb
              .from("revisiones")
              .update({ que_funciono: t.funciono, que_ajustamos: t.ajustamos || null, foco: t.foco, publicada_en: new Date().toISOString() })
              .eq("ciclo_id", c.id)
              .eq("semana", n),
          );
          await recargar();
        }}
    />
  );
}
