// Piezas comunes de las pantallas de Mi espacio (plataforma 4), en la vista previa y en Mi espacio
// real (el modo lo da EspacioContexto, espacio.ts): encabezado de pantalla, estado del programa
// (marcar y desmarcar con créditos) y la fila de acción armada desde una ocurrencia.
//
// Créditos: en Mi espacio real los calcula la base (D4) y el navegador solo los muestra; el check
// cambia al instante y los créditos, la racha y el nivel llegan con la respuesta del servidor.
// En la vista previa se simula esa respuesta con las mismas reglas de rumbo.ts.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Etiqueta from "../../../components/Etiqueta";
import { FilaAccion, Icono, TEXTOS_CARGA } from "../../../components/app";
import { calcularProgreso, cuentaComoHecha, type EstadoRegistro, type Ocurrencia } from "../../../data/ejemplo-app";
import { diaCorto, type Iso } from "../../../lib/fechas";
import { useEspacio, type Progreso } from "./espacio";
import { T_CALENDARIO, T_COMUN } from "./textos";
// Estilos propios de este grupo (solo tokens de :root). Lo importan todas sus pantallas.
import "../../../styles/vista-mi-espacio.css";

export { useEspacio, type Progreso } from "./espacio";

// ---------------------------------------------------------------------------
// Encabezado de pantalla: ojo con la etiqueta «Ejemplo» (punteada), saludo, H1 y bajada.

// En Mi espacio real no hay datos de ejemplo: la etiqueta no se muestra.
export function EtiquetaEjemplo() {
  const { real } = useEspacio();
  if (real) return null;
  return <Etiqueta variante="ejemplo">{T_COMUN.ejemplo}</Etiqueta>;
}

type CabezaProps = {
  ojo?: ReactNode;
  antes?: ReactNode; // saludo o etiqueta de estado, entre el ojo y el H1
  titulo: ReactNode;
  tamaño?: "h2" | "h3" | "titulo"; // H1 con el estilo de --t-h2 (por defecto), --t-h3 o --t-titulo
  bajada?: ReactNode;
  children?: ReactNode;
  className?: string;
  ejemplo?: boolean; // false solo donde nada es dato de ejemplo (Ayuda inmediata)
};

