// Mi espacio real (etapa 3, plataforma 4 y 6): las mismas pantallas de la vista previa con los
// datos de la persona. Lee por RLS (solo lo suyo; nunca borradores ni acciones) y escribe solo
// con las RPC de 6.7. El marco (EstructuraApp) es el mismo de la vista previa, sin «Ejemplo».
// - Sin sesión: lleva a mi-espacio/entrar/ y recuerda la ruta de destino.
// - La sesión vence: tostada «Tu sesión terminó…» en entrar/ (4.2.5).
// - Cuenta del equipo sin ficha de participante: lleva al panel.
import { rutaFoto } from "../../../lib/foto-privada";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Banda, BandaSinConexion, EstructuraApp, Icono } from "../../../components/app";
import type { EstadoRegistro, SolicitudAjuste } from "../../../data/ejemplo-app";
import type { Iso } from "../../../lib/fechas";
import { datos, supabase, type Cliente } from "../../../lib/supabase";
import type { RutaPlataforma } from "../rutas";
import { ESPACIO_PREVIA, EspacioContexto, R_REAL, type Ausencia, type CoachEspacio, type Espacio, type VideollamadaEspacio, type Progreso, type Servidor } from "../../vista-previa/mi-espacio/espacio";
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
import MisAvisos from "../../vista-previa/mi-espacio/MisAvisos";
import { categoriaDe, type Aviso } from "../../vista-previa/mi-espacio/avisos/datos";
import Acompanamiento from "../../vista-previa/mi-espacio/Acompanamiento";
import Comunidad from "../../vista-previa/mi-espacio/Comunidad";
import CrearPublicacion from "../../vista-previa/mi-espacio/CrearPublicacion";
import GruposComunidad from "../../vista-previa/mi-espacio/GruposComunidad";
import LoQueViene from "../../vista-previa/mi-espacio/LoQueViene";
import MisMetas from "../../vista-previa/mi-espacio/MisMetas";
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
  registro: "ocurrencia_id,estado,version,explicacion,nota_revision,revisado_en,foto_ruta,foto_depurada_en",
  progreso: "creditos,nivel,racha,bono_siguiente",
  dia: "fecha,programadas,hechas,en_revision,creditos_acciones,bono,racha,en_suspenso",
  registroSemanal: "semana,carga,funciono,costo,cambiar,enviado_en",
  revision: "semana,que_funciono,que_ajustamos,foco,iniciada_en,publicada_en",
  ajuste: "id,creada_en,tipo,ocurrencias,desde,texto,estado,respuesta,cuenta_como_reorden,respondida_en",
} as const;

type Leido = {
  filas: Filas;
  ctx: Contexto;
  ausencia: Ausencia | null;
  coach: CoachEspacio | null;
  videollamadas: VideollamadaEspacio[];
  fotos: boolean;
  avisos: Aviso[] | null;
  comunidad: boolean;
};

async function leerTodo(sb: Cliente, uid: string): Promise<Leido | "sin-ficha"> {
  const participante = datos(
    await sb.from("participantes").select(COLUMNAS.participante).eq("user_id", uid).neq("estado", "cerrado").maybeSingle(),
  ) as Filas["participante"] | null;
  if (!participante) return "sin-ficha";
  const ciclo = datos(
    await sb.from("ciclos").select(COLUMNAS.ciclo).eq("participante_id", participante.id).order("numero", { ascending: false }).limit(1).maybeSingle(),
  ) as Filas["ciclo"] | null;
  if (!ciclo) return "sin-ficha";
  const [programas, ocurrencias, registros, progreso, dias, registrosSemanales, revisiones, ajustes, planes, contexto, postulaciones, coach, llamadas, moduloFotos, avisos, moduloComunidad] =
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
      // A3 y C2: si la migración todavía no está en la base, «Tu coach» queda genérico y sin videollamadas.
      sb.rpc("mi_coach"),
      sb.from("videollamadas").select("semana,programada_para,enlace,estado").eq("ciclo_id", ciclo.id).order("semana"),
      // Módulo «fotos» (A4): mientras el dueño no lo habilite, la subida no se muestra.
      sb.rpc("modulo_visible", { p_clave: "fotos" }),
      // Mis avisos (A5): los propios, por RLS. Si no se pueden leer, la pantalla lo dice.
      leerAvisos(sb),
      sb.rpc("modulo_visible", { p_clave: "comunidad" }),
    ]);
  const progs = datos(programas) as Filas["programas"];
  const ids = progs.map((p) => p.id);
  const metas = ids.length ? (datos(await sb.from("metas").select(COLUMNAS.meta).in("programa_id", ids)) as Filas["metas"]) : [];
  // mi_contexto (migrations/20261008000009_etapa3.sql): si todavía no está, se calcula aquí con las mismas reglas.
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
    coach: armarCoach(coach.error ? null : coach.data),
    videollamadas: llamadas.error ? [] : armarVideollamadas(llamadas.data),
    fotos: !moduloFotos.error && moduloFotos.data === true,
    avisos,
    comunidad: !moduloComunidad.error && moduloComunidad.data === true,
  };
}

