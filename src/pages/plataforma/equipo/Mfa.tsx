// Segundo factor del panel (plataforma 5.12 y 9.7): sin aal2 las políticas no muestran nada.
// - Con un factor TOTP verificado: pide el código y sube la sesión a aal2.
// - Sin factores: registra uno (código QR y clave para escribirla a mano) y lo verifica.
// - Desde Más: registrar el segundo factor (deben ser 2).
// Nunca se registra en consola un código, una clave ni un token.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icono } from "../../../components/app";
import { CampoTexto } from "../../../components/form";
import type { Cliente } from "../../../lib/supabase";
import { R_REAL } from "../../vista-previa/mi-espacio/espacio";
import { Cabeza } from "../../vista-previa/panel/comun";
import { PANEL_REAL } from "../../vista-previa/panel/textos";

const T = PANEL_REAL.mfa;

type Factor = { id: string; factor_type?: string; status?: string; friendly_name?: string };

// Factores TOTP de la cuenta: verificados y pendientes (un registro que quedó a medias).
export async function factoresTotp(sb: Cliente): Promise<{ verificados: Factor[]; pendientes: Factor[] }> {
  const { data, error } = await sb.auth.mfa.listFactors();
  if (error) throw error;
  const todos = ((data as { all?: Factor[] }).all ?? []).filter((f) => f.factor_type === "totp");
  return { verificados: todos.filter((f) => f.status === "verified"), pendientes: todos.filter((f) => f.status !== "verified") };
}

const soloDigitos = (v: string) => v.replace(/\D/g, "").slice(0, 6);

// Campo del código de 6 dígitos con su botón y su alerta.
function FormularioCodigo({ onVerificar, id }: { onVerificar: (codigo: string) => Promise<"ok" | "noCoincide" | "red">; id: string }) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  return (
    <form
      className="pa-form"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (codigo.length !== 6) {
          setError(T.noCoincide);
          campo.current?.focus();
          return;
        }
        if (ocupado) return;
        setOcupado(true);
        setError(null);
        const r = await onVerificar(codigo);
        setOcupado(false);
        if (r !== "ok") {
          setError(r === "noCoincide" ? T.noCoincide : T.error);
          setCodigo("");
          campo.current?.focus();
        }
      }}
    >
      <CampoTexto
        ref={campo}
        id={id}
        etiqueta={T.codigo}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={codigo}
        error={error}
        onChange={(e) => setCodigo(soloDigitos(e.target.value))}
      />
      <button type="submit" className="boton boton--primario" aria-disabled={ocupado ? true : undefined}>
        {T.verificar}
      </button>
    </form>
  );
}

// Verifica un código contra uno o más factores (el código es de cualquiera de los dos).
async function verificarCon(sb: Cliente, factores: string[], codigo: string): Promise<"ok" | "noCoincide" | "red"> {
  let resultado: "noCoincide" | "red" = "noCoincide";
  for (const factorId of factores) {
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code: codigo });
    if (!error) return "ok";
    const estado = (error as { status?: number }).status ?? 0;
    if (!estado || estado >= 500) resultado = "red";
  }
  return resultado;
}

// Registro de un factor nuevo: QR + clave + código.
export function RegistrarFactor({ sb, numero, onListo }: { sb: Cliente; numero: number; onListo: () => void }) {
  const [factor, setFactor] = useState<{ id: string; qr: string; clave: string } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        // Un registro que quedó a medias impide repetir el nombre: se quita antes.
        const { pendientes } = await factoresTotp(sb);
        for (const f of pendientes) await sb.auth.mfa.unenroll({ factorId: f.id });
        const { data, error: e } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: T.nombreFactor(numero) });
        if (e || !data) throw e ?? new Error("sin datos");
        const d = data as { id: string; totp: { qr_code: string; secret: string } };
        if (vivo) setFactor({ id: d.id, qr: d.totp.qr_code, clave: d.totp.secret });
      } catch {
        if (vivo) setError(true);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [sb, numero]);

  if (error) {
    return (
      <div role="alert" className="aviso aviso--error-envio">
        <Icono nombre="info" tamaño={20} className="aviso-icono" />
        <span>{T.error}</span>
      </div>
    );
  }
  if (!factor) return <p className="microcopia">…</p>;
  return (
    <div className="pa-pila">
      <p>{T.registrar}</p>
      <img src={factor.qr} alt={T.qr} width={200} height={200} className="pa-qr" />
      <div className="pa-pila pa-pila--chica">
        <p className="pa-rotulo">{T.clave}</p>
        <p className="pa-largo">
          <code>{factor.clave}</code>
        </p>
      </div>
      <FormularioCodigo
        id={`mfa-codigo-${numero}`}
        onVerificar={async (codigo) => {
          const r = await verificarCon(sb, [factor.id], codigo);
          if (r === "ok") onListo();
          return r;
        }}
      />
    </div>
  );
}

// Pantalla del segundo factor al entrar al panel.
export function PedirSegundoFactor({ sb, verificados, onListo }: { sb: Cliente; verificados: string[]; onListo: () => void }) {
  return (
    <div className="pa-pantalla pa-pantalla--angosta">
      <Cabeza ojo={T.ojo} titulo={T.titulo} bajada={verificados.length ? T.pedir : undefined} />
      {verificados.length ? (
        <FormularioCodigo
          id="mfa-codigo"
          onVerificar={async (codigo) => {
            const r = await verificarCon(sb, verificados, codigo);
            if (r === "ok") onListo();
            return r;
          }}
        />
      ) : (
        <>
          <RegistrarFactor sb={sb} numero={1} onListo={onListo} />
          <p className="microcopia">{T.segundo}</p>
        </>
      )}
    </div>
  );
}

// La cuenta no es del equipo.
export function SinAcceso() {
  return (
    <div className="pa-pantalla pa-pantalla--angosta">
      <Cabeza ojo={T.ojo} titulo={T.sinAcceso} bajada={T.sinAccesoTexto} />
      <div className="acciones">
        <Link to={R_REAL.hoy} className="boton boton--secundario">
          {T.irAMiEspacio}
        </Link>
        <Link to={R_REAL.salir} className="boton boton--terciario">
          {T.salir}
        </Link>
      </div>
    </div>
  );
}
