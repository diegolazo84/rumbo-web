// Vista previa · Semana: registro y revisión (plataforma 4.11, semana/?n=). El selector cambia
// de semana en la misma pantalla. Estados: sin-enviar, enviado, en-revision, publicada,
// pendiente, futura, semana-1 y cercano (Martín: «Resumen de tu videollamada» de la semana 1).
// El registro es opcional; el borrador se guarda en este dispositivo. Con acompañamiento: la
// revisión es escrita, en el día acordado; en Acompañamiento cercano, una videollamada.
//
// Textos y estructura exactos de Diego (21-oct-2026): «Así fue tu semana» · «Semana X de 4»;
// primero «Lo que vimos juntos» (la revisión publicada, con «Leer revisión completa» si es
// extensa), luego «Lo que compartiste» (el registro) y «Tus avances de esta semana».
import { useEffect, useId, useState, type ReactNode } from "react";
import Etiqueta from "../../../components/Etiqueta";
import { BarraProgreso, Icono, Segmentado } from "../../../components/app";
import { AvisoAyuda, CampoArea, Formulario } from "../../../components/form";
import {
  ESCENARIO_CERCANO,
  ESCENARIO_COACH,
  HOY,
  calcularProgreso,
  cuentaComoHecha,
  type Carga,
  type Escenario,
  type Ocurrencia,
  type RegistroSemanal,
} from "../../../data/ejemplo-app";
import { REGISTRO_SEMANAL } from "../../../data/formularios";
import { diaCorto, type Iso } from "../../../lib/fechas";
import { colorDeMeta } from "../../../lib/mi-rumbo";
import type { PropsPantalla } from "../registro";
import { AlertaGuardar, prepararLista, useEspacio } from "./comun";
import type { DatosRegistroSemanal } from "./espacio";
import { T_SEMANA } from "./textos";

type Situacion = "sin-enviar" | "enviado" | "en-revision" | "publicada" | "pendiente" | "futura" | "semana-1";
type Caso = { hoy: Iso; n: number; situacion: Situacion; esc?: Escenario };

// Caso de cada estado de la vista previa: lo usa también Mi acompañamiento (Acompanamiento.tsx)
// para que sus tarjetas y la semana muestren el mismo día y la misma persona.
export const ESCENARIOS: Record<string, Caso> = {
  "sin-enviar": { hoy: HOY, n: 2, situacion: "sin-enviar" },
  enviado: { hoy: HOY, n: 2, situacion: "enviado" },
  "en-revision": { hoy: "2026-10-15", n: 2, situacion: "en-revision" },
  publicada: { hoy: HOY, n: 1, situacion: "publicada" },
  // Viernes: el día de revisión ya pasó y la revisión todavía no se publica.
  pendiente: { hoy: "2026-10-16", n: 2, situacion: "pendiente" },
  futura: { hoy: HOY, n: 3, situacion: "futura" },
  "semana-1": { hoy: "2026-10-06", n: 1, situacion: "semana-1" },
  cercano: { hoy: HOY, n: 1, situacion: "publicada", esc: ESCENARIO_CERCANO },
};

// Registro de ejemplo de la semana 2 (estados «enviado», «en revisión» y «pendiente»).
const REGISTRO_S2: RegistroSemanal = {
  semana: 2,
  carga: "justa",
  funciono: "Volver a escribir temprano. Marqué casi todo lo de la mañana.",
  costo: "La pausa de la tarde: cuando me acuerdo ya es de noche.",
  cambiar: "",
  enviadoEl: HOY,
};

// Nota de cambios de la publicación de la semana 1 (la que respondió la solicitud de ajuste).
const CAMBIOS_S1 = "Dejamos “Revisar la agenda” a las 19:00, cuando ya saliste del trabajo.";

const VACIO = { carga: "" as Carga | "", funciono: "", costo: "", cambiar: "" };
const clave = (n: number) => `rumbo-previa-registro-${n}`;

export default function Semana(props: PropsPantalla) {
  const { real } = useEspacio();
  return real ? <SemanaReal /> : <SemanaPrevia {...props} />;
}

