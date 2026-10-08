// Vista previa · Calendario (plataforma 4.7): Día, Semana y Mes. El control segmentado cambia
// la vista en la misma pantalla; las flechas recorren días, semanas o meses y «Hoy» vuelve al
// periodo actual. Marcar funciona en memoria, como en Hoy. Una fila abre su detalle en una hoja.
// Sin rojo, cruces ni gris de castigo: un día pasado incompleto no lleva ninguna marca.
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { FranjaSemana, Hoja, Icono, LeyendaMetas, Segmentado, Tostada, type DiaFranja } from "../../../components/app";
import Etiqueta from "../../../components/Etiqueta";
import { cuentaComoHecha, ocurrenciasDel, type Ocurrencia } from "../../../data/ejemplo-app";
import type { CategoriaId } from "../../../data/rumbo";
import {
  anioDe,
  diaCorto,
  fechaLarga,
  inicialDia,
  lunesDe,
  mayuscula,
  mesDe,
  numeroDia,
  rangoSemana,
  semanaDesde,
  sumarDias,
  type Iso,
} from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import {
  EtiquetaEjemplo,
  FilaOcurrencia,
  RegionViva,
  conHorario,
  flexibles,
  useAvisos,
  useEspacio,
  usePrograma,
  type Progreso,
} from "./comun";
import Detalle from "./Detalle";
import { T_CALENDARIO, T_COMUN, T_HOY } from "./textos";

type Vista = "dia" | "semana" | "mes";

// Día de revisión, puntos de color y programa: con el ciclo de la persona (contexto).
function useCalendario() {
  const esp = useEspacio();
  const { enPrograma, fechaRevision, semanaDelCiclo, metaPorId } = esp;
  return {
    ...esp,
    esRevision: (f: Iso) => enPrograma(f) && fechaRevision(semanaDelCiclo(f)) === f,
    puntos: (l: Ocurrencia[]): CategoriaId[] => [...new Set(l.map((o) => metaPorId(o.metaId).categoria))],
  };
}
const CLAVE_VISTA = "rumbo-calendario-vista";
const primeroDelMes = (f: Iso) => `${f.slice(0, 8)}01`;
function sumarMeses(f: Iso, n: number): Iso {
  const [a, m] = f.split("-").map(Number);
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}

