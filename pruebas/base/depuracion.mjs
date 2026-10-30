// Borrado automático de fotos privadas (C21) contra el Supabase local de CI: base, Storage y la
// misma lógica que corre la Edge Function (supabase/functions/depurar-fotos/nucleo.js).
// Corre después de pruebas/base/rls.mjs, que deja a la persona A con su programa.
//
// Casos: revisada hace 31 días (se borra), hace 29 (se queda), en revisión (nunca), opcional
// vencida (se borra) y reciente (se queda), ruta compartida (se queda), fallo de Storage, fallo
// de la base después de borrar, reintento, huérfano viejo (se borra) y reciente (se queda),
// créditos y estados intactos, ejecución repetida sin efectos, una sola ejecución a la vez y la
// llave interna.
// La clave de servicio que usa es la de la base local y efímera de CI (supabase status).
// Uso: API_URL=… SERVICE_ROLE_KEY=… PGURL=… node pruebas/base/depuracion.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { adaptador, depurar } from "../../supabase/functions/depurar-fotos/nucleo.js";

const API = process.env.API_URL ?? "http://127.0.0.1:54321";
const CLAVE = process.env.SERVICE_ROLE_KEY;
const PGURL = process.env.PGURL;
if (!CLAVE || !PGURL) throw new Error("Faltan SERVICE_ROLE_KEY o PGURL.");
const sql = (consulta) => execFileSync("psql", [PGURL, "-X", "-v", "ON_ERROR_STOP=1", "-At", "-c", consulta], { encoding: "utf8" }).trim();
const sb = createClient(API, CLAVE, { auth: { persistSession: false, autoRefreshToken: false } });
const real = adaptador(sb);

let pasos = 0;
const paso = (texto) => console.log(`  ${String(++pasos).padStart(2, "0")}. ${texto}`);
console.log("Borrado automático de fotos (Supabase local)");

// ---------------------------------------------------------------------------
// Datos: acciones de A sin registro, una por caso.
const [A] = sql("select participante_id from public.progreso limit 1").split("\n");
const libres = sql(`select o.id from public.ocurrencias o where o.participante_id = '${A}'
  and not exists (select 1 from public.registros r where r.ocurrencia_id = o.id) order by o.fecha limit 16`).split("\n");
assert.ok(libres.length >= 15, "faltan acciones libres de A");
const WEBP = Buffer.from("RIFF\x1a\x00\x00\x00WEBPVP8L\x0d\x00\x00\x00\x2f\x00\x00\x00\x10\x07\x10\x11\x11\x88\x88\xfe\x07\x00", "latin1");

async function subir(oc) {
  const ruta = `${A}/${oc}/${randomUUID()}.webp`;
  const r = await sb.storage.from("evidencias").upload(ruta, WEBP, { contentType: "image/webp" });
  if (r.error) throw new Error(`subir: ${r.error.message}`);
  return ruta;
}
const existe = (ruta) => sql(`select count(*) from storage.objects where bucket_id = 'evidencias' and name = '${ruta}'`) === "1";
const fila = (id) => {
  const [estado, ruta, depurada, nota, revisado] = sql(
    `select estado, coalesce(foto_ruta, ''), (foto_depurada_en is not null)::text, coalesce(nota_revision, ''), coalesce(revisado_en::text, '')
       from public.registros where id = '${id}'`,
  ).split("|");
  return { estado, ruta, depurada: depurada === "true", nota, revisado };
};
// Registro con foto, como lo dejan las funciones de la app. Los días se fijan a mano.
async function registro(oc, { estado, dias, subidaHace = null, nota = null }) {
  const ruta = await subir(oc);
  const revisado = ["aprobada", "rechazada"].includes(estado) ? `now() - interval '${dias} days'` : "null";
  const id = sql(`insert into public.registros (ocurrencia_id, participante_id, estado, version, foto_ruta, nota_revision, revisado_en)
    values ('${oc}', '${A}', '${estado}', 'completa', '${ruta}', ${nota ? `'${nota}'` : "null"}, ${revisado}) returning id`)
    .split("\n")[0];
  if (subidaHace != null) sql(`update public.registros set foto_subida_en = now() - interval '${subidaHace} days' where id = '${id}'`);
  return { id, ruta };
}

