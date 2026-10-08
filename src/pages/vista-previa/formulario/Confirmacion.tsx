// Confirmación de /postular/ (plataforma 3.13): modo solicitud, modo interés y «Ya enviaste esta
// solicitud.» (recarga). Postular.tsx la muestra en la misma página al enviar; las filas del
// registro de la vista previa la muestran sola con la solicitud de ejemplo. En modo real (modo.ts)
// el enlace privado lleva el token de verdad y las fechas son las que devolvió la base.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BASENAME } from "../../../base";
import { Aviso } from "../../../components/Bloques";
import { EnlaceFlecha } from "../../../components/Enlaces";
import { Icono } from "../../../components/app";
import { operacion } from "../../../data/rumbo";
import { enChile } from "../../../lib/api";
import { fechaLarga, type Iso } from "../../../lib/fechas";
import type { PropsPantalla } from "../registro";
import { rutaPrevia } from "../rutas";
import { AsideAyuda, EtiquetaEjemplo, LineaTiempo, PaginaConAside, useTituloDocumento } from "./comunes";
import { SOLICITUD, fechaHora, nombreArea, plazoDe } from "./ejemplo";
import { useModoFormulario } from "./modo";
import { CONFIRMACION } from "./textos";

export type DatosConfirmacion = {
  modo: "solicitud" | "interes";
  nombre: string;
  correo: string;
  area?: string; // modo interés: id del área («bienestar»…) o null en reapertura
  yaEnviada?: boolean;
  // Solo en modo real: lo que devolvió enviar_solicitud (6.6).
  token?: string;
  plazo?: Iso | null; // responder_antes
  creada?: string | null; // creada_en (marca de tiempo)
};

const T_ENVIADA = "Solicitud enviada · Rumbo";
const RUTA_ESTADO = (interes: boolean) => rutaPrevia(interes ? "estado/interes-recibida/" : "estado/recibida/");

// Tarjeta «Tu enlace privado»: el enlace visible y seleccionable, «Copiar enlace» con su aviso
// (role=status, 4 s, sin cambiar el tamaño del botón) y «Ver mi solicitud».
function TarjetaEnlace({ interes, token }: { interes: boolean; token?: string }) {
  const { real, rutas } = useModoFormulario();
  const destino = real ? `${rutas.estado}#${token ?? ""}` : `${RUTA_ESTADO(interes)}#${SOLICITUD.token}`;
  // El prerender no conoce el dominio: muestra la ruta y, al hidratar, el enlace completo.
  const [visible, setVisible] = useState(`${BASENAME.replace(/\/$/, "")}${destino}`);
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef<number>(undefined);
  useEffect(() => {
    setVisible(`${window.location.origin}${BASENAME.replace(/\/$/, "")}${destino}`);
    return () => window.clearTimeout(temporizador.current);
  }, [destino]);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(visible);
      setCopiado(true);
      window.clearTimeout(temporizador.current);
      temporizador.current = window.setTimeout(() => setCopiado(false), 4000);
    } catch {
      // Sin permiso para copiar: se selecciona el enlace para copiarlo a mano.
      const sel = window.getSelection();
      const nodo = document.getElementById("enlace-privado");
      if (sel && nodo) sel.selectAllChildren(nodo);
    }
  };
  const t = CONFIRMACION.enlace;
  return (
    <section className="tarjeta vf-enlace" aria-labelledby="enlace-privado-titulo">
      <div className="vf-tarjeta__cabeza">
        <h2 id="enlace-privado-titulo" className="vf-tarjeta__titulo">
          {t.titulo}
        </h2>
        {!real && <EtiquetaEjemplo />}
      </div>
      {interes ? (
        <p>{t.textoInteres}</p>
      ) : (
        <p>
          {t.texto}
          <strong>{t.guardar}</strong>
        </p>
      )}
      <p id="enlace-privado" className="vf-enlace__url">
        {visible}
      </p>
      <div className="acciones vf-enlace__acciones">
        <button type="button" className="boton boton--secundario" onClick={copiar}>
          <Icono nombre="copy" tamaño={20} />
          <span>{t.copiar}</span>
        </button>
        <Link to={destino} className="boton boton--terciario">
          {t.ver}
        </Link>
        <p role="status" className="vf-enlace__copiado">
          {copiado ? t.copiado : ""}
        </p>
      </div>
      <Aviso icono="lock" className="vf-aviso-chico">
        {t.lock}
      </Aviso>
    </section>
  );
}

