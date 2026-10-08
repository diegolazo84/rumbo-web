// Páginas reales de «Cuéntanos tu meta» (/postular/), estado de la solicitud (/estado/#token) y
// contacto (/contacto/), con el interruptor operacion.formularioPropio (plataforma D8 y 2.1).
// Son las mismas pantallas de la vista previa en modo real (vista-previa/formulario/modo.ts):
// mismo diseño, datos de la base por src/lib/api.ts. Porción aparte (App.tsx la carga con lazy):
// ni su JS ni su CSS pesan en la portada; postbuild.mjs enlaza su CSS en <head> al prerenderizar.
// Los mismos estilos que la vista previa da a estas pantallas, en el mismo orden (sin los de Mi
// espacio ni el panel): primero estos y después vista-formulario.css, que importan las pantallas.
import "../../styles/form.css";
import "../../styles/app.css";
import "../../styles/formulario.css";
import { MODO_REAL, ModoFormularioContexto } from "../vista-previa/formulario/modo";
import Postular from "../vista-previa/formulario/Postular";
import Estado from "../vista-previa/formulario/Estado";
import Contacto from "../vista-previa/formulario/Contacto";

export type PaginaFormularioId = "postular" | "estado" | "contacto";

export default function PaginaFormulario({ pagina }: { pagina: PaginaFormularioId }) {
  return (
    <ModoFormularioContexto.Provider value={MODO_REAL}>
      {pagina === "postular" ? <Postular estado="solicitud" /> : pagina === "estado" ? <Estado /> : <Contacto estado="inicial" />}
    </ModoFormularioContexto.Provider>
  );
}
