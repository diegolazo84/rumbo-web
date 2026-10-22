// Comunidad en el panel real (C10): reportes abiertos (ocultar con motivo o dejar visible),
// publicaciones ocultas (volver a mostrar), grupos y desafíos (crear, editar, activar).
// Solo para quienes moderan (dueño o coach con permiso, mi_rol_equipo). Lee las tablas con las
// políticas moderacion_leer y escribe con las RPC de la base (moderar_publicacion,
// guardar_grupo_comunidad, guardar_desafio): las reglas las impone la base, aquí solo se avisan.
// No muestra quién reporta ni quién publicó: para moderar basta el contenido.
import { useCallback, useEffect, useState } from "react";
import Etiqueta from "../../../components/Etiqueta";
import { Icono } from "../../../components/app";
import { CampoArea, CampoSelect, CampoTexto } from "../../../components/form";
import { diaMes, fechaLarga, mayuscula, sumarDias, type Iso } from "../../../lib/fechas";
import { datos } from "../../../lib/supabase";
import Carga from "../../vista-previa/mi-espacio/Carga";
import { Cabeza, Datos, Seccion } from "../../vista-previa/panel/comun";
import { COMUNIDAD_PANEL as T } from "../../vista-previa/panel/textos";
import { Alerta, useDatosPanel, useEscritura } from "./comun";

export const R_COMUNIDAD = "/equipo/comunidad/";

const MOTIVOS = ["respeto", "privacidad", "salud", "spam", "otro"] as const;
const ILUSTRACIONES = ["colinas", "brote", "atardecer", "sendero", "lago", "montana"] as const;

type Reporte = { id: string; publicacion_id: string; motivo: string; detalle: string | null; creado_en: string };
type Publicacion = {
  id: string;
  texto: string;
  tipo: string;
  estado: "visible" | "oculta" | "borrada";
  respuesta_a: string | null;
  foto_ruta: string | null;
  creada_en: string;
  moderacion_motivo: string | null;
  moderada_en: string | null;
};
type Grupo = { id: string; nombre: string; descripcion: string | null; ilustracion: string | null; activo: boolean };
type Desafio = { id: string; titulo: string; descripcion: string | null; reglas: string; dias: number; inicio: Iso; ilustracion: string | null; activo: boolean };
type Modulo = { estado: string } | null;

type Datos = {
  reportes: Reporte[];
  publicaciones: Publicacion[]; // las reportadas
  ocultas: Publicacion[];
  grupos: Grupo[];
  miembros: Record<string, number>;
  desafios: Desafio[];
  participantes: Record<string, number>;
  modulo: Modulo;
};

const COLUMNAS_PUB = "id,texto,tipo,estado,respuesta_a,foto_ruta,creada_en,moderacion_motivo,moderada_en";
const contar = (filas: { [k: string]: unknown }[], clave: string) =>
  filas.reduce<Record<string, number>>((r, f) => ({ ...r, [String(f[clave])]: (r[String(f[clave])] ?? 0) + 1 }), {});
const fechaDe = (ts: string) => mayuscula(fechaLarga(ts.slice(0, 10) as Iso));

