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
 * Los personajes se dibujan una sola vez como pixel art (ver sprites/) y cada
 * sueño los re-interpreta con su propia técnica: gis, papel recortado, acuarela,
 * crayola, teatro de sombras, bordado en cruz, vitral emplomado o xilografía.
 */
export type ArtStyle =
  | 'chalk'
  | 'paper'
  | 'watercolor'
  | 'crayon'
  | 'shadow'
  | 'embroidery'
  | 'stainedglass'
  | 'woodcut';

/** Píxeles de la textura estilizada por cada píxel del sprite original. */
export const STYLE_RES = 4;
/** Margen alrededor de cada cuadro, para bordes de papel, sombras y polvo. */
export const STYLE_PAD = 8;
/** Escala a la que se muestra un sprite estilizado para medir lo mismo que el original. */
export const STYLE_DISPLAY = PIXEL_SCALE / STYLE_RES;

export const styledKey = (base: string, style: ArtStyle): string => `${base}@${style}`;

interface StyleSpec {
  rough: number;
  roughScale: number;
}

const SPECS: Record<ArtStyle, StyleSpec> = {
  chalk: { rough: 0.35, roughScale: 1.6 },
  paper: { rough: 0.14, roughScale: 6 },
  watercolor: { rough: 0.45, roughScale: 5 },
  crayon: { rough: 0.5, roughScale: 2.2 },
  shadow: { rough: 0.08, roughScale: 7 },
  embroidery: { rough: 0.1, roughScale: 2 },
  stainedglass: { rough: 0.05, roughScale: 8 },
  woodcut: { rough: 0.25, roughScale: 3 },
};

const CHALK_WHITE: RGB = [242, 239, 230];
const PAPER_WHITE: RGB = [251, 246, 234];
const PAPER_CREAM: RGB = [250, 243, 226];
const GRAPHITE: RGB = [70, 62, 60];
const CRAYON_DARK: RGB = [43, 35, 64];
const SHADOW_CORE: RGB = [18, 10, 6];
const SHADOW_AMBER: RGB = [255, 190, 85];
const LEAD_DARK: RGB = [16, 18, 30];
const WOOD_INK: RGB = [24, 25, 36];
const WOOD_PAPER: RGB = [242, 234, 215];

