# Pendientes

Estado al 2 de octubre de 2026. «Implementado» = está en este repositorio;
«verificado» = comprobado en un navegador o en producción.

Este repositorio es público: aquí no van datos personales ni documentos internos.

## Implementado

- **Rediseño completo de la web pública:** sistema de diseño con tokens, portada en seis
  capítulos, páginas de Privacidad, Condiciones del piloto, Ayuda inmediata y 404.
- **Una sola fuente de datos** (`src/data/rumbo.ts`): áreas, planes, precios, créditos, niveles,
  estados, listas de lo que no se incluye, quién puede participar y datos operativos. Las
  preguntas frecuentes viven en `src/data/preguntas.ts`.
- **Prerenderizado con hidratación:** cada página se publica como HTML completo (contenido,
  `<title>`, descripción, canonical, Open Graph, CSP) y el navegador la hidrata.
- **Todo se lee sin JavaScript**, incluidas las preguntas (`<details>`) y el aviso de crisis.
- **Tipografías propias** (@fontsource, sin servicios externos), imagen para redes, favicon,
  íconos y manifest generados con `npm run imagenes`.
- **Páginas de reenvío** con la piel de la marca para `/postular/`, `/contacto/`, `/mi-programa/`,
  `/app/`, `/comunidad/`, `/estado/` y `/privacidad-piloto/`: conservan `?area=`, `?apoyo=` y
  `#token`, y llevan `noindex`.
- **Guardián de marcadores:** la compilación falla si en el HTML queda «[PENDIENTE]», una llave de
  plantilla, «TODO», «NaN», «null» o «undefined». Nunca se publica un marcador.
- **Puerta de lanzamiento** (`LANZAMIENTO=1`): la compilación falla mientras falten los datos que
  bloquean la difusión (ver más abajo).
- **Analítica opcional y apagada por defecto:** el script de Umami se carga solo si existe
  `VITE_UMAMI_WEBSITE_ID`.
- **Pruebas automáticas** (`npm test`): HTML estático, lectura sin JavaScript, hidratación sin
  errores ni bloqueos de CSP, enlaces y parámetros permitidos, accesibilidad con axe (WCAG 2.2 AA),
  contraste y tokens, objetivos táctiles, menú y foco, 404, reenvíos, sitemap, imagen social,
  presupuesto de peso, marcadores y coherencia de datos entre la portada y Condiciones.
- **Lighthouse en CI** (`npm run lighthouse`), con umbrales que hacen fallar la compilación.
- **Publicación con GitHub Actions** en GitHub Pages: verificar → publicar → comprobar producción.
- **Vigilancia diaria de la plataforma** (`.github/workflows/vigilar-plataforma.yml`): si
  `/postular`, `/contacto` o `/estado` no responden 200, abre un issue con la etiqueta
  `plataforma`; cuando vuelven, lo cierra.
- **Dependabot mensual** para npm y las acciones de GitHub.
- **Revisado en local** (2 de octubre de 2026): capturas de las cinco páginas a 1440, 1024, 768,
  390 y 320 px con las tipografías reales, sin desbordes, y `forced-colors` en el emulador de
  Chromium (barras, acciones del calendario y etiquetas visibles). Dos títulos dejan una palabra
  sola en su línea en pantallas angostas, porque con la escala de tamaños no caben en una:
  «Condiciones / del piloto.» a 390 px o menos (el H1 mide 364 px y el ancho útil es 358) y el H1
  de la portada a 320 px.

## Sin verificar

- Primera publicación en GitHub Pages con el rediseño, y el job `comprobar-produccion` en verde.
- Página 404 real de GitHub Pages (el servidor local la imita, pero no es lo mismo).
- Vista previa en WhatsApp y en el Sharing Debugger de Facebook (título, descripción e imagen).
- Que el formulario de la plataforma preseleccione `?area=` y `?apoyo=`
  (`operacion.preseleccionVerificada`), y los valores de `?area=` para «Estudio y aprendizaje»
  (`operacion.paramEstudio`) y «Cambios y relaciones» (`operacion.paramCambios`).
- Recepción real de una solicitud marcada «PRUEBA – no contactar» desde la portada, desde un
  camino y desde un plan, con `/estado#token` funcionando y la opción de retirarla.
