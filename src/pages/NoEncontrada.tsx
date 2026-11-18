import { Encabezado } from "../components/Bloques";
import { Boton, BotonPostular, Enlace } from "../components/Enlaces";
import RutaPuntos from "../components/RutaPuntos";
import { rutas } from "../data/rumbo";

// Página no encontrada (5.6): lectura centrada, con la ruta de puntos terminada en «?» y, desde
// nov-2026, atajos a lo que más se busca para que nadie quede en un callejón sin salida.
const atajos = [
  { href: "/#planes", texto: "Planes y precios" },
  { href: "/#preguntas", texto: "Preguntas frecuentes" },
  { href: rutas.estado, texto: "Estado de tu solicitud" },
  { href: rutas.miEspacio, texto: "Entrar a Mi espacio" },
  { href: "/ayuda/", texto: "Ayuda inmediata" },
];

export default function NoEncontrada() {
  return (
    <div className="lectura lectura--centrada">
      <div className="contenedor contenedor--lectura">
        <RutaPuntos variante="404" />
        <Encabezado
          nivel={1}
          titulo="No encontramos esta página."
          bajada="Puede que el enlace haya cambiado o que la dirección tenga un error."
          acciones={
            <>
              <Boton href="/">Volver al inicio</Boton>
              <BotonPostular variante="secundario" ubicacion="404" />
            </>
          }
        />
        <nav className="atajos" aria-label="Quizás buscabas">
          <p className="atajos-titulo">Quizás buscabas</p>
          <ul>
            {atajos.map((a) => (
              <li key={a.href}>
                <Enlace href={a.href} evento="404-atajo" ubicacion={a.texto}>
                  {a.texto}
                </Enlace>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
