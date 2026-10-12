# Métricas de negocio de Rumbo

Preparado el 12 de octubre de 2026 (Etapa 0). En esta etapa **solo se definen** los
indicadores, su fórmula y su fuente. No se instala ningún servicio de analítica externo. Las
fuentes son tablas que ya existen en Supabase, salvo las marcadas «nueva», que se crearán en la
etapa que corresponda. No hay metas numéricas: se fijarán con los datos del piloto.

Periodo por defecto: semana (lunes a domingo, hora de Chile) y ciclo de 4 semanas.

## Conversión

| Indicador | Fórmula | Fuente |
|---|---|---|
| Visitas a la portada | Visitas únicas de la semana | Umami u otra analítica sin cookies (no activa hoy; sin ella, no se mide) |
| Postulaciones | Solicitudes con `tipo = 'solicitud'` creadas en el periodo | `solicitudes` |
| Tasa de postulación | Postulaciones ÷ visitas | Las dos anteriores |
| Respuesta a tiempo | Solicitudes respondidas dentro de 2 días hábiles ÷ solicitudes recibidas | `solicitudes_eventos` (fechas de cambio de estado) |
| Tasa de acuerdo | Solicitudes que llegan a `acordada` ÷ solicitudes revisadas | `solicitudes.estado` y `solicitudes_eventos` |
| Tasa de aceptación | Acuerdos aceptados (`condiciones_aceptadas` no vacío) ÷ acuerdos enviados | `solicitudes` |
| Conversión a pago | Ciclos con pago registrado ÷ acuerdos aceptados | `pagos` (nueva, Etapa 3) |
| Mezcla de planes | Ciclos por plan ÷ total de ciclos | `ciclos.plan_id` |

## Activación

| Indicador | Fórmula | Fuente |
|---|---|---|
| Ingreso a Mi espacio | Participantes que entraron al menos una vez en la semana 1 ÷ participantes con espacio creado | `participantes.user_id` y `auth.users.last_sign_in_at` |
| Primera acción | Participantes con al menos 1 registro en los 3 primeros días ÷ participantes que empezaron | `registros`, `ciclos.inicio` |
| Primer registro semanal | Participantes que enviaron el registro de la semana 1 ÷ participantes que empezaron | `registros_semanales` |

## Cumplimiento

| Indicador | Fórmula | Fuente |
|---|---|---|
| Cumplimiento semanal | Acciones completadas ÷ acciones programadas de la semana, por persona (es la base del futuro ranking voluntario) | `ocurrencias`, `registros` |
| Días completos | Días con todas las acciones programadas completadas ÷ días con acciones | `progreso_diario` |
| Registro semanal a tiempo | Registros semanales enviados antes de la revisión ÷ registros esperados | `registros_semanales`, `ciclos.dia_revision` |
| Revisión a tiempo | Revisiones escritas en su día ÷ revisiones esperadas | `revisiones` |
| Ajustes | Solicitudes de ajuste por participante y ciclo | `solicitudes_ajuste` |

## Retención y renovación

| Indicador | Fórmula | Fuente |
|---|---|---|
| Activos por semana | Participantes con al menos 1 registro en la semana ÷ participantes en ciclo activo | `registros`, `ciclos` |
| Abandono en el ciclo | Ciclos cerrados antes de `fin` ÷ ciclos iniciados | `ciclos.estado`, `ciclos.fin` |
| Pausas | Ciclos que usaron pausa ÷ ciclos | `ciclos.estado` (`pausado`) |
| Renovación | Participantes con ciclo `numero = n + 1` ÷ participantes que cerraron el ciclo `n` | `ciclos.numero` |
| Devoluciones | Monto devuelto ÷ monto cobrado | `pagos` (nueva, Etapa 3) |

## Costos humanos

| Indicador | Fórmula | Fuente |
|---|---|---|
| Minutos por participante y semana | Minutos de revisión escrita + videollamada + mensajes | `revisiones.minutos` (nueva; hoy no se registra) |
| Costo humano por ciclo | Minutos por ciclo × valor de la hora del acompañante | Lo anterior y un valor que fija Diego |
| Participantes por acompañante | Participantes activos ÷ personas del equipo activas | `ciclos`, `equipo` |

## Costos de IA (cuando exista el asistente, Etapa 8)

| Indicador | Fórmula | Fuente |
|---|---|---|
| Uso de IA | Mensajes al asistente por participante y semana | `ia_uso` (nueva) |
| Tokens y costo | Tokens de entrada y salida × precio de lista del modelo | `ia_uso` (nueva) |
| Costo de IA por ciclo | Suma del costo de IA del ciclo ÷ participantes | `ia_uso` |
| Propuestas aprobadas | Propuestas de la IA aprobadas por quien acompaña ÷ propuestas hechas | Tabla de propuestas (nueva) |
| Topes alcanzados | Participantes que llegaron al límite semanal ÷ participantes con IA | `ia_uso` |

## Margen

| Indicador | Fórmula | Fuente |
|---|---|---|
| Ingreso por ciclo | Suma de pagos del ciclo | `pagos` (nueva) |
| Costo fijo mensual | Supabase + dominio + Brevo + otros servicios | Registro manual de Diego |
| Margen por ciclo | Ingreso − costo humano − costo de IA − parte del costo fijo | Los anteriores |

## Reglas

- Los indicadores se calculan sobre datos agregados; el panel no muestra rankings internos de personas.
- No se envían datos personales a ninguna herramienta de analítica.
- Las consultas se harán como vistas de solo lectura para el panel en la etapa que se apruebe.
