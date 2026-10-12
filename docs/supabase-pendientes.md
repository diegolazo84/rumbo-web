# Supabase: configuraciones pendientes y consultas de verificación

Preparado el 12 de octubre de 2026 (Etapa 0). **Todas las consultas son de solo lectura**: se
pegan en Supabase → SQL Editor → «New query» → «Run». No cambian datos. Ninguna muestra el valor
de una clave.

## 1. Avisos de postulación (¿tienen las claves?)

```sql
select name, created_at from vault.secrets
 where name in ('resend_api_key', 'aviso_destino', 'ntfy_tema') order by name;
```

Debe aparecer `resend_api_key` y `aviso_destino`, o `ntfy_tema`. Si no aparece ninguna, las
postulaciones nuevas no te avisan: hay que revisar el panel a mano.

## 2. Tareas programadas

```sql
select jobname, schedule, active from cron.job order by jobname;

select j.jobname, d.status, d.start_time, left(d.return_message, 120) as mensaje
  from cron.job_run_details d join cron.job j using (jobid)
 where d.start_time > now() - interval '2 days'
 order by d.start_time desc limit 30;
```

Deben estar `rumbo-por-hora`, `rumbo-recalcular` y `rumbo-conservacion`, activas y con
`status = succeeded`.

## 3. Hook de registro

En Authentication → Hooks debe estar activo «Before User Created» con la función
`privado.antes_de_crear_usuario`. Consulta de apoyo:

```sql
select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'privado' and proname = 'antes_de_crear_usuario';
```

## 4. Ajustes de operación

```sql
select version_privacidad, version_condiciones, dias_plazo_derechos,
       meses_conservar_cerrada, meses_conservar_interes, meses_conservar_contacto,
       meses_conservar_participante, dias_conservar_foto, postulaciones_abiertas
  from public.ajustes_operacion;
```

Hoy se espera `1.1` / `1.1` y los plazos vacíos. Los plazos se deciden con el abogado
(`docs/revision-legal.md`). Las versiones pasan a `1.2` solo el día que se publique la Etapa 0.

## 5. Seguridad de las tablas

```sql
select relname as tabla, relrowsecurity as rls
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname in ('public','privado') and c.relkind = 'r' order by 2, 1;
```

Todas deben decir `true`. Y pegar de nuevo `supabase/verificacion.sql`: debe terminar en «ok».

## 6. Cuentas de acceso sin participante

```sql
select count(*) as cuentas_sin_participante
  from auth.users u
 where not exists (select 1 from public.participantes p where p.user_id = u.id)
   and not exists (select 1 from public.equipo e where e.user_id = u.id);
```

Si es mayor que 0, hay cuentas que quedaron tras una eliminación (ver `docs/eliminacion-cuentas.md`).

## Configuraciones pendientes (no se pueden hacer desde el código)

| # | Qué | Dónde | Estado |
|---|---|---|---|
| 1 | Avisos de postulación: no hay claves (verificado el 12 de octubre). Activar con ntfy | `docs/avisos.md` | Pendiente |
| 2 | Respaldo manual semanal (decisión de Diego del 12 de octubre) | `docs/respaldo-y-restauracion.md` | Primera copia y prueba pendientes |
| 3 | Plazos de conservación | `ajustes_operacion` | Tras revisión legal |
| 4 | Versiones legales 1.2 | `ajustes_operacion` | El día que se publique |
| 5 | Cabecera de la IP del cliente (comentario «VERIFICAR» en `01-funciones.sql`) | Prueba con una postulación | Sin confirmar |
| 6 | Cron de GitHub «Vigilar la plataforma» activo | GitHub → Actions | Revisar cada 60 días sin actividad |
