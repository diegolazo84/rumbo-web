import { Link } from "react-router-dom";

export default function NoEncontrada() {
  return (
    <section className="seccion contenedor angosto">
      <p className="ojo">Página no encontrada</p>
      <h1>Esta página no existe.</h1>
      <p>
        Puede que el enlace haya cambiado. <Link to="/">Volver al inicio</Link>.
      </p>
    </section>
  );
}
