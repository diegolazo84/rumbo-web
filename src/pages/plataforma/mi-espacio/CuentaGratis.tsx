// Cuenta gratis «Rumbo Inicial» (Diego, 18-nov-2026): Mi espacio para quien entra sin programa.
// - Sin cuenta gratis y con el módulo «cuenta_gratis» habilitado: «Tu punto de partida» (área, meta,
//   días y hasta 3 acciones de plantilla o propias) → crear_cuenta_libre.
// - Con cuenta gratis: acciones de hoy (y de ayer, hasta el final de hoy), la semana, créditos,
//   nivel y racha con las mismas reglas, una sola tarjeta honesta de lo que cambia con un coach
//   («Quiero acompañamiento» avisa al dueño) y ajustes (acciones, días, borrar la cuenta).
// - Con el módulo cerrado y sin cuenta: el mismo aviso de siempre («No encontramos un espacio…»).
// Nunca se muestran personas, testimonios ni resultados inventados.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icono } from "../../../components/app";
import { CampoArea, CampoTexto, Casilla, Envio, Formulario, GrupoOpciones, Opcion } from "../../../components/form";
import { areasPiloto, niveles, operacion, planes, rutas } from "../../../data/rumbo";
import { DIAS_SEMANA, T_GRATIS, TOPE_ACCIONES_GRATIS, plantillasDe } from "../../../data/cuenta-gratis";
import type { Cliente } from "../../../lib/supabase";

export type DatosLibre = {
  hoy: string;
  abierta: boolean;
  cuenta: {
    nombre: string;
    correo: string;
    origen: "correo" | "google";
    area_id: string;
    meta: string;
    dias: number[];
    creada_en: string;
    acceso_pedido_en: string | null;
    apoyo_pedido: string | null;
  };
  acciones: { id: string; titulo: string; desde: string; hasta: string | null }[];
  registros: { accion_id: string; fecha: string }[];
  progreso: { creditos: number; nivel: number; racha: number; bono_siguiente: number } | null;
};

