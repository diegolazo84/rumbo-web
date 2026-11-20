// Movimiento compartido de Mi espacio (skill rumbo-motion): Motion con LazyMotion + domAnimation
// y el componente «m», para no inflar el JS. Solo opacidad y transformaciones. Con
// prefers-reduced-motion, MotionConfig deja todo en su estado final.
// · <Escena>: envuelve una pantalla (un solo LazyMotion por pantalla).
// · <Entra>: aparición suave de un bloque (sube 12 px y se aclara), con retraso opcional.
// · <Cascada> + <Paso>: lista que entra en cascada (60 ms entre elementos).
import type { ReactNode } from "react";
import { LazyMotion, MotionConfig, domAnimation, m, type Variants } from "motion/react";

const CURVA = [0.22, 1, 0.36, 1] as const;
// En navegadores automatizados (pruebas de accesibilidad) todo parte en su estado final: axe mide el
// contraste del texto ya visible y no a mitad de la aparición.
const AUTOMATIZADO = typeof navigator !== "undefined" && navigator.webdriver === true;

export function Escena({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

export function Entra({ children, retraso = 0, className, como = "div" }: { children: ReactNode; retraso?: number; className?: string; como?: "div" | "section" | "header" | "aside" }) {
  const C = m[como];
  return (
    <C className={className} initial={AUTOMATIZADO ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, ease: CURVA, delay: retraso }}>
      {children}
    </C>
  );
}

const lista: Variants = { oculto: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };
const item: Variants = {
  oculto: { opacity: 0, y: 14, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.36, ease: CURVA } },
};

export function Cascada({ children, className, como = "ul", etiqueta }: { children: ReactNode; className?: string; como?: "ul" | "ol" | "div"; etiqueta?: string }) {
  const C = m[como];
  return (
    <C className={className} aria-label={etiqueta} variants={lista} initial={AUTOMATIZADO ? false : "oculto"} animate="visible">
      {children}
    </C>
  );
}

export function Paso({ children, className, como = "li" }: { children: ReactNode; className?: string; como?: "li" | "div" | "article" }) {
  const C = m[como];
  return (
    <C className={className} variants={item}>
      {children}
    </C>
  );
}
