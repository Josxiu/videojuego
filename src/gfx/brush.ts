import Phaser from 'phaser';
import { Rng, vnoise, hash2 } from './noise';

/**
 * Pinceles procedurales sobre Canvas 2D.
 *
 * Cada sueño pinta sus escenarios con una técnica propia: gis, lápiz,
 * acuarela, papel recortado o crayola. Las funciones reciben un `Rng` con
 * semilla para que el dibujo sea siempre el mismo.
 */
export type Ctx = CanvasRenderingContext2D;
export type Pt = [number, number];

/**
 * Crea una textura pintando sobre un canvas. Si ya existe, no la repinta.
 * `linear` activa el filtrado suave (arte pintado); sin él queda pixelado.
 */
export function paintTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  paint: (ctx: Ctx, w: number, h: number) => void,
  linear = true,
): string {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, Math.ceil(w), Math.ceil(h));
  if (!tex) throw new Error(`[brush] no se pudo crear "${key}"`);
  paint(tex.getContext(), w, h);
  tex.refresh();
  if (linear) tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return key;
}

/** Agrega cuadros con nombre a una textura de canvas (hojas hechas a mano). */
export function addFrames(
  scene: Phaser.Scene,
  key: string,
  frames: { name: string; x: number; y: number; w: number; h: number }[],
): void {
  const tex = scene.textures.get(key);
  for (const f of frames) if (!tex.has(f.name)) tex.add(f.name, 0, f.x, f.y, f.w, f.h);
}

// ── Geometría ──

