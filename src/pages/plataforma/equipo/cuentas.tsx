// Cuentas creadas (dueño, con TOTP; Diego, 18-nov-2026): toda persona que creó su cuenta (Google o
// código al correo), con su plan actual: Gratis, Con programa o Sin completar (entró pero no armó su
// punto de partida). «Dar acceso completo» crea una solicitud ya llena desde la cuenta gratis
// (dar_acceso_completo) y abre su ficha: ahí sigue el camino de siempre (Registrar acuerdo → enlace
// privado → la persona acepta → Crear su espacio). No dar acceso = la persona sigue en gratis.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CampoSelect, CampoTexto } from "../../../components/form";
import { nuevoToken } from "../../../lib/api";
import { datos } from "../../../lib/supabase";
import { planes } from "../../../data/rumbo";
import Carga from "../../vista-previa/mi-espacio/Carga";
import { Cabeza, Seccion } from "../../vista-previa/panel/comun";
import { useDatosPanel } from "./comun";

export const R_CUENTAS = "/equipo/cuentas/";

type Plan = "prueba" | "gratis" | "programa" | "sin_completar";
type FilaCuenta = {
  user_id: string;
  correo: string;
  nombre: string | null;
  origen: "google" | "correo";
  creada_en: string;
  ultima_entrada: string | null;
  plan: Plan;
  prueba_hasta?: string | null;
  participante_id: string | null;
  meta: string | null;
  area: string | null;
  dias_con_acciones_7: number;
  acciones_hechas: number;
  acceso_pedido_en: string | null;
  apoyo_pedido: "coach" | "cercano" | "nose" | null;
  solicitud_id: string | null;
  solicitud_estado: string | null;
};

export const T_CUENTAS = {
  ojo: "Panel",
  titulo: "Cuentas creadas",
  enlace: "Cuentas creadas",
  bajada: "Quienes crearon su cuenta en Mi espacio. Las cuentas quedan en gratis hasta que les des acceso completo.",
  sinPermiso: "Solo el dueño ve las cuentas creadas.",
  sinMigracion: "Falta aplicar la migración de la cuenta gratis (20261204000000_cuenta_gratis). Mientras, no hay cuentas que mostrar.",
  buscar: "Buscar por correo o nombre",
  filtro: "Plan",
  todos: "Todos",
  planes: { prueba: "En prueba de 14 días", gratis: "Gratis", programa: "Con programa", sin_completar: "Sin completar" } as Record<Plan, string>,
  pidieron: "Pidieron acompañamiento",
  pruebaHasta: (fecha: string) => `Prueba completa hasta el ${fecha}. Al final de su primera semana le toca una revisión escrita (aparece en tu bandeja).`,
  lista: "Cuentas",
  vacio: "Todavía no hay cuentas con estos filtros.",
  origen: { google: "Google", correo: "Código al correo" },
  creada: "Creada",
  ultima: "Última entrada",
  nunca: "sin entrar",
  actividad: (dias: number, total: number) => `${dias} de los últimos 7 días con acciones · ${total} acciones hechas en total`,
  pidio: (apoyo: string) => `Pidió acompañamiento${apoyo ? ` (${apoyo})` : ""}`,
  apoyos: { coach: "Con acompañamiento", cercano: "Acompañamiento cercano", nose: "aún no sabe cuál" } as Record<string, string>,
  dar: "Dar acceso completo",
  darAyuda: "Se crea su solicitud con la meta y los días de su cuenta. Después registras el acuerdo (plan, precio e inicio) como siempre.",
  plan: "Plan que conversaron",
  confirmar: "Crear su solicitud",
  creando: "Creando…",
  cancelar: "Cancelar",
  verSolicitud: "Ver su solicitud",
  verFicha: "Ver su ficha",
  sinCompletar: "Entró, pero todavía no armó su punto de partida.",
  errores: {
    abierta: "Esta cuenta ya tiene una solicitud abierta.",
    programa: "Esta cuenta ya tiene un programa.",
    otro: "No se pudo crear la solicitud. Inténtalo de nuevo.",
  },
  estadoSolicitud: {
    recibida: "Solicitud recibida",
    en_revision: "Solicitud en revisión",
    respondida: "Solicitud respondida",
    acordada: "Acuerdo enviado",
    con_espacio: "Con espacio",
    cerrada: "Solicitud cerrada",
    retirada: "Solicitud retirada",
  } as Record<string, string>,
};

