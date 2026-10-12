# Revisión legal pendiente

Preparado el 12 de octubre de 2026 (Etapa 0 de Rumbo 2.0). **Nada de lo que sigue afirma que
Rumbo cumpla una norma**: son los puntos que un abogado o abogada debe revisar antes de cobrar o
de difundir la web. Los textos vigentes están en `src/pages/Privacidad.tsx` (versión 1.2) y
`src/pages/Condiciones.tsx` (versión 1.2); en el código, cada punto lleva el comentario
`REVISIÓN LEGAL`.

## Qué cambió en la versión 1.2

- Privacidad nombra a los proveedores que se usan hoy: GitHub (aloja la web), Supabase (base de
  datos, ingreso a Mi espacio; servidores en São Paulo), Brevo (envía los correos con el código de
  ingreso) y Google (correo rumbo.acompana@gmail.com). Ya no nombra a OpenAI ni el inicio de
  sesión con ChatGPT, que no se usan desde el 9 de octubre de 2026.
- Privacidad y Condiciones dicen que comunidad, ranking, fotografías y asistente con IA todavía
  no existen y que no tratan datos.
- No cambian precios, forma de pago ni política de pausa y término (aprobadas el 10 de octubre).

## Preguntas para la revisión

### Privacidad
1. **Proveedores**: confirmar razón social, país y contrato de tratamiento de datos (DPA) de
   Supabase Inc., Brevo (Sendinblue SAS, Francia) y Google. ¿Hay que nombrar a los
   subencargados de cada uno?
2. **Transferencias internacionales** (Brasil, Estados Unidos, Francia): ¿qué base y qué
   garantías corresponde declarar?
3. **Base de licitud de cada finalidad** (consentimiento, contrato, obligación legal) tal como
   están listadas en «Para qué usamos tus datos».
4. **Datos de salud**: ¿basta el consentimiento expreso y separado que describe la política para
   lo que una persona cuente por iniciativa propia?
5. **Plazos de conservación**: hoy la política no fija plazos y la base no borra
   automáticamente (`meses_conservar_*` y `dias_conservar_foto` vacíos). Proponer plazos.
6. **Plazo de respuesta a derechos** (`dias_plazo_derechos` vacío) y forma de verificar
   identidad.
7. **Ley 21.719**: qué debe cambiar antes de su entrada en vigencia (Agencia, registro de
   actividades, evaluación de impacto si se usa IA).
8. **Eliminación de cuentas**: el procedimiento actual no borra la cuenta de acceso ni algunos
   correos (ver `docs/eliminacion-cuentas.md`). ¿Qué se debe borrar y qué conservar?
9. **Futuro asistente con IA**: qué información y consentimiento exigir antes de activarlo.

### Condiciones
10. **Derecho de retracto** en servicios contratados a distancia (Ley 19.496): ¿aplica y cómo
    se informa?
11. **Pago, pausa y devolución** aprobados por Diego: revisar redacción y si son exigibles.
12. **Participantes fuera de Chile** (pago en USD por PayPal): ley aplicable y jurisdicción.
13. **Alcance de salud y crisis**: revisar que el texto deje claro que no es un servicio de salud.
14. **Documento tributario**: qué emitir (boleta de honorarios u otro) tras el inicio de
    actividades en el SII; hoy `documentoTributario` está vacío.
15. **Responsable**: hoy figura Diego como persona natural (Providencia). Confirmar datos mínimos
    que deben aparecer.

## Antes de publicar la versión 1.2

Seguir `docs/publicar-versiones-legales.md`: cierra postulaciones un momento, publica la web y
cambia las versiones en Supabase en una sola transacción, para que la versión registrada y el
texto visible coincidan siempre. La web no cambia las versiones de la base por sí sola.
