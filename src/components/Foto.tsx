// Foto responsiva: AVIF con respaldo WebP, tamaño fijo para no mover la página al cargar.
// decorativa → alt vacío (la foto acompaña un texto que ya dice lo mismo).
import { rutaFoto, type FotoDatos } from "../data/fotos";

type Props = {
  foto: FotoDatos;
  sizes: string;
  className?: string;
  prioridad?: boolean; // primer pantallazo: carga inmediata
  decorativa?: boolean;
};

export default function Foto({ foto, sizes, className, prioridad, decorativa }: Props) {
  const srcset = (ext: "avif" | "webp") => foto.anchos.map((w) => `${rutaFoto(foto, w, ext)} ${w}w`).join(", ");
  const ancho = foto.anchos[foto.anchos.length - 1];
  return (
    <picture className={className ? `foto ${className}` : "foto"}>
      <source type="image/avif" srcSet={srcset("avif")} sizes={sizes} />
      <img
        src={rutaFoto(foto, ancho, "webp")}
        srcSet={srcset("webp")}
        sizes={sizes}
        width={ancho}
        height={foto.alto}
        alt={decorativa ? "" : foto.alt}
        loading={prioridad ? "eager" : "lazy"}
        decoding={prioridad ? "sync" : "async"}
        fetchPriority={prioridad ? "high" : undefined}
      />
    </picture>
  );
}
