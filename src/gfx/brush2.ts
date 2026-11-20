import { Rng, vnoise } from './noise';
import { fillPoly, tracePoly, type Ctx, type Pt } from './brush';

/**
 * Pinceles procedurales para las nuevas técnicas artísticas de Duermevela:
 * 1. Teatro de Sombras y Celuloide (`shadow`)
 * 2. Bordado Textil sobre Lino (`embroidery`)
 * 3. Vitral Emplomado (`stainedglass`)
 * 4. Xilografía / Grabado en Linóleo (`woodcut`)
 */

// ── 1. Teatro de Sombras y Celuloide ──

/** Fondo cálido de proyector de carbón con motas y textura de pantalla vieja. */
export function amberBackdrop(ctx: Ctx, w: number, h: number, rng: Rng): void {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.45, w * 0.72);
  g.addColorStop(0, '#5a3114');
  g.addColorStop(0.55, '#2b150a');
  g.addColorStop(1, '#0e0704');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Rayas finas verticales de celuloide gastado
  ctx.save();
  for (let i = 0; i < 36; i++) {
    ctx.fillStyle = `rgba(255, 205, 130, ${rng.range(0.015, 0.05)})`;
    ctx.fillRect(rng.range(0, w), 0, rng.range(0.6, 1.5), h);
  }
  ctx.restore();
}

/** Perforaciones de película 35mm arriba y abajo del cuadro. */
export function celluloidFrame(ctx: Ctx, w: number, h: number): void {
  ctx.save();
  ctx.fillStyle = '#0a0604';
  ctx.fillRect(0, 0, w, 26);
  ctx.fillRect(0, h - 26, w, 26);
  ctx.fillStyle = '#2d1c10';
  for (let x = 14; x < w; x += 32) {
    ctx.fillRect(x, 6, 16, 14);
    ctx.fillRect(x, h - 20, 16, 14);
  }
  ctx.strokeStyle = 'rgba(255, 190, 85, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(1, 26, w - 2, h - 52);
  ctx.restore();
}

