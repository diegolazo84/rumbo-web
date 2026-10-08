// Prueba de RLS de la etapa 3 contra el Supabase local de CI (.github/workflows/base-de-datos.yml).
// Recorre el camino real con la API como la usa el navegador (clave anon + sesión de cada cuenta):
// solicitud → acuerdo → aceptación → espacio → programa publicado + borrador nuevo, y comprueba:
// - la persona ve exactamente su programa publicado; nunca el borrador ni sus metas ni las acciones;
// - otra persona no ve nada de ella ni puede marcar sus acciones;
// - el equipo sin segundo factor (aal1) no lee solicitudes ni administra; con TOTP (aal2) sí;
// - anon no lee tablas ni ejecuta las funciones de 07-etapa3.sql;
// - una ficha creada para una cuenta que ya existía queda vinculada (07-etapa3.sql).
// Las cuentas de prueba usan contraseña solo aquí (base local y efímera; la web no las usa).
// Uso: API_URL=http://127.0.0.1:54321 ANON_KEY=… PGURL=postgresql://… node pruebas/base/rls.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const API = process.env.API_URL ?? "http://127.0.0.1:54321";
const CLAVE = process.env.ANON_KEY;
const PGURL = process.env.PGURL;
if (!CLAVE || !PGURL) throw new Error("Faltan ANON_KEY o PGURL.");
const CONTRASENA = `ci-${randomBytes(12).toString("hex")}`;
const sql = (consulta) => execFileSync("psql", [PGURL, "-v", "ON_ERROR_STOP=1", "-At", "-c", consulta], { encoding: "utf8" }).trim();

