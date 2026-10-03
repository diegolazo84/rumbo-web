// Vista previa · panel, revisión semanal (plataforma 5.7). Al abrirla se fija iniciada_en y el
// registro de la persona queda cerrado (ella lo ve «En revisión»).
// - Izquierda: la semana de la persona (programadas y hechas por meta, días completos, dejadas
//   pasar), su registro (si escribió), solicitudes de ajuste y fotos de la semana.
// - Derecha: «Qué funcionó» (obligatorio), «Qué ajustamos» (opcional) + «Abrir el constructor» y
//   «Tu foco de la semana» (obligatorio). Sin registro: «Revisión a partir de lo que marcó en el
//   calendario». En Acompañamiento cercano el título es «Resumen de la videollamada».
// Funciona a 360 px (columnas apiladas). Estados (registro.ts): cercano (Martín, con registro)
// y sin-registro (Camila, Con acompañamiento, sin registro de la semana 2).
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import Etiqueta from "../../../components/Etiqueta";
import { Icono } from "../../../components/app";
import { CampoArea, ResumenErrores, type ErrorResumen } from "../../../components/form";
import { LIMITES } from "../../../data/formularios";
import { resumenSemana } from "../../../data/ejemplo-app";
import type { PropsPantalla } from "../registro";
import { Cabeza, R, Seccion } from "./comun";
import { ajustes, evidencias, participantes, semanaMartin } from "./ejemplo";
import { RegistroLectura, ResumenPorMeta } from "./FichaParticipante";
import { AJUSTES, FOTOS, REVISION, T_PANEL } from "./textos";

export default function Revision({ estado = "cercano" }: PropsPantalla) {
  const cercano = estado !== "sin-registro";
  const p = participantes.find((x) => x.id === (cercano ? "p-2" : "p-1"))!;
  const semana = p.semana ?? 1;
  const camila = resumenSemana(semana);
  const porMeta = cercano
    ? semanaMartin.porMeta
    : camila.porMeta.filter((m) => m.programadas).map((m) => ({ titulo: m.meta.titulo, categoria: m.meta.categoria, programadas: m.programadas, hechas: m.hechas }));
  const diasCompletos = cercano ? semanaMartin.diasCompletos : camila.diasCompletos;
  const dejadas = cercano ? semanaMartin.dejadas : 0;
  const registro = cercano ? { ...semanaMartin.registro, carga: "pesada" } : null;
  const ajustesSemana = ajustes.filter((a) => a.participanteId === p.id);
  const fotos = cercano ? evidencias : [];

  const [funciono, setFunciono] = useState("");
  const [ajustamos, setAjustamos] = useState("");
  const [foco, setFoco] = useState("");
  const [errores, setErrores] = useState<ErrorResumen[]>([]);
  const [publicada, setPublicada] = useState(false);
  const resumen = useRef<HTMLDivElement>(null);
  const errorDe = (id: string) => errores.find((e) => e.id === id)?.texto;

  const validar = (f = funciono, o = foco) => {
    const e: ErrorResumen[] = [];
    if (!f.trim()) e.push({ id: "rev-funciono", texto: REVISION.errores.funciono });
    if (!o.trim()) e.push({ id: "rev-foco", texto: REVISION.errores.foco });
    return e;
  };

  return (
    <div className="pa-pantalla">
      <Cabeza
        ojo={REVISION.ojo}
        titulo={cercano ? `${REVISION.tituloCercano}.` : REVISION.titulo(p.nombre, semana)}
        antes={<p className="pa-cabeza__linea">{`${p.nombre} · ${T_PANEL.semanaDe(semana, p.semanas)}`}</p>}
      />

      <div className="pa-revision">
        <div className="pa-revision__izquierda">
          <Seccion titulo={REVISION.izquierda.semana}>
            <ResumenPorMeta filas={porMeta} />
            <p className="microcopia">
              {REVISION.izquierda.diasCompletos(diasCompletos)} · {REVISION.izquierda.dejadas(dejadas)}
            </p>
          </Seccion>
          {registro && (
            <Seccion titulo={REVISION.izquierda.registro}>
              <RegistroLectura {...registro} />
            </Seccion>
          )}
          <Seccion titulo={REVISION.izquierda.ajustes}>
            {ajustesSemana.length ? (
              <ul className="pa-lista-simple">
                {ajustesSemana.map((a) => (
                  <li key={a.id}>
                    <Etiqueta variante={AJUSTES.estados[a.estado].variante}>{AJUSTES.estados[a.estado].texto}</Etiqueta> {a.detalle}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="microcopia">{REVISION.izquierda.sinAjustes}</p>
            )}
          </Seccion>
          <Seccion titulo={REVISION.izquierda.fotos}>
            {fotos.length ? (
              <ul className="pa-lista-simple">
                {fotos.map((f) => (
                  <li key={f.id}>
                    <Etiqueta variante="nota">{AJUSTES.estados.en_revision.texto}</Etiqueta> {f.foto ? f.accion : `${f.accion} · ${FOTOS.sinFoto}`}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="microcopia">{REVISION.izquierda.sinFotos}</p>
            )}
          </Seccion>
        </div>

        <section className="tarjeta pa-tarjeta pa-revision__derecha" aria-labelledby="rev-form">
          <h2 id="rev-form" className="pa-h2">
            {cercano ? REVISION.tituloCercano : REVISION.ojo}
          </h2>
          {!registro && (
            <div className="aviso">
              <Icono nombre="info" tamaño={20} className="aviso-icono" />
              <p>{REVISION.sinRegistro}</p>
            </div>
          )}
          <form
            className="pa-form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              const err = validar();
              setErrores(err);
              if (err.length) {
                window.requestAnimationFrame(() => resumen.current?.focus());
                return;
              }
              setPublicada(true);
            }}
          >
            <ResumenErrores errores={errores} ref={resumen} />
            <CampoArea
              id="rev-funciono"
              etiqueta={REVISION.funciono.etiqueta}
              max={LIMITES.revisionFunciono.max}
              value={funciono}
              error={errorDe("rev-funciono")}
              onChange={(e) => {
                setFunciono(e.target.value);
                if (errores.length) setErrores(validar(e.target.value, foco));
              }}
            />
            <div className="pa-pila pa-pila--chica">
              <CampoArea
                id="rev-ajustamos"
                etiqueta={REVISION.ajustamos.etiqueta}
                opcional
                max={LIMITES.revisionAjustamos.max}
                value={ajustamos}
                onChange={(e) => setAjustamos(e.target.value)}
              />
              <Link to={R.constructor} className="enlace-flecha">
                {REVISION.ajustamos.constructor}
                <Icono nombre="arrow-right" tamaño={16} />
              </Link>
            </div>
            <CampoArea
              id="rev-foco"
              etiqueta={REVISION.foco.etiqueta}
              max={LIMITES.revisionFoco.max}
              value={foco}
              error={errorDe("rev-foco")}
              rows={3}
              onChange={(e) => {
                setFoco(e.target.value);
                if (errores.length) setErrores(validar(funciono, e.target.value));
              }}
            />
            <button type="submit" className="boton boton--primario">
              {REVISION.publicar}
            </button>
            <p role="status" className="microcopia">
              {publicada ? REVISION.publicada : ""}
            </p>
          </form>
          <p className="pa-tenue">{REVISION.recordatorio}</p>
        </section>
      </div>
    </div>
  );
}