/** Silueta articulada de teatro de sombras, con bisagra de alambre y acetato opcional. */
export function shadowPuppet(
  ctx: Ctx,
  poly: Pt[],
  rng: Rng,
  o: { fill?: string; rim?: string; acetate?: string; joints?: Pt[] } = {},
): void {
  ctx.save();
  ctx.fillStyle = o.fill ?? '#120a06';
  fillPoly(ctx, poly);
  if (o.acetate) {
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = o.acetate;
    fillPoly(ctx, poly);
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = o.rim ?? 'rgba(255, 190, 95, 0.65)';
  ctx.lineWidth = 1.8;
  tracePoly(ctx, poly, true);
  ctx.stroke();
  for (const [jx, jy] of o.joints ?? []) {
    ctx.fillStyle = '#ffb84d';
    ctx.beginPath();
    ctx.arc(jx, jy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#120a06';
    ctx.beginPath();
    ctx.arc(jx, jy, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  void rng;
  ctx.restore();
}

// ── 2. Bordado Textil sobre Lino ──

/** Trama tejida de tela de lino crudo con hilos de urdimbre y trama visibles. */
export function linenWeave(ctx: Ctx, w: number, h: number, base = '#efe6d5', rng: Rng): void {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  for (let x = 0; x < w; x += 4) {
    ctx.fillStyle = x % 8 === 0 ? 'rgba(130, 105, 80, 0.08)' : 'rgba(255, 250, 240, 0.14)';
    ctx.fillRect(x, 0, 1.5, h);
  }
  for (let y = 0; y < h; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? 'rgba(120, 95, 70, 0.08)' : 'rgba(255, 250, 240, 0.14)';
    ctx.fillRect(0, y, w, 1.5);
  }
  // Motas naturales del algodón
  for (let i = 0; i < (w * h) / 600; i++) {
    ctx.fillStyle = `rgba(110, 85, 60, ${rng.range(0.05, 0.14)})`;
    ctx.fillRect(rng.range(0, w), rng.range(0, h), rng.range(1, 3), 1);
  }
  ctx.restore();
}

/** Puntada de bordado con sombra y brillo de hilo retorcido. */
export function stitchSegment(
  ctx: Ctx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 3.2,
): void {
  ctx.save();
  ctx.lineCap = 'round';
  // Sombra sobre la tela
  ctx.strokeStyle = 'rgba(40, 22, 12, 0.28)';
  ctx.lineWidth = width + 1;
  ctx.beginPath();
  ctx.moveTo(x1 + 1, y1 + 1.5);
  ctx.lineTo(x2 + 1, y2 + 1.5);
  ctx.stroke();
  // Hilo principal
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  // Brillo central de fibra
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = Math.max(1, width * 0.35);
  ctx.beginPath();
  ctx.moveTo(x1, y1 - 0.5);
  ctx.lineTo(x2, y2 - 0.5);
  ctx.stroke();
  ctx.restore();
}

/** Línea de pespunte (puntadas cortas separadas) a lo largo de una polilínea. */
export function dashedStitch(
  ctx: Ctx,
  pts: Pt[],
  color: string,
  dash = 9,
  gap = 5,
  width = 3,
): void {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 1) continue;
    const step = dash + gap;
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    for (let d = 0; d < len; d += step) {
      const end = Math.min(len, d + dash);
      stitchSegment(ctx, x1 + ux * d, y1 + uy * d, x1 + ux * end, y1 + uy * end, color, width);
    }
  }
}

/** Relleno en punto de cruz dentro de un rectángulo. */
export function crossStitchRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  cell = 10,
): void {
  for (let yy = y; yy < y + h - cell * 0.5; yy += cell) {
    for (let xx = x; xx < x + w - cell * 0.5; xx += cell) {
      const p = 1.5;
      stitchSegment(ctx, xx + p, yy + p, xx + cell - p, yy + cell - p, color, 2.2);
      stitchSegment(ctx, xx + cell - p, yy + p, xx + p, yy + cell - p, color, 2.2);
    }
  }
}

/** Aro de madera del bastidor alrededor de una escena. */
export function embroideryHoop(ctx: Ctx, cx: number, cy: number, r: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(30, 15, 5, 0.35)';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(cx + 3, cy + 4, r, 0, Math.PI * 2);
  ctx.stroke();

  const g = ctx.createRadialGradient(cx, cy, r - 12, cx, cy, r + 12);
  g.addColorStop(0, '#784e2c');
  g.addColorStop(0.5, '#b6804d');
  g.addColorStop(1, '#5e3b1f');
  ctx.strokeStyle = g;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // Tornillo superior de latón
  ctx.fillStyle = '#d4a644';
  ctx.fillRect(cx - 12, cy - r - 15, 24, 12);
  ctx.fillStyle = '#8b651f';
  ctx.fillRect(cx - 22, cy - r - 11, 44, 4);
  ctx.restore();
}

// ── 3. Vitral Emplomado Translúcido ──

/** Celda de vidrio catedral con gradiente translúcido, burbujas y nervio de plomo. */
export function glassPane(
  ctx: Ctx,
  poly: Pt[],
  color: string,
  rng: Rng,
  o: { lead?: string; leadW?: number; alpha?: number } = {},
): void {
  ctx.save();
  tracePoly(ctx, poly, true);
  ctx.clip();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of poly) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const g = ctx.createLinearGradient(minX, minY, maxX, maxY);
  g.addColorStop(0, color);
  g.addColorStop(0.55, color);
  g.addColorStop(1, '#0d101d');
  ctx.globalAlpha = o.alpha ?? 0.86;
  ctx.fillStyle = g;
  ctx.fillRect(minX - 2, minY - 2, maxX - minX + 4, maxY - minY + 4);
  // Reflejo interno de vidrio soplado
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(
    (minX + maxX) * 0.5 - (maxX - minX) * 0.15,
    (minY + maxY) * 0.5 - (maxY - minY) * 0.15,
    Math.max(4, (maxX - minX) * 0.25),
    Math.max(2, (maxY - minY) * 0.1),
    -0.5,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  // Burbujas diminutas
  for (let i = 0; i < 4; i++) {
    ctx.globalAlpha = rng.range(0.08, 0.22);
    ctx.beginPath();
    ctx.arc(rng.range(minX, maxX), rng.range(minY, maxY), rng.range(1, 2.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Nervio de plomo grueso
  ctx.save();
  ctx.strokeStyle = o.lead ?? '#10121e';
  ctx.lineWidth = o.leadW ?? 4.5;
  ctx.lineJoin = 'round';
  tracePoly(ctx, poly, true);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** Fondo de vitral en teselas irregulares geométricas. */
export function stainedGlassGrid(
  ctx: Ctx,
  w: number,
  h: number,
  palette: string[],
  rng: Rng,
  cols = 10,
  rows = 6,
): void {
  const cw = w / cols;
  const ch = h / rows;
  const pts: Pt[][] = [];
  for (let r = 0; r <= rows; r++) {
    const row: Pt[] = [];
    for (let c = 0; c <= cols; c++) {
      const jx = c === 0 || c === cols ? 0 : rng.range(-cw * 0.28, cw * 0.28);
      const jy = r === 0 || r === rows ? 0 : rng.range(-ch * 0.28, ch * 0.28);
      row.push([c * cw + jx, r * ch + jy]);
    }
    pts.push(row);
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = pts[r][c];
      const b = pts[r][c + 1];
      const d = pts[r + 1][c + 1];
      const e = pts[r + 1][c];
      if ((r + c) % 2 === 0) {
        glassPane(ctx, [a, b, d], rng.pick(palette), rng, { alpha: 0.72, leadW: 4 });
        glassPane(ctx, [a, d, e], rng.pick(palette), rng, { alpha: 0.65, leadW: 4 });
      } else {
        glassPane(ctx, [a, b, e], rng.pick(palette), rng, { alpha: 0.72, leadW: 4 });
        glassPane(ctx, [b, d, e], rng.pick(palette), rng, { alpha: 0.65, leadW: 4 });
      }
    }
  }
}

// ── 4. Xilografía / Grabado en Linóleo ──

/** Papel algodón envejecido para grabado. */
export function cottonPaper(ctx: Ctx, w: number, h: number, rng: Rng, dark = false): void {
  ctx.fillStyle = dark ? '#181924' : '#f2ead7';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  for (let i = 0; i < (w * h) / 450; i++) {
    ctx.fillStyle = dark
      ? `rgba(242, 234, 215, ${rng.range(0.02, 0.08)})`
      : `rgba(38, 42, 61, ${rng.range(0.02, 0.07)})`;
    ctx.fillRect(rng.range(0, w), rng.range(0, h), rng.range(1, 5), 1);
  }
  ctx.restore();
}

/** Bloque grabado en madera/linóleo con marcas blancas de gubia. */
export function woodcutBlock(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  rng: Rng,
  o: { ink?: string; paper?: string; hatch?: boolean } = {},
): void {
  const ink = o.ink ?? '#181924';
  const paper = o.paper ?? '#f2ead7';
  ctx.save();
  ctx.fillStyle = ink;
  ctx.fillRect(x, y, w, h);
  // Tallas de gubia (surcos claros siguiendo la veta)
  ctx.strokeStyle = paper;
  const n = Math.max(4, Math.floor((w * h) / 260));
  for (let i = 0; i < n; i++) {
    const gx = rng.range(x + 3, x + w - 10);
    const gy = rng.range(y + 3, y + h - 3);
    const len = rng.range(6, Math.min(26, w * 0.45));
    ctx.lineWidth = rng.range(1.1, 2.4);
    ctx.globalAlpha = rng.range(0.55, 0.95);
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + len, gy + (vnoise(gx * 0.05, gy * 0.05, 7) - 0.5) * 4);
    ctx.stroke();
  }
  if (o.hatch) {
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    for (let d = -h; d < w; d += 7) {
      ctx.beginPath();
      ctx.moveTo(x + Math.max(0, d), y + Math.max(0, -d));
      ctx.lineTo(x + Math.min(w, d + h), y + Math.min(h, w - d));
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Sello rojo de lacre / ex-libris de grabado. */
export function waxSeal(
  ctx: Ctx,
  cx: number,
  cy: number,
  r: number,
  rng: Rng,
  color = '#b8332a',
): void {
  ctx.save();
  const pts: Pt[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rr = r * rng.range(0.88, 1.12);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  ctx.fillStyle = color;
  fillPoly(ctx, pts);
  ctx.strokeStyle = '#7a1d17';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
