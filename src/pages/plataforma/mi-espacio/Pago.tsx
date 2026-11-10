// Tu pago (Diego, 10-nov-2026): monto, vencimiento y datos para transferir, solo con sesión.
// Los datos salen de la base (Vault, migración 20261203000000) y nunca del código de la web.
// «Avisar que transferí» deja un aviso: no confirma el pago ni activa el ciclo.
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Icono } from "../../../components/app";
import { diaMes, fechaLarga, miles, type Iso } from "../../../lib/fechas";
import { datos, supabase, ErrorBase } from "../../../lib/supabase";
import { TituloSeccion } from "../../vista-previa/mi-espacio/Seccion";
import { T_PAGO } from "./textos-pago";

export type MiPago = {
  ciclo_id: string;
  numero: number;
  monto_clp: number;
  inicio: Iso;
  vence: Iso;
  pagado: boolean;
  aviso_en: string | null;
  datos: string[] | null;
};

type Estado = { tipo: "cargando" } | { tipo: "error" } | { tipo: "no-disponible" } | { tipo: "listo"; pago: MiPago | null };

export const R_PAGO = "/mi-espacio/pago/";

// Sin la migración, la función no existe (404): la sección queda «no disponible».
export async function leerMiPago(): Promise<MiPago | null | "no-disponible"> {
  const sb = await supabase();
  try {
    return datos(await sb.rpc("mi_pago")) as MiPago | null;
  } catch (e) {
    if (e instanceof ErrorBase && e.estado === 404) return "no-disponible";
    throw e;
  }
}

const diaDelAviso = (en: string) =>
  fechaLarga(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date(en)) as Iso);

function DatoCopiable({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  const reloj = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(reloj.current), []);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.clearTimeout(reloj.current);
      reloj.current = window.setTimeout(() => setCopiado(false), 4000);
    } catch {
      /* sin permiso para copiar: el dato queda visible y seleccionable */
    }
  };
  return (
    <li className="me-pago__dato">
      <span className="me-pago__valor">{texto}</span>
      <button type="button" className="boton boton--secundario me-pago__copiar" onClick={copiar} aria-label={T_PAGO.copiar(texto)}>
        <Icono nombre="copy" tamaño={16} />
        <span aria-hidden="true">{copiado ? T_PAGO.copiado : T_PAGO.copiarCorto}</span>
      </button>
    </li>
  );
}