const nuevoCliente = () => createClient(API, CLAVE, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const anon = nuevoCliente();

let pasos = 0;
const paso = (texto) => console.log(`  ${String(++pasos).padStart(2, "0")}. ${texto}`);

async function cuenta(correo) {
  const c = nuevoCliente();
  const r = await c.auth.signUp({ email: correo, password: CONTRASENA });
  if (r.error) throw new Error(`signUp ${correo}: ${r.error.message}`);
  if (!r.data.session) {
    const s = await c.auth.signInWithPassword({ email: correo, password: CONTRASENA });
    if (s.error) throw new Error(`signIn ${correo}: ${s.error.message}`);
  }
  return c;
}
async function entrar(correo) {
  const c = nuevoCliente();
  const s = await c.auth.signInWithPassword({ email: correo, password: CONTRASENA });
  if (s.error) throw new Error(`signIn ${correo}: ${s.error.message}`);
  return c;
}
const ok = (r, que) => {
  if (r.error) throw new Error(`${que}: ${r.error.message} (${r.status})`);
  return r.data;
};

// TOTP (RFC 6238) con el secreto base32 que entrega enroll.
function totp(secreto) {
  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secreto.replace(/=+$/, "").toUpperCase()].map((c) => alfabeto.indexOf(c).toString(2).padStart(5, "0")).join("");
  const clave = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const h = createHmac("sha1", clave).update(contador).digest();
  const o = h[h.length - 1] & 0xf;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

// Fechas en Chile, como la base (privado.hoy_chile).
const hoyChile = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const sumar = (iso, d) => {
  const f = new Date(`${iso}T12:00:00Z`);
  f.setUTCDate(f.getUTCDate() + d);
  return f.toISOString().slice(0, 10);
};
const isodow = (iso) => ((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;

const token = () => randomBytes(32).toString("base64url");
async function solicitud(nombre, correo) {
  const t = token();
  ok(
    await anon.rpc("enviar_solicitud", {
      p: {
        token: t, tipo: "solicitud", nombre, correo, area: "proyectos",
        meta: `Quiero ordenar mis semanas para terminar mi proyecto (${nombre}).`, apoyo: "coach",
        dias: ["lun"], franjas: ["tarde"], horarios_nota: null, zona_horaria: "America/Santiago",
        mayor_edad: true, autorizacion: true, texto_autorizacion: "Autorizo (prueba de CI).",
        avisos_futuros: false, origen: null, ms: 5000, campo_extra_7: "",
      },
    }),
    `enviar_solicitud ${correo}`,
  );
  return t;
}

console.log("RLS de la etapa 3 (Supabase local)");
const HOY = hoyChile();
const LUNES = sumar(HOY, 1 - isodow(HOY));
sql("update public.ajustes_operacion set limite_ip_hora = 100, limite_correo_dia = 100");

// 1. Equipo con segundo factor
const DIEGO = "equipo-ci@example.com";
const diego = await cuenta(DIEGO);
sql(`insert into public.equipo (user_id, nombre) select id, 'Equipo CI' from auth.users where email = '${DIEGO}' on conflict do nothing`);
assert.equal(ok(await diego.rpc("soy_equipo"), "soy_equipo"), true);
assert.equal(ok(await diego.from("solicitudes").select("id"), "solicitudes aal1").length, 0, "aal1 no debe leer solicitudes");
paso("cuenta del equipo sin segundo factor: soy_equipo sí, solicitudes no");
const factor = ok(await diego.auth.mfa.enroll({ factorType: "totp", friendlyName: "CI" }), "enroll");
const reto = ok(await diego.auth.mfa.challenge({ factorId: factor.id }), "challenge");
ok(await diego.auth.mfa.verify({ factorId: factor.id, challengeId: reto.id, code: totp(factor.totp.secret) }), "verify");
const aal = ok(await diego.auth.mfa.getAuthenticatorAssuranceLevel(), "aal");
assert.equal(aal.currentLevel, "aal2");
paso("TOTP inscrito y verificado: aal2");

// 2. Solicitudes → acuerdo → aceptación → espacio
const CORREO_C = "persona-c@example.com";
const c = await cuenta(CORREO_C); // la cuenta existe antes que su ficha (07: vincular_ficha)
const fichas = {};
for (const [clave, nombre, correo] of [["A", "Persona A", "persona-a@example.com"], ["B", "Persona B", "persona-b@example.com"], ["C", "Persona C", CORREO_C]]) {
  const t = await solicitud(nombre, correo);
  const s = ok(await diego.from("solicitudes").select("id").eq("correo", correo).single(), `leer solicitud ${clave}`);
  ok(
    await diego
      .from("solicitudes")
      .update({ estado: "acordada", acuerdo: { plan: "coach", precio_clp: 30000, inicio: LUNES, semanas: 4, dia_revision: 4, hora_videollamada: null } })
      .eq("id", s.id),
    `acordar ${clave}`,
  );
  const version = sql("select version_condiciones from public.ajustes_operacion");
  ok(await anon.rpc("aceptar_acuerdo", { p_token: t, p_version: version, p_texto: "Acepto (prueba de CI)." }), `aceptar ${clave}`);
  fichas[clave] = ok(await diego.rpc("crear_espacio", { p_solicitud: s.id }), `crear_espacio ${clave}`);
}
paso("tres solicitudes acordadas, aceptadas y con espacio");

const a = await cuenta("persona-a@example.com");
const b = await cuenta("persona-b@example.com");
assert.equal(ok(await a.from("participantes").select("id"), "A participantes").map((f) => f.id).join(), fichas.A);
assert.equal(ok(await c.from("participantes").select("id"), "C participantes").map((f) => f.id).join(), fichas.C, "la ficha de C debe quedar vinculada a su cuenta");
paso("cada cuenta ve solo su ficha; la cuenta previa quedó vinculada");

// 3. Programa de A: publicado v1 y borrador v2 con una meta secreta
const ciclo = ok(await diego.from("ciclos").select("id").eq("participante_id", fichas.A).single(), "ciclo A");
const v1 = ok(await diego.rpc("nuevo_borrador", { p_ciclo: ciclo.id }), "nuevo_borrador v1");
const meta = ok(
  await diego.from("metas").insert({ programa_id: v1, participante_id: fichas.A, titulo: "Terminar mi proyecto", categoria: "proyecto" }).select("id").single(),
  "meta v1",
);
ok(
  await diego.from("acciones").insert({
    programa_id: v1, meta_id: meta.id, titulo: "Escribir 15 minutos", instrucciones: "Abre el documento y escribe.",
    hora: null, duracion_min: 15, dias: [1, 2, 3, 4, 5, 6, 7], semana_desde: 1, semanas: 4,
  }),
  "acción v1",
);
const creadas = ok(await diego.rpc("publicar_programa", { p_programa: v1, p_vigente_desde: HOY, p_foco_inicial: "Empezar por lo importante." }), "publicar");
assert.ok(creadas > 0, "publicar debe crear ocurrencias");
const v2 = ok(await diego.rpc("nuevo_borrador", { p_ciclo: ciclo.id }), "nuevo_borrador v2");
ok(await diego.from("metas").insert({ programa_id: v2, participante_id: fichas.A, titulo: "BORRADOR SECRETO", categoria: "orden" }), "meta v2");
ok(await diego.from("programas").update({ nota_cambios: "BORRADOR SECRETO" }).eq("id", v2), "nota v2");
paso(`programa v1 publicado (${creadas} acciones en el calendario) y borrador v2 con una meta secreta`);

// 4. Lo que ve A
const progA = ok(await a.from("programas").select("id,version,estado,nota_cambios"), "A programas");
assert.deepEqual(progA.map((p) => [p.id, p.estado]), [[v1, "publicado"]], "A ve solo el programa publicado");
const metasA = ok(await a.from("metas").select("titulo,programa_id"), "A metas");
assert.deepEqual(metasA.map((m) => m.titulo), ["Terminar mi proyecto"]);
assert.ok(!JSON.stringify([progA, metasA]).includes("BORRADOR SECRETO"));
assert.equal(ok(await a.from("acciones").select("id"), "A acciones").length, 0, "la persona no lee acciones (usa ocurrencias)");
const ocA = ok(await a.from("ocurrencias").select("id,fecha,programa_id").order("fecha"), "A ocurrencias");
assert.ok(ocA.length > 0 && ocA.every((o) => o.programa_id === v1));
for (const t of ["solicitudes", "equipo", "solicitudes_eventos", "auditoria", "ajustes_operacion", "mensajes_contacto"])
  assert.equal(ok(await a.from(t).select("*"), `A ${t}`).length, 0, `A no lee ${t}`);
assert.equal(ok(await a.rpc("soy_equipo"), "A soy_equipo"), false);
const ctx = ok(await a.rpc("mi_contexto"), "A mi_contexto");
assert.equal(ctx.hoy, HOY);
paso("A ve su programa publicado y nunca el borrador, sus metas ni las acciones");

const deHoy = ocA.find((o) => o.fecha === HOY);
const prog = ok(await a.rpc("marcar_accion", { p_ocurrencia: deHoy.id, p_version: "completa" }), "marcar hoy");
assert.ok(prog.creditos >= 1);
const manana = ocA.find((o) => o.fecha > HOY);
if (manana) {
  const r = await a.rpc("marcar_accion", { p_ocurrencia: manana.id, p_version: "completa" });
  assert.equal(r.error?.message, "accion:futura");
  assert.equal(r.status, 409);
}
ok(await a.rpc("guardar_registro_semanal", { p_semana: 1, p: { carga: "justa", funciono: "Escribir temprano." }, p_enviar: true }), "registro semanal");
paso("A marca la acción de hoy (créditos del servidor) y no puede marcar mañana");

// 5. Lo que ve B de A: nada
for (const t of ["participantes", "ciclos", "programas", "metas", "ocurrencias", "registros", "progreso", "progreso_diario", "registros_semanales"]) {
  const filas = ok(await b.from(t).select("*").eq(t === "participantes" ? "id" : "participante_id", fichas.A), `B ${t}`);
  assert.equal(filas.length, 0, `B no debe ver ${t} de A`);
}
const ajena = await b.rpc("marcar_accion", { p_ocurrencia: deHoy.id, p_version: "completa" });
assert.equal(ajena.error?.message, "accion:no_encontrada");
paso("B no ve nada de A y no puede marcar sus acciones");

// 6. Equipo sin segundo factor y anon
const diegoAal1 = await entrar(DIEGO);
assert.equal(ok(await diegoAal1.from("programas").select("id"), "aal1 programas").length, 0);
const sinFactor = await diegoAal1.rpc("crear_espacio", { p_solicitud: fichas.A });
assert.equal(sinFactor.error?.message, "sesion:no_autorizado");
assert.ok(ok(await diego.from("programas").select("id").eq("ciclo_id", ciclo.id), "aal2 programas").length === 2, "con aal2 el equipo ve v1 y el borrador");
paso("equipo con aal1 no administra; con aal2 ve el borrador");

for (const t of ["participantes", "programas", "metas", "ocurrencias"]) {
  const r = await anon.from(t).select("*");
  assert.ok(r.error || r.data.length === 0, `anon no debe leer ${t}`);
}
for (const f of ["soy_equipo", "mi_contexto"]) {
  const r = await anon.rpc(f);
  assert.ok(r.error, `anon no debe ejecutar ${f}`);
}
paso("anon no lee tablas ni ejecuta soy_equipo ni mi_contexto");

console.log(`RLS de la etapa 3: ${pasos} pasos ok`);
