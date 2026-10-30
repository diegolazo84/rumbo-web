// Recordatorios (maqueta de ChatGPT, 30-oct-2026). Preferencias de la tabla recordatorios:
//   · Interruptor general (apagado por defecto). Apagado, lo de abajo se conserva y solo llega lo
//     esencial a Mis avisos: mensajes del coach y videollamadas agendadas.
//   · Qué recordar: acciones del día, revisión semanal, videollamadas (solo plan cercano), copia por
//     correo de los mensajes del coach, comunidad (solo con el módulo abierto) y logros.
//   · Cuándo: horario desde/hasta (7 a 22), hora del recordatorio diario, días y zona horaria.
//   · Dónde: Mis avisos siempre; por correo si la persona lo elige (Brevo, con su estado real).
//   · Vista previa ilustrativa (no envía nada) y «Guardar cambios» con guardar_recordatorios.
// En la vista previa, guardar solo confirma en la pantalla.
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icono, type NombreIconoApp } from "../../../components/app";
import { EtiquetaEjemplo, useEspacio } from "./comun";
import { FOTO_PORTADA, PaisajePortada } from "./comunidad/Paisaje";
import type { PrefRecordatorios } from "./espacio";
import { T_RECORDATORIOS as T } from "./textos";

type Categoria = "accionesDelDia" | "registroSemanal" | "videollamadas" | "mensajesCoach" | "comunidad" | "logros";
const CATEGORIAS: { k: Categoria; icono: NombreIconoApp }[] = [
  { k: "accionesDelDia", icono: "list-checks" },
  { k: "registroSemanal", icono: "chart-column-increasing" },
  { k: "videollamadas", icono: "video" },
  { k: "mensajesCoach", icono: "message-square" },
  { k: "comunidad", icono: "users" },
  { k: "logros", icono: "award" },
];
const HORAS = Array.from({ length: 16 }, (_, i) => i + 7); // 7 a 22
const hora = (h: number) => `${h}:00`;

export default function Recordatorios() {
  const esp = useEspacio();
  const pref = esp.recordatorios;
  return (
    <div className="me-pantalla rc">
      <header className="rc-portada">
        {FOTO_PORTADA ? <img className="rc-portada__fondo" src={FOTO_PORTADA} alt="" /> : <PaisajePortada className="rc-portada__fondo" />}
        <div className="rc-portada__texto">
          <Link to={esp.R.preferencias} className="rc-volver">
            <Icono nombre="chevron-left" tamaño={20} />
            {T.volver}
          </Link>
          <div className="rc-portada__fila">
            <h1 className="rc-portada__h1">{T.titulo}</h1>
            <EtiquetaEjemplo />
          </div>
          <p className="rc-portada__bajada">{T.bajada}</p>
        </div>
      </header>
      {pref === "no-disponible" ? (
        <Mensaje icono="info" titulo={T.noDisponible.titulo} texto={T.noDisponible.texto} />
      ) : pref === null ? (
        <Mensaje
          icono="info"
          titulo={T.errorCargar.titulo}
          texto={T.errorCargar.texto}
          rol="alert"
          accion={
            esp.servidor && (
              <button type="button" className="boton boton--secundario" onClick={esp.servidor.recargar}>
                {T.errorCargar.reintentar}
              </button>
            )
          }
        />
      ) : (
        <Formulario inicial={pref} />
      )}
    </div>
  );
}

function Mensaje({ icono, titulo, texto, rol, accion }: { icono: NombreIconoApp; titulo: string; texto: string; rol?: "alert"; accion?: ReactNode }) {
  return (
    <div className="aviso rc-mensaje" role={rol}>
      <Icono nombre={icono} tamaño={20} className="aviso-icono" />
      <div className="aviso-cuerpo">
        <h2 className="aviso-titulo">{titulo}</h2>
        <p>{texto}</p>
        {accion && <div className="acciones">{accion}</div>}
      </div>
    </div>
  );
}

function Interruptor({ id, encendido, onCambiar, etiqueta, describe, desactivado }: {
  id: string;
  encendido: boolean;
  onCambiar: (v: boolean) => void;
  etiqueta: string;
  describe?: string;
  desactivado?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      className="rc-switch"
      aria-checked={encendido}
      aria-label={etiqueta}
      aria-describedby={describe}
      disabled={desactivado}
      onClick={() => onCambiar(!encendido)}
    >
      <span className="rc-switch__bola" aria-hidden="true" />
    </button>
  );
}

