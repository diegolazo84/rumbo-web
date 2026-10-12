# Pendientes

Estado al 12 de octubre de 2026 (Etapa 0 de Rumbo 2.0). «Implementado» = está en este
repositorio; «verificado» = comprobado en un navegador o en producción.

Este repositorio es público: aquí no van datos personales ni documentos internos.

## Lo que funciona hoy (implementado y publicado)

- Web pública en GitHub Pages: portada, planes, preguntas, Privacidad, Condiciones y Ayuda.
- Formulario propio en /postular/, seguimiento con enlace privado en /estado/ y contacto en
  /contacto/, con Supabase (desde el 8 de octubre).
- Mi espacio propio en /mi-espacio/ con código al correo (Brevo) y panel /equipo/ con segundo
  factor (desde el 9 de octubre).
- Forma de pago y política de pausa y término aprobadas por Diego (10 de octubre).

## Etapa 0 (en este cambio, sin publicar)

- Privacidad y Condiciones 1.2: proveedores reales y funciones futuras marcadas como no
  disponibles. Puntos legales en `docs/revision-legal.md`.
- Portada: «Lo que viene en Rumbo» (lanzamiento y etapas posteriores), ranking de ejemplo
  rotulado «Todavía no disponible».
- Vigilancia diaria de la web real y de Supabase (`.github/workflows/vigilar-plataforma.yml`).
- Documentos: `docs/supabase-pendientes.md`, `docs/verificacion-recorrido.md`,
  `docs/eliminacion-cuentas.md`, `docs/metricas-negocio.md`,
  `docs/publicar-versiones-legales.md` y `docs/respaldo-y-restauracion.md`.

## Solo Diego puede resolver

1. Revisión legal de Privacidad y Condiciones (`docs/revision-legal.md`).
2. Verificar los números de Ayuda inmediata en los sitios oficiales y dar la fecha
   (`ayuda.verificadoEl` en `src/data/rumbo.ts`; el 1455 solo si se confirma).
3. Inicio de actividades en el SII y documento tributario antes del primer cobro.
4. Verificar el nombre «Rumbo» en INAPI y nic.cl.
5. Respaldos de Supabase: plan Pro o el procedimiento manual de `docs/respaldo-y-restauracion.md`.
6. Revisiones de Supabase de solo lectura (`docs/supabase-pendientes.md`).
7. Recorrido completo con correo de prueba (`docs/verificacion-recorrido.md`).
8. Dar de baja la portada antigua de Netlify.
9. Dominio propio.