export default function Pago() {
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [referencia, setReferencia] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [falloAviso, setFalloAviso] = useState(false);

  const cargar = useCallback(() => {
    setEstado({ tipo: "cargando" });
    leerMiPago()
      .then((p) => setEstado(p === "no-disponible" ? { tipo: "no-disponible" } : { tipo: "listo", pago: p }))
      .catch(() => setEstado({ tipo: "error" }));
  }, []);
  useEffect(cargar, [cargar]);

  const avisar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (enviando || estado.tipo !== "listo" || !estado.pago) return;
    const pago = estado.pago;
    setEnviando(true);
    setFalloAviso(false);
    try {
      const sb = await supabase();
      const en = datos(await sb.rpc("avisar_pago", { p_referencia: referencia.trim() || null })) as string;
      setEstado({ tipo: "listo", pago: { ...pago, aviso_en: en } });
    } catch {
      setFalloAviso(true);
    } finally {
      setEnviando(false);
    }
  };

  const pago = estado.tipo === "listo" ? estado.pago : null;
  return (
    <div className="me-pantalla me-pantalla--angosta me-pago">
      <TituloSeccion titulo={T_PAGO.titulo} icono="wallet" bajada={T_PAGO.bajada} />
      {estado.tipo === "cargando" && (
        <p className="microcopia" role="status">
          {T_PAGO.cargando}
        </p>
      )}
      {estado.tipo === "error" && (
        <div className="aviso" role="alert">
          <div className="aviso-cuerpo">
            <p>{T_PAGO.error}</p>
            <button type="button" className="boton boton--secundario" onClick={cargar}>
              {T_PAGO.reintentar}
            </button>
          </div>
        </div>
      )}
      {estado.tipo === "no-disponible" && <p>{T_PAGO.noDisponible}</p>}
      {estado.tipo === "listo" && !pago && <p>{T_PAGO.sinPago}</p>}
      {pago?.pagado && (
        <section className="tarjeta me-pago__tarjeta" aria-labelledby="pago-confirmado">
          <h2 id="pago-confirmado" className="me-h2">
            {T_PAGO.pagadoTitulo}
          </h2>
          <p>{T_PAGO.pagadoTexto}</p>
        </section>
      )}
      {pago && !pago.pagado && (
        <>
          <section className="tarjeta me-pago__tarjeta" aria-labelledby="pago-resumen">
            <h2 id="pago-resumen" className="sr-only">
              {T_PAGO.titulo}
            </h2>
            <dl className="me-pago__cifras">
              <div>
                <dt>{T_PAGO.monto}</dt>
                <dd className="me-pago__monto">${miles(pago.monto_clp)}</dd>
              </div>
              <div>
                <dt>{T_PAGO.vence}</dt>
                <dd>{T_PAGO.venceTexto(fechaLarga(pago.vence), fechaLarga(pago.inicio))}</dd>
              </div>
            </dl>
          </section>
          <section className="tarjeta me-pago__tarjeta" aria-labelledby="pago-datos">
            <h2 id="pago-datos" className="me-h2">
              {T_PAGO.datosTitulo}
            </h2>
            {pago.datos?.length ? (
              <ul className="me-pago__datos">
                {pago.datos.map((d) => (
                  <DatoCopiable key={d} texto={d} />
                ))}
              </ul>
            ) : (
              <p>{T_PAGO.sinDatos}</p>
            )}
            <p className="microcopia">{T_PAGO.fuera}</p>
          </section>
          <section className="tarjeta me-pago__tarjeta" aria-labelledby="pago-aviso">
            <h2 id="pago-aviso" className="me-h2">
              {T_PAGO.avisoTitulo}
            </h2>
            {pago.aviso_en ? (
              <p role="status">{T_PAGO.avisado(diaDelAviso(pago.aviso_en))}</p>
            ) : (
              <form className="me-pago__form" onSubmit={avisar} noValidate>
                <p>{T_PAGO.avisoTexto}</p>
                <div className="campo">
                  <label htmlFor="pago-referencia">{T_PAGO.referencia}</label>
                  <input id="pago-referencia" type="text" maxLength={80} autoComplete="off" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
                </div>
                <button type="submit" className="boton boton--primario" disabled={enviando}>
                  {enviando ? T_PAGO.avisando : T_PAGO.avisar}
                </button>
                {falloAviso && (
                  <p className="microcopia" role="alert">
                    {T_PAGO.errorAviso}
                  </p>
                )}
              </form>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// Tarjeta en Mi Rumbo mientras falta pagar (no aparece sin la migración ni con el pago registrado).
export function TarjetaPago() {
  const [pago, setPago] = useState<MiPago | null>(null);
  useEffect(() => {
    let vivo = true;
    leerMiPago()
      .then((p) => vivo && setPago(p && p !== "no-disponible" && !p.pagado ? p : null))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);
  if (!pago) return null;
  return (
    <div className="me-pantalla me-pago__inicio">
    <section className="tarjeta me-pago__tarjeta" aria-labelledby="tarjeta-pago">
      <h2 id="tarjeta-pago" className="me-h2">
        {T_PAGO.titulo}
      </h2>
      <p>{pago.aviso_en ? T_PAGO.tarjetaAvisado : T_PAGO.tarjeta(`$${miles(pago.monto_clp)}`, diaMes(pago.vence))}</p>
      <Link to={R_PAGO} className="boton boton--primario">
        {T_PAGO.tarjetaVer}
        <Icono nombre="arrow-right" tamaño={16} />
      </Link>
    </section>
    </div>
  );
}
