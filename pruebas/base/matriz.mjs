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

// coach: qué hace un coach con sus participantes («suyos»), «propia» (su fila y la del dueño) o «nada».
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
  pagos: { leer: "propio", escribir: "funciones", coach: { leer: "nada", escribir: "nada" } },
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
  ],
  "equipo-error": [
    "publicar_programa", "nuevo_borrador", "revisar_evidencia", "pausar_ciclo", "reanudar_ciclo", "crear_espacio",
    "nuevo_enlace_solicitud", "eliminar_participante", "asignar_coach", "ver_postulacion", "cambiar_modulo", "indicadores",
    "registrar_pago", "devolucion_sugerida", "registrar_devolucion",
  ],
  equipo: ["mi_rol_equipo", "actualizar_mi_perfil"],
  "con-sesion": ["modulo_visible", "marcar_avisos_leidos"],
  "equipo-vacio": ["solapamientos", "carga_prevista", "bandeja_seguimiento"],
};
// Funciones de privado que authenticated necesita porque las usan las políticas de RLS.
const PRIVADO_EJECUTABLES = ["es_admin", "es_dueno", "es_coach", "gestiona", "puede_moderar", "foto_permitida", "mi_participante_id"];
// Del coach: las usa con sus participantes; con los de otro coach, «sin autorización».
const DEL_COACH = ["publicar_programa", "nuevo_borrador", "revisar_evidencia", "solapamientos", "carga_prevista", "ver_postulacion"];

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
