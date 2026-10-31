import { expect, type Page } from "@playwright/test";

// Comportamiento real de la barra inferior en móvil: se desplaza la página con la rueda paso a
// paso (la barra no se mueve ni queda bajo el contenido), cada control alcanzado con el teclado
// queda entero entre la cabecera y la barra, y al final el último contenido queda sobre la barra.
export async function revisarBarra(page: Page) {
  const barra = page.locator("nav.barra-inferior");
  await expect(barra).toBeVisible();
  const alto = await page.evaluate(() => window.innerHeight);
  const topeBarra = async () => (await barra.boundingBox())!.y;
  const inicial = await topeBarra();
  await page.mouse.move(200, alto / 2);
  for (let i = 0; i < 80; i++) {
    const antes = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(60);
    expect(await topeBarra()).toBeCloseTo(inicial, 0);
    // Lo que se ve en el centro de la barra es la barra misma: ningún contenido queda encima.
    expect(await page.evaluate((y) => !!document.elementFromPoint(window.innerWidth / 2, y + 20)?.closest("nav.barra-inferior"), inicial)).toBe(true);
    if ((await page.evaluate(() => window.scrollY)) === antes) break;
  }
  const fin = await page.evaluate(() => {
    const m = document.querySelector("main")!;
    const hijos = [...m.querySelectorAll("*")].filter((e) => (e as HTMLElement).offsetParent !== null);
    return Math.max(...hijos.map((e) => e.getBoundingClientRect().bottom));
  });
  expect(fin).toBeLessThanOrEqual(inicial + 0.5);
  // Cada control con foco queda visible entero (cabecera arriba, barra abajo).
  const cabeza = await page.evaluate(() => document.querySelector("header.cabecera, .cabecera-app")?.getBoundingClientRect().bottom ?? 0);
  const fallas = await page.evaluate(
    ({ abajo, arriba }) => {
      const r: string[] = [];
      // La página se desplaza con suavidad; aquí se mide la posición final de cada foco.
      document.documentElement.style.scrollBehavior = "auto";
      const controles = [...document.querySelectorAll<HTMLElement>("main a[href], main button, main input, main select, main textarea")].filter(
        (e) => e.offsetParent !== null && !e.hasAttribute("disabled"),
      );
      for (const e of controles) {
        e.focus({ preventScroll: false });
        if (document.activeElement !== e) continue;
        const b = e.getBoundingClientRect();
        // En los formularios largos la barra se oculta mientras se escribe: basta con que quepa en pantalla.
        const sinBarra = !!e.closest("[data-formulario-largo]") && e.matches("textarea, input:not([type=checkbox]):not([type=radio])");
        if (b.bottom > (sinBarra ? window.innerHeight : abajo) + 0.5 || b.top < arriba - 0.5) r.push(`${e.tagName} «${(e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 30)}» ${Math.round(b.top)}-${Math.round(b.bottom)}`);
      }
      return r;
    },
    { abajo: inicial, arriba: cabeza },
  );
  expect(fallas).toEqual([]);
}
