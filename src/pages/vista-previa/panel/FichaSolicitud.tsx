// Vista previa · panel, ficha de una solicitud (plataforma 5.4). Datos de la solicitud y las
// acciones de Diego: copiar respuesta (plantillas 3.16) y abrirla en el correo, marcar como
// respondida, registrar acuerdo (con la vista previa punteada de /estado/), crear su espacio
// (solo con el acuerdo aceptado), cerrar con motivo (con su vista previa), nuevo enlace privado,
// borrar ahora y notas internas. Todo simulado: no se guarda ni se envía nada.
// La solicitud sale de ?id= (se lee tras hidratar); sin id, la de Valentina.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Etiqueta from "../../../components/Etiqueta";
import { AvisoAyuda, Hoja, Icono, Segmentado } from "../../../components/app";
import { CampoArea, CampoSelect, CampoTexto, GrupoOpciones, Opcion } from "../../../components/form";
import { LIMITES } from "../../../data/formularios";
import { notaPrecio, operacion, planes } from "../../../data/rumbo";
import { VERSION_PUBLICADA } from "../../../data/paginas";
import { BASENAME } from "../../../base";
import { DIAS, diaMes, fechaLarga, miles, mayuscula, type Iso } from "../../../lib/fechas";
import { BotonCopiar, Cabeza, Datos, Desplegable, EtiquetaArea, R, Seccion, conId, nombreArea, useParametro, venceTexto } from "./comun";
import { HOY, sinPrimeraRespuesta, solicitudPorId, type Solicitud } from "./ejemplo";
import { CAMPO_POR_COMPLETAR, PLANTILLAS, plantillaPorId } from "../../../data/plantillas";
import { textoApoyo } from "./Solicitudes";
import { ESTADO_PERSONA, ESTADO_SOLICITUD, FICHA_SOLICITUD as F, SOLICITUDES, T_PANEL, nombreCoach } from "./textos";

const POR_DEFECTO = "s-100";

// Origen absoluto para los enlaces de las plantillas: solo en el navegador (el prerender usa la ruta).
function useOrigen() {
  const [origen, setOrigen] = useState("");
  useEffect(() => setOrigen(window.location.origin), []);
  return origen;
}

const fechaHora = (s: Solicitud) => `${fechaLarga(s.recibida)}, ${s.hora}`;

export default function FichaSolicitud() {
  const id = useParametro("id");
  const s = solicitudPorId(id) ?? solicitudPorId(POR_DEFECTO)!;
  return <Contenido key={s.id} s={s} />;
}