- Primera corrida de `vigilar-plataforma.yml` y que sus avisos lleguen por correo. Si la
  plataforma responde 403 a los servidores de GitHub por protección contra bots, hay que ajustar
  la comprobación antes del lanzamiento.

## Datos que faltan (`operacion` y `ayuda` en `src/data/rumbo.ts`)

Mientras falten, la web se publica con textos alternativos honestos: ningún bloque muestra un
marcador. Los marcados **bloquean el lanzamiento público** (difundir en redes, campañas, prensa o
perfiles), y la compilación con `LANZAMIENTO=1` los exige.

| Dato | Para qué | Estado |
|---|---|---|
| `responsable` | Identificar al proveedor y al responsable de los datos (fila legal, Privacidad §1, Condiciones §1) | **bloquea la difusión** |
| `correo` | Contacto de privacidad y consultas; aparece en el pie y en los reenvíos | **bloquea la difusión** |
| `plazoPrimeraRespuesta` y `respondemosTodas` | Decir en cuánto se responde, también a quien no avanza | **bloquea la difusión** |
| `cobertura` | Desde dónde se puede participar («Es para ti si…», pregunta 11, Condiciones §2) | **bloquea la difusión** |
| `preciosConImpuestos` o `topePrecio` | El precio informado debe incluir los impuestos | **bloquea la difusión** |
| `ayuda.verificadoEl` (e `incluir1455`) | Día en que se verificaron los números de ayuda | **bloquea la difusión** |
| `canalRevisiones`, `canalRespuestas`, `plazoRespuestas` | Cómo y cuándo son las revisiones y las respuestas breves | bloquea el primer cobro |
| `formaDePago`, `documentoTributario` | Cómo se paga y qué documento se entrega | bloquea el primer cobro |
| `politicaTermino` | Pausa, término anticipado y devolución | bloquea el primer cobro |
| `acompanante` | Quién acompaña: nombre, rol y biografía real | opcional, pero es la señal de confianza más fuerte |
| `conservacion` | Plazos de conservación de datos (Privacidad §8) | opcional |
| `alojamientoVerificado` | Confirmar con OpenAI dónde se alojan los datos de la plataforma (Privacidad §6) | opcional |
| `tamanoPrimerGrupo` | Tamaño real del primer grupo (dato real, no falsa escasez) | opcional |

### Plantilla de respuesta para quien no avanza

Se recomienda `respondemosTodas = true` y responder a mano, por correo:

> Hola, {nombre}: gracias por contarnos tu meta. En esta primera etapa el piloto acompaña a un
> grupo pequeño de personas y no podremos acompañarte ahora. Si abrimos una nueva etapa, lo
> publicaremos en la web de Rumbo. Puedes retirar tu solicitud cuando quieras con tu enlace
> privado. Un saludo, el equipo de Rumbo.

## Revisión legal y normativa

- **Ley N.º 21.719** (nueva ley de datos personales): entra en vigencia el 1 de diciembre de 2026
  y hay un proyecto de postergación en trámite. Antes de esa fecha hay que revisar base de
  licitud, transferencias internacionales y plazos de respuesta, y actualizar Privacidad.
- **Ley N.º 19.628**, vigente hoy, es la que citan los textos actuales.
- **Ley N.º 19.496** (consumidor): identificación del proveedor, precio con impuestos incluidos
  (art. 30) y condiciones disponibles antes del acuerdo a distancia (art. 12 A).
- Falta la revisión legal de Privacidad y de las Condiciones del piloto, incluido el derecho a
  retracto.
- Falta el consentimiento expreso para datos de salud en el formulario de la plataforma.

## Alojamiento de la plataforma

La plataforma usa ChatGPT Sites, de OpenAI, que está en beta. Según fuentes públicas funciona
sobre infraestructura de Cloudflare (Workers, D1 y R2) y no ofrece residencia de datos. Mientras
no esté confirmado con documentación o soporte de OpenAI, la web **no nombra a Cloudflare**: el
texto de Privacidad §6 dice «y los proveedores de infraestructura que OpenAI utiliza». Cuando se
confirme, se pone `alojamientoVerificado = true` y el texto cambia solo.

