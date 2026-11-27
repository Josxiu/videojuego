import { describe, expect, it } from 'vitest';
import { NEXT, SEGMENTS, STATIONS, pointAt, route, type SegId } from '../src/data/abel';

describe('la maqueta de Abel', () => {
  it('los tramos encadenan sin saltos (el final de uno es el inicio del siguiente)', () => {
    for (const id of Object.keys(NEXT) as SegId[]) {
      const n = NEXT[id];
      if (!n) continue;
      const end = SEGMENTS[id].pts[SEGMENTS[id].pts.length - 1];
      for (const to of n.to) {
        const st = SEGMENTS[to].pts[0];
        expect(Math.hypot(end[0] - st[0], end[1] - st[1]), `${id} → ${to}`).toBeLessThan(0.05);
      }
    }
  });

  it('con las agujas 1 y 2 desviadas, una vuelta pasa por las cuatro estaciones en orden', () => {
    const r = route('topL', { 1: 1, 2: 1, 3: 0 }, 8);
    const order = STATIONS.map((s) => r.indexOf(s.seg));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('el ramal es una vía muerta (no tiene salida)', () => {
    expect(NEXT.spur).toBeNull();
    expect(route('topL', { 1: 0, 2: 0, 3: 1 }, 10).at(-1)).toBe('spur');
  });

  it('pointAt devuelve puntos dentro de la mesa', () => {
    for (const sg of Object.values(SEGMENTS)) {
      for (let s = 0; s <= sg.len; s += 0.5) {
        const p = pointAt(sg, s);
        expect(Math.abs(p.x)).toBeLessThan(10);
        expect(Math.abs(p.z)).toBeLessThan(7);
      }
    }
  });
});
