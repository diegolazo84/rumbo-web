# Pendientes

Estado al 2 de octubre de 2026. «Implementado» = en este repositorio; «verificado» = comprobado en navegador o en producción.

## Implementado y revisado en navegador local
- «Mi espacio» en menú y pie hacia `/mi-programa` de la plataforma; redirecciones en `netlify.toml`.
- Una sola bandeja: postular y contacto llevan a la plataforma original (sin Netlify Forms).
- Ranking rotulado «Ejemplo ilustrativo · nombres ficticios», en créditos.
- Niveles y créditos desde `src/data/rumbo.ts`; el calendario de ejemplo calcula créditos, bonos y rachas con las reglas reales.
- Colores por categoría: proyecto/cuerpo `#158b83`, orden `#3973c5`, bienestar `#b77b16`.
- Lema en título y pie; estado único «Piloto en preparación».
- Áreas «Estudio» y «No lo tengo claro aún»; bienestar, alimentación y movimiento como «Próxima etapa».
- Especialistas como «Próximamente»; planes con «si se acuerda» y canal/plazo de respuestas por acordar.
- FAQ explica que «Mi espacio» abre otro dominio e inicia sesión con ChatGPT.
- Privacidad ampliada (proveedores, conservación, fotos, comunidad, derechos), robots.txt, sitemap, `lang="es-CL"`.

## Sin verificar
- Despliegue en Netlify desde este repositorio y redirecciones en producción.
- Que el formulario de la plataforma preseleccione `?area=` y `?apoyo=`.
- Recepción real de una postulación (enviar una marcada «PRUEBA – no contactar»).

## Decisiones pendientes de Diego
- Responsable identificado y correo de contacto en privacidad; revisión legal y adecuación a la Ley 21.719.
- Consentimiento explícito para datos de salud en el formulario de la plataforma.
- Canal y plazo de las respuestas breves de cada plan.
- Si la postulación de 3 pasos debe volver a esta web: requiere enviar a la API de la plataforma (falta su código).
- Imagen para redes (og:image) y analítica sin cookies.
