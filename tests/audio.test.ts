import { describe, it, expect } from 'vitest';
import { parsePattern, parseDrums, TRACKS } from '../src/systems/audio/tracks';
import { noteFreq } from '../src/systems/audio/synth';

describe('notación musical', () => {
  it('lee notas, silencios, ligaduras y acordes', () => {
    const { events, length } = parsePattern('C4 - . E4+G4 | A4');
    expect(length).toBe(5);
    expect(events).toEqual([
      { step: 0, notes: ['C4'], len: 2 },
      { step: 3, notes: ['E4', 'G4'], len: 1 },
      { step: 4, notes: ['A4'], len: 1 },
    ]);
  });

  it('lee percusiones con acentos', () => {
    const { events, length } = parseDrums('x..X | .x');
    expect(length).toBe(6);
    expect(events).toEqual([
      { step: 0, accent: false },
      { step: 3, accent: true },
      { step: 5, accent: false },
    ]);
  });

  it('afina el La central a 440 Hz y entiende bemoles', () => {
    expect(noteFreq('A4')).toBeCloseTo(440);
    expect(noteFreq('Bb3')).toBeCloseTo(noteFreq('A#3'));
    expect(noteFreq('C5') / noteFreq('C4')).toBeCloseTo(2);
  });

  it('todas las pistas usan notas válidas y compases completos', () => {
    const bad: string[] = [];
    for (const [id, track] of Object.entries(TRACKS)) {
      track.voices.forEach((v, i) => {
        const { events, length } = parsePattern(v.pattern);
        const bar = track.stepsPerBeat * (id === 'forest' ? 3 : 4);
        if (length % bar !== 0)
          bad.push(`${id} voz ${i}: ${length} pasos no llena compases de ${bar}`);
        for (const e of events)
          for (const n of e.notes)
            if (!/^[A-G](#|b)?-?\d$/.test(n)) bad.push(`${id} voz ${i}: nota "${n}"`);
      });
      (track.drums ?? []).forEach((d, i) => {
        const { length } = parseDrums(d.pattern);
        const bar = track.stepsPerBeat * (id === 'forest' ? 3 : 4);
        if (length % bar !== 0) bad.push(`${id} percusión ${i}: ${length} pasos`);
      });
    }
    expect(bad).toEqual([]);
  });
});
