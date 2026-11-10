// Informe de cierre de ciclo (maqueta de ChatGPT, 30-oct-2026). Reemplaza la pantalla «Ciclo
// cerrado» (4.3.5) y conserva lo que tenía: avance por meta con sus hitos logrados, créditos y
// nivel (si la persona los muestra), descargar sus registros y ver su última revisión.
//   · Portada «Mira todo lo que has avanzado» con el paisaje de Rumbo (sin fotos inventadas).
//   · Tu objetivo principal: las metas reales del ciclo.
//   · Tu progreso del ciclo: % de lo programado hecho (informe_ciclo), «X de N acciones hechas»,
//     acciones completadas, racha máxima y reconocimientos (solo con el módulo habilitado; si no,
//     días con todo hecho).
//   · Evolución semanal: hechas y programadas por semana. Áreas de tu plan: % por meta.
//   · Logros más destacados: los reconocimientos conseguidos (módulo «reconocimientos»).
//   · Mensaje de tu coach: el mensaje de cierre que escribió, o su último foco publicado. Nunca
//     un mensaje inventado ni generado.
//   · ¿Qué sigue ahora?: escribirnos para seguir con un nuevo ciclo, descargar los registros.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ListaCheck } from "../../../../components/Bloques";
import { BarraProgreso, ChipMeta, ErrorBloque, Icono, type NombreIconoApp } from "../../../../components/app";
import { calcularProgreso, cuentaComoHecha, type Meta, type Ocurrencia } from "../../../../data/ejemplo-app";
import { diaMes, type Iso } from "../../../../lib/fechas";
import { EtiquetaEjemplo, prepararLista, useDescargarDatos, useEspacio } from "../comun";
import { FOTO_PORTADA, PaisajePortada } from "../comunidad/Paisaje";
import { fuenteLogrosEjemplo, fuenteLogrosReal, type Reconocimiento } from "../logros/fuente";
import { T_CIERRE as T, T_LOGROS } from "../textos";
import { informeEjemplo, informeReal, type Informe } from "./fuente";

type Estado<X> = X | undefined | "error";

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

