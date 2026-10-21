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
| 3 | Mi acompañamiento | parcial | Diseño nuevo; coach real (#8); «nuevo» entre dispositivos (base lista en A5) | diseño, #8, #11 | #20 |
| 4 | 10 niveles | operativa (cálculo) | Camino de los 10 niveles, historial de subidas | diseño | — |
| 5 | Créditos, rachas y multiplicadores | operativa | Historial día a día; corrección con motivo | diseño, #9 | — |
| 6 | Recompensas y reconocimientos | inexistente | Catálogo y criterios | decisión, migración | — |
| 7 | Ranking voluntario | simulada | Alias, aceptación, cálculo semanal | #16 | — |
| 8 | Roles y asignación de coaches | desarrollada (base de datos y pruebas): roles y asignación (A1); invitar, aceptar, activar y dar permiso de moderar (B5) | Integrar, aplicar en producción; pantallas del coach, de invitación y de asignación; correo de invitación | migración, diseño | A1, B5 |
| 8b | Perfil del coach y «Tu coach» real | desarrollada (base de datos y pruebas) | Pantallas (Mi acompañamiento y panel); foto del coach con C1 | migración, diseño | A3 |
| 9 | Panel del dueño | parcial | Tablero, pagos, módulos, pantalla de auditoría. Auditoría de cambios y «Ver con motivo»: desarrolladas en la base (A2). Indicadores de negocio: función `indicadores` desarrollada y probada (B3); falta la pantalla (maqueta) y los que dependen de minutos e IA. Registro de pagos y devoluciones: desarrollado y probado (B4) | #8, diseño, migración | A2, B3, B4 |
| 10 | Panel del coach | parcial: datos de la bandeja de seguimiento desarrollados y probados (B2) | Pantalla de la bandeja y vista propia (maqueta), «Ver como» | #8, diseño | B2 |
| 11 | Notificaciones sincronizadas | parcial: base de avisos desarrollada y probada (A5) | Centro de notificaciones en la app (espera maqueta); aplicar migración | migración, diseño | A5 |
| 12 | Recordatorios automáticos | desarrollada (base de datos y pruebas): preferencias de cada persona (apagadas por defecto, hora de 7 a 22) y envío cada hora como aviso de Rumbo: acciones del día sin marcar y registro semanal el día antes de la revisión; una vez al día, nunca en pausa (D1) | Pantalla en Preferencias (maqueta); aplicar migración; enviar también por correo y al teléfono | #11, migración, diseño; externo (Brevo gratis 300/día) | D1 |
| 13 | Fotos opcionales | parcial: regla «cualquier acción» en la base, sin tope semanal (C1) | Botón en Mi espacio (maqueta), miniaturas, borrado por plazo; la columna `planes.fotos_por_semana` queda sin uso | #8, migración, decisión legal | C1 |
| 14 | Asistente de IA | inexistente | Función segura, aceptación, tope de gasto, crisis | #8, #11; externo **pagado** | — |
| 15 | Seguimiento e informes de evolución | parcial | Gráfico semanal, constancia, informe de cierre | diseño, migración | — |
| 16 | Comunidad | simulada | Alias, publicaciones, moderación, reglas | #8, #11, migración | — |
| 17 | Red de especialistas | inexistente | Modelo comercial, verificación, reservas, pagos | decisión, externo | — |
| 18 | Videollamada del plan cercano | desarrollada (base de datos y pruebas): el coach agenda cada semana con enlace https, la persona recibe aviso, se anota realizada, no asistió o cancelada; lo conversado va en la revisión de tipo videollamada (C2) | Pantallas del coach y de Mi acompañamiento (maqueta); aplicar migración | #8, migración, diseño | C2 |
| 19 | Pagos | desarrollada (base de datos y pruebas): registro manual de pagos y devoluciones (B4) | Pantalla del dueño (maqueta); aplicar migración; pago en línea después | #9, migración; SII | B4 |
| 20 | «Lo que viene» desde la base | parcial: tabla de módulos desarrollada (A4) | Que «Lo que viene» y cada sección lean la tabla; pantalla del dueño para cambiar estados | migración, diseño | A4 |
| 21 | App instalable con avisos | parcial | Service worker | — | — |
| 22 | Acciones medibles y plantillas | inexistente | Cantidades y plantillas | migración | — |
| 23 | WhatsApp | inexistente | Después de correo y avisos en el teléfono | #12; externo **pagado** | — |
| 24 | Rumbo Inicial gratuito | pendiente de evaluación | No se construye sin decisión | decisión | — |

## Pruebas de la base

`pruebas/base/matriz.mjs` comprueba en GitHub Actions, tabla por tabla y rol por rol, quién lee,
escribe y ejecuta qué. Toda tabla o función nueva debe declararse ahí (PR #21).