const r31 = await registro(libres[0], { estado: "aprobada", dias: 31 });
const r29 = await registro(libres[1], { estado: "rechazada", dias: 29, nota: "Se ve otra cosa." });
const pendiente = await registro(libres[2], { estado: "en_revision", subidaHace: 60 });
const opcional = await registro(libres[3], { estado: "hecha", subidaHace: 31 });
const opcionalNueva = await registro(libres[4], { estado: "hecha", subidaHace: 10 });
const rechazada40 = await registro(libres[5], { estado: "rechazada", dias: 40, nota: "No corresponde." });
// Ruta compartida: dos registros apuntan al mismo archivo; uno vencido y otro no.
const compartida = await registro(libres[6], { estado: "aprobada", dias: 45 });
sql(`insert into public.registros (ocurrencia_id, participante_id, estado, version, foto_ruta, revisado_en)
  values ('${libres[7]}', '${A}', 'aprobada', 'completa', '${compartida.ruta}', now() - interval '1 day')`);
// Para los fallos y el reintento.
const fallaStorage = await registro(libres[8], { estado: "aprobada", dias: 35 });
const fallaBase = await registro(libres[9], { estado: "aprobada", dias: 33 });
// Huérfanos: sin registro, uno de hace 3 días y otro de hace 1 hora.
const huerfanoViejo = await subir(libres[10]);
const huerfanoNuevo = await subir(libres[11]);
sql(`update storage.objects set created_at = now() - interval '3 days' where bucket_id = 'evidencias' and name = '${huerfanoViejo}'`);
sql(`update storage.objects set created_at = now() - interval '1 hour' where bucket_id = 'evidencias' and name = '${huerfanoNuevo}'`);
sql("select privado.recalcular_progreso(participante_id) from public.progreso");
const progresoAntes = sql(`select creditos || ' ' || nivel || ' ' || racha from public.progreso where participante_id = '${A}'`);
const diarioAntes = sql(`select string_agg(fecha || ':' || hechas || ':' || en_revision || ':' || creditos_acciones, ',' order by fecha) from public.progreso_diario where participante_id = '${A}'`);
paso("datos: 10 fotos con plazos distintos, una ruta compartida y 2 archivos sin registro");

