// Asistente de Rumbo: administración del panel real (solo el dueño, E2 ya en la base).
// · ia_config (política admin_leer): estado, modelo, precios, topes e instrucciones.
// · guardar_ia_config: encender (la base exige la clave openai_api_key en el Vault), apagar y
//   cambiar los límites. ia_gasto(): consumo del mes. ia_bandeja(): cuántas esperan revisión.
// · Módulo «asistente_ia» (tabla modulos): las personas lo ven solo si está habilitado.
// Nunca muestra conversaciones: solo cuentas y montos.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Etiqueta from "../../../components/Etiqueta";
import { Icono } from "../../../components/app";
import { CampoTexto } from "../../../components/form";
import { fechaLarga, type Iso } from "../../../lib/fechas";
import { datos } from "../../../lib/supabase";
import Carga from "../../vista-previa/mi-espacio/Carga";
import { Cabeza, Datos, Seccion } from "../../vista-previa/panel/comun";
import { ASISTENTE_ADMIN as T, MODULOS_PANEL } from "../../vista-previa/panel/textos";
import { R_ASISTENTE } from "./asistente";
import { Alerta, useDatosPanel, useEscritura } from "./comun";
import { R_MODULOS } from "./modulos";

export const R_ASISTENTE_ADMIN = "/equipo/asistente/administracion/";

type Config = {
  activo: boolean;
  modelo: string;
  instrucciones: string;
  max_tokens_respuesta: number;
  tokens_entrada_estimados: number;
  precio_entrada_1m: number;
  precio_salida_1m: number;
  tope_mensual_usd: number;
  tope_diario_persona: number;
  activado_en: string | null;
};
type Gasto = { tope_usd: number; gastado_usd: number; reservado_usd: number; consultas: number; crisis: number; sin_presupuesto: number; errores: number };
const COLUMNAS = "activo,modelo,instrucciones,max_tokens_respuesta,tokens_entrada_estimados,precio_entrada_1m,precio_salida_1m,tope_mensual_usd,tope_diario_persona,activado_en";
const DIAS_CICLO = 28;

