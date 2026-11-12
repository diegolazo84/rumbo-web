// Fotografías de Rumbo (generadas para la marca, nov-2026; sin rostros reconocibles). Están en
// public/fotos/ como <nombre>-<ancho>.avif y .webp: la ruta se arma aquí, sin sumar peso al JS.
import { BASENAME } from "../base";

export type FotoDatos = { nombre: string; anchos: number[]; alto: number; alt: string };

export const rutaFoto = (f: FotoDatos, ancho: number, ext: "avif" | "webp") =>
  `${BASENAME}fotos/${f.nombre}-${ancho}.${ext}`;

export const fotos = {
  portada: {
    nombre: "portada",
    anchos: [832],
    alto: 1040,
    alt: "Mesa de madera junto a una ventana con plantas: un cuaderno abierto con una lista corta marcada, una taza y la luz de la mañana.",
  },
  // Caminos: decorativas, la tarjeta ya dice de qué se trata.
  proyectos: { nombre: "camino-proyecto", anchos: [800], alto: 450, alt: "" },
  estudio: { nombre: "camino-estudio", anchos: [800], alto: 450, alt: "" },
  organizacion: { nombre: "camino-organizacion", anchos: [800], alto: 450, alt: "" },
  abierta: { nombre: "camino-sin-claridad", anchos: [800], alto: 450, alt: "" },
  comoFunciona: {
    nombre: "como-funciona",
    anchos: [800, 1600],
    alto: 720,
    alt: "Dos tazas y un notebook abierto en una videollamada: una conversación tranquila para revisar la semana.",
  },
  planes: {
    nombre: "planes",
    anchos: [900],
    alto: 675,
    alt: "Una mano cierra un cuaderno con una cinta terracota sobre una mesa ordenada, con luz de tarde.",
  },
  // Mi espacio: decorativas.
  miEspacio: { nombre: "mi-espacio", anchos: [800, 1600], alto: 699, alt: "" },
  acompanamiento: { nombre: "camino-sin-claridad", anchos: [1440], alto: 810, alt: "" },
} satisfies Record<string, FotoDatos>;
