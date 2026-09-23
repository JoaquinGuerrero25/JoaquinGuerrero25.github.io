import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { useI18n, prefersReducedMotion } from '../i18n';
import { SyncStore } from '../scene/sync';

const delay = (d: string) => ({ '--d': d }) as CSSProperties;

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}
function weakDevice() {
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return !!((n.deviceMemory && n.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || n.connection?.saveData);
}

type Mode = 'loading' | '3d' | 'fallback';

export function Hero() {
  const { t } = useI18n();
  const sync = useMemo(() => new SyncStore(), []);
  const state = useSyncExternalStore(sync.subscribe, sync.getSnapshot);
  const [mode, setMode] = useState<Mode>(() => (!webglOK() || weakDevice() ? 'fallback' : 'loading'));
  const [live, setLive] = useState('');

  const heroRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lblLocal = useRef<HTMLDivElement>(null);
  const lblServer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sync.reduced = prefersReducedMotion();
    return () => sync.dispose();
  }, [sync]);

  // El 3D y el tráfico solo corren mientras el hero es visible.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((es) => sync.setHeroVisible(es[0].isIntersecting));
    io.observe(stage);
    document.addEventListener('visibilitychange', sync.notifyActivity);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync.notifyActivity);
    };
  }, [sync]);

  // Escena 3D (Three.js se descarga solo si hace falta, en un chunk aparte).
  const wantsScene = mode !== 'fallback';
  useEffect(() => {
    if (!wantsScene) return;
    let dispose: (() => void) | undefined;
    let cancelled = false;
    import('../scene/scene')
      .then(({ createScene }) => {
        if (cancelled) return;
        dispose = createScene({
          canvas: canvasRef.current!,
          stage: stageRef.current!,
          hero: heroRef.current!,
          labelLocal: lblLocal.current!,
          labelServer: lblServer.current!,
          sync,
          reduced: prefersReducedMotion(),
          onContextLost: () => setMode('fallback'),
        });
        setMode('3d');
      })
      .catch((e) => {
        console.warn('3D fallback:', e);
        if (!cancelled) setMode('fallback');
      });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [sync, wantsScene]);

  // Región aria-live: se vacía y se vuelve a llenar para que el lector repita el aviso.
  const ann = state.announcement;
  useEffect(() => {
    if (!ann) return;
    const key = (
      { aOffline: 'scene.aOffline', aOnline: 'scene.aOnline', aSyncing: 'scene.aSyncing', aSynced: ann.n === 1 ? 'scene.aSynced1' : 'scene.aSynced' } as const
    )[ann.key];
    setLive('');
    const id = window.setTimeout(() => setLive(t(key, { n: ann.n ?? 0 })), 80);
    return () => window.clearTimeout(id);
  }, [ann, t]);

  const { online, syncing, pending } = state;
  const stateKey = syncing ? 'scene.syncing' : online ? 'scene.online' : 'scene.offline';
  const pendingText = pending === 0 ? t('scene.synced') : t(pending === 1 ? 'scene.pending1' : 'scene.pending', { n: pending });
  const stageClass = ['stage', mode === '3d' && 'is-3d', mode === 'fallback' && 'is-fallback', !online && 'is-offline'].filter(Boolean).join(' ');
  const queueDots = Array.from({ length: Math.min(pending, 12) }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    return <circle key={i} cx={(135 + Math.cos(a) * 82).toFixed(1)} cy={(224 + Math.sin(a) * 52).toFixed(1)} r="6" />;
  });

  return (
    <section className="hero" id="inicio" aria-labelledby="hero-title" ref={heroRef}>
      <div className="wrap hero-grid">
        <div>
          <h1 className="name" id="hero-title">
            <span className="reveal"><span className="rise" style={delay('.1s')}>Joaquín</span></span>
            <span className="reveal"><span className="rise" style={delay('.2s')}>Guerrero</span></span>
          </h1>
          <p className="role fade" style={delay('.45s')}>Full Stack Developer</p>
          <p className="tagline fade" style={delay('.55s')} data-i18n="">{t('hero.tagline')}</p>
          <p className="meta fade" style={delay('.62s')}>
            <span>Rosario, Argentina</span>
            <span data-i18n="">{t('hero.years')}</span>
          </p>
          <div className="btns fade" style={delay('.7s')}>
            <a className="btn btn-primary" href="#proyectos" data-i18n="">{t('hero.ctaProjects')}</a>
            <a className="btn" href="#contacto" data-i18n="">{t('hero.ctaContact')}</a>
          </div>
        </div>

        <div className="hero-scene fade" style={delay('.35s')}>
          <div className={stageClass} ref={stageRef}>
            <canvas ref={canvasRef} role="img" aria-label={t('scene.aria')} />
            <div className="s-label" ref={lblLocal} aria-hidden="true"><b data-i18n="">{t('scene.local')}</b><span>IndexedDB</span></div>
            <div className="s-label" ref={lblServer} aria-hidden="true"><b data-i18n="">{t('scene.server')}</b><span>API</span></div>
            {/* Fallback estático (sin WebGL o dispositivo débil) */}
            <svg className="scene-fallback" viewBox="0 0 600 340" role="img" aria-label={t('scene.aria')}>
              <rect className="fb-body" x="70" y="60" width="130" height="86" rx="6" />
              <rect className="fb-ui" x="84" y="78" width="70" height="7" />
              <rect className="fb-ui" x="84" y="94" width="48" height="7" />
              <rect className="fb-ui" x="84" y="110" width="60" height="7" />
              <rect className="fb-accent" x="160" y="124" width="28" height="11" rx="2" />
              <rect className="fb-body" x="128" y="146" width="14" height="20" />
              <rect className="fb-body" x="105" y="166" width="60" height="6" />
              <rect className="fb-body" x="95" y="190" width="80" height="20" rx="10" />
              <rect className="fb-body" x="95" y="214" width="80" height="20" rx="10" />
              <rect className="fb-body" x="95" y="238" width="80" height="20" rx="10" />
              <rect className="fb-body" x="410" y="100" width="130" height="34" rx="4" />
              <rect className="fb-body" x="410" y="140" width="130" height="34" rx="4" />
              <rect className="fb-body" x="410" y="180" width="130" height="34" rx="4" />
              <rect className="fb-body" x="410" y="220" width="130" height="34" rx="4" />
              <circle className="fb-accent fb-led" cx="520" cy="117" r="4" />
              <circle className="fb-accent fb-led" cx="520" cy="157" r="4" />
              <circle className="fb-accent fb-led" cx="520" cy="197" r="4" />
              <circle className="fb-accent fb-led" cx="520" cy="237" r="4" />
              <path className="fb-line" d="M210 150 Q 305 40 400 150" />
              <g className="fb-packets fb-accent">
                <circle cx="258" cy="111" r="6" />
                <circle cx="305" cy="95" r="6" />
                <circle cx="352" cy="111" r="6" />
              </g>
              <g className="fb-queue">{queueDots}</g>
              <text className="fb-text" x="135" y="300" textAnchor="middle" data-i18n="">{t('scene.local')}</text>
              <text className="fb-sub" x="135" y="318" textAnchor="middle">IndexedDB</text>
              <text className="fb-text" x="475" y="290" textAnchor="middle" data-i18n="">{t('scene.server')}</text>
              <text className="fb-sub" x="475" y="308" textAnchor="middle">API</text>
            </svg>
          </div>
          <div className="scene-ui">
            <div className="scene-copy">
              <strong data-i18n="">{t('scene.caption')}</strong>
              <p data-i18n="">{t('scene.hint')}</p>
            </div>
            <div className="switch-row">
              <button type="button" className="switch" role="switch" aria-checked={online} onClick={() => sync.toggle()}>
                <span className="sw-track" aria-hidden="true" />
                <span data-i18n="">{t('scene.connection')}</span>
              </button>
              <span className="sw-state" aria-hidden="true">{t(stateKey)}</span>
              <span className="pending">{pendingText}</span>
            </div>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{live}</p>
    </section>
  );
}
