/// <reference types="vite/client" />

// Año de compilación (vite.config.ts): el mismo en el prerender y en el navegador.
declare const __ANIO__: string;
// FORMULARIO_PROPIO=1 al compilar (vite.config.ts). Fuera de Vite (pruebas) no existe.
declare const __FORMULARIO_PROPIO__: boolean | undefined;

// Variables de compilación que lee el código (solo desde el entorno, no desde .env).
interface ImportMetaEnv {
  readonly VITE_UMAMI_WEBSITE_ID?: string;
  // Supabase (plataforma 6.1): públicas por diseño. Sin ellas valen las de src/lib/supabase-config.ts.
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

// Analítica opcional (Umami): solo existe si postbuild inyectó su script.
interface Window {
  umami?: { track: (evento: string, datos?: Record<string, string>) => void };
}
