// Portada (5.2): seis capítulos en la secuencia de fondos papel → hondo → bosque →
// papel → hondo → bosque (2.6). Cada capítulo vive en src/components/portada/ y sus
// estilos propios en src/styles/portada.css. Los datos de negocio salen de rumbo.ts.
import Cierre from "../components/portada/Cierre";
import Decidir from "../components/portada/Decidir";
import DentroDeRumbo from "../components/portada/DentroDeRumbo";
import Metodo from "../components/portada/Metodo";
import ParaQuien from "../components/portada/ParaQuien";
import Promesa from "../components/portada/Promesa";

export default function Home() {
  return (
    <>
      <Promesa />
      <ParaQuien />
      <Metodo />
      <DentroDeRumbo />
      <Decidir />
      <Cierre />
    </>
  );
}
