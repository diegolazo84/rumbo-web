# Eliminar una foto antes de plazo, a pedido de la persona

Procedimiento **manual** para el dueño, mientras no exista una función en el panel para hacerlo
(hay una propuesta aparte, sin implementar).
Cada vez modifica producción: hazlo solo tú, con la sesión de Supabase del proyecto «rumbo».

Sigue el mismo orden que el borrado automático, para que nunca quede un registro inconsistente:
**primero se borra el archivo con la API de Storage (el panel de Supabase) y después se anota el
registro, solo si el archivo ya no existe.** Si algo falla a mitad de camino, el resultado sigue
siendo coherente y se puede repetir.

## 1. Registrar y verificar la petición

- Regístrala como petición de derechos, tipo «supresión» (panel → Contacto), con la fecha.
- Comprueba que viene de la persona: desde Mi espacio o desde el correo con que está registrada.
  Si no, pide confirmación desde ese correo antes de seguir.

## 2. Encontrar la foto (solo lectura)

En Supabase → SQL Editor, cambia el correo y ejecuta:

```sql
select r.id as registro, r.estado, o.fecha, o.titulo, r.foto_ruta, r.revisado_en
  from public.registros r
  join public.ocurrencias o on o.id = r.ocurrencia_id
  join public.participantes p on p.id = r.participante_id
 where p.correo = 'correo@ejemplo.cl' and r.foto_ruta is not null
 order by o.fecha desc;
```

Con la persona, confirma cuál es (fecha y acción). Anota `registro` y `foto_ruta`.

## 3. Según el estado

| Estado | Qué hacer |
|---|---|
| `aprobada`, `rechazada`, `hecha` o `dejada` | Sigue al paso 4. |
| `en_revision` | **No la borres todavía.** Primero se revisa como siempre (aprobada o no aprobada). Si la acción sigue abierta, la persona puede eliminarla ella misma desde la acción. Si la foto tiene contenido que no debió subirse (otras personas, salud, documentos), márcala como no aprobada con una nota breve y sigue al paso 4. Así el registro nunca queda en revisión sin evidencia. |

No lo hagas entre las 07:20 y las 07:45 UTC (04:20 a 04:45 en verano, 03:20 a 03:45 en invierno, hora de Chile), cuando corre el borrado diario.

## 4. Borrar el archivo (API de Storage)

Supabase → Storage → `evidencias` → carpeta del participante → carpeta de la acción → el
archivo de `foto_ruta` → **Delete**. No uses SQL para esto.

## 5. Anotar el registro (solo si el archivo ya no está)

Reemplaza `REGISTRO` y `RUTA` por los valores del paso 2:

```sql
update public.registros r
   set foto_ruta = null, foto_depurada_en = now()
 where r.id = 'REGISTRO' and r.foto_ruta = 'RUTA'
   and not exists (select 1 from storage.objects s where s.bucket_id = 'evidencias' and s.name = r.foto_ruta)
returning r.id, r.estado, r.foto_depurada_en;
```

- Debe devolver **1 fila**, con el mismo estado de antes. El estado, la nota, la fecha de revisión y los créditos no cambian.
- Si devuelve 0 filas, el archivo sigue existiendo o la ruta no coincide: vuelve al paso 4 y no hagas nada más.

## 6. Comprobar y cerrar

- Repite la consulta del paso 2: la foto ya no aparece.
- En el panel, Más → Mantención: «Registros sin archivo» debe estar en 0.
- Responde a la persona y cierra la petición con la fecha.

## Limitación conocida

Si la foto estaba aprobada, Mi espacio dirá «La foto se borró a los 30 días de revisada…»,
aunque se haya borrado antes. Explícaselo en tu respuesta. La función propuesta lo corrige
guardando el motivo (`a_pedido`).
