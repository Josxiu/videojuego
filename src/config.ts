import { hex, palette, type WorldId } from './systems/Palette';

// Constantes globales del juego
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// Los sprites se dibujan a tamaño diminuto y se escalan para conservar el look pixel
export const PIXEL_SCALE = 3;

// Capas de dibujado: el mundo usa depth <= ~1200 (orden por Y), la UI va encima
export const DEPTH_HUD = 1800; // HUD, prompts, controles táctiles
export const DEPTH_DIALOGUE = 2000; // cajas de diálogo
export const DEPTH_OVERLAY = 2200; // pausa, tarjetas de título, fundidos

export type DreamId = 'exam' | 'fall' | 'forest';

export const DREAMS: DreamId[] = ['exam', 'fall', 'forest'];

/**
 * Tipografías del juego (auto-alojadas, OFL — ver public/fonts/LICENSE.md).
 * `DISPLAY` para títulos y cifras; `BODY` para diálogo, más legible en frases largas.
 */
export const FONT_DISPLAY = '"Silkscreen", monospace';
export const FONT_BODY = '"Pixelify Sans", monospace';

/** @deprecated Usar FONT_DISPLAY o FONT_BODY. Se mantiene para código heredado. */
export const FONT = FONT_BODY;

/** Estilo de texto de cuerpo (diálogo, avisos). */
export const textStyle = (
  size: number,
  color = '#efe9ff',
  extra: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT_BODY,
  fontSize: `${size}px`,
  color,
  ...extra,
});

/** Estilo de texto de título (menús, tarjetas de sueño, HUD numérico). */
export const titleStyle = (
  size: number,
  color = '#efe9ff',
  extra: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT_DISPLAY,
  fontSize: `${size}px`,
  color,
  ...extra,
});

/** Atajo: color de acento de un mundo como cadena CSS. */
export const accentOf = (world: WorldId): string => hex(palette(world).accent);

export { palette, hex };
export type { WorldId };
