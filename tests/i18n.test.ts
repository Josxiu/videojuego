import { describe, it, expect } from 'vitest';
import { t } from '../src/i18n';
import { es } from '../src/i18n/es';

describe('i18n', () => {
  it('devuelve el texto de una clave', () => {
    expect(t('menu.title')).toBe(es['menu.title']);
  });

  it('sustituye variables', () => {
    expect(t('exam.board.grade', { n: 4 })).toBe('Aciertos: 4 de 5');
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

  it('conserva los acentos en las claves más visibles', () => {
    // El juego es en español: si alguien edita estos textos sin acentos, se nota.
    expect(es['hub.title']).toBe('EL ENTRESUEÑO');
    expect(es['menu.subtitle']).toMatch(/sueños/);
  });

  it('existen todas las claves que el juego arma con números', () => {
    // Estas claves se construyen en tiempo de ejecución (`exam.grade.${n}`...),
    // así que TypeScript no puede comprobarlas: lo hace este test.
    const needed = [
      ...[0, 1, 2, 3, 4, 5].map((n) => `exam.grade.${n}`),
      ...[1, 2, 3].flatMap((n) => [`forest.memory.${n}`, `forest.memory.${n}b`]),
      ...[1, 2, 3].map((n) => `chase.caught.${n}`),
      ...[1, 2, 3, 4, 5].map((n) => `song.section.${n}`),
      ...[1, 2, 3, 4, 5, 6].map((n) => `intro.${n}`),
      ...Array.from({ length: 11 }, (_, i) => `ending.${i + 1}`),
    ];
    const missing = needed.filter((k) => !(k in es));
    expect(missing).toEqual([]);
  });

  it('el guion cubre a los cuatro vecinos por su nombre', () => {
    // La historia depende de que cada sueño tenga un dueño concreto, no genérico.
    const todo = Object.values(es).join(' ');
    for (const nombre of ['Élmer', 'Nadia', 'Chuy', 'Tomás']) {
      expect(todo).toContain(nombre);
    }
  });
});
