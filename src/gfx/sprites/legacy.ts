import Phaser from 'phaser';
import { makeTexture, makeSheet, type Palette } from '../pixelart';

/**
 * Todo el pixel art del juego, dibujado como mapas de texto.
 * Cada letra = un color de la paleta del sprite; '.' = transparente.
 */

// ── Paletas ──
const KEY: Palette = { O: '#4a3a10', K: '#ffd75e', k: '#d9a832' };

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

// ── La Sombra (pesadilla, 26x18): masa negra con ojos rojos ──
const SHADOW: Palette = {
  B: '#0a0a12',
  b: '#1a1a26',
  R: '#ff3b3b',
  r: '#8c1f1f',
};

const SHADOW_0 = [
  '..........................',
  '......BB......BB..........',
  '.....BBBB....BBBB.........',
  '....BBBBBBBBBBBBBB........',
  '...BBBBBBBBBBBBBBBB.......',
  '..BBBBBBBBBBBBBBBBBB......',
  '..BBBRRBBBBBBRRBBBBBB.....',
  '.BBBBRRBBBBBBRRBBBBBBB....',
  '.BBBBBBBBBBBBBBBBBBBBBB...',
  'BBBBBBBBbBBBBBBBBBBBBBBB..',
  'BBBBBBBBBBBBBBBBBBBBBBBBB.',
  'BBBBBBBBBBBBBBBBBBBBBBBBBB',
  '.BBBBBBBBBBBBbBBBBBBBBBBB.',
  '.BBBBBBBBBBBBBBBBBBBBBBB..',
  '..BBBBBBBBBBBBBBBBBBBB....',
  '...BBBB.BBBBB..BBBB.BB....',
  '....BB...BBB....BB...B....',
  '.....B....B......B........',
];

const SHADOW_1 = [
  '..........................',
  '.....BB......BB...........',
  '....BBBB....BBBB..........',
  '....BBBBBBBBBBBBBB........',
  '...BBBBBBBBBBBBBBBB.......',
  '..BBBBBBBBBBBBBBBBBB......',
  '..BBBrRBBBBBBrRBBBBBB.....',
  '.BBBBRRBBBBBBRRBBBBBBB....',
  '.BBBBBBBBBBBBBBBBBBBBBB...',
  'BBBBBBBBBBBBBbBBBBBBBBBB..',
  'BBBBBBBBBBBBBBBBBBBBBBBBB.',
  'BBBBBBBBBBBBBBBBBBBBBBBBBB',
  '.BBBBBBBBbBBBBBBBBBBBBBBB.',
  '.BBBBBBBBBBBBBBBBBBBBBBB..',
  '..BBBBBBBBBBBBBBBBBBBB....',
  '...BB.BBBBB..BBBBB.BBB....',
  '....B...BB....BBB...B.....',
  '........B......B..........',
];

// ── Armario silueta (18x28) para esconderse ──
const WARDROBE: Palette = { B: '#0d0d16', b: '#1c1c2a', K: '#34344a' };

const WARDROBE_MAP = [
  '.BBBBBBBBBBBBBBBB.',
  'BBbbbbbbbbbbbbbbBB',
  'BBbBBBBBBbBBBBBbBB',
  'BBbBBBBBBbBBBBBbBB',
  'BBbBBBBBBbBBBBBbBB',
  'BBbBBBKBBbBBKBBbBB',
  'BBbBBBKBBbBBKBBbBB',
  'BBbBBBBBBbBBBBBbBB',
  'BBbBBBBBBbBBBBBbBB',
  'BBbBBBBBBbBBBBBbBB',
  'BBbBBBBBBbBBBBBbBB',
  'BBbBBBBBBbBBBBBbBB',
  'BBbBBBBBBbBBBBBbBB',
  'BBbBBBBBBbBBBBBbBB',
  'BBbBBBBBBbBBBBBbBB',
  'BBbBBBBBBbBBBBBbBB',
  'BBbBBBBBBbBBBBBbBB',
  'BBbBBBBBBbBBBBBbBB',
  'BBbBBBBBBbBBBBBbBB',
  'BBbBBBBBBbBBBBBbBB',
  'BBbBBBBBBbBBBBBbBB',
  'BBbBBBBBBbBBBBBbBB',
  'BBbbbbbbbbbbbbbbBB',
  'BBBBBBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBBBBBB',
  '.BBB..........BBB.',
  '.BBB..........BBB.',
  '..................',
];

/**
 * Texturas de la versión anterior que aún usan escenas en transición.
 * (Se eliminan a medida que cada sueño se redibuja con su propia técnica.)
 */
export function registerLegacySprites(scene: Phaser.Scene): void {
  makeTexture(scene, 'key', KEY_MAP, KEY);
  makeTexture(scene, 'locker', LOCKER_MAP, LOCKER);
  makeTexture(scene, 'paper', PAPER_MAP, PAPER);
  makeTexture(scene, 'bell', BELL_MAP, BELL);
  makeTexture(scene, 'clock', CLOCK_MAP, CLOCK);
  makeTexture(scene, 'window', WINDOW_MAP, WINDOW);
  makeTexture(scene, 'tree', TREE_MAP, TREE);
  makeTexture(scene, 'lantern', LANTERN_MAP, LANTERN);
  makeSheet(scene, 'shadow', [SHADOW_0, SHADOW_1], SHADOW);
  makeTexture(scene, 'wardrobe', WARDROBE_MAP, WARDROBE);
  if (!scene.anims.exists('shadow-idle')) {
    scene.anims.create({
      key: 'shadow-idle',
      frames: [
        { key: 'shadow', frame: '0' },
        { key: 'shadow', frame: '1' },
      ],
      frameRate: 2.2,
      repeat: -1,
    });
  }
}
