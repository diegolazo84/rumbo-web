// Calendario de ejemplo (3.13): la pieza de producto de la portada. Datos ficticios,
// sin fechas, rotulados como ejemplo. Las reglas vienen de reglasCreditos y bonoDiario.
import { useRef, useState } from "react";
import { bonoDiario, categorias, estados, nivelPara, reglasCreditos, t, type CategoriaId } from "../data/rumbo";
import Etiqueta, { EtiquetaCategoria } from "./Etiqueta";
import Icono from "./Icono";

type Accion = { id: string; titulo: string; hora: string | null; duracion: string; categoria: CategoriaId };
type Dia = { nombre: string; acciones: Accion[] };

const semana: Dia[] = [
  {
    nombre: "Lunes",
    acciones: [
      { id: "l1", titulo: "Escribir a quién quieres ayudar", hora: "08:30", duracion: "30 min", categoria: "proyecto" },
      { id: "l2", titulo: "Cerrar el día: 3 cosas que hiciste", hora: "21:00", duracion: "10 min", categoria: "bienestar" },
    ],
  },
  {
    nombre: "Martes",
    acciones: [{ id: "m1", titulo: "Reservar 2 bloques de trabajo", hora: "09:00", duracion: "20 min", categoria: "orden" }],
  },
  {
    nombre: "Miércoles",
    acciones: [
      { id: "x1", titulo: "Conversar con un posible cliente", hora: "18:00", duracion: "45 min", categoria: "proyecto" },
      { id: "x2", titulo: "Pausa de 5 minutos lejos de la pantalla", hora: null, duracion: "5 min", categoria: "bienestar" },
    ],
  },
];

// Créditos acumulados en la semana 1 del ejemplo.
const CREDITOS_PREVIOS = 9;

// Créditos totales y bono de cada día completo (null si el día no está completo).
function calcular(hechas: Set<string>) {
  let creditos = CREDITOS_PREVIOS;
  let racha = 0;
  const bonos: (number | null)[] = [];
  for (const dia of semana) {
    const completas = dia.acciones.filter((a) => hechas.has(a.id)).length;
    creditos += completas * reglasCreditos.porAccion;
    if (completas === dia.acciones.length) {
      racha += 1;
      const bono = bonoDiario(racha);
      creditos += bono;
      bonos.push(bono);
    } else {
      racha = 0;
      bonos.push(null);
    }
  }
  return { creditos, bonos };
}

const PIE = t(
  "Ejemplo interactivo con datos ficticios: marca las acciones y mira cómo suman. +{porAccion} crédito por acción y +{bonoDiaCompleto} si completas el día; con {diasRachaMedia} días completos seguidos, ese bono sube a {bonoRacha3}.",
  reglasCreditos,
);

