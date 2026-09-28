import { describe, it, expect } from 'vitest';
import { Rng, hash2, vnoise, fbm, hashString } from '../src/gfx/noise';

describe('ruido con semilla', () => {
  it('la misma semilla da la misma secuencia', () => {
    const a = new Rng('pizarron');
    const b = new Rng('pizarron');
    const sa = Array.from({ length: 20 }, () => a.next());
    const sb = Array.from({ length: 20 }, () => b.next());
    expect(sa).toEqual(sb);
    expect(new Rng('otra').next()).not.toBe(sa[0]);
  });

  it('los valores quedan en [0, 1)', () => {
    const r = new Rng(7);
    for (let i = 0; i < 2000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    for (let i = 0; i < 500; i++) {
      for (const v of [hash2(i, i * 3, 5), vnoise(i * 0.37, i * 0.11, 2), fbm(i * 0.1, 3, 1)]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });

  it('int y range respetan sus límites', () => {
    const r = new Rng('limites');
    for (let i = 0; i < 500; i++) {
      const n = r.int(2, 5);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(5);
    }
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});
