// Negocio en el panel real (dueño): indicadores agregados del período, calculados en la base por
// `indicadores` (migración 20261027000000, aplicada; solo el dueño con TOTP). Son conteos, nunca
// datos de personas. Los ingresos salen de la tabla pagos (registro manual, pantalla Pagos).
// Un porcentaje solo se muestra si su base es mayor que cero: sin datos, no se inventa una cifra.
// Sin migraciones nuevas.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CampoSelect } from "../../../components/form";
import { fechaLarga, mayuscula, sumarDias, type Iso } from "../../../lib/fechas";
import { datos } from "../../../lib/supabase";
import Carga from "../../vista-previa/mi-espacio/Carga";
import { Cabeza, Datos, Seccion } from "../../vista-previa/panel/comun";
import { NEGOCIO_PANEL as T } from "../../vista-previa/panel/textos";
import { useDatosPanel } from "./comun";
import { montoTexto, R_PAGOS } from "./pagos";

export const R_NEGOCIO = "/equipo/negocio/";

export type Indicadores = {
  periodo: { desde: Iso; hasta: Iso };
  conversion: {
    postulaciones: number;
    interes: number;
    respondidas_a_tiempo: number;
    acordadas: number;
    revisadas: number;
    acuerdos_aceptados: number;
    ciclos_por_plan: Record<string, number>;
  };
  activacion: { empezaron: number; primera_accion_3_dias: number; registro_semana_1: number };
  cumplimiento: {
    acciones_programadas: number;
    acciones_hechas: number;
    dias_con_acciones: number;
    dias_completos: number;
    registros_semanales_enviados: number;
    revisiones_publicadas: number;
    ajustes_pedidos: number;
  };
  retencion: { en_ciclo_activo: number; con_actividad: number; pausados: number; cerrados: number; cerrados_antes_del_fin: number; renovaciones: number };
  equipo: { acompanantes_activos: number; participantes_con_coach: number; participantes_sin_coach: number };
  no_disponible: { indicador: string; falta: string }[];
};
type PagoNegocio = { monto: number; moneda: "CLP" | "USD"; pagado_en: Iso; devuelto: number; devuelto_en: Iso | null };
export type Periodo = "28" | "90" | "anio";

// Período que se consulta: últimas 4 semanas, últimos 90 días o lo que va del año (hasta hoy).
export function rangoPeriodo(p: Periodo, hoy: Iso): { desde: Iso; hasta: Iso } {
  if (p === "anio") return { desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy };
  return { desde: sumarDias(hoy, 1 - Number(p)), hasta: hoy };
}

// «7 de 10 (70 %)»; sin base, solo el conteo y «sin datos».
export function proporcion(n: number, de: number): string {
  if (!de) return T.sinBase(n);
  return `${n} de ${de} (${Math.round((n / de) * 100)} %)`;
}

const fecha = (f: Iso) => mayuscula(fechaLarga(f));
const enRango = (f: Iso | null, r: { desde: Iso; hasta: Iso }) => !!f && f >= r.desde && f <= r.hasta;