interface Source {
  w: number;
  h: number;
  opaque: Uint8Array;
  dark: Uint8Array;
  rim: Uint8Array;
  color: RGB[];
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
          c = scaleRgb(c, 0.74);
          a = 0.95;
        } else if (toOut[i] === 2) {
          c = scaleRgb(c, 0.88);
          a = 0.85;
        }
        put(i, scaleRgb(c, blotch * gran), a);
      }
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
        const tt = (x * 0.8 + y * 0.35) / 2.6 + vnoise(x / 6, y / 6, seed) * 1.2;
        const streak = tt - Math.floor(tt) < 0.7 ? 0.95 : 0.4;
        const tooth = hash2(x, y, seed + 6) < 0.13 ? 0.35 : 1;
        put(i, bright, streak * tooth);
      }
      break;
    }
    case 'shadow': {
      // Títere de sombra chinesca: núcleo carbón + halo cálido de acetato en el borde
      for (let i = 0; i < W * H; i++) {
        if (!mask[i] && toIn[i] <= 2) {
          put(i, SHADOW_AMBER, toIn[i] === 1 ? 0.48 : 0.2);
          continue;
        }
        if (!mask[i]) continue;
        const j = srcIndexAt(i);
        if (j < 0) continue;
        if (toOut[i] <= 1) {
          put(i, mixRgb(SHADOW_AMBER, src.fill[j], 0.4), 0.95);
        } else if (src.dark[j] && !src.rim[j]) {
          // Ojos y detalles interiores brillan como corte en el acetato
          put(i, SHADOW_AMBER, 0.88);
        } else {
          // Ligero tinte translúcido del color original sobre carbón
          put(i, mixRgb(SHADOW_CORE, src.fill[j], 0.22), 0.96);
        }
      }
      break;
    }
    case 'embroidery': {
      // Punto de cruz 4×4 por cada píxel del sprite original
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          if (!mask[i]) continue;
          const j = srcIndexAt(i);
          if (j < 0) continue;
          const cx = (x - P) % R;
          const cy = (y - P) % R;
          const onDiag = cx === cy || cx + cy === R - 1;
          const nearDiag = Math.abs(cx - cy) <= 1 || Math.abs(cx + cy - (R - 1)) <= 1;
          if (!nearDiag) {
            // Fondo sutil de lino bajo la costura
            put(i, mixRgb(src.color[j], PAPER_CREAM, 0.65), 0.35);
            continue;
          }
          const c = src.dark[j] && !src.rim[j] ? [52, 34, 24] : saturate(src.color[j], 1.15);
          const shade = onDiag ? 1.08 : 0.8;
          put(i, scaleRgb(c as RGB, shade), onDiag ? 0.98 : 0.72);
        }
      }
      break;
    }
    case 'stainedglass': {
      // Vitral emplomado: teselas internas saturadas + plomo oscuro grueso
      for (let i = 0; i < W * H; i++) {
        if (!mask[i]) continue;
        const j = srcIndexAt(i);
        if (j < 0) continue;
        const x = i % W;
        const y = (i / W) | 0;
        const cellA = Math.floor((x + y * 0.6) / 7);
        const cellB = Math.floor((x * 0.5 - y) / 7);
        const edgeX = (x + y * 0.6) % 7 < 1.1 || (x * 0.5 - y + 700) % 7 < 1.1;
        if (toOut[i] <= 2 || edgeX || (src.dark[j] && !src.rim[j])) {
          put(i, LEAD_DARK, 0.98);
        } else {
          const facet = 0.85 + 0.3 * hash2(cellA, cellB, seed);
          const jewel = saturate(scaleRgb(src.fill[j], facet), 1.35);
          put(i, jewel, 0.9);
        }
      }
      break;
    }
    case 'woodcut': {
      // Grabado en linóleo: alto contraste tinta/papel con tramas diagonales de gubia
      for (let i = 0; i < W * H; i++) {
        if (!mask[i]) continue;
        const j = srcIndexAt(i);
        if (j < 0) continue;
        const x = i % W;
        const y = (i / W) | 0;
        const lum = luminance(src.color[j]);
        const hatch = (x + y) % 4 === 0;
        const cross = (x - y + 400) % 5 === 0;
        if (toOut[i] <= 2 || src.dark[j]) {
          put(i, WOOD_INK, 0.98);
        } else if (lum > 0.65) {
          put(i, hatch ? WOOD_INK : WOOD_PAPER, hatch ? 0.35 : 0.96);
        } else if (lum > 0.38) {
          put(i, hatch || cross ? WOOD_INK : WOOD_PAPER, 0.95);
        } else {
          put(i, (x + y * 2) % 5 === 0 ? WOOD_PAPER : WOOD_INK, 0.96);
        }
      }
      break;
    }
  }
  return out;
}

export function stylizeTexture(scene: Phaser.Scene, baseKey: string, style: ArtStyle): string {
  const key = styledKey(baseKey, style);
  const tm = scene.textures;
  if (tm.exists(key)) return key;
  const base = tm.get(baseKey);
  const img = base.getSourceImage() as HTMLCanvasElement | HTMLImageElement;

  const names = base.getFrameNames().filter((n) => n !== '__BASE');
  const frames = names.length ? names.map((n) => base.get(n)) : [base.get('__BASE')];

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

export function ensureStyle(
  scene: Phaser.Scene,
  style: ArtStyle,
  textures: string[],
  anims: string[] = [],
): void {
  textures.forEach((t) => stylizeTexture(scene, t, style));
  anims.forEach((a) => stylizeAnim(scene, a, style));
}

export function footOriginY(frameHeightBase: number): number {
  const inner = frameHeightBase * STYLE_RES;
  return (STYLE_PAD + inner) / (inner + STYLE_PAD * 2);
}

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
