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
      ...[1, 2, 3, 4, 5].flatMap((n) => [`exam.q.${n}.text`, `exam.q.${n}.up`, `exam.q.${n}.down`]),
      ...[0, 1, 2, 3, 4, 5, 6].map((n) => `fall.sky.${n}`),
      ...[0, 1, 2, 3, 4, 5].flatMap((n) => [`fall.item.${n}.box`, `fall.item.${n}.note`]),
      ...[1, 2, 3].flatMap((n) => [`forest.memory.${n}`, `forest.memory.${n}b`]),
      ...[1, 2, 3].map((n) => `chase.caught.${n}`),
      ...Array.from({ length: 10 }, (_, i) => `song.section.${i + 1}`),
      ...[1, 2, 3, 4, 5, 6].map((n) => `intro.${n}`),
      ...Array.from({ length: 8 }, (_, i) => `ending.${i + 1}`),
      'ending.9.fragile',
      'ending.9.breakfast',
      'ending.9.sunflower',
      'ending.10.sunflower',
      'ending.11',
      ...[1, 2, 3, 4].map((n) => `ending.silence.${n}`),
      ...[
        'exam',
        'fall',
        'forest',
        'shadow',
        'embroidery',
        'glass',
        'chase',
        'woodcut',
        'chamber3d',
        'song',
      ].flatMap((id) => [`album.${id}.title`, `album.${id}.mem1`, `album.${id}.mem2`]),
    ];
    const missing = needed.filter((k) => !(k in es));
    expect(missing).toEqual([]);
  });

  it('el guion cubre a todos los vecinos del edificio, a Iris y a Morfeo por su nombre', () => {
    // La historia depende de que cada sueño tenga un dueño concreto, no genérico.
    const todo = Object.values(es).join(' ');
    for (const nombre of [
      'Élmer',
      'Nadia',
      'Chuy',
      'Goyo',
      'Renata',
      'Paloma',
      'Tomás',
      'Mateo',
      'Octavio',
      'Iris',
      'Morfeo',
    ]) {
      expect(todo).toContain(nombre);
    }
  });
});
