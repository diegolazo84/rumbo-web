# Inventario de funciones de Rumbo

Lista única de las funciones del producto y su estado real. Se actualiza en cada PR que cambia
una función. Última revisión: 10 de noviembre de 2026 (`main` en
c3f6813).

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
| Pago | Paso del pago en Estado (#88) y «Tu pago» en Mi espacio: monto, vencimiento, datos para copiar, aviso «ya transferí» sin confirmar y correos (#90, migración 20261203 aplicada el 10-nov) | operativa; sin datos bancarios hasta crear el secreto `datos_transferencia`; correos sin clave de Brevo | Diego carga `datos_transferencia` en Vault y las claves de Brevo |
| Planificación | Mi Rumbo, Mi plan, detalle de acción, ajustes, constructor | operativa | — |
| Planificación | Acciones medibles (`anotar_cantidad`, `mis_medibles`) | operativa | — |
| Planificación | Plantillas del equipo (`guardar_plantilla`) | operativa | Editar y archivar plantillas (mejora futura) |
| Planificación | Informe de cierre de ciclo (`informe_ciclo`) | operativa | — |
| Planificación | Evolución semanal en la ficha del coach (`evolucion_semanal`) | operativa | — |
| Acompañamiento | Revisión semanal, Mi acompañamiento, bandeja del coach | operativa | — |
| Acompañamiento | Equipo: invitar, aceptar, revocar, asignar y reasignar coaches | operativa | — |
| Acompañamiento | Perfil del coach y «Tu coach» real (`actualizar_mi_perfil`) | operativa | — |
| Acompañamiento | Videollamada del plan cercano (`programar_videollamada`, `anotar_videollamada`) | operativa | — |
| Acompañamiento | Ver postulación con motivo (`ver_postulacion`) | operativa | — |
| Avisos | Mis avisos: campana, filtros, búsqueda y marcar como leído (`marcar_avisos_leidos`) | operativa (#73); avisos de la Comunidad con la migración 20261126 (antes 20261124), sin aplicar | Autorizar 20261126 al abrir la Comunidad |
| Avisos | Configuración de recordatorios: interruptor general, categorías, horario, días, correo (`guardar_recordatorios`, `correo_disponible`) | operativa (#74, migración 20261125 aplicada); logros siempre en Mis avisos; correo sin clave de Brevo | Claves de Brevo para el correo |
| Comunidad | Comunidad, crear publicación, grupos, panel de moderación | apagada (módulo «comunidad») | Revisión legal |
| Comunidad | Interior de grupo, desafíos, foto por desafío | apagada (módulo «comunidad»; #63 y migraciones 20261129–20261201 aplicadas el 10-nov) | Revisión legal; 20261126 al abrir la Comunidad |
| Gamificación | Niveles, créditos, rachas, Mis logros | operativa | — |
| Gamificación | Reconocimientos y ranking | apagada (módulos «reconocimientos» y «ranking») | Revisión legal del ranking |
| Gamificación | 10 % en una renovación (`guardar_beneficio`, `aplicar_beneficio`) y ajuste de reconocimientos (`guardar_reconocimiento`) | sin pantalla; descuento apagado; 20261120 sin aplicar | Sección del dueño; Diego decide si se activa |
| Fotos | Subida privada en las acciones | apagada (módulo «fotos», #67) | Revisión legal, iPhone real |
| Fotos | Borrado a los 30 días y Mantención | apagada (#68 y migración 20261202 aplicadas el 10-nov; tarea `fotos-depurar` inactiva, función sin desplegar, sin `depurar_fotos_url`) | Política de privacidad publicada, iPhone real y `docs/borrado-fotos.md` |
| IA | Asistente con consentimiento y aprobación del coach (`ia_*`, `mis_consultas_ia`, `guardar_ia_config`) | pantalla del participante con la maqueta definitiva (#75): 8 estados, acceso desde Apoyo, «Crear plan» como pregunta revisada, ilustraciones definitivas, móvil compacto; bandeja de revisión del coach (#76) y administración del dueño: interruptor, topes y gasto (#77); «Me sirvió»/«No me sirvió» (`ia_valoraciones`, `ia_valorar`, 20261127) y aviso «no compartida» en Mis avisos (20261128) aplicados en producción el 31-oct; apagado | Cargar la clave y prueba real con tope de USD 10 |
| Administración | Módulos | operativa | — |
| Administración | Indicadores de negocio (`indicadores`) | operativa (#84) | — |
| Administración | Pagos y devoluciones (`registrar_pago`, `registrar_devolucion`, `devolucion_sugerida`) y avisos «ya transferí» | operativa (#83, #90) | — |
| Administración | Auditoría de cambios y accesos | operativa (#87) | — |
| Perfil | Preferencias, tus datos, eliminar cuenta | operativa | — |
| Móvil | Revisión móvil del panel y Mi espacio (320 px, toques de 44 px, axe) | operativa (#89) | iPhone y Android reales |
| Móvil | Mi espacio instalable | en PR (#39, desactualizado desde el 21-oct) | Actualizar con main y autorización |

**Funciones internas, sin pantalla propia:**
- `ping`: vigilancia.
- `depuracion_*`: la usa la Edge Function de #68 (sin desplegar).

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
