# Rumbo · portada pública

«Ordena lo que importa. Avanza con apoyo.»

Portada comercial de Rumbo, publicada en Netlify. Reconstruida el 2 de octubre de 2026 a partir de la web publicada
en `iridescent-paprenjak-8c3360.netlify.app` (no se contaba con su código fuente), aplicando las correcciones del
paquete `Rumbo_Netlify_Corregido.zip` y la revisión de producto del mismo día.

## Arquitectura del piloto

- **Esta web (Netlify):** presentación, planes, preguntas y privacidad.
- **Plataforma original (`rumbo-acompanamiento-diego.diegolazo84.chatgpt.site`):** postulación, contacto, «Mi espacio»
  (`/mi-programa`), comunidad, estado de postulación y panel del equipo.
- **Una sola bandeja de postulaciones:** todos los botones de postular llevan al formulario de la plataforma original
  con `?area=` y `?apoyo=` en su vocabulario. Esta web no tiene formularios propios. `netlify.toml` además redirige
  `/postular`, `/contacto`, `/mi-programa`, `/comunidad` y `/estado` a la plataforma.

Los datos de negocio (áreas, planes, colores, créditos y niveles) viven en `src/data/rumbo.ts` y deben coincidir con la
plataforma original.

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm run build    # comprobación de tipos y compilación a dist/
```

Netlify compila con `npm run build` y publica `dist/` (ver `netlify.toml`). No hay variables de entorno ni secretos.

Ver `docs/pendientes.md` para lo que falta decidir o verificar.