function SemanaPrevia({ estado = "sin-enviar" }: PropsPantalla) {
  const { semanaDelCiclo } = useEspacio();
  const e = ESCENARIOS[estado] ?? ESCENARIOS["sin-enviar"];
  const esc = e.esc ?? ESCENARIO_COACH;
  const actual = semanaDelCiclo(e.hoy);
  const [n, setN] = useState(e.n);

  // Situación de cada semana: la del escenario para su semana; las pasadas, según haya revisión.
  let situacion: Situacion;
  if (n === e.n) situacion = e.situacion;
  else if (n > actual) situacion = "futura";
  else if (esc.revisiones.some((r) => r.semana === n && r.publicadaEl)) situacion = "publicada";
  else situacion = n === actual ? "sin-enviar" : "pendiente";

  const inicial: RegistroSemanal | null =
    situacion === "publicada"
      ? (esc.registrosSemanales.find((r) => r.semana === n) ?? null)
      : esc.plan === "coach" && (situacion === "enviado" || situacion === "en-revision" || situacion === "pendiente")
        ? REGISTRO_S2
        : null;

  return (
    <MarcoSemana n={n} setN={setN} esc={esc}>
      {situacion === "futura" ? (
        <p className="me-calendario__vacio">{T_SEMANA.futura}</p>
      ) : (
        <ContenidoSemana
          key={`${estado}-${n}`}
          n={n}
          hoy={e.hoy}
          situacion={situacion}
          esc={esc}
          inicial={inicial}
          cambios={esc.plan === "cercano" ? null : CAMBIOS_S1}
        />
      )}
    </MarcoSemana>
  );
}

// Mi espacio real: la situación sale de la base (registro enviado, revisión iniciada o publicada).
function SemanaReal() {
  const { hoy, esc, ciclo, semanaDelCiclo, lunesDeSemana, fechaRevision, semanasEnRevision, notasCambios, servidor } = useEspacio();
  const actual = Math.min(Math.max(semanaDelCiclo(hoy), 1), ciclo.semanas);
  const [n, setN] = useState(actual);
  // ?n= después de hidratar (el HTML prerenderizado no conoce la búsqueda).
  useEffect(() => {
    const q = Number(new URLSearchParams(window.location.search).get("n"));
    if (Number.isInteger(q) && q >= 1 && q <= ciclo.semanas) setN(q);
  }, [ciclo.semanas]);
  const elegir = (v: number) => {
    setN(v);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("n", String(v));
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* sin historial */
    }
  };

  const registro = esc.registrosSemanales.find((r) => r.semana === n) ?? null;
  let situacion: Situacion;
  if (lunesDeSemana(n) > hoy) situacion = "futura";
  else if (esc.revisiones.some((r) => r.semana === n && r.publicadaEl)) situacion = "publicada";
  else if (semanasEnRevision.includes(n)) situacion = "en-revision";
  else if (fechaRevision(n) < hoy) situacion = "pendiente";
  else if (registro?.enviadoEl) situacion = "enviado";
  else if (n === 1) situacion = "semana-1";
  else situacion = "sin-enviar";

  // Bloque 4: notas de las versiones publicadas después de la revisión de esta semana.
  const desde = fechaRevision(n);
  const hasta = fechaRevision(n + 1);
  const cambios =
    notasCambios
      .filter((c) => c.version > 1 && c.nota && c.publicadoEl && c.publicadoEl >= desde && c.publicadoEl < hasta)
      .map((c) => c.nota)
      .join(" ") || null;

  const guardar = servidor ? (datos: DatosRegistroSemanal) => servidor.guardarRegistroSemanal(n, datos, true) : undefined;

  return (
    <MarcoSemana n={n} setN={elegir} esc={esc}>
      {situacion === "futura" ? (
        <p className="me-calendario__vacio">{T_SEMANA.futura}</p>
      ) : (
        <ContenidoSemana
          key={`${n}-${situacion}-${registro?.enviadoEl ?? ""}`}
          n={n}
          hoy={hoy}
          situacion={situacion}
          esc={esc}
          inicial={registro}
          cambios={cambios}
          guardar={guardar}
        />
      )}
    </MarcoSemana>
  );
}

// Selector de semanas y encabezado «Así fue tu semana» · «Semana X de 4». La fecha y la modalidad
// de la próxima revisión están una sola vez, en su tarjeta de Mi acompañamiento.
function MarcoSemana({ n, setN, children }: { n: number; setN: (n: number) => void; esc: Escenario; children: ReactNode }) {
  const { ciclo } = useEspacio();
  return (
    <div className="me-pantalla me-semana">
      <Segmentado
        leyenda={T_SEMANA.selector}
        name="semana"
        opciones={Array.from({ length: ciclo.semanas }, (_, i) => ({ valor: String(i + 1), texto: String(i + 1) }))}
        valor={String(n)}
        onCambio={(v) => setN(Number(v))}
        className="me-semana__selector"
      />
      <header className="me-semana__cabeza">
        <h2 className="me-semana__titulo">{T_SEMANA.asiFue}</h2>
        <p className="me-semana__subtitulo">{T_SEMANA.subtitulo(n, ciclo.semanas)}</p>
      </header>
      {children}
    </div>
  );
}

