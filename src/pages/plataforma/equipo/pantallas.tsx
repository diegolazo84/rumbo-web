// Pantallas del panel real (etapa 3). Cada una arma con los datos de la base lo que la pantalla
// de la vista previa recibe y le pasa las escrituras; la presentación es la misma.
// Escrituras (6.4 y 6.7): las tablas de gestión con las políticas admin_todo (aal2) y las RPC
// de admin (crear_espacio, nuevo_enlace_solicitud, revisar_evidencia, publicar_programa…).
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import Etiqueta from "../../../components/Etiqueta";
import { Icono } from "../../../components/app";
import { CampoArea, CampoSelect, CampoTexto } from "../../../components/form";
import { CONTACTO, LIMITES, PREFERENCIAS } from "../../../data/formularios";
import { anioDe, fechaLarga, mayuscula, type Iso } from "../../../lib/fechas";
import { datos } from "../../../lib/supabase";
import type { RutaPlataforma } from "../rutas";
import { R_REAL } from "../../vista-previa/mi-espacio/espacio";
import Carga from "../../vista-previa/mi-espacio/Carga";
import { ListaAjustes } from "../../vista-previa/panel/Ajustes";
import { BotonCopiar, Cabeza, Datos, Seccion, conId, useParametro, usePanel, useVence } from "../../vista-previa/panel/comun";
import { TIPOS_PETICION } from "../../vista-previa/panel/ejemplo";
import { ContenidoSolicitud, type AcuerdoSolicitud, type ServidorSolicitud } from "../../vista-previa/panel/FichaSolicitud";
import { ListaEvidencias } from "../../vista-previa/panel/Fotos";
import { ColaHoy } from "../../vista-previa/panel/Hoy";
import { ListaParticipantes } from "../../vista-previa/panel/Participantes";
import { ListaSolicitudes } from "../../vista-previa/panel/Solicitudes";
import { CONTACTO_PANEL, MAS, PANEL_REAL, T_PANEL } from "../../vista-previa/panel/textos";
import { ConstructorReal } from "./constructor";
import { aAjuste, aFicha, aSolicitud, colaReal, nombreDe, reordenesDe, reordenesUsados, type FilaMensaje, type FilaPeticion } from "./datos";
import { RegistrarFactor, factoresTotp } from "./Mfa";
import { FichaParticipanteReal, RevisionReal } from "./participante";
import { Alerta, NoEncontrada, useDatosPanel, useEscritura, useInstantanea } from "./comun";

export default function Pantallas({ ruta }: { ruta: RutaPlataforma }) {
  switch (ruta.ruta) {
    case "/equipo/":
      return <HoyReal />;
    case "/equipo/solicitudes/":
      return <SolicitudesReal />;
    case "/equipo/solicitud/":
      return <FichaSolicitudReal />;
    case "/equipo/participantes/":
      return <ParticipantesReal />;
    case "/equipo/participante/":
      return <FichaParticipanteReal />;
    case "/equipo/constructor/":
      return <ConstructorReal />;
    case "/equipo/revision/":
      return <RevisionReal />;
    case "/equipo/ajustes/":
      return <AjustesReal />;
    case "/equipo/revisar/":
      return <RevisarReal />;
    case "/equipo/contacto/":
      return <ContactoReal />;
    case "/equipo/mas/":
      return <MasReal />;
    default:
      return <HoyReal />;
  }
}

// ---------------------------------------------------------------------------
// Hoy, solicitudes y participantes

function HoyReal() {
  const { d } = useDatosPanel();
  const { R } = usePanel();
  return <ColaHoy items={colaReal(d, R)} />;
}

function SolicitudesReal() {
  const { d } = useDatosPanel();
  return <ListaSolicitudes solicitudes={d.solicitudes.map(aSolicitud)} />;
}

function ParticipantesReal() {
  const { d } = useDatosPanel();
  return <ListaParticipantes lista={d.participantes.map((p) => aFicha(d, p))} />;
}

