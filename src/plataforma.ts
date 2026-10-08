// Mi espacio propio y panel (etapa 3, plataforma 2.1 y 10): rutas /mi-espacio/… y /equipo/…,
// solo con el interruptor operacion.miEspacioPropio. Este archivo pequeño lo importan App.tsx y
// main.tsx sin arrastrar la porción de la plataforma al bundle principal; la tabla de rutas vive
// en pages/plataforma/rutas.ts (porción de la plataforma y entry-server.tsx).
// Con el interruptor apagado nada cambia: esas rutas siguen siendo lo que eran (página pública
// o reenvío) y la porción no se carga.
import { operacion } from "./data/rumbo";

export const ID_PLATAFORMA = "plataforma"; // #root[data-pagina] del HTML prerenderizado

const PREFIJOS = ["/mi-espacio/", "/equipo/"];

export const esPlataforma = (pathname: string) =>
  operacion.miEspacioPropio && PREFIJOS.some((p) => pathname === p.slice(0, -1) || pathname.startsWith(p));
