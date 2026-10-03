// Vista previa · Pedir un ajuste (plataforma 4.13) y «Tus solicitudes de ajuste».
// Estados: formulario (Con acompañamiento, Camila), cercano (Acompañamiento cercano, Martín, con
// 1 reordenamiento disponible), cercano-sin-reordenamientos y enviado (confirmación). Si se llega desde una acción
// (?accion=), queda preseleccionada; con ?tipo=antes, el tipo «Antes de empezar».
// El plazo sale del plan y de la base, nunca escrito a mano.
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Aviso } from "../../../components/Bloques";
import Etiqueta from "../../../components/Etiqueta";
import { Icono } from "../../../components/app";
import {
  AvisoAyuda,
  CampoArea,
  CampoTexto,
  Casilla,
  Formulario,
  GrupoOpciones,
  NoEsChat,
  Opcion,
  ResumenErrores,
  useFormulario,
  type ErrorResumen,
} from "../../../components/form";
import {
  ESCENARIO_CERCANO,
  ESCENARIO_COACH,
  HOY,
  ciclo,
  fechaRevision,
  ocurrenciasDel,
  semanaDelCiclo,
  type Escenario,
  type SolicitudAjuste,
} from "../../../data/ejemplo-app";
import { AJUSTE, LIMITES } from "../../../data/formularios";
import { diaCorto, mayuscula, sumarDias, type Iso } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { Cabeza, R } from "./comun";
import { T_AJUSTE, T_ANTERIORES } from "./textos";

type Datos = { tipo: string; detalle: string };

const validar = (d: Datos) => {
  const e: Partial<Record<keyof Datos, string>> = {};
  if (!d.tipo) e.tipo = T_AJUSTE.errores.tipo;
  if (d.detalle.trim().length < LIMITES.detalleAjuste.min) e.detalle = T_AJUSTE.errores.detalle;
  return e;
};
const idDe = (c: keyof Datos & string) => (c === "tipo" ? "ajuste-tipo" : "ajuste-detalle");

// Próxima revisión semanal (hoy incluido) o, en cercano, la próxima videollamada después de hoy.
function proximaRevision(hoy: Iso, esc: Escenario) {
  const pasada = (f: Iso) => (esc.plan === "cercano" ? f <= hoy : f < hoy);
  let n = semanaDelCiclo(hoy);
  if (pasada(fechaRevision(n, esc.diaRevision))) n += 1;
  return fechaRevision(n, esc.diaRevision);
}

const textoTipo = (v: string) => AJUSTE.tipo.opciones.find((o) => o.valor === v)?.texto ?? v;

// Solicitud de ejemplo del estado «enviado».
const ENVIADA_EJEMPLO: SolicitudAjuste = {
  id: "s9",
  tipo: "carga",
  acciones: [],
  desde: HOY,
  detalle: "Esta semana tengo pruebas y no alcanzo todo.",
  enviadaEl: HOY,
  estado: "enviada",
  respuesta: null,
};

const ESCENARIOS: Record<string, Escenario> = {
  cercano: ESCENARIO_CERCANO,
  "cercano-sin-reordenamientos": { ...ESCENARIO_CERCANO, reordenamientosUsados: ciclo.reordenamientosMax },
};

export default function Ajuste({ estado = "formulario" }: PropsPantalla) {
  const esc = ESCENARIOS[estado] ?? ESCENARIO_COACH;
  const [enviadas, setEnviadas] = useState<SolicitudAjuste[]>(estado === "enviado" ? [ENVIADA_EJEMPLO] : []);
  const [confirmada, setConfirmada] = useState(estado === "enviado");

  return (
    <div className="me-pantalla me-pantalla--angosta me-ajuste">
      {confirmada ? (
        <Confirmacion esc={esc} />
      ) : (
        <FormularioAjuste
          esc={esc}
          onEnviar={(s) => {
            setEnviadas((l) => [s, ...l]);
            setConfirmada(true);
            requestAnimationFrame(() => {
              window.scrollTo({ top: 0 });
              document.querySelector<HTMLElement>("main h1")?.focus();
            });
          }}
        />
      )}
      <ListaSolicitudes lista={[...enviadas, ...esc.solicitudesAjuste]} />
    </div>
  );
}