// ---------------------------------------------------------------------------
// Ficha de solicitud (5.4)

function FichaSolicitudReal() {
  const id = useParametro("id");
  const { sb, d, recargar } = useDatosPanel();
  const { R } = usePanel();
  const navegar = useNavigate();
  const fila = d.solicitudes.find((s) => s.id === id);
  const abierta = useRef<string | null>(null);

  // Abrir la ficha pasa una solicitud «recibida» a «en revisión» (5.4).
  useEffect(() => {
    if (!fila || fila.estado !== "recibida" || fila.tipo !== "solicitud" || abierta.current === fila.id) return;
    abierta.current = fila.id;
    void (async () => {
      try {
        datos(await sb.from("solicitudes").update({ estado: "en_revision" }).eq("id", fila.id));
        await recargar();
      } catch {
        /* se reintenta la próxima vez que se abra */
      }
    })();
  }, [fila, sb, recargar]);

  if (!id) return <Carga estado="cargando" />;
  if (!fila) return <NoEncontrada volver={R.solicitudes} />;

  const escribir = async (cambio: Record<string, unknown>) => {
    datos(await sb.from("solicitudes").update(cambio).eq("id", fila.id));
    await recargar();
  };
  const servidor: ServidorSolicitud = {
    acuerdo: (fila.acuerdo as AcuerdoSolicitud | null) ?? null,
    aceptadaEl: fila.condiciones_aceptadas?.fecha?.slice(0, 10) ?? null,
    notas: fila.notas_internas ?? "",
    marcarRespondida: () => escribir({ estado: "respondida" }),
    registrarAcuerdo: (a) => escribir({ acuerdo: a, estado: "acordada" }),
    crearEspacio: async () => {
      datos(await sb.rpc("crear_espacio", { p_solicitud: fila.id }));
      await recargar();
    },
    cerrar: (motivo, nota) => escribir({ estado: "cerrada", motivo_cierre: motivo, nota_cierre: nota || null }),
    nuevoEnlace: async (token) => {
      datos(await sb.rpc("nuevo_enlace_solicitud", { p_solicitud: fila.id, p_token: token }));
    },
    borrar: async () => {
      datos(await sb.from("solicitudes").delete().eq("id", fila.id));
      await recargar();
    },
    guardarNotas: (texto) => escribir({ notas_internas: texto.trim() || null }),
  };
  const anterior = fila.duplicado_de ? d.solicitudes.find((s) => s.id === fila.duplicado_de) : undefined;
  return (
    <>
      <ContenidoSolicitud key={fila.id} s={aSolicitud(fila)} anterior={anterior ? aSolicitud(anterior) : undefined} servidor={servidor} />
      {fila.participante_id && (
        <p>
          <button type="button" className="boton boton--secundario" onClick={() => navegar(conId(R.participante, fila.participante_id!))}>
            {PANEL_REAL.solicitud.verParticipante}
          </button>
        </p>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Solicitudes de ajuste (5.9)

function AjustesReal() {
  const { sb, d, recargar } = useDatosPanel();
  const abiertas = d.ajustes.filter((a) => a.estado === "enviada" || a.estado === "en_revision");
  const fijos = useInstantanea(abiertas.map((a) => a.id));
  const marcadas = useRef(false);

  // Abrirlas las pasa a «En revisión» (la persona lo ve así).
  useEffect(() => {
    if (marcadas.current) return;
    marcadas.current = true;
    const enviadas = d.ajustes.filter((a) => a.estado === "enviada").map((a) => a.id);
    if (!enviadas.length) return;
    void (async () => {
      try {
        datos(await sb.from("solicitudes_ajuste").update({ estado: "en_revision" }).in("id", enviadas));
        await recargar();
      } catch {
        /* se reintenta al volver a abrir */
      }
    })();
  }, [d.ajustes, sb, recargar]);

  const filas = d.ajustes
    .filter((a) => fijos.has(a.id))
    .map((fila) => {
      const c = d.ciclos.find((x) => x.id === fila.ciclo_id);
      return { a: aAjuste(d, fila), usados: c ? reordenesUsados(d, c.id) : 0, deCiclo: reordenesDe(d, c?.plan_id ?? "coach"), respuesta: fila.respuesta };
    });
  return (
    <ListaAjustes
      ajustes={filas}
      onResolver={async (id, estado, respuesta, cuenta) => {
        datos(
          await sb
            .from("solicitudes_ajuste")
            .update({ estado, respuesta, cuenta_como_reorden: cuenta, respondida_en: new Date().toISOString() })
            .eq("id", id),
        );
        await recargar();
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Revisar: fotos y explicaciones (5.8). En la etapa 3 no hay fotos (llegan en la 4).

type OcurrenciaEvidencia = { id: string; titulo: string; instrucciones: string; fecha: Iso };

function RevisarReal() {
  const { sb, d, recargar } = useDatosPanel();
  // Las filas al abrir: lo revisado sigue a la vista con su etiqueta hasta salir.
  const [filas] = useState(() => d.evidencias);
  const [ocurrencias, setOcurrencias] = useState<OcurrenciaEvidencia[] | null>(null);
  const ids = useMemo(() => [...new Set(filas.map((e) => e.ocurrencia_id))], [filas]);
  const clave = ids.join(",");
  useEffect(() => {
    let vivo = true;
    if (!ids.length) {
      setOcurrencias([]);
      return;
    }
    void (async () => {
      try {
        const r = datos(await sb.from("ocurrencias").select("id,titulo,instrucciones,fecha").in("id", ids)) as OcurrenciaEvidencia[];
        if (vivo) setOcurrencias(r);
      } catch {
        if (vivo) setOcurrencias([]);
      }
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, sb]);
  if (!ocurrencias) return <Carga estado="cargando" />;
  const lista = filas.map((e) => {
    const o = ocurrencias.find((x) => x.id === e.ocurrencia_id);
    const p = d.participantes.find((x) => x.id === e.participante_id);
    return {
      id: e.id,
      nombre: p ? nombreDe(p) : "—",
      accion: o?.titulo ?? "—",
      instrucciones: (o?.instrucciones ?? "").split("\n").filter((t) => t.trim()),
      fecha: o?.fecha ?? d.hoy,
      foto: false,
      explicacion: e.explicacion,
    };
  });
  return (
    <ListaEvidencias
      lista={lista}
      nota={PANEL_REAL.revisar.sinMiniatura}
      onRevisar={async (id, aprobar, nota) => {
        datos(await sb.rpc("revisar_evidencia", { p_registro: id, p_aprobar: aprobar, p_nota: nota || null }));
        await recargar();
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Contacto y derechos (5.10)

const MOTIVO: Record<string, string> = Object.fromEntries(CONTACTO.motivo.opciones.map((o) => [o.valor, o.texto]));

function ContactoReal() {
  const { sb } = useDatosPanel();
  const [mensajes, setMensajes] = useState<FilaMensaje[] | null>(null);
  const [peticiones, setPeticiones] = useState<FilaPeticion[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const [m, p] = await Promise.all([
          sb.from("mensajes_contacto").select("id,creado_en,motivo,nombre,correo,mensaje,estado").neq("estado", "archivado").order("creado_en", { ascending: false }).limit(100),
          sb.from("peticiones_derechos").select("id,recibida_en,origen,participante_id,correo,tipo,detalle,fecha_limite,estado,respuesta").order("recibida_en", { ascending: false }).limit(100),
        ]);
        if (!vivo) return;
        setMensajes(datos(m) as FilaMensaje[]);
        setPeticiones(datos(p) as FilaPeticion[]);
      } catch {
        if (vivo) setError(true);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [sb]);
  if (error) return <Carga estado="error" />;
  if (!mensajes || !peticiones) return <Carga estado="cargando" />;
  return (
    <div className="pa-pantalla">
      <Cabeza ojo={CONTACTO_PANEL.ojo} titulo={CONTACTO_PANEL.titulo} />
      <Seccion titulo={CONTACTO_PANEL.peticiones.titulo} id="peticiones">
        {peticiones.length ? (
          <ul className="pa-filas">
            {peticiones.map((x) => (
              <ItemPeticion key={x.id} x={x} />
            ))}
          </ul>
        ) : (
          <p className="pa-vacio">—</p>
        )}
      </Seccion>
      <Seccion titulo={CONTACTO_PANEL.mensajes.titulo} id="mensajes">
        {mensajes.length ? (
          <ul className="pa-filas">
            {mensajes.map((m) => (
              <ItemMensaje key={m.id} m={m} />
            ))}
          </ul>
        ) : (
          <p className="pa-vacio">—</p>
        )}
      </Seccion>
    </div>
  );
}

function ItemMensaje({ m }: { m: FilaMensaje }) {
  const { sb, recargar } = useDatosPanel();
  const [estado, setEstado] = useState(m.estado);
  const [respuesta, setRespuesta] = useState("");
  const [correr, error] = useEscritura();
  const id = `msj-${m.id}`;
  const mailto = `mailto:${m.correo}${respuesta ? `?body=${encodeURIComponent(respuesta)}` : ""}`;
  const cambiar = (nuevo: "respondido" | "archivado") =>
    void correr(async () => {
      datos(await sb.from("mensajes_contacto").update({ estado: nuevo, ...(nuevo === "respondido" ? { respondido_en: new Date().toISOString() } : {}) }).eq("id", m.id));
      setEstado(nuevo);
      await recargar();
    });
  return (
    <li className="tarjeta pa-fila" aria-labelledby={`${id}-titulo`}>
      <div className="pa-fila__cabeza">
        <h3 id={`${id}-titulo`} className="pa-h3">
          {m.nombre ?? <span className="pa-largo">{m.correo}</span>}
        </h3>
        <Etiqueta variante={estado === "nuevo" ? "activo" : "nota"}>{CONTACTO_PANEL.mensajes.estados[estado] ?? estado}</Etiqueta>
      </div>
      <Datos
        className="pa-datos--apilada"
        filas={[
          [CONTACTO_PANEL.mensajes.motivo, MOTIVO[m.motivo] ?? m.motivo],
          [CONTACTO_PANEL.mensajes.recibido, mayuscula(fechaLarga(m.creado_en.slice(0, 10)))],
          m.nombre && [CONTACTO_PANEL.correo, <span className="pa-largo">{m.correo}</span>],
        ]}
      />
      <blockquote className="pa-cita">
        <p>{m.mensaje}</p>
      </blockquote>
      {estado === "nuevo" && (
        <form className="pa-form" noValidate onSubmit={(e) => e.preventDefault()}>
          <CampoArea id={`${id}-respuesta`} etiqueta={CONTACTO_PANEL.mensajes.respuesta} opcional max={LIMITES.mensajeContacto.max} value={respuesta} rows={3} onChange={(e) => setRespuesta(e.target.value)} />
          <div className="acciones">
            <BotonCopiar texto={respuesta} />
            <a href={mailto} className="boton boton--secundario">
              <Icono nombre="mail" tamaño={20} />
              {T_PANEL.abrirCorreo}
            </a>
          </div>
          <Alerta texto={error} />
          <div className="acciones">
            <button type="button" className="boton boton--primario" onClick={() => cambiar("respondido")}>
              {CONTACTO_PANEL.mensajes.respondido}
            </button>
            <button type="button" className="boton boton--terciario" onClick={() => cambiar("archivado")}>
              {CONTACTO_PANEL.mensajes.archivar}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

function ItemPeticion({ x }: { x: FilaPeticion }) {
  const { sb, d, recargar } = useDatosPanel();
  const { R, hoy } = usePanel();
  const venceTexto = useVence();
  const [tipo, setTipo] = useState(x.tipo === "otro" ? "" : x.tipo);
  const [limite, setLimite] = useState(x.fecha_limite ?? "");
  const [respuesta, setRespuesta] = useState(x.respuesta ?? "");
  const [estado, setEstado] = useState(x.estado);
  const [correr, error] = useEscritura();
  const id = `pet-${x.id}`;
  const participante = x.participante_id ? d.participantes.find((p) => p.id === x.participante_id) : undefined;
  const guardar = (cambio: Record<string, unknown>, despues?: () => void) =>
    void correr(async () => {
      datos(await sb.from("peticiones_derechos").update(cambio).eq("id", x.id));
      despues?.();
      await recargar();
    });
  return (
    <li className="tarjeta pa-fila" aria-labelledby={`${id}-titulo`}>
      <div className="pa-fila__cabeza">
        <h3 id={`${id}-titulo`} className="pa-h3">
          {participante ? nombreDe(participante) : <span className="pa-largo">{x.correo}</span>}
        </h3>
        <Etiqueta variante={estado === "resuelta" ? "activo" : "nota"}>{estado === "resuelta" ? CONTACTO_PANEL.peticiones.resueltaEtiqueta : CONTACTO_PANEL.peticiones.abierta}</Etiqueta>
      </div>
      <Datos
        className="pa-datos--apilada"
        filas={[
          [CONTACTO_PANEL.peticiones.recibida, mayuscula(fechaLarga(x.recibida_en.slice(0, 10)))],
          [CONTACTO_PANEL.peticiones.fechaLimite, limite ? `${mayuscula(fechaLarga(limite))} · ${venceTexto(limite)}` : CONTACTO_PANEL.peticiones.fijaFecha],
          [CONTACTO_PANEL.correo, <span className="pa-largo">{x.correo}</span>],
        ]}
      />
      {x.detalle && (
        <blockquote className="pa-cita">
          <p>{x.detalle}</p>
        </blockquote>
      )}
      {estado === "abierta" && (
        <form className="pa-form" noValidate onSubmit={(e) => e.preventDefault()}>
          <div className="pa-dos">
            <CampoSelect
              id={`${id}-tipo`}
              etiqueta={CONTACTO_PANEL.peticiones.tipo}
              ayuda={x.origen === "contacto" ? CONTACTO_PANEL.peticiones.tipoAyuda : undefined}
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value);
                if (e.target.value) guardar({ tipo: e.target.value });
              }}
            >
              <option value="">—</option>
              {TIPOS_PETICION.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.texto}
                </option>
              ))}
            </CampoSelect>
            <CampoTexto
              id={`${id}-limite`}
              etiqueta={CONTACTO_PANEL.peticiones.fechaLimite}
              type="date"
              min={hoy}
              value={limite}
              onChange={(e) => setLimite(e.target.value)}
              onBlur={() => limite !== (x.fecha_limite ?? "") && guardar({ fecha_limite: limite || null })}
            />
          </div>
          <CampoArea id={`${id}-respuesta`} etiqueta={CONTACTO_PANEL.peticiones.respuesta} opcional max={LIMITES.detalleDerecho.max} value={respuesta} rows={3} onChange={(e) => setRespuesta(e.target.value)} />
          {participante && (
            <div className="acciones">
              <Link to={conId(R.participante, participante.id, { pestana: "datos" })} className="boton boton--secundario">
                <Icono nombre="download" tamaño={20} />
                {CONTACTO_PANEL.peticiones.exportar}
              </Link>
            </div>
          )}
          {!participante && <p className="microcopia">{CONTACTO_PANEL.peticiones.soloParticipantes}</p>}
          <Alerta texto={error} />
          <button
            type="button"
            className="boton boton--primario"
            onClick={() => guardar({ estado: "resuelta", respuesta: respuesta.trim() || null, resuelta_en: new Date().toISOString() }, () => setEstado("resuelta"))}
          >
            {CONTACTO_PANEL.peticiones.resuelta}
          </button>
        </form>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Más (5.11): postulaciones, ausencia, feriados y cuenta. La mantención de fotos llega con las
// fotos (etapa 4).

function MasReal() {
  const { sb, d, recargar } = useDatosPanel();
  const { R } = usePanel();
  const op = d.operacion;
  const [recibir, setRecibir] = useState(op?.postulaciones_abiertas ?? true);
  const [tope, setTope] = useState(op?.tope_solicitudes_dia ? String(op.tope_solicitudes_dia) : "");
  const [hasta, setHasta] = useState<Iso | "">(op?.ausencia_hasta ?? "");
  const [textoAusencia, setTextoAusencia] = useState(op?.ausencia_texto ?? "");
  const [guardarPost, errorPost] = useEscritura();
  const [guardarAus, errorAus] = useEscritura();
  const [avisoPost, setAvisoPost] = useState("");
  const [avisoAus, setAvisoAus] = useState("");
  const operacion = async (cambio: Record<string, unknown>) => {
    datos(await sb.from("ajustes_operacion").update(cambio).eq("id", true));
    await recargar();
  };

  return (
    <div className="pa-pantalla">
      <Cabeza ojo={MAS.ojo} titulo={MAS.titulo} />
      <Link to={R.contacto} className="tarjeta tarjeta--enlazada pa-enlace-tarjeta">
        <Icono nombre="mail" tamaño={20} />
        <span>{MAS.contacto}</span>
        <Icono nombre="arrow-right" tamaño={20} />
      </Link>

      <Seccion titulo={MAS.postulaciones.titulo} id="postulaciones" className="tarjeta pa-tarjeta">
        <form
          className="pa-form"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setAvisoPost("");
            const n = Number(tope);
            if (await guardarPost(() => operacion({ postulaciones_abiertas: recibir, tope_solicitudes_dia: n > 0 ? n : null }))) setAvisoPost(PANEL_REAL.guardado);
          }}
        >
          <div className="interruptor">
            <label className="interruptor__fila" htmlFor="recibir">
              <span className="interruptor__texto">{MAS.postulaciones.recibir}</span>
              <input
                id="recibir"
                type="checkbox"
                role="switch"
                className="interruptor__control"
                checked={recibir}
                aria-describedby="recibir-ayuda"
                onChange={(e) => setRecibir(e.target.checked)}
              />
            </label>
            <div id="recibir-ayuda" className="campo__ayuda">
              <p>{MAS.postulaciones.ayuda}</p>
            </div>
          </div>
          <CampoTexto
            id="tope"
            etiqueta={MAS.postulaciones.tope}
            opcional
            type="number"
            inputMode="numeric"
            min={1}
            value={tope}
            onChange={(e) => setTope(e.target.value.replace(/\D/g, ""))}
          />
          <Alerta texto={errorPost} />
          <button type="submit" className="boton boton--secundario">
            {PREFERENCIAS.nombre.boton}
          </button>
          <p role="status" className="microcopia">
            {avisoPost}
          </p>
        </form>
      </Seccion>

      <Seccion titulo={MAS.ausencia.titulo} id="ausencia" className="tarjeta pa-tarjeta">
        <form
          className="pa-form"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setAvisoAus("");
            if (await guardarAus(() => operacion({ ausencia_hasta: hasta || null, ausencia_texto: textoAusencia.trim() || null }))) setAvisoAus(PANEL_REAL.guardado);
          }}
        >
          <CampoTexto id="ausencia-hasta" etiqueta={MAS.ausencia.hasta} opcional type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          <CampoTexto
            id="ausencia-texto"
            etiqueta={MAS.ausencia.texto}
            ayuda={MAS.ausencia.efecto}
            opcional
            maxLength={200}
            placeholder={MAS.ausencia.ejemplo}
            value={textoAusencia}
            onChange={(e) => setTextoAusencia(e.target.value)}
          />
          <Alerta texto={errorAus} />
          <button type="submit" className="boton boton--secundario">
            {PREFERENCIAS.nombre.boton}
          </button>
          <p role="status" className="microcopia">
            {avisoAus}
          </p>
        </form>
      </Seccion>

      <Feriados />
      <Cuenta />
    </div>
  );
}

function Feriados() {
  const { sb, recargar } = useDatosPanel();
  const [lista, setLista] = useState<{ fecha: Iso; nombre: string }[] | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [correr, error] = useEscritura();
  const leer = async () => setLista(datos(await sb.from("feriados").select("fecha,nombre").order("fecha")) as { fecha: Iso; nombre: string }[]);
  useEffect(() => {
    void leer().catch(() => setLista([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb]);
  const anios = [...new Set((lista ?? []).map((f) => anioDe(f.fecha)))].sort();
  return (
    <Seccion titulo={MAS.feriados.titulo} id="feriados" className="tarjeta pa-tarjeta">
      {anios.map((anio) => (
        <div key={anio} className="pa-pila pa-pila--chica">
          <h3 className="pa-h3">{anio}</h3>
          <ul className="pa-lista-simple">
            {(lista ?? [])
              .filter((f) => anioDe(f.fecha) === anio)
              .map((f) => (
                <li key={f.fecha}>
                  <strong>{mayuscula(fechaLarga(f.fecha))}</strong> · {f.nombre}
                </li>
              ))}
          </ul>
        </div>
      ))}
      <p className="microcopia">{MAS.feriados.fuente}</p>
      <form
        className="pa-form"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (!nuevaFecha || !nuevoNombre.trim()) return;
          const ok = await correr(async () => {
            datos(await sb.from("feriados").upsert({ fecha: nuevaFecha, nombre: nuevoNombre.trim() }));
            await leer();
            await recargar();
          });
          if (ok) {
            setNuevaFecha("");
            setNuevoNombre("");
          }
        }}
      >
        <div className="pa-dos">
          <CampoTexto id="feriado-fecha" etiqueta={MAS.feriados.fecha} type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} />
          <CampoTexto id="feriado-nombre" etiqueta={MAS.feriados.nombre} value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} />
        </div>
        <Alerta texto={error} />
        <button type="submit" className="boton boton--secundario">
          <Icono nombre="plus" tamaño={20} />
          {MAS.feriados.agregar}
        </button>
      </form>
    </Seccion>
  );
}

function Cuenta() {
  const { sb } = useDatosPanel();
  const [factores, setFactores] = useState<string[] | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const leer = async () => {
    const { verificados } = await factoresTotp(sb);
    setFactores(verificados.map((f, i) => f.friendly_name || PANEL_REAL.mfa.nombreFactor(i + 1)));
  };
  useEffect(() => {
    void leer().catch(() => setFactores([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb]);
  const texto: ReactNode = factores ? `${factores.length ? `${factores.join(" · ")}. ` : ""}${PANEL_REAL.mas.factoresTexto(factores.length)} ${MAS.cuenta.deben}` : "…";
  return (
    <Seccion titulo={MAS.cuenta.titulo} id="cuenta" className="tarjeta pa-tarjeta">
      <Datos filas={[[MAS.cuenta.factores, texto]]} />
      {factores && factores.length < 2 && !registrando && (
        <button type="button" className="boton boton--secundario pa-boton-solo" onClick={() => setRegistrando(true)}>
          {PANEL_REAL.mas.agregarFactor}
        </button>
      )}
      {registrando && factores && (
        <RegistrarFactor
          sb={sb}
          numero={factores.length + 1}
          onListo={() => {
            setRegistrando(false);
            void leer();
          }}
        />
      )}
      <Link to={R_REAL.salir} className="boton boton--secundario pa-boton-solo">
        <Icono nombre="log-out" tamaño={20} />
        {MAS.cuenta.salir}
      </Link>
    </Seccion>
  );
}
