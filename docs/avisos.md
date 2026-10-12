# Avisos de nuevas postulaciones (ntfy, gratis)

Estado al 12 de octubre de 2026: la consulta de Vault no devolvió `resend_api_key`,
`aviso_destino` ni `ntfy_tema`, así que hoy **no llega ningún aviso** de postulaciones,
mensajes, peticiones de datos ni solicitudes de reordenar la semana.

## Por qué ntfy

- La base ya sabe enviar avisos a ntfy (`privado.avisar`); no hay que instalar nada en Supabase.
- ntfy.sh es gratis, no pide cuenta ni clave, y tiene app para Android e iPhone.
- El aviso no lleva datos personales: dice área, tipo de apoyo, plazo y un enlace al panel,
  que exige tu sesión y tu segundo factor.
- El «tema» de ntfy funciona como una dirección secreta: quien lo conozca puede leer los
  avisos. Por eso se genera al azar dentro de Supabase y no se comparte con nadie (tampoco en
  el chat).
- Límites: el servidor gratuito de ntfy.sh limita cuántos mensajes se envían al día desde una
  misma dirección y guarda los mensajes solo unas horas. Para el volumen de un piloto basta. Si
  algún día dejan de llegar, la alternativa gratis es Resend (correo), que la base también sabe usar.

## Pasos (los haces tú, cuando decidas)

1. **Instala la app ntfy** en tu teléfono (App Store o Google Play; es gratis).
2. **Pega `supabase/08-avisos-ntfy.sql`** en Supabase → SQL Editor → New query → Run. Mejora el
   formato del aviso y hace que al tocarlo se abra el panel. No cambia datos.
3. **Crea el tema secreto en Vault**, en una consulta nueva:

   ```sql
   select vault.create_secret(
     'rumbo-' || encode(extensions.gen_random_bytes(12), 'hex'),
     'ntfy_tema',
     'Tema de ntfy para los avisos de Rumbo');
   ```

4. **Mira el nombre del tema** (solo tú; no lo copies en el chat ni en el repositorio):

   ```sql
   select decrypted_secret from vault.decrypted_secrets where name = 'ntfy_tema';
   ```

5. **Suscríbete en la app**: botón «+» → «Subscribe to topic» → pega el nombre → deja el
   servidor por defecto (ntfy.sh) → «Subscribe».
6. **Envía un aviso de prueba**:

   ```sql
   select privado.avisar('Rumbo · prueba de aviso',
     'Si ves esto, los avisos funcionan. https://diegolazo84.github.io/rumbo-web/equipo/');
   ```

   Debe llegarte en segundos. Al tocarlo se abre el panel.
7. **Comprueba**: pega `supabase/verificacion.sql`; todas las filas deben decir «ok».
8. **Prueba real** (opcional): una postulación de prueba en /postular/ debe avisarte.

## Si no llega

```sql
select id, status_code, left(content::text, 200) as respuesta, created
  from net._http_response order by created desc limit 5;
```

`status_code = 200` significa que ntfy lo recibió (revisa la suscripción en la app). Otro
código: envíame solo el número y el texto de `respuesta`, nunca el nombre del tema.

## Cambiar o quitar el tema

Si el nombre se filtró: `select vault.update_secret((select id from vault.secrets where name = 'ntfy_tema'), 'rumbo-' || encode(extensions.gen_random_bytes(12), 'hex'));`
y vuelve a suscribirte con el nombre nuevo. Para apagar los avisos:
`delete from vault.secrets where name = 'ntfy_tema';`
