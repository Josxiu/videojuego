import type { Palette } from '../pixelart';

/**
 * Nuevos vecinos del Edificio Girasol (Acto II y Acto III) y el Antagonista,
 * más sus retratos de 24×24 para la caja de diálogo.
 */

const W16 = '................';
const W24 = '........................';

// ── Don Gregorio «Goyo» (1B): 72 años, boina, chaleco de proyeccionista ──

export const GOYO_PAL: Palette = {
  O: '#1e1612',
  B: '#382f2d', // boina
  b: '#241e1c',
  G: '#d8d2ca', // bigote / pelo cano
  S: '#d49b76',
  s: '#aa7250',
  E: '#1a1210',
  C: '#efe8d8', // camisa
  V: '#703828', // chaleco burdeos
  v: '#4f2418',
  P: '#2c2628', // pantalón
  p: '#1b1618', // zapato
  F: '#ffb84d', // carrete dorado
};

export const GOYO_0 = [
  W16,
  W16,
  '....OOOOOOO.....',
  '...OBBBBBBBBO...',
  '..OBBbbbbbbBBO..',
  '...OHGGGGGGHO...'.replace(/H/g, 'G'),
  '...OGSSSSSSGO...',
  '...OSESSSSESO...',
  '...OSSSSSSSSO...',
  '...OOGGGGGGOO...',
  '...OGGGGGGGGO...',
  '....OSSSSSSO....',
  '...OCCOOOOCCO...',
  '..OCVVVVVVVVCO..',
  '..OSVVVFFVVVSO..',
  '..OOVVVVVVVVOO..',
  '...OVVVvvVVVO...',
  '...OPPPPPPPPO...',
  '...OPPO..OPPO...',
  '...OPPO..OPPO...',
  '...OPpO..OpPO...',
  '...OOOO..OOOO...',
  W16,
  W16,
];

export const GOYO_1 = GOYO_0.map((r, i) => (i === 7 ? '...OSSSSSSSSO...' : r));

// ── Renata Morales (2B): 46 años, cinta métrica al cuello, chongo con aguja ──

export const RENATA_PAL: Palette = {
  O: '#241820',
  H: '#3a2220', // pelo oscuro
  h: '#251414',
  S: '#e4b08a',
  s: '#bc8864',
  E: '#201418',
  A: '#d9d2c8', // aguja en el chongo
  Y: '#f2c14e', // cinta métrica
  B: '#446878', // blusa azul pizarra
  b: '#2f4c59',
  D: '#9e3b46', // falda / delantal vino
  d: '#722830',
};

export const RENATA_0 = [
  W16,
  '.....OOOO.......',
  '....OHHHHO.A....',
  '...OHHHHHHHA....',
  '...OHhHHHHHO....',
  '...OHSSSSSHO....',
  '...OHSESSSESO...',
  '...OHSSSSSSSO...',
  '...OhSSssSShO...',
  '....OSSSSSSO....',
  '...OBOYYYYOBO...',
  '..OBBYYYYYYBBO..',
  '..OBBYBBBBYBBO..',
  '..OSBDDDDDDBSO..',
  '..OOBDDDDDDBOO..',
  '...ODDDDDDDDO...',
  '...ODDDddDDDO...',
  '...ODDDDDDDDO...',
  '...ODddddddDO...',
  '....OSO..OSO....',
  '....OSO..OSO....',
  '...OOOO..OOOO...',
  W16,
  W16,
];

export const RENATA_1 = RENATA_0.map((r, i) => (i === 6 ? '...OHSSSSSSSO...' : r));

// ── Paloma Ibarra (4A): 41 años, gafas de soldar en la frente, mandil de piel ──

export const PALOMA_PAL: Palette = {
  O: '#181c2e',
  H: '#5c2a3a', // pelo borgoña
  h: '#3e1a26',
  G: '#4cc9f0', // lente de gafas
  g: '#ffd166', // latón de gafas
  S: '#ebbc98',
  s: '#c48f68',
  E: '#181c2e',
  T: '#e8e4dc', // playera
  M: '#6e4e3a', // mandil de cuero
  m: '#4e3526',
  J: '#35486e', // pantalón
  j: '#23304c', // bota
};

