# Rumbo · web pública

«Ordena lo que importa. Avanza con apoyo.»

Web de presentación del piloto de Rumbo: planificación personal con acompañamiento humano.
React 19 + Vite + TypeScript, prerenderizada y publicada en GitHub Pages.

- **Dirección publicada:** https://diegolazo84.github.io/rumbo-web/
- **Páginas:** portada `/`, `/privacidad/`, `/condiciones/`, `/ayuda/` y la 404.
- Este repositorio es **público**: no van aquí datos personales ni documentos internos.

## Arquitectura del piloto

- **Esta web:** presentación, planes, preguntas, condiciones del piloto, privacidad y ayuda
  inmediata. No tiene formularios propios ni cookies.
- **Plataforma de Rumbo** (`rumbo-acompanamiento-diego.diegolazo84.chatgpt.site`, hecha con
  ChatGPT Sites): postulación, contacto, «Mi espacio» (`/mi-programa`), comunidad, estado de la
  solicitud y panel del equipo.
- **Una sola bandeja:** todos los botones de postular llevan al formulario de la plataforma, con
  `?area=` y `?apoyo=` en su vocabulario. Además, `/postular/`, `/contacto/`, `/mi-programa/`,
  `/app/`, `/comunidad/`, `/estado/` y `/privacidad-piloto/` son páginas de reenvío generadas al
  compilar: muestran la piel de la marca, explican a dónde se va y conservan la consulta y el ancla.
- **Los datos de negocio viven en `src/data/rumbo.ts`** y deben coincidir con la plataforma. Las
  diferencias y equivalencias están en [`docs/coherencia.md`](docs/coherencia.md).

## Comandos

```bash
npm install
npm run dev          # servidor de desarrollo (sin prerender)
npm run check        # tipos
npm run build        # tipos + compilación + prerender + reenvíos + sitemap + guardián de marcadores
npm test             # pruebas de Playwright (humo, contraste, marcadores, accesibilidad)
npm run lighthouse   # Lighthouse en móvil y escritorio, con umbrales que hacen fallar
npm run imagenes     # regenera la imagen para redes y los íconos (se versionan)
npm run servir:pages # sirve dist/ imitando GitHub Pages: node scripts/servidor-pages.mjs dist 4173 /rumbo-web/
```

Para probar exactamente como en producción:

```bash
BASE_PATH=/rumbo-web/ SITE_URL=https://diegolazo84.github.io/rumbo-web npm run build
npx playwright install chromium webkit   # una vez
npm test
```

Las pruebas levantan solas el servidor local. Con `URL_PRUEBA=https://diegolazo84.github.io/rumbo-web`
corren solo las marcadas `@produccion`, contra el sitio publicado.

### Variables

| Variable | Para qué | Por defecto |
|---|---|---|
| `BASE_PATH` | Carpeta donde se publica, con barra final | `/rumbo-web/` |
| `SITE_URL` | Dirección pública, sin barra final | `https://diegolazo84.github.io/rumbo-web` |
| `ANIO_COMPILACION` | Año del pie; se fija una vez para las dos compilaciones | el año actual |
| `VITE_UMAMI_WEBSITE_ID` | Activa la analítica sin cookies | vacía (sin analítica) |
| `LANZAMIENTO` | `1` exige los datos que bloquean la difusión | vacía |
| `GOOGLE_SITE_VERIFICATION` | Meta para verificar el sitio en Search Console | vacía |
| `CHROME_PATH` | Chromium ya instalado, para pruebas y Lighthouse | el de Playwright |

`BASE_PATH` y `SITE_URL` tienen que describir la misma carpeta: si no, la compilación falla.

## Cómo se arma cada página

1. `src/data/paginas.ts` declara cada página: ruta (con barra final), `<title>`, descripción y
   fecha de revisión. `src/App.tsx` exige una vista por página, así que agregar una página sin su
   componente no compila.