export default function CalendarioEjemplo() {
  const [hechas, setHechas] = useState<Set<string>>(() => new Set());
  const [aviso, setAviso] = useState("");
  // Última acción marcada: muestra la ficha «+1». La clave reinicia la animación.
  const [ficha, setFicha] = useState<{ id: string; clave: number } | null>(null);
  // Se incrementa al subir de nivel: reinicia el destello de la etiqueta.
  const [destello, setDestello] = useState(0);
  const interactuo = useRef(false);

  const { creditos, bonos } = calcular(hechas);
  const { actual, siguiente } = nivelPara(creditos);
  const desde = actual.minimo;
  const hasta = siguiente?.minimo ?? actual.minimo;
  const avance = siguiente ? Math.round(((creditos - desde) / (hasta - desde)) * 100) : 100;

  const alternar = (id: string) => {
    const nuevo = new Set(hechas);
    const marca = !nuevo.has(id);
    if (marca) nuevo.add(id);
    else nuevo.delete(id);
    setHechas(nuevo);
    const c = calcular(nuevo).creditos;
    const n = nivelPara(c).actual;
    setAviso(`${c} créditos. Nivel ${n.nivel}, ${n.nombre}.`);
    setFicha(marca ? { id, clave: Date.now() } : null);
    if (n.nivel > actual.nivel) setDestello((d) => d + 1);
    if (marca && !interactuo.current) {
      interactuo.current = true;
      window.umami?.track("calendario-interactuar");
    }
  };

  return (
    <figure className="tarjeta tarjeta--producto calendario" aria-label="Ejemplo de semana en Rumbo">
      <div className="calendario-cabecera">
        <div className="calendario-fila">
          <p className="ojo ojo--suave">Semana 2 de 4</p>
          <Etiqueta variante={estados.ejemplo.variante}>{estados.ejemplo.texto}</Etiqueta>
        </div>
        <div className="calendario-fila">
          <p className="calendario-titulo">Lanzar mi taller en línea</p>
          <p className="calendario-nivel">
            <Etiqueta
              key={destello}
              variante="activo"
              grande
              nowrap
              className={destello > 0 ? "destello" : undefined}
            >
              Nivel {actual.nivel} · {actual.nombre}
            </Etiqueta>
            <span className="calendario-creditos">{creditos} créditos</span>
          </p>
        </div>
      </div>

      <div className="calendario-leyenda">
        {(Object.keys(categorias) as CategoriaId[]).map((c) => (
          <EtiquetaCategoria key={c} cat={c} />
        ))}
      </div>

      <div className="calendario-progreso">
        <div
          className="barra"
          role="progressbar"
          aria-valuemin={desde}
          aria-valuemax={hasta}
          aria-valuenow={creditos}
          aria-label={siguiente ? `Créditos para llegar a ${siguiente.nombre}` : "Nivel máximo"}
          aria-valuetext={siguiente ? `${creditos} de ${hasta} créditos` : `${creditos} créditos`}
        >
          {/* Único estilo en línea permitido: el ancho de la barra. */}
          <span className="barra-relleno" style={{ inlineSize: `${avance}%` }} />
        </div>
        <p className="barra-texto">
          {siguiente ? `${creditos} de ${hasta} créditos para llegar a ${siguiente.nombre}` : "Nivel máximo"}
        </p>
      </div>

      <div className="calendario-dias">
        {semana.map((dia, d) => (
          <fieldset key={dia.nombre} className="dia">
            <legend>
              <span>{dia.nombre}</span>
              {bonos[d] !== null && (
                <Etiqueta variante="activo">
                  Día completo · +{bonos[d]}
                </Etiqueta>
              )}
            </legend>
            {dia.acciones.map((a) => {
              const marcada = hechas.has(a.id);
              return (
                <label key={a.id} className={marcada ? "accion accion--hecha" : "accion"} data-cat={a.categoria}>
                  <span className="accion-hora">{a.hora ?? "Flexible"}</span>
                  <span className="accion-texto">
                    <span className="accion-titulo">{a.titulo}</span>
                    <span className="accion-detalle">
                      {a.duracion} · <span className="accion-cat">{categorias[a.categoria].nombre}</span>
                      {marcada && " · Hecha"}
                    </span>
                  </span>
                  <input type="checkbox" checked={marcada} onChange={() => alternar(a.id)} />
                  {ficha?.id === a.id && (
                    <span key={ficha.clave} className="accion-ficha" aria-hidden="true">
                      +{reglasCreditos.porAccion}
                    </span>
                  )}
                </label>
              );
            })}
          </fieldset>
        ))}
      </div>

      <div className="nota-coach">
        <span className="icono-mosaico">
          <Icono nombre="message-circle" tamaño={22} />
        </span>
        <div>
          <p className="nota-coach-rotulo">Nota de tu coach · ejemplo</p>
          <p className="voz">
            <q>¿Qué te ayudó a empezar? Ajustemos la próxima semana a lo que sí funcionó.</q>
          </p>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {aviso}
      </p>
      <figcaption className="calendario-pie">{PIE}</figcaption>
    </figure>
  );
}
