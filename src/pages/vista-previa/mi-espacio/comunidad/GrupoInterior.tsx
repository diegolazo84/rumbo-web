// C14 · Interior de un grupo, con la maqueta de ChatGPT (29-oct-2026) y el prompt de Diego.
//   · Portada panorámica: «Volver a los grupos», nombre, descripción, miembros y publicaciones
//     visibles reales, y «Unirse» (o «Eres parte del grupo», discreto, si ya pertenece).
//     El paisaje es la ilustración propia de Comunidad mientras no llegue la fotografía definitiva.
//   · Pestañas: Publicaciones, Miembros e Información (las tres con contenido real).
//   · Escritorio: publicaciones a la izquierda; a la derecha «Sobre el grupo», «Miembros» (alias e
//     iniciales, nunca fotos) y la invitación a crear una publicación.
//   · Móvil: portada compacta, pestañas, invitación y publicaciones; la columna lateral va después.
// La base decide qué se ve: publicaciones y lista de miembros solo para quienes son parte del grupo.
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Hoja, Icono } from "../../../../components/app";
import { useEspacio } from "../comun";
import { fechaLargaIso, fechaRelativa, useComunidad } from "./contexto";
import type { Grupo, MiembroGrupo } from "./fuente";
import { useDato } from "./Laterales";
import { FOTO_PORTADA, PaisajePortada } from "./Paisaje";
import { Avatar, Feed } from "./Publicaciones";
import { T_COMU } from "./textos";

const T = T_COMU.interior;
type Seccion = "publicaciones" | "miembros" | "informacion";
const SECCIONES: Seccion[] = ["publicaciones", "miembros", "informacion"];

export default function GrupoInterior({ grupo }: { grupo: string }) {
  const { R } = useEspacio();
  const { dato, error } = useDato((f) => f.grupos(), [grupo]);
  const g = dato?.find((x) => x.id === grupo) ?? null;

  if (error)
    return (
      <div className="co-tarjeta co-estado co-angosta" role="alert">
        <p>{T_COMU.errorGeneral}</p>
      </div>
    );
  if (!dato) return <p className="co-tarjeta co-estado co-angosta">{T_COMU.cargando}</p>;
  if (!g)
    return (
      <div className="co-tarjeta co-estado co-angosta gi-no-encontrado">
        <p>{T.noEncontrado}</p>
        <Link to={R.comunidadGrupos} className="boton boton--secundario">
          {T.volver}
        </Link>
      </div>
    );
  return <Interior g={g} />;
}

