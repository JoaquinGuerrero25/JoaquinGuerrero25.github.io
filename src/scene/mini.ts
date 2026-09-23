import * as T from 'three';
import { PALETTE, CK, type PaletteKey } from './palette';

/**
 * Motor de mini escenas 3D: una escena chica dentro de una sección.
 * Solo renderiza mientras es visible y hay actividad (hover/foco, un cambio de estado, una transición).
 */
export interface MiniMaterials {
  body: T.MeshStandardMaterial;
  db: T.MeshStandardMaterial;
  edge: T.LineBasicMaterial;
  ui: T.MeshBasicMaterial;
  accent: T.MeshBasicMaterial;
  line: T.LineBasicMaterial;
}

export interface MiniCtx {
  world: T.Group;
  M: MiniMaterials;
  C: Record<PaletteKey, T.Color>;
  el: HTMLElement;
  hot: boolean;
  sel: number;
  fitW: number;
  fitH: number;
  camDir: T.Vector3;
  target: T.Vector3;
  reduced: boolean;
  edges: <Mh extends T.Mesh>(m: Mh, th?: number) => Mh;
  box: (w: number, h: number, d: number, mat: T.Material, x: number, y: number, z: number, parent?: T.Object3D) => T.Mesh;
  label: (sel: string, obj: T.Object3D, off?: T.Vector3, left?: boolean) => HTMLElement | null;
  kick: () => void;
  wake: (ms?: number) => void;
  setHot: (v: boolean, sel?: number) => void;
}

export interface MiniApi {
  step?: (dt: number) => void;
  busy?: () => boolean;
}

export interface Mini {
  ctx: MiniCtx;
  dispose: () => void;
}

export const K = (dt: number, rate: number, reduced: boolean) => (reduced ? 1 : 1 - Math.exp(-dt * rate));

export function makeMini(el: HTMLElement, reduced: boolean, build: (ctx: MiniCtx) => MiniApi | void): Mini {
  const html = document.documentElement;
  const canvas = el.querySelector('canvas') as HTMLCanvasElement;
  const V = T.Vector3;
  const cleanups: Array<() => void> = [];

  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(30, 1, 0.1, 100);
  const world = new T.Group();
  scene.add(world);
  const hemi = new T.HemisphereLight();
  const key = new T.DirectionalLight();
  key.position.set(4, 6, 8);
  scene.add(hemi, key);

  // Colores con transición de tema
  const cur = {} as Record<PaletteKey, T.Color>;
  const tgt = {} as Record<PaletteKey, T.Color>;
  let curI = { h: 0, k: 0 };
  let tgtI = { h: 0, k: 0 };
  let themeLerp = false;
  function setTarget(th: string, instant: boolean) {
    const p = PALETTE[th === 'dark' ? 'dark' : 'light'];
    CK.forEach((k) => {
      tgt[k] = new T.Color(p[k]);
      if (instant || !cur[k]) cur[k] = tgt[k].clone();
    });
    tgtI = { h: p.hemiI, k: p.keyI };
    if (instant || !curI.h) curI = { ...tgtI };
    themeLerp = !instant;
  }
  setTarget(html.getAttribute('data-theme') || 'light', true);

  const M: MiniMaterials = {
    body: new T.MeshStandardMaterial({ roughness: 0.75, metalness: 0 }),
    db: new T.MeshStandardMaterial({ roughness: 0.65, metalness: 0 }),
    edge: new T.LineBasicMaterial({ transparent: true, opacity: 0.9 }),
    ui: new T.MeshBasicMaterial(),
    accent: new T.MeshBasicMaterial(),
    line: new T.LineBasicMaterial(),
  };
  function applyColors() {
    M.body.color.copy(cur.body);
    M.db.color.copy(cur.db);
    M.edge.color.copy(cur.edge);
    M.ui.color.copy(cur.ui);
    M.accent.color.copy(cur.accent);
    M.line.color.copy(cur.line);
    hemi.color.copy(cur.sky);
    hemi.groundColor.copy(cur.ground);
    hemi.intensity = curI.h;
    key.intensity = curI.k;
  }

  interface Label { el: HTMLElement; obj: T.Object3D; off: T.Vector3; a: string }
  const labels: Label[] = [];
  const pv = new V();
  let W = 1;
  let H = 1;
  let visible = false;
  let running = false;
  let raf = 0;
  let rr = 0;
  let last = 0;
  let wakeUntil = 0;
  let disposed = false;
  let api: MiniApi = {};

  const ctx: MiniCtx = {
    world, M, C: cur, el, hot: false, sel: -1, fitW: 5, fitH: 3, reduced,
    camDir: new V(0, 0.3, 1).normalize(),
    target: new V(),
    edges: (m, th) => {
      m.add(new T.LineSegments(new T.EdgesGeometry(m.geometry as T.BufferGeometry, th || 1), M.edge));
      return m;
    },
    box: (w, h, d, mat, x, y, z, parent) => {
      const m = ctx.edges(new T.Mesh(new T.BoxGeometry(w, h, d), mat));
      m.position.set(x, y, z);
      (parent || world).add(m);
      return m;
    },
    label: (sel, obj, off, left) => {
      const e = el.querySelector<HTMLElement>(sel);
      if (e) labels.push({ el: e, obj, off: off || new V(), a: left ? 'translate(0,-50%)' : 'translate(-50%,-50%)' });
      return e;
    },
    kick: () => {
      if (running || disposed) return;
      if (shouldRun()) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      else requestRender();
    },
    wake: (ms) => { wakeUntil = performance.now() + (ms || 900); ctx.kick(); },
    setHot: (v, sel) => {
      ctx.hot = v;
      if (sel !== undefined) ctx.sel = sel;
      if (!v) ctx.wake(1000); else ctx.kick();
    },
  };

  function step(dt: number) {
    if (themeLerp) {
      const k = K(dt, 6, reduced);
      let done = true;
      CK.forEach((c) => {
        cur[c].lerp(tgt[c], k);
        if (Math.abs(cur[c].r - tgt[c].r) + Math.abs(cur[c].g - tgt[c].g) + Math.abs(cur[c].b - tgt[c].b) > 0.003) done = false;
      });
      curI.h += (tgtI.h - curI.h) * k;
      curI.k += (tgtI.k - curI.k) * k;
      if (done) themeLerp = false;
    }
    applyColors();
    api.step?.(dt);
    world.updateMatrixWorld();
    camera.updateMatrixWorld();
    labels.forEach((L) => {
      pv.copy(L.off);
      L.obj.localToWorld(pv);
      pv.project(camera);
      L.el.style.transform = `translate(${(((pv.x + 1) / 2) * W).toFixed(1)}px,${(((1 - pv.y) / 2) * H).toFixed(1)}px) ${L.a}`;
    });
  }
  function shouldRun() {
    return !disposed && !reduced && visible && !document.hidden && (ctx.hot || performance.now() < wakeUntil || themeLerp || !!api.busy?.());
  }
  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    step(dt);
    renderer.render(scene, camera);
    if (shouldRun()) raf = requestAnimationFrame(frame);
    else running = false;
  }
  function requestRender() {
    if (running || disposed) return;
    cancelAnimationFrame(rr);
    rr = requestAnimationFrame(() => {
      if (disposed) return;
      step(0);
      renderer.render(scene, camera);
    });
  }

  api = build(ctx) || {};

  function resize() {
    W = el.clientWidth;
    H = el.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    const tn = Math.tan((15 * Math.PI) / 180);
    const d = Math.max(ctx.fitW / 2 / (tn * camera.aspect), ctx.fitH / 2 / tn) + 1;
    camera.position.copy(ctx.camDir).multiplyScalar(d).add(ctx.target);
    camera.lookAt(ctx.target);
    ctx.kick();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  cleanups.push(() => ro.disconnect());
  resize();

  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; ctx.kick(); });
  io.observe(el);
  cleanups.push(() => io.disconnect());

  const on = (target: EventTarget, type: string, fn: EventListener) => {
    target.addEventListener(type, fn);
    cleanups.push(() => target.removeEventListener(type, fn));
  };
  on(document, 'visibilitychange', ctx.kick);
  on(window, 'jg-theme', (e) => { setTarget((e as CustomEvent<string>).detail, reduced); ctx.wake(1000); });
  on(canvas, 'webglcontextlost', (e) => { e.preventDefault(); el.classList.add('is-off'); });
  el.classList.add('is-3d');

  return {
    ctx,
    dispose: () => {
      disposed = true;
      running = false;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(rr);
      cleanups.forEach((f) => f());
      scene.traverse((obj) => {
        const o = obj as T.Mesh;
        o.geometry?.dispose();
        const mat = o.material as T.Material | T.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((m) => m.dispose());
      });
      Object.values(M).forEach((m) => m.dispose());
      renderer.dispose();
      el.classList.remove('is-3d');
    },
  };
}

