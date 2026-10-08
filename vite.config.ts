import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// BASE_PATH: carpeta donde se publica la web. "/" con dominio propio;
// "/rumbo-web/" en la dirección gratuita de GitHub Pages.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/rumbo-web/",
  plugins: [react()],
  // Año del pie: constante de compilación, igual en servidor y cliente (sin error de
  // hidratación al cambiar de año). El workflow fija ANIO_COMPILACION una sola vez.
  // FORMULARIO_PROPIO=1 enciende operacion.formularioPropio en esta compilación sin tocar
  // rumbo.ts (pruebas del formulario propio, plataforma 8.2-F). Sin la variable manda rumbo.ts.
  define: {
    __ANIO__: JSON.stringify(process.env.ANIO_COMPILACION ?? String(new Date().getFullYear())),
    __FORMULARIO_PROPIO__: JSON.stringify(process.env.FORMULARIO_PROPIO === "1"),
    // MI_ESPACIO_PROPIO=1 enciende operacion.miEspacioPropio (Mi espacio y panel, etapa 3).
    __MI_ESPACIO_PROPIO__: JSON.stringify(process.env.MI_ESPACIO_PROPIO === "1"),
  },
  // postbuild.mjs lee el manifiesto para enlazar en <head> el CSS de las páginas perezosas
  // (postular, estado y contacto) y lo borra después: no se publica.
  build: { manifest: true },
});
