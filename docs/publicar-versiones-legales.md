# Publicar una versión legal nueva sin inconsistencias

Procedimiento para pasar Privacidad y Condiciones de una versión a otra (por ejemplo, de 1.1 a
1.2) de modo que la web y Supabase digan siempre lo mismo. Se hace solo con autorización
escrita de Diego para publicar.

## Por qué hace falta

- Al postular, `enviar_solicitud` registra la autorización con
  `ajustes_operacion.version_privacidad`.
- Al aceptar un acuerdo, la página /estado/ envía la versión que le dio la base y
  `aceptar_acuerdo` la rechaza si no coincide con `ajustes_operacion.version_condiciones`; lo
  registrado es siempre la versión de la base.
- La web cambia su texto cuando GitHub Pages termina de publicar (unos minutos después de
  integrar el PR). Entre ese momento y el cambio en la base hay una ventana en que el texto
  visible y la versión registrada no coinciden.

La ventana se cierra si, durante el cambio, nadie puede postular ni aceptar.

## Pasos

**1. Antes de integrar (solo lectura).** En Supabase → SQL Editor:

```sql
select version_privacidad, version_condiciones, postulaciones_abiertas from public.ajustes_operacion;

select count(*) as acuerdos_por_aceptar
  from public.solicitudes
 where estado = 'acordada' and condiciones_aceptadas is null;
```

Si `acuerdos_por_aceptar` es mayor que 0, hay personas que podrían aceptar durante la ventana:
esperar a que acepten o avisarles que esperen unos minutos.

**2. Cerrar postulaciones un momento.** (Cambio en producción; solo con autorización.)

```sql
update public.ajustes_operacion set postulaciones_abiertas = false;
```

**3. Integrar el PR** y esperar en GitHub → Actions que «Publicar web» termine en verde,
incluido el paso «comprobar-produccion».

**4. Comprobar la web publicada**: /privacidad/ y /condiciones/ deben decir «versión 1.2».

**5. Cambiar la base y reabrir, en una sola transacción:**

```sql
begin;
update public.ajustes_operacion
   set version_privacidad = '1.2', version_condiciones = '1.2', postulaciones_abiertas = true;
select version_privacidad, version_condiciones, postulaciones_abiertas from public.ajustes_operacion;
commit;
```

**6. Verificar**: la consulta del paso 1 debe mostrar `1.2`, `1.2` y `true`; abrir un enlace
de seguimiento de prueba y confirmar que /estado/ muestra la versión 1.2.

## Si algo falla

- Si la publicación falla en el paso 3: no tocar las versiones; reabrir con
  `update public.ajustes_operacion set postulaciones_abiertas = true;` y revisar el error.
- Si hay que volver atrás después del paso 5: revertir el PR en GitHub (botón «Revert»),
  esperar la publicación y, con postulaciones cerradas, devolver las versiones a `'1.1'`.
- Las aceptaciones ya registradas no se modifican: cada una guarda su versión y su fecha.
