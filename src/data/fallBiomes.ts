import type { DreamFXSettings } from '../gfx/postfx/DreamFXPipeline';

/**
 * Los cielos por los que cae Nadia.
 *
 * Su sueño no es un tubo: es una ruta. Cada puerta flotante que atraviesas
 * cambia el cielo entero — color, estrellas y post-procesado — porque cada vez
 * que uno se muda vuelve a caer por un sitio distinto.
 *
 * Son datos: añadir un cielo nuevo no toca la lógica del nivel.
 */
export interface FallBiome {
  id: string;
  /** Nombre que se muestra al entrar. */
  name: string;
  /** Color del cielo arriba y abajo (degradado). */
  skyTop: number;
  skyBottom: number;
  /** Tinte de las estrellas / motas del fondo. */
  dust: number;
  /** Color de los obstáculos de este cielo. */
  obstacle: number;
  /** Ambiente de post-procesado propio. */
  fx: DreamFXSettings;
}

export const FALL_BIOMES: FallBiome[] = [
  {
    id: 'night',
    name: 'el cielo de siempre',
    skyTop: 0x0d0a2e,
    skyBottom: 0x241a55,
    dust: 0xffffff,
    obstacle: 0x8f7bff,
    fx: { chroma: 1.6, vignette: 0.45, grain: 0.08, contrast: 1.05 },
  },
  {
    id: 'boxes',
    name: 'el cielo de cartón',
    skyTop: 0x3a2a1c,
    skyBottom: 0x8a6a3a,
    dust: 0xffd9a0,
    obstacle: 0xc98d4a,
    // Como una foto vieja de una mudanza
    fx: { grain: 0.28, vignette: 0.55, contrast: 1.15, tint: 0xffb066, tintAmount: 0.14 },
  },
  {
    id: 'sea',
    name: 'el cielo mojado',
    skyTop: 0x04304a,
    skyBottom: 0x0a6a7a,
    dust: 0xa8f0ff,
    obstacle: 0x2fbfd8,
    // Todo ondula: caer bajo el agua
    fx: {
      wave: 0.004,
      waveSpeed: 1.4,
      chroma: 2.2,
      vignette: 0.4,
      tint: 0x2fbfd8,
      tintAmount: 0.12,
    },
  },
  {
    id: 'static',
    name: 'el cielo sin señal',
    skyTop: 0x1a1a1a,
    skyBottom: 0x3a3a3a,
    dust: 0xffffff,
    obstacle: 0xbbbbbb,
    // Una tele mal sintonizada
    fx: { desat: 0.9, grain: 0.5, scanline: 0.5, contrast: 1.3, vignette: 0.5 },
  },
];

/** Devuelve un bioma por id, o el primero si no existe. */
export function biomeById(id: string): FallBiome {
  return FALL_BIOMES.find((b) => b.id === id) ?? FALL_BIOMES[0];
}