const COLUMNAS_AVISO = "id,tipo,titulo,enlace,creado_en,leido_en";
async function leerAvisos(sb: Cliente): Promise<Aviso[] | null> {
  const r = await sb.from("avisos").select(COLUMNAS_AVISO).like("enlace", "/mi-espacio/%").order("creado_en", { ascending: false }).limit(200);
  if (r.error) return null;
  const filas = (r.data ?? []) as { id: string; tipo: string; titulo: string; enlace: string; creado_en: string; leido_en: string | null }[];
  return filas.map((f) => ({ id: f.id, tipo: f.tipo, titulo: f.titulo, enlace: f.enlace, creadoEn: f.creado_en, leidoEn: f.leido_en }));
}

function armarCoach(d: unknown): CoachEspacio | null {
  const c = d as { nombre?: string | null; presentacion?: string | null } | null;
  const nombre = c?.nombre?.trim();
  return nombre ? { nombre, presentacion: c?.presentacion?.trim() || null } : null;
}

function armarVideollamadas(d: unknown): VideollamadaEspacio[] {
  const filas = (Array.isArray(d) ? d : []) as { semana: number; programada_para: string; enlace: string; estado: VideollamadaEspacio["estado"] }[];
  return filas.map((f) => ({ semana: f.semana, programadaPara: f.programada_para, enlace: f.enlace, estado: f.estado }));
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

    // Fotos privadas (bucket «evidencias»). Orden pensado para no dejar archivos sueltos ni
    // registros que apunten a un archivo que no existe:
    //   subir → registrar en la base (si la base rechaza, se borra lo subido) → borrar la anterior;
    //   quitar → la base primero → borrar el archivo.
    // Al final se revisa la carpeta de la acción y se borra lo que no sea la foto vigente.
    const BUCKET = "evidencias";
    const registroDe = (id: string) => filas.current?.filas.registros.find((r) => r.ocurrencia_id === id);
    const carpeta = (id: string) => `${filas.current!.filas.participante.id}/${id}`;
    const borrarArchivos = async (rutas: string[]) => {
      if (!rutas.length) return;
      const { error } = await sb().storage.from(BUCKET).remove(rutas);
      if (error) throw error;
    };
    const ordenarCarpeta = async (id: string) => {
      try {
        const vigente = registroDe(id)?.foto_ruta ?? null;
        const { data, error } = await sb().storage.from(BUCKET).list(carpeta(id));
        if (error) return;
        const sobran = (data ?? []).map((f) => `${carpeta(id)}/${f.name}`).filter((r) => r !== vigente);
        await borrarArchivos(sobran);
      } catch {
        /* se reintenta la próxima vez que se suba o quite una foto de esta acción */
      }
    };
    const releer = async (): Promise<Progreso> => {
      const actual = filas.current!;
      const nuevas = await leerRegistros(sb(), actual.filas);
      const l = { ...actual, filas: nuevas };
      poner(l);
      return armarDatos(nuevas, l.ctx).progreso;
    };

    return {
      registrar: (id: string, e: EstadoRegistro | null) => {
        if (e === null) {
          // Desmarcar borra el registro: si tenía una foto opcional, su archivo también se borra.
          const conFoto = !!registroDe(id)?.foto_ruta;
          return conProgreso("desmarcar_accion", { p_ocurrencia: id }).then(async (p) => {
            if (conFoto) await ordenarCarpeta(id);
            return p;
          });
        }
        if (e === "hecha" || e === "corta") return conProgreso("marcar_accion", { p_ocurrencia: id, p_version: e === "corta" ? "corta" : "completa" });
        if (e === "dejada") return conProgreso("dejar_pasar", { p_ocurrencia: id });
        return Promise.reject(new Error("estado no registrable"));
      },
      registrarEvidencia: (id, explicacion) =>
        conProgreso("registrar_evidencia", { p_ocurrencia: id, p_foto_ruta: null, p_explicacion: explicacion }),
      eliminarEvidencia: async (id) => {
        const ruta = registroDe(id)?.foto_ruta ?? null;
        datos(await sb().rpc("eliminar_evidencia", { p_ocurrencia: id }));
        const p = await releer();
        if (ruta) await borrarArchivos([ruta]).catch(() => undefined);
        await ordenarCarpeta(id);
        return p;
      },
      subirFoto: async (id, foto, modo) => {
        const anterior = registroDe(id)?.foto_ruta ?? null;
        const ruta = rutaFoto(filas.current!.filas.participante.id, id, crypto.randomUUID());
        const subida = await sb().storage.from(BUCKET).upload(ruta, foto, { contentType: "image/webp", upsert: false, cacheControl: "60" });
        if (subida.error) throw subida.error;
        try {
          datos(
            modo === "evidencia"
              ? await sb().rpc("registrar_evidencia", { p_ocurrencia: id, p_foto_ruta: ruta, p_explicacion: null })
              : await sb().rpc("adjuntar_foto", { p_ocurrencia: id, p_foto_ruta: ruta }),
          );
        } catch (e) {
          // La base no la aceptó (plazo, tope de 3 archivos, acción anulada…): no queda suelta.
          // Si fue un corte de red, puede que sí la haya guardado: se comprueba antes de borrar.
          const guardada = await releer()
            .then(() => registroDe(id)?.foto_ruta === ruta)
            .catch(() => true); // sin poder comprobar, no se borra: la limpieza de la carpeta lo ordena después
          if (!guardada) await borrarArchivos([ruta]).catch(() => undefined);
          throw e;
        }
        const p = await releer();
        if (anterior && anterior !== ruta) await borrarArchivos([anterior]).catch(() => undefined);
        await ordenarCarpeta(id);
        return p;
      },
      quitarFoto: async (id) => {
        const ruta = registroDe(id)?.foto_ruta ?? null;
        datos(await sb().rpc("quitar_foto", { p_ocurrencia: id }));
        const p = await releer();
        if (ruta) await borrarArchivos([ruta]).catch(() => undefined);
        await ordenarCarpeta(id);
        return p;
      },
      urlFoto: async (ruta) => {
        const { data, error } = await sb().storage.from(BUCKET).createSignedUrl(ruta, 300);
        if (error || !data?.signedUrl) throw error ?? new Error("sin enlace");
        return data.signedUrl;
      },
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
      marcarAvisos: async (ids) => {
        datos(await sb().rpc("marcar_avisos_leidos", { p_ids: ids }));
        const actual = filas.current;
        if (!actual?.avisos) return;
        const ahora = new Date().toISOString();
        const todos = ids === null;
        const marcados = new Set(ids ?? []);
        poner({ ...actual, avisos: actual.avisos.map((a) => (!a.leidoEn && (todos || marcados.has(a.id)) ? { ...a, leidoEn: ahora } : a)) });
      },
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
      coach: estado.coach,
      videollamadas: estado.videollamadas,
      servidor,
      fotos: estado.fotos,
      // Con la Comunidad cerrada, sus avisos no se muestran ni cuentan en la campana.
      avisos: estado.comunidad ? estado.avisos : (estado.avisos?.filter((a) => categoriaDe(a.tipo) !== "comunidad") ?? null),
      comunidad: estado.comunidad,
    };
  }, [estado, vistas, servidor]);

  // Punto de novedad: respuestas a ajustes y acciones en Mi plan; revisiones en Mi acompañamiento.
  const novedades = espacio
    ? [...new Set(espacio.novedades.map((n) => (n.destino === "ajuste" || n.destino === "accion" ? "plan" : "acompanamiento")))]
    : [];
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
        avisos={{ href: R_REAL.avisos, sinLeer: espacio?.avisos?.filter((a) => !a.leidoEn).length ?? 0 }}
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
  rumbo: R_REAL.hoy,
  plan: R_REAL.calendario,
  acompanamiento: R_REAL.semana,
  comunidad: R_REAL.comunidad,
  logros: R_REAL.progreso,
  ajuste: R_REAL.ajuste,
  preferencias: R_REAL.preferencias,
  misDatos: R_REAL.misDatos,
  loQueViene: R_REAL.loQueViene,
  salir: R_REAL.salir,
};

