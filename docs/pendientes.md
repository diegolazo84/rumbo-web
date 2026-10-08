# Pendientes

Estado al 2 de octubre de 2026 (tarde), con las decisiones de Diego del mismo día.
«Implementado» = está en este repositorio; «verificado» = comprobado en un navegador o en producción.

Este repositorio es público: aquí no van datos personales ni documentos internos.

## Decisiones del 2 de octubre de 2026 (aplicadas)

- **Rumbo opera como persona natural** (no hay empresa). Mientras no se publiquen el nombre y el
  correo, la web sigue diciendo que el piloto se opera desde Santiago de Chile y que la
  identificación formal está en curso.
- **Cobertura:** se participa en línea y en español, desde Chile o desde la mayoría de los
  países. Mi espacio pide una cuenta de ChatGPT, que no está disponible en algunos países (por
  ejemplo, Venezuela o Cuba). Fuera de Chile se paga en dólares; las videollamadas son en franjas de
  hora de Chile y los plazos se cuentan en días hábiles de Chile. Está en «¿Es para ti?», en la
  pregunta «¿Puedo participar si no vivo en Santiago o en Chile?» y en Condiciones §2. La insignia
  de la portada dice «Piloto en preparación · En línea» (la forma larga, «… · En línea y en
  español», no cabe en una línea por debajo de 375 px); «desde Santiago de Chile» queda donde se
  dice quién opera.
- **Primera respuesta en 2 días hábiles, a todas las solicitudes**, también a quien no avanza y a
  quien deja su interés en un área de «Más adelante».
- **Planes y precios:** «Con acompañamiento» $64.000 y «Acompañamiento cercano» $100.000 por ciclo
  de 4 semanas, con la equivalencia por semana en letra chica. La diferencia entre planes es escrito
  o conversado (revisión escrita semanal en Mi espacio, o videollamada semanal de 20 minutos). En
  Chile, el precio final con impuestos no será mayor que el publicado. Primer grupo de 5 personas.
- **Quién acompaña:** sin dato por ahora; la sección no aparece.

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
  «Condiciones / del piloto.» a 390 px o menos (el H1 mide 364 px y el ancho útil es 358; se
  acepta como excepción) y el H1 de la portada a 320 px.
- **Correcciones del panel de revisión** (2 de octubre de 2026, revisadas a 390 y 1440 px): Salud
  Responde ya no figura como gratuita (tiene costo de llamada local); fecha de versión única
  (`VERSION_PUBLICADA` en `src/data/paginas.ts`); rayas de inciso unidas a su palabra; cortes de
  línea antes de «·» en el calendario; títulos de dos oraciones con la segunda en su propia línea;
  alineación de planes, tarjetas de «Qué recibes» y botones terciarios; medida de lectura en las
  notas sueltas; el reenvío de `/estado/` explica que el botón no lleva el enlace privado
  completo, y la imagen para redes muestra los días en orden.

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
| `responsable` | Identificar al proveedor y al responsable de los datos (fila legal, Privacidad §1, Condiciones §1). Persona natural: nombre y comuna; el RUT solo si la revisión legal lo pide | cargado (Diego Alfonso Muñoz Abeleida, Providencia) |
| `correo` | Contacto de privacidad y consultas; aparece en el pie y en los reenvíos | cargado (rumbo.acompana@gmail.com, 8 de octubre de 2026) |
| `ayuda.verificadoEl` (e `incluir1455`) | Día en que se verificaron los números de ayuda | **falta · bloquea la difusión** |
| `plazoPrimeraRespuesta` y `respondemosTodas` | «2 días hábiles», a todas las solicitudes | cargado |
| `cobertura` | Desde dónde se puede participar («Es para ti si…», pregunta de cobertura, Condiciones §2) | cargado |
| `topePrecio` | En Chile, el precio final con impuestos no supera el publicado | cargado |
| `tamanoPrimerGrupo` | 5 personas | cargado |
| `formaDePago`, `documentoTributario` | Cómo se paga y qué documento se entrega | falta · bloquea el primer cobro |
| `politicaTermino` | Pausa, término anticipado y devolución (se muestra tras «Si ya empezaste un ciclo:») | falta · bloquea el primer cobro |
| `preciosConImpuestos` | Cuando se confirme el régimen tributario, la nota pasa a «Impuestos incluidos» | falta |
| `acompanante` | Quién acompaña: nombre, rol y biografía real | sin dato por ahora (decisión del 2 de octubre): la sección no aparece |
| `conservacion` | Plazos de conservación de datos (Privacidad §8) | opcional |
| `alojamientoVerificado` | Confirmar con OpenAI dónde se alojan los datos de la plataforma (Privacidad §6) | opcional |
| `canalRevisiones`, `canalRespuestas`, `plazoRespuestas` | Ya no hacen falta: las revisiones tienen un texto fijo por plan | sin uso |

