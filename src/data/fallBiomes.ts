import type { DreamFXSettings } from '../gfx/postfx/DreamFXPipeline';
import type { TextKey } from '../i18n';

/**
 * Los cielos por los que cae Nadia. Todos los textos viven en `src/i18n/es/`.
 */
export interface FallSky {
  id: string;
  nameKey: TextKey;
  base: number;
  thread: string;
  fx: DreamFXSettings;
}

const PAPER_FX: DreamFXSettings = {
  paper: 0.7,
  paperScale: 2.5,
  boil: 0.35,
  boilFps: 10,
  vignette: 0.35,
  grain: 0.03,
};

export const FALL_SKIES: FallSky[] = [
  { id: 'noche', nameKey: 'fall.sky.0', base: 0x1d2a5a, thread: '#c9d4ff', fx: PAPER_FX },
  {
    id: 'clasificados',
    nameKey: 'fall.sky.1',
    base: 0xd8d4c8,
    thread: '#555',
    fx: { ...PAPER_FX, desat: 0.25, contrast: 1.05 },
  },
  {
    id: 'carton',
    nameKey: 'fall.sky.2',
    base: 0xb8864a,
    thread: '#4a2a10',
    fx: { ...PAPER_FX, tint: 0xffc080, tintAmount: 0.05 },
  },
  {
    id: 'despedida',
    nameKey: 'fall.sky.3',
    base: 0xf4a6b8,
    thread: '#fff',
    fx: PAPER_FX,
  },
  {
    id: 'lluvia',
    nameKey: 'fall.sky.4',
    base: 0x4a5a9a,
    thread: '#dde',
    fx: { ...PAPER_FX, wave: 0.0018, waveSpeed: 1.1, soft: 0.4 },
  },
  {
    id: 'cartas',
    nameKey: 'fall.sky.5',
    base: 0xf6ecd4,
    thread: '#7a5a3a',
    fx: { ...PAPER_FX, tint: 0xffe0b0, tintAmount: 0.05 },
  },
  {
    id: 'plano',
    nameKey: 'fall.sky.6',
    base: 0x2a5a9a,
    thread: '#fff',
    fx: PAPER_FX,
  },
];

export interface FallItem {
  boxKey: TextKey;
  labelKey: TextKey;
  noteKey: TextKey;
}

export const FALL_ITEMS: FallItem[] = [
  { boxKey: 'fall.item.0.box', labelKey: 'fall.item.0.label', noteKey: 'fall.item.0.note' },
  { boxKey: 'fall.item.1.box', labelKey: 'fall.item.1.label', noteKey: 'fall.item.1.note' },
  { boxKey: 'fall.item.2.box', labelKey: 'fall.item.2.label', noteKey: 'fall.item.2.note' },
  { boxKey: 'fall.item.3.box', labelKey: 'fall.item.3.label', noteKey: 'fall.item.3.note' },
  { boxKey: 'fall.item.4.box', labelKey: 'fall.item.4.label', noteKey: 'fall.item.4.note' },
  { boxKey: 'fall.item.5.box', labelKey: 'fall.item.5.label', noteKey: 'fall.item.5.note' },
];

export const BOXES_TO_LAND = FALL_ITEMS.length;
