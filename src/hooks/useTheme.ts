import { useCallback, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../i18n';

export type Theme = 'light' | 'dark';
const html = document.documentElement;
const THEME_COLOR: Record<Theme, string> = { light: '#f7f8fa', dark: '#111318' };

const readSaved = () => { try { return localStorage.getItem('jg-theme'); } catch { return null; } };

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  const timer = useRef(0);

  const apply = useCallback((th: Theme, save: boolean) => {
    if (!prefersReducedMotion()) {
      html.classList.add('theme-anim');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => html.classList.remove('theme-anim'), 520);
    }
    html.setAttribute('data-theme', th);
    html.style.colorScheme = th;
    if (save) { try { localStorage.setItem('jg-theme', th); } catch { /* sin storage */ } }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[th]);
    setThemeState(th);
    window.dispatchEvent(new CustomEvent('jg-theme', { detail: th }));
  }, []);

  const toggle = useCallback(() => apply(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true), [apply]);

  // Sigue el tema del sistema mientras el usuario no haya elegido uno.
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => { if (!readSaved()) apply(e.matches ? 'dark' : 'light', false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [apply]);

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  }, [theme]);

  return { theme, toggle };
}
