import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import es from './es';
import en from './en';

export type Lang = 'es' | 'en';
export type Key = keyof typeof es;
const dict: Record<Lang, Record<Key, string>> = { es, en };

type Vars = Record<string, string | number>;
interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key, vars?: Vars) => string;
}
const Ctx = createContext<I18nCtx | null>(null);

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const safeSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sin storage */ } };

export function I18nProvider({ children }: { children: ReactNode }) {
  // El idioma inicial ya lo resolvió el script del <head> (storage → idioma del navegador).
  const [lang, setLangState] = useState<Lang>(document.documentElement.lang === 'en' ? 'en' : 'es');
  const timer = useRef(0);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = dict[lang]['meta.title'];
    document.querySelector('meta[name="description"]')?.setAttribute('content', dict[lang]['meta.description']);
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    if (l === lang) return;
    safeSet('jg-lang', l);
    window.clearTimeout(timer.current);
    if (prefersReducedMotion()) { setLangState(l); return; }
    // Fundido breve del texto mientras se intercambia el idioma.
    document.body.classList.add('is-swapping');
    timer.current = window.setTimeout(() => {
      setLangState(l);
      document.body.classList.remove('is-swapping');
    }, 170);
  }, [lang]);

  const t = useCallback((k: Key, vars?: Vars) => {
    let s = dict[lang][k] ?? dict.es[k] ?? k;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, x) => String(vars[x]));
    return s;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useI18n fuera de I18nProvider');
  return c;
}
