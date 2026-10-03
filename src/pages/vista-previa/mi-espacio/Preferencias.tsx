// Vista previa · Preferencias y Mis datos (plataforma 4.14). Estados: preferencias y eliminar
// (página de confirmación para pedir que eliminemos los datos). «Descargar mis datos» baja un
// .json con los datos de ejemplo de esta vista previa (descargarDatos, en comun.tsx).
import { useState } from "react";
import { Link } from "react-router-dom";
import { Aviso } from "../../../components/Bloques";
import { HojaAyuda, Icono } from "../../../components/app";
import { CampoArea, CampoTexto, Casilla, Formulario, GrupoOpciones, Opcion } from "../../../components/form";
import { HOY, ciclo, participante } from "../../../data/ejemplo-app";
import { NOMBRE, PREFERENCIAS } from "../../../data/formularios";
import { fechaLarga, sumarDias } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { Cabeza, R, descargarDatos } from "./comun";
import { T_PREFERENCIAS } from "./textos";

// Fecha límite de ejemplo para los pedidos sobre datos personales. El plazo real lo fija la
// ley y lo confirma Diego (plataforma 9.3): aquí es solo un ejemplo.
const FECHA_LIMITE = fechaLarga(sumarDias(HOY, 30));

export default function Preferencias({ estado = "preferencias" }: PropsPantalla) {
  return estado === "eliminar" ? <Eliminar /> : <PantallaPreferencias />;
}

function PantallaPreferencias() {
  const [nombre, setNombre] = useState(participante.nombre);
  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [guardado, setGuardado] = useState("");
  const [mostrar, setMostrar] = useState(participante.mostrarCreditosEnHoy);
  const [otro, setOtro] = useState(false);
  const [ayuda, setAyuda] = useState(false);

  return (
    <div className="me-pantalla me-pantalla--angosta me-preferencias">
      <Cabeza titulo={T_PREFERENCIAS.titulo} />

      <section className="me-seccion" aria-labelledby="pref-nombre">
        <h2 id="pref-nombre" className="me-h2">
          {T_PREFERENCIAS.nombre.titulo}
        </h2>
        <Formulario
          className="me-fila-form"
          onSubmit={() => {
            if (nombre.trim().length < PREFERENCIAS.nombre.min) {
              setErrorNombre(NOMBRE.errores.vacio);
              setGuardado("");
              return;
            }
            setErrorNombre(null);
            setGuardado(T_PREFERENCIAS.nombre.guardado);
          }}
        >
          <CampoTexto
            id="pref-nombre-campo"
            etiqueta={PREFERENCIAS.nombre.etiqueta}
            autoComplete="nickname"
            maxLength={PREFERENCIAS.nombre.max}
            value={nombre}
            error={errorNombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setGuardado("");
              if (errorNombre && e.target.value.trim().length >= PREFERENCIAS.nombre.min) setErrorNombre(null);
            }}
          />
          <div className="me-fila-form__envio">
            <button type="submit" className="boton boton--secundario">
              {PREFERENCIAS.nombre.boton}
            </button>
            <p className="microcopia" role="status">
              {guardado}
            </p>
          </div>
        </Formulario>
      </section>

      <hr className="me-separador" />

      <section className="me-seccion" aria-labelledby="pref-cuenta">
        <h2 id="pref-cuenta" className="me-h2">
          {T_PREFERENCIAS.cuenta.titulo}
        </h2>
        <dl className="me-cuenta">
          <div>
            <dt className="sr-only">{T_PREFERENCIAS.cuenta.correo("").replace(": ", "")}</dt>
            <dd>{T_PREFERENCIAS.cuenta.correo(participante.correo)}</dd>
            <dd className="microcopia">{T_PREFERENCIAS.cuenta.cambiar}</dd>
          </div>
          <div>
            <dt className="sr-only">{T_PREFERENCIAS.cuenta.zona("").replace(": ", "")}</dt>
            <dd>{T_PREFERENCIAS.cuenta.zona(participante.zonaHoraria)}</dd>
            <dd className="microcopia">{T_PREFERENCIAS.cuenta.zonaAyuda}</dd>
          </div>
        </dl>
      </section>

      <hr className="me-separador" />

      <section className="me-seccion" aria-labelledby="pref-avance">
        <h2 id="pref-avance" className="me-h2">
          {T_PREFERENCIAS.avance.titulo}
        </h2>
        <div className="interruptor">
          <label className="interruptor__fila" htmlFor="pref-creditos">
            <span className="interruptor__texto">{PREFERENCIAS.mostrarCreditos.etiqueta}</span>
            <input
              id="pref-creditos"
              type="checkbox"
              role="switch"
              className="interruptor__control"
              checked={mostrar}
              aria-describedby="pref-creditos-ayuda"
              onChange={(e) => setMostrar(e.target.checked)}
            />
          </label>
          <p id="pref-creditos-ayuda" className="microcopia">
            {PREFERENCIAS.mostrarCreditos.ayuda}
          </p>
        </div>
      </section>

      <hr className="me-separador" />

      <section id="mis-datos" className="me-seccion" aria-labelledby="pref-datos">
        <h2 id="pref-datos" className="me-h2">
          {T_PREFERENCIAS.datos.titulo}
        </h2>
        <Aviso icono="lock">{T_PREFERENCIAS.datos.aviso}</Aviso>
        <div className="me-datos-acciones">
          <div className="me-datos-acciones__item">
            <button type="button" className="boton boton--secundario" onClick={() => descargarDatos()}>
              <Icono nombre="download" tamaño={20} />
              {T_PREFERENCIAS.datos.descargar}
            </button>
            <p className="microcopia">{T_PREFERENCIAS.datos.descargarTexto}</p>
          </div>
          <Link to={R.eliminar} className="boton boton--terciario me-boton-izq">
            <Icono nombre="trash-2" tamaño={20} />
            {T_PREFERENCIAS.datos.eliminar}
          </Link>
          <button
            type="button"
            className="boton boton--terciario me-boton-izq"
            aria-expanded={otro}
            aria-controls="pref-otro"
            onClick={() => setOtro((o) => !o)}
          >
            {T_PREFERENCIAS.datos.otro}
            <Icono nombre={otro ? "minus" : "plus"} tamaño={16} />
          </button>
          <div id="pref-otro" hidden={!otro}>
            <OtroPedido />
          </div>
        </div>
      </section>

      <hr className="me-separador" />

      <section className="me-seccion" aria-labelledby="pref-sesion">
        <h2 id="pref-sesion" className="me-h2">
          {T_PREFERENCIAS.sesion.titulo}
        </h2>
        <p>
          <Link to={R.salir} className="boton boton--secundario">
            <Icono nombre="log-out" tamaño={20} />
            {T_PREFERENCIAS.sesion.salir}
          </Link>
        </p>
      </section>

      <footer className="me-pie me-pie--enlaces">
        <Link to={R.privacidad} className="enlace-util">
          {T_PREFERENCIAS.pie.privacidad}
        </Link>
        <Link to={R.condiciones} className="enlace-util">
          {T_PREFERENCIAS.pie.condiciones}
        </Link>
        <button type="button" className="enlace-util" aria-haspopup="dialog" onClick={() => setAyuda(true)}>
          <Icono nombre="phone" tamaño={16} />
          {T_PREFERENCIAS.pie.ayuda}
        </button>
      </footer>
      <HojaAyuda abierta={ayuda} onCerrar={() => setAyuda(false)} />
    </div>
  );
}

