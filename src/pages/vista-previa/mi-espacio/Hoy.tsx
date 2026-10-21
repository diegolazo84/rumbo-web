// Vista previa · Hoy (plataforma 4.4, 4.5 y 4.6): la pantalla principal de Mi espacio.
// Responde en 3 segundos qué hago ahora, a qué hora y cómo. Marcar y desmarcar funcionan en
// memoria: el check cambia al instante y los créditos, el nivel, el bono y la bajada se
// actualizan con la «respuesta del servidor» (simulada, con las reglas de rumbo.ts).
// Estados: algunas, ninguna, completo, sin-acciones, creditos-ocultos, cercano (Martín, día de
// videollamada), sin-conexion, ausencia y error-bloque (4.1.4). Las variantes «lista» y
// «aviso-carga» las usa DiasAnteriores.tsx (bloque «De días anteriores» con más pendientes).
// La banda de «sin conexión» y de ausencia la pone el marco (registro.ts, campo `banda`).
//
// Etapa 2A (21-oct-2026): las acciones del día van primero, agrupadas por momento (mañana, tarde,
// noche, cuando puedas), cada una con su icono y la meta a la que aporta, en el color de la meta.
// El avance del día es un anillo; el foco es una franja; «Tu acompañamiento» reúne la próxima
// revisión, «Me está costando» y las novedades; «De días anteriores» parte plegado.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Etiqueta from "../../../components/Etiqueta";
import { AnilloDia, BarraProgreso, ErrorBloque, Hoja, HojaAyuda, Icono, Tostada } from "../../../components/app";
import { ESCENARIO_CERCANO, HOY, ocurrenciasDel, type Escenario, type Ocurrencia } from "../../../data/ejemplo-app";
import { diaCorto, mayuscula, sumarDias, type Iso } from "../../../lib/fechas";
import { MOMENTOS, momentoDe, type Momento } from "../../../lib/mi-rumbo";
import type { PropsPantalla } from "../registro";
import {
  Cabeza,
  FilaOcurrencia,
  RegionViva,
  useAvisos,
  useEspacio,
  usePrograma,
  type Cambios,
  type Progreso,
} from "./comun";
import Detalle from "./Detalle";
import { TituloSeccion } from "./Seccion";
import { T_ANTERIORES, T_COMUN, T_COSTANDO, T_HOY, T_RESUMEN_DIA, T_SECCIONES } from "./textos";

type Variante = {
  hoy: Iso;
  esc?: Escenario; // por defecto Camila (Con acompañamiento)
  cambios?: Cambios;
  novedades?: boolean;
  ocultarCreditos?: boolean;
  carga?: boolean; // muestra el aviso de carga
  sinConexion?: boolean; // controles de marcar con aria-disabled (4.1.4)
  ausencia?: boolean; // los plazos que dependen de Diego se recalculan (4.1.4)
  errorBloque?: boolean; // el resumen de avance no cargó; el resto funciona (4.1.4)
  anterioresAbiertas?: boolean; // «De días anteriores» desplegado (sus pantallas de la vista previa)
};

export const VARIANTES: Record<string, Variante> = {
  algunas: { hoy: HOY, novedades: true },
  ninguna: { hoy: HOY, cambios: { "a3-2026-10-13": null } },
  completo: { hoy: HOY, cambios: { "a5-2026-10-13": "hecha", "a7-2026-10-13": "hecha" } },
  // Sábado de la semana 1: un día sin acciones programadas.
  "sin-acciones": { hoy: "2026-10-10" },
  "creditos-ocultos": { hoy: HOY, ocultarCreditos: true },
  // Martín (Acompañamiento cercano): hoy martes es su videollamada; su foto de hoy está en revisión.
  cercano: { hoy: HOY, esc: ESCENARIO_CERCANO },
  "sin-conexion": { hoy: HOY, sinConexion: true },
  ausencia: { hoy: HOY, ausencia: true },
  "error-bloque": { hoy: HOY, errorBloque: true },
  // «De días anteriores»: cuatro pendientes (se ven 3 y «Ver las 4»).
  lista: { hoy: HOY, cambios: { "a5-2026-10-09": null, "a8-2026-10-09": null }, anterioresAbiertas: true },
  // Cinco pendientes: aparece el aviso de carga.
  "aviso-carga": { hoy: HOY, cambios: { "a5-2026-10-09": null, "a8-2026-10-09": null, "a8-2026-10-12": null }, carga: true, anterioresAbiertas: true },
};

