import type { Drum, Inst } from './synth';

/**
 * Pistas del secuenciador. Cada capa tiene un nivel mínimo (`lvl`): la música
 * suma capas a medida que avanza un sueño. Patrón: un token por paso;
 * «.» silencio; «C4,E4» acorde; «C4~3» dura 3 pasos; en percusión «x», «X»
 * (acento) y «o» (suave). Si el patrón es más corto que la pista, se repite.
 */
export interface Layer {
  inst?: Inst;
  drum?: Drum;
  vol: number;
  lvl: number;
  len?: number;
  tokens: string[];
}

export interface Track {
  bpm: number;
  /** Pasos por pulso (3 = compás de 6/8 en corcheas). */
  spb: number;
  steps: number;
  swing?: number;
  layers: Layer[];
}

function L(
  kind: Inst | Drum,
  vol: number,
  lvl: number,
  pat: string,
  len?: number,
  isDrum = false,
): Layer {
  const tokens = pat.trim().split(/\s+/);
  return isDrum
    ? { drum: kind as Drum, vol, lvl, tokens }
    : { inst: kind as Inst, vol, lvl, len, tokens };
}
const D = (kind: Drum, vol: number, lvl: number, pat: string) => L(kind, vol, lvl, pat, 1, true);

/** Repite un patrón n veces. */
const rep = (pat: string, n: number) => Array(n).fill(pat.trim()).join(' ');

// ----- El tren: bambuco en Mi menor sobre el traqueteo -----
const TRAIN_CHORDS = [
  'G3,B3,E4',
  'A3,C4,E4',
  'F#3,A3,D#4',
  'G3,B3,E4',
  'G3,B3,D4',
  'F#3,A3,D4',
  'F#3,A3,D#4',
  'G3,B3,E4',
];
const strum = (pattern: string) => TRAIN_CHORDS.map((c) => pattern.replaceAll('C', c)).join(' ');
const TRAIN_BASS =
  'E2 . . B1 . . A1 . . E2 . . B1 . . F#2 . . E2 . . B1 . . G2 . . D2 . . D2 . . A1 . . B1 . . F#2 . . E2 . . E2 . .';
const TRAIN_MELODY = [
  'B4~2 . G4 A4 B4~2 .',
  'C5~3 . . B4 A4 G4',
  'F#4~2 . A4 G4 F#4 D#4',
  'E4~5 . . . . .',
  'D5~2 . B4 C5 D5~2 .',
  'F#5~2 . E5 D5 C5 A4',
  'B4~2 . A4 G4 F#4 A4',
  'G4~2 . F#4 E4~3 . .',
].join(' ');

// ----- Reme: carranga lenta en Re mayor (2/4, semicorcheas) -----
const bars = (chords: string[], pat: string) => chords.map((c) => pat.replaceAll('C', c)).join(' ');
const REME_CH = [
  'D4,F#4,A4',
  'D4,F#4,A4',
  'C#4,E4,A4',
  'C#4,E4,A4',
  'D4,G4,B4',
  'C#4,E4,A4',
  'D4,F#4,A4',
  'D4,F#4,A4',
];
const REME_BASS = ['D2', 'D2', 'A1', 'A1', 'G1', 'A1', 'D2', 'D2']
  .map((r) => `${r} . . . ${r === 'D2' ? 'A1' : r === 'A1' ? 'E2' : 'D2'} . . .`)
  .join(' ');
const REME_MEL = [
  'F#5 . A5 . F#5 E5 D5 .',
  'E5 . F#5 . A5~3 . . .',
  'G5 . E5 . C#5 . E5 .',
  'A4~3 . . . E5 . F#5 G5',
  'B5 . G5 . D5 . G5 .',
  'A5 . E5 . C#5 . A4 .',
  'D5 . F#5 . A5 . F#5 .',
  'D5~4 . . . . . . .',
].join(' ');

// ----- Samu: currulao en 6/8 (marimba de chonta, cununo, bombo, guasá) -----
const SAMU_OST = [
  'A4 C5 E5 A4 C5 E5',
  'G4 B4 D5 G4 B4 D5',
  'F4 A4 C5 F4 A4 C5',
  'E4 G#4 B4 E4 G#4 B4',
].join(' ');
const SAMU_MEL = ['E5~2 . D5 C5 .', 'B4~2 . G4 . .', 'A4 C5 E5 F5~2 .', 'E5~3 . . .'].join(' ');

