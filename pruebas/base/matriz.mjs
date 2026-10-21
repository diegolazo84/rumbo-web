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
// Etapa A1 (roles dueño y coach) agrega aquí sus roles y sus columnas.
// Uso: PGURL=postgresql://… node pruebas/base/matriz.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const PGURL = process.env.PGURL;
if (!PGURL) throw new Error("Falta PGURL.");

// ---------------------------------------------------------------------------
// Lo esperado

// leer: «todos» (catálogo, también anon) · «equipo» (solo equipo con aal2) ·
//       «propio» (cada persona ve exactamente sus filas; el equipo con aal2, todas) ·
//       «propio-filtrado» (cada persona ve solo parte de sus filas, p. ej. lo publicado).
// escribir: «equipo» (el equipo con aal2 escribe directo) · «funciones» (nadie escribe directo).
const TABLAS = {
  areas: { leer: "todos", escribir: "equipo" },
  planes: { leer: "todos", escribir: "equipo" },
  niveles: { leer: "todos", escribir: "equipo" },
  reglas_creditos: { leer: "todos", escribir: "equipo" },
  feriados: { leer: "todos", escribir: "equipo" },
  ajustes_operacion: { leer: "equipo", escribir: "equipo" },
  solicitudes: { leer: "equipo", escribir: "equipo" },
  solicitudes_eventos: { leer: "equipo", escribir: "equipo" },
  mensajes_contacto: { leer: "equipo", escribir: "equipo" },
  acciones: { leer: "equipo", escribir: "equipo" },
  equipo: { leer: "equipo", escribir: "funciones" },
  auditoria: { leer: "equipo", escribir: "funciones" },
  participantes: { leer: "propio", escribir: "equipo", dueno: "id" },
  ciclos: { leer: "propio", escribir: "equipo" },
  peticiones_derechos: { leer: "propio", escribir: "equipo" },
  solicitudes_ajuste: { leer: "propio", escribir: "equipo" },
  ocurrencias: { leer: "propio", escribir: "funciones" },
  registros: { leer: "propio", escribir: "funciones" },
  progreso: { leer: "propio", escribir: "funciones" },
  progreso_diario: { leer: "propio", escribir: "funciones" },
  registros_semanales: { leer: "propio", escribir: "funciones" },
  programas: { leer: "propio-filtrado", escribir: "equipo" }, // sin borradores
  metas: { leer: "propio-filtrado", escribir: "equipo" }, // solo de programas publicados
  revisiones: { leer: "propio-filtrado", escribir: "equipo" }, // solo publicadas
};
const PRIVADAS = ["correos_equipo", "limites", "sales"];

// Funciones de public que la API deja ejecutar. «anon»: también sin sesión. «persona»: actúan
// solo sobre la ficha de quien llama. «equipo-error»: fallan sin equipo con aal2.
// «equipo-vacio»: sin equipo con aal2 no devuelven filas.
const FUNCIONES = {
  anon: ["ping", "estado_postulaciones", "enviar_solicitud", "ver_solicitud", "retirar_solicitud", "aceptar_acuerdo", "enviar_mensaje"],
  persona: [
    "soy_equipo", "mi_contexto", "marcar_accion", "desmarcar_accion", "dejar_pasar", "registrar_evidencia", "eliminar_evidencia",
    "guardar_registro_semanal", "pedir_ajuste", "actualizar_preferencias", "pedir_derecho", "exportar_mis_datos",
  ],
  "equipo-error": [
    "publicar_programa", "nuevo_borrador", "revisar_evidencia", "pausar_ciclo", "reanudar_ciclo", "crear_espacio",
    "nuevo_enlace_solicitud", "eliminar_participante",
  ],
  "equipo-vacio": ["solapamientos", "carga_prevista"],
};
// Funciones de privado que authenticated necesita porque las usan las políticas de RLS.
const PRIVADO_EJECUTABLES = ["es_admin", "foto_permitida", "mi_participante_id"];

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

const uid = (correo) => sql(`select id from auth.users where email = '${correo}'`);
const ROLES = {
  anon: { nombre: "anon" },
  A: { nombre: "persona A", uid: uid("persona-a@example.com") },
  B: { nombre: "persona B", uid: uid("persona-b@example.com") },
  aal1: { nombre: "equipo sin segundo factor", uid: uid("equipo-ci@example.com"), aal: "aal1" },
  aal2: { nombre: "equipo con TOTP", uid: uid("equipo-ci@example.com"), aal: "aal2" },
};
for (const r of Object.values(ROLES)) if ("uid" in r) assert.ok(r.uid, `falta la cuenta de ${r.nombre}: corre antes pruebas/base/rls.mjs`);
const ficha = (r) => sql(`select id from public.participantes where user_id = '${r.uid}'`);
ROLES.A.ficha = ficha(ROLES.A);
ROLES.B.ficha = ficha(ROLES.B);

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
const declaradasAuth = [...FUNCIONES.anon, ...FUNCIONES.persona, ...FUNCIONES["equipo-error"], ...FUNCIONES["equipo-vacio"]].sort();
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
for (const [t, regla] of Object.entries(TABLAS)) {
  const col = regla.dueno ?? "participante_id";
  const total = Number(sql(`select count(*) from public.${t}`));
  exigir(total > 0, `public.${t} está vacía: la prueba de lectura no demuestra nada`);
  for (const [clave, rol] of Object.entries(ROLES)) {
    const vistos = contar(rol, `public.${t}`);
    const n = vistos.n ?? 0;
    const que = `${rol.nombre} lee public.${t}`;
    if (regla.leer === "todos") exigir(n === total, `${que}: ve ${n} de ${total} (catálogo: debe ver todo)`);
    else if (clave === "aal2") exigir(n === total, `${que}: ve ${n} de ${total} (el equipo con TOTP ve todo)`);
    else if (regla.leer === "equipo" || clave === "anon" || clave === "aal1") exigir(n === 0, `${que}: ve ${n} filas (debe ver 0)`);
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
};
const argumento = (nombre, tipo) => {
  if (tipo === "uuid") return `'${deA[nombre] ?? ROLES.A.ficha}'::uuid`;
  if (tipo === "date") return "current_date";
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
for (const clave of ["A", "B", "aal1"]) {
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
