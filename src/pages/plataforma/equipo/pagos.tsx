// Pagos en el panel real (dueño): registro MANUAL de pagos y devoluciones, según las condiciones
// aprobadas (transferencia en Chile, PayPal fuera de Chile; devolución del 100 % antes del inicio
// y de las semanas no empezadas después). No cobra ni conecta medios de pago: solo anota lo que
// el dueño ya confirmó. Usa lo que ya existe en la base (migración 20261029000000_pagos, aplicada):
// tabla pagos (lectura del admin), registrar_pago, devolucion_sugerida y registrar_devolucion,
// que imponen las reglas (solo el dueño, un pago por ciclo, fecha no futura, devolución ≤ pagado)
// y quedan en la auditoría. Sin migraciones nuevas.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import Etiqueta from "../../../components/Etiqueta";
import { CampoSelect, CampoTexto, Casilla } from "../../../components/form";
import { fechaLarga, miles, mayuscula, type Iso } from "../../../lib/fechas";
import { datos } from "../../../lib/supabase";
import Carga from "../../vista-previa/mi-espacio/Carga";
import { Cabeza, Datos, Seccion } from "../../vista-previa/panel/comun";
import { PAGOS_PANEL as T } from "../../vista-previa/panel/textos";
import { Alerta, useDatosPanel, useEscritura } from "./comun";
import { nombreDe } from "./datos";

export const R_PAGOS = "/equipo/pagos/";

type Moneda = "CLP" | "USD";
type Medio = "transferencia" | "paypal";
type Motivo = "retiro_antes_del_inicio" | "semanas_no_empezadas" | "otro";
type Pago = {
  id: string;
  participante_id: string;
  ciclo_id: string;
  monto: number;
  moneda: Moneda;
  medio: Medio;
  pagado_en: Iso;
  referencia: string | null;
  devuelto: number;
  devuelto_en: Iso | null;
  devolucion_motivo: Motivo | null;
};
type AvisoPago = { ciclo_id: string; referencia: string | null; creado_en: string };
type CicloPago = { id: string; participante_id: string; numero: number; plan_id: string; inicio: Iso; semanas: number; estado: string; precio_acordado_clp: number | null };

// Motivos que da la base (privado.error «campo:codigo») con su texto para esta pantalla.
const errorPago = (e: unknown) => {
  const x = e as { campo?: string | null; codigo?: string | null } | null;
  return x?.campo ? (T.errores[`${x.campo}:${x.codigo}`] ?? null) : null;
};

export const montoTexto = (n: number, m: Moneda) => (m === "CLP" ? `$${miles(n)}` : `USD ${miles(n)}`);
const fecha = (f: Iso) => mayuscula(fechaLarga(f));

