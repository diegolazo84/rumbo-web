// Edge Function «depurar-fotos» (C21): borra las fotos privadas de acciones cuyo plazo venció.
// La llama la tarea programada «fotos-depurar» (pg_cron + pg_net) una vez al día, o el dueño con
// «Revisar ahora» en Más → Mantención.
//
// Seguridad:
// · La clave de servicio la entrega Supabase dentro de la función (SUPABASE_SERVICE_ROLE_KEY):
//   no se guarda en GitHub ni en ningún otro lugar.
// · Se despliega sin verificación de JWT, pero solo trabaja si la llamada trae la llave interna
//   «depurar_fotos_token», que vive en Vault y solo conoce la base. Sin ella responde 401 sin
//   tocar nada.
// · Los archivos se borran con la API de Storage, nunca con SQL.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { adaptador, depurar } from "./nucleo.js";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const url = Deno.env.get("SUPABASE_URL");
  const clave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !clave) return Response.json({ error: "sin_configuracion" }, { status: 500 });
  const token = req.headers.get("x-rumbo-token") ?? "";
  if (token.length < 32) return new Response(null, { status: 401 });

  const sb = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const valido = await sb.rpc("depuracion_token_valido", { p_token: token });
  if (valido.error || valido.data !== true) return new Response(null, { status: 401 });

  let origen = "programada";
  try {
    const cuerpo = await req.json();
    if (cuerpo?.origen === "manual") origen = "manual";
  } catch {
    /* sin cuerpo: programada */
  }
  try {
    return Response.json(await depurar(adaptador(sb), { origen }));
  } catch {
    // No se pudo ni empezar ni cerrar (la base no respondió): el panel mostrará que no hubo
    // ejecución y la tarea avisará si pasan 2 días sin una.
    return Response.json({ error: "sin_base" }, { status: 503 });
  }
});