export function ComunidadReal() {
  const { sb } = useDatosPanel();
  const [permiso, setPermiso] = useState<boolean | null>(null);
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState(false);

  const leer = useCallback(async () => {
    const rol = datos(await sb.rpc("mi_rol_equipo")) as { puede_moderar?: boolean } | null;
    if (!rol?.puede_moderar) {
      setPermiso(false);
      return;
    }
    setPermiso(true);
    const [reportes, ocultas, grupos, miembros, desafios, participaciones, modulo] = await Promise.all([
      sb.from("reportes_comunidad").select("id,publicacion_id,motivo,detalle,creado_en").is("resuelto_en", null).order("creado_en", { ascending: true }),
      sb.from("publicaciones").select(COLUMNAS_PUB).eq("estado", "oculta").order("moderada_en", { ascending: false }).limit(30),
      sb.from("grupos_comunidad").select("id,nombre,descripcion,ilustracion,activo").order("nombre", { ascending: true }),
      sb.from("miembros_grupo").select("grupo_id"),
      sb.from("desafios").select("id,titulo,descripcion,reglas,dias,inicio,ilustracion,activo").order("inicio", { ascending: false }),
      sb.from("participaciones_desafio").select("desafio_id"),
      sb.from("modulos").select("estado").eq("clave", "comunidad").maybeSingle(),
    ]);
    const rep = datos(reportes) as Reporte[];
    const ids = [...new Set(rep.map((r) => r.publicacion_id))];
    const pubs = ids.length ? (datos(await sb.from("publicaciones").select(COLUMNAS_PUB).in("id", ids)) as Publicacion[]) : [];
    setD({
      reportes: rep,
      publicaciones: pubs,
      ocultas: datos(ocultas) as Publicacion[],
      grupos: datos(grupos) as Grupo[],
      miembros: contar(datos(miembros) as { grupo_id: string }[], "grupo_id"),
      desafios: datos(desafios) as Desafio[],
      participantes: contar(datos(participaciones) as { desafio_id: string }[], "desafio_id"),
      modulo: datos(modulo) as Modulo,
    });
  }, [sb]);

  const cargar = useCallback(() => {
    setError(false);
    leer().catch(() => setError(true));
  }, [leer]);
  useEffect(cargar, [cargar]);

  if (error) return <Carga estado="error" alReintentar={cargar} />;
  if (permiso === false)
    return (
      <div className="pa-pantalla pa-pantalla--angosta">
        <Cabeza ojo={T.ojo} titulo={T.titulo} />
        <p className="pa-vacio">{T.sinPermiso}</p>
      </div>
    );
  if (!d) return <Carga estado="cargando" />;

  const abierta = d.modulo && ["habilitado", "operativo"].includes(d.modulo.estado);
  return (
    <div className="pa-pantalla">
      <Cabeza ojo={T.ojo} titulo={T.titulo} bajada={T.bajada} />
      <Seccion titulo={T.modulo.titulo} id="co-modulo" className="tarjeta pa-tarjeta">
        <p>
          {d.modulo ? (
            <>
              <Etiqueta variante={abierta ? "activo" : "pronto"}>{T.modulo.estados[d.modulo.estado] ?? d.modulo.estado}</Etiqueta>{" "}
              {abierta ? T.modulo.abierta : T.modulo.cerrada}
            </>
          ) : (
            T.modulo.sinFila
          )}
        </p>
      </Seccion>
      <Reportes d={d} alCambiar={cargar} />
      <Ocultas d={d} alCambiar={cargar} />
      <Grupos d={d} alCambiar={cargar} />
      <Desafios d={d} alCambiar={cargar} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reportes y ocultas

function Reportes({ d, alCambiar }: { d: Datos; alCambiar: () => void }) {
  const porPublicacion = d.publicaciones
    .map((p) => ({ p, reportes: d.reportes.filter((r) => r.publicacion_id === p.id) }))
    .sort((a, b) => a.reportes[0].creado_en.localeCompare(b.reportes[0].creado_en));
  return (
    <Seccion titulo={T.reportes.titulo} id="co-reportes" extra={d.reportes.length > 0 && <Etiqueta variante="activo">{T.reportes.reportes(d.reportes.length)}</Etiqueta>}>
      {porPublicacion.length ? (
        <ul className="pa-filas">
          {porPublicacion.map(({ p, reportes }) => (
            <ItemReporte key={p.id} p={p} reportes={reportes} alCambiar={alCambiar} />
          ))}
        </ul>
      ) : (
        <p className="pa-vacio">{T.reportes.vacio}</p>
      )}
    </Seccion>
  );
}

function FotoPublicacion({ ruta }: { ruta: string }) {
  const { sb } = useDatosPanel();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    void sb.storage
      .from("comunidad")
      .createSignedUrl(ruta, 600)
      .then((r) => vivo && setUrl(r.data?.signedUrl ?? null))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [sb, ruta]);
  if (!url) return <p className="microcopia">{T.reportes.conFoto}</p>;
  return <img src={url} alt={T.reportes.verFoto} className="pa-co-foto" loading="lazy" />;
}

function ItemReporte({ p, reportes, alCambiar }: { p: Publicacion; reportes: Reporte[]; alCambiar: () => void }) {
  const { sb } = useDatosPanel();
  const [motivo, setMotivo] = useState<string>(reportes[0]?.motivo ?? "");
  const [correr, error, ocupado] = useEscritura();
  const [aviso, setAviso] = useState("");
  const id = `rep-${p.id}`;
  const moderar = (ocultar: boolean) =>
    void correr(async () => {
      datos(await sb.rpc("moderar_publicacion", { p_id: p.id, p_ocultar: ocultar, p_motivo: ocultar ? motivo : null }));
      setAviso(ocultar ? T.reportes.ocultada : T.reportes.dejada);
      alCambiar();
    });
  const motivos = contar(reportes, "motivo");
  return (
    <li className="tarjeta pa-fila" aria-labelledby={`${id}-titulo`}>
      <div className="pa-fila__cabeza">
        <h3 id={`${id}-titulo`} className="pa-h3">
          {p.respuesta_a ? T.reportes.respuesta : (T.tipos[p.tipo] ?? T.tipos.general)}
        </h3>
        <Etiqueta variante="activo">{T.reportes.reportes(reportes.length)}</Etiqueta>
      </div>
      <Datos
        className="pa-datos--apilada"
        filas={[
          [T.reportes.publicada, fechaDe(p.creada_en)],
          ...Object.entries(motivos).map(([m, n]) => [T.motivos[m] ?? m, String(n)] as const),
        ]}
      />
      {p.estado === "borrada" ? (
        <p className="pa-vacio">{T.reportes.noDisponible}</p>
      ) : (
        <blockquote className="pa-cita">
          <p className="pa-co-texto">{p.texto}</p>
        </blockquote>
      )}
      {p.foto_ruta && p.estado !== "borrada" && <FotoPublicacion ruta={p.foto_ruta} />}
      {reportes.some((r) => r.detalle) && (
        <ul className="pa-co-detalles" aria-label={T.reportes.detalle}>
          {reportes
            .filter((r) => r.detalle)
            .map((r) => (
              <li key={r.id}>«{r.detalle}»</li>
            ))}
        </ul>
      )}
      {p.estado === "visible" && (
        <form className="pa-form" noValidate onSubmit={(e) => e.preventDefault()}>
          <CampoSelect id={`${id}-motivo`} etiqueta={T.reportes.motivo} value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            {MOTIVOS.map((m) => (
              <option key={m} value={m}>
                {T.motivos[m]}
              </option>
            ))}
          </CampoSelect>
          <Alerta texto={error} />
          <div className="acciones">
            <button type="button" className="boton boton--primario" disabled={ocupado} onClick={() => moderar(true)}>
              <Icono nombre="eye-off" tamaño={20} />
              {T.reportes.ocultar}
            </button>
            <button type="button" className="boton boton--secundario" disabled={ocupado} onClick={() => moderar(false)}>
              {T.reportes.dejar}
            </button>
          </div>
        </form>
      )}
      <p role="status" className="microcopia">
        {aviso}
      </p>
    </li>
  );
}

function Ocultas({ d, alCambiar }: { d: Datos; alCambiar: () => void }) {
  return (
    <Seccion titulo={T.ocultas.titulo} id="co-ocultas">
      {d.ocultas.length ? (
        <ul className="pa-filas">
          {d.ocultas.map((p) => (
            <ItemOculta key={p.id} p={p} alCambiar={alCambiar} />
          ))}
        </ul>
      ) : (
        <p className="pa-vacio">{T.ocultas.vacio}</p>
      )}
    </Seccion>
  );
}

function ItemOculta({ p, alCambiar }: { p: Publicacion; alCambiar: () => void }) {
  const { sb } = useDatosPanel();
  const [correr, error, ocupado] = useEscritura();
  const id = `oc-${p.id}`;
  return (
    <li className="tarjeta pa-fila" aria-labelledby={`${id}-titulo`}>
      <div className="pa-fila__cabeza">
        <h3 id={`${id}-titulo`} className="pa-h3">
          {p.respuesta_a ? T.reportes.respuesta : (T.tipos[p.tipo] ?? T.tipos.general)}
        </h3>
        <Etiqueta variante="nota">{T.motivos[p.moderacion_motivo ?? ""] ?? p.moderacion_motivo}</Etiqueta>
      </div>
      {p.moderada_en && <Datos className="pa-datos--apilada" filas={[[T.ocultas.ocultaEl, fechaDe(p.moderada_en)]]} />}
      <blockquote className="pa-cita">
        <p className="pa-co-texto">{p.texto}</p>
      </blockquote>
      <Alerta texto={error} />
      <div className="acciones">
        <button
          type="button"
          className="boton boton--secundario"
          disabled={ocupado}
          onClick={() =>
            void correr(async () => {
              datos(await sb.rpc("moderar_publicacion", { p_id: p.id, p_ocultar: false, p_motivo: null }));
              alCambiar();
            })
          }
        >
          <Icono nombre="eye" tamaño={20} />
          {T.ocultas.mostrar}
        </button>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Grupos

function Grupos({ d, alCambiar }: { d: Datos; alCambiar: () => void }) {
  const [nuevo, setNuevo] = useState(false);
  const [aviso, setAviso] = useState("");
  const listo = () => {
    setNuevo(false);
    setAviso(T.grupos.guardado);
    alCambiar();
  };
  return (
    <Seccion titulo={T.grupos.titulo} id="co-grupos">
      {d.grupos.length ? (
        <ul className="pa-filas">
          {d.grupos.map((g) => (
            <ItemGrupo key={g.id} g={g} miembros={d.miembros[g.id] ?? 0} alGuardar={listo} />
          ))}
        </ul>
      ) : (
        <p className="pa-vacio">{T.grupos.vacio}</p>
      )}
      {nuevo ? (
        <div className="tarjeta pa-tarjeta">
          <FormGrupo id="grupo-nuevo" alGuardar={listo} alCancelar={() => setNuevo(false)} />
        </div>
      ) : (
        <button type="button" className="boton boton--secundario pa-co-nuevo" onClick={() => (setAviso(""), setNuevo(true))}>
          <Icono nombre="plus" tamaño={20} />
          {T.grupos.nuevo}
        </button>
      )}
      <p role="status" className="microcopia">
        {aviso}
      </p>
    </Seccion>
  );
}

function ItemGrupo({ g, miembros, alGuardar }: { g: Grupo; miembros: number; alGuardar: () => void }) {
  const [editando, setEditando] = useState(false);
  const id = `grupo-${g.id}`;
  return (
    <li className="tarjeta pa-fila" aria-labelledby={`${id}-titulo`}>
      <div className="pa-fila__cabeza">
        <h3 id={`${id}-titulo`} className="pa-h3">
          {g.nombre}
        </h3>
        <Etiqueta variante={g.activo ? "activo" : "nota"}>{g.activo ? T.grupos.miembros(miembros) : T.grupos.inactivo}</Etiqueta>
      </div>
      {editando ? (
        <FormGrupo
          id={id}
          g={g}
          alGuardar={() => {
            setEditando(false);
            alGuardar();
          }}
          alCancelar={() => setEditando(false)}
        />
      ) : (
        <>
          {g.descripcion && <p>{g.descripcion}</p>}
          <Datos className="pa-datos--apilada" filas={[[T.grupos.ilustracion, g.ilustracion ? T.ilustraciones[g.ilustracion] : T.grupos.sinIlustracion]]} />
          <div className="acciones">
            <button type="button" className="boton boton--terciario" onClick={() => setEditando(true)} aria-describedby={`${id}-titulo`}>
              <Icono nombre="pencil" tamaño={20} />
              {T.grupos.editar}
            </button>
          </div>
        </>
      )}
    </li>
  );
}

function FormGrupo({ id, g, alGuardar, alCancelar }: { id: string; g?: Grupo; alGuardar: () => void; alCancelar: () => void }) {
  const { sb } = useDatosPanel();
  const [nombre, setNombre] = useState(g?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(g?.descripcion ?? "");
  const [ilustracion, setIlustracion] = useState(g?.ilustracion ?? "");
  const [activo, setActivo] = useState(g?.activo ?? true);
  const [errNombre, setErrNombre] = useState<string | null>(null);
  const [correr, error, ocupado] = useEscritura();
  return (
    <form
      className="pa-form"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const n = nombre.trim();
        if (n.length < 2 || n.length > 60) {
          setErrNombre(T.grupos.errorNombre);
          document.getElementById(`${id}-nombre`)?.focus();
          return;
        }
        setErrNombre(null);
        const ok = await correr(async () =>
          datos(await sb.rpc("guardar_grupo_comunidad", { p: { id: g?.id ?? null, nombre: n, descripcion: descripcion.trim() || null, ilustracion: ilustracion || null, activo } })),
        );
        if (ok) alGuardar();
      }}
    >
      <CampoTexto id={`${id}-nombre`} etiqueta={T.grupos.nombre} maxLength={60} value={nombre} error={errNombre} onChange={(e) => setNombre(e.target.value)} />
      <CampoArea id={`${id}-descripcion`} etiqueta={T.grupos.descripcion} opcional max={200} rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      <SelectIlustracion id={`${id}-ilustracion`} valor={ilustracion} alCambiar={setIlustracion} />
      <Interruptor id={`${id}-activo`} texto={T.grupos.activo} valor={activo} alCambiar={setActivo} />
      <Alerta texto={error} />
      <div className="acciones">
        <button type="submit" className="boton boton--primario" disabled={ocupado}>
          {T.grupos.guardar}
        </button>
        <button type="button" className="boton boton--terciario" onClick={alCancelar}>
          {T.grupos.cancelar}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Desafíos

function Desafios({ d, alCambiar }: { d: Datos; alCambiar: () => void }) {
  const [nuevo, setNuevo] = useState(false);
  const [aviso, setAviso] = useState("");
  const listo = () => {
    setNuevo(false);
    setAviso(T.desafios.guardado);
    alCambiar();
  };
  return (
    <Seccion titulo={T.desafios.titulo} id="co-desafios">
      <p className="microcopia">{T.desafios.ayuda}</p>
      {d.desafios.length ? (
        <ul className="pa-filas">
          {d.desafios.map((x) => (
            <ItemDesafio key={x.id} x={x} participantes={d.participantes[x.id] ?? 0} alGuardar={listo} />
          ))}
        </ul>
      ) : (
        <p className="pa-vacio">{T.desafios.vacio}</p>
      )}
      {nuevo ? (
        <div className="tarjeta pa-tarjeta">
          <FormDesafio id="desafio-nuevo" participantes={0} alGuardar={listo} alCancelar={() => setNuevo(false)} />
        </div>
      ) : (
        <button type="button" className="boton boton--secundario pa-co-nuevo" onClick={() => (setAviso(""), setNuevo(true))}>
          <Icono nombre="plus" tamaño={20} />
          {T.desafios.nuevo}
        </button>
      )}
      <p role="status" className="microcopia">
        {aviso}
      </p>
    </Seccion>
  );
}

function ItemDesafio({ x, participantes, alGuardar }: { x: Desafio; participantes: number; alGuardar: () => void }) {
  const [editando, setEditando] = useState(false);
  const id = `desafio-${x.id}`;
  return (
    <li className="tarjeta pa-fila" aria-labelledby={`${id}-titulo`}>
      <div className="pa-fila__cabeza">
        <h3 id={`${id}-titulo`} className="pa-h3">
          {x.titulo}
        </h3>
        <Etiqueta variante={x.activo ? "activo" : "nota"}>{x.activo ? T.desafios.participantes(participantes) : T.desafios.inactivo}</Etiqueta>
      </div>
      {editando ? (
        <FormDesafio
          id={id}
          x={x}
          participantes={participantes}
          alGuardar={() => {
            setEditando(false);
            alGuardar();
          }}
          alCancelar={() => setEditando(false)}
        />
      ) : (
        <>
          {x.descripcion && <p>{x.descripcion}</p>}
          <Datos
            className="pa-datos--apilada"
            filas={[
              [T.desafios.dias, String(x.dias)],
              [T.desafios.fechasEtiqueta, T.desafios.fechas(diaMes(x.inicio), diaMes(sumarDias(x.inicio, x.dias - 1)))],
              [T.desafios.reglas, <span className="pa-co-texto">{x.reglas}</span>],
            ]}
          />
          <div className="acciones">
            <button type="button" className="boton boton--terciario" onClick={() => setEditando(true)} aria-describedby={`${id}-titulo`}>
              <Icono nombre="pencil" tamaño={20} />
              {T.desafios.editar}
            </button>
          </div>
        </>
      )}
    </li>
  );
}

type ErroresDesafio = Partial<Record<"titulo" | "reglas" | "dias" | "inicio", string>>;

function FormDesafio({ id, x, participantes, alGuardar, alCancelar }: { id: string; x?: Desafio; participantes: number; alGuardar: () => void; alCancelar: () => void }) {
  const { sb } = useDatosPanel();
  const [titulo, setTitulo] = useState(x?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(x?.descripcion ?? "");
  const [reglas, setReglas] = useState(x?.reglas ?? "");
  const [dias, setDias] = useState(x ? String(x.dias) : "28");
  const [inicio, setInicio] = useState<string>(x?.inicio ?? "");
  const [ilustracion, setIlustracion] = useState(x?.ilustracion ?? "");
  const [activo, setActivo] = useState(x?.activo ?? true);
  const [errores, setErrores] = useState<ErroresDesafio>({});
  const [correr, error, ocupado] = useEscritura();
  const fijo = participantes > 0; // con personas participando, días e inicio no cambian (lo impone la base)
  return (
    <form
      className="pa-form"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const t = titulo.trim();
        const r = reglas.trim();
        const n = Number(dias);
        const err: ErroresDesafio = {};
        if (t.length < 3 || t.length > 80) err.titulo = T.desafios.errores.titulo;
        if (r.length < 10 || r.length > 1000) err.reglas = T.desafios.errores.reglas;
        if (!Number.isInteger(n) || n < 7 || n > 60) err.dias = T.desafios.errores.dias;
        if (!inicio) err.inicio = T.desafios.errores.inicio;
        setErrores(err);
        const primero = (["titulo", "reglas", "dias", "inicio"] as const).find((k) => err[k]);
        if (primero) {
          document.getElementById(`${id}-${primero}`)?.focus();
          return;
        }
        const ok = await correr(async () =>
          datos(
            await sb.rpc("guardar_desafio", {
              p: { id: x?.id ?? null, titulo: t, descripcion: descripcion.trim() || null, reglas: r, dias: n, inicio, ilustracion: ilustracion || null, activo },
            }),
          ),
        );
        if (ok) alGuardar();
      }}
    >
      <CampoTexto id={`${id}-titulo`} etiqueta={T.desafios.tituloCampo} maxLength={80} value={titulo} error={errores.titulo} onChange={(e) => setTitulo(e.target.value)} />
      <CampoArea id={`${id}-descripcion`} etiqueta={T.desafios.descripcion} opcional max={300} rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      <CampoArea id={`${id}-reglas`} etiqueta={T.desafios.reglas} max={1000} min={10} rows={4} value={reglas} error={errores.reglas} onChange={(e) => setReglas(e.target.value)} />
      <CampoTexto
        id={`${id}-dias`}
        etiqueta={T.desafios.dias}
        ayuda={T.desafios.diasAyuda}
        type="number"
        inputMode="numeric"
        min={7}
        max={60}
        value={dias}
        disabled={fijo}
        error={errores.dias}
        onChange={(e) => setDias(e.target.value.replace(/\D/g, ""))}
      />
      <CampoTexto
        id={`${id}-inicio`}
        etiqueta={T.desafios.inicio}
        ayuda={T.desafios.inicioAyuda}
        type="date"
        value={inicio}
        disabled={fijo}
        error={errores.inicio}
        onChange={(e) => setInicio(e.target.value)}
      />
      <SelectIlustracion id={`${id}-ilustracion`} valor={ilustracion} alCambiar={setIlustracion} />
      <Interruptor id={`${id}-activo`} texto={T.desafios.activo} valor={activo} alCambiar={setActivo} />
      <Alerta texto={error} />
      <div className="acciones">
        <button type="submit" className="boton boton--primario" disabled={ocupado}>
          {T.desafios.guardar}
        </button>
        <button type="button" className="boton boton--terciario" onClick={alCancelar}>
          {T.desafios.cancelar}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Piezas

function SelectIlustracion({ id, valor, alCambiar }: { id: string; valor: string; alCambiar: (v: string) => void }) {
  return (
    <CampoSelect id={id} etiqueta={T.grupos.ilustracion} opcional value={valor} onChange={(e) => alCambiar(e.target.value)}>
      <option value="">{T.grupos.sinIlustracion}</option>
      {ILUSTRACIONES.map((i) => (
        <option key={i} value={i}>
          {T.ilustraciones[i]}
        </option>
      ))}
    </CampoSelect>
  );
}

function Interruptor({ id, texto, valor, alCambiar }: { id: string; texto: string; valor: boolean; alCambiar: (v: boolean) => void }) {
  return (
    <div className="interruptor">
      <label className="interruptor__fila" htmlFor={id}>
        <span className="interruptor__texto">{texto}</span>
        <input id={id} type="checkbox" role="switch" className="interruptor__control" checked={valor} onChange={(e) => alCambiar(e.target.checked)} />
      </label>
    </div>
  );
}

