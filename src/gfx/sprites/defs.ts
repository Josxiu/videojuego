import type { Palette } from '../pixelart';
import * as I from './iris';
import * as C from './cast';
import * as C2 from './cast2';
import * as P from './props';

/**
 * Registro de todo el pixel art. Es una tabla de datos para que los tests
 * puedan validar cada mapa (anchos, colores) sin arrancar Phaser.
 */
export interface SpriteDef {
  key: string;
  frames: string[][];
  pal: Palette;
}

export const SPRITES: SpriteDef[] = [
  {
    key: 'iris',
    pal: I.IRIS_PAL,
    frames: [
      I.IRIS_IDLE_0,
      I.IRIS_IDLE_1,
      I.IRIS_RUN_0,
      I.IRIS_RUN_1,
      I.IRIS_RUN_2,
      I.IRIS_RUN_3,
      I.IRIS_JUMP,
      I.IRIS_DROP,
      I.IRIS_SIT,
      I.IRIS_CROUCH,
      I.IRIS_FRONT_0,
      I.IRIS_FRONT_1,
      I.IRIS_FRONT_2,
      I.IRIS_FRONT_BLINK,
      I.IRIS_BACK_0,
      I.IRIS_BACK_1,
      I.IRIS_BACK_2,
    ],
  },
  { key: 'iris-fall', pal: I.IRIS_PAL, frames: [I.IRIS_FALL_0, I.IRIS_FALL_1, I.IRIS_DIVE] },
  { key: 'iris-slide', pal: I.IRIS_PAL, frames: [I.IRIS_SLIDE] },
  { key: 'morfeo', pal: C.MORFEO_PAL, frames: [C.MORFEO_0, C.MORFEO_1, C.MORFEO_BLINK] },
  { key: 'elmer', pal: C.ELMER_PAL, frames: [C.ELMER_0, C.ELMER_1] },
  { key: 'nadia', pal: C.NADIA_PAL, frames: [C.NADIA_0, C.NADIA_1] },
  { key: 'chuy', pal: C.CHUY_PAL, frames: [C.CHUY_0, C.CHUY_1] },
  { key: 'chuynina', pal: C.CHUYNINA_PAL, frames: [C.CHUYNINA_0] },
  { key: 'chuymama', pal: C.CHUYMAMA_PAL, frames: [C.CHUYMAMA_0] },
  { key: 'hijo', pal: C.HIJO_PAL, frames: [C.HIJO_0] },
  { key: 'goyo', pal: C2.GOYO_PAL, frames: [C2.GOYO_0, C2.GOYO_1] },
  { key: 'renata', pal: C2.RENATA_PAL, frames: [C2.RENATA_0, C2.RENATA_1] },
  { key: 'paloma', pal: C2.PALOMA_PAL, frames: [C2.PALOMA_0, C2.PALOMA_1] },
  { key: 'tomas', pal: C.TOMAS_PAL, frames: [C.TOMAS_0, C.TOMAS_1] },
  { key: 'mateo', pal: C2.MATEO_PAL, frames: [C2.MATEO_0, C2.MATEO_1] },
  { key: 'octavio', pal: C2.OCTAVIO_PAL, frames: [C2.OCTAVIO_0, C2.OCTAVIO_1] },
  {
    key: 'portrait-iris',
    pal: C.PORTRAIT_IRIS_PAL,
    frames: [C.PORTRAIT_IRIS, C.PORTRAIT_IRIS_WOW, C.PORTRAIT_IRIS_SAD],
  },
  {
    key: 'portrait-morfeo',
    pal: C.PORTRAIT_MORFEO_PAL,
    frames: [C.PORTRAIT_MORFEO, C.PORTRAIT_MORFEO_SMUG],
  },
  { key: 'portrait-goyo', pal: C2.PORTRAIT_GOYO_PAL, frames: [C2.PORTRAIT_GOYO] },
  { key: 'portrait-renata', pal: C2.PORTRAIT_RENATA_PAL, frames: [C2.PORTRAIT_RENATA] },
  { key: 'portrait-paloma', pal: C2.PORTRAIT_PALOMA_PAL, frames: [C2.PORTRAIT_PALOMA] },
  { key: 'portrait-mateo', pal: C2.PORTRAIT_MATEO_PAL, frames: [C2.PORTRAIT_MATEO] },
  {
    key: 'portrait-octavio',
    pal: C2.PORTRAIT_OCTAVIO_PAL,
    frames: [C2.PORTRAIT_OCTAVIO, C2.PORTRAIT_OCTAVIO_COLD],
  },
  { key: 'gis', pal: P.GIS_PAL, frames: [P.GIS] },
  { key: 'llave', pal: P.LLAVE_PAL, frames: [P.LLAVE] },
  { key: 'bote', pal: P.BOTE_PAL, frames: [P.BOTE] },
  { key: 'boleto', pal: P.BOLETO_PAL, frames: [P.BOLETO] },
  { key: 'dedal', pal: P.DEDAL_PAL, frames: [P.DEDAL] },
  { key: 'prisma', pal: P.PRISMA_PAL, frames: [P.PRISMA] },
  { key: 'dibujo', pal: P.DIBUJO_PAL, frames: [P.DIBUJO] },
  { key: 'rodillo', pal: P.RODILLO_PAL, frames: [P.RODILLO] },
  { key: 'reloj', pal: P.RELOJ_PAL, frames: [P.RELOJ] },
  { key: 'grabadora', pal: P.GRABADORA_PAL, frames: [P.GRABADORA] },
  { key: 'firefly', pal: P.FIREFLY_PAL, frames: [P.FIREFLY] },
  { key: 'heart', pal: P.HEART_PAL, frames: [P.HEART] },
  { key: 'door', pal: P.DOOR_PAL, frames: [P.DOOR] },
  { key: 'bed', pal: P.BED_PAL, frames: [P.BED] },
  { key: 'bed-morning', pal: P.BED_PAL, frames: [P.BED_MORNING] },
];

/** Cuadros con nombre de la hoja de Iris, para no usar números mágicos. */
export const IRIS_FRAME = {
  idle: '0',
  blink: '1',
  jump: '6',
  drop: '7',
  sit: '8',
  crouch: '9',
  front: '10',
  back: '14',
} as const;
