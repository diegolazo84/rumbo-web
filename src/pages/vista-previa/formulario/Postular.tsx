// Vista previa · «Cuéntanos tu meta» (/postular/, plataforma 3.3 a 3.12): modo solicitud con
// sus tres bloques, modo «Dejar mi interés», postulaciones cerradas (por Diego o por el tope del
// día), borrador en la pestaña, preselección por ?area= y ?apoyo=, resumen de errores y estados
// del envío. La validación funciona de verdad en el navegador; el envío se simula (sin red) y
// termina en la confirmación (3.13) en la misma página.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Aviso, ListaCheck } from "../../../components/Bloques";
import Etiqueta from "../../../components/Etiqueta";
import {
  AvisoAyuda,
  BloqueNumerado,
  CampoArea,
  CampoTexto,
  CampoTrampa,
  Casilla,
  Envio,
  Formulario,
  GrupoOpciones,
  Opcion,
  ResumenErrores,
} from "../../../components/form";
import { Icono } from "../../../components/app";
import {
  APOYO_POR_PARAM,
  AREA_POR_PARAM,
  CORREO,
  LIMITES,
  NOMBRE,
  POSTULAR,
  TEXTOS_FORM,
  esAreaMasAdelante,
  estadosEnvio,
  opcionesApoyo,
  opcionesArea,
  opcionesAreaMasAdelante,
  sugerirCorreo,
  validarPostular,
  type DatosPostular,
  type ModoPostular,
  type OpcionArea,
} from "../../../data/formularios";
import { areas, estados, notaPrecio, operacion, planes } from "../../../data/rumbo";
import { fechaLarga } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { RUTAS_PUBLICAS } from "../rutas";
import { AsideAyuda, EtiquetaEjemplo, PaginaConAside, resumir, useFormularioPrevia, useTituloDocumento } from "./comunes";
import { VistaConfirmacion, type DatosConfirmacion } from "./Confirmacion";
import { AUSENCIA_POSTULAR, DATOS_COMPLETOS, DATOS_CON_ERRORES, SOLICITUD, nombreArea, plazoDe } from "./ejemplo";
import { pasosAntesDeEnviar } from "./textos";

const T_POSTULAR = "Cuéntanos tu meta · Rumbo";
const T_INTERES = "Deja tu interés · Rumbo";

// sessionStorage (no localStorage: en un computador compartido la meta no sobrevive al cierre).
const CLAVE_BORRADOR = "rumbo-vista-previa-postular";
const CLAVE_ENVIADA = "rumbo-vista-previa-postular-enviada";
const leer = (clave: string) => {
  try {
    const v = window.sessionStorage.getItem(clave);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
};
const escribir = (clave: string, valor: unknown) => {
  try {
    if (valor === null) window.sessionStorage.removeItem(clave);
    else window.sessionStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): el formulario funciona igual.
  }
};

const ZONAS_CHILE = ["America/Santiago", "America/Punta_Arenas", "Pacific/Easter"];
const SIMULACION_MS = 1200;

const VACIO: DatosPostular = { area: "", meta: "", apoyo: "", nombre: "", correo: "", mayorEdad: false, autorizacion: false };
type Extras = { dias: string[]; franjas: string[]; notaHorarios: string; avisos: boolean; trampa: string };
const EXTRAS_VACIOS: Extras = { dias: [], franjas: [], notaHorarios: "", avisos: false, trampa: "" };
const EXTRAS_EJEMPLO: Extras = { dias: SOLICITUD.dias, franjas: SOLICITUD.franjas, notaHorarios: "", avisos: true, trampa: "" };

type Envio = "inicial" | "enviando" | "red" | "red2" | "sinConexion" | "servidor" | "limite" | "tope";

// Variantes del registro con el formulario lleno y un estado del envío ya visible (3.9 y 3.12).
const ENVIO_INICIAL: Record<string, Envio> = {
  enviando: "enviando",
  "error-red": "red",
  "segundo-fallo": "red2",
  "sin-conexion": "sinConexion",
  servidor: "servidor",
  demasiados: "limite",
  "tope-al-enviar": "tope",
};
const CON_DATOS = new Set(Object.keys(ENVIO_INICIAL));

