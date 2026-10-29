// Mis logros (maqueta de ChatGPT, 29-oct-2026; antes «Progreso», plataforma 4.10).
//   · Portada «Cada paso cuenta» con el paisaje de Rumbo (sin fotos inventadas).
//   · Mi nivel (los 10 niveles reales), Mis créditos (los de cada día de esta semana y el bono
//     siguiente) y Mi constancia (racha actual y mejor racha del ciclo).
//   · Mi evolución (% de lo programado hecho por semana) y Esta semana (hechas de programadas).
//   · Mis reconocimientos (E1). Mis recompensas (10 % por renovación) y Ranking (C5) aparecen solos
//     cuando el dueño activa el beneficio o habilita el módulo; mientras, no se muestran y los
//     reconocimientos ocupan el ancho (decisión de Diego, 29-oct-2026).
//   · Tus metas: el avance por meta y sus hitos (se mantiene de la versión anterior).
// Todo sale de la base o, en la vista previa, del escenario de ejemplo con las mismas reglas.
// Los créditos no miden el valor de la persona; se muestran aunque estén ocultos en Mi Rumbo.
import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnilloDia, BarraProgreso, ChipMeta, Hoja, Icono, Ilustracion, MetaTarjeta, type NombreIconoApp } from "../../../components/app";
import { calcularProgreso, cuentaComoHecha, type Meta, type Ocurrencia } from "../../../data/ejemplo-app";
import { bonoDiario, niveles, reglasCreditos, reglasCreditosTextos } from "../../../data/rumbo";
import { diaCorto, diaMes, inicialDia, lunesDe, mayuscula, miles, semanaDesde, sumarDias, type Iso } from "../../../lib/fechas";
import { ErrorBase } from "../../../lib/supabase";
import { EtiquetaEjemplo, prepararLista, useEspacio } from "./comun";
import { FOTO_PORTADA, PaisajePortada } from "./comunidad/Paisaje";
import {
  CATALOGO,
  fuenteLogrosEjemplo,
  fuenteLogrosReal,
  type ClaveReconocimiento,
  type FuenteLogros,
  type RankingEstado,
  type Reconocimiento,
  type Recompensas,
} from "./logros/fuente";
import { T_LOGROS, T_PROGRESO } from "./textos";

const T = T_LOGROS;
const hechaHasta = (o: Ocurrencia, hoy: Iso) => o.vigente && o.fecha <= hoy;
type Progreso = ReturnType<typeof calcularProgreso>;

// Lo que cada bloque trae de la base: cargando (undefined), apagado (null), con datos o con error.
type Carga<T> = T | null | undefined | "error";
function useCarga<T>(cargar: () => Promise<T | null>, deps: unknown[]): [Carga<T>, () => void] {
  const [v, setV] = useState<Carga<T>>(undefined);
  const [n, setN] = useState(0);
  useEffect(() => {
    let vivo = true;
    cargar().then(
      (r) => vivo && setV(r),
      () => vivo && setV("error"),
    );
    return () => {
      vivo = false;
    };
  }, [...deps, n]);
  return [v, () => setN((x) => x + 1)];
}

