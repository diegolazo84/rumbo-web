// Matriz de acceso (Rumbo 2.0, A0): quién puede leer, escribir y ejecutar qué en la base.
// Corre en el Supabase local de CI después de pruebas/base/rls.mjs, que deja creadas las cuentas
// y los datos de prueba (equipo con TOTP, personas A, B y C con su espacio y el programa de A).
//
// Qué comprueba, tabla por tabla y función por función:
// 1. Inventario: toda tabla de public y privado tiene RLS y está declarada en TABLAS; toda
//    función que anon o authenticated pueden ejecutar está declarada en FUNCIONES. Una tabla o
//    función nueva sin declarar hace fallar la prueba: así nadie agrega acceso sin pensarlo.
// 2. Lectura, como cada rol: anon, persona A, persona B, equipo sin segundo factor (aal1) y
//    equipo con TOTP (aal2). Cada persona ve exactamente lo suyo (o un subconjunto, donde hay
//    filtros como «solo publicado»), nunca filas ajenas.
// 3. Escritura directa: fuera del equipo con aal2, nadie inserta, modifica ni borra en ninguna
//    tabla (las personas escriben solo con funciones). El equipo con aal2 modifica solo las
//    tablas de gestión.
// 4. Funciones del equipo: llamadas por A, B o el equipo con aal1, con identificadores reales de
//    A, responden «sin autorización» o no devuelven nada.
// 5. Esquema privado: anon y authenticated no tienen ningún permiso sobre sus tablas.
//
// Se hace en SQL, con el mismo rol y los mismos datos de sesión (request.jwt.claims) que pone
// la API. Cada intento va en una transacción que se deshace: la prueba no cambia datos.
// A1: agrega el dueño y dos coaches (X acompaña a A; Y, a B). Cada coach ve y trabaja solo con
// sus participantes; lo administrativo queda para el dueño.
// Uso: PGURL=postgresql://… node pruebas/base/matriz.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const PGURL = process.env.PGURL;
if (!PGURL) throw new Error("Falta PGURL.");

// ---------------------------------------------------------------------------
// Lo esperado

// coach: qué hace un coach con sus participantes («suyos»), «propia» (su fila y la del dueño),
//        «todas» (todas las filas: material del equipo) o «nada».
// leer: «todos» (catálogo, también anon) · «con-sesion» (todas las filas, solo con sesión) ·
//       «destinatario» (cada cuenta ve solo las filas dirigidas a ella) · «equipo» (solo equipo con aal2) ·
//       «propio» (cada persona ve exactamente sus filas; el equipo con aal2, todas) ·
//       «propio-filtrado» (cada persona ve solo parte de sus filas, p. ej. lo publicado).
// escribir: «equipo» (el equipo con aal2 escribe directo) · «funciones» (nadie escribe directo).
const TABLAS = {
  areas: { leer: "todos", escribir: "equipo", coach: { leer: "nada", escribir: "nada" } },
  planes: { leer: "todos", escribir: "equipo", coach: { leer: "nada", escribir: "nada" } },
  niveles: { leer: "todos", escribir: "equipo", coach: { leer: "nada", escribir: "nada" } },
  reglas_creditos: { leer: "todos", escribir: "equipo", coach: { leer: "nada", escribir: "nada" } },
  avisos: { leer: "destinatario", escribir: "funciones", coach: { leer: "destinatario", escribir: "nada" } },
  modulos: { leer: "con-sesion", escribir: "funciones", coach: { leer: "con-sesion", escribir: "nada" } },
  feriados: { leer: "todos", escribir: "equipo", coach: { leer: "nada", escribir: "nada" } },
  ajustes_operacion: { leer: "equipo", escribir: "equipo", coach: { leer: "nada", escribir: "nada" } },
  solicitudes: { leer: "equipo", escribir: "equipo", coach: { leer: "nada", escribir: "nada" } },
  solicitudes_eventos: { leer: "equipo", escribir: "equipo", coach: { leer: "nada", escribir: "nada" } },
  mensajes_contacto: { leer: "equipo", escribir: "equipo", coach: { leer: "nada", escribir: "nada" } },
  acciones: { leer: "equipo", escribir: "equipo", coach: { leer: "suyos", escribir: "suyos" } },
  equipo: { leer: "equipo", escribir: "funciones", coach: { leer: "propia", escribir: "nada" } },
  auditoria: { leer: "equipo", escribir: "funciones", coach: { leer: "nada", escribir: "nada" } },
  participantes: { leer: "propio", escribir: "equipo", dueno: "id", coach: { leer: "suyos", escribir: "nada" } },
  ciclos: { leer: "propio", escribir: "equipo", coach: { leer: "suyos", escribir: "nada" } },
  peticiones_derechos: { leer: "propio", escribir: "equipo", coach: { leer: "nada", escribir: "nada" } },
  solicitudes_ajuste: { leer: "propio", escribir: "equipo", coach: { leer: "suyos", escribir: "suyos" } },
  ocurrencias: { leer: "propio", escribir: "funciones", coach: { leer: "suyos", escribir: "nada" } },
  registros: { leer: "propio", escribir: "funciones", coach: { leer: "suyos", escribir: "nada" } },
  progreso: { leer: "propio", escribir: "funciones", coach: { leer: "suyos", escribir: "nada" } },
  progreso_diario: { leer: "propio", escribir: "funciones", coach: { leer: "suyos", escribir: "nada" } },
  invitaciones_equipo: { leer: "equipo", escribir: "funciones", coach: { leer: "nada", escribir: "nada" } },
  pagos: { leer: "propio", escribir: "funciones", coach: { leer: "nada", escribir: "nada" } },
  videollamadas: { leer: "propio", escribir: "funciones", coach: { leer: "suyos", escribir: "nada" } },
  recordatorios: { leer: "propio", escribir: "funciones", coach: { leer: "nada", escribir: "nada" } },
  alias: { leer: "propio", escribir: "funciones", coach: { leer: "suyos", escribir: "nada" } },
  publicaciones: { leer: "equipo", escribir: "funciones", dueno: "autor", coach: { leer: "nada", escribir: "nada" } },
  reportes_comunidad: { leer: "equipo", escribir: "funciones", dueno: "reportante", coach: { leer: "nada", escribir: "nada" } },
  reconocimientos: { leer: "con-sesion", escribir: "funciones", coach: { leer: "con-sesion", escribir: "nada" } },
  reconocimientos_otorgados: { leer: "propio", escribir: "funciones", coach: { leer: "suyos", escribir: "nada" } },
  beneficios: { leer: "equipo", escribir: "funciones", coach: { leer: "nada", escribir: "nada" } },
  beneficios_otorgados: { leer: "propio", escribir: "funciones", coach: { leer: "nada", escribir: "nada" } },
  plantillas_accion: { leer: "equipo", escribir: "funciones", coach: { leer: "todas", escribir: "nada" } },
  registros_semanales: { leer: "propio", escribir: "funciones", coach: { leer: "suyos", escribir: "nada" } },
  programas: { leer: "propio-filtrado", escribir: "equipo", coach: { leer: "suyos", escribir: "suyos" } }, // sin borradores
  metas: { leer: "propio-filtrado", escribir: "equipo", coach: { leer: "suyos", escribir: "suyos" } }, // solo de programas publicados
  revisiones: { leer: "propio-filtrado", escribir: "equipo", coach: { leer: "suyos", escribir: "suyos" } }, // solo publicadas
  asignaciones_coach: { leer: "equipo", escribir: "funciones", coach: { leer: "suyos", escribir: "nada" } },
};
const PRIVADAS = ["correos_equipo", "limites", "sales"];

// Funciones de public que la API deja ejecutar. «anon»: también sin sesión. «persona»: actúan
// solo sobre la ficha de quien llama. «equipo-error»: fallan sin equipo con aal2.
// «equipo-vacio»: sin equipo con aal2 no devuelven filas.
const FUNCIONES = {
  anon: ["ping", "estado_postulaciones", "enviar_solicitud", "ver_solicitud", "retirar_solicitud", "aceptar_acuerdo", "enviar_mensaje"],
  persona: [
    "soy_equipo", "mi_contexto", "marcar_accion", "desmarcar_accion", "dejar_pasar", "registrar_evidencia", "eliminar_evidencia",
    "guardar_registro_semanal", "pedir_ajuste", "actualizar_preferencias", "pedir_derecho", "exportar_mis_datos", "mi_coach",
    "adjuntar_foto", "quitar_foto", "guardar_recordatorios",
    "evolucion_semanal", "informe_ciclo", "mis_medibles", "anotar_cantidad",
    "guardar_alias", "participar_en_ranking", "ranking_semanal",
    "aceptar_reglas_comunidad", "publicar_en_comunidad", "borrar_mi_publicacion", "reportar_publicacion", "comunidad_publicaciones",
    "mis_reconocimientos", "mis_beneficios",
  ],
  "equipo-error": [
    "publicar_programa", "nuevo_borrador", "revisar_evidencia", "pausar_ciclo", "reanudar_ciclo", "crear_espacio",
    "nuevo_enlace_solicitud", "eliminar_participante", "asignar_coach", "ver_postulacion", "cambiar_modulo", "indicadores",
    "registrar_pago", "devolucion_sugerida", "registrar_devolucion",
    "invitar_coach", "revocar_invitacion", "cambiar_coach", "programar_videollamada", "anotar_videollamada",
    "moderar_publicacion", "guardar_reconocimiento", "guardar_beneficio", "otorgar_beneficio", "aplicar_beneficio",
  ],
  equipo: ["mi_rol_equipo", "actualizar_mi_perfil", "guardar_plantilla"],
  "con-sesion": ["modulo_visible", "marcar_avisos_leidos", "aceptar_invitacion_equipo"],
  "equipo-vacio": ["solapamientos", "carga_prevista", "bandeja_seguimiento"],
};
// Funciones de privado que authenticated necesita porque las usan las políticas de RLS.
const PRIVADO_EJECUTABLES = ["es_admin", "es_dueno", "es_coach", "gestiona", "puede_moderar", "foto_permitida", "mi_participante_id"];
// Del coach: las usa con sus participantes; con los de otro coach, «sin autorización».
const DEL_COACH = ["publicar_programa", "nuevo_borrador", "revisar_evidencia", "solapamientos", "carga_prevista", "ver_postulacion",
  "programar_videollamada", "anotar_videollamada"];

// ---------------------------------------------------------------------------
// SQL

function psql(consulta) {
  const r = spawnSync("psql", [PGURL, "-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose"], {
    input: `\\set VERBOSITY verbose\n${consulta}`,
    encoding: "utf8",
  });
  if (r.status === 0) return { ok: true, salida: r.stdout.trim() };
  const codigo = /ERROR:\s+([0-9A-Z]{5}):/.exec(r.stderr)?.[1] ?? "?????";
  return { ok: false, codigo, error: r.stderr.trim().split("\n")[0] };
}
const sql = (consulta) => {
  const r = psql(consulta);
  if (!r.ok) throw new Error(`${r.error}\n${consulta}`);
  return r.salida;
};
const lista = (consulta) => sql(consulta).split("\n").filter(Boolean);

// Una sentencia como un rol, igual que la API (rol de Postgres + request.jwt.claims), y deshecha.
function como(rol, sentencia) {
  const claims = rol.uid
    ? { sub: rol.uid, role: "authenticated", aal: rol.aal ?? "aal1" }
    : { role: "anon" };
  return psql(
    `begin;\nset local role ${rol.uid ? "authenticated" : "anon"};\n` +
      `select set_config('request.jwt.claims', '${JSON.stringify(claims)}', true) \\g /dev/null\n` +
      `${sentencia};\nrollback;`,
  );
}
const contar = (rol, desde) => {
  const r = como(rol, `select count(*) from ${desde}`);
  if (!r.ok) return { error: r.codigo };
  return { n: Number(r.salida) };
};

// ---------------------------------------------------------------------------
// Cuentas y datos de prueba (los deja rls.mjs)

// Cuentas de los coaches de prueba: solo la fila en auth.users (la prueba entra con el rol y los
// datos de sesión de la API; no necesita contraseña).
for (const correo of ["coach-x@example.com", "coach-y@example.com"])
  sql(`insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
       select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '${correo}', now(), now()
        where not exists (select 1 from auth.users where email = '${correo}')`);
const uid = (correo) => sql(`select id from auth.users where email = '${correo}'`);
const ROLES = {
  anon: { nombre: "anon" },
  A: { nombre: "persona A", uid: uid("persona-a@example.com") },
  B: { nombre: "persona B", uid: uid("persona-b@example.com") },
  aal1: { nombre: "equipo sin segundo factor", uid: uid("equipo-ci@example.com"), aal: "aal1" },
  aal2: { nombre: "dueño con TOTP", uid: uid("equipo-ci@example.com"), aal: "aal2" },
  X: { nombre: "coach X", uid: uid("coach-x@example.com"), aal: "aal2", coach: true },
  Y: { nombre: "coach Y", uid: uid("coach-y@example.com"), aal: "aal2", coach: true },
  Xaal1: { nombre: "coach X sin segundo factor", uid: uid("coach-x@example.com"), aal: "aal1" },
};
for (const r of Object.values(ROLES)) if ("uid" in r) assert.ok(r.uid, `falta la cuenta de ${r.nombre}: corre antes pruebas/base/rls.mjs`);
const ficha = (r) => sql(`select id from public.participantes where user_id = '${r.uid}'`);
ROLES.A.ficha = ficha(ROLES.A);
ROLES.B.ficha = ficha(ROLES.B);

