import Phaser from 'phaser';
import { PIXEL_SCALE } from '../config';
import {
  hash2,
  vnoise,
  mixRgb,
  luminance,
  saturate,
  scaleRgb,
  hashString,
  type RGB,
} from './noise';

/**
 * «Transferencia de estilo» en runtime.
 *
 * Los personajes se dibujan una sola vez como pixel art (ver sprites.ts) y cada
 * sueño los re-interpreta con su propia técnica: gis sobre pizarrón, papel
 * recortado, acuarela o crayola. Es la misma Iris, pero en la mente de otra
 * persona: por eso se ve distinta en cada sueño.
 *
 * Cada textura estilizada se genera a mayor resolución (`STYLE_RES` píxeles por
 * píxel original) con filtrado lineal, así se ve suave y no pixelada.
 */
export type ArtStyle = 'chalk' | 'paper' | 'watercolor' | 'crayon';

/** Píxeles de la textura estilizada por cada píxel del sprite original. */
export const STYLE_RES = 4;
/** Margen alrededor de cada cuadro, para bordes de papel, sombras y polvo. */
export const STYLE_PAD = 8;
/** Escala a la que se muestra un sprite estilizado para medir lo mismo que el original. */
export const STYLE_DISPLAY = PIXEL_SCALE / STYLE_RES;

export const styledKey = (base: string, style: ArtStyle): string => `${base}@${style}`;

/** Parámetros de cada técnica. */
interface StyleSpec {
  /** Aspereza del borde (0 = corte limpio). */
  rough: number;
  /** Escala del ruido del borde: grande = ondulado, pequeño = áspero. */
  roughScale: number;
}

const SPECS: Record<ArtStyle, StyleSpec> = {
  chalk: { rough: 0.35, roughScale: 1.6 },
  paper: { rough: 0.14, roughScale: 6 },
  watercolor: { rough: 0.45, roughScale: 5 },
  crayon: { rough: 0.5, roughScale: 2.2 },
};

const CHALK_WHITE: RGB = [242, 239, 230];
const PAPER_WHITE: RGB = [251, 246, 234];
const PAPER_CREAM: RGB = [250, 243, 226];
const GRAPHITE: RGB = [70, 62, 60];
const CRAYON_DARK: RGB = [43, 35, 64];

/** Datos del cuadro original ya clasificados. */
interface Source {
  w: number;
  h: number;
  opaque: Uint8Array;
  dark: Uint8Array;
  /** Oscuro y tocando el exterior: contorno de silueta (no detalle interior). */
  rim: Uint8Array;
  color: RGB[];
  /** Color de relleno más cercano (para pintar encima de los contornos). */
  fill: RGB[];
}

function readSource(img: ImageData): Source {
  const { width: w, height: h, data } = img;
  const n = w * h;
  const opaque = new Uint8Array(n);
  const dark = new Uint8Array(n);
  const rim = new Uint8Array(n);
  const color: RGB[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3];
    const c: RGB = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
    color[i] = c;
    if (a > 16) {
      opaque[i] = 1;
      if (luminance(c) < 0.22) dark[i] = 1;
    }
  }
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : opaque[y * w + x]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!dark[i]) continue;
      if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)) rim[i] = 1;
    }
  }
  // Relleno: el color claro más cercano (radio 3), para que el contorno no ensucie
  const fill: RGB[] = new Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (opaque[i] && !dark[i]) {
        fill[i] = color[i];
        continue;
      }
      let best: RGB | undefined;
      let bestD = 99;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (!opaque[j] || dark[j]) continue;
          const d = Math.abs(dx) + Math.abs(dy);
          if (d < bestD) {
            bestD = d;
            best = color[j];
          }
        }
      }
      fill[i] = best ?? color[i];
    }
  }
  return { w, h, opaque, dark, rim, color, fill };
}

/** Alfa bilineal del original en coordenadas continuas (fuera = 0). */
function smoothAlpha(src: Source, sx: number, sy: number): number {
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const fx = sx - x0;
  const fy = sy - y0;
  const a = (x: number, y: number) =>
    x < 0 || y < 0 || x >= src.w || y >= src.h ? 0 : src.opaque[y * src.w + x];
  const top = a(x0, y0) * (1 - fx) + a(x0 + 1, y0) * fx;
  const bot = a(x0, y0 + 1) * (1 - fx) + a(x0 + 1, y0 + 1) * fx;
  return top * (1 - fy) + bot * fy;
}

/**
 * Distancia de tablero de ajedrez hasta el píxel más cercano que NO vale `value`
 * (transformada de dos pasadas, lineal). Los píxeles que no valen `value` quedan en 0.
 */
