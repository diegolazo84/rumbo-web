# Rumbo · portada pública

«Ordena lo que importa. Avanza con apoyo.»

Portada comercial de Rumbo. Reconstruida el 2 de octubre de 2026 a partir de la web publicada
en `iridescent-paprenjak-8c3360.netlify.app` (no se contaba con su código fuente), aplicando las correcciones del
paquete `Rumbo_Netlify_Corregido.zip` y la revisión de producto del mismo día.

## Arquitectura del piloto

- **Esta web (GitHub Pages, sin depender de Netlify):** presentación, planes, preguntas y privacidad.
- **Plataforma original (`rumbo-acompanamiento-diego.diegolazo84.chatgpt.site`):** postulación, contacto, «Mi espacio»
  (`/mi-programa`), comunidad, estado de postulación y panel del equipo.
- **Una sola bandeja de postulaciones:** todos los botones de postular llevan al formulario de la plataforma original
  con `?area=` y `?apoyo=` en su vocabulario. Esta web no tiene formularios propios. Además, `/postular`, `/contacto`, `/mi-programa`, `/comunidad` y `/estado`
  reenvían a la plataforma (páginas generadas por `scripts/postbuild.mjs`).

Los datos de negocio (áreas, planes, colores, créditos y niveles) viven en `src/data/rumbo.ts` y deben coincidir con la
plataforma original.

## Desarrollo

```bash
npm install
npm run dev        # servidor local (sin prerender)
npm run build      # tipos + compilación + prerender de cada página en dist/
npx playwright install chromium   # una vez, para las pruebas
npm test           # prueba de humo, enlaces, reenvíos, 404, imagen social y accesibilidad (axe)
npm run imagenes   # regenera public/og/rumbo-1200x630.png y los íconos (se versionan)
```

Para probar como en GitHub Pages: `BASE_PATH=/rumbo-web/ SITE_URL=https://diegolazo84.github.io/rumbo-web npm run build && npm test`.

### Cómo se arma cada página

- `src/data/paginas.ts` declara cada página (ruta, título, descripción). `src/App.tsx` exige su vista.
- `npm run build` compila la app, compila `src/entry-server.tsx` para Node y `scripts/postbuild.mjs` escribe un HTML
  completo por página (contenido, `<title>`, descripción, canonical, Open Graph, CSP), además de `404.html`, los reenvíos,
  `robots.txt` y `sitemap.xml`. En el navegador, `src/main.tsx` hidrata ese HTML.
- Las tipografías vienen de `@fontsource-variable` (sin Google Fonts).

## Publicación

Cada cambio en `main` se publica solo con GitHub Actions (`.github/workflows/publicar.yml`) en GitHub Pages.
`dist/` es una web estática normal: funciona igual en cualquier otro hosting si algún día se cambia.

- Dirección gratuita: `https://diegolazo84.github.io/rumbo-web/`.
- Dominio propio: configurarlo en Settings → Pages (con publicación por Actions no se usa archivo `CNAME`) y definir en
  Settings → Secrets and variables → Actions → Variables `BASE_PATH=/` y `SITE_URL=https://tudominio.cl`.
- Cada publicación pasa antes por tipos, compilación y pruebas; después se repiten las pruebas `@produccion` contra el
  sitio publicado.

No hay secretos en este repositorio.

Ver `docs/pendientes.md` para lo que falta decidir o verificar.
