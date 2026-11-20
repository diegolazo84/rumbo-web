// Fotografías reales de Rumbo (Unsplash, licencia Unsplash; créditos en docs/creditos-fotos.md).
// Están en public/fotos/ como <nombre>-<ancho>.avif y .webp: la ruta se arma aquí, sin sumar peso al JS.
// Las personas son modelos de banco de imágenes: nunca se presentan como participantes ni coaches.
import { BASENAME } from "../base";

export type FotoDatos = { nombre: string; anchos: number[]; alto: number; alt: string };

export const rutaFoto = (f: FotoDatos, ancho: number, ext: "avif" | "webp") =>
  `${BASENAME}fotos/${f.nombre}-${ancho}.${ext}`;

export const fotos = {
  portada: {
    nombre: "portada",
    anchos: [640, 960, 1280],
    alto: 1600,
    alt: "Una mujer joven sonríe sentada en la terraza de un café, con su carpeta de apuntes en la mano y el notebook abierto sobre la barra.",
  },
  // Caminos: decorativas, la tarjeta ya dice de qué se trata.
  proyectos: { nombre: "camino-proyecto", anchos: [480, 800], alto: 450, alt: "" },
  estudio: { nombre: "camino-estudio", anchos: [480, 800], alto: 450, alt: "" },
  organizacion: { nombre: "camino-organizacion", anchos: [480, 800], alto: 450, alt: "" },
  abierta: { nombre: "camino-sin-claridad", anchos: [480, 800], alto: 450, alt: "" },
  comoFunciona: {
    nombre: "como-funciona",
    anchos: [800, 1600],
    alto: 720,
    alt: "Un hombre conversa por videollamada desde una mesa redonda de madera, con la mano en el mentón, atento a lo que le dicen.",
  },
  planes: {
    nombre: "planes",
    anchos: [600, 900],
    alto: 675,
    alt: "Manos que escriben en una agenda abierta sobre una mesa de madera clara.",
  },
  // Mi espacio: decorativas.
  miEspacio: { nombre: "mi-espacio", anchos: [800, 1600], alto: 699, alt: "" },
  acompanamiento: { nombre: "acompanamiento", anchos: [800, 1440], alto: 810, alt: "" },
} satisfies Record<string, FotoDatos>;
