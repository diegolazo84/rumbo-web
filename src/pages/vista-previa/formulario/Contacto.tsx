// Vista previa · contacto (/contacto/, plataforma 3.15): motivo (con ?motivo= y la ayuda de «Mis
// datos personales»), nombre opcional, correo con sugerencia de tipeo, mensaje con contador y
// aviso de ayuda, resumen de errores y confirmación. La validación funciona de verdad; el envío
// se simula sin red.
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Aviso } from "../../../components/Bloques";
import {
  AvisoAyuda,
  CampoArea,
  CampoTexto,
  CampoTrampa,
  Envio,
  Formulario,
  GrupoOpciones,
  Opcion,
  ResumenErrores,
} from "../../../components/form";
import { Icono } from "../../../components/app";
import {
  AVISO_AYUDA,
  CONTACTO,
  CORREO,
  LIMITES,
  MOTIVOS_CONTACTO,
  TEXTOS_FORM,
  estadosEnvio,
  sugerirCorreo,
  validarContacto,
  type DatosContacto,
} from "../../../data/formularios";
import { operacion } from "../../../data/rumbo";
import type { PropsPantalla } from "../registro";
import { AsideAyuda, EtiquetaEjemplo, PaginaConAside, resumir, useFormularioPrevia } from "./comunes";
import { SOLICITUD } from "./ejemplo";

const VACIO: DatosContacto = { motivo: "", nombre: "", correo: "", mensaje: "" };
// Variante «con errores al enviar»: sin motivo, un correo incompleto y un mensaje muy corto.
const CON_ERRORES: DatosContacto = { motivo: "", nombre: "", correo: "camila@ejemplo", mensaje: "Hola." };
const SIMULACION_MS = 1200;
const E = estadosEnvio("mensaje", CONTACTO.boton);
const sinOpcional = (texto: string) => texto.replace(/ \(opcional\)$/, "");

type Confirmado = { correo: string; motivo: string; ejemplo?: boolean };

function inicialDe(estado: string): DatosContacto {
  if (estado === "errores") return CON_ERRORES;
  if (estado === "datos-personales") return { ...VACIO, motivo: "datos" };
  return VACIO;
}

// «Si es una urgencia, no escribas aquí. … Más líneas en Ayuda inmediata.» con el enlace.
function AvisoUrgencia() {
  const u = CONTACTO.urgencia;
  const [antes, despues] = u.despues.split(TEXTOS_FORM.ayudaInmediata);
  return (
    <Aviso icono="phone" className="vf-urgencia">
      <p>
        {u.antes}
        <strong>{u.numero4141}</strong>
        {u.medio}
        <strong>
          {AVISO_AYUDA.tel131 ? <a href={AVISO_AYUDA.tel131}>{u.numero131}</a> : u.numero131}
        </strong>
        {antes}
        <Link to="/ayuda/">{TEXTOS_FORM.ayudaInmediata}</Link>
        {despues}
      </p>
    </Aviso>
  );
}

function Confirmacion({ datos, onOtro }: { datos: Confirmado; onOtro: () => void }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  // Tras enviar, la confirmación aparece en la misma página: foco al H1 (no en la variante de ejemplo).
  useEffect(() => {
    if (!datos.ejemplo) titulo.current?.focus();
  }, [datos.ejemplo]);
  const c = CONTACTO.confirmacion;
  return (
    <PaginaConAside aside={<AsideAyuda actual="contacto" sinPrograma />} className="vf-contacto">
      <div className="encabezado vf-encabezado">
        <p className="ojo">{CONTACTO.encabezado.ojo}</p>
        <h1 ref={titulo} tabIndex={-1}>
          {c.titulo}
        </h1>
        <p className="bajada">{c.texto(datos.correo)}</p>
        {datos.motivo === "datos" && <p className="bajada">{c.datos}</p>}
        {datos.ejemplo && (
          <p className="vf-etiquetas">
            <EtiquetaEjemplo />
          </p>
        )}
        <div className="acciones">
          <Link to="/" className="boton boton--secundario">
            {c.volver}
          </Link>
          <button type="button" className="boton boton--terciario" onClick={onOtro}>
            {c.otro}
          </button>
        </div>
      </div>
    </PaginaConAside>
  );
}

