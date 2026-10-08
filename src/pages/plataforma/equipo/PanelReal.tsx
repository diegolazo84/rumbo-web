// Panel real de Diego (etapa 3, plataforma 5): las pantallas de la vista previa en modo real
// (PanelContexto) con los datos de la base. Acceso (5.12 y 9.7):
// - Sin sesión: lleva a mi-espacio/entrar/ y recuerda la ruta de destino.
// - Cuenta que no es del equipo (soy_equipo): «Esta cuenta no tiene acceso al panel».
// - Sin aal2: pide el segundo factor TOTP (o lo registra si no hay ninguno). Las políticas no
//   muestran nada sin aal2, así que nada se lee antes.
// Una persona que opera sola: se lee todo lo que necesitan Hoy y los contadores de una vez; las
// fichas, el constructor y la revisión leen su detalle al abrirse.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EstructuraApp } from "../../../components/app";
import { datos, supabase, type Cliente } from "../../../lib/supabase";
import type { RutaPlataforma } from "../rutas";
import { R_REAL } from "../../vista-previa/mi-espacio/espacio";
import Carga from "../../vista-previa/mi-espacio/Carga";
import { PanelContexto, R_PANEL_REAL, modoReal } from "../../vista-previa/panel/modo";
import { COLUMNAS_PANEL, contadoresReales, hoyChile, type DatosPanel } from "./datos";
import { DatosContexto, type PanelDatos } from "./comun";
import { PedirSegundoFactor, SinAcceso, factoresTotp } from "./Mfa";

const Pantallas = lazy(() => import("./pantallas"));

const LENTO = 8000; // ms: «Sigue cargando…» con «Reintentar» (4.1.4)

// Destinos de la navegación del panel (EstructuraApp tipo "panel").
const RUTAS_NAV = {
  hoy: R_PANEL_REAL.hoy,
  solicitudes: R_PANEL_REAL.solicitudes,
  participantes: R_PANEL_REAL.participantes,
  revisar: R_PANEL_REAL.revisar,
  mas: R_PANEL_REAL.mas,
};

// ---------------------------------------------------------------------------
// Lectura

export async function leerPanel(sb: Cliente): Promise<DatosPanel> {
  const C = COLUMNAS_PANEL;
  const [solicitudes, participantes, ciclos, programas, ajustes, revisiones, evidencias, mensajes, peticiones, planes, operacion, feriados] = await Promise.all([
    sb.from("solicitudes").select(C.solicitud).order("creada_en", { ascending: true }),
    sb.from("participantes").select(C.participante).order("creado_en", { ascending: true }),
    sb.from("ciclos").select(C.ciclo),
    sb.from("programas").select(C.programa),
    sb.from("solicitudes_ajuste").select(C.ajuste).order("creada_en", { ascending: true }),
    sb.from("revisiones").select(C.revision),
    sb.from("registros").select(C.evidencia).eq("estado", "en_revision").order("creado_en", { ascending: true }),
    sb.from("mensajes_contacto").select(C.mensaje).eq("estado", "nuevo").order("creado_en", { ascending: true }),
    sb.from("peticiones_derechos").select(C.peticion).eq("estado", "abierta").order("recibida_en", { ascending: true }),
    sb.from("planes").select("id,reordenes_por_ciclo"),
    sb.from("ajustes_operacion").select(C.operacion).maybeSingle(),
    sb.from("feriados").select("fecha"),
  ]);
  return {
    hoy: hoyChile(),
    solicitudes: datos(solicitudes) as DatosPanel["solicitudes"],
    participantes: datos(participantes) as DatosPanel["participantes"],
    ciclos: datos(ciclos) as DatosPanel["ciclos"],
    programas: datos(programas) as DatosPanel["programas"],
    ajustes: datos(ajustes) as DatosPanel["ajustes"],
    revisiones: datos(revisiones) as DatosPanel["revisiones"],
    evidencias: datos(evidencias) as DatosPanel["evidencias"],
    mensajes: datos(mensajes) as DatosPanel["mensajes"],
    peticiones: datos(peticiones) as DatosPanel["peticiones"],
    planes: datos(planes) as DatosPanel["planes"],
    operacion: datos(operacion) as DatosPanel["operacion"],
    feriados: (datos(feriados) as { fecha: string }[]).map((f) => f.fecha),
  };
}

