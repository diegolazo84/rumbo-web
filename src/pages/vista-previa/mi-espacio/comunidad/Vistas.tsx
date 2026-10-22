// Las pestañas de Comunidad que no son «Todas las publicaciones»: Mis grupos (descubrir, entrar
// a un grupo y sus publicaciones), Desafíos (objetivo, reglas, participar, avance verificable y
// celebración), Historias de logro y Mi actividad (impacto, guardadas y personas bloqueadas).
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icono } from "../../../../components/app";
import { useEspacio } from "../comun";
import { fechaLargaIso, fechaRelativa, useComunidad } from "./contexto";
import type { Desafio, Grupo } from "./fuente";
import { BarraDesafio, TarjetaImpacto, useDato } from "./Laterales";
import { Compositor } from "./Crear";
import { Feed } from "./Publicaciones";
import { PaisajeMini } from "./Paisaje";
import { T_COMU as T } from "./textos";

function BotonGrupo({ g }: { g: Grupo }) {
  const { fuente, aviso, cambio } = useComunidad();
  const [enviando, setEnviando] = useState(false);
  const cambiar = async () => {
    setEnviando(true);
    try {
      if (g.soyMiembro) await fuente.salirGrupo(g.id);
      else await fuente.unirmeGrupo(g.id);
      aviso(g.soyMiembro ? T.grupos.salido(g.nombre) : T.grupos.unido(g.nombre));
      cambio();
    } catch {
      aviso(T.errorGeneral);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <button
      type="button"
      className={`boton ${g.soyMiembro ? "boton--secundario" : "boton--primario"} co-grupo__boton`}
      disabled={enviando}
      onClick={() => void cambiar()}
    >
      {g.soyMiembro ? T.grupos.salir : T.grupos.unirme}
    </button>
  );
}

export function VistaGrupos({ grupo }: { grupo: string | null }) {
  const { enlace } = useComunidad();
  const { R } = useEspacio();
  const { dato, error } = useDato((f) => f.grupos());
  const actual = grupo ? dato?.find((g) => g.id === grupo) : null;

  if (grupo && actual)
    return (
      <div className="co-vista">
        <Link to={enlace({ vista: "grupos" })} className="enlace-flecha enlace-flecha--atras co-volver">
          <Icono nombre="chevron-left" tamaño={16} />
          {T.grupos.volver}
        </Link>
        <section className="co-tarjeta co-grupo-cabeza" aria-labelledby="co-grupo-h">
          <PaisajeMini nombre={actual.ilustracion} className="co-grupo-cabeza__img" />
          <div className="co-grupo-cabeza__texto">
            <h2 id="co-grupo-h" className="co-h2">
              {actual.nombre}
            </h2>
            {actual.descripcion && <p>{actual.descripcion}</p>}
            <p className="co-grupo-cabeza__dato">
              {T.grupos.miembros(actual.miembros)} · {T.grupos.publicaciones(actual.publicaciones)}
            </p>
          </div>
          <BotonGrupo g={actual} />
        </section>
        {actual.soyMiembro && <Compositor preset={{ grupo: actual.id }} />}
        <Feed filtro={{ grupo: actual.id }} vacio={T.feed.vacioGrupo} />
      </div>
    );

  return (
    <div className="co-vista">
      <section aria-labelledby="co-descubrir-h" className="co-bloque">
        <h2 id="co-descubrir-h" className="co-h2">
          {T.grupos.descubrir}
        </h2>
        <p className="co-bajada">{T.grupos.descubrirBajada}</p>
        <Link to={R.comunidadGrupos} className="enlace-flecha">
          {T.grupos.verTodos}
        </Link>
        {error && <p className="co-tarjeta co-estado">{T.errorGeneral}</p>}
        {dato && dato.length === 0 && <p className="co-tarjeta co-estado co-estado--vacio">{T.grupos.vacio}</p>}
        <ul className="co-grupos-grilla">
          {(dato ?? []).map((g) => (
            <li key={g.id} className="co-tarjeta co-grupo">
              <PaisajeMini nombre={g.ilustracion} className="co-grupo__img" />
              <div className="co-grupo__texto">
                <h3 className="co-grupo__nombre">
                  <Link to={enlace({ vista: "grupos", grupo: g.id })}>{g.nombre}</Link>
                </h3>
                {g.descripcion && <p className="co-grupo__desc">{g.descripcion}</p>}
                <p className="co-grupo__dato">
                  {T.grupos.miembros(g.miembros)}
                  {g.soyMiembro && <span className="co-grupo__mio">{T.grupos.soyMiembro}</span>}
                </p>
              </div>
              <BotonGrupo g={g} />
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="co-mios-h" className="co-bloque">
        <h2 id="co-mios-h" className="co-h2">
          {T.grupos.mios}
        </h2>
        <Feed filtro={{ soloMisGrupos: true }} vacio={T.grupos.sinMios} />
      </section>
    </div>
  );
}

function Desafio1({ d, destacado }: { d: Desafio; destacado: boolean }) {
  const { fuente, aviso, cambio, abrirCrear } = useComunidad();
  const [enviando, setEnviando] = useState(false);
  const caja = useRef<HTMLElement>(null);
  const { dato: dias } = useDato((f) => (d.participo ? f.avance(d.id) : Promise.resolve([])), [d.id, d.participo]);
  useEffect(() => {
    if (destacado) caja.current?.scrollIntoView({ block: "start" });
  }, [destacado]);
  const terminado = d.diasTranscurridos >= d.dias && !d.participo;
  const cambiar = async () => {
    setEnviando(true);
    try {
      if (d.participo) await fuente.salirDesafio(d.id);
      else await fuente.unirmeDesafio(d.id);
      aviso(d.participo ? T.desafios.salido : T.desafios.unido);
      cambio();
    } catch {
      aviso(T.errorGeneral);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <article ref={caja} className={`co-tarjeta co-desafio${destacado ? " co-desafio--destacado" : ""}`} aria-labelledby={`co-d-${d.id}`}>
      <PaisajeMini nombre={d.ilustracion ?? "sendero"} className="co-desafio__img" />
      <div className="co-desafio__cuerpo">
        <p className="co-desafio__fechas">
          {T.desafios.fechas(fechaLargaIso(d.inicio), fechaLargaIso(d.fin))} · {T.desafios.dias(d.dias)}
        </p>
        <h2 id={`co-d-${d.id}`} className="co-h2">
          {d.titulo}
        </h2>
        {d.descripcion && (
          <div className="co-desafio__parte">
            <h3 className="co-h3">{T.desafios.objetivo}</h3>
            <p>{d.descripcion}</p>
          </div>
        )}
        <div className="co-desafio__parte">
          <h3 className="co-h3">{T.desafios.reglas}</h3>
          <p>{d.reglas}</p>
          <p className="co-form__nota">{T.desafios.noSuma}</p>
        </div>
        <BarraDesafio d={d} />
        <p className="co-desafio__dato">{T.desafios.participantes(d.participantes)}</p>
        {d.participo && dias && dias.length > 0 && (
          <div className="co-desafio__parte">
            <h3 className="co-h3">{T.desafios.miAvance}</h3>
            <ol className="co-dias">
              {dias.map((x, i) => (
                <li key={x.fecha} className={x.cumplido ? "co-dia co-dia--hecho" : "co-dia"}>
                  {x.cumplido ? <Icono nombre="check" tamaño={12} /> : <span aria-hidden="true">{i + 1}</span>}
                  <span className="sr-only">
                    {fechaLargaIso(x.fecha)}: {x.cumplido ? T.desafios.cumplido : T.desafios.noCumplido}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {d.completado && (
          <div className="co-celebra" role="status">
            <Icono nombre="award" />
            <div>
              <p className="co-celebra__titulo">{T.desafios.celebracion}</p>
              <p>{T.desafios.celebracionTexto}</p>
            </div>
            <button type="button" className="boton boton--primario" onClick={() => abrirCrear({ tipo: "logro", texto: `Completé el desafío «${d.titulo}». ` })}>
              {T.desafios.compartir}
            </button>
          </div>
        )}
        {!terminado && (
          <button
            type="button"
            className={`boton ${d.participo ? "boton--secundario" : "boton--primario"} co-desafio__boton`}
            disabled={enviando}
            onClick={() => void cambiar()}
          >
            {d.participo ? T.desafios.salir : T.desafios.unirme}
          </button>
        )}
      </div>
    </article>
  );
}

export function VistaDesafios({ desafio }: { desafio: string | null }) {
  const { dato, error } = useDato((f) => f.desafios());
  return (
    <div className="co-vista">
      <header className="co-bloque">
        <h2 className="co-h2">{T.desafios.titulo}</h2>
        <p className="co-bajada">{T.desafios.bajada}</p>
      </header>
      {error && <p className="co-tarjeta co-estado">{T.errorGeneral}</p>}
      {dato && dato.length === 0 && <p className="co-tarjeta co-estado co-estado--vacio">{T.desafios.vacio}</p>}
      {(dato ?? []).map((d) => (
        <Desafio1 key={d.id} d={d} destacado={d.id === desafio} />
      ))}
    </div>
  );
}

export function VistaLogros() {
  return (
    <div className="co-vista">
      <Compositor preset={{ tipo: "logro" }} />
      <Feed filtro={{ tipo: "logro" }} vacio={T.feed.vacioLogros} />
    </div>
  );
}

export function VistaActividad() {
  const { alias, fuente, aviso, cambio } = useComunidad();
  const { dato: bloqueos } = useDato((f) => f.bloqueos());
  const desbloquear = async (a: string) => {
    try {
      await fuente.desbloquear(a);
      aviso(T.actividad.desbloqueada(a));
      cambio();
    } catch {
      aviso(T.errorGeneral);
    }
  };
  return (
    <div className="co-vista">
      <header className="co-bloque">
        <h2 className="co-h2">{T.actividad.titulo}</h2>
        <p className="co-bajada">{T.actividad.alias(alias)}</p>
      </header>
      <div className="co-solo-movil">
        <TarjetaImpacto conEnlace={false} />
      </div>
      <section className="co-bloque" aria-labelledby="co-guardadas-h">
        <h2 id="co-guardadas-h" className="co-h3">
          {T.actividad.guardadas}
        </h2>
        <Feed filtro={{ soloGuardadas: true }} vacio={T.actividad.sinGuardadas} />
      </section>
      <section className="co-tarjeta co-lateral" aria-labelledby="co-bloq-h">
        <h2 id="co-bloq-h" className="co-lateral__titulo">
          {T.actividad.bloqueadas}
        </h2>
        {bloqueos && bloqueos.length === 0 && <p className="co-lateral__vacio">{T.actividad.sinBloqueadas}</p>}
        <ul className="co-bloqueos">
          {(bloqueos ?? []).map((b) => (
            <li key={b.alias}>
              <span>
                <span className="co-bloqueos__alias">{b.alias}</span>
                <span className="co-bloqueos__fecha">{fechaRelativa(b.desde)}</span>
              </span>
              <button type="button" className="boton boton--terciario" onClick={() => void desbloquear(b.alias)}>
                {T.actividad.desbloquear}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="co-tarjeta co-cuidado" aria-labelledby="co-cuidado-h">
        <h2 id="co-cuidado-h" className="co-lateral__titulo">
          <Icono nombre="shield-check" />
          {T.cuidado.titulo}
        </h2>
        <ul>
          {T.cuidado.puntos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
