# Inventario de funciones de Rumbo

Lista única de las funciones del producto y su estado real. Se actualiza en cada PR que cambia
una función. Última revisión: 30 de octubre de 2026 (auditoría de cierre de Rumbo 1.0, `main` en
735df8d).

**Estados:**
- *operativa*: funciona en producción.
- *apagada*: está en producción, pero detrás de un módulo apagado.
- *en PR*: código y pruebas listos en un PR sin publicar.
- *sin pantalla*: la base existe en producción, pero ninguna pantalla la usa.
- *próximamente*: fuera de Rumbo 1.0.

Nada pasa a *operativa* sin estar implementado, probado, publicado y aplicado en producción con
autorización de Diego.

## Rumbo 1.0

| Área | Función | Estado | Falta |
|---|---|---|---|
| Ingreso | Postular, acuerdo, crear espacio, ingreso por código | operativa | Recorrido completo con cuenta de prueba (bloque 9) |
| Planificación | Mi Rumbo, Mi plan, detalle de acción, ajustes, constructor | operativa | — |
| Planificación | Acciones medibles (`anotar_cantidad`, `mis_medibles`) | sin pantalla | Campos en el constructor; anotar en el detalle (maqueta) |
| Planificación | Plantillas del equipo (`guardar_plantilla`) | sin pantalla | Catálogo dentro del constructor |
| Planificación | Informe de cierre de ciclo (`informe_ciclo`) | sin pantalla | Pantalla de la persona (maqueta) y ficha |
| Acompañamiento | Revisión semanal, Mi acompañamiento, bandeja del coach | operativa | — |
| Acompañamiento | Equipo: invitar, aceptar, revocar, asignar y reasignar coaches | sin pantalla | Pantalla Equipo (bloque 2) |
| Acompañamiento | Perfil del coach y «Tu coach» real (`actualizar_mi_perfil`) | sin pantalla | Mi perfil en el panel (bloque 2) |
| Acompañamiento | Videollamada del plan cercano (`programar_videollamada`, `anotar_videollamada`) | sin pantalla (Mi acompañamiento ya la muestra) | Sección en la ficha (bloque 2) |
| Acompañamiento | Ver postulación con motivo (`ver_postulacion`) | sin pantalla | Botón en la ficha (bloque 2) |
| Avisos | Mis avisos: campana, filtros, búsqueda y marcar como leído (`marcar_avisos_leidos`) | operativa (#73); avisos de la Comunidad con la migración 20261126 (antes 20261124), sin aplicar | Autorizar 20261126 al abrir la Comunidad |
| Avisos | Configuración de recordatorios: interruptor general, categorías, horario, días, correo (`guardar_recordatorios`, `correo_disponible`) | operativa (#74, migración 20261125 aplicada); logros siempre en Mis avisos; correo sin clave de Brevo | Claves de Brevo para el correo |
| Comunidad | Comunidad, crear publicación, grupos, panel de moderación | apagada (módulo «comunidad») | Revisión legal |
| Comunidad | Interior de grupo, desafíos, foto por desafío | en PR (#61, #62, #63), con 3 migraciones sin aplicar | Autorización |
| Gamificación | Niveles, créditos, rachas, Mis logros | operativa | — |
| Gamificación | Reconocimientos y ranking | apagada (módulos «reconocimientos» y «ranking») | Revisión legal del ranking |
| Gamificación | 10 % en una renovación (`guardar_beneficio`, `aplicar_beneficio`) y ajuste de reconocimientos (`guardar_reconocimiento`) | sin pantalla; descuento apagado | Sección del dueño; Diego decide si se activa |
| Fotos | Subida privada en las acciones | apagada (módulo «fotos», #67) | Revisión legal, iPhone real |
| Fotos | Borrado a los 30 días y Mantención | en PR (#68), con 1 migración sin aplicar | Etapas 3 a 8 de la guía de despliegue |
| IA | Asistente con consentimiento y aprobación del coach (`ia_*`, `mis_consultas_ia`, `guardar_ia_config`) | pantalla del participante con la maqueta definitiva (#75): 8 estados, acceso desde Apoyo, «Crear plan» como pregunta revisada, ilustraciones definitivas, móvil compacto; bandeja de revisión del coach (#76); «Me sirvió»/«No me sirvió» (`ia_valoraciones`, `ia_valorar`, 20261127) y aviso «no compartida» en Mis avisos (20261128) aplicados en producción el 31-oct; apagado | Administración (#77); prueba real con tope de USD 10 |
| Administración | Módulos | operativa | — |
| Administración | Indicadores de negocio (`indicadores`) | sin pantalla | Pantalla Negocio |
| Administración | Pagos y devoluciones (`registrar_pago`, `registrar_devolucion`, `devolucion_sugerida`) | sin pantalla | Pantalla Pagos (transferencia y PayPal) |
| Administración | Auditoría de cambios y accesos | sin pantalla | Pantalla Auditoría |
| Perfil | Preferencias, tus datos, eliminar cuenta | operativa | — |
| Móvil | Mi espacio instalable | en PR (#39) | Autorización |

**Funciones internas, sin pantalla propia:**
- `ping`: vigilancia.
- `depuracion_*`: la usa la Edge Function de #68.

## Próximamente (fuera de Rumbo 1.0)

| Función | Estado |
|---|---|
| Especialistas Rumbo: perfiles, credenciales, reservas, mensajes y comisión (22 funciones `*especialista*`, `*reserva*`, `*credencial*`) | Base aplicada, sin pantallas, módulo apagado |
| Beneficios por convenio y premios físicos (`otorgar_beneficio`) | Base aplicada, sin pantalla |
| Pago en línea con tarjeta | No existe; requiere SII y pasarela |
| WhatsApp, avisos push, app en tiendas, IA avanzada | No existen |
| Rumbo Inicial gratuito | Pendiente de evaluación |

## Pruebas de la base

`pruebas/base/matriz.mjs` comprueba en GitHub Actions, tabla por tabla y rol por rol, quién lee,
escribe y ejecuta qué. Toda tabla o función nueva debe declararse ahí.
