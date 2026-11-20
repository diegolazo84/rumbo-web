# Activar los módulos de Rumbo 1.0

Qué falta para abrir cada función a personas reales y quién lo hace. Todo se enciende en el panel,
**Más → Módulos** (`/equipo/modulos/`, con TOTP): primero «probado» (solo el equipo la ve) y,
después de revisarla, «habilitado».

| Módulo | Requisitos antes de «habilitado» | Lo hace |
|---|---|---|
| Reconocimientos | Ninguno técnico (tablas y tarea ya en producción). Revisar textos en Más → Reconocimientos y beneficio (PR #93). | Diego |
| Ranking | Publicar Privacidad y Condiciones 1.3 (revisión legal antes). Necesita 3 o más participantes con alias para mostrarse. | Diego + revisión legal |
| Comunidad (incluye grupos y desafíos) | Publicar 1.3. Aplicar la migración 20261126 (avisos de respuestas y reportes). Tener al menos una persona con permiso de moderar. | Diego autoriza («autorizo migrar 20261126») |
| Fotos de acciones | Publicar 1.3. Activar el borrado automático (docs/borrado-fotos.md: desplegar `depurar-fotos`, secreto `depurar_fotos_url`, encender `fotos-depurar`). Probar en un iPhone real. | Diego autoriza; prueba en su iPhone |
| Descuento 10 % | Aplicar la migración 20261120 (tarjeta en Mis logros). Activar en Más → Reconocimientos y beneficio (PR #93). | Diego autoriza |

## Orden recomendado

1. Reconocimientos: «probado», revisar con la cuenta de prueba, «habilitado».
2. Revisión legal de las versiones 1.3 (texto completo con `LEGAL_13=1 npm run build`).
3. Publicar 1.3 siguiendo docs/publicar-versiones-legales.md (en ese commit: `LEGAL_13 = true` en
   `src/data/rumbo.ts` y la fecha de `VERSION_PUBLICADA`; en la base, versiones `'1.3'`).
4. Ranking y Comunidad («probado» y luego «habilitado»).
5. Fotos, cuando el borrado esté activo y probado en iPhone.

El asistente con IA no es un módulo de esta lista: sigue apagado (docs/asistente-ia.md).
