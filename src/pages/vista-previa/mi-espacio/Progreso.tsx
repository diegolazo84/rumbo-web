// Vista previa · Progreso (plataforma 4.10): avance por meta (el denominador nunca incluye
// acciones futuras), lo que sí hiciste esta semana y créditos, racha y nivel. Se muestra aunque
// los créditos estén ocultos en Hoy. Los créditos no miden el valor de la persona.
import { Link } from "react-router-dom";
import { Acordeon } from "../../../components/Bloques";
import Etiqueta from "../../../components/Etiqueta";
import { BarraProgreso, ChipMeta, Icono, MetaTarjeta } from "../../../components/app";
import { calcularProgreso, cuentaComoHecha, type Meta, type Ocurrencia } from "../../../data/ejemplo-app";
import { niveles, reglasCreditosTextos } from "../../../data/rumbo";
import { diaCorto, mayuscula, type Iso } from "../../../lib/fechas";
import { Cabeza, prepararLista, useEspacio } from "./comun";
import { T_HOY, T_PROGRESO } from "./textos";

const hechaHasta = (o: Ocurrencia, hoy: Iso) => o.vigente && o.fecha <= hoy;

export default function Progreso() {
  const { hoy, esc, ciclo, R, ventana, semanaDelCiclo, progreso: delServidor } = useEspacio();
  const lista = prepararLista({}, hoy, esc.ocurrencias);
  const progreso = delServidor ?? calcularProgreso(lista, hoy, ciclo.inicio);
  const semana = semanaDelCiclo(hoy);
  const hechasSemana = lista.filter((o) => o.semana === semana && hechaHasta(o, hoy) && cuentaComoHecha(o.registro));

  return (
    <div className="me-pantalla me-progreso">
      <Cabeza ojo={T_PROGRESO.ojo} titulo={T_PROGRESO.titulo} bajada={T_PROGRESO.bajada} />

      <section className="me-bloque" aria-labelledby="progreso-metas">
        <h2 id="progreso-metas" className="sr-only">
          {T_PROGRESO.metas}
        </h2>
        <div className="me-metas">
          {esc.metas.map((m) => (
            <TarjetaMeta key={m.id} meta={m} lista={lista} hoy={hoy} />
          ))}
        </div>
      </section>

      <div className="me-progreso__columnas">
        <section className="me-bloque" aria-labelledby="progreso-semana">
          <h2 id="progreso-semana" className="me-h2">
            {T_PROGRESO.semana}
          </h2>
          {hechasSemana.length ? (
            <ul className="me-hechas">
              {hechasSemana.map((o) => (
                <li key={o.id} data-cat={o.categoria}>
                  <span className="me-hechas__dia">{mayuscula(diaCorto(o.fecha))}</span>
                  <span className="me-hechas__titulo">{o.titulo}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="me-bloque__bajada">{T_PROGRESO.semanaVacia}</p>
          )}
        </section>

        <section className="tarjeta tarjeta--producto me-creditos" aria-labelledby="progreso-creditos">
          <h2 id="progreso-creditos" className="me-h2">
            {T_PROGRESO.creditos}
          </h2>
          <div className="me-resumen__fila">
            <Etiqueta variante="activo" grande nowrap>
              {T_HOY.resumen.nivel(progreso.nivel.nivel, progreso.nivel.nombre)}
            </Etiqueta>
            <span className="me-resumen__creditos">{T_HOY.resumen.creditos(progreso.creditos)}</span>
          </div>
          {progreso.siguiente ? (
            <BarraProgreso
              valor={progreso.creditos}
              minimo={progreso.nivel.minimo}
              maximo={progreso.siguiente.minimo}
              etiqueta={T_HOY.resumen.barraEtiqueta(progreso.siguiente.nombre)}
              textoValor={`${progreso.creditos} de ${progreso.siguiente.minimo} créditos`}
              texto={T_HOY.resumen.barra(progreso.creditos, progreso.siguiente.minimo, progreso.siguiente.nombre)}
            />
          ) : (
            <p className="barra-texto">{T_HOY.resumen.maximo}</p>
          )}
          <p className="me-creditos__bono">{T_PROGRESO.bono(progreso.bonoSiguiente, progreso.racha)}</p>
          <Acordeon
            compacto
            items={[
              {
                id: "niveles",
                resumen: T_PROGRESO.niveles,
                contenido: (
                  <ol className="niveles">
                    {niveles.map((n) => (
                      <li key={n.nivel} className={n.nivel === progreso.nivel.nivel ? "me-nivel-actual" : undefined}>
                        <span>{T_HOY.resumen.nivel(n.nivel, n.nombre)}</span>
                        <span>{T_PROGRESO.nivelCreditos(n.minimo)}</span>
                      </li>
                    ))}
                  </ol>
                ),
              },
            ]}
          />
          <Acordeon
            compacto
            items={[
              {
                id: "reglas",
                resumen: T_PROGRESO.reglas,
                contenido: (
                  <ul className="me-reglas">
                    {/* Sin el ítem de foro y ranking mientras la comunidad no exista (4.12). */}
                    {reglasCreditosTextos()
                      .filter((t) => !/foro|ranking/i.test(t))
                      .map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    <li>{T_PROGRESO.reglasExtra[0]}</li>
                    <li>{T_PROGRESO.reglasExtra[1](ventana)}</li>
                  </ul>
                ),
              },
            ]}
          />
          <p className="microcopia">{T_PROGRESO.nota}</p>
          <Link to={R.creditos} className="enlace-flecha">
            {T_PROGRESO.detalle}
            <Icono nombre="arrow-right" tamaño={16} />
          </Link>
        </section>
      </div>
    </div>
  );
}

// Tarjeta de meta: categoría, nombre, «para qué», barra hasta hoy, semanas e hitos.
function TarjetaMeta({ meta, lista, hoy }: { meta: Meta; lista: Ocurrencia[]; hoy: Iso }) {
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
      {hechas ? (
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