// ----- Marisol: piano mínimo y metrónomo -----
const MARI_ARP = [
  'C4 E4 G4 C5 E5 C5 G4 E4',
  'A3 C4 E4 A4 C5 A4 E4 C4',
  'F3 A3 C4 F4 A4 F4 C4 A3',
  'G3 B3 D4 G4 B4 G4 D4 B3',
].join(' ');

export const TRACKS = {
  menu: {
    bpm: 58,
    spb: 3,
    steps: 48,
    layers: [
      L('tiple', 0.35, 0, strum('C . . C . .')),
      L('bass', 0.35, 0, TRAIN_BASS),
      L('musicbox', 0.3, 0, TRAIN_MELODY),
      D('clack', 0.25, 0, 'X . . . x x'),
    ],
  },
  train: {
    bpm: 72,
    spb: 3,
    steps: 48,
    layers: [
      D('clack', 0.35, 0, 'X . . . x x'),
      L('tiple', 0.32, 0, strum('. . C C . C')),
      L('bass', 0.4, 0, TRAIN_BASS),
      L('piano', 0.32, 1, TRAIN_MELODY),
      D('shaker', 0.18, 1, '. x x . x x'),
      L('gaita', 0.2, 2, rep('.', 24) + ' ' + TRAIN_MELODY.split(' ').slice(24).join(' ')),
    ],
  },
  night: {
    bpm: 60,
    spb: 3,
    steps: 48,
    layers: [
      D('clack', 0.3, 0, 'X . . . . x'),
      L('pad', 0.4, 0, TRAIN_CHORDS.map((c) => `${c}~6 . . . . .`).join(' ')),
      L('sub', 0.4, 0, TRAIN_BASS),
      L(
        'bell',
        0.12,
        1,
        rep('. . . . . .', 3) + ' B5 . . . . . ' + rep('. . . . . .', 3) + ' D#5 . . . . .',
      ),
      L('piano', 0.22, 1, TRAIN_MELODY),
    ],
  },
  dawn: {
    bpm: 76,
    spb: 3,
    steps: 48,
    layers: [
      D('clack', 0.3, 0, 'X . . . x x'),
      L('tiple', 0.32, 0, strum('. . C C . C').replaceAll('E4', 'G4')),
      L('bass', 0.4, 0, TRAIN_BASS),
      L('gaita', 0.24, 0, TRAIN_MELODY),
      L('marimba', 0.2, 1, TRAIN_MELODY.replaceAll('4', '5')),
      D('guacharaca', 0.15, 1, '. x x . x x'),
    ],
  },
  reme: {
    bpm: 92,
    spb: 4,
    steps: 64,
    layers: [
      L('tiple', 0.3, 0, bars(REME_CH, '. C . C . C . C')),
      L('bass', 0.38, 0, REME_BASS),
      L('tiple', 0.26, 1, REME_MEL),
      D('guacharaca', 0.14, 2, 'x . x x x . x x'),
    ],
  },
  samu: {
    bpm: 96,
    spb: 3,
    steps: 24,
    layers: [
      L('marimba', 0.36, 0, SAMU_OST),
      L('bass', 0.4, 0, 'A2 . . E2 . . G2 . . D2 . . F2 . . C2 . . E2 . . B1 . .'),
      D('cununo', 0.32, 1, 'x . o x o .'),
      D('kick', 0.4, 1, 'X . . . . x'),
      D('shaker', 0.16, 2, 'x x x x x x'),
      L(
        'marimba',
        0.26,
        2,
        SAMU_MEL.split(' ')
          .map((t) => t.replace(/(\d)/, (d) => String(Number(d) + 1)))
          .join(' '),
      ),
    ],
  },
  marisol: {
    bpm: 76,
    spb: 4,
    steps: 32,
    layers: [
      L('piano', 0.26, 0, MARI_ARP),
      D('rim', 0.25, 0, 'x . . . o . . . o . . . o . . .'),
      L(
        'pad',
        0.3,
        1,
        'C4,E4,G4~8 . . . . . . . A3,C4,E4~8 . . . . . . . F3,A3,C4~8 . . . . . . . G3,B3,D4~8 . . . . . . .',
      ),
      L(
        'bass',
        0.3,
        1,
        'C2~4 . . . . . . . A1~4 . . . . . . . F1~4 . . . . . . . G1~4 . . . . . . .',
      ),
      L('bell', 0.12, 2, 'E6 . . . . . . . . . . . C6 . . . . . . . . . . . A5 . . . B5 . . .'),
    ],
  },
} satisfies Record<string, Track>;

export type TrackId = keyof typeof TRACKS;