// Equipo: X e Y entran como coaches; el dueño asigna A a X y B a Y con asignar_coach.
sql(`insert into public.equipo (user_id, nombre, rol) values ('${ROLES.X.uid}', 'Coach X', 'coach'), ('${ROLES.Y.uid}', 'Coach Y', 'coach')
     on conflict (user_id) do nothing`);
const confirmado = (rol, sentencia) => {
  const claims = { sub: rol.uid, role: "authenticated", aal: rol.aal };
  return psql(`begin;\nset local role authenticated;\nselect set_config('request.jwt.claims', '${JSON.stringify(claims)}', true) \\g /dev/null\n${sentencia};\ncommit;`);
};
for (const [p, c] of [[ROLES.A, ROLES.X], [ROLES.B, ROLES.Y]]) {
  const r = confirmado(ROLES.aal2, `select public.asignar_coach('${p.ficha}', '${c.uid}', 'Prueba de CI')`);
  assert.ok(r.ok, `el dueño no pudo asignar coach: ${r.error}`);
}
ROLES.X.suyos = [ROLES.A.ficha];
ROLES.Y.suyos = [ROLES.B.ficha];
const enLista = (ids) => `(${ids.map((i) => `'${i}'`).join(", ")})`;

// Filas que rls.mjs no crea, para que ninguna tabla quede vacía (una tabla vacía no prueba nada).
// Sin disparadores (session_replication_role): aquí solo importan las filas, no los avisos.
sql(`
set session_replication_role = replica;
insert into public.mensajes_contacto (motivo, correo, mensaje) values ('duda', 'contacto-ci@example.com', 'Mensaje de prueba de CI.');
insert into public.peticiones_derechos (origen, participante_id, correo, tipo, fecha_limite)
  select 'mi_espacio', p.id, p.correo, 'acceso', current_date + 30 from public.participantes p where p.id in ('${ROLES.A.ficha}', '${ROLES.B.ficha}');
insert into public.solicitudes_ajuste (participante_id, ciclo_id, tipo, texto)
  select c.participante_id, c.id, 'horarios', 'Prueba de CI: otro horario.' from public.ciclos c
   where c.participante_id in ('${ROLES.A.ficha}', '${ROLES.B.ficha}');
insert into public.pagos (participante_id, ciclo_id, monto, moneda, medio, pagado_en)
  select c.participante_id, c.id, c.precio_acordado_clp, 'CLP', 'transferencia', current_date from public.ciclos c
   where c.participante_id in ('${ROLES.A.ficha}', '${ROLES.B.ficha}') and c.precio_acordado_clp is not null
  on conflict (ciclo_id) do nothing;
insert into public.invitaciones_equipo (correo, nombre) values ('invitada-ci@example.com', 'Invitada de CI') on conflict do nothing;
insert into public.videollamadas (participante_id, ciclo_id, semana, programada_para, enlace)
  select c.participante_id, c.id, 1, now() + interval '2 days', 'https://meet.example.com/ci' from public.ciclos c
   where c.participante_id in ('${ROLES.A.ficha}', '${ROLES.B.ficha}')
  on conflict (ciclo_id, semana) do nothing;
insert into public.alias (participante_id, alias, en_ranking, ranking_aceptado_en)
  values ('${ROLES.A.ficha}', 'Alias A', true, now()), ('${ROLES.B.ficha}', 'Alias B', true, now()) on conflict do nothing;
insert into public.publicaciones (id, autor, texto) values ('00000000-0000-0000-0000-0000000000b1', '${ROLES.B.ficha}', 'Publicación de prueba de CI.')
  on conflict do nothing;
insert into public.reportes_comunidad (publicacion_id, reportante, motivo)
  values ('00000000-0000-0000-0000-0000000000b1', '${ROLES.A.ficha}', 'spam') on conflict do nothing;
insert into public.plantillas_accion (titulo, instrucciones, duracion_min, autor)
  values ('Caminar', 'Plantilla de prueba de CI.', 20, '${ROLES.aal2.uid}');
insert into public.reconocimientos_otorgados (participante_id, clave, referencia)
  values ('${ROLES.A.ficha}', 'primer_paso', 'unico'), ('${ROLES.B.ficha}', 'primer_paso', 'unico') on conflict do nothing;
insert into public.beneficios_otorgados (beneficio_id, participante_id, porcentaje, nota)
  select b.id, p.id, b.porcentaje, 'Semilla de CI' from public.beneficios b, public.participantes p
   where b.clave = 'renovacion_ciclo_completo' and p.id in ('${ROLES.A.ficha}', '${ROLES.B.ficha}');
insert into public.recordatorios (participante_id) values ('${ROLES.A.ficha}'), ('${ROLES.B.ficha}') on conflict do nothing;
`);

let pasos = 0;
const paso = (texto) => console.log(`  ${String(++pasos).padStart(2, "0")}. ${texto}`);
const fallas = [];
const exigir = (condicion, texto) => {
  if (!condicion) fallas.push(texto);
};

console.log("Matriz de acceso (Supabase local)");

// 1. Inventario --------------------------------------------------------------
const tablas = lista(`select c.relname || '|' || c.relrowsecurity::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','p') order by 1`).map((f) => f.split("|"));
for (const [t, rls] of tablas) {
  exigir(rls === "1", `public.${t} no tiene RLS`);
  exigir(t in TABLAS, `public.${t} no está declarada en TABLAS (pruebas/base/matriz.mjs)`);
}
for (const t of Object.keys(TABLAS)) exigir(tablas.some(([x]) => x === t), `TABLAS declara public.${t}, que no existe`);
const privadas = lista(`select c.relname || '|' || c.relrowsecurity::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'privado' and c.relkind in ('r','p') order by 1`).map((f) => f.split("|"));
for (const [t, rls] of privadas) {
  exigir(rls === "1", `privado.${t} no tiene RLS`);
  exigir(PRIVADAS.includes(t), `privado.${t} no está declarada en PRIVADAS`);
}
const vistas = lista(`select n.nspname || '.' || c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public','privado') and c.relkind in ('v','m')`);
exigir(vistas.length === 0, `hay vistas sin declarar (las vistas se saltan la RLS si no son security_invoker): ${vistas.join(", ")}`);

const ejecutables = (esquema, rol) =>
  lista(`select distinct p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = '${esquema}' and has_function_privilege('${rol}', p.oid, 'execute') order by 1`);
const declaradasAuth = [...FUNCIONES.anon, ...FUNCIONES.persona, ...FUNCIONES["equipo-error"], ...FUNCIONES["equipo-vacio"], ...FUNCIONES.equipo, ...FUNCIONES["con-sesion"]].sort();
const igual = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const dif = (a, b) => `sobran: ${a.filter((x) => !b.includes(x)).join(", ") || "—"}; faltan: ${b.filter((x) => !a.includes(x)).join(", ") || "—"}`;
const anonPuede = ejecutables("public", "anon");
const authPuede = ejecutables("public", "authenticated");
exigir(igual(anonPuede, FUNCIONES.anon), `funciones que anon ejecuta en public no coinciden con FUNCIONES.anon (${dif(anonPuede, FUNCIONES.anon)})`);
exigir(igual(authPuede, declaradasAuth), `funciones que authenticated ejecuta en public no coinciden con FUNCIONES (${dif(authPuede, declaradasAuth)})`);
exigir(ejecutables("privado", "anon").length === 0, `anon ejecuta funciones de privado: ${ejecutables("privado", "anon").join(", ")}`);
const privAuth = ejecutables("privado", "authenticated");
exigir(igual(privAuth, PRIVADO_EJECUTABLES), `authenticated ejecuta en privado algo distinto de lo declarado (${dif(privAuth, PRIVADO_EJECUTABLES)})`);
paso(`inventario: ${tablas.length} tablas de public y ${privadas.length} de privado con RLS y declaradas; ${authPuede.length} funciones declaradas`);

// 2. Lectura ----------------------------------------------------------------
// De qué participante es una fila (acciones no tiene la columna: se mira su programa).
const duenoDe = (t, x) =>
  t === "participantes" ? `${x}.id` : t === "acciones" ? `(select g.participante_id from public.programas g where g.id = ${x}.programa_id)` : `${x}.participante_id`;
for (const [t, regla] of Object.entries(TABLAS)) {
  const col = regla.dueno ?? "participante_id";
  const total = Number(sql(`select count(*) from public.${t}`));
  exigir(total > 0, `public.${t} está vacía: la prueba de lectura no demuestra nada`);
  for (const [clave, rol] of Object.entries(ROLES)) {
    const vistos = contar(rol, `public.${t}`);
    const n = vistos.n ?? 0;
    const que = `${rol.nombre} lee public.${t}`;
    if (regla.leer === "todos") exigir(n === total, `${que}: ve ${n} de ${total} (catálogo: debe ver todo)`);
    else if (regla.leer === "destinatario") {
      const suyas = rol.uid ? Number(sql(`select count(*) from public.${t} where destinatario = '${rol.uid}'`)) : 0;
      const ajenas = rol.uid ? (contar(rol, `public.${t} where destinatario <> '${rol.uid}'`).n ?? 0) : n;
      exigir(ajenas === 0, `${que}: ve ${ajenas} filas dirigidas a otra cuenta`);
      exigir(n === suyas, `${que}: ve ${n} de sus ${suyas} filas`);
    } else if (regla.leer === "con-sesion")
      exigir(n === (clave === "anon" ? 0 : total), `${que}: ve ${n} de ${total} (con sesión: todo; sin sesión: nada)`);
    else if (rol.coach) {
      if (regla.coach.leer === "suyos") {
        const suyas = Number(sql(`select count(*) from public.${t} x where ${duenoDe(t, "x")} in ${enLista(rol.suyos)}`));
        exigir(n === suyas, `${que}: ve ${n} de las ${suyas} filas de sus participantes`);
        if (clave === "X") exigir(suyas > 0, `public.${t} no tiene filas de los participantes de ${rol.nombre}: la prueba quedó vacía`);
      } else if (regla.coach.leer === "todas") {
        exigir(n === (clave === "Xaal1" ? 0 : total), `${que}: ve ${n} de ${total} (material del equipo: todo con TOTP)`);
      } else if (regla.coach.leer === "propia") {
        const esperadas = Number(sql(`select count(*) from public.equipo where user_id = '${rol.uid}' or rol = 'dueno'`));
        exigir(n === esperadas, `${que}: ve ${n} filas (su fila y la del dueño: ${esperadas})`);
      } else exigir(n === 0, `${que}: ve ${n} filas (un coach no debe ver esta tabla)`);
    } else if (clave === "aal2") exigir(n === total, `${que}: ve ${n} de ${total} (el equipo con TOTP ve todo)`);
    else if (regla.leer === "equipo" || clave === "anon" || clave === "aal1" || clave === "Xaal1") exigir(n === 0, `${que}: ve ${n} filas (debe ver 0)`);
    else {
      const propias = Number(sql(`select count(*) from public.${t} where ${col} = '${rol.ficha}'`));
      const ajenas = contar(rol, `public.${t} where ${col} is distinct from '${rol.ficha}'`).n ?? 0;
      exigir(ajenas === 0, `${que}: ve ${ajenas} filas ajenas`);
      if (regla.leer === "propio") exigir(n === propias, `${que}: ve ${n} de sus ${propias} filas`);
      else exigir(n <= propias, `${que}: ve ${n} filas, más que sus ${propias}`);
    }
  }
}
// Que la prueba de «propio» sea real: A tiene filas propias donde rls.mjs le creó datos.
for (const t of ["participantes", "ciclos", "ocurrencias", "registros", "progreso", "programas", "metas", "revisiones", "solicitudes_ajuste"])
  exigir((contar(ROLES.A, `public.${t}`).n ?? 0) > 0, `persona A no ve ninguna fila suya en public.${t}: la prueba quedó vacía`);
paso(`lectura: ${Object.keys(TABLAS).length} tablas × ${Object.keys(ROLES).length} roles; cada persona ve solo lo suyo`);

// 3. Escritura directa ------------------------------------------------------
// Primera columna que se puede reasignar a sí misma (no de identidad ni generada).
const columnaDe = (t) =>
  sql(`select attname from pg_attribute where attrelid = 'public.${t}'::regclass and attnum > 0 and not attisdropped
         and attidentity = '' and attgenerated = '' order by attnum limit 1`);