function Plazo({ esc, tipo, reordenar, onReordenar }: { esc: Escenario; tipo?: string; reordenar?: boolean; onReordenar?: (v: boolean) => void }) {
  const fecha = diaCorto(proximaRevision(HOY, esc));
  const quedan = Math.max(0, ciclo.reordenamientosMax - esc.reordenamientosUsados);
  const plan = esc.plan;
  return (
    <div className="me-plazo">
      <Aviso icono="info">
        {plan === "coach" ? (
          <p>
            {T_AJUSTE.plazoCoach.antes}
            <strong>{fecha}</strong>
            {T_AJUSTE.plazoCoach.despues}
          </p>
        ) : quedan === 0 ? (
          <p>
            {T_AJUSTE.sinReordenamientos.antes}
            {fecha}
            {T_AJUSTE.sinReordenamientos.despues}
          </p>
        ) : (
          <p>
            {T_AJUSTE.plazoCercano(quedan).antes}
            <strong>{T_AJUSTE.plazoCercano(quedan).dato}</strong>
            {T_AJUSTE.plazoCercano(quedan).despues}
          </p>
        )}
        {tipo === "pausa" && <p>{T_AJUSTE.plazoPausa}</p>}
      </Aviso>
      {plan === "cercano" && quedan > 0 && onReordenar && (
        <Casilla id="ajuste-reordenar" opcional checked={!!reordenar} onChange={(e) => onReordenar(e.target.checked)}>
          {AJUSTE.reordenar}
        </Casilla>
      )}
    </div>
  );
}

function FormularioAjuste({ esc, onEnviar }: { esc: Escenario; onEnviar: (s: SolicitudAjuste) => void }) {
  const ocurrencias = esc.ocurrencias;
  const f = useFormulario<Datos>({ tipo: "", detalle: "" }, validar, idDe);
  const [resumen, setResumen] = useState<ErrorResumen[]>([]);
  const [acciones, setAcciones] = useState<string[]>([]);
  const [desde, setDesde] = useState<Iso>(HOY);
  const [reordenar, setReordenar] = useState(false);
  const [todosLosDias, setTodosLosDias] = useState(false);
  const { search } = useLocation();

  // Preselección desde una acción o desde «Antes de empezar» (después de hidratar).
  useEffect(() => {
    const q = new URLSearchParams(search);
    const accion = q.get("accion");
    if (accion && ocurrencias.some((o) => o.id === accion && o.fecha >= HOY)) setAcciones([accion]);
    const tipo = q.get("tipo");
    if (tipo && AJUSTE.tipo.opciones.some((o) => o.valor === tipo)) f.cambiar("tipo", tipo);
  }, [search]);

  // Próximos 14 días con acciones, agrupadas por día.
  const dias = Array.from({ length: AJUSTE.acciones.diasAdelante }, (_, i) => sumarDias(HOY, i))
    .map((d) => ({ d, l: ocurrenciasDel(d, ocurrencias) }))
    .filter((x) => x.l.length);
  // Se ven los próximos 7 días; «Ver las {n}» muestra los 14 (una lista larga cansa en el teléfono).
  const total = dias.reduce((n, x) => n + x.l.length, 0);
  const visibles = todosLosDias || acciones.some((a) => (ocurrencias.find((o) => o.id === a)?.fecha ?? "") >= sumarDias(HOY, 7)) ? dias : dias.filter((x) => x.d < sumarDias(HOY, 7));
  const tipoDesdeUrl = f.valores.tipo === "antes";
  const opciones = AJUSTE.tipo.opciones.filter((o) => !("soloPreparacion" in o) || tipoDesdeUrl);

  return (
    <>
      <Cabeza ojo={T_AJUSTE.ojo} titulo={T_AJUSTE.titulo} bajada={T_AJUSTE.bajada} />
      <Formulario
        largo
        onSubmit={() => {
          const errores = f.enviar();
          setResumen(errores);
          if (errores.length) {
            requestAnimationFrame(() => document.getElementById("resumen-errores")?.focus());
            return;
          }
          onEnviar({
            id: `nueva-${Date.now()}`,
            tipo: f.valores.tipo,
            acciones,
            desde,
            detalle: f.valores.detalle.trim(),
            enviadaEl: HOY,
            estado: "enviada",
            respuesta: null,
          });
        }}
      >
        <ResumenErrores errores={resumen} />
        <GrupoOpciones id="ajuste-tipo" leyenda={<span className="sr-only">{T_AJUSTE.titulo}</span>} error={f.errores.tipo} columnas={2}>
          {opciones.map((o) => (
            <Opcion
              key={o.valor}
              name="ajuste-tipo"
              value={o.valor}
              titulo={o.texto}
              checked={f.valores.tipo === o.valor}
              onChange={() => f.cambiar("tipo", o.valor)}
            />
          ))}
        </GrupoOpciones>

        <fieldset className="grupo-opciones me-acciones-ajuste">
          <legend className="campo__etiqueta">
            {AJUSTE.acciones.etiqueta}
            <span className="campo__opcional"> (opcional)</span>
          </legend>
          {visibles.map(({ d, l }) => (
            <div key={d} className="me-acciones-ajuste__dia" role="group" aria-labelledby={`aj-${d}`}>
              <p id={`aj-${d}`} className="me-grupo__titulo">
                {mayuscula(diaCorto(d))}
              </p>
              {l.map((o) => (
                <label key={o.id} className="casilla me-acciones-ajuste__fila" data-cat={o.categoria}>
                  <input
                    type="checkbox"
                    name="ajuste-acciones"
                    value={o.id}
                    checked={acciones.includes(o.id)}
                    onChange={(e) => setAcciones((a) => (e.target.checked ? [...a, o.id] : a.filter((x) => x !== o.id)))}
                  />
                  <span>
                    <span className="me-acciones-ajuste__hora">{o.hora ?? "Flexible"}</span> {o.titulo}
                  </span>
                </label>
              ))}
            </div>
          ))}
          {visibles.length < dias.length && (
            <p>
              <button type="button" className="boton boton--terciario me-boton-izq" onClick={() => setTodosLosDias(true)}>
                {T_ANTERIORES.verLas(total)}
              </button>
            </p>
          )}
        </fieldset>

        <CampoTexto
          id="ajuste-desde"
          etiqueta={AJUSTE.desde.etiqueta}
          type="date"
          min={HOY}
          value={desde}
          onChange={(e) => setDesde(e.target.value || HOY)}
          className="me-campo-fecha"
        />

        <CampoArea
          id="ajuste-detalle"
          etiqueta={AJUSTE.detalle.etiqueta}
          ayuda={AJUSTE.detalle.ayuda}
          min={AJUSTE.detalle.min}
          max={AJUSTE.detalle.max}
          value={f.valores.detalle}
          error={f.errores.detalle}
          onChange={(e) => f.cambiar("detalle", e.target.value)}
          onBlur={() => f.salir("detalle")}
          pie={<AvisoAyuda href={R.ayuda} />}
        />

        <Plazo esc={esc} tipo={f.valores.tipo} reordenar={reordenar} onReordenar={setReordenar} />

        <div className="me-envio">
          <button type="submit" className="boton boton--primario">
            {AJUSTE.boton}
          </button>
          <NoEsChat />
        </div>
      </Formulario>
    </>
  );
}