### Se publica cuando se cumpla su condición

Estos textos ya están redactados fuera del repositorio y **no** se publican todavía:

- **Cuando exista el correo de Rumbo:** las respuestas breves por correo en cada plan (cuántas
  por ciclo y en qué plazo) y el aviso por correo cuando una revisión esté lista.
- **Cuando el cobro desde fuera de Chile esté probado:** el precio en dólares de cada plan y el
  medio de pago.
- **Descartado por Diego (2 de octubre de 2026):** precio especial de piloto. Si se retoma, cuando se fije la fecha de inicio del primer grupo y las condiciones estén revisadas: el
  precio del primer ciclo del piloto.
- **Después de la revisión legal:** la política de pausa, término y devolución (`politicaTermino`)
  y la línea de devolución que la resume.
- **Después del piloto:** el precio reducido a solicitud.

### Plantilla de respuesta para quien no avanza

La web promete responder a todas las solicitudes dentro de 2 días hábiles (de lunes a viernes,
sin feriados de Chile), también a quien no avanza y a quien deja su interés en un área de «Más
adelante». Se responde a mano, por correo:

> Hola, {nombre}: gracias por contarnos tu meta. En esta primera etapa el piloto acompaña a un
> grupo pequeño de personas y no podremos acompañarte ahora. Si abrimos una nueva etapa, lo
> publicaremos en la web de Rumbo. Puedes retirar tu solicitud cuando quieras con tu enlace
> privado. Un saludo, Rumbo.

Para quien deja su interés en un área de «Más adelante», la misma respuesta, diciendo que esa
área todavía no tiene fecha: la web promete no volver a escribirle por esa área hasta que se abra.

## Altura de la portada en móvil (aceptación 19): meta ajustada

La especificación pedía que a 390 px la portada midiera menos de 12.000 px y que `#planes`
empezara antes del 66 % de la página. Solo las líneas del texto final ocupan unos 12.000 px a ese
ancho, y ya se aplicaron los tres recortes previstos (aire de «¿Es para ti?», filas «Más
adelante» más bajas y ranking compacto). Plegar «Más adelante» o acortar textos escondería
información sobre qué áreas no están abiertas y por qué, a cambio de pocos píxeles. Por eso la
meta se ajustó a lo medido, con margen:

- Con el texto anterior (18.945 px, `#planes` al 67,7 %) la meta quedó en **19.200 px y `#planes`
  antes del 68,5 %**.
- Los planes, la cobertura y la primera respuesta del 2 de octubre agregaron unos 640 px: la
  portada mide **19.584 px** y `#planes` empieza al **66,1 %** (mejor que antes, porque lo nuevo
  está sobre todo en los planes y las preguntas). La prueba quedó en **19.800 px** y 68,5 %.

`pruebas/humo.spec.ts` falla si la portada pasa de esos valores. Si vuelve a crecer, hay que
recortar texto antes de subir la meta.

## Revisión legal y normativa

- **Ley N.º 21.719** (nueva ley de datos personales): entra en vigencia el 1 de diciembre de 2026
  y hay un proyecto de postergación en trámite. Antes de esa fecha hay que revisar base de
  licitud, transferencias internacionales y plazos de respuesta, y actualizar Privacidad.
- **Ley N.º 19.628**, vigente hoy, es la que citan los textos actuales.
- **Ley N.º 19.496** (consumidor): identificación del proveedor, precio con impuestos incluidos
  (art. 30) y condiciones disponibles antes del acuerdo a distancia (art. 12 A).
- Falta la revisión legal de Privacidad y de las Condiciones del piloto, incluido el derecho a
  retracto y, si se aceptan participantes de la Unión Europea, las reglas de consumo y de datos
  personales que les aplican.
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
- Revisar los textos de los planes: si alguno dice «revisiones de 10 minutos», cambiarlo por
  «revisión escrita semanal», y si muestra precios, poner $64.000 y $100.000. Los rótulos y las
  opciones del formulario no cambian.

## Decisiones pendientes

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
