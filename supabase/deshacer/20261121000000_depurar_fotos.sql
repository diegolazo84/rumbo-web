-- Deshace 20261121000000_depurar_fotos.sql: quita la tarea programada, las funciones, los
-- registros de ejecuciones, la llave interna y la fecha de subida de las fotos. No toca archivos
-- ni registros de las personas (las fotos ya borradas no vuelven).
select cron.unschedule('fotos-depurar') where exists (select 1 from cron.job where jobname = 'fotos-depurar');
drop function public.pedir_depuracion_fotos();
drop function public.estado_depuracion_fotos();
drop function privado.lanzar_depuracion_fotos(text);
drop function public.depuracion_terminar(bigint, int, text);
drop function public.depuracion_huerfanos();
drop function public.depuracion_fallo(bigint, uuid[], text);
drop function public.depuracion_confirmar(bigint, uuid[]);
drop function public.depuracion_lote(bigint, int);
drop function public.depuracion_iniciar(text);
drop function public.depuracion_token_valido(text);
delete from vault.secrets where name in ('depurar_fotos_token', 'depurar_fotos_url');
drop function privado.conteo_fotos();
drop function privado.archivo_existe(text);
drop function privado.fotos_con_plazo();
drop function privado.dias_conservar_foto();
drop function privado.horas_seguridad_huerfanos();
drop table privado.depuracion_fotos_fallos;
drop table privado.depuracion_fotos;
drop trigger foto_subida on public.registros;
drop function privado.anotar_foto_subida();
alter table public.registros drop column foto_subida_en;
