import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n, type Key } from '../i18n';
import { useTilt } from '../hooks/useTilt';
import { rv } from '../hooks/useScrollFx';
import { RepoDemo } from './RepoDemo';

const EMAIL = 'joaquinguerrero256@gmail.com';
const LINKEDIN = 'https://www.linkedin.com/in/joaquinguerrero256';
const GITHUB = 'https://github.com/JoaquinGuerrero25';
const CV = `${import.meta.env.BASE_URL}cv.pdf`;

function Section({ id, titleId, title, children }: { id: string; titleId: string; title: ReactNode; children: ReactNode }) {
  return (
    <section className="section" id={id} aria-labelledby={titleId}>
      <div className="wrap section-grid">
        <h2 id={titleId} data-i18n="" {...rv(0)}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

function TechList({ items }: { items: string[] }) {
  return <ul className="tech">{items.map((i) => <li key={i}>{i}</li>)}</ul>;
}

function Card({ feature, i = 0, children }: { feature?: boolean; i?: number; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useTilt(ref);
  return <article ref={ref} className={`card${feature ? ' card--feature' : ''}`} {...rv(i)}>{children}</article>;
}

export function About() {
  const { t } = useI18n();
  return (
    <Section id="sobre-mi" titleId="about-title" title={t('nav.about')}>
      <div>
        <p className="lead" data-i18n="" {...rv(1)}>{t('about.lead')}</p>
        <p className="body-text" data-i18n="" {...rv(2)}>{t('about.body')}</p>
      </div>
    </Section>
  );
}

export function Projects() {
  const { t } = useI18n();
  const feats = (keys: Key[]) => <ul className="feats">{keys.map((k) => <li key={k} data-i18n="">{t(k)}</li>)}</ul>;
  return (
    <Section id="proyectos" titleId="projects-title" title={t('nav.projects')}>
      <div className="projects">
        <Card feature i={1}>
          <p className="badge" data-i18n="">{t('p1.badge')}</p>
          <div className="feature-body">
            <div>
              <h3 data-i18n="">{t('p1.title')}</h3>
              <p className="org">Wynges – Líder Gestión</p>
              <p className="desc" data-i18n="">{t('p1.desc')}</p>
              <p className="tech-label" data-i18n="">{t('tech')}</p>
              <TechList items={['Vue 3', 'Quasar', 'TypeScript', 'Service Workers', 'IndexedDB']} />
            </div>
            <div>
              <RepoDemo />
              {feats(['p1.f1', 'p1.f2', 'p1.f3', 'p1.f4', 'p1.f5'])}
            </div>
          </div>
        </Card>

        <Card i={2}>
          <h3 data-i18n="">{t('p2.title')}</h3>
          <p className="org" data-i18n="">{t('p2.org')}</p>
          <p className="desc" data-i18n="">{t('p2.desc')}</p>
          {feats(['p2.f1', 'p2.f2', 'p2.f3', 'p2.f4', 'p2.f5'])}
          <p className="tech-label" data-i18n="">{t('tech')}</p>
          <TechList items={['React', 'Node.js', 'PostgreSQL']} />
        </Card>
      </div>
    </Section>
  );
}

export function Experience() {
  const { t } = useI18n();
  return (
    <Section id="experiencia" titleId="exp-title" title={t('nav.experience')}>
      <ol className="timeline" data-draw="">
        <li className="is-current" {...rv(1)}>
          <p className="when"><time dateTime="2024-10">Oct 2024</time> – <span data-i18n="">{t('exp.now')}</span></p>
          <h3>Full Stack Developer</h3>
          <p>Wynges – Líder Gestión, Rosario</p>
        </li>
        <li {...rv(2)}>
          <p className="when">
            <time dateTime="2024-02" data-i18n="">{t('exp.feb')}</time> – <time dateTime="2024-05" data-i18n="">{t('exp.may')}</time>
          </p>
          <h3 data-i18n="">{t('exp.freelance')}</h3>
          <p data-i18n="">{t('exp.elearning')}</p>
        </li>
      </ol>
    </Section>
  );
}

const STACK: Array<{ label: Key | string; items: string[] }> = [
  { label: 'Frontend', items: ['Vue 3', 'Quasar Framework', 'React', 'JavaScript (ES6+)', 'HTML5', 'CSS3', 'SCSS', 'SASS', 'Material UI', 'Bootstrap', 'PWA'] },
  { label: 'Backend', items: ['.NET / C#', 'Node.js', 'Python'] },
  { label: 'stack.arch', items: ['Clean Architecture', 'Repository Pattern', 'Strategy Pattern'] },
  { label: 'stack.db', items: ['PostgreSQL', 'MySQL', 'SQLite', 'IndexedDB'] },
  { label: 'stack.tools', items: ['Git', 'Service Workers', 'Postman', 'Electron', 'Figma', 'Cursor IDE', 'Visual Studio', 'Visual Studio Code'] },
];

export function Stack() {
  const { t } = useI18n();
  return (
    <Section id="stack" titleId="stack-title" title={t('stack.title')}>
      <dl className="rows">
        {STACK.map((g, gi) => (
          <div key={g.label} {...rv(gi)}>
            <dt data-i18n="">{g.label.startsWith('stack.') ? t(g.label as Key) : g.label}</dt>
            <dd><ul className="inline-list">{g.items.map((it, ii) => <li key={it} {...rv(ii, 'chip')}>{it}</li>)}</ul></dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

export function Education() {
  const { t } = useI18n();
  return (
    <Section id="formacion" titleId="edu-title" title={t('nav.education')}>
      <ul className="rows">
        <li {...rv(1)}>
          <span className="when" data-i18n="">{t('edu.d1')}</span>
          <div className="edu-main"><div><p className="r-title" data-i18n="">{t('edu.t1')}</p><p>Universidad Tecnológica Nacional (UTN) Rosario</p></div></div>
        </li>
        <li {...rv(2)}>
          <span className="when">2023</span>
          <div className="edu-main"><div><p className="r-title" data-i18n="">{t('edu.t2')}</p><p data-i18n="">{t('edu.c2')}</p></div></div>
        </li>
        <li {...rv(3)}>
          <span className="when" data-i18n="">{t('edu.langs')}</span>
          <div className="edu-main"><p className="r-title" style={{ color: 'var(--ink)' }} data-i18n="">{t('edu.langsVal')}</p></div>
        </li>
      </ul>
    </Section>
  );
}

export function Contact() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState('');
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const done = () => {
    setCopied(true);
    setNote('');
    window.setTimeout(() => setNote(t('contact.copied')), 80);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { setCopied(false); setNote(''); }, 2200);
  };
  const legacy = () => {
    const ta = document.createElement('textarea');
    ta.value = EMAIL;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* sin permiso */ }
    ta.remove();
    if (ok) done();
  };
  const copy = () => {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(EMAIL).then(done, legacy);
    else legacy();
  };

  return (
    <Section id="contacto" titleId="contact-title" title={t('nav.contact')}>
      <div>
        <p className="contact-lead" data-i18n="" {...rv(1)}>{t('contact.lead')}</p>
        <a className="email" href={`mailto:${EMAIL}`} data-draw="">{EMAIL}</a>
        <div className="contact-actions" {...rv(3)}>
          <a className="btn btn-primary" href={CV} download>
            <span data-i18n="">{t('contact.cv')}</span><span className="sr-only"> (PDF)</span>
          </a>
          <button type="button" className={`btn${copied ? ' is-done' : ''}`} onClick={copy}>
            <span data-i18n="">{copied ? t('contact.copied') : t('contact.copy')}</span>
          </button>
          <a className="btn" href={LINKEDIN} target="_blank" rel="noopener noreferrer">
            LinkedIn<span className="sr-only" data-i18n="">{t('newTab')}</span>
          </a>
          <a className="btn" href={GITHUB} target="_blank" rel="noopener noreferrer">
            GitHub<span className="sr-only" data-i18n="">{t('newTab')}</span>
          </a>
        </div>
        <p className="contact-meta"><span>Rosario, Argentina</span></p>
        <p className="sr-only" aria-live="polite">{note}</p>
      </div>
    </Section>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <span>© {new Date().getFullYear()} Joaquín Guerrero</span>
        <a href="#inicio" data-i18n="">{t('backTop')}</a>
      </div>
    </footer>
  );
}