const DENEGADO = "42501"; // permiso o RLS
for (const [t, regla] of Object.entries(TABLAS)) {
  const c = columnaDe(t);
  for (const [clave, rol] of Object.entries(ROLES)) {
    const que = `${rol.nombre} en public.${t}`;
    const ins = como(rol, `insert into public.${t} default values`);
    const upd = como(rol, `with x as (update public.${t} set ${c} = ${c} returning 1) select count(*) from x`);
    const del = como(rol, `with x as (delete from public.${t} returning 1) select count(*) from x`);
    if (rol.coach && regla.coach.escribir === "suyos") {
      const ajenas = como(rol, `with x as (update public.${t} y set ${c} = ${c} where ${duenoDe(t, "y")} not in ${enLista(rol.suyos)} returning 1) select count(*) from x`);
      exigir((ajenas.ok && Number(ajenas.salida) === 0) || ajenas.codigo === DENEGADO, `${que}: modifica filas de participantes ajenos (${ajenas.salida ?? ajenas.error})`);
      const borra = como(rol, `with x as (delete from public.${t} y where ${duenoDe(t, "y")} not in ${enLista(rol.suyos)} returning 1) select count(*) from x`);
      exigir((borra.ok && Number(borra.salida) === 0) || borra.codigo === DENEGADO, `${que}: borra filas de participantes ajenos (${borra.salida ?? borra.error})`);
      const hay = Number(sql(`select count(*) from public.${t} y where ${duenoDe(t, "y")} in ${enLista(rol.suyos)}`));
      const propias = hay === 0 ? { ok: false, codigo: "sin-filas" } : como(rol, `with x as (update public.${t} y set ${c} = ${c} where ${duenoDe(t, "y")} in ${enLista(rol.suyos)} returning 1) select count(*) from x`);
      if (hay > 0) exigir(!(propias.ok && Number(propias.salida) === 0) && propias.codigo !== DENEGADO, `${que}: no puede modificar lo de sus participantes (${propias.error ?? "0 filas"})`);
      continue;
    }
    if (clave === "aal2" && regla.escribir === "equipo") {
      // Puede escribir: la modificación no se rechaza por permisos y alcanza filas. (Un
      // disparador de reglas de negocio puede frenarla con otro código: también vale.)
      exigir(!(upd.ok && Number(upd.salida) === 0) && upd.codigo !== DENEGADO, `${que}: el equipo no puede modificar (${upd.error ?? "0 filas"})`);
      continue;
    }
    exigir(!ins.ok && ins.codigo === DENEGADO, `${que}: insertar no se rechaza por permisos (${ins.ok ? "se insertó" : ins.error})`);
    exigir((upd.ok && Number(upd.salida) === 0) || upd.codigo === DENEGADO, `${que}: modificar alcanza filas (${upd.salida ?? upd.error})`);
    exigir((del.ok && Number(del.salida) === 0) || del.codigo === DENEGADO, `${que}: borrar alcanza filas (${del.salida ?? del.error})`);
  }
}
paso("escritura directa: solo el equipo con TOTP escribe, y solo en las tablas de gestión");

// 4. Funciones del equipo ---------------------------------------------------
const deA = {
  p_programa: sql(`select id from public.programas where participante_id = '${ROLES.A.ficha}' order by version limit 1`),
  p_ciclo: sql(`select id from public.ciclos where participante_id = '${ROLES.A.ficha}'`),
  p_solicitud: sql(`select s.id from public.solicitudes s join public.participantes p on lower(p.correo) = lower(s.correo) where p.id = '${ROLES.A.ficha}' limit 1`),
  p_registro: sql(`select id from public.registros where participante_id = '${ROLES.A.ficha}' limit 1`),
  p_videollamada: sql(`select id from public.videollamadas where participante_id = '${ROLES.A.ficha}' limit 1`),
};
const argumento = (nombre, tipo) => {
  if (tipo === "uuid") return `'${deA[nombre] ?? ROLES.A.ficha}'::uuid`;
  if (tipo === "date") return "current_date";
  if (tipo === "timestamp with time zone") return "now() + interval '1 day'";
  if (tipo === "boolean") return "true";
  if (tipo === "jsonb") return "'{}'::jsonb";
  if (/int/.test(tipo)) return "1";
  return "'prueba de CI'";
};
const firmas = Object.fromEntries(
  lista(`select p.proname || '|' || coalesce(array_to_string(p.proargnames, ','), '') || '|' ||
      coalesce((select string_agg(format_type(x, null), ',' order by o) from unnest(p.proargtypes) with ordinality as u(x, o)), '')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'`).map((f) => {
    const [nombre, args, tipos] = f.split("|");
    const a = args ? args.split(",") : [];
    const ts = tipos ? tipos.split(",") : [];
    return [nombre, ts.map((t, i) => argumento(a[i], t)).join(", ")];
  }),
);
for (const clave of ["A", "B", "aal1", "Xaal1"]) {
  const rol = ROLES[clave];
  for (const f of FUNCIONES["equipo-error"]) {
    const r = como(rol, `select public.${f}(${firmas[f]})`);
    exigir(!r.ok && /no_autorizado/.test(r.error), `${rol.nombre} ejecuta ${f}: ${r.ok ? "funcionó" : r.error}`);
  }
  for (const f of FUNCIONES["equipo-vacio"]) {
    const r = como(rol, `select count(*) from public.${f}(${firmas[f]})`);
    exigir((r.ok && Number(r.salida) === 0) || !r.ok, `${rol.nombre} lee ${f}: ${r.salida} filas`);
  }
}
// Coaches: Y no usa con A ninguna función del equipo; X usa con A las de su trabajo, no las del dueño.
for (const f of FUNCIONES["equipo-error"]) {
  const y = como(ROLES.Y, `select public.${f}(${firmas[f]})`);
  exigir(!y.ok && /no_autorizado/.test(y.error), `coach Y ejecuta ${f} sobre A: ${y.ok ? "funcionó" : y.error}`);
  const x = como(ROLES.X, `select public.${f}(${firmas[f]})`);
  if (DEL_COACH.includes(f)) exigir(x.ok || !/no_autorizado/.test(x.error), `coach X no puede usar ${f} con A: ${x.error}`);
  else exigir(!x.ok && /no_autorizado/.test(x.error), `coach X ejecuta ${f}, que es solo del dueño: ${x.ok ? "funcionó" : x.error}`);
}
for (const f of FUNCIONES["equipo-vacio"]) {
  // Sin argumentos (la bandeja), la función devuelve lo de quien llama: se mira solo la fila de A.
  const filtroA = firmas[f] ? "" : ` where participante_id = '${ROLES.A.ficha}'`;
  const y = como(ROLES.Y, `select count(*) from public.${f}(${firmas[f]})${filtroA}`);
  exigir(!y.ok || Number(y.salida) === 0, `coach Y lee ${f} de A: ${y.salida} filas`);
}
const cargaX = como(ROLES.X, `select count(*) from public.carga_prevista(${firmas.carga_prevista})`);
exigir(cargaX.ok && Number(cargaX.salida) > 0, `coach X no ve la carga prevista de A (${cargaX.salida ?? cargaX.error})`);

// Asignaciones y roles: nadie cambia coach_id a mano, un coach no se cambia el rol y siempre queda un dueño.
for (const r of [ROLES.aal2, ROLES.X]) {
  const m = como(r, `with x as (update public.participantes set coach_id = '${ROLES.Y.uid}' where id = '${ROLES.A.ficha}' returning 1) select count(*) from x`);
  exigir(!m.ok || Number(m.salida) === 0, `${r.nombre} cambia el coach de A sin asignar_coach`);
}
const subir = como(ROLES.X, `with x as (update public.equipo set rol = 'dueno' where user_id = '${ROLES.X.uid}' returning 1) select count(*) from x`);
exigir((subir.ok && Number(subir.salida) === 0) || subir.codigo === DENEGADO, `coach X se cambia el rol a dueño (${subir.salida ?? subir.error})`);
const sinDueno = psql(`begin; update public.equipo set rol = 'coach'; rollback;`);
exigir(!sinDueno.ok && /sin_dueno/.test(sinDueno.error), "se puede dejar el equipo sin dueño");
const rolX = como(ROLES.X, "select public.mi_rol_equipo()->>'rol'");
exigir(rolX.salida === "coach", `mi_rol_equipo de X: ${rolX.salida ?? rolX.error}`);
const vigentes = Number(sql(`select count(*) from public.asignaciones_coach where hasta is null and participante_id in ${enLista([ROLES.A.ficha, ROLES.B.ficha])}`));
exigir(vigentes === 2, `asignaciones vigentes: ${vigentes} de 2`);

// Reasignar: A pasa de X a Y. X pierde el acceso al instante, Y lo gana, y queda el historial.
const tramosDeA = () =>
  sql(`select count(*) filter (where hasta is not null) || '/' || count(*) filter (where hasta is null)
         from public.asignaciones_coach where participante_id = '${ROLES.A.ficha}'`).split("/").map(Number);
const auditadasDeA = () => Number(sql(`select count(*) from public.auditoria where accion = 'asignar_coach' and fila = '${ROLES.A.ficha}'`));
const [cerradosAntes] = tramosDeA();
const auditadasAntes = auditadasDeA();
const reasignar = (c) => confirmado(ROLES.aal2, `select public.asignar_coach('${ROLES.A.ficha}', '${c.uid}', 'Prueba de CI: reasignación')`);
assert.ok(reasignar(ROLES.Y).ok, "el dueño no pudo reasignar a A");
const ciclosDeA = (r) => contar(r, `public.ciclos where participante_id = '${ROLES.A.ficha}'`).n ?? 0;
exigir(ciclosDeA(ROLES.X) === 0, "coach X sigue viendo a A después de la reasignación");
exigir(ciclosDeA(ROLES.Y) > 0, "coach Y no ve a A después de la reasignación");
const pubX = como(ROLES.X, `select public.nuevo_borrador(${firmas.nuevo_borrador})`);
exigir(!pubX.ok && /no_autorizado/.test(pubX.error), `coach X sigue trabajando el programa de A: ${pubX.error ?? "funcionó"}`);
const [cerrados, abiertos] = tramosDeA();
exigir(cerrados === cerradosAntes + 1 && abiertos === 1, `historial de A: ${cerrados} cerrados y ${abiertos} vigentes (esperado ${cerradosAntes + 1} y 1)`);
exigir(auditadasDeA() === auditadasAntes + 1, "la reasignación no quedó en la auditoría");
const leeHistorialY = contar(ROLES.Y, `public.asignaciones_coach where participante_id = '${ROLES.A.ficha}'`).n ?? 0;
exigir(leeHistorialY === cerrados + abiertos, `coach Y ve ${leeHistorialY} de ${cerrados + abiertos} tramos del historial de A`);
assert.ok(reasignar(ROLES.X).ok, "no se pudo devolver A a X");
paso("coaches: cada uno trabaja solo con sus participantes; al reasignar, el anterior pierde el acceso; asignar y cambiar roles es del dueño");

// A2 · Ver con motivo: la postulación original solo con motivo, y cada lectura queda registrada.
const ultima = (r) => (r.salida ?? "").split("\n").pop();
const corto = como(ROLES.X, `select public.ver_postulacion('${ROLES.A.ficha}', 'corto')`);
exigir(!corto.ok && /motivo:corto/.test(corto.error), `ver_postulacion acepta un motivo de menos de 10 caracteres: ${corto.error ?? "funcionó"}`);
const MOTIVO = "Preparar la revisión semanal (CI)";
// (La auditoría la lee solo el dueño: se cuenta como administrador de la base.)
const lecturas = () =>
  Number(sql(`select count(*) from public.auditoria where accion = 'ver_con_motivo' and actor = '${ROLES.X.uid}'
                and fila = '${ROLES.A.ficha}' and detalle->>'motivo' = '${MOTIVO}'`));
const lecturasAntes = lecturas();
const vista = confirmado(ROLES.X, `select public.ver_postulacion('${ROLES.A.ficha}', '${MOTIVO}')->>'meta'`);
exigir(vista.ok && /proyecto/.test(vista.salida), `coach X no lee la postulación de A con motivo: ${vista.error ?? vista.salida}`);
exigir(lecturas() === lecturasAntes + 1, "la lectura con motivo no quedó en la auditoría");
exigir((contar(ROLES.X, "public.auditoria").n ?? 0) === 0, "coach X lee la auditoría");
const directa = contar(ROLES.X, "public.solicitudes");
exigir(directa.n === 0, `coach X lee la tabla de postulaciones directo: ${directa.n} filas`);

// A2 · Auditoría de cambios: queda quién cambió qué campos, sin su contenido.
const cambio = como(ROLES.aal2, `update public.ciclos set foco_inicial = 'Prueba de auditoría' where participante_id = '${ROLES.A.ficha}';
  select count(*) from public.auditoria where tabla = 'ciclos' and accion = 'update' and actor = '${ROLES.aal2.uid}'
     and detalle->'campos' ? 'foco_inicial' and not (detalle::text like '%Prueba de auditoría%') and en = now()`);
