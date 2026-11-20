// Especialistas Rumbo (20-nov-2026): siempre presente en Mi espacio (migración 20261207).
// · Directorio: especialistas_publicados() — solo perfiles que el dueño verificó y publicó, sin
//   correo. Filtro por especialidad (tabla especialidades).
// · Perfil en una hoja: cómo trabaja, credenciales revisadas, servicios y «Pedir hora»
//   (pedir_reserva). Si el dueño tiene las reservas en pausa, se dice y se ofrece al coach.
// · Tus solicitudes: reservas_especialista propias (RLS yo_leer), con cancelar (cancelar_reserva).
// Vista previa: perfiles de ejemplo rotulados, y nada se envía.
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Hoja, Icono, type NombreIconoApp } from "../../../components/app";
import { Cascada, Entra, Escena, Paso } from "../../../components/app/Movimiento";
import { fechaLarga, type Iso } from "../../../lib/fechas";
import { ErrorBase, datos, supabase } from "../../../lib/supabase";
import { EtiquetaEjemplo, useEspacio } from "./comun";
import { T_ESPECIALISTAS as T } from "./especialistas/textos";
import "../../../styles/vista-especialistas.css";

type Servicio = { id: string; nombre: string; descripcion: string | null; duracion_min: number | null; modalidad: string | null; precio_clp: number | null; precio_usd: number | null };
type Especialista = {
  id: string;
  nombre: string;
  profesion: string | null;
  especialidades: string[];
  presentacion: string | null;
  como_se_alinea: string | null;
  modalidad: string | null;
  comuna: string | null;
  credenciales: { tipo: string; descripcion: string; emisor: string | null }[] | null;
  servicios: Servicio[] | null;
};
type Especialidad = { clave: string; nombre: string };
type Reserva = { id: string; especialista_id: string; servicio_id: string; estado: string; programada_para: string | null; enlace: string | null; creada_en: string };
type Datos = { especialidades: Especialidad[]; especialistas: Especialista[]; reservas: Reserva[] };

const ESPECIALIDADES_BASE: Especialidad[] = [
  { clave: "nutricion", nombre: "Nutrición" },
  { clave: "psicologia", nombre: "Psicología" },
  { clave: "actividad_fisica", nombre: "Actividad física" },
  { clave: "sueno", nombre: "Sueño y descanso" },
  { clave: "finanzas_personales", nombre: "Finanzas personales" },
  { clave: "organizacion", nombre: "Organización y productividad" },
];

// Vista previa: perfiles de ejemplo (la pantalla lleva la etiqueta «Ejemplo»).
const EJEMPLO: Datos = {
  especialidades: ESPECIALIDADES_BASE,
  especialistas: [
    {
      id: "e1",
      nombre: "Valentina Rojas",
      profesion: "Nutricionista",
      especialidades: ["nutricion"],
      presentacion: "Trabajo con cambios pequeños y sostenibles: partimos por lo que ya comes y vamos ajustando semana a semana.",
      como_se_alinea: "Creo en avanzar sin culpa y con un plan que se acomode a tu vida.",
      modalidad: "ambas",
      comuna: "Ñuñoa",
      credenciales: [{ tipo: "titulo", descripcion: "Nutricionista", emisor: "Universidad de ejemplo" }],
      servicios: [
        { id: "s1", nombre: "Primera conversación", descripcion: "Revisamos tus hábitos y lo que quieres lograr.", duracion_min: 45, modalidad: "en_linea", precio_clp: 25000, precio_usd: null },
        { id: "s2", nombre: "Control mensual", descripcion: null, duracion_min: 30, modalidad: "ambas", precio_clp: 18000, precio_usd: null },
      ],
    },
    {
      id: "e2",
      nombre: "Tomás Fuentes",
      profesion: "Profesor de educación física",
      especialidades: ["actividad_fisica", "sueno"],
      presentacion: "Rutinas cortas que caben en tu semana real, en casa o al aire libre.",
      como_se_alinea: "Moverse un poco cada día vale más que una semana perfecta.",
      modalidad: "en_linea",
      comuna: null,
      credenciales: [{ tipo: "titulo", descripcion: "Profesor de educación física", emisor: "Universidad de ejemplo" }],
      servicios: [{ id: "s3", nombre: "Plan de movimiento", descripcion: "Una rutina para tus días disponibles.", duracion_min: 40, modalidad: "en_linea", precio_clp: 20000, precio_usd: null }],
    },
    {
      id: "e3",
      nombre: "Javiera Ortiz",
      profesion: "Asesora financiera",
      especialidades: ["finanzas_personales", "organizacion"],
      presentacion: "Ordenamos tus gastos sin planillas imposibles y armamos un presupuesto que puedas cumplir.",
      como_se_alinea: null,
      modalidad: "en_linea",
      comuna: null,
      credenciales: [{ tipo: "certificacion", descripcion: "Certificación en finanzas personales", emisor: "Institución de ejemplo" }],
      servicios: [{ id: "s4", nombre: "Ordenar mi presupuesto", descripcion: null, duracion_min: 60, modalidad: "en_linea", precio_clp: 30000, precio_usd: null }],
    },
  ],
  reservas: [{ id: "r1", especialista_id: "e1", servicio_id: "s1", estado: "aceptada", programada_para: "2026-11-24T19:00:00-03:00", enlace: null, creada_en: "2026-11-18T10:00:00-03:00" }],
};