export function PagosReal() {
  const { sb, d } = useDatosPanel();
  const [dueno, setDueno] = useState<boolean | null>(null);
  const [ciclos, setCiclos] = useState<CicloPago[] | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [avisos, setAvisos] = useState<AvisoPago[]>([]);
  const [error, setError] = useState(false);
  const [aviso, setAviso] = useState("");

  const leer = useCallback(async () => {
    const rol = datos(await sb.rpc("mi_rol_equipo")) as { rol?: string } | null;
    if (rol?.rol !== "dueno") {
      setDueno(false);
      return;
    }
    setDueno(true);
    const [c, p] = await Promise.all([
      sb.from("ciclos").select("id,participante_id,numero,plan_id,inicio,semanas,estado,precio_acordado_clp").order("inicio", { ascending: true }),
      sb.from("pagos").select("id,participante_id,ciclo_id,monto,moneda,medio,pagado_en,referencia,devuelto,devuelto_en,devolucion_motivo"),
    ]);
    // Avisos de «ya transferí» (migración 20261203000000); sin la tabla, ninguno.
    const a = await sb.from("avisos_pago").select("ciclo_id,referencia,creado_en");
    setAvisos(a.error ? [] : ((a.data ?? []) as AvisoPago[]));
    setPagos(datos(p) as Pago[]);
    setCiclos(datos(c) as CicloPago[]);
  }, [sb]);
  const cargar = useCallback(() => {
    setError(false);
    leer().catch(() => setError(true));
  }, [leer]);
  useEffect(cargar, [cargar]);

  const nombre = useMemo(() => {
    const m = new Map(d.participantes.map((p) => [p.id, nombreDe(p)]));
    return (id: string) => m.get(id) || T.sinNombre;
  }, [d.participantes]);

  if (error) return <Carga estado="error" alReintentar={cargar} />;
  if (dueno === false)
    return (
      <div className="pa-pantalla pa-pantalla--angosta">
        <Cabeza ojo={T.ojo} titulo={T.titulo} />
        <p className="pa-vacio">{T.sinPermiso}</p>
      </div>
    );
  if (!ciclos) return <Carga estado="cargando" />;

  const pagoDe = (cicloId: string) => pagos.find((p) => p.ciclo_id === cicloId);
  // Por registrar: ciclos que no están cerrados y aún no tienen pago anotado.
  const pendientes = ciclos.filter((c) => c.estado !== "cerrado" && !pagoDe(c.id));
  const registrados = ciclos.filter((c) => pagoDe(c.id)).reverse();
  const total = (m: Moneda) => pagos.filter((p) => p.moneda === m).reduce((s, p) => s + p.monto - p.devuelto, 0);
  const alGuardar = (texto: string) => {
    setAviso(texto);
    cargar();
  };

  return (
    <div className="pa-pantalla">
      <Cabeza ojo={T.ojo} titulo={T.titulo} bajada={T.bajada} />
      <Datos
        className="pa-datos--apilada"
        filas={[
          [T.resumen.porRegistrar, String(pendientes.length)],
          [T.resumen.neto, [total("CLP") && montoTexto(total("CLP"), "CLP"), total("USD") && montoTexto(total("USD"), "USD")].filter(Boolean).join(" · ") || "$0"],
        ]}
      />
      <p role="status" className="microcopia">
        {aviso}
      </p>

      <Seccion titulo={T.pendientes.titulo} id="por-registrar">
        {pendientes.length ? (
          <ul className="pa-filas">
            {pendientes.map((c) => (
              <FilaPendiente key={c.id} c={c} nombre={nombre(c.participante_id)} hoy={d.hoy} aviso={avisos.find((a) => a.ciclo_id === c.id)} alGuardar={alGuardar} />
            ))}
          </ul>
        ) : (
          <p className="pa-vacio">{T.pendientes.vacio}</p>
        )}
      </Seccion>

      <Seccion titulo={T.registrados.titulo} id="registrados">
        {registrados.length ? (
          <ul className="pa-filas">
            {registrados.map((c) => (
              <FilaPagado key={c.id} c={c} g={pagoDe(c.id)!} nombre={nombre(c.participante_id)} hoy={d.hoy} alGuardar={alGuardar} />
            ))}
          </ul>
        ) : (
          <p className="pa-vacio">{T.registrados.vacio}</p>
        )}
      </Seccion>
      <p className="microcopia">{T.pie}</p>
    </div>
  );
}

function Encabezado({ id, c, nombre, etiqueta }: { id: string; c: CicloPago; nombre: string; etiqueta: ReactNode }) {
  return (
    <div className="pa-fila__cabeza">
      <h3 id={`${id}-titulo`} className="pa-h3">
        <Link to={`/equipo/participante/?id=${c.participante_id}`}>{nombre}</Link>
        <span className="microcopia"> · {T.ciclo(c.numero, T.planes[c.plan_id] ?? c.plan_id)}</span>
      </h3>
      {etiqueta}
    </div>
  );
}