const usd = (n: number, dec = 2) => `USD ${Number(n).toLocaleString("es-CL", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
const fecha = (ts: string) => fechaLarga(ts.slice(0, 10) as Iso);

export function AsistenteAdminReal() {
  const { sb } = useDatosPanel();
  const [dueno, setDueno] = useState<boolean | null>(null);
  const [e, setE] = useState<{ config: Config; gasto: Gasto; pendientes: number; modulo: string | null } | null>(null);
  const [error, setError] = useState(false);
  const [aviso, setAviso] = useState("");

  const leer = useCallback(async () => {
    const rol = datos(await sb.rpc("mi_rol_equipo")) as { rol?: string } | null;
    if (rol?.rol !== "dueno") return setDueno(false);
    setDueno(true);
    const [config, gasto, bandeja, modulo] = await Promise.all([
      sb.from("ia_config").select(COLUMNAS).maybeSingle(),
      sb.rpc("ia_gasto"),
      sb.rpc("ia_bandeja"),
      sb.from("modulos").select("estado").eq("clave", "asistente_ia").maybeSingle(),
    ]);
    const c = datos(config) as Config | null;
    if (!c) throw new Error("sin configuración");
    setE({
      config: c,
      gasto: datos(gasto) as Gasto,
      pendientes: ((datos(bandeja) ?? []) as { estado: string }[]).filter((x) => x.estado === "por_revisar").length,
      modulo: modulo.error ? null : ((modulo.data as { estado?: string } | null)?.estado ?? null),
    });
  }, [sb]);
  const cargar = useCallback(() => {
    setError(false);
    leer().catch(() => setError(true));
  }, [leer]);
  useEffect(cargar, [cargar]);

  if (error) return <Carga estado="error" alReintentar={cargar} />;
  if (dueno === false)
    return (
      <div className="pa-pantalla pa-pantalla--angosta">
        <Cabeza ojo={T.ojo} titulo={T.titulo} />
        <p className="pa-vacio">{T.sinPermiso}</p>
      </div>
    );
  if (!e) return <Carga estado="cargando" />;

  const { config: c, gasto: g } = e;
  const listo = (texto: string) => {
    setAviso(texto);
    cargar();
  };
  const porConsulta = (c.tokens_entrada_estimados * c.precio_entrada_1m + c.max_tokens_respuesta * c.precio_salida_1m) / 1_000_000;
  const agotado = Number(g.gastado_usd) + Number(g.reservado_usd) + porConsulta > Number(g.tope_usd);
  const uso = g.tope_usd > 0 ? Math.min(100, Math.round(((Number(g.gastado_usd) + Number(g.reservado_usd)) / Number(g.tope_usd)) * 100)) : 100;

  return (
    <div className="pa-pantalla">
      <Cabeza ojo={T.ojo} titulo={T.titulo} bajada={T.bajada} />
      <p role="status" className="microcopia">
        {aviso}
      </p>

      <Seccion id="ia-estado" titulo={T.estado} className="tarjeta pa-tarjeta" extra={<Etiqueta variante={c.activo ? "activo" : "pronto"}>{c.activo ? T.encendido : T.apagado}</Etiqueta>}>
        <p>{c.activo && c.activado_en ? T.encendidoDesde(fecha(c.activado_en)) : T.apagadoTexto}</p>
        <p className="microcopia">{T.modulo(e.modulo ? (MODULOS_PANEL.estados as Record<string, string>)[e.modulo] ?? e.modulo : "—")}</p>
        <p className="microcopia">{T.moduloAyuda}</p>
        <Interruptor activo={c.activo} alCambiar={(on) => listo(on ? T.encendidoOk : T.apagadoOk)} />
        <p>
          <Link to={R_MODULOS} className="enlace-flecha">
            {T.irModulos}
          </Link>
        </p>
      </Seccion>

      <Seccion id="ia-consumo" titulo={T.consumo} className="tarjeta pa-tarjeta">
        <p className="microcopia">{T.consumoAyuda}</p>
        <div className="ia-barra" role="img" aria-label={T.de(usd(Number(g.gastado_usd) + Number(g.reservado_usd)), usd(g.tope_usd))}>
          <span style={{ inlineSize: `${uso}%` }} />
        </div>
        {agotado && (
          <p className="aviso">
            <Icono nombre="info" tamaño={20} className="aviso-icono" />
            <span>{T.agotado}</span>
          </p>
        )}
        <Datos
          className="pa-datos--apilada"
          filas={[
            [T.gastado, T.de(usd(g.gastado_usd, 4), usd(g.tope_usd))],
            [T.reservado, usd(g.reservado_usd, 4)],
            [T.consultas, String(g.consultas)],
            [T.promedio, g.consultas ? usd(Number(g.gastado_usd) / g.consultas, 4) : "—"],
            [T.errores, String(g.errores)],
            [T.sinPresupuesto, String(g.sin_presupuesto)],
            [T.crisis, String(g.crisis)],
            [T.pendientes, String(e.pendientes)],
          ]}
        />
        <p>
          <Link to={R_ASISTENTE} className="enlace-flecha">
            {T.irBandeja}
          </Link>
        </p>
      </Seccion>

      <Seccion id="ia-estimacion" titulo={T.estimacion} className="tarjeta pa-tarjeta">
        <Datos
          className="pa-datos--apilada"
          filas={[
            [T.porConsulta, usd(porConsulta, 4)],
            [T.porPersona(DIAS_CICLO), usd(porConsulta * c.tope_diario_persona * DIAS_CICLO)],
          ]}
        />
        <p className="microcopia">{T.limiteReal}</p>
      </Seccion>

      <Seccion id="ia-limites" titulo={T.limites} className="tarjeta pa-tarjeta">
        <Limites c={c} alGuardar={() => listo(T.guardado)} />
      </Seccion>

      <Seccion id="ia-instrucciones" titulo={T.instrucciones} className="tarjeta pa-tarjeta">
        <p className="microcopia">{T.instruccionesAyuda}</p>
        <p className="ia-texto">{c.instrucciones}</p>
      </Seccion>
    </div>
  );
}

function Interruptor({ activo, alCambiar }: { activo: boolean; alCambiar: (on: boolean) => void }) {
  const { sb } = useDatosPanel();
  const [confirmar, setConfirmar] = useState(false);
  const [correr, error, ocupado] = useEscritura();
  const cambiar = async () => {
    const ok = await correr(async () => datos(await sb.rpc("guardar_ia_config", { p: { activo: !activo } })));
    setConfirmar(false);
    if (ok) alCambiar(!activo);
  };
  return (
    <>
      {confirmar ? (
        <div className="ia-confirmar" role="group" aria-label={activo ? T.apagar : T.encender}>
          <p>{activo ? T.confirmarApagar : T.confirmarEncender}</p>
          <div className="acciones">
            <button type="button" className="boton boton--primario" disabled={ocupado} onClick={() => void cambiar()}>
              {T.si}
            </button>
            <button type="button" className="boton boton--terciario" onClick={() => setConfirmar(false)}>
              {T.cancelar}
            </button>
          </div>
        </div>
      ) : (
        <div className="acciones">
          <button type="button" className={activo ? "boton boton--secundario" : "boton boton--primario"} onClick={() => setConfirmar(true)}>
            {activo ? T.apagar : T.encender}
          </button>
        </div>
      )}
      <Alerta texto={error} />
    </>
  );
}

const CAMPOS = [
  { k: "tope_mensual_usd", etiqueta: T.topeMensual, ayuda: T.topeMensualAyuda, paso: "0.01" },
  { k: "tope_diario_persona", etiqueta: T.topeDiario, ayuda: T.topeDiarioAyuda, paso: "1" },
  { k: "modelo", etiqueta: T.modeloCampo, ayuda: T.modeloAyuda },
  { k: "max_tokens_respuesta", etiqueta: T.maxTokens, paso: "1" },
  { k: "tokens_entrada_estimados", etiqueta: T.tokensEntrada, paso: "1" },
  { k: "precio_entrada_1m", etiqueta: T.precioEntrada, ayuda: T.preciosAyuda, paso: "0.0001" },
  { k: "precio_salida_1m", etiqueta: T.precioSalida, ayuda: T.preciosAyuda, paso: "0.0001" },
] as const;
type Clave = (typeof CAMPOS)[number]["k"];

function Limites({ c, alGuardar }: { c: Config; alGuardar: () => void }) {
  const { sb } = useDatosPanel();
  const inicial = () => Object.fromEntries(CAMPOS.map((f) => [f.k, String(c[f.k])])) as Record<Clave, string>;
  const [v, setV] = useState(inicial);
  const [errores, setErrores] = useState<Partial<Record<Clave, string>>>({});
  const [correr, error, ocupado] = useEscritura();
  useEffect(() => setV(inicial()), [c]); // eslint-disable-line react-hooks/exhaustive-deps
  const enviar = async (ev: FormEvent) => {
    ev.preventDefault();
    const malos: Partial<Record<Clave, string>> = {};
    const p: Record<string, string | number> = {};
    for (const f of CAMPOS) {
      const x = v[f.k].trim().replace(",", ".");
      if (f.k === "modelo") {
        if (!/^[a-z0-9.:-]{3,60}$/.test(x)) malos[f.k] = T.modeloInvalido;
        else p[f.k] = x;
      } else if (!/^\d+(\.\d+)?$/.test(x)) malos[f.k] = T.numero;
      else p[f.k] = Number(x);
    }
    setErrores(malos);
    const primero = CAMPOS.find((f) => malos[f.k]);
    if (primero) return document.getElementById(`ia-${primero.k}`)?.focus();
    const ok = await correr(async () => datos(await sb.rpc("guardar_ia_config", { p })));
    if (ok) alGuardar();
  };
  return (
    <form className="pa-form" noValidate onSubmit={(e) => void enviar(e)}>
      {CAMPOS.map((f) => (
        <CampoTexto
          key={f.k}
          id={`ia-${f.k}`}
          etiqueta={f.etiqueta}
          ayuda={"ayuda" in f ? f.ayuda : undefined}
          inputMode={f.k === "modelo" ? "text" : "decimal"}
          value={v[f.k]}
          error={errores[f.k] ?? null}
          onChange={(e) => setV({ ...v, [f.k]: e.target.value })}
        />
      ))}
      <Alerta texto={error} />
      <div className="acciones">
        <button type="submit" className="boton boton--primario" disabled={ocupado}>
          {T.guardar}
        </button>
      </div>
    </form>
  );
}
