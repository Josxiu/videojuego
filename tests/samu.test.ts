import { describe, expect, it } from 'vitest';
import { LEVELS, PIECES, rotate, solvable, type PieceId } from '../src/data/samu';

describe('maletas de Samu', () => {
  it('girar cuatro veces deja la pieza igual', () => {
    for (const id of Object.keys(PIECES) as PieceId[]) {
      const c = PIECES[id].cells;
      expect(rotate(c, 4).sort()).toEqual(rotate(c, 0).sort());
    }
  });

  it('cada maleta normal tiene solución, contando los tiquetes', () => {
    LEVELS.filter((l) => !l.impossible).forEach((l, i) => {
      const ids: PieceId[] = [...l.pieces, ...l.tickets.map(() => 'tiquete' as PieceId)];
      expect(solvable(l.cols, l.rows, ids), `maleta ${i + 1}`).toBe(true);
    });
  });

  it('la maleta del Acto III es imposible (por diseño)', () => {
    const last = LEVELS[LEVELS.length - 1];
    expect(last.impossible).toBe(true);
    const area = last.pieces.reduce((n, id) => n + PIECES[id].cells.length, 0);
    expect(area).toBeGreaterThan(last.cols * last.rows);
    expect(solvable(last.cols, last.rows, last.pieces)).toBe(false);
  });

  it('los cinco tiquetes están repartidos una sola vez', () => {
    const all = LEVELS.flatMap((l) => l.tickets).sort();
    expect(all).toEqual([0, 1, 2, 3, 4]);
  });
});
