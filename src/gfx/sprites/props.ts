import type { Palette } from '../pixelart';

/**
 * Objetos: lo que Iris devuelve a cada vecino, los coleccionables y los
 * pocos elementos del mundo "real" (puertas, cama) que siguen en pixel art.
 */

// ── Lo que se devuelve (10 sueños) ──

/** El gis de Don Élmer: gastado hasta el tamaño de una uña. */
export const GIS_PAL: Palette = { O: '#4a4a52', W: '#f7f5ee', w: '#d6d2c6' };
export const GIS = [
  '............',
  '...OOOOOO...',
  '..OWWWWWwO..',
  '.OWWWWWWwwO.',
  '.OWWWWWWwwO.',
  '..OwwwwwwO..',
  '...OOOOOO...',
  '............',
];

/** La llave de la otra casa. */
export const LLAVE_PAL: Palette = { O: '#4a3a10', K: '#ffd75e', k: '#c99a32' };
export const LLAVE = [
  '..OOO.........',
  '.OKKKO........',
  'OKkOKKOOOOOOO.',
  'OKO.OKKKKKKKKO',
  'OKkOKKOOOOKOKO',
  '.OKKKO....OOO.',
  '..OOO.........',
  '..............',
];

/** El bote de leche agujerado que usó de regadera setenta años. */
export const BOTE_PAL: Palette = {
  O: '#3a3a44',
  T: '#c9ccd4',
  t: '#9a9eaa',
  R: '#d9503a',
  W: '#f7f5ee',
  B: '#6ac8ff',
};
export const BOTE = [
  '..OOOOOOOO..',
  '.OTTTTTTTTO.',
  '.OtTTTTTTtO.',
  '.OTRRRRRRTO.',
  '.OTRWWWWRTO.',
  '.OTRRRRRRTO.',
  '.OTTTTTTTTO.',
  '.OtTTTTTTtO.',
  '.OTTTTOTTTO.',
  '.OTTTTTTTTO.',
  '.OtTTTTTTtO.',
  '..OOOOOOOO..',
  '......B.....',
  '......B.....',
];

/** El boleto del Cine Alameda de Don Goyo. */
export const BOLETO_PAL: Palette = {
  O: '#2a1810',
  A: '#f2b84b',
  a: '#c9882c',
  R: '#a83228',
  W: '#fff4de',
};
export const BOLETO = [
  '..............',
  '.OOOOOOOOOOOO.',
  '.OAAAAAAAAAAO.',
  'OOARRRRRRRRAOO',
  '.OARWWWWWWRAO.',
  'OOARRRRRRRRAOO',
  '.OAaaaaaaaaAO.',
  '.OOOOOOOOOOOO.',
  '..............',
];

/** El dedal de latón con hilo dorado de Renata. */
export const DEDAL_PAL: Palette = {
  O: '#3a2810',
  Y: '#ffd166',
  y: '#c9962c',
  W: '#fff6d6',
  R: '#c84b5a',
};
export const DEDAL = [
  '..............',
  '....OOOOOO....',
  '...OYYYYYYO...',
  '..OYWYyYyYYO..',
  '..OYYyYyYyyO..',
  '..OYYYYYYYYO..',
  '..OyyYYYYyyO..',
  '.OORRRRRRRRO..',
  'OOR..OOOOOO...',
  '.OO...........',
];

/** El prisma de vidrio catedral de Paloma. */
export const PRISMA_PAL: Palette = {
  O: '#14182a',
  C: '#4cc9f0',
  c: '#3a86ff',
  A: '#ffc857',
  W: '#ffffff',
};
export const PRISMA = [
  '......OO......',
  '.....OCCO.....',
  '....OCWWCO....',
  '...OCWAAWCO...',
  '..OCCAAAACCO..',
  '.OCcCCCCCCcCO.',
  'OOccccccccccOO',
  '.OOOOOOOOOOOO.',
];

/** El dibujo de Tomás: una vecina enorme, pero sonriendo. */
export const DIBUJO_PAL: Palette = {
  O: '#8a8478',
  W: '#fbf7ee',
  H: '#3bbfae',
  k: '#2a2438',
  P: '#b79ce8',
  G: '#6fcf6f',
  Y: '#ffd23a',
};
export const DIBUJO = [
  'OOOOOOOOOOOOOO',
  'OWWWWWWWWWWWWO',
  'OWWWWHHHWWWYWO',
  'OWWWHHHHHWYYYO',
  'OWWWHkWkHWWYWO',
  'OWWWWkkkWWWWWO',
  'OWWWWPPPWWWWWO',
  'OWWWPPPPPWWWWO',
  'OWWWWPWPWWWWWO',
  'OWGGGGGGGGGGWO',
  'OWWWWWWWWWWWWO',
  'OOOOOOOOOOOOOO',
];

/** El rodillo de linóleo de Mateo. */
export const RODILLO_PAL: Palette = {
  O: '#161824',
  K: '#262a3d',
  k: '#10121c',
  W: '#e8e0cc',
  M: '#9a6a3a',
};
export const RODILLO = [
  '..............',
  '.OOOOOOOOOOOO.',
  '.OKKKKKKKKKKO.',
  '.OkkkkkkkkkkO.',
  '.OOOOOOOOOOOO.',
  '......OO......',
  '....OOWWOO....',
  '....OMMMMO....',
  '....OMMMMO....',
  '.....OOOO.....',
];

