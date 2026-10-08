// Constructor real (5.6): /equipo/constructor/?id={participante}. Edita el borrador del ciclo
// abierto con el mismo editor de la vista previa. Sin borrador, «Crear el borrador» corre
// nuevo_borrador (copia el publicado como v+1, conservando la clave de cada meta).
// Guardar: borra lo quitado y hace upsert de metas y acciones (los ids nuevos son uuid del
// navegador); la base solo deja escribir mientras el programa es borrador.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CategoriaId } from "../../../data/rumbo";
import { datos } from "../../../lib/supabase";
import Carga from "../../vista-previa/mi-espacio/Carga";
import { Cabeza, conId, usePanel } from "../../vista-previa/panel/comun";
import { PantallaConstructor, type AccionB, type MetaB, type ProgramaLectura, type ServidorConstructor } from "../../vista-previa/panel/Constructor";
import { CONSTRUCTOR as C, PANEL_REAL } from "../../vista-previa/panel/textos";
import { Alerta, NoEncontrada, useDatosPanel, useEscritura, useParticipante } from "./comun";
import { nombreDe, semanaDelCiclo, type FilaCicloPanel, type FilaParticipantePanel } from "./datos";

type FilaMeta = { id: string; programa_id: string; titulo: string; para_que: string | null; categoria: CategoriaId; hitos: { texto: string; logrado: boolean }[]; orden: number };
type FilaAccion = {
  id: string;
  programa_id: string;
  meta_id: string;
  titulo: string;
  instrucciones: string;
  version_corta: string | null;
  hora: string | null;
  duracion_min: number;
  dias: number[];
  semana_desde: number;
  semanas: number;
  requiere_foto: boolean;
  orden: number;
};

const aMetaB = (m: FilaMeta): MetaB => ({ id: m.id, titulo: m.titulo, paraQue: m.para_que ?? "", categoria: m.categoria, hitos: Array.isArray(m.hitos) ? m.hitos : [] });
const aAccionB = (a: FilaAccion): AccionB => ({
  id: a.id,
  metaId: a.meta_id,
  titulo: a.titulo,
  hora: a.hora ? a.hora.slice(0, 5) : null,
  duracion: a.duracion_min,
  dias: [...a.dias].sort(),
  desde: a.semana_desde,
  durante: a.semanas,
  instrucciones: a.instrucciones,
  versionCorta: a.version_corta ?? "",
  conFoto: a.requiere_foto,
});

export function ConstructorReal() {
  const { id, p, c } = useParticipante();
  const { R } = usePanel();
  if (!id) return <Carga estado="cargando" />;
  if (!p) return <NoEncontrada volver={R.participantes} />;
  if (!c || c.estado === "cerrado") return <NoEncontrada volver={conId(R.participante, p.id)} />;
  return <ContenidoConstructor key={c.id} p={p} c={c} />;
}

type Leido = { borrador: { id: string; version: number } | null; metas: FilaMeta[]; acciones: FilaAccion[]; publicada: ProgramaLectura | null };

