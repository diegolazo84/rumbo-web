-- Deshace 20261203000000_pago_en_cuenta.sql: se borran los avisos de pago (no los pagos registrados).
drop trigger correo_pago on public.ciclos;
drop function privado.correo_pago_ciclo();
drop function public.avisar_pago(text);
drop function public.mi_pago();
drop table public.avisos_pago;
