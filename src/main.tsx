import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { BASENAME } from "./base";
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/fraunces/opsz-italic.css";
import "@fontsource-variable/instrument-sans/wght.css";
import "./styles.css";

const raiz = document.getElementById("root")!;
const app = (
  <StrictMode>
    <BrowserRouter basename={BASENAME}>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// En producción el HTML viene prerenderizado: se hidrata. En `npm run dev` llega vacío.
if (raiz.firstElementChild) {
  hydrateRoot(raiz, app, {
    onRecoverableError(error) {
      // Un desajuste de hidratación no rompe la página, pero debe verse en las pruebas.
      console.error("[hidratacion]", error);
    },
  });
} else {
  createRoot(raiz).render(app);
}
