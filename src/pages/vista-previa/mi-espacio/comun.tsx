// Piezas comunes de las pantallas de Mi espacio en la vista previa (plataforma 4). Solo las usa
// este grupo: encabezado de pantalla, rutas entre pantallas, estado del programa en memoria
// (marcar y desmarcar con créditos recalculados) y la fila de acción armada desde una ocurrencia.
//
// Créditos en memoria: en la v1 real los calcula la base (D4) y el navegador solo los muestra.
// Aquí se simula la respuesta del servidor: el check cambia al instante y los créditos, la racha
// y el nivel se actualizan un momento después, con las mismas reglas de rumbo.ts.
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import Etiqueta from "../../../components/Etiqueta";
import { FilaAccion, TEXTOS_CARGA } from "../../../components/app";
import {
  HOY,
  calcularProgreso,
  ciclo,
  cuentaComoHecha,
  metaPorId,
  metas,
  metasDeLaPersona,
  ocurrencias,
  participante,
  registrosSemanales,
  revisiones,
  solicitudesAjuste,
  type EstadoRegistro,
  type Ocurrencia,
} from "../../../data/ejemplo-app";
import { LIMITES } from "../../../data/formularios";
import { diaCorto, sumarDias, type Iso } from "../../../lib/fechas";
import { RUTAS_MI_ESPACIO, RUTAS_PUBLICAS, rutaPrevia } from "../rutas";
import { T_CALENDARIO, T_COMUN } from "./textos";
// Estilos propios de este grupo (solo tokens de :root). Lo importan todas sus pantallas.
import "../../../styles/vista-mi-espacio.css";

// ---------------------------------------------------------------------------
// Rutas de la vista previa entre pantallas de Mi espacio

export const R = {
  ...RUTAS_MI_ESPACIO,
  postular: RUTAS_PUBLICAS.postular,
  entrar: rutaPrevia("mi-espacio/entrar/"),
  revisaCorreo: rutaPrevia("mi-espacio/entrar/revisa-tu-correo/"),
  calendarioDia: rutaPrevia("mi-espacio/calendario/dia/"),
  calendarioMes: rutaPrevia("mi-espacio/calendario/mes/"),
  accion: rutaPrevia("mi-espacio/accion/"),
  creditos: rutaPrevia("mi-espacio/progreso/creditos/"),
  semanaPublicada: rutaPrevia("mi-espacio/semana/publicada/"),
  semanaEnviado: rutaPrevia("mi-espacio/semana/enviado/"),
  ajusteLista: `${RUTAS_MI_ESPACIO.ajuste}#tus-solicitudes`,
  eliminar: rutaPrevia("mi-espacio/preferencias/eliminar/"),
  ayuda: rutaPrevia("mi-espacio/ayuda/"),
  privacidad: "/privacidad/",
  condiciones: "/condiciones/",
} as const;

// Pedir un ajuste con una acción elegida (se preselecciona en el formulario).
export const rutaAjuste = (ocurrencia?: string, tipo?: string) => {
  const q = new URLSearchParams();
  if (ocurrencia) q.set("accion", ocurrencia);
  if (tipo) q.set("tipo", tipo);
  const s = q.toString();
  return s ? `${RUTAS_MI_ESPACIO.ajuste}?${s}` : RUTAS_MI_ESPACIO.ajuste;
};

// ---------------------------------------------------------------------------
// Encabezado de pantalla: ojo con la etiqueta «Ejemplo» (punteada), saludo, H1 y bajada.

export function EtiquetaEjemplo() {
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

export function Cabeza({ ojo, antes, titulo, tamaño = "h2", bajada, children, className, ejemplo = true }: CabezaProps) {
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
// Programa en memoria

export type Progreso = ReturnType<typeof calcularProgreso>;
export type Cambios = Record<string, EstadoRegistro | null>;

// Ocurrencias con registros cambiados y sin registros posteriores a «hoy» (no se marca el futuro).
export function prepararLista(cambios: Cambios = {}, hoy: Iso = HOY, base: Ocurrencia[] = ocurrencias): Ocurrencia[] {
  return base.map((o) => {
    const registro = o.id in cambios ? cambios[o.id] : o.registro;
    return { ...o, registro: o.fecha > hoy ? null : registro };
  });
}

const RETARDO_SERVIDOR = 450; // ms: «normalmente menos de un segundo» (4.5)

export function usePrograma({ hoy = HOY, cambios = {} as Cambios, base = ocurrencias } = {}) {
  const [lista, setLista] = useState(() => prepararLista(cambios, hoy, base));
  const [confirmada, setConfirmada] = useState(lista);
  const ultima = useRef(lista);
  const progreso = useMemo(() => calcularProgreso(confirmada, hoy), [confirmada, hoy]);

  // Registra (o borra, con null) y llama a `listo` con el progreso que devuelve el «servidor».
  const registrar = useCallback(
    (id: string, estado: EstadoRegistro | null, listo?: (p: Progreso) => void) => {
      const nueva = ultima.current.map((o) => (o.id === id ? { ...o, registro: estado } : o));
      ultima.current = nueva;
      setLista(nueva);
      window.setTimeout(() => {
        setConfirmada(nueva);
        listo?.(calcularProgreso(nueva, hoy));
      }, RETARDO_SERVIDOR);
    },
    [hoy],
  );

  return { lista, progreso, registrar, hoy };
}

export const dentroDeVentana = (fecha: Iso, hoy: Iso) => fecha <= hoy && fecha >= sumarDias(hoy, -LIMITES.diasRegistroTardio);
export const enPrograma = (fecha: Iso) => fecha >= ciclo.inicio && fecha <= ciclo.fin;

// Con dos metas de la misma categoría, la fila muestra el nombre corto de la meta (4.4.5).
export function etiquetaMeta(o: Ocurrencia): string | undefined {
  const mismas = metasDeLaPersona(o.metaId).filter((m) => m.categoria === o.categoria);
  return mismas.length > 1 ? metaPorId(o.metaId).corto : undefined;
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
// «Descargar mis datos» / «Descargar mis registros» (4.14 y 4.3.5): en la v1, exportar_mis_datos().
// En la vista previa baja un .json con los datos de ejemplo hasta «hoy».

export function descargarDatos(hoy: Iso = HOY) {
  const datos = {
    ejemplo: "Datos de ejemplo de la vista previa de Rumbo. Ninguna persona es real.",
    perfil: { nombre: participante.nombre, correo: participante.correo, zonaHoraria: participante.zonaHoraria },
    ciclos: [ciclo],
    metas,
    acciones: ocurrencias
      .filter((o) => o.fecha <= hoy)
      .map(({ id, titulo, fecha, hora, duracion, metaId, registro }) => ({ id, titulo, fecha, hora, duracion, metaId, registro })),
    registrosSemanales,
    revisiones: revisiones.filter((r) => r.publicadaEl),
    solicitudesAjuste,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "mis-datos-rumbo-ejemplo.json";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