2. `vite build` compila la app y `vite build --ssr src/entry-server.tsx` la compila para Node.
3. `scripts/postbuild.mjs` escribe, en `dist/`:
   - un HTML completo por página y `404.html` (contenido prerenderizado, `<title>`, descripción,
     `robots`, canonical, precarga de las 3 tipografías, Open Graph, Twitter, CSP, JSON-LD en la
     portada y `<meta name="rumbo-version">`);
   - las páginas de reenvío a la plataforma, con la CSP del hash de su único script;
   - `robots.txt` y `sitemap.xml`;
   - y revisa todo con el **guardián de marcadores**.
4. En el navegador, `src/main.tsx` hidrata ese HTML y agrega la clase `hidratado`, que activa los
   efectos. Si el bundle no carga, la clase nunca aparece y todo el contenido queda visible.

Las tipografías (Fraunces e Instrument Sans) se sirven desde este mismo sitio con
`@fontsource-variable`. No se usa ningún servicio de tipografías externo.

### El guardián de marcadores

`scripts/marcadores.mjs` revisa el texto visible y los atributos `content`, `alt`, `aria-label` y
`title` de cada HTML generado, incluidos la 404 y los reenvíos. La compilación **falla** si
encuentra `[COMPLETAR`, `[PENDIENTE`, `[DECIDIR`, `[VERIFICAR`, `[AJUSTAR`, una llave de plantilla
como `{fecha}`, `TODO` o `XXX` en mayúsculas, `NaN`, `null`, `undefined`, `<fecha` o `lorem`.
`pruebas/marcadores.spec.ts` repite la revisión sobre el HTML servido y busca además las frases
que no deben aparecer en ningún lugar de la web.

Por eso no hay que escribir nunca un marcador en un texto: si un dato no existe, el bloque usa su
versión alternativa o no se muestra.

## Cómo completar los datos que faltan

Todo lo que solo puede aportar Diego vive en dos objetos de `src/data/rumbo.ts`:

- `operacion`: quién opera Rumbo, correo de contacto, plazos, canales, forma de pago, régimen de
  precios, cobertura, política de término, etc.
- `ayuda`: el día en que se verificaron los números de las líneas de ayuda (`verificadoEl`) y si se
  publica el 1455 (`incluir1455`).

Se editan en el archivo, se compila y **los textos cambian solos**: cada bloque tiene una versión
«sin dato» y otra «con dato». Por ejemplo:

```ts
responsable: { nombre: "Nombre o razón social", rut: "11.111.111-1", comuna: "Providencia" },
correo: "contacto@ejemplo.cl",
plazoPrimeraRespuesta: "5 días hábiles",
respondemosTodas: true,
cobertura: {
  encaje: "vives en Chile y puedes conversar en línea",
  respuesta: "Sí, si vives en Chile: todo el acompañamiento es en línea. …",
},
topePrecio: true,          // o preciosConImpuestos: true
```

La lista completa, con qué bloquea cada dato, está en [`docs/pendientes.md`](docs/pendientes.md).

### La puerta de lanzamiento

La web se puede publicar sin esos datos, pero **no se difunde** (redes, campañas, prensa, perfiles)
hasta tenerlos. Para que la compilación los exija:

```bash
LANZAMIENTO=1 npm run build
```

Falla con un mensaje por cada dato que falte. En GitHub se activa definiendo la variable
`LANZAMIENTO = 1` en Settings → Secrets and variables → Actions → Variables. Mientras no exista,
la compilación no los exige.

## Imágenes e íconos

`npm run imagenes` regenera, con Playwright y las tipografías locales:
`public/og/rumbo-1200x630.png`, `favicon.svg`, `favicon.ico`, `favicon-32.png`,
`apple-touch-icon.png` y `public/icons/`. Los archivos se versionan: solo hay que correrlo cuando
cambie el diseño de la imagen o del ícono. Requiere `npx playwright install chromium` una vez.

## Analítica (opcional, apagada por defecto)