exigir(cambio.ok && ultima(cambio) === "1", `un cambio del dueño en ciclos no quedó auditado (${cambio.error ?? ultima(cambio)})`);
const sinCambio = como(ROLES.aal2, `update public.ciclos set semanas = semanas where participante_id = '${ROLES.A.ficha}';
  select count(*) from public.auditoria where tabla = 'ciclos' and en = now()`);
exigir(sinCambio.ok && ultima(sinCambio) === "0", "una modificación sin cambios quedó en la auditoría");
paso("auditoría: cada cambio de gestión queda registrado; la postulación original solo se lee con motivo");

// A3 · Perfil del coach: cada uno edita el suyo; el participante ve solo a su coach.
const PRES = "Acompaño proyectos personales (CI).";
assert.ok(confirmado(ROLES.X, `select public.actualizar_mi_perfil('{"presentacion": "${PRES}"}'::jsonb)`).ok, "coach X no pudo editar su presentación");
const suCoach = como(ROLES.A, "select public.mi_coach()::text");
exigir(suCoach.ok && suCoach.salida.includes("Coach X") && suCoach.salida.includes(PRES) && !suCoach.salida.includes("@"),
  `persona A no ve a su coach (o ve de más): ${suCoach.salida ?? suCoach.error}`);
const otroCoach = como(ROLES.B, "select public.mi_coach()::text");
exigir(otroCoach.ok && otroCoach.salida.includes("Coach Y") && !otroCoach.salida.includes("Coach X"), `persona B ve al coach equivocado: ${otroCoach.salida}`);
assert.ok(confirmado(ROLES.Y, `select public.actualizar_mi_perfil('{"nombre": "Coach Y (editado)"}'::jsonb)`).ok, "coach Y no pudo editar su nombre");
exigir(sql(`select nombre from public.equipo where user_id = '${ROLES.X.uid}'`) === "Coach X", "editar el perfil propio cambió el de otro coach");
exigir(sql(`select nombre from public.equipo where user_id = '${ROLES.Y.uid}'`) === "Coach Y (editado)", "coach Y no cambió su propio nombre");
sql(`update public.equipo set nombre = 'Coach Y' where user_id = '${ROLES.Y.uid}'`);
const personaEdita = como(ROLES.A, `select public.actualizar_mi_perfil('{"nombre": "Intruso"}'::jsonb)`);
exigir(!personaEdita.ok && /no_autorizado/.test(personaEdita.error), "una persona participante edita perfiles del equipo");
paso("perfil del coach: cada coach edita el suyo; cada participante ve solo a su coach, sin datos de contacto");

// A4 · Módulos: solo el dueño cambia estados; no se habilita sin probar ni es operativo sin respaldo.
const estadoDe = (c) => sql(`select estado from public.modulos where clave = '${c}'`);
const habilitarSinProbar = como(ROLES.aal2, "select public.cambiar_modulo('comunidad', 'habilitado')");
exigir(!habilitarSinProbar.ok && /sin_probar/.test(habilitarSinProbar.error), `se habilita un módulo sin probar: ${habilitarSinProbar.error ?? "funcionó"}`);
const pasos4 = como(ROLES.aal2, `select public.cambiar_modulo('comunidad', 'probado');
  select public.cambiar_modulo('comunidad', 'habilitado');
  select public.modulo_visible('comunidad')`);
exigir(pasos4.ok && ultima(pasos4) === "t", `el dueño no pudo probar y habilitar un módulo: ${pasos4.error ?? ultima(pasos4)}`);
const sinRespaldo = como(ROLES.aal2, `select public.cambiar_modulo('comunidad', 'probado'); select public.cambiar_modulo('comunidad', 'operativo')`);
exigir(!sinRespaldo.ok && /respaldo:requerido/.test(sinRespaldo.error), "se marca operativo un módulo sin respaldo");
const coachCambia = como(ROLES.X, "select public.cambiar_modulo('comunidad', 'planificado')");
exigir(!coachCambia.ok && /no_autorizado/.test(coachCambia.error), "un coach cambia el estado de un módulo");
const personaVe = como(ROLES.A, "select public.modulo_visible('comunidad')");
exigir(personaVe.ok && personaVe.salida === "f", "un módulo planificado aparece como visible");
exigir(estadoDe("comunidad") === "planificado", "las pruebas de módulos dejaron cambios");
paso("módulos: solo el dueño cambia estados; no se habilita sin probar ni se marca operativo sin respaldo");

// A5 · Avisos sincronizados: los crea la base, cada cuenta ve y marca solo los suyos.
const avisosDe = (r, tipo, leidos = false) =>
  Number(sql(`select count(*) from public.avisos where destinatario = '${r.uid}' and tipo = '${tipo}' ${leidos ? "" : "and leido_en is null"}`));
// pedir_ajuste admite 5 por semana; las corridas anteriores de la matriz cuentan, así que se envejecen.
sql(`set session_replication_role = replica; update public.solicitudes_ajuste set creada_en = creada_en - interval '8 days' where participante_id = '${ROLES.A.ficha}'`);
const antesAjuste = avisosDe(ROLES.X, "ajuste_pedido");
const antesY = avisosDe(ROLES.Y, "ajuste_pedido");
const pide = confirmado(ROLES.A, `select public.pedir_ajuste('{"tipo": "horarios", "texto": "Prueba de CI: necesito otro horario."}'::jsonb)`);
exigir(pide.ok, `persona A no pudo pedir un ajuste: ${pide.error}`);
exigir(avisosDe(ROLES.X, "ajuste_pedido") === antesAjuste + 1, "el coach X no recibió el aviso del ajuste que pidió A");
exigir(avisosDe(ROLES.Y, "ajuste_pedido") === antesY, "el coach Y recibió un aviso de una persona que no acompaña");
const antesReg = avisosDe(ROLES.X, "registro_enviado");
const envia = confirmado(ROLES.A, `select public.guardar_registro_semanal(2::smallint, '{"carga": "justa", "funciono": "Prueba de CI."}'::jsonb, true)`);
exigir(!envia.ok || avisosDe(ROLES.X, "registro_enviado") === antesReg + 1, "el coach X no recibió el aviso del registro semanal de A");
const textos = sql(`select string_agg(titulo, ' | ') from public.avisos where participante_id = '${ROLES.A.ficha}'`);
exigir(!/Prueba de CI/.test(textos), "un aviso copia texto escrito por una persona");
const ajenaMarca = confirmado(ROLES.Y, `select public.marcar_avisos_leidos(array(select id from public.avisos where destinatario = '${ROLES.X.uid}'))`);
exigir(ajenaMarca.ok && ajenaMarca.salida === "0" && avisosDe(ROLES.X, "ajuste_pedido") > 0, "un coach marcó como leídos los avisos de otro");
const marca = confirmado(ROLES.X, "select public.marcar_avisos_leidos()");
exigir(marca.ok && Number(marca.salida) > 0, `coach X no pudo marcar sus avisos: ${marca.error ?? marca.salida}`);
// Otra sesión (otro dispositivo) de X ve lo mismo: ya no quedan sin leer.
exigir((contar(ROLES.X, "public.avisos where leido_en is null").n ?? -1) === 0, "lo leído no quedó leído para la otra sesión de X");
paso("avisos: los crea la base, llegan a quien corresponde y lo leído queda leído en todos los dispositivos");

// B3 · Indicadores: solo el dueño, cifras agregadas que cuadran con las tablas.
const ind = como(ROLES.aal2, "select public.indicadores(current_date - 30, current_date)::text");
exigir(ind.ok, `el dueño no pudo leer los indicadores: ${ind.error}`);
if (ind.ok) {
  const j = JSON.parse(ultima(ind));
  const post = Number(sql(`select count(*) from public.solicitudes where tipo = 'solicitud'
    and creada_en >= (current_date - 30)::timestamp at time zone 'America/Santiago'`));
  exigir(j.conversion.postulaciones === post, `postulaciones ${j.conversion.postulaciones} ≠ ${post} en la tabla`);
  exigir(j.cumplimiento.acciones_hechas <= j.cumplimiento.acciones_programadas || j.cumplimiento.acciones_programadas === 0,
    "hay más acciones hechas que programadas");
  exigir(!/@/.test(ultima(ind)), "los indicadores incluyen un correo");
  exigir(Array.isArray(j.no_disponible) && j.no_disponible.length === 4, "faltan los indicadores no disponibles");
}
const largo = como(ROLES.aal2, "select public.indicadores(current_date - 400, current_date)");
exigir(!largo.ok && /periodo/.test(largo.error), "los indicadores aceptan un periodo de más de un año");
paso("indicadores: solo el dueño; cifras agregadas que cuadran con las tablas y sin datos personales");

// B2 · Bandeja de seguimiento: cada coach ve solo a los suyos; el dueño, a todos.
const enBandeja = (r, ficha) => como(r, `select count(*) from public.bandeja_seguimiento() where participante_id = '${ficha}'`);
const activoA = Number(sql(`select count(*) from public.participantes p join public.ciclos c on c.participante_id = p.id
  where p.id = '${ROLES.A.ficha}' and p.estado = 'activo' and c.estado = 'activo' and c.inicio <= current_date`)) > 0;
const bx = enBandeja(ROLES.X, ROLES.A.ficha), by = enBandeja(ROLES.Y, ROLES.A.ficha), bd = enBandeja(ROLES.aal2, ROLES.A.ficha);
exigir(bx.ok && by.ok && bd.ok, `la bandeja falló: ${bx.error ?? by.error ?? bd.error}`);
exigir(!activoA || (bx.salida === "1" && bd.salida === "1"), `A no aparece en la bandeja de su coach o del dueño (${bx.salida}, ${bd.salida})`);
exigir(by.salida === "0", "el coach Y ve en su bandeja a una persona que no acompaña");
const ajenos = como(ROLES.X, "select count(*) from public.bandeja_seguimiento() b join public.participantes p on p.id = b.participante_id where p.coach_id is distinct from auth.uid()");
exigir(ajenos.ok && ajenos.salida === "0", "la bandeja del coach X incluye personas de otro coach");
paso("bandeja de seguimiento: cada coach ve solo a sus participantes; el dueño ve a todos");

// B4 · Pagos: solo el dueño registra; cada persona ve los suyos; la devolución no supera lo pagado.
const pagoA = sql(`select id from public.pagos where participante_id = '${ROLES.A.ficha}' limit 1`);
exigir(Boolean(pagoA), "no hay un pago de A para probar");
if (pagoA) {
  const cicloA = sql(`select ciclo_id from public.pagos where id = '${pagoA}'`);
  const doble = como(ROLES.aal2, `select public.registrar_pago('${cicloA}', 'transferencia', current_date)`);
  exigir(!doble.ok && /ya_registrado/.test(doble.error), "se registró dos veces el pago de un ciclo");
  const futuro = como(ROLES.aal2, `reset role; delete from public.pagos where id = '${pagoA}'; set local role authenticated;
    select public.registrar_pago('${cicloA}', 'transferencia', current_date + 1)`);
  exigir(!futuro.ok && /fecha/.test(futuro.error), "se registró un pago con fecha futura");
  const nuevo = como(ROLES.aal2, `reset role; delete from public.pagos where id = '${pagoA}'; set local role authenticated;
    select public.registrar_pago('${cicloA}', 'transferencia', current_date);
    select (monto = (select precio_acordado_clp from public.ciclos where id = '${cicloA}'))::int from public.pagos
     where ciclo_id = '${cicloA}'`);
  exigir(nuevo.ok && ultima(nuevo) === "1", `el pago no tomó el precio acordado del ciclo: ${nuevo.error ?? ultima(nuevo)}`);
  const sug = como(ROLES.aal2, `select public.devolucion_sugerida('${pagoA}') <= monto from public.pagos where id = '${pagoA}'`);
  exigir(sug.ok && ultima(sug) === "t", `la devolución sugerida supera lo pagado: ${sug.error ?? ultima(sug)}`);
  const demas = como(ROLES.aal2, `select public.registrar_devolucion('${pagoA}', monto + 1, 'otro') from public.pagos where id = '${pagoA}'`);
  exigir(!demas.ok && /monto/.test(demas.error), "se devolvió más de lo pagado");
  const parcial = como(ROLES.aal2, `select public.registrar_devolucion('${pagoA}', 1, 'semanas_no_empezadas');
    select devuelto from public.pagos where id = '${pagoA}'`);
  exigir(parcial.ok && ultima(parcial) === "1", `no se pudo registrar una devolución: ${parcial.error ?? ultima(parcial)}`);
  const export_ = como(ROLES.A, "select jsonb_array_length(public.exportar_mis_datos()->'pagos')");
  exigir(export_.ok && Number(export_.salida) >= 1, `la copia de mis datos no incluye los pagos: ${export_.error ?? export_.salida}`);
  const exportB = como(ROLES.B, `select count(*) from jsonb_array_elements(public.exportar_mis_datos()->'pagos') e where e->>'id' = '${pagoA}'`);
  exigir(exportB.ok && exportB.salida === "0", "la copia de datos de B incluye un pago de A");
}
paso("pagos: solo el dueño registra; un pago por ciclo, con el precio acordado; la devolución no supera lo pagado");

