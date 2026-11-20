import { core } from './es/core';
import { dreamsA } from './es/dreamsA';
import { dreamsB } from './es/dreamsB';

// Todos los textos del juego en español, divididos por área para facilitar
// la traducción y revisión manteniendo un único diccionario tipado `es`.
export const es = {
  ...core,
  ...dreamsA,
  ...dreamsB,
} as const;

export type TextKey = keyof typeof es;