const VISIBLES_ANTERIORES = 3;

export default function Hoy({ estado = "algunas" }: PropsPantalla) {
  const esp = useEspacio();
  // Mi espacio real: el día de hoy de la persona, con sus novedades y su preferencia de créditos.
  if (esp.real) {
    const variante: Variante = {
      hoy: esp.hoy,
      novedades: esp.novedades.length > 0,
      ocultarCreditos: !esp.participante.mostrarCreditosEnHoy,
      ausencia: !!esp.ausencia,
    };
    return <PantallaHoy variante={variante} />;
  }
  return <PantallaHoy variante={VARIANTES[estado] ?? VARIANTES.algunas} />;
}

export function PantallaHoy({ variante }: { variante: Variante }) {
  const { esc: escDado, semanaDelCiclo, pendientesAnteriores, R, ciclo } = useEspacio();
  const esc = variante.esc ?? escDado;
  const { lista, progreso, registrar, hoy } = usePrograma({ hoy: variante.hoy, cambios: variante.cambios, base: esc.ocurrencias });
  const sinConexion = !!variante.sinConexion;
  const [errorBloque, setErrorBloque] = useState(!!variante.errorBloque);
  const { tostada, setTostada, vivo, setVivo, cerrar } = useAvisos();
  const [retomadas, setRetomadas] = useState<string[]>([]);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [ayuda, setAyuda] = useState(false);
  const [costando, setCostando] = useState<{ abierta: boolean; accion?: Ocurrencia }>({ abierta: false });
  const accionesRef = useRef<HTMLDivElement>(null);

  const semana = semanaDelCiclo(hoy);
  const deHoy = ocurrenciasDel(hoy, lista);
  const retomadasLista = retomadas.map((id) => lista.find((o) => o.id === id)!).filter(Boolean);
  const anteriores = pendientesAnteriores(hoy, lista).filter((o) => !retomadas.includes(o.id));
  const detalle = abierta ? lista.find((o) => o.id === abierta) : undefined;

  const anunciar = (p: Progreso) => setVivo(T_HOY.marcar.vivo(p.creditos, p.nivel.nivel, p.nivel.nombre));
  // Error al guardar (4.5): el check ya volvió atrás; la tostada ofrece reintentar.
  const fallo = (o: Ocurrencia, reintentar: () => void) => () =>
    setTostada({ mensaje: T_HOY.marcar.error(o.titulo), accion: { texto: T_HOY.marcar.reintentar, onClick: reintentar } });

  // Marcar o desmarcar desde la fila, la hoja o «Ya la hice» (se registra en su día original).
  const marcar = (o: Ocurrencia, marcada: boolean, desdeAnteriores = false): void => {
    registrar(o.id, marcada ? "hecha" : null, (p) => {
      anunciar(p);
      if (!marcada) {
        setTostada({ mensaje: T_HOY.marcar.desmarcaste(o.titulo, p.creditos) });
        return;
      }
      const dia = p.dias.find((d) => d.fecha === o.fecha);
      const mensaje = desdeAnteriores
        ? T_ANTERIORES.registrada(diaCorto(o.fecha))
        : dia?.estado === "completo"
          ? T_HOY.marcar.completaste(1 + dia.bono)
          : T_HOY.marcar.marcaste(o.titulo);
      setTostada({ mensaje, accion: { texto: T_HOY.marcar.deshacer, onClick: () => marcar(o, false) } });
    }, fallo(o, () => marcar(o, marcada, desdeAnteriores)));
  };

  const dejar = (o: Ocurrencia): void => {
    registrar(o.id, "dejada", (p) => {
      anunciar(p);
      setTostada({
        mensaje: T_ANTERIORES.dejada,
        accion: { texto: T_HOY.marcar.deshacer, onClick: () => registrar(o.id, null, () => setTostada(null), fallo(o, () => dejar(o))) },
      });
    }, fallo(o, () => dejar(o)));
  };

  const retomar = (o: Ocurrencia) => {
    setRetomadas((r) => [...r, o.id]);
    setTostada({ mensaje: T_ANTERIORES.retomada });
  };

  // La fila que sale de «De días anteriores» deja el foco en el título de las acciones de hoy.
  const sacarDeAnteriores = (accion: () => void) => {
    accion();
    requestAnimationFrame(() => accionesRef.current?.querySelector<HTMLElement>(".me-grupo__titulo")?.focus());
  };

  const grupos = MOMENTOS.map((m) => ({ m, lista: deHoy.filter((o) => momentoDe(o.hora) === m) }));
  const conCarga = variante.carga || anteriores.length >= 5;

  return (
    <div className="me-pantalla me-hoy">
      <div className="me-hoy__cabeza">
        <TituloSeccion titulo={T_SECCIONES.rumbo} icono="compass" ojo={T_HOY.ojo(semana, ciclo.semanas)} ejemplo />
        <CabezaHoy hoy={hoy} semana={semana} progreso={progreso} esc={esc} />
      </div>

      <Foco semana={semana} esc={esc} conNovedad={variante.novedades} />

      <div className="me-hoy__cuerpo">
        <div className="me-bloque" ref={accionesRef}>
          {grupos.map(({ m, lista: l }) => (
            <Grupo key={m} momento={m} titulo={TITULO_MOMENTO[m]} lista={l} hoy={hoy} onMarcar={marcar} onAbrir={setAbierta} sinConexion={sinConexion} />
          ))}
          <Grupo
            titulo={T_HOY.grupos.retomadas}
            lista={retomadasLista}
            hoy={hoy}
            onMarcar={marcar}
            onAbrir={setAbierta}
            nota={(o) => T_HOY.grupos.del(diaCorto(o.fecha))}
            sinConexion={sinConexion}
          />
        </div>
      </div>

      <div className="me-hoy__lado">
        <TuAcompanamiento hoy={hoy} esc={esc} ausencia={!!variante.ausencia} novedades={!!variante.novedades} onCostando={() => setCostando({ abierta: true })} />
        {!variante.ocultarCreditos &&
          (errorBloque ? (
            <section className="tarjeta me-resumen" aria-label={T_HOY.resumen.enlace}>
              <ErrorBloque onReintentar={() => setErrorBloque(false)} />
            </section>
          ) : (
            <ResumenAvance progreso={progreso} />
          ))}
      </div>

      {anteriores.length > 0 && (
        <div className="me-hoy__anteriores">
          <Anteriores
            lista={anteriores}
            hoy={hoy}
            carga={conCarga}
            plegada={!variante.anterioresAbiertas && !conCarga}
            sinConexion={sinConexion}
            onYaLaHice={(o) => sacarDeAnteriores(() => marcar(o, true, true))}
            onRetomar={(o) => sacarDeAnteriores(() => retomar(o))}
            onDejar={(o) => sacarDeAnteriores(() => dejar(o))}
            onAbrir={setAbierta}
          />
        </div>
      )}

      <footer className="me-pie me-hoy__pie">
        <p>
          {T_HOY.pie.semana}
          <Link to={R.ajuste}>{T_COMUN.pedirAjuste}</Link>
        </p>
        <p>
          <button type="button" className="enlace-util" aria-haspopup="dialog" onClick={() => setAyuda(true)}>
            <Icono nombre="phone" tamaño={16} />
            {T_COMUN.ayudaInmediata}
          </button>
        </p>
      </footer>

      <Hoja abierta={!!detalle} onCerrar={() => setAbierta(null)} titulo={detalle?.titulo ?? ""} className="hoja--detalle">
        {detalle && (
          <>
            <Detalle
              o={detalle}
              hoy={hoy}
              enHoja
              sinConexion={sinConexion}
              onRegistrar={(e) => registrar(detalle.id, e, anunciar, fallo(detalle, () => registrar(detalle.id, e, anunciar)))}
            />
            <p className="me-hoy__costando-accion">
              <button
                type="button"
                className="boton boton--terciario me-boton-izq"
                aria-haspopup="dialog"
                onClick={() => {
                  setAbierta(null);
                  setCostando({ abierta: true, accion: detalle });
                }}
              >
                <Icono nombre="hand" tamaño={20} />
                {T_HOY.acompanamiento.costando}
              </button>
            </p>
          </>
        )}
      </Hoja>
      <HojaCostando
        abierta={costando.abierta}
        accion={costando.accion}
        hoy={hoy}
        esc={esc}
        ausencia={!!variante.ausencia}
        onCerrar={() => setCostando({ abierta: false })}
        onAyuda={() => {
          setCostando({ abierta: false });
          setAyuda(true);
        }}
      />
      <HojaAyuda abierta={ayuda} onCerrar={() => setAyuda(false)} />
      <Tostada mensaje={tostada?.mensaje ?? null} accion={tostada?.accion} onCerrar={cerrar} textoCerrar={T_COMUN.cerrar} />
      <RegionViva texto={vivo} />
    </div>
  );
}

