/** Estado de sincronización compartido por la escena 3D, el fallback SVG y los controles. */
export type SyncEvent = 'queued' | 'released' | 'releaseAll' | 'synced' | 'status';
export interface Announcement { id: number; key: 'aOffline' | 'aOnline' | 'aSyncing' | 'aSynced'; n?: number }
export interface SyncState { online: boolean; pending: number; syncing: boolean; announcement: Announcement | null }

export class SyncStore {
  private state: SyncState = { online: true, pending: 0, syncing: false, announcement: null };
  private listeners = new Set<() => void>();
  private scene = new Set<(e: SyncEvent) => void>();
  private activityFns = new Set<() => void>();
  private qTimer = 0;
  private dTimer = 0;
  private syncedN = 0;
  private annId = 0;
  private heroVisible = true;
  reduced = false;

  // --- useSyncExternalStore
  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  getSnapshot = () => this.state;
  private set(p: Partial<SyncState>) { this.state = { ...this.state, ...p }; this.listeners.forEach((l) => l()); }
  private announce(key: Announcement['key'], n?: number) { this.set({ announcement: { id: ++this.annId, key, n } }); }

  // --- suscripción de la escena / fallback
  on(f: (e: SyncEvent) => void) { this.scene.add(f); return () => { this.scene.delete(f); }; }
  private emit(e: SyncEvent) { this.scene.forEach((f) => f(e)); }

  // --- actividad (solo animar si el hero se ve y la pestaña está activa)
  isActive = () => this.heroVisible && !document.hidden;
  onActivity(f: () => void) { this.activityFns.add(f); return () => { this.activityFns.delete(f); }; }
  setHeroVisible(v: boolean) { this.heroVisible = v; this.activityFns.forEach((f) => f()); }
  notifyActivity = () => this.activityFns.forEach((f) => f());

  private queueTick = () => {
    if (this.state.online) return;
    if (this.isActive() && this.state.pending < 99) {
      this.set({ pending: this.state.pending + 1 });
      this.emit('queued');
    }
    this.qTimer = window.setTimeout(this.queueTick, 1100);
  };

  private drain = () => {
    if (this.state.pending <= 0) {
      this.set({ syncing: false });
      this.emit('synced');
      this.announce('aSynced', this.syncedN);
      return;
    }
    if (this.reduced) { this.set({ pending: 0 }); this.emit('releaseAll'); this.drain(); return; }
    if (!this.isActive()) { this.dTimer = window.setTimeout(this.drain, 300); return; }
    this.set({ pending: this.state.pending - 1 });
    this.emit('released');
    this.dTimer = window.setTimeout(this.drain, 170);
  };

  setOnline(v: boolean) {
    if (v === this.state.online) return;
    window.clearTimeout(this.qTimer);
    window.clearTimeout(this.dTimer);
    this.set({ online: v });
    if (!v) {
      this.set({ syncing: false });
      this.qTimer = window.setTimeout(this.queueTick, 450);
      this.announce('aOffline');
    } else if (this.state.pending > 0) {
      this.syncedN = this.state.pending;
      this.set({ syncing: true });
      this.announce('aSyncing');
      this.dTimer = window.setTimeout(this.drain, 250);
    } else {
      this.announce('aOnline');
    }
    this.emit('status');
  }

  toggle() { this.setOnline(!this.state.online); }

  dispose() { window.clearTimeout(this.qTimer); window.clearTimeout(this.dTimer); }
}