const fecha = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", year: "numeric" });
const fechaHora = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function CuentasReal() {
  const { sb, recargar } = useDatosPanel();
  const navegar = useNavigate();
  const [filas, setFilas] = useState<FilaCuenta[] | null>(null);
  const [estado, setEstado] = useState<"cargando" | "listo" | "sin-permiso" | "sin-migracion" | "error">("cargando");
  const [buscar, setBuscar] = useState("");
  const [plan, setPlan] = useState<"" | Plan | "pidieron">("");

  const cargar = useCallback(async () => {
    setEstado("cargando");
    const r = await sb.rpc("cuentas_creadas");
    if (r.error) {
      const m = r.error.message ?? "";
      setEstado(/no_autorizado/.test(m) ? "sin-permiso" : r.error.code === "PGRST202" || /cuentas_creadas/.test(m) ? "sin-migracion" : "error");
      return;
    }
    setFilas((r.data as FilaCuenta[]) ?? []);
    setEstado("listo");
  }, [sb]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const visibles = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return (filas ?? []).filter(
      (f) =>
        (!q || f.correo.includes(q) || (f.nombre ?? "").toLowerCase().includes(q)) &&
        (!plan || (plan === "pidieron" ? !!f.acceso_pedido_en && (f.plan === "gratis" || f.plan === "prueba") : f.plan === plan)),
    );
  }, [filas, buscar, plan]);
  const cuenta = (p: Plan) => (filas ?? []).filter((f) => f.plan === p).length;

  if (estado === "cargando") return <Carga estado="cargando" />;
  if (estado === "error") return <Carga estado="error" alReintentar={() => void cargar()} />;
  if (estado !== "listo")
    return (
      <div className="pa-pantalla pa-pantalla--angosta">
        <Cabeza ojo={T_CUENTAS.ojo} titulo={T_CUENTAS.titulo} />
        <p className="pa-vacio">{estado === "sin-permiso" ? T_CUENTAS.sinPermiso : T_CUENTAS.sinMigracion}</p>
      </div>
    );

  return (
    <div className="pa-pantalla">
      <Cabeza ojo={T_CUENTAS.ojo} titulo={T_CUENTAS.titulo} bajada={T_CUENTAS.bajada}>
        <div className="pa-cuentas-filtros">
          <CampoTexto id="cuentas-buscar" etiqueta={T_CUENTAS.buscar} type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          <CampoSelect id="cuentas-plan" etiqueta={T_CUENTAS.filtro} value={plan} onChange={(e) => setPlan(e.target.value as typeof plan)}>
            <option value="">{`${T_CUENTAS.todos} (${filas?.length ?? 0})`}</option>
            {(Object.keys(T_CUENTAS.planes) as Plan[]).map((p) => (
              <option key={p} value={p}>{`${T_CUENTAS.planes[p]} (${cuenta(p)})`}</option>
            ))}
            <option value="pidieron">{`${T_CUENTAS.pidieron} (${(filas ?? []).filter((f) => f.acceso_pedido_en && (f.plan === "gratis" || f.plan === "prueba")).length})`}</option>
          </CampoSelect>
        </div>
      </Cabeza>
      <Seccion titulo={T_CUENTAS.lista} id="cuentas">
        {visibles.length ? (
          <ul className="pa-cuentas" role="list">
            {visibles.map((f) => (
              <FilaCuentaVista key={f.user_id} f={f} alCrear={async (id) => {
                await recargar();
                navegar(`/equipo/solicitud/?id=${id}`);
              }} sb={sb} />
            ))}
          </ul>
        ) : (
          <p className="pa-vacio">{T_CUENTAS.vacio}</p>
        )}
      </Seccion>
    </div>
  );
}