// ---------------------------------------------------------------------------
// La llave interna y los permisos.
const llave = sql("select decrypted_secret from vault.decrypted_secrets where name = 'depurar_fotos_llave'");
assert.equal(llave.length, 64, "la migración crea una llave de 32 bytes");
const ahora = () => Math.floor(Date.now() / 1000);
const firmar = (ts, origen) => sql(`select privado.depuracion_firma(${ts}, '${origen}')`);
const valida = async (ts, origen, firma) => (await sb.rpc("depuracion_firma_valida", { p_ts: ts, p_origen: origen, p_firma: firma })).data;
let ts = ahora();
const firma = firmar(ts, "manual");
assert.match(firma, /^[0-9a-f]{64}$/);
assert.notEqual(firma, llave, "la firma no es la llave");
assert.equal(await valida(ts, "programada", firma), false, "la firma no sirve para otro origen");
assert.equal(await valida(ts, "manual", "f".repeat(64)), false, "firma falsa");
assert.equal(await valida(ts, "manual", llave), false, "la llave misma no sirve como firma");
assert.equal(await valida(ts, "manual", firma), true);
assert.equal(await valida(ts, "manual", firma), false, "una firma sirve una sola vez");
ts = ahora() - 400;
assert.equal(await valida(ts, "programada", firmar(ts, "programada")), false, "una firma de hace más de 5 minutos venció");
ts = ahora() + 400;
assert.equal(await valida(ts, "programada", firmar(ts, "programada")), false, "una firma del futuro no sirve");
for (const rol of ["anon", "authenticated"]) {
  for (const f of ["depuracion_firma_valida(bigint, text, text)", "depuracion_iniciar(text)", "depuracion_lote(bigint, int)",
    "depuracion_confirmar(bigint, uuid[])", "depuracion_fallo(bigint, uuid[], text)", "depuracion_huerfanos()", "depuracion_terminar(bigint, int, text)"])
    assert.equal(sql(`select has_function_privilege('${rol}', 'public.${f}', 'execute')`), "f", `${rol} no ejecuta ${f}`);
  for (const f of ["depuracion_firma(bigint, text)", "lanzar_depuracion_fotos(text)", "vigilar_depuracion_fotos(timestamptz)", "estado_borrado_fotos(timestamptz)"])
    assert.equal(sql(`select has_function_privilege('${rol}', 'privado.${f}', 'execute')`), "f", `${rol} no ejecuta privado.${f}`);
  assert.equal(sql(`select has_table_privilege('${rol}', 'vault.decrypted_secrets', 'select')`), "f", `${rol} no lee Vault`);
  for (const t of ["depuracion_fotos", "depuracion_fotos_fallos", "depuracion_reservas", "depuracion_firmas"])
    assert.equal(sql(`select has_table_privilege('${rol}', 'privado.${t}', 'select')`), "f", `${rol} no lee privado.${t}`);
}
// Por la API: anónimo y con la clave pública no llegan a las funciones.
assert.ok(process.env.ANON_KEY, "falta ANON_KEY");
const anon = createClient(API, process.env.ANON_KEY, { auth: { persistSession: false } });
{
  for (const [fn, args] of [["depuracion_firma_valida", { p_ts: ahora(), p_origen: "manual", p_firma: "f".repeat(64) }],
    ["depuracion_iniciar", { p_origen: "manual" }], ["depuracion_huerfanos", {}], ["estado_depuracion_fotos", {}], ["pedir_depuracion_fotos", {}]]) {
    const r = await anon.rpc(fn, args);
    assert.ok(r.error, `anon no ejecuta ${fn}`);
  }
}
// La llave no aparece en las tareas programadas ni en lo que pg_net guarda.
assert.equal(sql(`select count(*) from cron.job where command like '%${llave}%'`), "0");
assert.equal(sql(`select count(*) from net._http_response where coalesce(content, '') like '%${llave}%'`), "0");
assert.equal(sql("select privado.lanzar_depuracion_fotos('programada') is null"), "t", "sin depurar_fotos_url no hace nada");
assert.equal(sql("select privado.estado_borrado_fotos()"), "sin_activar");
paso("llave en Vault que nunca viaja; firma de un solo uso, ligada al origen y que vence en 5 minutos; solo la clave de servicio usa las funciones; sin dirección, la tarea no hace nada");

