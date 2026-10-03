// Vista previa de la plataforma (etapa 0): rutas bajo /vista-previa/. Este archivo pequeño lo
// importan App.tsx y main.tsx sin arrastrar la porción de la vista previa al bundle principal.
// Se borra al pasar a la etapa 3 (plataforma 2.1).
export const ID_VISTA_PREVIA = "vista-previa"; // #root[data-pagina] del HTML prerenderizado

export const esVistaPrevia = (pathname: string) => pathname === "/vista-previa" || pathname.startsWith("/vista-previa/");
