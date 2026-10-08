// Proyecto de Supabase de las páginas públicas (plataforma 6.1). Las dos constantes son
// PÚBLICAS POR DISEÑO: la URL del proyecto y la clave anon (publicable) van en el compilado y
// cualquiera puede leerlas en el navegador. La seguridad está en RLS y en las funciones de la
// base (supabase/), no en ocultar la clave. Nunca va aquí una clave secreta ni `service_role`.
// Las variables de GitHub Actions VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY las
// reemplazan sin tocar este archivo (por ejemplo, para apuntar a rumbo-prueba).
// «?.»: postbuild y las pruebas importan este archivo fuera de Vite.

const URL_PROYECTO = "https://jhukwxeeytedkjtwqowq.supabase.co";
const CLAVE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodWt3eGVleXRlZGtqdHdxb3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5NzkzMTYsImV4cCI6MjEwNjU1NTMxNn0.FvEiq45Z8UWErns_j5YKX4yFRjSsNGuJJz43vLwXAaU";

export const SUPABASE_URL = (import.meta.env?.VITE_SUPABASE_URL?.trim() || URL_PROYECTO).replace(/\/+$/, "");
export const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || CLAVE_ANON;
