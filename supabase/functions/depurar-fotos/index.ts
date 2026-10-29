// Edge Function «depurar-fotos» (C21): borra las fotos privadas de acciones cuyo plazo venció.
// La llama la tarea programada «fotos-depurar» (pg_cron + pg_net) una vez al día, o el dueño con
// «Revisar ahora» en Más → Mantención.
//
// Seguridad:
// · La clave de servicio la entrega Supabase dentro de la función (SUPABASE_SERVICE_ROLE_KEY):
//   no se guarda en GitHub ni en ningún otro lugar.
// · Se despliega sin verificación de JWT (--no-verify-jwt), pero solo trabaja si la llamada trae
//   una firma válida: x-rumbo-hora (segundos) y x-rumbo-firma (HMAC-SHA256 de «hora:origen» con
//   la llave «depurar_fotos_llave», que vive solo en Vault y nunca viaja). La firma vence en 5
//   minutos y sirve una sola vez; la comprueba la base. Sin ella responde 401 sin tocar nada.
// · No escribe registros (console) ni devuelve la firma, rutas o nombres: solo conteos y códigos.
// · Los archivos se borran con la API de Storage, nunca con SQL.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { adaptador, depurar } from "./nucleo.js";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const url = Deno.env.get("SUPABASE_URL");
  const clave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !clave) return Response.json({ error: "sin_configuracion" }, { status: 500 });
  const hora = req.headers.get("x-rumbo-hora") ?? "";
  const firma = req.headers.get("x-rumbo-firma") ?? "";
  if (!/^\d{10}$/.test(hora) || !/^[0-9a-f]{64}$/i.test(firma)) return new Response(null, { status: 401 });

  let origen = "programada";
  try {
    const cuerpo = await req.json();
    if (cuerpo?.origen === "manual") origen = "manual";
  } catch {
    /* sin cuerpo: programada */
  }
  const sb = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  // El origen va dentro de la firma: no se puede cambiar sin invalidarla.
  const valida = await sb.rpc("depuracion_firma_valida", { p_ts: Number(hora), p_origen: origen, p_firma: firma });
  if (valida.error || valida.data !== true) return new Response(null, { status: 401 });

  try {
    return Response.json(await depurar(adaptador(sb), { origen }));
  } catch {
    // No se pudo ni empezar ni cerrar (la base no respondió): el panel mostrará que no hubo
    // ejecución y la vigilancia avisará si pasan 26 horas sin una.
    return Response.json({ error: "sin_base" }, { status: 503 });
  }
});
