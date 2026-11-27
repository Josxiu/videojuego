/** Constantes globales de Trasnocho. */
export const W = 960;
export const H = 540;

/** Capas de dibujo comunes. El mundo usa depth < 1000. */
export const DEPTH = {
  hud: 1500,
  dialogue: 2000,
  overlay: 2500,
  top: 3000,
} as const;

/** Tipografías (OFL, instaladas por npm en src/fonts.ts). */
export const FONT = {
  /** Rótulos ferroviarios: títulos, relojes, cifras. */
  display: '"Big Shoulders Display", "Arial Narrow", sans-serif',
  /** Diálogo y texto largo: máxima legibilidad. */
  body: '"Atkinson Hyperlegible", "Trebuchet MS", sans-serif',
  neon: '"Monoton", "Big Shoulders Display", sans-serif',
  script: '"Yellowtail", cursive',
  chiva: '"Sancreek", "Big Shoulders Display", serif',
  clay: '"Fredoka", "Atkinson Hyperlegible", sans-serif',
  blueprint: '"Architects Daughter", cursive',
  filigree: '"Cinzel Decorative", serif',
  oil: '"Fraunces", Georgia, serif',
  serif: '"Cormorant Garamond", Georgia, serif',
} as const;

export type DreamId =
  'reme' | 'samu' | 'marisol' | 'jairo' | 'chepe' | 'efrain' | 'abel' | 'celeste';

/** Orden de los sueños en el tren. */
export const DREAMS: DreamId[] = [
  'reme',
  'samu',
  'marisol',
  'jairo',
  'chepe',
  'efrain',
  'abel',
  'celeste',
];

/** Sueños de pasajeros por acto del tren. */
export const ACT_DREAMS: Record<1 | 2 | 3, DreamId[]> = {
  1: ['reme', 'samu', 'marisol'],
  2: ['jairo', 'chepe', 'efrain'],
  3: ['abel', 'celeste'],
};

/** Escena de Phaser que implementa cada sueño. */
export const DREAM_SCENE: Record<DreamId, string> = {
  reme: 'DreamReme',
  samu: 'DreamSamu',
  marisol: 'DreamMarisol',
  jairo: 'DreamJairo',
  chepe: 'DreamChepe',
  efrain: 'DreamEfrain',
  abel: 'DreamAbel',
  celeste: 'DreamCeleste',
};

export const TICKETS_PER_DREAM = 5;

/** Color clave de Celeste: la bufanda naranja, igual en todas las técnicas. */
export const CELESTE_KEY = 0xf2862b;

/** Estilo de texto con resolución doble para que se vea nítido al escalar. */
export function txt(
  size: number,
  color = '#f4ead5',
  font: string = FONT.body,
  extra: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: font, fontSize: `${size}px`, color, resolution: 2, ...extra };
}
