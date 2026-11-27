/**
 * Física mínima de una bola contra segmentos (canica de Marisol, bola del pinball).
 * Sin dependencias: posición, velocidad, gravedad y rebote con fricción.
 */

export interface Seg {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** Rebote propio del segmento (si no, el de la bola). */
  bounce?: number;
  /** Etiqueta para saber con qué chocó (línea dibujada, paleta…). */
  tag?: string | number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

/** Punto más cercano del segmento a (px, py). */
export function closest(s: Seg, px: number, py: number): [number, number] {
  const dx = s.bx - s.ax;
  const dy = s.by - s.ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - s.ax) * dx + (py - s.ay) * dy) / len2));
  return [s.ax + dx * t, s.ay + dy * t];
}

export function distToSeg(s: Seg, px: number, py: number): number {
  const [cx, cy] = closest(s, px, py);
  return Math.hypot(px - cx, py - cy);
}

/**
 * Avanza la bola `dt` segundos en sub-pasos. Devuelve las etiquetas de los
 * segmentos que tocó (con la fuerza del impacto).
 */
export function stepBall(
  b: Ball,
  segs: Seg[],
  dt: number,
  g: { x: number; y: number },
  opts: { bounce?: number; friction?: number; substeps?: number; maxSpeed?: number } = {},
): { tag: Seg['tag']; impact: number }[] {
  const n = opts.substeps ?? 6;
  const h = dt / n;
  const bounce = opts.bounce ?? 0.25;
  const fr = opts.friction ?? 0.998;
  const max = opts.maxSpeed ?? 1600;
  const hits: { tag: Seg['tag']; impact: number }[] = [];
  for (let i = 0; i < n; i++) {
    b.vx += g.x * h;
    b.vy += g.y * h;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > max) {
      b.vx = (b.vx / sp) * max;
      b.vy = (b.vy / sp) * max;
    }
    b.x += b.vx * h;
    b.y += b.vy * h;
    for (const s of segs) {
      const [cx, cy] = closest(s, b.x, b.y);
      let nx = b.x - cx;
      let ny = b.y - cy;
      const d = Math.hypot(nx, ny);
      if (d >= b.r || d === 0) continue;
      nx /= d;
      ny /= d;
      // sacar la bola del segmento
      b.x = cx + nx * b.r;
      b.y = cy + ny * b.r;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        const e = s.bounce ?? bounce;
        b.vx -= (1 + e) * vn * nx;
        b.vy -= (1 + e) * vn * ny;
        // fricción tangencial
        b.vx *= fr;
        b.vy *= fr;
        hits.push({ tag: s.tag, impact: -vn });
      } else {
        hits.push({ tag: s.tag, impact: 0 });
      }
    }
  }
  return hits;
}

/** Convierte una polilínea en segmentos. */
export function polySegs(pts: number[][], tag?: Seg['tag'], bounce?: number): Seg[] {
  const out: Seg[] = [];
  for (let i = 1; i < pts.length; i++) {
    out.push({ ax: pts[i - 1][0], ay: pts[i - 1][1], bx: pts[i][0], by: pts[i][1], tag, bounce });
  }
  return out;
}
