import { describe, expect, it } from 'vitest';
import { PLANS, type Plan } from '../src/data/marisol';
import { polySegs, stepBall, type Ball, type Seg } from '../src/systems/physics2d';
import { MARBLE, kick } from '../src/data/marisol';

function simulate(
  plan: Plan,
  lines: number[][][],
  fatigue = 0,
): { ok: boolean; t: number; x: number; y: number } {
  const contact = lines.map(() => 0);
  const alive = lines.map(() => true);
  const segsOf = (): Seg[] => [
    ...plan.statics.flatMap((p) => polySegs(p, 'static')),
    ...lines.flatMap((p, i) => (alive[i] ? polySegs(p, i) : [])),
  ];
  let segs = segsOf();
  const b: Ball = { x: plan.start[0], y: plan.start[1], vx: kick(plan), vy: 0, r: MARBLE.r };
  const g = plan.goal;
  for (let t = 0; t < 14; t += 1 / 60) {
    const hits = stepBall(
      b,
      segs,
      1 / 60,
      { x: 0, y: MARBLE.g },
      { bounce: MARBLE.bounce, friction: MARBLE.friction },
    );
    if (fatigue > 0) {
      for (const i of new Set(
        hits.map((h) => h.tag).filter((t): t is number => typeof t === 'number'),
      )) {
        contact[i] += 1 / 60;
        if (contact[i] >= fatigue && alive[i]) {
          alive[i] = false;
          segs = segsOf();
        }
      }
    }
    if (b.x > g.x && b.x < g.x + g.w && b.y > g.y && b.y < g.y + g.h)
      return { ok: true, t, x: b.x, y: b.y };
    if (b.y > plan.river || b.x < -20 || b.x > 980) return { ok: false, t, x: b.x, y: b.y };
  }
  return { ok: false, t: 14, x: b.x, y: b.y };
}

describe('planos de Marisol', () => {
  PLANS.forEach((p, i) => {
    it(`el plano ${i + 1} se puede cruzar con su solución de referencia`, () => {
      const lines = p.drafts ? p.drafts.slice(0, 4) : p.solution;
      const ink = lines.reduce((n, l) => n + Math.hypot(l[1][0] - l[0][0], l[1][1] - l[0][1]), 0);
      if (!p.drafts) expect(ink).toBeLessThanOrEqual(p.ink);
      // en el Acto II las líneas se rompen tras 1,2 s de contacto
      const r = simulate(p, lines, i >= 4 && i < 6 ? 1.2 : 0);
      expect(r, JSON.stringify(r)).toMatchObject({ ok: true });
    });
    it(`el plano ${i + 1} no se cruza sin dibujar nada`, () => {
      expect(simulate(p, []).ok).toBe(false);
    });
  });
});
