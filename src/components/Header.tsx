import { useEffect, useState } from 'react';
import { useI18n, type Lang } from '../i18n';
import { useTheme } from '../hooks/useTheme';
import { useActiveSection } from '../hooks/useScrollFx';

const NAV = [
  ['sobre-mi', 'nav.about'],
  ['proyectos', 'nav.projects'],
  ['experiencia', 'nav.experience'],
  ['stack', 'nav.stack'],
  ['formacion', 'nav.education'],
  ['contacto', 'nav.contact'],
] as const;
const NAV_IDS = NAV.map(([id]) => id);

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const active = useActiveSection(NAV_IDS);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); document.getElementById('menu-btn')?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const langBtn = (l: Lang, label: string) => (
    <button type="button" lang={l} aria-pressed={lang === l} onClick={() => setLang(l)}>
      {l.toUpperCase()}<span className="sr-only"> {label}</span>
    </button>
  );

  return (
    <header className="site-header">
      <div className="wrap bar">
        <a className="brand fade" style={{ '--d': '0s' } as React.CSSProperties} href="#inicio">Joaquín Guerrero</a>
        <nav className={`nav${open ? ' is-open' : ''}`} id="site-nav" aria-label={t('nav.label')} onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false); }}>
          <ul>
            {NAV.map(([id, k]) => (
              <li key={id}><a href={`#${id}`} data-i18n="" aria-current={active === id ? 'location' : undefined}>{t(k)}</a></li>
            ))}
          </ul>
        </nav>
        <div className="controls">
          <div className="lang" role="group" aria-label={t('lang.group')}>
            {langBtn('es', 'Español')}
            {langBtn('en', 'English')}
          </div>
          <button type="button" className="icon-btn" aria-pressed={theme === 'dark'} aria-label={t('theme.dark')} title={t('theme.dark')} onClick={toggle}>
            <span className="theme-ico" aria-hidden="true" />
          </button>
          <button type="button" className="menu-btn" id="menu-btn" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen((o) => !o)} data-i18n="">
            {t('nav.menu')}
          </button>
        </div>
      </div>
    </header>
  );
}
