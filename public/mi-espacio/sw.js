// Service worker de Mi espacio (función 21: app instalable). Su alcance es solo /mi-espacio/:
// la portada y el panel no pasan por aquí.
// - Páginas: siempre de la red; sin conexión, una página breve que lo explica.
// - Archivos con huella en /assets/ (no cambian nunca): se guardan al usarlos y sirven sin red.
// - Los números de ayuda son los mismos de recursosAyuda() en src/data/rumbo.ts.
// - Nunca guarda datos de la persona ni respuestas de Supabase: solo lo del propio sitio.
const VERSION = "rumbo-mi-espacio-1";
const BASE = new URL("../", self.location).pathname; // carpeta donde está publicada la web
const ASSETS = `${BASE}assets/`;

const SIN_CONEXION = `<!doctype html><html lang="es-CL"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Sin conexión · Rumbo</title>
<style>body{font-family:system-ui,sans-serif;background:#F5EFE4;color:#1F3A2E;margin:0;padding:2rem 1rem;line-height:1.5}
main{max-width:32rem;margin:0 auto}h1{font-size:1.5rem}</style></head><body><main>
<h1>Sin conexión</h1><p>Mi espacio necesita internet para mostrar tu programa y guardar lo que marques.
Vuelve a intentarlo cuando tengas señal.</p><p>Si tu vida o la de otra persona corre peligro, llama al <a href="tel:131">131</a> (SAMU).
Línea de Prevención del Suicidio: *4141, gratis, las 24 horas.</p>
</main></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase y cualquier otro servicio: sin tocar
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(
        () => new Response(SIN_CONEXION, {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" },
        }),
      ),
    );
    return;
  }
  if (url.pathname.startsWith(ASSETS)) {
    e.respondWith(
      caches.open(VERSION).then((cache) =>
        cache.match(req).then((guardada) => guardada ?? fetch(req).then((r) => {
          if (r.ok) cache.put(req, r.clone());
          return r;
        })),
      ),
    );
  }
});