// B5 · Coaches: el dueño invita; la persona invitada acepta con su sesión; nadie más entra al equipo.
const correoNuevo = `coach-nuevo-${Date.now()}@example.com`;
const invita = confirmado(ROLES.aal2, `select public.invitar_coach('${correoNuevo}', 'Coach nuevo de CI', false)`);
exigir(invita.ok, `el dueño no pudo invitar a un coach: ${invita.error}`);
const duplicada = como(ROLES.aal2, `select public.invitar_coach('${correoNuevo}', 'Coach nuevo de CI')`);
exigir(!duplicada.ok && /ya_invitada/.test(duplicada.error), "se invitó dos veces al mismo correo");
const aParticipante = como(ROLES.aal2, "select public.invitar_coach('persona-a@example.com', 'Persona A')");
exigir(!aParticipante.ok && /es_participante/.test(aParticipante.error), "se invitó al equipo a una persona participante");
const sinInvitacion = como(ROLES.A, "select public.aceptar_invitacion_equipo()");
exigir(!sinInvitacion.ok && /no_encontrada/.test(sinInvitacion.error), "una persona sin invitación entró al equipo");
exigir(sql(`select count(*) from privado.correos_equipo where correo = '${correoNuevo}'`) === "1", "el correo invitado no quedó habilitado para entrar");
sql(`insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
     values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '${correoNuevo}', now(), now())`);
const NUEVO = { nombre: "coach nuevo", uid: uid(correoNuevo), aal: "aal2" };
const acepta = confirmado(NUEVO, "select public.aceptar_invitacion_equipo()->>'rol'");
exigir(acepta.ok && ultima(acepta) === "coach", `la persona invitada no pudo aceptar: ${acepta.error ?? ultima(acepta)}`);
const otraVez = como(NUEVO, "select public.aceptar_invitacion_equipo()");
exigir(!otraVez.ok && /no_encontrada/.test(otraVez.error), "una invitación se usó dos veces");
const nuevoVe = como(NUEVO, "select count(*) from public.participantes");
exigir(nuevoVe.ok && nuevoVe.salida === "0", "un coach recién llegado ve participantes sin tener asignados");
const conGente = como(ROLES.aal2, `select public.cambiar_coach('${ROLES.X.uid}', false, null)`);
exigir(!conGente.ok && /con_participantes/.test(conGente.error), "se desactivó un coach que aún tiene participantes");
const modera = como(ROLES.aal2, `select public.cambiar_coach('${NUEVO.uid}', null, true); select puede_moderar::int from public.equipo where user_id = '${NUEVO.uid}'`);
exigir(modera.ok && ultima(modera) === "1", `el dueño no pudo dar permiso de moderar: ${modera.error ?? ultima(modera)}`);
const xCambia = como(ROLES.X, `select public.cambiar_coach('${NUEVO.uid}', false, null)`);
exigir(!xCambia.ok && /no_autorizado/.test(xCambia.error), "un coach desactivó a otro");
const alDueno = como(ROLES.aal2, `select public.cambiar_coach('${ROLES.aal2.uid}', false, null)`);
exigir(!alDueno.ok && /no_encontrado/.test(alDueno.error), "cambiar_coach desactivó al dueño");
sql(`delete from public.equipo where user_id = '${NUEVO.uid}'; delete from privado.correos_equipo where correo = '${correoNuevo}';
     delete from auth.users where id = '${NUEVO.uid}'`);
paso("coaches: solo el dueño invita y cambia permisos; la invitación sirve una vez y solo a su correo; un coach con participantes no se desactiva");

// C1 · Foto opcional en cualquier acción: la persona la adjunta a una acción suya sin evidencia obligatoria.
const ocLibre = sql(`select o.id from public.ocurrencias o where o.participante_id = '${ROLES.A.ficha}' and not o.requiere_foto
  and o.vigente and o.fecha between current_date - (select dias_registro_tardio from public.ajustes_operacion) and current_date
  order by o.fecha desc limit 1`);
exigir(Boolean(ocLibre), "no hay una acción de A sin evidencia obligatoria para probar la foto opcional");
if (ocLibre) {
  const ruta = `${ROLES.A.ficha}/${ocLibre}/prueba-ci.jpg`;
  const conArchivo = (s_) => `reset role; insert into storage.objects (bucket_id, name) values ('evidencias', '${ruta}');
    set local role authenticated; ${s_}`;
  const puedeSubir = como(ROLES.A, `select privado.foto_permitida('${ruta}', true)::int`);
  exigir(puedeSubir.ok && ultima(puedeSubir) === "1", `A no puede subir una foto a una acción sin evidencia obligatoria: ${puedeSubir.error ?? ultima(puedeSubir)}`);
  const bSube = como(ROLES.B, `select privado.foto_permitida('${ruta}', true)::int`);
  exigir(bSube.ok && ultima(bSube) === "0", "B puede subir una foto a una acción de A");
  const adj = como(ROLES.A, conArchivo(`select public.adjuntar_foto('${ocLibre}', '${ruta}') \\g /dev/null
    select estado || ' ' || (foto_ruta is not null)::int from public.registros where ocurrencia_id = '${ocLibre}'`));
  exigir(adj.ok && ultima(adj) === "hecha 1", `A no pudo adjuntar una foto opcional: ${adj.error ?? ultima(adj)}`);
  const quita = como(ROLES.A, conArchivo(`select public.adjuntar_foto('${ocLibre}', '${ruta}') \\g /dev/null
    select public.quitar_foto('${ocLibre}') \\g /dev/null
    select estado || ' ' || (foto_ruta is not null)::int from public.registros where ocurrencia_id = '${ocLibre}'`));
  exigir(quita.ok && ultima(quita) === "hecha 0", `quitar la foto no dejó la acción hecha y sin foto: ${quita.error ?? ultima(quita)}`);
  const bAdj = como(ROLES.B, conArchivo(`select public.adjuntar_foto('${ocLibre}', '${ruta}')`));
  exigir(!bAdj.ok && /no_encontrada/.test(bAdj.error), "B adjuntó una foto a una acción de A");
  const ajena = como(ROLES.A, conArchivo(`select public.adjuntar_foto('${ocLibre}', '${ROLES.B.ficha}/${ocLibre}/x.jpg')`));
  exigir(!ajena.ok && /ruta_invalida/.test(ajena.error), "se adjuntó una foto con una ruta que no es de la acción");
}
paso("fotos: opcionales en cualquier acción, solo en las propias; la acción queda hecha y la foto se puede quitar");

// C2 · Videollamada del plan cercano: el coach de la persona la agenda y anota; nadie más.
{
  const cicloA = deA.p_ciclo;
  const cercano = `reset role; update public.ciclos set plan_id = 'cercano', hora_videollamada = '19:00' where id = '${cicloA}';
    set local role authenticated;`;
  const agendar = (semana, cuando = "now() + interval '3 days'", enlace = "https://meet.example.com/a") =>
    `select public.programar_videollamada('${cicloA}', ${semana}, ${cuando}, '${enlace}')`;
  const sinPlan = como(ROLES.X, agendar(2));
  exigir(!sinPlan.ok && /sin_videollamada/.test(sinPlan.error), `se agendó una videollamada en un plan sin videollamada: ${sinPlan.error ?? "funcionó"}`);
  const ok = como(ROLES.X, `${cercano} ${agendar(2)} \\g /dev/null
    reset role; select (select count(*) from public.videollamadas where ciclo_id = '${cicloA}' and semana = 2) || ' ' ||
           (select count(*) from public.avisos where participante_id = '${ROLES.A.ficha}' and tipo = 'videollamada_programada')`);
  exigir(ok.ok && ultima(ok) === "1 1", `el coach de A no pudo agendar su videollamada con aviso: ${ok.error ?? ultima(ok)}`);
  const otro = como(ROLES.Y, `${cercano} ${agendar(2)}`);
  exigir(!otro.ok && /no_autorizado/.test(otro.error), "otro coach agendó la videollamada de A");
  const persona = como(ROLES.A, `${cercano} ${agendar(2)}`);
  exigir(!persona.ok && /no_autorizado/.test(persona.error), "la persona se agendó su propia videollamada");
  const http = como(ROLES.X, `${cercano} ${agendar(2, undefined, "http://meet.example.com/a")}`);
  exigir(!http.ok && /enlace/.test(http.error), "se aceptó un enlace sin https");
  const fuera = como(ROLES.X, `${cercano} ${agendar(9)}`);
  exigir(!fuera.ok && /semana/.test(fuera.error), "se agendó una semana fuera del ciclo");
  const pasada = como(ROLES.X, `${cercano} ${agendar(2, "now() - interval '1 hour'")}`);
  exigir(!pasada.ok && /fecha/.test(pasada.error), "se agendó una videollamada en el pasado");
  const vid = deA.p_videollamada;
  const antes = como(ROLES.X, `select public.anotar_videollamada('${vid}', 'realizada')`);
  exigir(!antes.ok && /aun_no_ocurre/.test(antes.error), "se anotó como realizada una videollamada que aún no ocurre");
  const hecha = como(ROLES.X, `reset role; update public.videollamadas set programada_para = now() - interval '1 hour' where id = '${vid}';
    set local role authenticated; select public.anotar_videollamada('${vid}', 'realizada') \\g /dev/null
    select estado from public.videollamadas where id = '${vid}'`);
  exigir(hecha.ok && ultima(hecha) === "realizada", `el coach no pudo anotar la videollamada: ${hecha.error ?? ultima(hecha)}`);
  const re = como(ROLES.X, `${cercano} select public.anotar_videollamada('${vid}', 'cancelada') \\g /dev/null
    ${agendar(1)}`);
  exigir(!re.ok && /ya_registrada/.test(re.error), "se reprogramó una videollamada ya anotada");
  const yAnota = como(ROLES.Y, `select public.anotar_videollamada('${vid}', 'cancelada')`);
  exigir(!yAnota.ok && /no_autorizado/.test(yAnota.error), "otro coach anotó la videollamada de A");
  const exp = como(ROLES.A, "select jsonb_array_length(public.exportar_mis_datos()->'videollamadas')");
  exigir(exp.ok && Number(exp.salida) >= 1, `la copia de mis datos no incluye las videollamadas: ${exp.error ?? exp.salida}`);
}
paso("videollamadas: solo en el plan cercano; las agenda y anota el coach de la persona, con enlace https y aviso");

