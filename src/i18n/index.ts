import type { DreamId } from '../config';
import type { DreamTexts } from './types';
import { core } from './es/core';
import { reme } from './es/reme';
import { samu } from './es/samu';
import { marisol } from './es/marisol';
import { jairo } from './es/jairo';
import { chepe } from './es/chepe';
import { efrain } from './es/efrain';
import { abel } from './es/abel';
import { celeste } from './es/celeste';

/**
 * Textos del juego. Un solo idioma por ahora; otro idioma = otra carpeta con
 * la misma forma (los tipos lo exigen) y un selector aquí.
 */
export const T = {
  ...core,
  dreams: { reme, samu, marisol, jairo, chepe, efrain, abel, celeste },
};

export function dreamText(id: DreamId): DreamTexts {
  return T.dreams[id];
}

export { fmt } from './types';
export type { Line, DreamTexts, OldTicket } from './types';