/** Remuestrea una polilínea a pasos de `step` píxeles. */
export function resample(pts: Pt[], step: number, closed = false): Pt[] {
  const src = closed ? [...pts, pts[0]] : pts;
  const out: Pt[] = [];
  for (let i = 0; i < src.length - 1; i++) {
    const [x1, y1] = src[i];
    const [x2, y2] = src[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(1, Math.ceil(len / step));
    for (let k = 0; k < n; k++) out.push([x1 + ((x2 - x1) * k) / n, y1 + ((y2 - y1) * k) / n]);
  }
  if (!closed) out.push(src[src.length - 1]);
  return out;
}

/** Polígono aproximadamente elíptico. */
export function ellipsePoly(cx: number, cy: number, rx: number, ry: number, n = 24, rot = 0): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rot;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

export function rectPoly(x: number, y: number, w: number, h: number): Pt[] {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

/** Desplaza cada vértice al azar. */
export function jitter(pts: Pt[], amt: number, rng: Rng): Pt[] {
  return pts.map(([x, y]) => [x + rng.range(-amt, amt), y + rng.range(-amt, amt)]);
}

/** Deformación recursiva de un polígono (base de la técnica de acuarela). */
export function deform(pts: Pt[], depth: number, variance: number, rng: Rng): Pt[] {
  let cur = pts;
  let v = variance;
  for (let d = 0; d < depth; d++) {
    const next: Pt[] = [];
    for (let i = 0; i < cur.length; i++) {
      const a = cur[i];
      const b = cur[(i + 1) % cur.length];
      next.push(a);
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      // gaussiana barata: suma de tres uniformes
      const g = (rng.next() + rng.next() + rng.next() - 1.5) / 1.5;
      const nx = -(b[1] - a[1]) / (len || 1);
      const ny = (b[0] - a[0]) / (len || 1);
      // El desplazamiento crece con el lado, pero con tope: en polígonos grandes
      // el borde tiembla como pigmento, sin deformar la forma entera.
      const off = g * v * Math.min(1.6, 0.5 + len / 60);
      next.push([mx + nx * off, my + ny * off]);
    }
    cur = next;
    v *= 0.62;
  }
  return cur;
}

export function fillPoly(ctx: Ctx, pts: Pt[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

export function tracePoly(ctx: Ctx, pts: Pt[], closed = true): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (closed) ctx.closePath();
}

function bounds(pts: Pt[]) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

// ── Gis (tiza) ──

export interface ChalkOpts {
  color?: string;
  width?: number;
  alpha?: number;
  wobble?: number;
  /** Probabilidad de que un grano no marque (textura del pizarrón). */
  gaps?: number;
}

/** Trazo de gis: miles de granos con huecos y un temblor de mano. */
export function chalkStroke(ctx: Ctx, pts: Pt[], rng: Rng, o: ChalkOpts = {}): void {
  const color = o.color ?? '#f2efe6';
  const width = o.width ?? 3;
  const alpha = o.alpha ?? 0.9;
  const wobble = o.wobble ?? 1.2;
  const gaps = o.gaps ?? 0.35;
  const path = resample(pts, 0.8);
  const seed = rng.int(0, 99999);
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < path.length; i++) {
    const [x, y] = path[i];
    const w = vnoise(i * 0.03, 0, seed) - 0.5;
    const pressure = 0.6 + 0.4 * vnoise(i * 0.02, 3, seed);
    const dots = Math.max(1, Math.round(width * 0.9));
    for (let d = 0; d < dots; d++) {
      if (rng.next() < gaps) continue;
      const ox = rng.range(-width / 2, width / 2);
      const oy = rng.range(-width / 2, width / 2) + w * wobble * 2;
      ctx.globalAlpha = alpha * pressure * rng.range(0.35, 1);
      ctx.fillRect(x + ox, y + oy, rng.chance(0.3) ? 2 : 1.2, 1.2);
    }
  }
  ctx.restore();
}

export function chalkLine(
  ctx: Ctx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rng: Rng,
  o: ChalkOpts = {},
): void {
  // La mano se pasa un poquito de largo en ambos extremos
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const over = rng.range(1, 4);
  chalkStroke(
    ctx,
    [
      [x1 - ux * over, y1 - uy * over],
      [x2 + ux * over, y2 + uy * over],
    ],
    rng,
    o,
  );
}

export function chalkRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  rng: Rng,
  o: ChalkOpts = {},
): void {
  const j = () => rng.range(-1.5, 1.5);
  chalkLine(ctx, x + j(), y + j(), x + w + j(), y + j(), rng, o);
  chalkLine(ctx, x + w + j(), y + j(), x + w + j(), y + h + j(), rng, o);
  chalkLine(ctx, x + w + j(), y + h + j(), x + j(), y + h + j(), rng, o);
  chalkLine(ctx, x + j(), y + h + j(), x + j(), y + j(), rng, o);
}

export function chalkEllipse(
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rng: Rng,
  o: ChalkOpts = {},
): void {
  const start = rng.range(0, Math.PI * 2);
  const sweep = Math.PI * 2 + rng.range(0.1, 0.35); // cierra pasándose un poco
  const pts: Pt[] = [];
  const n = Math.max(16, Math.round((rx + ry) / 2));
  for (let i = 0; i <= n; i++) {
    const a = start + (i / n) * sweep;
    const r = 1 + (vnoise(i * 0.2, 1, 7) - 0.5) * 0.06;
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  chalkStroke(ctx, pts, rng, o);
}

/** Relleno rayado de gis dentro de un polígono. */
export function chalkHatch(
  ctx: Ctx,
  poly: Pt[],
  rng: Rng,
  o: ChalkOpts & { spacing?: number; angle?: number } = {},
): void {
  const spacing = o.spacing ?? 5;
  const angle = o.angle ?? -0.9;
  const { x0, y0, x1, y1 } = bounds(poly);
  ctx.save();
  tracePoly(ctx, poly);
  ctx.clip();
  const diag = Math.hypot(x1 - x0, y1 - y0);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  for (let d = -diag / 2; d < diag / 2; d += spacing * rng.range(0.7, 1.3)) {
    const px = cx - sa * d;
    const py = cy + ca * d;
    chalkStroke(
      ctx,
      [
        [px - ca * diag, py - sa * diag],
        [px + ca * diag, py + sa * diag],
      ],
      rng,
      { width: 1.6, alpha: 0.5, gaps: 0.5, wobble: 0.4, ...o },
    );
  }
  ctx.restore();
}

/**
 * Texto escrito con gis: se rasteriza con la fuente y se reconstruye grano a grano.
 * Devuelve el ancho en píxeles.
 */
export function chalkText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  rng: Rng,
  o: { font: string; color?: string; align?: CanvasTextAlign; alpha?: number } = {
    font: '28px "Cabin Sketch"',
  },
): number {
  const tmp = document.createElement('canvas');
  const tctx = tmp.getContext('2d', { willReadFrequently: true });
  if (!tctx) return 0;
  tctx.font = o.font;
  const m = tctx.measureText(text);
  const w = Math.ceil(m.width) + 8;
  const h = Math.ceil((m.actualBoundingBoxAscent || 30) + (m.actualBoundingBoxDescent || 10)) + 8;
  tmp.width = w;
  tmp.height = h;
  tctx.font = o.font;
  tctx.fillStyle = '#fff';
  tctx.textBaseline = 'alphabetic';
  const asc = m.actualBoundingBoxAscent || 30;
  tctx.fillText(text, 4, asc + 4);
  const data = tctx.getImageData(0, 0, w, h).data;
  const align = o.align ?? 'left';
  const ox = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const oy = y - asc - 4;
  ctx.save();
  ctx.fillStyle = o.color ?? '#f2efe6';
  const base = o.alpha ?? 0.95;
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const a = data[(yy * w + xx) * 4 + 3] / 255;
      if (a < 0.3 || rng.next() < 0.18) continue;
      ctx.globalAlpha = base * a * rng.range(0.45, 1);
      ctx.fillRect(ox + xx, oy + yy, 1, 1);
    }
  }
  ctx.restore();
  return w;
}

