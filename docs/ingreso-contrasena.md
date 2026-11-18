# Entrar con correo y contraseña

Desde este cambio, Mi espacio ofrece tres formas de entrar:

1. **Correo y contraseña** (camino principal).
2. **Continuar con Google** (si está activo, ver `docs/ingreso-google.md`).
3. **Un código de 6 dígitos en el correo** (alternativa, y para quien nunca creó contraseña).

«Olvidé mi contraseña» envía un código de 6 dígitos (y un botón) al correo; con él se abre
«Crea tu contraseña nueva». Una cuenta nueva con contraseña confirma su correo con el mismo
tipo de código. Así nadie puede crear una cuenta con un correo ajeno.

Todo está apagado (`INGRESO_CONTRASENA_ACTIVO = false` en `src/data/rumbo.ts`) hasta que se hagan
estos pasos en Supabase. No hay que copiar ni pegar ninguna clave.

## Pasos en Supabase (proyecto «rumbo»)

1. **Authentication → Sign In / Providers → Email**
   - «Enable Email provider»: encendido (ya lo está: hoy se usa para el código).
   - «Confirm email»: **encendido**.
   - «Minimum password length»: **8**.
   - Guardar.
2. **Authentication → Emails → Templates → «Confirm signup»**. Asunto: `Confirma tu correo en Rumbo`.
   Cuerpo (en español, con el código y el botón):

   ```html
   <h2>Confirma tu correo</h2>
   <p>Tu código para confirmar tu cuenta en Rumbo es:</p>
   <p style="font-size:28px;letter-spacing:4px"><strong>{{ .Token }}</strong></p>
   <p>O toca este botón: <a href="{{ .RedirectTo }}?th={{ .TokenHash }}&type=signup">Confirmar mi correo</a></p>
   <p>Sirve durante 1 hora. Si no fuiste tú, ignora este correo.</p>
   ```
3. **Templates → «Reset password»**. Asunto: `Crea tu contraseña nueva en Rumbo`.

   ```html
   <h2>Crea tu contraseña nueva</h2>
   <p>Tu código para crear una contraseña nueva en Rumbo es:</p>
   <p style="font-size:28px;letter-spacing:4px"><strong>{{ .Token }}</strong></p>
   <p>O toca este botón: <a href="{{ .RedirectTo }}?th={{ .TokenHash }}&type=recovery">Crear mi contraseña</a></p>
   <p>Sirve durante 1 hora. Si no lo pediste, ignora este correo: tu contraseña no cambia.</p>
   ```
4. **Authentication → URL Configuration → Redirect URLs**: debe estar
   `https://diegolazo84.github.io/rumbo-web/mi-espacio/entrar/` (es la misma que pide Google).
5. Avisar a Claude: cambia `INGRESO_CONTRASENA_ACTIVO` a `true` y se publica con «autorizo publicar».

## Notas

- Quien ya tiene espacio y entraba con código no tiene contraseña: usa «Olvidé mi contraseña» una vez
  (o sigue con el código). La pantalla lo explica.
- Los correos salen por el SMTP de Brevo (plan gratis: 300 correos al día), igual que el código.
- La sesión queda abierta en el dispositivo hasta que la persona toque «Salir» (salvo si marca
  «Estoy en un computador compartido»): no hay que entrar cada vez.
- «Leaked password protection» (contraseñas filtradas) es solo del plan Pro de Supabase: no se usa.