Los enlaces ya llevan sus atributos de evento (`data-umami-event`), pero el script solo se carga si
existe `VITE_UMAMI_WEBSITE_ID`. Para activarla: crear el sitio en Umami Cloud y definir
`UMAMI_WEBSITE_ID` en las variables del repositorio. El postbuild agrega el script con
`data-do-not-track` y amplía la CSP a los dominios de Umami. Umami no usa cookies ni guarda datos
que identifiquen a la persona. Mientras esté apagada, Privacidad no la menciona.

## Publicación

`.github/workflows/publicar.yml` tiene tres jobs:

1. **verificar** (en push, PR y a mano): tipos, compilación, pruebas y Lighthouse. Si algo falla,
   sube `test-results/` y `lighthouse/` como evidencia.
2. **publicar** (solo en `main`): despliega `dist/` en GitHub Pages.
3. **comprobar-produccion**: espera a que la caché de Pages sirva la versión nueva (busca
   `<meta name="rumbo-version">` con el SHA del commit, hasta 15 minutos) y corre las pruebas
   `@produccion` contra el sitio publicado.

Un PR corre solo `verificar`, sin publicar nada. `dist/` es una web estática normal: funciona igual
en cualquier otro alojamiento.

### Vigilancia de la plataforma

`.github/workflows/vigilar-plataforma.yml` revisa cada día (alrededor de las 8 de la mañana en
Chile) que `/postular`, `/contacto` y `/estado` de la plataforma respondan 200. Si alguna falla,
abre un issue con la etiqueta `plataforma`; si ya hay uno abierto, lo comenta; cuando vuelven a
responder, lo comenta y lo cierra. Para recibir los avisos por correo hay que tener activadas las
notificaciones de issues del repositorio.

**GitHub desactiva los cron de los repositorios públicos sin actividad durante 60 días.** Si eso
pasa, el propio GitHub avisa por correo; para reactivarlo: pestaña **Actions** → workflow
**«Vigilar la plataforma»** → botón **«Enable workflow»**. También se puede lanzar a mano con
**«Run workflow»**.

## Buscadores

- **`robots.txt` no tiene efecto** con la dirección `…github.io/rumbo-web/`: los buscadores solo
  leen `robots.txt` en la raíz del dominio (`diegolazo84.github.io/robots.txt`), que no es nuestra.
  Se genera igual, para cuando haya dominio propio. Los reenvíos llevan `noindex`, así que no hace
  falta ningún `Disallow`.
- **Enviar el sitemap a mano en Google Search Console:**
  1. En Search Console, agregar una propiedad de tipo **prefijo de URL**:
     `https://diegolazo84.github.io/rumbo-web/`.
  2. Elegir la verificación por **etiqueta HTML**, copiar el valor del `content` y definirlo como
     variable `GOOGLE_SITE_VERIFICATION` en el repositorio (Settings → Secrets and variables →
     Actions → Variables). Publicar y luego verificar.
  3. En **Sitemaps**, enviar `https://diegolazo84.github.io/rumbo-web/sitemap.xml`.

## Pasar a dominio propio

1. Verificar el dominio en GitHub (Settings de la cuenta → Pages → Verified domains).
2. En el DNS del dominio, apuntar los registros A y AAAA de GitHub Pages y un `CNAME` para `www`.
3. En Settings → Pages del repositorio, escribir el dominio. Con publicación por Actions **no** se
   crea un archivo `CNAME`: se ignora.
4. Definir las variables `BASE_PATH=/` y `SITE_URL=https://tudominio.cl` y volver a publicar.
5. Agregar la nueva propiedad en Search Console y enviar otra vez el sitemap.

## Documentos

- [`docs/coherencia.md`](docs/coherencia.md): equivalencias y diferencias entre esta web y la
  plataforma (planes, áreas, parámetros, colores, créditos, niveles y textos de crisis).
- [`docs/pendientes.md`](docs/pendientes.md): qué está implementado, qué falta verificar, qué datos
  faltan y qué bloquea el lanzamiento público.

No hay secretos en este repositorio.
