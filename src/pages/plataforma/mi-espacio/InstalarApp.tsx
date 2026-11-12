// Mi espacio instalable: sección en Preferencias y tarjeta en Mi Rumbo (solo en el teléfono,
// mientras se pueda instalar y la persona no la haya cerrado en este dispositivo).
import { useEffect, useState } from "react";
import { Icono } from "../../../components/app";
import { alCambiarInstalacion, formaInstalar, instalar, type FormaInstalar } from "../../../lib/app-instalable";
import { T_APP } from "./textos-app";

const CERRADA = "rumbo:tarjeta-app-cerrada";

function useFormaInstalar(): FormaInstalar {
  const [forma, setForma] = useState<FormaInstalar>("otro");
  useEffect(() => {
    const actualizar = () => setForma(formaInstalar());
    actualizar();
    return alCambiarInstalacion(actualizar);
  }, []);
  return forma;
}

function BotonInstalar() {
  const [abriendo, setAbriendo] = useState(false);
  return (
    <button
      type="button"
      className="boton boton--primario"
      disabled={abriendo}
      onClick={() => {
        setAbriendo(true);
        instalar().finally(() => setAbriendo(false));
      }}
    >
      <Icono nombre="smartphone" tamaño={20} />
      {abriendo ? T_APP.instalando : T_APP.instalar}
    </button>
  );
}

function PasosIos() {
  return (
    <ol className="me-app__pasos">
      {T_APP.iosPasos.map((p, i) => (
        <li key={p}>
          {i === 0 && <Icono nombre="share" tamaño={16} />}
          {p}
        </li>
      ))}
    </ol>
  );
}

export function SeccionApp() {
  const forma = useFormaInstalar();
  return (
    <section id="app" className="me-seccion me-app" aria-labelledby="pref-app">
      <h2 id="pref-app" className="me-h2">
        {T_APP.titulo}
      </h2>
      {forma === "instalada" && <p>{T_APP.instalada}</p>}
      {forma === "boton" && (
        <>
          <p>{T_APP.boton}</p>
          <BotonInstalar />
        </>
      )}
      {forma === "ios" && (
        <>
          <p>{T_APP.ios}</p>
          <PasosIos />
        </>
      )}
      {forma === "otro" && <p>{T_APP.otro}</p>}
      <p className="microcopia">{T_APP.conexion}</p>
    </section>
  );
}

const leerCerrada = () => {
  try {
    return localStorage.getItem(CERRADA) === "1";
  } catch {
    return false;
  }
};

export function TarjetaApp() {
  const forma = useFormaInstalar();
  const [cerrada, setCerrada] = useState(true);
  const [telefono, setTelefono] = useState(false);
  useEffect(() => {
    setCerrada(leerCerrada());
    setTelefono(window.matchMedia?.("(max-width: 47.99rem)").matches ?? false);
  }, []);
  if (cerrada || !telefono || (forma !== "boton" && forma !== "ios")) return null;
  const cerrar = () => {
    setCerrada(true);
    try {
      localStorage.setItem(CERRADA, "1");
    } catch {
      /* sin almacenamiento: vuelve a aparecer en la próxima visita */
    }
  };
  return (
    <div className="me-pantalla me-app__inicio">
      <section className="tarjeta me-app__tarjeta" aria-labelledby="tarjeta-app">
        <h2 id="tarjeta-app" className="me-h2">
          {T_APP.tarjetaTitulo}
        </h2>
        <p>{forma === "boton" ? T_APP.boton : T_APP.ios}</p>
        {forma === "ios" && <PasosIos />}
        <div className="me-app__acciones">
          {forma === "boton" && <BotonInstalar />}
          <button type="button" className="boton boton--terciario" onClick={cerrar}>
            {T_APP.ahoraNo}
          </button>
        </div>
      </section>
    </div>
  );
}
