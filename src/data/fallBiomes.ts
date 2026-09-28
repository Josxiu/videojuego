import type { DreamFXSettings } from '../gfx/postfx/DreamFXPipeline';

/**
 * Los cielos por los que cae Nadia.
 *
 * Cada caja que Iris le desempaca cambia el cielo por otro papel de su
 * mudanza, en orden: la caída cuenta la historia de cómo llegó aquí, desde el
 * periódico de los clasificados hasta el plano del departamento nuevo, donde
 * por fin se puede aterrizar.
 *
 * Son datos: añadir un cielo nuevo no toca la lógica del nivel.
 */
export interface FallSky {
  id: string;
  /** Nombre que aparece al entrar (clave de texto). */
  name: string;
  /** Color de fondo de la cámara mientras se pinta el papel. */
  base: number;
  /** Color del hilo del que cuelgan las cosas. */
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
  { id: 'noche', name: 'el cielo de papel', base: 0x1d2a5a, thread: '#c9d4ff', fx: PAPER_FX },
  {
    id: 'clasificados',
    name: 'el cielo de los clasificados',
    base: 0xd8d4c8,
    thread: '#555',
    fx: { ...PAPER_FX, desat: 0.25, contrast: 1.05 },
  },
  {
    id: 'carton',
    name: 'el cielo de cartón',
    base: 0xb8864a,
    thread: '#4a2a10',
    fx: { ...PAPER_FX, tint: 0xffc080, tintAmount: 0.05 },
  },
  {
    id: 'despedida',
    name: 'el cielo de la despedida',
    base: 0xf4a6b8,
    thread: '#fff',
    fx: PAPER_FX,
  },
  {
    id: 'lluvia',
    name: 'el cielo del día que llovió',
    base: 0x4a5a9a,
    thread: '#dde',
    fx: { ...PAPER_FX, wave: 0.0018, waveSpeed: 1.1, soft: 0.4 },
  },
  {
    id: 'cartas',
    name: 'el cielo de las cartas de su mamá',
    base: 0xf6ecd4,
    thread: '#7a5a3a',
    fx: { ...PAPER_FX, tint: 0xffe0b0, tintAmount: 0.05 },
  },
  {
    id: 'plano',
    name: 'el cielo del departamento nuevo',
    base: 0x2a5a9a,
    thread: '#fff',
    fx: PAPER_FX,
  },
];

/** Lo que hay dentro de cada caja, en el orden en que se desempaca. */
export interface FallItem {
  label: string;
  /** Lo que dice la caja por fuera, con plumón. */
  box: string;
  note: string;
}

export const FALL_ITEMS: FallItem[] = [
  { box: 'COCINA', label: 'la taza despostillada', note: 'Era de su papá. Nadie más la usa.' },
  {
    box: 'RECUERDOS',
    label: 'la foto con su hermana',
    note: 'Las dos en la azotea, con el pelo mojado.',
  },
  {
    box: 'ENTRADA',
    label: 'el tapete de «bienvenidos»',
    note: 'Todavía no le ha dado la bienvenida a nadie.',
  },
  { box: 'SALA', label: 'la planta de plástico', note: 'La compró para no tener que regar nada.' },
  { box: 'VARIOS', label: 'el calendario', note: 'Sigue en marzo. Nunca le cambió la hoja.' },
  {
    box: 'RECÁMARA',
    label: 'la lámpara del buró',
    note: 'La prendía para leer y se quedaba dormida.',
  },
];

/** Cajas que hay que abrir para poder aterrizar. */
export const BOXES_TO_LAND = FALL_ITEMS.length;
