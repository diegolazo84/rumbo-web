# Verificación del recorrido completo (Rumbo 1.0)

Prueba en producción con una **cuenta de prueba controlada** (autorizada por Diego el 10-nov-2026):
sin pagos reales, sin correos a terceros y sin tocar participantes existentes. El repo es público:
las capturas no se suben aquí.

## Cómo se identifica

- Nombre: `Prueba Rumbo 1.0`. Correo: `rumbo.acompana+prueba@gmail.com` (llega a la bandeja de
  Rumbo; ningún tercero recibe correos).
- Para ubicarla: `select id, estado from public.participantes p join public.solicitudes s on s.participante_id = p.id where s.correo = 'rumbo.acompana+prueba@gmail.com';`
- Comunidad, ranking y fotos siguen apagados: la cuenta no aparece ante otras personas.

## Pasos

| # | Quién | Paso | Qué revisar |
|---|---|---|---|
| 1 | Participante | Postular en /postular/ con el correo de prueba | Pantalla final con enlace privado |
| 2 | Dueño (TOTP) | Solicitudes → «Registrar acuerdo» (plan Con acompañamiento, precio vigente) | Precio sin cambios |
| 3 | Participante | Abrir /estado/, leer Condiciones y «Aceptar» | Versión vigente registrada |
| 4 | Dueño | «Crear su espacio», asignar coach, programa de 1 semana, publicar | Sin errores |
| 5 | Participante | /mi-espacio/ → código por correo → entrar (teléfono) | Correo en menos de 1 minuto |
| 6 | Participante | Mi Rumbo, Mi plan, detalle de una acción, marcar 2 acciones | Créditos y racha según reglas |
| 7 | Participante | Pago: ver monto y vencimiento; «Ya transferí» con referencia «PRUEBA» | Aviso al equipo; sin datos bancarios si el Vault no los tiene |
| 8 | Participante | Instalar la app (PR #92), recordatorios, Mis logros, Ayuda inmediata, Tus datos | Todo responde; descarga con datos de prueba |
| 9 | Participante | Registro semanal y pedir un ajuste | Llegan al panel |
| 10 | Coach / dueño | Bandeja, revisión semanal, responder ajuste, agendar videollamada | La persona lo ve en Mi espacio |
| 11 | Dueño | Pagos: ver el aviso. Negocio y Módulos | Cifras coherentes; no registrar pagos |
| 12 | Dueño | Participante → Eliminar | Desaparece del panel |
| 13 | Dueño | Supabase → Authentication → Users → borrar `rumbo.acompana+prueba@gmail.com` | La cuenta de acceso ya no existe |

## Qué queda después de eliminarla

`eliminar_participante` borra en cascada ciclos, programas, registros, avisos, avisos de pago,
alias y lo de la comunidad. Quedan, sin datos personales: la solicitud anonimizada (estado
«retirada») y una fila de auditoría. Fuera de Supabase quedan los correos en la bandeja de Rumbo y
el registro de envíos de Brevo. Si se llegara a subir una foto, la base exige borrarla antes.