export const PALOMA_0 = [
  W16,
  '....OOOOOO......',
  '...OHHHHHHO.....',
  '..OHgGGGGgHO....',
  '..OHgGGGGgHO....',
  '..OHSSSSSSHO....',
  '..OHSESSSESO....',
  '..OHSSSSSSSO....',
  '...OhSSssShO....',
  '....OSSSSSSO....',
  '...OTTTTTTTTO...',
  '..OTMMMMMMMMTO..',
  '..OSMMMMMMMMTSO.',
  '..OOMMMMMMMMOO..',
  '...OMMMmmMMMO...',
  '...OMMMMMMMMO...',
  '...OJJJJJJJJO...',
  '...OJJO..OJJO...',
  '...OJJO..OJJO...',
  '...OjjO..OjjO...',
  '...OOOO..OOOO...',
  W16,
  W16,
  W16,
];

export const PALOMA_1 = PALOMA_0.map((r, i) => (i === 6 ? '...OHSSSSSSO....' : r));

// ── Mateo Ibáñez (3A): 22 años, sudadera amplia, manchas de tinta en dedos ──

export const MATEO_PAL: Palette = {
  O: '#161824',
  H: '#1e1c26', // pelo revuelto oscuro
  h: '#323040',
  S: '#ecc2a0',
  s: '#c49674',
  E: '#161824',
  C: '#d8d0bc', // sudadera crema
  c: '#b4ab96',
  K: '#1f2336', // tinta negra
  P: '#3b4252', // pantalón
};

export const MATEO_0 = [
  W16,
  W16,
  '....O.OOOO......',
  '...OHHHHHHO.....',
  '..OHHHhHHHHO....',
  '..OHHSSSSSHO....',
  '..OHSESSSESO....',
  '..OHSSSSSSSO....',
  '...OSSSSSSSO....',
  '....OSSSSSO.....',
  '...OCCCCCCCCO...',
  '..OCCCCKKCCCCO..',
  '..OCCCCCCCCCCO..',
  '..OKCCCCCCCCKO..',
  '..OOCCCCCCCCOO..',
  '...OCCCCCCCCO...',
  '...OccccccccO...',
  '...OPPP..PPPO...',
  '...OPPO..OPPO...',
  '...OPPO..OPPO...',
  '...OOOO..OOOO...',
  W16,
  W16,
  W16,
];

export const MATEO_1 = MATEO_0.map((r, i) => (i === 6 ? '..OHSSSSSSSO....' : r));

// ── Octavio Bravo (6A): 62 años, Antagonista — traje gris, lentes y sonómetro ──

export const OCTAVIO_PAL: Palette = {
  O: '#141824',
  G: '#c8cfd8', // canas peinadas
  g: '#8f98a6',
  S: '#dfb496',
  s: '#b6896c',
  E: '#141824',
  W: '#f0f4f8', // camisa blanca
  T: '#4c566a', // traje gris acero
  t: '#353d4d',
  A: '#5eead4', // pantalla del sonómetro
  M: '#222733', // cuerpo sonómetro
};

export const OCTAVIO_0 = [
  W16,
  '....OOOOOO......',
  '...OGGGGGGO.....',
  '..OGGgGGgGGO....',
  '..OGSSSSSSGO....',
  '..OGSESSSESO....',
  '..OgSSSSSSgO....',
  '..OgSSssSSgO....',
  '....OSSSSSO.....',
  '...OTWWWWWTO....',
  '..OTTTWWTTTTO...',
  '..OSTTTTTTTSO...',
  '..OOTTTTTTTTOMM.',
  '...OTTTttTTTOAM.',
  '...OTTTTTTTTOMM.',
  '...OTTTTTTTTO...',
  '...OTTO..OTTO...',
  '...OTTO..OTTO...',
  '...OttO..OttO...',
  '...OOOO..OOOO...',
  W16,
  W16,
  W16,
  W16,
];

export const OCTAVIO_1 = OCTAVIO_0.map((r, i) => (i === 5 ? '..OGSSSSSSGO....' : r));

