// «Ver su postulación» en la ficha (A2): la postulación original se abre solo con un motivo,
// y ver_postulacion deja en la auditoría quién la vio, cuándo y por qué. Nada se guarda en la
// pantalla después de cerrar la hoja.
import { useState } from "react";
import { Hoja, Icono } from "../../../components/app";
import { CampoArea } from "../../../components/form";
import { areas } from "../../../data/rumbo";
import { opcionesApoyo, POSTULAR } from "../../../data/formularios";
import { fechaLarga, type Iso } from "../../../lib/fechas";
import { datos } from "../../../lib/supabase";
import { Datos } from "../../vista-previa/panel/comun";
import { POSTULACION_PANEL as T } from "../../vista-previa/panel/textos";
import { Alerta, useDatosPanel, useEscritura } from "./comun";

type Postulacion = {
  creada_en: string;
  area: string | null;
  meta: string | null;
  apoyo: string | null;
  dias: string[] | null;
  franjas: string[] | null;
  horarios_nota: string | null;
};

const DIAS: Record<string, string> = { lun: "Lunes", mar: "Martes", mie: "Miércoles", jue: "Jueves", vie: "Viernes", sab: "Sábado", dom: "Domingo" };
const FRANJAS: Record<string, string> = Object.fromEntries(POSTULAR.horarios.franjas.map((f) => [f.valor, f.texto]));
const lista = (xs: string[] | null, nombres: Record<string, string>) => (xs?.length ? xs.map((x) => nombres[x] ?? x).join(", ") : T.ninguno);

export function VerPostulacion({ participante }: { participante: string }) {
  const { sb } = useDatosPanel();
  const [abierta, setAbierta] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [errMotivo, setErrMotivo] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Postulacion | null | undefined>(undefined);
  const [correr, error, ocupado] = useEscritura();
  const cerrar = () => {
    setAbierta(false);
    setMotivo("");
    setResultado(undefined);
  };
  return (
    <>
      <button type="button" className="boton boton--secundario" aria-haspopup="dialog" onClick={() => setAbierta(true)}>
        <Icono nombre="file-text" tamaño={20} />
        {T.boton}
      </button>
      <Hoja abierta={abierta} onCerrar={cerrar} titulo={T.titulo}>
        {resultado === undefined ? (
          <form
            className="pa-form"
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              if (motivo.trim().length < 10) {
                setErrMotivo(T.errorMotivo);
                document.getElementById("postulacion-motivo")?.focus();
                return;
              }
              setErrMotivo(null);
              await correr(async () => {
                setResultado(datos(await sb.rpc("ver_postulacion", { p_participante: participante, p_motivo: motivo.trim() })) as Postulacion | null);
              });
            }}
          >
            <p>{T.ayuda}</p>
            <CampoArea
              id="postulacion-motivo"
              etiqueta={T.motivo}
              placeholder={T.motivoEjemplo}
              max={300}
              min={10}
              rows={2}
              value={motivo}
              error={errMotivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <Alerta texto={error} />
            <div className="acciones">
              <button type="submit" className="boton boton--primario" disabled={ocupado}>
                {T.ver}
              </button>
              <button type="button" className="boton boton--terciario" onClick={cerrar}>
                {T.cancelar}
              </button>
            </div>
          </form>
        ) : resultado === null ? (
          <p>{T.sinPostulacion}</p>
        ) : (
          <Datos
            className="pa-datos--apilada"
            filas={[
              [T.campos.recibida, fechaLarga(resultado.creada_en.slice(0, 10) as Iso)],
              [T.campos.area, areas.find((a) => a.id === resultado.area)?.nombre ?? resultado.area ?? T.ninguno],
              [T.campos.meta, resultado.meta ?? T.ninguno],
              [T.campos.apoyo, opcionesApoyo.find((o) => o.valor === resultado.apoyo)?.titulo ?? T.ninguno],
              [T.campos.dias, lista(resultado.dias, DIAS)],
              [T.campos.franjas, lista(resultado.franjas, FRANJAS)],
              resultado.horarios_nota && [T.campos.nota, resultado.horarios_nota],
            ]}
          />
        )}
      </Hoja>
    </>
  );
}