function chessDistance(mask: Uint8Array, w: number, h: number, value: number, cap: number) {
  const d = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = mask[i] === value ? cap : 0;
  const get = (x: number, y: number) =>
    x < 0 || y < 0 || x >= w || y >= h ? (value === 1 ? 0 : cap) : d[y * w + x];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!d[i]) continue;
      d[i] = Math.min(
        d[i],
        get(x - 1, y) + 1,
        get(x, y - 1) + 1,
        get(x - 1, y - 1) + 1,
        get(x + 1, y - 1) + 1,
      );
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (!d[i]) continue;
      d[i] = Math.min(
        d[i],
        get(x + 1, y) + 1,
        get(x, y + 1) + 1,
        get(x + 1, y + 1) + 1,
        get(x - 1, y + 1) + 1,
      );
    }
  }
  return d;
}

/** Distancia (acotada) de cada píxel interior al exterior y de cada exterior al interior. */
function distanceMaps(mask: Uint8Array, w: number, h: number, maxD: number) {
  return {
    toOut: chessDistance(mask, w, h, 1, maxD),
    toIn: chessDistance(mask, w, h, 0, maxD),
  };
}

/** Estiliza un cuadro. Devuelve un ImageData de (w·RES + 2·PAD) × (h·RES + 2·PAD). */
export function stylizeFrame(img: ImageData, style: ArtStyle, seed: number): ImageData {
  const src = readSource(img);
  const R = STYLE_RES;
  const P = STYLE_PAD;
  const W = src.w * R + P * 2;
  const H = src.h * R + P * 2;
  const spec = SPECS[style];
  const out = new ImageData(W, H);
  const px = out.data;

  // 1. Máscara suave con borde irregular según la técnica
  const mask = new Uint8Array(W * H);
  const nearest = new Int32Array(W * H).fill(-1);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = (x - P + 0.5) / R - 0.5;
      const sy = (y - P + 0.5) / R - 0.5;
      const a = smoothAlpha(src, sx, sy);
      const n = vnoise(x / spec.roughScale, y / spec.roughScale, seed) - 0.5;
      const i = y * W + x;
      if (a > 0.5 + n * spec.rough) mask[i] = 1;
      const ix = Math.floor((x - P) / R);
      const iy = Math.floor((y - P) / R);
      if (ix >= 0 && iy >= 0 && ix < src.w && iy < src.h) nearest[i] = iy * src.w + ix;
    }
  }
  // Un píxel de la máscara sin píxel original debajo toma el vecino opaco más cercano
  const srcIndexAt = (i: number): number => {
    const j = nearest[i];
    if (j >= 0 && src.opaque[j]) return j;
    const x = i % W;
    const y = (i / W) | 0;
    for (let r = 1; r <= R; r++) {
      for (const [dx, dy] of [
        [r, 0],
        [-r, 0],
        [0, r],
        [0, -r],
        [r, r],
        [-r, -r],
        [r, -r],
        [-r, r],
      ]) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const k = nearest[yy * W + xx];
        if (k >= 0 && src.opaque[k]) return k;
      }
    }
    return -1;
  };

  const put = (i: number, c: RGB, a: number) => {
    // Composición "sobre" lo ya pintado (para sombra, borde y figura en capas)
    const o = i * 4;
    const da = px[o + 3] / 255;
    const oa = a + da * (1 - a);
    if (oa <= 0) return;
    for (let k = 0; k < 3; k++) {
      px[o + k] = (c[k] * a + px[o + k] * da * (1 - a)) / oa;
    }
    px[o + 3] = Math.min(255, oa * 255);
  };

  const maxD = style === 'paper' ? 7 : 3;
  const { toOut, toIn } = distanceMaps(mask, W, H, maxD);

  switch (style) {
    case 'chalk': {
      // El gis es claro por naturaleza: todo color sube a pastel luminoso
      const chalkOf = (c: RGB): RGB => {
        let p = mixRgb(saturate(c, 1.3), CHALK_WHITE, 0.4);
        const l = luminance(p);
        if (l < 0.68) p = mixRgb(p, CHALK_WHITE, (0.68 - l) / 0.32);
        return p;
      };
      for (let i = 0; i < W * H; i++) {
        const x = i % W;
        const y = (i / W) | 0;
        const grain = 0.6 + 0.4 * hash2(x, y, seed);
        if (!mask[i]) {
          // Polvo de gis que se sale del trazo
          if (toIn[i] <= 2 && hash2(x, y, seed + 9) < 0.1) put(i, CHALK_WHITE, 0.35 * grain);
          continue;
        }
        const j = srcIndexAt(i);
        if (j < 0) continue;
        if (src.dark[j]) {
          if (hash2(x, y, seed + 3) < 0.08) continue;
          put(i, CHALK_WHITE, grain);
        } else if (toOut[i] <= 1) {
          put(i, mixRgb(chalkOf(src.fill[j]), CHALK_WHITE, 0.5), 0.95 * grain);
        } else {
          const stripe = (x + y) % 4 < 2 ? 1 : 0.75;
          const patch = 0.88 + 0.12 * vnoise(x / 5, y / 5, seed + 1);
          put(i, chalkOf(src.fill[j]), Math.min(1, stripe * patch * (grain + 0.15)));
        }
      }
      break;
    }
    case 'paper': {
      // Sombra proyectada (desplazada), luego el borde blanco del recorte, luego la figura
      const SX = 3;
      const SY = 4;
      for (let i = 0; i < W * H; i++) {
        const x = i % W;
        const y = (i / W) | 0;
        const xs = x - SX;
        const ys = y - SY;
        if (xs >= 0 && ys >= 0) {
          const k = ys * W + xs;
          const cut = mask[k] || toIn[k] <= 3;
          if (cut) put(i, [30, 16, 6], 0.26);
        }
      }
      for (let i = 0; i < W * H; i++) {
        if (mask[i] || toIn[i] > 3) continue;
        const x = i % W;
        const y = (i / W) | 0;
        put(i, scaleRgb(PAPER_WHITE, 0.97 + 0.03 * hash2(x, y, seed)), 1);
      }
      for (let i = 0; i < W * H; i++) {
        if (!mask[i]) continue;
        const j = srcIndexAt(i);
        if (j < 0) continue;
        const x = i % W;
        const y = (i / W) | 0;
        let c = src.rim[j] ? scaleRgb(src.fill[j], 0.82) : src.color[j];
        if (src.dark[j] && !src.rim[j]) c = mixRgb(c, src.fill[j], 0.15);
        const fiber = 0.95 + 0.05 * vnoise(x / 2, y / 9, seed + 4);
        put(i, scaleRgb(c, fiber), 1);
      }
      break;
    }
    case 'watercolor': {
      // Capa de color con sangrado (desenfoque de caja entre regiones vecinas)
      const layer: (RGB | undefined)[] = new Array(W * H);
      for (let i = 0; i < W * H; i++) {
        if (!mask[i]) continue;
        const j = srcIndexAt(i);
        if (j < 0) continue;
        const base =
          src.dark[j] && !src.rim[j] ? mixRgb(src.color[j], src.fill[j], 0.25) : src.fill[j];
        layer[i] = mixRgb(base, PAPER_CREAM, 0.16);
      }
      for (let i = 0; i < W * H; i++) {
        const c0 = layer[i];
        if (!c0) continue;
        const x = i % W;
        const y = (i / W) | 0;
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
            const c = layer[yy * W + xx];
            if (!c) continue;
            r += c[0];
            g += c[1];
            b += c[2];
            n++;
          }
        }
        let c: RGB = [r / n, g / n, b / n];
        const blotch = 0.86 + 0.2 * vnoise(x / 7, y / 7, seed + 2);
        const gran = 0.93 + 0.07 * hash2(x, y, seed + 5);
        let a = 0.72;
        if (toOut[i] <= 1) {
          // El pigmento se acumula en el borde de la mancha
          c = scaleRgb(c, 0.74);
          a = 0.95;
        } else if (toOut[i] === 2) {
          c = scaleRgb(c, 0.88);
          a = 0.85;
        }
        put(i, scaleRgb(c, blotch * gran), a);
      }
      // Trazo de lápiz por fuera, con huecos
      for (let i = 0; i < W * H; i++) {
        if (mask[i] || toIn[i] !== 1) continue;
        const x = i % W;
        const y = (i / W) | 0;
        if (vnoise(x / 3, y / 3, seed + 7) < 0.25) continue;
        put(i, GRAPHITE, 0.7);
      }
      break;
    }
    case 'crayon': {
      for (let i = 0; i < W * H; i++) {
        if (!mask[i]) continue;
        const j = srcIndexAt(i);
        if (j < 0) continue;
        const x = i % W;
        const y = (i / W) | 0;
        const bright = saturate(scaleRgb(src.fill[j], 1.06), 1.3);
        const dark = mixRgb(scaleRgb(src.fill[j], 0.4), CRAYON_DARK, 0.55);
        if (toOut[i] <= 2 || (src.dark[j] && !src.rim[j])) {
          if (vnoise(x / 2, y / 2, seed + 8) < 0.22) continue;
          put(i, src.dark[j] && !src.rim[j] ? CRAYON_DARK : dark, 0.92);
          continue;
        }
        // Veta de cera: rayas diagonales con el diente del papel asomando
        const tt = (x * 0.8 + y * 0.35) / 2.6 + vnoise(x / 6, y / 6, seed) * 1.2;
        const streak = tt - Math.floor(tt) < 0.7 ? 0.95 : 0.4;
        const tooth = hash2(x, y, seed + 6) < 0.13 ? 0.35 : 1;
        put(i, bright, streak * tooth);
      }
      break;
    }
  }
  return out;
}