// ── Retratos 24×24 para DialogueBox ──

export const PORTRAIT_GOYO_PAL: Palette = {
  O: '#1e1612',
  B: '#382f2d',
  b: '#241e1c',
  G: '#d8d2ca',
  g: '#a8a098',
  S: '#d49b76',
  s: '#aa7250',
  E: '#1a1210',
  W: '#fff4e0',
  C: '#efe8d8',
  V: '#703828',
  F: '#ffb84d',
};

export const PORTRAIT_GOYO = [
  W24,
  '......OOOOOOOOOO........',
  '....OOBBBBBBBBBBBO......',
  '...OBBBBBbbbbbbbbBO.....',
  '..OBBBBBBBBBBBBBBBBO....',
  '..OObBBBBBBBBBBBBbOO....',
  '...OOGGGGGGGGGGGGOO.....',
  '...OGSSSSSSSSSSSSGO.....',
  '...OGSSOOSSSSOOSSGO.....',
  '...OGSSEWSSSSEWSSGO.....',
  '...OGSSEESSSSEESSGO.....',
  '...OSSSSSSSSSSSSSSO.....',
  '...OSSGGGGGGGGGGSSO.....',
  '...OOGGGggggggGGGOO.....',
  '....OOSSSSSSSSSSOO......',
  '.....OOSSSSSSSSOO.......',
  '....OCCOSSSSSSOCCO......',
  '...OCVVCOOOOOOCVVCO.....',
  '..OVVVVVVVFFVVVVVVVO....',
  '..OVVVVVVVFFVVVVVVVO....',
  '..OVVVVVVVVVVVVVVVVO....',
  '...OOOOOOOOOOOOOOO......',
  W24,
  W24,
];

export const PORTRAIT_RENATA_PAL: Palette = {
  O: '#241820',
  H: '#3a2220',
  h: '#251414',
  S: '#e4b08a',
  s: '#bc8864',
  E: '#201418',
  W: '#ffffff',
  A: '#d9d2c8',
  Y: '#f2c14e',
  B: '#446878',
  m: '#9e3b46',
};

export const PORTRAIT_RENATA = [
  W24,
  '........OOOOOO..........',
  '.......OHHHHHHO..AA.....',
  '......OHHHhHHHHOAA......',
  '....OOOHHHHHHHHOO.......',
  '...OHHHHHHHHHHHHHO......',
  '..OHHHHSSSSSSSSHHHO.....',
  '..OHHHSSSSSSSSSSHHHO....',
  '..OHHSSOOSSSSOOSSHO.....',
  '..OHHSSEWSSSSEWSSHO.....',
  '..OHHSSEESSSSEESSHO.....',
  '..OHHSSSSSSSSSSSSHO.....',
  '...OhSSSSSssSSSSShO.....',
  '...OhHSSSSmmSSSShO......',
  '....OhOSSSSSSSSOhO......',
  '.....OOYYYYYYYYOO.......',
  '...OBBOYYYYYYYYOBBO.....',
  '..OBBBBOYYYYYYOBBBBO....',
  '..OBBBBBBBBBBBBBBBBO....',
  '..OBBBBBBBBBBBBBBBBO....',
  '..OOOOOOOOOOOOOOOOOO....',
  W24,
  W24,
  W24,
];

export const PORTRAIT_PALOMA_PAL: Palette = {
  O: '#181c2e',
  H: '#5c2a3a',
  h: '#3e1a26',
  G: '#4cc9f0',
  L: '#bdf2ff',
  g: '#ffd166',
  S: '#ebbc98',
  s: '#c48f68',
  E: '#181c2e',
  W: '#ffffff',
  T: '#e8e4dc',
  M: '#6e4e3a',
  m: '#b25a6a',
};

