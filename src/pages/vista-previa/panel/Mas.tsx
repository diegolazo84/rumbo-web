// Vista previa · panel, Más (plataforma 5.11): contacto y derechos, postulaciones (interruptor y
// tope por día), ausencia, feriados, mantención (fotos para depurar, archivos huérfanos, último
// respaldo) y cuenta (factores MFA, salir). Todo simulado: nada se guarda.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Icono } from "../../../components/app";
import { CampoTexto } from "../../../components/form";
import { PREFERENCIAS } from "../../../data/formularios";
import { anioDe, fechaLarga, mayuscula, type Iso } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { RUTAS_PUBLICAS } from "../rutas";
import { Cabeza, CasillaAjuste, Datos, R, Seccion } from "./comun";
import { FERIADOS, mantencion, type Feriado } from "./ejemplo";
import { MAS } from "./textos";

export default function Mas(_: PropsPantalla) {
  const [recibir, setRecibir] = useState(true);
  const [tope, setTope] = useState("");
  const [hasta, setHasta] = useState<Iso | "">("");
  const [textoAusencia, setTextoAusencia] = useState<string>(MAS.ausencia.ejemplo);
  const [feriados, setFeriados] = useState<Feriado[]>(FERIADOS);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [fotos, setFotos] = useState(mantencion.fotosParaDepurar);
  const [respaldo, setRespaldo] = useState(mantencion.respaldoConfirmado);
  const anios = [...new Set(feriados.map((f) => anioDe(f.fecha)))].sort();

  return (
    <div className="pa-pantalla">
      <Cabeza ojo={MAS.ojo} titulo={MAS.titulo} />
      <Link to={R.contacto} className="tarjeta tarjeta--enlazada pa-enlace-tarjeta">
        <Icono nombre="mail" tamaño={20} />
        <span>{MAS.contacto}</span>
        <Icono nombre="arrow-right" tamaño={20} />
      </Link>

      <Seccion titulo={MAS.postulaciones.titulo} id="postulaciones" className="tarjeta pa-tarjeta">
        <form className="pa-form" noValidate onSubmit={(e) => e.preventDefault()}>
          <CasillaAjuste id={"recibir"} checked={recibir} onChange={(v) => setRecibir(v)} ayuda={MAS.postulaciones.ayuda}>
            {MAS.postulaciones.recibir}
          </CasillaAjuste>
          <CampoTexto
            id="tope"
            etiqueta={MAS.postulaciones.tope}
            opcional
            type="number"
            inputMode="numeric"
            min={1}
            value={tope}
            onChange={(e) => setTope(e.target.value.replace(/\D/g, ""))}
          />
        </form>
      </Seccion>

      <Seccion titulo={MAS.ausencia.titulo} id="ausencia" className="tarjeta pa-tarjeta">
        <form className="pa-form" noValidate onSubmit={(e) => e.preventDefault()}>
          <CampoTexto id="ausencia-hasta" etiqueta={MAS.ausencia.hasta} opcional type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          <CampoTexto id="ausencia-texto" etiqueta={MAS.ausencia.texto} ayuda={MAS.ausencia.efecto} opcional value={textoAusencia} onChange={(e) => setTextoAusencia(e.target.value)} />
          <button type="submit" className="boton boton--secundario">
            {PREFERENCIAS.nombre.boton}
          </button>
        </form>
      </Seccion>

      <Seccion titulo={MAS.feriados.titulo} id="feriados" className="tarjeta pa-tarjeta">
        {anios.map((anio) => (
          <div key={anio} className="pa-pila pa-pila--chica">
            <h3 className="pa-h3">{anio}</h3>
            <ul className="pa-lista-simple">
              {feriados
                .filter((f) => anioDe(f.fecha) === anio)
                .sort((a, b) => a.fecha.localeCompare(b.fecha))
                .map((f) => (
                  <li key={f.fecha + f.nombre}>
                    <strong>{mayuscula(fechaLarga(f.fecha))}</strong> · {f.nombre}
                  </li>
                ))}
            </ul>
          </div>
        ))}
        <p className="microcopia">{MAS.feriados.fuente}</p>
        <form
          className="pa-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!nuevaFecha || !nuevoNombre.trim()) return;
            setFeriados((l) => [...l, { fecha: nuevaFecha, nombre: nuevoNombre.trim() }]);
            setNuevaFecha("");
            setNuevoNombre("");
          }}
        >
          <div className="pa-dos">
            <CampoTexto id="feriado-fecha" etiqueta={MAS.feriados.fecha} type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} />
            <CampoTexto id="feriado-nombre" etiqueta={MAS.feriados.nombre} value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} />
          </div>
          <button type="submit" className="boton boton--secundario">
            <Icono nombre="plus" tamaño={20} />
            {MAS.feriados.agregar}
          </button>
        </form>
      </Seccion>

      <Seccion titulo={MAS.mantencion.titulo} id="mantencion" className="tarjeta pa-tarjeta">
        <div className="pa-pila pa-pila--chica">
          <h3 className="pa-h3">{MAS.mantencion.fotos}</h3>
          {fotos.length ? (
            <>
              <ul className="pa-lista-simple">
                {fotos.map((f) => (
                  <li key={f.id}>
                    {f.nombre} · {f.accion} · {fechaLarga(f.revisadaEl)}
                  </li>
                ))}
              </ul>
              <p className="microcopia">{MAS.mantencion.depurarAyuda}</p>
              <button type="button" className="boton boton--secundario" onClick={() => setFotos([])}>
                {MAS.mantencion.depurar}
              </button>
            </>
          ) : (
            <p className="microcopia">—</p>
          )}
        </div>
        <div className="pa-pila pa-pila--chica">
          <h3 className="pa-h3">{MAS.mantencion.huerfanos}</h3>
          <p className="microcopia">{MAS.mantencion.sinHuerfanos}</p>
        </div>
        <div className="pa-pila pa-pila--chica">
          <h3 className="pa-h3">{MAS.mantencion.respaldo}</h3>
          <p>{mayuscula(fechaLarga(mantencion.ultimoRespaldo))}</p>
          <CasillaAjuste id={"respaldo"} checked={respaldo} onChange={(v) => setRespaldo(v)}>
            {MAS.mantencion.confirmo}
          </CasillaAjuste>
        </div>
      </Seccion>

      <Seccion titulo={MAS.cuenta.titulo} id="cuenta" className="tarjeta pa-tarjeta">
        <Datos filas={[[MAS.cuenta.factores, `${mantencion.factores.join(" · ")}. ${MAS.cuenta.deben}`]]} />
        <Link to={RUTAS_PUBLICAS.entrar} className="boton boton--secundario pa-boton-solo">
          <Icono nombre="log-out" tamaño={20} />
          {MAS.cuenta.salir}
        </Link>
      </Seccion>
    </div>
  );
}