export default function Progreso() {
  const { hoy, esc, ciclo, R, real, progreso: delServidor } = useEspacio();
  const [params] = useSearchParams();
  const apagados = !real && params.get("apagados") === "1";
  const lista = prepararLista({}, hoy, esc.ocurrencias);
  const progreso = delServidor ?? calcularProgreso(lista, hoy, ciclo.inicio);
  const fuente = useMemo<FuenteLogros>(
    () => (real ? fuenteLogrosReal() : fuenteLogrosEjemplo(() => ({ progreso, ciclo, metas: esc.metas, hoy }), apagados)),
    [real, apagados],
  );
  const [reconocimientos] = useCarga(() => fuente.reconocimientos(), [fuente, progreso.creditos]);
  const [recompensas] = useCarga(() => fuente.recompensas(), [fuente]);
  const [ranking, recargarRanking] = useCarga(() => fuente.ranking(), [fuente]);
  const conRecompensas = !!recompensas && recompensas !== "error";
  const conRanking = !!ranking && ranking !== "error";
  const laterales = Number(conRecompensas) + Number(conRanking);

  return (
    <div className="me-pantalla ml">
      <Portada />

      <div className="ml-fila ml-fila--tres">
        <MiNivel progreso={progreso} />
        <MisCreditos progreso={progreso} hoy={hoy} historial={R.creditos} />
        <MiConstancia progreso={progreso} />
      </div>

      <div className="ml-fila ml-fila--evolucion">
        <MiEvolucion progreso={progreso} lista={lista} />
        <Frase />
      </div>

      <div className={`ml-fila ml-fila--logros ml-fila--laterales-${laterales}`}>
        {reconocimientos !== null && <MisReconocimientos datos={reconocimientos} progreso={progreso} metas={esc.metas} amplio={laterales === 0} />}
        {conRecompensas && <MisRecompensas datos={recompensas as Recompensas} lista={lista} hoy={hoy} />}
        {conRanking && <Ranking datos={ranking as RankingEstado} fuente={fuente} alCambiar={recargarRanking} />}
      </div>

      <section className="me-bloque ml-metas" aria-labelledby="ml-metas">
        <h2 id="ml-metas" className="me-h2">
          {T.metas}
        </h2>
        <div className="me-metas">
          {esc.metas.map((m) => (
            <TarjetaMeta key={m.id} meta={m} lista={lista} hoy={hoy} />
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Portada

function Portada() {
  return (
    <header className="ml-portada">
      {FOTO_PORTADA ? <img className="ml-portada__fondo" src={FOTO_PORTADA} alt="" /> : <PaisajePortada className="ml-portada__fondo" />}
      <div className="ml-portada__texto">
        <div className="ml-portada__fila">
          <h1 className="ml-portada__h1">{T.portada.ojo}</h1>
          <EtiquetaEjemplo />
        </div>
        <p className="ml-portada__titulo">{T.portada.titulo}</p>
        <p className="ml-portada__bajada">
          {T.portada.bajada.map((l, i) => (
            <span key={i}>{l} </span>
          ))}
        </p>
      </div>
    </header>
  );
}

// Tarjeta con icono redondo, título y un enlace o botón a la derecha.
function Tarjeta({
  id,
  icono,
  titulo,
  extra,
  bajada,
  className,
  children,
}: {
  id: string;
  icono: NombreIconoApp;
  titulo: string;
  extra?: ReactNode;
  bajada?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className ? `ml-tarjeta ${className}` : "ml-tarjeta"} aria-labelledby={id}>
      <div className="ml-tarjeta__cabeza">
        <span className="ml-tarjeta__icono" aria-hidden="true">
          <Icono nombre={icono} tamaño={22} />
        </span>
        <div className="ml-tarjeta__titulos">
          <h2 id={id} className="ml-tarjeta__h2">
            {titulo}
          </h2>
          {bajada && <p className="ml-tarjeta__bajada">{bajada}</p>}
        </div>
        {extra && <div className="ml-tarjeta__extra">{extra}</div>}
      </div>
      {children}
    </section>
  );
}

function BotonEnlace({ children, onClick, describe }: { children: ReactNode; onClick: () => void; describe?: string }) {
  return (
    <button type="button" className="ml-enlace" onClick={onClick} aria-describedby={describe}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Mi nivel

function MiNivel({ progreso }: { progreso: Progreso }) {
  const [hoja, setHoja] = useState(false);
  const { ventana } = useEspacio();
  const { nivel, siguiente, creditos } = progreso;
  return (
    <Tarjeta id="ml-nivel" icono="mountain" titulo={T.nivel.titulo} className="ml-nivel" extra={<BotonEnlace onClick={() => setHoja(true)}>{T.nivel.ver}</BotonEnlace>}>
      <div className="ml-nivel__actual">
        <span className="ml-nivel__insignia" aria-hidden="true">
          <Icono nombre="mountain" tamaño={24} />
        </span>
        <p className="ml-nivel__texto">
          <span className="ml-nivel__n">{T.nivel.nivel(nivel.nivel)}</span>
          <span className="ml-nivel__nombre">{nivel.nombre}</span>
        </p>
      </div>
      {siguiente ? (
        <>
          <div className="ml-nivel__barra">
            <BarraProgreso
              valor={creditos}
              minimo={nivel.minimo}
              maximo={siguiente.minimo}
              etiqueta={T.nivel.barra(siguiente.nivel)}
              textoValor={`${creditos} de ${siguiente.minimo} créditos`}
            />
            <span className="ml-nivel__cifra" aria-hidden="true">
              {miles(creditos)} / {miles(siguiente.minimo)}
            </span>
          </div>
          <p className="ml-nota">{T.nivel.faltan(siguiente.minimo - creditos, siguiente.nivel)}</p>
        </>
      ) : (
        <p className="ml-nota">{T.nivel.maximo}</p>
      )}
      <Hoja abierta={hoja} onCerrar={() => setHoja(false)} titulo={T.nivel.hoja} className="ml-hoja">
        <ol className="niveles ml-niveles">
          {niveles.map((n) => (
            <li key={n.nivel} className={n.nivel === nivel.nivel ? "me-nivel-actual" : undefined} aria-current={n.nivel === nivel.nivel ? "true" : undefined}>
              <span>
                {T.nivel.nivel(n.nivel)} · {n.nombre}
                {n.nivel === nivel.nivel && <span className="sr-only"> ({T.nivel.actual})</span>}
              </span>
              <span>{T.nivel.desde(n.minimo)}</span>
            </li>
          ))}
        </ol>
        <h3 className="ml-hoja__h3">{T.nivel.reglas}</h3>
        <ul className="me-reglas">
          {/* Sin el ítem de foro y ranking: el ranking no da créditos (4.12). */}
          {reglasCreditosTextos()
            .filter((t) => !/foro|ranking/i.test(t))
            .map((t) => (
              <li key={t}>{t}</li>
            ))}
          <li>{T_PROGRESO.reglasExtra[0]}</li>
          <li>{T_PROGRESO.reglasExtra[1](ventana)}</li>
        </ul>
        <p className="microcopia">{T_PROGRESO.nota}</p>
      </Hoja>
    </Tarjeta>
  );
}

// ---------------------------------------------------------------------------
// Mis créditos: total, los de cada día de esta semana (lunes a domingo) y el bono siguiente.

function MisCreditos({ progreso, hoy, historial }: { progreso: Progreso; hoy: Iso; historial: string }) {
  const semana = semanaDesde(lunesDe(hoy));
  const porDia = new Map(progreso.dias.map((d) => [d.fecha, d.creditos]));
  const valores = semana.map((f) => (f > hoy ? null : (porDia.get(f) ?? 0)));
  const maximo = Math.max(4, ...valores.map((v) => v ?? 0));
  const { racha, bonoSiguiente } = progreso;
  const faltan = racha < reglasCreditos.diasRachaMedia ? reglasCreditos.diasRachaMedia - racha : racha < reglasCreditos.diasRachaLarga ? reglasCreditos.diasRachaLarga - racha : 0;
  const proximo = faltan ? bonoDiario(racha + faltan + 1) : null;
  return (
    <Tarjeta
      id="ml-creditos"
      icono="star"
      titulo={T.creditos.titulo}
      className="ml-creditos"
      extra={
        <Link to={historial} className="ml-enlace">
          {T.creditos.historial}
        </Link>
      }
    >
      <div className="ml-creditos__cuerpo">
        <div className="ml-creditos__total">
          <p className="ml-cifra">
            <span className="ml-cifra__n">{miles(progreso.creditos)}</span>{" "}
            <span className="ml-cifra__u">{T.creditos.acumulados(progreso.creditos)}</span>
          </p>
          <figure className="ml-barras ml-barras--dias">
            <svg viewBox="0 0 196 64" aria-hidden="true" focusable="false" preserveAspectRatio="none">
              {valores.map((v, i) => {
                const h = v === null ? 0 : Math.max(6, Math.round(((v || 0) / maximo) * 60));
                const clase = v === null ? "" : semana[i] === hoy ? "es-hoy" : v > 0 ? "con-creditos" : "sin-creditos";
                return v === null ? (
                  <rect key={semana[i]} className="es-futuro" x={i * 28 + 4} y={58} width="20" height="6" rx="3" />
                ) : (
                  <rect key={semana[i]} className={clase} x={i * 28 + 4} y={64 - h} width="20" height={h} rx="4" />
                );
              })}
            </svg>
            <ol className="ml-barras__ejes" aria-label={T.creditos.semana}>
              {semana.map((f, i) => (
                <li key={f}>
                  <span aria-hidden="true">{inicialDia(f)}</span>
                  <span className="sr-only">{T.creditos.dia(mayuscula(diaCorto(f)), valores[i])}</span>
                </li>
              ))}
            </ol>
          </figure>
        </div>
        <div className="ml-creditos__bono">
          <span className="ml-creditos__hoja" aria-hidden="true">
            <Icono nombre="leaf" tamaño={22} />
          </span>
          <p className="ml-creditos__bono-n">{T.creditos.bono(bonoSiguiente)}</p>
          <p className="ml-creditos__bono-t">{T.creditos.bonoTexto}</p>
          {proximo && proximo > bonoSiguiente && <p className="ml-creditos__bono-t">{T.creditos.sube(proximo, faltan)}</p>}
        </div>
      </div>
    </Tarjeta>
  );
}

// ---------------------------------------------------------------------------
// Mi constancia: racha actual y mejor racha del ciclo (de progreso_diario).

function MiConstancia({ progreso }: { progreso: Progreso }) {
  const mejor = Math.max(progreso.racha, ...progreso.dias.map((d) => d.racha));
  const ayuda = useId();
  return (
    <Tarjeta id="ml-constancia" icono="flame" titulo={T.constancia.titulo} className="ml-constancia">
      <div className="ml-constancia__cajas">
        <div className="ml-caja">
          <p className="ml-caja__titulo">
            {T.constancia.actual}
            <span className="ml-caja__info" aria-hidden="true">
              <Icono nombre="info" tamaño={16} />
            </span>
          </p>
          <p className="ml-caja__n" aria-describedby={ayuda}>
            {T.constancia.dias(progreso.racha)}
          </p>
          <p className="ml-llamas" role="img" aria-label={T.constancia.llamas(progreso.racha)}>
            {Array.from({ length: 7 }, (_, i) => (
              <Icono key={i} nombre="flame" tamaño={20} className={i < Math.min(progreso.racha, 7) ? "es-encendida" : undefined} />
            ))}
          </p>
        </div>
        <div className="ml-caja ml-caja--mejor">
          <p className="ml-caja__titulo">
            {T.constancia.mejor}
            <span className="ml-caja__corona" aria-hidden="true">
              <Icono nombre="crown" tamaño={22} />
            </span>
          </p>
          <p className="ml-caja__n">{T.constancia.dias(mejor)}</p>
          <p className="ml-caja__texto">{T.constancia.mejorTexto}</p>
        </div>
      </div>
      <p id={ayuda} className="ml-nota">
        {T.constancia.ayuda}
      </p>
    </Tarjeta>
  );
}

// ---------------------------------------------------------------------------
// Mi evolución y Esta semana

function MiEvolucion({ progreso, lista }: { progreso: Progreso; lista: Ocurrencia[] }) {
  const { hoy, ciclo, lunesDeSemana, semanaDelCiclo, R } = useEspacio();
  const semanas = Array.from({ length: ciclo.semanas }, (_, i) => {
    const n = i + 1;
    const desde = lunesDeSemana(n);
    const futura = desde > hoy;
    const dias = progreso.dias.filter((d) => d.fecha >= desde && d.fecha <= sumarDias(desde, 6));
    const prog = dias.reduce((s, d) => s + d.programadas, 0);
    const hechas = dias.reduce((s, d) => s + Math.min(d.hechas, d.programadas), 0);
    return { n, futura, pct: futura || !prog ? null : Math.round((100 * hechas) / prog), actual: desde <= hoy && hoy <= sumarDias(desde, 6) };
  });
  const actual = Math.min(Math.max(semanaDelCiclo(hoy), 1), ciclo.semanas);
  const deSemana = lista.filter((o) => o.semana === actual && o.vigente);
  const hechasSemana = deSemana.filter((o) => o.fecha <= hoy && cuentaComoHecha(o.registro));
  return (
    <Tarjeta id="ml-evolucion" icono="chart-column-increasing" titulo={T.evolucion.titulo} bajada={T.evolucion.bajada(ciclo.semanas)} className="ml-evolucion">
      <div className="ml-evolucion__cuerpo">
        <figure className="ml-semanas">
          <ol className="ml-semanas__lista">
            {semanas.map((s) => (
              <li key={s.n} className={s.actual ? "es-actual" : undefined}>
                <svg viewBox="0 0 64 120" aria-hidden="true" focusable="false" preserveAspectRatio="none" className="ml-semanas__barra">
                  {s.pct !== null && <rect x="0" y={120 - Math.max(4, Math.round(s.pct * 1.2))} width="64" height={Math.max(4, Math.round(s.pct * 1.2))} rx="4" />}
                </svg>
                <span className="sr-only">{T.evolucion.etiqueta(s.n, s.pct, s.futura)}</span>
                <span className="ml-semanas__n" aria-hidden="true">
                  {T.evolucion.semana(s.n)}
                </span>
                <span className="ml-semanas__pct" aria-hidden="true">
                  {s.futura ? "—" : s.pct === null ? T.evolucion.sinAcciones : T.evolucion.pct(s.pct)}
                </span>
              </li>
            ))}
          </ol>
          <figcaption className="ml-nota">{T.evolucion.nota}</figcaption>
        </figure>
        <section className="ml-esta-semana" aria-labelledby="ml-esta-semana">
          <h3 id="ml-esta-semana" className="ml-esta-semana__h3">
            {T.estaSemana.titulo}
          </h3>
          {deSemana.length ? (
            <div className="ml-esta-semana__fila">
              <AnilloDia hechas={hechasSemana.length} programadas={deSemana.length} etiqueta={T.estaSemana.texto(hechasSemana.length, deSemana.length)} />
              <div className="ml-esta-semana__texto">
                <p aria-hidden="true">{T.estaSemana.texto(hechasSemana.length, deSemana.length)}</p>
                <Link to={R.calendario} className="ml-enlace">
                  {T.estaSemana.verPlan}
                </Link>
              </div>
            </div>
          ) : (
            <p className="ml-nota">{T.estaSemana.sinAcciones}</p>
          )}
          {hechasSemana.length > 0 && (
            <details className="ml-esta-semana__hechas">
              <summary>{T.estaSemana.hechas}</summary>
              <ul className="me-hechas">
                {hechasSemana.map((o) => (
                  <li key={o.id} data-cat={o.categoria}>
                    <span className="me-hechas__dia">{mayuscula(diaCorto(o.fecha))}</span>
                    <span className="me-hechas__titulo">{o.titulo}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      </div>
    </Tarjeta>
  );
}

function Frase() {
  return (
    <aside className="ml-frase" aria-label={T.frase.join(" ")}>
      <Ilustracion nombre="paisaje" className="ml-frase__img" />
      <p className="ml-frase__texto" aria-hidden="true">
        <Icono nombre="sprout" tamaño={24} className="ml-frase__icono" />
        <span>
          {T.frase[0]}
          <br />
          {T.frase[1]}
        </span>
      </p>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Mis reconocimientos (E1): los 6 del catálogo; obtenidos con su fecha, el resto con su avance.

const ICONO_REC: Record<ClaveReconocimiento, NombreIconoApp> = {
  primer_paso: "sprout",
  primera_semana: "footprints",
  constancia: "mountain",
  mitad_del_camino: "heart",
  ciclo_completado: "star",
  meta_alcanzada: "sun",
};

// Avance hacia lo que falta, solo cuando se puede calcular con los mismos datos de la base.
function avanceDe(r: Reconocimiento, progreso: Progreso, metas: Meta[], diasCiclo: number, hoyEnCiclo: number): [number, number] | null {
  if (r.obtenido) return null;
  if (r.clave === "constancia" && r.umbral) return [Math.min(Math.max(...progreso.dias.map((d) => d.racha), 0), r.umbral), r.umbral];
  if (r.clave === "ciclo_completado") return [Math.min(Math.max(hoyEnCiclo, 0), diasCiclo), diasCiclo];
  if (r.clave === "meta_alcanzada") {
    const mejor = metas.filter((m) => m.hitos.length).sort((a, b) => b.hitos.filter((h) => h.logrado).length / b.hitos.length - a.hitos.filter((h) => h.logrado).length / a.hitos.length)[0];
    return mejor ? [mejor.hitos.filter((h) => h.logrado).length, mejor.hitos.length] : null;
  }
  return null;
}

function MisReconocimientos({ datos, progreso, metas, amplio }: { datos: Carga<Reconocimiento[]>; progreso: Progreso; metas: Meta[]; amplio: boolean }) {
  const [hoja, setHoja] = useState(false);
  const { hoy, ciclo } = useEspacio();
  const diasCiclo = ciclo.semanas * 7;
  const hoyEnCiclo = Math.round((Date.parse(hoy) - Date.parse(ciclo.inicio)) / 86_400_000) + 1;
  const lista = Array.isArray(datos) ? datos : null;
  const obtenidos = lista?.filter((r) => r.obtenido).length ?? 0;
  const corto = (r: Reconocimiento) => {
    const c = T.reconocimientos.corto[r.clave];
    return typeof c === "function" ? c(r.umbral ?? CATALOGO.find((x) => x.clave === r.clave)!.umbral ?? 0) : c;
  };
  return (
    <Tarjeta
      id="ml-reconocimientos"
      icono="award"
      titulo={T.reconocimientos.titulo}
      bajada={T.reconocimientos.bajada}
      className={amplio ? "ml-reconocimientos es-amplio" : "ml-reconocimientos"}
      extra={lista && <BotonEnlace onClick={() => setHoja(true)}>{T.reconocimientos.ver}</BotonEnlace>}
    >
      {datos === undefined && <p className="ml-nota">…</p>}
      {datos === "error" && <p className="ml-nota">{T.error}</p>}
      {lista && (
        <>
          <p className="sr-only">{T.reconocimientos.resumen(obtenidos, lista.length)}</p>
          <ul className="ml-insignias">
            {lista.map((r) => {
              const avance = avanceDe(r, progreso, metas, diasCiclo, hoyEnCiclo);
              return (
                <li key={r.clave} className={r.obtenido ? "ml-insignia es-obtenida" : "ml-insignia"} data-clave={r.clave}>
                  <span className="ml-insignia__circulo" aria-hidden="true">
                    <Icono nombre={ICONO_REC[r.clave]} tamaño={24} />
                  </span>
                  <h3 className="ml-insignia__nombre">{r.nombre}</h3>
                  <p className="ml-insignia__texto">{r.obtenido ? (r.clave === "meta_alcanzada" && r.veces > 1 ? T.reconocimientos.veces(r.veces) : corto(r)) : corto(r)}</p>
                  {r.obtenido ? (
                    <p className="ml-insignia__fecha">
                      <span className="sr-only">{T.reconocimientos.obtenido(diaMes(r.obtenido))}</span>
                      <time dateTime={r.obtenido} aria-hidden="true">
                        {diaMes(r.obtenido)}
                      </time>
                    </p>
                  ) : avance ? (
                    <BarraProgreso
                      className="ml-insignia__barra"
                      valor={avance[0]}
                      maximo={avance[1]}
                      etiqueta={`${r.nombre}: ${T.reconocimientos.porLograr}`}
                      textoValor={T.reconocimientos.progreso(avance[0], avance[1])}
                      texto={T.reconocimientos.progreso(avance[0], avance[1])}
                    />
                  ) : (
                    <p className="ml-insignia__fecha">{T.reconocimientos.porLograr}</p>
                  )}
                </li>
              );
            })}
          </ul>
          <Hoja abierta={hoja} onCerrar={() => setHoja(false)} titulo={T.reconocimientos.hoja} className="ml-hoja">
            <ul className="ml-hoja__lista">
              {lista.map((r) => (
                <li key={r.clave}>
                  <strong>{r.nombre}</strong> · {r.obtenido ? T.reconocimientos.obtenido(diaMes(r.obtenido)) : T.reconocimientos.porLograr}
                  <br />
                  {r.descripcion}
                </li>
              ))}
            </ul>
            <p className="microcopia">{T.reconocimientos.hojaNota}</p>
          </Hoja>
        </>
      )}
    </Tarjeta>
  );
}

// ---------------------------------------------------------------------------
// Mis recompensas: el 10 % por renovación (solo si el dueño lo activó o ya lo obtuviste).

function MisRecompensas({ datos, lista, hoy }: { datos: Recompensas; lista: Ocurrencia[]; hoy: Iso }) {
  const [hoja, setHoja] = useState(false);
  const { ventana } = useEspacio();
  const disponible = datos.obtenidos.find((o) => o.estado === "disponible");
  const v = datos.vigente;
  const vigentes = lista.filter((o) => o.vigente);
  const hechas = vigentes.filter((o) => o.fecha <= hoy && cuentaComoHecha(o.registro)).length;
  // Ya no alcanza si una acción quedó sin hacer y fuera del plazo para registrarla.
  const perdida = vigentes.some((o) => o.fecha < sumarDias(hoy, -ventana) && !cuentaComoHecha(o.registro));
  return (
    <Tarjeta
      id="ml-recompensas"
      icono="gift"
      titulo={T.recompensas.titulo}
      bajada={T.recompensas.bajada}
      className="ml-recompensas"
      extra={v && <BotonEnlace onClick={() => setHoja(true)}>{T.recompensas.detalles}</BotonEnlace>}
    >
      {disponible ? (
        <div className="ml-premio es-obtenido">
          <p className="ml-premio__titulo">
            <Icono nombre="tag" tamaño={24} className="ml-premio__icono" />
            <span>{T.recompensas.obtenido(disponible.porcentaje)}</span>
          </p>
          <p className="ml-nota">{T.recompensas.obtenidoTexto}</p>
        </div>
      ) : v ? (
        <div className="ml-premio">
          <p className="ml-premio__titulo">
            <Icono nombre="tag" tamaño={24} className="ml-premio__icono" />
            <span>
              <strong>{T.recompensas.descuento(v.porcentaje)}</strong>
              <br />
              {T.recompensas.renovacion}
            </span>
            <Icono nombre="lock" tamaño={20} className="ml-premio__candado" />
          </p>
          <BarraProgreso
            valor={hechas}
            maximo={Math.max(vigentes.length, 1)}
            etiqueta={T.recompensas.barra}
            textoValor={T.recompensas.progreso(hechas, vigentes.length)}
            texto={T.recompensas.progreso(hechas, vigentes.length)}
            className="ml-premio__barra"
          />
          <p className="ml-nota">{perdida ? T.recompensas.noAlcanza : `${T.recompensas.condicion(v.diasCiclo, v.porcentaje)} ${T.recompensas.alFinal}`}</p>
        </div>
      ) : null}
      {v && (
        <Hoja abierta={hoja} onCerrar={() => setHoja(false)} titulo={T.recompensas.hoja} className="ml-hoja">
          <p>{v.descripcion}</p>
          <p className="microcopia">{T.recompensas.hojaNota}</p>
        </Hoja>
      )}
    </Tarjeta>
  );
}

// ---------------------------------------------------------------------------
// Ranking semanal voluntario (C5): solo con el módulo habilitado.

function Ranking({ datos, fuente, alCambiar }: { datos: RankingEstado; fuente: FuenteLogros; alCambiar: () => void }) {
  const [hoja, setHoja] = useState(false);
  const [pidiendo, setPidiendo] = useState(false);
  const [alias, setAlias] = useState(datos.alias ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const idAlias = useId();
  const cambiar = async (si: boolean, nuevoAlias: string | null = null) => {
    setOcupado(true);
    setError(null);
    try {
      await fuente.participar(si, si ? nuevoAlias : null);
      setPidiendo(false);
      alCambiar();
    } catch (e) {
      const clave = e instanceof ErrorBase ? `${e.campo}:${e.codigo}` : "";
      setError(T.ranking.errores[clave] ?? T.ranking.error);
    } finally {
      setOcupado(false);
    }
  };
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    void cambiar(true, alias.trim() || null);
  };
  return (
    <Tarjeta id="ml-ranking" icono="users" titulo={T.ranking.titulo} bajada={T.ranking.bajada} className="ml-ranking" extra={<BotonEnlace onClick={() => setHoja(true)}>{T.ranking.ver}</BotonEnlace>}>
      <Podio />
      {datos.participo ? (
        <div className="ml-ranking__estado">
          <p>{datos.puesto && datos.cumplimiento !== null ? T.ranking.puesto(datos.puesto, datos.total, datos.cumplimiento) : T.ranking.sinPuesto}</p>
          {datos.alias && <p className="ml-nota">{T.ranking.como(datos.alias)}</p>}
          <button type="button" className="boton boton--terciario" onClick={() => void cambiar(false)} disabled={ocupado}>
            {T.ranking.salir}
          </button>
        </div>
      ) : pidiendo ? (
        <form className="ml-ranking__form" onSubmit={enviar} noValidate>
          <label htmlFor={idAlias} className="ml-ranking__etiqueta">
            {T.ranking.alias}
          </label>
          <input
            id={idAlias}
            className="campo-texto"
            value={alias}
            maxLength={24}
            autoComplete="off"
            aria-describedby={`${idAlias}-ayuda`}
            aria-invalid={error ? true : undefined}
            onChange={(e) => setAlias(e.target.value)}
          />
          <p id={`${idAlias}-ayuda`} className="ml-nota">
            {T.ranking.aliasAyuda}
          </p>
          <div className="acciones">
            <button type="submit" className="boton boton--primario" disabled={ocupado}>
              {T.ranking.entrar}
            </button>
            <button type="button" className="boton boton--terciario" onClick={() => setPidiendo(false)}>
              {T.ranking.cancelar}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="ml-ranking__texto">
            {T.ranking.texto[0]}
            <br />
            {T.ranking.texto[1]}
          </p>
          <button type="button" className="boton boton--primario ml-ranking__boton" onClick={() => (datos.alias ? void cambiar(true) : setPidiendo(true))} disabled={ocupado}>
            {T.ranking.participar}
          </button>
          <BotonEnlace onClick={() => setHoja(true)}>{T.ranking.saberMas}</BotonEnlace>
        </>
      )}
      <div role="alert" className="ml-ranking__error">
        {error && <p className="aviso aviso--error-envio">{error}</p>}
      </div>
      <Hoja abierta={hoja} onCerrar={() => setHoja(false)} titulo={T.ranking.hoja} className="ml-hoja">
        <ul className="me-reglas">
          {T.ranking.reglas.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Hoja>
    </Tarjeta>
  );
}

// Podio ilustrado (decorativo): colinas y tres siluetas sin rostro, como en la maqueta.
function Podio() {
  return (
    <svg className="ml-podio" viewBox="0 0 260 80" aria-hidden="true" focusable="false">
      <path className="ml-podio__cerro" d="M0 62 C40 40 80 44 120 56 S200 40 260 54 V80 H0Z" />
      <path className="ml-podio__cerro2" d="M0 70 C60 58 120 62 180 68 S240 64 260 66 V80 H0Z" />
      <rect className="ml-podio__base" x="100" y="46" width="24" height="30" />
      <rect className="ml-podio__base" x="124" y="36" width="24" height="40" />
      <rect className="ml-podio__base" x="148" y="52" width="24" height="24" />
      <g className="ml-podio__persona">
        <circle cx="112" cy="30" r="4" />
        <path d="M107 46 L108 35 H116 L117 46Z" />
        <circle cx="136" cy="19" r="4" />
        <path d="M131 36 L132 24 H140 L141 36Z" />
        <circle cx="160" cy="36" r="4" />
        <path d="M155 52 L156 41 H164 L165 52Z" />
      </g>
      <path className="ml-podio__bandera" d="M136 15 V4 L144 7 L136 10" />
    </svg>
  );
}

// Tarjeta de meta: categoría, nombre, «para qué», barra hasta hoy, semanas e hitos.
// sinAvance (Mi plan → Mis metas): solo qué, para qué e hitos; el avance queda en Mis logros.
export function TarjetaMeta({ meta, lista, hoy, sinAvance }: { meta: Meta; lista: Ocurrencia[]; hoy: Iso; sinAvance?: boolean }) {
  const deMeta = lista.filter((o) => o.metaId === meta.id && hechaHasta(o, hoy));
  const hechas = deMeta.filter((o) => cuentaComoHecha(o.registro)).length;
  const { ciclo, lunesDeSemana } = useEspacio();
  const id = `meta-${meta.id}`;
  const semanas = Array.from({ length: ciclo.semanas }, (_, i) => {
    const n = i + 1;
    if (lunesDeSemana(n) > hoy) return { n, texto: "—", futura: true };
    const s = deMeta.filter((o) => o.semana === n);
    return { n, texto: `${s.filter((o) => cuentaComoHecha(o.registro)).length}/${s.length}`, futura: false };
  });

  return (
    <MetaTarjeta cat={meta.categoria} como="article" className="me-meta">
      <ChipMeta cat={meta.categoria} />
      <h3 id={id} className="me-h2">
        {meta.titulo}
      </h3>
      {meta.paraQue && (
        <p className="voz me-meta__para">
          <q>{meta.paraQue}</q>
        </p>
      )}
      {sinAvance ? null : hechas ? (
        <>
          <BarraProgreso
            valor={hechas}
            maximo={deMeta.length}
            cat={meta.categoria}
            etiqueta={T_PROGRESO.barraMetaEtiqueta(meta.titulo)}
            textoValor={T_PROGRESO.barraMeta(hechas, deMeta.length)}
            texto={T_PROGRESO.barraMeta(hechas, deMeta.length)}
          />
          <p className="me-meta__semanas">
            <span className="sr-only">{T_PROGRESO.semanasEtiqueta}: </span>
            {semanas.map((s, i) => (
              <span key={s.n} className={s.futura ? "me-meta__semana es-futura" : "me-meta__semana"}>
                {i > 0 && <span aria-hidden="true"> · </span>}S{s.n} {s.texto}
              </span>
            ))}
          </p>
        </>
      ) : (
        <p className="me-bloque__bajada">{T_PROGRESO.metaVacia}</p>
      )}
      {meta.hitos.length > 0 && (
        <div className="me-meta__hitos">
          <h4>{T_PROGRESO.hitos}</h4>
          <ul className="lista-check me-hitos">
            {meta.hitos.map((h) => (
              <li key={h.texto} className={h.logrado ? undefined : "me-hito--pendiente"}>
                <span className="lista-check-icono" aria-hidden="true" />
                <span>
                  <span className="sr-only">{h.logrado ? T_PROGRESO.hitoLogrado : T_PROGRESO.hitoPendiente}</span>
                  {h.texto}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </MetaTarjeta>
  );
}
