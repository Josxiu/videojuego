/**
 * Paletas centralizadas. Cada mundo del juego tiene su identidad cromática aquí
 * y en ningún otro sitio: las escenas piden colores por nombre, nunca por hex suelto.
 */

export type WorldId = 'menu' | 'hub' | 'exam' | 'fall' | 'forest' | 'chase' | 'ending';

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
  // Sueño de Don Élmer: tiza, madera vieja y sol de mediodía
  exam: {
    sky: 0xffe9b3,
    mid: 0xffd98a,
    ground: 0xc98d4a,
    accent: 0xff8c42,
    accent2: 0x2e6f6b,
    ink: 0x5a3418,
    paper: 0xfff3d0,
  },
  // Sueño de Nadia: cielo nocturno de mudanza
  fall: {
    sky: 0x0d0a2e,
    mid: 0x241a55,
    ground: 0x1a1450,
    accent: 0x8f7bff,
    accent2: 0x86f7ff,
    ink: 0xefe9ff,
    paper: 0x191138,
  },
  // Sueño de la señora del 4B: patio recordado, verde y oro
  forest: {
    sky: 0x0f1a22,
    mid: 0x16242e,
    ground: 0x101d26,
    accent: 0xffd166,
    accent2: 0x6fcf97,
    ink: 0xf2ecd9,
    paper: 0x0f1a22,
  },
  // Pesadilla de Tomás: sin color, solo contraste
  chase: {
    sky: 0xb8b8c8,
    mid: 0x6e6e84,
    ground: 0x0a0a12,
    accent: 0xb33939,
    accent2: 0xe8e8f0,
    ink: 0xe8e8f0,
    paper: 0x0a0a12,
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
