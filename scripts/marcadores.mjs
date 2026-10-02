// Guardián de marcadores (especificación 6.2, punto 5): nunca se publica un
// «[PENDIENTE]», una llave de plantilla, «null» ni «undefined». Lo usan
// scripts/postbuild.mjs (hace fallar la compilación) y pruebas/marcadores.spec.ts
// (repite la revisión sobre el HTML servido, también en producción).

// Patrones prohibidos en el texto visible y en los atributos que se leen o se muestran.
export const PATRONES = [
  { nombre: "marcador entre corchetes", re: /\[(COMPLETAR|PENDIENTE|DECIDIR|VERIFICAR|AJUSTAR)/i },
  // Cualquier llave de plantilla, también con espacios y tildes: «{fecha de verificación}».
  { nombre: "llave de plantilla", re: /\{[^{}\n]{1,60}\}/ },
  // Sensibles a mayúsculas: el cierre dice «No necesitas tener todo resuelto».
  { nombre: "TODO", re: /\bTODO\b/ },
  { nombre: "XXX", re: /\bXXX\b/ },
  { nombre: "valor vacío", re: /\bNaN\b|\bnull\b|\bundefined\b|<fecha/ },
  { nombre: "lorem", re: /lorem/i },
];

// Frases que no aparecen en ningún lugar (aceptación 23) y lenguaje de salud
// prohibido «en ningún contexto» (glosario 5.0).
export const FRASES_PROHIBIDAS = [
  "Próximamente",
  "lista de espera",
  "Plan solo plataforma con IA",
  "Más presencia",
  "Cuéntanos tu objetivo",
  "Quiero participar en el piloto",
  "Ver la comunidad",
  "Es más común de lo que crees",
  "Literalmente",
  "es tu propio avance hecho visible",
  "Google Fonts",
  "paciente",
  "transforma tu vida",
  "disciplina",
  "fuerza de voluntad",
  "sin excusas",
  "fallaste",
  "perdiste tu racha",
  "detox",
  "quemar",
  "peso ideal",
  "has sido seleccionado",
  "cupos limitados",
];

const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export function decodificar(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (todo, e) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : todo;
    }
    return ENTIDADES[e.toLowerCase()] ?? todo;
  });
}

const sinCodigo = (html) =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    // React separa nodos de texto con <!-- -->: se quitan sin espacio para no partir palabras.
    .replace(/<!--[\s\S]*?-->/g, "");

// Texto que ve la persona: sin scripts ni estilos, sin etiquetas y con las entidades decodificadas.
export function textoVisible(html) {
  return decodificar(sinCodigo(html).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

// Atributos que se muestran o se leen en voz alta: content, alt, aria-label y title.
export function atributosVisibles(html) {
  const limpio = sinCodigo(html);
  return [...limpio.matchAll(/\s(content|alt|aria-label|title)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((m) => ({
    atributo: m[1].toLowerCase(),
    valor: decodificar(m[2] ?? m[3] ?? ""),
  }));
}

const extracto = (texto, indice) =>
  texto.slice(Math.max(0, indice - 40), indice + 40).replace(/\s+/g, " ").trim();

// Devuelve los marcadores encontrados en un HTML (vacío = se puede publicar).
export function buscarMarcadores(html) {
  const fuentes = [
    { donde: "texto", texto: textoVisible(html) },
    ...atributosVisibles(html).map((a) => ({ donde: `atributo ${a.atributo}`, texto: a.valor })),
  ];
  const hallazgos = [];
  for (const { donde, texto } of fuentes) {
    for (const { nombre, re } of PATRONES) {
      const m = re.exec(texto);
      if (m) hallazgos.push(`${nombre} en ${donde}: «…${extracto(texto, m.index)}…»`);
    }
  }
  // Una etiqueta <fecha…> escrita a mano en JSX no sobrevive al quitar etiquetas: se busca también en bruto.
  if (/<fecha/i.test(sinCodigo(html))) hallazgos.push("«<fecha» en el HTML");
  return hallazgos;
}

// Busca frases prohibidas como palabras completas, sin distinguir mayúsculas.
export function buscarFrases(texto, frases = FRASES_PROHIBIDAS) {
  const encontradas = [];
  for (const frase of frases) {
    const escapada = frase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapada}(?![\\p{L}\\p{N}])`, "iu");
    const m = re.exec(texto);
    if (m) encontradas.push(`«${frase}»: «…${extracto(texto, m.index)}…»`);
  }
  return encontradas;
}