function Interior({ g }: { g: Grupo }) {
  const [params] = useSearchParams();
  const pedida = params.get("seccion") as Seccion | null;
  const seccion: Seccion = pedida && SECCIONES.includes(pedida) ? pedida : "publicaciones";
  const enlaceSeccion = (s: Seccion) => {
    const q = new URLSearchParams(params);
    if (s === "publicaciones") q.delete("seccion");
    else q.set("seccion", s);
    return `?${q.toString()}`;
  };

  return (
    <div className="gi">
      <PortadaGrupo g={g} />
      <nav className="gi-pestanas" aria-label={T.navegacion(g.nombre)}>
        <ul>
          {SECCIONES.map((s) => (
            <li key={s}>
              <Link to={enlaceSeccion(s)} className="gi-pestana" aria-current={seccion === s ? "page" : undefined} replace>
                {T.pestanas[s]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="gi-columnas">
        <div className="gi-principal">
          {seccion === "publicaciones" && <Publicaciones g={g} />}
          {seccion === "miembros" && <Miembros g={g} />}
          {seccion === "informacion" && <Informacion g={g} />}
        </div>
        <aside className="gi-lateral" aria-label={T.sobre}>
          <section className="co-tarjeta gi-caja" aria-labelledby="gi-sobre-t">
            <div className="gi-sobre">
              <h2 id="gi-sobre-t" className="gi-h2">
                {T.sobre}
              </h2>
              <p>{g.descripcion || T.sinDescripcion}</p>
            </div>
            <MiembrosResumen g={g} enlace={enlaceSeccion("miembros")} />
          </section>
          {g.soyMiembro && <Animo enlace={`${enlaceSeccion("publicaciones")}#gi-publicaciones`} />}
        </aside>
      </div>
    </div>
  );
}

function PortadaGrupo({ g }: { g: Grupo }) {
  const { R } = useEspacio();
  return (
    <header className="gi-portada">
      {FOTO_PORTADA ? <img className="gi-portada__fondo" src={FOTO_PORTADA} alt="" /> : <PaisajePortada className="gi-portada__fondo" />}
      <Link to={R.comunidadGrupos} className="gi-portada__volver">
        <Icono nombre="arrow-left" tamaño={20} />
        {T.volver}
      </Link>
      <div className="gi-portada__texto">
        <h1 className="gi-portada__h1">{g.nombre}</h1>
        {g.descripcion && <p className="gi-portada__desc">{g.descripcion}</p>}
        <p className="gi-portada__datos">
          <span>
            <Icono nombre="users" tamaño={20} />
            {T_COMU.grupos.miembros(g.miembros)}
          </span>
          <span>
            <Icono nombre="file-text" tamaño={20} />
            {T_COMU.grupos.publicaciones(g.publicaciones)}
          </span>
        </p>
      </div>
      <div className="gi-portada__accion">
        {g.soyMiembro ? (
          <p className="gi-pertenece">
            <Icono nombre="check" tamaño={16} />
            {T.soyParte}
          </p>
        ) : (
          <BotonUnirse g={g} clase="gi-unirse" />
        )}
      </div>
    </header>
  );
}

function BotonUnirse({ g, clase }: { g: Grupo; clase?: string }) {
  const { fuente, aviso, cambio } = useComunidad();
  const [enviando, setEnviando] = useState(false);
  const unirse = async () => {
    setEnviando(true);
    try {
      await fuente.unirmeGrupo(g.id);
      aviso(T.unido_(g.nombre));
      cambio();
    } catch {
      aviso(T_COMU.errorGeneral);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <button type="button" className={`boton boton--primario ${clase ?? ""}`} disabled={enviando} onClick={() => void unirse()}>
      {T.unirse}
    </button>
  );
}

// «Comparte tu experiencia…»: abre Crear publicación (la pantalla que ya existe) con este grupo.
function Invitacion({ g }: { g: Grupo }) {
  const { alias, abrirCrear } = useComunidad();
  return (
    <section className="co-tarjeta gi-invitacion" aria-label={T.crear}>
      <Avatar alias={alias} grande />
      <button type="button" className="gi-invitacion__campo" onClick={() => abrirCrear({ grupo: g.id })}>
        {T.invitacion}
      </button>
      <div className="gi-invitacion__fila">
        <button type="button" className="gi-invitacion__icono" aria-label={T.emoji} onClick={() => abrirCrear({ grupo: g.id, emoji: true })}>
          <Icono nombre="smile" tamaño={24} />
        </button>
        <button type="button" className="gi-invitacion__icono" aria-label={T.foto} onClick={() => abrirCrear({ grupo: g.id, foto: true })}>
          <Icono nombre="image" tamaño={24} />
        </button>
        <button type="button" className="boton boton--primario gi-invitacion__publicar" onClick={() => abrirCrear({ grupo: g.id })}>
          <Icono nombre="send" tamaño={20} />
          {T.publicar}
        </button>
      </div>
    </section>
  );
}

function SoloMiembros({ g, titulo, texto }: { g: Grupo; titulo?: string; texto: string }) {
  return (
    <div className="co-tarjeta gi-solo-miembros">
      <Icono nombre="lock" tamaño={24} />
      {titulo && <h2 className="gi-h3">{titulo}</h2>}
      <p>{texto}</p>
      <BotonUnirse g={g} />
    </div>
  );
}

function Publicaciones({ g }: { g: Grupo }) {
  // «Explorar publicaciones» (#gi-publicaciones): se desplaza y enfoca el listado después del
  // foco general al h1 que hacen App.tsx y la vista previa al navegar.
  const { hash, key } = useLocation();
  useEffect(() => {
    if (hash !== "#gi-publicaciones" || !g.soyMiembro) return;
    const id = requestAnimationFrame(() => {
      const lista = document.getElementById("gi-publicaciones");
      lista?.scrollIntoView({ block: "start" });
      lista?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [hash, key, g.soyMiembro]);
  if (!g.soyMiembro) return <SoloMiembros g={g} titulo={T.noMiembroTitulo} texto={T.noMiembroTexto} />;
  return (
    <div id="gi-publicaciones" className="gi-feed" tabIndex={-1} aria-label={T.pestanas.publicaciones}>
      <Feed filtro={{ grupo: g.id }} vacio={T.vacio} antes={<Invitacion g={g} />} enGrupo />
    </div>
  );
}

function useMiembros(g: Grupo) {
  // Solo se piden si la persona es parte del grupo (la base también lo exige).
  return useDato((f) => (g.soyMiembro ? f.miembrosGrupo(g.id) : Promise.resolve<MiembroGrupo[]>([])), [g.id, g.soyMiembro]);
}

function Miembros({ g }: { g: Grupo }) {
  const { dato, error } = useMiembros(g);
  if (!g.soyMiembro) return <SoloMiembros g={g} texto={T.miembrosNoMiembro} />;
  return (
    <section className="co-tarjeta gi-caja gi-miembros" aria-labelledby="gi-miembros-t">
      <h2 id="gi-miembros-t" className="gi-h2">
        {T.miembrosTitulo} <span className="gi-cuenta">({g.miembros})</span>
      </h2>
      <p className="gi-ayuda">{T.miembrosAyuda}</p>
      {error && <p role="alert">{T_COMU.errorGeneral}</p>}
      {!dato && !error && <p aria-live="polite">{T_COMU.cargando}</p>}
      {dato && (
        <ul className="gi-lista">
          {dato.map((m) => (
            <li key={`${m.alias}-${m.unidoEn}`} className="gi-miembro">
              <Avatar alias={m.alias} />
              <span className="gi-miembro__quien">
                <span className="gi-miembro__alias">
                  {m.alias}
                  {m.soyYo && <span className="gi-tu">{T.tu}</span>}
                </span>
                <span className="gi-miembro__desde">{T.unido(minuscula(fechaRelativa(m.unidoEn)))}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MiembrosResumen({ g, enlace }: { g: Grupo; enlace: string }) {
  const { dato } = useMiembros(g);
  const visibles = (dato ?? []).slice(0, 4);
  const resto = Math.max(g.miembros - visibles.length, 0);
  return (
    <div className="gi-resumen">
      <div className="gi-resumen__cabeza">
        <h3 className="gi-h3">{T.miembrosTitulo}</h3>
        {g.soyMiembro && (
          <Link to={enlace} className="gi-ver-todos" replace>
            {T.verTodos}
          </Link>
        )}
      </div>
      {g.soyMiembro && visibles.length > 0 ? (
        <ul className="gi-avatares" aria-label={T.miembrosTitulo}>
          {visibles.map((m) => (
            <li key={`${m.alias}-${m.unidoEn}`}>
              <Avatar alias={m.alias} grande />
              <span className="sr-only">{m.alias}</span>
            </li>
          ))}
          {resto > 0 && (
            <li>
              <span className="gi-avatares__mas" aria-hidden="true">
                {T.mas(resto)}
              </span>
              <span className="sr-only">{T.masSr(resto)}</span>
            </li>
          )}
        </ul>
      ) : (
        <p className="gi-ayuda">
          {T_COMU.grupos.miembros(g.miembros)}
          {!g.soyMiembro && <> · {T.miembrosNoMiembro}</>}
        </p>
      )}
    </div>
  );
}

function Animo({ enlace }: { enlace: string }) {
  return (
    <section className="gi-animo" aria-labelledby="gi-animo-t">
      <Icono nombre="users" tamaño={24} />
      <h2 id="gi-animo-t" className="gi-animo__titulo">
        {T.animoTitulo}
      </h2>
      <p>{T.animoTexto}</p>
      {/* «Explorar publicaciones» lleva al listado de esta misma pantalla. */}
      <Link to={enlace} replace className="boton boton--primario gi-animo__boton">
        <Icono nombre="file-text" tamaño={20} />
        {T.explorar}
      </Link>
    </section>
  );
}

function Informacion({ g }: { g: Grupo }) {
  const datos: [string, ReactNode][] = [[T.sobre, g.descripcion || T.sinDescripcion]];
  if (g.categoria) datos.push([T.categoria, T_COMU.explorador.categorias[g.categoria] ?? g.categoria]);
  if (g.creadoEn) datos.push([T.creado, fechaLargaIso(g.creadoEn.slice(0, 10))]);
  datos.push([T.privacidad, T.privacidadTexto], [T.reglas, T.reglasTexto]);
  return (
    <section className="co-tarjeta gi-caja gi-info" aria-labelledby="gi-info-t">
      <h2 id="gi-info-t" className="gi-h2">
        {T.pestanas.informacion}
      </h2>
      <dl className="gi-datos">
        {datos.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {g.soyMiembro && <Salir g={g} />}
    </section>
  );
}

// Salir queda en Información, sin competir con publicar: pide confirmación antes.
function Salir({ g }: { g: Grupo }) {
  const { fuente, aviso, cambio } = useComunidad();
  const [abierta, setAbierta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const salir = async () => {
    setEnviando(true);
    try {
      await fuente.salirGrupo(g.id);
      setAbierta(false);
      aviso(T.salido(g.nombre));
      cambio();
    } catch {
      aviso(T_COMU.errorGeneral);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <>
      <button type="button" className="boton boton--terciario gi-salir" onClick={() => setAbierta(true)}>
        <Icono nombre="log-out" tamaño={16} />
        {T.salir}
      </button>
      <Hoja abierta={abierta} onCerrar={() => setAbierta(false)} titulo={T.salir} textoCerrar={T.cancelar}>
        <p>{T.salirConfirmar(g.nombre)}</p>
        <div className="gi-hoja-acciones">
          <button type="button" className="boton boton--primario" disabled={enviando} onClick={() => void salir()}>
            {T.salirSi}
          </button>
          <button type="button" className="boton boton--secundario" onClick={() => setAbierta(false)}>
            {T.cancelar}
          </button>
        </div>
      </Hoja>
    </>
  );
}

const minuscula = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);
