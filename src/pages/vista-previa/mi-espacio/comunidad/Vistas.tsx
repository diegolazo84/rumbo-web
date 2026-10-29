// Las pestañas de Comunidad que no son «Todas las publicaciones»: Mis grupos (descubrir, entrar
// a un grupo y sus publicaciones), Historias de logro y Mi actividad (impacto, guardadas y personas
// bloqueadas). Desafíos es su propia pantalla (DesafiosPagina.tsx, C15).
import { useState } from "react";
import { Link } from "react-router-dom";
import { Icono } from "../../../../components/app";
import { useEspacio } from "../comun";
import { fechaRelativa, useComunidad } from "./contexto";
import type { Grupo } from "./fuente";
import { TarjetaImpacto, useDato } from "./Laterales";
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

// El interior de un grupo es su propia pantalla (GrupoInterior.tsx, C14).
export function VistaGrupos() {
  const { enlace } = useComunidad();
  const { R } = useEspacio();
  const { dato, error } = useDato((f) => f.grupos());

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
