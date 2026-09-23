import * as T from 'three';
import type { SyncStore } from './sync';
import { makeMini, K, device, server, dbStack, drawLine, type Mini } from './mini';

/**
 * Proyecto POS: el Repository Pattern elige API o IndexedDB según la conexión.
 * Sigue el mismo estado de conexión que la escena del hero.
 */
export function createRepoScene(el: HTMLElement, sync: SyncStore, reduced: boolean): Mini {
  const V = T.Vector3;
  return makeMini(el, reduced, (ctx) => {
    ctx.fitW = 5.4;
    ctx.fitH = 2.6;
    ctx.camDir = new V(0, 0.28, 1).normalize();
    const w = ctx.world;
    const online = () => sync.getSnapshot().online;

    const app = device(ctx, w, 0.8);
    app.position.set(-2.2, 0.05, 0);
    const repo = ctx.box(0.5, 0.5, 0.5, ctx.M.body, -0.35, 0, 0, w);
    const core = new T.Mesh(new T.BoxGeometry(0.2, 0.2, 0.2), ctx.M.accent);
    repo.add(core);
    const sv = server(ctx, w, 2, 0.72);
    sv.g.position.set(1.95, 0.72, 0);
    const db = dbStack(ctx, w, 3, 0.8);
    db.position.set(1.95, -0.78, 0);

    const c0 = new T.LineCurve3(new V(-1.7, 0, 0), new V(-0.6, 0, 0));
    const cA = new T.QuadraticBezierCurve3(new V(-0.1, 0.08, 0), new V(0.7, 0.75, 0), new V(1.52, 0.72, 0));
    const cD = new T.QuadraticBezierCurve3(new V(-0.1, -0.08, 0), new V(0.7, -0.78, 0), new V(1.64, -0.78, 0));
    drawLine(ctx, c0, ctx.M.line);
    // Cada camino tiene un trazo sólido (activo) y uno punteado (inactivo).
    const pair = (c: T.Curve<T.Vector3>) => {
      const s = new T.LineBasicMaterial({ transparent: true });
      const d = new T.LineDashedMaterial({ dashSize: 0.09, gapSize: 0.08, transparent: true });
      drawLine(ctx, c, s);
      drawLine(ctx, c, d);
      return { s, d };
    };
    const mA = pair(cA);
    const mD = pair(cD);

    ctx.label('[data-l="app"]', app, new V(0, -0.78, 0));
    ctx.label('[data-l="repo"]', repo, new V(0, -0.5, 0));
    const lA = ctx.label('[data-l="api"]', sv.g, new V(0, 0.68, 0));
    const lD = ctx.label('[data-l="db"]', db, new V(0, -0.6, 0));

    interface Packet { m: T.Mesh; t: number; to: T.Curve<T.Vector3> | null }
    let mix = online() ? 1 : 0;
    const packets: Packet[] = [];
    const pool: T.Mesh[] = [];
    let acc = 0.6;
    let flash = 0;
    const geo = new T.SphereGeometry(0.06, 14, 10);

    return {
      step: (dt) => {
        const on = online() ? 1 : 0;
        mix += (on - mix) * K(dt, 6, reduced);
        ([[mA, mix], [mD, 1 - mix]] as const).forEach(([q, v]) => {
          q.s.color.copy(ctx.C.accent);
          q.s.opacity = v;
          q.d.color.copy(ctx.C.line);
          q.d.opacity = (1 - v) * 0.45;
        });
        lA?.classList.toggle('is-hi', !!on);
        lD?.classList.toggle('is-hi', !on);
        if (ctx.hot && !reduced) {
          acc += dt;
          if (acc > 0.75) {
            acc = 0;
            const m = pool.pop() || new T.Mesh(geo, ctx.M.accent);
            w.add(m);
            packets.push({ m, t: 0, to: null });
          }
        }
        for (let i = packets.length - 1; i >= 0; i--) {
          const p = packets[i];
          p.t += dt * 1.1;
          if (p.t < 1) c0.getPoint(p.t, p.m.position);
          else if (p.t < 1.25) { p.m.position.set(-0.35, 0, 0); flash = 1; }
          else {
            // El destino se decide al llegar al repositorio, según la conexión de ese momento.
            if (!p.to) p.to = online() ? cA : cD;
            p.to.getPoint(Math.min(1, p.t - 1.25), p.m.position);
          }
          if (p.t >= 2.25) { w.remove(p.m); pool.push(p.m); packets.splice(i, 1); }
        }
        flash *= Math.exp(-dt * 6);
        core.scale.setScalar(1 + flash * 0.6);
        if (ctx.hot && !reduced) repo.rotation.y += dt * 0.5;
      },
      busy: () => packets.length > 0 || Math.abs((online() ? 1 : 0) - mix) > 0.01,
    };
  });
}