/**
 * Crea (una sola vez) la versión estilizada de una textura, con los mismos
 * nombres de cuadro que la original. Devuelve la clave nueva.
 */
export function stylizeTexture(scene: Phaser.Scene, baseKey: string, style: ArtStyle): string {
  const key = styledKey(baseKey, style);
  const tm = scene.textures;
  if (tm.exists(key)) return key;
  const base = tm.get(baseKey);
  const img = base.getSourceImage() as HTMLCanvasElement | HTMLImageElement;

  const names = base.getFrameNames().filter((n) => n !== '__BASE');
  const frames = names.length ? names.map((n) => base.get(n)) : [base.get('__BASE')];

  // Lectura de píxeles del original
  const probe = document.createElement('canvas');
  probe.width = img.width;
  probe.height = img.height;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  if (!pctx) throw new Error('[stylize] sin contexto 2D');
  pctx.drawImage(img, 0, 0);

  const outs = frames.map((f, idx) =>
    stylizeFrame(
      pctx.getImageData(f.cutX, f.cutY, f.cutWidth, f.cutHeight),
      style,
      hashString(`${baseKey}:${style}:${idx % 2}`),
    ),
  );
  const fw = outs[0].width;
  const fh = outs[0].height;
  const tex = tm.createCanvas(key, fw * outs.length, fh);
  if (!tex) throw new Error(`[stylize] no se pudo crear "${key}"`);
  const ctx = tex.getContext();
  outs.forEach((o, i) => {
    const w = o.width;
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = o.height;
    tmp.getContext('2d')?.putImageData(o, 0, 0);
    ctx.drawImage(tmp, i * fw, 0);
  });
  tex.refresh();
  if (names.length) names.forEach((n, i) => tex.add(n, 0, i * fw, 0, fw, fh));
  tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return key;
}

