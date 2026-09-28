import type { Palette } from '../pixelart';

/**
 * Los vecinos del edificio Girasol y Morfeo.
 * Cada uno aparece dentro de su propio sueño, re-dibujado con la técnica de
 * ese sueño (ver stylize.ts); aquí está su versión "real", en pixel art.
 */

const W16 = '................';

// ── Morfeo: gato de humo con gafete de administración ──

export const MORFEO_PAL: Palette = {
  O: '#1c1533',
  M: '#4a3f6e', // humo
  m: '#342a55', // humo oscuro
  C: '#86f7ff', // ojos
  W: '#ffffff',
  l: '#c9bfe8', // cordón del gafete
  B: '#ffe7a0', // gafete
  b: '#b89a4a',
};

export const MORFEO_0 = [
  '........................',
  '...OO........OO...OO....',
  '..OMMO......OMMO.OMO....',
  '..OMMMOOOOOOMMMMOMO.....',
  '..OMmMMMMMMMMMmMMO......',
  '..OMCMMMMMMMMCMMO.......',
  '..OMMMMMWMMMMMMMO.......',
  '...OMMMlMMMMlMMMOO......',
  '...OmMMMlMMlMMMMMMO.....',
  '..OmMMMMBBBBMMMMMMMO....',
  '..OmMMMMBbbBMMMMMMMO....',
  '..OmmMMMBBBBMMMMMmO.....',
  '...OmmMMMMMMMMMmmO......',
  '....OmO..OmO..OmO.......',
  '....O.....O....O........',
  '........................',
];

export const MORFEO_1 = [
  '........................',
  '...OO........OO.........',
  '..OMMO......OMMO........',
  '..OMMMOOOOOOMMMMO..OO...',
  '..OMmMMMMMMMMMmMMOOMO...',
  '..OMCMMMMMMMMCMMOMMO....',
  '..OMMMMMWMMMMMMMOMO.....',
  '...OMMMlMMMMlMMMOO......',
  '...OmMMMlMMlMMMMMMO.....',
  '..OmMMMMBBBBMMMMMMMO....',
  '..OmMMMMBbbBMMMMMMMO....',
  '..OmmMMMBBBBMMMMMmO.....',
  '...OmmMMMMMMMMMmmO......',
  '....OmO..OmO..OmO.......',
  '....O.....O....O........',
  '........................',
];

export const MORFEO_BLINK = MORFEO_0.map((r, i) => (i === 5 ? '..OMOMMMMMMMMOMMO.......' : r));

// ── Élmer a los nueve años: overol prestado, dos tallas más grande ──

export const ELMER_PAL: Palette = {
  O: '#231a14',
  K: '#2e4a7a', // gorra
  k: '#1f3355',
  H: '#2a1f1a', // pelo
  S: '#d9a07a', // piel
  s: '#b07a55',
  E: '#1a1210',
  T: '#f4efe4', // camisa
  B: '#4a78b8', // overol
  b: '#365a8c',
  Y: '#ffd75e', // botones
  G: '#f2efe6', // gis en la mano
};

export const ELMER_0 = [
  W16,
  W16,
  W16,
  W16,
  '.....OOOOOO.....',
  '....OKKKKKKO....',
  '...OKKKKKKKKO...',
  '..OkkkkkkkkkkO..',
  '...OHSSSSSSHO...',
  '...OSESSSSESO...',
  '...OSSSSSSSSO...',
  '...OSSSssSSSO...',
  '....OSSSSSSO....',
  '...OTTOTTOTTO...',
  '..OTBBBBBBBBTO..',
  '..OSBBYBBYBBSO..',
  '..OOBBBBBBBBOO..',
  '...OBBBBBBBBO...',
  '...OBBBbbBBBO...',
  '...OBBO..OBBO...',
  '...OBBO..OBBO...',
  '...ObbO..ObbO...',
  '..OOOOO..OOOOO..',
  W16,
];

// Con el gis en alto, escribiendo su nombre
export const ELMER_1 = ELMER_0.map((r, i) => {
  if (i === 12) return '....OSSSSSSO.OG.';
  if (i === 13) return '...OTTOTTOTTOSO.';
  if (i === 14) return '..OTBBBBBBBBTSO.';
  if (i === 15) return '..OSBBYBBYBBOO..';
  return r;
});

// ── Nadia, del 5º: suéter enorme, chongo a medio hacer ──