function FilaPendiente({ c, nombre, hoy, aviso, alGuardar }: { c: CicloPago; nombre: string; hoy: Iso; aviso?: AvisoPago; alGuardar: (t: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const id = `pago-${c.id}`;
  const diaAviso = aviso && (new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date(aviso.creado_en)) as Iso);
  return (
    <li className="tarjeta pa-fila" aria-labelledby={`${id}-titulo`}>
      <Encabezado id={id} c={c} nombre={nombre} etiqueta={<Etiqueta variante="nota">{aviso ? T.avisoEtiqueta : T.estados.pendiente}</Etiqueta>} />
      <Datos
        className="pa-datos--apilada"
        filas={[
          [T.inicio, fecha(c.inicio)],
          [T.acordado, c.precio_acordado_clp ? montoTexto(c.precio_acordado_clp, "CLP") : T.sinPrecio],
          ...(aviso && diaAviso ? [[T.avisoFila, T.avisoTexto(fecha(diaAviso), aviso.referencia)] as [string, string]] : []),
        ]}
      />
      {abierto ? (
        <FormPago
          id={id}
          c={c}
          hoy={hoy}
          alCancelar={() => setAbierto(false)}
          alGuardar={() => {
            setAbierto(false);
            alGuardar(T.guardado(nombre));
          }}
        />
      ) : (
        <div className="acciones">
          <button type="button" className="boton boton--secundario" onClick={() => setAbierto(true)}>
            {T.registrar}
          </button>
        </div>
      )}
    </li>
  );
}

function FormPago({ id, c, hoy, alGuardar, alCancelar }: { id: string; c: CicloPago; hoy: Iso; alGuardar: () => void; alCancelar: () => void }) {
  const { sb } = useDatosPanel();
  const [medio, setMedio] = useState<Medio>("transferencia");
  const [moneda, setMoneda] = useState<Moneda>("CLP");
  const [monto, setMonto] = useState(c.precio_acordado_clp ? String(c.precio_acordado_clp) : "");
  const [pagadoEn, setPagadoEn] = useState<string>(hoy);
  const [referencia, setReferencia] = useState("");
  const [errores, setErrores] = useState<{ monto?: string; fecha?: string }>({});
  const [correr, error, ocupado] = useEscritura(errorPago);

  const enviar = async () => {
    const n = Number(monto.replace(/\D/g, ""));
    const e: typeof errores = {};
    if (!n || n <= 0) e.monto = T.form.errorMonto;
    if (!pagadoEn || pagadoEn > hoy) e.fecha = T.form.errorFecha;
    setErrores(e);
    if (e.monto || e.fecha) return;
    if (
      await correr(async () =>
        datos(
          await sb.rpc("registrar_pago", {
            p_ciclo: c.id,
            p_medio: medio,
            p_pagado_en: pagadoEn,
            p_monto: n,
            p_moneda: moneda,
            p_referencia: referencia.trim() || null,
          }),
        ),
      )
    )
      alGuardar();
  };

  return (
    <form
      className="pa-form"
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        void enviar();
      }}
    >
      <CampoSelect
        id={`${id}-medio`}
        etiqueta={T.form.medio}
        value={medio}
        onChange={(ev) => {
          const m = ev.target.value as Medio;
          setMedio(m);
          // PayPal es para fuera de Chile (USD); la transferencia, en pesos.
          const mon: Moneda = m === "paypal" ? "USD" : "CLP";
          setMoneda(mon);
          setMonto(mon === "CLP" && c.precio_acordado_clp ? String(c.precio_acordado_clp) : "");
        }}
      >
        <option value="transferencia">{T.medios.transferencia}</option>
        <option value="paypal">{T.medios.paypal}</option>
      </CampoSelect>
      <CampoSelect id={`${id}-moneda`} etiqueta={T.form.moneda} value={moneda} onChange={(ev) => setMoneda(ev.target.value as Moneda)}>
        <option value="CLP">{T.monedas.CLP}</option>
        <option value="USD">{T.monedas.USD}</option>
      </CampoSelect>
      <CampoTexto
        id={`${id}-monto`}
        etiqueta={T.form.monto(moneda)}
        ayuda={moneda === "CLP" && c.precio_acordado_clp ? T.form.montoAyuda : undefined}
        inputMode="numeric"
        autoComplete="off"
        value={monto}
        error={errores.monto}
        onChange={(ev) => setMonto(ev.target.value)}
      />
      <CampoTexto id={`${id}-fecha`} etiqueta={T.form.fecha} type="date" max={hoy} value={pagadoEn} error={errores.fecha} onChange={(ev) => setPagadoEn(ev.target.value)} />
      <CampoTexto
        id={`${id}-referencia`}
        etiqueta={T.form.referencia}
        ayuda={T.form.referenciaAyuda}
        opcional
        maxLength={80}
        autoComplete="off"
        value={referencia}
        onChange={(ev) => setReferencia(ev.target.value)}
      />
      <Alerta texto={error} />
      <div className="acciones">
        <button type="submit" className="boton boton--primario" aria-disabled={ocupado || undefined}>
          {ocupado ? T.form.guardando : T.form.guardar}
        </button>
        <button type="button" className="boton boton--terciario" onClick={alCancelar}>
          {T.form.cancelar}
        </button>
      </div>
    </form>
  );
}

