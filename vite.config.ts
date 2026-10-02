import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// BASE_PATH: carpeta donde se publica la web. "/" con dominio propio;
// "/rumbo-web/" en la dirección gratuita de GitHub Pages.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
});
