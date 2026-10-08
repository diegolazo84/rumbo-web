// Estado de la solicitud (/estado/#token, plataforma 3.14) en cada estado: carga (sin enlace,
// buscando, no encontrada, error de red), cada estado de la base con su etiqueta, H1, texto y
// línea de tiempo, «Lo que nos contaste», aceptar el acuerdo y retirar (diálogo modal).
// - Vista previa (modo.ts): cada fila del registro muestra un estado con la solicitud de ejemplo;
//   las acciones se simulan sin red (aceptar lleva a «Aceptaste tu acuerdo», retirar a
//   «Retiraste tu solicitud» e «Intentar de nuevo» a «Recibimos tu solicitud»).
// - Modo real: el token va en el # (nunca sale en una petición como URL ni como referrer); la
//   página lo lee al hidratar y llama a ver_solicitud, retirar_solicitud y aceptar_acuerdo (6.6).
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ListaCheck } from "../../../components/Bloques";
import Etiqueta from "../../../components/Etiqueta";
import { Boton } from "../../../components/Enlaces";
import { AvisoAyuda, Casilla, Envio, Formulario } from "../../../components/form";
import { Icono } from "../../../components/app";
import { ACEPTAR_ACUERDO, NOMBRE_DIA, POSTULAR, RETIRAR, estadosEnvio, nombreCoach } from "../../../data/formularios";
import { areas, notaPrecio, operacion, planes, type Plan, type VarianteEtiqueta } from "../../../data/rumbo";
import {
  ErrorApi,
  aceptarAcuerdo,
  enChile,
  esToken,
  retirarSolicitud,
  verSolicitud,
  type Solicitud,
} from "../../../lib/api";
import { DIAS, diaMes, fechaLarga, miles, type Iso } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
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
import { useModoFormulario } from "./modo";
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
const SIMULACION_MS = 1200;

// ---------------------------------------------------------------------------
// Lo que muestra la página, igual para la solicitud de ejemplo y la real.

type AcuerdoVista = { plan: Plan; precio: string; inicio: Iso; semanas: number; dia: string; hora: string | null; formaDePago: string };
type Vista = {
  ejemplo: boolean;
  area: string;
  apoyo: string | null;
  dias: string[];
  franjas: string[];
  meta: string | null;
  nombre: string;
  correo: string; // enmascarado
  enviada: Iso | null;
  hora: string | null;
  plazo: Iso | null;
  respondida: Iso | null;
  aceptada: Iso | null;
  version: string;
  retirada: Iso | null;
  notaCierre: string | null;
  avisos: boolean;
  acuerdo: AcuerdoVista | null;
};

// Solicitud de ejemplo de la vista previa (Sofía, ejemplo.ts) según la variante del registro.
function vistaEjemplo(e: Estado): Vista {
  const enviada = e === "con-atraso" ? SOLICITUD.enviadaConAtraso : SOLICITUD.enviada;
  const plan = planes.find((p) => p.param === SOLICITUD.apoyo)!;
  return {
    ejemplo: true,
    area: e.startsWith("interes") ? SOLICITUD.areaInteres : SOLICITUD.area,
    apoyo: SOLICITUD.apoyo,
    dias: SOLICITUD.dias,
    franjas: SOLICITUD.franjas,
    meta: SOLICITUD.meta,
    nombre: SOLICITUD.nombre,
    correo: SOLICITUD.correoEnmascarado,
    enviada,
    hora: SOLICITUD.hora,
    plazo: plazoDe(enviada),
    respondida: SOLICITUD.respondida,
    aceptada: SOLICITUD.aceptada,
    version: VERSION_CONDICIONES,
    retirada: SOLICITUD.retirada,
    notaCierre: e === "cerrada-con-nota" ? SOLICITUD.notaCierre : null,
    avisos: SOLICITUD.avisos,
    // Sin política de término o sin forma de pago el bloque no se muestra (3.14). En la vista
    // previa la forma de pago es la de ejemplo de rumbo.ts, rotulada «Ejemplo».
    acuerdo: {
      plan,
      precio: plan.precio,
      inicio: SOLICITUD.inicioCiclo,
      semanas: 4,
      dia: SOLICITUD.diaRevision,
      hora: "19:00",
      formaDePago: operacion.formaDePago ?? SOLICITUD.formaDePago,
    },
  };
}

