import { rutas } from "../data/rumbo";

// Versión del piloto. Pendiente de revisión legal antes de abrir el piloto
// y de actualizar para la Ley 21.719. Ver docs/pendientes.md.
const VERSION = "2 de octubre de 2026";

const bloques = [
  {
    titulo: "Quién es responsable",
    texto: (
      <>
        Rumbo es un proyecto piloto gestionado desde Santiago de Chile. Para cualquier consulta sobre tus datos,
        escríbenos desde la <a href={rutas.contacto}>página de contacto</a>.
      </>
    ),
  },
  {
    titulo: "Qué datos recogemos",
    texto:
      "Solo lo que nos entregas al postular, escribirnos o usar tu espacio: nombre, correo, lo que nos cuentas sobre tu meta, obstáculos y disponibilidad, el programa que preparamos contigo, las acciones que registras y las fotos que subes cuando una acción lo pide.",
  },
  {
    titulo: "Para qué los usamos",
    texto:
      "Para revisar tu postulación, contactarte sobre el piloto, preparar y ajustar tu programa y calcular tu progreso. No vendemos tus datos ni los compartimos con terceros con fines comerciales.",
  },
  {
    titulo: "Información de salud o bienestar",
    texto:
      "Si nos cuentas algo sobre tu salud o bienestar, lo usamos solo para adaptar tu programa, con acceso limitado al equipo que te acompaña. Rumbo no realiza diagnósticos ni tratamientos. No pedimos documentos médicos ni fotografías íntimas.",
  },
  {
    titulo: "Fotos de acciones",
    texto:
      "Las fotos son privadas: solo las ven tú y el equipo autorizado para aprobarlas o rechazarlas. Nunca se publican en el ranking ni en la comunidad, y puedes eliminarlas. Se aceptan JPG, PNG o WebP de hasta 4 MB.",
  },
  {
    titulo: "Dónde se guardan",
    texto:
      "Esta portada se publica en GitHub Pages (GitHub) y sirve sus tipografías desde el mismo sitio: no carga recursos de terceros. La postulación, tu programa y tus fotos se guardan en la plataforma de Rumbo, alojada en Cloudflare, y el acceso a tu espacio usa el inicio de sesión de ChatGPT (OpenAI). Estos proveedores pueden tener servidores fuera de Chile. Esta portada no usa cookies de seguimiento.",
  },
  {
    titulo: "Cuánto tiempo los conservamos",
    texto:
      "Mientras dure el piloto o tu participación. Si tu postulación no avanza, o cuando cierras tu ciclo, puedes pedirnos eliminar tus datos, y lo haremos salvo que debamos conservar algo por obligación legal.",
  },
  {
    titulo: "Comunidad",
    texto:
      "Participar en el foro y el ranking es voluntario y solo muestra tu alias. Puedes borrar tus publicaciones o retirar tu participación cuando quieras.",
  },
  {
    titulo: "Tus derechos",
    texto: (
      <>
        Puedes pedir acceder, corregir o eliminar tus datos, u oponerte a su uso, escribiéndonos desde la{" "}
        <a href={rutas.contacto}>página de contacto</a>, conforme a la Ley N.º 19.628 sobre protección de la vida
        privada. También puedes retirar tu postulación desde el enlace privado que recibes al enviarla.
      </>
    ),
  },
];

export default function Privacidad() {
  return (
    <section className="seccion contenedor angosto legal">
      <p className="ojo">Privacidad</p>
      <h1>Cuidamos lo que nos cuentas.</h1>
      <p className="suave">
        Versión del piloto, {VERSION}. La actualizaremos a medida que el servicio crezca. El aviso detallado de la
        plataforma está en <a href={rutas.privacidadPlataforma}>privacidad del piloto</a>.
      </p>
      <ol className="legal-lista">
        {bloques.map((b, i) => (
          <li key={b.titulo}>
            <span className="paso-numero">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h2>{b.titulo}</h2>
              <p>{b.texto}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
