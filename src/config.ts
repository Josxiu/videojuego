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

// Paletas de ambiente por escena (colores de fondo/acento)
export const AMBIENT = {
  hub: { bg: 0x141026, accent: 0x9d7bff, floor: 0x1e1838 },
  exam: { bg: 0xffe9b3, accent: 0xff8c42, floor: 0x8a5a2b },
  fall: { bg: 0x0d0a2e, accent: 0x7f6bff, floor: 0x1a1450 },
  forest: { bg: 0x0f1a22, accent: 0xffd166, floor: 0x16242e },
  menu: { bg: 0x0d0a1e, accent: 0xcfc4ff, floor: 0x0d0a1e },
} as const;

export const FONT = 'Courier New, monospace';

// Estilos de texto reutilizables
export const textStyle = (
  size: number,
  color = '#efe9ff',
  extra: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
  ...extra,
});
