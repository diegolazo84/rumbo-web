// Piezas de las páginas de lectura (Privacidad, Condiciones, Ayuda y 404): contenedor,
// listas, enlaces de contacto y botón de imprimir. Los textos viven en cada página.
import type { ReactNode } from "react";
import { FORMULARIO_EXTERNO, rutas, type Operacion, type RecursoAyuda } from "../../data/rumbo";
import { Aviso } from "../Bloques";
import { Enlace, SeAbrePlataforma } from "../Enlaces";
import Icono from "../Icono";

// Disposición de lectura (.contenedor--lectura); centrada en Ayuda y la 404.
export function PaginaLectura({ centrada, children }: { centrada?: boolean; children: ReactNode }) {
  return (
    <div className={centrada ? "lectura lectura--centrada" : "lectura"}>
      <div className="contenedor contenedor--lectura lectura-cuerpo">{children}</div>
    </div>
  );
}

// Lista de texto corrido dentro de una sección (viñetas o números).
export function ListaLectura({ items, numerada }: { items: ReactNode[]; numerada?: boolean }) {
  const Lista = numerada ? "ol" : "ul";
  return (
    <Lista className={numerada ? "lectura-lista lectura-lista--numerada" : "lectura-lista"}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </Lista>
  );
}

// «página de contacto», «Contacto»: formulario de contacto; mientras esté en la plataforma, con
// aviso de salida. motivo: preselecciona el motivo en el formulario propio (?motivo=, plataforma 3.15).
export function EnlaceContacto({ children = "página de contacto", motivo }: { children?: string; motivo?: string }) {
  return (
    <Enlace href={motivo && !FORMULARIO_EXTERNO ? `${rutas.contacto}?motivo=${motivo}` : rutas.contacto}>
      {children}
      {FORMULARIO_EXTERNO && <SeAbrePlataforma />}
    </Enlace>
  );
}

export const EnlaceCorreo = ({ correo }: { correo: string }) => <a href={`mailto:${correo}`}>{correo}</a>;

// «{nombre}{, RUT {rut}}, con domicilio en {comuna}, Chile» (Privacidad §1 y Condiciones §1).
export const identificacion = (r: NonNullable<Operacion["responsable"]>) =>
  `${r.nombre}${r.rut ? `, RUT ${r.rut}` : ""}, con domicilio en ${r.comuna}, Chile`;

// Imprimir o guardar: oculto hasta hidratar (lectura.css), porque sin JS no funciona.
export function BotonImprimir() {
  return (
    <button type="button" className="boton boton--terciario boton-imprimir" onClick={() => window.print()}>
      <Icono nombre="printer" tamaño={16} />
      Imprimir o guardar
    </button>
  );
}

// Líneas de ayuda en texto corrido (Condiciones §10): «Nombre: número. Descripción».
// El *4141 va sin enlace (iOS no marca tel: con «*»).
export function LineasAyuda({ recursos }: { recursos: RecursoAyuda[] }) {
  return (
    <Aviso icono="phone">
      <ul className="lineas-ayuda">
        {recursos.map((r) => (
          <li key={r.numero}>
            <p>
              {r.nombre}:{" "}
              <strong className="nowrap">{r.tel ? <a href={r.tel}>{r.numero}</a> : r.numero}</strong>.{" "}
              {r.descripcion}
            </p>
          </li>
        ))}
      </ul>
    </Aviso>
  );
}
