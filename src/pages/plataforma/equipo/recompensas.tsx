// Reconocimientos y beneficio en el panel real (dueño). Usa lo que ya existe en la base
// (migración 20261108000000_recompensas, aplicada): tablas reconocimientos y beneficios (lectura),
// guardar_reconocimiento y guardar_beneficio, que imponen las reglas (solo el dueño; textos y
// umbrales con límites; con el beneficio activo no se cambian porcentaje ni condiciones) y quedan
// en la auditoría. No toca niveles, créditos, rachas ni multiplicadores. Sin migraciones nuevas.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Etiqueta from "../../../components/Etiqueta";
import { Icono } from "../../../components/app";
import { CampoArea, CampoSelect, CampoTexto, Casilla } from "../../../components/form";
import { datos } from "../../../lib/supabase";
import Carga from "../../vista-previa/mi-espacio/Carga";
import { Cabeza, Datos, Seccion } from "../../vista-previa/panel/comun";
import { RECOMPENSAS_PANEL as T } from "../../vista-previa/panel/textos";
import { Alerta, useDatosPanel, useEscritura } from "./comun";
import { R_MODULOS } from "./modulos";

export const R_RECOMPENSAS = "/equipo/recompensas/";

type Reconocimiento = { clave: string; nombre: string; descripcion: string; umbral: number | null; activo: boolean; orden: number };
type Beneficio = {
  id: string;
  nombre: string;
  descripcion: string;
  porcentaje: number;
  dias_ciclo: 28 | 56 | 84;
  activo: boolean;
};
type Otorgado = { beneficio_id: string; estado: "disponible" | "aplicado" | "anulado" };

// Solo constancia (días de racha) y mitad del camino (% hecho) tienen umbral.
const UMBRAL: Record<string, { etiqueta: string; ayuda: string; texto: (n: number) => string }> = {
  constancia: T.umbralRacha,
  mitad_del_camino: T.umbralMitad,
};

const errorRecompensa = (e: unknown) => {
  const x = e as { campo?: string | null; codigo?: string | null } | null;
  return x?.campo ? (T.errores[`${x.campo}:${x.codigo}`] ?? null) : null;
};

