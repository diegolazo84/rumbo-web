// Equipo en el panel real (bloque 2 de Rumbo 1.0): el dueño invita coaches, los activa o
// desactiva, les da el permiso de moderar y decide a quién acompaña cada uno.
// Usa las funciones de la base (B5 y A1), que imponen las reglas: solo el dueño (aal2); no se
// invita a un correo del equipo ni de una persona participante; no se desactiva a quien todavía
// acompaña a alguien; al reasignar, el coach anterior pierde el acceso y queda en el historial.
// Rumbo no envía la invitación: la pantalla arma el mensaje para que el dueño lo copie.
import { useCallback, useEffect, useState } from "react";
import Etiqueta from "../../../components/Etiqueta";
import { Hoja, Icono } from "../../../components/app";
import { CampoArea, CampoSelect, CampoTexto } from "../../../components/form";
import { fechaLarga, type Iso } from "../../../lib/fechas";
import { datos } from "../../../lib/supabase";
import Carga from "../../vista-previa/mi-espacio/Carga";
import { BotonCopiar, Cabeza, Datos, Seccion, planDe } from "../../vista-previa/panel/comun";
import { EQUIPO_PANEL as T } from "../../vista-previa/panel/textos";
import { Alerta, useDatosPanel, useEscritura } from "./comun";
import { cicloDe, nombreDe } from "./datos";

export const R_EQUIPO = "/equipo/equipo/";

type Miembro = { user_id: string; nombre: string; rol: "dueno" | "coach"; puede_moderar: boolean; activo: boolean; presentacion: string | null };
type Invitacion = { id: string; correo: string; nombre: string; puede_moderar: boolean; creada_en: string; expira_en: string };
type Asignacion = { id: string; coach_id: string | null };

const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const dia = (ts: string) => fechaLarga(ts.slice(0, 10) as Iso);
const enlacePanel = () => (typeof window === "undefined" ? "/equipo/" : `${window.location.origin}${import.meta.env.BASE_URL}equipo/`.replace(/([^:]\/)\/+/g, "$1"));
const mensajeDe = (i: Invitacion) => T.mensaje(i.nombre, i.correo, enlacePanel(), dia(i.expira_en));