// D1 · Recordatorios: cada persona elige los suyos; la base los crea a su hora, sin repetir y nunca en pausa.
{
  const guarda = como(ROLES.A, `select public.guardar_recordatorios(true, false, 8) \\g /dev/null
    select acciones_del_dia::int || ' ' || registro_semanal::int || ' ' || hora from public.recordatorios`);
  exigir(guarda.ok && ultima(guarda) === "1 0 8", `A no pudo guardar sus recordatorios: ${guarda.error ?? ultima(guarda)}`);
  const hora = como(ROLES.A, "select public.guardar_recordatorios(true, true, 3)");
  exigir(!hora.ok && /hora/.test(hora.error), "se aceptó un recordatorio a las 3 de la mañana");
  const cicloA = deA.p_ciclo;
  // Escenario: «hoy» es el martes de la semana 1 del ciclo de A, la revisión es el miércoles y A tiene
  // una acción hoy sin marcar y el registro semanal sin enviar.
  const escenario = `set session_replication_role = replica;
    update public.ciclos set estado = 'activo', dia_revision = 3 where id = '${cicloA}';
    update public.recordatorios set acciones_del_dia = true, registro_semanal = true, hora = 20 where participante_id = '${ROLES.A.ficha}';
    delete from public.avisos where participante_id = '${ROLES.A.ficha}';
    delete from public.registros_semanales where ciclo_id = '${cicloA}' and semana = 1;
    delete from public.registros where ocurrencia_id = (select id from public.ocurrencias where participante_id = '${ROLES.A.ficha}' order by fecha limit 1);
    update public.ocurrencias set fecha = (select inicio + 1 from public.ciclos where id = '${cicloA}'), vigente = true
     where id = (select id from public.ocurrencias where participante_id = '${ROLES.A.ficha}' order by fecha limit 1)
       and not exists (select 1 from public.ocurrencias o2, public.ocurrencias o1 where o1.id = (select id from public.ocurrencias
         where participante_id = '${ROLES.A.ficha}' order by fecha limit 1) and o2.accion_id = o1.accion_id and o2.id <> o1.id
         and o2.fecha = (select inicio + 1 from public.ciclos where id = '${cicloA}'));
    set session_replication_role = origin;`;
  const hoy = `(select inicio + 1 from public.ciclos where id = '${cicloA}')`;
  const tipos = `select coalesce(string_agg(tipo, ',' order by tipo), '-') from public.avisos where participante_id = '${ROLES.A.ficha}'`;
  const r1 = psql(`begin; ${escenario}
    select privado.enviar_recordatorios(20, ${hoy}) \\g /dev/null
    ${tipos};
    select privado.enviar_recordatorios(20, ${hoy});
    select privado.enviar_recordatorios(21, ${hoy} + 1);
    rollback;`);
  const [creados, repetidos, otraHora] = (r1.salida ?? "").split("\n");
  exigir(r1.ok && creados === "recordatorio_acciones,recordatorio_registro", `no se crearon los dos recordatorios de A: ${r1.error ?? creados}`);
  exigir(repetidos === "0", `los recordatorios se repitieron el mismo día: ${repetidos}`);
  exigir(otraHora === "0", `llegaron recordatorios a una hora que A no eligió: ${otraHora}`);
  const pausa = psql(`begin; ${escenario}
    update public.ciclos set estado = 'pausado', pausa_motivo = 'pedida', pausa_desde = ${hoy} where id = '${cicloA}';
    select privado.enviar_recordatorios(20, ${hoy}); rollback;`);
  exigir(pausa.ok && pausa.salida === "0", `llegaron recordatorios con el ciclo en pausa: ${pausa.error ?? pausa.salida}`);
  const apagado = psql(`begin; ${escenario}
    update public.recordatorios set acciones_del_dia = false, registro_semanal = false where participante_id = '${ROLES.A.ficha}';
    select privado.enviar_recordatorios(20, ${hoy}); rollback;`);
  exigir(apagado.ok && apagado.salida === "0", `llegaron recordatorios apagados: ${apagado.error ?? apagado.salida}`);
  // D3 · Por correo (Brevo): sin claves en el Vault no sale nada; con claves, un correo por recordatorio, solo a quien lo eligió.
  const cola = "(select count(*) from net.http_request_queue where url = 'https://api.brevo.com/v3/smtp/email')";
  const conCorreo = `update public.recordatorios set por_correo = true where participante_id = '${ROLES.A.ficha}';`;
  const claves = "select vault.create_secret('clave-de-prueba', 'brevo_api_key') \\g /dev/null\n select vault.create_secret('rumbo-ci@example.com', 'correo_remitente') \\g /dev/null\n";
  const sinClaves = psql(`begin; ${escenario} ${conCorreo} select ${cola} \\g /dev/null
    select privado.enviar_recordatorios(20, ${hoy}) \\g /dev/null
    select ${cola}; rollback;`);
  const antesCola = sql(`select ${cola}`);
  exigir(sinClaves.ok && sinClaves.salida === antesCola, `sin claves de Brevo se encoló un correo: ${sinClaves.error ?? sinClaves.salida}`);
  const correoA = sql(`select correo from public.participantes where id = '${ROLES.A.ficha}'`);
  const conClaves = psql(`begin; ${escenario} ${conCorreo} ${claves}
    select privado.enviar_recordatorios(20, ${hoy}) \\g /dev/null
    select count(*) || ' ' || bool_and(convert_from(body, 'utf8') like '%${correoA}%' and headers->>'api-key' = 'clave-de-prueba')
      from net.http_request_queue where url = 'https://api.brevo.com/v3/smtp/email'; rollback;`);
  exigir(conClaves.ok && conClaves.salida === `${Number(antesCola) + 2} true`, `con claves no salieron los 2 correos a A: ${conClaves.error ?? conClaves.salida}`);
  const sinElegir = psql(`begin; ${escenario} ${claves}
    select privado.enviar_recordatorios(20, ${hoy}) \\g /dev/null
    select ${cola}; rollback;`);
  exigir(sinElegir.ok && sinElegir.salida === antesCola, `se envió un correo a quien no lo eligió: ${sinElegir.error ?? sinElegir.salida}`);
  const elige = como(ROLES.A, "select public.guardar_recordatorios(true, true, 9, true) \\g /dev/null\n select por_correo::int from public.recordatorios");
  exigir(elige.ok && ultima(elige) === "1", `A no pudo elegir recibir los recordatorios por correo: ${elige.error ?? ultima(elige)}`);
  const persona = como(ROLES.A, "select privado.enviar_recordatorios()");
  exigir(!persona.ok && persona.codigo === DENEGADO, "una persona puede disparar los recordatorios");
}
paso("recordatorios: apagados por defecto; cada persona elige los suyos; llegan a su hora, una vez al día y nunca en pausa; por correo solo con claves y a quien lo eligió");

// C3 · Evolución: resume lo que hay en la base; la ve la persona, su coach y el dueño.
{
  const cicloA = deA.p_ciclo;
  const enBase = sql(`select coalesce(sum(d.hechas), 0) || ' ' || coalesce(sum(d.programadas), 0) from public.progreso_diario d
    join public.ciclos c on c.id = '${cicloA}' where d.participante_id = '${ROLES.A.ficha}' and d.fecha between c.inicio and least(c.fin, current_date)`);
  exigir(enBase !== "0 0", "A no tiene progreso diario en su ciclo: la prueba de evolución quedó vacía");
  const suma = "select coalesce(sum(hechas), 0) || ' ' || coalesce(sum(programadas), 0) from";
  const propia = como(ROLES.A, `${suma} public.evolucion_semanal() where ciclo_id = '${cicloA}'`);
  exigir(propia.ok && propia.salida === enBase, `la evolución de A no cuadra con su progreso diario: ${propia.error ?? propia.salida} (base: ${enBase})`);
  const coach = como(ROLES.X, `${suma} public.evolucion_semanal('${ROLES.A.ficha}') where ciclo_id = '${cicloA}'`);
  exigir(coach.ok && coach.salida === enBase, `el coach de A no ve su evolución: ${coach.error ?? coach.salida}`);
  const dueno = como(ROLES.aal2, `${suma} public.evolucion_semanal('${ROLES.A.ficha}') where ciclo_id = '${cicloA}'`);
  exigir(dueno.ok && dueno.salida === enBase, `el dueño no ve la evolución de A: ${dueno.error ?? dueno.salida}`);
  for (const r of [ROLES.B, ROLES.Y, ROLES.aal1, ROLES.Xaal1]) {
    const x = como(r, `select count(*) from public.evolucion_semanal('${ROLES.A.ficha}')`);
    exigir(!x.ok && /no_autorizado/.test(x.error), `${r.nombre} ve la evolución de A: ${x.ok ? x.salida : x.error}`);
    const i = como(r, `select public.informe_ciclo('${cicloA}')`);
    exigir(!i.ok && /no_autorizado/.test(i.error), `${r.nombre} ve el informe del ciclo de A: ${i.ok ? "funcionó" : i.error}`);
  }
  const anon = como(ROLES.anon, "select count(*) from public.evolucion_semanal()");
  exigir(!anon.ok && anon.codigo === DENEGADO, "sin sesión se puede pedir la evolución");
  const informe = como(ROLES.A, `select (i->'acciones'->>'hechas') || ' ' || (i->'acciones'->>'programadas') || ' ' ||
      jsonb_array_length(i->'focos') from (select public.informe_ciclo('${cicloA}') i) x`);
  const focos = sql(`select count(*) from public.revisiones where ciclo_id = '${cicloA}' and publicada_en is not null`);
  exigir(informe.ok && informe.salida === `${enBase} ${focos}`, `el informe del ciclo de A no cuadra: ${informe.error ?? informe.salida} (base: ${enBase} ${focos})`);
}
paso("evolución: semanas e informe de ciclo cuadran con la base; solo los ven la persona, su coach y el dueño");

// C4 · Acciones medibles y plantillas.
{
  const oc = sql(`select o.id from public.ocurrencias o join public.registros r on r.ocurrencia_id = o.id and r.estado in ('hecha','aprobada')
    where o.participante_id = '${ROLES.A.ficha}' limit 1`);
  const ocSin = sql(`select o.id from public.ocurrencias o where o.participante_id = '${ROLES.A.ficha}'
    and not exists (select 1 from public.registros r where r.ocurrencia_id = o.id) limit 1`);
  exigir(Boolean(oc && ocSin), "A no tiene acciones marcadas y sin marcar para probar las medibles");
  const medible = (ids) => `reset role; set session_replication_role = replica;
    update public.acciones set cantidad_objetivo = 20, unidad = 'minutos' where id in (select accion_id from public.ocurrencias where id in (${ids}));
    set session_replication_role = origin; set local role authenticated;`;
  const noMedible = como(ROLES.A, `select public.anotar_cantidad('${oc}', 15)`);
  exigir(!noMedible.ok && /no_medible/.test(noMedible.error), "se anotó una cantidad en una acción que no es medible");
  const anota = como(ROLES.A, `${medible(`'${oc}'`)} select public.anotar_cantidad('${oc}', 15) \\g /dev/null
    select cantidad_objetivo || ' ' || unidad || ' ' || cantidad from public.mis_medibles(current_date - 92, current_date + 0) where ocurrencia_id = '${oc}'`);
  exigir(anota.ok && ultima(anota) === "20 minutos 15", `A no pudo anotar la cantidad: ${anota.error ?? ultima(anota)}`);
  const creditos = `select creditos from public.progreso where participante_id = '${ROLES.A.ficha}'`;
  const igual = como(ROLES.A, `${creditos}; ${medible(`'${oc}'`)} select public.anotar_cantidad('${oc}', 15) \\g /dev/null
    ${creditos}`);
  const [c0, c1] = (igual.salida ?? "").split("\n");
  exigir(igual.ok && c0 === c1, `anotar la cantidad cambió los créditos: ${igual.error ?? `${c0} → ${c1}`}`);
  const sinMarcar = como(ROLES.A, `${medible(`'${ocSin}'`)} select public.anotar_cantidad('${ocSin}', 5)`);
  exigir(!sinMarcar.ok && /sin_marcar/.test(sinMarcar.error), "se anotó una cantidad en una acción sin marcar");
  const bAnota = como(ROLES.B, `${medible(`'${oc}'`)} select public.anotar_cantidad('${oc}', 5)`);
  exigir(!bAnota.ok && /no_encontrada/.test(bAnota.error), "B anotó una cantidad en una acción de A");
  const bVe = como(ROLES.B, `${medible(`'${oc}'`)} select count(*) from public.mis_medibles(current_date - 92, current_date + 0) where ocurrencia_id = '${oc}'`);
  exigir(bVe.ok && ultima(bVe) === "0", "B ve lo medible de A");
  const negativa = como(ROLES.A, `${medible(`'${oc}'`)} select public.anotar_cantidad('${oc}', -1)`);
  exigir(!negativa.ok && /cantidad/.test(negativa.error), "se aceptó una cantidad negativa");

  const datos = `'{"titulo": "Respirar", "instrucciones": "Tres respiraciones lentas.", "duracion_min": 5, "cantidad_objetivo": 3, "unidad": "veces"}'`;
  const xCrea = como(ROLES.X, `select public.guardar_plantilla(null, ${datos}) \\g /dev/null
    select titulo || ' ' || unidad from public.plantillas_accion where autor = '${ROLES.X.uid}'`);
  exigir(xCrea.ok && ultima(xCrea) === "Respirar veces", `el coach no pudo crear una plantilla: ${xCrea.error ?? ultima(xCrea)}`);
  const plantillaDueno = sql(`select id from public.plantillas_accion where autor = '${ROLES.aal2.uid}' limit 1`);
  const xEdita = como(ROLES.X, `select public.guardar_plantilla('${plantillaDueno}', '{"titulo": "Otra"}')`);
  exigir(!xEdita.ok && /no_autorizado/.test(xEdita.error), "un coach editó la plantilla de otra persona");
  const duenoArchiva = como(ROLES.aal2, `select public.guardar_plantilla('${plantillaDueno}', '{"archivada": true}') \\g /dev/null
    select archivada::int from public.plantillas_accion where id = '${plantillaDueno}'`);
  exigir(duenoArchiva.ok && ultima(duenoArchiva) === "1", `el dueño no pudo archivar una plantilla: ${duenoArchiva.error ?? ultima(duenoArchiva)}`);
  const mala = como(ROLES.aal2, `select public.guardar_plantilla(null, '{"titulo": "X", "instrucciones": "a", "duracion_min": 5, "unidad": "veces"}')`);
  exigir(!mala.ok && /plantilla:invalida/.test(mala.error), "se aceptó una plantilla con unidad y sin cantidad");
  for (const r of [ROLES.A, ROLES.aal1, ROLES.Xaal1]) {
    const x = como(r, `select public.guardar_plantilla(null, ${datos})`);
    exigir(!x.ok && /no_autorizado/.test(x.error), `${r.nombre} creó una plantilla: ${x.ok ? "funcionó" : x.error}`);
  }
}
paso("medibles y plantillas: la cantidad se anota en lo propio ya marcado y no cambia créditos; las plantillas son del equipo");

