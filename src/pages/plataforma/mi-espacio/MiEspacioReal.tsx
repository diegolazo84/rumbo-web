// Mi espacio real (etapa 3, plataforma 4 y 6): las mismas pantallas de la vista previa con los
// datos de la persona. Lee por RLS (solo lo suyo; nunca borradores ni acciones) y escribe solo
// con las RPC de 6.7. El marco (EstructuraApp) es el mismo de la vista previa, sin «Ejemplo».
// - Sin sesión: lleva a mi-espacio/entrar/ y recuerda la ruta de destino.
// - La sesión vence: tostada «Tu sesión terminó…» en entrar/ (4.2.5).
// - Cuenta del equipo sin ficha de participante: lleva al panel.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Banda, BandaSinConexion, EstructuraApp, Icono } from "../../../components/app";
import type { EstadoRegistro, SolicitudAjuste } from "../../../data/ejemplo-app";
import type { Iso } from "../../../lib/fechas";
import { datos, supabase, type Cliente } from "../../../lib/supabase";
import type { RutaPlataforma } from "../rutas";
import { ESPACIO_PREVIA, EspacioContexto, R_REAL, type Ausencia, type Espacio, type Progreso, type Servidor } from "../../vista-previa/mi-espacio/espacio";
import Ajuste from "../../vista-previa/mi-espacio/Ajuste";
import AyudaInmediata from "../../vista-previa/mi-espacio/AyudaInmediata";
import Calendario from "../../vista-previa/mi-espacio/Calendario";
import Carga from "../../vista-previa/mi-espacio/Carga";
import Creditos from "../../vista-previa/mi-espacio/Creditos";
import DetalleAccion from "../../vista-previa/mi-espacio/DetalleAccion";
import EstadoPrograma from "../../vista-previa/mi-espacio/EstadoPrograma";
import Hoy from "../../vista-previa/mi-espacio/Hoy";
import Preferencias from "../../vista-previa/mi-espacio/Preferencias";
import ProgresoPantalla from "../../vista-previa/mi-espacio/Progreso";
import Semana from "../../vista-previa/mi-espacio/Semana";
import { T_SIN_FICHA } from "../../vista-previa/mi-espacio/textos";
import { armarAusencia, armarDatos, armarNovedades, hoyEn, type Contexto, type Filas } from "./datos";

const LENTO = 8000; // ms: «Sigue cargando…» con «Reintentar» (4.1.4)
const CLAVE_VISTAS = "rumbo-novedades-vistas";

// ---------------------------------------------------------------------------
// Lectura

const COLUMNAS = {
  participante: "id,correo,nombre,nombre_preferido,estado,zona_horaria,ocultar_gamificacion",
  ciclo: "id,numero,plan_id,inicio,semanas,fin,dia_revision,hora_videollamada,estado,pausa_motivo,pausa_desde,pausa_hasta,foco_inicial",
  programa: "id,version,estado,nota_cambios,vigente_desde,publicado_en",
  meta: "programa_id,clave,titulo,para_que,categoria,hitos,orden",
  ocurrencia:
    "id,programa_id,accion_id,meta_clave,meta_titulo,categoria,fecha,hora,duracion_min,titulo,instrucciones,version_corta,requiere_foto,vigente,anulada_motivo,anulada_en",
  registro: "ocurrencia_id,estado,version,explicacion,nota_revision,revisado_en",
  progreso: "creditos,nivel,racha,bono_siguiente",
  dia: "fecha,programadas,hechas,en_revision,creditos_acciones,bono,racha,en_suspenso",
  registroSemanal: "semana,carga,funciono,costo,cambiar,enviado_en",
  revision: "semana,que_funciono,que_ajustamos,foco,iniciada_en,publicada_en",
  ajuste: "id,creada_en,tipo,ocurrencias,desde,texto,estado,respuesta,cuenta_como_reorden,respondida_en",
} as const;

type Leido = { filas: Filas; ctx: Contexto; ausencia: Ausencia | null };

