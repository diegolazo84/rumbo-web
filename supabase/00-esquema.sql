-- Generado desde especificacion-plataforma.md §6. Pegar en el editor SQL de Supabase en orden.

begin;

create extension if not exists citext   with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net;   -- avisos a Diego (05)
create extension if not exists pg_cron;  -- tareas programadas (06)

create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;
grant usage on schema privado to authenticated;   -- las políticas llaman a privado.*

-- Nada nuevo queda abierto por defecto (Supabase concede a anon/authenticated si no se revoca).
alter default privileges for role postgres in schema public  revoke all     on tables    from anon, authenticated;
alter default privileges for role postgres in schema public  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema privado revoke execute on functions from public, anon, authenticated;

-- ===================== Catálogos (semillas desde rumbo.ts) =====================
create table if not exists public.areas (
  id text primary key,                    -- Area.id: proyectos, estudio, organizacion, abierta, bienestar, cambios, alimentacion, movimiento
  nombre text not null,
  categoria text check (categoria in ('proyecto','orden','bienestar')),   -- null solo en «abierta»
  en_piloto boolean not null,
  orden smallint not null
);
create table if not exists public.planes (
  id text primary key check (id in ('coach','cercano')),                  -- Plan.param
  nombre text not null,
  rotulo text not null,
  precio_clp int not null check (precio_clp > 0),
  reordenes_por_ciclo smallint not null default 0,
  fotos_por_semana smallint not null default 0
);
create table if not exists public.niveles (
  nivel smallint primary key, minimo int not null unique, nombre text not null
);
create table if not exists public.reglas_creditos (
  id boolean primary key default true check (id),
  por_accion int not null, bono_dia_completo int not null,
  dias_racha_media int not null, bono_racha3 int not null,
  dias_racha_larga int not null, bono_racha7 int not null
);
create table if not exists public.feriados (fecha date primary key, nombre text not null);

-- Valores vivos que Diego cambia desde el panel. null = no decidido: la función que lo usa no hace nada.
create table if not exists public.ajustes_operacion (
  id boolean primary key default true check (id),
  dias_habiles_respuesta smallint not null default 2,
  postulaciones_abiertas boolean not null default true,
  tope_solicitudes_dia smallint check (tope_solicitudes_dia > 0),         -- decisión 9.3-3
  limite_ip_hora smallint not null default 5,
  limite_correo_dia smallint not null default 3,
  ausencia_hasta date,
  ausencia_texto text check (char_length(ausencia_texto) <= 200),
  version_privacidad text not null default '1.0',
  version_condiciones text not null default '1.0',
  dias_registro_tardio smallint not null default 7,                       -- decisión 9.3-10
  suspenso_por_foto boolean not null default true,                         -- decisión 9.3-4
  pausa_sin_acciones boolean,                                              -- decisión 9.3-5 (null = no decidido)
  creditos_entre_ciclos boolean not null default true,                     -- decisión 9.3-6
  dias_plazo_derechos smallint,                                            -- verificar Ley 21.719
  plazo_derechos_habiles boolean,
  -- conservación (decisión 9.3-9; null = no se borra automáticamente)
  meses_conservar_cerrada smallint, meses_conservar_interes smallint,
  meses_conservar_contacto smallint, meses_conservar_participante smallint,
  dias_conservar_foto smallint
);

-- ===================== Equipo =====================
create table if not exists public.equipo (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  creado_en timestamptz not null default now()
);
create table if not exists privado.correos_equipo (correo extensions.citext primary key);

