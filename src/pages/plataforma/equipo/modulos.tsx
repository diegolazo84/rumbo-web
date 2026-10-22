// Módulos en el panel real (A4): el dueño ve el estado real de cada función y lo cambia.
// Lee la tabla modulos (política con_sesion_leer) y escribe con cambiar_modulo, que impone las
// reglas: solo el dueño; no se habilita sin haber pasado por «probado»; «operativo» exige anotar
// qué lo respalda; cada cambio queda en la auditoría. Aquí solo se avisan esas reglas.
// Habilitar un módulo lo muestra a las personas: la pantalla lo dice antes de guardar.
import { useCallback, useEffect, useState } from "react";
import Etiqueta from "../../../components/Etiqueta";
import { Icono } from "../../../components/app";
import { CampoArea, CampoSelect } from "../../../components/form";
import { fechaLarga, mayuscula, type Iso } from "../../../lib/fechas";
import { datos } from "../../../lib/supabase";
import Carga from "../../vista-previa/mi-espacio/Carga";
import { Cabeza, Datos } from "../../vista-previa/panel/comun";
import { MODULOS_PANEL as T } from "../../vista-previa/panel/textos";
import { Alerta, useDatosPanel, useEscritura } from "./comun";

export const R_MODULOS = "/equipo/modulos/";

const ESTADOS = ["planificado", "desarrollado", "probado", "habilitado", "operativo"] as const;
type Estado = (typeof ESTADOS)[number];
type Modulo = {
  clave: string;
  nombre: string;
  estado: Estado;
  probado_en: string | null;
  respaldo: string | null;
  que_falta: string | null;
  orden: number;
  cambiado_en: string;
};
const visible = (e: Estado) => e === "habilitado" || e === "operativo";
const fechaDe = (ts: string) => mayuscula(fechaLarga(ts.slice(0, 10) as Iso));