const hoyEnChile = () => enChile(new Date().toISOString()).fecha;
const fechaDe = (marca: string | null | undefined) => (marca ? enChile(marca).fecha : null);

// Respuesta de ver_solicitud (6.6) → estado de la página y lo que se muestra.
function vistaReal(s: Solicitud): { estado: Estado; vista: Vista } {
  const creada = s.creada_en ? enChile(s.creada_en) : null;
  const plan = planes.find((p) => p.param === (s.acuerdo?.plan ?? s.apoyo));
  const a = s.acuerdo;
  const acuerdo =
    a && plan && operacion.formaDePago
      ? {
          plan,
          precio: a.precio_clp ? `$${miles(a.precio_clp)}` : plan.precio,
          inicio: a.inicio,
          semanas: a.semanas,
          // «los jueves»: el día de la semana en plural es igual al singular (lunes a viernes).
          dia: DIAS[(a.dia_revision ?? 1) - 1] ?? DIAS[0],
          hora: a.hora_videollamada ? a.hora_videollamada.slice(0, 5) : null,
          formaDePago: operacion.formaDePago,
        }
      : null;
  const vista: Vista = {
    ejemplo: false,
    area: s.area ?? "", // interés en la reapertura: sin área
    apoyo: s.apoyo ?? null,
    dias: (s.dias ?? []).map((d: string) => NOMBRE_DIA[d] ?? d),
    franjas: s.franjas ?? [],
    meta: s.meta ?? null,
    nombre: s.nombre ?? "",
    correo: s.correo ?? "",
    enviada: creada?.fecha ?? null,
    hora: creada?.hora ?? null,
    plazo: s.responder_antes ?? null,
    respondida: fechaDe(s.respondida_en),
    aceptada: fechaDe(s.condiciones_aceptadas?.fecha),
    version: s.condiciones_aceptadas?.version ?? s.version_condiciones ?? VERSION_CONDICIONES,
    retirada: fechaDe(s.cerrada_en) ?? (s.estado === "retirada" ? hoyEnChile() : null),
    notaCierre: s.nota_cierre ?? null,
    // ver_solicitud no devuelve avisos_futuros: «y te avisaremos» no se promete.
    avisos: false,
    acuerdo,
  };
  if (s.tipo === "interes")
    return { estado: s.estado === "cerrada" || s.estado === "retirada" ? "interes-cerrada" : "interes-recibida", vista };
  const estado: Estado = (() => {
    switch (s.estado) {
      case "recibida":
        return s.con_atraso ? "con-atraso" : "recibida";
      case "en_revision":
        return s.con_atraso ? "con-atraso" : "en-revision";
      case "respondida":
        return "respondida";
      case "acordada":
        if (s.condiciones_aceptadas) return "acuerdo-aceptado";
        // Sin política de término o sin forma de pago, el bloque de aceptación no se muestra (3.14).
        return acuerdo && operacion.politicaTermino ? "acordada" : "acordada-sin-detalles";
      case "con_espacio":
        return "con-espacio";
      case "retirada":
        return "retirada";
      case "cerrada":
        if (s.motivo_cierre === "alcance") return "cerrada-alcance";
        if (s.motivo_cierre === "sin_respuesta") return "cerrada-sin-respuesta";
        return "cerrada-capacidad";
      default:
        return "recibida";
    }
  })();
  return { estado, vista };
}

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

