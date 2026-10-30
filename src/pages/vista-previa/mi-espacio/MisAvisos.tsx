// Mis avisos (maqueta de ChatGPT, 30-oct-2026). La lista de avisos de la tabla avisos (A5):
//   · Portada «Mis avisos» con el paisaje de Rumbo.
//   · Filtros con el número real sin leer: Todos, No leídos, Recordatorios, Mensajes, Comunidad
//     (solo con el módulo visible), Logros y Sistema. Búsqueda en el título y la descripción.
//   · Grupos Hoy / Ayer / Esta semana / Anteriores, en la zona horaria de la persona.
//   · Cada aviso: icono, título (texto fijo de la base), descripción fija de su tipo, hora y punto
//     «sin leer». Al abrirlo se marca como leído (marcar_avisos_leidos: igual en todos los equipos)
//     y lleva a su pantalla; si su sección está cerrada (Comunidad apagada), solo se marca.
//   · Lateral: avisos nuevos con «Marcar todo como leído», tipos de avisos y enlace a Preferencias.
// En la vista previa, lo leído se guarda solo en la pantalla.
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icono } from "../../../components/app";
import { EtiquetaEjemplo, useEspacio } from "./comun";
import { FOTO_PORTADA, PaisajePortada } from "./comunidad/Paisaje";
import {
  CATEGORIAS,
  GRUPOS,
  ICONO_CATEGORIA,
  categoriaDe,
  destinoDe,
  diaDe,
  grupoDe,
  horaDe,
  iconoDe,
  type Aviso,
  type Categoria,
  type Grupo,
} from "./avisos/datos";
import { T_AVISOS as T } from "./textos";

type Filtro = "todos" | "noLeidos" | Categoria;

export const descripcionDe = (tipo: string) => T.descripcion[tipo] ?? T.descripcionOtro;

