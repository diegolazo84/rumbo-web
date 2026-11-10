# Revisión de fotos pendientes (procedimiento del equipo)

Las fotos en revisión **nunca se borran por plazo**: se guardan hasta que alguien las revise.
Por eso el equipo tiene que revisarlas a tiempo. **Este procedimiento depende de las personas
del equipo: el sistema no lo hace solo, no escala automáticamente ni cambia ningún estado.**

| Plazo desde que la persona envió la foto | Quién | Qué hace |
|---|---|---|
| Hasta 2 días hábiles | Coach asignado | Revisión habitual desde su bandeja: aprobada o no aprobada, con nota si corresponde. |
| 7 días corridos | Dueño | Escalamiento: le pide al coach que la revise ese mismo día o reasigna la revisión. |
| 14 días corridos | Dueño | Resolución: la revisa él mismo o contacta a la persona para resolverla. Ninguna foto debería seguir en revisión después de este día. |

## Cómo se controla hoy

- **Cada día hábil**, el coach revisa su bandeja.
- **Una vez por semana**, junto con el respaldo, el dueño mira Más → Mantención, la cifra «En
  revisión», y busca las que llevan 7 días o más:

  ```sql
  select r.id as registro, p.nombre, o.fecha, o.titulo, r.actualizado_en as enviada,
         current_date - r.actualizado_en::date as dias
    from public.registros r
    join public.ocurrencias o on o.id = r.ocurrencia_id
    join public.participantes p on p.id = r.participante_id
   where r.estado = 'en_revision'
     and r.actualizado_en < now() - interval '7 days'
   order by r.actualizado_en;
  ```

  (Solo lectura. `actualizado_en` es la última vez que la persona envió o cambió la evidencia.)
- **Antes de cerrar un ciclo**, no deben quedar revisiones pendientes con foto.

## Casos especiales

- **Foto que no debió subirse** (otras personas, salud, documentos, contenido íntimo): no esperes
  el plazo. Márcala como no aprobada con una nota breve. Si la persona lo pide, elimínala antes
  con `docs/fotos-eliminacion-anticipada.md`.
- **Coach ausente**: el dueño reasigna o revisa, sin esperar los 7 días.

Una ayuda futura posible, sin implementar: mostrar en Mantención «En revisión hace más de 7 días».