function Formulario({ inicial }: { inicial: PrefRecordatorios }) {
  const esp = useEspacio();
  const [p, setP] = useState<PrefRecordatorios>(inicial);
  const [estado, setEstado] = useState<"" | "guardando" | "guardado" | "error" | "sin-conexion">("");
  useEffect(() => setP(inicial), [inicial]);
  const poner = (cambio: Partial<PrefRecordatorios>) => {
    setP((x) => {
      const n = { ...x, ...cambio };
      // El recordatorio diario queda siempre dentro del horario.
      if (n.hasta < n.desde) n.hasta = n.desde;
      n.hora = Math.min(Math.max(n.hora, n.desde), n.hasta);
      return n;
    });
    setEstado("");
  };
  const cercano = esp.ciclo.plan === "cercano";
  const disponible = (k: Categoria) => (k === "videollamadas" ? cercano : k === "comunidad" ? esp.comunidad : true);
  const nota = (k: Categoria) => (k === "videollamadas" && !cercano ? T.sinVideollamadas : k === "comunidad" && !esp.comunidad ? T.comunidadCerrada : null);
  const sinDias = p.dias.length === 0;

  const guardar = async () => {
    if (sinDias) return;
    if (esp.real && typeof navigator !== "undefined" && !navigator.onLine) return setEstado("sin-conexion");
    if (!esp.servidor) return setEstado("guardado");
    setEstado("guardando");
    try {
      await esp.servidor.guardarRecordatorios(p);
      setEstado("guardado");
    } catch {
      setEstado("error");
    }
  };

  const correoTexto =
    esp.correoDisponible === true
      ? T.canales.correoActivo(esp.participante.correo)
      : esp.correoDisponible === false
        ? T.canales.correoInactivo
        : T.canales.correoDesconocido;

  return (
    <form
      className="rc-cuerpo"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      <section className="rc-tarjeta rc-general" aria-labelledby="rc-general">
        <span className="rc-icono rc-icono--bosque" aria-hidden="true">
          <Icono nombre="bell" tamaño={22} />
        </span>
        <div className="rc-general__texto">
          <h2 id="rc-general" className="rc-h2">
            {T.general.titulo}
          </h2>
          <p id="rc-general-texto">{p.activos ? T.general.texto : T.general.apagado}</p>
        </div>
        <Interruptor id="rc-activos" encendido={p.activos} onCambiar={(v) => poner({ activos: v })} etiqueta={T.general.titulo} describe="rc-general-texto" />
      </section>

      <aside className="rc-tarjeta rc-lema" aria-labelledby="rc-lema">
        <span className="rc-icono rc-icono--hoja" aria-hidden="true">
          <Icono nombre="sprout" tamaño={22} />
        </span>
        <div>
          <h2 id="rc-lema" className="rc-lema__titulo">
            {T.lema}
          </h2>
          <p>{T.lemaTexto}</p>
        </div>
      </aside>

      <section className="rc-tarjeta rc-que" aria-labelledby="rc-que" data-apagado={p.activos ? undefined : ""}>
        <h2 id="rc-que" className="rc-h2">
          {T.que}
        </h2>
        <ul className="rc-lista">
          {CATEGORIAS.map(({ k, icono }) => {
            const t = T.categorias[k];
            const n = nota(k);
            return (
              <li key={k} className="rc-fila">
                <span className={`rc-icono rc-icono--${k}`} aria-hidden="true">
                  <Icono nombre={icono} tamaño={20} />
                </span>
                <span className="rc-fila__texto">
                  <span className="rc-fila__titulo" id={`rc-${k}-t`}>
                    {t.titulo}
                  </span>
                  <span className="rc-fila__bajada" id={`rc-${k}-d`}>
                    {n ?? t.texto}
                  </span>
                </span>
                <Interruptor
                  id={`rc-${k}`}
                  encendido={disponible(k) && p[k]}
                  onCambiar={(v) => poner({ [k]: v } as Partial<PrefRecordatorios>)}
                  etiqueta={t.titulo}
                  describe={`rc-${k}-d`}
                  desactivado={!p.activos || !disponible(k)}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rc-tarjeta rc-cuando" aria-labelledby="rc-cuando" data-apagado={p.activos ? undefined : ""}>
        <h2 id="rc-cuando" className="rc-h2">
          {T.cuando}
        </h2>
        <div className="rc-bloque">
          <span className="rc-icono rc-icono--accionesDelDia" aria-hidden="true">
            <Icono nombre="clock" tamaño={20} />
          </span>
          <div className="rc-bloque__texto">
            <h3 className="rc-h3">{T.horario.titulo}</h3>
            <p>{T.horario.texto}</p>
            <p className="rc-zona">{T.horario.zona(esp.participante.zonaHoraria)}</p>
            <div className="rc-horas">
              <Selector id="rc-desde" etiqueta={T.horario.desde} valor={p.desde} opciones={HORAS} onCambiar={(v) => poner({ desde: v })} desactivado={!p.activos} />
              <Selector id="rc-hasta" etiqueta={T.horario.hasta} valor={p.hasta} opciones={HORAS.filter((h) => h >= p.desde)} onCambiar={(v) => poner({ hasta: v })} desactivado={!p.activos} />
              <Selector
                id="rc-hora"
                etiqueta={T.horario.hora}
                valor={p.hora}
                opciones={HORAS.filter((h) => h >= p.desde && h <= p.hasta)}
                onCambiar={(v) => poner({ hora: v })}
                desactivado={!p.activos}
              />
            </div>
          </div>
        </div>
        <fieldset className="rc-bloque rc-dias" disabled={!p.activos}>
          <span className="rc-icono rc-icono--accionesDelDia" aria-hidden="true">
            <Icono nombre="calendar-days" tamaño={20} />
          </span>
          <div className="rc-bloque__texto">
            <legend className="rc-h3">{T.dias.titulo}</legend>
            <p>{T.dias.texto}</p>
            <div className="rc-dias__lista">
              {T.dias.nombres.map((d, i) => {
                const n = i + 1;
                const elegido = p.dias.includes(n);
                return (
                  <button
                    key={d}
                    type="button"
                    className="rc-dia"
                    aria-pressed={elegido}
                    aria-label={T.dias.largos[i]}
                    onClick={() => poner({ dias: elegido ? p.dias.filter((x) => x !== n) : [...p.dias, n].sort((a, b) => a - b) })}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            {sinDias && (
              <p className="rc-error" role="alert">
                {T.dias.alMenosUno}
              </p>
            )}
          </div>
        </fieldset>
      </section>

      <section className="rc-tarjeta rc-canales" aria-labelledby="rc-canales">
        <h2 id="rc-canales" className="rc-h2">
          {T.canales.titulo}
        </h2>
        <div className="rc-fila">
          <span className="rc-icono rc-icono--bosque" aria-hidden="true">
            <Icono nombre="bell" tamaño={20} />
          </span>
          <span className="rc-fila__texto">
            <span className="rc-fila__titulo">{T.canales.app}</span>
            <span className="rc-fila__bajada">{T.canales.appTexto}</span>
          </span>
          <Icono nombre="check" tamaño={20} className="rc-check" />
        </div>
        <div className="rc-fila">
          <span className="rc-icono rc-icono--mensajesCoach" aria-hidden="true">
            <Icono nombre="mail" tamaño={20} />
          </span>
          <span className="rc-fila__texto">
            <span className="rc-fila__titulo">{T.canales.correo}</span>
            <span className="rc-fila__bajada" id="rc-correo-d">
              {correoTexto}
            </span>
          </span>
          <Interruptor id="rc-correo" encendido={p.porCorreo} onCambiar={(v) => poner({ porCorreo: v })} etiqueta={T.canales.correo} describe="rc-correo-d" desactivado={!p.activos} />
        </div>
      </section>

      <section className="rc-tarjeta rc-previa" aria-labelledby="rc-previa">
        <div className="rc-previa__cabeza">
          <span className="rc-icono rc-icono--logros" aria-hidden="true">
            <Icono nombre="eye" tamaño={20} />
          </span>
          <div>
            <h2 id="rc-previa" className="rc-h2">
              {T.vistaPrevia.titulo}
            </h2>
            <p>{T.vistaPrevia.texto}</p>
          </div>
        </div>
        <div className="rc-previa__aviso" aria-hidden="true">
          <span className="rc-previa__logo">
            <Icono nombre="bell" tamaño={22} />
          </span>
          <span className="rc-previa__texto">
            <span className="rc-previa__fila">
              <strong>{T.vistaPrevia.remitente}</strong>
              <span>{hora(p.hora)}</span>
            </span>
            <span className="rc-previa__titulo">{T.vistaPrevia.aviso}</span>
            <span>{T.vistaPrevia.detalle}</span>
          </span>
        </div>
      </section>

      <section className="rc-tarjeta rc-contigo" aria-labelledby="rc-contigo">
        <span className="rc-icono rc-icono--contigo" aria-hidden="true">
          <Icono nombre="heart" tamaño={22} />
        </span>
        <div>
          <h2 id="rc-contigo" className="rc-h2">
            {T.contigo.titulo}
          </h2>
          <p>{T.contigo.texto}</p>
        </div>
      </section>

      <div className="rc-guardar">
        <button type="submit" className="boton boton--primario" disabled={estado === "guardando" || sinDias}>
          {estado === "guardando" ? T.guardando : T.guardar}
        </button>
        <p className={estado === "error" || estado === "sin-conexion" ? "rc-estado rc-estado--error" : "rc-estado"} role="status">
          {estado === "guardado" ? T.guardado : estado === "error" ? T.error : estado === "sin-conexion" ? T.sinConexion : ""}
        </p>
      </div>
    </form>
  );
}

function Selector({ id, etiqueta, valor, opciones, onCambiar, desactivado }: {
  id: string;
  etiqueta: string;
  valor: number;
  opciones: number[];
  onCambiar: (v: number) => void;
  desactivado?: boolean;
}) {
  return (
    <div className="rc-selector">
      <label htmlFor={id}>{etiqueta}</label>
      <select id={id} value={valor} disabled={desactivado} onChange={(e) => onCambiar(Number(e.target.value))}>
        {opciones.map((h) => (
          <option key={h} value={h}>
            {hora(h)}
          </option>
        ))}
      </select>
    </div>
  );
}
