// Ingreso real a Mi espacio y al panel (plataforma 4.2 y 6.10): las pantallas de la vista previa
// con Supabase Auth. Código de 6 dígitos (camino principal) o enlace del correo con token_hash
// (?th=…&type=email), que funciona en cualquier navegador. Sin contraseñas.
// - La pantalla responde siempre igual, exista o no el correo: solo la red y el límite (429)
//   tienen texto propio (4.2.1).
// - ?salir=1 cierra la sesión de este dispositivo y muestra «Saliste de Mi espacio…».
// - Con sesión abierta, entra directo. Cuenta del equipo → /equipo/; si no, /mi-espacio/ (o la
//   ruta que se estaba abriendo cuando se pidió entrar).
// Nunca se registra en consola un correo, un código ni un token.
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase, usarComputadorCompartido, type Cliente } from "../../lib/supabase";
import { operacion } from "../../data/rumbo";
import Carga from "../vista-previa/mi-espacio/Carga";
import {
  EnlaceVencido,
  PedirCodigo,
  RevisaCorreo,
  SESION,
  type EstadoIngreso,
  type ResultadoPedir,
  type ResultadoVerificar,
} from "../vista-previa/mi-espacio/Entrar";

// Error de red de supabase-js (sin respuesta del servidor).
const esDeRed = (e: { status?: number; name?: string } | null) =>
  !!e && (!e.status || e.name === "AuthRetryableFetchError" || e.status >= 500);

async function pedir(correo: string, compartido: boolean): Promise<ResultadoPedir> {
  try {
    usarComputadorCompartido(compartido);
    const sb = await supabase();
    const { error } = await sb.auth.signInWithOtp({ email: correo, options: { shouldCreateUser: true } });
    if (!error) return "ok";
    if (error.status === 429) return "limite";
    if (esDeRed(error)) return "red";
    return "ok"; // correo no invitado u otro rechazo: misma respuesta (4.2.1)
  } catch {
    return "red";
  }
}

// Solo rutas de la plataforma, nunca la de ingreso (evita volver aquí).
const destinoValido = (d: string | undefined) =>
  !!d && (d.startsWith("/mi-espacio/") || d.startsWith("/equipo/")) && !d.startsWith("/mi-espacio/entrar");

export default function EntrarReal() {
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const estadoNav = ubicacion.state as EstadoIngreso;
  const [paso, setPaso] = useState<"formulario" | "verificando" | "vencido">("formulario");

  const entrar = async (sb: Cliente) => {
    if (destinoValido(estadoNav?.destino)) {
      navegar(estadoNav!.destino!, { replace: true });
      return;
    }
    const equipo = await sb.rpc("soy_equipo");
    navegar(!equipo.error && equipo.data === true ? "/equipo/" : "/mi-espacio/", { replace: true });
  };

  // Después de hidratar: salir, enlace del correo o sesión ya abierta.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    let vigente = true;
    void (async () => {
      let sb: Cliente;
      try {
        sb = await supabase();
      } catch {
        return;
      }
      if (q.get("salir") === "1") {
        await sb.auth.signOut({ scope: "local" }).catch(() => undefined);
        usarComputadorCompartido(false);
        if (vigente) navegar("/mi-espacio/entrar/", { replace: true, state: { aviso: "saliste" } });
        return;
      }
      const th = q.get("th");
      if (th) {
        setPaso("verificando");
        const { error } = await sb.auth.verifyOtp({ token_hash: th, type: "email" });
        // El token no queda en la barra de direcciones ni en el historial.
        window.history.replaceState(window.history.state, "", window.location.pathname);
        if (!vigente) return;
        if (error) {
          setPaso("vencido");
          return;
        }
        await entrar(sb);
        return;
      }
      const { data } = await sb.auth.getSession();
      if (vigente && data.session) await entrar(sb);
    })();
    return () => {
      vigente = false;
    };
    // Solo al montar: la búsqueda (?salir, ?th) se lee una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verificar = async (correo: string, codigo: string): Promise<ResultadoVerificar> => {
    try {
      const sb = await supabase();
      const { error } = await sb.auth.verifyOtp({ email: correo, token: codigo, type: "email" });
      if (error) return esDeRed(error) ? "red" : "noCoincide";
      await entrar(sb);
      return "ok";
    } catch {
      return "red";
    }
  };

  if (paso === "verificando") return <Carga estado="cargando" />;
  if (paso === "vencido") return <EnlaceVencido />;
  if (estadoNav?.enviado && estadoNav.correo)
    return <RevisaCorreo key={ubicacion.key} alVerificar={verificar} alReenviar={(c) => pedir(c, !!estadoNav.compartido)} remitente={operacion.correo} />;
  const aviso = estadoNav?.aviso === "terminada" ? SESION.terminada : estadoNav?.aviso === "saliste" ? SESION.saliste : undefined;
  return <PedirCodigo key={ubicacion.key} aviso={aviso} alPedir={pedir} />;
}