// Mientras carga: rutas reales y sin datos de ejemplo visibles (solo se muestra «Cargando…»).
const ESPACIO_CARGANDO: Espacio = { ...ESPACIO_PREVIA, real: true, R: R_REAL, novedades: [], ausencia: null, avisos: [], comunidad: false };

// Qué pantalla corresponde a la ruta. En mi-espacio/ decide el estado del ciclo (4.3).
function PantallaReal({ ruta, espacio }: { ruta: RutaPlataforma; espacio: Espacio }): ReactNode {
  switch (ruta.ruta) {
    case "/mi-espacio/":
      return <Inicio espacio={espacio} />;
    case "/mi-espacio/plan/":
      return <Calendario />;
    case "/mi-espacio/plan/metas/":
      return <MisMetas />;
    case "/mi-espacio/plan/accion/":
      return <DetalleAccion />;
    case "/mi-espacio/plan/ajuste/":
      return <Ajuste />;
    case "/mi-espacio/acompanamiento/":
      return <Acompanamiento />;
    case "/mi-espacio/comunidad/":
      return <Comunidad />;
    case "/mi-espacio/comunidad/crear/":
      return <CrearPublicacion />;
    case "/mi-espacio/comunidad/grupos/":
      return <GruposComunidad />;
    case "/mi-espacio/logros/":
      return <ProgresoPantalla />;
    case "/mi-espacio/logros/creditos/":
      return <Creditos />;
    case "/mi-espacio/avisos/":
      return <MisAvisos />;
    case "/mi-espacio/lo-que-viene/":
      return <LoQueViene />;
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
