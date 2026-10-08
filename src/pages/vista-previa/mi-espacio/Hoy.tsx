// Vista previa · Hoy (plataforma 4.4, 4.5 y 4.6): la pantalla principal de Mi espacio.
// Responde en 3 segundos qué hago ahora, a qué hora y cómo. Marcar y desmarcar funcionan en
// memoria: el check cambia al instante y los créditos, el nivel, el bono y la bajada se
// actualizan con la «respuesta del servidor» (simulada, con las reglas de rumbo.ts).
// Estados: algunas, ninguna, completo, sin-acciones, creditos-ocultos, cercano (Martín, día de
// videollamada), sin-conexion, ausencia y error-bloque (4.1.4). Las variantes «lista» y
// «aviso-carga» las usa DiasAnteriores.tsx (bloque «De días anteriores» con más pendientes).
// La banda de «sin conexión» y de ausencia la pone el marco (registro.ts, campo `banda`).
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Etiqueta from "../../../components/Etiqueta";
import { BarraProgreso, ErrorBloque, Hoja, HojaAyuda, Icono, Tostada } from "../../../components/app";
import { ESCENARIO_CERCANO, HOY, ocurrenciasDel, type Escenario, type Ocurrencia } from "../../../data/ejemplo-app";
import { diaCorto, mayuscula, type Iso } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import {
  Cabeza,
  FilaOcurrencia,
  RegionViva,
  conHorario,
  flexibles,
  useAvisos,
  useEspacio,
  usePrograma,
  type Cambios,
  type Progreso,
} from "./comun";
import Detalle from "./Detalle";
import { T_ANTERIORES, T_COMUN, T_HOY } from "./textos";

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
  lista: { hoy: HOY, cambios: { "a5-2026-10-09": null, "a8-2026-10-09": null } },
  // Cinco pendientes: aparece el aviso de carga.
  "aviso-carga": { hoy: HOY, cambios: { "a5-2026-10-09": null, "a8-2026-10-09": null, "a8-2026-10-12": null }, carga: true },
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
  const { esc: escDado, semanaDelCiclo, pendientesAnteriores, R } = useEspacio();
  const esc = variante.esc ?? escDado;
  const { lista, progreso, registrar, hoy } = usePrograma({ hoy: variante.hoy, cambios: variante.cambios, base: esc.ocurrencias });
  const sinConexion = !!variante.sinConexion;
  const [errorBloque, setErrorBloque] = useState(!!variante.errorBloque);
  const { tostada, setTostada, vivo, setVivo, cerrar } = useAvisos();
  const [retomadas, setRetomadas] = useState<string[]>([]);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [ayuda, setAyuda] = useState(false);
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

  return (
    <div className="me-pantalla me-hoy">
      <div className="me-hoy__cabeza">
        <CabezaHoy hoy={hoy} semana={semana} progreso={progreso} esc={esc} />
        {variante.novedades && <Novedades />}
      </div>

      <Foco semana={semana} esc={esc} />

      <div className="me-hoy__cuerpo">
        <div className="me-bloque" ref={accionesRef}>
          <Grupo titulo={T_HOY.grupos.conHorario} lista={conHorario(deHoy)} hoy={hoy} onMarcar={marcar} onAbrir={setAbierta} sinConexion={sinConexion} />
          <Grupo titulo={T_HOY.grupos.flexibles} lista={flexibles(deHoy)} hoy={hoy} onMarcar={marcar} onAbrir={setAbierta} sinConexion={sinConexion} />
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

        {anteriores.length > 0 && (
          <Anteriores
            lista={anteriores}
            hoy={hoy}
            carga={variante.carga || anteriores.length >= 5}
            sinConexion={sinConexion}
            onYaLaHice={(o) => sacarDeAnteriores(() => marcar(o, true, true))}
            onRetomar={(o) => sacarDeAnteriores(() => retomar(o))}
            onDejar={(o) => sacarDeAnteriores(() => dejar(o))}
            onAbrir={setAbierta}
          />
        )}
      </div>

      <div className="me-hoy__lado">
        {!variante.ocultarCreditos &&
          (errorBloque ? (
            <section className="tarjeta me-resumen" aria-label={T_HOY.resumen.enlace}>
              <ErrorBloque onReintentar={() => setErrorBloque(false)} />
            </section>
          ) : (
            <ResumenAvance progreso={progreso} />
          ))}
        <ProximaRevision hoy={hoy} esc={esc} ausencia={!!variante.ausencia} />
      </div>

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
          <Detalle
            o={detalle}
            hoy={hoy}
            enHoja
            sinConexion={sinConexion}
            onRegistrar={(e) => registrar(detalle.id, e, anunciar, fallo(detalle, () => registrar(detalle.id, e, anunciar)))}
          />
        )}
      </Hoja>
      <HojaAyuda abierta={ayuda} onCerrar={() => setAyuda(false)} />
      <Tostada mensaje={tostada?.mensaje ?? null} accion={tostada?.accion} onCerrar={cerrar} textoCerrar={T_COMUN.cerrar} />
      <RegionViva texto={vivo} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Encabezado: ojo «Semana 2 de 4», saludo, H1 «Hoy, martes 13.» y bajada según el día (4.4.2)