export default function Contacto({ estado = "inicial" }: PropsPantalla) {
  const [confirmado, setConfirmado] = useState<Confirmado | null>(
    estado === "enviado" ? { correo: SOLICITUD.correo, motivo: "duda", ejemplo: true } : null,
  );
  const [enviando, setEnviando] = useState(false);
  const [sinConexion, setSinConexion] = useState(false);
  const f = useFormularioPrevia(inicialDe(estado), validarContacto, {
    erroresIniciales: estado === "errores" ? validarContacto(CON_ERRORES) : {},
    bloqueado: enviando,
  });
  const [mostrarResumen, setMostrarResumen] = useState(estado === "errores");
  const [intento, setIntento] = useState(0);
  const [verSugerencia, setVerSugerencia] = useState(false);
  const [trampa, setTrampa] = useState("");
  const [focoTitulo, setFocoTitulo] = useState(0);
  const resumenRef = useRef<HTMLDivElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const temporizador = useRef<number>(undefined);
  const v = f.valores;

  // ?motivo=duda|solicitud|datos|problema|otro (al hidratar; lo demás se ignora).
  const { search } = useLocation();
  useEffect(() => {
    if (estado !== "inicial") return;
    const motivo = new URLSearchParams(search).get("motivo") ?? "";
    if ((MOTIVOS_CONTACTO as readonly string[]).includes(motivo)) f.reiniciar({ ...VACIO, motivo });
    // Solo al montar.
  }, []);
  useEffect(() => {
    if (intento) resumenRef.current?.focus();
  }, [intento]);
  useEffect(() => {
    if (focoTitulo) titulo.current?.focus();
  }, [focoTitulo]);
  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  const otro = () => {
    f.reiniciar(VACIO);
    setMostrarResumen(false);
    setVerSugerencia(false);
    setConfirmado(null);
    setFocoTitulo((n) => n + 1);
  };

  if (confirmado) return <Confirmacion datos={confirmado} onOtro={otro} />;

  const resumen = mostrarResumen ? resumir(f.errores) : [];
  const sugerencia = verSugerencia ? sugerirCorreo(v.correo) : null;
  const conDatos = v.motivo === "datos";

  const enviar = () => {
    if (enviando) return;
    const errores = f.enviar();
    setMostrarResumen(errores.length > 0);
    if (errores.length) {
      setIntento((n) => n + 1);
      return;
    }
    if (!navigator.onLine) {
      setSinConexion(true);
      return;
    }
    setSinConexion(false);
    setEnviando(true);
    temporizador.current = window.setTimeout(() => {
      setEnviando(false);
      setConfirmado({ correo: v.correo.trim().toLowerCase(), motivo: v.motivo });
    }, SIMULACION_MS);
  };

  return (
    <PaginaConAside aside={<AsideAyuda actual="contacto" sinPrograma />} className="vf-contacto">
      <noscript>
        <div className="aviso vf-noscript">
          <p>
            {E.noscript}
            {E.noscriptCorreo ? ` ${E.noscriptCorreo}` : ""}
          </p>
        </div>
      </noscript>
      <div className="encabezado vf-encabezado">
        <p className="ojo">{CONTACTO.encabezado.ojo}</p>
        <h1 ref={titulo} tabIndex={-1}>
          {CONTACTO.encabezado.titulo}
        </h1>
        <p className="bajada">{CONTACTO.encabezado.bajada}</p>
        {operacion.correo && <p>{CONTACTO.encabezado.correoDirecto(operacion.correo)}</p>}
      </div>
      <AvisoUrgencia />
      {estado === "errores" && (
        <p className="vf-ejemplo-nota">
          <EtiquetaEjemplo ilustrativo />
        </p>
      )}
      <ResumenErrores errores={resumen} ref={resumenRef} />

      <Formulario onSubmit={enviar} enviando={enviando} avisoObligatorios>
        <GrupoOpciones
          id="motivo"
          leyenda={CONTACTO.motivo.leyenda}
          error={f.errores.motivo}
          despues={
            conDatos ? (
              <p id="ayuda-motivo-datos" className="campo__ayuda vf-ayuda-datos">
                {CONTACTO.motivo.ayudaDatos}
              </p>
            ) : undefined
          }
        >
          {CONTACTO.motivo.opciones.map((o) => (
            <Opcion
              key={o.valor}
              id={`motivo-${o.valor}`}
              name="motivo"
              value={o.valor}
              titulo={o.texto}
              describedBy={o.valor === "datos" && conDatos ? "ayuda-motivo-datos" : undefined}
              checked={v.motivo === o.valor}
              onChange={() => f.cambiar("motivo", o.valor)}
            />
          ))}
        </GrupoOpciones>
        <CampoTexto
          id="nombre"
          etiqueta={sinOpcional(CONTACTO.nombre.etiqueta)}
          opcional
          autoComplete="given-name"
          autoCapitalize="words"
          spellCheck={false}
          maxLength={CONTACTO.nombre.max}
          value={v.nombre}
          readOnly={enviando}
          onChange={(e) => f.cambiar("nombre", e.target.value)}
        />
        <CampoTexto
          id="correo"
          etiqueta={CONTACTO.correo.etiqueta}
          ayuda={CONTACTO.correo.ayuda}
          error={f.errores.correo}
          {...CORREO.atributos}
          value={v.correo}
          readOnly={enviando}
          onChange={(e) => f.cambiar("correo", e.target.value)}
          onBlur={() => {
            f.salir("correo");
            if (v.correo.trim()) setVerSugerencia(true);
          }}
          pie={
            <div className="vf-sugerencia">
              <p role="status">{sugerencia ? CORREO.sugerencia(sugerencia) : ""}</p>
              {sugerencia && (
                <button type="button" className="boton boton--terciario" onClick={() => f.cambiar("correo", sugerencia)}>
                  {CORREO.usarSugerencia(sugerencia)}
                </button>
              )}
            </div>
          }
        />
        <div className="vf-campo-libre">
          <CampoArea
            id="mensaje"
            etiqueta={CONTACTO.mensaje.etiqueta}
            ayuda={CONTACTO.mensaje.ayuda}
            error={f.errores.mensaje}
            min={LIMITES.mensajeContacto.min}
            max={LIMITES.mensajeContacto.max}
            value={v.mensaje}
            readOnly={enviando}
            onChange={(e) => f.cambiar("mensaje", e.target.value)}
            onBlur={() => f.salir("mensaje")}
          />
          <AvisoAyuda />
        </div>
        <p className="vf-informacion">
          <Icono nombre="lock" tamaño={16} />
          <span>
            {CONTACTO.informacion.antes}
            <Link to="/privacidad/">{CONTACTO.informacion.enlace}</Link>
            {CONTACTO.informacion.despues}
          </span>
        </p>
        <CampoTrampa valor={trampa} onCambio={setTrampa} />
        <Envio
          texto={CONTACTO.boton}
          textoEnviando={E.enviando}
          anuncioEnviando={E.anuncioEnviando}
          enviando={enviando}
          alerta={sinConexion ? E.sinConexion : null}
          frases={[TEXTOS_FORM.noEsChat]}
        />
      </Formulario>
    </PaginaConAside>
  );
}
