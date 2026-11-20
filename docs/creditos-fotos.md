# Créditos de las fotografías

Todas las fotos de la web son fotografías reales de [Unsplash](https://unsplash.com), descargadas el
18-nov-2026 y servidas desde este mismo sitio (`public/fotos/`, AVIF y WebP en varios tamaños).
Ninguna es Unsplash+ ni está generada con IA. Licencia: [Unsplash License](https://unsplash.com/license)
(uso comercial gratuito, sin obligación de atribuir; aquí se acredita igual). No se pueden vender
sin modificación ni usar para armar un servicio de fotos que compita con Unsplash.

Las personas que aparecen son modelos de banco de imágenes: no son participantes, coaches ni
clientes de Rumbo, y la web nunca las presenta así.

| Archivo en `public/fotos/` | Dónde se usa | Autor | Foto original |
|---|---|---|---|
| `portada-*` | Portada, primer pantallazo | FOTOGRAFÍA EDITORIAL ([@fotografiaeditorial](https://unsplash.com/@fotografiaeditorial)) | https://unsplash.com/photos/qhJqu2zmotc |
| `camino-proyecto-*` | Portada, camino «Proyectos y emprendimiento» | Miguel Dominguez ([@migueldominguez](https://unsplash.com/@migueldominguez)) | https://unsplash.com/photos/ITkU8nYU7Fo |
| `camino-estudio-*` | Portada, camino «Estudio y aprendizaje» | Vitaly Gariev ([@silverkblack](https://unsplash.com/@silverkblack)) | https://unsplash.com/photos/ypEXEEt6mUc |
| `camino-organizacion-*` | Portada, camino «Organización y hábitos» | Alexa Williams ([@glamorousplanning](https://unsplash.com/@glamorousplanning)) | https://unsplash.com/photos/sXZ8vvFrTCI |
| `camino-sin-claridad-*` | Portada, «No lo tengo claro aún» | Kelly Sikkema ([@kellysikkema](https://unsplash.com/@kellysikkema)) | https://unsplash.com/photos/alS_6YuAsXI |
| `como-funciona-*` | Portada, «Cómo funciona» | Bluestonex ([@bluestonex_apphaus](https://unsplash.com/@bluestonex_apphaus)) | https://unsplash.com/photos/9Pqp6CUaIu4 |
| `acompanamiento-*` | Mi espacio, portada de «Mi acompañamiento» | Bluestonex ([@bluestonex_apphaus](https://unsplash.com/@bluestonex_apphaus)) | https://unsplash.com/photos/9Pqp6CUaIu4 |
| `planes-*` | Portada, planes | Covene ([@covene](https://unsplash.com/@covene)) | https://unsplash.com/photos/Ltnbw1-llBA |
| `sendero-*` | Mi espacio: portadas de Comunidad, Mis logros, Mis avisos, Recordatorios e informe de cierre | Christopher Politano ([@poli_graphy](https://unsplash.com/@poli_graphy)), Torres del Paine, Chile | https://unsplash.com/photos/_VTRG4sjOV4 |
| `mi-espacio-*` | Mi espacio, portada de «Mi Rumbo» y «Mi plan» | Ellicia ([@ellicia_](https://unsplash.com/@ellicia_)) | https://unsplash.com/photos/24HcJhf0u6M |

## Cómo se procesaron

Recorte y redimensión con `sharp` (AVIF calidad 52, WebP calidad 74), sin metadatos EXIF. Los
recortes y anchos están en `src/data/fotos.ts`. Para cambiar una foto: descargarla de Unsplash
o Pexels (nunca Unsplash+), generar los mismos anchos y agregar su fila aquí.
