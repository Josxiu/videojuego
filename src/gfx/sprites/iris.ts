import type { Palette } from '../pixelart';

/**
 * Iris, la protagonista. 16×24, pixel art en mapas de texto.
 * Lleva los audífonos colgando del cuello: once días durmiendo con ellos puestos.
 */
export const IRIS_PAL: Palette = {
  O: '#241b3d', // contorno
  H: '#3bbfae', // pelo
  h: '#23796e', // pelo sombra
  L: '#8ff0df', // brillo del pelo
  S: '#f2b58c', // piel
  s: '#cf8f62', // piel sombra
  C: '#f08a8a', // rubor
  E: '#1a1230', // ojo
  W: '#ffffff',
  P: '#b79ce8', // pijama
  p: '#8a67c9', // pijama sombra
  D: '#e2d6fb', // lunares del pijama
  A: '#39324f', // diadema de los audífonos
  a: '#ff7a8a', // almohadillas
};

const W16 = '................';

// ── Vista lateral (mira a la derecha) ──

const HEAD_SIDE = [
  W16,
  '......OO........',
  '.....OLHO.......',
  '...OOOHHOOO.....',
  '..OHHHHHHHHO....',
  '.OHHLLHHHHHHO...',
  '.OHHHHHHHHHHHO..',
  '.OHHHHHHHSSSSO..',
  '.OHHHHHHSSSESO..',
  '.OhHHHHSSSSESO..',
  '.OhhHHSSSSCSSO..',
  '..OhhhSSSsSO....',
];

const HEAD_SIDE_BLINK = HEAD_SIDE.map((r, i) =>
  i === 8 ? '.OHHHHHHSSSSSO..' : i === 9 ? '.OhHHHHSSSSEEO..' : r,
);

const BODY_SIDE = [
  '....OAAaaO......',
  '...OPPPPPPO.....',
  '..OPPDPPPPPO....',
  '..OPPPPPPPSO....',
  '..OpPPPDPPsO....',
  '...OppppppO.....',
];

const BODY_ARM_FWD = [
  '....OAAaaO......',
  '...OPPPPPPOO....',
  '..OPPDPPPPPSO...',
  '..OPPPPPPPOO....',
  '..OpPPPDPPO.....',
  '...OppppppO.....',
];

const BODY_ARM_BACK = [
  '....OAAaaO......',
  '...OPPPPPPO.....',
  '..OPPDPPPPPO....',
  '.OSOPPPPPPO.....',
  '..OOpPPDPPO.....',
  '...OppppppO.....',
];

const BODY_ARMS_UP = [
  '....OAAaaO.OSO..',
  '...OPPPPPPOPO...',
  '..OPPDPPPPPO....',
  '..OPPPPPPPO.....',
  '..OpPPPDPPO.....',
  '...OppppppO.....',
];

const LEGS_STAND = [
  '....OpO.OPO.....',
  '....OpO.OPO.....',
  '....OpO.OPO.....',
  '....OsO.OSO.....',
  '....OOO.OOO.....',
  W16,
];

const LEGS_STRIDE_A = [
  '....OpO.OPO.....',
  '...OpO...OPO....',
  '..OpO.....OPO...',
  '..OsO.....OSO...',
  '..OOO.....OOO...',
  W16,
];

const LEGS_STRIDE_B = [
  '....OPO.OpO.....',
  '...OPO...OpO....',
  '..OPO.....OpO...',
  '..OSO.....OsO...',
  '..OOO.....OOO...',
  W16,
];

const LEGS_PASS_A = [
  '....OpO.OPO.....',
  '....OpO.OPPO....',
  '....OpO..OSO....',
  '....OsO..OOO....',
  '....OOO.........',
  W16,
];

const LEGS_PASS_B = [
  '....OPO.OpO.....',
  '....OPO.OppO....',
  '....OPO..OsO....',
  '....OSO..OOO....',
  '....OOO.........',
  W16,
];

const LEGS_TUCK = [
  '...OpPPPPO......',
  '...OpOOPPO......',
  '...OsO.OSO......',
  '...OOO.OOO......',
  W16,
  W16,
];

const LEGS_DANGLE = [
  '....OpO.OPO.....',
  '...OpO...OPO....',
  '...OpO...OPO....',
  '...OsO...OSO....',
  '...OOO...OOO....',
  W16,
];

