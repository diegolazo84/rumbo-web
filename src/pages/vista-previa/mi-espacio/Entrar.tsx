// Vista previa · ingreso (plataforma 4.2). Estados: correo (4.2.1), revisa-correo (4.2.2),
// enlace-vencido (4.2.3) y, sobre «Entrar», las tostadas de sesion-terminada y saliste (4.2.5).
// Marco «ingreso»: cabecera sin navegación.
//
// Sin backend: «Enviarme el código» valida el formato, simula el envío y pasa a «Revisa tu
// correo» con el correo escrito (en el estado de la navegación, nunca en la URL). La pantalla
// responde siempre igual, exista o no el correo. En «Revisa tu correo», cualquier código de
// 6 dígitos entra a Hoy; otro texto muestra «Ese código no coincide».
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Aviso } from "../../../components/Bloques";
import { Icono, Tostada } from "../../../components/app";
import { CampoTexto, Casilla, Envio, Formulario } from "../../../components/form";
import { participante } from "../../../data/ejemplo-app";
import { operacion } from "../../../data/rumbo";
import { ENLACE_VENCIDO, ENTRAR, LIMITES, REVISA_CORREO } from "../../../data/formularios";
import type { PropsPantalla } from "../registro";
import { Cabeza, EtiquetaEjemplo, useEspacio } from "./comun";

// Remitente de ejemplo: el real depende de la decisión del correo (plataforma 9.2).
const REMITENTE_EJEMPLO = "acceso@ejemplo.cl";
const ESPERA_REENVIO = 60_000; // 60 s con aria-disabled, sin cuenta regresiva visible
const RETARDO_ENVIO = 700;

const correoValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

// 4.2.5 Sesión
export const SESION = {
  terminada: "Tu sesión terminó. Vuelve a entrar con tu correo.",
  saliste: "Saliste de Mi espacio en este dispositivo.",
  cerrar: "Cerrar",
} as const;

export default function Entrar({ estado = "correo" }: PropsPantalla) {
  if (estado === "revisa-correo") return <RevisaCorreo />;
  if (estado === "enlace-vencido") return <EnlaceVencido />;
  if (estado === "sesion-terminada") return <PedirCodigo aviso={SESION.terminada} />;
  if (estado === "saliste") return <PedirCodigo aviso={SESION.saliste} />;
  return <PedirCodigo />;
}

// ---------------------------------------------------------------------------
// 4.2.1 «Entrar»

// Mi espacio real (src/pages/plataforma/EntrarReal.tsx) pasa las funciones que hablan con
// Supabase Auth; sin ellas, la pantalla simula el envío (vista previa).
export type ResultadoPedir = "ok" | "limite" | "red";
export type ResultadoVerificar = "ok" | "noCoincide" | "vencido" | "red";
// Estado de la navegación entre «Entrar» y «Revisa tu correo» (nunca en la URL).
export type EstadoIngreso = { correo?: string; compartido?: boolean; enviado?: boolean; aviso?: string; destino?: string } | null;

type PropsPedir = {
  aviso?: string;
  alPedir?: (correo: string, compartido: boolean) => Promise<ResultadoPedir>;
  // Con Google: solo cuando el proveedor está activo en Supabase (operacion.ingresoGoogle).
  // Devuelve "red" si no se pudo abrir Google; si se abre, el navegador sale de la página.
  alGoogle?: (compartido: boolean) => Promise<"red" | "ok">;
  // Cuenta gratis abierta: dos caminos al llegar («Ya tengo cuenta» / «Crear cuenta gratis»).
  // Técnicamente es lo mismo (sin contraseña, el código o Google crean la cuenta si no existe):
  // cambian los textos para que cada persona sepa dónde está.
  conCuentaGratis?: boolean;
};

