// Catálogo de los componentes compartidos de la etapa 0 (plataforma 3.1 y 4.1.3), con los textos
// de formularios.ts y los datos de ejemplo de ejemplo-app.ts. Sirve de referencia a quien arma
// las pantallas y lo recorren las pruebas (axe, 320 px, objetivos táctiles). Solo vista previa.
import { useState } from "react";
import { Aviso } from "../../components/Bloques";
import Etiqueta from "../../components/Etiqueta";
import { estados } from "../../data/rumbo";
import {
  CampoArea,
  CampoSelect,
  CampoTexto,
  CampoTrampa,
  Casilla,
  Envio,
  Formulario,
  GrupoOpciones,
  BloqueNumerado,
  Opcion,
  ResumenErrores,
  useFormulario,
  AvisoAyuda,
  NoEsChat,
  type ErrorResumen,
} from "../../components/form";
import {
  BandaSinConexion,
  BarraProgreso,
  Cargando,
  ChipMeta,
  ErrorBloque,
  ErrorGlobal,
  EstadoVacio,
  FilaAccion,
  FranjaSemana,
  Hoja,
  LeyendaMetas,
  MetaTarjeta,
  Segmentado,
  Tostada,
  type DiaFranja,
} from "../../components/app";
import {
  CONTACTO,
  CORREO,
  POSTULAR,
  REGISTRO_SEMANAL,
  TEXTOS_FORM,
  estadosEnvio,
  opcionesApoyo,
  validarContacto,
  type DatosContacto,
} from "../../data/formularios";
import { HOY, lunesDeSemana, metaPorId, metas, ocurrenciasDel, progreso, semanaDelCiclo } from "../../data/ejemplo-app";
import { diaCorto, fechaLarga, inicialDia, numeroDia, sumarDias, mayuscula } from "../../lib/fechas";

export const TEXTOS_COMPONENTES = {
  titulo: "Componentes compartidos.",
  bajada: "Formularios (3.1) y piezas de la aplicación (4.1.3) con textos de la especificación y datos de ejemplo.",
  formulario: "Formulario",
  conErrores: "Campos con error",
  aplicacion: "Aplicación",
  abrirHoja: "Abrir una hoja",
  mostrarTostada: "Mostrar una tostada",
  tostada: "Marcaste “Reservar 2 bloques de trabajo”.",
  deshacer: "Deshacer",
} as const;

const ENVIO = estadosEnvio("mensaje", CONTACTO.boton);
const iniciales: DatosContacto = { motivo: "", nombre: "", correo: "", mensaje: "" };

function FormularioContacto() {
  const f = useFormulario(iniciales, validarContacto, (c) => (c === "motivo" ? "c-motivo" : `c-${c}`));
  const [resumen, setResumen] = useState<ErrorResumen[]>([]);
  return (
    <Formulario
      avisoObligatorios
      onSubmit={() => {
        const errores = f.enviar();
        setResumen(errores);
        if (errores.length) requestAnimationFrame(() => document.getElementById("resumen-errores")?.focus());
      }}
    >
      <ResumenErrores errores={resumen} />
      <GrupoOpciones id="c-motivo" leyenda={CONTACTO.motivo.leyenda} error={f.errores.motivo}>
        {CONTACTO.motivo.opciones.map((o) => (
          <Opcion
            key={o.valor}
            name="motivo"
            value={o.valor}
            titulo={o.texto}
            checked={f.valores.motivo === o.valor}
            onChange={() => f.cambiar("motivo", o.valor)}
          />
        ))}
      </GrupoOpciones>
      <CampoTexto
        id="c-nombre"
        etiqueta={CONTACTO.nombre.etiqueta}
        autoComplete="given-name"
        maxLength={CONTACTO.nombre.max}
        value={f.valores.nombre}
        onChange={(e) => f.cambiar("nombre", e.target.value)}
      />
      <CampoTexto
        id="c-correo"
        etiqueta={CONTACTO.correo.etiqueta}
        ayuda={CONTACTO.correo.ayuda}
        error={f.errores.correo}
        {...CORREO.atributos}
        value={f.valores.correo}
        onChange={(e) => f.cambiar("correo", e.target.value)}
        onBlur={() => f.salir("correo")}
      />
      <CampoArea
        id="c-mensaje"
        etiqueta={CONTACTO.mensaje.etiqueta}
        ayuda={CONTACTO.mensaje.ayuda}
        error={f.errores.mensaje}
        min={10}
        max={2000}
        value={f.valores.mensaje}
        onChange={(e) => f.cambiar("mensaje", e.target.value)}
        onBlur={() => f.salir("mensaje")}
        pie={<AvisoAyuda />}
      />
      <CampoTrampa />
      <Envio texto={CONTACTO.boton} textoEnviando={ENVIO.enviando} anuncioEnviando={ENVIO.anuncioEnviando} frases={[TEXTOS_FORM.noEsChat]} />
    </Formulario>
  );
}

