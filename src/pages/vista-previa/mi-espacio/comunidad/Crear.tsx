// Crear publicación: el bloque «¿Qué te gustaría compartir hoy?» con Foto, Progreso, Pregunta y
// Consejo, y la hoja con el formulario (tipo, texto, dónde se publica, foto opcional y privacidad).
// Validaciones antes de enviar; la base vuelve a validar todo (largo, grupo, foto, tope de 20 al día).
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Hoja, Icono, type NombreIconoApp } from "../../../../components/app";
import { ErrorBase } from "../../../../lib/supabase";
import { useComunidad, type PresetCrear } from "./contexto";
import { LIMITE_FOTO, LIMITE_TEXTO, TIPOS, TIPOS_FOTO, prepararFoto, type Grupo, type TipoPublicacion } from "./fuente";
import { Avatar } from "./Publicaciones";
import { T_COMU as T } from "./textos";

const ACCESOS: { clave: "foto" | "progreso" | "pregunta" | "consejo"; icono: NombreIconoApp }[] = [
  { clave: "foto", icono: "image" },
  { clave: "progreso", icono: "trending-up" },
  { clave: "pregunta", icono: "circle-help" },
  { clave: "consejo", icono: "lightbulb" },
];

export function Compositor({ preset }: { preset?: PresetCrear }) {
  const { alias, abrirCrear } = useComunidad();
  return (
    <section className="co-tarjeta co-compositor" aria-label={T.crear}>
      <div className="co-compositor__fila">
        <Avatar alias={alias} grande />
        <button type="button" className="co-compositor__invitacion" onClick={() => abrirCrear(preset)}>
          {T.compositor.invitacion}
        </button>
      </div>
      <ul className="co-compositor__accesos">
        {ACCESOS.map((a) => (
          <li key={a.clave}>
            <button
              type="button"
              className="co-compositor__acceso"
              onClick={() => abrirCrear(a.clave === "foto" ? { ...preset, foto: true } : { ...preset, tipo: a.clave })}
            >
              <Icono nombre={a.icono} tamaño={16} />
              {T.compositor.accesos[a.clave]}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HojaCrear({ abierta, preset, onCerrar }: { abierta: boolean; preset: PresetCrear; onCerrar: () => void }) {
  const { fuente, alias, aviso, cambio, version } = useComunidad();
  const [tipo, setTipo] = useState<TipoPublicacion>("general");
  const [texto, setTexto] = useState("");
  const [grupo, setGrupo] = useState<string>("");
  const [foto, setFoto] = useState<File | null>(null);
  const [vista, setVista] = useState<string | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const ids = { texto: useId(), donde: useId(), foto: useId(), error: useId(), ayuda: useId() };

  // Al abrir: el tipo, el grupo y el texto que trae el acceso elegido.
  useEffect(() => {
    if (!abierta) return;
    setTipo(preset.tipo ?? "general");
    setTexto(preset.texto ?? "");
    setGrupo(preset.grupo ?? "");
    setFoto(null);
    setError(null);
    void fuente
      .grupos()
      .then((g) => setGrupos(g.filter((x) => x.soyMiembro)))
      .catch(() => setGrupos([]));
    const t = setTimeout(() => (preset.foto ? archivo.current?.click() : area.current?.focus()), 60);
    return () => clearTimeout(t);
  }, [abierta, preset, fuente, version]);

  useEffect(() => {
    if (!foto) return setVista(null);
    const u = URL.createObjectURL(foto);
    setVista(u);
    return () => URL.revokeObjectURL(u);
  }, [foto]);

  const elegirFoto = (f: File | undefined) => {
    if (!f) return;
    if (!TIPOS_FOTO.includes(f.type)) return setError(T.formulario.errores.fotoTipo);
    if (f.size > LIMITE_FOTO * 3) return setError(T.formulario.errores.fotoPeso); // se reduce antes de subir
    setError(null);
    setFoto(f);
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return setError(T.formulario.errores.vacio);
    if (t.length > LIMITE_TEXTO) return setError(T.formulario.errores.largo(LIMITE_TEXTO));
    setEnviando(true);
    setError(null);
    try {
      const lista = foto ? await prepararFoto(foto) : null;
      if (lista && lista.size > LIMITE_FOTO) {
        setEnviando(false);
        return setError(T.formulario.errores.fotoPeso);
      }
      await fuente.publicar({ texto: t, tipo, grupo: grupo || null, foto: lista });
      aviso(T.formulario.listo);
      cambio();
      onCerrar();
    } catch (err) {
      const c = err instanceof ErrorBase ? err.codigo : null;
      setError(
        c === "demasiadas"
          ? T.formulario.errores.demasiadas
          : c === "no_miembro"
            ? T.formulario.errores.grupo
            : c === "no_subio" || c === "ruta_invalida"
              ? T.formulario.errores.foto
              : T.formulario.errores.general,
      );
    } finally {
      setEnviando(false);
    }
  };

  const largo = texto.trim().length;
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={T.formulario.titulo} className="co-hoja co-hoja--crear">
      <form className="co-form" onSubmit={enviar} noValidate aria-describedby={error ? ids.error : undefined}>
        <div className="co-crear__autor">
          <Avatar alias={alias} />
          <p>{T.formulario.privacidad(alias)}</p>
        </div>

        <fieldset className="co-form__grupo">
          <legend className="co-form__etiqueta">{T.formulario.tipo}</legend>
          <div className="co-chips">
            {TIPOS.map((t) => (
              <label key={t} className="co-chip">
                <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} />
                <span>{T.tipos[t]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="co-form__grupo">
          <label htmlFor={ids.texto} className="co-form__etiqueta">
            {T.formulario.texto}
          </label>
          <textarea
            id={ids.texto}
            ref={area}
            className="co-form__area co-form__area--grande"
            rows={6}
            placeholder={T.ayudaTipo[tipo]}
            value={texto}
            maxLength={LIMITE_TEXTO + 200}
            onChange={(e) => setTexto(e.target.value)}
            aria-describedby={ids.ayuda}
            aria-invalid={!!error && (largo === 0 || largo > LIMITE_TEXTO)}
          />
          <p id={ids.ayuda} className="co-form__ayuda">
            <span>{T.formulario.temas}</span>
            <span className={largo > LIMITE_TEXTO ? "co-form__contador co-form__contador--pasado" : "co-form__contador"}>
              {T.formulario.contador(largo, LIMITE_TEXTO)}
            </span>
          </p>
        </div>

        <div className="co-form__grupo">
          <label htmlFor={ids.donde} className="co-form__etiqueta">
            {T.formulario.donde}
          </label>
          <select id={ids.donde} className="co-form__select" value={grupo} onChange={(e) => setGrupo(e.target.value)}>
            <option value="">{T.formulario.todaLaComunidad}</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {T.formulario.soloGrupo(g.nombre)}
              </option>
            ))}
          </select>
          <p className="co-form__ayuda">{grupos.length ? T.formulario.privacidadGrupo : T.formulario.sinGrupos}</p>
        </div>

        <div className="co-form__grupo">
          <span className="co-form__etiqueta" id={ids.foto}>
            {T.formulario.foto}
          </span>
          {vista && (
            <figure className="co-crear__vista">
              <img src={vista} alt="" />
            </figure>
          )}
          <div className="co-form__botones">
            <button type="button" className="boton boton--secundario" aria-describedby={ids.foto} onClick={() => archivo.current?.click()}>
              <Icono nombre="camera" tamaño={16} />
              {foto ? T.formulario.cambiarFoto : T.formulario.agregarFoto}
            </button>
            {foto && (
              <button type="button" className="boton boton--terciario" onClick={() => setFoto(null)}>
                {T.formulario.quitarFoto}
              </button>
            )}
          </div>
          <input
            ref={archivo}
            type="file"
            accept={TIPOS_FOTO.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              elegirFoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <p className="co-form__ayuda">{T.formulario.fotoAyuda}</p>
        </div>

        {error && (
          <p id={ids.error} className="co-form__error" role="alert">
            {error}
          </p>
        )}
        <div className="co-form__botones co-form__botones--fin">
          <button type="button" className="boton boton--terciario" onClick={onCerrar}>
            {T.formulario.cancelar}
          </button>
          <button type="submit" className="boton boton--primario" disabled={enviando}>
            <Icono nombre="send" tamaño={16} />
            {enviando ? T.formulario.publicando : T.formulario.publicar}
          </button>
        </div>
      </form>
    </Hoja>
  );
}
