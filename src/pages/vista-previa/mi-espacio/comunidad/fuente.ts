// Comunidad (maqueta de ChatGPT, 21-oct-2026): de dónde salen los datos.
// Una sola interfaz con dos fuentes:
//   · real: las funciones de la base (C6 a C9). Nada se calcula ni se inventa en el navegador:
//     alias, conteos, temas, impacto y avance de desafíos vienen de la base, que aplica el
//     módulo «comunidad», el alias, las reglas, los grupos, los bloqueos y la moderación.
//   · ejemplo: la vista previa, en memoria y rotulada «Ejemplo». Sus personas, textos y números
//     son ilustrativos y no se guardan en ninguna parte.
import { ErrorBase, datos, supabase } from "../../../../lib/supabase";

export type TipoPublicacion = "general" | "progreso" | "pregunta" | "consejo" | "logro";
export const TIPOS: TipoPublicacion[] = ["general", "progreso", "pregunta", "consejo", "logro"];
export type Ilustracion = "colinas" | "brote" | "atardecer" | "sendero" | "lago" | "montana";
export type MotivoReporte = "respeto" | "privacidad" | "salud" | "spam" | "otro";

export type Publicacion = {
  id: string;
  respuestaA: string | null;
  alias: string;
  texto: string;
  creadaEn: string; // ISO
  mia: boolean;
  respuestas: number;
  grupoId: string | null;
  grupo: string | null;
  foto: string | null; // ruta en el bucket privado «comunidad» (la primera)
  fotos: string[]; // hasta 5 (C11)
  permiteComentarios: boolean; // C11: si quien publica los apagó, solo esa persona responde
  reacciones: number;
  miReaccion: boolean;
  tipo: TipoPublicacion;
  guardada: boolean;
  ilustracionEjemplo?: Ilustracion; // solo la vista previa: dibujo en lugar de una foto ficticia
};

export type Grupo = {
  id: string;
  nombre: string;
  descripcion: string | null;
  miembros: number;
  soyMiembro: boolean;
  ilustracion: Ilustracion | null;
  publicaciones: number;
  // C13 (explorador): el destacado lo elige el equipo; sugerido = de un área de tus metas y aún no eres parte.
  destacado: boolean;
  categoria: CategoriaGrupo | null;
  creadoEn: string | null;
  sugerido: boolean;
};
// C14: la lista de miembros de un grupo (solo para sus miembros, solo con alias).
export type MiembroGrupo = { alias: string; unidoEn: string; soyYo: boolean };
export type CategoriaGrupo = "proyecto" | "orden" | "bienestar";
export type PropuestaGrupo = { id: string; nombre: string; estado: "pendiente" | "creada" | "descartada"; creadaEn: string };

export type Tema = { tema: string; publicaciones: number };
export type Impacto = { publicaciones: number; comentarios: number; reacciones: number };
export type Bloqueo = { alias: string; desde: string };

export type Desafio = {
  id: string;
  titulo: string;
  descripcion: string | null;
  reglas: string;
  dias: number;
  inicio: string; // AAAA-MM-DD
  fin: string;
  ilustracion: Ilustracion | null;
  participantes: number;
  participo: boolean;
  diasCumplidos: number;
  diasTranscurridos: number;
  completado: boolean;
};
export type DiaDesafio = { fecha: string; cumplido: boolean };

// Quién puede participar: módulo habilitado por el dueño, ficha activa, alias y reglas aceptadas.
export type Acceso = "abierta" | "cerrada" | "sin_alias" | "sin_reglas" | "no_activo";

export type Filtro = {
  grupo?: string | null;
  soloMisGrupos?: boolean;
  tipo?: TipoPublicacion | null;
  soloGuardadas?: boolean;
  tema?: string | null;
  antes?: string | null;
};

export type NuevaPublicacion = {
  texto: string;
  tipo: TipoPublicacion;
  grupo: string | null;
  fotos?: Blob[]; // ya reducidas (prepararFoto); hasta 5
  respuestaA?: string | null;
  permiteComentarios?: boolean; // por defecto, sí
  clienteId?: string; // un identificador por intento: si llega dos veces, la base no duplica
};