/** Duplica una animación apuntando a las texturas estilizadas. */
export function stylizeAnim(scene: Phaser.Scene, animKey: string, style: ArtStyle): string {
  const key = styledKey(animKey, style);
  if (scene.anims.exists(key)) return key;
  const anim = scene.anims.get(animKey);
  if (!anim) throw new Error(`[stylize] no existe la animación "${animKey}"`);
  const frames = anim.frames.map((f) => ({
    key: stylizeTexture(scene, f.textureKey, style),
    frame: f.textureFrame,
    duration: f.duration || undefined,
  }));
  scene.anims.create({
    key,
    frames,
    frameRate: anim.frameRate,
    repeat: anim.repeat,
    yoyo: anim.yoyo,
  });
  return key;
}

/** Prepara de una vez texturas y animaciones de un sueño. */
export function ensureStyle(
  scene: Phaser.Scene,
  style: ArtStyle,
  textures: string[],
  anims: string[] = [],
): void {
  textures.forEach((t) => stylizeTexture(scene, t, style));
  anims.forEach((a) => stylizeAnim(scene, a, style));
}

/** Origen vertical que deja los pies de un sprite estilizado sobre el suelo. */
export function footOriginY(frameHeightBase: number): number {
  const inner = frameHeightBase * STYLE_RES;
  return (STYLE_PAD + inner) / (inner + STYLE_PAD * 2);
}

/**
 * Crea un sprite estilizado a la misma escala visual que el pixel art original.
 * `feet` deja el origen en la base del dibujo (como setOrigin(0.5, 1)).
 */
export function addStyled(
  scene: Phaser.Scene,
  x: number,
  y: number,
  baseKey: string,
  style: ArtStyle,
  opts: { frame?: string; feet?: boolean; scale?: number } = {},
): Phaser.GameObjects.Sprite {
  const key = stylizeTexture(scene, baseKey, style);
  const s = scene.add.sprite(x, y, key, opts.frame);
  s.setScale(STYLE_DISPLAY * (opts.scale ?? 1));
  if (opts.feet) {
    const baseH = (s.frame.height - STYLE_PAD * 2) / STYLE_RES;
    s.setOrigin(0.5, footOriginY(baseH));
  }
  return s;
}
