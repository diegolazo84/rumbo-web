// Vista previa · estado de la solicitud (/estado/#token, plataforma 3.14) en cada estado: carga
// (sin enlace, buscando, no encontrada, error de red), cada estado de la base con su etiqueta,
// H1, texto y línea de tiempo, «Lo que nos contaste», aceptar el acuerdo y retirar (diálogo
// modal). Las acciones se simulan sin red: aceptar lleva a «Aceptaste tu acuerdo», retirar a
// «Retiraste tu solicitud» e «Intentar de nuevo» a «Recibimos tu solicitud».
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ListaCheck } from "../../../components/Bloques";
import Etiqueta from "../../../components/Etiqueta";
import { AvisoAyuda, Casilla, Envio, Formulario } from "../../../components/form";
import { Icono } from "../../../components/app";
import { ACEPTAR_ACUERDO, POSTULAR, RETIRAR, estadosEnvio, nombreCoach } from "../../../data/formularios";
import { areas, notaPrecio, operacion, planes, type VarianteEtiqueta } from "../../../data/rumbo";
import { diaMes, fechaLarga } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { RUTAS_PUBLICAS } from "../rutas";
import {
  AsideAyuda,
  Dialogo,
  EtiquetaEjemplo,
  LineaTiempo,
  PaginaConAside,
  useFocoAlTitulo,
  type EstadoPaso,
  type PasoLinea,
} from "./comunes";
import { SOLICITUD, fechaHora, nombreApoyo, plazoDe } from "./ejemplo";
import { ESTADO } from "./textos";

type Estado =
  | "sin-token"
  | "cargando"
  | "no-encontrada"
  | "error-red"
  | "recibida"
  | "en-revision"
  | "con-atraso"
  | "respondida"
  | "acordada"
  | "acordada-sin-detalles"
  | "acuerdo-aceptado"
  | "con-espacio"
  | "cerrada-capacidad"
  | "cerrada-con-nota"
  | "cerrada-alcance"
  | "cerrada-sin-respuesta"
  | "retirada"
  | "interes-recibida"
  | "interes-cerrada";

const RETIRABLES: Estado[] = ["recibida", "en-revision", "con-atraso", "respondida", "acordada", "acordada-sin-detalles", "acuerdo-aceptado"];
const VERSION_CONDICIONES = "1.0"; // Condiciones del piloto publicadas (Condiciones.tsx)
const CONTACTO_SOLICITUD = `${RUTAS_PUBLICAS.contacto}?motivo=solicitud`;
const SIMULACION_MS = 1200;

// Línea de tiempo según el estado (3.14).
function pasosDe(e: Estado): PasoLinea[] {
  if (e === "retirada")
    return [
      { titulo: ESTADO.pasos[0], estado: "completo" },
      { titulo: ESTADO.pasoRetirada, estado: "completo" },
    ];
  if (e.startsWith("cerrada"))
    return [...ESTADO.pasos.slice(0, 3), ESTADO.pasoCerrada].map((titulo) => ({ titulo, estado: "completo" as const }));
  // Índice del paso actual (0 a 4).
  const actual: Partial<Record<Estado, number>> = {
    recibida: 1,
    "en-revision": 1,
    "con-atraso": 1,
    respondida: 3,
    acordada: 3,
    "acordada-sin-detalles": 3,
    "acuerdo-aceptado": 4,
    "con-espacio": 4,
  };
  const i = actual[e] ?? 1;
  return ESTADO.pasos.map((titulo, n) => ({
    titulo,
    estado: (n < i ? "completo" : n === i ? "actual" : "pendiente") as EstadoPaso,
  }));
}

