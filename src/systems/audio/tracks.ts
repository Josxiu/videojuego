import type { Instrument, DrumKind } from './synth';

/**
 * La música del juego, escrita en una notación de pasos muy compacta:
 *
 *   'C5 . E5 - G5+B5 | ...'
 *
 * - cada ficha es un paso (normalmente una corchea)
 * - `.` silencio, `-` sostiene la nota anterior un paso más
 * - `C4+E4+G4` acorde
 * - `|` separa compases (solo para leer mejor, se ignora)
 *
 * En las percusiones: `x` golpe, `X` acento, `.` silencio.
 *
 * Cada voz tiene un `layer`: el nivel de intensidad a partir del cual suena.
 * Así la música crece con el juego (cada caja desempacada, cada recuerdo…).
 */

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

/** Convierte la notación de pasos a eventos. Función pura (se prueba en tests). */
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
  /** Cantidad enviada al eco (0..1). */
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
  /** Pasos por pulso: 2 = corcheas. */
  stepsPerBeat: number;
  voices: VoiceDef[];
  drums?: DrumDef[];
  echo?: { time: number; feedback: number };
}

export type MusicId =
  'menu' | 'hub' | 'exam' | 'fall' | 'forest' | 'chase' | 'song' | 'ending' | 'silence';

export const TRACKS: Record<MusicId, TrackDef> = {
  // Menú: el edificio de noche, una caja de música sobre un colchón de acordes
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

  // El Entresueño: campanas lejanas bajo el agua
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

  // Don Élmer: marimba de salón de clases, tiza marcando el pulso
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

  // Nadia: caja de música que va sumando instrumentos con cada caja abierta
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

  // Doña Chuy: un vals de patio con guitarra, «um-pa-pa»
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

  // Tomás: una canción de cuna en piano de juguete, desafinada, casi rota
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

  // El sueño de Iris: cada vecino suma su sonido (la escena controla las capas)
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
        layer: 3,
        send: 0.4,
        pattern:
          'E5 . G5 . C6 . G5 . | E5 . A5 . C6 . A5 . | F5 . A5 . C6 . A5 . | D5 . G5 . B5 . D6 .',
      },
      {
        inst: 'hum',
        vol: 0.1,
        layer: 5,
        send: 0.35,
        pattern: 'G5 - - - E5 - C5 - | C5 - - - D5 - E5 - | F5 - - - E5 - D5 - | D5 - - - - - . .',
      },
    ],
    drums: [
      { kind: 'broom', vol: 0.3, layer: 1, pattern: '..x...x. ..x...x. ..x...x. ..x...x.' },
      { kind: 'box', vol: 0.34, layer: 2, pattern: 'x...x... x...x... x...x... x...x.x.' },
      {
        kind: 'drop',
        vol: 0.12,
        layer: 3,
        pattern: '.x.x...x .x.x...x .x.x...x .x.x.x.x',
        send: 0.4,
      },
      { kind: 'knock', vol: 0.28, layer: 4, pattern: '........ .....xxx ........ .....xxx' },
    ],
  },

  // Amanecer
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
