import { useState, type CSSProperties } from "react";
import { bonoDiario, categorias, nivelPara, reglasCreditos, type CategoriaId } from "../data/rumbo";

type Accion = { id: string; titulo: string; hora: string; duracion: string; categoria: CategoriaId };
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
    acciones: [
      { id: "m1", titulo: "Reservar 2 bloques de trabajo", hora: "09:00", duracion: "20 min", categoria: "orden" },
    ],
  },
  {
    nombre: "Miércoles",
    acciones: [
      { id: "x1", titulo: "Conversar con un posible cliente", hora: "18:00", duracion: "45 min", categoria: "proyecto" },
      { id: "x2", titulo: "¿Cómo está tu energía hoy?", hora: "Flexible", duracion: "5 min", categoria: "bienestar" },
    ],
  },
];

// Créditos acumulados en la semana 1 del ejemplo.
const CREDITOS_PREVIOS = 9;

function calcular(hechas: Set<string>) {
  let creditos = CREDITOS_PREVIOS;
  let racha = 0;
  for (const dia of semana) {
    const completas = dia.acciones.filter((a) => hechas.has(a.id)).length;
    creditos += completas * reglasCreditos.porAccion;
    if (completas === dia.acciones.length) {
      racha += 1;
      creditos += bonoDiario(racha);
    } else {
      racha = 0;
    }
  }
  return creditos;
}

export default function CalendarioEjemplo() {
  const [hechas, setHechas] = useState<Set<string>>(() => new Set());
  const creditos = calcular(hechas);
  const { actual, siguiente } = nivelPara(creditos);
  const desde = actual.minimo;
  const hasta = siguiente?.minimo ?? actual.minimo;
  const avance = siguiente ? Math.round(((creditos - desde) / (hasta - desde)) * 100) : 100;

  const alternar = (id: string) =>
    setHechas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });

  return (
    <div className="calendario" role="group" aria-label="Ejemplo de semana en Rumbo">
      <div className="calendario-cabecera">
        <div>
          <p className="calendario-semana">Semana 2 de 4 · Ejemplo</p>
          <p className="calendario-meta">Lanzar mi taller online</p>
        </div>
        <div className="calendario-nivel" aria-live="polite">
          <strong>
            Nivel {actual.nivel} · {actual.nombre}
          </strong>
          <span>{creditos} créditos</span>
        </div>
      </div>
      <div
        className="barra"
        role="progressbar"
        aria-valuemin={desde}
        aria-valuemax={hasta}
        aria-valuenow={creditos}
        aria-label={siguiente ? `Créditos para nivel ${siguiente.nombre}` : "Nivel máximo"}
      >
        <span style={{ width: `${avance}%` }} />
      </div>
      <p className="barra-texto">
        {siguiente ? `${creditos} / ${hasta} créditos para ${siguiente.nombre}` : "Nivel máximo"}
      </p>

      <div className="calendario-dias">
        {semana.map((dia) => (
          <fieldset key={dia.nombre} className="dia">
            <legend>{dia.nombre}</legend>
            {dia.acciones.map((a) => {
              const cat = categorias[a.categoria];
              const marcada = hechas.has(a.id);
              return (
                <label
                  key={a.id}
                  className={marcada ? "accion hecha" : "accion"}
                  style={{ "--cat": cat.color } as CSSProperties}
                >
                  <input type="checkbox" checked={marcada} onChange={() => alternar(a.id)} />
                  <span className="accion-texto">
                    <span className="accion-titulo">{a.titulo}</span>
                    <span className="accion-detalle">
                      {a.hora} · {a.duracion} · <span className="accion-cat">{cat.nombre}</span>
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>
        ))}
      </div>

      <div className="nota-coach">
        <p className="nota-coach-quien">Nota de tu coach · ejemplo</p>
        <p>«¿Qué te ayudó a empezar? Ajustemos la próxima semana a lo que sí funcionó.»</p>
      </div>
      <p className="calendario-pie">
        Ejemplo interactivo: marca las acciones. +1 crédito por acción, +2 por día completo; con 3 días completos
        seguidos el bono sube a 3.
      </p>
    </div>
  );
}
