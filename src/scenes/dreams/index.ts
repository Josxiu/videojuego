import { DreamPlaceholder } from './Placeholder';
import { DreamReme } from './reme/DreamReme';
import { DreamSamu } from './samu/DreamSamu';

/**
 * Registro de las escenas de sueño. Cada sueño se agrega aquí cuando está terminado;
 * mientras tanto, un marcador de posición permite recorrer el tren completo.
 */
export const DREAM_SCENES: (typeof Phaser.Scene)[] = [
  DreamReme,
  DreamSamu,
  DreamPlaceholder.for('marisol'),
  DreamPlaceholder.for('jairo'),
  DreamPlaceholder.for('chepe'),
  DreamPlaceholder.for('efrain'),
  DreamPlaceholder.for('abel'),
  DreamPlaceholder.for('celeste'),
];