// C5 · Alias y ranking semanal voluntario.
{
  const enUso = como(ROLES.A, "select public.guardar_alias('alias b')");
  exigir(!enUso.ok && /en_uso/.test(enUso.error), "A tomó el alias de B (sin distinguir mayúsculas)");
  const malo = como(ROLES.A, "select public.guardar_alias('<b>hola')");
  exigir(!malo.ok && /alias:invalido/.test(malo.error), "se aceptó un alias con símbolos");
  const cambia = como(ROLES.A, "select public.guardar_alias('Brisa del sur') \\g /dev/null\n select alias from public.alias");
  exigir(cambia.ok && ultima(cambia) === "Brisa del sur", `A no pudo cambiar su alias: ${cambia.error ?? ultima(cambia)}`);
  // Semana fija (lunes 5 de enero de 2026): A cumple 100 %, B y una tercera persona C, 50 %.
  const lunes = "'2026-01-05'::date";
  const semana = (conC) => `reset role; set session_replication_role = replica;
    update public.modulos set estado = 'habilitado' where clave = 'ranking';
    update public.participantes set estado = 'activo' where id in ('${ROLES.A.ficha}', '${ROLES.B.ficha}');
    delete from public.progreso_diario where fecha between ${lunes} and ${lunes} + 6;
    insert into public.progreso_diario (participante_id, fecha, programadas, hechas, en_revision, creditos_acciones, bono, racha)
      values ('${ROLES.A.ficha}', ${lunes}, 4, 5, 0, 0, 0, 0), ('${ROLES.B.ficha}', ${lunes}, 4, 2, 0, 0, 0, 0);
    ${conC ? `insert into public.participantes select (jsonb_populate_record(null::public.participantes, to_jsonb(p)
        || jsonb_build_object('id', '00000000-0000-0000-0000-00000000c0c0', 'user_id', null, 'correo', 'persona-c-ci@example.com'))).*
      from public.participantes p where p.id = '${ROLES.B.ficha}';
    insert into public.alias (participante_id, alias, en_ranking, ranking_aceptado_en) values ('00000000-0000-0000-0000-00000000c0c0', 'Alias C', true, now());
    insert into public.progreso_diario (participante_id, fecha, programadas, hechas, en_revision, creditos_acciones, bono, racha)
      values ('00000000-0000-0000-0000-00000000c0c0', ${lunes} + 2, 2, 1, 0, 0, 0, 0);` : ""}
    set session_replication_role = origin; set local role authenticated;`;
  const tabla = `select string_agg(puesto || ' ' || alias_publico || ' ' || cumplimiento || ' ' || soy_yo::int, ', ' order by puesto, alias_publico)
    from public.ranking_semanal(${lunes})`;
  const r3 = como(ROLES.A, `${semana(true)} ${tabla}`);
  exigir(r3.ok && ultima(r3) === "1 Alias A 100 1, 2 Alias B 50 0, 2 Alias C 50 0", `el ranking de la semana no es el esperado: ${r3.error ?? ultima(r3)}`);
  const r2 = como(ROLES.A, `${semana(false)} ${tabla}`);
  exigir(r2.ok && ultima(r2) === "", `con 2 participantes el ranking se mostró: ${r2.error ?? ultima(r2)}`);
  const dueno = como(ROLES.aal2, `${semana(true)} select count(*) from public.ranking_semanal(${lunes})`);
  exigir(dueno.ok && ultima(dueno) === "3", `el dueño no ve el ranking: ${dueno.error ?? ultima(dueno)}`);
  const sale = como(ROLES.A, `select public.participar_en_ranking(false) \\g /dev/null\n ${semana(true)} select count(*) from public.ranking_semanal(${lunes})`);
  exigir(!sale.ok && /no_participa/.test(sale.error), "quien salió del ranking lo sigue viendo");
  const fuera = como(ROLES.B, `${semana(true)} reset role; update public.alias set en_ranking = false where participante_id = '${ROLES.B.ficha}'; set local role authenticated;
    select count(*) from public.ranking_semanal(${lunes})`);
  exigir(!fuera.ok && /no_participa/.test(fuera.error), "quien no participa ve el ranking");
  const martes = como(ROLES.A, "select count(*) from public.ranking_semanal('2026-01-06')");
  exigir(!martes.ok && /semana/.test(martes.error), "se pidió el ranking de una semana que no parte el lunes");
  const anon = como(ROLES.anon, "select count(*) from public.ranking_semanal()");
  exigir(!anon.ok && anon.codigo === DENEGADO, "sin sesión se ve el ranking");
  const apagado = como(ROLES.A, `select count(*) from public.ranking_semanal(${lunes})`);
  exigir(!apagado.ok && /no_disponible/.test(apagado.error), "una persona ve el ranking sin que el dueño lo haya habilitado");
  const entrar = como(ROLES.A, "select public.participar_en_ranking(true)");
  exigir(!entrar.ok && /no_disponible/.test(entrar.error), "una persona entra al ranking sin que el dueño lo haya habilitado");
}
// C6 · Comunidad: solo con el módulo habilitado, alias y reglas; se publica con alias; moderación aparte.
{
  const abrir = `reset role; update public.modulos set estado = 'habilitado' where clave = 'comunidad';
    update public.participantes set estado = 'activo' where id in ('${ROLES.A.ficha}', '${ROLES.B.ficha}');
    update public.alias set reglas_comunidad_en = now(); set local role authenticated;`;
  const cerrada = como(ROLES.A, "select public.publicar_en_comunidad('Hola')");
  exigir(!cerrada.ok && /no_disponible/.test(cerrada.error), "se publicó con la comunidad sin habilitar");
  const sinReglas = como(ROLES.A, `${abrir} reset role; update public.alias set reglas_comunidad_en = null; set local role authenticated;
    select public.publicar_en_comunidad('Hola')`);
  exigir(!sinReglas.ok && /sin_reglas/.test(sinReglas.error), "se publicó sin aceptar las reglas");
  const acepta = como(ROLES.A, `${abrir} reset role; update public.alias set reglas_comunidad_en = null; set local role authenticated;
    select public.aceptar_reglas_comunidad() \\g /dev/null
    select public.publicar_en_comunidad('Primera publicación de A') is not null`);
  exigir(acepta.ok && ultima(acepta) === "t", `A no pudo publicar tras aceptar las reglas: ${acepta.error ?? ultima(acepta)}`);
  const feed = como(ROLES.A, `${abrir} select public.publicar_en_comunidad('Hola desde A') \\g /dev/null
    select string_agg(alias_publico || '|' || mia::int, ',' order by alias_publico) from public.comunidad_publicaciones()`);
  exigir(feed.ok && ultima(feed) === "Alias A|1,Alias B|0", `la comunidad no muestra lo esperado con alias: ${feed.error ?? ultima(feed)}`);
  const columnas = sql(`select string_agg(parameter_name, ',' order by ordinal_position) from information_schema.parameters
    where specific_name like 'comunidad_publicaciones%' and parameter_mode = 'OUT'`);
  exigir(!/autor|participante|nombre|correo/.test(columnas), `comunidad_publicaciones expone quién es quién: ${columnas}`);
  const directo = como(ROLES.A, `${abrir} select count(*) from public.publicaciones`);
  exigir(directo.ok && ultima(directo) === "0", "una persona lee la tabla de publicaciones directo (vería los autores)");
  const responde = como(ROLES.A, `${abrir} select public.publicar_en_comunidad('Respuesta de A', '00000000-0000-0000-0000-0000000000b1') \\g /dev/null
    select count(*) from public.comunidad_publicaciones('00000000-0000-0000-0000-0000000000b1')`);
  exigir(responde.ok && ultima(responde) === "2", `el hilo no muestra la publicación y su respuesta: ${responde.error ?? ultima(responde)}`);
  const borraAjena = como(ROLES.A, `${abrir} select public.borrar_mi_publicacion('00000000-0000-0000-0000-0000000000b1')`);
  exigir(!borraAjena.ok && /no_encontrada/.test(borraAjena.error), "A borró una publicación de B");
  const borra = como(ROLES.B, `${abrir} select public.borrar_mi_publicacion('00000000-0000-0000-0000-0000000000b1') \\g /dev/null
    select count(*) from public.comunidad_publicaciones()`);
  exigir(borra.ok && ultima(borra) === "0", `B no pudo borrar su publicación: ${borra.error ?? ultima(borra)}`);
  const reporta = como(ROLES.A, `${abrir} reset role; delete from public.reportes_comunidad; set local role authenticated;
    select public.reportar_publicacion('00000000-0000-0000-0000-0000000000b1', 'respeto') \\g /dev/null
    select public.reportar_publicacion('00000000-0000-0000-0000-0000000000b1', 'respeto') \\g /dev/null
    reset role; select count(*) || ' ' || (select count(*) from public.avisos where tipo = 'reporte_comunidad' and destinatario = '${ROLES.aal2.uid}')
    from public.reportes_comunidad`);
  exigir(reporta.ok && ultima(reporta) === "1 1", `el reporte no quedó una sola vez con un aviso al dueño: ${reporta.error ?? ultima(reporta)}`);
  const propia = como(ROLES.B, `${abrir} select public.reportar_publicacion('00000000-0000-0000-0000-0000000000b1', 'spam')`);
  exigir(!propia.ok && /no_encontrada/.test(propia.error), "una persona reportó su propia publicación");
  const oculta = como(ROLES.aal2, `select public.moderar_publicacion('00000000-0000-0000-0000-0000000000b1', true, 'respeto') \\g /dev/null
    select (select estado from public.publicaciones where id = '00000000-0000-0000-0000-0000000000b1') || ' ' ||
           (select count(*) from public.reportes_comunidad where publicacion_id = '00000000-0000-0000-0000-0000000000b1' and resolucion = 'ocultada')`);
  exigir(oculta.ok && ultima(oculta) === "oculta 1", `el dueño no pudo ocultar con motivo: ${oculta.error ?? ultima(oculta)}`);
  const sinMotivo = como(ROLES.aal2, "select public.moderar_publicacion('00000000-0000-0000-0000-0000000000b1', true)");
  exigir(!sinMotivo.ok && /motivo/.test(sinMotivo.error), "se ocultó una publicación sin motivo");
  const tras = como(ROLES.A, `${abrir} reset role; update public.publicaciones set estado = 'oculta', moderacion_motivo = 'respeto'
    where id = '00000000-0000-0000-0000-0000000000b1'; set local role authenticated;
    select count(*) from public.comunidad_publicaciones() where id = '00000000-0000-0000-0000-0000000000b1'`);
  exigir(tras.ok && ultima(tras) === "0", "una publicación oculta sigue visible");
  const modera = como(ROLES.X, `reset role; update public.equipo set puede_moderar = true where user_id = '${ROLES.X.uid}'; set local role authenticated;
    select public.moderar_publicacion('00000000-0000-0000-0000-0000000000b1', false) \\g /dev/null
    select count(*) from public.publicaciones`);
  exigir(modera.ok && Number(ultima(modera)) > 0, `un coach con permiso de moderar no pudo moderar: ${modera.error ?? ultima(modera)}`);
  const spam = como(ROLES.A, `${abrir} reset role; insert into public.publicaciones (autor, texto)
    select '${ROLES.A.ficha}', 'x' from generate_series(1, 20); set local role authenticated;
    select public.publicar_en_comunidad('una más')`);
  exigir(!spam.ok && /demasiadas/.test(spam.error), "no hay tope de publicaciones al día");
  const exp = como(ROLES.A, `${abrir} select public.publicar_en_comunidad('Para mi copia') \\g /dev/null
    select jsonb_array_length(public.exportar_mis_datos()->'publicaciones')`);
  exigir(exp.ok && Number(ultima(exp)) >= 1, `la copia de mis datos no incluye mis publicaciones: ${exp.error ?? ultima(exp)}`);
}
paso("comunidad: solo habilitada, con alias y reglas; se ve el alias, no quién es; reportes y moderación con motivo");

