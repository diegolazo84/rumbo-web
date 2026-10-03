// Vista previa · Semana: registro y revisión (plataforma 4.11, semana/?n=). El selector cambia
// de semana en la misma pantalla. Estados: sin-enviar, enviado, en-revision, publicada,
// pendiente, futura, semana-1 y cercano (Martín: «Resumen de tu videollamada» de la semana 1).
// El registro es opcional; el borrador se guarda en este dispositivo. Con acompañamiento: la
// revisión es escrita, en el día acordado; en Acompañamiento cercano, una videollamada.
import { useEffect, useState } from "react";
import { Aviso } from "../../../components/Bloques";
import Etiqueta from "../../../components/Etiqueta";
import { Icono, Segmentado } from "../../../components/app";
import { AvisoAyuda, CampoArea, Formulario, NoEsChat } from "../../../components/form";
import {
  ESCENARIO_CERCANO,
  ESCENARIO_COACH,
  HOY,
  calcularProgreso,
  ciclo,
  cuentaComoHecha,
  fechaRevision,
  semanaDelCiclo,
  type Carga,
  type Escenario,
  type Ocurrencia,
  type RegistroSemanal,
} from "../../../data/ejemplo-app";
import { REGISTRO_SEMANAL } from "../../../data/formularios";
import { diaCorto, type Iso } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { Cabeza, R, prepararLista } from "./comun";
import { T_SEMANA } from "./textos";

type Situacion = "sin-enviar" | "enviado" | "en-revision" | "publicada" | "pendiente" | "futura" | "semana-1";
type Caso = { hoy: Iso; n: number; situacion: Situacion; esc?: Escenario };

const ESCENARIOS: Record<string, Caso> = {
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

export default function Semana({ estado = "sin-enviar" }: PropsPantalla) {
  const e = ESCENARIOS[estado] ?? ESCENARIOS["sin-enviar"];
  const esc = e.esc ?? ESCENARIO_COACH;
  const cercano = esc.plan === "cercano";
  const actual = semanaDelCiclo(e.hoy);
  const [n, setN] = useState(e.n);

  // Situación de cada semana: la del escenario para su semana; las pasadas, según haya revisión.
  let situacion: Situacion;
  if (n === e.n) situacion = e.situacion;
  else if (n > actual) situacion = "futura";
  else if (esc.revisiones.some((r) => r.semana === n && r.publicadaEl)) situacion = "publicada";
  else situacion = n === actual ? "sin-enviar" : "pendiente";

  const fecha = fechaRevision(n, esc.diaRevision);
  const bajada = cercano ? T_SEMANA.bajadaCercano : T_SEMANA.bajadaCoach;

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

      <Cabeza
        ojo={T_SEMANA.ojo}
        titulo={T_SEMANA.titulo(n, ciclo.semanas)}
        bajada={
          <p>
            {bajada.antes}
            <strong>
              {diaCorto(fecha)}
              {cercano && ` a las ${esc.horaVideollamada}`}
            </strong>
            {bajada.despues}
          </p>
        }
      />

      {situacion === "futura" ? (
        <p className="me-calendario__vacio">{T_SEMANA.futura}</p>
      ) : (
        <ContenidoSemana key={`${estado}-${n}`} n={n} hoy={e.hoy} situacion={situacion} esc={esc} />
      )}
    </div>
  );
}