export default function InformeCierre({ hoy }: { hoy: Iso }) {
  const esp = useEspacio();
  const { real, ciclo, esc, R } = esp;
  const lista = useMemo(() => prepararLista({}, hoy, esc.ocurrencias), [hoy, esc.ocurrencias]);
  const progreso = esp.progreso ?? calcularProgreso(lista, hoy, ciclo.inicio);
  const [informe, setInforme] = useState<Estado<Informe>>(undefined);
  const [recs, setRecs] = useState<Estado<Reconocimiento[] | null>>(undefined);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vivo = true;
    setInforme(undefined);
    const cargar = real && ciclo.id ? informeReal(ciclo.id) : Promise.resolve(informeEjemplo(progreso, ciclo, esc.revisiones));
    cargar.then(
      (i) => vivo && setInforme(i),
      () => vivo && setInforme("error"),
    );
    const fuente = real ? fuenteLogrosReal() : fuenteLogrosEjemplo(() => ({ progreso, ciclo, metas: esc.metas, hoy }), false);
    fuente.reconocimientos().then(
      (r) => vivo && setRecs(r),
      () => vivo && setRecs("error"),
    );
    return () => {
      vivo = false;
    };
  }, [real, ciclo.id, intento]);

  const conseguidos = Array.isArray(recs) ? recs.filter((r) => r.obtenido) : null;

  return (
    <div className="me-pantalla ml ic">
      <Portada />
      {informe === undefined ? (
        <p className="cargando ic-cargando" role="status">
          {T.cargando}
        </p>
      ) : informe === "error" ? (
        <div className="ml-tarjeta">
          <ErrorBloque onReintentar={() => setIntento((n) => n + 1)} />
        </div>
      ) : (
        <>
          <div className="ml-fila ic-fila--resumen">
            <Objetivo metas={esc.metas} />
            <MiProgreso informe={informe} reconocimientos={conseguidos?.length ?? null} nivel={progreso.nivel} />
          </div>
          {informe.programadas > 0 && (
            <div className={`ml-fila ic-fila--tres${conseguidos ? "" : " ic-fila--sin-logros"}`}>
              <Evolucion informe={informe} />
              <Areas metas={esc.metas} lista={lista} hasta={hoy < ciclo.fin ? hoy : ciclo.fin} />
              {conseguidos && <Logros lista={conseguidos} ruta={R.progreso} />}
            </div>
          )}
          <div className="ml-fila ic-fila--cierre">
            <MensajeCoach informe={informe} />
            <QueSigue />
          </div>
        </>
      )}
      <p className="voz me-estado__voz">{T.voz}</p>
      <p className="microcopia">{T.nota}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Portada() {
  return (
    <header className="ml-portada ic-portada">
      {FOTO_PORTADA ? <img className="ml-portada__fondo" src={FOTO_PORTADA} alt="" /> : <PaisajePortada className="ml-portada__fondo" />}
      <div className="ml-portada__texto">
        <div className="ml-portada__fila">
          <p className="ic-chip">
            <Icono nombre="flag" tamaño={16} />
            {T.chip}
          </p>
          <EtiquetaEjemplo />
        </div>
        <h1 className="ml-portada__titulo">{T.titulo}</h1>
        <p className="ml-portada__bajada">
          {T.bajada.map((l, i) => (
            <span key={i}>{l} </span>
          ))}
        </p>
      </div>
    </header>
  );
}

function Objetivo({ metas }: { metas: Meta[] }) {
  const titulo = metas.length > 1 ? T.objetivo.varios : T.objetivo.uno;
  return (
    <section className="ml-tarjeta ic-objetivo" aria-labelledby="ic-objetivo">
      <span className="ic-objetivo__icono" aria-hidden="true">
        <Icono nombre="mountain" tamaño={24} />
      </span>
      <div className="ic-objetivo__texto">
        <h2 id="ic-objetivo" className="ic-h2">
          {titulo}
        </h2>
        {metas.length === 0 ? (
          <p>{T.objetivo.sinMetas}</p>
        ) : metas.length === 1 ? (
          <p className="ic-objetivo__meta">{metas[0]!.titulo}</p>
        ) : (
          <ul className="ic-objetivo__lista">
            {metas.map((m) => (
              <li key={m.id}>{m.titulo}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Dato({ icono, n, texto, clase }: { icono: NombreIconoApp; n: number; texto: string; clase: string }) {
  return (
    <li className={`ic-dato ${clase}`}>
      <span className="ic-dato__icono" aria-hidden="true">
        <Icono nombre={icono} tamaño={20} />
      </span>
      <span className="ic-dato__n">{n}</span>
      <span className="ic-dato__t">{texto}</span>
    </li>
  );
}

function MiProgreso({ informe, reconocimientos, nivel }: { informe: Informe; reconocimientos: number | null; nivel: { nivel: number; nombre: string } }) {
  const { participante } = useEspacio();
  const pct = informe.cumplimiento;
  return (
    <section className="ml-tarjeta ic-progreso" aria-labelledby="ic-progreso">
      <div className="ic-progreso__cabeza">
        <h2 id="ic-progreso" className="ic-h2">
          {T.progreso.titulo}
        </h2>
        {pct !== null && (
          <p className="ic-progreso__pct" aria-hidden="true">
            {pct}%
          </p>
        )}
      </div>
      {pct === null ? (
        <p>{T.progreso.sinAcciones}</p>
      ) : (
        <BarraProgreso
          valor={informe.hechas}
          maximo={informe.programadas}
          etiqueta={T.progreso.barra}
          textoValor={`${pct} %: ${T.progreso.deTotal(informe.hechas, informe.programadas)}`}
          texto={T.progreso.deTotal(informe.hechas, informe.programadas)}
          className="ic-progreso__barra"
        />
      )}
      <ul className="ic-datos">
        <Dato icono="check" clase="ic-dato--hechas" n={informe.hechas} texto={T.progreso.hechas(informe.hechas)} />
        <Dato icono="flame" clase="ic-dato--racha" n={informe.mejorRacha} texto={T.progreso.racha(informe.mejorRacha)} />
        {reconocimientos !== null ? (
          <Dato icono="star" clase="ic-dato--logros" n={reconocimientos} texto={T.progreso.reconocimientos(reconocimientos)} />
        ) : (
          <Dato icono="calendar-days" clase="ic-dato--logros" n={informe.diasCompletos} texto={T.progreso.completos(informe.diasCompletos)} />
        )}
      </ul>
      {participante.mostrarCreditosEnHoy && <p className="ml-nota">{T.progreso.creditos(informe.creditos, nivel.nivel, nivel.nombre)}</p>}
    </section>
  );
}

function Evolucion({ informe }: { informe: Informe }) {
  const s = informe.semanas;
  const tope = Math.max(1, ...s.map((x) => x.programadas), ...s.map((x) => x.hechas));
  // Hasta 5 tramos iguales con un paso «redondo» (1, 2, 5, 10, 20…).
  const paso = [1, 2, 5, 10, 20, 50, 100, 200, 500].find((p) => tope / p <= 5) ?? Math.ceil(tope / 5);
  const maximo = Math.ceil(tope / paso) * paso;
  const marcas = Array.from({ length: maximo / paso + 1 }, (_, i) => i * paso);
  const ancho = 100 / Math.max(1, s.length);
  const alto = (v: number) => (v / maximo) * 100;
  return (
    <section className="ml-tarjeta ic-evolucion" aria-labelledby="ic-evolucion">
      <h2 id="ic-evolucion" className="ic-h2">
        {T.evolucion.titulo}
      </h2>
      <figure className="ic-grafico">
        <div className="ic-grafico__area" role="img" aria-label={T.evolucion.resumen(s)}>
          <ol className="ic-grafico__eje" aria-hidden="true">
            {[...marcas].reverse().map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ol>
          <svg className="ic-grafico__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            {marcas.map((m) => (
              <line key={m} x1="0" x2="100" y1={100 - alto(m)} y2={100 - alto(m)} className="ic-grafico__linea" vectorEffect="non-scaling-stroke" />
            ))}
            {s.map((x, i) => {
              const izq = i * ancho + ancho * 0.24;
              const w = ancho * 0.52;
              return (
                <g key={x.semana}>
                  <rect className="ic-grafico__prog" x={izq} width={w} y={100 - alto(x.programadas)} height={alto(x.programadas)} />
                  <rect className="ic-grafico__hechas" x={izq} width={w} y={100 - alto(x.hechas)} height={alto(x.hechas)} />
                </g>
              );
            })}
          </svg>
          <ol className="ic-grafico__semanas" aria-hidden="true">
            {s.map((x) => (
              <li key={x.semana}>{T.evolucion.semana(x.semana)}</li>
            ))}
          </ol>
        </div>
        <figcaption className="ic-leyenda">
          <span className="ic-leyenda__item ic-leyenda__item--hechas">{T.evolucion.hechas}</span>
          <span className="ic-leyenda__item ic-leyenda__item--prog">{T.evolucion.programadas}</span>
        </figcaption>
      </figure>
    </section>
  );
}

function Areas({ metas, lista, hasta }: { metas: Meta[]; lista: Ocurrencia[]; hasta: Iso }) {
  const filas = metas
    .map((m) => {
      const de = lista.filter((o) => o.metaId === m.id && o.vigente && o.fecha <= hasta);
      const hechas = de.filter((o) => cuentaComoHecha(o.registro)).length;
      return { m, hechas, total: de.length, pct: de.length ? Math.round((100 * hechas) / de.length) : 0, hitos: m.hitos.filter((h) => h.logrado) };
    })
    .filter((f) => f.total > 0);
  if (!filas.length) return null;
  return (
    <section className="ml-tarjeta ic-areas" aria-labelledby="ic-areas">
      <h2 id="ic-areas" className="ic-h2">
        {T.areas.titulo}
      </h2>
      <ul className="ic-areas__lista">
        {filas.map(({ m, hechas, total, pct, hitos }) => (
          <li key={m.id} className="ic-area" data-cat={m.categoria}>
            <div className="ic-area__fila">
              <ChipMeta cat={m.categoria} />
              <span className="ic-area__titulo">{m.titulo}</span>
              <span className="ic-area__pct" aria-hidden="true">
                {T.areas.pct(pct)}
              </span>
            </div>
            <BarraProgreso valor={hechas} maximo={total} cat={m.categoria} etiqueta={T.areas.barra(m.titulo)} textoValor={`${pct} %: ${T.areas.valor(hechas, total)}`} className="ic-area__barra" />
            {hitos.length > 0 && <ListaCheck className="me-hitos ic-area__hitos" items={hitos.map((h) => h.texto)} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

const ICONO_REC: Record<string, NombreIconoApp> = {
  primer_paso: "sprout",
  primera_semana: "footprints",
  constancia: "mountain",
  mitad_del_camino: "heart",
  ciclo_completado: "star",
  meta_alcanzada: "sun",
};

function Logros({ lista, ruta }: { lista: Reconocimiento[]; ruta: string }) {
  const orden = [...lista].sort((a, b) => (b.obtenido ?? "").localeCompare(a.obtenido ?? ""));
  return (
    <section className="ml-tarjeta ic-logros" aria-labelledby="ic-logros">
      <h2 id="ic-logros" className="ic-h2">
        {T.logros.titulo}
      </h2>
      {orden.length === 0 ? (
        <p className="ml-nota">{T.logros.ninguno}</p>
      ) : (
        <ul className="ic-logros__lista">
          {orden.slice(0, 4).map((r) => (
            <li key={r.clave} className="ic-logro" data-clave={r.clave}>
              <span className="ic-logro__icono" aria-hidden="true">
                <Icono nombre={ICONO_REC[r.clave] ?? "award"} tamaño={20} />
              </span>
              <span className="ic-logro__texto">
                <span className="ic-logro__nombre">{r.nombre}</span>
                <span className="ic-logro__desc">{r.descripcion}</span>
                {r.obtenido && <time dateTime={r.obtenido}>{T_LOGROS.reconocimientos.obtenido(diaMes(r.obtenido))}</time>}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link to={ruta} className="ml-enlace ic-logros__ver">
        {T.logros.ver}
        <Icono nombre="arrow-right" tamaño={16} />
      </Link>
    </section>
  );
}

function MensajeCoach({ informe }: { informe: Informe }) {
  const { coach } = useEspacio();
  const ultimo = informe.focos[informe.focos.length - 1];
  const texto = informe.mensaje?.texto ?? ultimo?.foco;
  if (!texto) return null;
  const autor = informe.mensaje?.autor ?? coach?.nombre ?? null;
  return (
    <section className="ml-tarjeta ic-coach" aria-labelledby="ic-coach">
      <span className={`me-coach__avatar${autor ? " me-coach__avatar--letras" : ""} ic-coach__avatar`} aria-hidden="true">
        {autor ? iniciales(autor) : <Icono nombre="user-round" tamaño={24} />}
      </span>
      <div className="ic-coach__cuerpo">
        <h2 id="ic-coach" className="ic-h2">
          {informe.mensaje ? T.coach.mensaje : T.coach.foco}
        </h2>
        <p className="ic-coach__texto">{texto}</p>
        <p className="ic-coach__firma">
          {autor && <span className="ic-coach__autor">{autor}</span>}
          <span>{informe.mensaje ? T.coach.rol : T.coach.semana(ultimo!.semana)}</span>
        </p>
      </div>
      <span className="ic-coach__hoja" aria-hidden="true">
        <Icono nombre="sprout" tamaño={24} />
      </span>
    </section>
  );
}

function QueSigue() {
  const { R, hoy } = useEspacio();
  const descargar = useDescargarDatos();
  return (
    <section className="ml-tarjeta ic-sigue" aria-labelledby="ic-sigue">
      <span className="ic-sigue__icono" aria-hidden="true">
        <Icono nombre="sprout" tamaño={24} />
      </span>
      <div className="ic-sigue__cuerpo">
        <h2 id="ic-sigue" className="ic-h2">
          {T.sigue.titulo}
        </h2>
        <p>{T.sigue.texto}</p>
        <div className="ic-sigue__acciones">
          <Link to="/contacto/?motivo=solicitud" className="boton boton--primario ic-sigue__nuevo">
            {T.sigue.nuevo}
            <Icono nombre="arrow-right" tamaño={20} />
          </Link>
          <button type="button" className="boton boton--secundario" onClick={() => void descargar(hoy).catch(() => undefined)}>
            <Icono nombre="download" tamaño={20} />
            {T.sigue.descargar}
          </button>
          <Link to={R.semanaPublicada} className="boton boton--terciario">
            {T.sigue.revision}
          </Link>
        </div>
      </div>
    </section>
  );
}