// E1 · Reconocimientos y beneficios. Fechas relativas al ciclo de A que deja rls.mjs.
{
  const cicloA = sql(`select id from public.ciclos where participante_id = '${ROLES.A.ficha}'`);
  const finA = `(select fin from public.ciclos where id = '${cicloA}')`;
  const otorgados = (quien) => `select coalesce(string_agg(clave, ',' order by clave), '') from public.reconocimientos_otorgados where participante_id = '${quien}'`;
  const base = `begin; delete from public.reconocimientos_otorgados;`;
  const r1 = psql(`${base} select privado.otorgar_reconocimientos(${finA} + 1) \\g /dev/null
    ${otorgados(ROLES.A.ficha)}; ${otorgados(ROLES.B.ficha)};
    select privado.otorgar_reconocimientos(${finA} + 1);
    select count(*) from public.avisos where tipo = 'reconocimiento'; rollback;`);
  const [a1, b1, otraVez, avisos1] = (r1.salida ?? "").split("\n");
  exigir(r1.ok && /ciclo_completado/.test(a1) && /primer_paso/.test(a1) && !/mitad_del_camino|meta_alcanzada/.test(a1),
    `los reconocimientos de A no son los esperados: ${r1.error ?? a1}`);
  exigir(r1.ok && b1 === "", `B recibió reconocimientos sin acciones hechas: ${b1}`);
  exigir(r1.ok && otraVez === "0", `los reconocimientos se repiten: ${otraVez}`);
  exigir(r1.ok && avisos1 === "0", `hubo avisos de reconocimiento con el módulo sin habilitar: ${avisos1}`);
  const r2 = psql(`${base} update public.modulos set estado = 'habilitado' where clave = 'reconocimientos';
    update public.reconocimientos set activo = false where clave = 'primer_paso';
    set session_replication_role = replica;
    update public.metas m set hitos = '[{"texto": "Hito de CI", "logrado": true}]' from public.programas g
     where g.id = m.programa_id and g.estado = 'publicado' and m.participante_id = '${ROLES.A.ficha}';
    insert into public.registros (ocurrencia_id, participante_id, estado)
      select o.id, o.participante_id, 'hecha' from public.ocurrencias o where o.ciclo_id = '${cicloA}' and o.vigente
         and not exists (select 1 from public.registros g where g.ocurrencia_id = o.id);
    update public.registros set estado = 'hecha' where participante_id = '${ROLES.A.ficha}';
    set session_replication_role = origin;
    select privado.otorgar_reconocimientos(${finA} + 1);
    ${otorgados(ROLES.A.ficha)};
    select count(*) from public.avisos where tipo = 'reconocimiento' and participante_id = '${ROLES.A.ficha}'; rollback;`);
  const [n2, a2, avisos2] = (r2.salida ?? "").split("\n");
  exigir(r2.ok && /meta_alcanzada/.test(a2) && /mitad_del_camino/.test(a2) && !/primer_paso/.test(a2),
    `con hitos logrados y la mitad hecha no se otorgó lo esperado (o se otorgó uno apagado): ${r2.error ?? a2}`);
  exigir(r2.ok && avisos2 === n2, `con el módulo habilitado, avisos ${avisos2} de ${n2} reconocimientos`);
  const cerrado = como(ROLES.A, "select count(*) from public.mis_reconocimientos()");
  exigir(!cerrado.ok && /no_disponible/.test(cerrado.error), "se ven los reconocimientos sin habilitar el módulo");
  const ver = como(ROLES.B, `reset role; update public.modulos set estado = 'habilitado' where clave = 'reconocimientos'; set local role authenticated;
    select string_agg(clave, ',') from public.mis_reconocimientos()`);
  exigir(ver.ok && ultima(ver) === "primer_paso", `B no ve solo lo suyo: ${ver.error ?? ultima(ver)}`);
  const xEdita = como(ROLES.X, `select public.guardar_reconocimiento('constancia', '{"umbral": 5}')`);
  exigir(!xEdita.ok && /no_autorizado/.test(xEdita.error), "un coach cambió un reconocimiento");
  const dEdita = como(ROLES.aal2, `select public.guardar_reconocimiento('constancia', '{"umbral": 5}') \\g /dev/null
    select umbral from public.reconocimientos where clave = 'constancia'`);
  exigir(dEdita.ok && ultima(dEdita) === "5", `el dueño no pudo ajustar el umbral: ${dEdita.error ?? ultima(dEdita)}`);
  const exp = como(ROLES.A, "select jsonb_array_length(public.exportar_mis_datos()->'reconocimientos')");
  exigir(exp.ok && Number(ultima(exp)) >= 1, `la copia de mis datos no incluye los reconocimientos: ${exp.error ?? ultima(exp)}`);

  // Beneficio: 10 % en la renovación por completar todas las acciones vigentes del ciclo de 28 días.
  const completo = `set session_replication_role = replica;
    insert into public.registros (ocurrencia_id, participante_id, estado)
      select o.id, o.participante_id, 'hecha' from public.ocurrencias o where o.ciclo_id = '${cicloA}' and o.vigente
         and not exists (select 1 from public.registros g where g.ocurrencia_id = o.id);
    update public.registros set estado = 'hecha' where participante_id = '${ROLES.A.ficha}';
    set session_replication_role = origin;`;
  const evaluar = (antes, fecha = `${finA} + 1`) =>
    psql(`begin; delete from public.beneficios_otorgados; ${antes} select privado.evaluar_beneficios(${fecha}); rollback;`).salida;
  const activar = "update public.beneficios set activo = true where clave = 'renovacion_ciclo_completo';";
  exigir(evaluar(completo) === "0", "se otorgó el beneficio estando apagado");
  exigir(evaluar(activar + completo) === "1", `con todo hecho no se otorgó el beneficio (${evaluar(activar + completo)})`);
  exigir(evaluar(activar + completo, finA) === "0", "se otorgó el beneficio antes de terminar el ciclo");
  const falta = `delete from public.registros where id = (select g.id from public.registros g join public.ocurrencias o on o.id = g.ocurrencia_id
    where o.ciclo_id = '${cicloA}' limit 1);`;
  exigir(evaluar(activar + completo + falta) === "0", "se otorgó el beneficio con una acción sin hacer");
  const anulada = `update public.ocurrencias set vigente = false, anulada_motivo = 'ajuste', anulada_en = current_date
    where id = (select o.id from public.ocurrencias o where o.ciclo_id = '${cicloA}' order by fecha desc limit 1);
    delete from public.registros where ocurrencia_id in (select id from public.ocurrencias where ciclo_id = '${cicloA}' and not vigente);`;
  exigir(evaluar(activar + completo + anulada) === "1", "una acción anulada por un ajuste autorizado impidió el beneficio");
  const doble = psql(`begin; ${activar} ${completo} select privado.evaluar_beneficios(${finA} + 1) \\g /dev/null
    select privado.evaluar_beneficios(${finA} + 1); rollback;`);
  exigir(doble.ok && ultima(doble) === "0", "el beneficio se otorgó dos veces por el mismo ciclo");

  const renovar = `reset role; ${activar} ${completo} select privado.evaluar_beneficios(${finA} + 1) \\g /dev/null
    update public.ciclos set estado = 'cerrado', cerrado_en = now() where id = '${cicloA}';
    set session_replication_role = replica;
    insert into public.ciclos (id, participante_id, numero, plan_id, inicio, semanas, fin, dia_revision, precio_acordado_clp)
      select '00000000-0000-0000-0000-0000000c1c02', participante_id, 2, plan_id, fin + 1, 4, fin + 28, dia_revision, 30000
        from public.ciclos where id = '${cicloA}';
    set session_replication_role = origin; set local role authenticated;`;
  const ganado = `(select id from public.beneficios_otorgados where ciclo_origen = '${cicloA}')`;
  const semilla = `(select id from public.beneficios_otorgados where participante_id = '${ROLES.A.ficha}' and ciclo_origen is null limit 1)`;
  const aplica = como(ROLES.aal2, `${renovar} select public.aplicar_beneficio(${ganado}, '00000000-0000-0000-0000-0000000c1c02') \\g /dev/null
    select public.registrar_pago('00000000-0000-0000-0000-0000000c1c02', 'transferencia', current_date) \\g /dev/null
    select (select descuento_clp from public.beneficios_otorgados where id = ${ganado}) || ' ' ||
           (select monto from public.pagos where ciclo_id = '00000000-0000-0000-0000-0000000c1c02')`);
  exigir(aplica.ok && ultima(aplica) === "3000 27000", `el 10 % no se aplicó a la renovación: ${aplica.error ?? ultima(aplica)}`);
  const acumula = como(ROLES.aal2, `${renovar} select public.aplicar_beneficio(${ganado}, '00000000-0000-0000-0000-0000000c1c02') \\g /dev/null
    select public.aplicar_beneficio(${semilla}, '00000000-0000-0000-0000-0000000c1c02')`);
  exigir(!acumula.ok && /no_acumulable/.test(acumula.error), "se sumaron dos beneficios en una renovación");
  const mismo = como(ROLES.aal2, `${renovar} select public.aplicar_beneficio(${ganado}, '${cicloA}')`);
  exigir(!mismo.ok && /no_es_renovacion|ya_registrado/.test(mismo.error), "el beneficio se aplicó al mismo ciclo que lo ganó");
  const dosVeces = como(ROLES.aal2, `${renovar} select public.aplicar_beneficio(${ganado}, '00000000-0000-0000-0000-0000000c1c02') \\g /dev/null
    select public.aplicar_beneficio(${ganado}, '00000000-0000-0000-0000-0000000c1c02')`);
  exigir(!dosVeces.ok && /ya_usado/.test(dosVeces.error), "un beneficio se usó dos veces");
  const xAplica = como(ROLES.X, `${renovar} select public.aplicar_beneficio(${ganado}, '00000000-0000-0000-0000-0000000c1c02')`);
  exigir(!xAplica.ok && /no_autorizado/.test(xAplica.error), "un coach aplicó un beneficio");

  const beneficio = `(select id from public.beneficios where clave = 'renovacion_ciclo_completo')`;
  const cambiaActivo = como(ROLES.aal2, `reset role; ${activar} set local role authenticated;
    select public.guardar_beneficio(${beneficio}, '{"porcentaje": 15}')`);
  exigir(!cambiaActivo.ok && /beneficio:activo/.test(cambiaActivo.error), "se cambió el porcentaje con el beneficio activo");
  const cambiaApagado = como(ROLES.aal2, `select public.guardar_beneficio(${beneficio}, '{"porcentaje": 15}') \\g /dev/null
    select porcentaje from public.beneficios where id = ${beneficio}`);
  exigir(cambiaApagado.ok && ultima(cambiaApagado) === "15", `el dueño no pudo ajustar el porcentaje: ${cambiaApagado.error ?? ultima(cambiaApagado)}`);
  const convenio = `select public.guardar_beneficio(null, '{"clave": "convenio_ci", "tipo": "convenio_tienda", "nombre": "Convenio de CI",
    "descripcion": "Descuento de prueba en una tienda.", "porcentaje": 5, "proveedor": "Tienda de CI"}') \\g /dev/null\n`;
  const convenioId = "(select id from public.beneficios where clave = 'convenio_ci')";
  const apagado = como(ROLES.aal2, `${convenio} select public.otorgar_beneficio(${convenioId}, '${ROLES.A.ficha}')`);
  exigir(!apagado.ok && /inactivo/.test(apagado.error), "se otorgó un beneficio del catálogo sin activarlo");
  const otorga = como(ROLES.aal2, `${convenio} select public.guardar_beneficio(${convenioId}, '{"activo": true}') \\g /dev/null
    select public.otorgar_beneficio(${convenioId}, '${ROLES.A.ficha}', 'Prueba') \\g /dev/null
    select count(*) from public.beneficios_otorgados where beneficio_id = ${convenioId}`);
  exigir(otorga.ok && ultima(otorga) === "1", `el dueño no pudo otorgar un convenio activo: ${otorga.error ?? ultima(otorga)}`);
  const auto = como(ROLES.aal2, `reset role; ${activar} set local role authenticated; select public.otorgar_beneficio(${beneficio}, '${ROLES.A.ficha}')`);
  exigir(!auto.ok && /automatico/.test(auto.error), "el descuento de renovación se otorgó a mano");
  const mios = como(ROLES.B, "select count(*) from public.mis_beneficios()");
  const suyos = sql(`select count(*) from public.beneficios_otorgados where participante_id = '${ROLES.B.ficha}'`);
  exigir(mios.ok && ultima(mios) === suyos, `B no ve exactamente sus beneficios: ${mios.error ?? ultima(mios)} de ${suyos}`);
}
paso("reconocimientos y beneficios: se otorgan solos y una vez; el 10 % exige todo lo vigente del ciclo, se usa en una renovación y no se acumula; solo el dueño configura");

paso("ranking: voluntario, solo con alias, por % de la semana; con menos de 3 no se muestra; quien sale deja de verlo");

paso(`funciones del equipo: ${FUNCIONES["equipo-error"].length + FUNCIONES["equipo-vacio"].length} rechazan a las personas y al equipo sin TOTP`);

// 5. Esquema privado --------------------------------------------------------
for (const t of PRIVADAS)
  for (const rol of ["anon", "authenticated"])
    for (const permiso of ["select", "insert", "update", "delete"])
      exigir(sql(`select has_table_privilege('${rol}', 'privado.${t}', '${permiso}')`) === "f", `${rol} tiene ${permiso} sobre privado.${t}`);
paso("esquema privado: sin permisos de tabla para anon ni authenticated");

if (fallas.length) {
  console.error(`\n${fallas.length} fallas:\n- ${fallas.join("\n- ")}`);
  process.exit(1);
}
console.log(`Matriz de acceso: ${pasos} pasos ok`);
