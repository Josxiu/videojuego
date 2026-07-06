import Phaser from 'phaser';
import { makeTexture, makeSheet, makeGlow, makeSolid, Palette } from './pixelart';

/**
 * Todo el pixel art del juego, dibujado como mapas de texto.
 * Cada letra = un color de la paleta del sprite; '.' = transparente.
 */

// ── Paletas ──
const IRIS: Palette = {
  O: '#241b3d', // contorno
  H: '#3bbfae', // pelo
  h: '#23796e', // pelo sombra
  S: '#f2b58c', // piel
  s: '#cf8f62', // piel sombra
  P: '#b79ce8', // pijama
  p: '#8a67c9', // pijama sombra
  E: '#1a1230', // ojo
  W: '#ffffff',
};

const MORFEO: Palette = {
  O: '#1c1533',
  M: '#4a3f6e', // humo
  m: '#342a55', // humo oscuro
  C: '#86f7ff', // ojos
  W: '#ffffff',
};

// La puerta se dibuja en grises para poder teñirla del color de cada sueño
const DOOR: Palette = {
  O: '#3a3a4a',
  D: '#bbbbbb',
  d: '#8f8f9f',
  K: '#eeeeee',
};

const KEY: Palette = { O: '#4a3a10', K: '#ffd75e', k: '#d9a832' };
const HEART: Palette = { O: '#5c1626', R: '#ff5d73', r: '#c23a52', W: '#ffffff' };

const LOCKER: Palette = { O: '#7a3d00', L: '#ffb020', l: '#d98c12', D: '#8a5a2b', W: '#ffffff' };
const PAPER: Palette = { O: '#555566', W: '#ffffff', w: '#d8d8e8' };
const BELL: Palette = { O: '#7a5a00', B: '#ffd75e', b: '#d9a832' };
const CLOCK: Palette = {
  O: '#3a2a1a',
  W: '#f7ecd8', // carátula
  R: '#d94f30', // aro y ojos enojados
  r: '#a33520',
  H: '#3a2a1a', // manecillas
};
const WINDOW: Palette = { O: '#4a4370', F: '#8a7fb8', G: '#bfe8ff', g: '#8fb8d8', W: '#ffffff' };
const TREE: Palette = { T: '#16323a', t: '#0e2228', g: '#1f4a50' };
const LANTERN: Palette = { O: '#3a2a1a', L: '#6b5a3a', F: '#ffd166', G: '#fff3d0' };
const BED: Palette = {
  O: '#241b3d',
  F: '#7a4a2a', // madera
  f: '#5a3820',
  B: '#b79ce8', // cobija
  b: '#8a67c9',
  W: '#ffffff', // almohada
  S: '#f2b58c', // piel
  s: '#cf8f62', // piel sombra
  H: '#3bbfae', // pelo
};

// ── Iris: cuerpo base (filas 0..15) reutilizado por varios cuadros ──
const IRIS_TORSO = [
  '................',
  '....OOOOOO......',
  '...OHHHHHHO.....',
  '..OHHHHHHHHO....',
  '..OHHHHHHHHO....',
  '..OHSSSSSSHO....',
  '..OHSSSSEsHO....',
  '..OHSSSSSsHO....',
  '...OhSSSssO.....',
  '....OSSssO......',
  '....OPPPPO......',
  '...OPPPPPPO.....',
  '...OPPPPPPO.....',
  '..OSOPPPPOSO....',
  '...OPPPPPPO.....',
  '....OpppppO.....',
];

// Igual pero con el ojo cerrado (parpadeo)
const IRIS_TORSO_BLINK = IRIS_TORSO.map((r, i) =>
  i === 6 ? '..OHSSSSssHO....' : r,
);

const LEGS_TOGETHER = [
  '....OpO.OpO.....',
  '....OpO.OpO.....',
  '....OpO.OpO.....',
  '....OpO.OpO.....',
  '....OsO.OsO.....',
  '....OOO.OOO.....',
  '................',
  '................',
];

const LEGS_STRIDE = [
  '...OpO..OpO.....',
  '...OpO...OpO....',
  '..OpO....OpO....',
  '..OpO.....OpO...',
  '..OsO.....OsO...',
  '..OOO.....OOO...',
  '................',
  '................',
];