export function RecompensasReal() {
  const { sb } = useDatosPanel();
  const [dueno, setDueno] = useState<boolean | null>(null);
  const [lista, setLista] = useState<Reconocimiento[] | null>(null);
  const [otorgados, setOtorgados] = useState<Record<string, number>>({});
  const [modulo, setModulo] = useState<string | null>(null);
  const [beneficio, setBeneficio] = useState<Beneficio | null>(null);
  const [usos, setUsos] = useState<Otorgado[]>([]);
  const [error, setError] = useState(false);
  const [aviso, setAviso] = useState("");

  const leer = useCallback(async () => {
    const rol = datos(await sb.rpc("mi_rol_equipo")) as { rol?: string } | null;
    if (rol?.rol !== "dueno") {
      setDueno(false);
      return;
    }
    setDueno(true);
    const [r, o, m, b, u] = await Promise.all([
      sb.from("reconocimientos").select("clave,nombre,descripcion,umbral,activo,orden").order("orden", { ascending: true }),
      sb.from("reconocimientos_otorgados").select("clave"),
      sb.from("modulos").select("estado").eq("clave", "reconocimientos").maybeSingle(),
      sb.from("beneficios").select("id,nombre,descripcion,porcentaje,dias_ciclo,activo").eq("tipo", "descuento_renovacion").order("actualizado_en", { ascending: false }).limit(1),
      sb.from("beneficios_otorgados").select("beneficio_id,estado"),
    ]);
    const cuenta: Record<string, number> = {};
    for (const f of (datos(o) as { clave: string }[]) ?? []) cuenta[f.clave] = (cuenta[f.clave] ?? 0) + 1;
    setOtorgados(cuenta);
    setModulo((datos(m) as { estado: string } | null)?.estado ?? null);
    setBeneficio(((datos(b) as Beneficio[]) ?? [])[0] ?? null);
    setUsos((datos(u) as Otorgado[]) ?? []);
    setLista(datos(r) as Reconocimiento[]);
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

  const guardado = (texto: string) => {
    setAviso(texto);
    cargar();
  };
  const abierto = modulo === "habilitado" || modulo === "operativo";
  return (
    <div className="pa-pantalla">
      <Cabeza ojo={T.ojo} titulo={T.titulo} bajada={T.bajada} />
      <p role="status" className="microcopia">
        {aviso}
      </p>

      <Seccion titulo={T.reconocimientos} id="reconocimientos" extra={<Etiqueta variante={abierto ? "activo" : "pronto"}>{abierto ? T.moduloAbierto : T.moduloCerrado}</Etiqueta>}>
        <p className="microcopia">
          {abierto ? T.moduloAbiertoTexto : T.moduloCerradoTexto} <Link to={R_MODULOS}>{T.irModulos}</Link>
        </p>
        <ul className="pa-filas">
          {lista.map((r) => (
            <ItemReconocimiento key={r.clave} r={r} otorgados={otorgados[r.clave] ?? 0} alGuardar={() => guardado(T.guardado(r.nombre))} />
          ))}
        </ul>
      </Seccion>

      <Seccion titulo={T.beneficio} id="beneficio" extra={beneficio && <Etiqueta variante={beneficio.activo ? "activo" : "pronto"}>{beneficio.activo ? T.activo : T.apagado}</Etiqueta>}>
        {beneficio ? (
          <ItemBeneficio b={beneficio} usos={usos.filter((u) => u.beneficio_id === beneficio.id)} alGuardar={guardado} />
        ) : (
          <p className="pa-vacio">{T.sinBeneficio}</p>
        )}
      </Seccion>
    </div>
  );
}

function ItemReconocimiento({ r, otorgados, alGuardar }: { r: Reconocimiento; otorgados: number; alGuardar: () => void }) {
  const [editando, setEditando] = useState(false);
  const id = `rec-${r.clave}`;
  const u = UMBRAL[r.clave];
  return (
    <li className="tarjeta pa-fila" aria-labelledby={`${id}-titulo`}>
      <div className="pa-fila__cabeza">
        <h3 id={`${id}-titulo`} className="pa-h3">
          {r.nombre}
        </h3>
        <Etiqueta variante={r.activo ? "activo" : "pronto"}>{r.activo ? T.seOtorga : T.pausado}</Etiqueta>
      </div>
      {editando ? (
        <FormReconocimiento
          id={id}
          r={r}
          alCancelar={() => setEditando(false)}
          alGuardar={() => {
            setEditando(false);
            alGuardar();
          }}
        />
      ) : (
        <>
          <p>{r.descripcion}</p>
          <Datos className="pa-datos--apilada" filas={[u && r.umbral ? [u.etiqueta, u.texto(r.umbral)] : null, [T.otorgados, T.otorgadosTexto(otorgados)]]} />
          <div className="acciones">
            <button type="button" className="boton boton--terciario" onClick={() => setEditando(true)} aria-describedby={`${id}-titulo`}>
              <Icono nombre="pencil" tamaño={20} />
              {T.editar}
            </button>
          </div>
        </>
      )}
    </li>
  );
}

function FormReconocimiento({ id, r, alGuardar, alCancelar }: { id: string; r: Reconocimiento; alGuardar: () => void; alCancelar: () => void }) {
  const { sb } = useDatosPanel();
  const u = UMBRAL[r.clave];
  const [nombre, setNombre] = useState(r.nombre);
  const [descripcion, setDescripcion] = useState(r.descripcion);
  const [umbral, setUmbral] = useState(r.umbral ? String(r.umbral) : "");
  const [activo, setActivo] = useState(r.activo);
  const [errores, setErrores] = useState<{ nombre?: string; descripcion?: string; umbral?: string }>({});
  const [correr, error, ocupado] = useEscritura(errorRecompensa);

  const enviar = async () => {
    const e: typeof errores = {};
    const n = nombre.trim();
    const d = descripcion.trim();
    const x = Number(umbral);
    if (n.length < 3 || n.length > 40) e.nombre = T.errorNombre(3, 40);
    if (d.length < 10 || d.length > 200) e.descripcion = T.errorDescripcion(10, 200);
    if (u && (!Number.isInteger(x) || x < 1 || x > 100)) e.umbral = T.errorUmbral;
    setErrores(e);
    if (e.nombre || e.descripcion || e.umbral) return;
    const p: Record<string, unknown> = { nombre: n, descripcion: d, activo };
    if (u) p.umbral = x;
    if (await correr(async () => datos(await sb.rpc("guardar_reconocimiento", { p_clave: r.clave, p })))) alGuardar();
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
      <CampoTexto id={`${id}-nombre`} etiqueta={T.nombre} maxLength={40} autoComplete="off" value={nombre} error={errores.nombre} onChange={(ev) => setNombre(ev.target.value)} />
      <CampoArea id={`${id}-descripcion`} etiqueta={T.descripcion} ayuda={T.descripcionAyuda} max={200} rows={2} value={descripcion} error={errores.descripcion} onChange={(ev) => setDescripcion(ev.target.value)} />
      {u && (
        <CampoTexto id={`${id}-umbral`} etiqueta={u.etiqueta} ayuda={u.ayuda} inputMode="numeric" autoComplete="off" value={umbral} error={errores.umbral} onChange={(ev) => setUmbral(ev.target.value.replace(/\D/g, ""))} />
      )}
      <Casilla id={`${id}-activo`} checked={activo} onChange={(ev) => setActivo(ev.target.checked)} ayuda={T.seOtorgaAyuda}>
        {T.seOtorgaCampo}
      </Casilla>
      <Alerta texto={error} />
      <div className="acciones">
        <button type="submit" className="boton boton--primario" aria-disabled={ocupado || undefined}>
          {ocupado ? T.guardando : T.guardar}
        </button>
        <button type="button" className="boton boton--terciario" onClick={alCancelar}>
          {T.cancelar}
        </button>
      </div>
    </form>
  );
}

function ItemBeneficio({ b, usos, alGuardar }: { b: Beneficio; usos: Otorgado[]; alGuardar: (texto: string) => void }) {
  const [modo, setModo] = useState<"ver" | "editar" | "activar" | "apagar">("ver");
  const disponibles = usos.filter((u) => u.estado === "disponible").length;
  const aplicados = usos.filter((u) => u.estado === "aplicado").length;
  const id = `beneficio-${b.id}`;
  const terminar = (texto: string) => {
    setModo("ver");
    alGuardar(texto);
  };
  return (
    <div className="tarjeta pa-fila" aria-labelledby={`${id}-titulo`}>
      <div className="pa-fila__cabeza">
        <h3 id={`${id}-titulo`} className="pa-h3">
          {b.nombre}
        </h3>
      </div>
      {modo === "editar" ? (
        <FormBeneficio id={id} b={b} alCancelar={() => setModo("ver")} alGuardar={() => terminar(T.guardado(b.nombre))} />
      ) : modo === "activar" || modo === "apagar" ? (
        <CambiarBeneficio id={id} b={b} activar={modo === "activar"} alCancelar={() => setModo("ver")} alGuardar={terminar} />
      ) : (
        <>
          <p>{b.descripcion}</p>
          <Datos
            className="pa-datos--apilada"
            filas={[
              [T.porcentaje, `${b.porcentaje} %`],
              [T.condicion, T.condicionTexto(b.dias_ciclo)],
              [T.uso, T.usoTexto(disponibles, aplicados)],
            ]}
          />
          <p className="microcopia">{b.activo ? T.activoTexto : T.apagadoTexto}</p>
          <div className="acciones">
            <button type="button" className="boton boton--terciario" onClick={() => setModo("editar")} aria-describedby={`${id}-titulo`}>
              <Icono nombre="pencil" tamaño={20} />
              {T.editar}
            </button>
            <button type="button" className="boton boton--secundario" onClick={() => setModo(b.activo ? "apagar" : "activar")}>
              {b.activo ? T.apagar : T.activar}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function FormBeneficio({ id, b, alGuardar, alCancelar }: { id: string; b: Beneficio; alGuardar: () => void; alCancelar: () => void }) {
  const { sb } = useDatosPanel();
  const [nombre, setNombre] = useState(b.nombre);
  const [descripcion, setDescripcion] = useState(b.descripcion);
  const [porcentaje, setPorcentaje] = useState(String(b.porcentaje));
  const [dias, setDias] = useState(String(b.dias_ciclo));
  const [errores, setErrores] = useState<{ nombre?: string; descripcion?: string; porcentaje?: string }>({});
  const [correr, error, ocupado] = useEscritura(errorRecompensa);

  const enviar = async () => {
    const e: typeof errores = {};
    const n = nombre.trim();
    const d = descripcion.trim();
    const x = Number(porcentaje);
    if (n.length < 3 || n.length > 60) e.nombre = T.errorNombre(3, 60);
    if (d.length < 10 || d.length > 300) e.descripcion = T.errorDescripcion(10, 300);
    if (!b.activo && (!Number.isInteger(x) || x < 1 || x > 100)) e.porcentaje = T.errorPorcentaje;
    setErrores(e);
    if (e.nombre || e.descripcion || e.porcentaje) return;
    // Activo, la base solo deja cambiar nombre y descripción.
    const p: Record<string, unknown> = b.activo ? { nombre: n, descripcion: d } : { nombre: n, descripcion: d, porcentaje: x, dias_ciclo: Number(dias) };
    if (await correr(async () => datos(await sb.rpc("guardar_beneficio", { p_id: b.id, p })))) alGuardar();
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
      {b.activo && (
        <p className="aviso">
          <Icono nombre="info" tamaño={20} className="aviso-icono" />
          <span>{T.soloTextos}</span>
        </p>
      )}
      <CampoTexto id={`${id}-nombre`} etiqueta={T.nombre} ayuda={T.nombreBeneficioAyuda} maxLength={60} autoComplete="off" value={nombre} error={errores.nombre} onChange={(ev) => setNombre(ev.target.value)} />
      <CampoArea id={`${id}-descripcion`} etiqueta={T.descripcion} ayuda={T.descripcionAyuda} max={300} rows={3} value={descripcion} error={errores.descripcion} onChange={(ev) => setDescripcion(ev.target.value)} />
      <CampoTexto
        id={`${id}-porcentaje`}
        etiqueta={T.porcentajeCampo}
        ayuda={T.porcentajeAyuda}
        inputMode="numeric"
        autoComplete="off"
        disabled={b.activo}
        value={porcentaje}
        error={errores.porcentaje}
        onChange={(ev) => setPorcentaje(ev.target.value.replace(/\D/g, ""))}
      />
      <CampoSelect id={`${id}-dias`} etiqueta={T.diasCampo} ayuda={T.diasAyuda} disabled={b.activo} value={dias} onChange={(ev) => setDias(ev.target.value)}>
        {[28, 56, 84].map((n) => (
          <option key={n} value={n}>
            {T.dias(n)}
          </option>
        ))}
      </CampoSelect>
      <Alerta texto={error} />
      <div className="acciones">
        <button type="submit" className="boton boton--primario" aria-disabled={ocupado || undefined}>
          {ocupado ? T.guardando : T.guardar}
        </button>
        <button type="button" className="boton boton--terciario" onClick={alCancelar}>
          {T.cancelar}
        </button>
      </div>
    </form>
  );
}

// Activar o apagar pide confirmar: activarlo es una decisión comercial del dueño.
function CambiarBeneficio({ id, b, activar, alGuardar, alCancelar }: { id: string; b: Beneficio; activar: boolean; alGuardar: (texto: string) => void; alCancelar: () => void }) {
  const { sb } = useDatosPanel();
  const [confirmo, setConfirmo] = useState(false);
  const [errConfirmo, setErrConfirmo] = useState<string | null>(null);
  const [correr, error, ocupado] = useEscritura(errorRecompensa);
  return (
    <form
      className="pa-form"
      noValidate
      onSubmit={async (ev) => {
        ev.preventDefault();
        if (!confirmo) {
          setErrConfirmo(T.errorConfirmo);
          document.getElementById(`${id}-confirmo`)?.focus();
          return;
        }
        setErrConfirmo(null);
        if (await correr(async () => datos(await sb.rpc("guardar_beneficio", { p_id: b.id, p: { activo: activar } })))) alGuardar(activar ? T.activado : T.apagadoListo);
      }}
    >
      <p>{activar ? T.activarTexto(b.porcentaje, b.dias_ciclo) : T.apagarTexto}</p>
      <Casilla id={`${id}-confirmo`} checked={confirmo} error={errConfirmo} onChange={(ev) => setConfirmo(ev.target.checked)}>
        {activar ? T.confirmoActivar : T.confirmoApagar}
      </Casilla>
      <Alerta texto={error} />
      <div className="acciones">
        <button type="submit" className="boton boton--primario" aria-disabled={ocupado || undefined}>
          {activar ? T.activar : T.apagar}
        </button>
        <button type="button" className="boton boton--terciario" onClick={alCancelar}>
          {T.cancelar}
        </button>
      </div>
    </form>
  );
}