function FilaCuentaVista({ f, sb, alCrear }: { f: FilaCuenta; sb: ReturnType<typeof useDatosPanel>["sb"]; alCrear: (solicitud: string) => Promise<void> }) {
  const [abierto, setAbierto] = useState(false);
  const [apoyo, setApoyo] = useState<string>(f.apoyo_pedido ?? "coach");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const libre = f.plan === "gratis" || f.plan === "prueba";
  const abiertaSol = f.solicitud_id && ["recibida", "en_revision", "respondida", "acordada"].includes(f.solicitud_estado ?? "");
  const titulo = f.nombre ?? f.correo;
  return (
    <li className="tarjeta pa-cuenta">
      <div className="pa-cuenta__cabeza">
        <div>
          <p className="pa-cuenta__nombre">{titulo}</p>
          {f.nombre && <p className="microcopia pa-cuenta__correo">{f.correo}</p>}
        </div>
        <span className={`etiqueta pa-cuenta__plan pa-cuenta__plan--${f.plan}`}>{T_CUENTAS.planes[f.plan]}</span>
      </div>
      <p className="microcopia">
        {T_CUENTAS.origen[f.origen]} · {T_CUENTAS.creada} <time dateTime={f.creada_en}>{fecha.format(new Date(f.creada_en))}</time> · {T_CUENTAS.ultima}{" "}
        {f.ultima_entrada ? <time dateTime={f.ultima_entrada}>{fechaHora.format(new Date(f.ultima_entrada))}</time> : T_CUENTAS.nunca}
      </p>
      {f.plan === "prueba" && f.prueba_hasta && <p className="pa-cuenta__pidio">{T_CUENTAS.pruebaHasta(fecha.format(new Date(`${f.prueba_hasta}T12:00:00`)))}</p>}
      {libre && (
        <>
          {f.meta && <p className="pa-cuenta__meta">«{f.meta}»</p>}
          <p className="microcopia">{T_CUENTAS.actividad(f.dias_con_acciones_7, f.acciones_hechas)}</p>
          {f.acceso_pedido_en && <p className="pa-cuenta__pidio">{T_CUENTAS.pidio(T_CUENTAS.apoyos[f.apoyo_pedido ?? ""] ?? "")}</p>}
        </>
      )}
      {f.plan === "sin_completar" && <p className="microcopia">{T_CUENTAS.sinCompletar}</p>}
      <div className="acciones">
        {(f.plan === "programa" || f.plan === "prueba") && f.participante_id && (
          <Link to={`/equipo/participante/?id=${f.participante_id}`} className="boton boton--secundario me-boton-chico">
            {T_CUENTAS.verFicha}
          </Link>
        )}
        {libre && abiertaSol && (
          <>
            <span className="microcopia">{T_CUENTAS.estadoSolicitud[f.solicitud_estado ?? ""]}</span>
            <Link to={`/equipo/solicitud/?id=${f.solicitud_id}`} className="boton boton--secundario me-boton-chico">
              {T_CUENTAS.verSolicitud}
            </Link>
          </>
        )}
        {libre && !abiertaSol && !abierto && (
          <button type="button" className="boton boton--primario me-boton-chico" onClick={() => setAbierto(true)}>
            {T_CUENTAS.dar}
          </button>
        )}
      </div>
      {abierto && (
        <form
          className="pa-cuenta__dar"
          aria-label={`${T_CUENTAS.dar}: ${titulo}`}
          onSubmit={(e) => {
            e.preventDefault();
            if (enviando) return;
            setEnviando(true);
            setError(null);
            void sb.rpc("dar_acceso_completo", { p_user: f.user_id, p_apoyo: apoyo, p_token: nuevoToken() }).then(async (r) => {
              if (r.error) {
                setEnviando(false);
                const m = r.error.message ?? "";
                return setError(/abierta/.test(m) ? T_CUENTAS.errores.abierta : /tiene_programa/.test(m) ? T_CUENTAS.errores.programa : T_CUENTAS.errores.otro);
              }
              await alCrear(datos(r) as string);
            });
          }}
        >
          <p className="microcopia">{T_CUENTAS.darAyuda}</p>
          <CampoSelect id={`cuenta-apoyo-${f.user_id}`} etiqueta={T_CUENTAS.plan} value={apoyo} onChange={(e) => setApoyo(e.target.value)}>
            {planes.map((p) => (
              <option key={p.id} value={p.param}>
                {p.nombre} · {p.precio}
              </option>
            ))}
            <option value="nose">Todavía no lo deciden</option>
          </CampoSelect>
          {error && (
            <p role="alert" className="pa-cuenta__error">
              {error}
            </p>
          )}
          <div className="acciones">
            <button type="submit" className="boton boton--primario me-boton-chico" aria-disabled={enviando || undefined}>
              {enviando ? T_CUENTAS.creando : T_CUENTAS.confirmar}
            </button>
            <button type="button" className="boton boton--terciario me-boton-chico" onClick={() => setAbierto(false)}>
              {T_CUENTAS.cancelar}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