## Riesgos conocidos

- **Uso comercial de GitHub Pages:** GitHub Pages no está pensado como vitrina comercial
  principal. Hoy la web es informativa y no procesa pagos, así que el riesgo es bajo. Si se
  empieza con campañas pagadas, conviene dominio propio y evaluar otro alojamiento (Cloudflare
  Pages). Netlify queda descartado.
- **Cabeceras de seguridad:** GitHub Pages no permite cabeceras propias, así que la CSP va por
  `<meta>` y no se pueden usar `frame-ancestors` ni HSTS propio.
- **`robots.txt` sin efecto:** con la dirección `…github.io/rumbo-web/`, los buscadores solo leen
  `robots.txt` en la raíz del dominio. El sitemap se envía a mano en Search Console (ver README).
- **Cron desactivado:** GitHub desactiva los cron de repositorios públicos sin actividad durante
  60 días. Si eso pasa, `vigilar-plataforma.yml` deja de avisar hasta reactivarlo (ver README).
- **Toda la conversión depende de la plataforma:** si cae, no hay dónde postular. Por eso existe
  la vigilancia diaria.

## Cambios en la plataforma (solo se pueden hacer en su editor)

- Agregar los textos de crisis en `/postular` y en `/contacto`.
- En el campo «¿Qué te gustaría conseguir?», indicar «No incluyas diagnósticos ni información de
  salud» (hoy no tiene aviso, ni consentimiento para datos de salud, ni texto de crisis).
- En `/contacto`, cambiar la etiqueta del correo por «Tu correo (el de tu solicitud, si ya
  postulaste)».
- Enlazar desde `/privacidad-piloto` a la política de privacidad de esta web.
- Corregir «Especialistas cuando haga falta»: hoy no se ofrecen.
- Acotar «Cambiar un hábito»: no incluye dejar el consumo de sustancias.
- Confirmar con OpenAI dónde y con qué proveedores se alojan los datos.
- Opcional: alinear los nombres de las opciones de área con los de la web, para poder retirar las
  microcopias «En el formulario, elige “…”».

## Decisiones pendientes

- **Altura de la portada en móvil (aceptación 19 de la especificación):** a 390 px la portada mide
  unos 18.900 px y `#planes` empieza al 67,7 % de la página; la meta era menos de 12.000 px y
  antes del 66 %. Solo las líneas del texto final ocupan unos 12.000 px a ese ancho, así que la
  meta no se alcanza sin quitar o plegar texto. Ya se aplicaron los tres recortes previstos (aire
  de «¿Es para ti?», filas «Más adelante» más bajas y ranking compacto). Opciones: ajustar la meta
  a lo medido; plegar «Más adelante» en móvil dentro de un `<details>` (deja `#planes` cerca del
  65 %), o acortar textos. Mientras tanto, la prueba de `pruebas/humo.spec.ts` informa la medida y
  falla si la portada crece más.
- **Dominio propio .cl** y alojamiento definitivo (recomendado antes de campañas pagadas).
- **Dar de baja el sitio antiguo de Netlify** o dejar en él una sola página `noindex` que enlace a
  la nueva dirección: hoy sigue publicado con ofertas que contradicen esta web. **Bloquea el
  lanzamiento público.**
- **Cuenta de Umami** (opcional): crearla y cargar `UMAMI_WEBSITE_ID` en las variables del
  repositorio. Sin ella no hay analítica.
- **Verificación en Google Search Console** (`GOOGLE_SITE_VERIFICATION`) para enviar el sitemap.
- **Notificaciones de issues del repositorio** activadas, para recibir los avisos de la vigilancia
  de la plataforma.
- Si la postulación de 3 pasos debe volver a esta web: requiere enviar los datos a la API de la
  plataforma, cuyo código no está disponible.

## Antes de difundir

La lista completa está en la especificación (sección 7, «Lanzamiento público»). En resumen:
los datos bloqueantes cargados, la prueba de punta a punta hecha, el sitio de Netlify de baja, la
vigilancia de la plataforma funcionando, los números de ayuda verificados y la compilación con
`vars.LANZAMIENTO = 1` en verde.