const LEGS_TUCKED = [
  '....OppppO......',
  '....OpO.OpO.....',
  '....OsO.OsO.....',
  '....OOO.OOO.....',
  '................',
  '................',
  '................',
  '................',
];

const IRIS_IDLE_0 = [...IRIS_TORSO, ...LEGS_TOGETHER];
const IRIS_IDLE_1 = [...IRIS_TORSO_BLINK, ...LEGS_TOGETHER];
const IRIS_WALK_0 = [...IRIS_TORSO, ...LEGS_STRIDE];
const IRIS_WALK_1 = [...IRIS_TORSO, ...LEGS_TOGETHER];
const IRIS_JUMP = [...IRIS_TORSO, ...LEGS_TUCKED];

// Cayendo (vista frontal, pelo hacia arriba, brazos abiertos)
const IRIS_FALL_0 = [
  '..O.O..O.O......',
  '..OHOOOHOO......',
  '..OHHHHHHHO.....',
  '..OHHHHHHHHO....',
  '..OHHHHHHHHO....',
  '..OHSSSSSSHO....',
  '..OHSESSESHO....',
  '..OHSSssSSHO....',
  '...OhSSSShO.....',
  '....OSSSsO......',
  'OSSOPPPPPPOSSO..',
  'OsOOPPPPPPOOsO..',
  '...OPPPPPPO.....',
  '...OPPPPPPO.....',
  '...OPPPPPPO.....',
  '....OpppppO.....',
  '...OpO...OpO....',
  '..OpO.....OpO...',
  '..OpO.....OpO...',
  '..OsO.....OsO...',
  '..OOO.....OOO...',
  '................',
  '................',
  '................',
];

const IRIS_FALL_1 = [
  '...O.OO.O.O.....',
  '..OHOHHOHOO.....',
  '..OHHHHHHHO.....',
  '..OHHHHHHHHO....',
  '..OHHHHHHHHO....',
  '..OHSSSSSSHO....',
  '..OHSESSESHO....',
  '..OHSSssSSHO....',
  '...OhSSSShO.....',
  '....OSSSsO......',
  '.OSOPPPPPPOSO...',
  '.OsOPPPPPPOsO...',
  '...OPPPPPPO.....',
  '...OPPPPPPO.....',
  '...OPPPPPPO.....',
  '....OpppppO.....',
  '....OpO.OpO.....',
  '...OpO...OpO....',
  '...OpO...OpO....',
  '...OsO...OsO....',
  '...OOO...OOO....',
  '................',
  '................',
  '................',
];

// Deslizándose (horizontal, 24x16)
const IRIS_SLIDE = [
  '........................',
  '........................',
  '........................',
  '..................OOOO..',
  '.............OOOOHHHHO..',
  '........OOOOPPPPOHHHHHO.',
  '.....OOPPPPPPPPOHSSSSHO.',
  '..OOPPPPPPPPPPOHSSEsHO..',
  '.OpppPPPPPPPPPOHSSSsHO..',
  '.OpOpppppppppOOhSSssO...',
  '.OsO..OpO......OSSsO....',
  '.OOO..OsO.....OSO.......',
  '......OOO.....OO........',
  '........................',
  '........................',
  '........................',
];

// ── Morfeo, gato de humo (24x16), dos cuadros: cola de un lado a otro ──
const MORFEO_0 = [
  '........................',
  '...OO........OO...OO....',
  '..OMMO......OMMO.OMO....',
  '..OMMMOOOOOOMMMMOMO.....',
  '..OMmMMMMMMMMMmMMO......',
  '..OMCMMMMMMMMCMMO.......',
  '..OMMMMMWMMMMMMMO.......',
  '...OMMMMMMMMMMMMOO......',
  '...OmMMMMMMMMMMMMMO.....',
  '..OmMMMMMMMMMMMMMMMO....',
  '..OmMMMMMMMMMMMMMMMO....',
  '..OmmMMMMMMMMMMMMmO.....',
  '...OmmMMMMMMMMMmmO......',
  '....OmO..OmO..OmO.......',
  '....O.....O....O........',
  '........................',
];

