import { useEffect, useMemo, useRef } from 'react';
import { useI18n, prefersReducedMotion } from '../i18n';
import { useSync, useSyncState } from '../scene/SyncContext';
import { canRender3D } from '../scene/support';

/** Mini escena 3D del Repository Pattern + interruptor de conexión (comparte estado con el hero). */
export function RepoDemo() {
  const { t } = useI18n();
  const sync = useSync();
  const { online } = useSyncState();
  const ref = useRef<HTMLDivElement>(null);
  const supported = useMemo(canRender3D, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !supported) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;

    import('../scene/repoScene')
      .then(({ createRepoScene }) => {
        if (cancelled) return;
        const mini = createRepoScene(el, sync, prefersReducedMotion());
        const { ctx } = mini;
        // La escena reacciona (partículas, rotación) mientras se apunta o se enfoca la tarjeta.
        const card = el.closest('.card');
        const hot = () => ctx.setHot(true);
        const cold = () => ctx.setHot(false);
        const focusOut = (e: Event) => { if (!card?.contains((e as FocusEvent).relatedTarget as Node | null)) cold(); };
        card?.addEventListener('pointerenter', hot);
        card?.addEventListener('pointerleave', cold);
        card?.addEventListener('focusin', hot);
        card?.addEventListener('focusout', focusOut);
        const off = sync.on((ty) => { if (ty === 'status') ctx.wake(900); });
        dispose = () => {
          off();
          card?.removeEventListener('pointerenter', hot);
          card?.removeEventListener('pointerleave', cold);
          card?.removeEventListener('focusin', hot);
          card?.removeEventListener('focusout', focusOut);
          mini.dispose();
        };
      })
      .catch((e) => {
        console.warn('mini 3D:', e);
        el.classList.add('is-off');
      });

    return () => { cancelled = true; dispose?.(); };
  }, [sync, supported]);

  return (
    <div className="repo-demo">
      {/* Decorativa: la información equivalente está en el texto de estado y en la lista de características. */}
      <div className="mini mini--repo" ref={ref} hidden={!supported}>
        <canvas aria-hidden="true" />
        <span className="m-label" data-l="app" aria-hidden="true">App</span>
        <span className="m-label" data-l="repo" aria-hidden="true">Repository</span>
        <span className="m-label" data-l="api" aria-hidden="true">API</span>
        <span className="m-label" data-l="db" aria-hidden="true">IndexedDB</span>
      </div>
      <div className="repo-bar">
        <p className="repo-state" data-i18n="">{t(online ? 'mini.repoOn' : 'mini.repoOff')}</p>
        <button type="button" className="switch switch--sm" role="switch" aria-checked={online} onClick={() => sync.toggle()}>
          <span className="sw-track" aria-hidden="true" />
          <span data-i18n="">{t('scene.connection')}</span>
        </button>
      </div>
    </div>
  );
}