/** Arma un cuadro de 24 filas: cabeza + cuerpo + piernas, con un salto vertical opcional. */
function compose(head: string[], body: string[], legs: string[], lift = 0): string[] {
  const rows = [...head, ...body, ...legs].slice(lift);
  while (rows.length < 24) rows.push(W16);
  return rows.slice(0, 24);
}

export const IRIS_IDLE_0 = compose(HEAD_SIDE, BODY_SIDE, LEGS_STAND);
export const IRIS_IDLE_1 = compose(HEAD_SIDE_BLINK, BODY_SIDE, LEGS_STAND);
export const IRIS_RUN_0 = compose(HEAD_SIDE, BODY_ARM_BACK, LEGS_STRIDE_A);
export const IRIS_RUN_1 = compose(HEAD_SIDE, BODY_SIDE, LEGS_PASS_A, 1);
export const IRIS_RUN_2 = compose(HEAD_SIDE, BODY_ARM_FWD, LEGS_STRIDE_B);
export const IRIS_RUN_3 = compose(HEAD_SIDE, BODY_SIDE, LEGS_PASS_B, 1);
export const IRIS_JUMP = compose(HEAD_SIDE, BODY_ARMS_UP, LEGS_TUCK);
export const IRIS_DROP = compose(HEAD_SIDE, BODY_ARM_FWD, LEGS_DANGLE);

// Sentada en el suelo abrazando las rodillas (para hacerse pequeña)
export const IRIS_SIT = [
  W16,
  W16,
  W16,
  W16,
  W16,
  W16,
  '......OO........',
  '.....OLHO.......',
  '...OOOHHOOO.....',
  '..OHHHHHHHHO....',
  '.OHHLLHHHHHHO...',
  '.OHHHHHHHHHHHO..',
  '.OHHHHHHHSSSSO..',
  '.OHHHHHHSSSESO..',
  '.OhHHHHSSSSESO..',
  '.OhhHHSSSSCSSO..',
  '..OhhhSSSsSO....',
  '...OOAAaaOOOO...',
  '..OPPPPPPOPPPO..',
  '..OPPDPPSSPPPPO.',
  '..OPPPPPSSPPPPO.',
  '..OpppppppOSSO..',
  '...OOOOOOOOOOO..',
  W16,
];

// Agachada, lista para esconderse
export const IRIS_CROUCH = [
  W16,
  W16,
  W16,
  W16,
  W16,
  ...HEAD_SIDE.slice(1),
  '....OAAaaO......',
  '...OPPPPPPOO....',
  '..OPPDPPPPPSO...',
  '..OpPPPPPPPO....',
  '..OpOOOOOOpO....',
  '..OsO.....OSO...',
  '..OOO.....OOO...',
  W16,
];

// ── Vista de frente (caminando hacia abajo) ──

const HEAD_FRONT = [
  W16,
  '.......OO.......',
  '......OLO.......',
  '....OOOHHOOO....',
  '...OHHHHHHHHO...',
  '..OHHLLHHHHHHO..',
  '..OHHHHHHHHHHO..',
  '..OHHSHHHHSHHO..',
  '..OHSSSSSSSSHO..',
  '..OHSESSSSESHO..',
  '..OhSESSSSESHO..',
  '..OhCSSSSSSChO..',
  '...OhSSssSShO...',
];

const HEAD_FRONT_BLINK = HEAD_FRONT.map((r, i) => (i === 9 ? '..OHSSSSSSSSHO..' : r));

const BODY_FRONT = [
  '....OaAAAAaO....',
  '...OPPPPPPPPO...',
  '..OPPPDPPDPPPO..',
  '..OSPPPPPPPPSO..',
  '..OOPPPDPPPPOO..',
  '...OppppppppO...',
];

const LEGS_FRONT = [
  '....OpO..OpO....',
  '....OpO..OpO....',
  '....OsO..OsO....',
  '....OOO..OOO....',
  W16,
];

const LEGS_FRONT_L = [
  '....OpO..OpO....',
  '....OpO..OsO....',
  '....OsO..OOO....',
  '....OOO.........',
  W16,
];

const LEGS_FRONT_R = [
  '....OpO..OpO....',
  '....OsO..OpO....',
  '....OOO..OsO....',
  '.........OOO....',
  W16,
];

export const IRIS_FRONT_0 = compose(HEAD_FRONT, BODY_FRONT, LEGS_FRONT);
export const IRIS_FRONT_1 = compose(HEAD_FRONT, BODY_FRONT, LEGS_FRONT_L);
export const IRIS_FRONT_2 = compose(HEAD_FRONT, BODY_FRONT, LEGS_FRONT_R);
export const IRIS_FRONT_BLINK = compose(HEAD_FRONT_BLINK, BODY_FRONT, LEGS_FRONT);