export const PORTRAIT_PALOMA = [
  W24,
  '......OOOOOOOOOO........',
  '....OOHHHHHHHHHHOO......',
  '...OHHHHHHHHHHHHHHO.....',
  '..OHHOgGGGGggGGGGgO.....',
  '..OHHOgGLLGggGLLGgO.....',
  '..OHHOggggggggggggO.....',
  '..OHHHSSSSSSSSSSHHHO....',
  '..OHHSSOOSSSSOOSSHO.....',
  '..OHHSSEWSSSSEWSSHO.....',
  '..OHHSSEESSSSEESSHO.....',
  '..OHHSSSSSSSSSSSSHO.....',
  '...OhSSSSSSmmSSSShO.....',
  '....OhSSSSSSSSSShO......',
  '.....OOSSSSSSSSOO.......',
  '....OTTOOOOOOOOTTO......',
  '...OTTOMMMMMMMMOTTTO....',
  '..OTTTOMMMMMMMMOTTTO....',
  '..OTTTOMMMMMMMMOTTTO....',
  '..OOOOOOOOOOOOOOOOOO....',
  W24,
  W24,
  W24,
  W24,
];

export const PORTRAIT_MATEO_PAL: Palette = {
  O: '#161824',
  H: '#1e1c26',
  h: '#323040',
  S: '#ecc2a0',
  s: '#c49674',
  E: '#161824',
  W: '#ffffff',
  C: '#d8d0bc',
  c: '#b4ab96',
  m: '#a86464',
};

export const PORTRAIT_MATEO = [
  W24,
  '.......O.OOOOOO.........',
  '.....OOHHHHHHHHOO.......',
  '....OHHHhHHHHhHHHO......',
  '...OHHHHHHHHHHHHHHO.....',
  '...OHHHHSHHHHSHHHHO.....',
  '..OHHHHSSSSSSSSSSHHO....',
  '..OHHSSOOSSSSOOSSHO.....',
  '..OHHSSEWSSSSEWSSHO.....',
  '..OHHSSEESSSSEESSHO.....',
  '..OHHSSSSSSSSSSSSHO.....',
  '...OhSSSSSssSSSSShO.....',
  '...OhSSSSSmmSSSSShO.....',
  '....OOSSSSSSSSSSOO......',
  '.....OOCCCCCCCCOO.......',
  '...OCCCCCCCCCCCCCCCO....',
  '..OCCCCCCcCCcCCCCCCCO...',
  '..OCCCCCCcCCcCCCCCCCO...',
  '..OCCCCCCCCCCCCCCCCCO...',
  '..OOOOOOOOOOOOOOOOOOO...',
  W24,
  W24,
  W24,
  W24,
];

export const PORTRAIT_OCTAVIO_PAL: Palette = {
  O: '#141824',
  G: '#c8cfd8',
  g: '#8f98a6',
  S: '#dfb496',
  s: '#b6896c',
  E: '#141824',
  W: '#f0f4f8',
  T: '#4c566a',
  t: '#353d4d',
  A: '#5eead4',
};

export const PORTRAIT_OCTAVIO = [
  W24,
  '......OOOOOOOOOO........',
  '.....OGGGGGGGGGGO.......',
  '....OGGgGGGGGGgGGO......',
  '...OGGGGGGGGGGGGGGO.....',
  '...OGSSSSSSSSSSSSGO.....',
  '...OGSOOOSSSSOOOSGO.....',
  '...OGSEWOSSSSEWOSGO.....',
  '...OGSEEOSSSSEEOSSO.....',
  '...OGSSssssssssSSGO.....',
  '...OgSSSSgggggSSSgO.....',
  '....OgSSSgOOOgSSgO......',
  '.....OOSSSSSSSSOO.......',
  '....OTTTWWWWWWTTTO......',
  '...OTTTTTWWWWTTTTTO.....',
  '..OTTTTTTWWWWTTTTTTO....',
  '..OTTTTTTAtTATTTTTTO....',
  '..OTTTTTTTtTTTTTTTTTO...',
  '..OOOOOOOOOOOOOOOOOO....',
  W24,
  W24,
  W24,
  W24,
  W24,
];

export const PORTRAIT_OCTAVIO_COLD = PORTRAIT_OCTAVIO.map((r, i) => {
  if (i === 6) return '...OGSSOOSSSSOOOSGO.....';
  if (i === 7) return '...OGSSEWSSSSEWOSGO.....';
  return r;
});
