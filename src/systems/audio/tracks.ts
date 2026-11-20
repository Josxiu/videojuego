import type { Instrument, DrumKind } from './synth';

export interface NoteEvent {
  step: number;
  notes: string[];
  /** Duración en pasos. */
  len: number;
}

export interface DrumEvent {
  step: number;
  accent: boolean;
}

export function parsePattern(src: string): { events: NoteEvent[]; length: number } {
  const tokens = src.split(/\s+/).filter((t) => t && t !== '|');
  const events: NoteEvent[] = [];
  tokens.forEach((tok, step) => {
    if (tok === '.') return;
    if (tok === '-') {
      const last = events[events.length - 1];
      if (last) last.len += 1;
      return;
    }
    events.push({ step, notes: tok.split('+'), len: 1 });
  });
  return { events, length: tokens.length };
}

export function parseDrums(src: string): { events: DrumEvent[]; length: number } {
  const steps = src.replace(/[\s|]/g, '').split('');
  const events: DrumEvent[] = [];
  steps.forEach((c, step) => {
    if (c === 'x' || c === 'X') events.push({ step, accent: c === 'X' });
  });
  return { events, length: steps.length };
}

export interface VoiceDef {
  inst: Instrument;
  pattern: string;
  vol: number;
  layer?: number;
  send?: number;
}

export interface DrumDef {
  kind: DrumKind;
  pattern: string;
  vol: number;
  layer?: number;
  pitch?: number;
  send?: number;
}

export interface TrackDef {
  bpm: number;
  stepsPerBeat: number;
  voices: VoiceDef[];
  drums?: DrumDef[];
  echo?: { time: number; feedback: number };
}

export type MusicId =
  | 'menu'
  | 'hub'
  | 'exam'
  | 'fall'
  | 'forest'
  | 'shadow'
  | 'embroidery'
  | 'glass'
  | 'chase'
  | 'woodcut'
  | 'chamber3d'
  | 'song'
  | 'ending'
  | 'silence';

