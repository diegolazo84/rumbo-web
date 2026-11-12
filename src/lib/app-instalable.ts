// Mi espacio instalable: registra el service worker de /mi-espacio/ (public/mi-espacio/sw.js) y
// guarda el aviso de instalación que ofrecen Chrome y Edge, para mostrar un botón propio.
// Solo en la web compilada y donde el navegador lo admite; si falla, Mi espacio sigue igual.

type AvisoInstalacion = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let aviso: AvisoInstalacion | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    aviso = e as AvisoInstalacion;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    aviso = null;
    avisar();
  });
}

export function registrarAppInstalable(base: string = import.meta.env.BASE_URL) {
  if (!import.meta.env.PROD || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register(`${base}mi-espacio/sw.js`, { scope: `${base}mi-espacio/` }).catch(() => {});
}

export type FormaInstalar = "instalada" | "boton" | "ios" | "otro";

// Cómo se puede instalar en este navegador: ya instalada, con botón (Chrome, Edge, Android),
// con los pasos de Safari en iPhone o iPad, u otro navegador sin opción conocida.
export function formaInstalar(): FormaInstalar {
  if (typeof window === "undefined") return "otro";
  const nav = navigator as Navigator & { standalone?: boolean };
  if (window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone) return "instalada";
  if (aviso) return "boton";
  const ua = nav.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && nav.maxTouchPoints > 1);
  return ios ? "ios" : "otro";
}

export function alCambiarInstalacion(f: () => void) {
  oyentes.add(f);
  return () => void oyentes.delete(f);
}

// Abre el aviso del navegador. Devuelve true si la persona aceptó.
export async function instalar(): Promise<boolean> {
  if (!aviso) return false;
  const a = aviso;
  await a.prompt();
  const { outcome } = await a.userChoice;
  aviso = null;
  avisar();
  return outcome === "accepted";
}