// «martes y jueves» · «lunes, martes y jueves»
const enLista = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`);

function TarjetaContaste({ vista, interes }: { vista: Vista; interes?: boolean }) {
  const area = areas.find((a) => a.id === vista.area);
  const t = ESTADO.tarjeta;
  const dias = enLista(vista.dias.map((d) => d.toLowerCase()));
  const franjas = vista.franjas.map((f) => POSTULAR.horarios.franjas.find((x) => x.valor === f)?.texto ?? f).join(", ");
  const horarios = [dias && dias.charAt(0).toUpperCase() + dias.slice(1), franjas].filter(Boolean).join(" · ");
  return (
    <section className="tarjeta vf-contaste" aria-labelledby="contaste-titulo">
      <div className="vf-tarjeta__cabeza">
        <h2 id="contaste-titulo" className="vf-tarjeta__titulo">
          {t.titulo}
        </h2>
        {vista.ejemplo && <EtiquetaEjemplo />}
      </div>
      <dl className="vf-datos">
        {area && (
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
        )}
        {!interes && (
          <>
            {vista.apoyo && (
              <div>
                <dt>{t.apoyo}</dt>
                <dd>{nombreApoyo(vista.apoyo)}</dd>
              </div>
            )}
            {horarios && (
              <div>
                <dt>{t.horarios}</dt>
                <dd>{horarios}</dd>
              </div>
            )}
          </>
        )}
        <div>
          <dt>{t.nombre}</dt>
          <dd>{vista.nombre}</dd>
        </div>
        <div>
          <dt>{t.correo}</dt>
          <dd>{vista.correo}</dd>
        </div>
        {vista.enviada && vista.hora && (
          <div>
            <dt>{t.fecha}</dt>
            <dd>{fechaHora(vista.enviada, vista.hora)}</dd>
          </div>
        )}
      </dl>
      {!interes && vista.meta && (
        <details className="vf-meta">
          <summary>
            <span>{t.verMeta}</span>
            <Icono nombre="chevron-right" tamaño={16} className="vf-meta__icono" />
          </summary>
          <p>{vista.meta}</p>
        </details>
      )}
    </section>
  );
}

// Texto exacto del acuerdo que se guarda al aceptarlo (3.14 y 6.6).
const textoAcuerdo = (a: AcuerdoVista) =>
  [
    `${a.plan.nombre} · ${a.plan.rotulo}`,
    `${a.precio} ${a.plan.periodo}. ${notaPrecio()}`,
    ESTADO.acuerdo.ciclo(a.semanas, diaMes(a.inicio)),
    a.plan.param === "cercano" && a.hora ? ESTADO.acuerdo.videollamada(a.dia, a.hora) : ESTADO.acuerdo.revision(a.dia),
    a.formaDePago,
    ACEPTAR_ACUERDO.casilla,
  ].join("\n");

// Bloque de aceptación del acuerdo (estado acordada). `onAceptar` devuelve un mensaje de error
// para mostrar sobre el botón, o nada si salió bien.
function Acuerdo({
  acuerdo,
  version,
  ejemplo,
  onAceptar,
}: {
  acuerdo: AcuerdoVista;
  version: string;
  ejemplo: boolean;
  onAceptar: (texto: string) => Promise<string | null | void> | void;
}) {
  const { plan } = acuerdo;
  const [marcada, setMarcada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerta, setAlerta] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const casilla = useRef<HTMLInputElement>(null);
  const E = estadosEnvio("solicitud", ACEPTAR_ACUERDO.boton);
  const t = ESTADO.acuerdo;
  return (
    <section className="tarjeta tarjeta--producto vf-acuerdo" aria-labelledby="acuerdo-titulo">
      <div className="vf-tarjeta__cabeza">
        <h2 id="acuerdo-titulo" className="vf-tarjeta__titulo">
          {t.titulo}
        </h2>
        {ejemplo && <EtiquetaEjemplo />}
      </div>
      <p className="vf-acuerdo__plan">
        <strong>{plan.nombre}</strong>
        <Etiqueta variante="nota">{plan.rotulo}</Etiqueta>
      </p>
      <div>
        <p className="plan-precio">
          <span className="precio">{acuerdo.precio}</span>
          <span className="plan-periodo">{plan.periodo}</span>
        </p>
        <p className="plan-nota">{notaPrecio()}</p>
      </div>
      <ListaCheck
        items={[
          t.ciclo(acuerdo.semanas, diaMes(acuerdo.inicio)),
          plan.param === "cercano" && acuerdo.hora ? t.videollamada(acuerdo.dia, acuerdo.hora) : t.revision(acuerdo.dia),
          acuerdo.formaDePago,
        ]}
      />
      <p>
        <Link to="/condiciones/" className="vf-enlace-alto">
          {t.condiciones(version)}
        </Link>
      </p>
      <Formulario
        onSubmit={async () => {
          if (enviando) return;
          if (!marcada) {
            setError(ACEPTAR_ACUERDO.error);
            casilla.current?.focus();
            return;
          }
          setAlerta(null);
          setEnviando(true);
          const fallo = await onAceptar(textoAcuerdo(acuerdo));
          if (fallo) {
            setAlerta(fallo);
            setEnviando(false);
          }
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
          texto={alerta ? E.reintentar : ACEPTAR_ACUERDO.boton}
          textoEnviando={E.enviando}
          anuncioEnviando={E.anuncioEnviando}
          enviando={enviando}
          alerta={alerta}
          frases={[ACEPTAR_ACUERDO.nota]}
        />
      </Formulario>
    </section>
  );
}

// Token del enlace privado: lo que va tras «#».
function tokenDe(hash: string): string {
  const crudo = hash.replace(/^#/, "");
  try {
    return decodeURIComponent(crudo).trim();
  } catch {
    return crudo.trim();
  }
}

export default function Estado({ estado = "recibida" }: PropsPantalla) {
  const { real, rutas } = useModoFormulario();
  const inicial: Estado = real ? "cargando" : estado === "retirar" ? "recibida" : (estado as Estado);
  const [actual, setActual] = useState<Estado>(inicial);
  const [vista, setVista] = useState<Vista>(() => vistaEjemplo(inicial));
  const [dialogo, setDialogo] = useState(false);
  const [alertaAccion, setAlertaAccion] = useState<string | null>(null);
  const [retirando, setRetirando] = useState(false);
  const titulo = useFocoAlTitulo(actual);
  const botonRetirar = useRef<HTMLButtonElement>(null);
  const temporizador = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(temporizador.current), []);
  // «Confirmar el retiro»: el diálogo se abre al hidratar (el HTML prerenderizado no lo trae).
  useEffect(() => {
    if (!real && estado === "retirar") setDialogo(true);
  }, [estado, real]);

  // ---- Modo real: el token del # y la solicitud ------------------------------------------------
  const { hash } = useLocation();
  const token = real ? tokenDe(hash) : "";
  const cargar = useCallback(async (t: string) => {
    setAlertaAccion(null);
    // Un enlace incompleto o de la plataforma anterior no tiene la forma del token: ni se consulta.
    if (!esToken(t)) {
      setActual("no-encontrada");
      return;
    }
    setActual("cargando");
    try {
      const s = await verSolicitud(t);
      if (!s) {
        setActual("no-encontrada");
        return;
      }
      const r = vistaReal(s);
      setVista(r.vista);
      setActual(r.estado);
    } catch (e) {
      setActual(e instanceof ErrorApi && e.tipo === "no_encontrada" ? "no-encontrada" : "error-red");
    }
  }, []);
  useEffect(() => {
    if (!real) return;
    if (!token) setActual("sin-token");
    else void cargar(token);
  }, [real, token, cargar]);

  const retirar = async (interes: boolean) => {
    setDialogo(false);
    if (!real) {
      setActual(interes ? "interes-cerrada" : "retirada");
      return;
    }
    if (retirando) return;
    setRetirando(true);
    setAlertaAccion(null);
    try {
      const r = await retirarSolicitud(token);
      setVista((v) => ({ ...v, retirada: fechaDe(r?.cerrada_en) ?? hoyEnChile() }));
      setActual(interes ? "interes-cerrada" : "retirada");
    } catch (e) {
      const error = e instanceof ErrorApi ? e : new ErrorApi("servidor");
      if (error.tipo === "no_encontrada") setActual("no-encontrada");
      else if (error.tipo === "conflicto" && error.codigo === "con_espacio") setAlertaAccion(RETIRAR.conEspacio);
      else setAlertaAccion(interes ? ESTADO.errorAccion.interes : ESTADO.errorAccion.retirar);
    } finally {
      setRetirando(false);
    }
  };

  const aceptar = async (texto: string): Promise<string | null> => {
    if (!real) {
      await new Promise((listo) => {
        temporizador.current = window.setTimeout(listo, SIMULACION_MS);
      });
      setActual("acuerdo-aceptado");
      return null;
    }
    try {
      const r = await aceptarAcuerdo(token, vista.version, texto);
      setVista((v) => ({ ...v, aceptada: fechaDe(r?.fecha) ?? hoyEnChile(), version: r?.version ?? v.version }));
      setActual("acuerdo-aceptado");
      return null;
    } catch (e) {
      const error = e instanceof ErrorApi ? e : new ErrorApi("servidor");
      // Cambió el acuerdo o la versión de las Condiciones: se vuelve a leer la solicitud.
      if (error.tipo === "conflicto" || error.tipo === "no_encontrada") {
        await cargar(token);
        return null;
      }
      return ESTADO.errorAccion.aceptar;
    }
  };

  const aside = <AsideAyuda sinPrograma={actual.startsWith("interes")} />;
  const contactoSolicitud = `${rutas.contacto}?motivo=solicitud`;
  const escribenos = (
    <p>
      <Link to={contactoSolicitud} className="enlace-util">
        <Icono nombre="mail" tamaño={16} />
        <span>{RETIRAR.escribenos}</span>
      </Link>
    </p>
  );
  const avisoAccion = alertaAccion ? (
    <p role="alert" className="vf-nota">
      {alertaAccion}
    </p>
  ) : null;

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
            <Link to={contactoSolicitud}>{ESTADO.sinToken.enlace}</Link>
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
            <Link to={rutas.postular} className="boton boton--primario">
              {ESTADO.noEncontrada.primario}
            </Link>
            <Link to={rutas.contacto} className="boton boton--terciario">
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
                if (real) {
                  void cargar(token);
                  return;
                }
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
    const area = areas.find((a) => a.id === vista.area);
    return (
      <PaginaConAside medio aside={aside}>
        <div className="encabezado vf-encabezado">
          <h1 ref={titulo} tabIndex={-1}>
            {recibida && area ? ESTADO.interes.titulo(area.nombre) : recibida ? ESTADO.interes.etiqueta + "." : ESTADO.interesCerrado.titulo}
          </h1>
          <p className="vf-etiquetas">
            <Etiqueta variante="nota">{recibida ? ESTADO.interes.etiqueta : ESTADO.interesCerrado.etiqueta}</Etiqueta>
          </p>
          {recibida && <p className="bajada">{ESTADO.interes.texto(vista.correo)}</p>}
        </div>
        {recibida && (
          <>
            <TarjetaContaste vista={vista} interes />
            <div className="vf-acciones-estado">
              <p>
                <button type="button" className="boton boton--terciario vf-retirar" onClick={() => void retirar(true)}>
                  {RETIRAR.botonInteres}
                </button>
              </p>
              {avisoAccion}
              {escribenos}
            </div>
          </>
        )}
      </PaginaConAside>
    );
  }

  // ---- Estados de la solicitud ---------------------------------------------------------------
  const textoPlazo = vista.plazo ? ESTADO.recibida.texto(vista.correo, fechaLarga(vista.plazo)) : null;
  const conPlazo = (...extra: string[]) => [...(textoPlazo ? [textoPlazo] : []), ...extra];
  const fichas: Record<string, { etiqueta: string; variante: VarianteEtiqueta; titulo: string; texto?: string[] }> = {
    recibida: { etiqueta: ESTADO.recibida.etiqueta, variante: "activo", titulo: ESTADO.recibida.titulo, texto: conPlazo() },
    "en-revision": { etiqueta: ESTADO.enRevision.etiqueta, variante: "nota", titulo: ESTADO.enRevision.titulo, texto: conPlazo() },
    "con-atraso": {
      etiqueta: ESTADO.conAtraso.etiqueta,
      variante: "nota",
      titulo: ESTADO.enRevision.titulo,
      texto: conPlazo(ESTADO.conAtraso.texto),
    },
    respondida: {
      etiqueta: ESTADO.respondida.etiqueta,
      variante: "activo",
      titulo: ESTADO.respondida.titulo,
      texto: vista.respondida ? [ESTADO.respondida.texto(fechaLarga(vista.respondida), vista.correo)] : [],
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
      texto: vista.aceptada ? [ESTADO.aceptada.texto(fechaLarga(vista.aceptada), vista.version)] : [],
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
      texto: [ESTADO.cerrada.capacidad.texto(vista.avisos)],
    },
    "cerrada-con-nota": {
      etiqueta: ESTADO.cerrada.etiqueta,
      variante: "nota",
      titulo: ESTADO.cerrada.capacidad.titulo,
      texto: [ESTADO.cerrada.capacidad.texto(vista.avisos)],
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
      texto: [ESTADO.retirada.texto(fechaLarga(vista.retirada ?? SOLICITUD.retirada))],
    },
  };
  const ficha = fichas[actual] ?? fichas.recibida;
  const retirable = RETIRABLES.includes(actual);
  const entrarExterno = !rutas.entrar.startsWith("/");

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
        {actual === "retirada" && vista.ejemplo && (
          <p className="vf-etiquetas">
            <EtiquetaEjemplo />
          </p>
        )}
        {actual === "con-espacio" && (
          <div className="acciones">
            {entrarExterno ? (
              <Boton href={rutas.entrar} plataforma>
                {ESTADO.conEspacio.boton}
              </Boton>
            ) : (
              <Link to={rutas.entrar} className="boton boton--primario">
                {ESTADO.conEspacio.boton}
              </Link>
            )}
          </div>
        )}
        {actual === "retirada" && (
          <div className="acciones">
            <Link to={rutas.postular} className="boton boton--primario">
              {ESTADO.retirada.boton}
            </Link>
          </div>
        )}
      </div>
      {actual.startsWith("cerrada") && vista.notaCierre && (
        <figure className="vf-nota-cierre">
          <figcaption className="nota-coach-rotulo">{ESTADO.notaDe(nombreCoach())}</figcaption>
          <blockquote>
            <p>{vista.notaCierre}</p>
          </blockquote>
          {vista.ejemplo && (
            <p>
              <EtiquetaEjemplo />
            </p>
          )}
        </figure>
      )}
      {actual === "cerrada-alcance" && <AvisoAyuda />}
      {actual === "acordada" && vista.acuerdo && (
        <Acuerdo acuerdo={vista.acuerdo} version={vista.version} ejemplo={vista.ejemplo} onAceptar={aceptar} />
      )}

      <LineaTiempo pasos={pasosDe(actual)} className="vf-estado__pasos" />
      {actual !== "retirada" && <TarjetaContaste vista={vista} />}

      {actual !== "retirada" && (
        <div className="vf-acciones-estado">
          {retirable && (
            <p>
              <button
                ref={botonRetirar}
                type="button"
                className="boton boton--terciario vf-retirar"
                aria-haspopup="dialog"
                aria-disabled={retirando ? "true" : undefined}
                onClick={() => !retirando && setDialogo(true)}
              >
                {RETIRAR.boton}
              </button>
            </p>
          )}
          {avisoAccion}
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
          <button type="button" className="boton boton--primario" onClick={() => void retirar(false)}>
            {RETIRAR.confirmar}
          </button>
        </div>
      </Dialogo>
    </PaginaConAside>
  );
}
