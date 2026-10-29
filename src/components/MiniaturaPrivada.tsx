// Miniatura de una foto privada (bucket «evidencias»): se pide un enlace firmado de 5 minutos
// cada vez que se muestra; el enlace nunca se guarda. Mientras carga muestra un recuadro, y si
// el enlace falla, un aviso en vez de una imagen rota. La usan Mi espacio y el panel.
import { useEffect, useState } from "react";
import { Icono } from "./app";

export const TEXTOS_MINIATURA = {
  noSeVe: "No pudimos mostrar la foto", // PROPUESTO (falló el enlace firmado)
  cargando: "Cargando foto", // PROPUESTO (lector de pantalla)
};

export default function MiniaturaPrivada({
  ruta,
  pedirUrl,
  alt,
  clase,
}: {
  ruta: string;
  pedirUrl: (ruta: string) => Promise<string>;
  alt: string;
  clase: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  useEffect(() => {
    let vivo = true;
    setUrl(null);
    setFallo(false);
    pedirUrl(ruta)
      .then((u) => vivo && setUrl(u))
      .catch(() => vivo && setFallo(true));
    return () => {
      vivo = false;
    };
  }, [ruta, pedirUrl]);
  if (fallo)
    return (
      <div className={`${clase} ${clase}--vacia`} role="img" aria-label={TEXTOS_MINIATURA.noSeVe}>
        <Icono nombre="camera" tamaño={24} />
        <span className="microcopia">{TEXTOS_MINIATURA.noSeVe}</span>
      </div>
    );
  if (!url) return <div className={`${clase} ${clase}--cargando`} role="img" aria-label={TEXTOS_MINIATURA.cargando} aria-busy="true" />;
  return <img className={clase} src={url} alt={alt} width={120} height={120} decoding="async" onError={() => setFallo(true)} />;
}
