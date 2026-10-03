// La pantalla de la vista previa que se está mostrando (fila de registro.ts). Las pantallas
// pueden leerla con usePantallaPrevia() para saber su marco o su variante sin props extra.
import { createContext, useContext } from "react";
import type { PantallaPrevia } from "./registro";

export const PantallaPreviaContexto = createContext<PantallaPrevia | undefined>(undefined);

export const usePantallaPrevia = () => useContext(PantallaPreviaContexto);
