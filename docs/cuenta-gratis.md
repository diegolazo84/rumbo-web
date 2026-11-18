# Cuenta gratis «Rumbo Inicial»

Cualquiera crea su cuenta en Mi espacio (Google o código al correo) y queda en gratis: 1 meta, hasta 3
acciones diarias desde plantillas, créditos, nivel y racha con las mismas reglas. El dueño la ve en
**Panel → Más → Cuentas creadas** y decide a quién darle acceso completo.

## Encenderla (solo con autorización de Diego)

1. Respaldo de la base (docs/respaldo-y-restauracion.md).
2. Aplicar `supabase/migrations/20261204000000_cuenta_gratis.sql` (una transacción) y registrarla en
   `supabase_migrations.schema_migrations`. **«autorizo migrar 20261204»**.
3. Publicar las pantallas (PR de la cuenta gratis). **«autorizo publicar»**.
4. Condiciones y Privacidad con la cuenta gratis (revisión legal pendiente).
5. Panel → Más → Módulos → «Cuenta gratis»: primero **Probado**, después **Habilitado**.
   Con el módulo habilitado, el hook `antes_de_crear_usuario` deja crear cuentas a cualquier correo.
   Si el hook no está activo en Supabase (Authentication → Hooks), revisar además que
   «Allow new users to sign up» esté encendido.

Apagar: volver el módulo a «Desarrollado». Las cuentas ya creadas se conservan.

## Dar acceso completo

Cuentas creadas → «Dar acceso completo» → plan que conversaron → se crea la solicitud con la meta y los días
de la cuenta y se abre su ficha. Desde ahí, lo de siempre: Registrar acuerdo → «Nuevo enlace» privado →
la persona acepta las condiciones → pago → Crear su espacio. La persona sigue con la misma cuenta.
