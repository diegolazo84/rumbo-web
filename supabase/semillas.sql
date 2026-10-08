-- Catálogos desde src/data/rumbo.ts (2026-10-08). Si cambian precios, áreas o reglas, actualizar aquí también.
insert into public.areas (id, nombre, categoria, en_piloto, orden) values
  ('proyectos', 'Proyectos y emprendimiento', 'proyecto', true, 1),
  ('estudio', 'Estudio y aprendizaje', 'orden', true, 2),
  ('organizacion', 'Organización y hábitos', 'orden', true, 3),
  ('abierta', 'No lo tengo claro aún', null, true, 4),
  ('bienestar', 'Bienestar y autoestima', 'bienestar', false, 5),
  ('cambios', 'Cambios y relaciones', 'bienestar', false, 6),
  ('alimentacion', 'Alimentación', 'proyecto', false, 7),
  ('movimiento', 'Movimiento', 'proyecto', false, 8)
on conflict (id) do update set nombre = excluded.nombre, categoria = excluded.categoria,
  en_piloto = excluded.en_piloto, orden = excluded.orden;

insert into public.planes (id, nombre, rotulo, precio_clp, reordenes_por_ciclo, fotos_por_semana) values
  ('coach', 'Con acompañamiento', 'Seguimiento semanal', 64000, 0, 0),
  ('cercano', 'Acompañamiento cercano', 'Más espacio para ajustar', 100000, 2, 1)
on conflict (id) do update set nombre = excluded.nombre, rotulo = excluded.rotulo, precio_clp = excluded.precio_clp,
  reordenes_por_ciclo = excluded.reordenes_por_ciclo, fotos_por_semana = excluded.fotos_por_semana;

insert into public.niveles (nivel, minimo, nombre) values
  (1, 0, 'Inicio'), (2, 10, 'Impulso'), (3, 25, 'Ritmo'), (4, 50, 'Constancia'), (5, 100, 'Trayectoria'),
  (6, 200, 'Horizonte'), (7, 350, 'Exploración'), (8, 550, 'Progreso'), (9, 800, 'Comunidad'), (10, 1100, 'Legado')
on conflict (nivel) do update set minimo = excluded.minimo, nombre = excluded.nombre;

insert into public.reglas_creditos (id, por_accion, bono_dia_completo, dias_racha_media, bono_racha3, dias_racha_larga, bono_racha7)
values (true, 1, 2, 3, 3, 7, 4)
on conflict (id) do update set por_accion = excluded.por_accion, bono_dia_completo = excluded.bono_dia_completo,
  dias_racha_media = excluded.dias_racha_media, bono_racha3 = excluded.bono_racha3,
  dias_racha_larga = excluded.dias_racha_larga, bono_racha7 = excluded.bono_racha7;

-- Decisiones tomadas con lo recomendado (especificación §9.3); Diego las cambia desde el panel.
insert into public.ajustes_operacion (id, tope_solicitudes_dia) values (true, 15)
on conflict (id) do nothing;