export function ModulosReal() {
  const { sb } = useDatosPanel();
  const [dueno, setDueno] = useState<boolean | null>(null);
  const [lista, setLista] = useState<Modulo[] | null>(null);
  const [error, setError] = useState(false);
  const [aviso, setAviso] = useState("");

  const leer = useCallback(async () => {
    const rol = datos(await sb.rpc("mi_rol_equipo")) as { rol?: string } | null;
    if (rol?.rol !== "dueno") {
      setDueno(false);
      return;
    }
    setDueno(true);
    setLista(datos(await sb.from("modulos").select("clave,nombre,estado,probado_en,respaldo,que_falta,orden,cambiado_en").order("orden", { ascending: true })) as Modulo[]);
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
  if (!lista) return <Carga estado="cargando" />;

  const abiertos = lista.filter((m) => visible(m.estado)).length;
  return (
    <div className="pa-pantalla">
      <Cabeza ojo={T.ojo} titulo={T.titulo} bajada={T.bajada} />
      <p className="microcopia">{T.resumen(abiertos, lista.length)}</p>
      <p role="status" className="microcopia">
        {aviso}
      </p>
      {lista.length ? (
        <ul className="pa-filas">
          {lista.map((m) => (
            <ItemModulo
              key={m.clave}
              m={m}
              alGuardar={(nombre) => {
                setAviso(T.guardado(nombre));
                cargar();
              }}
            />
          ))}
        </ul>
      ) : (
        <p className="pa-vacio">{T.vacio}</p>
      )}
    </div>
  );
}

function ItemModulo({ m, alGuardar }: { m: Modulo; alGuardar: (nombre: string) => void }) {
  const [editando, setEditando] = useState(false);
  const id = `modulo-${m.clave}`;
  return (
    <li className="tarjeta pa-fila" aria-labelledby={`${id}-titulo`}>
      <div className="pa-fila__cabeza">
        <h3 id={`${id}-titulo`} className="pa-h3">
          {m.nombre}
        </h3>
        <Etiqueta variante={visible(m.estado) ? "activo" : m.estado === "probado" ? "nota" : "pronto"}>{T.estados[m.estado]}</Etiqueta>
      </div>
      <p className="microcopia">{visible(m.estado) ? T.visible : T.oculto}</p>
      {editando ? (
        <FormModulo
          id={id}
          m={m}
          alGuardar={() => {
            setEditando(false);
            alGuardar(m.nombre);
          }}
          alCancelar={() => setEditando(false)}
        />
      ) : (
        <>
          <Datos
            className="pa-datos--apilada"
            filas={[
              [T.queFalta, m.que_falta ?? T.nada],
              [T.respaldo, m.respaldo ?? T.sinRespaldo],
              [T.probadoEl, m.probado_en ? fechaDe(m.probado_en) : T.sinProbar],
              [T.cambiadoEl, fechaDe(m.cambiado_en)],
            ]}
          />
          <div className="acciones">
            <button type="button" className="boton boton--terciario" onClick={() => setEditando(true)} aria-describedby={`${id}-titulo`}>
              <Icono nombre="pencil" tamaño={20} />
              {T.cambiar}
            </button>
          </div>
        </>
      )}
    </li>
  );
}

function FormModulo({ id, m, alGuardar, alCancelar }: { id: string; m: Modulo; alGuardar: () => void; alCancelar: () => void }) {
  const { sb } = useDatosPanel();
  const [estado, setEstado] = useState<Estado>(m.estado);
  const [respaldo, setRespaldo] = useState("");
  const [queFalta, setQueFalta] = useState(m.que_falta ?? "");
  const [errRespaldo, setErrRespaldo] = useState<string | null>(null);
  const [correr, error, ocupado] = useEscritura();
  const sinProbar = !m.probado_en;
  const abre = visible(estado) && !visible(m.estado);
  const cierra = !visible(estado) && visible(m.estado);
  return (
    <form
      className="pa-form"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (estado === "operativo" && !respaldo.trim() && !m.respaldo) {
          setErrRespaldo(T.errorRespaldo);
          document.getElementById(`${id}-respaldo`)?.focus();
          return;
        }
        setErrRespaldo(null);
        const ok = await correr(async () =>
          datos(
            await sb.rpc("cambiar_modulo", {
              p_clave: m.clave,
              p_estado: estado,
              p_respaldo: respaldo.trim() || null,
              // Vacío borra «qué falta»; sin cambios se deja como estaba.
              p_que_falta: queFalta.trim() === (m.que_falta ?? "") ? null : queFalta.trim(),
            }),
          ),
        );
        if (ok) alGuardar();
      }}
    >
      <CampoSelect
        id={`${id}-estado`}
        etiqueta={T.estado}
        ayuda={sinProbar ? T.ayudaSinProbar : T.ayudaEstado}
        value={estado}
        onChange={(e) => setEstado(e.target.value as Estado)}
      >
        {ESTADOS.map((s) => (
          <option key={s} value={s} disabled={sinProbar && visible(s) && s !== m.estado}>
            {T.estados[s]}
          </option>
        ))}
      </CampoSelect>
      <CampoArea
        id={`${id}-respaldo`}
        etiqueta={T.respaldoCampo}
        ayuda={m.respaldo ? T.respaldoActual(m.respaldo) : T.ayudaRespaldo}
        opcional={estado !== "operativo" || !!m.respaldo}
        max={300}
        rows={2}
        value={respaldo}
        error={errRespaldo}
        onChange={(e) => setRespaldo(e.target.value)}
      />
      <CampoArea id={`${id}-que-falta`} etiqueta={T.queFalta} opcional max={300} rows={2} value={queFalta} onChange={(e) => setQueFalta(e.target.value)} />
      {abre && (
        <p className="aviso">
          <Icono nombre="info" tamaño={20} className="aviso-icono" />
          <span>{T.avisoAbre}</span>
        </p>
      )}
      {cierra && (
        <p className="aviso">
          <Icono nombre="info" tamaño={20} className="aviso-icono" />
          <span>{T.avisoCierra}</span>
        </p>
      )}
      <Alerta texto={error} />
      <div className="acciones">
        <button type="submit" className="boton boton--primario" disabled={ocupado}>
          {T.guardar}
        </button>
        <button type="button" className="boton boton--terciario" onClick={alCancelar}>
          {T.cancelar}
        </button>
      </div>
    </form>
  );
}
