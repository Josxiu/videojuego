/**
 * Paletas centralizadas. Cada mundo del juego tiene su identidad cromática aquí
 * y en ningún otro sitio: las escenas piden colores por nombre, nunca por hex suelto.
 */

export type WorldId = 'menu' | 'hub' | 'exam' | 'fall' | 'forest' | 'chase' | 'song' | 'ending';

/** Colores de un mundo. `ink`/`paper` son el par de contraste para texto y cajas. */
export interface WorldPalette {
  /** Fondo más lejano. */
  sky: number;
  /** Fondo intermedio (parallax medio). */
  mid: number;
  /** Suelo / primer plano. */
  ground: number;
  /** Color de acento: UI, luces, elementos interactivos. */
  accent: number;
  /** Acento secundario, para contrastes y peligro. */
  accent2: number;
  /** Color de texto principal. */
  ink: number;
  /** Fondo de cajas de texto. */
  paper: number;
}

export const PALETTES: Record<WorldId, WorldPalette> = {
  menu: {
    sky: 0x0d0a1e,
    mid: 0x171232,
    ground: 0x0d0a1e,
    accent: 0xcfc4ff,
    accent2: 0x9d7bff,
    ink: 0xefe9ff,
    paper: 0x0d0a1e,
  },
  hub: {
    sky: 0x141026,
    mid: 0x1e1838,
    ground: 0x1e1838,
    accent: 0x9d7bff,
    accent2: 0x86f7ff,
    ink: 0xefe9ff,
    paper: 0x0d0a1e,
  },
  // Sueño de Don Élmer: gis sobre pizarrón verde
  exam: {
    sky: 0x23392f,
    mid: 0x2c463a,
    ground: 0x6b4424,
    accent: 0xffe08a,
    accent2: 0xffc2d4,
    ink: 0xf2efe6,
    paper: 0x23392f,
  },
  // Sueño de Nadia: papel recortado y cartón de mudanza
  fall: {
    sky: 0x1d2a5a,
    mid: 0x2c3d73,
    ground: 0xc98d4a,
    accent: 0xffd166,
    accent2: 0xe8b33c,
    ink: 0x2a2a44,
    paper: 0xfbf5e4,
  },
  // Sueño de Doña Chuy: acuarela sobre papel crema
  forest: {
    sky: 0xf4ecd8,
    mid: 0xe8dcc0,
    ground: 0xd8c8a4,
    accent: 0x4aa8c8,
    accent2: 0xe86a8a,
    ink: 0x4a3a2a,
    paper: 0xf6efdc,
  },
  // Pesadilla de Tomás: crayola sobre papel de noche
  chase: {
    sky: 0x1b1f4a,
    mid: 0x2a2f6a,
    ground: 0x141020,
    accent: 0xffd23a,
    accent2: 0xd8453a,
    ink: 0x2b2340,
    paper: 0xfffdf6,
  },
  // El sueño de Iris: el edificio al amanecer
  song: {
    sky: 0x1a1640,
    mid: 0x3a2a6a,
    ground: 0x2a2048,
    accent: 0xffd166,
    accent2: 0xff9a6a,
    ink: 0xfff3e0,
    paper: 0x1a1640,
  },
  ending: {
    sky: 0xffe9d0,
    mid: 0xffd7b0,
    ground: 0xe8c49a,
    accent: 0xffd166,
    accent2: 0x9d7bff,
    ink: 0x7a4a2a,
    paper: 0xfff6e8,
  },
};

/** Devuelve la paleta de un mundo. */
export function palette(world: WorldId): WorldPalette {
  return PALETTES[world];
}

/** Convierte un color numérico a la cadena `#rrggbb` que espera la API de texto. */
export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Mezcla dos colores (t entre 0 y 1). Útil para degradados y transiciones. */
export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
