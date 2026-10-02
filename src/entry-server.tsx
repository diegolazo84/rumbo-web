// Entrada de prerenderizado: solo se usa al compilar (scripts/postbuild.mjs).
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import App from "./App";
import { BASENAME } from "./base";

export { paginas, PAGINA_404, IMAGEN_SOCIAL } from "./data/paginas";
export { LEMA, operacion, ayuda } from "./data/rumbo";

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
