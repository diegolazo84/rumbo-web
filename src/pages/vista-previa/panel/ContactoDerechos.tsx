// Vista previa · panel, contacto y derechos (plataforma 5.10).
// - Mensajes: nuevo / respondido / archivado; «Copiar respuesta» y «Abrir en el correo».
// - Peticiones sobre datos: tipo (Diego lo clasifica si vino por contacto), recibida, fecha
//   límite (sin plazo legal verificado, la fija Diego), estado; «Exportar sus datos (JSON)»,
//   «Eliminar participante» (6.11) y «Marcar como resuelta» con respuesta.
// Funciona a 360 px. Todo simulado.
import { useState } from "react";
import Etiqueta from "../../../components/Etiqueta";
import { Icono } from "../../../components/app";
import { CampoArea, CampoSelect, CampoTexto } from "../../../components/form";
import { CONTACTO, LIMITES } from "../../../data/formularios";
import { diaCorto, fechaLarga, mayuscula } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { BotonCopiar, Cabeza, Datos, Seccion, descargarJson, venceTexto } from "./comun";
import { HOY, TIPOS_PETICION, mensajes, peticiones, type Mensaje, type Peticion } from "./ejemplo";
import { CONTACTO_PANEL as C, T_PANEL } from "./textos";

const MOTIVO: Record<string, string> = Object.fromEntries(CONTACTO.motivo.opciones.map((o) => [o.valor, o.texto]));

export default function ContactoDerechos(_: PropsPantalla) {
  return (
    <div className="pa-pantalla">
      <Cabeza ojo={C.ojo} titulo={C.titulo} />
      <Seccion titulo={C.peticiones.titulo} id="peticiones">
        <ul className="pa-filas">
          {peticiones.map((d) => (
            <ItemPeticion key={d.id} d={d} />
          ))}
        </ul>
      </Seccion>
      <Seccion titulo={C.mensajes.titulo} id="mensajes">
        <ul className="pa-filas">
          {mensajes.map((m) => (
            <ItemMensaje key={m.id} m={m} />
          ))}
        </ul>
      </Seccion>
    </div>
  );
}

function ItemMensaje({ m }: { m: Mensaje }) {
  const [estado, setEstado] = useState(m.estado);
  const [respuesta, setRespuesta] = useState("");
  const id = `msj-${m.id}`;
  const mailto = `mailto:${m.correo}${respuesta ? `?body=${encodeURIComponent(respuesta)}` : ""}`;
  return (
    <li className="tarjeta pa-fila" aria-labelledby={`${id}-titulo`}>
      <div className="pa-fila__cabeza">
        <h3 id={`${id}-titulo`} className="pa-h3">
          {m.nombre ?? <span className="pa-largo">{m.correo}</span>}
        </h3>
        <Etiqueta variante={estado === "nuevo" ? "activo" : "nota"}>{C.mensajes.estados[estado]}</Etiqueta>
      </div>
      <Datos
        className="pa-datos--apilada"
        filas={[
          [C.mensajes.motivo, MOTIVO[m.motivo]],
          [C.mensajes.recibido, mayuscula(diaCorto(m.recibido))],
          m.nombre && [C.correo, <span className="pa-largo">{m.correo}</span>],
        ]}
      />
      <blockquote className="pa-cita">
        <p>{m.texto}</p>
      </blockquote>
      {estado === "nuevo" && (
        <form className="pa-form" noValidate onSubmit={(e) => e.preventDefault()}>
          <CampoArea id={`${id}-respuesta`} etiqueta={C.mensajes.respuesta} opcional max={LIMITES.mensajeContacto.max} value={respuesta} rows={3} onChange={(e) => setRespuesta(e.target.value)} />
          <div className="acciones">
            <BotonCopiar texto={respuesta} />
            <a href={mailto} className="boton boton--secundario">
              <Icono nombre="mail" tamaño={20} />
              {T_PANEL.abrirCorreo}
            </a>
          </div>
          <div className="acciones">
            <button type="button" className="boton boton--primario" onClick={() => setEstado("respondido")}>
              {C.mensajes.respondido}
            </button>
            <button type="button" className="boton boton--terciario" onClick={() => setEstado("archivado")}>
              {C.mensajes.archivar}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

function ItemPeticion({ d }: { d: Peticion }) {
  const [tipo, setTipo] = useState(d.tipo ?? "");
  const [limite, setLimite] = useState(d.fechaLimite ?? "");
  const [respuesta, setRespuesta] = useState("");
  const [estado, setEstado] = useState(d.estado);
  const id = `pet-${d.id}`;
  return (
    <li className="tarjeta pa-fila" aria-labelledby={`${id}-titulo`}>
      <div className="pa-fila__cabeza">
        <h3 id={`${id}-titulo`} className="pa-h3">
          {d.nombre}
        </h3>
        <Etiqueta variante={estado === "resuelta" ? "activo" : "nota"}>{estado === "resuelta" ? C.peticiones.resueltaEtiqueta : C.peticiones.abierta}</Etiqueta>
      </div>
      <Datos
        className="pa-datos--apilada"
        filas={[
          [C.peticiones.recibida, mayuscula(fechaLarga(d.recibida))],
          [C.peticiones.fechaLimite, limite ? `${mayuscula(fechaLarga(limite))} · ${venceTexto(limite, HOY)}` : C.peticiones.fijaFecha],
          [C.correo, <span className="pa-largo">{d.correo}</span>],
        ]}
      />
      <blockquote className="pa-cita">
        <p>{d.detalle}</p>
      </blockquote>
      {estado === "abierta" && (
        <form className="pa-form" noValidate onSubmit={(e) => e.preventDefault()}>
          <div className="pa-dos">
            <CampoSelect id={`${id}-tipo`} etiqueta={C.peticiones.tipo} ayuda={d.tipo ? undefined : C.peticiones.tipoAyuda} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">—</option>
              {TIPOS_PETICION.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.texto}
                </option>
              ))}
            </CampoSelect>
            <CampoTexto id={`${id}-limite`} etiqueta={C.peticiones.fechaLimite} type="date" min={HOY} value={limite} onChange={(e) => setLimite(e.target.value)} />
          </div>
          <CampoArea id={`${id}-respuesta`} etiqueta={C.peticiones.respuesta} opcional max={LIMITES.detalleDerecho.max} value={respuesta} rows={3} onChange={(e) => setRespuesta(e.target.value)} />
          <div className="acciones">
            <button
              type="button"
              className="boton boton--secundario"
              onClick={() => descargarJson(`rumbo-ejemplo-${d.nombre.toLowerCase()}.json`, { solicitud: { nombre: d.nombre, correo: d.correo, recibida: d.recibida } })}
            >
              <Icono nombre="download" tamaño={20} />
              {C.peticiones.exportar}
            </button>
            <button type="button" className="boton boton--terciario" aria-disabled="true" aria-describedby={`${id}-eliminar`}>
              <Icono nombre="trash-2" tamaño={20} />
              {C.peticiones.eliminar}
            </button>
          </div>
          <p id={`${id}-eliminar`} className="microcopia">
            {C.peticiones.soloParticipantes}
          </p>
          <button type="button" className="boton boton--primario" onClick={() => setEstado("resuelta")}>
            {C.peticiones.resuelta}
          </button>
        </form>
      )}
    </li>
  );
}