async function leer(): Promise<Datos> {
  const sb = await supabase();
  const [esp, lista, res] = await Promise.all([
    sb.from("especialidades").select("clave,nombre").eq("activa", true).order("orden"),
    sb.rpc("especialistas_publicados"),
    sb.from("reservas_especialista").select("id,especialista_id,servicio_id,estado,programada_para,enlace,creada_en").order("creada_en", { ascending: false }).limit(30),
  ]);
  return {
    especialidades: esp.error ? ESPECIALIDADES_BASE : (esp.data as Especialidad[]),
    especialistas: (datos(lista) ?? []) as Especialista[],
    reservas: res.error ? [] : ((res.data ?? []) as Reserva[]),
  };
}

const iniciales = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
// Un tono de la paleta de metas por persona (estable por id), para el avatar con iniciales.
const tono = (id: string) => [...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 8;

export default function Especialistas() {
  const esp = useEspacio();
  const [d, setD] = useState<Datos | null>(esp.real ? null : EJEMPLO);
  const [error, setError] = useState(false);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<Especialista | null>(null);
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(() => {
    if (!esp.real) return;
    setError(false);
    leer()
      .then(setD)
      .catch(() => setError(true));
  }, [esp.real]);
  useEffect(cargar, [cargar]);

  const nombreEsp = useMemo(() => new Map((d?.especialidades ?? ESPECIALIDADES_BASE).map((e) => [e.clave, e.nombre])), [d]);
  const visibles = (d?.especialistas ?? []).filter((e) => !filtro || e.especialidades.includes(filtro));
  const conPerfiles = new Set((d?.especialistas ?? []).flatMap((e) => e.especialidades));

  return (
    <Escena>
      <div className="me-pantalla es">
        <Entra como="header" className="es-portada">
          <Paisaje />
          <div className="es-portada__texto">
            <p className="es-ojo">
              {T.ojo}
              {!esp.real && <EtiquetaEjemplo />}
            </p>
            <h1 className="es-h1" tabIndex={-1}>
              {T.titulo}
            </h1>
            <p className="es-bajada">{T.bajada}</p>
            <ul className="es-sellos">
              {T.sellos.map((s) => (
                <li key={s.texto}>
                  <Icono nombre={s.icono as NombreIconoApp} tamaño={16} />
                  {s.texto}
                </li>
              ))}
            </ul>
          </div>
        </Entra>

        <section className="es-pasos" aria-labelledby="es-pasos-t">
          <h2 id="es-pasos-t" className="sr-only">
            {T.pasos.titulo}
          </h2>
          <Cascada como="ol" className="es-pasos__lista">
            {T.pasos.lista.map((p, i) => (
              <Paso key={p.titulo} className="es-paso">
                <span className="es-paso__n" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="es-paso__t">{p.titulo}</h3>
                <p>{p.texto}</p>
              </Paso>
            ))}
          </Cascada>
        </section>

        {error ? (
          <div className="es-vacio" role="alert">
            <p className="es-vacio__t">{T.perfil.errores.conexion}</p>
            <button type="button" className="boton boton--secundario" onClick={cargar}>
              Reintentar
            </button>
          </div>
        ) : !d ? (
          <p className="microcopia" role="status">
            Cargando…
          </p>
        ) : (
          <>
            <section className="es-directorio" aria-labelledby="es-dir-t">
              <div className="es-directorio__cabeza">
                <h2 id="es-dir-t" className="me-h2">
                  {T.directorio}
                </h2>
                {d.especialistas.length > 0 && <span className="microcopia">{T.cuenta(visibles.length)}</span>}
              </div>
              {d.especialistas.length > 0 && (
                <div className="es-filtros" role="group" aria-label={T.filtros.titulo}>
                  <button type="button" className="es-filtro" aria-pressed={filtro === null} onClick={() => setFiltro(null)}>
                    {T.filtros.todas}
                  </button>
                  {d.especialidades
                    .filter((e) => conPerfiles.has(e.clave))
                    .map((e) => (
                      <button key={e.clave} type="button" className="es-filtro" aria-pressed={filtro === e.clave} onClick={() => setFiltro(filtro === e.clave ? null : e.clave)}>
                        {e.nombre}
                      </button>
                    ))}
                </div>
              )}
              {d.especialistas.length === 0 ? (
                <Vacio />
              ) : visibles.length === 0 ? (
                <p className="es-vacio__texto">{T.vacioFiltro}</p>
              ) : (
                <Cascada className="es-grilla" key={filtro ?? "todas"}>
                  {visibles.map((e) => (
                    <Paso key={e.id} className="es-tarjeta">
                      <Tarjeta e={e} nombreEsp={nombreEsp} onAbrir={() => setAbierto(e)} />
                    </Paso>
                  ))}
                </Cascada>
              )}
            </section>

            <Reservas d={d} alCambiar={(t) => (setAviso(t), cargar())} />
          </>
        )}
        <p role="status" className="sr-only">
          {aviso}
        </p>

        <Hoja abierta={!!abierto} onCerrar={() => setAbierto(null)} titulo={abierto?.nombre ?? ""} className="es-hoja">
          {abierto && <Perfil e={abierto} nombreEsp={nombreEsp} alPedir={(t) => (setAviso(t), cargar())} />}
        </Hoja>
      </div>
    </Escena>
  );
}

function Avatar({ e, grande }: { e: Especialista; grande?: boolean }) {
  return (
    <span className={grande ? "es-avatar es-avatar--grande" : "es-avatar"} data-tono={tono(e.id)} aria-hidden="true">
      {iniciales(e.nombre)}
    </span>
  );
}

function Tarjeta({ e, nombreEsp, onAbrir }: { e: Especialista; nombreEsp: Map<string, string>; onAbrir: () => void }) {
  const desde = (e.servicios ?? []).map((s) => s.precio_clp).filter((p): p is number => !!p);
  return (
    <>
      <div className="es-tarjeta__cabeza">
        <Avatar e={e} />
        <div>
          <h3 className="es-tarjeta__nombre">{e.nombre}</h3>
          {e.profesion && <p className="es-tarjeta__prof">{e.profesion}</p>}
        </div>
      </div>
      {(e.credenciales?.length ?? 0) > 0 && (
        <p className="es-verificado">
          <Icono nombre="shield-check" tamaño={16} />
          {T.tarjeta.verificado}
        </p>
      )}
      <ul className="es-chips" aria-label={T.filtros.titulo}>
        {e.especialidades.map((c) => (
          <li key={c}>{nombreEsp.get(c) ?? c}</li>
        ))}
      </ul>
      {e.presentacion && <p className="es-tarjeta__texto">{e.presentacion}</p>}
      <div className="es-tarjeta__pie">
        <span className="microcopia">
          {[e.modalidad && T.tarjeta.modalidad[e.modalidad], e.comuna, desde.length ? `desde $${Math.min(...desde).toLocaleString("es-CL")}` : null].filter(Boolean).join(" · ")}
        </span>
        <button type="button" className="boton boton--secundario es-tarjeta__ver" onClick={onAbrir} aria-label={`${T.tarjeta.ver}: ${e.nombre}`}>
          {T.tarjeta.ver}
          <Icono nombre="arrow-right" tamaño={16} />
        </button>
      </div>
    </>
  );
}

function Perfil({ e, nombreEsp, alPedir }: { e: Especialista; nombreEsp: Map<string, string>; alPedir: (t: string) => void }) {
  const esp = useEspacio();
  const servicios = e.servicios ?? [];
  const [elegido, setElegido] = useState<string | null>(servicios[0]?.id ?? null);
  const [mensaje, setMensaje] = useState("");
  const [estado, setEstado] = useState<"" | "enviando" | "pedida" | keyof typeof T.perfil.errores>("");
  const pedir = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!elegido || estado === "enviando") return;
    if (!esp.real) return setEstado("pedida");
    setEstado("enviando");
    try {
      const sb = await supabase();
      datos(await sb.rpc("pedir_reserva", { p_servicio: elegido, p_mensaje: mensaje.trim() || null }));
      setEstado("pedida");
      setMensaje("");
      alPedir(T.perfil.pedida);
    } catch (err) {
      const c = err instanceof ErrorBase ? `${err.campo}:${err.codigo}` : "";
      setEstado(c === "reservas:no_disponibles" ? "reservas" : c === "reserva:demasiadas" ? "demasiadas" : c === "sesion:sin_ficha" ? "ciclo" : "conexion");
    }
  };
  const msg = estado === "pedida" ? T.perfil.pedida : estado && estado !== "enviando" ? T.perfil.errores[estado] : "";
  return (
    <div className="es-perfil">
      <div className="es-perfil__cabeza">
        <Avatar e={e} grande />
        <div>
          {e.profesion && <p className="es-tarjeta__prof">{e.profesion}</p>}
          <ul className="es-chips">
            {e.especialidades.map((c) => (
              <li key={c}>{nombreEsp.get(c) ?? c}</li>
            ))}
          </ul>
        </div>
      </div>
      {e.presentacion && (
        <section>
          <h3 className="es-perfil__h">{T.perfil.presentacion}</h3>
          <p>{e.presentacion}</p>
        </section>
      )}
      {e.como_se_alinea && (
        <blockquote className="es-cita">
          <p>{e.como_se_alinea}</p>
        </blockquote>
      )}
      {(e.credenciales?.length ?? 0) > 0 && (
        <section>
          <h3 className="es-perfil__h">{T.perfil.credenciales}</h3>
          <ul className="es-credenciales">
            {e.credenciales!.map((c) => (
              <li key={c.descripcion}>
                <Icono nombre="shield-check" tamaño={16} />
                <span>
                  {c.descripcion}
                  {c.emisor && <span className="microcopia"> · {c.emisor}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {servicios.length > 0 && (
        <form className="es-pedir" onSubmit={(ev) => void pedir(ev)}>
          <fieldset>
            <legend className="es-perfil__h">{T.perfil.servicios}</legend>
            <div className="es-servicios">
              {servicios.map((s) => (
                <label key={s.id} className="es-servicio">
                  <input type="radio" name="servicio" value={s.id} checked={elegido === s.id} onChange={() => setElegido(s.id)} />
                  <span className="es-servicio__cuerpo">
                    <span className="es-servicio__nombre">{s.nombre}</span>
                    <span className="microcopia">
                      {[s.duracion_min && T.tarjeta.minutos(s.duracion_min), s.modalidad && T.tarjeta.modalidad[s.modalidad]].filter(Boolean).join(" · ")}
                    </span>
                    {s.descripcion && <span className="es-servicio__texto">{s.descripcion}</span>}
                  </span>
                  <span className="es-servicio__precio">{T.perfil.precio(s.precio_clp, s.precio_usd)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor="es-mensaje" className="es-perfil__h es-perfil__h--chico">
            {T.perfil.mensaje}
          </label>
          <textarea id="es-mensaje" className="es-mensaje" rows={3} maxLength={500} value={mensaje} onChange={(ev) => setMensaje(ev.target.value)} aria-describedby="es-mensaje-ayuda" />
          <p id="es-mensaje-ayuda" className="microcopia">
            {T.perfil.mensajeAyuda}
          </p>
          <p className="es-pago">
            <Icono nombre="info" tamaño={16} />
            {T.perfil.pago}
          </p>
          <button type="submit" className="boton boton--primario boton--ancho" disabled={estado === "enviando" || estado === "pedida"}>
            {estado === "enviando" ? T.perfil.pidiendo : T.perfil.pedir}
          </button>
          <p role="status" className={estado && estado !== "pedida" && estado !== "enviando" ? "es-estado es-estado--error" : "es-estado"}>
            {msg}
            {estado === "reservas" && (
              <>
                {" "}
                <Link to={esp.R.semana}>{T.vacio.boton}</Link>
              </>
            )}
          </p>
          {!esp.real && <p className="microcopia">{T.perfil.ejemplo}</p>}
        </form>
      )}
    </div>
  );
}

function Reservas({ d, alCambiar }: { d: Datos; alCambiar: (t: string) => void }) {
  const esp = useEspacio();
  const [ocupado, setOcupado] = useState<string | null>(null);
  if (d.especialistas.length === 0 && d.reservas.length === 0) return null;
  const quien = new Map(d.especialistas.map((e) => [e.id, e]));
  const servicio = new Map(d.especialistas.flatMap((e) => (e.servicios ?? []).map((s) => [s.id, s.nombre] as const)));
  const cancelar = async (id: string) => {
    if (!esp.real) return alCambiar(T.reservas.cancelada);
    setOcupado(id);
    try {
      const sb = await supabase();
      datos(await sb.rpc("cancelar_reserva", { p_reserva: id }));
      alCambiar(T.reservas.cancelada);
    } catch {
      alCambiar(T.perfil.errores.conexion);
    } finally {
      setOcupado(null);
    }
  };
  return (
    <section className="es-reservas" aria-labelledby="es-res-t">
      <h2 id="es-res-t" className="me-h2">
        {T.reservas.titulo}
      </h2>
      {d.reservas.length === 0 ? (
        <p className="es-vacio__texto">{T.reservas.vacio}</p>
      ) : (
        <ul className="es-reservas__lista">
          {d.reservas.map((r) => {
            const e = quien.get(r.especialista_id);
            return (
              <li key={r.id} className="es-reserva" data-estado={r.estado}>
                <span className="es-reserva__punto" aria-hidden="true" />
                <div className="es-reserva__cuerpo">
                  <p className="es-reserva__t">{servicio.get(r.servicio_id) ?? "Sesión"}</p>
                  <p className="microcopia">
                    {[e?.nombre, r.programada_para ? `${fechaLarga(r.programada_para.slice(0, 10) as Iso)}, ${r.programada_para.slice(11, 16)}` : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="es-reserva__estado">{T.reservas.estados[r.estado] ?? r.estado}</span>
                <div className="es-reserva__acciones">
                  {r.enlace && r.estado === "aceptada" && (
                    <a className="boton boton--primario me-boton-chico" href={r.enlace} target="_blank" rel="noreferrer">
                      {T.reservas.entrar}
                    </a>
                  )}
                  {(r.estado === "pedida" || r.estado === "aceptada") && (
                    <button type="button" className="boton boton--terciario me-boton-chico" disabled={ocupado === r.id} onClick={() => void cancelar(r.id)}>
                      {T.reservas.cancelar}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Vacio() {
  const { R } = useEspacio();
  return (
    <div className="es-vacio">
      <Brote />
      <div>
        <p className="es-vacio__t">{T.vacio.titulo}</p>
        <p className="es-vacio__texto">{T.vacio.texto}</p>
        <Link to={R.semana} className="boton boton--secundario">
          {T.vacio.boton}
        </Link>
      </div>
    </div>
  );
}

// Ilustración de la portada: colinas orgánicas con sendero y sol (solo tokens de ilustración).
function Paisaje() {
  return (
    <svg className="es-paisaje" viewBox="0 0 600 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <circle className="es-paisaje__sol" cx="470" cy="78" r="34" />
      <path className="es-paisaje__lejos" d="M0 170 C90 120 170 130 250 150 S420 110 600 140 V260 H0Z" />
      <path className="es-paisaje__medio" d="M0 200 C120 160 220 175 320 190 S500 160 600 180 V260 H0Z" />
      <path className="es-paisaje__sendero" d="M300 260 C310 230 360 214 420 205 S520 192 600 190" />
      <path className="es-paisaje__cerca" d="M0 230 C140 205 260 215 380 228 S540 222 600 215 V260 H0Z" />
      <g className="es-paisaje__hojas">
        <path d="M80 222 c-6-18 2-34 14-42 c4 16-2 32-14 42Z" />
        <path d="M96 224 c4-16 18-24 32-24 c-6 14-18 22-32 24Z" />
        <path d="M520 214 c-4-14 2-26 12-32 c2 12-2 24-12 32Z" />
      </g>
    </svg>
  );
}

function Brote() {
  return (
    <svg className="es-brote" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <ellipse className="es-brote__suelo" cx="60" cy="102" rx="40" ry="8" />
      <path className="es-brote__tallo" d="M60 100 C60 80 58 66 60 50" />
      <path className="es-brote__hoja" d="M60 66 C44 64 34 52 34 38 C50 40 60 50 60 66Z" />
      <path className="es-brote__hoja es-brote__hoja--b" d="M60 56 C74 52 86 40 86 26 C70 28 60 40 60 56Z" />
      <circle className="es-brote__sol" cx="92" cy="22" r="8" />
    </svg>
  );
}