type Estado =
  | { tipo: "cargando"; lento: boolean }
  | { tipo: "error" }
  | { tipo: "sin-acceso" }
  | { tipo: "segundo-factor"; verificados: string[] }
  | { tipo: "listo"; d: DatosPanel };

export default function PanelReal({ ruta }: { ruta: RutaPlataforma }) {
  const navegar = useNavigate();
  const { pathname, search, hash } = useLocation();
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando", lento: false });
  const cliente = useRef<Cliente | null>(null);
  const destino = useRef(pathname + search + hash);
  destino.current = pathname + search + hash;

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setEstado({ tipo: "cargando", lento: false });
      try {
        const sb = await supabase();
        cliente.current = sb;
        const { data } = await sb.auth.getSession();
        if (!data.session) {
          navegar(R_REAL.entrar, { replace: true, state: { destino: destino.current } });
          return;
        }
        const equipo = await sb.rpc("soy_equipo");
        if (datos(equipo) !== true) {
          setEstado({ tipo: "sin-acceso" });
          return;
        }
        const nivel = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
        if (nivel.data?.currentLevel !== "aal2") {
          const { verificados } = await factoresTotp(sb);
          setEstado({ tipo: "segundo-factor", verificados: verificados.map((f) => f.id) });
          return;
        }
        setEstado({ tipo: "listo", d: await leerPanel(sb) });
      } catch {
        setEstado((e) => (silencioso && e.tipo === "listo" ? e : { tipo: "error" }));
      }
    },
    [navegar],
  );

  // Primera carga y vencimiento de la sesión.
  useEffect(() => {
    void cargar();
    let baja: (() => void) | undefined;
    void supabase().then((sb) => {
      const { data } = sb.auth.onAuthStateChange((evento) => {
        if (evento === "SIGNED_OUT") navegar(R_REAL.entrar, { replace: true, state: { aviso: "terminada", destino: destino.current } });
      });
      baja = () => data.subscription.unsubscribe();
    });
    return () => baja?.();
  }, [cargar, navegar]);

  // «Sigue cargando» a los 8 s.
  useEffect(() => {
    if (estado.tipo !== "cargando" || estado.lento) return;
    const t = window.setTimeout(() => setEstado((e) => (e.tipo === "cargando" ? { tipo: "cargando", lento: true } : e)), LENTO);
    return () => window.clearTimeout(t);
  }, [estado]);

  const listo = estado.tipo === "listo" ? estado.d : null;
  const modo = useMemo(() => modoReal(listo?.hoy ?? hoyChile(), listo?.feriados ?? []), [listo]);
  const valor = useMemo<PanelDatos | null>(
    () => (listo && cliente.current ? { sb: cliente.current, d: listo, recargar: () => cargar(true) } : null),
    [listo, cargar],
  );
  const contadores = useMemo(() => (listo ? contadoresReales(listo, R_PANEL_REAL) : undefined), [listo]);

  let cuerpo: ReactNode;
  if (estado.tipo === "cargando") cuerpo = <Carga estado={estado.lento ? "cargando-lento" : "cargando"} alReintentar={() => void cargar()} />;
  else if (estado.tipo === "error") cuerpo = <Carga estado="error" alReintentar={() => void cargar()} />;
  else if (estado.tipo === "sin-acceso") cuerpo = <SinAcceso />;
  else if (estado.tipo === "segundo-factor")
    cuerpo = <PedirSegundoFactor sb={cliente.current!} verificados={estado.verificados} onListo={() => void cargar()} />;
  else
    cuerpo = (
      <DatosContexto.Provider value={valor}>
        <Suspense fallback={<Carga estado="cargando" />}>
          <Pantallas ruta={ruta} />
        </Suspense>
      </DatosContexto.Provider>
    );

  return (
    <PanelContexto.Provider value={modo}>
      <EstructuraApp
        tipo="panel"
        rutas={estado.tipo === "listo" ? RUTAS_NAV : {}}
        seccion={ruta.seccion}
        activo={ruta.activo}
        contadores={contadores}
        sinNavegacion={estado.tipo !== "listo"}
      >
        {cuerpo}
      </EstructuraApp>
    </PanelContexto.Provider>
  );
}
