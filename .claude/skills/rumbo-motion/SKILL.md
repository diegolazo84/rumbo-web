---
name: rumbo-motion
description: Cómo animar la web de Rumbo con la librería Motion (motion/react): transiciones suaves, confirmaciones y aparición de tarjetas, respetando accesibilidad y peso.
---

# Animaciones en Rumbo con Motion

La web usa React 19 + Vite. Motion está instalado (`motion`). Importa desde `motion/react`.

## Reglas
- Animar solo con propósito: confirmar una acción (marcar hecha), transición entre vistas, aparición de tarjetas o avisos. Nada decorativo que no esté en la maqueta o aprobado por Diego.
- Respetar `prefers-reduced-motion`: envolver en `<MotionConfig reducedMotion="user">` o usar `useReducedMotion()`.
- Animar `opacity` y `transform` (x, y, scale), no `width`/`height`/`top`.
- Duraciones: 150–250 ms para microinteracciones, 250–400 ms para entradas; salida más rápida que entrada. Easing suave (`[0.22, 1, 0.36, 1]`) o resortes con poco rebote.
- Peso: usar `LazyMotion` + `domAnimation` y el componente `m` en vez de `motion` para no inflar el JS. Nunca cargar Motion en la portada si supera el límite de JS (114 KB); preferir Mi espacio y el panel.
- Accesibilidad: el foco y los anuncios (aria-live) no dependen de la animación; nada parpadea más de 3 veces por segundo.
- PR pequeño en borrador, capturas móvil 390 px y escritorio 1280 px, pruebas Playwright en verde. No publicar sin «autorizo publicar».

## Ejemplo base
```tsx
import { LazyMotion, domAnimation, m, MotionConfig } from 'motion/react'

export function Aparece({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
          {children}
        </m.div>
      </MotionConfig>
    </LazyMotion>
  )
}
```
