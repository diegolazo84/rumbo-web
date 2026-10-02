/// <reference types="vite/client" />

// Año de compilación (vite.config.ts): el mismo en el prerender y en el navegador.
declare const __ANIO__: string;

// Variables de compilación que lee el código (solo desde el entorno, no desde .env).
interface ImportMetaEnv {
  readonly VITE_UMAMI_WEBSITE_ID?: string;
}

// Analítica opcional (Umami): solo existe si postbuild inyectó su script.
interface Window {
  umami?: { track: (evento: string, datos?: Record<string, string>) => void };
}