/** Mancha de borrador: arcos de polvo blanquecino muy tenues. */
export function eraserSmudge(
  ctx: Ctx,
  cx: number,
  cy: number,
  w: number,
  h: number,
  rng: Rng,
  alpha = 0.07,
): void {
  ctx.save();
  const n = rng.int(5, 9);
  for (let i = 0; i < n; i++) {
    const x = cx + rng.range(-w / 2, w / 2);
    const y = cy + rng.range(-h / 3, h / 3);
    const rx = rng.range(w * 0.2, w * 0.45);
    const ry = rng.range(h * 0.25, h * 0.5);
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    g.addColorStop(0, `rgba(230,236,226,${alpha})`);
    g.addColorStop(1, 'rgba(230,236,226,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rng.range(-0.3, 0.3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── Lápiz ──

export interface PencilOpts {
  color?: string;
  width?: number;
  alpha?: number;
  /** Cuántas veces repasa la línea (bocetos sueltos). */
  passes?: number;
  jitter?: number;
}

/** Trazo de lápiz suelto, repasado un par de veces como un boceto. */
export function pencilStroke(ctx: Ctx, pts: Pt[], rng: Rng, o: PencilOpts = {}): void {
  const passes = o.passes ?? 2;
  const j = o.jitter ?? 1.2;
  ctx.save();
  ctx.strokeStyle = o.color ?? '#5b524c';
  ctx.lineWidth = o.width ?? 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let p = 0; p < passes; p++) {
    const path = resample(pts, 7);
    ctx.globalAlpha = (o.alpha ?? 0.6) * (p === 0 ? 1 : 0.55);
    const off = p === 0 ? 0 : j;
    ctx.beginPath();
    path.forEach(([x, y], i) => {
      const px = x + rng.range(-off, off) * 0.8;
      const py = y + rng.range(-off, off) * 0.8;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }
  ctx.restore();
}

export function pencilLine(
  ctx: Ctx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rng: Rng,
  o: PencilOpts = {},
): void {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const over = rng.range(2, 6);
  pencilStroke(
    ctx,
    [
      [x1 - ux * over, y1 - uy * over],
      [x2 + ux * over * 0.5, y2 + uy * over * 0.5],
    ],
    rng,
    o,
  );
}

export function pencilPoly(ctx: Ctx, poly: Pt[], rng: Rng, o: PencilOpts = {}): void {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    pencilLine(ctx, a[0], a[1], b[0], b[1], rng, o);
  }
}

export function pencilEllipse(
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rng: Rng,
  o: PencilOpts = {},
): void {
  const start = rng.range(0, Math.PI * 2);
  const pts: Pt[] = [];
  const n = Math.max(14, Math.round((rx + ry) / 3));
  for (let i = 0; i <= n + 2; i++) {
    const a = start + (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  pencilStroke(ctx, pts, rng, o);
}

/** Sombreado a lápiz en diagonal dentro de un polígono. */
export function pencilHatch(
  ctx: Ctx,
  poly: Pt[],
  rng: Rng,
  o: PencilOpts & { spacing?: number; angle?: number } = {},
): void {
  const spacing = o.spacing ?? 5;
  const angle = o.angle ?? -0.8;
  const { x0, y0, x1, y1 } = bounds(poly);
  ctx.save();
  tracePoly(ctx, poly);
  ctx.clip();
  const diag = Math.hypot(x1 - x0, y1 - y0);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  for (let d = -diag / 2; d < diag / 2; d += spacing) {
    const px = cx - sa * d;
    const py = cy + ca * d;
    pencilStroke(
      ctx,
      [
        [px - ca * diag, py - sa * diag],
        [px + ca * diag, py + sa * diag],
      ],
      rng,
      { passes: 1, alpha: 0.3, ...o },
    );
  }
  ctx.restore();
}

// ── Acuarela ──

export interface WashOpts {
  layers?: number;
  alpha?: number;
  variance?: number;
  /** Oscurece el borde donde el pigmento se acumula. */
  edge?: number;
  granulate?: number;
}

/**
 * Lavado de acuarela: el polígono se deforma y se pinta en muchas capas
 * translúcidas, cada una deformada distinto. Los bordes quedan suaves y
 * con esa "mancha dentro de la mancha" típica del pigmento.
 */
export function wash(ctx: Ctx, poly: Pt[], color: string, rng: Rng, o: WashOpts = {}): void {
  const layers = o.layers ?? 18;
  const alpha = o.alpha ?? 0.06;
  const variance = o.variance ?? 8;
  const base = deform(poly, 3, variance, rng);
  ctx.save();
  ctx.fillStyle = color;
  for (let l = 0; l < layers; l++) {
    ctx.globalAlpha = alpha;
    fillPoly(ctx, deform(base, 3, variance * 0.7, rng));
  }
  if (o.edge ?? 0.18) {
    ctx.globalAlpha = o.edge ?? 0.18;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    tracePoly(ctx, deform(base, 1, variance * 0.3, rng));
    ctx.stroke();
  }
  if (o.granulate) {
    const { x0, y0, x1, y1 } = bounds(poly);
    tracePoly(ctx, base);
    ctx.clip();
    const n = Math.round(((x1 - x0) * (y1 - y0)) / 30) * o.granulate;
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = rng.range(0.05, 0.18);
      ctx.fillRect(rng.range(x0, x1), rng.range(y0, y1), rng.range(1, 2.2), rng.range(1, 2.2));
    }
  }
  ctx.restore();
}

/** Mancha redonda de acuarela. */
export function blot(
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  color: string,
  rng: Rng,
  o: WashOpts = {},
): void {
  wash(ctx, ellipsePoly(cx, cy, r, r * rng.range(0.75, 1), 10, rng.range(0, 6)), color, rng, {
    variance: r * 0.25,
    ...o,
  });
}

// ── Papel ──

export interface PaperOpts {
  shadow?: number;
  shadowBlur?: number;
  shadowX?: number;
  shadowY?: number;
  /** Borde rasgado (en píxeles de irregularidad). */
  torn?: number;
  fiber?: number;
}

/** Pieza de papel recortado con sombra y fibras. */
export function paperPiece(ctx: Ctx, poly: Pt[], color: string, rng: Rng, o: PaperOpts = {}): void {
  let shape = poly;
  if (o.torn) shape = jitter(resample(poly, 3, true), o.torn, rng);
  ctx.save();
  ctx.shadowColor = `rgba(40,20,5,${o.shadow ?? 0.3})`;
  ctx.shadowBlur = o.shadowBlur ?? 4;
  ctx.shadowOffsetX = o.shadowX ?? 3;
  ctx.shadowOffsetY = o.shadowY ?? 4;
  ctx.fillStyle = color;
  fillPoly(ctx, shape);
  ctx.restore();
  if (o.fiber ?? 0.5) paperFiber(ctx, shape, rng, o.fiber ?? 0.5);
}

/** Fibras claras y oscuras dentro de un recorte. */
export function paperFiber(ctx: Ctx, poly: Pt[], rng: Rng, amount = 0.5): void {
  const { x0, y0, x1, y1 } = bounds(poly);
  ctx.save();
  tracePoly(ctx, poly);
  ctx.clip();
  const n = Math.round((((x1 - x0) * (y1 - y0)) / 90) * amount);
  for (let i = 0; i < n; i++) {
    const x = rng.range(x0, x1);
    const y = rng.range(y0, y1);
    const len = rng.range(2, 7);
    const a = rng.range(0, Math.PI);
    ctx.strokeStyle = rng.chance(0.5) ? 'rgba(255,255,255,0.18)' : 'rgba(60,30,10,0.08)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();
}

/** Tira de cinta canela con extremos dentados. */
export function tape(
  ctx: Ctx,
  cx: number,
  cy: number,
  w: number,
  h: number,
  angle: number,
  rng: Rng,
  color = 'rgba(214,170,98,0.82)',
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const pts: Pt[] = [];
  const teeth = Math.max(3, Math.round(h / 3));
  for (let i = 0; i <= teeth; i++)
    pts.push([-w / 2 + (i % 2 ? 2 : 0) + rng.range(-0.5, 0.5), -h / 2 + (h * i) / teeth]);
  for (let i = teeth; i >= 0; i--)
    pts.push([w / 2 - (i % 2 ? 2 : 0) + rng.range(-0.5, 0.5), -h / 2 + (h * i) / teeth]);
  ctx.fillStyle = color;
  fillPoly(ctx, pts);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(-w / 2 + 2, -h / 2 + 1, w - 4, h * 0.3);
  ctx.restore();
}

// ── Crayola ──

export interface CrayonOpts {
  color?: string;
  width?: number;
  alpha?: number;
}

/** Línea de crayola: varias hebras paralelas con huecos de cera. */
export function crayonStroke(ctx: Ctx, pts: Pt[], rng: Rng, o: CrayonOpts = {}): void {
  const width = o.width ?? 5;
  const alpha = o.alpha ?? 0.9;
  const path = resample(pts, 1);
  const seed = rng.int(0, 99999);
  ctx.save();
  ctx.fillStyle = o.color ?? '#2b2340';
  for (let i = 0; i < path.length; i++) {
    const [x, y] = path[i];
    const prev = path[Math.max(0, i - 1)];
    const next = path[Math.min(path.length - 1, i + 1)];
    let nx = -(next[1] - prev[1]);
    let ny = next[0] - prev[0];
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl;
    ny /= nl;
    const wob = (vnoise(i * 0.05, 0, seed) - 0.5) * 2;
    for (let k = 0; k < width; k++) {
      const off = k - width / 2 + wob;
      if (vnoise(i * 0.35, k * 1.7, seed) < 0.3) continue;
      if (hash2(i, k, seed) < 0.12) continue;
      ctx.globalAlpha = alpha * (0.55 + 0.45 * hash2(i, k + 50, seed));
      ctx.fillRect(x + nx * off, y + ny * off, 1.3, 1.3);
    }
  }
  ctx.restore();
}

/** Contorno de crayola (se pasa un poco al cerrar, como mano de niño). */
export function crayonPoly(ctx: Ctx, poly: Pt[], rng: Rng, o: CrayonOpts = {}): void {
  const pts = jitter(poly, 1.5, rng);
  crayonStroke(
    ctx,
    [...pts, pts[0], [pts[1][0] + rng.range(-3, 3), pts[1][1] + rng.range(-3, 3)]],
    rng,
    o,
  );
}

/**
 * Relleno de crayola: rayones de ida y vuelta que no llegan a cubrir todo.
 * `coverage` < 1 deja ver el papel entre trazos.
 */
export function crayonFill(
  ctx: Ctx,
  poly: Pt[],
  color: string,
  rng: Rng,
  o: { angle?: number; spacing?: number; alpha?: number; coverage?: number; width?: number } = {},
): void {
  const angle = o.angle ?? rng.range(-1.1, -0.6);
  const spacing = o.spacing ?? 3;
  const coverage = o.coverage ?? 0.9;
  const { x0, y0, x1, y1 } = bounds(poly);
  ctx.save();
  tracePoly(ctx, jitter(poly, 1.2, rng));
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  const diag = Math.hypot(x1 - x0, y1 - y0);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  for (let d = -diag / 2; d < diag / 2; d += spacing) {
    if (rng.next() > coverage) continue;
    const px = cx - sa * d;
    const py = cy + ca * d;
    ctx.lineWidth = o.width ?? rng.range(1.8, 3.2);
    ctx.globalAlpha = (o.alpha ?? 0.75) * rng.range(0.6, 1);
    ctx.beginPath();
    const steps = Math.ceil(diag / 10);
    for (let s = 0; s <= steps; s++) {
      const t = -diag / 2 + (diag * s) / steps;
      const x = px + ca * t + rng.range(-1, 1);
      const y = py + sa * t + rng.range(-1, 1);
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Grano del papel: puntitos donde la cera no entró
  const n = Math.round(((x1 - x0) * (y1 - y0)) / 22);
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = rng.range(0.2, 0.6);
    ctx.fillRect(rng.range(x0, x1), rng.range(y0, y1), 1.2, 1.2);
  }
  ctx.restore();
}

/** Garabato: lazos caóticos, para lo oscuro y lo que da miedo. */
export function scribble(
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rng: Rng,
  o: { color?: string; loops?: number; width?: number; alpha?: number } = {},
): void {
  ctx.save();
  ctx.strokeStyle = o.color ?? '#141020';
  ctx.lineWidth = o.width ?? 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = o.alpha ?? 0.85;
  ctx.beginPath();
  let a = rng.range(0, Math.PI * 2);
  const loops = o.loops ?? 30;
  for (let i = 0; i < loops * 8; i++) {
    a += rng.range(0.5, 1.1);
    const r = rng.range(0.25, 1);
    const x = cx + Math.cos(a) * rx * r;
    const y = cy + Math.sin(a) * ry * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

// ── Papeles de fondo ──

/**
 * Textura sobre lo ya pintado: manchas grandes, fibras y grano fino.
 * Sirve igual para papel, pizarrón o cartón.
 */
export function grain(ctx: Ctx, w: number, h: number, rng: Rng, amount = 1, fiber = 1): void {
  const seed = rng.int(0, 9999);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const n =
        ((vnoise(x / 60, y / 60, seed) - 0.5) * 0.06 +
          (vnoise(x / 1.5, y / 9, seed + 1) - 0.5) * 0.05 * fiber +
          (hash2(x, y, seed) - 0.5) * 0.04) *
        amount;
      d[i] = Math.max(0, Math.min(255, d[i] * (1 + n)));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] * (1 + n)));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] * (1 + n)));
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Llena un área con papel: color base, manchas y fibras. */
export function paperGround(
  ctx: Ctx,
  w: number,
  h: number,
  color: string,
  rng: Rng,
  fiber = 1,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h, rng, 1, fiber);
}