function ContenidoSemana({ n, hoy, situacion, esc }: { n: number; hoy: Iso; situacion: Situacion; esc: Escenario }) {
  const inicial: RegistroSemanal | null =
    situacion === "publicada"
      ? (esc.registrosSemanales.find((r) => r.semana === n) ?? null)
      : esc.plan === "coach" && (situacion === "enviado" || situacion === "en-revision" || situacion === "pendiente")
        ? REGISTRO_S2
        : null;
  const [registro, setRegistro] = useState<RegistroSemanal | null>(inicial);
  const [editando, setEditando] = useState(false);
  const fecha = fechaRevision(n, esc.diaRevision);
  const abierto = situacion === "sin-enviar" || situacion === "semana-1" || ((situacion === "enviado") && (editando || !registro?.enviadoEl));
  const cerrado = situacion === "en-revision" || situacion === "publicada" || situacion === "pendiente";

  return (
    <div className="me-semana__cuerpo">
      <div className="me-semana__principal">
      {/* Publicada: lo nuevo (respuesta y cambios) va primero; el registro queda cerrado debajo. */}
      {situacion === "publicada" && <Respuesta n={n} esc={esc} />}
      <section className="tarjeta me-registro" aria-labelledby="registro-titulo">
        <div className="me-registro__cabeza">
          <h2 id="registro-titulo" className="me-h2">
            {T_SEMANA.registro}
          </h2>
          {registro?.enviadoEl && !abierto && situacion === "enviado" && (
            <Etiqueta variante="activo">{T_SEMANA.enviado(diaCorto(registro.enviadoEl))}</Etiqueta>
          )}
          {situacion === "en-revision" && <Etiqueta variante="nota">{T_SEMANA.enRevision}</Etiqueta>}
        </div>

        {situacion === "semana-1" && <p className="me-bloque__bajada">{T_SEMANA.semana1(diaCorto(fecha))}</p>}
        {situacion === "en-revision" && <p>{T_SEMANA.llega(diaCorto(fecha))}</p>}
        {situacion === "pendiente" && <p>{T_SEMANA.pendiente}</p>}

        {abierto ? (
          <FormularioRegistro
            n={n}
            inicial={registro}
            onEnviar={(r) => {
              setRegistro({ ...r, semana: n, enviadoEl: hoy });
              setEditando(false);
            }}
          />
        ) : registro ? (
          <>
            <RegistroLeido r={registro} />
            {situacion === "enviado" && !cerrado && (
              <p>
                <button type="button" className="boton boton--terciario me-boton-izq" onClick={() => setEditando(true)}>
                  {T_SEMANA.editar}
                </button>
              </p>
            )}
          </>
        ) : null}
      </section>
      </div>

      <div className="me-semana__lado">
        <LoQueMarcaste n={n} hoy={hoy} esc={esc} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bloque 1 · «Tu registro» (todo opcional)

function FormularioRegistro({ n, inicial, onEnviar }: { n: number; inicial: RegistroSemanal | null; onEnviar: (r: Omit<RegistroSemanal, "semana" | "enviadoEl">) => void }) {
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
        try {
          localStorage.removeItem(clave(n));
        } catch {
          /* sin almacenamiento */
        }
        onEnviar({ carga: (v.carga || null) as Carga | null, funciono: v.funciono, costo: v.costo, cambiar: v.cambiar });
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
      <div className="me-registro__envio">
        <button type="submit" className="boton boton--primario">
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
      <NoEsChat />
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
// Bloque 2 · «Lo que marcaste» (automático): por meta, hasta hoy.

function LoQueMarcaste({ n, hoy, esc }: { n: number; hoy: Iso; esc: Escenario }) {
  const lista = prepararLista({}, hoy, esc.ocurrencias);
  const progreso = calcularProgreso(lista, hoy);
  const de = (o: Ocurrencia) => o.semana === n && o.vigente && o.fecha <= hoy;
  const completos = progreso.dias.filter((d) => semanaDelCiclo(d.fecha) === n && d.estado === "completo").length;
  return (
    <section className="me-bloque me-marcaste" aria-labelledby={`marcaste-${n}`}>
      <h2 id={`marcaste-${n}`} className="me-h2">
        {T_SEMANA.marcaste}
      </h2>
      <ul className="me-marcaste__lista">
        {esc.metas.map((m) => {
          const l = lista.filter((o) => o.metaId === m.id && de(o));
          if (!l.length) return null;
          return (
            <li key={m.id} data-cat={m.categoria}>
              <span className="me-marcaste__meta">{m.titulo}</span>
              <span className="me-marcaste__dato">{T_SEMANA.deMeta(l.filter((o) => cuentaComoHecha(o.registro)).length, l.length)}</span>
            </li>
          );
        })}
      </ul>
      <p className="microcopia">{T_SEMANA.diasCompletos(completos)}</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Bloques 3 y 4 · respuesta de tu coach y cambios en tu programa

function Respuesta({ n, esc }: { n: number; esc: Escenario }) {
  const r = esc.revisiones.find((x) => x.semana === n && x.publicadaEl);
  const cercano = esc.plan === "cercano";
  if (!r?.publicadaEl) return null;
  return (
    <>
      <section className="tarjeta me-respuesta" aria-labelledby={`respuesta-${n}`}>
        <div className="me-respuesta__cabeza">
          <span className="icono-mosaico">
            <Icono nombre="message-circle" tamaño={22} />
          </span>
          <div>
            <h2 id={`respuesta-${n}`} className="me-rotulo me-respuesta__rotulo">
              {cercano ? T_SEMANA.resumenVideollamada : T_SEMANA.respuesta}
            </h2>
            <p className="microcopia">{diaCorto(r.publicadaEl)}</p>
          </div>
        </div>
        <div className="me-respuesta__parte">
          <h3>{T_SEMANA.funciono}</h3>
          <p>{r.funciono}</p>
        </div>
        <div className="me-respuesta__parte">
          <h3>{T_SEMANA.ajustamos}</h3>
          <p>{r.ajustamos}</p>
        </div>
        <div className="me-respuesta__parte">
          <h3>{T_SEMANA.foco(n + 1)}</h3>
          <p className="voz">
            <q>{r.foco}</q>
          </p>
        </div>
      </section>
      {/* Cambios en el programa: solo si la publicación los trae (la de Martín no cambió nada). */}
      {!cercano && (
        <section aria-labelledby={`cambios-${n}`}>
          <Aviso icono="info" titulo={<span id={`cambios-${n}`}>{T_SEMANA.cambios}</span>}>
            {CAMBIOS_S1}
          </Aviso>
        </section>
      )}
    </>
  );
}