function CabezaHoy({ hoy, semana, progreso, esc }: { hoy: Iso; semana: number; progreso: Progreso; esc: Escenario }) {
  const { ciclo, fechaRevision } = useEspacio();
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
  else if (!h) bajada = T_HOY.bajada.ninguna(n);
  else bajada = T_HOY.bajada.algunas(h, n);
  const esRevision = fechaRevision(semana, esc.diaRevision) === hoy;
  const textoRevision = esc.plan === "cercano" ? T_HOY.bajada.videollamada(esc.horaVideollamada) : T_HOY.bajada.revision;

  return (
    <Cabeza
      ojo={T_HOY.ojo(semana, ciclo.semanas)}
      antes={<p className="me-saludo">{T_HOY.saludo(esc.participante.nombre)}</p>}
      titulo={T_HOY.titulo(diaCorto(hoy))}
      bajada={
        <>
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
  );
}

// ---------------------------------------------------------------------------
// Novedades: 0 a 2 avisos info con enlace (4.4.3). Nunca un contador.

function Novedades() {
  const { novedades, R } = useEspacio();
  const DESTINO_NOVEDAD = { semana: R.semanaPublicada, ajuste: R.ajusteLista, programa: R.semanaPublicada, accion: R.accion };
  return (
    <section className="me-novedades" aria-label={T_HOY.novedades.etiqueta}>
      {novedades.slice(0, 2).map((n) => (
        <div key={n.id} className="aviso me-novedad">
          <Icono nombre="info" tamaño={20} className="aviso-icono" />
          <div className="me-novedad__cuerpo">
            <p>{n.texto}</p>
            <Link to={n.ruta ?? DESTINO_NOVEDAD[n.destino]} className="enlace-flecha">
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

export function Foco({ semana, className, esc: escDado }: { semana: number; className?: string; esc?: Escenario }) {
  const { esc: escContexto, focoDeLaSemana } = useEspacio();
  const esc = escDado ?? escContexto;
  const foco = focoDeLaSemana(semana, esc.revisiones, esc.focoInicial);
  if (!foco) return null;
  return (
    <aside className={["me-foco", className].filter(Boolean).join(" ")} aria-labelledby="foco-rotulo">
      <span className="icono-mosaico">
        <Icono nombre="message-circle" tamaño={22} />
      </span>
      <div className="me-foco__cuerpo">
        <p id="foco-rotulo" className="me-rotulo">
          {T_HOY.foco.rotulo}
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
  lista: Ocurrencia[];
  hoy: Iso;
  onMarcar: (o: Ocurrencia, marcada: boolean) => void;
  onAbrir: (id: string) => void;
  nota?: (o: Ocurrencia) => string;
  sinConexion?: boolean;
};

function Grupo({ titulo, lista, hoy, onMarcar, onAbrir, nota, sinConexion }: GrupoProps) {
  if (!lista.length) return null;
  const id = `grupo-${titulo.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="me-grupo">
      <h2 id={id} className="me-grupo__titulo" tabIndex={-1}>
        {titulo}
      </h2>
      <ul className="me-filas" aria-labelledby={id}>
        {lista.map((o) => (
          <li key={o.id}>
            <FilaOcurrencia o={o} hoy={hoy} nota={nota?.(o)} sinConexion={sinConexion} onMarcar={(m) => onMarcar(o, m)} onAbrir={() => onAbrir(o.id)} />
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
  sinConexion?: boolean;
  onYaLaHice: (o: Ocurrencia) => void;
  onRetomar: (o: Ocurrencia) => void;
  onDejar: (o: Ocurrencia) => void;
  onAbrir: (id: string) => void;
};

// Cada fila tiene una sola forma de marcar: «Ya la hice» (sin casilla, para no duplicar el control).
export function Anteriores({ lista, hoy, carga, sinConexion, onYaLaHice, onRetomar, onDejar, onAbrir }: AnterioresProps) {
  const { R, rutaAjuste } = useEspacio();
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
      </div>

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
// «Tu próxima revisión» (4.4.7): por escrito (Con acompañamiento) o videollamada (cercano).
// Con ausencia de Diego, la revisión de esta semana pasa al día en que vuelve (4.1.4).

function ProximaRevision({ hoy, esc, ausencia }: { hoy: Iso; esc: Escenario; ausencia: boolean }) {
  const { semanaDelCiclo, fechaRevision, ausencia: datosAusencia, R } = useEspacio();
  let n = semanaDelCiclo(hoy);
  if (fechaRevision(n, esc.diaRevision) < hoy) n += 1;
  let fecha = fechaRevision(n, esc.diaRevision);
  if (ausencia && datosAusencia && fecha <= datosAusencia.hasta) fecha = datosAusencia.vuelve;
  const enviado = esc.registrosSemanales.some((r) => r.semana === n && r.enviadoEl);

  if (esc.plan === "cercano") {
    const t = T_HOY.revision.cercano;
    return (
      <section className="me-bloque me-revision" aria-labelledby="revision-titulo">
        <h2 id="revision-titulo" className="me-h2">
          {T_HOY.revision.titulo}
        </h2>
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
        {!enviado && (
          <Link to={R.semana} className="enlace-flecha">
            {T_HOY.revision.escribirOpcional}
            <Icono nombre="arrow-right" tamaño={16} />
          </Link>
        )}
      </section>
    );
  }

  const texto = enviado ? T_HOY.revision.coachEnviado : T_HOY.revision.coachAntes;
  return (
    <section className="me-bloque me-revision" aria-labelledby="revision-titulo">
      <h2 id="revision-titulo" className="me-h2">
        {T_HOY.revision.titulo}
      </h2>
      <p>
        {texto.antes}
        <strong>{diaCorto(fecha)}</strong>
        {texto.despues}
      </p>
      {!enviado && (
        <Link to={R.semana} className="enlace-flecha">
          {T_HOY.revision.escribir}
          <Icono nombre="arrow-right" tamaño={16} />
        </Link>
      )}
    </section>
  );
}
