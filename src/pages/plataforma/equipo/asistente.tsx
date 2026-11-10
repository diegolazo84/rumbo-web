// Asistente de Rumbo: bandeja de revisión del panel real (E2, ya en la base).
// · ia_bandeja(): recoge lo que respondió el asistente y devuelve solo lo de las personas que
//   gestiona quien entra (el coach, las suyas; el dueño, todas): por revisar, esperando, alertas
//   de crisis, errores y borradores pedidos por el coach.
// · ia_revisar(): aprobar tal cual, aprobar corregida (hasta 2000 caracteres) o no compartir, con
//   nota interna opcional. Solo lo aprobado le llega a la persona (con aviso).
// · Revisadas: la tabla ia_consultas con la política equipo_leer (gestiona): quién, cuándo y cómo.
// No hay datos de ejemplo: esta pantalla existe solo en el panel real.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Etiqueta from "../../../components/Etiqueta";
import { Icono } from "../../../components/app";
import { CampoArea } from "../../../components/form";
import { fechaLarga, type Iso } from "../../../lib/fechas";
import { datos } from "../../../lib/supabase";
import Carga from "../../vista-previa/mi-espacio/Carga";
import { Cabeza, Seccion, conId, usePanel } from "../../vista-previa/panel/comun";
import { ASISTENTE_PANEL as T } from "../../vista-previa/panel/textos";
import { Alerta, useDatosPanel, useEscritura } from "./comun";
import { nombreDe } from "./datos";

export const R_ASISTENTE = "/equipo/asistente/";

type Pendiente = { id: string; participante_id: string; tipo: "pregunta" | "borrador_coach"; pregunta: string; estado: string; respuesta: string | null; creada_en: string };
type Revisada = { id: string; participante_id: string; pregunta: string; estado: "aprobada" | "descartada"; respuesta: string | null; texto_final: string | null; revisada_por: string | null; revisada_en: string; nota_revision: string | null };
// «Me sirvió» / «No me sirvió» de la persona (20261127; si la tabla no existe, no se muestra).
type Valoracion = { consulta_id: string; util: boolean; motivo: string | null };
type Contexto = { id: string; contexto_enviado: Record<string, unknown> | null; error: string | null };

const MAX = 2000;
const SIETE_DIAS = 7 * 86_400_000;
const fechaDe = (ts: string) => fechaLarga(ts.slice(0, 10) as Iso);

