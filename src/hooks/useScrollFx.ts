import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';

/** Props para marcar un elemento que aparece al entrar en pantalla. `i` = orden en la cascada. */
export function rv(i = 0, variant = ''): { 'data-reveal': string; style: CSSProperties } {
  return { 'data-reveal': variant, style: { '--i': i } as CSSProperties };
}

/**
 * Agrega `.is-in` a los `[data-reveal]` / `[data-draw]` la primera vez que entran en pantalla.
 * Los elementos quedan ocultos solo cuando el JS ya corrió (clase `reveal-ready`), así que
 * sin JS o si algo falla el contenido siempre se ve.
 */
export function useScrollReveal() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal],[data-draw]'));
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
    root.classList.add('reveal-ready');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          // También revela lo que quedó arriba del viewport (recarga a mitad de página).
          if (e.isIntersecting || e.boundingClientRect.top < 0) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    els.forEach((el) => io.observe(el));

    // Un salto de scroll (ancla del menú, arrastrar la barra) puede pasar de largo un elemento sin que
    // el observer avise: lo que ya quedó arriba del viewport se revela acá.
    let raf = 0;
    const sweep = () => {
      raf = 0;
      els.forEach((el) => {
        if (!el.classList.contains('is-in') && el.getBoundingClientRect().bottom < 0) { el.classList.add('is-in'); io.unobserve(el); }
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(sweep); };
    addEventListener('scroll', onScroll, { passive: true });

    return () => {
      io.disconnect();
      removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
      root.classList.remove('reveal-ready');
      els.forEach((el) => el.classList.remove('is-in'));
    };
  }, []);
}

/** Id de la sección que cruza el centro de la pantalla ('' mientras se ve el hero). */
export function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState('');
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
          else setActive((cur) => (cur === e.target.id ? '' : cur));
        });
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [ids]);
  return active;
}