export default function Calendario({ estado = "semana" }: PropsPantalla) {
  const { real, esc, ciclo, enPrograma, semanaDelCiclo, esRevision } = useCalendario();
  const metas = esc.metas;
  const [vista, setVista] = useState<Vista>((["dia", "semana", "mes"].includes(estado) ? estado : "semana") as Vista);
  const { lista, progreso, registrar, hoy } = usePrograma();
  const [fecha, setFecha] = useState<Iso>(hoy);
  const { search } = useLocation();

  // Mi espacio real (4.7.1): ?vista= y ?fecha= mandan; si no, la vista recordada en este
  // dispositivo (por defecto Semana). Se leen después de hidratar.
  useEffect(() => {
    if (!real) return;
    const q = new URLSearchParams(search);
    let v = q.get("vista");
    if (!v) {
      try {
        v = localStorage.getItem(CLAVE_VISTA);
      } catch {
        v = null;
      }
    }
    if (v === "dia" || v === "semana" || v === "mes") setVista(v);
    const f = q.get("fecha");
    if (f && /^\d{4}-\d{2}-\d{2}$/.test(f)) setFecha(f);
  }, [real, search]);
  useEffect(() => {
    if (!real) return;
    try {
      localStorage.setItem(CLAVE_VISTA, vista);
    } catch {
      /* sin almacenamiento */
    }
  }, [real, vista]);
  const { tostada, setTostada, vivo, setVivo, cerrar } = useAvisos();
  const [abierta, setAbierta] = useState<string | null>(null);
  const [leyenda, setLeyenda] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const moverFoco = useRef(false);
  const detalle = abierta ? lista.find((o) => o.id === abierta) : undefined;

  // Al cambiar de periodo con el teclado, el foco queda en los botones; al abrir un día desde
  // el mes, pasa al título del día.
  useEffect(() => {
    if (!moverFoco.current) return;
    moverFoco.current = false;
    titulo.current?.focus();
  }, [vista, fecha]);

  const anunciar = (p: Progreso) => setVivo(T_HOY.marcar.vivo(p.creditos, p.nivel.nivel, p.nivel.nombre));
  const fallo = (o: Ocurrencia, reintentar: () => void) => () =>
    setTostada({ mensaje: T_HOY.marcar.error(o.titulo), accion: { texto: T_HOY.marcar.reintentar, onClick: reintentar } });
  const marcar = (o: Ocurrencia, marcada: boolean): void =>
    registrar(o.id, marcada ? "hecha" : null, (p) => {
      anunciar(p);
      if (!marcada) return setTostada({ mensaje: T_HOY.marcar.desmarcaste(o.titulo, p.creditos) });
      const dia = p.dias.find((d) => d.fecha === o.fecha);
      setTostada({
        mensaje: dia?.estado === "completo" ? T_HOY.marcar.completaste(1 + dia.bono) : T_HOY.marcar.marcaste(o.titulo),
        accion: { texto: T_HOY.marcar.deshacer, onClick: () => marcar(o, false) },
      });
    }, fallo(o, () => marcar(o, marcada)));

  const paso = (n: number) => setFecha((f) => (vista === "dia" ? sumarDias(f, n) : vista === "semana" ? sumarDias(f, 7 * n) : sumarMeses(f, n)));
  const enActual =
    vista === "dia" ? fecha === hoy : vista === "semana" ? lunesDe(fecha) === lunesDe(hoy) : primeroDelMes(fecha) === primeroDelMes(hoy);

  let textoTitulo: string;
  if (vista === "dia") textoTitulo = mayuscula(fechaLarga(fecha));
  else if (vista === "semana") {
    const lunes = lunesDe(fecha);
    textoTitulo = enPrograma(lunes) ? T_CALENDARIO.tituloSemana(semanaDelCiclo(lunes), ciclo.semanas, rangoSemana(lunes)) : mayuscula(rangoSemana(lunes));
  } else textoTitulo = `${mayuscula(mesDe(fecha))} ${anioDe(fecha)}`;

  const filaProps = (o: Ocurrencia) => ({
    o,
    hoy,
    onMarcar: (m: boolean) => marcar(o, m),
    onAbrir: () => setAbierta(o.id),
  });

  return (
    <div className="me-pantalla me-calendario">
      <div className="me-calendario__barra">
        <Segmentado
          leyenda={T_CALENDARIO.leyendaVistas}
          leyendaOculta
          name="vista-calendario"
          opciones={T_CALENDARIO.vistas}
          valor={vista}
          onCambio={(v) => setVista(v as Vista)}
        />
        <EtiquetaEjemplo />
      </div>

      <div className="me-calendario__nav">
        <button type="button" className="boton-icono me-flecha" onClick={() => paso(-1)}>
          <Icono nombre="chevron-left" tamaño={24} />
          <span className="sr-only">{T_CALENDARIO.anterior[vista]}</span>
        </button>
        <h1 className="me-h1 me-h1--h3 me-calendario__titulo" tabIndex={-1} ref={titulo} aria-live="polite">
          {textoTitulo}
          {vista === "dia" && esRevision(fecha) && (
            <>
              <Icono nombre="message-circle" tamaño={16} className="me-icono-revision" />
              <span className="sr-only">{T_CALENDARIO.diaRevision}</span>
            </>
          )}
        </h1>
        <button type="button" className="boton-icono me-flecha" onClick={() => paso(1)}>
          <Icono nombre="chevron-right" tamaño={24} />
          <span className="sr-only">{T_CALENDARIO.siguiente[vista]}</span>
        </button>
        {!enActual && (
          <button type="button" className="boton boton--secundario me-boton-chico me-calendario__hoy" onClick={() => setFecha(hoy)}>
            {T_CALENDARIO.hoy}
          </button>
        )}
      </div>

      <div className="me-calendario__leyenda">
        <button type="button" className="boton boton--terciario me-boton-izq me-solo-movil" aria-haspopup="dialog" onClick={() => setLeyenda(true)}>
          <span className="me-puntos" aria-hidden="true">
            {metas.map((m) => (
              <span key={m.id} className="punto-meta" data-cat={m.categoria} />
            ))}
          </span>
          {T_CALENDARIO.colores}
        </button>
        <div className="me-solo-escritorio">
          <LeyendaMetas metas={metas} etiqueta={T_CALENDARIO.colores} />
        </div>
      </div>

      {vista === "dia" && <VistaDia fecha={fecha} hoy={hoy} lista={lista} fila={filaProps} />}
      {vista === "semana" && <VistaSemana fecha={fecha} hoy={hoy} lista={lista} progreso={progreso} fila={filaProps} />}
      {vista === "mes" && (
        <VistaMes
          fecha={fecha}
          hoy={hoy}
          lista={lista}
          progreso={progreso}
          onAbrirDia={(f) => {
            moverFoco.current = true;
            setFecha(f);
            setVista("dia");
          }}
        />
      )}

      <Hoja abierta={leyenda} onCerrar={() => setLeyenda(false)} titulo={T_CALENDARIO.colores}>
        <LeyendaMetas metas={metas} />
      </Hoja>
      <Hoja abierta={!!detalle} onCerrar={() => setAbierta(null)} titulo={detalle?.titulo ?? ""} className="hoja--detalle">
        {detalle && (
          <Detalle o={detalle} hoy={hoy} enHoja onRegistrar={(e) => registrar(detalle.id, e, anunciar, fallo(detalle, () => registrar(detalle.id, e, anunciar)))} />
        )}
      </Hoja>
      <Tostada mensaje={tostada?.mensaje ?? null} accion={tostada?.accion} onCerrar={cerrar} textoCerrar={T_COMUN.cerrar} />
      <RegionViva texto={vivo} />
    </div>
  );
}