export function AsistenteReal() {
  const { sb } = useDatosPanel();
  const [estado, setEstado] = useState<{ pendientes: Pendiente[]; revisadas: Revisada[]; contexto: Map<string, Contexto>; valoraciones: Map<string, Valoracion>; yo: string | null } | null>(null);
  const [error, setError] = useState(false);
  const [aviso, setAviso] = useState("");

  const leer = useCallback(async () => {
    const pendientes = (datos(await sb.rpc("ia_bandeja")) ?? []) as Pendiente[];
    const ids = pendientes.map((p) => p.id);
    const [revisadas, contexto, sesion] = await Promise.all([
      sb
        .from("ia_consultas")
        .select("id,participante_id,pregunta,estado,respuesta,texto_final,revisada_por,revisada_en,nota_revision")
        .eq("tipo", "pregunta")
        .in("estado", ["aprobada", "descartada"])
        .order("revisada_en", { ascending: false })
        .limit(20),
      ids.length ? sb.from("ia_consultas").select("id,contexto_enviado,error").in("id", ids) : Promise.resolve({ data: [], error: null }),
      sb.auth.getSession(),
    ]);
    const lista = datos(revisadas) as Revisada[];
    const aprobadas = lista.filter((r) => r.estado === "aprobada").map((r) => r.id);
    const val = aprobadas.length ? await sb.from("ia_valoraciones").select("consulta_id,util,motivo").in("consulta_id", aprobadas) : { data: [], error: null };
    setEstado({
      pendientes,
      revisadas: lista,
      valoraciones: new Map(val.error ? [] : ((val.data ?? []) as Valoracion[]).map((v) => [v.consulta_id, v])),
      contexto: new Map((datos(contexto) as Contexto[]).map((c) => [c.id, c])),
      yo: sesion.data.session?.user.id ?? null,
    });
  }, [sb]);
  const cargar = useCallback(() => {
    setError(false);
    leer().catch(() => setError(true));
  }, [leer]);
  useEffect(cargar, [cargar]);

  if (error) return <Carga estado="error" alReintentar={cargar} />;
  if (!estado) return <Carga estado="cargando" />;

  const ahora = Date.now();
  const reciente = (p: Pendiente) => ahora - Date.parse(p.creada_en) < SIETE_DIAS;
  const porRevisar = estado.pendientes.filter((p) => p.estado === "por_revisar");
  const esperando = estado.pendientes.filter((p) => p.estado === "enviada");
  const alertas = estado.pendientes.filter((p) => p.estado === "crisis" && reciente(p));
  const errores = estado.pendientes.filter((p) => p.estado === "error" && reciente(p));
  const borradores = estado.pendientes.filter((p) => p.estado === "lista" && reciente(p));
  const alRevisar = (texto: string) => {
    setAviso(texto);
    cargar();
  };

  return (
    <div className="pa-pantalla">
      <Cabeza ojo={T.ojo} titulo={T.titulo} bajada={T.bajada} />
      <p className="microcopia">{porRevisar.length ? T.resumen(porRevisar.length) : T.vacio}</p>
      <p role="status" className="microcopia">
        {aviso}
      </p>

      {alertas.length > 0 && (
        <Seccion id="ia-alertas" titulo={T.alertas} extra={<Etiqueta variante="nota">{String(alertas.length)}</Etiqueta>}>
          <ul className="pa-filas">
            {alertas.map((p) => (
              <Simple key={p.id} p={p} icono="heart" texto={T.alertaTexto} ficha />
            ))}
          </ul>
        </Seccion>
      )}

      <Seccion id="ia-revisar" titulo={T.porRevisar}>
        {porRevisar.length ? (
          <ul className="pa-filas">
            {porRevisar.map((p) => (
              <Revisar key={p.id} p={p} contexto={estado.contexto.get(p.id)?.contexto_enviado ?? null} alRevisar={alRevisar} />
            ))}
          </ul>
        ) : (
          <p className="pa-vacio">{T.vacio}</p>
        )}
      </Seccion>

      {esperando.length > 0 && (
        <Seccion id="ia-esperando" titulo={T.esperando}>
          <ul className="pa-filas">
            {esperando.map((p) => (
              <Simple key={p.id} p={p} icono="clock" texto={T.esperandoTexto} />
            ))}
          </ul>
        </Seccion>
      )}

      {errores.length > 0 && (
        <Seccion id="ia-errores" titulo={T.errores}>
          <ul className="pa-filas">
            {errores.map((p) => (
              <Simple key={p.id} p={p} icono="info" texto={T.errorTexto(estado.contexto.get(p.id)?.error ?? null)} />
            ))}
          </ul>
        </Seccion>
      )}

      {borradores.length > 0 && (
        <Seccion id="ia-borradores" titulo={T.borradores}>
          <ul className="pa-filas">
            {borradores.map((p) => (
              <Simple key={p.id} p={p} icono="pen-line" texto={T.borradorTexto} cuerpo={p.respuesta} />
            ))}
          </ul>
        </Seccion>
      )}
      <p className="microcopia">{T.limite}</p>

      <Seccion id="ia-revisadas" titulo={T.revisadas}>
        {estado.revisadas.length ? (
          <ul className="pa-filas">
            {estado.revisadas.map((r) => (
              <RevisadaFila key={r.id} r={r} yo={estado.yo} valoracion={estado.valoraciones.get(r.id)} />
            ))}
          </ul>
        ) : (
          <p className="pa-vacio">{T.revisadasVacio}</p>
        )}
      </Seccion>
    </div>
  );
}

function usePersona(id: string) {
  const { d } = useDatosPanel();
  const p = d.participantes.find((x) => x.id === id);
  return p ? nombreDe(p) : T.sinNombre;
}

function Simple({ p, icono, texto, cuerpo, ficha }: { p: Pendiente; icono: "heart" | "clock" | "info" | "pen-line"; texto: string; cuerpo?: string | null; ficha?: boolean }) {
  const nombre = usePersona(p.participante_id);
  const { R } = usePanel();
  return (
    <li className="tarjeta pa-fila ia-fila">
      <div className="pa-fila__cabeza">
        <h3 className="pa-h3">{nombre}</h3>
        <span className="microcopia">{T.recibida(fechaDe(p.creada_en))}</span>
      </div>
      <p className="ia-pregunta">
        <span className="ia-rotulo">{T.pregunta}: </span>
        {p.pregunta}
      </p>
      <p className="aviso">
        <Icono nombre={icono} tamaño={20} className="aviso-icono" />
        <span>{texto}</span>
      </p>
      {cuerpo && <p className="ia-texto">{cuerpo}</p>}
      {ficha && (
        <div className="acciones">
          <Link to={conId(R.participante, p.participante_id)} className="boton boton--secundario">
            {T.verFicha}
          </Link>
        </div>
      )}
    </li>
  );
}