function Contenido({ s }: { s: Solicitud }) {
  const navigate = useNavigate();
  const origen = useOrigen();
  const anterior = s.anterior ? solicitudPorId(s.anterior) : undefined;
  // Abrir la ficha pasa una solicitud «recibida» a «en revisión» (5.4).
  const [estado, setEstado] = useState(s.tipo === "solicitud" && s.estado === "recibida" ? "en_revision" : s.estado);
  const [plantilla, setPlantilla] = useState(anterior ? "repetida" : s.estado === "cerrada" ? s.motivoCierre ?? "capacidad" : "primer-contacto");
  const [notas, setNotas] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [borrar, setBorrar] = useState(false);
  const pendiente = sinPrimeraRespuesta({ ...s, estado: estado as Solicitud["estado"] });
  const vistaPersona = s.tipo === "interes" ? ESTADO_SOLICITUD.interes : ESTADO_SOLICITUD[estado];

  const enlace = (ruta: string) => `${origen}${BASENAME}${ruta}`;
  const cuerpo = plantillaPorId(plantilla).cuerpo({
    nombre: s.nombre,
    fecha: anterior ? fechaLarga(anterior.recibida) : undefined,
    enlaceCondiciones: enlace("condiciones/"),
    enlaceAyuda: enlace("ayuda/"),
    enlaceEntrar: enlace("mi-espacio/entrar/"),
    quienAcompana: operacion.acompanante?.nombre.split(" ")[0] ?? "[tu nombre]",
    conAviso: s.avisos,
  });
  const mailto = `mailto:${s.correo}?body=${encodeURIComponent(cuerpo)}`;

  return (
    <div className="pa-pantalla">
      <Cabeza
        ojo={F.ojo}
        titulo={s.nombre}
        antes={
          <div className="pa-etiquetas">
            <EtiquetaArea area={s.area} />
            {s.marcas.map((m) => (
              <Etiqueta key={m} variante="nota">
                {SOLICITUDES.marcas[m]}
              </Etiqueta>
            ))}
          </div>
        }
      >
        <p className="pa-cabeza__estado">
          <span>{F.laPersonaVe}:</span> <Etiqueta variante={vistaPersona.variante}>{vistaPersona.texto}</Etiqueta>
        </p>
      </Cabeza>

      <div className="pa-ficha">
        <div className="pa-ficha__principal">
          <section className="tarjeta pa-tarjeta" aria-labelledby="datos-titulo">
            <h2 id="datos-titulo" className="pa-h2">
              {F.datos.titulo}
            </h2>
            <Datos
              filas={[
                [F.datos.nombre, s.nombre],
                [F.datos.correo, <span className="pa-largo">{s.correo}</span>],
                [F.datos.area, nombreArea(s.area)],
                s.tipo === "solicitud" && [F.datos.apoyo, textoApoyo(s.apoyo)],
                s.tipo === "solicitud" && [F.datos.horarios, s.dias.length ? `${s.dias.join(", ")} · ${s.franjas.join(", ")}` : "—"],
                [F.datos.zona, s.zona],
                [F.datos.recibida, `${fechaHora(s)} (hora de Chile)`],
                pendiente && s.responderAntes && [F.datos.vence, `${mayuscula(venceTexto(s.responderAntes))} · ${fechaLarga(s.responderAntes)}`],
                [F.datos.origen, s.origen ?? "—"],
                [F.datos.marcas, s.marcas.length ? s.marcas.map((m) => SOLICITUDES.marcas[m]).join(", ") : F.datos.sinMarcas],
                anterior && [F.datos.duplicada, <Link to={conId(R.solicitud, anterior.id)}>{`${anterior.nombre} · ${fechaLarga(anterior.recibida)}`}</Link>],
              ]}
            />
            {s.meta && (
              <div className="pa-meta">
                <h3 className="pa-h3">{F.datos.meta}</h3>
                <blockquote className="pa-cita">
                  <p>{s.meta}</p>
                </blockquote>
              </div>
            )}
          </section>

        </div>

        <div className="pa-ficha__lado">
          <Seccion titulo={F.responder.titulo} id="responder">
            <CampoSelect id="plantilla" etiqueta={F.responder.plantilla} value={plantilla} onChange={(e) => setPlantilla(e.target.value)}>
              {PLANTILLAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </CampoSelect>
            <div className="pa-plantilla" aria-label={plantillaPorId(plantilla).nombre} role="group">
              {cuerpo.split("\n\n").map((p, i) => (
                <p key={i}>
                  {p.split(CAMPO_POR_COMPLETAR).map((parte, j) =>
                    j % 2 ? (
                      <mark key={j} className="pa-por-completar">
                        {parte}
                      </mark>
                    ) : (
                      parte
                    ),
                  )}
                </p>
              ))}
            </div>
            {CAMPO_POR_COMPLETAR.test(cuerpo) && <p className="microcopia">{F.responder.porCompletar}</p>}
            <div className="acciones">
              <BotonCopiar texto={cuerpo} etiqueta={F.responder.copiar} />
              <a href={mailto} className="boton boton--secundario">
                <Icono nombre="mail" tamaño={20} />
                {F.responder.abrir}
              </a>
            </div>
            {pendiente && (
              <button type="button" className="boton boton--primario" onClick={() => setEstado("respondida")}>
                {F.responder.respondida}
              </button>
            )}
          </Seccion>

          {s.tipo === "solicitud" && estado !== "cerrada" && (
            <>
              <Acuerdo s={s} onRegistrar={() => setEstado("acordada")} />
              <div className="pa-desplegable">
                <button type="button" className="boton boton--secundario" aria-disabled="true" aria-describedby="crear-nota">
                  {F.crearEspacio.boton}
                </button>
                <p id="crear-nota" className="microcopia">
                  {F.crearEspacio.nota}
                </p>
              </div>
              <Cerrar s={s} onCerrar={() => setEstado("cerrada")} />
            </>
          )}

          <div className="pa-desplegable">
            <button
              type="button"
              className="boton boton--secundario"
              aria-describedby="enlace-ayuda"
              onClick={() => {
                const b = new Uint8Array(16);
                crypto.getRandomValues(b);
                setToken(Array.from(b, (x) => x.toString(16).padStart(2, "0")).join(""));
              }}
            >
              {F.enlace.boton}
            </button>
            <p id="enlace-ayuda" className="microcopia">
              {F.enlace.ayuda}
            </p>
            {token && (
              <div className="pa-enlace-nuevo">
                <p className="pa-largo">{`${origen}${BASENAME}estado/#${token}`}</p>
                <BotonCopiar texto={`${origen}${BASENAME}estado/#${token}`} etiqueta={T_PANEL.copiarEnlace} anuncio={T_PANEL.enlaceCopiado} />
              </div>
            )}
          </div>

          <div className="pa-desplegable">
            <button type="button" className="boton boton--terciario pa-boton-izq" aria-haspopup="dialog" onClick={() => setBorrar(true)}>
              <Icono nombre="trash-2" tamaño={20} />
              {F.borrar.boton}
            </button>
          </div>
        </div>

        <section className="pa-notas" aria-labelledby="notas-titulo">
          <h2 id="notas-titulo" className="sr-only">
            {F.notas.etiqueta}
          </h2>
          <CampoArea
            id="notas-internas"
            etiqueta={F.notas.etiqueta}
            ayuda={F.notas.ayuda}
            opcional
            max={LIMITES.notasInternas.max}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </section>
      </div>

      <Hoja abierta={borrar} onCerrar={() => setBorrar(false)} titulo={F.borrar.titulo}>
        <p>{F.borrar.texto}</p>
        <div className="acciones">
          <button type="button" className="boton boton--secundario" onClick={() => setBorrar(false)}>
            {F.borrar.cancelar}
          </button>
          <button type="button" className="boton boton--primario" onClick={() => navigate(R.solicitudes)}>
            {F.borrar.confirmar}
          </button>
        </div>
      </Hoja>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registrar acuerdo (plan, precio en CLP, lunes de inicio, 4/8/12 semanas, día de revisión,
// hora de videollamada si es cercano) con la vista previa punteada de /estado/.

const SEMANAS = [
  { valor: "4", texto: "4" },
  { valor: "8", texto: "8" },
  { valor: "12", texto: "12" },
];
const DIAS_REVISION = DIAS.slice(0, 5);
const plural = (dia: string) => (dia.endsWith("s") ? dia : `${dia}s`);
const precioDe = (param: string) => planes.find((p) => p.param === param)!.precio.replace(/\D/g, "");

function Acuerdo({ s, onRegistrar }: { s: Solicitud; onRegistrar: () => void }) {
  const [plan, setPlan] = useState<"coach" | "cercano">(s.apoyo === "cercano" ? "cercano" : "coach");
  const [precio, setPrecio] = useState(precioDe(plan));
  const [inicio, setInicio] = useState<Iso>("2026-10-19");
  const [semanas, setSemanas] = useState("4");
  const [dia, setDia] = useState(3); // jueves
  const [hora, setHora] = useState("19:00");
  const p = planes.find((x) => x.param === plan)!;
  const nombreDia = DIAS_REVISION[dia];
  const conDetalles = !!operacion.formaDePago && !!operacion.politicaTermino;
  const numero = Number(precio);

  return (
    <Desplegable boton={F.acuerdo.boton}>
      <form
        className="pa-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onRegistrar();
        }}
      >
        <Segmentado
          leyenda={F.acuerdo.plan}
          opciones={planes.map((x) => ({ valor: x.param, texto: x.nombre }))}
          valor={plan}
          onCambio={(v) => {
            setPlan(v as "coach" | "cercano");
            setPrecio(precioDe(v));
          }}
        />
        <CampoTexto id="acuerdo-precio" etiqueta={F.acuerdo.precio} inputMode="numeric" value={precio} onChange={(e) => setPrecio(e.target.value.replace(/\D/g, ""))} />
        <CampoTexto id="acuerdo-inicio" etiqueta={F.acuerdo.inicio} type="date" value={inicio} min={HOY} step={7} onChange={(e) => setInicio(e.target.value)} />
        <Segmentado leyenda={F.acuerdo.semanas} opciones={SEMANAS} valor={semanas} onCambio={setSemanas} />
        <CampoSelect id="acuerdo-dia" etiqueta={F.acuerdo.diaRevision} value={dia} onChange={(e) => setDia(Number(e.target.value))}>
          {DIAS_REVISION.map((d, i) => (
            <option key={d} value={i}>
              {mayuscula(d)}
            </option>
          ))}
        </CampoSelect>
        {plan === "cercano" && (
          <CampoTexto id="acuerdo-hora" etiqueta={F.acuerdo.hora} type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        )}

        <div className="pa-punteada">
          <div className="pa-punteada__cabeza">
            <p className="pa-rotulo">{F.acuerdo.vistaPrevia}</p>
            <Etiqueta variante="ejemplo">{T_PANEL.vistaPrevia}</Etiqueta>
          </div>
          <Etiqueta variante="activo">{ESTADO_SOLICITUD.acordada.texto}</Etiqueta>
          <h3 className="pa-h3">{ESTADO_PERSONA.acordadaTitulo}</h3>
          {!conDetalles && <p>{ESTADO_PERSONA.acuerdo.sinDetalles}</p>}
          <div className="tarjeta tarjeta--producto pa-acuerdo">
            <p className="pa-acuerdo__titulo">{ESTADO_PERSONA.acuerdo.titulo}</p>
            <p>
              <strong>{p.nombre}</strong> · <Etiqueta variante="nota">{p.rotulo}</Etiqueta>
            </p>
            <p className="pa-acuerdo__precio">
              ${numero ? miles(numero) : "—"} <span className="microcopia">CLP</span>
            </p>
            <p className="microcopia">{notaPrecio()}</p>
            <p>{ESTADO_PERSONA.acuerdo.ciclo(Number(semanas), diaMes(inicio))}</p>
            <p>
              {plan === "cercano"
                ? ESTADO_PERSONA.acuerdo.videollamada(`${plural(nombreDia)}, ${hora}`)
                : ESTADO_PERSONA.acuerdo.revision(plural(nombreDia))}
            </p>
            {operacion.formaDePago && <p>{operacion.formaDePago}</p>}
            <p className="enlace-util">{ESTADO_PERSONA.acuerdo.condiciones(VERSION_PUBLICADA.texto)}</p>
          </div>
        </div>
        <button type="submit" className="boton boton--primario">
          {F.acuerdo.guardar}
        </button>
      </form>
    </Desplegable>
  );
}

// ---------------------------------------------------------------------------
// Cerrar con motivo y nota opcional (máx. 600), con la vista previa del texto fijo de /estado/.

function Cerrar({ s, onCerrar }: { s: Solicitud; onCerrar: () => void }) {
  const [motivo, setMotivo] = useState<string>(s.motivoCierre ?? "capacidad");
  const [nota, setNota] = useState("");
  const texto = ESTADO_PERSONA.cerrada[motivo];
  return (
    <Desplegable boton={F.cerrar.boton}>
      <form
        className="pa-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onCerrar();
        }}
      >
        <GrupoOpciones id="cerrar-motivo" leyenda={F.cerrar.motivo}>
          {F.cerrar.motivos.map((m) => (
            <Opcion key={m.valor} name="cerrar-motivo" value={m.valor} titulo={m.texto} chica checked={motivo === m.valor} onChange={() => setMotivo(m.valor)} />
          ))}
        </GrupoOpciones>
        <CampoArea id="cerrar-nota" etiqueta={F.cerrar.nota} opcional max={LIMITES.notaCierre.max} value={nota} onChange={(e) => setNota(e.target.value)} />
        <div className="pa-punteada">
          <div className="pa-punteada__cabeza">
            <p className="pa-rotulo">{F.cerrar.vistaPrevia}</p>
            <Etiqueta variante="ejemplo">{T_PANEL.vistaPrevia}</Etiqueta>
          </div>
          <Etiqueta variante="nota">{ESTADO_SOLICITUD.cerrada.texto}</Etiqueta>
          <h3 className="pa-h3">{texto.titulo}</h3>
          <p>{texto.texto(s.avisos)}</p>
          {motivo === "alcance" && <AvisoAyuda />}
          {nota.trim() && (
            <div className="pa-nota-cierre">
              <p className="nota-coach-rotulo">{ESTADO_PERSONA.notaDe(nombreCoach())}</p>
              <p>{nota}</p>
            </div>
          )}
        </div>
        <button type="submit" className="boton boton--primario">
          {F.cerrar.confirmar}
        </button>
      </form>
    </Desplegable>
  );
}