export function VistaConfirmacion({ datos, onOtra }: { datos: DatosConfirmacion; onOtra?: () => void }) {
  const interes = datos.modo === "interes";
  const { real, rutas } = useModoFormulario();
  const titulo = useRef<HTMLHeadingElement>(null);
  useTituloDocumento(T_ENVIADA);
  // Tras enviar, la confirmación aparece en la misma página: foco al H1 (no al recargar).
  useEffect(() => {
    if (onOtra && !datos.yaEnviada) titulo.current?.focus();
  }, [onOtra, datos.yaEnviada]);

  // Real: la fecha que fijó la base (responder_antes) y la hora de envío en hora de Chile.
  const plazo = !operacion.plazoPrimeraRespuesta
    ? null
    : real
      ? datos.plazo
        ? fechaLarga(datos.plazo)
        : null
      : fechaLarga(plazoDe(SOLICITUD.enviada));
  const enviada = real
    ? datos.creada
      ? (({ fecha, hora }) => fechaHora(fecha, hora))(enChile(datos.creada))
      : null
    : fechaHora(SOLICITUD.enviada, SOLICITUD.hora);
  const area = datos.area ? nombreArea(datos.area) : null;
  const h1 = datos.yaEnviada
    ? CONFIRMACION.yaEnviada
    : interes
      ? CONFIRMACION.interes.titulo(datos.nombre)
      : CONFIRMACION.titulo(datos.nombre);
  const otra = onOtra ? (
    <button type="button" className="boton boton--terciario" onClick={onOtra}>
      {CONFIRMACION.otra}
    </button>
  ) : (
    <Link to={rutas.postular} className="boton boton--terciario">
      {CONFIRMACION.otra}
    </Link>
  );

  return (
    <PaginaConAside aside={<AsideAyuda sinPrograma={interes} />} className="vf-confirmacion">
      <div className="encabezado vf-encabezado">
        <p className="ojo">{interes ? CONFIRMACION.interes.ojo : CONFIRMACION.ojo}</p>
        <h1 ref={titulo} tabIndex={-1}>
          {h1}
        </h1>
        {interes ? (
          area ? (
            <p className="bajada">
              {CONFIRMACION.interes.antes}
              {area}
              {CONFIRMACION.interes.medio}
              <strong>{datos.correo}</strong>
              {CONFIRMACION.interes.despues}
            </p>
          ) : (
            <p className="bajada">
              {CONFIRMACION.reapertura.antes}
              <strong>{datos.correo}</strong>
              {CONFIRMACION.reapertura.despues}
            </p>
          )
        ) : (
          <p className="bajada">
            {CONFIRMACION.bajada.antes}
            <strong>{datos.correo}</strong>
            {plazo ? (
              <>
                {CONFIRMACION.bajada.plazo}
                <strong>{plazo}</strong>
                {CONFIRMACION.bajada.despues}
              </>
            ) : (
              "."
            )}
          </p>
        )}
      </div>

      <TarjetaEnlace interes={interes} token={datos.token} />

      {interes ? (
        <p>
          <EnlaceFlecha href={rutas.postular}>{CONFIRMACION.interes.flecha}</EnlaceFlecha>
        </p>
      ) : (
        <>
          <section aria-labelledby="que-pasa-ahora" className="vf-seccion">
            <h2 id="que-pasa-ahora" className="vf-seccion__titulo">
              {CONFIRMACION.quePasa}
            </h2>
            <LineaTiempo
              numerada
              nivelTitulo="h3"
              pasos={CONFIRMACION.pasos(enviada, plazo).map((p, i) => ({
                ...p,
                estado: i === 0 ? "completo" : "pendiente",
              }))}
            />
          </section>
          <Aviso icono="info">
            <p>
              {CONFIRMACION.info.antes}
              <Link to="/condiciones/">{CONFIRMACION.info.condiciones}</Link>
              {CONFIRMACION.info.medio}
              <Link to="/#planes">{CONFIRMACION.info.plan}</Link>
              {CONFIRMACION.info.despues}
            </p>
          </Aviso>
        </>
      )}

      <div className="acciones">
        <Link to="/" className="boton boton--secundario">
          {CONFIRMACION.volver}
        </Link>
        {otra}
      </div>
    </PaginaConAside>
  );
}

export default function Confirmacion({ estado }: PropsPantalla) {
  const interes = estado === "interes";
  return (
    <VistaConfirmacion
      datos={{
        modo: interes ? "interes" : "solicitud",
        nombre: SOLICITUD.nombre,
        correo: SOLICITUD.correo,
        area: interes ? SOLICITUD.areaInteres : SOLICITUD.area,
        yaEnviada: estado === "ya-enviada",
      }}
    />
  );
}