function Revisar({ p, contexto, alRevisar }: { p: Pendiente; contexto: Record<string, unknown> | null; alRevisar: (aviso: string) => void }) {
  const { sb } = useDatosPanel();
  const nombre = usePersona(p.participante_id);
  const original = p.respuesta ?? "";
  const [texto, setTexto] = useState(original.slice(0, MAX));
  const [nota, setNota] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [errTexto, setErrTexto] = useState<string | null>(null);
  const [correr, error, ocupado] = useEscritura();
  const id = `ia-${p.id}`;
  const cambiada = texto.trim() !== original.trim();
  const claves = Object.keys(contexto ?? {}).filter((k) => contexto?.[k] != null);
  const enviar = async (aprobar: boolean) => {
    if (aprobar) {
      const t = texto.trim();
      const e = !t ? T.vacia : t.length > MAX ? T.muyLarga : null;
      setErrTexto(e);
      if (e) {
        document.getElementById(`${id}-texto`)?.focus();
        return;
      }
    }
    const ok = await correr(async () =>
      datos(
        await sb.rpc("ia_revisar", {
          p_consulta: p.id,
          p_aprobar: aprobar,
          p_texto: aprobar && cambiada ? texto.trim() : null,
          p_nota: nota.trim() || null,
        }),
      ),
    );
    if (ok) alRevisar(aprobar ? T.aprobada : T.descartada);
  };
  return (
    <li className="tarjeta pa-fila ia-fila" aria-labelledby={`${id}-persona`}>
      <div className="pa-fila__cabeza">
        <h3 id={`${id}-persona`} className="pa-h3">
          {nombre}
        </h3>
        <span className="microcopia">{T.recibida(fechaDe(p.creada_en))}</span>
      </div>
      <p className="ia-pregunta">
        <span className="ia-rotulo">{T.pregunta}: </span>
        {p.pregunta}
      </p>
      <p className="microcopia">
        <span className="ia-rotulo">{T.contexto}: </span>
        {claves.length ? claves.map((k) => T.claves[k] ?? k).join(", ") : T.sinContexto}
      </p>
      <details className="ia-original">
        <summary>{T.borrador}</summary>
        <p className="ia-texto">{original}</p>
      </details>
      <form
        className="pa-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void enviar(true);
        }}
      >
        <CampoArea
          id={`${id}-texto`}
          etiqueta={T.respuesta}
          ayuda={original.length > MAX ? `${T.respuestaAyuda} ${T.recortada}` : T.respuestaAyuda}
          max={MAX}
          rows={8}
          value={texto}
          error={errTexto}
          onChange={(e) => {
            setTexto(e.target.value);
            setErrTexto(null);
          }}
        />
        <CampoArea id={`${id}-nota`} etiqueta={T.nota} ayuda={T.notaAyuda} opcional max={300} rows={2} value={nota} onChange={(e) => setNota(e.target.value)} />
        <Alerta texto={error} />
        {confirmar ? (
          <div className="ia-confirmar" role="group" aria-label={T.descartar}>
            <p>{T.descartarConfirmar}</p>
            <div className="acciones">
              <button type="button" className="boton boton--secundario" disabled={ocupado} onClick={() => void enviar(false)}>
                {T.descartarSi}
              </button>
              <button type="button" className="boton boton--terciario" onClick={() => setConfirmar(false)}>
                {T.cancelar}
              </button>
            </div>
          </div>
        ) : (
          <div className="acciones">
            <button type="submit" className="boton boton--primario" disabled={ocupado}>
              {cambiada ? T.aprobarCorregida : T.aprobar}
            </button>
            <button type="button" className="boton boton--terciario" onClick={() => setConfirmar(true)}>
              {T.descartar}
            </button>
          </div>
        )}
      </form>
    </li>
  );
}

function RevisadaFila({ r, yo, valoracion }: { r: Revisada; yo: string | null; valoracion?: Valoracion }) {
  const nombre = usePersona(r.participante_id);
  const corregida = r.estado === "aprobada" && r.texto_final != null && r.respuesta != null && r.texto_final.trim() !== r.respuesta.trim();
  return (
    <li className="tarjeta pa-fila ia-fila">
      <div className="pa-fila__cabeza">
        <h3 className="pa-h3">{nombre}</h3>
        <Etiqueta variante={r.estado === "aprobada" ? "activo" : "pronto"}>{T.estadoRevisada[r.estado]}</Etiqueta>
        {corregida && <Etiqueta variante="nota">{T.corregida}</Etiqueta>}
      </div>
      <p className="ia-pregunta">
        <span className="ia-rotulo">{T.pregunta}: </span>
        {r.pregunta}
      </p>
      {r.estado === "aprobada" && r.texto_final && <p className="ia-texto">{r.texto_final}</p>}
      <p className="microcopia">{T.revisadaPor(r.revisada_por && r.revisada_por === yo ? T.tu : T.otro, fechaDe(r.revisada_en))}</p>
      {r.nota_revision && (
        <p className="microcopia">
          <span className="ia-rotulo">{T.notaRevisada}: </span>
          {r.nota_revision}
        </p>
      )}
      {valoracion && (
        <p className="microcopia ia-valoracion">
          <span className="ia-rotulo">{T.valoracion.rotulo}: </span>
          {valoracion.util ? T.valoracion.sirvio : T.valoracion.noSirvio}
          {valoracion.motivo && ` · «${valoracion.motivo}»`}
        </p>
      )}
    </li>
  );
}
