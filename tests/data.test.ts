import { describe, it, expect } from 'vitest';
import { EXAM_QUESTIONS, EXAM_COURSE } from '../src/data/examQuestions';
import { FALL_SKIES, FALL_ITEMS, BOXES_TO_LAND } from '../src/data/fallBiomes';
import { PATIO_PLANTS, PATIO_MEMORIES, PATIO_FIREFLIES } from '../src/data/patio';
import { HIDE_SLOTS, LIGHT_SLOTS, CRAYON_SPOTS, DOOR_X } from '../src/data/chase';
import { TRACKS } from '../src/systems/audio/tracks';
import { FIREFLY_TOTALS } from '../src/systems/SaveManager';

describe('examen de Don Élmer', () => {
  it('las preguntas van en orden y dentro del recorrido', () => {
    const at = EXAM_QUESTIONS.map((q) => q.at);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(Math.max(...at)).toBeLessThan(EXAM_COURSE.length);
  });

  it('entre dos peligros hay aire para reaccionar', () => {
    // Obstáculos, huecos y preguntas: cada uno pide una acción distinta
    const events = [
      ...EXAM_COURSE.obstacles.map(([x]) => x),
      ...EXAM_COURSE.gaps.map(([x]) => x),
      ...EXAM_QUESTIONS.map((q) => q.at),
    ].sort((a, b) => a - b);
    const tight = events.slice(1).filter((x, i) => x - events[i] < 340);
    expect(tight).toEqual([]);
  });

  it('ningún obstáculo cae dentro de un hueco ni de la escalera en pupitres', () => {
    const { start, steps } = EXAM_COURSE.stairs;
    const stairsEnd = start + steps * 22;
    for (const [x, kind] of EXAM_COURSE.obstacles) {
      for (const [gx, gw] of EXAM_COURSE.gaps) expect(x > gx - 60 && x < gx + gw + 60).toBe(false);
      if (x > start && x < stairsEnd) expect(['plane', 'bell']).toContain(kind);
    }
  });

  it('hay tantas estrellas como dice el guardado', () => {
    expect(EXAM_COURSE.fireflies.length).toBe(FIREFLY_TOTALS.exam);
  });
});

describe('la caída de Nadia', () => {
  it('hay un cielo por cada caja desempacada, más el de inicio', () => {
    expect(BOXES_TO_LAND).toBe(FALL_ITEMS.length);
    expect(FALL_SKIES.length).toBe(FALL_ITEMS.length + 1);
  });

  it('cada caja dice algo por fuera', () => {
    for (const item of FALL_ITEMS) expect(item.box.trim()).not.toBe('');
  });
});

describe('el patio de Doña Chuy', () => {
  it('cada recuerdo tiene sus tres macetas', () => {
    for (let g = 0; g < PATIO_MEMORIES.length; g++) {
      expect(PATIO_PLANTS.filter((p) => p.group === g).length).toBe(3);
    }
  });

  it('las luciérnagas coinciden con el total', () => {
    expect(PATIO_FIREFLIES.length).toBe(FIREFLY_TOTALS.forest);
  });
});

describe('la pesadilla de Tomás', () => {
  it('escondites, lamparitas y crayolas quedan antes de la puerta', () => {
    for (const s of HIDE_SLOTS) for (const x of s.xs) expect(x).toBeLessThan(DOOR_X - 100);
    for (const x of LIGHT_SLOTS) expect(x).toBeLessThan(DOOR_X);
    expect(CRAYON_SPOTS.length).toBe(FIREFLY_TOTALS.chase);
  });
});

describe('la canción del edificio', () => {
  it('cada vecino tiene su capa en la pista, en orden', () => {
    const song = TRACKS.song;
    const layerOf = (kind: string) => song.drums?.find((d) => d.kind === kind)?.layer;
    expect(layerOf('broom')).toBe(1);
    expect(layerOf('box')).toBe(2);
    expect(layerOf('drop')).toBe(3);
    expect(layerOf('knock')).toBe(4);
    expect(song.voices.find((v) => v.inst === 'hum')?.layer).toBe(5);
  });
});