export function NegocioReal() {
  const { sb, d } = useDatosPanel();
  const [periodo, setPeriodo] = useState<Periodo>("28");
  const [dueno, setDueno] = useState<boolean | null>(null);
  const [ind, setInd] = useState<Indicadores | null>(null);
  const [pagos, setPagos] = useState<PagoNegocio[]>([]);
  const [error, setError] = useState(false);
  const rango = rangoPeriodo(periodo, d.hoy);

  // Solo vale la respuesta de la última consulta (si cambias de período, la anterior se descarta).
  const turno = useRef(0);
  const leer = useCallback(async () => {
    const mio = ++turno.current;
    const rol = datos(await sb.rpc("mi_rol_equipo")) as { rol?: string } | null;
    if (rol?.rol !== "dueno") {
      setDueno(false);
      return;
    }
    setDueno(true);
    const [i, p] = await Promise.all([
      sb.rpc("indicadores", { p_desde: rango.desde, p_hasta: rango.hasta }),
      sb.from("pagos").select("monto,moneda,pagado_en,devuelto,devuelto_en"),
    ]);
    if (mio !== turno.current) return;
    setPagos(datos(p) as PagoNegocio[]);
    setInd(datos(i) as Indicadores);
  }, [sb, rango.desde, rango.hasta]);
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

  const selector = (
    <CampoSelect id="negocio-periodo" etiqueta={T.periodo.etiqueta} value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}>
      <option value="28">{T.periodo.opciones["28"]}</option>
      <option value="90">{T.periodo.opciones["90"]}</option>
      <option value="anio">{T.periodo.opciones.anio}</option>
    </CampoSelect>
  );
  if (!ind) return <Carga estado="cargando" />;
  const actualizando = ind.periodo.desde !== rango.desde || ind.periodo.hasta !== rango.hasta;

  const c = ind.conversion;
  const a = ind.activacion;
  const k = ind.cumplimiento;
  const r = ind.retencion;
  const e = ind.equipo;
  const suma = (m: "CLP" | "USD", campo: "monto" | "devuelto", f: "pagado_en" | "devuelto_en") =>
    pagos.filter((p) => p.moneda === m && enRango(p[f], ind.periodo)).reduce((s, p) => s + p[campo], 0);
  const dinero = (campo: "monto" | "devuelto", f: "pagado_en" | "devuelto_en") =>
    [suma("CLP", campo, f) && montoTexto(suma("CLP", campo, f), "CLP"), suma("USD", campo, f) && montoTexto(suma("USD", campo, f), "USD")]
      .filter(Boolean)
      .join(" · ") || "$0";
  // Los pagos ya tienen registro (pantalla Pagos): lo que la base marca como faltante de B4 no se repite.
  const faltan = ind.no_disponible.filter((x) => !x.falta.includes("(B4)"));

  return (
    <div className="pa-pantalla">
      <Cabeza ojo={T.ojo} titulo={T.titulo} bajada={T.bajada}>
        {selector}
        <p className="microcopia" role="status">
          {actualizando ? T.actualizando : T.rango(fecha(ind.periodo.desde), fecha(ind.periodo.hasta))}
        </p>
      </Cabeza>

      <Seccion titulo={T.conversion.titulo} id="ng-conversion">
        <Datos
          className="pa-datos--apilada"
          filas={[
            [T.conversion.postulaciones, String(c.postulaciones)],
            [T.conversion.interes, String(c.interes)],
            [T.conversion.aTiempo, proporcion(c.respondidas_a_tiempo, c.postulaciones)],
            [T.conversion.acordadas, proporcion(c.acordadas, c.revisadas)],
            [T.conversion.aceptados, String(c.acuerdos_aceptados)],
            ...Object.entries(c.ciclos_por_plan).map(([plan, n]) => [T.conversion.ciclosPlan(T.planes[plan] ?? plan), String(n)] as const),
          ]}
        />
      </Seccion>

      <Seccion titulo={T.activacion.titulo} id="ng-activacion">
        <Datos
          className="pa-datos--apilada"
          filas={[
            [T.activacion.empezaron, String(a.empezaron)],
            [T.activacion.primera, proporcion(a.primera_accion_3_dias, a.empezaron)],
            [T.activacion.semana1, proporcion(a.registro_semana_1, a.empezaron)],
          ]}
        />
      </Seccion>

      <Seccion titulo={T.cumplimiento.titulo} id="ng-cumplimiento">
        <Datos
          className="pa-datos--apilada"
          filas={[
            [T.cumplimiento.acciones, proporcion(k.acciones_hechas, k.acciones_programadas)],
            [T.cumplimiento.dias, proporcion(k.dias_completos, k.dias_con_acciones)],
            [T.cumplimiento.registros, String(k.registros_semanales_enviados)],
            [T.cumplimiento.revisiones, String(k.revisiones_publicadas)],
            [T.cumplimiento.ajustes, String(k.ajustes_pedidos)],
          ]}
        />
      </Seccion>

      <Seccion titulo={T.retencion.titulo} id="ng-retencion">
        <Datos
          className="pa-datos--apilada"
          filas={[
            [T.retencion.activos, String(r.en_ciclo_activo)],
            [T.retencion.actividad, proporcion(r.con_actividad, r.en_ciclo_activo)],
            [T.retencion.pausados, String(r.pausados)],
            [T.retencion.cerrados, String(r.cerrados)],
            [T.retencion.antes, String(r.cerrados_antes_del_fin)],
            [T.retencion.renovaciones, String(r.renovaciones)],
          ]}
        />
      </Seccion>

      <Seccion titulo={T.ingresos.titulo} id="ng-ingresos">
        <Datos
          className="pa-datos--apilada"
          filas={[
            [T.ingresos.recibido, dinero("monto", "pagado_en")],
            [T.ingresos.devuelto, dinero("devuelto", "devuelto_en")],
          ]}
        />
        <p className="microcopia">
          {T.ingresos.nota} <Link to={R_PAGOS}>{T.ingresos.enlace}</Link>
        </p>
      </Seccion>

      <Seccion titulo={T.equipo.titulo} id="ng-equipo">
        <Datos
          className="pa-datos--apilada"
          filas={[
            [T.equipo.acompanantes, String(e.acompanantes_activos)],
            [T.equipo.conCoach, String(e.participantes_con_coach)],
            [T.equipo.sinCoach, String(e.participantes_sin_coach)],
          ]}
        />
      </Seccion>

      {faltan.length > 0 && (
        <Seccion titulo={T.faltan.titulo} id="ng-faltan">
          <ul className="pa-lista">
            {faltan.map((x) => (
              <li key={x.indicador}>{T.faltan.item(mayuscula(x.indicador), x.falta)}</li>
            ))}
          </ul>
        </Seccion>
      )}
      <p className="microcopia">{T.pie}</p>
    </div>
  );
}
