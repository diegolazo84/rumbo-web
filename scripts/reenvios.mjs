// Páginas de reenvío a la plataforma (especificación 5.7). Las usan scripts/postbuild.mjs,
// que las genera, y pruebas/humo.spec.ts, que las verifica.

export const PLATAFORMA = "https://rumbo-acompanamiento-diego.diegolazo84.chatgpt.site";

const OTRA_DIRECCION = "La plataforma está en otra dirección web.";

// rutas: carpetas de esta web · destino: ruta en la plataforma · nombre: {destino} del texto.
export const REENVIOS = [
  { rutas: ["postular"], destino: "/postular", nombre: "el formulario para postular", explicacion: OTRA_DIRECCION },
  { rutas: ["contacto"], destino: "/contacto", nombre: "el formulario de contacto", explicacion: OTRA_DIRECCION },
  {
    rutas: ["mi-programa", "app"],
    destino: "/mi-programa",
    nombre: "Mi espacio",
    explicacion: "La plataforma está en otra dirección web y pide iniciar sesión con una cuenta de ChatGPT.",
  },
  {
    rutas: ["comunidad"],
    destino: "/comunidad",
    nombre: "la comunidad",
    explicacion:
      "La comunidad está en la plataforma de Rumbo, en otra dirección web; es solo para participantes y pide iniciar sesión.",
  },
  { rutas: ["estado"], destino: "/estado", nombre: "el estado de tu solicitud", explicacion: OTRA_DIRECCION },
  {
    rutas: ["privacidad-piloto"],
    destino: "/privacidad-piloto",
    nombre: "el aviso de privacidad de la plataforma",
    explicacion: OTRA_DIRECCION,
  },
];

// «a» + «el» se contrae: «Te llevamos al formulario para postular».
const aDestino = (nombre) => (nombre.startsWith("el ") ? `al ${nombre.slice(3)}` : `a ${nombre}`);

// Textos finales de una página de reenvío.
export function textosReenvio(r) {
  return {
    titulo: `Abriendo ${r.nombre} · Rumbo`,
    llevamos: `Te llevamos ${aDestino(r.nombre)}, en la plataforma de Rumbo.`,
    explicacion: `${r.explicacion} Si no pasa nada en unos segundos, usa este enlace:`,
    enlace: `Abrir ${r.nombre}`,
  };
}

// Único script de la página: conserva ?area=, ?apoyo= y #token. Su hash va en la CSP.
export const scriptReenvio = (url) => `location.replace(${JSON.stringify(url)} + location.search + location.hash);`;
