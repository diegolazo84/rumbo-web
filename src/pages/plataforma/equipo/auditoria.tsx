// Auditoría en el panel real (dueño): quién cambió qué y cuándo, y cada lectura «con motivo».
// Lee la tabla auditoria (solo el dueño la puede leer, política admin_leer). La base guarda los
// NOMBRES de los campos que cambiaron, nunca su contenido: esta pantalla muestra lo mismo.
// Solo lectura, sin migraciones.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CampoSelect } from "../../../components/form";
import { datos } from "../../../lib/supabase";
import Carga from "../../vista-previa/mi-espacio/Carga";
import { Cabeza, Seccion } from "../../vista-previa/panel/comun";
import { AUDITORIA_PANEL as T } from "../../vista-previa/panel/textos";
import { useDatosPanel } from "./comun";
import { nombreDe } from "./datos";

export const R_AUDITORIA = "/equipo/auditoria/";
const POR_PAGINA = 50;

type FilaAuditoria = { id: number; en: string; actor: string | null; accion: string; tabla: string | null; fila: string | null; detalle: { campos?: string[]; motivo?: string } | null };

const hora = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const tablaTexto = (t: string | null) => (t ? (T.tablas[t] ?? t.replace(/_/g, " ")) : "—");
const accionTexto = (a: string) => T.acciones[a] ?? a.replace(/_/g, " ");

export function AuditoriaReal() {
  const { sb, d } = useDatosPanel();
  const [dueno, setDueno] = useState<boolean | null>(null);
  const [filas, setFilas] = useState<FilaAuditoria[] | null>(null);
  const [hayMas, setHayMas] = useState(false);
  const [tabla, setTabla] = useState("");
  const [equipo, setEquipo] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const turno = useRef(0);

  const pagina = useCallback(
    async (desde: number) => {
      let q = sb.from("auditoria").select("id,en,actor,accion,tabla,fila,detalle").order("id", { ascending: false }).range(desde, desde + POR_PAGINA);
      if (tabla) q = q.eq("tabla", tabla);
      const r = (datos(await q) as FilaAuditoria[]) ?? [];
      return { lista: r.slice(0, POR_PAGINA), mas: r.length > POR_PAGINA };
    },
    [sb, tabla],
  );

  const leer = useCallback(async () => {
    const mio = ++turno.current;
    const rol = datos(await sb.rpc("mi_rol_equipo")) as { rol?: string } | null;
    if (rol?.rol !== "dueno") {
      setDueno(false);
      return;
    }
    setDueno(true);
    const [p, e] = await Promise.all([pagina(0), sb.from("equipo").select("user_id,nombre")]);
    if (mio !== turno.current) return;
    setEquipo(new Map(((datos(e) as { user_id: string; nombre: string }[]) ?? []).map((x) => [x.user_id, x.nombre])));
    setFilas(p.lista);
    setHayMas(p.mas);
  }, [sb, pagina]);
  const cargar = useCallback(() => {
    setError(false);
    leer().catch(() => setError(true));
  }, [leer]);
  useEffect(cargar, [cargar]);

  const participante = useMemo(() => {
    const m = new Map(d.participantes.map((p) => [p.id, nombreDe(p)]));
    return (id: string | null) => (id ? m.get(id) : undefined);
  }, [d.participantes]);

  if (error) return <Carga estado="error" alReintentar={cargar} />;
  if (dueno === false)
    return (
      <div className="pa-pantalla pa-pantalla--angosta">
        <Cabeza ojo={T.ojo} titulo={T.titulo} />
        <p className="pa-vacio">{T.sinPermiso}</p>
      </div>
    );
  if (!filas) return <Carga estado="cargando" />;

  const verMas = async () => {
    setCargandoMas(true);
    try {
      const p = await pagina(filas.length);
      setFilas([...filas, ...p.lista]);
      setHayMas(p.mas);
    } catch {
      setError(true);
    } finally {
      setCargandoMas(false);
    }
  };
  const quien = (actor: string | null) => (actor ? (equipo.get(actor) ?? T.otraCuenta) : T.sistema);
  // Sobre qué fila: el nombre del participante si la fila es de una persona conocida.
  const sobre = (f: FilaAuditoria) => {
    const n = (f.tabla === "participantes" || f.accion === "ver_con_motivo") && participante(f.fila);
    return n ? (
      <Link to={`/equipo/participante/?id=${f.fila}`}>{n}</Link>
    ) : (
      tablaTexto(f.tabla)
    );
  };

  return (
    <div className="pa-pantalla">
      <Cabeza ojo={T.ojo} titulo={T.titulo} bajada={T.bajada}>
        <CampoSelect id="auditoria-tabla" etiqueta={T.filtro} value={tabla} onChange={(e) => setTabla(e.target.value)}>
          <option value="">{T.todas}</option>
          {Object.entries(T.tablas).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </CampoSelect>
      </Cabeza>
      <Seccion titulo={T.registro} id="auditoria">
        {filas.length ? (
          <ol className="pa-auditoria">
            {filas.map((f) => (
              <li key={f.id} className="pa-auditoria__fila">
                <p className="pa-auditoria__linea">
                  <strong>{quien(f.actor)}</strong> · {accionTexto(f.accion)} · {sobre(f)}
                </p>
                <p className="microcopia">
                  <time dateTime={f.en}>{hora.format(new Date(f.en))}</time>
                  {f.detalle?.campos?.length ? ` · ${T.campos(f.detalle.campos.length)}: ${f.detalle.campos.join(", ")}` : ""}
                  {f.detalle?.motivo ? ` · ${T.motivo}: «${f.detalle.motivo}»` : ""}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="pa-vacio">{T.vacio}</p>
        )}
        {hayMas && (
          <div className="acciones">
            <button type="button" className="boton boton--secundario" onClick={verMas} disabled={cargandoMas}>
              {cargandoMas ? T.cargando : T.verMas}
            </button>
          </div>
        )}
      </Seccion>
      <p className="microcopia">{T.pie}</p>
    </div>
  );
}