function TarjetaContaste({ interes, enviada = SOLICITUD.enviada }: { interes?: boolean; enviada?: string }) {
  const area = areas.find((a) => a.id === (interes ? SOLICITUD.areaInteres : SOLICITUD.area))!;
  const t = ESTADO.tarjeta;
  const dias = SOLICITUD.dias.map((d) => d.toLowerCase()).join(" y ");
  const franjas = SOLICITUD.franjas.map((f) => POSTULAR.horarios.franjas.find((x) => x.valor === f)?.texto ?? f).join(", ");
  return (
    <section className="tarjeta vf-contaste" aria-labelledby="contaste-titulo">
      <div className="vf-tarjeta__cabeza">
        <h2 id="contaste-titulo" className="vf-tarjeta__titulo">
          {t.titulo}
        </h2>
        <EtiquetaEjemplo />
      </div>
      <dl className="vf-datos">
        <div>
          <dt>{t.area}</dt>
          <dd>
            {area.categoria ? (
              <Etiqueta variante="categoria" cat={area.categoria}>
                {area.nombre}
              </Etiqueta>
            ) : (
              area.nombre
            )}
          </dd>
        </div>
        {!interes && (
          <>
            <div>
              <dt>{t.apoyo}</dt>
              <dd>{nombreApoyo(SOLICITUD.apoyo)}</dd>
            </div>
            <div>
              <dt>{t.horarios}</dt>
              <dd>
                {dias.charAt(0).toUpperCase() + dias.slice(1)} · {franjas}
              </dd>
            </div>
          </>
        )}
        <div>
          <dt>{t.nombre}</dt>
          <dd>{SOLICITUD.nombre}</dd>
        </div>
        <div>
          <dt>{t.correo}</dt>
          <dd>{SOLICITUD.correoEnmascarado}</dd>
        </div>
        <div>
          <dt>{t.fecha}</dt>
          <dd>{fechaHora(enviada, SOLICITUD.hora)}</dd>
        </div>
      </dl>
      {!interes && (
        <details className="vf-meta">
          <summary>
            <span>{t.verMeta}</span>
            <Icono nombre="chevron-right" tamaño={16} className="vf-meta__icono" />
          </summary>
          <p>{SOLICITUD.meta}</p>
        </details>
      )}
    </section>
  );
}

// Bloque de aceptación del acuerdo (estado acordada).
function Acuerdo({ onAceptar }: { onAceptar: () => void }) {
  const plan = planes.find((p) => p.param === SOLICITUD.apoyo)!;
  const [marcada, setMarcada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const casilla = useRef<HTMLInputElement>(null);
  const temporizador = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(temporizador.current), []);
  const E = estadosEnvio("solicitud", ACEPTAR_ACUERDO.boton);
  const t = ESTADO.acuerdo;
  // Sin política de término o sin forma de pago el bloque no se muestra (3.14). En la vista
  // previa la forma de pago es la de ejemplo de rumbo.ts, rotulada «Ejemplo».
  const formaDePago = operacion.formaDePago ?? SOLICITUD.formaDePago;
  return (
    <section className="tarjeta tarjeta--producto vf-acuerdo" aria-labelledby="acuerdo-titulo">
      <div className="vf-tarjeta__cabeza">
        <h2 id="acuerdo-titulo" className="vf-tarjeta__titulo">
          {t.titulo}
        </h2>
        <EtiquetaEjemplo />
      </div>
      <p className="vf-acuerdo__plan">
        <strong>{plan.nombre}</strong>
        <Etiqueta variante="nota">{plan.rotulo}</Etiqueta>
      </p>
      <div>
        <p className="plan-precio">
          <span className="precio">{plan.precio}</span>
          <span className="plan-periodo">{plan.periodo}</span>
        </p>
        <p className="plan-nota">{notaPrecio()}</p>
      </div>
      <ListaCheck
        items={[
          t.ciclo(4, diaMes(SOLICITUD.inicioCiclo)),
          plan.param === "cercano" ? t.videollamada(SOLICITUD.diaRevision, "19:00") : t.revision(SOLICITUD.diaRevision),
          formaDePago,
        ]}
      />
      <p>
        <Link to="/condiciones/" className="vf-enlace-alto">
          {t.condiciones(VERSION_CONDICIONES)}
        </Link>
      </p>
      <Formulario
        onSubmit={() => {
          if (enviando) return;
          if (!marcada) {
            setError(ACEPTAR_ACUERDO.error);
            casilla.current?.focus();
            return;
          }
          setEnviando(true);
          temporizador.current = window.setTimeout(onAceptar, SIMULACION_MS);
        }}
        enviando={enviando}
      >
        <Casilla
          id="acepto"
          inputRef={casilla}
          error={error}
          checked={marcada}
          onChange={(e) => {
            if (enviando) return;
            setMarcada(e.target.checked);
            if (e.target.checked) setError(null);
          }}
        >
          {ACEPTAR_ACUERDO.casilla}
        </Casilla>
        <Envio
          texto={ACEPTAR_ACUERDO.boton}
          textoEnviando={E.enviando}
          anuncioEnviando={E.anuncioEnviando}
          enviando={enviando}
          frases={[ACEPTAR_ACUERDO.nota]}
        />
      </Formulario>
    </section>
  );
}