const MORFEO_1 = [
  '........................',
  '...OO........OO.........',
  '..OMMO......OMMO........',
  '..OMMMOOOOOOMMMMO..OO...',
  '..OMmMMMMMMMMMmMMOOMO...',
  '..OMCMMMMMMMMCMMOMMO....',
  '..OMMMMMWMMMMMMMOMO.....',
  '...OMMMMMMMMMMMMOO......',
  '...OmMMMMMMMMMMMMMO.....',
  '..OmMMMMMMMMMMMMMMMO....',
  '..OmMMMMMMMMMMMMMMMO....',
  '..OmmMMMMMMMMMMMMmO.....',
  '...OmmMMMMMMMMMmmO......',
  '....OmO..OmO..OmO.......',
  '....O.....O....O........',
  '........................',
];

// ── Puerta (24x36, en grises: se tiñe con el color de cada sueño) ──
const DOOR_MAP = [
  '......OOOOOOOOOOOO......',
  '....OODDDDDDDDDDDDOO....',
  '...ODDDDDDDDDDDDDDDDO...',
  '..ODDDdddddddddddDDDDO..',
  '..ODDdDDDDDDDDDDDdDDDO..',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDKKDDDdDDDO.',
  '.ODDdDDDDDDDDKKDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdDDDDDDDDDDDDDdDDDO.',
  '.ODDdddddddddddddddDDDO.',
  '.ODDDDDDDDDDDDDDDDDDDDO.',
  '.OOOOOOOOOOOOOOOOOOOOOO.',
  '........................',
];

// ── Llave (12x12) ──
const KEY_MAP = [
  '....OOOO....',
  '...OKKKKO...',
  '..OKKOOKKO..',
  '..OKKOOKKO..',
  '...OKKKKO...',
  '....OKKO....',
  '....OKkO....',
  '....OKkO....',
  '....OKkOO...',
  '....OKkKKO..',
  '....OKkOO...',
  '....OOO.....',
];

// ── Corazón (9x8) ──
const HEART_MAP = [
  '.OO...OO.',
  'ORRO.ORRO',
  'ORWRORRRO',
  'ORRRRRRRO',
  '.ORRRRRO.',
  '..ORRRO..',
  '...ORO...',
  '....O....',
];

// ── Casillero (16x28) ──
const LOCKER_MAP = [
  '.OOOOOOOOOOOOOO.',
  'OLLLLLLLLLLLLLLO',
  'OLllllllllllllLO',
  'OLlLLLLLLLLLLlLO',
  'OLlLLLLLLLLLLlLO',
  'OLlLLWWWWWLLLlLO',
  'OLlLLLLLLLLLLlLO',
  'OLlLLLLLLLLLLlLO',
  'OLllllllllllllLO',
  'OLlLLLLLLLLLLlLO',
  'OLlLLLLLDDLLLlLO',
  'OLlLLLLLDDLLLlLO',
  'OLlLLLLLLLLLLlLO',
  'OLlLLLLLLLLLLlLO',
  'OLlLLLLLLLLLLlLO',
  'OLlLLLLLLLLLLlLO',
  'OLlLLLLLLLLLLlLO',
  'OLlLLLLLLLLLLlLO',
  'OLlLLLLLLLLLLlLO',
  'OLlLLLLLLLLLLlLO',
  'OLlLLLLLLLLLLlLO',
  'OLlLLLLLLLLLLlLO',
  'OLlLLLLLLLLLLlLO',
  'OLlLLLLLLLLLLlLO',
  'OLlLLLLLLLLLLlLO',
  'OLllllllllllllLO',
  'OLLLLLLLLLLLLLLO',
  '.OOOOOOOOOOOOOO.',
];

// ── Papel volador (10x10) ──
const PAPER_MAP = [
  '.OOOOOOOO.',
  'OWWWWWWWWO',
  'OWwwwwwWWO',
  'OWWWWWWWWO',
  'OWwwwWWWWO',
  'OWWWWWWWWO',
  'OWwwwwwWWO',
  'OWWWWWWWWO',
  'OWWWWWWWWO',
  '.OOOOOOOO.',
];

// ── Timbre (16x14) ──
const BELL_MAP = [
  '......OOOO......',
  '.....OBBBBO.....',
  '....OBBBBBBO....',
  '...OBBBBBBBBO...',
  '...OBBBBBBBBO...',
  '..OBBBBBBBBBBO..',
  '..OBBBBBBBBBBO..',
  '..OBbBBBBBBbBO..',
  '.OBbBBBBBBBBbBO.',
  '.OBbBBBBBBBBbBO.',
  'OBbBBBBBBBBBBbBO',
  'OOOOOOOOOOOOOOOO',
  '......ObbO......',
  '.......OO.......',
];