// «Otro pedido sobre mis datos»: tipo + detalle (0 a 600) → pedir_derecho, con la misma confirmación.
function OtroPedido() {
  const [tipo, setTipo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [enviado, setEnviado] = useState(false);
  if (enviado)
    return (
      <p className="aviso me-confirmado" role="status">
        <Icono nombre="check" tamaño={20} className="aviso-icono" />
        <span>{T_PREFERENCIAS.confirmacion(FECHA_LIMITE)}</span>
      </p>
    );
  return (
    <Formulario className="me-otro" onSubmit={() => tipo && setEnviado(true)}>
      <GrupoOpciones id="pref-derecho" leyenda={T_PREFERENCIAS.datos.otro}>
        {PREFERENCIAS.derechos.map((d) => (
          <Opcion key={d.valor} name="pref-derecho" value={d.valor} titulo={d.texto} checked={tipo === d.valor} onChange={() => setTipo(d.valor)} chica />
        ))}
      </GrupoOpciones>
      <CampoArea
        id="pref-derecho-detalle"
        etiqueta={T_PREFERENCIAS.datos.otroDetalle}
        opcional
        max={PREFERENCIAS.detalleDerecho.max}
        value={detalle}
        onChange={(e) => setDetalle(e.target.value)}
      />
      <div>
        <button type="submit" className="boton boton--primario">
          {T_PREFERENCIAS.datos.enviar}
        </button>
      </div>
    </Formulario>
  );
}

// ---------------------------------------------------------------------------
// Pedir que eliminemos tus datos (confirmación explícita, WCAG 3.3.4)

function Eliminar() {
  const [entiendo, setEntiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const enCurso = ciclo.estado === "en_curso";

  return (
    <div className="me-pantalla me-pantalla--angosta me-eliminar">
      <p>
        <Link to={R.preferencias} className="enlace-util me-volver">
          <Icono nombre="chevron-left" tamaño={16} />
          {T_PREFERENCIAS.eliminar.volver}
        </Link>
      </p>
      <Cabeza titulo={T_PREFERENCIAS.eliminar.titulo} />
      <section className="me-seccion">
        <p>{T_PREFERENCIAS.eliminar.seBorra}</p>
        <ul className="me-lista-puntos">
          {T_PREFERENCIAS.eliminar.lista.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
      <section className="me-seccion">
        <p className="me-negrita">{T_PREFERENCIAS.eliminar.conservamos}</p>
        <p>{T_PREFERENCIAS.eliminar.conservamosTexto}</p>
      </section>
      {enCurso && <Aviso icono="info">{T_PREFERENCIAS.eliminar.cicloEnCurso}</Aviso>}
      <p>
        <Link to={`${R.preferencias}#mis-datos`} className="me-enlace-solo">
          {T_PREFERENCIAS.eliminar.antes}
        </Link>
      </p>
      {enviado ? (
        <p className="aviso me-confirmado" role="status">
          <Icono nombre="check" tamaño={20} className="aviso-icono" />
          <span>{T_PREFERENCIAS.confirmacion(FECHA_LIMITE)}</span>
        </p>
      ) : (
        <Formulario
          onSubmit={() => {
            if (!entiendo) {
              setError(T_PREFERENCIAS.eliminar.error);
              requestAnimationFrame(() => document.getElementById("eliminar-entiendo")?.focus());
              return;
            }
            setEnviado(true);
          }}
        >
          <Casilla
            id="eliminar-entiendo"
            checked={entiendo}
            error={error}
            onChange={(e) => {
              setEntiendo(e.target.checked);
              if (e.target.checked) setError(null);
            }}
          >
            {PREFERENCIAS.eliminar.casilla}
          </Casilla>
          <div>
            <button type="submit" className="boton boton--primario">
              {PREFERENCIAS.eliminar.boton}
            </button>
          </div>
        </Formulario>
      )}
    </div>
  );
}
