/**
 * Aleatoriedad reproducible para el arte procedural.
 *
 * Todo lo que se dibuja en runtime usa semillas: así un pizarrón, una hoja de
 * papel o una acuarela salen idénticos en cada partida y en cada dispositivo,
 * como si fueran imágenes guardadas.
 */

/** Generador mulberry32: rápido, 32 bits, suficiente para arte. */
export class Rng {
  private s: number;

  constructor(seed: number | string) {
    this.s = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
  }

  /** Real en [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Real en [a, b). */
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }

  /** Entero en [a, b]. */
  int(a: number, b: number): number {
    return Math.floor(this.range(a, b + 1));
  }

  /** Verdadero con probabilidad p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Elemento al azar de una lista. */
  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)];
  }
}

/** Hash de texto a entero de 32 bits (FNV-1a). */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Hash de coordenadas enteras a [0, 1). Determinista y sin estado. */
export function hash2(x: number, y: number, seed = 0): number {
  let h =
    Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Ruido de valor 2D suave en [0, 1). */
export function vnoise(x: number, y: number, seed = 0): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** Ruido fractal (varias octavas) en [0, 1). */
export function fbm(x: number, y: number, seed = 0, octaves = 3): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += vnoise(x * f, y * f, seed + i * 17) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

// ── Color ──

export type RGB = [number, number, number];

/** '#rrggbb' o número 0xrrggbb a tripleta. */
export function toRgb(c: string | number): RGB {
  const n = typeof c === 'number' ? c : parseInt(c.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export function rgbCss([r, g, b]: RGB, a = 1): string {
  return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
}

export function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function luminance([r, g, b]: RGB): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Sube o baja la saturación (1 = igual). */
export function saturate([r, g, b]: RGB, amount: number): RGB {
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  const f = (v: number) => Math.max(0, Math.min(255, l + (v - l) * amount));
  return [f(r), f(g), f(b)];
}

export function scaleRgb([r, g, b]: RGB, k: number): RGB {
  const f = (v: number) => Math.max(0, Math.min(255, v * k));
  return [f(r), f(g), f(b)];
}
