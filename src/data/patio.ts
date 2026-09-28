import type { DreamFXSettings } from '../gfx/postfx/DreamFXPipeline';
import type { PlantKind } from '../scenes/forest/art';

/**
 * El patio de Doña Chuy como datos: dónde está cada maceta, a qué recuerdo
 * pertenece, y cómo cambia la luz del día con cada recuerdo recuperado.
 */
export interface PatioPlant {
  x: number;
  y: number;
  kind: PlantKind;
  /** Recuerdo al que pertenece: 0 niña, 1 madre, 2 mujer sola. */
  group: number;
}

export const PATIO_PLANTS: PatioPlant[] = [
  // La niña: geranios en botes de lata, cerca de la pila
  { x: 360, y: 730, kind: 'geranio', group: 0 },
  { x: 690, y: 745, kind: 'geranio', group: 0 },
  { x: 390, y: 420, kind: 'geranio', group: 0 },
  // La madre: helechos en barro, junto al tendedero
  { x: 860, y: 470, kind: 'helecho', group: 1 },
  { x: 1110, y: 480, kind: 'helecho', group: 1 },
  { x: 990, y: 690, kind: 'helecho', group: 1 },
  // La mujer sola: sábilas, al fondo, cerca del limonero
  { x: 1240, y: 790, kind: 'sabila', group: 2 },
  { x: 1370, y: 600, kind: 'sabila', group: 2 },
  { x: 1120, y: 940, kind: 'sabila', group: 2 },
];

/** Objetos altos: [clave, x, y (base), radio de choque]. */
export const PATIO_PROPS: [string, number, number, number][] = [
  ['limonero', 1300, 372, 24],
  ['tendedero', 960, 334, 0],
  ['silla', 1395, 915, 22],
  ['cantaros', 250, 960, 30],
];

/** Luciérnagas escondidas: solo se ven donde ya hay color. */
export const PATIO_FIREFLIES: [number, number][] = [
  [250, 520],
  [600, 905],
  [1000, 880],
  [1300, 470],
  [760, 410],
  [1400, 1010],
];

export interface PatioMemory {
  /** Figuras del recuerdo: [sprite, x, y]. */
  ghosts: [string, number, number][];
  /** Luz del día que queda después del recuerdo. */
  fx: DreamFXSettings;
}

const WATER: DreamFXSettings = {
  paper: 1,
  paperScale: 2,
  soft: 0.7,
  wave: 0.0006,
  waveSpeed: 0.5,
  vignette: 0.28,
};

export const PATIO_MEMORIES: PatioMemory[] = [
  // Mañana: la niña con el bote
  { ghosts: [['chuynina', 540, 720]], fx: { ...WATER, tint: 0xfff0c0, tintAmount: 0.06 } },
  // Tarde: la madre enseñándole a su hijo
  {
    ghosts: [
      ['chuymama', 960, 580],
      ['hijo', 1010, 590],
    ],
    fx: { ...WATER, tint: 0xffc070, tintAmount: 0.1, vignette: 0.32 },
  },
  // Atardecer: la mujer sola
  {
    ghosts: [['chuy', 1250, 690]],
    fx: { ...WATER, tint: 0xb080e0, tintAmount: 0.12, vignette: 0.42 },
  },
];

export const PATIO_START_FX: DreamFXSettings = { ...WATER, tint: 0xffe8c0, tintAmount: 0.03 };
