// Vista previa · carga y error global de Mi espacio (plataforma 4.1.4). Sin datos de ejemplo:
// solo el texto de la plataforma. Estados: cargando, cargando-lento (más de 8 s) y error.
// «Reintentar» vuelve a Hoy (en la v1, repite la consulta).
import { useNavigate } from "react-router-dom";
import { Icono, TEXTOS_CARGA } from "../../../components/app";
import type { PropsPantalla } from "../registro";
import { R } from "./comun";

export default function Carga({ estado = "cargando" }: PropsPantalla) {
  const navegar = useNavigate();
  const reintentar = () => navegar(R.hoy);

  if (estado === "error") {
    return (
      <div className="me-pantalla me-pantalla--angosta">
        <div className="aviso me-error-global">
          <Icono nombre="info" tamaño={20} className="aviso-icono" />
          <div className="aviso-cuerpo">
            <h1 className="aviso-titulo me-h1--aviso">{TEXTOS_CARGA.errorGlobalTitulo}</h1>
            <p>{TEXTOS_CARGA.errorGlobalTexto}</p>
            <div className="acciones">
              <button type="button" className="boton boton--secundario" onClick={reintentar}>
                {TEXTOS_CARGA.reintentar}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // «Cargando…» en tinta suave, sin brillo animado ni esqueletos. Es el H1 de la pantalla.
  return (
    <div className="me-pantalla me-pantalla--angosta">
      <div className="cargando" role="status">
        <h1 className="me-cargando__titulo">{TEXTOS_CARGA.cargando}</h1>
        {estado === "cargando-lento" && (
          <>
            <p>{TEXTOS_CARGA.lento}</p>
            <button type="button" className="boton boton--secundario" onClick={reintentar}>
              {TEXTOS_CARGA.reintentar}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