export function EquipoReal() {
  const { sb } = useDatosPanel();
  const [dueno, setDueno] = useState<boolean | null>(null);
  const [miembros, setMiembros] = useState<Miembro[] | null>(null);
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [error, setError] = useState(false);
  const [aviso, setAviso] = useState("");

  const leer = useCallback(async () => {
    const rol = datos(await sb.rpc("mi_rol_equipo")) as { rol?: string } | null;
    if (rol?.rol !== "dueno") {
      setDueno(false);
      return;
    }
    setDueno(true);
    const [m, i, a] = await Promise.all([
      sb.from("equipo").select("user_id,nombre,rol,puede_moderar,activo,presentacion").order("creado_en", { ascending: true }),
      sb.from("invitaciones_equipo").select("id,correo,nombre,puede_moderar,creada_en,expira_en").is("aceptada_en", null).is("revocada_en", null).order("creada_en", { ascending: true }),
      sb.from("participantes").select("id,coach_id"),
    ]);
    setMiembros(datos(m) as Miembro[]);
    setInvitaciones(datos(i) as Invitacion[]);
    setAsignaciones(datos(a) as Asignacion[]);
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
  if (!miembros) return <Carga estado="cargando" />;

  const avisar = (texto: string) => {
    setAviso(texto);
    cargar();
  };
  return (
    <div className="pa-pantalla">
      <Cabeza ojo={T.ojo} titulo={T.titulo} bajada={T.bajada} />
      <p role="status" className="microcopia">
        {aviso}
      </p>
      <Personas miembros={miembros} asignaciones={asignaciones} alCambiar={avisar} />
      <Invitar alCrear={avisar} />
      <Pendientes invitaciones={invitaciones} alRevocar={avisar} />
      <Asignar miembros={miembros} asignaciones={asignaciones} alAsignar={avisar} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Personas del equipo

function Personas({ miembros, asignaciones, alCambiar }: { miembros: Miembro[]; asignaciones: Asignacion[]; alCambiar: (aviso: string) => void }) {
  const P = T.personas;
  return (
    <Seccion titulo={P.titulo} id="equipo-personas">
      <ul className="pa-filas">
        {miembros.map((m) => (
          <FilaMiembro key={m.user_id} m={m} acompana={asignaciones.filter((a) => a.coach_id === m.user_id).length} alCambiar={alCambiar} />
        ))}
      </ul>
    </Seccion>
  );
}

function FilaMiembro({ m, acompana, alCambiar }: { m: Miembro; acompana: number; alCambiar: (aviso: string) => void }) {
  const { sb } = useDatosPanel();
  const [correr, error, ocupado] = useEscritura();
  const P = T.personas;
  const id = `miembro-${m.user_id}`;
  const cambiar = (activo: boolean | null, moderar: boolean | null, aviso: string) =>
    correr(async () => {
      datos(await sb.rpc("cambiar_coach", { p_coach: m.user_id, p_activo: activo, p_puede_moderar: moderar }));
      alCambiar(aviso);
    });
  return (
    <li className="tarjeta pa-fila" aria-labelledby={`${id}-nombre`}>
      <div className="pa-fila__cabeza">
        <h3 id={`${id}-nombre`} className="pa-h3">
          {m.nombre}
        </h3>
        <div className="pa-etiquetas">
          <Etiqueta variante="nota">{m.rol === "dueno" ? P.dueno : P.coach}</Etiqueta>
          <Etiqueta variante={m.activo ? "activo" : "pronto"}>{m.activo ? P.activo : P.inactivo}</Etiqueta>
          {m.rol === "coach" && m.puede_moderar && <Etiqueta variante="nota">{P.modera}</Etiqueta>}
        </div>
      </div>
      <Datos
        className="pa-datos--apilada"
        filas={[
          [P.acompana, P.personas(acompana)],
          [P.presentacion, m.presentacion ?? P.sinPresentacion],
        ]}
      />
      {m.rol === "coach" && (
        <>
          <Alerta texto={error} />
          <div className="acciones">
            <button
              type="button"
              className="boton boton--terciario"
              disabled={ocupado}
              aria-describedby={`${id}-nombre`}
              onClick={() => void cambiar(!m.activo, null, m.activo ? P.desactivado(m.nombre) : P.activado(m.nombre))}
            >
              <Icono nombre={m.activo ? "user-x" : "user-check"} tamaño={20} />
              {m.activo ? P.desactivar : P.activar}
            </button>
            {m.activo && (
              <button
                type="button"
                className="boton boton--terciario"
                disabled={ocupado}
                aria-describedby={`${id}-nombre`}
                onClick={() => void cambiar(null, !m.puede_moderar, P.moderarCambiado(m.nombre, !m.puede_moderar))}
              >
                <Icono nombre="shield" tamaño={20} />
                {m.puede_moderar ? P.quitarModerar : P.darModerar}
              </button>
            )}
          </div>
        </>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Invitar

function Invitar({ alCrear }: { alCrear: (aviso: string) => void }) {
  const { sb } = useDatosPanel();
  const I = T.invitar;
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [moderar, setModerar] = useState(false);
  const [errores, setErrores] = useState<{ nombre?: string; correo?: string }>({});
  const [creada, setCreada] = useState<Invitacion | null>(null);
  const [correr, error, ocupado] = useEscritura();
  return (
    <Seccion titulo={I.titulo} id="equipo-invitar" className="tarjeta pa-tarjeta">
      <form
        className="pa-form"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const n = nombre.trim();
          const c = correo.trim().toLowerCase();
          const err = {
            nombre: n.length < 2 || n.length > 60 ? I.errorNombre : undefined,
            correo: !CORREO.test(c) ? I.errorCorreo : undefined,
          };
          setErrores(err);
          if (err.nombre || err.correo) {
            document.getElementById(err.nombre ? "invitar-nombre" : "invitar-correo")?.focus();
            return;
          }
          let id = "";
          const ok = await correr(async () => {
            id = datos(await sb.rpc("invitar_coach", { p_correo: c, p_nombre: n, p_puede_moderar: moderar })) as string;
          });
          if (!ok) return;
          const vence = new Date(Date.now() + 7 * 86400000).toISOString();
          setCreada({ id, correo: c, nombre: n, puede_moderar: moderar, creada_en: new Date().toISOString(), expira_en: vence });
          setNombre("");
          setCorreo("");
          setModerar(false);
          alCrear(I.creada(n));
        }}
      >
        <div className="pa-dos">
          <CampoTexto id="invitar-nombre" etiqueta={I.nombre} ayuda={I.nombreAyuda} autoComplete="off" maxLength={60} value={nombre} error={errores.nombre} onChange={(e) => setNombre(e.target.value)} />
          <CampoTexto
            id="invitar-correo"
            etiqueta={I.correo}
            ayuda={I.correoAyuda}
            type="email"
            inputMode="email"
            autoComplete="off"
            value={correo}
            error={errores.correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
        </div>
        <div className="interruptor">
          <label className="interruptor__fila" htmlFor="invitar-moderar">
            <span className="interruptor__texto">{I.moderar}</span>
            <input
              id="invitar-moderar"
              type="checkbox"
              role="switch"
              className="interruptor__control"
              checked={moderar}
              aria-describedby="invitar-moderar-ayuda"
              onChange={(e) => setModerar(e.target.checked)}
            />
          </label>
          <div id="invitar-moderar-ayuda" className="campo__ayuda">
            <p>{I.moderarAyuda}</p>
          </div>
        </div>
        <Alerta texto={error} />
        <button type="submit" className="boton boton--primario pa-boton-solo" disabled={ocupado}>
          <Icono nombre="user-plus" tamaño={20} />
          {I.boton}
        </button>
      </form>
      {creada && (
        <div className="pa-pila pa-pila--chica">
          <p className="microcopia">{I.creada(creada.nombre)}</p>
          <pre className="pa-plantilla">{mensajeDe(creada)}</pre>
          <BotonCopiar texto={mensajeDe(creada)} etiqueta={T.pendientes.copiar} />
        </div>
      )}
    </Seccion>
  );
}

function Pendientes({ invitaciones, alRevocar }: { invitaciones: Invitacion[]; alRevocar: (aviso: string) => void }) {
  const P = T.pendientes;
  return (
    <Seccion titulo={P.titulo} id="equipo-pendientes">
      {invitaciones.length ? (
        <ul className="pa-filas">
          {invitaciones.map((i) => (
            <FilaInvitacion key={i.id} i={i} alRevocar={alRevocar} />
          ))}
        </ul>
      ) : (
        <p className="pa-vacio">{P.vacio}</p>
      )}
    </Seccion>
  );
}

function FilaInvitacion({ i, alRevocar }: { i: Invitacion; alRevocar: (aviso: string) => void }) {
  const { sb } = useDatosPanel();
  const [correr, error, ocupado] = useEscritura();
  const P = T.pendientes;
  const vencida = new Date(i.expira_en).getTime() <= Date.now();
  const id = `invitacion-${i.id}`;
  return (
    <li className="tarjeta pa-fila" aria-labelledby={`${id}-nombre`}>
      <div className="pa-fila__cabeza">
        <h3 id={`${id}-nombre`} className="pa-h3">
          {i.nombre}
        </h3>
        <Etiqueta variante={vencida ? "pronto" : "nota"}>{vencida ? P.vencida : P.vigente}</Etiqueta>
      </div>
      <p className="pa-largo">{i.correo}</p>
      <p className="microcopia">{vencida ? P.vencidaAyuda : P.vence(dia(i.expira_en))}</p>
      <Alerta texto={error} />
      <div className="acciones">
        {!vencida && <BotonCopiar texto={mensajeDe(i)} etiqueta={P.copiar} variante="terciario" />}
        <button
          type="button"
          className="boton boton--terciario"
          disabled={ocupado}
          aria-describedby={`${id}-nombre`}
          onClick={() =>
            void correr(async () => {
              datos(await sb.rpc("revocar_invitacion", { p_invitacion: i.id }));
              alRevocar(P.revocada(i.correo));
            })
          }
        >
          <Icono nombre="x" tamaño={20} />
          {P.revocar}
        </button>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Quién acompaña a quién

function Asignar({ miembros, asignaciones, alAsignar }: { miembros: Miembro[]; asignaciones: Asignacion[]; alAsignar: (aviso: string) => void }) {
  const { d } = useDatosPanel();
  const A = T.asignar;
  const [abierta, setAbierta] = useState<string | null>(null);
  const personas = d.participantes.filter((p) => p.estado !== "cerrado");
  const coachDe = (id: string) => asignaciones.find((a) => a.id === id)?.coach_id ?? null;
  const nombreCoach = (uid: string | null) => (uid ? miembros.find((m) => m.user_id === uid)?.nombre ?? A.sinCoach : A.sinCoach);
  const persona = abierta ? d.participantes.find((p) => p.id === abierta) ?? null : null;
  return (
    <Seccion titulo={A.titulo} id="equipo-asignar">
      <p className="microcopia">{A.ayuda}</p>
      {personas.length ? (
        <ul className="pa-filas">
          {personas.map((p) => {
            const c = cicloDe(d, p.id);
            const id = `asignar-${p.id}`;
            return (
              <li key={p.id} className="tarjeta pa-fila" aria-labelledby={`${id}-nombre`}>
                <div className="pa-fila__cabeza">
                  <h3 id={`${id}-nombre`} className="pa-h3">
                    {nombreDe(p)}
                  </h3>
                  {c && <span className="pa-plan">{planDe(c.plan_id).nombre}</span>}
                </div>
                <Datos filas={[[A.coach, nombreCoach(coachDe(p.id))]]} />
                <div className="acciones">
                  <button type="button" className="boton boton--terciario" aria-haspopup="dialog" aria-describedby={`${id}-nombre`} onClick={() => setAbierta(p.id)}>
                    <Icono nombre="users" tamaño={20} />
                    {A.cambiar}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="pa-vacio">{A.vacio}</p>
      )}
      <Hoja abierta={!!persona} onCerrar={() => setAbierta(null)} titulo={persona ? A.hojaTitulo(nombreDe(persona)) : A.cambiar}>
        {persona && (
          <FormAsignar
            key={persona.id}
            participante={persona.id}
            nombre={nombreDe(persona)}
            actual={coachDe(persona.id)}
            miembros={miembros.filter((m) => m.activo)}
            alGuardar={(aviso) => {
              setAbierta(null);
              alAsignar(aviso);
            }}
            alCancelar={() => setAbierta(null)}
          />
        )}
      </Hoja>
    </Seccion>
  );
}

function FormAsignar({
  participante,
  nombre,
  actual,
  miembros,
  alGuardar,
  alCancelar,
}: {
  participante: string;
  nombre: string;
  actual: string | null;
  miembros: Miembro[];
  alGuardar: (aviso: string) => void;
  alCancelar: () => void;
}) {
  const { sb } = useDatosPanel();
  const A = T.asignar;
  const [coach, setCoach] = useState(actual ?? "");
  const [motivo, setMotivo] = useState("");
  const [correr, error, ocupado] = useEscritura();
  return (
    <form
      className="pa-form"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const elegido = coach || null;
        if (elegido === actual) {
          alCancelar();
          return;
        }
        const ok = await correr(async () =>
          datos(await sb.rpc("asignar_coach", { p_participante: participante, p_coach: elegido, p_motivo: motivo.trim() || null })),
        );
        if (ok) alGuardar(elegido ? A.asignado(nombre, miembros.find((m) => m.user_id === elegido)?.nombre ?? "") : A.quitado(nombre));
      }}
    >
      <CampoSelect id="asignar-coach" etiqueta={A.elegir} value={coach} onChange={(e) => setCoach(e.target.value)}>
        <option value="">{A.ninguno}</option>
        {miembros.map((m) => (
          <option key={m.user_id} value={m.user_id}>
            {m.nombre}
            {m.rol === "dueno" ? ` (${T.personas.dueno})` : ""}
          </option>
        ))}
      </CampoSelect>
      <CampoArea id="asignar-motivo" etiqueta={A.motivo} ayuda={A.motivoAyuda} opcional max={200} rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      <Alerta texto={error} />
      <div className="acciones">
        <button type="submit" className="boton boton--primario" disabled={ocupado}>
          {A.guardar}
        </button>
        <button type="button" className="boton boton--terciario" onClick={alCancelar}>
          {A.cancelar}
        </button>
      </div>
    </form>
  );
}