async function leerTodo(sb: Cliente, uid: string): Promise<Leido | "sin-ficha"> {
  const participante = datos(
    await sb.from("participantes").select(COLUMNAS.participante).eq("user_id", uid).neq("estado", "cerrado").maybeSingle(),
  ) as Filas["participante"] | null;
  if (!participante) return "sin-ficha";
  const ciclo = datos(
    await sb.from("ciclos").select(COLUMNAS.ciclo).eq("participante_id", participante.id).order("numero", { ascending: false }).limit(1).maybeSingle(),
  ) as Filas["ciclo"] | null;
  if (!ciclo) return "sin-ficha";
  const [programas, ocurrencias, registros, progreso, dias, registrosSemanales, revisiones, ajustes, planes, contexto, postulaciones] =
    await Promise.all([
      sb.from("programas").select(COLUMNAS.programa).eq("ciclo_id", ciclo.id).neq("estado", "borrador").order("version"),
      sb.from("ocurrencias").select(COLUMNAS.ocurrencia).eq("ciclo_id", ciclo.id).order("fecha").limit(5000),
      sb.from("registros").select(COLUMNAS.registro).eq("participante_id", participante.id).limit(5000),
      sb.from("progreso").select(COLUMNAS.progreso).eq("participante_id", participante.id).maybeSingle(),
      sb.from("progreso_diario").select(COLUMNAS.dia).eq("participante_id", participante.id).gte("fecha", ciclo.inicio).order("fecha"),
      sb.from("registros_semanales").select(COLUMNAS.registroSemanal).eq("ciclo_id", ciclo.id),
      sb.from("revisiones").select(COLUMNAS.revision).eq("ciclo_id", ciclo.id),
      sb.from("solicitudes_ajuste").select(COLUMNAS.ajuste).eq("ciclo_id", ciclo.id).order("creada_en", { ascending: false }),
      sb.from("planes").select("id,reordenes_por_ciclo"),
      sb.rpc("mi_contexto"),
      sb.rpc("estado_postulaciones"),
    ]);
  const progs = datos(programas) as Filas["programas"];
  const ids = progs.map((p) => p.id);
  const metas = ids.length ? (datos(await sb.from("metas").select(COLUMNAS.meta).in("programa_id", ids)) as Filas["metas"]) : [];
  // mi_contexto (07-etapa3.sql): si todavía no está, se calcula aquí con las mismas reglas.
  const c = contexto.error ? null : (contexto.data as { hoy?: Iso; dias_registro_tardio?: number; semanas_en_revision?: number[] } | null);
  const ctx: Contexto = {
    hoy: c?.hoy ?? hoyEn(participante.zona_horaria),
    ventana: c?.dias_registro_tardio ?? 7,
    semanasEnRevision: c?.semanas_en_revision ?? [],
  };
  const aus = postulaciones.error ? null : (postulaciones.data as { ausencia?: { hasta: Iso; texto: string | null } | null } | null)?.ausencia;
  return {
    filas: {
      participante,
      ciclo,
      programas: progs,
      metas,
      ocurrencias: datos(ocurrencias) as Filas["ocurrencias"],
      registros: datos(registros) as Filas["registros"],
      progreso: datos(progreso) as Filas["progreso"],
      dias: datos(dias) as Filas["dias"],
      registrosSemanales: datos(registrosSemanales) as Filas["registrosSemanales"],
      revisiones: datos(revisiones) as Filas["revisiones"],
      ajustes: datos(ajustes) as Filas["ajustes"],
      planes: datos(planes) as Filas["planes"],
    },
    ctx,
    ausencia: armarAusencia(aus),
  };
}

// Después de marcar: solo lo que cambia (registros y progreso).
async function leerRegistros(sb: Cliente, f: Filas): Promise<Filas> {
  const [registros, progreso, dias] = await Promise.all([
    sb.from("registros").select(COLUMNAS.registro).eq("participante_id", f.participante.id).limit(5000),
    sb.from("progreso").select(COLUMNAS.progreso).eq("participante_id", f.participante.id).maybeSingle(),
    sb.from("progreso_diario").select(COLUMNAS.dia).eq("participante_id", f.participante.id).gte("fecha", f.ciclo.inicio).order("fecha"),
  ]);
  return {
    ...f,
    registros: datos(registros) as Filas["registros"],
    progreso: datos(progreso) as Filas["progreso"],
    dias: datos(dias) as Filas["dias"],
  };
}

