// Vista previa · panel, fotos y explicaciones por revisar (plataforma 5.8). Cola con miniatura
// (URL firmada de 120 s, nunca guardada), la acción y sus instrucciones, la fecha y la
// explicación si la hay. «Aprobar» suma el crédito; «No aprobar» exige nota (con plantillas) y
// no resta nada. Texto fijo de privacidad + «Eliminar archivo ahora». Vacío: «No hay fotos por
// revisar.» Funciona a 360 px. En la vista previa no hay fotos reales: la miniatura es un
// recuadro punteado.
import { useState } from "react";
import Etiqueta from "../../../components/Etiqueta";
import { Icono } from "../../../components/app";
import { CampoArea, GrupoOpciones, Opcion } from "../../../components/form";
import { LIMITES } from "../../../data/formularios";
import { fechaLarga, mayuscula } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { Cabeza, Variantes } from "./comun";
import { evidencias, type Evidencia } from "./ejemplo";
import { FOTOS, T_PANEL } from "./textos";

export default function Fotos(_: PropsPantalla) {
  const [variante, setVariante] = useState("cola");
  const lista = variante === "vacio" ? [] : evidencias;
  return (
    <div className="pa-pantalla">
      <Cabeza ojo={FOTOS.ojo} titulo={FOTOS.titulo} />
      <Variantes opciones={FOTOS.variantes} valor={variante} onCambio={setVariante} />
      <div className="aviso">
        <Icono nombre="lock" tamaño={20} className="aviso-icono" />
        <p>{FOTOS.fijo}</p>
      </div>
      {lista.length ? (
        <ul className="pa-filas">
          {lista.map((e) => (
            <Item key={e.id} e={e} />
          ))}
        </ul>
      ) : (
        <p className="pa-vacio">{FOTOS.vacio}</p>
      )}
    </div>
  );
}

function Item({ e }: { e: Evidencia }) {
  const [estado, setEstado] = useState<"revision" | "aprobada" | "no_aprobada">("revision");
  const [rechazo, setRechazo] = useState(false);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sinArchivo, setSinArchivo] = useState(false);
  const id = `ev-${e.id}`;
  return (
    <li className="tarjeta pa-fila pa-evidencia" aria-labelledby={`${id}-titulo`}>
      <div className="pa-evidencia__cuerpo">
        {e.foto && (
          <div className="pa-miniatura" role="img" aria-label={FOTOS.miniatura}>
            {sinArchivo ? <span className="microcopia">{FOTOS.archivoEliminado}</span> : <Icono nombre="camera" tamaño={24} />}
          </div>
        )}
        <div className="pa-evidencia__texto">
          <div className="pa-fila__cabeza">
            <h2 id={`${id}-titulo`} className="pa-h3">
              {e.accion}
            </h2>
            {estado === "aprobada" && <Etiqueta variante="activo">{FOTOS.aprobada}</Etiqueta>}
            {estado === "no_aprobada" && <Etiqueta variante="nota">{FOTOS.noAprobada}</Etiqueta>}
          </div>
          <p className="microcopia">
            {e.nombre} · {mayuscula(fechaLarga(e.fecha))}
            {!e.foto && ` · ${FOTOS.sinFoto}`}
          </p>
          <ol className="pa-instrucciones">
            {e.instrucciones.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
          {e.explicacion && (
            <blockquote className="pa-cita">
              <p className="pa-rotulo">{FOTOS.explicacion}</p>
              <p>{e.explicacion}</p>
            </blockquote>
          )}
        </div>
      </div>

      {estado === "revision" && !rechazo && (
        <div className="acciones">
          <button type="button" className="boton boton--primario" onClick={() => setEstado("aprobada")}>
            {FOTOS.aprobar}
          </button>
          <button type="button" className="boton boton--secundario" onClick={() => setRechazo(true)}>
            {FOTOS.noAprobar}
          </button>
          {e.foto && !sinArchivo && (
            <button type="button" className="boton boton--terciario" onClick={() => setSinArchivo(true)}>
              <Icono nombre="trash-2" tamaño={20} />
              {FOTOS.eliminarArchivo}
            </button>
          )}
        </div>
      )}

      {estado === "revision" && rechazo && (
        <form
          id={`${id}-rechazo`}
          className="pa-form"
          noValidate
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!nota.trim()) {
              setError(FOTOS.errorNota);
              document.getElementById(`${id}-nota`)?.focus();
              return;
            }
            setEstado("no_aprobada");
            setRechazo(false);
          }}
        >
          <GrupoOpciones id={`${id}-plantillas`} leyenda={FOTOS.plantillasLeyenda} opcional>
            {FOTOS.plantillas.map((t, i) => (
              <Opcion
                key={t}
                name={`${id}-plantilla`}
                value={String(i)}
                titulo={t}
                checked={nota === t}
                onChange={() => {
                  setNota(t);
                  setError(null);
                }}
              />
            ))}
          </GrupoOpciones>
          <CampoArea
            id={`${id}-nota`}
            etiqueta={FOTOS.nota}
            max={LIMITES.notaRechazoFoto.max}
            min={LIMITES.notaRechazoFoto.min}
            value={nota}
            error={error}
            rows={3}
            onChange={(ev) => {
              setNota(ev.target.value);
              if (ev.target.value.trim()) setError(null);
            }}
          />
          <div className="acciones">
            <button type="submit" className="boton boton--primario">
              {FOTOS.confirmarNo}
            </button>
            <button type="button" className="boton boton--terciario" onClick={() => setRechazo(false)}>
              {T_PANEL.cancelar}
            </button>
          </div>
        </form>
      )}

      {estado === "no_aprobada" && <p className="pa-respuesta">{nota}</p>}
    </li>
  );
}