-- ===================== Solicitudes, intereses y contacto (anónimos, solo vía RPC) =====================
create table if not exists public.solicitudes (
  id uuid primary key default gen_random_uuid(),
  creada_en timestamptz not null default now(),
  tipo text not null check (tipo in ('solicitud','interes')),
  nombre text check (char_length(nombre) between 2 and 60),
  correo extensions.citext check (char_length(correo) <= 254 and correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  area_id text references public.areas(id),              -- interés sin área = aviso de reapertura
  meta text check (char_length(meta) between 20 and 1500),
  apoyo text check (apoyo in ('coach','cercano','nose')),
  dias text[] not null default '{}' check (dias <@ array['lun','mar','mie','jue','vie']),
  franjas text[] not null default '{}' check (franjas <@ array['manana','mediodia','tarde','noche']),
  horarios_nota text check (char_length(horarios_nota) <= 200),
  zona_horaria text check (char_length(zona_horaria) <= 64),
  mayor_edad boolean not null default false,
  consentimiento jsonb,                                   -- {version_privacidad, texto, fecha}
  avisos_futuros boolean not null default false,
  estado text not null default 'recibida'
    check (estado in ('recibida','en_revision','respondida','acordada','con_espacio','cerrada','retirada')),
  motivo_cierre text check (motivo_cierre in ('capacidad','alcance','sin_respuesta','avisado')),
  nota_cierre text check (char_length(nota_cierre) <= 600),
  responder_antes date,
  respondida_en timestamptz,
  acuerdo jsonb,              -- {plan, precio_clp, inicio, semanas, dia_revision, hora_videollamada}
  condiciones_aceptadas jsonb,-- {version, texto, fecha, acuerdo}
  token_hash bytea unique,    -- sha256 del token; null al retirar
  origen jsonb,               -- {area, apoyo} de la URL
  posible_spam boolean not null default false,
  posible_duplicado boolean not null default false,
  duplicado_de uuid references public.solicitudes(id) on delete set null,
  notas_internas text check (char_length(notas_internas) <= 4000),
  participante_id uuid,
  estado_cambiado_en timestamptz not null default now(),
  cerrada_en timestamptz,
  eliminar_despues date,
  constraint con_datos     check (estado = 'retirada' or (nombre is not null and correo is not null and mayor_edad and consentimiento is not null)),
  constraint solicitud_completa check (tipo = 'interes' or estado = 'retirada' or (area_id is not null and meta is not null and apoyo is not null)),
  constraint interes_sin_texto  check (tipo = 'solicitud' or (meta is null and apoyo is null)),
  constraint cierre_con_motivo  check (estado <> 'cerrada' or motivo_cierre is not null),
  constraint acuerdo_completo   check (estado not in ('acordada','con_espacio') or acuerdo is not null)
);
create index if not exists solicitudes_bandeja on public.solicitudes (estado, responder_antes);
create index if not exists solicitudes_correo  on public.solicitudes (correo);

create table if not exists public.solicitudes_eventos (
  id bigint generated always as identity primary key,
  solicitud_id uuid not null references public.solicitudes(id) on delete cascade,
  en timestamptz not null default now(),
  de_estado text, a_estado text,
  nota text check (char_length(nota) <= 300)
);

create table if not exists public.mensajes_contacto (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  motivo text not null check (motivo in ('duda','solicitud','datos','problema','otro')),
  nombre text check (char_length(nombre) between 1 and 60),
  correo extensions.citext not null check (char_length(correo) <= 254 and correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  mensaje text not null check (char_length(mensaje) between 10 and 2000),
  estado text not null default 'nuevo' check (estado in ('nuevo','respondido','archivado')),
  posible_spam boolean not null default false,
  respondido_en timestamptz,
  eliminar_despues date
);

create table if not exists privado.limites (
  clave text not null, ventana timestamptz not null, cuenta int not null,
  primary key (clave, ventana)
);
create table if not exists privado.sales (fecha date primary key, sal bytea not null);

-- ===================== Participantes y ciclos =====================
create table if not exists public.participantes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  correo extensions.citext not null unique,
  nombre text not null check (char_length(nombre) between 2 and 60),
  nombre_preferido text check (char_length(nombre_preferido) between 2 and 60),
  solicitud_id uuid references public.solicitudes(id) on delete set null,
  estado text not null default 'invitado' check (estado in ('invitado','activo','cerrado')),
  zona_horaria text not null default 'America/Santiago',     -- la fija Diego
  ocultar_gamificacion boolean not null default false,
  creado_en timestamptz not null default now(),
  eliminar_despues date
);

create table if not exists public.ciclos (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  numero smallint not null default 1,
  plan_id text not null references public.planes(id),
  inicio date not null check (extract(isodow from inicio) = 1),     -- todo ciclo parte un lunes
  semanas smallint not null check (semanas in (4,8,12)),
  fin date not null,                                                -- inicio + semanas*7 - 1; se extiende con «Extender»
  dia_revision smallint not null check (dia_revision between 1 and 5),
  hora_videollamada time,                                           -- hora de Chile; solo cercano
  precio_acordado_clp int check (precio_acordado_clp > 0),
  condiciones jsonb,                                                -- copia de la aceptación
  estado text not null default 'activo' check (estado in ('activo','pausado','cerrado')),
  pausa_motivo text check (pausa_motivo in ('pedida','cuidado')),
  pausa_desde date, pausa_hasta date,
  foco_inicial text check (char_length(foco_inicial) <= 200),
  cerrado_en timestamptz,
  unique (participante_id, numero),
  check (fin >= inicio + semanas * 7 - 1),
  check (plan_id = 'cercano' or hora_videollamada is null)
);
create unique index if not exists un_ciclo_abierto on public.ciclos (participante_id) where estado <> 'cerrado';

-- ===================== Programa =====================
create table if not exists public.programas (
  id uuid primary key default gen_random_uuid(),
  ciclo_id uuid not null references public.ciclos(id) on delete cascade,
  participante_id uuid not null references public.participantes(id) on delete cascade,
  version int not null,
  estado text not null default 'borrador' check (estado in ('borrador','publicado','reemplazado')),
  nota_cambios text check (char_length(nota_cambios) <= 600),
  vigente_desde date, publicado_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (ciclo_id, version)
);
create unique index if not exists un_borrador  on public.programas (ciclo_id) where estado = 'borrador';
create unique index if not exists un_publicado on public.programas (ciclo_id) where estado = 'publicado';

create table if not exists public.metas (
  id uuid primary key default gen_random_uuid(),
  programa_id uuid not null references public.programas(id) on delete cascade,
  participante_id uuid not null references public.participantes(id) on delete cascade,
  clave uuid not null default gen_random_uuid(),   -- estable entre versiones (agrupa el progreso)
  titulo text not null check (char_length(titulo) between 2 and 80),
  para_que text check (char_length(para_que) <= 200),
  categoria text not null check (categoria in ('proyecto','orden','bienestar')),
  hitos jsonb not null default '[]',               -- [{texto (≤80), logrado bool}], máx. 5
  orden smallint not null default 0,
  unique (programa_id, clave),
  check (jsonb_typeof(hitos) = 'array' and jsonb_array_length(hitos) <= 5)
);

create table if not exists public.acciones (
  id uuid primary key default gen_random_uuid(),
  programa_id uuid not null references public.programas(id) on delete cascade,
  meta_id uuid not null references public.metas(id) on delete cascade,
  titulo text not null check (char_length(titulo) between 2 and 60),
  instrucciones text not null check (char_length(instrucciones) between 1 and 800),
  version_corta text check (char_length(version_corta) <= 200),
  hora time,                                       -- null = flexible
  duracion_min smallint not null check (duracion_min between 5 and 240),
  dias smallint[] not null check (cardinality(dias) between 1 and 7 and dias <@ array[1,2,3,4,5,6,7]::smallint[]),
  semana_desde smallint not null default 1 check (semana_desde between 1 and 12),
  semanas smallint not null default 1 check (semanas between 1 and 4),
  requiere_foto boolean not null default false,
  orden smallint not null default 0
);

-- Calendario materializado al publicar. Copia título, instrucciones y color: el pasado no cambia.
create table if not exists public.ocurrencias (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  ciclo_id uuid not null references public.ciclos(id) on delete cascade,
  programa_id uuid not null references public.programas(id) on delete cascade,
  accion_id uuid not null references public.acciones(id) on delete cascade,
  meta_clave uuid not null, meta_titulo text not null, categoria text not null,
  fecha date not null, hora time, duracion_min smallint not null,
  titulo text not null, instrucciones text not null, version_corta text,
  requiere_foto boolean not null,
  vigente boolean not null default true,
  anulada_motivo text check (anulada_motivo in ('ajuste','pausa')),
  anulada_en date,
  unique (accion_id, fecha)
);
create index if not exists ocurrencias_part_fecha on public.ocurrencias (participante_id, fecha) where vigente;

create table if not exists public.registros (
  id uuid primary key default gen_random_uuid(),
  ocurrencia_id uuid not null unique references public.ocurrencias(id) on delete cascade,
  participante_id uuid not null references public.participantes(id) on delete cascade,
  estado text not null check (estado in ('hecha','en_revision','aprobada','rechazada','dejada')),
  version text check (version in ('completa','corta')),
  foto_ruta text,
  explicacion text check (char_length(explicacion) between 10 and 280),
  foto_depurada_en timestamptz,
  nota_revision text check (char_length(nota_revision) <= 300),
  revisado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (estado not in ('en_revision','aprobada','rechazada')
         or foto_ruta is not null or explicacion is not null or foto_depurada_en is not null),
  check (estado <> 'rechazada' or nota_revision is not null)
);
create index if not exists registros_por_revisar on public.registros (estado) where estado = 'en_revision';

create table if not exists public.progreso_diario (
  participante_id uuid not null references public.participantes(id) on delete cascade,
  fecha date not null,
  programadas smallint not null, hechas smallint not null, en_revision smallint not null,
  creditos_acciones int not null, bono int not null, racha int not null,
  en_suspenso boolean not null default false,
  primary key (participante_id, fecha)
);
create table if not exists public.progreso (
  participante_id uuid primary key references public.participantes(id) on delete cascade,
  creditos int not null default 0, nivel smallint not null default 1,
  racha int not null default 0, bono_siguiente int not null default 2,
  actualizado_en timestamptz not null default now()
);

-- ===================== Seguimiento =====================
create table if not exists public.registros_semanales (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  ciclo_id uuid not null references public.ciclos(id) on delete cascade,
  semana smallint not null check (semana between 1 and 12),
  carga text check (carga in ('liviana','justa','pesada')),
  funciono text check (char_length(funciono) <= 1000),
  costo text check (char_length(costo) <= 1000),
  cambiar text check (char_length(cambiar) <= 1000),
  enviado_en timestamptz,
  actualizado_en timestamptz not null default now(),
  unique (ciclo_id, semana)
);
create table if not exists public.revisiones (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  ciclo_id uuid not null references public.ciclos(id) on delete cascade,
  semana smallint not null check (semana between 1 and 12),
  tipo text not null default 'escrita' check (tipo in ('escrita','videollamada')),
  que_funciono text check (char_length(que_funciono) <= 800),
  que_ajustamos text check (char_length(que_ajustamos) <= 800),
  foco text check (char_length(foco) <= 200),
  iniciada_en timestamptz not null default now(),
  publicada_en timestamptz,
  unique (ciclo_id, semana),
  check (publicada_en is null or (que_funciono is not null and foco is not null))
);
create table if not exists public.solicitudes_ajuste (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  ciclo_id uuid not null references public.ciclos(id) on delete cascade,
  creada_en timestamptz not null default now(),
  tipo text not null check (tipo in ('horarios','carga','accion','pausa','antes','otra')),
  ocurrencias uuid[] not null default '{}',
  desde date,
  texto text not null check (char_length(texto) between 10 and 800),
  pide_reorden boolean not null default false,
  estado text not null default 'enviada' check (estado in ('enviada','en_revision','respondida','sin_cambios')),
  respuesta text check (char_length(respuesta) <= 1000),
  cuenta_como_reorden boolean not null default false,
  responder_antes date,
  respondida_en timestamptz,
  check (estado not in ('respondida','sin_cambios') or respuesta is not null)
);
create table if not exists public.peticiones_derechos (
  id uuid primary key default gen_random_uuid(),
  recibida_en timestamptz not null default now(),
  origen text not null check (origen in ('mi_espacio','contacto','correo')),
  participante_id uuid references public.participantes(id) on delete set null,
  mensaje_id uuid references public.mensajes_contacto(id) on delete set null,
  correo extensions.citext not null,
  tipo text not null check (tipo in ('acceso','rectificacion','supresion','oposicion','portabilidad','bloqueo','copia_fotos','otro')),
  detalle text check (char_length(detalle) <= 1000),
  fecha_limite date,
  estado text not null default 'abierta' check (estado in ('abierta','resuelta','rechazada')),
  respuesta text check (char_length(respuesta) <= 2000),
  resuelta_en timestamptz
);
create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  en timestamptz not null default now(),
  actor uuid, accion text not null, tabla text, fila uuid,
  detalle jsonb                      -- nunca contenido personal
);

commit;
