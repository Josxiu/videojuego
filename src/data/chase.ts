import type { HideKind } from '../scenes/chase/art';

/**
 * La casa de Tomás como datos. Cada intento, Tomás «redibuja» la casa: los
 * escondites y las lamparitas se reparten entre estos lugares posibles.
 */
export const HIDE_SLOTS: { kind: HideKind; xs: number[] }[] = [
  { kind: 'toybox', xs: [250, 780] },
  { kind: 'armario', xs: [1080, 1500] },
  { kind: 'canasta', xs: [1290, 1700] },
  { kind: 'sofa', xs: [2060, 2400] },
  { kind: 'cortina', xs: [1950, 2610] },
  { kind: 'mesa', xs: [3000, 3250] },
];

/** Posibles lamparitas; en cada intento se encienden algunas. */
export const LIGHT_SLOTS = [520, 960, 1380, 1780, 2230, 2560, 2900, 3180];

/** Las seis crayolas (luciérnagas de esta pesadilla): no cambian de lugar. */
export const CRAYON_SPOTS = [380, 1230, 1640, 2320, 2800, 3120];

export const CHASE_START = 140;
export const DOOR_X = 3490;