export interface FuenteComunidad {
  ejemplo: boolean;
  acceso(): Promise<{ estado: Acceso; alias: string | null }>;
  publicaciones(f: Filtro): Promise<Publicacion[]>;
  hilo(id: string): Promise<Publicacion[]>; // la publicación y sus respuestas
  grupos(): Promise<Grupo[]>;
  temas(): Promise<Tema[]>;
  impacto(): Promise<Impacto>;
  desafios(): Promise<Desafio[]>;
  avance(desafio: string): Promise<DiaDesafio[]>;
  bloqueos(): Promise<Bloqueo[]>;
  publicar(p: NuevaPublicacion): Promise<string | null>; // id de la publicación creada
  reaccionar(id: string): Promise<boolean>;
  guardar(id: string): Promise<boolean>;
  reportar(id: string, motivo: MotivoReporte, detalle: string | null): Promise<void>;
  bloquear(id: string): Promise<void>;
  desbloquear(alias: string): Promise<void>;
  borrar(id: string): Promise<void>;
  unirmeGrupo(id: string): Promise<void>;
  salirGrupo(id: string): Promise<void>;
  miembrosGrupo(id: string): Promise<MiembroGrupo[]>;
  proponerGrupo(nombre: string, descripcion: string | null): Promise<void>;
  misPropuestas(): Promise<PropuestaGrupo[]>;
  unirmeDesafio(id: string): Promise<void>;
  salirDesafio(id: string): Promise<void>;
  urlFoto(ruta: string): Promise<string | null>;
  guardarAlias(alias: string): Promise<void>;
  aceptarReglas(): Promise<void>;
}

export const LIMITE_TEXTO = 1000;
export const LIMITE_FOTO = 4 * 1024 * 1024; // el bucket acepta hasta 4 MB por archivo, ya reducido
export const LIMITE_FOTO_ORIGINAL = 10 * 1024 * 1024; // lo que la persona puede elegir: se reduce antes de subir
export const MAX_FOTOS = 5;
export const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];

// ---------------------------------------------------------------------------
// Fuente real

type FilaPublicacion = {
  id: string;
  respuesta_a: string | null;
  alias_publico: string;
  texto: string;
  creada_en: string;
  mia: boolean;
  respuestas: number;
  grupo_id: string | null;
  grupo_titulo: string | null;
  foto_ruta: string | null;
  reacciones: number;
  mi_reaccion: boolean;
  tipo: TipoPublicacion;
  guardada: boolean;
  fotos?: string[] | null;
  permite_comentarios?: boolean | null;
};

const aPublicacion = (f: FilaPublicacion): Publicacion => ({
  id: f.id,
  respuestaA: f.respuesta_a,
  alias: f.alias_publico,
  texto: f.texto,
  creadaEn: f.creada_en,
  mia: f.mia,
  respuestas: f.respuestas,
  grupoId: f.grupo_id,
  grupo: f.grupo_titulo,
  foto: f.foto_ruta,
  fotos: f.fotos?.length ? f.fotos : f.foto_ruta ? [f.foto_ruta] : [],
  permiteComentarios: f.permite_comentarios ?? true,
  reacciones: f.reacciones,
  miReaccion: f.mi_reaccion,
  tipo: f.tipo ?? "general",
  guardada: !!f.guardada,
});

// Lo que dice la base cuando la persona aún no puede participar.
export function accesoDesdeError(e: unknown): Acceso | null {
  if (!(e instanceof ErrorBase)) return null;
  if (e.campo === "comunidad" && e.codigo === "no_disponible") return "cerrada";
  if (e.campo === "alias" && e.codigo === "sin_alias") return "sin_alias";
  if (e.campo === "comunidad" && e.codigo === "sin_reglas") return "sin_reglas";
  if (e.campo === "sesion" && e.codigo === "no_activo") return "no_activo";
  // La función aún no existe en la base (migración sin aplicar): la comunidad no está abierta.
  if (e.estado === 404 && !e.campo) return "cerrada";
  return null;
}

