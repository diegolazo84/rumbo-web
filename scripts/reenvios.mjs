// Páginas de reenvío (especificación 5.7): a la plataforma o, con `interno`, a una página de esta
// web. Las usan scripts/postbuild.mjs, que las genera, y pruebas/humo.spec.ts, que las verifica.

export const PLATAFORMA = "https://rumbo-acompanamiento-diego.diegolazo84.chatgpt.site";

const OTRA_DIRECCION = "La plataforma está en otra dirección web.";

// rutas: carpetas de esta web · destino: ruta en la plataforma (o, con interno, en esta web, sin
// la base) · nombre: {destino} del texto ·
// nota (opcional): párrafo bajo el botón, que se lee también sin JavaScript ·
// formulario: desaparece con operacion.formularioPropio, porque la ruta pasa a ser una página
// propia (plataforma 2.2).
export const REENVIOS = [
  { rutas: ["postular"], destino: "/postular", nombre: "el formulario para postular", explicacion: OTRA_DIRECCION, formulario: true },
  { rutas: ["contacto"], destino: "/contacto", nombre: "el formulario de contacto", explicacion: OTRA_DIRECCION, formulario: true },
  // Mi espacio es una página de esta web (/mi-espacio/); estas rutas de la plataforma anterior
  // llevan a ella. La comunidad queda para más adelante: /comunidad ya no se publica.
  {
    rutas: ["mi-programa", "app"],
    destino: "mi-espacio/",
    interno: true,
    nombre: "Mi espacio",
    explicacion: "Mi espacio ahora está en esta misma web.",
  },
  {
    rutas: ["estado"],
    destino: "/estado",
    nombre: "el estado de tu solicitud",
    explicacion: OTRA_DIRECCION,
    // El botón (y el reenvío sin JavaScript) no conserva el #token del enlace privado.
    nota: "Si no se abre, vuelve a usar el enlace privado completo que guardaste: este botón no lo incluye.",
    formulario: true,
  },
  {
    rutas: ["privacidad-piloto"],
    destino: "/privacidad-piloto",
    nombre: "el aviso de privacidad de la plataforma",
    explicacion: OTRA_DIRECCION,
  },
];

// Reenvíos que se publican según los interruptores de `operacion` (rumbo.ts).
export const reenviosActivos = (op) => REENVIOS.filter((r) => !(r.formulario && op?.formularioPropio));

// «a» + «el» se contrae: «Te llevamos al formulario para postular».
const aDestino = (nombre) => (nombre.startsWith("el ") ? `al ${nombre.slice(3)}` : `a ${nombre}`);

// Dirección final de un reenvío. base: BASE_PATH de la web («/rumbo-web/»).
export const urlReenvio = (r, base) => (r.interno ? base + r.destino : PLATAFORMA + r.destino);

// Textos finales de una página de reenvío.
export function textosReenvio(r) {
  return {
    titulo: `Abriendo ${r.nombre} · Rumbo`,
    llevamos: r.interno ? `Te llevamos ${aDestino(r.nombre)}.` : `Te llevamos ${aDestino(r.nombre)}, en la plataforma de Rumbo.`,
    explicacion: `${r.explicacion} Si no pasa nada en unos segundos, usa este enlace:`,
    enlace: `Abrir ${r.nombre}`,
    nota: r.nota ?? null,
  };
}

// Único script de la página: conserva ?area=, ?apoyo= y #token. Su hash va en la CSP.
export const scriptReenvio = (url) => `location.replace(${JSON.stringify(url)} + location.search + location.hash);`;
