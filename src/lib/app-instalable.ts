// Mi espacio instalable (función 21): registra el service worker de /mi-espacio/ (public/mi-espacio/sw.js).
// Solo en la web compilada y donde el navegador lo admite; si falla, Mi espacio sigue igual.
export function registrarAppInstalable(base: string = import.meta.env.BASE_URL) {
  if (!import.meta.env.PROD || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register(`${base}mi-espacio/sw.js`, { scope: `${base}mi-espacio/` }).catch(() => {});
}
