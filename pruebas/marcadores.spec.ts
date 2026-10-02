// Guardián de marcadores sobre el HTML servido (especificación 6.9 y aceptación 21 y 23):
// el mismo guardián de postbuild, también en producción, más las frases prohibidas.
import { readFileSync, readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { paginas } from "../src/data/paginas";
import { operacion } from "../src/data/rumbo";
import { FRASES_PROHIBIDAS, atributosVisibles, buscarFrases, buscarMarcadores, textoVisible } from "../scripts/marcadores.mjs";
import { REENVIOS } from "../scripts/reenvios.mjs";

const relativa = (ruta: string) => ruta.replace(/^\//, "") || "./";

// Todo HTML que se publica: las 4 páginas, la 404 y los reenvíos.
const documentos = [
  ...paginas.map((p) => ({ nombre: p.ruta, ruta: relativa(p.ruta), estado: 200 })),
  { nombre: "404", ruta: "esta-ruta-no-existe/", estado: 404 },
  ...REENVIOS.flatMap((r) => r.rutas.map((ruta) => ({ nombre: `/${ruta}/`, ruta: `${ruta}/`, estado: 200 }))),
];

test.describe("marcadores y frases prohibidas", () => {
  // Es texto, no maquetación: basta con un proyecto.
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "escritorio", "texto: basta un proyecto");
  });

  for (const d of documentos) {
    test(`sin marcadores ni frases prohibidas: ${d.nombre}`, { tag: "@produccion" }, async ({ request }) => {
      const r = await request.get(d.ruta, { maxRedirects: 0 });
      expect(r.status()).toBe(d.estado);
      const html = await r.text();
      expect(buscarMarcadores(html)).toEqual([]);

      const legible = [textoVisible(html), ...atributosVisibles(html).map((a) => a.valor)].join(" \n ");
      expect(buscarFrases(legible)).toEqual([]);
      // «Cloudflare» solo en Privacidad §6, y solo con el alojamiento confirmado (aceptación 23).
      const cloudflarePermitido = d.nombre === "/privacidad/" && operacion.alojamientoVerificado;
      if (!cloudflarePermitido) expect(buscarFrases(legible, ["Cloudflare"])).toEqual([]);
    });
  }

  // El bundle trae también los textos condicionales: ninguno puede usar una frase prohibida.
  test("el JavaScript publicado no contiene frases prohibidas", async () => {
    test.skip(!!process.env.URL_PRUEBA, "solo sobre el build local");
    const encontradas = readdirSync("dist/assets")
      .filter((f) => f.endsWith(".js"))
      .flatMap((f) => buscarFrases(readFileSync(`dist/assets/${f}`, "utf8"), FRASES_PROHIBIDAS).map((x) => `${f}: ${x}`));
    expect(encontradas).toEqual([]);
  });
});