function ContenidoConstructor({ p, c }: { p: FilaParticipantePanel; c: FilaCicloPanel }) {
  const { sb, recargar } = useDatosPanel();
  const { hoy } = usePanel();
  const [leido, setLeido] = useState<Leido | null>(null);
  const [error, setError] = useState(false);
  const [crear, errorCrear, creando] = useEscritura();
  const guardados = useRef<{ metas: Set<string>; acciones: Set<string> }>({ metas: new Set(), acciones: new Set() });

  // El estado de los programas se toma de la base al abrir (no de los datos del panel, que
  // cambian al publicar: el editor queda abierto con su aviso).
  const leer = useCallback(async () => {
    try {
      const programas = datos(await sb.from("programas").select("id,version,estado").eq("ciclo_id", c.id)) as { id: string; version: number; estado: string }[];
      const borrador = programas.find((g) => g.estado === "borrador") ?? null;
      const publicado = programas.find((g) => g.estado === "publicado") ?? null;
      const ids = [borrador?.id, publicado?.id].filter(Boolean) as string[];
      const [metas, acciones] = ids.length
        ? await Promise.all([
            sb.from("metas").select("id,programa_id,titulo,para_que,categoria,hitos,orden").in("programa_id", ids).order("orden"),
            sb.from("acciones").select("id,programa_id,meta_id,titulo,instrucciones,version_corta,hora,duracion_min,dias,semana_desde,semanas,requiere_foto,orden").in("programa_id", ids).order("orden"),
          ])
        : [{ data: [], error: null }, { data: [], error: null }];
      const m = datos(metas) as FilaMeta[];
      const a = datos(acciones) as FilaAccion[];
      const delBorrador = { metas: m.filter((x) => x.programa_id === borrador?.id), acciones: a.filter((x) => x.programa_id === borrador?.id) };
      guardados.current = { metas: new Set(delBorrador.metas.map((x) => x.id)), acciones: new Set(delBorrador.acciones.map((x) => x.id)) };
      setLeido({
        borrador: borrador ? { id: borrador.id, version: borrador.version } : null,
        ...delBorrador,
        publicada: publicado
          ? {
              version: publicado.version,
              metas: m.filter((x) => x.programa_id === publicado.id).map((x) => ({ id: x.id, titulo: x.titulo, categoria: x.categoria })),
              acciones: a
                .filter((x) => x.programa_id === publicado.id)
                .map((x) => ({ id: x.id, metaId: x.meta_id, titulo: x.titulo, dias: x.dias, hora: x.hora?.slice(0, 5) ?? null, duracion: x.duracion_min })),
            }
          : null,
      });
      setError(false);
    } catch {
      setError(true);
    }
  }, [sb, c.id]);
  useEffect(() => {
    void leer();
  }, [leer]);

  const borradorId = leido?.borrador?.id ?? null;
  const servidor = useMemo<ServidorConstructor | undefined>(() => {
    if (!borradorId) return undefined;
    return {
      guardar: async (metas, acciones) => {
        const g = guardados.current;
        const accionesQuitadas = [...g.acciones].filter((x) => !acciones.some((a) => a.id === x));
        const metasQuitadas = [...g.metas].filter((x) => !metas.some((m) => m.id === x));
        if (accionesQuitadas.length) datos(await sb.from("acciones").delete().in("id", accionesQuitadas));
        if (metasQuitadas.length) datos(await sb.from("metas").delete().in("id", metasQuitadas));
        if (metas.length)
          datos(
            await sb.from("metas").upsert(
              metas.map((m, i) => ({
                id: m.id,
                programa_id: borradorId,
                participante_id: p.id,
                titulo: m.titulo.trim(),
                para_que: m.paraQue.trim() || null,
                categoria: m.categoria,
                hitos: m.hitos,
                orden: i,
              })),
            ),
          );
        if (acciones.length)
          datos(
            await sb.from("acciones").upsert(
              acciones.map((a, i) => ({
                id: a.id,
                programa_id: borradorId,
                meta_id: a.metaId,
                titulo: a.titulo.trim(),
                instrucciones: a.instrucciones.trim(),
                version_corta: a.versionCorta.trim() || null,
                hora: a.hora,
                duracion_min: a.duracion,
                dias: [...a.dias].sort(),
                semana_desde: a.desde,
                semanas: a.durante,
                requiere_foto: a.conFoto,
                orden: i,
              })),
            ),
          );
        guardados.current = { metas: new Set(metas.map((m) => m.id)), acciones: new Set(acciones.map((a) => a.id)) };
      },
      revisar: async () => {
        const [cruces, carga] = await Promise.all([sb.rpc("solapamientos", { p_programa: borradorId }), sb.rpc("carga_prevista", { p_programa: borradorId })]);
        const filas = (datos(carga) as { fecha: string; minutos: number }[]) ?? [];
        const max = filas.reduce<{ fecha: string; minutos: number } | null>((m, x) => (!m || x.minutos > m.minutos ? x : m), null);
        return { cruces: ((datos(cruces) as unknown[]) ?? []).length, carga: max };
      },
      publicar: async ({ vigencia, aceptar, nota, foco }) => {
        const n = datos(
          await sb.rpc("publicar_programa", {
            p_programa: borradorId,
            p_vigente_desde: vigencia,
            p_aceptar_solapamientos: aceptar,
            p_nota_cambios: nota || null,
            p_foco_inicial: foco || null,
          }),
        ) as number;
        await recargar();
        return n;
      },
    };
  }, [borradorId, sb, p.id, recargar]);

  if (error) return <Carga estado="error" alReintentar={() => void leer()} />;
  if (!leido) return <Carga estado="cargando" />;
  const nombre = nombreDe(p);

  if (!leido.borrador || !servidor) {
    return (
      <div className="pa-pantalla">
        <Cabeza ojo={C.ojo} titulo={C.titulo(nombre)} bajada={PANEL_REAL.constructor.crearAyuda} />
        <Alerta texto={errorCrear} />
        <div className="acciones">
          <button
            type="button"
            className="boton boton--primario"
            aria-disabled={creando ? true : undefined}
            onClick={() =>
              void crear(async () => {
                datos(await sb.rpc("nuevo_borrador", { p_ciclo: c.id }));
                await leer();
                await recargar();
              })
            }
          >
            {PANEL_REAL.constructor.crear}
          </button>
        </div>
      </div>
    );
  }

  return (
    <PantallaConstructor
      key={leido.borrador.id}
      nombre={nombre}
      cercano={c.plan_id === "cercano"}
      inicio={c.inicio}
      semanas={c.semanas}
      hoy={hoy}
      version={leido.borrador.version}
      publicada={leido.publicada}
      metas={leido.metas.map(aMetaB)}
      acciones={leido.acciones.map(aAccionB)}
      semanaInicial={Math.min(semanaDelCiclo(c, hoy) ?? 1, c.semanas)}
      servidor={servidor}
    />
  );
}
