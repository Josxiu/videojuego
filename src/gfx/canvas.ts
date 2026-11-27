/** Utilidades de dibujo en lienzos fuera de pantalla. */

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d', { willReadFrequently: false })!;
  return [c, ctx];
}

/** Registra (o reemplaza) un lienzo como textura de Phaser. */
export function addTexture(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): string {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
  return key;
}

/** Generador pseudoaleatorio con semilla (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruido de valor 2D suave, con semilla. Devuelve 0..1. */
export function noise2D(seed: number): (x: number, y: number) => number {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    perm[i] = i;
    vals[i] = r();
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const v = (x: number, y: number) => vals[perm[(perm[x & 255] + y) & 255]];
  const s = (t: number) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = s(x - xi);
    const yf = s(y - yi);
    const a = v(xi, yi) + (v(xi + 1, yi) - v(xi, yi)) * xf;
    const b = v(xi, yi + 1) + (v(xi + 1, yi + 1) - v(xi, yi + 1)) * xf;
    return a + (b - a) * yf;
  };
}

/** Ruido fractal (varias octavas). */
export function fbm(n: (x: number, y: number) => number, x: number, y: number, oct = 4): number {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += n(x * f, y * f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

export function hexToRgb(hex: number): [number, number, number] {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

export function css(hex: number, alpha = 1): string {
  const [r, g, b] = hexToRgb(hex);
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

/** Mezcla dos colores (t=0 → a, t=1 → b). */
export function mix(a: number, b: number, t: number): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | bl;
}

/** Varía un color al azar (para pinceladas y puntos). */
export function jitter(hex: number, amount: number, r: () => number): number {
  const [cr, cg, cb] = hexToRgb(hex);
  const d = () => (r() - 0.5) * 2 * amount;
  const k = d();
  const cl = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (cl(cr + k + d() * 0.4) << 16) | (cl(cg + k + d() * 0.4) << 8) | cl(cb + k + d() * 0.4);
}