function FilaPagado({ c, g, nombre, hoy, alGuardar }: { c: CicloPago; g: Pago; nombre: string; hoy: Iso; alGuardar: (t: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const id = `pago-${c.id}`;
  const todo = g.devuelto >= g.monto;
  const estado = todo ? T.estados.devuelto : g.devuelto ? T.estados.parcial : T.estados.pagado;
  return (
    <li className="tarjeta pa-fila" aria-labelledby={`${id}-titulo`}>
      <Encabezado id={id} c={c} nombre={nombre} etiqueta={<Etiqueta variante={g.devuelto ? "nota" : "activo"}>{estado}</Etiqueta>} />
      <Datos
        className="pa-datos--apilada"
        filas={[
          [T.monto, montoTexto(g.monto, g.moneda)],
          [T.form.medio, `${T.medios[g.medio]} · ${fecha(g.pagado_en)}`],
          g.referencia ? [T.form.referencia, g.referencia] : null,
          g.devuelto ? [T.devuelto, `${montoTexto(g.devuelto, g.moneda)} · ${fecha(g.devuelto_en!)} · ${T.motivos[g.devolucion_motivo!]}`] : null,
        ]}
      />
      {!todo &&
        (abierto ? (
          <FormDevolucion
            id={id}
            g={g}
            c={c}
            hoy={hoy}
            alCancelar={() => setAbierto(false)}
            alGuardar={() => {
              setAbierto(false);
              alGuardar(T.devolucion.guardada(nombre));
            }}
          />
        ) : (
          <div className="acciones">
            <button type="button" className="boton boton--terciario" onClick={() => setAbierto(true)}>
              {T.devolucion.abrir}
            </button>
          </div>
        ))}
    </li>
  );
}

function FormDevolucion({ id, g, c, hoy, alGuardar, alCancelar }: { id: string; g: Pago; c: CicloPago; hoy: Iso; alGuardar: () => void; alCancelar: () => void }) {
  const { sb } = useDatosPanel();
  const [sugerida, setSugerida] = useState<number | null>(null);
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState<Motivo>(hoy < c.inicio ? "retiro_antes_del_inicio" : "semanas_no_empezadas");
  const [devueltoEn, setDevueltoEn] = useState<string>(hoy);
  const [confirmo, setConfirmo] = useState(false);
  const [errores, setErrores] = useState<{ monto?: string; fecha?: string; confirmo?: string }>({});
  const [correr, error, ocupado] = useEscritura(errorPago);
  const maximo = g.monto - g.devuelto;

  // Lo que corresponde según las condiciones, calculado por la base a la fecha de hoy.
  useEffect(() => {
    let vivo = true;
    sb.rpc("devolucion_sugerida", { p_pago: g.id, p_fecha: hoy }).then(
      (r) => {
        if (!vivo || r.error) return;
        const n = Number(r.data ?? 0);
        setSugerida(n);
        setMonto((m) => m || (n > 0 ? String(n) : ""));
      },
      () => undefined,
    );
    return () => {
      vivo = false;
    };
  }, [sb, g.id, hoy]);

  const enviar = async () => {
    const n = Number(monto.replace(/\D/g, ""));
    const e: typeof errores = {};
    if (!n || n <= 0 || n > maximo) e.monto = T.devolucion.errorMonto(montoTexto(maximo, g.moneda));
    if (!devueltoEn || devueltoEn > hoy) e.fecha = T.form.errorFecha;
    if (!confirmo) e.confirmo = T.devolucion.errorConfirmar;
    setErrores(e);
    if (e.monto || e.fecha || e.confirmo) return;
    if (await correr(async () => datos(await sb.rpc("registrar_devolucion", { p_pago: g.id, p_monto: n, p_motivo: motivo, p_devuelto_en: devueltoEn }))))
      alGuardar();
  };

  return (
    <form
      className="pa-form"
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        void enviar();
      }}
    >
      <p className="microcopia">{sugerida === null ? T.devolucion.calculando : T.devolucion.sugerida(montoTexto(sugerida, g.moneda))}</p>
      <CampoTexto
        id={`${id}-dev-monto`}
        etiqueta={T.devolucion.monto(g.moneda)}
        inputMode="numeric"
        autoComplete="off"
        value={monto}
        error={errores.monto}
        onChange={(ev) => setMonto(ev.target.value)}
      />
      <CampoSelect id={`${id}-dev-motivo`} etiqueta={T.devolucion.motivo} value={motivo} onChange={(ev) => setMotivo(ev.target.value as Motivo)}>
        <option value="retiro_antes_del_inicio">{T.motivos.retiro_antes_del_inicio}</option>
        <option value="semanas_no_empezadas">{T.motivos.semanas_no_empezadas}</option>
        <option value="otro">{T.motivos.otro}</option>
      </CampoSelect>
      <CampoTexto id={`${id}-dev-fecha`} etiqueta={T.devolucion.fecha} type="date" max={hoy} value={devueltoEn} error={errores.fecha} onChange={(ev) => setDevueltoEn(ev.target.value)} />
      <Casilla id={`${id}-dev-confirmo`} checked={confirmo} error={errores.confirmo} onChange={(ev) => setConfirmo(ev.target.checked)}>
        {T.devolucion.confirmo}
      </Casilla>
      <Alerta texto={error} />
      <div className="acciones">
        <button type="submit" className="boton boton--primario" aria-disabled={ocupado || undefined}>
          {ocupado ? T.form.guardando : T.devolucion.guardar}
        </button>
        <button type="button" className="boton boton--terciario" onClick={alCancelar}>
          {T.form.cancelar}
        </button>
      </div>
    </form>
  );
}
