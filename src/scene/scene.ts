import * as T from 'three';
import type { SyncStore } from './sync';
import { PALETTE, CK, type PaletteKey } from './palette';

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  hero: HTMLElement;
  labelLocal: HTMLElement;
  labelServer: HTMLElement;
  sync: SyncStore;
  reduced: boolean;
  onContextLost: () => void;
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ease = (x: number) => 1 - Math.pow(1 - x, 3);

/** Crea la escena 3D del POS offline-first. Devuelve la función que la destruye. */
export function createScene(o: SceneOptions): () => void {
  const { canvas, stage, hero, sync, reduced } = o;
  const html = document.documentElement;
  const cleanups: Array<() => void> = [];

  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(35, 1, 0.1, 100);
  const world = new T.Group();
  scene.add(world);
  const hemi = new T.HemisphereLight();
  const key = new T.DirectionalLight();
  key.position.set(4, 6, 8);
  scene.add(hemi, key);

  // --- Colores con transición de tema
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

  const M = {
    body: new T.MeshStandardMaterial({ roughness: 0.75, metalness: 0 }),
    db: new T.MeshStandardMaterial({ roughness: 0.65, metalness: 0 }),
    edge: new T.LineBasicMaterial({ transparent: true, opacity: 0.9 }),
    ui: new T.MeshBasicMaterial(),
    accent: new T.MeshBasicMaterial(),
    ring: new T.MeshBasicMaterial({ side: T.DoubleSide }),
    led: new T.MeshBasicMaterial(),
    cap: new T.MeshBasicMaterial(),
    line: new T.LineBasicMaterial({ transparent: true }),
    dash: new T.LineDashedMaterial({ dashSize: 0.12, gapSize: 0.11, transparent: true, opacity: 0 }),
  };
  let lineOn = 1;
  let ledOn = 1;
  function applyColors() {
    M.body.color.copy(cur.body);
    M.db.color.copy(cur.db);
    M.edge.color.copy(cur.edge);
    M.ui.color.copy(cur.ui);
    M.accent.color.copy(cur.accent);
    M.ring.color.copy(cur.accent);
    M.cap.color.copy(cur.line);
    M.line.color.copy(cur.line);
    M.dash.color.copy(cur.line);
    M.led.color.copy(cur.dim).lerp(cur.accent, ledOn);
    hemi.color.copy(cur.sky);
    hemi.groundColor.copy(cur.ground);
    hemi.intensity = curI.h;
    key.intensity = curI.k;
  }
  function edges<Mh extends T.Mesh>(m: Mh, th?: number): Mh {
    m.add(new T.LineSegments(new T.EdgesGeometry(m.geometry as T.BufferGeometry, th || 1), M.edge));
    return m;
  }
  function box(w: number, h: number, d: number, mat: T.Material, x: number, y: number, z: number, parent: T.Object3D) {
    const m = edges(new T.Mesh(new T.BoxGeometry(w, h, d), mat));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  // --- Grupo "Local": dispositivo POS + IndexedDB
  const LX = -2.55;
  const SX = 2.55;
  const localG = new T.Group();
  localG.position.x = LX;
  world.add(localG);
  const screen = box(1.5, 1.0, 0.08, M.body, 0, 0.98, 0, localG);
  screen.rotation.x = -0.06;
  (
    [
      [0.8, 0.28],
      [0.55, 0.1],
      [0.7, -0.08],
    ] as const
  ).forEach(([w, y]) => {
    const p = new T.Mesh(new T.PlaneGeometry(w, 0.07), M.ui);
    p.position.set(-0.58 + w / 2, y, 0.041);
    screen.add(p);
  });
  const payBtn = new T.Mesh(new T.PlaneGeometry(0.34, 0.14), M.accent);
  payBtn.position.set(0.45, -0.3, 0.041);
  screen.add(payBtn);
  box(0.12, 0.3, 0.12, M.body, 0, 0.33, 0, localG);
  box(0.7, 0.05, 0.45, M.body, 0, 0.16, 0, localG);
  const DBY = -0.46;
  [-0.2, -0.46, -0.72].forEach((y) => {
    const c = edges(new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 0.2, 40), M.db), 30);
    c.position.y = y;
    localG.add(c);
  });

  // --- Grupo "Servidor": API
  const serverG = new T.Group();
  serverG.position.x = SX;
  world.add(serverG);
  const leds: T.Mesh[] = [];
  [-0.44, 0, 0.44, 0.88].forEach((y) => {
    box(1.25, 0.36, 0.9, M.body, 0, y, 0, serverG);
    const sl = new T.Mesh(new T.PlaneGeometry(0.55, 0.05), M.ui);
    sl.position.set(-0.25, y, 0.451);
    serverG.add(sl);
    for (let i = 0; i < 2; i++) {
      const l = new T.Mesh(new T.SphereGeometry(0.035, 12, 8), M.led);
      l.position.set(0.4 + i * 0.12, y, 0.46);
      serverG.add(l);
      leds.push(l);
    }
  });

  // --- Conexión
  const curve = new T.QuadraticBezierCurve3(new T.Vector3(-1.95, 0.35, 0), new T.Vector3(0, 1.8, 0.3), new T.Vector3(1.85, 0.3, 0));
  const N = 96;
  const pts = curve.getPoints(N);
  const lineGeo = new T.BufferGeometry().setFromPoints(pts);
  const dashGeo = new T.BufferGeometry().setFromPoints(pts);
  const solid = new T.Line(lineGeo, M.line);
  const dashed = new T.Line(dashGeo, M.dash);
  dashed.computeLineDistances();
  world.add(solid, dashed);
  [curve.v0, curve.v2].forEach((v) => {
    const c = new T.Mesh(new T.SphereGeometry(0.045, 12, 8), M.cap);
    c.position.copy(v);
    world.add(c);
  });

  // --- Paquetes
  const pGeo = new T.SphereGeometry(0.075, 16, 12);
  const rGeo = new T.TorusGeometry(0.085, 0.022, 8, 28);
  interface Packet {
    m: T.Mesh;
    t: number;
    dir: number;
    off: T.Vector3 | null;
  }
  const packets: Packet[] = [];
  const pool: T.Mesh[] = [];
  const queue: T.Mesh[] = [];
  const MAXQ = 30;
  const devicePos = new T.Vector3(LX + 0.45, 0.7, 0.1);
  const tmp = new T.Vector3();
  function spawn(dir: number, from: T.Vector3 | null) {
    const m = pool.pop() || new T.Mesh(pGeo, M.accent);
    m.scale.setScalar(1);
    world.add(m);
    packets.push({ m, t: 0, dir, off: from ? from.clone().sub(curve.v0) : null });
  }
  function slotPos(i: number, time: number, out: T.Vector3) {
    const per = 10;
    const layer = Math.floor(i / per);
    const a = ((i % per) / per) * Math.PI * 2 + time * 0.25 + layer * 0.31;
    const r = 0.8 + layer * 0.2;
    return out.set(LX + Math.cos(a) * r, DBY - 0.02 + layer * 0.26, Math.sin(a) * r);
  }
  let btnFlash = 0;
  let ledFlash = 0;
  cleanups.push(
    sync.on((ty) => {
      if (ty === 'queued') {
        if (queue.length < MAXQ) {
          const m = new T.Mesh(rGeo, M.ring);
          m.position.copy(devicePos);
          if (reduced) slotPos(queue.length, 0, m.position);
          world.add(m);
          queue.push(m);
        }
        btnFlash = 1;
      } else if (ty === 'released') {
        if (queue.length > sync.getSnapshot().pending) {
          const q = queue.shift()!;
          world.remove(q);
          spawn(1, q.position);
        } else spawn(1, null);
      } else if (ty === 'releaseAll') {
        queue.splice(0).forEach((q) => world.remove(q));
      }
      requestRender();
    }),
  );

  // --- Estado de animación
  let time = 0;
  let tx = 0;
  let ty2 = 0;
  let rotY = 0;
  let rotX = 0;
  let spawnAcc = 0.5;
  let spawnDir = 1;
  let scrollP = 0;
  let baseZ = 10;
  let W = 1;
  let H = 1;
  const introDur = html.classList.contains('intro') ? 1.9 : 0;
  let introT = introDur ? 0 : 1;
  const labels = [
    { el: o.labelLocal, v: new T.Vector3(LX, -1.2, 0) },
    { el: o.labelServer, v: new T.Vector3(SX, -0.95, 0) },
  ];
  const pv = new T.Vector3();

  function step(dt: number) {
    time += dt;
    const K = (rate: number) => (reduced ? 1 : 1 - Math.exp(-dt * rate));
    const { online, syncing } = sync.getSnapshot();
    // Entrada: columnas suben, luego se dibuja la conexión
    if (introT < 1) introT = Math.min(1, introT + dt / introDur);
    const gA = ease(clamp01(introT * 1.7));
    const gB = ease(clamp01(introT * 1.7 - 0.18));
    const lI = ease(clamp01((introT - 0.45) / 0.5));
    localG.position.y = -0.5 * (1 - gA);
    serverG.position.y = -0.5 * (1 - gB);
    localG.scale.setScalar(0.9 + 0.1 * gA);
    serverG.scale.setScalar(0.9 + 0.1 * gB);
    const cnt = Math.floor((N + 1) * lI);
    lineGeo.setDrawRange(0, cnt);
    dashGeo.setDrawRange(0, cnt);
    // Tema
    if (themeLerp) {
      const k = K(6);
      let done = true;
      CK.forEach((c) => {
        cur[c].lerp(tgt[c], k);
        if (Math.abs(cur[c].r - tgt[c].r) + Math.abs(cur[c].g - tgt[c].g) + Math.abs(cur[c].b - tgt[c].b) > 0.003) done = false;
      });
      curI.h += (tgtI.h - curI.h) * k;
      curI.k += (tgtI.k - curI.k) * k;
      if (done) themeLerp = false;
    }
    // Conexión
    const on = online ? 1 : 0;
    lineOn += (on - lineOn) * K(8);
    ledOn += (on - ledOn) * K(5);
    M.line.opacity = lineOn;
    M.dash.opacity = (1 - lineOn) * 0.55;
    applyColors();
    // Reposo + parallax
    if (!reduced) {
      rotY += (Math.sin(time * 0.18) * 0.2 + tx * 0.25 - rotY) * K(3);
      rotX += (ty2 * 0.08 - rotX) * K(3);
      world.rotation.y = rotY;
      world.rotation.x = rotX;
    }
    // Tráfico en línea (subidas y descargas incrementales)
    if (introT >= 1 && online && !syncing && !reduced) {
      spawnAcc += dt;
      if (spawnAcc > 0.85) {
        spawnAcc = 0;
        spawn(spawnDir, null);
        spawnDir *= -1;
      }
    }
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      p.t += dt * (p.off ? 0.8 : 0.6);
      curve.getPoint(clamp01(p.dir > 0 ? p.t : 1 - p.t), p.m.position);
      if (p.off) p.m.position.addScaledVector(p.off, 1 - ease(clamp01(p.t * 3)));
      let kill = false;
      if (!online) {
        p.m.scale.multiplyScalar(Math.exp(-dt * 10));
        if (p.m.scale.x < 0.05) kill = true;
      }
      if (p.t >= 1) {
        if (p.dir > 0) ledFlash = 1;
        kill = true;
      }
      if (kill) {
        world.remove(p.m);
        pool.push(p.m);
        packets.splice(i, 1);
      }
    }
    // Cambios pendientes orbitando IndexedDB
    for (let j = 0; j < queue.length; j++) {
      slotPos(j, reduced ? 0 : time, tmp);
      queue[j].position.lerp(tmp, K(7));
      queue[j].lookAt(camera.position);
    }
    ledFlash *= Math.exp(-dt * 5);
    leds.forEach((l) => l.scale.setScalar(1 + ledFlash * 0.9));
    btnFlash *= Math.exp(-dt * 6);
    payBtn.scale.setScalar(1 + btnFlash * 0.3);
    // Cámara (se aleja con el scroll)
    camera.position.set(0, 0.7 + scrollP * 1.4, baseZ + scrollP * 5);
    camera.lookAt(0, 0.25 - scrollP * 0.3, 0);
    // Etiquetas HTML sobre la escena
    world.updateMatrixWorld();
    labels.forEach((L) => {
      pv.copy(L.v).applyMatrix4(world.matrixWorld).project(camera);
      L.el.style.transform = `translate(${(((pv.x + 1) / 2) * W).toFixed(1)}px,${(((1 - pv.y) / 2) * H).toFixed(1)}px) translate(-50%,0)`;
    });
  }

  let running = false;
  let raf = 0;
  let last = 0;
  let rr = 0;
  let disposed = false;
  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    step(dt);
    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  }
  function update() {
    const should = !reduced && sync.isActive() && !disposed;
    if (should && !running) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!should && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
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
  cleanups.push(sync.onActivity(update));
  document.addEventListener('visibilitychange', sync.notifyActivity);
  cleanups.push(() => document.removeEventListener('visibilitychange', sync.notifyActivity));

  function resize() {
    W = stage.clientWidth;
    H = stage.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    baseZ = Math.max(10, 12.8 / camera.aspect);
    requestRender();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  cleanups.push(() => ro.disconnect());
  resize();

  const listen = <E extends Event>(target: EventTarget, type: string, fn: (e: E) => void, opts?: AddEventListenerOptions) => {
    target.addEventListener(type, fn as EventListener, opts);
    cleanups.push(() => target.removeEventListener(type, fn as EventListener));
  };
  if (!reduced) {
    listen<PointerEvent>(
      window,
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse') return;
        tx = (e.clientX / innerWidth - 0.5) * 2;
        ty2 = (e.clientY / innerHeight - 0.5) * 2;
      },
      { passive: true },
    );
    listen<DeviceOrientationEvent>(
      window,
      'deviceorientation',
      (e) => {
        if (e.gamma == null) return;
        tx = Math.max(-1, Math.min(1, e.gamma / 35));
        ty2 = Math.max(-1, Math.min(1, ((e.beta ?? 40) - 40) / 35));
      },
      { passive: true },
    );
    listen(
      window,
      'scroll',
      () => {
        scrollP = clamp01(window.scrollY / (hero.offsetHeight || 1));
        stage.style.opacity = (1 - scrollP * 0.65).toFixed(3);
      },
      { passive: true },
    );
    cleanups.push(() => {
      stage.style.opacity = '';
    });
  }
  listen<CustomEvent<string>>(window, 'jg-theme', (e) => {
    setTarget(e.detail, reduced);
    requestRender();
  });
  listen(canvas, 'webglcontextlost', (e) => {
    e.preventDefault();
    running = false;
    cancelAnimationFrame(raf);
    o.onContextLost();
  });

  update();
  requestRender();

  return () => {
    disposed = true;
    running = false;
    cancelAnimationFrame(raf);
    cancelAnimationFrame(rr);
    cleanups.forEach((f) => f());
    [pGeo, rGeo, lineGeo, dashGeo].forEach((g) => g.dispose());
    scene.traverse((obj) => {
      const m = obj as T.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    Object.values(M).forEach((mat) => mat.dispose());
    renderer.dispose();
  };
}
