// Vista previa · estados del programa (plataforma 4.3). Cada estado es una pantalla completa
// con .estado-vacio (H1) y una sola acción principal:
// - preparacion: ciclo acordado sin programa publicado; «Lo que acordamos», «Mientras tanto» y
//   el CalendarioEjemplo punteado.
// - inicio-futuro: programa publicado; las acciones del primer día se ven con el control de
//   marcar desactivado («Podrás marcarla desde el lunes 5.»).
// - pausa-pedida y pausa-cuidado: la persona no ve el motivo, solo el texto que le corresponde.
// - cerrado: resumen por meta, créditos y nivel, voz y descarga de registros.
// - ciclo-2: Camila cerró su ciclo 1 y acordó un ciclo 2 que empieza el lunes 9 de noviembre:
//   vuelve a «preparación» con la línea «Tu ciclo 2 empieza el …».
// Fechas de ejemplo coherentes con src/data/ejemplo-app.ts (ciclo desde el lunes 5 de octubre).
import { useState } from "react";
import { Link } from "react-router-dom";
import CalendarioEjemplo from "../../../components/CalendarioEjemplo";
import { Acordeon, Aviso, ListaCheck } from "../../../components/Bloques";
import Etiqueta from "../../../components/Etiqueta";
import { ChipMeta, EstadoVacio, Hoja, HojaAyuda, Icono, MetaTarjeta } from "../../../components/app";
import { calcularProgreso, ciclo as cicloEjemplo, cuentaComoHecha, ocurrenciasDel, type Ocurrencia } from "../../../data/ejemplo-app";
import { LIMITES } from "../../../data/formularios";
import { DIAS, diaCorto, fechaLarga, mayuscula, sumarDias, type Iso } from "../../../lib/fechas";
import { recursosAyuda, reglasCreditosTextos } from "../../../data/rumbo";
import type { PropsPantalla } from "../registro";
import Detalle from "./Detalle";
import { EtiquetaEjemplo, FilaOcurrencia, prepararLista, useDescargarDatos, useEspacio } from "./comun";
import { T_COMUN, T_ESTADOS, T_HOY, T_PROGRESO, nombrePlan } from "./textos";

// «Hoy» de ejemplo antes de empezar: el jueves anterior al primer lunes del ciclo.
const HOY_PREVIO: Iso = sumarDias(cicloEjemplo.inicio, -4);
// Pausa acordada de ejemplo: desde el lunes 12 hasta el lunes 26 de octubre.
const PAUSA_DESDE: Iso = "2026-10-12";
const PAUSA_HASTA: Iso = "2026-10-26";
// Ciclo cerrado: el día siguiente al último del ciclo.
const HOY_CERRADO: Iso = sumarDias(cicloEjemplo.fin, 1);

// Ciclo 2 de ejemplo: el segundo lunes después del cierre del ciclo 1.
const INICIO_CICLO_2: Iso = sumarDias(cicloEjemplo.fin, 8);

// En Mi espacio real, el estado lo decide la ruta mi-espacio/ con el ciclo vigente (4.3).
export default function EstadoPrograma({ estado = "preparacion" }: PropsPantalla) {
  const { real, ciclo } = useEspacio();
  if (estado === "inicio-futuro") return <InicioFuturo />;
  if (estado === "pausa-pedida" || estado === "pausa-cuidado") return <Pausa cuidado={estado === "pausa-cuidado"} />;
  if (estado === "cerrado") return <Cerrado />;
  if (estado === "ciclo-2")
    return <Preparacion cicloNuevo={real ? { numero: ciclo.numero, inicio: ciclo.inicio } : { numero: 2, inicio: INICIO_CICLO_2 }} />;
  return <Preparacion />;
}

