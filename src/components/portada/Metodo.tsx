// Capítulo 3: Método (5.2). Bosque: los cinco pasos, lo que puedes esperar del piloto y,
// solo si existe operacion.acompanante, quién te acompaña.
import { BASENAME } from "../../base";
import { operacion, rayas, t } from "../../data/rumbo";
import { Aviso, Encabezado, Pasos } from "../Bloques";
import { BotonPostular } from "../Enlaces";
import Icono, { type NombreIcono } from "../Icono";
import { textoRevision } from "./textos";

const pasos = [
  {
    titulo: "Cuéntanos tu meta",
    contenido:
      "Un formulario breve: tu meta (aunque sea difusa), el área y el tipo de apoyo que te interesa. Sin cuenta y sin pago.",
  },
  { titulo: "Revisamos tu solicitud", contenido: textoRevision() },
  {
    titulo: "Acordamos antes de empezar",
    contenido:
      "Si podemos acompañarte, te contactamos para aclarar tu meta, tu tiempo disponible, lo que te ha frenado, el tipo de apoyo, el precio y las condiciones. Nada empieza ni se cobra sin tu acuerdo.",
  },
  {
    titulo: "Recibes tu programa",
    contenido: rayas(
      "El equipo diseña tu calendario —acciones con horario o flexibles, duración e instrucciones— y lo publica en Mi espacio. Marcas lo que haces y ves tu progreso.",
    ),
  },
  {
    titulo: "Revisamos cada semana",
    contenido:
      "Tu coach revisa contigo qué funcionó, por escrito o en una videollamada, según tu plan. Si algo no se cumplió, buscamos la dificultad y ajustamos la carga. Al cerrar el ciclo decidimos juntos si continuar, reformular o terminar.",
  },
];

const esperar: { icono: NombreIcono; titulo: string; texto: string }[] = [
  {
    icono: "check",
    titulo: "Postular no te compromete.",
    texto: "Es gratis, y puedes retirar tu solicitud cuando quieras con tu enlace privado.",
  },
  {
    icono: "user-round",
    titulo: "Una persona lee cada solicitud.",
    texto: operacion.respondemosTodas
      ? "Sin filtros automáticos. Si en esta etapa no podemos acompañarte, te lo diremos."
      : "Sin filtros automáticos: la decisión siempre la toma alguien del equipo.",
  },
  {
    icono: "info",
    titulo: "Nada se cobra sin acuerdo.",
    texto: "El plan, el precio y las condiciones quedan claros antes de empezar.",
  },
  {
    icono: "lock",
    titulo: "Lo tuyo es privado.",
    texto:
      "Tu calendario y tus fotos solo los ven tú y las personas del equipo de Rumbo autorizadas para acompañarte. La comunidad es opcional y solo muestra tu alias.",
  },
];

// «Quién te acompaña»: sin operacion.acompanante no se renderiza nada.
// La foto es opcional, va en public/ y lleva alt vacío porque el nombre está al lado.
function Acompanante() {
  const a = operacion.acompanante;
  if (!a) return null;
  return (
    <div className={a.foto ? "aviso acompanante acompanante--foto" : "aviso acompanante"}>
      {a.foto ? (
        <img
          className="acompanante-foto"
          src={BASENAME + a.foto.replace(/^\//, "")}
          alt=""
          width={96}
          height={96}
          loading="lazy"
        />
      ) : (
        <Icono nombre="user-round" tamaño={20} className="aviso-icono" />
      )}
      <div className="aviso-cuerpo">
        <h3>Quién te acompaña</h3>
        <p>
          {t("{nombre}, {rol}. {bio}", { nombre: a.nombre, rol: a.rol, bio: a.bio })} Su rol es organizar, revisar y
          ajustar tu programa contigo; no es atención psicológica, nutricional ni médica.
        </p>
      </div>
    </div>
  );
}

export default function Metodo() {
  return (
    <section id="como-funciona" className="capitulo capitulo--oscuro">
      <div className="contenedor">
        <div className="partido">
          <Encabezado
            revelar
            variante="partido"
            ojo="Cómo funciona"
            titulo={
              // Grupos sin corte: ninguna línea queda con una sola palabra (aceptación 20).
              <>
                <span className="nowrap">Cumplirte empieza</span> <span className="nowrap">con un</span>{" "}
                <span className="nowrap">paso posible.</span>
              </>
            }
            bajada="Ordenar, hacer y revisar. Así funciona el piloto, desde tu solicitud hasta el cierre de cada ciclo."
            acciones={<BotonPostular ubicacion="metodo" />}
          />
          <div className="partido-contenido metodo" data-revelar="">
            <Pasos pasos={pasos} />
            <Aviso icono="info">
              <p>
                <strong>Postular no es una compra ni una reserva.</strong> Al enviar tu solicitud verás en pantalla un
                enlace privado: guárdalo para consultar su estado o retirarla. No enviamos correos automáticos.
              </p>
            </Aviso>
          </div>
        </div>

        <hr className="separador" />
        <div className="esperar" data-revelar="">
          <h3 className="esperar-titulo">Lo que puedes esperar del piloto</h3>
          <ul className="esperar-lista">
            {esperar.map((e) => (
              <li key={e.titulo}>
                <Icono nombre={e.icono} tamaño={24} />
                <h4>{e.titulo}</h4>
                <p>{e.texto}</p>
              </li>
            ))}
          </ul>
        </div>

        <Acompanante />
      </div>
    </section>
  );
}
