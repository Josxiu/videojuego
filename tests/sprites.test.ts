import { describe, it, expect } from 'vitest';
import { SPRITES } from '../src/gfx/sprites/defs';

describe('pixel art', () => {
  it('cada sprite tiene cuadros rectangulares del mismo tamaño', () => {
    const problems: string[] = [];
    for (const def of SPRITES) {
      const h = def.frames[0].length;
      const w = def.frames[0][0].length;
      def.frames.forEach((rows, f) => {
        if (rows.length !== h)
          problems.push(`${def.key}#${f}: ${rows.length} filas, esperado ${h}`);
        rows.forEach((r, y) => {
          if (r.length !== w)
            problems.push(`${def.key}#${f} fila ${y}: largo ${r.length}, esperado ${w}`);
        });
      });
    }
    expect(problems).toEqual([]);
  });

  it('solo usa colores definidos en su paleta', () => {
    const problems: string[] = [];
    for (const def of SPRITES) {
      def.frames.forEach((rows, f) => {
        rows.forEach((r, y) => {
          for (const ch of r) {
            if (ch !== '.' && !def.pal[ch]) problems.push(`${def.key}#${f} fila ${y}: '${ch}'`);
          }
        });
      });
    }
    expect([...new Set(problems)]).toEqual([]);
  });

  it('no repite claves de textura', () => {
    const keys = SPRITES.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