// --- Piezas reutilizables
export function device(ctx: MiniCtx, parent: T.Object3D, s = 1) {
  const g = new T.Group();
  parent.add(g);
  const sc = ctx.box(1.2, 0.8, 0.07, ctx.M.body, 0, 0.2, 0, g);
  ([[0.64, 0.2], [0.44, 0.06], [0.56, -0.08]] as const).forEach(([w, y]) => {
    const p = new T.Mesh(new T.PlaneGeometry(w, 0.055), ctx.M.ui);
    p.position.set(-0.46 + w / 2, y, 0.036);
    sc.add(p);
  });
  ctx.box(0.1, 0.22, 0.1, ctx.M.body, 0, -0.31, 0, g);
  ctx.box(0.56, 0.04, 0.36, ctx.M.body, 0, -0.43, 0, g);
  g.scale.setScalar(s);
  return g;
}

export function server(ctx: MiniCtx, parent: T.Object3D, n: number, s = 1) {
  const g = new T.Group();
  parent.add(g);
  const leds: T.Mesh[] = [];
  for (let i = 0; i < n; i++) {
    const y = ((n - 1) / 2 - i) * 0.4;
    ctx.box(1.1, 0.32, 0.8, ctx.M.body, 0, y, 0, g);
    const l = new T.Mesh(new T.SphereGeometry(0.032, 12, 8), ctx.M.accent);
    l.position.set(0.38, y, 0.41);
    g.add(l);
    leds.push(l);
  }
  g.scale.setScalar(s);
  return { g, leds };
}

export function dbStack(ctx: MiniCtx, parent: T.Object3D, n: number, s = 1) {
  const g = new T.Group();
  parent.add(g);
  for (let i = 0; i < n; i++) {
    const c = ctx.edges(new T.Mesh(new T.CylinderGeometry(0.34, 0.34, 0.17, 36), ctx.M.db), 30);
    c.position.y = ((n - 1) / 2 - i) * 0.22;
    g.add(c);
  }
  g.scale.setScalar(s);
  return g;
}

export function drawLine(ctx: MiniCtx, curve: T.Curve<T.Vector3>, mat: T.LineBasicMaterial | T.LineDashedMaterial) {
  const l = new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(60)), mat);
  if ((mat as T.LineDashedMaterial).isLineDashedMaterial) l.computeLineDistances();
  ctx.world.add(l);
  return l;
}
