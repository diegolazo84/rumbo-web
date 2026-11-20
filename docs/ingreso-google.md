# Entrar con Google

«Continuar con Google» en /mi-espacio/entrar/ queda **apagado** hasta que estén hechos estos pasos.
Google es gratis en Supabase y en Google Cloud. Ninguna clave se pega en el chat ni en el repositorio.

## 1. Google Cloud (una vez)

1. Entra a https://console.cloud.google.com con la cuenta rumbo.acompana@gmail.com y crea el proyecto «Rumbo».
2. *APIs y servicios → Pantalla de consentimiento de OAuth* (o *Google Auth Platform → Branding*):
   - Tipo de usuario: **Externo**. Nombre de la app: **Rumbo**. Correo de asistencia: rumbo.acompana@gmail.com.
   - Página principal: `https://diegolazo84.github.io/rumbo-web/`
   - Política de privacidad: `https://diegolazo84.github.io/rumbo-web/privacidad/`
   - Condiciones: `https://diegolazo84.github.io/rumbo-web/condiciones/`
   - Permisos: solo `email`, `profile` y `openid` (no piden verificación de Google).
   - Estado de publicación: **En producción** (en «Prueba» solo entran los correos que agregues como usuarios de prueba).
3. *Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web*:
   - Orígenes autorizados de JavaScript: `https://diegolazo84.github.io`
   - URI de redireccionamiento autorizados: `https://jhukwxeeytedkjtwqowq.supabase.co/auth/v1/callback`
   - Guarda: Google muestra el **ID de cliente** y el **secreto del cliente**.

## 2. Supabase (una vez)

1. *Authentication → Sign In / Providers → Google*: actívalo y pega ahí el ID de cliente y el secreto. Guarda.
2. *Authentication → URL Configuration → Redirect URLs*: debe estar
   `https://diegolazo84.github.io/rumbo-web/mi-espacio/entrar/` (agrégala si falta).

## 3. Encenderlo en la web

`INGRESO_GOOGLE_ACTIVO = true` en `src/data/rumbo.ts` y publicar. Lo hace Claude cuando Diego avise que 1 y 2 están listos.

## Cómo funciona

- Supabase abre Google y vuelve a /mi-espacio/entrar/ con la sesión en el fragmento de la URL (`#access_token=…`);
  la web la guarda y la borra de la barra de direcciones.
- Si el correo de Google es el mismo de un espacio ya creado, Supabase une ambas formas de entrar y el trigger
  `privado.vincular_cuenta` enlaza la ficha (igual que con el código).
- Un correo de Google sin espacio ve la misma pantalla que hoy ve un correo sin programa.
- El panel del equipo sigue pidiendo TOTP: Google no reemplaza el segundo factor.
- Mientras no haya dominio propio, la ventana de Google dice «continuar a jhukwxeeytedkjtwqowq.supabase.co».