// ---------------------------------------------------------------------------
// 1. Fallo de Storage (en una sola foto) y fallo de la base después de borrar (en otra).
const conFallos = {
  ...real,
  borrar: async (rutas) => {
    if (rutas.includes(fallaStorage.ruta)) {
      await real.borrar(rutas.filter((r) => r !== fallaStorage.ruta));
      throw Object.assign(new Error("storage"), { origen: "storage", statusCode: 503 });
    }
    return real.borrar(rutas);
  },
  confirmar: async (ej, ids) => {
    // La base «se cae» justo después de borrar el archivo de fallaBase.
    const sin = ids.filter((id) => id !== fallaBase.id);
    return real.confirmar(ej, sin);
  },
};
const primera = await depurar(conFallos, { origen: "programada" });
assert.equal(primera.estado, "con_errores", JSON.stringify(primera));
// Vencidas: r31, opcional, rechazada40, fallaStorage, fallaBase (compartida no: la usa otro).
assert.equal(primera.vencidas, 5);
assert.equal(primera.borradas, 3);
assert.equal(primera.fallidas, 2);
for (const r of [r31, opcional, rechazada40]) {
  assert.equal(existe(r.ruta), false, "archivo borrado");
  const f = fila(r.id);
  assert.equal(f.ruta, "");
  assert.equal(f.depurada, true);
}
assert.equal(fila(r31.id).estado, "aprobada");
assert.equal(fila(rechazada40.id).estado, "rechazada");
assert.equal(fila(rechazada40.id).nota, "No corresponde.");
assert.ok(fila(rechazada40.id).revisado, "la fecha de revisión se conserva");
assert.equal(fila(opcional.id).estado, "hecha");
// Fallo de Storage: el archivo sigue, el registro no se toca y queda anotado el fallo.
assert.equal(existe(fallaStorage.ruta), true);
assert.equal(fila(fallaStorage.id).ruta, fallaStorage.ruta);
assert.equal(fila(fallaStorage.id).depurada, false);
// Fallo de la base: el archivo ya no está, pero el registro no se anotó (se reintenta).
assert.equal(existe(fallaBase.ruta), false);
assert.equal(fila(fallaBase.id).ruta, fallaBase.ruta);
assert.equal(sql("select count(*) || ' ' || max(intentos) from privado.depuracion_fotos_fallos"), "2 1");
assert.match(sql("select string_agg(ultimo_error, ',') from privado.depuracion_fotos_fallos"), /storage:503/);
assert.doesNotMatch(sql("select string_agg(ultimo_error, ',') from privado.depuracion_fotos_fallos"), /\//, "sin rutas en los errores");
assert.equal(primera.registros_sin_archivo, 1, "el registro de fallaBase apunta a un archivo que ya no está");
paso("revisada hace 31 días, rechazada hace 40 y opcional vencida: archivo borrado, estado, nota y fecha de revisión intactos");
paso("fallo de Storage: el archivo y el registro quedan como estaban; fallo de la base: se anota para reintentar; errores sin rutas");

// Lo que no vence: 29 días, en revisión (aunque tenga 60 días) y opcional de 10 días; la ruta compartida.
for (const r of [r29, pendiente, opcionalNueva, compartida]) {
  assert.equal(existe(r.ruta), true, "sigue guardada");
  assert.equal(fila(r.id).depurada, false);
}
paso("revisada hace 29 días, en revisión hace 60, opcional de 10 días y ruta usada por otro registro: no se tocan");

// Huérfanos: el de hace 3 días se borra; el de hace 1 hora (subida en curso) no.
assert.equal(existe(huerfanoViejo), false);
assert.equal(existe(huerfanoNuevo), true);
assert.equal(primera.huerfanos_borrados, 1);
assert.equal(primera.archivos_sin_registro, 0);
paso("huérfano de hace 3 días borrado; el de hace 1 hora se respeta (período de seguridad de 48 h)");

// ---------------------------------------------------------------------------
// 2. Reintento: todo bien ahora.
const segunda = await depurar(real, { origen: "programada" });
assert.equal(segunda.estado, "ok", JSON.stringify(segunda));
assert.equal(segunda.borradas, 2);
assert.equal(segunda.fallidas, 0);
assert.equal(existe(fallaStorage.ruta), false);
assert.equal(fila(fallaStorage.id).depurada, true);
assert.equal(fila(fallaBase.id).depurada, true);
assert.equal(sql("select count(*) from privado.depuracion_fotos_fallos"), "0");
assert.equal(segunda.vencidas_guardadas, 0);
assert.equal(segunda.registros_sin_archivo, 0);
paso("reintento: las dos que fallaron quedan borradas y anotadas; sin fallos pendientes");

// 3. Repetir no cambia nada.
const antes = sql("select string_agg(id || estado || coalesce(foto_ruta,'') || coalesce(foto_depurada_en::text,''), ',' order by id) from public.registros");
const archivos = sql("select count(*) from storage.objects where bucket_id = 'evidencias'");
const tercera = await depurar(real, { origen: "manual" });
assert.equal(tercera.estado, "ok");
assert.equal(tercera.vencidas, 0);
assert.equal(tercera.borradas + tercera.fallidas + tercera.huerfanos_borrados, 0);
assert.equal(sql("select string_agg(id || estado || coalesce(foto_ruta,'') || coalesce(foto_depurada_en::text,''), ',' order by id) from public.registros"), antes);
assert.equal(sql("select count(*) from storage.objects where bucket_id = 'evidencias'"), archivos);
paso("ejecución repetida: nada que borrar y nada cambia");

// 4. Créditos, nivel, racha y días: iguales, también al recalcular.
sql("select privado.recalcular_progreso(participante_id) from public.progreso");
assert.equal(sql(`select creditos || ' ' || nivel || ' ' || racha from public.progreso where participante_id = '${A}'`), progresoAntes);
assert.equal(sql(`select string_agg(fecha || ':' || hechas || ':' || en_revision || ':' || creditos_acciones, ',' order by fecha) from public.progreso_diario where participante_id = '${A}'`), diarioAntes);
paso("créditos, nivel, racha y progreso de cada día: iguales antes y después (también al recalcular)");

// 5. Una sola ejecución a la vez; una colgada se da por interrumpida a los 15 minutos.
const id1 = await real.iniciar("programada");
assert.ok(id1);
assert.equal(await real.iniciar("programada"), null);
assert.deepEqual(await depurar(real), { estado: "omitida", motivo: "otra ejecución en curso" });
sql(`update privado.depuracion_fotos set iniciada_en = now() - interval '20 minutes' where id = ${id1}`);
const tras = await depurar(real);
assert.equal(tras.estado, "ok");
assert.equal(sql(`select estado || ' ' || error from privado.depuracion_fotos where id = ${id1}`), "fallida interrumpida");
paso("una sola ejecución a la vez; una colgada más de 15 minutos queda como interrumpida");

// 6. La ejecución que no puede seguir queda «fallida» y lo dice.
const rota = await depurar({ ...real, lote: async () => { throw Object.assign(new Error("x"), { origen: "base", code: "57014" }); } });
assert.equal(rota.estado, "fallida");
assert.equal(rota.error, "base:57014");
paso("si la base deja de responder a mitad de camino, la ejecución queda «fallida» con un código sin datos");

// 7. Plazo configurable: con 60 días, la de 31 no habría vencido.
const fotoConfig = await registro(libres[12], { estado: "aprobada", dias: 45 });
sql("update public.ajustes_operacion set dias_conservar_foto = 60");
assert.equal(sql("select count(*) from privado.fotos_con_plazo() where vence_en <= now()"), "0");
sql("update public.ajustes_operacion set dias_conservar_foto = null");
assert.equal(sql(`select count(*) from privado.fotos_con_plazo() where registro_id = '${fotoConfig.id}' and vence_en <= now()`), "1");
await depurar(real);
assert.equal(fila(fotoConfig.id).depurada, true);
paso("ajustes_operacion.dias_conservar_foto cambia el plazo; vacío, 30 días");

// 8. La fecha de subida la pone la base al cambiar la foto (fotos opcionales).
sql(`update public.registros set foto_ruta = '${opcionalNueva.ruta}x' where id = '${opcionalNueva.id}'`);
assert.equal(sql(`select (now() - foto_subida_en) < interval '1 minute' from public.registros where id = '${opcionalNueva.id}'`), "t");
sql(`update public.registros set foto_ruta = '${opcionalNueva.ruta}' where id = '${opcionalNueva.id}'`);
paso("al adjuntar o cambiar una foto, la base anota la fecha (base del plazo de las opcionales)");

// 9. Huérfano y registro al mismo tiempo: la ruta reservada no se puede registrar, y un registro
// hecho justo antes de reservar saca al archivo de la lista.
const carrera = await subir(libres[13]);
sql(`update storage.objects set created_at = now() - interval '3 days' where bucket_id = 'evidencias' and name = '${carrera}'`);
assert.deepEqual(((await sb.rpc("depuracion_huerfanos")).data ?? []).map((f) => f.ruta), [carrera]);
assert.throws(() => sql(`insert into public.registros (ocurrencia_id, participante_id, estado, version, foto_ruta)
  values ('${libres[13]}', '${A}', 'hecha', 'completa', '${carrera}')`), /evidencia:ruta_invalida/, "ruta reservada: no se registra");
sql("delete from privado.depuracion_reservas");
// Ahora el registro llega primero: al volver a buscar huérfanos, ese archivo ya no está en la lista.
sql(`insert into public.registros (ocurrencia_id, participante_id, estado, version, foto_ruta)
  values ('${libres[13]}', '${A}', 'hecha', 'completa', '${carrera}')`);
assert.deepEqual((await sb.rpc("depuracion_huerfanos")).data, []);
// Simultáneo de verdad: una transacción registra y espera; la búsqueda de huérfanos espera el
// candado y, al seguir, ve el registro.
sql(`delete from public.registros where ocurrencia_id = '${libres[13]}'`);
const { spawn } = await import("node:child_process");
const lenta = spawn("psql", [PGURL, "-X", "-v", "ON_ERROR_STOP=1", "-c", `begin; insert into public.registros (ocurrencia_id, participante_id, estado, version, foto_ruta)
  values ('${libres[13]}', '${A}', 'hecha', 'completa', '${carrera}'); select pg_sleep(2); commit;`]);
const termina = new Promise((ok) => lenta.on("exit", ok));
await new Promise((ok) => setTimeout(ok, 700));
assert.deepEqual((await sb.rpc("depuracion_huerfanos")).data, [], "esperó el candado y vio el registro");
assert.equal(await termina, 0);
assert.equal(existe(carrera), true);
paso("huérfano y registro simultáneos: candado por ruta, nueva comprobación y reserva; nunca se borra un archivo en uso");

// 10. Una foto vencida que la persona cambia mientras se borra: no queda como fallo falso.
const cambia = await registro(libres[14], { estado: "rechazada", dias: 40, nota: "No se ve la acción." });
const otro = { ...real, borrar: async (rutas) => {
  const n = await real.borrar(rutas);
  sql(`update public.registros set estado = 'en_revision', revisado_en = null, foto_ruta = '${cambia.ruta}-nueva' where id = '${cambia.id}'`);
  return n;
} };
const cuarta = await depurar(otro);
assert.equal(cuarta.fallidas, 0, JSON.stringify(cuarta));
assert.equal(sql("select count(*) from privado.depuracion_fotos_fallos"), "0");
assert.equal(fila(cambia.id).estado, "en_revision");
sql(`delete from public.registros where id = '${cambia.id}'`);
paso("foto cambiada o reenviada a revisión durante el borrado: no se toca ni queda como error");

// 11. Estado real y vigilancia.
sql("select vault.create_secret('http://127.0.0.1:9/no-existe', 'depurar_fotos_url')");
sql("delete from privado.depuracion_fotos");
assert.equal(sql("select privado.estado_borrado_fotos()"), "esperando", "recién activado");
// Tres días después, sin ninguna ejecución:
assert.equal(sql("select privado.estado_borrado_fotos(now() + interval '3 days')"), "detenida", "activado hace 3 días y sin ejecuciones");
assert.equal(sql("select privado.vigilar_depuracion_fotos(now() + interval '3 days')"), "detenida");
await depurar(real, { origen: "programada" });
assert.equal(sql("select privado.estado_borrado_fotos()"), "activa");
assert.equal(sql("select privado.estado_borrado_fotos(now() + interval '27 hours')"), "detenida", "más de 26 horas sin correr");
sql("update privado.depuracion_fotos set estado = 'con_errores'");
assert.equal(sql("select privado.estado_borrado_fotos()"), "con_problemas");
sql("select cron.alter_job((select jobid from cron.job where jobname = 'fotos-depurar'), active := false)");
assert.equal(sql("select privado.vigilar_depuracion_fotos()"), "desactivada");
sql("select cron.alter_job((select jobid from cron.job where jobname = 'fotos-depurar'), active := true)");
// Con dirección, la tarea envía solo hora, origen y firma.
const pedido = sql("select privado.lanzar_depuracion_fotos('programada')");
assert.match(pedido, /^\d+$/);
const cabeceras = sql(`select coalesce((select headers::text from net.http_request_queue where id = ${pedido}), '')`);
assert.doesNotMatch(cabeceras, new RegExp(llave), "la llave no viaja");
sql("delete from vault.secrets where name = 'depurar_fotos_url'");
assert.equal(sql("select privado.estado_borrado_fotos()"), "sin_activar");
paso("estado real (sin activar, esperando, activa, detenida, con problemas, desactivada) y vigilancia que avisa si se detiene");

// Limpieza de lo que esta prueba agregó (la matriz vuelve a correr después en CI).
sql(`delete from public.registros where ocurrencia_id in (${libres.slice(0, 15).map((x) => `'${x}'`).join(",")})`);
const sobrantes = sql(`select string_agg(name, ',') from storage.objects where bucket_id = 'evidencias' and name like '${A}/%'`);
if (sobrantes) await sb.storage.from("evidencias").remove(sobrantes.split(","));
sql("delete from privado.depuracion_fotos; delete from privado.depuracion_fotos_fallos; delete from privado.depuracion_reservas; delete from privado.depuracion_firmas");
sql("select privado.recalcular_progreso(participante_id) from public.progreso");
console.log(`Borrado automático de fotos: ${pasos} pasos ok`);