export const NADIA_PAL: Palette = {
  O: '#2a1a14',
  H: '#6b3f2a', // pelo castaño
  h: '#4a2a1a',
  S: '#f0c09a',
  s: '#c8906a',
  E: '#2a1a14',
  m: '#b0605a',
  Y: '#e8b33c', // suéter mostaza
  y: '#b8862a',
  J: '#5b7fb0', // mezclilla
  j: '#3f5c86',
  W: '#f4efe4', // calcetas
};

export const NADIA_0 = [
  W16,
  '......OOO.......',
  '.....OHHHO......',
  '.....OHhHO......',
  '....OOHHHOO.....',
  '...OHHHHHHHO....',
  '..OHHHHHHHHHO...',
  '..OHHSSSSSHHO...',
  '..OHSESSSESHO...',
  '..OHSSSSSSSHO...',
  '..OhSSSmSSShO...',
  '..OhHSSSSSHhO...',
  '...OhOSSSOhO....',
  '...OYYYYYYYO....',
  '..OYYYYYYYYYO...',
  '.OYYyYYYYYyYYO..',
  '.OYYyYYYYYyYYO..',
  '.OSOYYYYYYYOSO..',
  '...OyyyyyyyO....',
  '...OJJO.OJJO....',
  '...OJJO.OJJO....',
  '...OjjO.OjjO....',
  '...OWWO.OWWO....',
  '...OOOO.OOOO....',
];

export const NADIA_1 = NADIA_0.map((r, i) => (i === 8 ? '..OHSSSSSSSHO...' : r));

// ── Doña Chuy, del 4B: 81 años, trenza gris, rebozo ──

export const CHUY_PAL: Palette = {
  O: '#2a1a20',
  G: '#d8d4d0', // pelo gris
  g: '#a8a2a0',
  S: '#d9a07a',
  s: '#b07a55',
  E: '#2a1a20',
  R: '#7a3b6e', // rebozo
  r: '#5a2850',
  Q: '#e0a8d0', // rayas del rebozo
  D: '#2f4a5a', // vestido
  d: '#223844',
  A: '#f4efe4', // mandil
};

export const CHUY_0 = [
  W16,
  W16,
  '......OOOO......',
  '.....OGGGGO.....',
  '....OGGgGGGO....',
  '....OGSSSSGO....',
  '...OGSESSESGO...',
  '...OgSSSSSSgO...',
  '...OgSSssSSgO...',
  '....OgSSSSgOO...',
  '...ORRRRRRRROgO.',
  '..ORQRRQRRQRROgO',
  '..ORRRRRRRRRROO.',
  '.ORRQRRAAQRRRRO.',
  '.OSORRAAAARRROS.',
  '..O.ODAAAADDOO..',
  '....ODAAAADDO...',
  '....ODDAADDdO...',
  '....ODDDDDDdO...',
  '....ODDDDDddO...',
  '....OddddddO....',
  '.....OSO.OSO....',
  '....OOOO.OOOO...',
  W16,
];

export const CHUY_1 = CHUY_0.map((r, i) => (i === 6 ? '...OGSSSSSSGO...' : r));

// ── Chuy de niña (recuerdo): trenzas y vestido ──

export const CHUYNINA_PAL: Palette = {
  O: '#2a1a20',
  H: '#2a1a1a',
  S: '#d9a07a',
  s: '#b07a55',
  E: '#2a1a20',
  V: '#e86a5a', // vestido
  v: '#b84a3e',
  W: '#f4efe4',
  T: '#c9c2b8', // bote
};

export const CHUYNINA_0 = [
  W16,
  W16,
  W16,
  W16,
  W16,
  W16,
  '.....OOOOO......',
  '....OHHHHHO.....',
  '...OHHHHHHHO....',
  '...OHSSSSSHO....',
  '..OHSESSESHO....',
  '..OHSSSSSSHO....',
  '.OHOOSSSSOOHO...',
  '.OHO.OVVVO.OHO..',
  '..O.OVVVVVO.O...',
  '...OSVVVVVSO....',
  '...OOVVVVVOOTO..',
  '....OVWVWVOTTO..',
  '....OvvvvvO.OO..',
  '.....OSOSO......',
  '.....OSOSO......',
  '....OOOOOOO.....',
  W16,
  W16,
];

// ── Chuy de joven madre y su hijo (recuerdo) ──

export const CHUYMAMA_PAL: Palette = {
  O: '#2a1a20',
  H: '#1e1414',
  S: '#d9a07a',
  s: '#b07a55',
  E: '#2a1a20',
  D: '#4a8a7a', // vestido
  d: '#346a5c',
  A: '#f4efe4', // mandil
};