// Logo oficial de Google para el botón de ingreso (pautas de marca de Google Identity).
function LogoGoogle() {
  return (
    <svg className="me-google__logo" viewBox="0 0 48 48" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function PedirCodigo({ aviso, alPedir, alGoogle, conCuentaGratis }: PropsPedir) {
  const { R } = useEspacio();
  const [tostada, setTostada] = useState<string | null>(aviso ?? null);
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const estadoNav = ubicacion.state as EstadoIngreso;
  const anterior = estadoNav?.correo ?? "";
  const [alerta, setAlerta] = useState<string | null>(null);
  const [correo, setCorreo] = useState(anterior);
  const [compartido, setCompartido] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [abriendoGoogle, setAbriendoGoogle] = useState(false);
  const [modo, setModo] = useState<"entrar" | "crear">("entrar");
  // ?crear=1 abre directo «Crear cuenta gratis» (enlaces desde la portada). Se lee al hidratar.
  useEffect(() => {
    if (conCuentaGratis && new URLSearchParams(window.location.search).get("crear") === "1") setModo("crear");
  }, [conCuentaGratis]);
  const crear = conCuentaGratis && modo === "crear";
  const titulo = crear ? ENTRAR.crear.titulo : ENTRAR.titulo;
  const bajada = crear ? ENTRAR.crear.bajada : conCuentaGratis ? ENTRAR.entrarAbierto.bajada : alGoogle ? ENTRAR.bajadaGoogle : ENTRAR.bajada;
  const campo = useRef<HTMLInputElement>(null);
  const temporizador = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  return (
    <div className="me-pantalla me-ingreso">
      {conCuentaGratis && (
        <div className="me-modos" role="group" aria-label={ENTRAR.modos.leyenda}>
          {(["entrar", "crear"] as const).map((m) => (
            <button key={m} type="button" className="me-modos__boton" aria-pressed={modo === m} onClick={() => setModo(m)}>
              {ENTRAR.modos[m]}
            </button>
          ))}
        </div>
      )}
      <Cabeza ojo={ENTRAR.ojo} titulo={titulo} tamaño="titulo" bajada={bajada} />
      {alGoogle && (
        <div className="me-google">
          <button
            type="button"
            className="me-google__boton"
            disabled={abriendoGoogle}
            aria-busy={abriendoGoogle || undefined}
            onClick={() => {
              setAlerta(null);
              setAbriendoGoogle(true);
              alGoogle(compartido).then((r) => {
                if (r === "red") {
                  setAbriendoGoogle(false);
                  setAlerta(ENTRAR.errores.google);
                }
              });
            }}
          >
            <LogoGoogle />
            <span>{abriendoGoogle ? ENTRAR.google.abriendo : crear ? ENTRAR.crear.google : ENTRAR.google.boton}</span>
          </button>
          <p className="me-google__o" aria-hidden="true">
            <span>{ENTRAR.google.separador}</span>
          </p>
        </div>
      )}
      <Formulario
        className="me-ingreso__form"
        enviando={enviando}
        onSubmit={() => {
          if (enviando) return;
          if (!correoValido(correo)) {
            setError(ENTRAR.errores.formato);
            campo.current?.focus();
            return;
          }
          setError(null);
          setAlerta(null);
          setEnviando(true);
          const siguiente = () =>
            navegar(R.revisaCorreo, { state: { correo: correo.trim(), compartido, enviado: true, destino: estadoNav?.destino } });
          if (!alPedir) {
            temporizador.current = window.setTimeout(siguiente, RETARDO_ENVIO);
            return;
          }
          alPedir(correo.trim(), compartido).then((r) => {
            setEnviando(false);
            if (r === "ok") return siguiente();
            setAlerta(r === "limite" ? ENTRAR.errores.limite : ENTRAR.errores.red);
          });
        }}
      >
        <CampoTexto
          id="entrar-correo"
          ref={campo}
          etiqueta={ENTRAR.correo.etiqueta}
          ayuda={ENTRAR.ayudaCodigo}
          {...ENTRAR.correo.atributos}
          spellCheck={false}
          autoCapitalize="none"
          value={correo}
          error={error}
          onChange={(e) => {
            setCorreo(e.target.value);
            if (error && correoValido(e.target.value)) setError(null);
          }}
        />
        <Casilla
          id="entrar-compartido"
          opcional
          ayuda={ENTRAR.compartido.ayuda}
          checked={compartido}
          onChange={(e) => setCompartido(e.target.checked)}
        >
          {ENTRAR.compartido.etiqueta}
        </Casilla>
        <Envio className="me-envio-ancho" texto={crear ? ENTRAR.crear.boton : ENTRAR.boton} textoEnviando={ENTRAR.enviando} enviando={enviando} alerta={alerta} />
      </Formulario>

      <div className="me-ingreso__notas">
        {crear ? (
          <p>
            {ENTRAR.crear.nota}
            <Link to={R.postular}>{ENTRAR.crear.notaEnlace}</Link>.
          </p>
        ) : conCuentaGratis ? (
          <p>
            {ENTRAR.entrarAbierto.nota}
            <button type="button" className="me-ingreso__enlace" onClick={() => setModo("crear")}>
              {ENTRAR.entrarAbierto.notaBoton}
            </button>
            .
          </p>
        ) : (
          <p>
            {ENTRAR.nota.antes}
            <Link to={R.postular}>{ENTRAR.nota.enlace}</Link>
            {ENTRAR.nota.despues}
          </p>
        )}
        <p>{ENTRAR.nota2}</p>
      </div>
      <Aviso icono="lock">{ENTRAR.avisoLock}</Aviso>
      {aviso && <Tostada mensaje={tostada} onCerrar={() => setTostada(null)} textoCerrar={SESION.cerrar} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4.2.2 «Revisa tu correo»

type PropsRevisa = {
  alVerificar?: (correo: string, codigo: string) => Promise<ResultadoVerificar>;
  alReenviar?: (correo: string) => Promise<ResultadoPedir>;
  remitente?: string | null; // null: el texto va sin remitente (Mi espacio real, mientras no se fije)
};

export function RevisaCorreo({ alVerificar, alReenviar, remitente = REMITENTE_EJEMPLO }: PropsRevisa) {
  const { R } = useEspacio();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const estadoNav = ubicacion.state as EstadoIngreso;
  const correo = estadoNav?.correo ?? participante.correo;
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const temporizadores = useRef<number[]>([]);
  useEffect(() => () => temporizadores.current.forEach((t) => window.clearTimeout(t)), []);
  const largo = LIMITES.codigo.largo;

  return (
    <div className="me-pantalla me-ingreso">
      <Cabeza
        titulo={REVISA_CORREO.titulo}
        tamaño="titulo"
        antes={
          <span className="icono-mosaico me-ingreso__mosaico" aria-hidden="true">
            <Icono nombre="mail" tamaño={24} />
          </span>
        }
        bajada={
          <>
            <p>
              {(operacion.cuentaGratis ? REVISA_CORREO.textoAbierto : REVISA_CORREO.texto)("\u0000")
                .split("\u0000")
                .flatMap((parte, i) => (i === 0 ? [parte] : [<strong key="correo" className="me-ingreso__correo">{correo}</strong>, parte]))}
            </p>
            <p>
              <Link to={R.entrar} state={{ correo, destino: estadoNav?.destino }} className="boton boton--terciario me-boton-izq">
                {REVISA_CORREO.cambiar}
              </Link>
            </p>
          </>
        }
      />

      <Formulario
        className="me-ingreso__form"
        enviando={enviando}
        onSubmit={() => {
          if (enviando) return;
          if (!new RegExp(`^\\d{${largo}}$`).test(codigo)) {
            setError(REVISA_CORREO.errores.noCoincide);
            campo.current?.focus();
            return;
          }
          setError(null);
          setEnviando(true);
          if (!alVerificar) {
            temporizadores.current.push(window.setTimeout(() => navegar(R.hoy), RETARDO_ENVIO));
            return;
          }
          alVerificar(correo, codigo).then((r) => {
            if (r === "ok") return; // la pantalla real navega
            setEnviando(false);
            setError(r === "vencido" ? REVISA_CORREO.errores.vencido : r === "red" ? ENTRAR.errores.red : REVISA_CORREO.errores.noCoincide);
            campo.current?.focus();
          });
        }}
      >
        <CampoTexto
          id="entrar-codigo"
          ref={campo}
          className="me-campo-codigo"
          etiqueta={REVISA_CORREO.codigo.etiqueta}
          {...REVISA_CORREO.codigo.atributos}
          pattern="[0-9]*"
          value={codigo}
          error={error}
          onPaste={(e) => {
            // maxlength=6 cortaría «123 456» antes de limpiarlo: el pegado se limpia aquí.
            const pegado = e.clipboardData.getData("text").replace(/\D/g, "");
            if (!pegado) return;
            e.preventDefault();
            setCodigo(pegado.slice(0, largo));
            if (error && pegado.length >= largo) setError(null);
          }}
          onChange={(e) => {
            // Admite escribir con espacios o guiones: se quedan solo los dígitos.
            const limpio = e.target.value.replace(/\D/g, "").slice(0, largo);
            setCodigo(limpio);
            if (error && limpio.length === largo) setError(null);
          }}
        />
        <Envio className="me-envio-ancho" texto={REVISA_CORREO.boton} enviando={enviando} />
        <p className="microcopia">{REVISA_CORREO.ayuda}</p>
      </Formulario>

      <section className="me-ingreso__no-llego" aria-labelledby="no-llego">
        <div className="me-cabeza__fila">
          <h2 id="no-llego" className="me-h2">
            {REVISA_CORREO.noLlego.titulo}
          </h2>
          <EtiquetaEjemplo />
        </div>
        <p>{remitente ? REVISA_CORREO.noLlego.texto(remitente) : REVISA_CORREO.noLlego.textoSinRemitente}</p>
        <div className="me-ingreso__reenvio">
          <button
            type="button"
            className="boton boton--secundario"
            aria-disabled={espera ? true : undefined}
            aria-describedby={espera ? "reenvio-espera" : undefined}
            onClick={() => {
              if (espera) return;
              setEspera(true);
              void alReenviar?.(correo);
              temporizadores.current.push(window.setTimeout(() => setEspera(false), ESPERA_REENVIO));
            }}
          >
            {REVISA_CORREO.noLlego.boton}
          </button>
          <p id="reenvio-espera" className="microcopia" role="status">
            {espera ? REVISA_CORREO.noLlego.espera : ""}
          </p>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4.2.3 Enlace vencido o ya usado

export function EnlaceVencido() {
  const { R } = useEspacio();
  return (
    <div className="me-pantalla me-ingreso">
      <Cabeza
        titulo={ENLACE_VENCIDO.titulo}
        tamaño="titulo"
        antes={
          <span className="icono-mosaico me-ingreso__mosaico" aria-hidden="true">
            <Icono nombre="mail" tamaño={24} />
          </span>
        }
        bajada={ENLACE_VENCIDO.texto}
      />
      <p>
        <Link to={R.entrar} className="boton boton--primario me-boton-ancho">
          {ENLACE_VENCIDO.boton}
        </Link>
      </p>
    </div>
  );
}
