// Fotos privadas de las acciones (bucket «evidencias»). Antes de subirla, la foto se vuelve a
// dibujar siempre en un lienzo: así sale en WebP, con 1600 px como máximo y sin metadatos
// (EXIF, ubicación GPS, modelo del teléfono). Si el navegador no puede hacerlo de forma segura,
// la foto se rechaza: nunca se sube el archivo original.

export const TIPOS_FOTO_PRIVADA = ["image/jpeg", "image/png", "image/webp"] as const;
export const LADO_MAXIMO = 1600;
export const PESO_MAXIMO = 4 * 1024 * 1024; // límite del bucket «evidencias»
const CALIDAD = 0.82;

export type ErrorFoto = "tipo" | "proceso" | "peso";

export class FotoRechazada extends Error {
  constructor(readonly motivo: ErrorFoto) {
    super(`foto rechazada: ${motivo}`);
    this.name = "FotoRechazada";
  }
}

// Medidas finales: el lado mayor queda en 1600 px como máximo, sin agrandar fotos chicas.
export function medidas(ancho: number, alto: number, maximo = LADO_MAXIMO): { ancho: number; alto: number } {
  const escala = Math.min(1, maximo / Math.max(ancho, alto));
  return { ancho: Math.max(1, Math.round(ancho * escala)), alto: Math.max(1, Math.round(alto * escala)) };
}

export async function prepararFotoPrivada(archivo: Blob): Promise<Blob> {
  if (!(TIPOS_FOTO_PRIVADA as readonly string[]).includes(archivo.type)) throw new FotoRechazada("tipo");
  if (typeof createImageBitmap !== "function") throw new FotoRechazada("proceso");
  let imagen: ImageBitmap;
  try {
    // La orientación del EXIF se aplica al dibujar; después el EXIF ya no viaja.
    imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  } catch {
    throw new FotoRechazada("proceso");
  }
  const { ancho, alto } = medidas(imagen.width, imagen.height);
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new FotoRechazada("proceso");
  ctx.drawImage(imagen, 0, 0, ancho, alto);
  imagen.close();
  const salida = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/webp", CALIDAD));
  // Un navegador que no sabe escribir WebP devuelve PNG: eso también se rechaza.
  if (!salida || salida.type !== "image/webp") throw new FotoRechazada("proceso");
  if (salida.size > PESO_MAXIMO) throw new FotoRechazada("peso");
  return salida;
}

// Ruta obligatoria del bucket (privado.foto_permitida): {participante}/{acción}/{archivo}.webp
export const rutaFoto = (participante: string, ocurrencia: string, id: string) => `${participante}/${ocurrencia}/${id}.webp`;