export default function MisAvisos() {
  const esp = useEspacio();
  const navegar = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [leidosPrevia, setLeidosPrevia] = useState<Set<string>>(() => new Set());
  const [marcando, setMarcando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

  const zona = esp.participante.zonaHoraria;
  const avisos: Aviso[] | null = useMemo(
    () =>
      esp.avisos &&
      esp.avisos
        .filter((a) => esp.comunidad || categoriaDe(a.tipo) !== "comunidad")
        .map((a) => (!esp.real && !a.leidoEn && leidosPrevia.has(a.id) ? { ...a, leidoEn: a.creadoEn } : a)),
    [esp.avisos, esp.comunidad, esp.real, leidosPrevia],
  );

  const categorias = CATEGORIAS.filter((c) => c !== "comunidad" || esp.comunidad);
  const sinLeer = (lista: Aviso[]) => lista.filter((a) => !a.leidoEn).length;
  const total = avisos ? sinLeer(avisos) : 0;
  const porCategoria = (c: Categoria) => (avisos ? sinLeer(avisos.filter((a) => categoriaDe(a.tipo) === c)) : 0);

  const marcar = async (ids: string[] | null) => {
    if (!esp.real || !esp.servidor) {
      setLeidosPrevia((s) => new Set([...s, ...(ids ?? (avisos ?? []).map((a) => a.id))]));
      return;
    }
    await esp.servidor.marcarAvisos(ids);
  };

  const abrir = async (a: Aviso) => {
    const destino = destinoDe(a, esp.R, esp.comunidad);
    if (!a.leidoEn) {
      try {
        await marcar([a.id]);
      } catch {
        // Si no se pudo marcar, igual se abre: queda sin leer y se puede marcar después.
      }
    }
    if (destino) navegar(destino);
  };

  const marcarTodos = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine && esp.real) {
      setMensaje({ texto: T.sinConexion, error: true });
      return;
    }
    setMarcando(true);
    setMensaje(null);
    try {
      await marcar(null);
      setMensaje({ texto: T.marcadosTodos, error: false });
    } catch {
      setMensaje({ texto: T.errorMarcar, error: true });
    } finally {
      setMarcando(false);
    }
  };

  const buscar = busqueda.trim().toLocaleLowerCase("es");
  const visibles = (avisos ?? []).filter((a) => {
    if (filtro === "noLeidos" && a.leidoEn) return false;
    if (filtro !== "todos" && filtro !== "noLeidos" && categoriaDe(a.tipo) !== filtro) return false;
    if (buscar && !`${a.titulo} ${descripcionDe(a.tipo)}`.toLocaleLowerCase("es").includes(buscar)) return false;
    return true;
  });
  const grupos = GRUPOS.map((g) => ({ g, lista: visibles.filter((a) => grupoDe(diaDe(a.creadoEn, zona), esp.hoy) === g) })).filter(
    (x) => x.lista.length,
  );

  const chips: { v: Filtro; texto: string; n: number }[] = [
    { v: "todos", texto: T.filtro.todos, n: total },
    { v: "noLeidos", texto: T.filtro.noLeidos, n: total },
    ...categorias.map((c) => ({ v: c as Filtro, texto: T.filtro[c], n: porCategoria(c) })),
  ];

  const vacio = !avisos?.length ? T.vacio.todos : buscar ? T.vacio.busqueda : T.vacio.filtro;

  return (
    <div className="me-pantalla av">
      <header className="av-portada">
        {FOTO_PORTADA ? <img className="av-portada__fondo" src={FOTO_PORTADA} alt="" /> : <PaisajePortada className="av-portada__fondo" />}
        <div className="av-portada__texto">
          <div className="av-portada__fila">
            <h1 className="av-portada__h1">{T.titulo}</h1>
            <EtiquetaEjemplo />
          </div>
          <p className="av-portada__bajada">{T.bajada}</p>
        </div>
      </header>

      {avisos === null ? (
        <div className="aviso aviso--error av-error" role="alert">
          <Icono nombre="info" tamaño={20} className="aviso-icono" />
          <div className="aviso-cuerpo">
            <h2 className="aviso-titulo">{T.error.titulo}</h2>
            <p>{T.error.texto}</p>
            {esp.servidor && (
              <div className="acciones">
                <button type="button" className="boton boton--secundario" onClick={esp.servidor.recargar}>
                  {T.error.reintentar}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="av-cuerpo">
          <div className="av-principal">
            <div className="av-herramientas">
              <div className="av-filtros" role="group" aria-label={T.filtros}>
                {chips.map((c) => (
                  <button
                    key={c.v}
                    type="button"
                    className="av-filtro"
                    aria-pressed={filtro === c.v}
                    aria-label={`${c.texto}, ${T.sinLeerChip(c.n)}`}
                    onClick={() => setFiltro(c.v)}
                  >
                    {c.texto}
                    <span className={c.n ? "av-filtro__n av-filtro__n--hay" : "av-filtro__n"}>
                      {c.n}
                    </span>
                  </button>
                ))}
              </div>
              <label className="av-buscar">
                <span className="sr-only">{T.buscar}</span>
                <Icono nombre="search" tamaño={20} />
                <input type="search" value={busqueda} placeholder={T.buscarMarcador} onChange={(e) => setBusqueda(e.target.value)} />
              </label>
            </div>

            {grupos.length ? (
              grupos.map(({ g, lista }) => <GrupoAvisos key={g} grupo={g} lista={lista} zona={zona} onAbrir={(a) => void abrir(a)} />)
            ) : (
              <div className="av-vacio">
                <Icono nombre="bell" tamaño={24} />
                <h2 className="av-vacio__titulo">{vacio.titulo}</h2>
                <p>{vacio.texto}</p>
              </div>
            )}
          </div>

          <aside className="av-lateral" aria-label={T.tipos}>
            <section className="av-tarjeta av-nuevos" aria-labelledby="av-nuevos">
              <span className="av-icono av-icono--recordatorios" aria-hidden="true">
                <Icono nombre="bell" tamaño={22} />
              </span>
              <div className="av-nuevos__texto">
                <h2 id="av-nuevos" className="av-tarjeta__h2">
                  {total ? T.nuevos(total) : T.alDia}
                </h2>
                <p>{total ? T.nuevosBajada : T.alDiaBajada}</p>
                {total > 0 && (
                  <button type="button" className="boton boton--secundario av-nuevos__boton" disabled={marcando} onClick={() => void marcarTodos()}>
                    {marcando ? T.marcando : T.marcarTodos}
                  </button>
                )}
                <p className={mensaje?.error ? "av-mensaje av-mensaje--error" : "av-mensaje"} role="status">
                  {mensaje?.texto ?? ""}
                </p>
              </div>
            </section>

            <section className="av-tarjeta" aria-labelledby="av-tipos">
              <h2 id="av-tipos" className="av-tarjeta__h2">
                {T.tipos}
              </h2>
              <ul className="av-tipos">
                {categorias.map((c) => (
                  <li key={c}>
                    <button type="button" className="av-tipo" aria-pressed={filtro === c} onClick={() => setFiltro(c)}>
                      <span className={`av-icono av-icono--${c}`} aria-hidden="true">
                        <Icono nombre={ICONO_CATEGORIA[c]} tamaño={20} />
                      </span>
                      <span className="av-tipo__texto">
                        <span className="av-tipo__nombre">{T.filtro[c]}</span>
                        <span className="av-tipo__bajada">{T.descripcionCategoria[c]}</span>
                      </span>
                      <Icono nombre="chevron-right" tamaño={20} />
                      <span className="sr-only">{`, ${T.verTipo(T.filtro[c])}`}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="av-tarjeta av-ayuda" aria-labelledby="av-ayuda">
              <h2 id="av-ayuda" className="av-tarjeta__h2">
                {T.noEncuentras}
              </h2>
              <p>{T.noEncuentrasTexto}</p>
              <Link to={esp.R.preferencias} className="boton boton--secundario av-ayuda__boton">
                {T.irPreferencias}
                <Icono nombre="arrow-right" tamaño={20} />
              </Link>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

function GrupoAvisos({ grupo, lista, zona, onAbrir }: { grupo: Grupo; lista: Aviso[]; zona: string; onAbrir: (a: Aviso) => void }) {
  const esp = useEspacio();
  const id = `av-grupo-${grupo}`;
  return (
    <section className="av-grupo" aria-labelledby={id}>
      <h2 id={id} className="av-grupo__h2">
        {T.grupos[grupo]}
      </h2>
      <ul className="av-lista">
        {lista.map((a) => {
          const destino = destinoDe(a, esp.R, esp.comunidad);
          const cuando = grupo === "hoy" ? horaDe(a.creadoEn, zona) : grupo === "ayer" ? T.ayer : fechaCorta(diaDe(a.creadoEn, zona));
          return (
            <li key={a.id}>
              <button type="button" className={a.leidoEn ? "av-item" : "av-item av-item--nuevo"} onClick={() => onAbrir(a)}>
                <span className={`av-icono av-icono--${categoriaDe(a.tipo)}`} aria-hidden="true">
                  <Icono nombre={iconoDe(a.tipo)} tamaño={22} />
                </span>
                <span className="av-item__texto">
                  <span className="av-item__titulo">{a.titulo}</span>
                  <span className="av-item__descripcion">{destino ? descripcionDe(a.tipo) : T.sinEnlace}</span>
                </span>
                <span className="av-item__lado">
                  <span className="av-item__hora">{cuando}</span>
                  {!a.leidoEn && (
                    <>
                      <span className="av-item__punto" aria-hidden="true" />
                      <span className="sr-only">{`, ${T.noLeido}`}</span>
                    </>
                  )}
                </span>
                <Icono nombre="chevron-right" tamaño={20} className="av-item__flecha" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// «lun 12» en «Esta semana»; «6 oct» en «Anteriores».
function fechaCorta(dia: string): string {
  const f = new Date(`${dia}T12:00:00Z`);
  const dias = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
  return `${dias[f.getUTCDay()]} ${f.getUTCDate()} ${meses[f.getUTCMonth()]}`;
}