const TITULO_MOMENTO: Record<Momento, string> = {
  manana: T_HOY.grupos.manana,
  tarde: T_HOY.grupos.tarde,
  noche: T_HOY.grupos.noche,
  flexible: T_HOY.grupos.flexibles,
};
const ICONO_MOMENTO = { manana: "sun", tarde: "sunset", noche: "moon", flexible: "clock" } as const;

// ---------------------------------------------------------------------------
// Encabezado: ojo «Semana 2 de 4», saludo, H1 «Hoy, martes 13.» y bajada según el día (4.4.2)

function CabezaHoy({ hoy, semana, progreso, esc }: { hoy: Iso; semana: number; progreso: Progreso; esc: Escenario }) {
  const { fechaRevision } = useEspacio();
  const dia = progreso.dias.find((d) => d.fecha === hoy);
  const n = dia?.programadas ?? 0;
  const h = dia?.hechas ?? 0;
  let bajada: string;
  let completo = false;
  if (!n) bajada = T_HOY.bajada.sinAcciones;
  else if (dia?.estado === "completo") {
    bajada = T_HOY.bajada.todas;
    completo = true;
  } else if (dia?.estado === "suspenso") bajada = T_HOY.bajada.fotoEnRevision;
  else if (!h) bajada = ayerIncompleto(progreso, hoy) ? T_HOY.bajada.ayerCosto : T_HOY.bajada.ninguna(n);
  else bajada = T_HOY.bajada.algunas(h, n);
  const esRevision = fechaRevision(semana, esc.diaRevision) === hoy;
  const textoRevision = esc.plan === "cercano" ? T_HOY.bajada.videollamada(esc.horaVideollamada) : T_HOY.bajada.revision;

  return (
    <div className="me-hoy__titular">
    <Cabeza
      nivel={2}
      ejemplo={false}
      antes={<p className="me-saludo">{T_HOY.saludo(esc.participante.nombre)}</p>}
      titulo={T_HOY.titulo(diaCorto(hoy))}
      bajada={
        <>
          {!n && <ResumenDia hechas={h} programadas={n} />}
          <p>
            {bajada}
            {esRevision && ` ${textoRevision}`}
          </p>
          {completo && dia && (
            <p>
              <Etiqueta variante="activo" grande>
                {T_HOY.diaCompleto(dia.bono)}
              </Etiqueta>
            </p>
          )}
        </>
      }
    />
    {n > 0 && <AnilloDia hechas={h} programadas={n} etiqueta={T_RESUMEN_DIA.etiqueta(Math.min(h, n), n)} className="me-hoy__anillo" />}
    </div>
  );
}

