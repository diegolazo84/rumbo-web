// Revelado al desplazar (2.5). Solo con prefers-reduced-motion: no-preference y después
// de hidratar. Marca como "pendiente" solo lo que está por debajo del borde inferior de
// la ventana: lo que ya se ve no se toca, así que nada parpadea. Si el bundle no carga,
// nada se oculta (el CSS exige además html.hidratado).
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useRevelar() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    const alto = window.innerHeight;
    const pendientes = [...document.querySelectorAll<HTMLElement>("main [data-revelar]")].filter(
      (el) => el.dataset.revelar !== "visto" && el.getBoundingClientRect().top > alto,
    );
    if (!pendientes.length) return;
    const observador = new IntersectionObserver(
      (entradas) => {
        // Escalonado de 60 ms hasta 4 elementos que aparecen juntos.
        let i = 0;
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.style.setProperty("--i", String(Math.min(i++, 3)));
          el.dataset.revelar = "visto";
          observador.unobserve(el);
        }
      },
      { threshold: 0.15 },
    );
    for (const el of pendientes) {
      el.dataset.revelar = "pendiente";
      observador.observe(el);
    }
    return () => {
      observador.disconnect();
      // Lo que quedó pendiente vuelve a ser visible.
      for (const el of pendientes) if (el.dataset.revelar === "pendiente") el.dataset.revelar = "";
    };
  }, [pathname]);
}
