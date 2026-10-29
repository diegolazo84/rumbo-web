// Contexto de Comunidad: la fuente de datos, el alias, los avisos y la navegación interna.
import { createContext, useContext } from "react";
import type { FuenteComunidad, TipoPublicacion } from "./fuente";

export type Vista = "todas" | "grupos" | "desafios" | "logros" | "actividad";
export const VISTAS: Vista[] = ["todas", "grupos", "desafios", "logros", "actividad"];

export type PresetCrear = { tipo?: TipoPublicacion; grupo?: string | null; texto?: string; foto?: boolean; emoji?: boolean };

export type Comunidad = {
  fuente: FuenteComunidad;
  alias: string;
  version: number; // sube cada vez que algo cambia y las listas deben volver a leer
  cambio: () => void;
  aviso: (texto: string) => void;
  abrirCrear: (p?: PresetCrear) => void;
  enlace: (p: { vista?: Vista; grupo?: string | null; tema?: string | null; desafio?: string | null }) => string;
};

export const ComunidadCtx = createContext<Comunidad | null>(null);

export function useComunidad(): Comunidad {
  const c = useContext(ComunidadCtx);
  if (!c) throw new Error("Comunidad sin contexto");
  return c;
}

// Fecha relativa en español de Chile: «Hace 2 horas», «Ayer, 17:30», «12 oct».
export function fechaRelativa(iso: string, ahora = new Date()): string {
  const d = new Date(iso);
  const min = Math.max(0, (ahora.getTime() - d.getTime()) / 60000);
  if (min < 1) return "Recién";
  if (min < 60) return `Hace ${Math.floor(min)} min`;
  const horas = Math.floor(min / 60);
  if (horas < 12) return `Hace ${horas} ${horas === 1 ? "hora" : "horas"}`;
  const hora = d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
  const dia = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  if (dia(d) === dia(ahora)) return `Hoy, ${hora}`;
  if (dia(d) === dia(ayer)) return `Ayer, ${hora}`;
  const opciones: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (d.getFullYear() !== ahora.getFullYear()) opciones.year = "numeric";
  return d.toLocaleDateString("es-CL", opciones).replace(".", "");
}

// «12 de octubre» desde AAAA-MM-DD (sin corrimiento por zona horaria).
export function fechaLargaIso(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-CL", { day: "numeric", month: "long" });
}

// Iniciales del alias (máximo dos) y un tono estable para su avatar.
export function iniciales(alias: string): string {
  const partes = alias.trim().split(/[\s._-]+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : (partes[0] ?? "?").slice(0, 2);
  return letras.toUpperCase();
}
export function tonoAvatar(alias: string): number {
  let h = 0;
  for (const c of alias.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 4;
}