function Confirmacion({ esc }: { esc: Escenario }) {
  return (
    <div className="me-confirmacion">
      <Cabeza
        ojo={T_AJUSTE.ojo}
        titulo={T_AJUSTE.confirmacion.titulo}
        antes={
          <span className="icono-mosaico me-confirmacion__icono" aria-hidden="true">
            <Icono nombre="check" tamaño={22} />
          </span>
        }
      />
      <Plazo esc={esc} />
      <p>{T_AJUSTE.confirmacion.texto}</p>
      <div className="acciones">
        <Link to={R.hoy} className="boton boton--secundario">
          {T_AJUSTE.confirmacion.volver}
        </Link>
        <a href="#tus-solicitudes" className="boton boton--terciario">
          {T_AJUSTE.confirmacion.ver}
        </a>
      </div>
    </div>
  );
}

const ETIQUETA_ESTADO: Record<SolicitudAjuste["estado"], { texto: string; variante: "nota" | "activo" }> = {
  enviada: { texto: T_AJUSTE.lista.enviada, variante: "nota" },
  en_revision: { texto: T_AJUSTE.lista.enRevision, variante: "nota" },
  respondida: { texto: T_AJUSTE.lista.respondida, variante: "activo" },
  sin_cambios: { texto: T_AJUSTE.lista.sinCambios, variante: "nota" },
};

function ListaSolicitudes({ lista }: { lista: SolicitudAjuste[] }) {
  return (
    <section id="tus-solicitudes" className="me-bloque me-solicitudes" aria-labelledby="tus-solicitudes-titulo">
      <h2 id="tus-solicitudes-titulo" className="me-h2">
        {T_AJUSTE.lista.titulo}
      </h2>
      {lista.length ? (
        <ul className="me-solicitudes__lista">
          {lista.map((s) => {
            const e = ETIQUETA_ESTADO[s.estado];
            return (
              <li key={s.id} className="tarjeta me-solicitud">
                <div className="me-solicitud__cabeza">
                  <h3 className="me-solicitud__tipo">{textoTipo(s.tipo)}</h3>
                  <Etiqueta variante={e.variante}>{e.texto}</Etiqueta>
                </div>
                <p className="microcopia">
                  {T_AJUSTE.lista.enviadaEl(diaCorto(s.enviadaEl))} · {T_AJUSTE.lista.desde(diaCorto(s.desde))}
                </p>
                <p className="me-solicitud__detalle">{s.detalle}</p>
                {s.respuesta && (
                  <div className="me-solicitud__respuesta">
                    <p className="me-rotulo">{ETIQUETA_RESPUESTA}</p>
                    <p>{s.respuesta}</p>
                  </div>
                )}
                {s.estado === "respondida" && (
                  <Link to={R.calendario} className="enlace-flecha">
                    {T_AJUSTE.lista.verCambios}
                    <Icono nombre="arrow-right" tamaño={16} />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="me-bloque__bajada">{T_AJUSTE.lista.vacio}</p>
      )}
    </section>
  );
}

// Rótulo de la respuesta: «Respuesta de tu coach» (glosario 1.4).
const ETIQUETA_RESPUESTA = "Respuesta de tu coach";
