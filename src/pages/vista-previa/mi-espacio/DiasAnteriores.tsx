// Vista previa · «De días anteriores» (plataforma 4.6): la misma pantalla Hoy, con más acciones
// sin marcar de los últimos 7 días. «lista»: cuatro pendientes (se ven 3 y «Ver las 4»).
// «aviso-carga»: cinco pendientes, con el aviso «¿Esta semana te está costando?».
// Sin culpa: nada rojo, ningún conteo de días sin registro; a los 7 días salen solas.
import type { PropsPantalla } from "../registro";
import { PantallaHoy, VARIANTES } from "./Hoy";

export default function DiasAnteriores({ estado = "lista" }: PropsPantalla) {
  return <PantallaHoy variante={VARIANTES[estado] ?? VARIANTES.lista} />;
}