// ── Reloj enojado (20x20) ──
const CLOCK_MAP = [
  '......OOOOOOOO......',
  '....OORRRRRRRROO....',
  '...ORRRRRRRRRRRRO...',
  '..ORRWWWWWWWWWWRRO..',
  '..ORWWWWWWWWWWWWRO..',
  '.ORWWRRWWWWWWRRWWRO.',
  '.ORWWRRWWWWWWRRWWRO.',
  '.ORWWWWWWHWWWWWWWRO.',
  '.ORWWWWWWHWWWWWWWRO.',
  '.ORWWWWWWHHHHWWWWRO.',
  '.ORWWWWWWHWWWWWWWRO.',
  '.ORWWWWWWHWWWWWWWRO.',
  '.ORWWWrrrrrrrWWWWRO.',
  '.ORWWrWWWWWWWrWWWRO.',
  '..ORWWWWWWWWWWWWRO..',
  '..ORRWWWWWWWWWWRRO..',
  '...ORRRRRRRRRRRRO...',
  '....OORRRRRRRROO....',
  '..ORRO........ORRO..',
  '..OOO..........OOO..',
];

// ── Ventana rota (20x26) ──
const WINDOW_MAP = [
  'OOOOOOOOOOOOOOOOOOOO',
  'OFFFFFFFFFFFFFFFFFFO',
  'OFGGGGGGGFFGGGGGGGFO',
  'OFGGGGGGGFFGGGGGgGFO',
  'OFGGGgGGGFFGGGGgGGFO',
  'OFGGgGGGGFFGGGgGGGFO',
  'OFGgGGGGGFFGGGGGGGFO',
  'OFGGGGGGGFFGgGGGGGFO',
  'OFGGGGGgGFFGGGGGGGFO',
  'OFGGGGgGGFFGGGGGGGFO',
  'OFFFFFFFFFFFFFFFFFFO',
  'OFFFFFFFFFFFFFFFFFFO',
  'OFGGGGGGGFFGGGGGGGFO',
  'OFGGGgGGGFFGGGGGGGFO',
  'OFGGgGGGGFFGGGgGGGFO',
  'OFGgGGGGGFFGGgGGGGFO',
  'OFGGGGGGGFFGgGGGGGFO',
  'OFGGGGGGGFFGGGGGGGFO',
  'OFGGGGGgGFFGGGGGGGFO',
  'OFGGGGgGGFFGGGGGgGFO',
  'OFGGGgGGGFFGGGGgGGFO',
  'OFGGgGGGGFFGGGgGGGFO',
  'OFGGGGGGGFFGGGGGGGFO',
  'OFGGGGGGGFFGGGGGGGFO',
  'OFFFFFFFFFFFFFFFFFFO',
  'OOOOOOOOOOOOOOOOOOOO',
];

// ── Árbol silueta (24x34) ──
const TREE_MAP = [
  '.........TTTT...........',
  '.......TTTTTTTT.........',
  '......TTTTgTTTTT........',
  '....TTTTTTTTTTTTTT......',
  '...TTTTTTTTTTgTTTTT.....',
  '..TTTTgTTTTTTTTTTTTT....',
  '..TTTTTTTTTTTTTTTTTT....',
  '.TTTTTTTTTgTTTTTTTTTT...',
  '.TTTTTTTTTTTTTTTTgTTT...',
  'TTTTgTTTTTTTTTTTTTTTTT..',
  'TTTTTTTTTTTTgTTTTTTTTT..',
  'TTTTTTTTTTTTTTTTTTTTTT..',
  '.TTTTTTTgTTTTTTTTTTTT...',
  '.TTTTTTTTTTTTTTTgTTTT...',
  '..TTTTTTTTTTTTTTTTTT....',
  '...TTTTTTTtTTTTTTTT.....',
  '....TTTTTttTTTTTTT......',
  '......TTTttTTTT.........',
  '........TttT............',
  '.........tt.............',
  '.........tt.............',
  '.........tt.............',
  '........ttt.............',
  '........tttt............',
  '.......tttttt...........',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
];

