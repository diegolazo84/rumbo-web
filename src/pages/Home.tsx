import type { CSSProperties } from "react";
import CalendarioEjemplo from "../components/CalendarioEjemplo";
import {
  ESTADO_PILOTO,
  areas,
  categorias,
  niveles,
  nivelPara,
  planes,
  postularHref,
  reglasCreditos,
  rutas,
} from "../data/rumbo";

const pasos = [
  {
    titulo: "Cuéntanos dónde estás",
    texto: "Tu meta (aunque sea difusa), lo que te ha frenado y el tiempo real que tienes cada semana.",
  },
  {
    titulo: "Recibe tu programa preparado",
    texto:
      "El equipo arma un calendario con acciones concretas, horario, duración y una instrucción breve. Lo ves en tu espacio y marcas lo que hiciste.",
  },
  {
    titulo: "Revisamos y ajustamos",
    texto:
      "Cada semana conversamos qué funcionó y qué no. Si algo no se cumplió, buscamos la dificultad y adaptamos la carga.",
  },
];

const ofrece = [
  {
    estado: "Incluido",
    titulo: "Programa a tu medida",
    texto: "Acciones con color por área, horario y duración. Sabes qué hacer y cuándo, sin decidir cada día.",
  },
  {
    estado: "Incluido",
    titulo: "Seguimiento humano",
    texto: "Revisiones semanales y respuestas breves según tu plan. Una persona nota tu avance y te ayuda a ajustar.",
  },
  {
    estado: "Próximamente",
    titulo: "Especialistas",
    texto: "Una consulta profesional individual se acuerda y cotiza por separado, con profesionales habilitados.",
  },
  {
    estado: "En desarrollo",
    titulo: "Guía con IA",
    texto: "Un asistente que te ayude a replanificar al instante. Aún no está activo como servicio.",
  },
];

const preguntas = [
  {
    p: "¿Necesito una cuenta para postular?",
    r: "No. Postular es gratis y no requiere cuenta. Si avanzamos juntos, preparamos tu programa y lo publicamos en tu espacio.",
  },
  {
    p: "¿Cómo entro a mi programa?",
    r: "Desde «Mi espacio». Se abre en la plataforma de Rumbo, en otra dirección web, y hoy pide iniciar sesión con una cuenta de ChatGPT. Si no tienes una, lo vemos en la conversación inicial.",
  },
  {
    p: "¿Y si no tengo una meta clara?",
    r: "Es más común de lo que crees. Cuéntanos lo que te inquieta y en la conversación inicial la aterrizamos contigo.",
  },
  {
    p: "¿Rumbo reemplaza a un psicólogo o nutricionista?",
    r: "No. Rumbo no diagnostica ni sustituye tratamientos. Cuando corresponde, trabajamos alineados con las indicaciones de tus profesionales.",
  },
  {
    p: "¿Hay atención inmediata o una IA disponible?",
    r: "Todavía no. Las respuestas son humanas y dentro de lo acordado en tu plan. La guía con IA está en desarrollo.",
  },
  {
    p: "¿Me van a cobrar al postular?",
    r: "No. Los precios son referenciales y los pagos aún no están habilitados. Antes de cualquier cobro confirmamos alcance y precio contigo.",
  },
  {
    p: "¿Qué pasa si una semana no cumplo?",
    r: "Nada malo. Justamente para eso está la revisión: entender qué pasó y ajustar a algo más posible.",
  },
];

// Ejemplo de la tarjeta de comunidad: 18 créditos.
const CREDITOS_EJEMPLO = 18;

