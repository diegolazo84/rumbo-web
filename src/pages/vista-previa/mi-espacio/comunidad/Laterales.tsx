// Columnas laterales de Comunidad (escritorio): grupos y desafío destacado a la izquierda;
// temas populares y tu impacto a la derecha. Conteos reales de la base; nada se inventa.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icono } from "../../../../components/app";
import { useEspacio } from "../comun";
import { useComunidad } from "./contexto";
import type { Desafio, FuenteComunidad, Grupo, Impacto, Tema } from "./fuente";
import { PaisajeMini } from "./Paisaje";
import { T_COMU as T } from "./textos";

// Lee de la fuente y vuelve a leer cuando algo cambia (versión del contexto).
export function useDato<D>(leer: (f: FuenteComunidad) => Promise<D>, deps: unknown[] = []): { dato: D | null; error: boolean } {
  const { fuente, version } = useComunidad();
  const [estado, setEstado] = useState<{ dato: D | null; error: boolean }>({ dato: null, error: false });
  useEffect(() => {
    let vivo = true;
    leer(fuente)
      .then((dato) => vivo && setEstado({ dato, error: false }))
      .catch(() => vivo && setEstado((e) => ({ ...e, error: true })));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuente, version, ...deps]);
  return estado;
}

export function TarjetaGrupos() {
  const { enlace } = useComunidad();
  const { R } = useEspacio();
  const { dato } = useDato((f) => f.grupos());
  const grupos = [...(dato ?? [])].sort((a, b) => b.miembros - a.miembros).slice(0, 5);
  return (
    <section className="co-tarjeta co-lateral" aria-labelledby="co-grupos-t">
      <h2 id="co-grupos-t" className="co-lateral__titulo">
        {T.grupos.titulo}
      </h2>
      {dato && dato.length === 0 && <p className="co-lateral__vacio">{T.grupos.vacio}</p>}
      <ul className="co-grupos-lista">
        {grupos.map((g) => (
          <li key={g.id}>
            <Link to={enlace({ vista: "grupos", grupo: g.id })} className="co-grupo-fila">
              <PaisajeMini nombre={g.ilustracion} className="co-grupo-fila__img" />
              <span className="co-grupo-fila__texto">
                <span className="co-grupo-fila__nombre">{g.nombre}</span>
                <span className="co-grupo-fila__dato">{T.grupos.miembros(g.miembros)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {dato && dato.length > 0 && (
        <Link to={R.comunidadGrupos} className="boton boton--secundario co-lateral__boton">
          {T.grupos.verTodos}
        </Link>
      )}
    </section>
  );
}

// El desafío destacado es el primero vigente (la base los ordena: vigentes primero, por inicio).
export function DesafioDestacado() {
  const { R } = useEspacio();
  const { dato } = useDato((f) => f.desafios());
  const d = dato?.find((x) => x.diasTranscurridos < x.dias || x.participo) ?? dato?.[0];
  if (!d) return null;
  return (
    <section className="co-tarjeta co-lateral co-destacado" aria-labelledby="co-destacado-t">
      <h2 id="co-destacado-t" className="co-lateral__titulo">
        {T.desafios.destacado}
      </h2>
      <PaisajeMini nombre={d.ilustracion ?? "sendero"} className="co-destacado__img" />
      <h3 className="co-destacado__titulo">{d.titulo}</h3>
      {d.descripcion && <p className="co-destacado__texto">{d.descripcion}</p>}
      <BarraDesafio d={d} />
      <p className="co-destacado__dato">{T.desafios.participantes(d.participantes)}</p>
      <Link to={`${R.comunidadDesafios}?desafio=${encodeURIComponent(d.id)}`} className="boton boton--secundario co-lateral__boton">
        {T.desafios.ver}
      </Link>
    </section>
  );
}

// Barra del desafío: si participas, tus días cumplidos; si no, en qué día va el desafío.
export function BarraDesafio({ d }: { d: Desafio }) {
  const valor = d.participo ? d.diasCumplidos : d.diasTranscurridos;
  const texto = d.participo
    ? T.desafios.avance(d.diasCumplidos, d.dias)
    : d.diasTranscurridos <= 0
      ? T.desafios.porEmpezar
      : d.diasTranscurridos >= d.dias
        ? T.desafios.terminado
        : T.desafios.transcurridos(d.diasTranscurridos, d.dias);
  return (
    <div className="co-barra">
      <div
        className={`co-barra__pista${d.participo ? " co-barra__pista--mia" : ""}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={d.dias}
        aria-valuenow={Math.max(0, Math.min(valor, d.dias))}
        aria-valuetext={texto}
        aria-label={d.titulo}
      >
        <span className="co-barra__relleno" style={{ inlineSize: `${(100 * Math.max(0, Math.min(valor, d.dias))) / d.dias}%` }} />
      </div>
      <p className="co-barra__texto">{texto}</p>
    </div>
  );
}

export function TarjetaTemas() {
  const { enlace } = useComunidad();
  const { dato } = useDato((f) => f.temas());
  return (
    <section className="co-tarjeta co-lateral" aria-labelledby="co-temas-t">
      <h2 id="co-temas-t" className="co-lateral__titulo">
        {T.temas.titulo}
      </h2>
      {dato && dato.length === 0 && <p className="co-lateral__vacio">{T.temas.vacio}</p>}
      <ul className="co-temas">
        {(dato ?? []).map((t: Tema) => (
          <li key={t.tema}>
            <Link to={enlace({ tema: t.tema })} className="co-tema">
              <Icono nombre="hash" className="co-tema__hash" />
              <span className="co-tema__texto">
                <span className="co-tema__nombre">#{t.tema}</span>
                <span className="co-tema__dato">{T.temas.publicaciones(t.publicaciones)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TarjetaImpacto({ conEnlace = true }: { conEnlace?: boolean }) {
  const { enlace } = useComunidad();
  const { dato } = useDato<Impacto>((f) => f.impacto());
  return (
    <section className="co-tarjeta co-lateral co-impacto" aria-labelledby="co-impacto-t">
      <div className="co-impacto__cabeza">
        <span className="co-impacto__icono">
          <Icono nombre="sprout" />
        </span>
        <div>
          <h2 id="co-impacto-t" className="co-impacto__titulo">
            {T.impacto.titulo}
          </h2>
          <p className="co-impacto__bajada">{T.impacto.bajada}</p>
        </div>
      </div>
      <dl className="co-impacto__numeros">
        {(
          [
            ["publicaciones", dato?.publicaciones],
            ["comentarios", dato?.comentarios],
            ["reacciones", dato?.reacciones],
          ] as const
        ).map(([k, v]) => (
          <div key={k}>
            <dt>{T.impacto[k]}</dt>
            <dd>{v ?? "–"}</dd>
          </div>
        ))}
      </dl>
      {conEnlace && (
        <Link to={enlace({ vista: "actividad" })} className="boton boton--secundario co-lateral__boton">
          {T.impacto.ver}
        </Link>
      )}
    </section>
  );
}

export type { Grupo };