function leerVistas(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE_VISTAS) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

// ---------------------------------------------------------------------------
// Pantalla

type Estado =
  | { tipo: "cargando"; lento: boolean }
  | { tipo: "error" }
  | { tipo: "sin-ficha" }
  | ({ tipo: "listo" } & Leido);

export default function MiEspacioReal({ ruta }: { ruta: RutaPlataforma }) {
  const navegar = useNavigate();
  const { pathname, search } = useLocation();
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando", lento: false });
  const [vistas, setVistas] = useState<Set<string>>(() => new Set());
  const [enLinea, setEnLinea] = useState(true);
  const cliente = useRef<{ sb: Cliente; uid: string } | null>(null);
  const filas = useRef<Leido | null>(null);
  const destino = useRef(pathname + search);
  destino.current = pathname + search;

  const poner = useCallback((l: Leido) => {
    filas.current = l;
    setEstado({ tipo: "listo", ...l });
  }, []);

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setEstado({ tipo: "cargando", lento: false });
      try {
        const sb = await supabase();
        const { data } = await sb.auth.getSession();
        const uid = data.session?.user.id;
        if (!uid) {
          navegar(R_REAL.entrar, { replace: true, state: { destino: destino.current } });
          return;
        }
        cliente.current = { sb, uid };
        const r = await leerTodo(sb, uid);
        if (r === "sin-ficha") {
          const equipo = await sb.rpc("soy_equipo");
          if (!equipo.error && equipo.data === true) {
            navegar("/equipo/", { replace: true });
            return;
          }
          setEstado({ tipo: "sin-ficha" });
          return;
        }
        poner(r);
      } catch {
        if (!silencioso || !filas.current) setEstado({ tipo: "error" });
      }
    },
    [navegar, poner],
  );

  // Primera carga, preferencias de este dispositivo, conexión y vencimiento de la sesión.
  useEffect(() => {
    setVistas(leerVistas());
    void cargar();
    const alCambiar = () => setEnLinea(navigator.onLine);
    alCambiar();
    window.addEventListener("online", alCambiar);
    window.addEventListener("offline", alCambiar);
    let baja: (() => void) | undefined;
    void supabase().then((sb) => {
      const { data } = sb.auth.onAuthStateChange((evento) => {
        if (evento === "SIGNED_OUT")
          navegar(R_REAL.entrar, { replace: true, state: { aviso: "terminada", destino: destino.current } });
      });
      baja = () => data.subscription.unsubscribe();
    });
    return () => {
      window.removeEventListener("online", alCambiar);
      window.removeEventListener("offline", alCambiar);
      baja?.();
    };
  }, [cargar, navegar]);

  // «Sigue cargando» a los 8 s.
  useEffect(() => {
    if (estado.tipo !== "cargando" || estado.lento) return;
    const t = window.setTimeout(() => setEstado((e) => (e.tipo === "cargando" ? { tipo: "cargando", lento: true } : e)), LENTO);
    return () => window.clearTimeout(t);
  }, [estado]);

  const servidor = useMemo<Servidor>(() => {
    const sb = () => {
      if (!cliente.current) throw new Error("sin sesión");
      return cliente.current.sb;
    };
    // RPC que cambia registros: vuelve a leer registros y progreso y devuelve el progreso nuevo.
    const conProgreso = async (fn: string, args: Record<string, unknown>): Promise<Progreso> => {
      datos(await sb().rpc(fn, args));
      const actual = filas.current!;
      const nuevas = await leerRegistros(sb(), actual.filas);
      const l = { ...actual, filas: nuevas };
      poner(l);
      return armarDatos(nuevas, l.ctx).progreso;
    };
    const recargar = () => void cargar(true);
    return {
      registrar: (id: string, e: EstadoRegistro | null) => {
        if (e === null) return conProgreso("desmarcar_accion", { p_ocurrencia: id });
        if (e === "hecha" || e === "corta") return conProgreso("marcar_accion", { p_ocurrencia: id, p_version: e === "corta" ? "corta" : "completa" });
        if (e === "dejada") return conProgreso("dejar_pasar", { p_ocurrencia: id });
        return Promise.reject(new Error("estado no registrable"));
      },
      registrarEvidencia: (id, explicacion) =>
        conProgreso("registrar_evidencia", { p_ocurrencia: id, p_foto_ruta: null, p_explicacion: explicacion }),
      eliminarEvidencia: (id) => conProgreso("eliminar_evidencia", { p_ocurrencia: id }),
      guardarRegistroSemanal: async (semana, d, enviar) => {
        datos(
          await sb().rpc("guardar_registro_semanal", {
            p_semana: semana,
            p: { carga: d.carga ?? "", funciono: d.funciono, costo: d.costo, cambiar: d.cambiar },
            p_enviar: enviar,
          }),
        );
        recargar();
      },
      pedirAjuste: async (d) => {
        const r = datos(
          await sb().rpc("pedir_ajuste", {
            p: { tipo: d.tipo, ocurrencias: d.ocurrencias, desde: d.desde, texto: d.texto, pide_reorden: d.pideReorden },
          }),
        ) as { id: string };
        recargar();
        const hoy = filas.current?.ctx.hoy ?? d.desde;
        const s: SolicitudAjuste = { id: r.id, tipo: d.tipo, acciones: d.ocurrencias, desde: d.desde, detalle: d.texto, enviadaEl: hoy, estado: "enviada", respuesta: null };
        return s;
      },
      guardarNombre: async (nombre) => {
        datos(await sb().rpc("actualizar_preferencias", { p: { nombre_preferido: nombre } }));
        recargar();
      },
      mostrarCreditos: async (mostrar) => {
        datos(await sb().rpc("actualizar_preferencias", { p: { ocultar_gamificacion: !mostrar } }));
        recargar();
      },
      pedirDerecho: async (tipo, detalle) => {
        const r = datos(await sb().rpc("pedir_derecho", { p_tipo: tipo, p_detalle: detalle })) as { fecha_limite?: Iso | null } | null;
        return r?.fecha_limite ?? null;
      },
      exportar: async () => datos(await sb().rpc("exportar_mis_datos")),
      verNovedad: (id) => {
        setVistas((v) => {
          const n = new Set(v).add(id);
          try {
            localStorage.setItem(CLAVE_VISTAS, JSON.stringify([...n].slice(-200)));
          } catch {
            /* sin almacenamiento */
          }
          return n;
        });
      },
      recargar,
    };
  }, [cargar, poner]);

  const espacio = useMemo<Espacio | null>(() => {
    if (estado.tipo !== "listo") return null;
    const d = armarDatos(estado.filas, estado.ctx);
    const p = estado.filas.participante;
    return {
      real: true,
      R: R_REAL,
      hoy: estado.ctx.hoy,
      ventana: estado.ctx.ventana,
      participante: { nombre: d.nombre, correo: p.correo, zonaHoraria: p.zona_horaria, mostrarCreditosEnHoy: !p.ocultar_gamificacion },
      ciclo: d.ciclo,
      esc: d.esc,
      metasTodas: d.metasTodas,
      progreso: d.progreso,
      novedades: armarNovedadesSeguras(estado, d.esc.ocurrencias, vistas),
      notasCambios: d.notasCambios,
      semanasEnRevision: estado.ctx.semanasEnRevision,
      ausencia: estado.ausencia,
      servidor,
    };
  }, [estado, vistas, servidor]);

  const novedades = espacio ? [...new Set(espacio.novedades.map((n) => (n.destino === "ajuste" ? "mas" : n.destino === "accion" ? "calendario" : "semana")))] : [];
  const banda = !enLinea ? (
    <BandaSinConexion />
  ) : espacio?.ausencia ? (
    <Banda rol="status" icono="info">
      {espacio.ausencia.banda}
    </Banda>
  ) : undefined;

  return (
    <EspacioContexto.Provider value={espacio ?? ESPACIO_CARGANDO}>
      <EstructuraApp
        tipo="mi-espacio"
        rutas={RUTAS_NAV}
        seccion={ruta.seccion}
        activo={ruta.activo}
        novedades={novedades}
        banda={banda}
      >
        {estado.tipo === "cargando" ? (
          <Carga estado={estado.lento ? "cargando-lento" : "cargando"} alReintentar={() => void cargar()} />
        ) : estado.tipo === "error" ? (
          <Carga estado="error" alReintentar={() => void cargar()} />
        ) : estado.tipo === "sin-ficha" ? (
          <SinFicha />
        ) : (
          <PantallaReal ruta={ruta} espacio={espacio!} />
        )}
      </EstructuraApp>
    </EspacioContexto.Provider>
  );
}