// Ayer tuvo acciones y quedó a medias (no cuenta una pausa ni un día sin acciones).
function ayerIncompleto(progreso: Progreso, hoy: Iso) {
  const ayer = progreso.dias.find((d) => d.fecha === sumarDias(hoy, -1));
  return !!ayer && ayer.programadas > 0 && ayer.estado === "incompleto";
}

// ---------------------------------------------------------------------------
// Resumen del día (Rumbo 2.0, etapa 2): hechas sobre programadas de hoy, con los datos del día
// (progreso_diario en Mi espacio real). Nunca cuenta acciones de días futuros ni muestra un
// porcentaje. Un segmento por acción (hasta 12; con más, una barra continua). Sin acciones hoy:
// un estado neutro, sin números.

const MAX_SEGMENTOS = 12;

export function ResumenDia({ hechas, programadas }: { hechas: number; programadas: number }) {
  if (!programadas) {
    return (
      <p className="me-dia-resumen me-dia-resumen--vacio">
        <Icono nombre="sun" tamaño={16} />
        {T_RESUMEN_DIA.sinAcciones}
      </p>
    );
  }
  const h = Math.min(hechas, programadas);
  const completo = h === programadas;
  return (
    <div className={completo ? "me-dia-resumen es-completo" : "me-dia-resumen"} role="img" aria-label={T_RESUMEN_DIA.etiqueta(h, programadas)}>
      {programadas <= MAX_SEGMENTOS ? (
        <span className="me-dia-resumen__segmentos" aria-hidden="true">
          {Array.from({ length: programadas }, (_, i) => (
            <span key={i} className={i < h ? "me-dia-resumen__seg es-hecho" : "me-dia-resumen__seg"} />
          ))}
        </span>
      ) : (
        <span className="me-dia-resumen__barra" aria-hidden="true">
          <span style={{ inlineSize: `${(h / programadas) * 100}%` }} />
        </span>
      )}
      <span className="me-dia-resumen__texto" aria-hidden="true">
        {completo && <Icono nombre="check" tamaño={16} />}
        {T_RESUMEN_DIA.corto(h, programadas)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Novedades: 0 a 2 avisos info con enlace (4.4.3). Nunca un contador.
// Con dos o más, van juntas en un solo aviso compacto (una fila enlazada por novedad) para que
// las acciones del día suban en la pantalla sin perder el acceso directo a cada una.

function Novedades() {
  const { novedades, R, servidor } = useEspacio();
  const DESTINO_NOVEDAD = { semana: R.semanaPublicada, ajuste: R.ajusteLista, programa: R.semanaPublicada, accion: R.accion };
  const lista = novedades.slice(0, 2);
  if (lista.length >= 2)
    return (
      <section className="aviso me-novedades me-novedades--compactas" aria-label={T_HOY.novedades.etiqueta}>
        <Icono nombre="info" tamaño={20} className="aviso-icono" />
        <ul className="me-novedades__lista">
          {lista.map((n) => (
            <li key={n.id}>
              <Link to={n.ruta ?? DESTINO_NOVEDAD[n.destino]} className="me-novedades__fila" onClick={() => servidor?.verNovedad(n.id)}>
                <span>{n.texto}</span>{" "}
                <span className="me-novedades__enlace">
                  {n.enlace}
                  <Icono nombre="arrow-right" tamaño={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  return (
    <section className="me-novedades" aria-label={T_HOY.novedades.etiqueta}>
      {novedades.slice(0, 2).map((n) => (
        <div key={n.id} className="aviso me-novedad">
          <Icono nombre="info" tamaño={20} className="aviso-icono" />
          <div className="me-novedad__cuerpo">
            <p>{n.texto}</p>
            <Link to={n.ruta ?? DESTINO_NOVEDAD[n.destino]} className="enlace-flecha" onClick={() => servidor?.verNovedad(n.id)}>
              {n.enlace}
              <Icono nombre="arrow-right" tamaño={16} />
            </Link>
          </div>
        </div>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------
// «Tu foco esta semana» (4.4.4): si no hay foco, el bloque no se muestra.

// Etapa 2A: franja de una línea; con «Nuevo» cuando la revisión que lo trae todavía no se ha visto.
export function Foco({ semana, className, esc: escDado, conNovedad }: { semana: number; className?: string; esc?: Escenario; conNovedad?: boolean }) {
  const { esc: escContexto, focoDeLaSemana, novedades } = useEspacio();
  const esc = escDado ?? escContexto;
  const foco = focoDeLaSemana(semana, esc.revisiones, esc.focoInicial);
  if (!foco) return null;
  const nuevo = !!conNovedad && novedades.some((n) => n.destino === "semana");
  return (
    <aside className={["me-foco me-foco--franja", className].filter(Boolean).join(" ")} aria-labelledby="foco-rotulo">
      <span className="icono-mosaico">
        <Icono nombre="message-circle" tamaño={20} />
      </span>
      <div className="me-foco__cuerpo">
        <p id="foco-rotulo" className="me-rotulo">
          {T_HOY.foco.rotulo}
          {nuevo && (
            <>
              {" "}
              <Etiqueta variante="nota">{T_HOY.foco.nuevo}</Etiqueta>
            </>
          )}
        </p>
        <p className="voz">
          <q>{foco}</q>
        </p>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Grupo de acciones de hoy: «Con horario», «Cuando puedas hoy», «Retomadas»

type GrupoProps = {
  titulo: string;
  momento?: Momento; // icono del momento del día (etapa 2A)
  lista: Ocurrencia[];
  hoy: Iso;
  onMarcar: (o: Ocurrencia, marcada: boolean) => void;
  onAbrir: (id: string) => void;
  nota?: (o: Ocurrencia) => string;
  sinConexion?: boolean;
};

function Grupo({ titulo, momento, lista, hoy, onMarcar, onAbrir, nota, sinConexion }: GrupoProps) {
  if (!lista.length) return null;
  const id = `grupo-${titulo.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="me-grupo">
      <h2 id={id} className="me-grupo__titulo" tabIndex={-1}>
        {momento && <Icono nombre={ICONO_MOMENTO[momento]} tamaño={16} />}
        {titulo}
      </h2>
      <ul className="me-filas" aria-labelledby={id}>
        {lista.map((o) => (
          <li key={o.id}>
            <FilaOcurrencia o={o} hoy={hoy} nota={nota?.(o)} sinConexion={sinConexion} onMarcar={(m) => onMarcar(o, m)} onAbrir={() => onAbrir(o.id)} conMeta />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// «De días anteriores» (4.6): sin culpa. Hasta 3 filas y «Ver las {n}».

type AnterioresProps = {
  lista: Ocurrencia[];
  hoy: Iso;
  carga: boolean;
  plegada?: boolean; // etapa 2A: parte plegado en Mi Rumbo
  sinConexion?: boolean;
  onYaLaHice: (o: Ocurrencia) => void;
  onRetomar: (o: Ocurrencia) => void;
  onDejar: (o: Ocurrencia) => void;
  onAbrir: (id: string) => void;
};

// Cada fila tiene una sola forma de marcar: «Ya la hice» (sin casilla, para no duplicar el control).
export function Anteriores({ lista, hoy, carga, plegada = false, sinConexion, onYaLaHice, onRetomar, onDejar, onAbrir }: AnterioresProps) {
  const { R, rutaAjuste } = useEspacio();
  const [abierta, setAbierta] = useState(!plegada);
  const [todas, setTodas] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [avisoCerrado, setAvisoCerrado] = useState(false);
  const primeraNueva = useRef<HTMLButtonElement>(null);
  const visibles = todas ? lista : lista.slice(0, VISIBLES_ANTERIORES);

  // Al ver todas, el foco pasa a la primera fila que apareció.
  useEffect(() => {
    if (todas) primeraNueva.current?.focus();
  }, [todas]);

  return (
    <section className="me-bloque me-anteriores" aria-labelledby="anteriores-titulo">
      <div className="me-bloque__cabeza">
        <h2 id="anteriores-titulo" className="me-h2">
          {T_ANTERIORES.titulo}
        </h2>
        <p className="me-bloque__bajada">{T_ANTERIORES.bajada(lista.length)}</p>
        {plegada && (
          <button
            type="button"
            className="boton boton--terciario me-boton-izq"
            aria-expanded={abierta}
            aria-controls="anteriores-contenido"
            onClick={() => setAbierta((a) => !a)}
          >
            {abierta ? T_ANTERIORES.ocultar : T_ANTERIORES.ver}
          </button>
        )}
      </div>
      <div id="anteriores-contenido" className="me-anteriores__contenido" hidden={!abierta}>

      {carga && !avisoCerrado && (
        <div className="aviso me-carga">
          <Icono nombre="info" tamaño={20} className="aviso-icono" />
          <div className="aviso-cuerpo">
            <p className="aviso-titulo">{T_ANTERIORES.carga.titulo}</p>
            <p>{T_ANTERIORES.carga.texto}</p>
            <div className="acciones">
              <Link to={rutaAjuste()} className="boton boton--secundario me-boton-chico">
                {T_ANTERIORES.carga.boton}
              </Link>
            </div>
            <p className="microcopia">
              {T_ANTERIORES.carga.ayuda}
              <Link to={R.ayuda}>{T_COMUN.ayudaInmediata}</Link>
              .
            </p>
          </div>
          <button type="button" className="boton-icono me-carga__cerrar" onClick={() => setAvisoCerrado(true)}>
            <Icono nombre="x" tamaño={20} />
            <span className="sr-only">{T_COMUN.cerrar}</span>
          </button>
        </div>
      )}

      <ul className="me-filas me-anteriores__filas">
        {visibles.map((o, i) => {
          const abierto = menu === o.id;
          const idMenu = `menu-${o.id}`;
          return (
            <li key={o.id}>
              <FilaOcurrencia
                o={o}
                hoy={hoy}
                nota={`${mayuscula(diaCorto(o.fecha))} · ${o.hora ?? "Flexible"}`}
                sinControl
                onAbrir={() => onAbrir(o.id)}
                extra={
                  <>
                    <button
                      type="button"
                      className="boton boton--secundario me-boton-chico"
                      ref={i === VISIBLES_ANTERIORES ? primeraNueva : undefined}
                      aria-disabled={sinConexion || undefined}
                      onClick={sinConexion ? undefined : () => onYaLaHice(o)}
                    >
                      {T_ANTERIORES.yaLaHice}
                    </button>
                    <button type="button" className="boton boton--terciario" onClick={() => onRetomar(o)}>
                      {T_ANTERIORES.retomar}
                    </button>
                    <button
                      type="button"
                      className="boton-icono me-mas"
                      aria-expanded={abierto}
                      aria-controls={idMenu}
                      onClick={() => setMenu(abierto ? null : o.id)}
                    >
                      <Icono nombre="menu" tamaño={20} />
                      <span className="sr-only">{T_ANTERIORES.masOpcionesDe(o.titulo)}</span>
                    </button>
                    <ul id={idMenu} className="me-mas__lista" hidden={!abierto}>
                      <li>
                        <button type="button" className="me-mas__fila" aria-disabled={sinConexion || undefined} onClick={sinConexion ? undefined : () => onDejar(o)}>
                          {T_ANTERIORES.dejar}
                        </button>
                      </li>
                      <li>
                        <Link to={rutaAjuste(o.id)} className="me-mas__fila">
                          {T_ANTERIORES.ajuste}
                        </Link>
                      </li>
                    </ul>
                  </>
                }
              />
            </li>
          );
        })}
      </ul>
      {!todas && lista.length > VISIBLES_ANTERIORES && (
        <p>
          <button type="button" className="boton boton--terciario me-boton-izq" onClick={() => setTodas(true)}>
            {T_ANTERIORES.verLas(lista.length)}
          </button>
        </p>
      )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Resumen de avance (4.4.6): ocultable desde Preferencias.

export function ResumenAvance({ progreso }: { progreso: Progreso }) {
  const { R } = useEspacio();
  const { nivel, siguiente, creditos, racha, bonoSiguiente } = progreso;
  // Destello de la etiqueta al subir de nivel (sin movimiento reducido no hay animación).
  const anterior = useRef(nivel.nivel);
  const [destello, setDestello] = useState(0);
  useEffect(() => {
    if (nivel.nivel > anterior.current) setDestello((d) => d + 1);
    anterior.current = nivel.nivel;
  }, [nivel.nivel]);

  return (
    <section className="tarjeta me-resumen" aria-labelledby="resumen-nivel">
      <div className="me-resumen__fila">
        <Etiqueta key={destello} variante="activo" grande nowrap className={destello ? "destello" : undefined}>
          <span id="resumen-nivel">{T_HOY.resumen.nivel(nivel.nivel, nivel.nombre)}</span>
        </Etiqueta>
        <span className="me-resumen__creditos">{T_HOY.resumen.creditos(creditos)}</span>
      </div>
      {siguiente ? (
        <BarraProgreso
          valor={creditos}
          minimo={nivel.minimo}
          maximo={siguiente.minimo}
          etiqueta={T_HOY.resumen.barraEtiqueta(siguiente.nombre)}
          textoValor={`${creditos} de ${siguiente.minimo} créditos`}
          texto={T_HOY.resumen.barra(creditos, siguiente.minimo, siguiente.nombre)}
        />
      ) : (
        <p className="barra-texto">{T_HOY.resumen.maximo}</p>
      )}
      <div className="me-resumen__bono">
        <p>{T_HOY.resumen.bono(bonoSiguiente)}</p>
        {racha > 0 && <p className="microcopia">{T_HOY.resumen.racha(racha)}</p>}
      </div>
      <Link to={R.progreso} className="enlace-flecha">
        {T_HOY.resumen.enlace}
        <Icono nombre="arrow-right" tamaño={16} />
      </Link>
    </section>
  );
}

// ---------------------------------------------------------------------------
// «Tu acompañamiento» (etapa 2A): la próxima revisión (4.4.7: por escrito, o videollamada en el
// plan cercano), «Me está costando», escribir el registro y las novedades. Con ausencia de Diego,
// la revisión de esta semana pasa al día en que vuelve (4.1.4).

function useProximaRevision(hoy: Iso, esc: Escenario, ausencia: boolean) {
  const { semanaDelCiclo, fechaRevision, ausencia: datosAusencia } = useEspacio();
  let n = semanaDelCiclo(hoy);
  if (fechaRevision(n, esc.diaRevision) < hoy) n += 1;
  let fecha = fechaRevision(n, esc.diaRevision);
  if (ausencia && datosAusencia && fecha <= datosAusencia.hasta) fecha = datosAusencia.vuelve;
  const enviado = esc.registrosSemanales.some((r) => r.semana === n && r.enviadoEl);
  return { fecha, enviado };
}

type PropsAcomp = { hoy: Iso; esc: Escenario; ausencia: boolean; novedades: boolean; onCostando: () => void };

function TuAcompanamiento({ hoy, esc, ausencia, novedades, onCostando }: PropsAcomp) {
  const { R } = useEspacio();
  const { fecha, enviado } = useProximaRevision(hoy, esc, ausencia);
  const cercano = esc.plan === "cercano";
  const t = T_HOY.revision.cercano;
  const texto = enviado ? T_HOY.revision.coachEnviado : T_HOY.revision.coachAntes;
  return (
    <section className="tarjeta me-acomp-hoy" aria-labelledby="acomp-hoy-titulo">
      <h2 id="acomp-hoy-titulo" className="me-h2">
        {T_HOY.acompanamiento.titulo}
      </h2>
      {cercano ? (
        <>
          <p>
            {t.antes}
            <strong>
              {diaCorto(fecha)}
              {t.a}
              {esc.horaVideollamada}
            </strong>
            {t.despues}
          </p>
          {esc.horaLocal && <p className="microcopia">{T_HOY.revision.enTuZona(esc.horaLocal(esc.horaVideollamada))}</p>}
        </>
      ) : (
        <p>
          {texto.antes}
          <strong>{diaCorto(fecha)}</strong>
          {texto.despues}
        </p>
      )}
      <div className="me-acomp-hoy__botones">
        <button type="button" className="boton boton--secundario me-boton-chico" aria-haspopup="dialog" onClick={onCostando}>
          <Icono nombre="hand" tamaño={20} />
          {T_HOY.acompanamiento.costando}
        </button>
        {!enviado && (
          <Link to={R.semana} className="boton boton--secundario me-boton-chico">
            <Icono nombre="pen-line" tamaño={20} />
            {cercano ? T_HOY.revision.escribirOpcional : T_HOY.revision.escribir}
          </Link>
        )}
      </div>
      {novedades && <Novedades />}
    </section>
  );
}

// ---------------------------------------------------------------------------
// «Me está costando» (etapa 2A): tres caminos que ya existen. Desde una acción, el ajuste llega
// con esa acción elegida. Lo que la persona cuente lo ve su coach en el panel (Solicitudes de
// ajuste y Revisar), así que no hace falta otra bandeja.

type PropsCostando = {
  abierta: boolean;
  accion?: Ocurrencia;
  hoy: Iso;
  esc: Escenario;
  ausencia: boolean;
  onCerrar: () => void;
  onAyuda: () => void;
};

function HojaCostando({ abierta, accion, hoy, esc, ausencia, onCerrar, onAyuda }: PropsCostando) {
  const { R, rutaAjuste } = useEspacio();
  const { fecha } = useProximaRevision(hoy, esc, ausencia);
  const opciones = [
    { id: "ajuste", icono: "sliders-horizontal" as const, ...T_COSTANDO.ajuste, ruta: rutaAjuste(accion?.id) },
    { id: "contar", icono: "pen-line" as const, ...T_COSTANDO.contar, ruta: `${R.semana}#registro-costo` },
  ];
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={T_COSTANDO.titulo} className="hoja--costando">
      {accion && <p className="me-costando__accion">{T_COSTANDO.desdeAccion(accion.titulo)}</p>}
      <p className="me-costando__bajada">{T_COSTANDO.bajada}</p>
      <ul className="me-costando">
        {opciones.map((o) => (
          <li key={o.id}>
            <Link to={o.ruta} className="me-costando__opcion" onClick={onCerrar}>
              <span className="icono-mosaico" aria-hidden="true">
                <Icono nombre={o.icono} tamaño={20} />
              </span>
              <span className="me-costando__texto">
                <span className="me-costando__titulo">{o.titulo}</span>
                <span className="me-costando__detalle">{o.texto}</span>
              </span>
            </Link>
          </li>
        ))}
        <li>
          <button type="button" className="me-costando__opcion me-costando__opcion--ayuda" aria-haspopup="dialog" onClick={onAyuda}>
            <span className="icono-mosaico" aria-hidden="true">
              <Icono nombre="phone" tamaño={20} />
            </span>
            <span className="me-costando__texto">
              <span className="me-costando__titulo">{T_COSTANDO.ayuda.titulo}</span>
              <span className="me-costando__detalle">{T_COSTANDO.ayuda.texto}</span>
            </span>
          </button>
        </li>
      </ul>
      <p className="aviso me-costando__nota">
        <Icono nombre="info" tamaño={20} className="aviso-icono" />
        <span>
          {T_COSTANDO.nota(diaCorto(fecha))}
          {esc.plan === "cercano" && ` ${T_COSTANDO.notaCercano}`}
        </span>
      </p>
    </Hoja>
  );
}
