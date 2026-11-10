// Crear publicación: maqueta de ChatGPT (22-oct-2026) y prompt de implementación de Diego.
//   · Escritorio: portada con «Volver a la comunidad», formulario de 5 pasos a la izquierda y la
//     vista previa a la derecha (se actualiza con categoría, texto, fotos y destino).
//   · Móvil: encabezado compacto con flecha, los 5 pasos en una columna, «Revisar antes de
//     publicar» (la misma vista previa) y Publicar a todo el ancho con Cancelar debajo.
// Lo que se valida aquí se vuelve a validar en la base (C6 a C11): texto de 1 a 1.000 caracteres,
// grupo al que perteneces, hasta 5 fotos subidas a tu carpeta privada, comentarios apagados y
// el mismo intento que llega dos veces (cliente_id) no se publica dos veces.
import { useEffect, useId, useMemo, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Hoja, Icono, type NombreIconoApp } from "../../../../components/app";
import { ErrorBase } from "../../../../lib/supabase";
import { EtiquetaEjemplo, useEspacio } from "../comun";
import {
  LIMITE_FOTO,
  LIMITE_FOTO_ORIGINAL,
  LIMITE_TEXTO,
  MAX_FOTOS,
  TIPOS_FOTO,
  fuenteEjemploCompartida,
  fuenteReal,
  prepararFoto,
  type Acceso,
  type FuenteComunidad,
  type Grupo,
  type TipoPublicacion,
} from "./fuente";
import { FOTO_PORTADA, PaisajePortada } from "./Paisaje";
import { Avatar } from "./Publicaciones";
import { T_COMU } from "./textos";
import "../../../../styles/vista-comunidad.css";

const T = T_COMU.crearPagina;

// Las cuatro categorías de la maqueta. «Otro» se guarda como publicación general. Una historia de
// logro (desde «Compartir mi logro» de un desafío o de Historias de logro) conserva su tipo y se
// muestra dentro de «Tu progreso».
type Categoria = "progreso" | "pregunta" | "consejo" | "otro";
const CATEGORIAS: { clave: Categoria; tipo: TipoPublicacion; icono: NombreIconoApp }[] = [
  { clave: "progreso", tipo: "progreso", icono: "chart-column-increasing" },
  { clave: "pregunta", tipo: "pregunta", icono: "circle-help" },
  { clave: "consejo", tipo: "consejo", icono: "lightbulb" },
  { clave: "otro", tipo: "general", icono: "message-square" },
];
const categoriaDe = (t: TipoPublicacion): Categoria => (t === "general" ? "otro" : t === "logro" ? "progreso" : t);
const TIPOS_VALIDOS: TipoPublicacion[] = ["general", "progreso", "pregunta", "consejo", "logro"];
const EMOJIS = ["😊", "🙌", "💪", "🎉", "❤️", "🌱", "✨", "🙏", "😅", "🔥", "☀️", "🚶"];

type FotoElegida = { id: string; archivo: File; url: string };

