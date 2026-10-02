import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// BASE_PATH: carpeta donde se publica la web. "/" con dominio propio;
// "/rumbo-web/" en la dirección gratuita de GitHub Pages.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  // Año del pie: constante de compilación, igual en servidor y cliente (sin error de
  // hidratación al cambiar de año). El workflow fija ANIO_COMPILACION una sola vez.
  define: {
    __ANIO__: JSON.stringify(process.env.ANIO_COMPILACION ?? String(new Date().getFullYear())),
  },
});