// Foto: se reduce a 1600 px como máximo y se guarda en WebP antes de subirla.
export async function prepararFoto(archivo: Blob): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return archivo;
  try {
    const img = await createImageBitmap(archivo);
    const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(img.width * escala);
    lienzo.height = Math.round(img.height * escala);
    lienzo.getContext("2d")?.drawImage(img, 0, 0, lienzo.width, lienzo.height);
    const salida = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, "image/webp", 0.82));
    return salida && salida.size < archivo.size ? salida : archivo;
  } catch {
    return archivo;
  }
}

const extension = (b: Blob) => (b.type === "image/png" ? "png" : b.type === "image/jpeg" ? "jpg" : "webp");

export function fuenteReal(): FuenteComunidad {
  let ficha: Promise<string> | null = null;
  const miFicha = () =>
    (ficha ??= (async () => {
      const sb = await supabase();
      const { data } = await sb.auth.getUser();
      const fila = datos(await sb.from("participantes").select("id").eq("user_id", data.user?.id ?? "").maybeSingle()) as { id: string } | null;
      if (!fila) throw new ErrorBase(403, "sesion", "sin_ficha");
      return fila.id;
    })());
  const rpc = async <T>(nombre: string, args?: Record<string, unknown>): Promise<T> => {
    const sb = await supabase();
    return datos(await sb.rpc(nombre, args)) as T;
  };
  const fotos = new Map<string, Promise<string | null>>();

  return {
    ejemplo: false,
    async acceso() {
      const sb = await supabase();
      let alias: string | null = null;
      try {
        const id = await miFicha();
        const fila = datos(await sb.from("alias").select("alias").eq("participante_id", id).maybeSingle()) as { alias: string } | null;
        alias = fila?.alias ?? null;
      } catch {
        alias = null;
      }
      try {
        await rpc("mi_impacto_comunidad");
        return { estado: "abierta", alias };
      } catch (e) {
        const estado = accesoDesdeError(e);
        if (estado) return { estado, alias };
        throw e;
      }
    },
    async publicaciones(f) {
      const filas = await rpc<FilaPublicacion[]>("comunidad_publicaciones", {
        p_antes: f.antes ?? null,
        p_limite: 20,
        p_grupo: f.grupo ?? null,
        p_solo_mis_grupos: !!f.soloMisGrupos,
        p_tipo: f.tipo ?? null,
        p_solo_guardadas: !!f.soloGuardadas,
        p_tema: f.tema ?? null,
      });
      return (filas ?? []).map(aPublicacion);
    },
    async hilo(id) {
      return ((await rpc<FilaPublicacion[]>("comunidad_publicaciones", { p_hilo: id, p_limite: 100 })) ?? []).map(aPublicacion);
    },
    async grupos() {
      const filas = await rpc<
        {
          id: string;
          nombre: string;
          descripcion: string | null;
          miembros: number;
          soy_miembro: boolean;
          ilustracion: Ilustracion | null;
          publicaciones: number;
          destacado?: boolean;
          categoria?: CategoriaGrupo | null;
          creado_en?: string | null;
          sugerido?: boolean;
        }[]
      >("comunidad_grupos");
      return (filas ?? []).map((g) => ({
        id: g.id,
        nombre: g.nombre,
        descripcion: g.descripcion,
        miembros: g.miembros,
        soyMiembro: g.soy_miembro,
        ilustracion: g.ilustracion,
        publicaciones: g.publicaciones ?? 0,
        destacado: !!g.destacado,
        categoria: g.categoria ?? null,
        creadoEn: g.creado_en ?? null,
        sugerido: !!g.sugerido,
      }));
    },
    async temas() {
      return (await rpc<Tema[]>("comunidad_temas", { p_limite: 5 })) ?? [];
    },
    async impacto() {
      const f = (await rpc<{ publicaciones: number; comentarios: number; reacciones_recibidas: number }[]>("mi_impacto_comunidad"))?.[0];
      return { publicaciones: f?.publicaciones ?? 0, comentarios: f?.comentarios ?? 0, reacciones: f?.reacciones_recibidas ?? 0 };
    },
    async desafios() {
      const filas = await rpc<
        {
          id: string;
          titulo: string;
          descripcion: string | null;
          reglas: string;
          dias: number;
          inicio: string;
          fin: string;
          ilustracion: Ilustracion | null;
          participantes: number;
          participo: boolean;
          dias_cumplidos: number;
          dias_transcurridos: number;
          completado: boolean;
        }[]
      >("comunidad_desafios");
      return (filas ?? []).map((d) => ({
        id: d.id,
        titulo: d.titulo,
        descripcion: d.descripcion,
        reglas: d.reglas,
        dias: d.dias,
        inicio: d.inicio,
        fin: d.fin,
        ilustracion: d.ilustracion,
        participantes: d.participantes,
        participo: d.participo,
        diasCumplidos: d.dias_cumplidos,
        diasTranscurridos: d.dias_transcurridos,
        completado: d.completado,
      }));
    },
    async avance(desafio) {
      return (await rpc<DiaDesafio[]>("mi_avance_desafio", { p_desafio: desafio })) ?? [];
    },
    async bloqueos() {
      return ((await rpc<{ alias_publico: string; desde: string }[]>("mis_bloqueos")) ?? []).map((b) => ({ alias: b.alias_publico, desde: b.desde }));
    },
    async publicar(p) {
      // Las fotos se suben primero a la carpeta propia (bucket privado); si algo falla, se borran.
      const sb = await supabase();
      const rutas: string[] = [];
      try {
        if (p.fotos?.length) {
          const id = await miFicha();
          for (const f of p.fotos) {
            const ruta = `${id}/${crypto.randomUUID()}.${extension(f)}`;
            const { error } = await sb.storage.from("comunidad").upload(ruta, f, { contentType: f.type, upsert: false });
            if (error) throw new ErrorBase(0, "foto", "no_subio");
            rutas.push(ruta);
          }
        }
        return await rpc<string | null>("publicar_en_comunidad", {
          p_texto: p.texto,
          p_respuesta_a: p.respuestaA ?? null,
          p_grupo: p.respuestaA ? null : p.grupo,
          p_tipo: p.respuestaA ? "general" : p.tipo,
          p_fotos: p.respuestaA ? null : rutas,
          p_permite_comentarios: p.permiteComentarios ?? true,
          p_cliente_id: p.clienteId ?? null,
        });
      } catch (e) {
        if (rutas.length) await sb.storage.from("comunidad").remove(rutas).catch(() => undefined);
        throw e;
      }
    },
    reaccionar: (id) => rpc<boolean>("reaccionar_publicacion", { p_id: id }),
    guardar: (id) => rpc<boolean>("guardar_publicacion", { p_id: id }),
    reportar: (id, motivo, detalle) => rpc("reportar_publicacion", { p_id: id, p_motivo: motivo, p_detalle: detalle }),
    bloquear: (id) => rpc("bloquear_autor", { p_publicacion: id }),
    desbloquear: (alias) => rpc("desbloquear_alias", { p_alias: alias }),
    borrar: (id) => rpc("borrar_mi_publicacion", { p_id: id }),
    unirmeGrupo: (id) => rpc("unirme_a_grupo", { p_grupo: id }),
    salirGrupo: (id) => rpc("salir_de_grupo", { p_grupo: id }),
    miembrosGrupo: async (id) =>
      ((await rpc<{ alias: string; unido_en: string; soy_yo: boolean }[]>("comunidad_miembros_grupo", { p_grupo: id })) ?? []).map((m) => ({
        alias: m.alias,
        unidoEn: m.unido_en,
        soyYo: m.soy_yo,
      })),
    async proponerGrupo(nombre, descripcion) {
      await rpc("proponer_grupo", { p_nombre: nombre, p_descripcion: descripcion });
    },
    async misPropuestas() {
      const filas = await rpc<{ id: string; nombre: string; estado: PropuestaGrupo["estado"]; creada_en: string }[]>("mis_propuestas_grupo");
      return (filas ?? []).map((f) => ({ id: f.id, nombre: f.nombre, estado: f.estado, creadaEn: f.creada_en }));
    },
    unirmeDesafio: (id) => rpc("unirme_a_desafio", { p_desafio: id }),
    salirDesafio: (id) => rpc("salir_de_desafio", { p_desafio: id }),
    urlFoto(ruta) {
      let p = fotos.get(ruta);
      if (!p) {
        p = supabase()
          .then((sb) => sb.storage.from("comunidad").createSignedUrl(ruta, 3600))
          .then((r) => r.data?.signedUrl ?? null)
          .catch(() => null);
        fotos.set(ruta, p);
      }
      return p;
    },
    guardarAlias: (alias) => rpc("guardar_alias", { p_alias: alias }),
    aceptarReglas: () => rpc("aceptar_reglas_comunidad"),
  };
}