export default function Estado({ estado = "recibida" }: PropsPantalla) {
  const [actual, setActual] = useState<Estado>(estado === "retirar" ? "recibida" : (estado as Estado));
  const [dialogo, setDialogo] = useState(false);
  const titulo = useFocoAlTitulo(actual);
  const botonRetirar = useRef<HTMLButtonElement>(null);
  const temporizador = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(temporizador.current), []);
  // «Confirmar el retiro»: el diálogo se abre al hidratar (el HTML prerenderizado no lo trae).
  useEffect(() => {
    if (estado === "retirar") setDialogo(true);
  }, [estado]);

  const aside = <AsideAyuda sinPrograma={actual.startsWith("interes")} />;
  const escribenos = (
    <p>
      <Link to={CONTACTO_SOLICITUD} className="enlace-util">
        <Icono nombre="mail" tamaño={16} />
        <span>{RETIRAR.escribenos}</span>
      </Link>
    </p>
  );

  // ---- Carga ----------------------------------------------------------------------------------
  if (actual === "sin-token")
    return (
      <PaginaConAside medio aside={aside}>
        <div className="encabezado vf-encabezado">
          <h1 ref={titulo} tabIndex={-1}>
            {ESTADO.sinToken.titulo}
          </h1>
          <p className="bajada">
            {ESTADO.sinToken.antes}
            <Link to={CONTACTO_SOLICITUD}>{ESTADO.sinToken.enlace}</Link>
            {ESTADO.sinToken.despues}
          </p>
        </div>
      </PaginaConAside>
    );
  if (actual === "cargando")
    return (
      <PaginaConAside medio aside={aside}>
        <div className="encabezado vf-encabezado" role="status">
          <h1 ref={titulo} tabIndex={-1}>
            {ESTADO.cargando}
          </h1>
        </div>
      </PaginaConAside>
    );
  if (actual === "no-encontrada")
    return (
      <PaginaConAside medio aside={aside}>
        <div className="encabezado vf-encabezado">
          <h1 ref={titulo} tabIndex={-1}>
            {ESTADO.noEncontrada.titulo}
          </h1>
          <p className="bajada">{ESTADO.noEncontrada.texto}</p>
          <div className="acciones">
            <Link to={RUTAS_PUBLICAS.postular} className="boton boton--primario">
              {ESTADO.noEncontrada.primario}
            </Link>
            <Link to={RUTAS_PUBLICAS.contacto} className="boton boton--terciario">
              {ESTADO.noEncontrada.terciario}
            </Link>
          </div>
        </div>
      </PaginaConAside>
    );
  if (actual === "error-red")
    return (
      <PaginaConAside medio aside={aside}>
        <div className="encabezado vf-encabezado">
          <h1 ref={titulo} tabIndex={-1}>
            {ESTADO.errorRed.titulo}
          </h1>
          <p className="bajada">{ESTADO.errorRed.texto}</p>
          <div className="acciones">
            <button
              type="button"
              className="boton boton--primario"
              onClick={() => {
                setActual("cargando");
                temporizador.current = window.setTimeout(() => setActual("recibida"), SIMULACION_MS);
              }}
            >
              {ESTADO.errorRed.boton}
            </button>
          </div>
        </div>
      </PaginaConAside>
    );

  // ---- Interés --------------------------------------------------------------------------------
  if (actual === "interes-recibida" || actual === "interes-cerrada") {
    const recibida = actual === "interes-recibida";
    const area = areas.find((a) => a.id === SOLICITUD.areaInteres)!;
    return (
      <PaginaConAside medio aside={aside}>
        <div className="encabezado vf-encabezado">
          <h1 ref={titulo} tabIndex={-1}>
            {recibida ? ESTADO.interes.titulo(area.nombre) : ESTADO.interesCerrado.titulo}
          </h1>
          <p className="vf-etiquetas">
            <Etiqueta variante="nota">{recibida ? ESTADO.interes.etiqueta : ESTADO.interesCerrado.etiqueta}</Etiqueta>
          </p>
          {recibida && <p className="bajada">{ESTADO.interes.texto(SOLICITUD.correoEnmascarado)}</p>}
        </div>
        {recibida && (
          <>
            <TarjetaContaste interes />
            <div className="vf-acciones-estado">
              <p>
                <button type="button" className="boton boton--terciario vf-retirar" onClick={() => setActual("interes-cerrada")}>
                  {RETIRAR.botonInteres}
                </button>
              </p>
              {escribenos}
            </div>
          </>
        )}
      </PaginaConAside>
    );
  }

  // ---- Estados de la solicitud ---------------------------------------------------------------
  const conAtraso = actual === "con-atraso";
  const enviada = conAtraso ? SOLICITUD.enviadaConAtraso : SOLICITUD.enviada;
  const textoPlazo = ESTADO.recibida.texto(SOLICITUD.correoEnmascarado, fechaLarga(plazoDe(enviada)));
  const fichas: Record<string, { etiqueta: string; variante: VarianteEtiqueta; titulo: string; texto?: string[] }> = {
    recibida: { etiqueta: ESTADO.recibida.etiqueta, variante: "activo", titulo: ESTADO.recibida.titulo, texto: [textoPlazo] },
    "en-revision": { etiqueta: ESTADO.enRevision.etiqueta, variante: "nota", titulo: ESTADO.enRevision.titulo, texto: [textoPlazo] },
    "con-atraso": {
      etiqueta: ESTADO.conAtraso.etiqueta,
      variante: "nota",
      titulo: ESTADO.enRevision.titulo,
      texto: [textoPlazo, ESTADO.conAtraso.texto],
    },
    respondida: {
      etiqueta: ESTADO.respondida.etiqueta,
      variante: "activo",
      titulo: ESTADO.respondida.titulo,
      texto: [ESTADO.respondida.texto(fechaLarga(SOLICITUD.respondida), SOLICITUD.correoEnmascarado)],
    },
    acordada: { etiqueta: ESTADO.acordada.etiqueta, variante: "activo", titulo: ESTADO.acordada.titulo },
    // Sin política de término o sin forma de pago (hoy, las dos son null en rumbo.ts): el bloque de
    // aceptación no se muestra y en su lugar va el aviso de 3.14.
    "acordada-sin-detalles": {
      etiqueta: ESTADO.acordada.etiqueta,
      variante: "activo",
      titulo: ESTADO.acordada.titulo,
      texto: [ACEPTAR_ACUERDO.sinDetalles],
    },
    "acuerdo-aceptado": {
      etiqueta: ESTADO.aceptada.etiqueta,
      variante: "activo",
      titulo: ESTADO.aceptada.titulo,
      texto: [ESTADO.aceptada.texto(fechaLarga(SOLICITUD.aceptada), VERSION_CONDICIONES)],
    },
    "con-espacio": {
      etiqueta: ESTADO.conEspacio.etiqueta,
      variante: "activo",
      titulo: ESTADO.conEspacio.titulo,
      texto: [ESTADO.conEspacio.texto],
    },
    "cerrada-capacidad": {
      etiqueta: ESTADO.cerrada.etiqueta,
      variante: "nota",
      titulo: ESTADO.cerrada.capacidad.titulo,
      texto: [ESTADO.cerrada.capacidad.texto(SOLICITUD.avisos)],
    },
    "cerrada-con-nota": {
      etiqueta: ESTADO.cerrada.etiqueta,
      variante: "nota",
      titulo: ESTADO.cerrada.capacidad.titulo,
      texto: [ESTADO.cerrada.capacidad.texto(SOLICITUD.avisos)],
    },
    "cerrada-alcance": {
      etiqueta: ESTADO.cerrada.etiqueta,
      variante: "nota",
      titulo: ESTADO.cerrada.alcance.titulo,
      texto: [ESTADO.cerrada.alcance.texto],
    },
    "cerrada-sin-respuesta": {
      etiqueta: ESTADO.cerrada.etiqueta,
      variante: "nota",
      titulo: ESTADO.cerrada.sinRespuesta.titulo,
      texto: [ESTADO.cerrada.sinRespuesta.texto],
    },
    retirada: {
      etiqueta: ESTADO.retirada.etiqueta,
      variante: "nota",
      titulo: ESTADO.retirada.titulo,
      texto: [ESTADO.retirada.texto(fechaLarga(SOLICITUD.retirada))],
    },
  };
  const ficha = fichas[actual] ?? fichas.recibida;
  const retirable = RETIRABLES.includes(actual);

  return (
    <PaginaConAside medio aside={aside} className="vf-estado">
      <div className="encabezado vf-encabezado">
        <h1 ref={titulo} tabIndex={-1}>
          {ficha.titulo}
        </h1>
        <p className="vf-etiquetas">
          <Etiqueta variante={ficha.variante}>{ficha.etiqueta}</Etiqueta>
        </p>
        {ficha.texto?.map((t) => (
          <p key={t} className="bajada">
            {t}
          </p>
        ))}
        {actual === "retirada" && (
          <p className="vf-etiquetas">
            <EtiquetaEjemplo />
          </p>
        )}
        {actual === "con-espacio" && (
          <div className="acciones">
            <Link to={RUTAS_PUBLICAS.entrar} className="boton boton--primario">
              {ESTADO.conEspacio.boton}
            </Link>
          </div>
        )}
        {actual === "retirada" && (
          <div className="acciones">
            <Link to={RUTAS_PUBLICAS.postular} className="boton boton--primario">
              {ESTADO.retirada.boton}
            </Link>
          </div>
        )}
      </div>
      {actual === "cerrada-con-nota" && (
        <figure className="vf-nota-cierre">
          <figcaption className="nota-coach-rotulo">{ESTADO.notaDe(nombreCoach())}</figcaption>
          <blockquote>
            <p>{SOLICITUD.notaCierre}</p>
          </blockquote>
          <p>
            <EtiquetaEjemplo />
          </p>
        </figure>
      )}
      {actual === "cerrada-alcance" && <AvisoAyuda />}
      {actual === "acordada" && <Acuerdo onAceptar={() => setActual("acuerdo-aceptado")} />}

      <LineaTiempo pasos={pasosDe(actual)} className="vf-estado__pasos" />
      {actual !== "retirada" && <TarjetaContaste enviada={enviada} />}

      {actual !== "retirada" && (
        <div className="vf-acciones-estado">
          {retirable && (
            <p>
              <button
                ref={botonRetirar}
                type="button"
                className="boton boton--terciario vf-retirar"
                aria-haspopup="dialog"
                onClick={() => setDialogo(true)}
              >
                {RETIRAR.boton}
              </button>
            </p>
          )}
          {actual === "con-espacio" && <p className="vf-nota">{RETIRAR.conEspacio}</p>}
          {escribenos}
        </div>
      )}

      <Dialogo
        id="retirar"
        abierto={dialogo}
        onCerrar={() => setDialogo(false)}
        titulo={RETIRAR.titulo}
        devolverA={botonRetirar}
      >
        <p>{RETIRAR.texto}</p>
        <div className="acciones vf-dialogo__acciones">
          <button type="button" className="boton boton--secundario" onClick={() => setDialogo(false)}>
            {RETIRAR.mantener}
          </button>
          <button
            type="button"
            className="boton boton--primario"
            onClick={() => {
              setDialogo(false);
              setActual("retirada");
            }}
          >
            {RETIRAR.confirmar}
          </button>
        </div>
      </Dialogo>
    </PaginaConAside>
  );
}