// «Recuperamos lo que habías escrito»: lo que quedó en la pestaña (la autorización nunca vuelve).
const BORRADOR_EJEMPLO: DatosPostular = { ...DATOS_COMPLETOS, apoyo: "", mayorEdad: false, autorizacion: false };

const idDe = (campo: keyof DatosPostular) => (campo === "mayorEdad" ? "mayor-edad" : campo);
const idArea = (valor: string) => `area-${valor}`;
const sinOpcional = (texto: string) => texto.replace(/ \(opcional\)$/, "");

// Valores iniciales de cada variante del registro.
function inicialDe(estado: string, cerradas: boolean): { datos: DatosPostular; extras: Extras } {
  if (cerradas) return { datos: { ...VACIO, area: POSTULAR.cerradas.areaReapertura.valor }, extras: EXTRAS_VACIOS };
  if (estado === "interes") return { datos: { ...VACIO, area: SOLICITUD.areaInteres }, extras: EXTRAS_VACIOS };
  if (estado === "errores") return { datos: DATOS_CON_ERRORES, extras: EXTRAS_VACIOS };
  if (CON_DATOS.has(estado)) return { datos: DATOS_COMPLETOS, extras: EXTRAS_EJEMPLO };
  if (estado === "borrador") return { datos: BORRADOR_EJEMPLO, extras: EXTRAS_EJEMPLO };
  if (estado === "desde-planes") return { datos: { ...VACIO, apoyo: "coach" }, extras: EXTRAS_VACIOS };
  return { datos: VACIO, extras: EXTRAS_VACIOS };
}

