import { useEffect, type RefObject } from 'react';
import { prefersReducedMotion } from '../i18n';

/** Inclinación 3D sutil de una tarjeta según el puntero (solo mouse, sin reduced-motion). */
export function useTilt(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const card = ref.current;
    if (!card || prefersReducedMotion() || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const move = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transitionDuration = '.15s,.4s,.3s';
      card.style.transform = `perspective(1100px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`;
    };
    const leave = () => { card.style.transitionDuration = ''; card.style.transform = ''; };
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerleave', leave);
    return () => { card.removeEventListener('pointermove', move); card.removeEventListener('pointerleave', leave); };
  }, [ref]);
}
