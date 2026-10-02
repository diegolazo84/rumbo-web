# Coherencia web ↔ plataforma

Esta web es solo la presentación. Postular, contacto, «Mi espacio», el estado de la solicitud y
la comunidad viven en la plataforma de Rumbo
(`https://rumbo-acompanamiento-diego.diegolazo84.chatgpt.site`, hecha con ChatGPT Sites).

Las dos tienen que decir lo mismo. Los datos de negocio de la web salen de un solo archivo,
`src/data/rumbo.ts`; esta tabla registra a qué corresponden en la plataforma y qué diferencias
quedan pendientes. **Si algo cambia en la plataforma, se cambia aquí y en `rumbo.ts`.**

Opciones del formulario leídas el 2 de octubre de 2026.

## Planes

| En la web (`planes`) | Rótulo | Precio y periodo | `?apoyo=` | Opción del formulario |
|---|---|---|---|---|
| Con acompañamiento | Seguimiento semanal | $64.000 · CLP / ciclo de 4 semanas | `coach` | «Con acompañamiento · revisión semanal» |
| Acompañamiento cercano | Más espacio para ajustar | $100.000 · CLP / ciclo de 4 semanas | `cercano` | «Acompañamiento cercano · más tiempo de revisión» |

- Precios y contenido de los planes desde el 2 de octubre de 2026. El rótulo, `?apoyo=`, el texto
  del botón y la opción del formulario no cambiaron: siguen coincidiendo con la plataforma.
- La diferencia entre planes es **escrito o conversado**: en Con acompañamiento la revisión semanal
  es escrita, en Mi espacio y en un día fijo; en Acompañamiento cercano es una videollamada de 20
  minutos con resumen escrito. El texto de las revisiones es uno solo (`TEXTO_REVISIONES`), en la
  pregunta «¿Cómo son las revisiones semanales?» y en Condiciones §5.
- Los dos planes tienen el mismo peso visual: no hay plan destacado ni etiquetas como «Más presencia».
- «Plan» es solo la modalidad comercial. Lo que prepara el equipo es siempre «programa».
- Las respuestas breves por correo (hasta 2 y hasta 4 por ciclo) **no se publican todavía**: se
  agregan a `planes` cuando exista el correo de Rumbo.
- Quien no sabe cuál elegir postula sin plan y elige «Quiero que me orienten» en el formulario.

### Glosario: revisión y registro

- **Revisión semanal:** lo que hace tu coach cada semana. Es el acompañamiento del plan: escrita en
  Con acompañamiento, por videollamada en Acompañamiento cercano.
- **Registro semanal:** lo que escribe la persona en Mi espacio (lo que anota). La revisión se hace
  aunque no haya registro: entonces se revisa lo marcado en el calendario.
- En «Lo que recibes en Mi espacio» la función de la plataforma se llama «Registro semanal escrito:
  lo que anotas, la respuesta de tu coach y el siguiente foco».

### Formato de precio

- Se escribe con punto de miles: «$64.000». La cifra grande es el total del ciclo; la equivalencia
  por semana («Equivale a $16.000 por semana») va debajo, en letra chica, y nunca como cifra
  principal (Ley N.º 19.496, art. 30).
- Hoy se publica como «Precio de referencia del piloto», porque el régimen tributario no está
  confirmado, con el compromiso `operacion.topePrecio = true`: «En Chile, el precio final, con
  impuestos incluidos, no será mayor que el publicado.» Rige en Chile porque fuera de Chile se paga
  en dólares. Con `operacion.preciosConImpuestos = true` pasa a «Impuestos incluidos».
- No se publican todavía el precio en dólares, el medio de pago, el precio del primer ciclo del
  piloto ni una política de devolución: dependen de trámites pendientes.
- No hay pagos en línea ni renovación automática.

## Áreas y `?area=`

| En la web (`areas`) | En el piloto | `?area=` | Opción del formulario |
|---|---|---|---|
| Proyectos y emprendimiento | sí | `emprendimiento` | «Emprendimiento o proyecto» |
| Estudio y aprendizaje | sí | sin valor confirmado (`operacion.paramEstudio`) | «Estudio y aprendizaje» |
| Organización y hábitos | sí | `organizacion` | «Organización y hábitos» |
| No lo tengo claro aún | sí | sin parámetro | «No lo tengo claro aún» |
| Bienestar y autoestima | más adelante | `bienestar` | «Bienestar cotidiano» |
| Cambios y relaciones | más adelante | sin valor confirmado (`operacion.paramCambios`) | «Cambios y relaciones» |
| Alimentación | más adelante | `alimentacion` | «Alimentación cotidiana» |
| Movimiento | más adelante | `movimiento` | «Movimiento» |