// ── Farol (12x20) ──
const LANTERN_MAP = [
  '....OOOO....',
  '.....OO.....',
  '...OOOOOO...',
  '..OLLLLLLO..',
  '..OLGGGGLO..',
  '..OLGFFGLO..',
  '..OLGFFGLO..',
  '..OLGFFGLO..',
  '..OLGGGGLO..',
  '..OLLLLLLO..',
  '...OOOOOO...',
  '....OLLO....',
  '....OLLO....',
  '....OLLO....',
  '....OLLO....',
  '....OLLO....',
  '...OLLLLO...',
  '..OLLLLLLO..',
  '.OLLLLLLLLO.',
  '.OOOOOOOOOO.',
];

// ── Cama con Iris dormida (48x24) ──
const BED_MAP = [
  '................................................',
  '................................................',
  '..OO............................................',
  '.OWWO...........................................',
  'OWWWWO......OOOOO...............................',
  'OWWWWO....OOHHHHHOO.............................',
  'OWWWWO...OHHHHHHHHHO............................',
  'OWWWWO...OHHSSSSSHHO............................',
  'OWWWWO...OHHSSsSSHHOOOOOOOOOOOOOOOOOOOOOOOOOO...',
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

/** Registra todas las texturas y animaciones. Llamar una vez en Boot. */
export function registerAllSprites(scene: Phaser.Scene): void {
  // Personajes
  makeSheet(scene, 'iris', [IRIS_IDLE_0, IRIS_IDLE_1, IRIS_WALK_0, IRIS_WALK_1, IRIS_JUMP], IRIS);
  makeSheet(scene, 'iris-fall', [IRIS_FALL_0, IRIS_FALL_1], IRIS);
  makeTexture(scene, 'iris-slide', IRIS_SLIDE, IRIS);
  makeSheet(scene, 'morfeo', [MORFEO_0, MORFEO_1], MORFEO);

  // Objetos comunes
  makeTexture(scene, 'door', DOOR_MAP, DOOR);
  makeTexture(scene, 'key', KEY_MAP, KEY);
  makeTexture(scene, 'heart', HEART_MAP, HEART);
  makeTexture(scene, 'bed', BED_MAP, BED);

  // Sueño 1: examen
  makeTexture(scene, 'locker', LOCKER_MAP, LOCKER);
  makeTexture(scene, 'paper', PAPER_MAP, PAPER);
  makeTexture(scene, 'bell', BELL_MAP, BELL);
  makeTexture(scene, 'clock', CLOCK_MAP, CLOCK);

  // Sueño 2: caída
  makeTexture(scene, 'window', WINDOW_MAP, WINDOW);

  // Sueño 3: bosque
  makeTexture(scene, 'tree', TREE_MAP, TREE);
  makeTexture(scene, 'lantern', LANTERN_MAP, LANTERN);

  // Brillos y partículas
  makeGlow(scene, 'glow-gold', 12, '#ffd166');
  makeGlow(scene, 'glow-cyan', 12, '#86f7ff');
  makeGlow(scene, 'glow-violet', 16, '#9d7bff');
  makeGlow(scene, 'glow-white', 8, '#ffffff');
  makeSolid(scene, 'px', 2, 2, '#ffffff');

  // Animaciones globales
  const anims = scene.anims;
  if (!anims.exists('iris-idle')) {
    anims.create({
      key: 'iris-idle',
      frames: [
        { key: 'iris', frame: '0', duration: 2200 },
        { key: 'iris', frame: '1', duration: 180 },
      ],
      repeat: -1,
    });
    anims.create({
      key: 'iris-walk',
      frames: [
        { key: 'iris', frame: '2' },
        { key: 'iris', frame: '3' },
      ],
      frameRate: 7,
      repeat: -1,
    });
    anims.create({
      key: 'iris-run',
      frames: [
        { key: 'iris', frame: '2' },
        { key: 'iris', frame: '3' },
      ],
      frameRate: 12,
      repeat: -1,
    });
    anims.create({
      key: 'iris-falling',
      frames: [
        { key: 'iris-fall', frame: '0' },
        { key: 'iris-fall', frame: '1' },
      ],
      frameRate: 5,
      repeat: -1,
    });
    anims.create({
      key: 'morfeo-idle',
      frames: [
        { key: 'morfeo', frame: '0' },
        { key: 'morfeo', frame: '1' },
      ],
      frameRate: 1.4,
      repeat: -1,
    });
  }
}