export default function Home() {
  const ejemplo = nivelPara(CREDITOS_EJEMPLO);
  const siguiente = ejemplo.siguiente ?? ejemplo.actual;
  const avanceEjemplo = Math.round(
    ((CREDITOS_EJEMPLO - ejemplo.actual.minimo) / (siguiente.minimo - ejemplo.actual.minimo)) * 100,
  );

  return (
    <>
      <section className="portada">
        <div className="contenedor portada-grilla">
          <div>
            <p className="insignia">{ESTADO_PILOTO}</p>
            <h1>
              Tu meta, convertida en una <em>semana posible.</em>
            </h1>
            <p className="bajada">
              Nos cuentas qué quieres lograr y cuánto tiempo tienes de verdad. El equipo te prepara un calendario con
              acciones concretas, y una persona revisa contigo cada semana qué funcionó.
            </p>
            <div className="acciones">
              <a className="boton boton-primario" href={postularHref()}>
                Cuéntanos tu meta
              </a>
              <a className="boton boton-secundario" href="#como-funciona">
                Ver cómo funciona
              </a>
            </div>
            <ul className="confianza">
              <li>Postular es gratis</li>
              <li>Sin crear cuenta para postular</li>
              <li>Revisión humana</li>
            </ul>
          </div>
          <CalendarioEjemplo />
        </div>
      </section>

      <section className="seccion contenedor">
        <div className="titular-centrado">
          <p className="ojo">Organizar · Actuar · Revisar</p>
          <h2>Cumplirte empieza con un paso posible.</h2>
          <p>
            No necesitas una racha perfecta. Cuando un día se complica, el plan se ajusta contigo. Lo importante no es
            hacerlo todo: es volver a la siguiente acción.
          </p>
        </div>
        <div className="tres">
          <div className="pilar">
            <h3>Una meta clara</h3>
            <p>Aterrizada en lo que sí puedes hacer esta semana.</p>
          </div>
          <div className="pilar">
            <h3>Una acción realista</h3>
            <p>De 5 a 45 minutos, con hora y una instrucción breve.</p>
          </div>
          <div className="pilar">
            <h3>Alguien contigo</h3>
            <p>Una persona real que revisa y ajusta, sin juicios.</p>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="seccion seccion-oscura">
        <div className="contenedor">
          <p className="ojo">Cómo funciona</p>
          <h2>Un método simple para algo que no siempre es fácil.</h2>
          <ol className="pasos">
            {pasos.map((p, i) => (
              <li key={p.titulo}>
                <span className="paso-numero">0{i + 1}</span>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </li>
            ))}
          </ol>
          <p className="nota-clara">
            Postular no es una compra ni una reserva. Revisamos cada postulación a mano y te escribimos si podemos
            acompañarte en esta etapa del piloto.
          </p>
        </div>
      </section>

      <section id="areas" className="seccion contenedor">
        <p className="ojo">Para quién</p>
        <h2>El rumbo cambia según lo que necesitas.</h2>
        <p className="bajada-seccion">
          Elige un área para empezar; puedes combinar más de una en tu programa. El primer piloto se enfoca en
          proyectos, estudio y organización. Las demás áreas las sumamos a medida que tengamos el apoyo profesional que
          requieren.
        </p>
        <div className="areas">
          {areas.map((a) => (
            <article
              key={a.id}
              className="area"
              style={{ "--cat": categorias[a.categoria].color } as CSSProperties}
            >
              <div className="area-etiquetas">
                {a.enPiloto ? (
                  <span className="etiqueta etiqueta-piloto">En el piloto</span>
                ) : (
                  <span className="etiqueta">Próxima etapa</span>
                )}
                {a.nota && <span className="etiqueta">{a.nota}</span>}
              </div>
              <h3>{a.nombre}</h3>
              <p className="area-frase">{a.frase}</p>
              <p>{a.texto}</p>
              <a href={postularHref({ area: a.param })} className="enlace-flecha">
                {a.enPiloto ? "Empezar por aquí" : "Postular a la lista de espera"}
              </a>
            </article>
          ))}
          <article className="area area-abierta">
            <h3>No lo tengo claro aún</h3>
            <p className="area-frase">También se puede empezar por ahí.</p>
            <p>Cuéntanos lo que te inquieta y te ayudamos a definir por dónde comenzar.</p>
            <a href={postularHref()} className="enlace-flecha">
              Contarlo a mi manera
            </a>
          </article>
        </div>
        <p className="aviso-salud">
          Rumbo no diagnostica ni sustituye tratamientos. En salud mental, nutrición y actividad física trabajamos como
          complemento a tus profesionales.
        </p>
      </section>

      <section className="seccion contenedor">
        <p className="ojo">Qué recibes</p>
        <h2>Un calendario claro. Una persona al otro lado.</h2>
        <p className="bajada-seccion">
          Las apps de productividad te dan herramientas. Rumbo te entrega un programa hecho para ti y alguien que lo
          revisa contigo.
        </p>
        <div className="ofrece">
          {ofrece.map((o) => (
            <div key={o.titulo} className="ofrece-item">
              <span className={o.estado === "Incluido" ? "estado estado-si" : "estado"}>{o.estado}</span>
              <h3>{o.titulo}</h3>
              <p>{o.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="comunidad" className="seccion seccion-suave">
        <div className="contenedor dos">
          <div>
            <p className="ojo">Créditos y comunidad</p>
            <h2>Cada paso cuenta. Literalmente.</h2>
            <p>
              Ganas créditos por avanzar, subes de nivel y, si quieres, apareces en un ranking que solo muestra tu
              alias. Tu valor no se mide en una racha: es tu propio avance hecho visible.
            </p>
            <ul className="reglas">
              <li>
                +{reglasCreditos.porAccion} crédito por acción, +{reglasCreditos.bonoDiaCompleto} por día completo.
              </li>
              <li>
                Rachas: con 3 días completos seguidos el bono diario sube a {reglasCreditos.bonoRacha3}, y con 7 días a{" "}
                {reglasCreditos.bonoRacha7}. Un día sin acciones programadas no corta la racha.
              </li>
              <li>Las acciones con foto son privadas; suman cuando el equipo las aprueba.</li>
              <li>Ranking y foro opcionales, moderados y solo con alias.</li>
            </ul>
            <div className="acciones">
              <a className="boton boton-primario" href={postularHref()}>
                Quiero participar en el piloto
              </a>
              <a className="boton boton-secundario" href={rutas.comunidad}>
                Ver la comunidad
              </a>
            </div>
          </div>
          <div className="tarjeta-ranking">
            <p className="ejemplo-rotulo">Ejemplo ilustrativo · nombres ficticios</p>
            <h3>Ranking de la semana</h3>
            <p className="suave">Opcional. Solo se ven alias y créditos.</p>
            <ol className="ranking">
              <li>
                <span>luna_andina</span>
                <span>42 créditos</span>
              </li>
              <li>
                <span>pasito_a_pasito</span>
                <span>37 créditos</span>
              </li>
              <li className="ranking-tu">
                <span>tú</span>
                <span>{CREDITOS_EJEMPLO} créditos</span>
              </li>
            </ol>
            <p className="barra-titulo">
              Nivel {ejemplo.actual.nivel} · {ejemplo.actual.nombre}
            </p>
            <div className="barra" aria-hidden="true">
              <span style={{ width: `${avanceEjemplo}%` }} />
            </div>
            <p className="barra-texto">
              {CREDITOS_EJEMPLO} / {siguiente.minimo} créditos para {siguiente.nombre}
            </p>
            <details className="niveles">
              <summary>Ver los 10 niveles</summary>
              <ol>
                {niveles.map((n) => (
                  <li key={n.nivel}>
                    <span>
                      {n.nivel}. {n.nombre}
                    </span>
                    <span>desde {n.minimo}</span>
                  </li>
                ))}
              </ol>
            </details>
          </div>
        </div>
      </section>

      <section id="planes" className="seccion contenedor">
        <p className="ojo">Planes</p>
        <h2>Ciclos de 4 semanas, con alguien contigo.</h2>
        <p className="bajada-seccion">
          Precios referenciales del piloto, en pesos chilenos. No cobramos nada al postular: confirmamos alcance y
          precio contigo antes. Los pagos aún no están habilitados.
        </p>
        <div className="planes">
          {planes.map((p) => (
            <article key={p.id} className={p.etiqueta ? "plan plan-destacado" : "plan"}>
              {p.etiqueta && <span className="plan-etiqueta">{p.etiqueta}</span>}
              <h3>{p.nombre}</h3>
              <p className="plan-precio">
                {p.precio} <span>{p.periodo}</span>
              </p>
              <ul>
                {p.incluye.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              <a className="boton boton-primario" href={postularHref({ apoyo: p.param })}>
                Postular con este plan
              </a>
            </article>
          ))}
        </div>
        <p className="suave centrado">
          Consultas con especialistas se cotizan aparte · Plan solo plataforma con IA: en desarrollo
        </p>
      </section>

      <section id="preguntas" className="seccion contenedor angosto">
        <p className="ojo">Preguntas</p>
        <h2>Lo que suelen preguntarnos.</h2>
        <div className="preguntas">
          {preguntas.map((q) => (
            <details key={q.p}>
              <summary>{q.p}</summary>
              <p>{q.r}</p>
            </details>
          ))}
        </div>
        <p>
          ¿Otra duda? <a href={rutas.contacto}>Escríbenos</a>.
        </p>
      </section>

      <section className="seccion cierre">
        <div className="contenedor angosto centrado">
          <h2>
            No necesitas tener todo resuelto para <em>empezar.</em>
          </h2>
          <p>
            Cuéntanos tu meta en un formulario corto. Revisamos cada postulación a mano y te escribimos si podemos
            acompañarte en esta etapa del piloto.
          </p>
          <a className="boton boton-primario" href={postularHref()}>
            Cuéntanos tu objetivo
          </a>
          <p className="suave">Piloto en preparación · No se cobra al enviar · No es un servicio de emergencias</p>
        </div>
      </section>
    </>
  );
}