export default function CrearPagina() {
  const esp = useEspacio();
  const fuente = useMemo<FuenteComunidad>(() => (esp.real ? fuenteReal() : fuenteEjemploCompartida("abierta")), [esp.real]);
  const [acceso, setAcceso] = useState<{ estado: Acceso; alias: string | null } | null>(null);
  const [errorAcceso, setErrorAcceso] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vivo = true;
    setErrorAcceso(false);
    fuente
      .acceso()
      .then((a) => vivo && setAcceso(a))
      .catch(() => vivo && setErrorAcceso(true));
    return () => {
      vivo = false;
    };
  }, [fuente, intento]);

  return (
    <div className="me-pantalla co-crear-pagina">
      {acceso?.estado === "abierta" ? (
        <Formulario fuente={fuente} alias={acceso.alias ?? ""} />
      ) : (
        <>
          <Encabezado volver={esp.R.comunidad} />
          {errorAcceso && (
            <div className="co-tarjeta co-estado co-angosta" role="alert">
              <p>{T_COMU.errorGeneral}</p>
              <button type="button" className="boton boton--secundario" onClick={() => setIntento(intento + 1)}>
                {T_COMU.feed.reintentar}
              </button>
            </div>
          )}
          {!acceso && !errorAcceso && <p className="co-tarjeta co-estado co-angosta">{T_COMU.cargando}</p>}
          {/* Sin módulo, sin alias o sin reglas aceptadas: se hace desde Comunidad. */}
          {acceso && (
            <div className="co-tarjeta co-estado co-angosta">
              <p>{T.errores.cerrada}</p>
              <Link to={esp.R.comunidad} className="boton boton--secundario">
                {T.volver}
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Escritorio: portada con la ilustración (o la foto definitiva). Móvil: barra con flecha y título.
function Encabezado({ volver, onVolver }: { volver: string; onVolver?: (e: React.MouseEvent) => void }) {
  return (
    <header className="co-portada co-portada--crear">
      {FOTO_PORTADA ? <img className="co-portada__fondo" src={FOTO_PORTADA} alt="" /> : <PaisajePortada className="co-portada__fondo" />}
      <Link to={volver} className="co-crear-volver" onClick={onVolver}>
        <Icono nombre="arrow-left" tamaño={20} />
        <span className="co-crear-volver__texto">{T.volver}</span>
      </Link>
      <div className="co-portada__texto">
        <h1 className="co-portada__h1">{T.titulo}</h1>
        <p className="co-portada__bajada">{T.bajada}</p>
      </div>
    </header>
  );
}

function Paso({ n, titulo, id, extra, children }: { n: number; titulo: string; id: string; extra?: string; children: ReactNode }) {
  return (
    <section className="co-paso" aria-labelledby={id}>
      <h2 className="co-paso__titulo" id={id}>
        <span className="co-paso__n" aria-hidden="true">
          {n}
        </span>
        <span className="sr-only">{T.paso(n)} </span>
        {titulo}
        {extra && <span className="co-paso__extra"> {extra}</span>}
      </h2>
      {children}
    </section>
  );
}

function Formulario({ fuente, alias }: { fuente: FuenteComunidad; alias: string }) {
  const { R } = useEspacio();
  const navegar = useNavigate();
  const { search, state } = useLocation();
  const preset = useMemo(() => {
    const q = new URLSearchParams(search);
    const tipo = q.get("tipo") as TipoPublicacion | null;
    return {
      tipo: tipo && TIPOS_VALIDOS.includes(tipo) ? tipo : null,
      grupo: q.get("grupo"),
      foto: q.get("foto") === "1",
      emoji: q.get("emoji") === "1",
      texto: typeof (state as { texto?: unknown } | null)?.texto === "string" ? (state as { texto: string }).texto : "",
    };
  }, [search, state]);

  const [tipo, setTipo] = useState<TipoPublicacion>(preset.tipo ?? "progreso");
  const [texto, setTexto] = useState(preset.texto);
  const [fotos, setFotos] = useState<FotoElegida[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupo, setGrupo] = useState("");
  const [comentarios, setComentarios] = useState(true);
  const [errores, setErrores] = useState<string[]>([]);
  const [errorFotos, setErrorFotos] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [emojis, setEmojis] = useState(preset.emoji);
  const [descartar, setDescartar] = useState<string | null>(null); // a dónde ir si se confirma
  const clienteId = useRef(crypto.randomUUID());
  const enviado = useRef(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const resumen = useRef<HTMLDivElement>(null);
  const fotosRef = useRef(fotos);
  fotosRef.current = fotos;
  const ids = {
    p1: useId(), p2: useId(), p3: useId(), p4: useId(), p5: useId(),
    contador: useId(), ayudaFotos: useId(), coment: useId(), comentAyuda: useId(), emojis: useId(), errFotos: useId(),
  };

  // Los grupos a los que perteneces (la base vuelve a comprobarlo al publicar).
  useEffect(() => {
    let vivo = true;
    void fuente
      .grupos()
      .then((g) => {
        if (!vivo) return;
        const mios = g.filter((x) => x.soyMiembro);
        setGrupos(mios);
        if (preset.grupo && mios.some((x) => x.id === preset.grupo)) setGrupo(preset.grupo);
      })
      .catch(() => vivo && setGrupos([]));
    return () => {
      vivo = false;
    };
  }, [fuente, preset.grupo]);

  // «Foto» desde Comunidad abre el selector; si no, el foco va al texto cuando viene escrito.
  useEffect(() => {
    if (preset.foto) archivo.current?.click();
    else if (preset.texto) area.current?.focus();
  }, [preset.foto, preset.texto]);

  // Un intento nuevo cada vez que cambia el contenido; un doble clic usa el mismo y no duplica.
  useEffect(() => {
    clienteId.current = crypto.randomUUID();
  }, [tipo, texto, fotos, grupo, comentarios]);

  // Al salir, se liberan las miniaturas.
  useEffect(() => () => fotosRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  const sucio = texto.trim() !== preset.texto.trim() || fotos.length > 0;
  // Recargar o cerrar la pestaña con cambios: el navegador pregunta.
  useEffect(() => {
    if (!sucio) return;
    const antes = (e: BeforeUnloadEvent) => {
      if (enviado.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", antes);
    return () => window.removeEventListener("beforeunload", antes);
  }, [sucio]);

  const agregarFotos = (lista: FileList | File[] | null | undefined) => {
    if (!lista) return;
    const nuevos: FotoElegida[] = [];
    const errs: string[] = [];
    for (const f of Array.from(lista)) {
      if (fotos.length + nuevos.length >= MAX_FOTOS) {
        if (!errs.includes(T.errores.maxFotos)) errs.push(T.errores.maxFotos);
        continue;
      }
      if (!TIPOS_FOTO.includes(f.type)) errs.push(T.errores.fotoTipo(f.name));
      else if (f.size > LIMITE_FOTO_ORIGINAL) errs.push(T.errores.fotoPeso(f.name));
      else nuevos.push({ id: crypto.randomUUID(), archivo: f, url: URL.createObjectURL(f) });
    }
    setErrorFotos(errs);
    if (nuevos.length) setFotos((a) => [...a, ...nuevos]);
  };
  const quitarFoto = (id: string) => {
    setFotos((a) => {
      const f = a.find((x) => x.id === id);
      if (f) URL.revokeObjectURL(f.url);
      return a.filter((x) => x.id !== id);
    });
    setErrorFotos([]);
  };
  const soltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    agregarFotos(e.dataTransfer.files);
  };

  const ponerEmoji = (emoji: string) => {
    const a = area.current;
    const ini = a?.selectionStart ?? texto.length;
    const fin = a?.selectionEnd ?? texto.length;
    const nuevo = texto.slice(0, ini) + emoji + texto.slice(fin);
    if (nuevo.length > LIMITE_TEXTO) return;
    setTexto(nuevo);
    setEmojis(false);
    requestAnimationFrame(() => {
      a?.focus();
      a?.setSelectionRange(ini + emoji.length, ini + emoji.length);
    });
  };

  const salir = (destino: string) => {
    if (sucio && !enviado.current) setDescartar(destino);
    else navegar(destino);
  };

  const mostrarErrores = (lista: string[]) => {
    setErrores(lista);
    requestAnimationFrame(() => resumen.current?.focus());
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando || enviado.current) return;
    const t = texto.trim();
    const errs: string[] = [];
    if (!t) errs.push(T.errores.vacio);
    if (t.length > LIMITE_TEXTO) errs.push(T.errores.largo(LIMITE_TEXTO));
    if (fotos.length > MAX_FOTOS) errs.push(T.errores.maxFotos);
    if (errs.length) return mostrarErrores(errs);
    setEnviando(true);
    setErrores([]);
    try {
      // Cada foto se reduce en el navegador antes de subirla (el bucket acepta hasta 4 MB).
      const listas: Blob[] = [];
      for (const f of fotos) {
        const b = await prepararFoto(f.archivo);
        if (b.size > LIMITE_FOTO) {
          setEnviando(false);
          return mostrarErrores([T.errores.fotoReducida(f.archivo.name)]);
        }
        listas.push(b);
      }
      await fuente.publicar({
        texto: t,
        tipo,
        grupo: grupo || null,
        fotos: listas,
        permiteComentarios: comentarios,
        clienteId: clienteId.current,
      });
      enviado.current = true;
      const q = grupo ? `?vista=grupos&grupo=${encodeURIComponent(grupo)}` : "";
      navegar(`${R.comunidad}${q}`, { state: { aviso: T.listo } });
    } catch (err) {
      const c = err instanceof ErrorBase ? err.codigo : null;
      const F = T_COMU.formulario.errores;
      setEnviando(false);
      mostrarErrores([
        c === "demasiadas" && err instanceof ErrorBase && err.campo === "fotos"
          ? T.errores.maxFotos
          : c === "demasiadas"
            ? F.demasiadas
            : c === "no_miembro"
              ? F.grupo
              : c === "no_subio" || c === "ruta_invalida"
                ? F.foto
                : c === "largo" || (c === "invalido" && err instanceof ErrorBase && err.campo === "texto")
                  ? T.errores.largo(LIMITE_TEXTO)
                  : c === "vacio"
                    ? T.errores.vacio
                    : err instanceof ErrorBase && err.estado === 403
                      ? T.errores.cerrada
                      : F.general,
      ]);
    }
  };

  const largo = texto.length;
  const nombreDestino = grupo ? (grupos.find((g) => g.id === grupo)?.nombre ?? T_COMU.formulario.todaLaComunidad) : T_COMU.formulario.todaLaComunidad;
  const previa = (
    <VistaPrevia alias={alias} tipo={tipo} texto={texto} fotos={fotos} destino={nombreDestino} comentarios={comentarios} />
  );
  const cat = categoriaDe(tipo);

  return (
    <>
      <Encabezado
        volver={R.comunidad}
        onVolver={(e) => {
          if (sucio) {
            e.preventDefault();
            setDescartar(R.comunidad);
          }
        }}
      />
      {fuente.ejemplo && (
        <p className="co-ejemplo">
          <EtiquetaEjemplo />
          <span>{T_COMU.ejemplo}</span>
        </p>
      )}
      <div className="co-crear__grilla">
        <form className="co-tarjeta co-crear__form" onSubmit={enviar} noValidate aria-busy={enviando}>
          {errores.length > 0 && (
            <div ref={resumen} className="co-form__error co-crear__errores" role="alert" tabIndex={-1}>
              <p>{T.errores.titulo}</p>
              <ul>
                {errores.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}

          <Paso n={1} titulo={T.pasos.tipo} id={ids.p1}>
            <div className="co-cats" role="radiogroup" aria-labelledby={ids.p1}>
              {CATEGORIAS.map((c) => {
                const elegida = cat === c.clave;
                return (
                  <label key={c.clave} className="co-cat">
                    <input
                      type="radio"
                      name="categoria"
                      value={c.clave}
                      checked={elegida}
                      // Mismo nombre en escritorio y en móvil (donde se ve la forma corta).
                      aria-label={T.categorias[c.clave].titulo}
                      aria-describedby={`${ids.p1}-${c.clave}`}
                      // Una historia de logro sigue siéndolo mientras «Tu progreso» esté elegida.
                      onChange={() => setTipo(c.clave === "progreso" && tipo === "logro" ? "logro" : c.tipo)}
                    />
                    <span className="co-cat__caja">
                      {elegida && (
                        <span className="co-cat__marca" aria-hidden="true">
                          <Icono nombre="check" tamaño={12} trazo={3} />
                        </span>
                      )}
                      <Icono nombre={c.icono} tamaño={24} />
                      <span className="co-cat__titulo" aria-hidden="true">
                        {T.categorias[c.clave].titulo}
                      </span>
                      <span className="co-cat__corto" aria-hidden="true">
                        {T.categorias[c.clave].corto}
                      </span>
                      <span className="co-cat__texto" id={`${ids.p1}-${c.clave}`}>
                        {T.categorias[c.clave].texto}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </Paso>

          <Paso n={2} titulo={T.pasos.texto} id={ids.p2}>
            <div className={`co-escribir${largo > LIMITE_TEXTO ? " co-escribir--pasado" : ""}`}>
              <textarea
                ref={area}
                className="co-escribir__area"
                aria-labelledby={ids.p2}
                aria-describedby={ids.contador}
                aria-invalid={errores.includes(T.errores.vacio) && !texto.trim()}
                placeholder={T.placeholder}
                value={texto}
                rows={4}
                maxLength={LIMITE_TEXTO}
                onChange={(e) => setTexto(e.target.value)}
              />
              <div className="co-escribir__barra">
                <div className="co-escribir__emoji">
                  <button
                    type="button"
                    className="co-icono-boton"
                    aria-label={T.emoji}
                    aria-expanded={emojis}
                    aria-controls={ids.emojis}
                    onClick={() => setEmojis(!emojis)}
                  >
                    <Icono nombre="smile" tamaño={20} />
                  </button>
                  {emojis && (
                    <div
                      id={ids.emojis}
                      className="co-emojis"
                      role="group"
                      aria-label={T.emojis}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setEmojis(false);
                          area.current?.focus();
                        }
                      }}
                    >
                      {EMOJIS.map((x) => (
                        <button key={x} type="button" className="co-emojis__uno" onClick={() => ponerEmoji(x)}>
                          {x}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="co-icono-boton"
                  aria-label={T.agregarFotos}
                  disabled={fotos.length >= MAX_FOTOS}
                  onClick={() => archivo.current?.click()}
                >
                  <Icono nombre="image" tamaño={20} />
                </button>
                <span id={ids.contador} className="co-escribir__contador">
                  <span aria-hidden="true">{T.contador(largo, LIMITE_TEXTO)}</span>
                  <span className="sr-only">{T.contadorLector(largo, LIMITE_TEXTO)}</span>
                </span>
              </div>
            </div>
          </Paso>

          <Paso n={3} titulo={T.pasos.fotos} extra={T.pasos.opcional} id={ids.p3}>
            <ul className="co-fotos" aria-labelledby={ids.p3}>
              {fotos.map((f, i) => (
                <li key={f.id} className="co-fotos__una">
                  <img src={f.url} alt={T.fotoMiniatura(i + 1)} />
                  <button type="button" className="co-fotos__quitar" aria-label={T.quitarFoto(i + 1)} onClick={() => quitarFoto(f.id)}>
                    <Icono nombre="x" tamaño={16} trazo={2.5} />
                  </button>
                </li>
              ))}
              {fotos.length < MAX_FOTOS && (
                <li>
                  <button
                    type="button"
                    className={`co-fotos__agregar${arrastrando ? " co-fotos__agregar--sobre" : ""}`}
                    aria-describedby={ids.ayudaFotos}
                    onClick={() => archivo.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setArrastrando(true);
                    }}
                    onDragLeave={() => setArrastrando(false)}
                    onDrop={soltar}
                  >
                    <Icono nombre="image" tamaño={24} />
                    <span>{T.agregarFotos}</span>
                    <span className="co-fotos__arrastra">{T.arrastra}</span>
                  </button>
                </li>
              )}
            </ul>
            <input
              ref={archivo}
              type="file"
              multiple
              accept={TIPOS_FOTO.join(",")}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                agregarFotos(e.target.files);
                e.target.value = "";
              }}
            />
            <p id={ids.ayudaFotos} className="co-form__nota">
              <span className="co-solo-escritorio">{T.fotosAyuda}</span>
              <span className="co-solo-movil-inline">{T.fotosAyudaCorta}</span> {T.fotosPrivacidad}
            </p>
            {errorFotos.length > 0 && (
              <div id={ids.errFotos} className="co-form__error" role="alert">
                {errorFotos.map((x) => (
                  <p key={x}>{x}</p>
                ))}
              </div>
            )}
          </Paso>

          <Paso n={4} titulo={T.pasos.donde} id={ids.p4}>
            <div className="co-destino">
              <Icono nombre="globe" tamaño={20} className="co-destino__icono" />
              <select className="co-destino__select" aria-labelledby={ids.p4} value={grupo} onChange={(e) => setGrupo(e.target.value)}>
                <option value="">{T_COMU.formulario.todaLaComunidad}</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </select>
              <Icono nombre="chevron-down" tamaño={20} className="co-destino__flecha" />
            </div>
            <p className="co-form__nota">{grupos.length ? T.privacidadGrupo : T.sinGrupos}</p>
          </Paso>

          <Paso n={5} titulo={T.pasos.config} id={ids.p5}>
            <div className="co-config">
              <input
                id={ids.coment}
                type="checkbox"
                role="switch"
                className="interruptor__control"
                checked={comentarios}
                aria-describedby={ids.comentAyuda}
                onChange={(e) => setComentarios(e.target.checked)}
              />
              <div>
                <label htmlFor={ids.coment} className="co-config__etiqueta">
                  {T.comentarios}
                </label>
                <p id={ids.comentAyuda} className="co-form__nota">
                  {T.comentariosAyuda}
                </p>
              </div>
            </div>
          </Paso>

          <details className="co-crear__revisar co-solo-movil">
            <summary>{T.revisar}</summary>
            {previa}
          </details>

          <p className="co-form__nota co-crear__privacidad">
            <Icono nombre="shield-check" tamaño={16} />
            <span>{T.privacidad}</span>
          </p>
          <div className="co-crear__botones">
            <button type="button" className="boton boton--secundario co-crear__cancelar" onClick={() => salir(R.comunidad)}>
              {T.cancelar}
            </button>
            <button type="submit" className="boton boton--primario co-crear__publicar" disabled={enviando}>
              <Icono nombre="send" tamaño={20} />
              {enviando ? T.publicando : T.publicar}
            </button>
          </div>
        </form>

        <aside className="co-tarjeta co-crear__previa" aria-labelledby="co-previa-h">
          <h2 id="co-previa-h" className="co-crear__previa-h">
            {T.vistaPrevia}
          </h2>
          <p className="co-form__nota">{T.vistaPreviaBajada}</p>
          {previa}
        </aside>
      </div>

      <Hoja abierta={!!descartar} onCerrar={() => setDescartar(null)} titulo={T.descartar.titulo} className="co-hoja">
        <p>{T.descartar.texto}</p>
        <div className="co-form__botones co-form__botones--fin">
          <button type="button" className="boton boton--secundario" onClick={() => setDescartar(null)}>
            {T.descartar.no}
          </button>
          <button
            type="button"
            className="boton boton--primario"
            onClick={() => {
              const d = descartar;
              enviado.current = true; // ya no pregunta el navegador
              setDescartar(null);
              if (d) navegar(d);
            }}
          >
            {T.descartar.si}
          </button>
        </div>
      </Hoja>
    </>
  );
}

// La publicación tal como se verá: tu alias, «Ahora · En …», el texto, las fotos y la categoría.
// Sin números de apoyos ni comentarios: una publicación nueva no los tiene.
function VistaPrevia(p: { alias: string; tipo: TipoPublicacion; texto: string; fotos: FotoElegida[]; destino: string; comentarios: boolean }) {
  const rotulo = T_COMU.rotuloTipo[p.tipo];
  return (
    <article className="co-pub co-crear__pub" aria-label={T.vistaPrevia}>
      <header className="co-pub__cabeza">
        <Avatar alias={p.alias} />
        <div className="co-pub__quien">
          <p className="co-pub__alias">{p.alias}</p>
          <p className="co-pub__meta">
            {T.ahora} · {T.en(p.destino)}
            {rotulo && <span className={`co-pub__tipo co-pub__tipo--${p.tipo}`}>{rotulo}</span>}
          </p>
        </div>
      </header>
      <div className="co-pub__texto">
        <p className={p.texto.trim() ? undefined : "co-crear__vacio"}>{p.texto.trim() ? p.texto : T.vacioPrevia}</p>
      </div>
      {p.fotos.length > 0 && (
        <figure className={`co-pub__foto co-pub__fotos co-pub__fotos--${Math.min(p.fotos.length, 5)}`}>
          {p.fotos.map((f, i) => (
            <img key={f.id} src={f.url} alt={T.fotoMiniatura(i + 1)} />
          ))}
        </figure>
      )}
      {!p.comentarios && (
        <p className="co-crear__sin-coment">
          <Icono nombre="message-circle" tamaño={16} />
          {T.sinComentarios}
        </p>
      )}
    </article>
  );
}
