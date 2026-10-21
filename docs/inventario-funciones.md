# Inventario de funciones de Rumbo

Lista única de todas las funciones del producto y su estado real. Se actualiza en cada PR que
cambia una función. Viene de la auditoría del 21 de octubre de 2026.

**Estados:** *operativa* (funciona en producción) · *parcial* (una parte real funciona) ·
*simulada* (se ve pero no funciona) · *inexistente* · *desarrollada* (código y pruebas listos,
falta integrar o activar). Nada pasa a *operativa* sin estar implementado, probado, integrado y
aplicado en producción con autorización de Diego.

**Dependencias:** `diseño` (espera la maqueta aprobada) · `migración` (pegar en Supabase con
autorización) · `externo` (servicio externo; se indica si es gratis) · `decisión` (comercial o
legal de Diego).

| # | Función | Estado | Falta | Depende de | PR |
|---|---|---|---|---|---|
| 1 | Postular, acuerdo, crear espacio, ingreso, Mi plan, ajustes, registro y revisión semanal, constructor | operativa | Recorrido completo con correo de prueba | — | — |
| 1b | Formulario de contacto | **con error** (no guarda mensajes) | Aplicar el arreglo | migración | #22 |
| 2 | Mi Rumbo rediseñado | parcial | Integrar; meta principal elegida por el coach | autorización | #19 |
| 3 | Mi acompañamiento | parcial | Diseño nuevo; coach real (#8); «nuevo» entre dispositivos (#11) | diseño, #8, #11 | #20 |
| 4 | 10 niveles | operativa (cálculo) | Camino de los 10 niveles, historial de subidas | diseño | — |
| 5 | Créditos, rachas y multiplicadores | operativa | Historial día a día; corrección con motivo | diseño, #9 | — |
| 6 | Recompensas y reconocimientos | inexistente | Catálogo y criterios | decisión, migración | — |
| 7 | Ranking voluntario | simulada | Alias, aceptación, cálculo semanal | #16 | — |
| 8 | Roles y asignación de coaches | desarrollada (base de datos y pruebas) | Integrar, aplicar en producción; pantallas del coach y de asignación | migración, diseño | A1 |
| 8b | Perfil del coach y «Tu coach» real | desarrollada (base de datos y pruebas) | Pantallas (Mi acompañamiento y panel); foto del coach con C1 | migración, diseño | A3 |
| 9 | Panel del dueño | parcial | Tablero, pagos, módulos, pantalla de auditoría. Auditoría de cambios y «Ver con motivo»: desarrolladas en la base (A2) | #8, diseño, migración | A2 |
| 10 | Panel del coach | parcial | Vista propia, bandeja de alertas, «Ver como» | #8, diseño | — |
| 11 | Notificaciones sincronizadas | inexistente | Avisos y leídos en la base | #8, migración | — |
| 12 | Recordatorios automáticos | inexistente | Preferencias, envío programado, avisos en el teléfono | #11; externo (Brevo gratis 300/día) | — |
| 13 | Fotos opcionales | parcial | Subida, regla «cualquier acción», miniaturas, borrado por plazo | #8, migración, decisión legal | — |
| 14 | Asistente de IA | inexistente | Función segura, aceptación, tope de gasto, crisis | #8, #11; externo **pagado** | — |
| 15 | Seguimiento e informes de evolución | parcial | Gráfico semanal, constancia, informe de cierre | diseño, migración | — |
| 16 | Comunidad | simulada | Alias, publicaciones, moderación, reglas | #8, #11, migración | — |
| 17 | Red de especialistas | inexistente | Modelo comercial, verificación, reservas, pagos | decisión, externo | — |
| 18 | Videollamada del plan cercano | parcial | Enlace, asistencia y notas | #8 | — |
| 19 | Pagos | inexistente | Registro manual; después pago en línea | #9; SII | — |
| 20 | «Lo que viene» desde la base | simulada | Tabla de módulos | #8, migración | — |
| 21 | App instalable con avisos | parcial | Service worker | — | — |
| 22 | Acciones medibles y plantillas | inexistente | Cantidades y plantillas | migración | — |
| 23 | WhatsApp | inexistente | Después de correo y avisos en el teléfono | #12; externo **pagado** | — |
| 24 | Rumbo Inicial gratuito | pendiente de evaluación | No se construye sin decisión | decisión | — |

## Pruebas de la base

`pruebas/base/matriz.mjs` comprueba en GitHub Actions, tabla por tabla y rol por rol, quién lee,
escribe y ejecuta qué. Toda tabla o función nueva debe declararse ahí (PR #21).