export const CHUYMAMA_0 = [
  W16,
  '.....OOOOO......',
  '....OHHHHHO.....',
  '...OHHHHHHHO....',
  '...OHSSSSSHO....',
  '...OSESSSESO....',
  '...OSSSSSSSO....',
  '...OHSSsSSHO....',
  '...OHOSSSOHO....',
  '..OHODDDDDOHO...',
  '..OHDDDDDDDOO...',
  '.OSODDAAADDDOSO.',
  '..O.ODAAADDDOO..',
  '....ODAAADDDO...',
  '....ODAAADDdO...',
  '....ODDDDDDdO...',
  '...ODDDDDDDddO..',
  '...ODDDDDDDddO..',
  '...OdddddddddO..',
  '....OOSO.OSOO...',
  '.....OSO.OSO....',
  '....OOOO.OOOO...',
  W16,
  W16,
];

export const HIJO_PAL: Palette = {
  O: '#2a1a20',
  H: '#2a1a1a',
  S: '#d9a07a',
  E: '#2a1a20',
  C: '#f2d25a', // camisa
  c: '#c2a23a',
  B: '#4a5a8a', // short
  T: '#c9c2b8', // bote
};

export const HIJO_0 = [
  W16,
  W16,
  W16,
  W16,
  W16,
  W16,
  W16,
  W16,
  W16,
  '......OOOO......',
  '.....OHHHHO.....',
  '.....OSSSSO.....',
  '.....OESSEO.....',
  '.....OSSSSO.....',
  '....OCCCCCCO....',
  '...OSCCCCCCSOTO.',
  '....OCCccCCOTTO.',
  '....OBBBBBBO.OO.',
  '....OBBOOBBO....',
  '.....OSO.OSO....',
  '.....OSO.OSO....',
  '....OOOO.OOOO...',
  W16,
  W16,
];

// ── Tomás, del 2A: siete años, pijama de cohetes ──

export const TOMAS_PAL: Palette = {
  O: '#1a1a2a',
  H: '#5a3a22', // pelo alborotado
  h: '#3e2616',
  S: '#f0c09a',
  s: '#c8906a',
  E: '#1a1a2a',
  P: '#4a6ad8', // pijama
  p: '#3450a8',
  R: '#ffd23a', // cohetes
  r: '#ff6a3a',
};

export const TOMAS_0 = [
  W16,
  W16,
  W16,
  W16,
  W16,
  '.....O.O.O......',
  '....OHOHOHO.....',
  '...OHHHHHHHO....',
  '...OHHHHHHHO....',
  '...OHSSSSSHO....',
  '...OSESSSESO....',
  '...OSSSSSSSO....',
  '...OSSSssSSO....',
  '....OSSSSSO.....',
  '...OPPPPPPPO....',
  '..OPPRPPPPPPO...',
  '..OSPrPPPRPSO...',
  '...OPPPPPrPO....',
  '...OPPPPPPPO....',
  '...OPPpOpPPO....',
  '...OppO.OppO....',
  '...OSSO.OSSO....',
  '...OOOO.OOOO....',
  W16,
];

export const TOMAS_1 = TOMAS_0.map((r, i) => (i === 10 ? '...OSSSSSSSO....' : r));

// ── Retratos para el diálogo (24×24) ──

const W24 = '........................';

export const PORTRAIT_IRIS_PAL: Palette = {
  ...{
    O: '#241b3d',
    H: '#3bbfae',
    h: '#23796e',
    L: '#8ff0df',
    S: '#f2b58c',
    s: '#cf8f62',
    C: '#f08a8a',
    E: '#1a1230',
    W: '#ffffff',
    P: '#b79ce8',
    p: '#8a67c9',
    D: '#e2d6fb',
    A: '#39324f',
    a: '#ff7a8a',
    m: '#b25a6a',
  },
};

const IRIS_FACE_TOP = [
  W24,
  '...........OO...........',
  '..........OLHO..........',
  '.......OOOOHHOOOO.......',
  '.....OOHHHHHHHHHHOO.....',
  '....OHHHLLLHHHHHHHHO....',
  '...OHHHLLHHHHHHHHHHHO...',
  '...OHHHHHHHHHHHHHHHHO...',
  '..OHHHHHHHSHHHHSHHHHHO..',
  '..OHHHHHSSSSSSSSSSHHHO..',
  '..OHHHHSSSSSSSSSSSSHHO..',
];

