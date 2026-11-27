import { DreamPlaceholder } from './Placeholder';
import { DreamReme } from './reme/DreamReme';
import { DreamSamu } from './samu/DreamSamu';
import { DreamMarisol } from './marisol/DreamMarisol';
import { DreamJairo } from './jairo/DreamJairo';
import { DreamChepe } from './chepe/DreamChepe';
import { DreamEfrain } from './efrain/DreamEfrain';

/**
 * Registro de las escenas de sueño. Cada sueño se agrega aquí cuando está terminado;
 * mientras tanto, un marcador de posición permite recorrer el tren completo.
 */
export const DREAM_SCENES: (typeof Phaser.Scene)[] = [
  DreamReme,
  DreamSamu,
  DreamMarisol,
  DreamJairo,
  DreamChepe,
  DreamEfrain,
  DreamPlaceholder.for('abel'),
  DreamPlaceholder.for('celeste'),
];
