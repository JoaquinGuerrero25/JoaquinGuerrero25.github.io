import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { SyncStore } from './sync';
import { prefersReducedMotion } from '../i18n';

const Ctx = createContext<SyncStore | null>(null);

/** Un solo estado de conexión compartido por la escena del hero y la del proyecto. */
export function SyncProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => new SyncStore(), []);
  useEffect(() => {
    store.reduced = prefersReducedMotion();
    return () => store.dispose();
  }, [store]);
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useSync() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSync fuera de SyncProvider');
  return s;
}

export function useSyncState() {
  const s = useSync();
  return useSyncExternalStore(s.subscribe, s.getSnapshot);
}