- **Diferencias de nombre:** «Proyectos y emprendimiento» ↔ «Emprendimiento o proyecto»,
  «Bienestar y autoestima» ↔ «Bienestar cotidiano», «Alimentación» ↔ «Alimentación cotidiana».
- La opción «Cambiar un hábito» del formulario no tiene área equivalente en la web.
- Mientras `operacion.preseleccionVerificada` sea `false`, cada enlace lleva debajo «En el
  formulario, elige “…”.» Cuando se confirme que `?area=` y `?apoyo=` preseleccionan, esa
  microcopia desaparece sola.
- `?apoyo=` solo acepta `coach` o `cercano`. Ningún otro parámetro está permitido.

## Categorías de color

| Categoría | Nombre visible | Color base | Texto | Fondo |
|---|---|---|---|---|
| `proyecto` (proyecto y cuerpo) | Proyecto | `#158b83` | `#11716a` | `#e3efea` |
| `orden` | Organización | `#3973c5` | `#3265ad` | `#e7ecf2` |
| `bienestar` | Bienestar | `#b77b16` | `#895c10` | `#f6eddd` |

Los mismos valores están en `src/styles.css` como tokens `--proyecto`, `--orden` y `--bienestar`.
La prueba de coherencia (`pruebas/humo.spec.ts`) falla si dejan de coincidir.

## Créditos y niveles

Idénticos a la plataforma (`reglasCreditos` y `niveles` en `rumbo.ts`):

- +1 crédito por acción completada.
- +2 al completar todas las acciones programadas del día.
- Ese bono sube a +3 con 3 días completos seguidos y a +4 con 7. Si la racha se corta, vuelve a +2.
- Un día sin acciones programadas no corta la racha.
- Una acción con foto suma solo cuando el equipo la aprueba.
- Los créditos no son dinero, no se canjean y no miden el valor de la persona.

Niveles: 1 Inicio (0), 2 Impulso (10), 3 Ritmo (25), 4 Constancia (50), 5 Trayectoria (100),
6 Horizonte (200), 7 Exploración (350), 8 Progreso (550), 9 Comunidad (800), 10 Legado (1100).

## Estados y etiquetas

| Estado (`estados`) | Texto | Estilo |
|---|---|---|
| `pilotoEnPreparacion` | Piloto en preparación · En línea | contorno |
| `masAdelante` | Más adelante | contorno |
| `listo` | Ya está en la plataforma | lleno |
| `seAcuerda` | Se acuerda contigo | tenue |
| `noDisponible` | Todavía no disponible | contorno |
| `enPreparacion` | En preparación | contorno |
| `ejemplo` / `ejemploIlustrativo` | Ejemplo · Ejemplo ilustrativo · nombres ficticios | punteado |

- **Inteligencia artificial:** «En preparación», igual que en la plataforma. No es parte del
  servicio y no cambia ningún calendario sin confirmación de la persona.
- **Especialistas:** «Todavía no disponible» / «hoy no lo ofrecemos». En la plataforma queda por
  corregir el texto «Especialistas cuando haga falta» (sección 8).
- No se usan «Próximamente», «lista de espera», «Plan solo plataforma con IA» ni «Más presencia».

## Textos de crisis

Los mismos números en el pie de todas las páginas, en `/ayuda/` y en Condiciones §10
(`recursosAyuda` en `rumbo.ts`):

| Número | Enlace | Quién |
|---|---|---|
| *4141 | sin enlace (iOS no marca `tel:` con «*») | Línea de Prevención del Suicidio, Ministerio de Salud |
| 131 | `tel:131` | SAMU, emergencias médicas |
| 600 360 7777 | `tel:6003607777` | Salud Responde, Ministerio de Salud (24 horas; no es gratuita: costo de llamada local) |
| 1412 | `tel:1412` | Fono Drogas y Alcohol, SENDA |
| 1455 | `tel:1455`, solo con `ayuda.incluir1455` | Fono Orientación en violencia contra las mujeres, SernamEG |

Los números se verifican en las fuentes oficiales el día del lanzamiento y la fecha queda en
`ayuda.verificadoEl`. En la plataforma falta agregar estos textos en `/postular` y `/contacto`.

## Diferencias que solo se corrigen en la plataforma

Están en `docs/pendientes.md`, en «Cambios en la plataforma»: avisos de crisis en los
formularios, el aviso de no incluir diagnósticos en el campo libre, la etiqueta del correo en
`/contacto` («El mismo correo de tu solicitud», que confunde a quien todavía no postula),
el enlace desde `/privacidad-piloto` a la privacidad de esta web, el texto de especialistas,
el alcance de «Cambiar un hábito» y la alineación de los nombres de las áreas.