// Semana 2 del ejemplo en la franja: puntos por meta, hoy marcado.
function diasFranja(): DiaFranja[] {
  const lunes = lunesDeSemana(semanaDelCiclo(HOY));
  return Array.from({ length: 7 }, (_, i) => {
    const fecha = sumarDias(lunes, i);
    const del = ocurrenciasDel(fecha);
    const hechas = del.filter((o) => o.registro === "hecha").length;
    return {
      fecha,
      inicial: inicialDia(fecha),
      numero: numeroDia(fecha),
      puntos: [...new Set(del.map((o) => o.categoria))],
      hoy: fecha === HOY,
      completo: del.length > 0 && hechas === del.length,
      nombre: `${mayuscula(fechaLarga(fecha))}: ${del.length} acciones, ${hechas} hechas.`,
    };
  });
}

export default function Componentes() {
  const [hoja, setHoja] = useState(false);
  const [tostada, setTostada] = useState<string | null>(null);
  const [carga, setCarga] = useState("justa");
  const [dia, setDia] = useState(HOY);
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({});
  const deHoy = ocurrenciasDel(HOY);
  const meta = metas[0];

  return (
    <div className="previa-componentes">
      <div className="encabezado">
        <p className="ojo">{mayuscula(diaCorto(HOY))}</p>
        <p>
          <Etiqueta variante={estados.ejemplo.variante}>{estados.ejemplo.texto}</Etiqueta>
        </p>
        <h1>{TEXTOS_COMPONENTES.titulo}</h1>
        <p className="bajada">{TEXTOS_COMPONENTES.bajada}</p>
      </div>

      <section aria-labelledby="comp-form" className="previa-componentes__seccion">
        <h2 id="comp-form">{TEXTOS_COMPONENTES.formulario}</h2>
        <FormularioContacto />
      </section>

      <section aria-labelledby="comp-errores" className="previa-componentes__seccion">
        <h2 id="comp-errores">{TEXTOS_COMPONENTES.conErrores}</h2>
        <Formulario>
          <BloqueNumerado numero={2} total={3} titulo={POSTULAR.bloques[1].titulo} bajada={POSTULAR.bloques[1].bajada}>
            <GrupoOpciones id="e-apoyo" leyenda={POSTULAR.apoyo.leyenda} error={POSTULAR.apoyo.error} columnas={2}>
              {opcionesApoyo.map((o) => (
                <Opcion key={o.valor} name="e-apoyo" value={o.valor} titulo={o.titulo} linea={o.linea} />
              ))}
            </GrupoOpciones>
          </BloqueNumerado>
          <CampoTexto id="e-correo" etiqueta={CORREO.etiqueta} ayuda={CORREO.ayuda} error={CORREO.errores.formato} defaultValue="camila@ejemplo" {...CORREO.atributos} />
          <CampoSelect id="e-dia" etiqueta={REGISTRO_SEMANAL.carga.leyenda} opcional defaultValue="justa">
            {REGISTRO_SEMANAL.carga.opciones.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.texto}
              </option>
            ))}
          </CampoSelect>
          <Casilla id="e-edad" error={POSTULAR.mayorEdad.error}>
            {POSTULAR.mayorEdad.etiqueta}
          </Casilla>
          <Envio
            texto={CONTACTO.boton}
            alerta={ENVIO.red}
            accionAlerta={null}
            frases={[TEXTOS_FORM.noEsChat]}
          />
          <NoEsChat />
        </Formulario>
      </section>

      <section aria-labelledby="comp-app" className="previa-componentes__seccion">
        <h2 id="comp-app">{TEXTOS_COMPONENTES.aplicacion}</h2>
        <BandaSinConexion />
        <FranjaSemana dias={diasFranja()} elegido={dia} onElegir={setDia} etiqueta="Días de la semana" />
        <LeyendaMetas metas={metas} etiqueta="Colores de tus metas" />
        <Segmentado
          leyenda={REGISTRO_SEMANAL.carga.leyenda}
          opciones={REGISTRO_SEMANAL.carga.opciones}
          valor={carga}
          onCambio={setCarga}
        />
        <ul className="previa-componentes__acciones">
          {deHoy.map((o) => {
            const m = metaPorId(o.metaId);
            const hecha = marcadas[o.id] ?? o.registro === "hecha";
            return (
              <li key={o.id}>
                <FilaAccion
                  titulo={o.titulo}
                  hora={o.hora}
                  duracion={o.duracion}
                  cat={o.categoria}
                  etiquetaMeta={m.corto}
                  estado={hecha ? "hecha" : "pendiente"}
                  onAbrir={() => setHoja(true)}
                  onMarcar={(v) => {
                    setMarcadas((x) => ({ ...x, [o.id]: v }));
                    setTostada(v ? TEXTOS_COMPONENTES.tostada : null);
                  }}
                />
              </li>
            );
          })}
        </ul>
        <MetaTarjeta cat={meta.categoria}>
          <ChipMeta cat={meta.categoria} meta={meta.titulo} />
          {progreso.siguiente && (
            <BarraProgreso
              valor={progreso.creditos}
              minimo={progreso.nivel.minimo}
              maximo={progreso.siguiente.minimo}
              etiqueta={`Créditos para llegar a ${progreso.siguiente.nombre}`}
              textoValor={`${progreso.creditos} de ${progreso.siguiente.minimo} créditos`}
              texto={`${progreso.creditos} de ${progreso.siguiente.minimo} créditos`}
            />
          )}
        </MetaTarjeta>
        <EstadoVacio titulo="Este día no tiene acciones programadas." accion={null}>
          <p>No corta tu racha.</p>
        </EstadoVacio>
        <Cargando />
        <ErrorGlobal />
        <ErrorBloque />
        <Aviso icono="info">{fechaLarga(HOY)}</Aviso>
        <p className="acciones">
          <button type="button" className="boton boton--secundario" aria-haspopup="dialog" onClick={() => setHoja(true)}>
            {TEXTOS_COMPONENTES.abrirHoja}
          </button>
          <button type="button" className="boton boton--terciario" onClick={() => setTostada(TEXTOS_COMPONENTES.tostada)}>
            {TEXTOS_COMPONENTES.mostrarTostada}
          </button>
        </p>
        <Hoja abierta={hoja} onCerrar={() => setHoja(false)} titulo={deHoy[0]?.titulo ?? TEXTOS_COMPONENTES.abrirHoja}>
          <p>{deHoy[0]?.instrucciones[0]}</p>
        </Hoja>
        <Tostada
          mensaje={tostada}
          accion={tostada ? { texto: TEXTOS_COMPONENTES.deshacer, onClick: () => setTostada(null) } : undefined}
          onCerrar={() => setTostada(null)}
        />
      </section>
    </div>
  );
}