const isodow = (iso: string) => ((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
const sumar = (iso: string, d: number) => {
  const f = new Date(`${iso}T12:00:00Z`);
  f.setUTCDate(f.getUTCDate() + d);
  return f.toISOString().slice(0, 10);
};
const vigenteEn = (a: DatosLibre["acciones"][number], f: string) => a.desde <= f && (!a.hasta || a.hasta >= f);
const hoyChile = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

function Cabecera({ ojo, titulo, bajada }: { ojo: string; titulo: string; bajada?: string }) {
  return (
    <header className="me-cabeza">
      <div className="me-cabeza__fila">
        <p className="ojo">{ojo}</p>
      </div>
      <h1 className="me-h1 me-h1--titulo">{titulo}</h1>
      {bajada && (
        <div className="me-cabeza__bajada">
          <p>{bajada}</p>
        </div>
      )}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Sin cuenta y con el módulo cerrado

export function SinCuenta({ salir }: { salir: string }) {
  const T = T_GRATIS.cerrada;
  return (
    <div className="me-pantalla me-pantalla--angosta">
      <div className="aviso me-error-global">
        <Icono nombre="info" tamaño={20} className="aviso-icono" />
        <div className="aviso-cuerpo">
          <h1 className="aviso-titulo me-h1--aviso">{T.titulo}</h1>
          <p>{T.texto}</p>
          <div className="acciones">
            <Link to={rutas.postular} className="boton boton--primario">
              {T.postular}
            </Link>
            <Link to={salir} className="boton boton--secundario">
              {T.salir}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Elegir acciones (punto de partida y ajustes)

function ElegirAcciones({ area, elegidas, alCambiar, error }: { area: string; elegidas: string[]; alCambiar: (a: string[]) => void; error?: string | null }) {
  const T = T_GRATIS.partida;
  const [propia, setPropia] = useState("");
  const sugeridas = plantillasDe(area);
  const todas = [...sugeridas, ...elegidas.filter((e) => !sugeridas.includes(e))];
  const lleno = elegidas.length >= TOPE_ACCIONES_GRATIS;
  const alternar = (t: string) => alCambiar(elegidas.includes(t) ? elegidas.filter((x) => x !== t) : lleno ? elegidas : [...elegidas, t]);
  const agregar = () => {
    const t = propia.trim();
    if (t.length < 3 || lleno || elegidas.includes(t)) return;
    alCambiar([...elegidas, t]);
    setPropia("");
  };
  return (
    <GrupoOpciones id="cg-acciones" tipo="checkbox" leyenda={T.acciones} ayuda={`${T.accionesAyuda} (${elegidas.length} de ${TOPE_ACCIONES_GRATIS})`} error={error}
      despues={
        <div className="cg-propia">
          <CampoTexto id="cg-propia" etiqueta={T.propia} opcional maxLength={80} value={propia} disabled={lleno}
            onChange={(e) => setPropia(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregar();
              }
            }}
          />
          <button type="button" className="boton boton--secundario me-boton-chico" onClick={agregar} disabled={lleno || propia.trim().length < 3}>
            {T.agregar}
          </button>
        </div>
      }
    >
      {todas.map((t) => (
        <Opcion key={t} tipo="checkbox" name="cg-accion" value={t} titulo={t} checked={elegidas.includes(t)}
          disabled={lleno && !elegidas.includes(t)} onChange={() => alternar(t)} />
      ))}
    </GrupoOpciones>
  );
}

function ElegirDias({ dias, alCambiar, error }: { dias: number[]; alCambiar: (d: number[]) => void; error?: string | null }) {
  return (
    <GrupoOpciones id="cg-dias" tipo="checkbox" leyenda={T_GRATIS.partida.dias} columnas="fila" error={error}>
      {DIAS_SEMANA.map((d) => (
        <Opcion key={d.n} tipo="checkbox" chica name="cg-dia" value={String(d.n)} titulo={d.corto} checked={dias.includes(d.n)}
          onChange={() => alCambiar(dias.includes(d.n) ? dias.filter((x) => x !== d.n) : [...dias, d.n].sort())} />
      ))}
    </GrupoOpciones>
  );
}

// ---------------------------------------------------------------------------
// Tu punto de partida

type Errores = Partial<Record<"nombre" | "area" | "meta" | "dias" | "acciones" | "mayorEdad" | "consentimiento", string>>;

export function PuntoDePartida({ sb, nombreSugerido, alCrear }: { sb: Cliente; nombreSugerido: string; alCrear: (d: DatosLibre) => void }) {
  const T = T_GRATIS.partida;
  const [nombre, setNombre] = useState(nombreSugerido);
  const [area, setArea] = useState("");
  const [meta, setMeta] = useState("");
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [acciones, setAcciones] = useState<string[]>([]);
  const [mayor, setMayor] = useState(false);
  const [acepto, setAcepto] = useState(false);
  const [avisos, setAvisos] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [alerta, setAlerta] = useState<string | null>(null);

  const validar = (): Errores => {
    const e: Errores = {};
    if (nombre.trim().length < 2 || nombre.trim().length > 60) e.nombre = T.errores.nombre;
    if (!area) e.area = T.errores.area;
    if (meta.trim().length < 20) e.meta = T.errores.meta;
    if (!dias.length) e.dias = T.errores.dias;
    if (acciones.length < 1 || acciones.length > TOPE_ACCIONES_GRATIS) e.acciones = T.errores.acciones;
    if (!mayor) e.mayorEdad = T.errores.mayorEdad;
    if (!acepto) e.consentimiento = T.errores.consentimiento;
    return e;
  };

  return (
    <div className="me-pantalla me-pantalla--angosta cg">
      <Cabecera ojo={T.ojo} titulo={T.titulo} bajada={T.bajada} />
      <Formulario
        largo
        enviando={enviando}
        className="cg-form"
        onSubmit={() => {
          if (enviando) return;
          const e = validar();
          setErrores(e);
          const primero = Object.keys(e)[0];
          if (primero) {
            document.getElementById({ nombre: "cg-nombre", area: "cg-area", meta: "cg-meta", dias: "cg-dias", acciones: "cg-acciones", mayorEdad: "cg-mayor", consentimiento: "cg-acepto" }[primero]!)?.scrollIntoView({ block: "center" });
            return;
          }
          setEnviando(true);
          setAlerta(null);
          const texto = T.consentimiento("/condiciones/", "/privacidad/");
          void sb
            .rpc("crear_cuenta_libre", {
              p: { nombre: nombre.trim(), area, meta: meta.trim(), dias, acciones, mayor_edad: true, version_privacidad: "web", texto_consentimiento: texto, avisos },
            })
            .then(({ data, error }) => {
              setEnviando(false);
              if (error || !data) return setAlerta(T.errores.red);
              alCrear(data as DatosLibre);
            });
        }}
      >
        <CampoTexto id="cg-nombre" etiqueta={T.nombre} autoComplete="given-name" maxLength={60} value={nombre} error={errores.nombre} onChange={(e) => setNombre(e.target.value)} />
        <GrupoOpciones id="cg-area" leyenda={T.area} error={errores.area}>
          {areasPiloto.map((a) => (
            <Opcion key={a.id} name="cg-area" value={a.id} titulo={a.nombre} icono={a.icono} cat={a.categoria} checked={area === a.id}
              onChange={() => {
                setArea(a.id);
                setAcciones([]);
              }}
            />
          ))}
        </GrupoOpciones>
        <CampoArea id="cg-meta" etiqueta={T.meta} ayuda={T.metaAyuda} max={300} min={20} value={meta} error={errores.meta} onChange={(e) => setMeta(e.target.value)} />
        <ElegirDias dias={dias} alCambiar={setDias} error={errores.dias} />
        {area && <ElegirAcciones area={area} elegidas={acciones} alCambiar={setAcciones} error={errores.acciones} />}
        <Casilla id="cg-mayor" checked={mayor} onChange={(e) => setMayor(e.target.checked)} error={errores.mayorEdad}>
          {T.mayorEdad}
        </Casilla>
        <Casilla id="cg-acepto" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} error={errores.consentimiento}>
          Acepto las <Link to="/condiciones/">Condiciones</Link> y la <Link to="/privacidad/">Política de privacidad</Link> de Rumbo.
        </Casilla>
        <Casilla id="cg-avisos" opcional checked={avisos} onChange={(e) => setAvisos(e.target.checked)}>
          {T.avisos}
        </Casilla>
        <Envio className="me-envio-ancho" texto={T.boton} textoEnviando={T.enviando} enviando={enviando} alerta={alerta} />
      </Formulario>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Espacio gratis

export function EspacioGratis({ sb, datos, alCambiar, salir }: { sb: Cliente; datos: DatosLibre; alCambiar: (d: DatosLibre) => void; salir: string }) {
  const T = T_GRATIS.espacio;
  const hoy = datos.hoy || hoyChile();
  const ayer = sumar(hoy, -1);
  const { cuenta, acciones, registros } = datos;
  const [progreso, setProgreso] = useState(datos.progreso);
  const [hechas, setHechas] = useState(() => new Set(registros.map((r) => `${r.accion_id}|${r.fecha}`)));
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const esDia = (f: string) => cuenta.dias.includes(isodow(f));
  const deDia = (f: string) => (esDia(f) ? acciones.filter((a) => vigenteEn(a, f)) : []);
  const deHoy = deDia(hoy);
  const deAyer = deDia(ayer).filter((a) => !hechas.has(`${a.id}|${ayer}`));
  const lunes = sumar(hoy, 1 - isodow(hoy));
  const nivel = niveles.find((n) => n.nivel === (progreso?.nivel ?? 1)) ?? niveles[0];
  const siguiente = niveles.find((n) => n.nivel === nivel.nivel + 1);

  const marcar = (accion: string, fecha: string) => {
    const clave = `${accion}|${fecha}`;
    const hecha = !hechas.has(clave);
    setOcupado(clave);
    setAviso(null);
    void sb.rpc("marcar_libre", { p_accion: accion, p_fecha: fecha, p_hecha: hecha }).then(({ data, error }) => {
      setOcupado(null);
      if (error) return setAviso(T.error);
      const nuevas = new Set(hechas);
      if (hecha) nuevas.add(clave);
      else nuevas.delete(clave);
      setHechas(nuevas);
      setProgreso(data as DatosLibre["progreso"]);
      if (hecha && deDia(fecha).every((a) => nuevas.has(`${a.id}|${fecha}`))) setAviso(T.diaCompleto);
    });
  };

  const lista = (fecha: string, items: DatosLibre["acciones"]) => (
    <ul className="cg-lista" role="list">
      {items.map((a) => {
        const clave = `${a.id}|${fecha}`;
        const hecha = hechas.has(clave);
        return (
          <li key={clave}>
            <button type="button" className="cg-accion" aria-pressed={hecha} aria-busy={ocupado === clave || undefined} disabled={ocupado === clave}
              aria-label={hecha ? T.desmarcar(a.titulo) : T.marcar(a.titulo)} onClick={() => marcar(a.id, fecha)}>
              <span className="cg-accion__marca" aria-hidden="true">{hecha && <Icono nombre="check" tamaño={16} />}</span>
              <span className="cg-accion__texto">{a.titulo}</span>
              {hecha && <span className="cg-accion__estado">{T.hecha}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="me-pantalla me-pantalla--angosta cg">
      <Cabecera ojo={T.ojo} titulo={T.saludo(cuenta.nombre)} />
      <section className="tarjeta cg-meta" aria-labelledby="cg-meta-titulo">
        <p id="cg-meta-titulo" className="me-rotulo">{T.tuMeta}</p>
        <p className="cg-meta__texto">{cuenta.meta}</p>
      </section>

      <section aria-labelledby="cg-hoy-titulo" className="cg-bloque">
        <h2 id="cg-hoy-titulo" className="me-h2">{T.hoy}</h2>
        {deHoy.length ? lista(hoy, deHoy) : <p className="cg-nota">{T.hoyLibre}</p>}
        <p role="status" className="cg-aviso">{aviso}</p>
      </section>

      {deAyer.length > 0 && (
        <section aria-labelledby="cg-ayer-titulo" className="cg-bloque">
          <h2 id="cg-ayer-titulo" className="me-h2">{T.ayer}</h2>
          <p className="cg-nota">{T.ayerAyuda}</p>
          {lista(ayer, deAyer)}
        </section>
      )}

      <section aria-labelledby="cg-semana-titulo" className="tarjeta cg-bloque">
        <h2 id="cg-semana-titulo" className="me-h2">{T.semana}</h2>
        <ol className="cg-semana" role="list">
          {DIAS_SEMANA.map((d, i) => {
            const f = sumar(lunes, i);
            const lista = deDia(f);
            const n = lista.filter((a) => hechas.has(`${a.id}|${f}`)).length;
            const estado = !lista.length ? "libre" : f > hoy ? "futuro" : n === lista.length ? "completo" : n > 0 ? "parcial" : f === hoy ? "hoy" : "pendiente";
            return (
              <li key={f} className={`cg-dia cg-dia--${estado}${f === hoy ? " cg-dia--actual" : ""}`}>
                <span className="cg-dia__nombre">{d.corto}</span>
                <span className="cg-dia__punto" aria-hidden="true" />
                <span className="sr-only">
                  {d.largo}: {lista.length ? `${n} de ${lista.length}` : "día libre"}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="cg-logros-titulo" className="tarjeta cg-bloque cg-logros">
        <h2 id="cg-logros-titulo" className="me-h2">{T.logros}</h2>
        <dl className="cg-cifras">
          <div>
            <dt>{T.creditos}</dt>
            <dd>{progreso?.creditos ?? 0}</dd>
          </div>
          <div>
            <dt>{T.nivel}</dt>
            <dd>
              {nivel.nivel} · {nivel.nombre}
            </dd>
          </div>
          <div>
            <dt>Racha</dt>
            <dd>{T.racha(progreso?.racha ?? 0)}</dd>
          </div>
        </dl>
        {siguiente && (
          <p className="cg-nota">
            Te faltan {Math.max(0, siguiente.minimo - (progreso?.creditos ?? 0))} créditos para el nivel {siguiente.nivel} · {siguiente.nombre}.{" "}
            {progreso ? T.proximoBono(progreso.bono_siguiente) : ""}
          </p>
        )}
      </section>

      <ConCoach sb={sb} pedido={!!cuenta.acceso_pedido_en} />
      <Ajustes sb={sb} datos={datos} alCambiar={alCambiar} salir={salir} />
    </div>
  );
}

function ConCoach({ sb, pedido: yaPedido }: { sb: Cliente; pedido: boolean }) {
  const T = T_GRATIS.coach;
  const [abierto, setAbierto] = useState(false);
  const [apoyo, setApoyo] = useState("nose");
  const [enviando, setEnviando] = useState(false);
  const [pedido, setPedido] = useState(yaPedido);
  const [recien, setRecien] = useState(false);
  const [alerta, setAlerta] = useState<string | null>(null);
  return (
    <section className="tarjeta cg-coach" aria-labelledby="cg-coach-titulo">
      <h2 id="cg-coach-titulo" className="me-h2">{T.titulo}</h2>
      <ul className="cg-coach__puntos">
        {T.puntos.map((p) => (
          <li key={p}>
            <Icono nombre="check" tamaño={16} />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      {pedido ? (
        <p role="status" className="cg-nota cg-nota--ok">
          {recien ? T.enviado(operacion.plazoPrimeraRespuesta ?? "2 días hábiles") : T.pedido}
        </p>
      ) : !abierto ? (
        <button type="button" className="boton boton--primario" onClick={() => setAbierto(true)}>
          {T.boton}
        </button>
      ) : (
        <Formulario
          enviando={enviando}
          onSubmit={() => {
            if (enviando) return;
            setEnviando(true);
            setAlerta(null);
            void sb.rpc("pedir_acompanamiento_libre", { p_apoyo: apoyo }).then(({ error }) => {
              setEnviando(false);
              if (error) return setAlerta(T_GRATIS.espacio.error);
              setPedido(true);
              setRecien(true);
            });
          }}
        >
          <GrupoOpciones id="cg-apoyo" leyenda={T.elegir}>
            {planes.map((p) => (
              <Opcion key={p.id} name="cg-apoyo" value={p.param} titulo={p.nombre} linea={`${p.precio} ${p.periodo}`} checked={apoyo === p.param} onChange={() => setApoyo(p.param)} />
            ))}
            <Opcion name="cg-apoyo" value="nose" titulo={T.noSe} checked={apoyo === "nose"} onChange={() => setApoyo("nose")} />
          </GrupoOpciones>
          <Envio texto={T.enviar} textoEnviando="Avisando…" enviando={enviando} alerta={alerta} />
          <button type="button" className="boton boton--terciario me-boton-izq" onClick={() => setAbierto(false)}>
            {T.cerrar}
          </button>
        </Formulario>
      )}
    </section>
  );
}

function Ajustes({ sb, datos, alCambiar, salir }: { sb: Cliente; datos: DatosLibre; alCambiar: (d: DatosLibre) => void; salir: string }) {
  const T = T_GRATIS.ajustes;
  const vigentes = useMemo(() => datos.acciones.filter((a) => !a.hasta).map((a) => a.titulo), [datos.acciones]);
  const [abierto, setAbierto] = useState(false);
  const [acciones, setAcciones] = useState(vigentes);
  const [dias, setDias] = useState(datos.cuenta.dias);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [borrar, setBorrar] = useState(false);
  return (
    <section className="cg-bloque cg-ajustes" aria-labelledby="cg-ajustes-titulo">
      <h2 id="cg-ajustes-titulo" className="me-h2">{T.titulo}</h2>
      {mensaje && <p role="status" className="cg-nota cg-nota--ok">{mensaje}</p>}
      {!abierto ? (
        <button type="button" className="boton boton--secundario" onClick={() => {
          setAcciones(vigentes);
          setDias(datos.cuenta.dias);
          setMensaje(null);
          setAbierto(true);
        }}>
          {T.abrir}
        </button>
      ) : (
        <Formulario
          largo
          enviando={enviando}
          onSubmit={() => {
            if (enviando || !acciones.length || !dias.length) return;
            setEnviando(true);
            void sb.rpc("ajustar_cuenta_libre", { p: { acciones, dias } }).then(({ data, error }) => {
              setEnviando(false);
              if (error || !data) return setMensaje(T_GRATIS.espacio.error);
              setAbierto(false);
              setMensaje(T.guardado);
              alCambiar(data as DatosLibre);
            });
          }}
        >
          <ElegirDias dias={dias} alCambiar={setDias} error={dias.length ? null : T_GRATIS.partida.errores.dias} />
          <ElegirAcciones area={datos.cuenta.area_id} elegidas={acciones} alCambiar={setAcciones} error={acciones.length ? null : T_GRATIS.partida.errores.acciones} />
          <Envio texto={T.guardar} textoEnviando="Guardando…" enviando={enviando} />
          <button type="button" className="boton boton--terciario me-boton-izq" onClick={() => setAbierto(false)}>
            {T.cancelar}
          </button>
        </Formulario>
      )}
      <details className="cg-borrar" open={borrar} onToggle={(e) => setBorrar((e.target as HTMLDetailsElement).open)}>
        <summary>{T.borrarTitulo}</summary>
        <p className="cg-nota">{T.borrarTexto}</p>
        <button type="button" className="boton boton--secundario cg-peligro" onClick={() => {
          void sb.rpc("borrar_mi_cuenta_libre").then(({ error }) => {
            if (!error) window.location.assign(new URL(`${salir.replace(/^\//, "")}`, new URL(import.meta.env.BASE_URL, window.location.origin)).href);
          });
        }}>
          {T.borrarConfirmar}
        </button>
      </details>
      <Link to={salir} className="boton boton--terciario me-boton-izq">
        {T.salir}
      </Link>
    </section>
  );
}