/** El péndulo del reloj de Elena (Octavio, 6A). */
export const RELOJ_PAL: Palette = {
  O: '#1e2533',
  Y: '#f5b841',
  y: '#b88220',
  W: '#eff3f8',
  C: '#5eead4',
};
export const RELOJ = [
  '......OO......',
  '.....OYYO.....',
  '......OO......',
  '......OYO.....',
  '......OYO.....',
  '....OOYYOO....',
  '...OYYWWYYO...',
  '...OYWCCWYO...',
  '...OYYyyYYO...',
  '....OOOOOO....',
];

/** La grabadora de casete de Iris, a los nueve años. */
export const GRABADORA_PAL: Palette = {
  O: '#1e1a2a',
  G: '#b8b4c8',
  g: '#8a86a0',
  B: '#4a4660',
  R: '#ff4a5a',
  w: '#f4efe4',
  K: '#3a3650',
};
export const GRABADORA = [
  '...OO.OO.OOO....',
  '..OBBOBBORRO....',
  '.OOOOOOOOOOOOOO.',
  '.OGGGGGGGGGGGGO.',
  '.OGOOOOOOOOOOGO.',
  '.OGOwKKKKKKwOGO.',
  '.OGOwwKKKKwwOGO.',
  '.OGOOOOOOOOOOGO.',
  '.OGGGGGGGGGGGGO.',
  '.OggggggggggggO.',
  '..OOOOOOOOOOOO..',
];

// ── Coleccionable ──

/** Luciérnaga: resto de sueño que nadie reclamó. */
export const FIREFLY_PAL: Palette = {
  O: '#2a2438',
  W: '#e8f0ff',
  k: '#4a4460',
  Y: '#ffd166',
  y: '#fff3b0',
};
export const FIREFLY = [
  '...O.O...',
  '....O....',
  '..OOOOO..',
  '.OWOkOWO.',
  '.OWOkOWO.',
  '..OYyYO..',
  '..OYyYO..',
  '...OYO...',
  '....O....',
];

// ── Mundo real ──

export const HEART_PAL: Palette = { O: '#5c1626', R: '#ff5d73', r: '#c23a52', W: '#ffffff' };
export const HEART = [
  '.OO...OO.',
  'ORRO.ORRO',
  'ORWRORRRO',
  'ORRRRRRRO',
  '.ORRRRRO.',
  '..ORRRO..',
  '...ORO...',
  '....O....',
];

/** Puerta de departamento, en grises para teñirla con el color de cada vecino. */
export const DOOR_PAL: Palette = {
  O: '#3a3a4a',
  D: '#bbbbbb',
  d: '#8f8f9f',
  K: '#eeeeee',
  N: '#dddddd',
  E: '#555566',
};
export const DOOR = [
  '.OOOOOOOOOOOOOOOOOOOOOO.',
  '.ODDDDDDDDDDDDDDDDDDDDO.',
  '.ODdddddddddddddddddDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdDDDDDDNNNNDDDDDdDDO.',
  '.ODdDDDDDDNEENDDDDDdDDO.',
  '.ODdDDDDDDNNNNDDDDDdDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdDDDDDDDEEDDDDDDdDDO.',
  '.ODdDDDDDDDEEDDDDDDdDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdddddddddddddddddDDO.',
  '.ODDDDDDDDDDDDDDDDDDDDO.',
  '.ODdddddddddddddddddDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdDDDDDDDDDDDDDKKdDDO.',
  '.ODdDDDDDDDDDDDDDKKdDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdDDDDDDDDDDDDDDDdDDO.',
  '.ODdddddddddddddddddDDO.',
  '.ODDDDDDDDDDDDDDDDDDDDO.',
  '.OOOOOOOOOOOOOOOOOOOOOO.',
  '........................',
];

/** Cama con Iris dormida, audífonos puestos. */
export const BED_PAL: Palette = {
  O: '#241b3d',
  F: '#7a4a2a',
  f: '#5a3820',
  B: '#b79ce8',
  b: '#8a67c9',
  W: '#ffffff',
  S: '#f2b58c',
  s: '#cf8f62',
  H: '#3bbfae',
  A: '#39324f',
  a: '#ff7a8a',
};
export const BED = [
  '................................................',
  '................................................',
  '..OO............................................',
  '.OWWO...........................................',
  'OWWWWO......OOOOO...............................',
  'OWWWWO....OOHHHHHOO.............................',
  'OWWWWO...OHAAAAAHHHO............................',
  'OWWWWO...OHaSSSSSHHO............................',
  'OWWWWO...OHaSSsSSHHOOOOOOOOOOOOOOOOOOOOOOOOOO...',
  'OWWWWOOOOOHHSSSSSHOBBBBBBBBBBBBBBBBBBBBBBBBBBO..',
  'OWWWWWWWWWOHHSSSHOBBBBBBBBBBBBBBBBBBBBBBBBBBBBO.',
  'OWWWWWWWWWWOOOOOOBBBBBBBBBBBBBBBBBBBBBBBBBBBBBO.',
  'OFWWWWWWWWWBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBbFO.',
  'OFfBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBbbFO.',
  'OFfBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBbbbFO.',
  'OFfbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbFO.',
  'OFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFO.',
  'OFfFO......................................OFfFO',
  'OFfFO......................................OFfFO',
  'OFfFO......................................OFfFO',
  'OFFFO......................................OFFFO',
  'OOOO........................................OOOO',
  '................................................',
  '................................................',
];

/** La misma cama a la mañana siguiente: los audífonos ya no están puestos. */
export const BED_MORNING = BED.map((r, i) => (i >= 6 && i <= 8 ? r.replace(/[Aa]/g, 'H') : r));