type FilaDe = (o: Ocurrencia) => {
  o: Ocurrencia;
  hoy: Iso;
  onMarcar: (m: boolean) => void;
  onAbrir: () => void;
};

// ---------------------------------------------------------------------------
// Día (4.7.2): igual que la lista de Hoy para cualquier fecha, sin novedades ni resumen.

function VistaDia({ fecha, hoy, lista, fila }: { fecha: Iso; hoy: Iso; lista: Ocurrencia[]; fila: FilaDe }) {
  const { enPrograma } = useCalendario();
  const del = ocurrenciasDel(fecha, lista);
  if (!enPrograma(fecha))
    return <p className="me-calendario__vacio">{T_CALENDARIO.fuera}</p>;
  if (!del.length)
    return (
      <div className="me-calendario__vacio">
        <p>{T_CALENDARIO.dia.vacio}</p>
        {fecha <= hoy && <p>{T_CALENDARIO.dia.noCorta}</p>}
      </div>
    );
  const grupos = [
    { titulo: T_CALENDARIO.dia.conHorario, l: conHorario(del) },
    { titulo: fecha === hoy ? T_CALENDARIO.dia.flexiblesHoy : T_CALENDARIO.dia.flexibles, l: flexibles(del) },
  ].filter((g) => g.l.length);
  return (
    <div className="me-bloque me-cal-dia">
      {grupos.map((g) => (
        <div key={g.titulo} className="me-grupo">
          <h2 className="me-grupo__titulo">{g.titulo}</h2>
          <ul className="me-filas">
            {g.l.map((o) => (
              <li key={o.id}>
                <FilaOcurrencia {...fila(o)} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Semana (4.7.3): lista por día en todos los anchos, con la franja de días pegajosa arriba.

function VistaSemana({ fecha, hoy, lista, progreso, fila }: { fecha: Iso; hoy: Iso; lista: Ocurrencia[]; progreso: Progreso; fila: FilaDe }) {
  const { enPrograma, esRevision, puntos } = useCalendario();
  const nombreDia = useNombreDia();
  const dias = semanaDesde(lunesDe(fecha));
  const [elegido, setElegido] = useState<string | undefined>(undefined);

  const franja: DiaFranja[] = dias.map((d) => {
    const del = ocurrenciasDel(d, lista);
    const p = progreso.dias.find((x) => x.fecha === d);
    return {
      fecha: d,
      inicial: inicialDia(d),
      numero: numeroDia(d),
      puntos: puntos(del),
      hoy: d === hoy,
      completo: p?.estado === "completo",
      fuera: !enPrograma(d),
      nombre: nombreDia(d, del, p?.estado === "completo", d > hoy),
    };
  });

  const actual = lunesDe(fecha) === lunesDe(hoy);
  const hasta = dias.filter((d) => d <= hoy && enPrograma(d)).flatMap((d) => ocurrenciasDel(d, lista));
  const registradas = hasta.filter((o) => cuentaComoHecha(o.registro)).length;

  const ir = (d: string) => {
    setElegido(d);
    const el = document.getElementById(`dia-${d}`);
    el?.scrollIntoView({ block: "start" });
    el?.querySelector<HTMLElement>("legend")?.focus();
  };

  return (
    <div className="me-cal-semana">
      <FranjaSemana dias={franja} elegido={elegido} onElegir={ir} etiqueta={T_CALENDARIO.semana.diasDeLaSemana} />
      <div className="me-cal-semana__dias">
        {dias.map((d) => {
          const del = ocurrenciasDel(d, lista);
          const p = progreso.dias.find((x) => x.fecha === d);
          return (
            <fieldset key={d} id={`dia-${d}`} className={d === hoy ? "dia me-dia me-dia--hoy" : "dia me-dia"}>
              <legend tabIndex={-1}>
                <span className="me-dia__nombre">
                  {mayuscula(diaCorto(d))}
                  {esRevision(d) && (
                    <>
                      <Icono nombre="message-circle" tamaño={12} className="me-icono-revision" />
                      <span className="sr-only">{T_CALENDARIO.diaRevision}</span>
                    </>
                  )}
                </span>
                {p?.estado === "completo" && <Etiqueta variante="activo">{T_HOY.diaCompleto(p.bono)}</Etiqueta>}
              </legend>
              {!enPrograma(d) ? (
                <p className="me-dia__vacio">{T_CALENDARIO.fuera}</p>
              ) : del.length ? (
                <ul className="me-filas">
                  {del.map((o) => (
                    <li key={o.id}>
                      <FilaOcurrencia {...fila(o)} compacta />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="me-dia__vacio">{T_CALENDARIO.semana.sinAcciones}</p>
              )}
            </fieldset>
          );
        })}
      </div>
      {actual && <p className="calendario-pie me-cal-semana__pie">{T_CALENDARIO.semana.pie(registradas, hasta.length)}</p>}
    </div>
  );
}

// Nombre accesible de un día (franja y mes): «Martes 13 de octubre: 3 acciones, 1 hecha.»
function useNombreDia() {
  const { enPrograma } = useCalendario();
  return (d: Iso, del: Ocurrencia[], completo: boolean, futuro: boolean) => {
    const f = mayuscula(fechaLarga(d));
    if (!enPrograma(d)) return T_CALENDARIO.mes.fuera(f);
    if (!del.length) return T_CALENDARIO.mes.sinAcciones(f);
    if (completo) return T_CALENDARIO.mes.completo(f);
    return T_CALENDARIO.mes.celda(f, del.length, futuro ? null : del.filter((o) => cuentaComoHecha(o.registro)).length);
  };
}

// ---------------------------------------------------------------------------
// Mes (4.7.4): grilla de 7 columnas; cada celda abre la vista Día.

function VistaMes({ fecha, hoy, lista, progreso, onAbrirDia }: { fecha: Iso; hoy: Iso; lista: Ocurrencia[]; progreso: Progreso; onAbrirDia: (f: Iso) => void }) {
  const { enPrograma, puntos } = useCalendario();
  const nombreDia = useNombreDia();
  const primero = primeroDelMes(fecha);
  const siguiente = sumarMeses(primero, 1);
  const inicio = lunesDe(primero);
  const celdas: Iso[] = [];
  for (let d = inicio; d < siguiente || celdas.length % 7; d = sumarDias(d, 1)) celdas.push(d);

  const delMes = (d: Iso) => d >= primero && d < siguiente;
  const registradas = lista.filter((o) => delMes(o.fecha) && o.vigente && o.fecha <= hoy && cuentaComoHecha(o.registro)).length;
  const completos = progreso.dias.filter((x) => delMes(x.fecha) && x.estado === "completo").length;

  return (
    <div className="me-cal-mes">
      <div className="me-mes" role="group" aria-label={`${mayuscula(mesDe(primero))} ${anioDe(primero)}`}>
        {T_CALENDARIO.mes.dias.map((l, i) => (
          <span key={i} className="me-mes__cabeza" aria-hidden="true">
            {l}
          </span>
        ))}
        {celdas.map((d) => {
          if (!delMes(d)) return <span key={d} className="me-mes__celda me-mes__celda--vacia" aria-hidden="true" />;
          const del = ocurrenciasDel(d, lista);
          const p = progreso.dias.find((x) => x.fecha === d);
          const completo = p?.estado === "completo";
          const fuera = !enPrograma(d);
          const clases = ["me-mes__celda", d === hoy && "es-hoy", completo && "es-completo", fuera && "es-fuera"].filter(Boolean).join(" ");
          const pts = puntos(del);
          return (
            <button key={d} type="button" className={clases} aria-label={nombreDia(d, del, completo, d > hoy)} onClick={() => onAbrirDia(d)}>
              <span className="me-mes__numero" aria-hidden="true">
                {numeroDia(d)}
              </span>
              <span className="me-mes__puntos" aria-hidden="true">
                {pts.slice(0, 3).map((c) => (
                  <span key={c} className="punto-meta" data-cat={c} />
                ))}
                {pts.length > 3 && <span className="me-mes__mas">+</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="calendario-pie">
        {registradas ? T_CALENDARIO.mes.pie(mesDe(primero), registradas, completos) : T_CALENDARIO.mes.vacio}
      </p>
    </div>
  );
}
