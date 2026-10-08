// Entrada de prerenderizado: solo se usa al compilar (scripts/postbuild.mjs).
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { prerender } from "react-dom/static";
import { StaticRouter } from "react-router-dom";
import App from "./App";
import { BASENAME } from "./base";

export { paginas, PAGINA_404, IMAGEN_SOCIAL } from "./data/paginas";
export { LEMA, operacion, ayuda } from "./data/rumbo";
// Origen de Supabase para la CSP de los formularios (plataforma 2.3).
export { SUPABASE_URL } from "./lib/supabase-config";
// Vista previa (etapa 0): rutas y títulos para postbuild.mjs.
export { pantallas as pantallasPrevia, INDICE as INDICE_PREVIA } from "./pages/vista-previa/registro";
export { ID_VISTA_PREVIA } from "./vista-previa";
// Mi espacio propio y panel (etapa 3, con operacion.miEspacioPropio): rutas para postbuild.mjs.
export { RUTAS_PLATAFORMA, ID_PLATAFORMA } from "./plataforma";

// url: ruta completa con la base, p. ej. "/rumbo-web/privacidad/".
export function render(url: string): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url} basename={BASENAME}>
        <App />
      </StaticRouter>
    </StrictMode>,
  );
}

// Vista previa: sus pantallas se cargan con lazy, así que se espera a que todo resuelva
// (prerender) en vez de renderToString, que dejaría el estado de carga. Sin límite de trozo:
// un Suspense grande no se separa con un <script> en línea (la CSP solo permite 'self').
export async function renderPrevia(url: string): Promise<string> {
  const { prelude } = await prerender(
    <StrictMode>
      <StaticRouter location={url} basename={BASENAME}>
        <App />
      </StaticRouter>
    </StrictMode>,
    { progressiveChunkSize: Number.MAX_SAFE_INTEGER },
  );
  return await new Response(prelude).text();
}