// ---------------------------------------------------------------------------
// Fuente de ejemplo (vista previa): en memoria, rotulada «Ejemplo» en pantalla.

const hace = (horas: number) => new Date(Date.now() - horas * 3600_000).toISOString();
const isoDia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const diaMas = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return isoDia(d);
};

// Vista previa: Comunidad y Crear publicación comparten la misma memoria mientras la página siga
// abierta (lo publicado aparece en la lista al volver). Al recargar, todo vuelve al ejemplo.
const compartidas = new Map<Acceso, FuenteComunidad>();
export function fuenteEjemploCompartida(acceso: Acceso = "abierta"): FuenteComunidad {
  let f = compartidas.get(acceso);
  if (!f) compartidas.set(acceso, (f = fuenteEjemplo(acceso)));
  return f;
}

export function fuenteEjemplo(acceso: Acceso = "abierta"): FuenteComunidad {
  const yo = "Tu alias";
  const grupos: Grupo[] = [
    { id: "g1", nombre: "Vida saludable", descripcion: "Hábitos simples para sentirte mejor cada día.", miembros: 14, soyMiembro: true, ilustracion: "sendero", publicaciones: 0, destacado: true, categoria: "bienestar", creadoEn: diaMas(-40), sugerido: false },
    { id: "g2", nombre: "Actividad física", descripcion: "Caminar, moverse y disfrutarlo.", miembros: 11, soyMiembro: true, ilustracion: "montana", publicaciones: 0, destacado: false, categoria: "bienestar", creadoEn: diaMas(-35), sugerido: false },
    { id: "g3", nombre: "Bienestar emocional", descripcion: "Un espacio para hablar de cómo nos sentimos.", miembros: 9, soyMiembro: true, ilustracion: "lago", publicaciones: 0, destacado: false, categoria: "bienestar", creadoEn: diaMas(-30), sugerido: false },
    { id: "g4", nombre: "Alimentación consciente", descripcion: "Comer con calma y sin culpa.", miembros: 7, soyMiembro: false, ilustracion: "brote", publicaciones: 0, destacado: false, categoria: "bienestar", creadoEn: diaMas(-20), sugerido: true },
    { id: "g5", nombre: "Organización y hábitos", descripcion: "Ordenar la semana para avanzar.", miembros: 6, soyMiembro: false, ilustracion: "colinas", publicaciones: 0, destacado: false, categoria: "orden", creadoEn: diaMas(-10), sugerido: true },
    { id: "g6", nombre: "Proyectos personales", descripcion: "Avanzar en eso que siempre postergas, paso a paso.", miembros: 4, soyMiembro: false, ilustracion: "atardecer", publicaciones: 0, destacado: false, categoria: "proyecto", creadoEn: diaMas(-3), sugerido: false },
  ];
  let lista: Publicacion[] = [
    {
      id: "e1", respuestaA: null, alias: "Sofía", creadaEn: hace(2), mia: false, respuestas: 2, grupoId: "g1", grupo: "Vida saludable",
      texto: "Hoy completé mi primera semana 🎉\nCostó, pero se puede. Gracias a todos por la motivación y las ideas que comparten. Me ha servido mucho leer sus experiencias. #VidaSaludable",
      foto: null, fotos: [], permiteComentarios: true, ilustracionEjemplo: "atardecer", reacciones: 6, miReaccion: false, tipo: "logro", guardada: false,
    },
    {
      id: "e2", respuestaA: null, alias: "Matías", creadaEn: hace(22), mia: false, respuestas: 1, grupoId: "g2", grupo: "Actividad física",
      texto: "Les comparto mi rutina de caminatas para quienes están empezando: 15 minutos los primeros días, 25 la segunda semana y 40 cuando ya se sientan cómodos. ¡Espero que les sirva! #Hábitos",
      foto: null, fotos: [], permiteComentarios: true, reacciones: 4, miReaccion: true, tipo: "consejo", guardada: true,
    },
    {
      id: "e3", respuestaA: null, alias: "Valentina", creadaEn: hace(30), mia: false, respuestas: 0, grupoId: "g3", grupo: "Bienestar emocional",
      texto: "Una reflexión que me ha ayudado mucho esta semana:\n«No se trata de tenerlo todo resuelto, sino de seguir avanzando un día a la vez».\n¿Cuál ha sido tu mayor aprendizaje últimamente? #Motivación",
      foto: null, fotos: [], permiteComentarios: true, reacciones: 5, miReaccion: false, tipo: "pregunta", guardada: false,
    },
    {
      id: "e4", respuestaA: null, alias: "Andrés", creadaEn: hace(50), mia: false, respuestas: 0, grupoId: null, grupo: null,
      texto: "Tercera semana sin saltarme la pausa de la tarde. Pequeño, pero mío. #Hábitos",
      foto: null, fotos: [], permiteComentarios: true, reacciones: 3, miReaccion: false, tipo: "progreso", guardada: false,
    },
  ];
  let respuestas: Publicacion[] = [
    { id: "r1", respuestaA: "e1", alias: "Camila", texto: "¡Felicitaciones! La primera semana es la más difícil.", creadaEn: hace(1.5), mia: false, respuestas: 0, grupoId: "g1", grupo: "Vida saludable", foto: null, fotos: [], permiteComentarios: true, reacciones: 0, miReaccion: false, tipo: "general", guardada: false },
    { id: "r2", respuestaA: "e1", alias: "Matías", texto: "Vamos por la segunda 💪", creadaEn: hace(1), mia: false, respuestas: 0, grupoId: "g1", grupo: "Vida saludable", foto: null, fotos: [], permiteComentarios: true, reacciones: 0, miReaccion: false, tipo: "general", guardada: false },
    { id: "r3", respuestaA: "e2", alias: "Sofía", texto: "Gracias, la voy a probar esta semana.", creadaEn: hace(20), mia: false, respuestas: 0, grupoId: "g2", grupo: "Actividad física", foto: null, fotos: [], permiteComentarios: true, reacciones: 0, miReaccion: false, tipo: "general", guardada: false },
  ];
  const bloqueados: Bloqueo[] = [];
  const propuestas: PropuestaGrupo[] = [];
  const desafios: Desafio[] = [
    {
      id: "d1", titulo: "28 días de constancia", descripcion: "Pequeños pasos, grandes cambios. Completa tus acciones diarias y comparte tu experiencia.",
      reglas: "Un día cuenta cuando completas todas las acciones que tenías programadas ese día. Rumbo lo calcula solo con tus registros: nadie marca días a mano. Puedes unirte o salir cuando quieras.",
      dias: 28, inicio: diaMas(-9), fin: diaMas(18), ilustracion: "sendero", participantes: 8, participo: false, diasCumplidos: 0, diasTranscurridos: 10, completado: false,
    },
  ];
  let id = 100;
  const intentos = new Map<string, string>();
  const visible = (p: Publicacion) => !bloqueados.some((b) => b.alias === p.alias);
  const contar = () => grupos.forEach((g) => (g.publicaciones = lista.filter((p) => p.grupoId === g.id).length));
  contar();
  const encontrar = (pid: string) => lista.find((p) => p.id === pid) ?? respuestas.find((p) => p.id === pid);
  const espera = () => new Promise((ok) => setTimeout(ok, 120));

  return {
    ejemplo: true,
    async acceso() {
      return { estado: acceso, alias: acceso === "sin_alias" ? null : yo };
    },
    async publicaciones(f) {
      await espera();
      const tema = f.tema?.toLowerCase();
      return lista
        .filter(visible)
        .filter((p) => !f.grupo || p.grupoId === f.grupo)
        // Como en la base: lo de un grupo solo lo ven sus miembros.
        .filter((p) => !p.grupoId || grupos.some((g) => g.id === p.grupoId && g.soyMiembro))
        .filter((p) => !f.soloMisGrupos || !!p.grupoId)
        .filter((p) => !f.tipo || p.tipo === f.tipo)
        .filter((p) => !f.soloGuardadas || p.guardada)
        .filter((p) => !tema || new RegExp(`#${tema}(?![\\p{L}\\p{N}_])`, "iu").test(p.texto))
        .map((p) => ({ ...p, respuestas: respuestas.filter((r) => r.respuestaA === p.id && visible(r)).length }));
    },
    async hilo(pid) {
      await espera();
      const p = lista.find((x) => x.id === pid);
      return p ? [p, ...respuestas.filter((r) => r.respuestaA === pid && visible(r))] : [];
    },
    async grupos() {
      return grupos.map((g) => ({ ...g }));
    },
    async temas() {
      const conteo = new Map<string, { tema: string; n: number }>();
      for (const p of lista.filter(visible))
        for (const m of new Set([...p.texto.matchAll(/#([\p{L}\p{N}_]{2,30})/gu)].map((x) => x[1]))) {
          const k = m.toLowerCase();
          conteo.set(k, { tema: conteo.get(k)?.tema ?? m, n: (conteo.get(k)?.n ?? 0) + 1 });
        }
      return [...conteo.values()].sort((a, b) => b.n - a.n || a.tema.localeCompare(b.tema)).slice(0, 5).map((c) => ({ tema: c.tema, publicaciones: c.n }));
    },
    async impacto() {
      return {
        publicaciones: lista.filter((p) => p.mia).length,
        comentarios: respuestas.filter((p) => p.mia).length,
        reacciones: lista.filter((p) => p.mia).reduce((s, p) => s + p.reacciones, 0),
      };
    },
    async desafios() {
      return desafios.map((d) => ({ ...d }));
    },
    async avance(did) {
      const d = desafios.find((x) => x.id === did);
      if (!d) return [];
      return Array.from({ length: d.diasTranscurridos }, (_, i) => {
        const f = new Date(`${d.inicio}T12:00:00`);
        f.setDate(f.getDate() + i);
        return { fecha: isoDia(f), cumplido: [0, 1, 2, 4, 5, 7, 8].includes(i) };
      });
    },
    async bloqueos() {
      return bloqueados.map((b) => ({ ...b }));
    },
    async publicar(p) {
      await espera();
      const g = grupos.find((x) => x.id === p.grupo);
      // Vista previa: el mismo intento no se publica dos veces.
      if (p.clienteId && intentos.has(p.clienteId)) return intentos.get(p.clienteId)!;
      // Las fotos elegidas se muestran desde la memoria del navegador; no se guardan en ninguna parte.
      const fotos = p.respuestaA ? [] : (p.fotos ?? []).map((f) => URL.createObjectURL(f));
      const nueva: Publicacion = {
        id: `n${id++}`, respuestaA: p.respuestaA ?? null, alias: yo, texto: p.texto.trim(), creadaEn: new Date().toISOString(), mia: true, respuestas: 0,
        grupoId: g?.id ?? null, grupo: g?.nombre ?? null, foto: fotos[0] ?? null, fotos, permiteComentarios: p.permiteComentarios ?? true,
        reacciones: 0, miReaccion: false, tipo: p.respuestaA ? "general" : p.tipo, guardada: false,
      };
      if (p.clienteId) intentos.set(p.clienteId, nueva.id);
      if (p.respuestaA) {
        const madre = lista.find((x) => x.id === p.respuestaA);
        nueva.grupoId = madre?.grupoId ?? null;
        nueva.grupo = madre?.grupo ?? null;
        respuestas = [...respuestas, nueva];
      } else lista = [nueva, ...lista];
      contar();
      return nueva.id;
    },
    async reaccionar(pid) {
      const p = encontrar(pid);
      if (!p) return false;
      p.miReaccion = !p.miReaccion;
      p.reacciones += p.miReaccion ? 1 : -1;
      return p.miReaccion;
    },
    async guardar(pid) {
      const p = lista.find((x) => x.id === pid);
      if (!p) return false;
      p.guardada = !p.guardada;
      return p.guardada;
    },
    async reportar() {
      await espera();
    },
    async bloquear(pid) {
      const p = encontrar(pid);
      if (p && !bloqueados.some((b) => b.alias === p.alias)) bloqueados.push({ alias: p.alias, desde: new Date().toISOString() });
    },
    async desbloquear(alias) {
      const i = bloqueados.findIndex((b) => b.alias === alias);
      if (i >= 0) bloqueados.splice(i, 1);
    },
    async borrar(pid) {
      lista = lista.filter((p) => p.id !== pid);
      respuestas = respuestas.filter((p) => p.id !== pid);
      contar();
    },
    async unirmeGrupo(gid) {
      const g = grupos.find((x) => x.id === gid);
      if (g && !g.soyMiembro) Object.assign(g, { soyMiembro: true, miembros: g.miembros + 1, sugerido: false });
    },
    async salirGrupo(gid) {
      const g = grupos.find((x) => x.id === gid);
      if (g?.soyMiembro) Object.assign(g, { soyMiembro: false, miembros: g.miembros - 1 });
    },
    // Vista previa: alias de ejemplo (la base real solo entrega alias, y solo a quien es miembro).
    async miembrosGrupo(gid) {
      await espera();
      const g = grupos.find((x) => x.id === gid);
      if (!g) throw new ErrorBase(404, "grupo", "no_encontrado");
      if (!g.soyMiembro) throw new ErrorBase(403, "grupo", "no_miembro");
      const otros = ["Sofía", "Camila", "Matías", "Valentina", "Andrés", "Javiera", "Tomás", "Isidora", "Benjamín", "Antonia", "Martín", "Florencia", "Vicente", "Catalina"];
      return [
        { alias: yo, unidoEn: hace(24 * 6), soyYo: true },
        ...otros.slice(0, Math.max(g.miembros - 1, 0)).map((a, i) => ({ alias: a, unidoEn: hace(24 * (8 + i * 2)), soyYo: false })),
      ];
    },
    async proponerGrupo(nombre) {
      await espera();
      const n = nombre.trim();
      if (n.length < 2 || n.length > 60) throw new ErrorBase(400, "nombre", "largo");
      if (grupos.some((g) => g.nombre.toLowerCase() === n.toLowerCase())) throw new ErrorBase(409, "nombre", "en_uso");
      if (propuestas.filter((x) => x.estado === "pendiente").length >= 3) throw new ErrorBase(429, "propuestas", "demasiadas");
      propuestas.unshift({ id: `pr${++id}`, nombre: n, estado: "pendiente", creadaEn: new Date().toISOString() });
    },
    async misPropuestas() {
      return propuestas.map((x) => ({ ...x }));
    },
    async unirmeDesafio(did) {
      const d = desafios.find((x) => x.id === did);
      if (d && !d.participo) Object.assign(d, { participo: true, participantes: d.participantes + 1, diasCumplidos: 7 });
    },
    async salirDesafio(did) {
      const d = desafios.find((x) => x.id === did);
      if (d?.participo) Object.assign(d, { participo: false, participantes: d.participantes - 1, diasCumplidos: 0 });
    },
    async urlFoto(ruta) {
      return ruta.startsWith("blob:") ? ruta : null;
    },
    async guardarAlias() {
      await espera();
    },
    async aceptarReglas() {
      await espera();
    },
  };
}
