/**
 * La maqueta de Abel como grafo de vías sobre la mesa (plano XZ, unidades de
 * maqueta). Cada tramo es una polilínea muestreada; las agujas eligen entre
 * dos tramos siguientes.
 */

export type SegId =
  'topL' | 'topA' | 'topB' | 'topR' | 'arcR' | 'spur' | 'botR' | 'botA' | 'botB' | 'botL' | 'arcL';

export type SwitchId = 1 | 2 | 3;

export interface Segment {
  id: SegId;
  pts: [number, number][];
  /** Longitud acumulada en cada punto. */
  acc: number[];
  len: number;
}

const line = (a: [number, number], b: [number, number], n = 20): [number, number][] =>
  Array.from({ length: n + 1 }, (_v, i) => [
    a[0] + ((b[0] - a[0]) * i) / n,
    a[1] + ((b[1] - a[1]) * i) / n,
  ]);

const arc = (
  cx: number,
  cz: number,
  r: number,
  a0: number,
  a1: number,
  n = 40,
): [number, number][] =>
  Array.from({ length: n + 1 }, (_v, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + Math.cos(a) * r, cz + Math.sin(a) * r];
  });

/** Curva suave por puntos de control (Catmull-Rom). */
const smooth = (ctrl: [number, number][], n = 40): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * (ctrl.length - 1);
    const k = Math.min(ctrl.length - 2, Math.floor(t));
    const u = t - k;
    const p0 = ctrl[Math.max(0, k - 1)];
    const p1 = ctrl[k];
    const p2 = ctrl[k + 1];
    const p3 = ctrl[Math.min(ctrl.length - 1, k + 2)];
    const f = (a: number, b: number, c: number, d: number) =>
      0.5 *
      (2 * b +
        (-a + c) * u +
        (2 * a - 5 * b + 4 * c - d) * u * u +
        (-a + 3 * b - 3 * c + d) * u * u * u);
    out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
  }
  return out;
};

function seg(id: SegId, pts: [number, number][]): Segment {
  const acc = [0];
  for (let i = 1; i < pts.length; i++)
    acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { id, pts, acc, len: acc[acc.length - 1] };
}

export const SEGMENTS: Record<SegId, Segment> = {
  topL: seg('topL', line([-5, -3], [-3, -3], 10)),
  topA: seg('topA', line([-3, -3], [3, -3], 30)),
  topB: seg(
    'topB',
    smooth([
      [-3, -3],
      [-2.2, -2.2],
      [0, -2.1],
      [2.2, -2.2],
      [3, -3],
    ]),
  ),
  topR: seg('topR', line([3, -3], [5, -3], 10)),
  arcR: seg('arcR', arc(5, 0, 3, -Math.PI / 2, Math.PI / 2)),
  spur: seg(
    'spur',
    smooth([
      [5, -3],
      [7, -3.1],
      [8.6, -3.8],
      [9.3, -5.2],
    ]),
  ),
  botR: seg('botR', line([5, 3], [3, 3], 10)),
  botA: seg('botA', line([3, 3], [-3, 3], 30)),
  botB: seg(
    'botB',
    smooth([
      [3, 3],
      [2.2, 2.2],
      [0, 2.1],
      [-2.2, 2.2],
      [-3, 3],
    ]),
  ),
  botL: seg('botL', line([-3, 3], [-5, 3], 10)),
  arcL: seg('arcL', arc(-5, 0, 3, Math.PI / 2, (3 * Math.PI) / 2)),
};

/** Qué viene después de cada tramo. Un par = aguja [recta, desvío]. */
export const NEXT: Record<SegId, { sw?: SwitchId; to: SegId[] } | null> = {
  topL: { sw: 1, to: ['topA', 'topB'] },
  topA: { to: ['topR'] },
  topB: { to: ['topR'] },
  topR: { sw: 3, to: ['arcR', 'spur'] },
  arcR: { to: ['botR'] },
  spur: null,
  botR: { sw: 2, to: ['botA', 'botB'] },
  botA: { to: ['botL'] },
  botB: { to: ['botL'] },
  botL: { to: ['arcL'] },
  arcL: { to: ['topL'] },
};

/** Dónde está cada aguja (para dibujarla y tocarla). */
export const SWITCH_POS: Record<SwitchId, [number, number]> = {
  1: [-3, -3],
  2: [3, 3],
  3: [5, -3],
};

export interface Station {
  name: string;
  seg: SegId;
  at: number;
}

export const STATIONS: Station[] = [
  { name: 'Puerto Berrío', seg: 'topB', at: 0.5 },
  { name: 'La Dorada', seg: 'arcR', at: 0.5 },
  { name: 'Barrancabermeja', seg: 'botB', at: 0.5 },
  { name: 'Gamarra', seg: 'arcL', at: 0.5 },
];

export const TICKETS: { i: number; seg: SegId; at: number; act: 1 | 2 }[] = [
  { i: 0, seg: 'topB', at: 0.25, act: 1 },
  { i: 1, seg: 'arcR', at: 0.78, act: 1 },
  { i: 2, seg: 'botB', at: 0.75, act: 1 },
  { i: 3, seg: 'topB', at: 0.75, act: 2 },
  { i: 4, seg: 'botB', at: 0.25, act: 2 },
];

/** El tanque de agua de Puerto Berrío (secreto). */
export const WATER_TOWER: [number, number] = [-1.2, -4.6];
/** Andén de Santa Marta al final del ramal (fracción del tramo `spur`). */
export const PLATFORM = { from: 0.62, to: 0.86 };

/** Posición y dirección en un tramo a distancia `s`. */
export function pointAt(sg: Segment, s: number): { x: number; z: number; dx: number; dz: number } {
  const d = Math.max(0, Math.min(sg.len, s));
  let i = 1;
  while (i < sg.acc.length - 1 && sg.acc[i] < d) i++;
  const a = sg.pts[i - 1];
  const b = sg.pts[i];
  const span = sg.acc[i] - sg.acc[i - 1] || 1;
  const t = (d - sg.acc[i - 1]) / span;
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l = Math.hypot(dx, dz) || 1;
  return { x: a[0] + dx * t, z: a[1] + dz * t, dx: dx / l, dz: dz / l };
}

/** Recorre el grafo desde un tramo con las agujas dadas; devuelve la secuencia de tramos. */
export function route(start: SegId, switches: Record<SwitchId, 0 | 1>, steps: number): SegId[] {
  const out: SegId[] = [start];
  let cur = start;
  for (let k = 0; k < steps; k++) {
    const n = NEXT[cur];
    if (!n) break;
    cur = n.to.length > 1 && n.sw ? n.to[switches[n.sw]] : n.to[0];
    out.push(cur);
  }
  return out;
}