// Fila «ojo · Ejemplo» sobre el H1 del estado vacío.
function FilaOjo({ ojo }: { ojo?: string }) {
  return (
    <div className="me-cabeza__fila me-estado__fila">
      {ojo ? <p className="ojo">{ojo}</p> : <span />}
      <EtiquetaEjemplo />
    </div>
  );
}

// Reglas de créditos sin el ítem de foro y ranking mientras la comunidad no exista (4.12).
function ReglasCreditos() {
  return (
    <ul className="me-reglas">
      {reglasCreditosTextos()
        .filter((t) => !/foro|ranking/i.test(t))
        .map((t) => (
          <li key={t}>{t}</li>
        ))}
      <li>{T_PROGRESO.reglasExtra[0]}</li>
      <li>{T_PROGRESO.reglasExtra[1](LIMITES.diasRegistroTardio)}</li>
    </ul>
  );
}

// ---------------------------------------------------------------------------
// 4.3.1 Acordado, programa en preparación

function Preparacion({ cicloNuevo }: { cicloNuevo?: { numero: number; inicio: Iso } }) {
  const { ciclo, participante, esc, R, rutaAjuste } = useEspacio();
  const metas = esc.metas;
  const DIA_REVISION = DIAS[ciclo.diaRevision - 1]; // «jueves» (lunes a viernes no cambian en plural)
  const t = T_ESTADOS.preparacion;
  const inicio = cicloNuevo?.inicio ?? ciclo.inicio;
  const plan = nombrePlan(ciclo.plan);
  const revision =
    ciclo.plan === "cercano" ? t.acordamos.videollamada(DIA_REVISION, ciclo.horaVideollamada) : t.acordamos.revisionEscrita(DIA_REVISION);

  return (
    <div className="me-pantalla me-estado me-estado--preparacion">
      <EstadoVacio
        nivel={1}
        titulo={t.titulo}
        antes={
          <>
            <FilaOjo ojo={t.ojo} />
            <p className="me-saludo">{t.saludo(participante.nombre)}</p>
          </>
        }
      >
        {cicloNuevo && <p className="me-negrita">{t.cicloNuevo(cicloNuevo.numero, fechaLarga(cicloNuevo.inicio))}</p>}
        <p>
          {t.texto.antes}
          <strong className="me-negrita">{fechaLarga(inicio)}</strong>
          {t.texto.despues}
        </p>
      </EstadoVacio>

      <div className="me-estado__tarjetas">
        <section className="tarjeta me-estado__tarjeta" aria-labelledby="estado-acordamos">
          <h2 id="estado-acordamos" className="me-h2">
            {t.acordamos.titulo}
          </h2>
          <ListaCheck
            items={[
              t.acordamos.plan(plan),
              revision,
              t.acordamos.ciclo(ciclo.semanas),
              // «Tus metas: …» solo si ya están cargadas (4.3.1).
              ...(metas.length ? [t.acordamos.metas(metas.map((m) => m.titulo).join(", "))] : []),
            ]}
          />
        </section>

        <section className="tarjeta me-estado__tarjeta" aria-labelledby="estado-mientras">
          <h2 id="estado-mientras" className="me-h2">
            {t.mientras.titulo}
          </h2>
          <ul className="me-mientras">
            <li>
              <Link to={R.preferencias} className="me-mientras__enlace">
                <Icono nombre="settings" tamaño={20} />
                <span>{t.mientras.nombre}</span>
                <Icono nombre="chevron-right" tamaño={16} />
              </Link>
            </li>
            <li>
              <Acordeon
                compacto
                className="me-mientras__acordeon"
                items={[{ id: "creditos", resumen: t.mientras.creditos, contenido: <ReglasCreditos /> }]}
              />
            </li>
            <li>
              <Link to={rutaAjuste(undefined, "antes")} className="me-mientras__enlace">
                <Icono nombre="sliders-horizontal" tamaño={20} />
                <span>{t.mientras.cambio}</span>
                <Icono nombre="chevron-right" tamaño={16} />
              </Link>
            </li>
          </ul>
        </section>
      </div>

      <div className="me-ejemplo-punteado">
        <CalendarioEjemplo />
        <p className="me-ejemplo-punteado__pie">{t.ejemploPie}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4.3.2 Programa publicado, inicio futuro

function InicioFuturo() {
  const { real, hoy: hoyReal, ciclo, participante, esc, R } = useEspacio();
  const hoy = real ? hoyReal : HOY_PREVIO;
  const t = T_ESTADOS.inicioFuturo;
  const lista = prepararLista({}, hoy, esc.ocurrencias);
  const primerDia = ocurrenciasDel(ciclo.inicio, lista);
  const [abierta, setAbierta] = useState<Ocurrencia | null>(null);
  const [ayuda, setAyuda] = useState(false);

  return (
    <div className="me-pantalla me-estado">
      <EstadoVacio
        nivel={1}
        titulo={t.titulo(diaCorto(ciclo.inicio))}
        antes={
          <>
            <FilaOjo />
            <p className="me-saludo">{T_HOY.saludo(participante.nombre)}</p>
          </>
        }
        accion={
          <Link to={real ? `${R.calendario}?vista=semana&fecha=${ciclo.inicio}` : R.calendario} className="boton boton--primario">
            {t.boton}
          </Link>
        }
      >
        {t.texto}
      </EstadoVacio>

      <section className="me-grupo me-estado__primer-dia" aria-labelledby="estado-primer-dia">
        <h2 id="estado-primer-dia" className="me-grupo__titulo">
          {mayuscula(diaCorto(ciclo.inicio))}
        </h2>
        <ul className="me-filas" aria-labelledby="estado-primer-dia">
          {primerDia.map((o) => (
            <li key={o.id}>
              <FilaOcurrencia o={o} hoy={hoy} futura={t.nota} onAbrir={() => setAbierta(o)} />
            </li>
          ))}
        </ul>
      </section>

      <footer className="me-pie">
        <p>
          <button type="button" className="enlace-util" aria-haspopup="dialog" onClick={() => setAyuda(true)}>
            <Icono nombre="phone" tamaño={16} />
            {T_COMUN.ayudaInmediata}
          </button>
        </p>
      </footer>

      <Hoja abierta={!!abierta} onCerrar={() => setAbierta(null)} titulo={abierta?.titulo ?? ""} className="hoja--detalle">
        {abierta && <Detalle o={abierta} hoy={hoy} enHoja onRegistrar={() => undefined} />}
      </Hoja>
      <HojaAyuda abierta={ayuda} onCerrar={() => setAyuda(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4.3.4 En pausa. La frase sobre la racha («Mientras dura la pausa…») solo se publica si Diego
// decidió que la pausa no la corta (9.3-5): aquí no se publica.

function Pausa({ cuidado }: { cuidado: boolean }) {
  const { real, ciclo, R } = useEspacio();
  const desde = real ? ciclo.pausa?.desde : PAUSA_DESDE;
  const hasta = real ? ciclo.pausa?.hasta : PAUSA_HASTA;
  const t = T_ESTADOS.pausa;
  const [ayuda, setAyuda] = useState(false);
  const acciones = (
    <>
      <Link to={R.progreso} className="boton boton--secundario">
        {T_COMUN.verMiProgreso}
      </Link>
      <button type="button" className="boton boton--terciario" aria-haspopup="dialog" onClick={() => setAyuda(true)}>
        <Icono nombre="phone" tamaño={20} />
        {T_COMUN.ayudaInmediata}
      </button>
    </>
  );

  return (
    <div className="me-pantalla me-pantalla--angosta me-estado">
      <EstadoVacio
        nivel={1}
        titulo={cuidado ? t.cuidado.titulo : t.pedida.titulo}
        antes={
          <>
            <FilaOjo />
            <Etiqueta variante="nota">{t.etiqueta}</Etiqueta>
          </>
        }
        accion={acciones}
      >
        {cuidado ? (
          <>
            <p>{t.cuidado.texto}</p>
            <Aviso icono="phone" className="me-estado__ayuda">
              <ul className="me-estado__lineas">
                {recursosAyuda().map((r) => (
                  <li key={r.numero}>
                    <span className="me-estado__linea-nombre">{r.nombre}</span>
                    {r.tel ? (
                      <a className="me-estado__numero" href={r.tel}>
                        {r.numero}
                      </a>
                    ) : (
                      <span className="me-estado__numero">{r.numero}</span>
                    )}
                    <span className="me-estado__linea-texto">{r.descripcion}</span>
                  </li>
                ))}
              </ul>
              <p>
                {t.cuidado.ayuda}
                <Link to={R.ayuda}>{T_COMUN.ayudaInmediata}</Link>.
              </p>
            </Aviso>
          </>
        ) : (
          <>
            {desde && <p>{t.pedida.desde(fechaLarga(desde))}</p>}
            {hasta && <p>{t.pedida.hasta(fechaLarga(hasta))}</p>}
          </>
        )}
      </EstadoVacio>
      <HojaAyuda abierta={ayuda} onCerrar={() => setAyuda(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4.3.5 Ciclo cerrado

function Cerrado() {
  const esp = useEspacio();
  const { real, ciclo, participante, esc, R } = esp;
  const descargarDatos = useDescargarDatos();
  const hoy = real ? esp.hoy : HOY_CERRADO;
  const metas = esc.metas;
  const t = T_ESTADOS.cerrado;
  const lista = prepararLista({}, hoy, esc.ocurrencias);
  const progreso = esp.progreso ?? calcularProgreso(lista, hoy, ciclo.inicio);

  return (
    <div className="me-pantalla me-estado">
      <EstadoVacio
        nivel={1}
        titulo={t.titulo(ciclo.semanas)}
        antes={<FilaOjo ojo={t.ojo} />}
        accion={
          <>
            <button type="button" className="boton boton--secundario" onClick={() => void descargarDatos(hoy).catch(() => undefined)}>
              <Icono nombre="download" tamaño={20} />
              {t.descargar}
            </button>
            <Link to={R.semanaPublicada} className="boton boton--terciario">
              {t.ultimaRevision}
            </Link>
          </>
        }
      >
        {t.texto}
      </EstadoVacio>

      <section className="me-bloque" aria-labelledby="cerrado-metas">
        <h2 id="cerrado-metas" className="sr-only">
          {T_PROGRESO.metas}
        </h2>
        <div className="me-metas">
          {metas.map((m) => {
            const registradas = lista.filter((o) => o.metaId === m.id && o.vigente && cuentaComoHecha(o.registro)).length;
            const hitos = m.hitos.filter((h) => h.logrado);
            return (
              <MetaTarjeta key={m.id} cat={m.categoria} como="article" className="me-meta">
                <ChipMeta cat={m.categoria} />
                <h3 className="me-h2">{m.titulo}</h3>
                <p className="me-estado__registradas">{t.registradas(registradas)}</p>
                {hitos.length > 0 && <ListaCheck className="me-hitos" items={hitos.map((h) => h.texto)} />}
              </MetaTarjeta>
            );
          })}
        </div>
        {participante.mostrarCreditosEnHoy && (
          <p className="me-resumen__fila me-resumen__fila--inicio">
            <Etiqueta variante="activo" grande nowrap>
              {T_HOY.resumen.nivel(progreso.nivel.nivel, progreso.nivel.nombre)}
            </Etiqueta>
            <span className="me-resumen__creditos">{T_HOY.resumen.creditos(progreso.creditos)}</span>
          </p>
        )}
      </section>

      <p className="voz me-estado__voz">{t.voz}</p>
      <p className="microcopia">{t.nota}</p>
    </div>
  );
}