// Novedades sin romper la pantalla si algún dato viene incompleto.
function armarNovedadesSeguras(e: { filas: Filas; ctx: Contexto }, lista: Parameters<typeof armarNovedades>[1], vistas: Set<string>) {
  try {
    return armarNovedades(e.filas, lista, e.ctx.hoy, vistas, R_REAL);
  } catch {
    return [];
  }
}

const RUTAS_NAV = {
  hoy: R_REAL.hoy,
  calendario: R_REAL.calendario,
  progreso: R_REAL.progreso,
  semana: R_REAL.semana,
  ajuste: R_REAL.ajuste,
  preferencias: R_REAL.preferencias,
  salir: R_REAL.salir,
};

// Mientras carga: rutas reales y sin datos de ejemplo visibles (solo se muestra «Cargando…»).
const ESPACIO_CARGANDO: Espacio = { ...ESPACIO_PREVIA, real: true, R: R_REAL, novedades: [], ausencia: null };

// Qué pantalla corresponde a la ruta. En mi-espacio/ decide el estado del ciclo (4.3).
function PantallaReal({ ruta, espacio }: { ruta: RutaPlataforma; espacio: Espacio }): ReactNode {
  switch (ruta.ruta) {
    case "/mi-espacio/":
      return <Inicio espacio={espacio} />;
    case "/mi-espacio/calendario/":
      return <Calendario />;
    case "/mi-espacio/accion/":
      return <DetalleAccion />;
    case "/mi-espacio/progreso/":
      return <ProgresoPantalla />;
    case "/mi-espacio/progreso/creditos/":
      return <Creditos />;
    case "/mi-espacio/semana/":
      return <Semana />;
    case "/mi-espacio/ajuste/":
      return <Ajuste />;
    case "/mi-espacio/preferencias/":
      return <Preferencias />;
    case "/mi-espacio/preferencias/eliminar/":
      return <Preferencias estado="eliminar" />;
    case "/mi-espacio/ayuda/":
      return <AyudaInmediata />;
    default:
      return <Inicio espacio={espacio} />;
  }
}

function Inicio({ espacio }: { espacio: Espacio }) {
  const { ciclo, hoy } = espacio;
  if (ciclo.estado === "cerrado") return <EstadoPrograma estado="cerrado" />;
  if (ciclo.estado === "pausa") return <EstadoPrograma estado={ciclo.pausa?.motivo === "cuidado" ? "pausa-cuidado" : "pausa-pedida"} />;
  if (ciclo.estado === "preparacion") return <EstadoPrograma estado={ciclo.numero > 1 ? "ciclo-2" : "preparacion"} />;
  if (hoy < ciclo.inicio) return <EstadoPrograma estado="inicio-futuro" />;
  return <Hoy />;
}

function SinFicha() {
  return (
    <div className="me-pantalla me-pantalla--angosta">
      <div className="aviso me-error-global">
        <Icono nombre="info" tamaño={20} className="aviso-icono" />
        <div className="aviso-cuerpo">
          <h1 className="aviso-titulo me-h1--aviso">{T_SIN_FICHA.titulo}</h1>
          <p>{T_SIN_FICHA.texto}</p>
          <div className="acciones">
            <Link to={R_REAL.salir} className="boton boton--secundario">
              {T_SIN_FICHA.salir}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
