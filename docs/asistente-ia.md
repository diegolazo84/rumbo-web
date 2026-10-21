# Asistente de IA: cómo se enciende

Está construido y **apagado**. Usa la API de OpenAI. Esa API es un servicio pagado aparte de la suscripción de ChatGPT. Solo se enciende con la autorización de Diego.

1. Aplicar la migración `20261109000000_asistente_ia.sql`, con autorización.
2. En OpenAI (platform.openai.com), crear una clave de API con un límite de gasto mensual en la cuenta. Guardarla en Supabase → Vault con el nombre `openai_api_key`. **Nunca pegarla en el chat.**
3. Revisar en `ia_config` el modelo, los precios por millón de tokens y los topes. Los precios deben verificarse antes, porque cambian. Por defecto, el tope es USD 5 al mes y 5 consultas al día por persona.
4. Encender: `guardar_ia_config('{"activo": true}')`. Sin clave en el Vault, la base lo rechaza.
5. Probar con una consulta real del dueño o un coach (`ia_pedir_borrador`), revisar su costo en `ia_gasto()` y, recién ahí, habilitar el módulo `asistente_ia` para participantes.
6. Antes de habilitarlo, la política de privacidad debe decir que las consultas se envían a OpenAI con el contexto que cada persona autoriza.

Cómo funciona: la persona pregunta → si hay señales de riesgo no se envía y ve *4141 y 131, y su coach recibe una alerta → si no, se envía con el contexto autorizado → la respuesta llega a la bandeja del coach → el coach la aprueba, la corrige o la descarta → la persona solo ve lo aprobado.
