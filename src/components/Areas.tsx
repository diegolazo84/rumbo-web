// Tarjetas de camino del piloto (tarjeta enlazada, 3.6) y filas «Más adelante» (3.16).
// Todo el texto sale de `areas` en rumbo.ts.
import { FORMULARIO_EXTERNO, estados, microcopiaFormulario, postularHref, type Area } from "../data/rumbo";
import { fotos } from "../data/fotos";
import { EnlaceFlecha } from "./Enlaces";
import Etiqueta, { EtiquetaCategoria } from "./Etiqueta";
import Foto from "./Foto";
import Icono from "./Icono";

// Mosaico de icono: color de la categoría, o niebla y bosque sin categoría.
function Mosaico({ area }: { area: Area }) {
  return (
    <span className="icono-mosaico">
      <Icono nombre={area.icono} tamaño={22} />
    </span>
  );
}

// Camino del piloto: toda la tarjeta es clicable (enlace estirado).
export function TarjetaCamino({ area }: { area: Area }) {
  const micro = microcopiaFormulario(area.opcionFormulario);
  const foto = area.id in fotos ? fotos[area.id as keyof typeof fotos] : undefined;
  return (
    <article className="tarjeta tarjeta--enlazada camino" data-cat={area.categoria ?? undefined}>
      {foto && (
        <Foto foto={foto} decorativa className="camino-foto" sizes="(min-width: 1024px) 540px, (min-width: 600px) 45vw, calc(100vw - 32px)" />
      )}
      <div className="camino-cabeza">
        <Mosaico area={area} />
        {area.categoria && <EtiquetaCategoria cat={area.categoria} />}
      </div>
      <h3>{area.nombre}</h3>
      <p className="voz">{area.frase}</p>
      <p className="camino-texto">{area.texto}</p>
      <div className="tarjeta-pie">
        <EnlaceFlecha
          href={postularHref({ area: area.param })}
          plataforma={FORMULARIO_EXTERNO}
          evento="postular"
          ubicacion={area.ubicacion}
        >
          {area.enlace}
        </EnlaceFlecha>
        {micro && <p className="microcopia">{micro}</p>}
      </div>
    </article>
  );
}

// Área que todavía no se abre: contorno, etiqueta «Más adelante» y nota de seguridad.
export function FilaFutura({ area }: { area: Area }) {
  const micro = microcopiaFormulario(area.opcionFormulario);
  return (
    <article className="tarjeta tarjeta--pronto fila-futura" data-cat={area.categoria ?? undefined}>
      <Mosaico area={area} />
      <div className="fila-futura-cuerpo">
        <div className="fila-futura-etiquetas">
          <Etiqueta variante={estados.masAdelante.variante}>{estados.masAdelante.texto}</Etiqueta>
          {area.notaSeguridad && <Etiqueta variante="nota">{area.notaSeguridad}</Etiqueta>}
        </div>
        <h4>{area.nombre}</h4>
        <p className="voz">{area.frase}</p>
        <p className="fila-futura-texto">{area.texto}</p>
        <div>
          <EnlaceFlecha
            href={postularHref({ area: area.param })}
            plataforma={FORMULARIO_EXTERNO}
            antesOculto={`, ${area.nombre} `}
            evento="postular"
            ubicacion={area.ubicacion}
          >
            {area.enlace}
          </EnlaceFlecha>
          {micro && <p className="microcopia">{micro}</p>}
        </div>
      </div>
    </article>
  );
}
