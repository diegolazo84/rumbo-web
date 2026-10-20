// Rumbo 2.0, etapa 2 · Comunidad: la sección se ve desde ya, rotulada «Próximamente». Es solo
// texto: sin muro de ejemplo, sin publicaciones ni nombres ficticios, sin el ranking de ejemplo
// de la portada y sin botones. Cuando la comunidad exista (etapa 10), esta ruta la mostrará.
import { Link } from "react-router-dom";
import { Icono } from "../../../components/app";
import { useEspacio } from "./comun";
import { TituloSeccion } from "./Seccion";
import { T_COMUNIDAD, T_SECCIONES } from "./textos";

export default function Comunidad() {
  const { R } = useEspacio();
  return (
    <div className="me-pantalla me-pantalla--angosta me-comunidad">
      <TituloSeccion titulo={T_SECCIONES.comunidad} icono="users" pronto bajada={T_COMUNIDAD.bajada} />
      <section className="tarjeta tarjeta--pronto me-pronto" aria-labelledby="comunidad-como">
        <h2 id="comunidad-como" className="me-h2">
          {T_COMUNIDAD.como}
        </h2>
        <ul className="me-pronto__lista">
          {T_COMUNIDAD.reglas.map((r) => (
            <li key={r}>
              <Icono nombre="shield-check" tamaño={16} />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>
      <p className="me-bloque__bajada">{T_COMUNIDAD.cuando}</p>
      <p>
        <Link to={R.loQueViene} className="enlace-flecha">
          {T_COMUNIDAD.verMas}
          <Icono nombre="arrow-right" tamaño={16} />
        </Link>
      </p>
    </div>
  );
}