export default function Postular({ estado = "solicitud" }: PropsPantalla) {
  const cerradas = estado === "cerradas" || estado === "cerradas-tope";
  const conBorrador = estado === "solicitud"; // borrador y ?area= solo en la variante limpia
  const inicial = useMemo(() => inicialDe(estado, cerradas), [estado, cerradas]);
  const modoDe = (area: string): ModoPostular => (cerradas ? "cerradas" : esAreaMasAdelante(area) ? "interes" : "solicitud");
  const validar = (d: DatosPostular) => validarPostular(d, modoDe(d.area));

  const [envio, setEnvio] = useState<Envio>(ENVIO_INICIAL[estado] ?? "inicial");
  const enviando = envio === "enviando";
  const f = useFormularioPrevia(inicial.datos, validar, {
    idDe,
    erroresIniciales: estado === "errores" ? validar(inicial.datos) : {},
    bloqueado: enviando,
  });
  const [extras, setExtras] = useState<Extras>(inicial.extras);
  const [mostrarResumen, setMostrarResumen] = useState(estado === "errores");
  const [intento, setIntento] = useState(0);
  const [fallos, setFallos] = useState(estado === "error-red" ? 1 : estado === "segundo-fallo" ? 2 : 0);
  const [confirmado, setConfirmado] = useState<DatosConfirmacion | null>(null);
  const [listaAreas, setListaAreas] = useState(false); // interés: «Cambiar área» reabre la lista
  const [otrasAbiertas, setOtrasAbiertas] = useState(esAreaMasAdelante(inicial.datos.area));
  const [anuncio, setAnuncio] = useState("");
  const [restaurado, setRestaurado] = useState(estado === "borrador");
  const [desdePlanes, setDesdePlanes] = useState<string | null>(
    estado === "desde-planes" ? (planes.find((p) => p.param === "coach")?.nombre ?? null) : null,
  );
  const [zona, setZona] = useState<string | null>(null);
  const [verSugerencia, setVerSugerencia] = useState(estado === "errores");
  const [focoTitulo, setFocoTitulo] = useState(0);

  const v = f.valores;
  const modo = modoDe(v.area);
  const interes = modo !== "solicitud";
  const E = estadosEnvio("solicitud", interes ? POSTULAR.interes.boton : POSTULAR.envio.boton);
  const ausencia = estado === "ausencia";
  const plazo = operacion.plazoPrimeraRespuesta
    ? ausencia
      ? AUSENCIA_POSTULAR.fecha
      : fechaLarga(plazoDe(SOLICITUD.enviada))
    : null;
  const resumen = mostrarResumen ? resumir(f.errores, idDe) : [];
  const sugerencia = verSugerencia ? sugerirCorreo(v.correo) : null;
  const editado = useRef(false);

  const titulo = useRef<HTMLHeadingElement>(null);
  const resumenRef = useRef<HTMLDivElement>(null);
  const focoPendiente = useRef<string | null>(null);
  const temporizador = useRef<number>(undefined);

  useTituloDocumento(confirmado ? "Solicitud enviada · Rumbo" : modo === "interes" ? T_INTERES : T_POSTULAR);

  // Al hidratar: zona horaria detectada, confirmación ya enviada, borrador y ?area= / ?apoyo=.
  const { search } = useLocation();
  useEffect(() => {
    try {
      setZona(Intl.DateTimeFormat().resolvedOptions().timeZone || null);
    } catch {
      setZona(null);
    }
    if (!conBorrador) return;
    const enviada = leer(CLAVE_ENVIADA) as DatosConfirmacion | null;
    if (enviada) {
      setConfirmado({ ...enviada, yaEnviada: true });
      return;
    }
    let datos = VACIO;
    let ext = EXTRAS_VACIOS;
    const borrador = leer(CLAVE_BORRADOR) as { datos?: Partial<DatosPostular>; extras?: Partial<Extras> } | null;
    if (borrador?.datos) {
      // La autorización nunca vuelve marcada.
      datos = { ...VACIO, ...borrador.datos, autorizacion: false };
      ext = { ...EXTRAS_VACIOS, ...borrador.extras, trampa: "" };
      setRestaurado(true);
    }
    const q = new URLSearchParams(search);
    const area = AREA_POR_PARAM[q.get("area") ?? ""];
    const apoyo = APOYO_POR_PARAM[q.get("apoyo") ?? ""];
    if (area && !datos.area) datos = { ...datos, area };
    if (apoyo && !datos.apoyo) datos = { ...datos, apoyo };
    if (apoyo && apoyo !== "nose") setDesdePlanes(planes.find((p) => p.param === apoyo)?.nombre ?? null);
    if (area && esAreaMasAdelante(area)) setOtrasAbiertas(true);
    if (datos !== VACIO) f.reiniciar(datos);
    setExtras(ext);
    // Solo al montar: la preselección no se repite al navegar dentro de la página.
  }, []);

  // Borrador con 500 ms de retardo (sin la autorización ni el campo trampa).
  useEffect(() => {
    if (!conBorrador || !editado.current || confirmado) return;
    const t = window.setTimeout(() => {
      const { autorizacion: _a, ...datos } = v;
      const { trampa: _t, ...resto } = extras;
      escribir(CLAVE_BORRADOR, { datos, extras: resto });
    }, 500);
    return () => window.clearTimeout(t);
  }, [v, extras, conBorrador, confirmado]);

  // Foco: al resumen tras enviar con errores; a la opción elegida si el modo cambió; al H1.
  useEffect(() => {
    if (intento) resumenRef.current?.focus();
  }, [intento]);
  useEffect(() => {
    if (!focoPendiente.current) return;
    document.getElementById(focoPendiente.current)?.focus();
    focoPendiente.current = null;
  });
  useEffect(() => {
    if (focoTitulo) titulo.current?.focus();
  }, [focoTitulo]);
  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  const cambiar = <K extends keyof DatosPostular>(campo: K, valor: DatosPostular[K]) => {
    if (enviando) return;
    editado.current = true;
    f.cambiar(campo, valor);
  };
  const cambiarExtra = <K extends keyof Extras>(campo: K, valor: Extras[K]) => {
    if (enviando) return;
    editado.current = true;
    setExtras((x) => ({ ...x, [campo]: valor }));
  };
  const alternar = (campo: "dias" | "franjas", valor: string) =>
    cambiarExtra(campo, extras[campo].includes(valor) ? extras[campo].filter((x) => x !== valor) : [...extras[campo], valor]);

  // Elegir un área. Si el modo cambia, el formulario se rearma: el foco vuelve a la misma
  // opción y una región role="status" anuncia el cambio (WCAG 3.2.2).
  const elegirArea = (valor: string) => {
    const antes = modoDe(v.area);
    const despues = modoDe(valor);
    cambiar("area", valor);
    if (antes === despues) return;
    focoPendiente.current = idArea(valor);
    setMostrarResumen(false);
    if (despues === "interes") {
      setListaAreas(false);
      setAnuncio(POSTULAR.area.cambioAInteres(nombreArea(valor)));
    } else setAnuncio("");
  };

  const volverASolicitud = () => {
    cambiar("area", "");
    setAnuncio("");
    setListaAreas(false);
    setMostrarResumen(false);
  };

  const empezarDeCero = () => {
    escribir(CLAVE_BORRADOR, null);
    editado.current = false;
    f.reiniciar(VACIO);
    setExtras(EXTRAS_VACIOS);
    setRestaurado(false);
    setMostrarResumen(false);
    setVerSugerencia(false);
    setDesdePlanes(null);
    setAnuncio("");
    setFocoTitulo((n) => n + 1);
  };

  const confirmar = (reapertura = false) => {
    const datos: DatosConfirmacion = {
      modo: modo === "solicitud" && !reapertura ? "solicitud" : "interes",
      nombre: v.nombre.trim(),
      correo: v.correo.trim().toLowerCase(),
      area: modo === "cerradas" || reapertura ? undefined : v.area,
    };
    if (conBorrador) {
      escribir(CLAVE_BORRADOR, null);
      escribir(CLAVE_ENVIADA, datos);
    }
    // Volver atrás no reenvía: la confirmación reemplaza la URL, sin parámetros.
    if (search) window.history.replaceState(window.history.state, "", window.location.pathname);
    setEnvio("inicial");
    setConfirmado(datos);
  };

  const enviar = () => {
    if (enviando) return;
    const errores = f.enviar();
    setMostrarResumen(errores.length > 0);
    if (errores.length) {
      setIntento((n) => n + 1);
      return;
    }
    if (!navigator.onLine) {
      setEnvio("sinConexion");
      return;
    }
    // Simulación sin red. La variante «error de red» falla una vez más (segundo fallo) y luego envía.
    // «Tope alcanzado al enviar»: el aviso sigue sobre el botón y el borrador se conserva.
    if (envio === "tope") return;
    setEnvio("enviando");
    const falla = estado === "error-red" && fallos < 2;
    temporizador.current = window.setTimeout(() => {
      if (falla) {
        setFallos((n) => n + 1);
        setEnvio("red2");
      } else confirmar();
    }, SIMULACION_MS);
  };

  const otraSolicitud = () => {
    escribir(CLAVE_ENVIADA, null);
    editado.current = false;
    f.reiniciar(VACIO);
    setExtras(EXTRAS_VACIOS);
    setMostrarResumen(false);
    setVerSugerencia(false);
    setAnuncio("");
    setConfirmado(null);
    setFocoTitulo((n) => n + 1);
  };

  if (confirmado) return <VistaConfirmacion datos={confirmado} onOtra={otraSolicitud} />;

  const areaElegida = areas.find((a) => a.id === v.area);
  const alerta =
    envio === "red" ? (
      E.red
    ) : envio === "red2" ? (
      <>
        <p>{E.red}</p>
        <p>{E.segundoFallo}</p>
      </>
    ) : envio === "sinConexion" ? (
      E.sinConexion
    ) : envio === "servidor" ? (
      E.servidor
    ) : envio === "limite" ? (
      E.limite
    ) : envio === "tope" ? (
      POSTULAR.cerradas.tope
    ) : null;
  // Tope alcanzado mientras escribía: crea el interés con los datos ya escritos, sin la meta (3.9).
  const accionAlerta =
    envio === "tope" ? (
      <p>
        <button
          type="button"
          className="boton boton--secundario"
          onClick={() => {
            const errores = f.enviar().filter((e) => e.id === "nombre" || e.id === "correo" || e.id === "mayor-edad" || e.id === "autorizacion");
            if (errores.length) {
              setMostrarResumen(true);
              setIntento((n) => n + 1);
              return;
            }
            confirmar(true);
          }}
        >
          {POSTULAR.cerradas.avisarme}
        </button>
      </p>
    ) : undefined;

  // ---- Área -----------------------------------------------------------------------------
  const opcionArea = (o: OpcionArea, masAdelante = false) => (
    <Opcion
      key={o.valor}
      id={idArea(o.valor)}
      name="area"
      value={o.valor}
      titulo={o.area.nombre}
      linea={masAdelante ? undefined : o.area.frase}
      extra={o.lineaExtra ? <span className="opcion__linea">{o.lineaExtra}</span> : undefined}
      etiquetas={
        masAdelante ? (
          <>
            <Etiqueta variante="pronto">{areaMasAdelante}</Etiqueta>
            {o.area.notaSeguridad && <Etiqueta variante="nota">{o.area.notaSeguridad}</Etiqueta>}
          </>
        ) : undefined
      }
      icono={o.area.icono}
      cat={o.area.categoria}
      masAdelante={masAdelante}
      checked={v.area === o.valor}
      onChange={() => elegirArea(o.valor)}
    />
  );

  const grupoAreaCompleto = (
    <GrupoOpciones
      id="area"
      leyenda={POSTULAR.area.leyenda}
      ayuda={POSTULAR.area.ayuda}
      error={f.errores.area}
      columnas={2}
      despues={
        <div className="acordeon acordeon--compacto vf-otras">
          <details open={otrasAbiertas} onToggle={(e) => setOtrasAbiertas(e.currentTarget.open)}>
            <summary>
              <span>{POSTULAR.area.otraArea}</span>
              <span className="acordeon-indicador" aria-hidden="true" />
            </summary>
            <div className="acordeon-respuesta vf-otras__cuerpo">
              <p>{POSTULAR.area.otraAreaTexto}</p>
              <div className="grupo-opciones__lista grupo-opciones__lista--2">
                {opcionesAreaMasAdelante.map((o) => opcionArea(o, true))}
              </div>
            </div>
          </details>
        </div>
      }
    >
      {opcionesArea.map((o) => opcionArea(o))}
    </GrupoOpciones>
  );

  // Interés: la tarjeta elegida y «Cambiar área», que reabre la lista completa.
  const elegidaInteres = opcionesAreaMasAdelante.find((o) => o.valor === v.area);
  const grupoAreaInteres =
    listaAreas || !elegidaInteres ? (
      grupoAreaCompleto
    ) : (
      <GrupoOpciones
        id="area"
        leyenda={POSTULAR.area.leyenda}
        error={f.errores.area}
        despues={
          <p>
            <button
              type="button"
              className="boton boton--terciario vf-cambiar-area"
              onClick={() => {
                setListaAreas(true);
                setOtrasAbiertas(true);
                focoPendiente.current = idArea(v.area);
              }}
            >
              {POSTULAR.interes.cambiarArea}
            </button>
          </p>
        }
      >
        {opcionArea(elegidaInteres, true)}
      </GrupoOpciones>
    );

  // ---- Campos comunes ---------------------------------------------------------------------
  const campoNombre = (
    <CampoTexto
      id="nombre"
      etiqueta={NOMBRE.etiqueta}
      ayuda={NOMBRE.ayuda}
      error={f.errores.nombre}
      {...NOMBRE.atributos}
      value={v.nombre}
      readOnly={enviando}
      onChange={(e) => cambiar("nombre", e.target.value)}
      onBlur={() => f.salir("nombre")}
    />
  );
  const campoCorreo = (
    <CampoTexto
      id="correo"
      etiqueta={CORREO.etiqueta}
      ayuda={modo === "cerradas" ? POSTULAR.cerradas.correoAyuda : modo === "interes" ? CORREO.ayudaInteres : CORREO.ayuda}
      error={f.errores.correo}
      {...CORREO.atributos}
      value={v.correo}
      readOnly={enviando}
      onChange={(e) => cambiar("correo", e.target.value)}
      onBlur={() => {
        f.salir("correo");
        if (v.correo.trim()) setVerSugerencia(true);
      }}
      pie={
        <div className="vf-sugerencia">
          <p role="status">{sugerencia ? CORREO.sugerencia(sugerencia) : ""}</p>
          {sugerencia && (
            <button type="button" className="boton boton--terciario" onClick={() => cambiar("correo", sugerencia)}>
              {CORREO.usarSugerencia(sugerencia)}
            </button>
          )}
        </div>
      }
    />
  );
  const casillaEdad = (
    <Casilla id="mayor-edad" error={f.errores.mayorEdad} checked={v.mayorEdad} onChange={(e) => cambiar("mayorEdad", e.target.checked)}>
      {POSTULAR.mayorEdad.etiqueta}
    </Casilla>
  );
  const textoAutorizacion =
    modo === "cerradas" ? POSTULAR.cerradas.autorizacion : interes ? POSTULAR.autorizacionInteres : POSTULAR.autorizacion;
  const casillaAutorizacion = (
    <Casilla
      id="autorizacion"
      error={f.errores.autorizacion}
      ayuda={interes ? undefined : POSTULAR.autorizacion.ayuda}
      checked={v.autorizacion}
      onChange={(e) => cambiar("autorizacion", e.target.checked)}
    >
      {textoAutorizacion.antes}
      <Link to="/privacidad/">{textoAutorizacion.enlace}</Link>
      {textoAutorizacion.despues}
    </Casilla>
  );

  const ejemplo = POSTULAR.meta.ejemplos[v.area] ?? POSTULAR.meta.ejemplos.abierta;
  const fueraDeChile = zona !== null && !ZONAS_CHILE.includes(zona);
  const conDatosDeEjemplo = estado === "errores" || estado === "borrador" || CON_DATOS.has(estado);

  // ---- Encabezado ---------------------------------------------------------------------------
  const encabezado =
    modo === "cerradas" ? (
      <div className="encabezado vf-encabezado">
        <p className="ojo">{POSTULAR.cerradas.ojo}</p>
        <h1 ref={titulo} tabIndex={-1}>
          {POSTULAR.cerradas.titulo}
        </h1>
        <p className="bajada">{estado === "cerradas-tope" ? POSTULAR.cerradas.tope : POSTULAR.cerradas.porDiego}</p>
        <p className="formulario__aviso">{TEXTOS_FORM.avisoObligatorios}</p>
      </div>
    ) : modo === "interes" ? (
      <div className="encabezado vf-encabezado">
        <p className="ojo">{POSTULAR.interes.ojo}</p>
        <h1 ref={titulo} tabIndex={-1}>
          {POSTULAR.interes.titulo(areaElegida?.nombre ?? "")}
        </h1>
        <p className="vf-etiquetas">
          <Etiqueta variante="pronto">{areaMasAdelante}</Etiqueta>
          {areaElegida?.notaSeguridad && <Etiqueta variante="nota">{areaElegida.notaSeguridad}</Etiqueta>}
        </p>
        <p className="bajada">{POSTULAR.interes.bajada}</p>
        <p>
          <Link to={RUTAS_PUBLICAS.postular} className="enlace-flecha" onClick={volverASolicitud}>
            <span>
              {POSTULAR.interes.volver.slice(0, POSTULAR.interes.volver.lastIndexOf(" ") + 1)}
              <span className="nowrap">
                {POSTULAR.interes.volver.slice(POSTULAR.interes.volver.lastIndexOf(" ") + 1)}
                <Icono nombre="arrow-right" tamaño={16} />
              </span>
            </span>
          </Link>
        </p>
        <p className="formulario__aviso">{TEXTOS_FORM.avisoObligatorios}</p>
      </div>
    ) : (
      <div className="encabezado vf-encabezado">
        <p className="ojo">{POSTULAR.encabezado.ojo}</p>
        <h1 ref={titulo} tabIndex={-1}>
          {POSTULAR.encabezado.titulo.antes}
          <em>{POSTULAR.encabezado.titulo.cursiva}</em>
        </h1>
        <p className="bajada">{POSTULAR.encabezado.bajada}</p>
        <ListaCheck items={[...POSTULAR.encabezado.tranquilidades]} enLinea />
        <p className="formulario__aviso">{TEXTOS_FORM.avisoObligatorios}</p>
      </div>
    );

  return (
    <PaginaConAside aside={<AsideAyuda pasos={modo === "solicitud" ? pasosAntesDeEnviar(plazo) : undefined} sinPrograma={modo !== "solicitud"} />} className="vf-postular">
      <noscript>
        <div className="aviso vf-noscript">
          <p>
            {E.noscript}
            {E.noscriptCorreo ? ` ${E.noscriptCorreo}` : ""}
          </p>
        </div>
      </noscript>
      {encabezado}

      {ausencia && modo === "solicitud" && (
        <Aviso icono="info" className="vf-ausencia">
          <p>{POSTULAR.encabezado.ausencia(AUSENCIA_POSTULAR.texto, AUSENCIA_POSTULAR.hasta, AUSENCIA_POSTULAR.fecha)}</p>
          <p>
            <EtiquetaEjemplo />
          </p>
        </Aviso>
      )}
      {restaurado && (
        <Aviso icono="info" className="vf-restaurado">
          <p>{POSTULAR.borrador.recuperado}</p>
          <p>
            <button type="button" className="boton boton--terciario" onClick={empezarDeCero}>
              {POSTULAR.borrador.empezarDeCero}
            </button>
          </p>
        </Aviso>
      )}
      {conDatosDeEjemplo && (
        <p className="vf-ejemplo-nota">
          <EtiquetaEjemplo ilustrativo />
        </p>
      )}
      <p role="status" className="vf-anuncio">
        {anuncio}
      </p>
      <ResumenErrores errores={resumen} ref={resumenRef} />

      <Formulario onSubmit={enviar} enviando={enviando}>
        {modo === "solicitud" ? (
          <>
            <BloqueNumerado numero={1} total={3} titulo={POSTULAR.bloques[0].titulo} bajada={POSTULAR.bloques[0].bajada}>
              {grupoAreaCompleto}
              <div className="vf-campo-libre">
                <CampoArea
                  id="meta"
                  etiqueta={POSTULAR.meta.etiqueta}
                  ayuda={
                    <>
                      <p>{POSTULAR.meta.ayuda}</p>
                      <Etiqueta variante="ejemplo">{areaEjemplo}</Etiqueta>
                      <p className="vf-ejemplo-texto">{ejemplo}</p>
                    </>
                  }
                  error={f.errores.meta}
                  min={LIMITES.meta.min}
                  max={LIMITES.meta.max}
                  value={v.meta}
                  readOnly={enviando}
                  onChange={(e) => cambiar("meta", e.target.value)}
                  onBlur={() => f.salir("meta")}
                />
                <AvisoAyuda />
              </div>
            </BloqueNumerado>

            <BloqueNumerado numero={2} total={3} titulo={POSTULAR.bloques[1].titulo} bajada={POSTULAR.bloques[1].bajada}>
              {desdePlanes && (
                <p className="vf-etiquetas">
                  <Etiqueta variante="nota">{POSTULAR.apoyo.elegisteDesdePlanes(desdePlanes)}</Etiqueta>
                </p>
              )}
              <div className="vf-apoyo">
                <GrupoOpciones id="apoyo" leyenda={POSTULAR.apoyo.leyenda} error={f.errores.apoyo}>
                  {opcionesApoyo.map((o) => (
                    <Opcion
                      key={o.valor}
                      id={`apoyo-${o.valor}`}
                      name="apoyo"
                      value={o.valor}
                      titulo={o.titulo}
                      // Orden de 3.6: título · etiqueta · para quién · precio.
                      etiquetas={o.etiqueta ? <Etiqueta variante="nota">{o.etiqueta}</Etiqueta> : undefined}
                      extra={
                        <>
                          <span className="opcion__linea">{o.linea}</span>
                          {o.precio && <span className="vf-precio">{o.precio}</span>}
                        </>
                      }
                      checked={v.apoyo === o.valor}
                      onChange={() => cambiar("apoyo", o.valor)}
                    />
                  ))}
                </GrupoOpciones>
                <div className="vf-nota-precio">
                  <p>{notaPrecio()}</p>
                  {fueraDeChile && <p>{POSTULAR.apoyo.fueraDeChile}</p>}
                  <p>
                    <Link to="/#planes" className="enlace-util">
                      <span>{POSTULAR.apoyo.verPlanes}</span>
                    </Link>
                  </p>
                </div>
              </div>

              <GrupoOpciones
                id="horarios"
                tipo="checkbox"
                leyenda={sinOpcional(POSTULAR.horarios.leyenda)}
                opcional
                ayuda={POSTULAR.horarios.ayuda}
                columnas="fila"
                despues={
                  <>
                    <div className="grupo-opciones__lista grupo-opciones__lista--fila">
                      {POSTULAR.horarios.franjas.map((fr) => (
                        <Opcion
                          key={fr.valor}
                          tipo="checkbox"
                          chica
                          name="franjas"
                          value={fr.valor}
                          titulo={fr.texto}
                          checked={extras.franjas.includes(fr.valor)}
                          onChange={() => alternar("franjas", fr.valor)}
                        />
                      ))}
                    </div>
                    {zona && (
                      <p className="vf-nota">
                        {fueraDeChile ? POSTULAR.horarios.zonaOtra(zona) : POSTULAR.horarios.zonaChile}
                      </p>
                    )}
                  </>
                }
              >
                {POSTULAR.horarios.dias.map((d) => (
                  <Opcion
                    key={d}
                    tipo="checkbox"
                    chica
                    name="dias"
                    value={d}
                    titulo={d}
                    checked={extras.dias.includes(d)}
                    onChange={() => alternar("dias", d)}
                  />
                ))}
              </GrupoOpciones>
              <CampoTexto
                id="nota-horarios"
                etiqueta={sinOpcional(POSTULAR.horarios.nota.etiqueta)}
                opcional
                maxLength={POSTULAR.horarios.nota.max}
                value={extras.notaHorarios}
                readOnly={enviando}
                onChange={(e) => cambiarExtra("notaHorarios", e.target.value)}
              />
            </BloqueNumerado>

            <BloqueNumerado numero={3} total={3} titulo={POSTULAR.bloques[2].titulo} bajada={POSTULAR.bloques[2].bajada}>
              {campoNombre}
              {campoCorreo}
              <div className="vf-casillas">
                {casillaEdad}
                {casillaAutorizacion}
                <Casilla id="avisos" opcional checked={extras.avisos} onChange={(e) => cambiarExtra("avisos", e.target.checked)}>
                  {POSTULAR.avisos.etiqueta}
                </Casilla>
              </div>
            </BloqueNumerado>
          </>
        ) : (
          <>
            {modo === "interes" && grupoAreaInteres}
            {campoNombre}
            {campoCorreo}
            <div className="vf-casillas">
              {casillaEdad}
              {casillaAutorizacion}
            </div>
          </>
        )}
        <CampoTrampa valor={extras.trampa} onCambio={(t) => cambiarExtra("trampa", t)} />
        <Envio
          texto={
            envio === "red" || envio === "red2" || envio === "servidor" || envio === "limite"
              ? E.reintentar
              : interes
                ? POSTULAR.interes.boton
                : POSTULAR.envio.boton
          }
          textoEnviando={E.enviando}
          anuncioEnviando={E.anuncioEnviando}
          enviando={enviando}
          alerta={alerta}
          accionAlerta={accionAlerta}
          frases={
            modo === "cerradas"
              ? [POSTULAR.cerradas.frase]
              : interes
                ? [POSTULAR.interes.frase]
                : [POSTULAR.envio.frase, ...(plazo ? [POSTULAR.envio.conPlazo(plazo)] : [])]
          }
        />
      </Formulario>
    </PaginaConAside>
  );
}

const areaMasAdelante = estados.masAdelante.texto;
const areaEjemplo = estados.ejemplo.texto;