type PropsContenido = {
  n: number;
  hoy: Iso;
  situacion: Situacion;
  esc: Escenario;
  inicial: RegistroSemanal | null;
  cambios: string | null;
  guardar?: (datos: DatosRegistroSemanal) => Promise<void>; // Mi espacio real
};

// El hash abre lo que corresponde: #tu-registro (botón «Escribir mi registro» de arriba) abre el
// formulario si se puede escribir; #lo-que-vimos («Leer la revisión» del historial) despliega la
// revisión completa.
function useHash(objetivo: string, accion: () => void) {
  useEffect(() => {
    const revisar = () => {
      if (window.location.hash === objetivo) accion();
    };
    revisar();
    window.addEventListener("hashchange", revisar);
    return () => window.removeEventListener("hashchange", revisar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objetivo]);
}

function ContenidoSemana({ n, hoy, situacion, esc, inicial, cambios, guardar }: PropsContenido) {
  const [registro, setRegistro] = useState<RegistroSemanal | null>(inicial);
  const enviadoSinCerrar = situacion === "enviado";
  const puedeEscribir = situacion === "sin-enviar" || situacion === "semana-1" || enviadoSinCerrar;
  // Se escribe si se pidió (botón), si se está editando o si hay un borrador en este dispositivo.
  const [escribiendo, setEscribiendo] = useState(false);
  useEffect(() => {
    if (!puedeEscribir || inicial) return;
    try {
      if (localStorage.getItem(clave(n))) setEscribiendo(true);
    } catch {
      /* sin almacenamiento */
    }
  }, [n, puedeEscribir, inicial]);
  useHash("#tu-registro", () => {
    if (puedeEscribir && !registro?.enviadoEl) setEscribiendo(true);
  });
  const publicada = situacion === "publicada" && esc.revisiones.some((r) => r.semana === n && r.publicadaEl);
  const mostrarCompartiste = !!registro?.enviadoEl || puedeEscribir;

  return (
    <div className="me-semana__cuerpo" id={mostrarCompartiste ? undefined : "tu-registro"}>
      <div className="me-semana__principal">
        {publicada ? <LoQueVimos n={n} esc={esc} cambios={cambios} /> : <p className="me-semana__sin-revision">{T_SEMANA.sinRevision}</p>}

        {mostrarCompartiste && (
          <section id="tu-registro" className="tarjeta me-registro" aria-labelledby={`compartiste-${n}`}>
            <div className="me-registro__cabeza">
              <h3 id={`compartiste-${n}`} className="me-semana__h3">
                {T_SEMANA.compartiste}
              </h3>
              {registro?.enviadoEl && !escribiendo && enviadoSinCerrar && <Etiqueta variante="activo">{T_SEMANA.enviado(diaCorto(registro.enviadoEl))}</Etiqueta>}
            </div>
            {escribiendo ? (
              <FormularioRegistro
                n={n}
                inicial={registro}
                guardar={guardar}
                onEnviar={(r) => {
                  setRegistro({ ...r, semana: n, enviadoEl: hoy });
                  setEscribiendo(false);
                }}
              />
            ) : registro?.enviadoEl ? (
              <>
                <RegistroLeido r={registro} />
                {enviadoSinCerrar && (
                  <p>
                    <button type="button" className="boton boton--terciario me-boton-izq" onClick={() => setEscribiendo(true)}>
                      {T_SEMANA.editar}
                    </button>
                  </p>
                )}
              </>
            ) : (
              <>
                <p>{T_SEMANA.invitacion}</p>
                <p>
                  <button type="button" className="boton boton--secundario" onClick={() => {
                    setEscribiendo(true);
                    // Al abrir el formulario, el foco pasa a su primera pregunta.
                    setTimeout(() => document.querySelector<HTMLElement>("#tu-registro form :is(input, textarea)")?.focus(), 0);
                  }}>
                    <Icono nombre="pen-line" tamaño={20} />
                    {T_SEMANA.escribir}
                  </button>
                </p>
              </>
            )}
          </section>
        )}
      </div>

      <div className="me-semana__lado">
        <TusAvances n={n} hoy={hoy} esc={esc} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bloque 1 · «Tu registro» (todo opcional)

type PropsFormulario = {
  n: number;
  inicial: RegistroSemanal | null;
  guardar?: (datos: DatosRegistroSemanal) => Promise<void>;
  onEnviar: (r: Omit<RegistroSemanal, "semana" | "enviadoEl">) => void;
};

function FormularioRegistro({ n, inicial, guardar, onEnviar }: PropsFormulario) {
  const { R } = useEspacio();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(false);
  const [v, setV] = useState(() => (inicial ? { carga: inicial.carga ?? "", funciono: inicial.funciono, costo: inicial.costo, cambiar: inicial.cambiar } : VACIO));
  const [guardado, setGuardado] = useState(false);

  // Borrador en este dispositivo: se recupera después de hidratar (try/catch: puede no haber almacenamiento).
  useEffect(() => {
    if (inicial) return;
    try {
      const b = localStorage.getItem(clave(n));
      if (b) {
        setV({ ...VACIO, ...JSON.parse(b) });
        setGuardado(true);
      }
    } catch {
      /* sin almacenamiento: se empieza vacío */
    }
  }, [n, inicial]);

  const cambiar = (campo: keyof typeof VACIO, valor: string) => {
    const nuevo = { ...v, [campo]: valor };
    setV(nuevo);
    try {
      localStorage.setItem(clave(n), JSON.stringify(nuevo));
      setGuardado(true);
    } catch {
      /* sin almacenamiento */
    }
  };

  const texto = (campo: "funciono" | "costo" | "cambiar") => {
    const c = REGISTRO_SEMANAL[campo];
    return (
      <CampoArea
        id={`registro-${campo}`}
        etiqueta={c.etiqueta}
        ayuda={"ayuda" in c ? c.ayuda : undefined}
        opcional
        max={c.max}
        value={v[campo]}
        onChange={(e) => cambiar(campo, e.target.value)}
      />
    );
  };

  return (
    <Formulario
      largo
      className="me-registro__form"
      onSubmit={() => {
        if (enviando) return;
        const datos = { carga: (v.carga || null) as Carga | null, funciono: v.funciono, costo: v.costo, cambiar: v.cambiar };
        const listo = () => {
          try {
            localStorage.removeItem(clave(n));
          } catch {
            /* sin almacenamiento */
          }
          onEnviar(datos);
        };
        if (!guardar) return listo();
        setEnviando(true);
        setError(false);
        guardar(datos)
          .then(listo)
          .catch(() => setError(true))
          .finally(() => setEnviando(false));
      }}
    >
      <p className="me-bloque__bajada">{T_SEMANA.sinEnviar}</p>
      <Segmentado
        leyenda={`${REGISTRO_SEMANAL.carga.leyenda} (opcional)`}
        name={`carga-${n}`}
        opciones={REGISTRO_SEMANAL.carga.opciones}
        valor={v.carga}
        onCambio={(c) => cambiar("carga", c)}
      />
      {texto("funciono")}
      {texto("costo")}
      {texto("cambiar")}
      {guardar && <AlertaGuardar texto={error ? REGISTRO_SEMANAL.errorEnvio : null} />}
      <div className="me-registro__envio">
        <button type="submit" className="boton boton--primario" aria-disabled={enviando || undefined}>
          {REGISTRO_SEMANAL.boton}
        </button>
        <p className="microcopia" role="status">
          {guardado ? (
            <>
              <Icono nombre="check" tamaño={16} className="me-icono-guardado" />
              {REGISTRO_SEMANAL.borrador}
            </>
          ) : (
            ""
          )}
        </p>
      </div>
      <AvisoAyuda variante="revision" href={R.ayuda} />
    </Formulario>
  );
}

function RegistroLeido({ r }: { r: RegistroSemanal }) {
  const carga = REGISTRO_SEMANAL.carga.opciones.find((o) => o.valor === r.carga)?.texto;
  const filas = [
    { etiqueta: REGISTRO_SEMANAL.carga.leyenda, valor: carga },
    { etiqueta: REGISTRO_SEMANAL.funciono.etiqueta, valor: r.funciono },
    { etiqueta: REGISTRO_SEMANAL.costo.etiqueta, valor: r.costo },
    { etiqueta: REGISTRO_SEMANAL.cambiar.etiqueta, valor: r.cambiar },
  ].filter((f) => f.valor);
  return (
    <dl className="me-leido">
      {filas.map((f) => (
        <div key={f.etiqueta}>
          <dt>{f.etiqueta}</dt>
          <dd>{f.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---------------------------------------------------------------------------
// Bloque 2 · «Tus avances de esta semana» (automático): por meta, hasta hoy, con el color de cada
// meta (el mismo de Mi Rumbo) y los días completos.

function TusAvances({ n, hoy, esc }: { n: number; hoy: Iso; esc: Escenario }) {
  const { ciclo, semanaDelCiclo, real, progreso: delServidor } = useEspacio();
  const lista = prepararLista({}, hoy, esc.ocurrencias);
  const progreso = (real && delServidor) || calcularProgreso(lista, hoy, ciclo.inicio);
  const de = (o: Ocurrencia) => o.semana === n && o.vigente && o.fecha <= hoy;
  const completos = progreso.dias.filter((d) => semanaDelCiclo(d.fecha) === n && d.estado === "completo").length;
  const ids = esc.metas.map((m) => m.id);
  return (
    <section className="me-bloque me-marcaste" aria-labelledby={`marcaste-${n}`}>
      <h3 id={`marcaste-${n}`} className="me-semana__h3">
        {T_SEMANA.avances}
      </h3>
      <ul className="me-marcaste__lista">
        {esc.metas.map((m) => {
          const l = lista.filter((o) => o.metaId === m.id && de(o));
          if (!l.length) return null;
          const hechas = l.filter((o) => cuentaComoHecha(o.registro)).length;
          return (
            <li key={m.id} data-meta-color={colorDeMeta(ids, m.id)}>
              <span className="me-marcaste__meta">{m.titulo}</span>
              <BarraProgreso valor={hechas} maximo={l.length} cat={m.categoria} etiqueta={m.titulo} textoValor={T_SEMANA.deMeta(hechas, l.length)} />
              <span className="me-marcaste__dato">{T_SEMANA.deMeta(hechas, l.length)}</span>
            </li>
          );
        })}
      </ul>
      <p className="microcopia">{T_SEMANA.diasCompletos(completos)}</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Bloques 3 y 4 · «Lo que vimos juntos»: la revisión publicada en tres apartados (sin inventar
// los que vengan vacíos). Los cambios en el programa van en «Lo que podemos ajustar». Si es
// extensa, primero un resumen (cada apartado recortado a pocas líneas) y «Leer revisión completa».

const LARGO_APARTADO = 220;
const LARGO_TOTAL = 480;

function LoQueVimos({ n, esc, cambios }: { n: number; esc: Escenario; cambios: string | null }) {
  const r = esc.revisiones.find((x) => x.semana === n && x.publicadaEl);
  const [completa, setCompleta] = useState(false);
  const idCuerpo = useId();
  useHash("#lo-que-vimos", () => setCompleta(true));
  if (!r?.publicadaEl) return null;
  const cercano = esc.plan === "cercano";
  const ajuste = [r.ajustamos, cambios ? `${T_SEMANA.cambiosPrograma} ${cambios}` : ""].filter(Boolean);
  const apartados = [
    { id: "funciono", titulo: T_SEMANA.loQueFunciono, textos: r.funciono ? [r.funciono] : [] },
    { id: "ajustar", titulo: T_SEMANA.podemosAjustar, textos: ajuste },
    { id: "foco", titulo: T_SEMANA.focoProxima, textos: r.foco ? [r.foco] : [], voz: true },
  ].filter((a) => a.textos.length);
  const largos = apartados.map((a) => a.textos.join(" ").length);
  const extensa = largos.some((l) => l > LARGO_APARTADO) || largos.reduce((x, y) => x + y, 0) > LARGO_TOTAL;
  const resumen = extensa && !completa;
  return (
    <section id="lo-que-vimos" className="tarjeta me-vimos" aria-labelledby={`vimos-${n}`}>
      <div className="me-vimos__cabeza">
        <span className="icono-mosaico" aria-hidden="true">
          <Icono nombre="message-circle" tamaño={22} />
        </span>
        <div>
          <h3 id={`vimos-${n}`} className="me-semana__h3">
            {T_SEMANA.vimos}
          </h3>
          <p className="microcopia">{cercano ? T_SEMANA.videollamadaDel(diaCorto(r.publicadaEl)) : T_SEMANA.publicadaEl(diaCorto(r.publicadaEl))}</p>
        </div>
      </div>
      <div id={idCuerpo} className={resumen ? "me-vimos__cuerpo es-resumen" : "me-vimos__cuerpo"}>
        {apartados.map((a) => (
          <div key={a.id} className="me-vimos__parte">
            <h4>{a.titulo}</h4>
            {a.textos.map((t) =>
              a.voz ? (
                <p key={t} className="voz">
                  <q>{t}</q>
                </p>
              ) : (
                <p key={t}>{t}</p>
              ),
            )}
          </div>
        ))}
      </div>
      {extensa && (
        <p>
          <button type="button" className="boton boton--terciario me-boton-izq" aria-expanded={completa} aria-controls={idCuerpo} onClick={() => setCompleta((v) => !v)}>
            {completa ? T_SEMANA.verMenos : T_SEMANA.leerCompleta}
          </button>
        </p>
      )}
    </section>
  );
}
