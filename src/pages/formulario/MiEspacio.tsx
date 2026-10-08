// Mi espacio (/mi-espacio/) mientras no haya cuentas: qué es, cuándo se abre y cómo se entra.
// Mismo diseño que /estado/ (PaginaConAside, EstadoVacio y el aside de ayuda). No muestra datos de
// nadie: el ejemplo vive en /vista-previa/mi-espacio/ y se enlaza rotulado como ejemplo.
import { Link } from "react-router-dom";
import { ListaCheck } from "../../components/Bloques";
import { BotonPostular } from "../../components/Enlaces";
import { EstadoVacio } from "../../components/app";
import { MI_ESPACIO } from "../../data/formularios";
import { AsideAyuda, EtiquetaEjemplo, PaginaConAside } from "../vista-previa/formulario/comunes";
import { pasosAntesDeEnviar } from "../vista-previa/formulario/textos";
import { RUTAS_MI_ESPACIO } from "../vista-previa/rutas";

export default function MiEspacio() {
  return (
    <PaginaConAside medio aside={<AsideAyuda pasos={pasosAntesDeEnviar(null)} />} className="vf-mi-espacio">
      <EstadoVacio
        nivel={1}
        ojo={MI_ESPACIO.ojo}
        titulo={MI_ESPACIO.titulo}
        accion={
          <>
            <BotonPostular ubicacion="mi-espacio">{MI_ESPACIO.primario}</BotonPostular>
            <Link to={RUTAS_MI_ESPACIO.hoy} className="boton boton--secundario">
              {MI_ESPACIO.secundario}
            </Link>
          </>
        }
      >
        <p>{MI_ESPACIO.texto}</p>
        <h2 className="vf-mi-espacio__h2">{MI_ESPACIO.comoEntrar.titulo}</h2>
        <ListaCheck items={[...MI_ESPACIO.comoEntrar.items]} />
      </EstadoVacio>

      <p className="microcopia vf-mi-espacio__ejemplo">
        <EtiquetaEjemplo /> {MI_ESPACIO.notaEjemplo}
      </p>
    </PaginaConAside>
  );
}