const IRIS_FACE_BOTTOM = [
  '....OhhOSSSSSSSSOhhO....',
  '.....OOAOOSSSSOOAOO.....',
  '....OaaAAOSSSSOAAaaO....',
  '...OaaaOPPPPPPPPOaaaO...',
  '..OPPPPPPPPDPPPPPPPPPO..',
  '.OPPPDPPPPPPPPPPPDPPPPO.',
  '.OPPPPPPPPPPPPPPPPPPPPO.',
];

/** Iris tranquila. */
export const PORTRAIT_IRIS = [
  ...IRIS_FACE_TOP,
  '..OHHHSSOOSSSSSOOSSHHO..',
  '..OhHHSSEWSSSSSEWSSHhO..',
  '..OhHHSSEESSSSSEESSHhO..',
  '..OhhHSCCSSSSSSSCCShhO..',
  '...OhhSSSSSSmmSSSSShO...',
  '...OhhhSSSSSSSSSSShhO...',
  ...IRIS_FACE_BOTTOM,
];

/** Iris sorprendida: ojos grandes, boca abierta. */
export const PORTRAIT_IRIS_WOW = [
  ...IRIS_FACE_TOP,
  '..OHHHSOEWOSSSOEWOSHHO..',
  '..OhHHSOEEOSSSOEEOSHhO..',
  '..OhHHSSOOSSSSSOOSSHhO..',
  '..OhhHSCCSSSOOSSCCShhO..',
  '...OhhSSSSSSmmSSSSShO...',
  '...OhhhSSSSSOOSSSShhO...',
  ...IRIS_FACE_BOTTOM,
];

/** Iris triste o conmovida: mirada baja. */
export const PORTRAIT_IRIS_SAD = [
  ...IRIS_FACE_TOP,
  '..OHHHSSSSSSSSSSSSSHHO..',
  '..OhHHSSOOSSSSSOOSSHhO..',
  '..OhHHSSEESSSSSEESSHhO..',
  '..OhhHSCCSSSSSSSCCShhO..',
  '...OhhSSSSSSSSSSSSShO...',
  '...OhhhSSSSSmmSSSShhO...',
  ...IRIS_FACE_BOTTOM,
];

export const PORTRAIT_MORFEO_PAL: Palette = {
  O: '#1c1533',
  M: '#4a3f6e',
  m: '#342a55',
  N: '#6a5a96', // humo claro
  C: '#86f7ff',
  c: '#3ab8c8',
  W: '#ffffff',
  K: '#ff9ab0', // nariz
  l: '#c9bfe8',
  B: '#ffe7a0',
  b: '#b89a4a',
};

export const PORTRAIT_MORFEO = [
  W24,
  '...OO..............OO...',
  '..OMMO............OMMO..',
  '..OMNMO..........OMNMO..',
  '..OMNNMOOOOOOOOOOMNNMO..',
  '..OMMMMMMMMMMMMMMMMMMO..',
  '.OMMMMMMMMMMMMMMMMMMMMO.',
  '.OMMMMNNMMMMMMMMNNMMMMO.',
  '.OMMMOOOOMMMMMMOOOOMMMO.',
  '.OMMOCCWCOMMMMOCCWCOMMO.',
  '.OMMOCccCOMMMMOCccCOMMO.',
  '.OMMMOOOOMMMMMMOOOOMMMO.',
  '.OmMMMMMMMMKKMMMMMMMMmO.',
  '.OmMMMMMMMMOOMMMMMMMMmO.',
  '..OmMMMMMMOMMOMMMMMMmO..',
  '..OmmMMMMMMMMMMMMMMmmO..',
  '...OmmMMMMMlMMlMMMmmO...',
  '....OmmMMMMlMMlMMmmO....',
  '...OMMMMMMMBBBBMMMMMO...',
  '..OMMMMMMMMBbbBMMMMMMO..',
  '.OMMMMMMMMMBBBBMMMMMMMO.',
  '.OmMMMMMMMMMMMMMMMMMMmO.',
  '.OmmmMMMMMMMMMMMMMMmmmO.',
  '..OOOOOOOOOOOOOOOOOOOO..',
];

/** Morfeo con los ojos entrecerrados: el gesto de quien ya lo vio todo. */
export const PORTRAIT_MORFEO_SMUG = PORTRAIT_MORFEO.map((r, i) => {
  if (i === 8) return '.OMMMMMMMMMMMMMMMMMMMMO.';
  if (i === 9) return '.OMMOOOOOOMMMMOOOOOOMMO.';
  if (i === 10) return '.OMMMCCCCMMMMMMCCCCMMMO.';
  if (i === 11) return '.OMMMMMMMMMMMMMMMMMMMMO.';
  return r;
});