export const TRACKS: Record<MusicId, TrackDef> = {
  menu: {
    bpm: 76,
    stepsPerBeat: 2,
    echo: { time: 0.42, feedback: 0.35 },
    voices: [
      {
        inst: 'pad',
        vol: 0.05,
        pattern:
          'A3+C4+E4 - - - - - - - | F3+A3+C4 - - - - - - - | C4+E4+G4 - - - - - - - | G3+B3+D4 - - - - - - -',
      },
      {
        inst: 'musicbox',
        vol: 0.11,
        send: 0.4,
        pattern:
          'E5 . A5 . C6 . B5 A5 | F5 . A5 . C6 . A5 . | G5 . E5 . C5 . E5 G5 | D5 . G5 . B5 . . .',
      },
      {
        inst: 'bass',
        vol: 0.12,
        pattern: 'A2 . . . . . . . | F2 . . . . . . . | C3 . . . . . . . | G2 . . . . . . .',
      },
    ],
  },

  hub: {
    bpm: 70,
    stepsPerBeat: 2,
    echo: { time: 0.5, feedback: 0.45 },
    voices: [
      {
        inst: 'pad',
        vol: 0.045,
        pattern:
          'E3+G3+B3 - - - - - - - | C3+E3+G3 - - - - - - - | G3+B3+D4 - - - - - - - | D3+F#3+A3 - - - - - - -',
      },
      {
        inst: 'bell',
        vol: 0.07,
        send: 0.6,
        pattern: 'B4 . . . . . E5 . | . . G5 . . . . . | D5 . . . B4 . . . | A4 . . . F#4 . . .',
      },
      {
        inst: 'bass',
        vol: 0.1,
        pattern: 'E2 . . . . . . . | C2 . . . . . . . | G2 . . . . . . . | D2 . . . . . . .',
      },
    ],
  },

  // 1. Don Élmer: marimba escolar
  exam: {
    bpm: 144,
    stepsPerBeat: 2,
    echo: { time: 0.21, feedback: 0.2 },
    voices: [
      {
        inst: 'pluck',
        vol: 0.13,
        pattern:
          'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | C3 . G2 . C3 . E3 . | G2 . B2 . D3 . G2 .',
      },
      {
        inst: 'marimba',
        vol: 0.15,
        layer: 1,
        send: 0.2,
        pattern:
          'C5 E5 G5 E5 C6 . G5 . | A5 . F5 . C5 . . . | E5 G5 C6 G5 E5 . C5 . | D5 . G5 . B4 . . .',
      },
      {
        inst: 'marimba',
        vol: 0.1,
        layer: 2,
        pattern: 'E4 . . . G4 . . . | F4 . . . A4 . . . | G4 . . . E4 . . . | F4 . . . D4 . . .',
      },
    ],
    drums: [
      { kind: 'tick', vol: 0.3, pattern: 'x.x.x.x. x.x.x.x. x.x.x.x. x.x.x.x.' },
      { kind: 'hat', vol: 0.18, layer: 2, pattern: '.x.x.x.x .x.x.x.x .x.x.x.x .x.x.x.x' },
      { kind: 'snare', vol: 0.16, layer: 3, pattern: '....x... ....x... ....x... ....x.x.' },
    ],
  },

  // 2. Nadia: caja de música
  fall: {
    bpm: 92,
    stepsPerBeat: 2,
    echo: { time: 0.33, feedback: 0.4 },
    voices: [
      {
        inst: 'musicbox',
        vol: 0.09,
        send: 0.35,
        pattern:
          'D5 F#5 A5 F#5 D6 A5 F#5 A5 | B4 D5 F#5 D5 B5 F#5 D5 F#5 | G4 B4 D5 B4 G5 D5 B4 D5 | A4 C#5 E5 C#5 A5 E5 C#5 E5',
      },
      {
        inst: 'bass',
        vol: 0.12,
        layer: 1,
        pattern: 'D3 . . . . . . . | B2 . . . . . . . | G2 . . . . . . . | A2 . . . . . . .',
      },
      {
        inst: 'flute',
        vol: 0.08,
        layer: 3,
        send: 0.3,
        pattern:
          'F#5 - - - E5 - D5 - | D5 - - - C#5 - B4 - | B4 - - - A4 - G4 - | A4 - - - - - - -',
      },
      {
        inst: 'bell',
        vol: 0.05,
        layer: 5,
        send: 0.5,
        pattern: 'A5 . . . . . . . | F#5 . . . . . . . | D6 . . . . . . . | C#6 . . . E6 . . .',
      },
      {
        inst: 'pad',
        vol: 0.035,
        layer: 6,
        pattern:
          'D4+F#4+A4 - - - - - - - | B3+D4+F#4 - - - - - - - | G3+B3+D4 - - - - - - - | A3+C#4+E4 - - - - - - -',
      },
    ],
    drums: [
      { kind: 'box', vol: 0.3, layer: 2, pattern: 'x...x... x...x... x...x... x...x.x.' },
      { kind: 'shaker', vol: 0.2, layer: 4, pattern: '..x...x. ..x...x. ..x...x. ..x.x.x.' },
    ],
  },

  // 3. Doña Chuy: vals 3/4 de patio
  forest: {
    bpm: 120,
    stepsPerBeat: 2,
    echo: { time: 0.25, feedback: 0.3 },
    voices: [
      {
        inst: 'pluck',
        vol: 0.1,
        pattern:
          'G2 . G3+B3+D4 . G3+B3+D4 . | D2 . F#3+A3+D4 . F#3+A3+D4 . | A2 . F#3+A3+D4 . F#3+A3+D4 . | G2 . G3+B3+D4 . G3+B3+D4 . | C3 . C4+E4+G4 . C4+E4+G4 . | G2 . G3+B3+D4 . G3+B3+D4 . | D3 . F#3+A3+C4 . F#3+A3+C4 . | G2 . G3+B3+D4 . . .',
      },
      {
        inst: 'flute',
        vol: 0.09,
        layer: 1,
        send: 0.3,
        pattern:
          'B4 - - - A4 B4 | A4 - - - F#4 - | D5 - - - C5 B4 | B4 - - - - - | E5 - - - D5 C5 | B4 - - - G4 - | A4 - - - F#4 A4 | G4 - - - - -',
      },
      {
        inst: 'musicbox',
        vol: 0.06,
        layer: 2,
        send: 0.4,
        pattern:
          'D5 . . . . . | C5 . . . . . | F#5 . . . . . | D5 . . . . . | G5 . . . . . | D5 . . . . . | C5 . . . . . | B4 . . . . .',
      },
    ],
    drums: [
      {
        kind: 'shaker',
        vol: 0.12,
        layer: 3,
        pattern: 'x.x.x. x.x.x. x.x.x. x.x.x. x.x.x. x.x.x. x.x.x. x.x.x.',
      },
    ],
  },

  // 4. Don Goyo: órgano de cine mudo y chelo con traqueteo de 35 mm
  shadow: {
    bpm: 84,
    stepsPerBeat: 2,
    echo: { time: 0.38, feedback: 0.36 },
    voices: [
      {
        inst: 'organ',
        vol: 0.065,
        send: 0.35,
        pattern:
          'D3+F3+A3 - - - - - - - | Bb2+D3+F3 - - - - - - - | G2+Bb2+D3 - - - - - - - | A2+C#3+E3 - - - - - - -',
      },
      {
        inst: 'cello',
        vol: 0.085,
        layer: 1,
        send: 0.3,
        pattern:
          'A3 - - - D4 - C4 - | Bb3 - - - A3 - G3 - | Bb3 - - - A3 - G3 - | E3 - - - - - . .',
      },
      {
        inst: 'musicbox',
        vol: 0.06,
        layer: 2,
        send: 0.45,
        pattern: 'D5 . . . F5 . . . | D5 . . . Bb4 . . . | G5 . . . D5 . . . | E5 . C#5 . A4 . . .',
      },
    ],
    drums: [
      { kind: 'reel', vol: 0.2, pattern: 'x.x.x.x. x.x.x.x. x.x.x.x. x.x.x.x.' },
      { kind: 'tick', vol: 0.14, layer: 2, pattern: '.x.x.x.x .x.x.x.x .x.x.x.x .x.x.x.x' },
    ],
  },

  // 5. Renata: telar y puntadas rítmicas en pizzicato de cuerda
  embroidery: {
    bpm: 108,
    stepsPerBeat: 2,
    echo: { time: 0.24, feedback: 0.25 },
    voices: [
      {
        inst: 'loom',
        vol: 0.11,
        pattern:
          'E4 . G4 . B4 . G4 . | C4 . E4 . G4 . E4 . | A3 . C4 . E4 . C4 . | B3 . D#4 . F#4 . B3 .',
      },
      {
        inst: 'flute',
        vol: 0.08,
        layer: 1,
        send: 0.28,
        pattern: 'B4 - - - A4 - G4 - | E4 - - - . . G4 - | A4 - - - G4 - E4 - | F#4 - - - - - . .',
      },
      {
        inst: 'bass',
        vol: 0.1,
        layer: 2,
        pattern: 'E2 . . . . . E2 . | C2 . . . . . C2 . | A2 . . . . . A2 . | B2 . . . . . B2 .',
      },
    ],
    drums: [
      { kind: 'snip', vol: 0.16, layer: 1, pattern: '....x... ....x... ....x... ....x.x.' },
      { kind: 'shaker', vol: 0.14, layer: 2, pattern: 'x.x.x.x. x.x.x.x. x.x.x.x. x.x.x.x.' },
    ],
  },

  // 6. Paloma: vidrio emplomado, campanas cristalinas
  glass: {
    bpm: 80,
    stepsPerBeat: 2,
    echo: { time: 0.45, feedback: 0.48 },
    voices: [
      {
        inst: 'glassbell',
        vol: 0.08,
        send: 0.55,
        pattern:
          'F#5 . . . A5 . . . | E5 . . . G#5 . . . | D5 . . . F#5 . . . | C#5 . . . E5 . . .',
      },
      {
        inst: 'pad',
        vol: 0.04,
        layer: 1,
        pattern:
          'F#3+A3+C#4 - - - - - - - | E3+G#3+B3 - - - - - - - | D3+F#3+A3 - - - - - - - | C#3+E3+G#3 - - - - - - -',
      },
      {
        inst: 'glassbell',
        vol: 0.06,
        layer: 2,
        send: 0.6,
        pattern:
          'C#6 . A5 . . . . . | B5 . G#5 . . . . . | A5 . F#5 . . . . . | G#5 . E5 . C#6 . . .',
      },
    ],
    drums: [{ kind: 'chime', vol: 0.15, layer: 1, pattern: 'x....... ....x... x....... ....x...' }],
  },

  // 7. Tomás: piano de juguete desafinado
  chase: {
    bpm: 58,
    stepsPerBeat: 2,
    echo: { time: 0.52, feedback: 0.5 },
    voices: [
      {
        inst: 'bass',
        vol: 0.12,
        pattern: 'A1 - - - - - - - | G#1 - - - - - - - | A1 - - - - - - - | E1 - - - - - - -',
      },
      {
        inst: 'toypiano',
        vol: 0.09,
        send: 0.55,
        pattern:
          'E5 . C5 . E5 . C5 . | D5 . B4 . G#4 . . . | C5 . A4 . C5 . A4 . | B4 . G#4 . E4 . . .',
      },
      {
        inst: 'toypiano',
        vol: 0.05,
        layer: 2,
        send: 0.3,
        pattern:
          'A#5 A5 A#5 A5 A#5 A5 A#5 A5 | . . . . . . . . | A#5 A5 A#5 A5 A#5 A5 A#5 A5 | . . . . . . . .',
      },
    ],
    drums: [{ kind: 'heart', vol: 0.35, layer: 1, pattern: 'x...x... x...x... x...x... x...x...' }],
  },

  // 8. Mateo: acordeón seco de taller y golpe de prensa tipográfica
  woodcut: {
    bpm: 96,
    stepsPerBeat: 2,
    echo: { time: 0.28, feedback: 0.28 },
    voices: [
      {
        inst: 'accordion',
        vol: 0.075,
        send: 0.25,
        pattern:
          'C4 - Eb4 - G4 . F4 . | Eb4 - D4 - C4 . G3 . | Ab3 - C4 - Eb4 . D4 . | G3 - B3 - D4 . . .',
      },
      {
        inst: 'bass',
        vol: 0.11,
        layer: 1,
        pattern: 'C2 . . . G2 . . . | C2 . . . G2 . . . | Ab2 . . . Eb2 . . . | G2 . . . D2 . . .',
      },
      {
        inst: 'pluck',
        vol: 0.08,
        layer: 2,
        pattern:
          'G4 . Eb4 . C4 . . . | G4 . D4 . B3 . . . | Eb4 . C4 . Ab3 . . . | D4 . B3 . G3 . . .',
      },
    ],
    drums: [
      { kind: 'press', vol: 0.24, layer: 1, pattern: 'x....... x....... x....... x...x...' },
      { kind: 'tick', vol: 0.18, layer: 2, pattern: '..x...x. ..x...x. ..x...x. ..x.x.x.' },
    ],
  },

  // 9. Octavio (3D): pulso anecoico y péndulo de Elena
  chamber3d: {
    bpm: 72,
    stepsPerBeat: 2,
    echo: { time: 0.56, feedback: 0.52 },
    voices: [
      {
        inst: 'bass',
        vol: 0.11,
        pattern: 'F2 - - - - - - - | Db2 - - - - - - - | Ab1 - - - - - - - | C2 - - - - - - -',
      },
      {
        inst: 'sonar',
        vol: 0.07,
        layer: 1,
        send: 0.6,
        pattern: 'C5 . . . . . . . | Ab4 . . . . . . . | Eb5 . . . . . . . | G4 . . . . . . .',
      },
      {
        inst: 'cello',
        vol: 0.06,
        layer: 2,
        send: 0.4,
        pattern:
          'F3 - - - Ab3 - G3 - | F3 - - - Db3 - - - | Eb3 - - - Ab3 - G3 - | E3 - - - - - . .',
      },
    ],
    drums: [
      { kind: 'pendulum', vol: 0.25, layer: 1, pattern: 'x...x... x...x... x...x... x...x...' },
    ],
  },

  // 10. El sueño de Iris: sinfonía con los 9 vecinos + tarareo
  song: {
    bpm: 96,
    stepsPerBeat: 2,
    echo: { time: 0.31, feedback: 0.3 },
    voices: [
      {
        inst: 'pad',
        vol: 0.04,
        pattern:
          'C4+E4+G4 - - - - - - - | A3+C4+E4 - - - - - - - | F3+A3+C4 - - - - - - - | G3+B3+D4 - - - - - - -',
      },
      {
        inst: 'bass',
        vol: 0.11,
        layer: 2,
        pattern: 'C3 . . . C3 . . . | A2 . . . A2 . . . | F2 . . . F2 . . . | G2 . . . G2 . B2 .',
      },
      {
        inst: 'musicbox',
        vol: 0.07,
        layer: 5,
        send: 0.4,
        pattern:
          'E5 . G5 . C6 . G5 . | E5 . A5 . C6 . A5 . | F5 . A5 . C6 . A5 . | D5 . G5 . B5 . D6 .',
      },
      {
        inst: 'hum',
        vol: 0.1,
        layer: 10,
        send: 0.35,
        pattern: 'G5 - - - E5 - C5 - | C5 - - - D5 - E5 - | F5 - - - E5 - D5 - | D5 - - - - - . .',
      },
    ],
    drums: [
      { kind: 'broom', vol: 0.28, layer: 1, pattern: '..x...x. ..x...x. ..x...x. ..x...x.' },
      { kind: 'box', vol: 0.32, layer: 2, pattern: 'x...x... x...x... x...x... x...x.x.' },
      {
        kind: 'drop',
        vol: 0.12,
        layer: 3,
        pattern: '.x.x...x .x.x...x .x.x...x .x.x.x.x',
        send: 0.4,
      },
      { kind: 'reel', vol: 0.16, layer: 4, pattern: 'x.x.x.x. x.x.x.x. x.x.x.x. x.x.x.x.' },
      { kind: 'snip', vol: 0.15, layer: 5, pattern: '....x... ....x... ....x... ....x.x.' },
      {
        kind: 'chime',
        vol: 0.16,
        layer: 6,
        pattern: 'x....... ....x... x....... ....x...',
        send: 0.4,
      },
      { kind: 'knock', vol: 0.26, layer: 7, pattern: '........ .....xxx ........ .....xxx' },
      { kind: 'press', vol: 0.24, layer: 8, pattern: 'x....... ....x... x....... ..x.x...' },
      { kind: 'pendulum', vol: 0.2, layer: 9, pattern: 'x...x... x...x... x...x... x...x...' },
    ],
  },

  ending: {
    bpm: 84,
    stepsPerBeat: 2,
    echo: { time: 0.36, feedback: 0.35 },
    voices: [
      {
        inst: 'pad',
        vol: 0.045,
        pattern:
          'C4+E4+G4 - - - - - - - | A3+C4+E4 - - - - - - - | F3+A3+C4 - - - - - - - | G3+B3+D4 - - - - - - -',
      },
      {
        inst: 'musicbox',
        vol: 0.09,
        send: 0.35,
        pattern:
          'E5 . G5 . C6 . G5 . | E5 . A5 . C6 . A5 . | F5 . A5 . C6 . A5 . | D5 . G5 . B5 . D6 .',
      },
      {
        inst: 'hum',
        vol: 0.08,
        send: 0.3,
        pattern: 'C5 - - - D5 - E5 - | E5 - - - D5 - C5 - | A4 - - - C5 - D5 - | D5 - - - - - . .',
      },
      {
        inst: 'bass',
        vol: 0.1,
        pattern: 'C3 . . . . . . . | A2 . . . . . . . | F2 . . . . . . . | G2 . . . . . . .',
      },
    ],
    drums: [{ kind: 'shaker', vol: 0.1, pattern: '..x...x. ..x...x. ..x...x. ..x...x.' }],
  },

  silence: { bpm: 60, stepsPerBeat: 2, voices: [] },
};
