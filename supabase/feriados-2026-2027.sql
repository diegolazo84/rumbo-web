-- Feriados nacionales de Chile. VERIFICAR contra la fuente oficial antes de pegar (los traslados a lunes dependen de la ley vigente).
insert into public.feriados (fecha, nombre) values
  ('2026-10-12', 'Encuentro de Dos Mundos'),
  ('2026-10-31', 'Día de las Iglesias Evangélicas y Protestantes'),
  ('2026-11-01', 'Día de Todos los Santos'),
  ('2026-12-08', 'Inmaculada Concepción'),
  ('2026-12-25', 'Navidad'),
  ('2027-01-01', 'Año Nuevo'),
  ('2027-03-26', 'Viernes Santo'),
  ('2027-03-27', 'Sábado Santo'),
  ('2027-05-01', 'Día del Trabajo'),
  ('2027-05-21', 'Día de las Glorias Navales'),
  ('2027-06-21', 'Día de los Pueblos Indígenas'),
  ('2027-06-28', 'San Pedro y San Pablo'),
  ('2027-07-16', 'Virgen del Carmen'),
  ('2027-08-15', 'Asunción de la Virgen'),
  ('2027-09-18', 'Independencia Nacional'),
  ('2027-09-19', 'Glorias del Ejército'),
  ('2027-10-11', 'Encuentro de Dos Mundos'),
  ('2027-10-31', 'Día de las Iglesias Evangélicas y Protestantes'),
  ('2027-11-01', 'Día de Todos los Santos'),
  ('2027-12-08', 'Inmaculada Concepción'),
  ('2027-12-25', 'Navidad')
on conflict (fecha) do update set nombre = excluded.nombre;