// ── Vista de espaldas (caminando hacia arriba) ──

const HEAD_BACK = [
  W16,
  '.......OO.......',
  '......OHO.......',
  '....OOOHHOOO....',
  '...OHHHHHHHHO...',
  '..OHHLLHHHHHHO..',
  '..OHHHHHHHHHHO..',
  '..OHHHHHHHHHHO..',
  '..OHHHHHLHHHHO..',
  '..OHHHHHHHHHHO..',
  '..OhHHHHHHHHhO..',
  '..OhhHHHHHHhhO..',
  '...OhhhhhhhhO...',
];

const BODY_BACK = [
  '....OaAAAAaO....',
  '...OPPPPPPPPO...',
  '..OPPDPPPPDPPO..',
  '..OSPPPPPPPPSO..',
  '..OOPPPPDPPPOO..',
  '...OppppppppO...',
];

export const IRIS_BACK_0 = compose(HEAD_BACK, BODY_BACK, LEGS_FRONT);
export const IRIS_BACK_1 = compose(HEAD_BACK, BODY_BACK, LEGS_FRONT_L);
export const IRIS_BACK_2 = compose(HEAD_BACK, BODY_BACK, LEGS_FRONT_R);

// ── Cayendo (de frente, brazos abiertos, pelo hacia arriba) ──

const FALL_HEAD = [
  '..O.O..O.O..O...',
  '..OHOOOHOOOHO...',
  '..OHHHLHHHHHO...',
  '..OHHLLHHHHHHO..',
  '..OHHHHHHHHHHO..',
  '..OHSSSSSSSSHO..',
  '..OHSESSSSESHO..',
  '..OhCSSssSSChO..',
  '...OhSSSSSShO...',
  '....OaAAAAaO....',
];

export const IRIS_FALL_0 = [
  W16,
  ...FALL_HEAD,
  'OSOOPPPPPPPPOOSO',
  'OsOPPPDPPDPPPOsO',
  '.O.OPPPPPPPPO.O.',
  '...OPPPDPPPPO...',
  '...OppppppppO...',
  '...OpO....OpO...',
  '..OpO......OpO..',
  '..OsO......OsO..',
  '..OOO......OOO..',
  W16,
  W16,
  W16,
  W16,
];

export const IRIS_FALL_1 = [
  W16,
  ...FALL_HEAD.map((r, i) => (i === 0 ? '...O.OO.O.OO....' : r)),
  '.OSOPPPPPPPPOSO.',
  '.OsOPPDPPDPPOsO.',
  '...OPPPPPPPPO...',
  '...OPPPDPPPPO...',
  '...OppppppppO...',
  '....OpO..OpO....',
  '...OpO....OpO...',
  '...OsO....OsO...',
  '...OOO....OOO...',
  W16,
  W16,
  W16,
  W16,
];

/** En picada: brazos pegados, cuerpo de flecha. */
export const IRIS_DIVE = [
  W16,
  '.....O.OO.O.....',
  '....OHOHHOHO....',
  '...OHHHLHHHHO...',
  '...OHHHHHHHHO...',
  '...OHSSSSSSHO...',
  '...OHSESSESHO...',
  '...OhCSssSChO...',
  '....OhSSSShO....',
  '....OaAAAAaO....',
  '...OSPPPPPPSO...',
  '...OsPPDPPPsO...',
  '....OPPPPPPO....',
  '....OPPDPPPO....',
  '....OppppppO....',
  '.....OpOOpO.....',
  '.....OpOOpO.....',
  '.....OpOOpO.....',
  '.....OsOOsO.....',
  '.....OOOOOO.....',
  W16,
  W16,
  W16,
  W16,
];

// Deslizándose (horizontal, 24×16)
export const IRIS_SLIDE = [
  '........................',
  '........................',
  '........................',
  '..................OOOO..',
  '.............OOOOHHHHO..',
  '........OOOOPPPPOHHLHHO.',
  '.....OOPPPPPPPPOHSSSSHO.',
  '..OOPPPPPDPPPPOaHSSEsHO.',
  '.OpppPPPPPPPPPOAHSSCsHO.',
  '.OpOpppppppppOOhSSssO...',
  '.OsO..OpO......OSSsO....',
  '.OOO..OsO.....OSO.......',
  '......OOO.....OO........',
  '........................',
  '........................',
  '........................',
];
