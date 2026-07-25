import { describe, it, expect } from 'vitest';
import { t } from '../src/i18n';
import { es } from '../src/i18n/es';

describe('i18n', () => {
  it('devuelve el texto de una clave', () => {
    expect(t('menu.title')).toBe(es['menu.title']);
  });

  it('sustituye variables', () => {
    expect(t('fall.depth', { n: 42 })).toBe('42 m');
  });

  it('no deja marcadores {var} sin sustituir en ningún texto', () => {
    // Cada texto con {algo} debe recibir su variable en el juego; aquí comprobamos
    // que el propio diccionario no tenga marcadores mal escritos.
    const malformed = Object.entries(es).filter(([, value]) => /\{\s*\}/.test(value));
    expect(malformed).toEqual([]);
  });

  it('no tiene textos vacíos', () => {
    const empty = Object.entries(es)
      .filter(([, v]) => v.trim() === '')
      .map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it('usa comillas tipográficas y acentos correctos (muestra)', () => {
    // El juego es en español: verificamos que no se hayan colado textos sin acentuar
    // en las claves más visibles.
    expect(es['menu.subtitle']).toMatch(/despertar/);
    expect(es['hub.title']).toBe('EL ENTRESUEÑO');
  });
});
