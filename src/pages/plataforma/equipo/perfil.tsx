// «Tu perfil» en Más (A3): cada persona del equipo cambia su nombre y su presentación, que sus
// participantes ven en «Tu coach» (mi_coach). El rol y los permisos los cambia solo el dueño.
import { useEffect, useState } from "react";
import { CampoArea, CampoTexto } from "../../../components/form";
import { datos } from "../../../lib/supabase";
import { Seccion } from "../../vista-previa/panel/comun";
import { PERFIL_EQUIPO as T } from "../../vista-previa/panel/textos";
import { Alerta, useDatosPanel, useEscritura } from "./comun";

export function PerfilEquipo() {
  const { sb } = useDatosPanel();
  const [cargado, setCargado] = useState(false);
  const [nombre, setNombre] = useState("");
  const [presentacion, setPresentacion] = useState("");
  const [errNombre, setErrNombre] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [correr, error, ocupado] = useEscritura();

  useEffect(() => {
    void (async () => {
      const { data } = await sb.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return;
      const fila = datos(await sb.from("equipo").select("nombre,presentacion").eq("user_id", uid).maybeSingle()) as { nombre: string; presentacion: string | null } | null;
      if (fila) {
        setNombre(fila.nombre);
        setPresentacion(fila.presentacion ?? "");
      }
      setCargado(true);
    })().catch(() => setCargado(true));
  }, [sb]);

  return (
    <Seccion titulo={T.titulo} id="perfil" className="tarjeta pa-tarjeta">
      <p className="microcopia">{T.ayuda}</p>
      <form
        className="pa-form"
        noValidate
        aria-busy={!cargado || undefined}
        onSubmit={async (e) => {
          e.preventDefault();
          setAviso("");
          const n = nombre.trim();
          if (n.length < 2 || n.length > 60) {
            setErrNombre(T.errorNombre);
            document.getElementById("perfil-nombre")?.focus();
            return;
          }
          setErrNombre(null);
          const ok = await correr(async () => datos(await sb.rpc("actualizar_mi_perfil", { p: { nombre: n, presentacion: presentacion.trim() } })));
          if (ok) setAviso(T.guardado);
        }}
      >
        <CampoTexto id="perfil-nombre" etiqueta={T.nombre} autoComplete="name" maxLength={60} value={nombre} error={errNombre} onChange={(e) => setNombre(e.target.value)} />
        <CampoArea
          id="perfil-presentacion"
          etiqueta={T.presentacion}
          ayuda={T.presentacionAyuda}
          placeholder={T.ejemplo}
          opcional
          max={400}
          rows={3}
          value={presentacion}
          onChange={(e) => setPresentacion(e.target.value)}
        />
        <Alerta texto={error} />
        <button type="submit" className="boton boton--secundario pa-boton-solo" disabled={ocupado || !cargado}>
          {T.guardar}
        </button>
        <p role="status" className="microcopia">
          {aviso}
        </p>
      </form>
    </Seccion>
  );
}