export function Cabeza({ ojo, antes, titulo, tamaño = "h2", bajada, children, className, ejemplo: conEjemplo = true }: CabezaProps) {
  const { real } = useEspacio();
  const ejemplo = conEjemplo && !real;
  return (
    <header className={["me-cabeza", className].filter(Boolean).join(" ")}>
      {(ojo || ejemplo) && (
        <div className="me-cabeza__fila">
          {ojo ? <p className="ojo">{ojo}</p> : <span />}
          {ejemplo && <EtiquetaEjemplo />}
        </div>
      )}
      {antes}
      <h1 className={`me-h1 me-h1--${tamaño}`}>{titulo}</h1>
      {bajada && <div className="me-cabeza__bajada">{typeof bajada === "string" ? <p>{bajada}</p> : bajada}</div>}
      {children}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Programa: lista de acciones con su registro y progreso

export type Cambios = Record<string, EstadoRegistro | null>;

// Ocurrencias con registros cambiados y sin registros posteriores a «hoy» (no se marca el futuro).
export function prepararLista(cambios: Cambios, hoy: Iso, base: Ocurrencia[]): Ocurrencia[] {
  return base.map((o) => {
    const registro = o.id in cambios ? cambios[o.id] : o.registro;
    return { ...o, registro: o.fecha > hoy ? null : registro };
  });
}

const RETARDO_SERVIDOR = 450; // ms: «normalmente menos de un segundo» (4.5)

type OpcionesPrograma = { hoy?: Iso; cambios?: Cambios; base?: Ocurrencia[] };

// Marcar y desmarcar (4.5): el check cambia al instante (respuesta optimista solo del check) y el
// progreso llega con la respuesta del servidor. Si falla, el check vuelve atrás y se llama a
// `fallo` (la pantalla muestra «No pudimos guardar…» con «Reintentar»).
export function usePrograma({ hoy: hoyDado, cambios, base: baseDada }: OpcionesPrograma = {}) {
  const esp = useEspacio();
  const hoy = hoyDado ?? esp.hoy;
  const base = baseDada ?? esp.esc.ocurrencias;
  const servidor = esp.servidor;
  const inicio = esp.ciclo.inicio;
  const [lista, setLista] = useState(() => prepararLista(cambios ?? {}, hoy, base));
  const [confirmada, setConfirmada] = useState(lista);
  const ultima = useRef(lista);
  // Marcas enviadas que el servidor todavía no confirma (sobreviven a una recarga del contexto).
  const pendientes = useRef<Cambios>({});

  // Mi espacio real: cuando el contexto cambia (respuesta del servidor o recarga), la lista se
  // vuelve a armar con lo que dice la base, más lo que aún está en camino.
  useEffect(() => {
    if (!servidor) return;
    const nueva = prepararLista(pendientes.current, hoy, base);
    ultima.current = nueva;
    setLista(nueva);
    setConfirmada(nueva);
  }, [servidor, base, hoy]);

  const simulado = useMemo(() => (servidor ? null : calcularProgreso(confirmada, hoy, inicio)), [servidor, confirmada, hoy, inicio]);
  const progreso: Progreso = esp.progreso && servidor ? esp.progreso : (simulado ?? calcularProgreso(confirmada, hoy, inicio));

  // Registra (o borra, con null) y llama a `listo` con el progreso que devuelve el servidor.
  const registrar = useCallback(
    (id: string, estado: EstadoRegistro | null, listo?: (p: Progreso) => void, fallo?: () => void) => {
      const anterior = ultima.current.find((o) => o.id === id)?.registro ?? null;
      const nueva = ultima.current.map((o) => (o.id === id ? { ...o, registro: estado } : o));
      ultima.current = nueva;
      setLista(nueva);
      if (servidor) {
        pendientes.current = { ...pendientes.current, [id]: estado };
        servidor
          .registrar(id, estado)
          .then((p) => {
            const { [id]: _, ...resto } = pendientes.current;
            pendientes.current = resto;
            listo?.(p);
          })
          .catch(() => {
            const { [id]: _, ...resto } = pendientes.current;
            pendientes.current = resto;
            // Vuelve atrás solo esta acción.
            const revertida = ultima.current.map((o) => (o.id === id ? { ...o, registro: anterior } : o));
            ultima.current = revertida;
            setLista(revertida);
            fallo?.();
          });
        return;
      }
      window.setTimeout(() => {
        setConfirmada(nueva);
        listo?.(calcularProgreso(nueva, hoy, inicio));
      }, RETARDO_SERVIDOR);
    },
    [hoy, servidor, inicio],
  );

  return { lista, progreso, registrar, hoy };
}

// Con dos metas de la misma categoría, la fila muestra el nombre corto de la meta (4.4.5).
export function useEtiquetaMeta() {
  const { metasDeLaPersona, metaPorId } = useEspacio();
  return (o: Ocurrencia): string | undefined => {
    const mismas = metasDeLaPersona(o.metaId).filter((m) => m.categoria === o.categoria);
    return mismas.length > 1 ? metaPorId(o.metaId).corto || metaPorId(o.metaId).titulo : undefined;
  };
}

// ---------------------------------------------------------------------------
// Fila de acción armada desde una ocurrencia

type FilaProps = {
  o: Ocurrencia;
  hoy: Iso;
  onMarcar?: (marcada: boolean) => void;
  onAbrir?: () => void;
  compacta?: boolean;
  nota?: ReactNode;
  extra?: ReactNode;
  futura?: (dia: string) => string; // nota de una acción futura (por defecto «Se marca desde el …»)
  sinConexion?: boolean; // 4.1.4: controles con aria-disabled y «Necesitas conexión para guardar esto.»
  sinControl?: boolean; // «De días anteriores»: las acciones van en `extra`, sin casilla
};

export function FilaOcurrencia({ o, hoy, onMarcar, onAbrir, compacta, nota, extra, futura = T_CALENDARIO.dia.futura, sinConexion, sinControl }: FilaProps) {
  const { dentroDeVentana } = useEspacio();
  const etiquetaMeta = useEtiquetaMeta();
  const estado = cuentaComoHecha(o.registro) ? "hecha" : o.registro === "revision" ? "revision" : "pendiente";
  const desactivada =
    o.fecha > hoy
      ? futura(diaCorto(o.fecha))
      : !dentroDeVentana(o.fecha, hoy)
        ? T_CALENDARIO.dia.cerrada
        : sinConexion
          ? TEXTOS_CARGA.necesitasConexion
          : undefined;
  return (
    <FilaAccion
      titulo={o.titulo}
      hora={o.hora}
      duracion={o.duracion}
      cat={o.categoria}
      etiquetaMeta={etiquetaMeta(o)}
      estado={estado}
      onAbrir={onAbrir}
      onMarcar={onMarcar}
      conFoto={o.conFoto}
      onFoto={onAbrir}
      desactivada={desactivada}
      nota={nota ?? (o.registro === "dejada" ? T_CALENDARIO.dia.dejada : undefined)}
      compacta={compacta}
      extra={extra}
      sinControl={sinControl}
    />
  );
}

// Con horario por hora; después las flexibles.
export const conHorario = (l: Ocurrencia[]) => l.filter((o) => o.hora);
export const flexibles = (l: Ocurrencia[]) => l.filter((o) => !o.hora);

// ---------------------------------------------------------------------------
// Tostada y región viva

export type Aviso = { mensaje: string; accion?: { texto: string; onClick: () => void } } | null;

export function useAvisos() {
  const [tostada, setTostada] = useState<Aviso>(null);
  const [vivo, setVivo] = useState("");
  return { tostada, setTostada, vivo, setVivo, cerrar: () => setTostada(null) };
}

// Región viva para los créditos («{c} créditos. Nivel {n}, {nombre}.»).
export function RegionViva({ texto }: { texto: string }) {
  return (
    <p className="sr-only" aria-live="polite">
      {texto}
    </p>
  );
}

// ---------------------------------------------------------------------------
// «Descargar mis datos» / «Descargar mis registros» (4.14 y 4.3.5): en Mi espacio real,
// exportar_mis_datos(); en la vista previa, un .json con los datos de ejemplo hasta «hoy».

export function bajarJson(nombre: string, datos: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useDescargarDatos() {
  const esp = useEspacio();
  return async (hoy: Iso = esp.hoy) => {
    if (esp.servidor) {
      const datos = await esp.servidor.exportar();
      bajarJson("mis-datos-rumbo.json", datos);
      return;
    }
    const { participante, ciclo, esc } = esp;
    bajarJson("mis-datos-rumbo-ejemplo.json", {
      ejemplo: "Datos de ejemplo de la vista previa de Rumbo. Ninguna persona es real.",
      perfil: { nombre: participante.nombre, correo: participante.correo, zonaHoraria: participante.zonaHoraria },
      ciclos: [ciclo],
      metas: esc.metas,
      acciones: esc.ocurrencias
        .filter((o) => o.fecha <= hoy)
        .map(({ id, titulo, fecha, hora, duracion, metaId, registro }) => ({ id, titulo, fecha, hora, duracion, metaId, registro })),
      registrosSemanales: esc.registrosSemanales,
      revisiones: esc.revisiones.filter((r) => r.publicadaEl),
      solicitudesAjuste: esc.solicitudesAjuste,
    });
  };
}

// ---------------------------------------------------------------------------
// Error al guardar en Mi espacio real (mismo estilo que la zona de envío de los formularios):
// role="alert", sobre el botón. Vacío no ocupa lugar.
export function AlertaGuardar({ texto }: { texto: string | null }) {
  return (
    <div role="alert" className="envio__alerta">
      {texto && (
        <div className="aviso aviso--error-envio">
          <Icono nombre="info" tamaño={20} className="aviso-icono" />
          <div className="aviso-cuerpo">
            <p>{texto}</p>
          </div>
        </div>
      )}
    </div>
  );
}
