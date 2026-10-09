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

type PropsPedir = { aviso?: string; alPedir?: (correo: string, compartido: boolean) => Promise<ResultadoPedir> };

export function PedirCodigo({ aviso, alPedir }: PropsPedir) {
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
  const campo = useRef<HTMLInputElement>(null);
  const temporizador = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  return (
    <div className="me-pantalla me-ingreso">
      <Cabeza ojo={ENTRAR.ojo} titulo={ENTRAR.titulo} tamaño="titulo" bajada={ENTRAR.bajada} />
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
        <Envio className="me-envio-ancho" texto={ENTRAR.boton} textoEnviando={ENTRAR.enviando} enviando={enviando} alerta={alerta} />
      </Formulario>

      <div className="me-ingreso__notas">
        <p>
          {ENTRAR.nota.antes}
          <Link to={R.postular}>{ENTRAR.nota.enlace}</Link>
          {ENTRAR.nota.despues}
        </p>
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
              {REVISA_CORREO.texto("\u0000")
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
