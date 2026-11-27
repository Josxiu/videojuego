import { describe, expect, it } from 'vitest';
import { T } from '../src/i18n';
import type { Line } from '../src/i18n';
import { DREAMS } from '../src/config';

/** Recorre todo el árbol de textos y devuelve cada cadena con su ruta. */
function walk(node: unknown, path: string, out: [string, string][]): void {
  if (typeof node === 'string') out.push([path, node]);
  else if (Array.isArray(node)) node.forEach((n, i) => walk(n, `${path}[${i}]`, out));
  else if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`, out);
}

function allLines(node: unknown, out: Line[] = []): Line[] {
  if (
    Array.isArray(node) &&
    node.length === 2 &&
    typeof node[0] === 'string' &&
    typeof node[1] === 'string' &&
    node[0] in T.names
  ) {
    out.push(node as Line);
  } else if (Array.isArray(node)) node.forEach((n) => allLines(n, out));
  else if (node && typeof node === 'object') Object.values(node).forEach((v) => allLines(v, out));
  return out;
}

describe('textos', () => {
  const strings: [string, string][] = [];
  walk(T, 'T', strings);

  it('no hay cadenas vacías (salvo nombres de narrador y líneas que se llenan en juego)', () => {
    const empty = strings.filter(
      ([p, s]) => s.trim() === '' && !p.endsWith('.narra') && !p.includes('.line'),
    );
    expect(empty).toEqual([]);
  });

  it('cada globo cabe en dos líneas de la caja (≤ 120 caracteres)', () => {
    const long = allLines(T).filter(([, s]) => s.length > 120);
    expect(long).toEqual([]);
  });

  it('cada sueño tiene tres actos, cinco tiquetes y textos de llegada', () => {
    for (const d of DREAMS) {
      const tx = T.dreams[d];
      expect(tx.acts).toHaveLength(3);
      expect(tx.tickets).toHaveLength(5);
      expect(tx.intro.length).toBeGreaterThan(0);
      expect(tx.outro.length).toBeGreaterThan(0);
      expect(tx.secret.lines.length).toBeGreaterThan(0);
      expect(tx.arrival.base.length).toBeGreaterThan(0);
    }
  });

  it('todos los hablantes tienen nombre visible', () => {
    for (const [who] of allLines(T)) expect(T.names).toHaveProperty(who);
  });

  it('los marcadores {x} están bien cerrados', () => {
    const bad = strings.filter(
      ([, s]) => (s.match(/\{/g) ?? []).length !== (s.match(/\}/g) ?? []).length,
    );
    expect(bad).toEqual([]);
  });

  it('el español lleva tildes y eñes (no se perdieron al guardar)', () => {
    const joined = strings.map(([, s]) => s).join(' ');
    expect(joined).toMatch(/[áéíóú]/);
    expect(joined).toMatch(/ñ/);
    expect(joined).toMatch(/¿/);
  });
});
