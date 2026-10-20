// Rumbo 2.0, etapa 2: título de cada una de las cinco secciones de Mi espacio (el H1 de la
// pantalla, con el nombre completo: «Mi Rumbo», «Mi plan», «Mi acompañamiento», «Comunidad» y
// «Mis logros») y las pestañas de Mi plan (Calendario · Mis metas), que son enlaces entre dos
// rutas: cada vista tiene su dirección y el botón Atrás funciona como se espera.
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Etiqueta from "../../../components/Etiqueta";
import { Icono, type NombreIconoApp } from "../../../components/app";
import { EtiquetaEjemplo, useEspacio } from "./comun";
import { T_PLAN, T_SECCIONES } from "./textos";

type Props = {
  titulo: string;
  icono: NombreIconoApp;
  ojo?: ReactNode; // a la derecha del título (p. ej. «Semana 2 de 4»)
  pronto?: boolean; // etiqueta «Próximamente» (Comunidad)
  ejemplo?: boolean; // etiqueta «Ejemplo» en la vista previa
  bajada?: ReactNode;
  children?: ReactNode;
};

export function TituloSeccion({ titulo, icono, ojo, pronto, ejemplo, bajada, children }: Props) {
  return (
    <header className="me-titulo-seccion">
      <div className="me-titulo-seccion__fila">
        <span className="me-titulo-seccion__icono" aria-hidden="true">
          <Icono nombre={icono} tamaño={20} />
        </span>
        <h1 className="me-titulo-seccion__h1">{titulo}</h1>
        {(ojo || pronto || ejemplo) && (
          <span className="me-titulo-seccion__extra">
            {ojo && <span className="me-titulo-seccion__ojo">{ojo}</span>}
            {pronto && <Etiqueta variante="pronto">{T_SECCIONES.proximamente}</Etiqueta>}
            {ejemplo && <EtiquetaEjemplo />}
          </span>
        )}
      </div>
      {bajada && <div className="me-titulo-seccion__bajada">{typeof bajada === "string" ? <p>{bajada}</p> : bajada}</div>}
      {children}
    </header>
  );
}

// Pestañas de Mi plan. aria-current marca la vista abierta.
export function PestanasPlan({ activa }: { activa: "calendario" | "metas" }) {
  const { R } = useEspacio();
  const pestanas = [
    { id: "calendario", texto: T_PLAN.calendario, href: R.calendario, icono: "calendar-days" as const },
    { id: "metas", texto: T_PLAN.metas, href: R.metas, icono: "list-checks" as const },
  ];
  return (
    <nav className="me-pestanas" aria-label={T_PLAN.pestanas}>
      <ul>
        {pestanas.map((p) => (
          <li key={p.id}>
            <Link to={p.href} className="me-pestanas__item" aria-current={p.id === activa ? "page" : undefined}>
              <Icono nombre={p.icono} tamaño={16} />
              {p.texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// Cierre de Mi plan: «¿Tu semana cambió?» con el botón para pedir un ajuste (antes en «Más»).
export function AjustePlan() {
  const { R } = useEspacio();
  return (
    <aside className="me-ajuste-plan" aria-labelledby="ajuste-plan-titulo">
      <div>
        <h2 id="ajuste-plan-titulo" className="me-h2">
          {T_PLAN.ajusteTitulo}
        </h2>
        <p className="me-bloque__bajada">{T_PLAN.ajusteTexto}</p>
      </div>
      <Link to={R.ajuste} className="boton boton--secundario">
        <Icono nombre="sliders-horizontal" tamaño={16} />
        Pedir un ajuste
      </Link>
    </aside>
  );
}

// Tarjeta «Próximamente»: tono apagado (tarjeta--pronto), sin botones, sin enlaces y sin fechas.
export function TarjetaPronto({ titulo, items, id }: { titulo: string; items: readonly (string | { titulo: string; texto: string })[]; id: string }) {
  return (
    <section className="tarjeta tarjeta--pronto me-pronto" aria-labelledby={id}>
      <div className="me-pronto__cabeza">
        <h2 id={id} className="me-h2">
          {titulo}
        </h2>
        <Etiqueta variante="pronto">{T_SECCIONES.proximamente}</Etiqueta>
      </div>
      <ul className="me-pronto__lista">
        {items.map((it) => (
          <li key={typeof it === "string" ? it : it.titulo}>
            <Icono nombre="sparkles" tamaño={16} />
            {typeof it === "string" ? (
              <span>{it}</span>
            ) : (
              <span>
                <strong>{it.titulo}.</strong> {it.texto}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
