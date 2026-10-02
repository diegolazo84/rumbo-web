import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { BASENAME } from "./base";
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/fraunces/opsz-italic.css";
import "@fontsource-variable/instrument-sans/wght.css";
// Tokens, base y componentes compartidos; después, lo propio de cada tipo de página.
import "./styles.css";
import "./styles/portada.css";
import "./styles/lectura.css";

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
// Activa los efectos que dependen de JS (revelado, menú). Ningún script en línea oculta
// contenido: si el bundle no carga, esta clase nunca aparece y todo queda visible.
document.documentElement.classList.add("hidratado");
