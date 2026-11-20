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

/** Primeros tres sueños (Acto I, los que se le quedan pegados a Iris). */
export type DreamId = 'exam' | 'fall' | 'forest';

/** Todos los sueños jugables del Edificio Girasol (10 sueños en total). */
export type AllDreamId =
  | 'exam'
  | 'fall'
  | 'forest'
  | 'shadow'
  | 'embroidery'
  | 'glass'
  | 'chase'
  | 'woodcut'
  | 'chamber3d'
  | 'song';

export const ACT1_DREAMS: DreamId[] = ['exam', 'fall', 'forest'];
export const ACT2_DREAMS: AllDreamId[] = ['shadow', 'embroidery', 'glass', 'chase'];
export const ACT3_DREAMS: AllDreamId[] = ['woodcut', 'chamber3d'];
export const ALL_DREAMS: AllDreamId[] = [
  'exam',
  'fall',
  'forest',
  'shadow',
  'embroidery',
  'glass',
  'chase',
  'woodcut',
  'chamber3d',
  'song',
];

export interface DreamMeta {
  id: AllDreamId;
  scene: string;
  apt: string;
  owner: string;
  item: string;
  act: 1 | 2 | 3 | 4;
}

export const DREAM_META: Record<AllDreamId, DreamMeta> = {
  exam: { id: 'exam', scene: 'DreamExam', apt: 'PB', owner: 'Élmer', item: 'gis', act: 1 },
  fall: { id: 'fall', scene: 'DreamFall', apt: '5A', owner: 'Nadia', item: 'llave', act: 1 },
  forest: { id: 'forest', scene: 'DreamForest', apt: '4B', owner: 'Chuy', item: 'bote', act: 1 },
  shadow: { id: 'shadow', scene: 'DreamShadow', apt: '1B', owner: 'Goyo', item: 'boleto', act: 2 },
  embroidery: {
    id: 'embroidery',
    scene: 'DreamEmbroidery',
    apt: '2B',
    owner: 'Renata',
    item: 'dedal',
    act: 2,
  },
  glass: { id: 'glass', scene: 'DreamGlass', apt: '4A', owner: 'Paloma', item: 'prisma', act: 2 },
  chase: { id: 'chase', scene: 'DreamChase', apt: '2A', owner: 'Tomás', item: 'dibujo', act: 2 },
  woodcut: {
    id: 'woodcut',
    scene: 'DreamWoodcut',
    apt: '3A',
    owner: 'Mateo',
    item: 'rodillo',
    act: 3,
  },
  chamber3d: {
    id: 'chamber3d',
    scene: 'DreamChamber3D',
    apt: '6A',
    owner: 'Octavio',
    item: 'reloj',
    act: 3,
  },
  song: { id: 'song', scene: 'DreamSong', apt: '3B', owner: 'Iris', item: 'grabadora', act: 4 },
};

export const DREAMS: DreamId[] = ['exam', 'fall', 'forest'];

/**
 * Tipografías del juego (auto-alojadas, OFL — ver public/fonts/LICENSE.md).
 * `DISPLAY` para títulos y cifras; `BODY` para diálogo, más legible en frases largas.
 */
export const FONT_DISPLAY = '"Silkscreen", monospace';
export const FONT_BODY = '"Pixelify Sans", monospace';
/** Gis sobre pizarrón (sueño de Don Élmer). */
export const FONT_CHALK = '"Cabin Sketch", "Patrick Hand", cursive';
/** Letra de adulto a mano (notas, cajas de mudanza, recuerdos). */
export const FONT_HAND = '"Patrick Hand", cursive';
/** Letra de niño (la pesadilla de Tomás). */
export const FONT_KID = '"Gochi Hand", "Patrick Hand", cursive';

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
