import Phaser from 'phaser';
import { Rng } from '../../gfx/noise';
import {
  paintTexture,
  wash,
  blot,
  grain,
  pencilPoly,
  pencilLine,
  pencilEllipse,
  pencilHatch,
  pencilStroke,
  rectPoly,
  ellipsePoly,
  deform,
  fillPoly,
  type Ctx,
  type Pt,
} from '../../gfx/brush';

/**
 * El arte del Patio de Atrás: el mismo patio pintado dos veces.
 *
 * - `patio-sketch`: boceto a lápiz sobre papel crema (el recuerdo desvaído)
 * - `patio-paint`: acuarela (el recuerdo con color)
 *
 * La escena pone el boceto encima y lo va borrando donde cae agua: así se
 * «pinta» el patio. Todo se pinta a media resolución y se muestra al doble:
 * la acuarela es suave por naturaleza.
 */

export const WORLD_W = 1600;
export const WORLD_H = 1100;
/** Factor de resolución de las capas grandes. */
export const RES = 0.5;
const PAPER = '#f4ecd8';
const GRAPHITE = '#5b524c';

/** Rectángulo del piso de mosaico. */
const FLOOR = { x: 220, y: 330, w: 1200, h: 660, tile: 60 };

export const PILA = { x: 520, y: 575 };
export const TREE = { x: 1300, y: 330 };
export const START = { x: 800, y: 1010 };

/** Límites caminables. */
export const BOUNDS = { x0: 150, x1: 1450, y0: 250, y1: 1060 };

type Mode = 'paint' | 'pencil';

const PENCIL = { color: GRAPHITE, alpha: 0.6, width: 1.6 };
const nx = Math.floor(FLOOR.w / FLOOR.tile);
const ny = Math.floor(FLOOR.h / FLOOR.tile);

function tileColor(i: number, j: number): string {
  if (i === 0 || j === 0 || i === nx - 1 || j === ny - 1) return '#c8a050';
  return (i + j) % 2 === 0 ? '#d07a50' : '#efe0c0';
}

/** Rectángulo con color de fondo firme y una capa de acuarela encima para la textura. */
function flatWash(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  rng: Rng,
): void {
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.75;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  wash(ctx, rectPoly(x, y, w, h), color, rng, { layers: 5, alpha: 0.12, variance: 4, edge: 0.15 });
}

// Cada elemento del patio sabe dibujarse a lápiz o en acuarela.

function walls(ctx: Ctx, rng: Rng, m: Mode): void {
  if (m === 'paint') {
    flatWash(ctx, 0, 0, WORLD_W, 200, '#7aa6d0', rng);
    flatWash(ctx, 0, 0, WORLD_W, 16, '#b0cce8', rng);
    wash(ctx, rectPoly(0, 176, WORLD_W, 28), '#4e7aa8', rng, {
      layers: 6,
      alpha: 0.12,
      variance: 3,
    });
    flatWash(ctx, 0, 0, 56, WORLD_H, '#eca8bc', rng);
    flatWash(ctx, WORLD_W - 56, 0, 56, WORLD_H, '#eec070', rng);
    // la sombra del muro sobre el patio
    const g = ctx.createLinearGradient(0, 204, 0, 260);
    g.addColorStop(0, 'rgba(60,70,110,0.28)');
    g.addColorStop(1, 'rgba(60,70,110,0)');
    ctx.fillStyle = g;
    ctx.fillRect(56, 204, WORLD_W - 112, 56);
  } else {
    pencilLine(ctx, 0, 200, WORLD_W, 200, rng, PENCIL);
    pencilLine(ctx, 0, 16, WORLD_W, 16, rng, { ...PENCIL, alpha: 0.35 });
    pencilHatch(ctx, rectPoly(0, 176, WORLD_W, 24), rng, { ...PENCIL, alpha: 0.22, spacing: 9 });
    pencilLine(ctx, 56, 200, 56, WORLD_H, rng, PENCIL);
    pencilLine(ctx, WORLD_W - 56, 200, WORLD_W - 56, WORLD_H, rng, PENCIL);
    // ladrillos insinuados
    for (let k = 0; k < 26; k++) {
      const x = rng.range(20, WORLD_W - 80);
      const y = rng.range(30, 160);
      pencilPoly(ctx, rectPoly(x, y, 44, 18), rng, { ...PENCIL, alpha: 0.18, passes: 1 });
    }
  }
}

function doorAndWindow(ctx: Ctx, rng: Rng, m: Mode): void {
  if (m === 'paint') {
    flatWash(ctx, 700, 36, 120, 164, '#8a5a3a', rng);
    wash(ctx, rectPoly(712, 50, 44, 60), '#a0704a', rng, { layers: 4, alpha: 0.2 });
    wash(ctx, rectPoly(764, 50, 44, 60), '#a0704a', rng, { layers: 4, alpha: 0.2 });
    blot(ctx, 800, 130, 5, '#f2d23a', rng, { layers: 3, alpha: 0.5 });
    flatWash(ctx, 980, 46, 110, 86, '#bfe0f0', rng);
  }
  const o = m === 'paint' ? { ...PENCIL, alpha: 0.35 } : PENCIL;
  pencilPoly(ctx, rectPoly(700, 36, 120, 164), rng, o);
  pencilPoly(ctx, rectPoly(712, 50, 44, 60), rng, { ...o, alpha: o.alpha * 0.6 });
  pencilPoly(ctx, rectPoly(764, 50, 44, 60), rng, { ...o, alpha: o.alpha * 0.6 });
  pencilPoly(ctx, rectPoly(980, 46, 110, 86), rng, o);
  for (let k = 1; k < 5; k++)
    pencilLine(ctx, 980 + k * 22, 46, 980 + k * 22, 132, rng, { ...o, alpha: o.alpha * 0.8 });
}

function beds(ctx: Ctx, rng: Rng, m: Mode): void {
  const areas: [number, number, number, number][] = [
    [56, 204, WORLD_W - 112, 116],
    [56, 320, 154, WORLD_H - 320],
    [WORLD_W - 210, 320, 154, WORLD_H - 320],
  ];
  for (const [x, y, w, h] of areas) {
    if (m === 'paint') {
      flatWash(ctx, x, y, w, h, '#b09060', rng);
      for (let k = 0; k < (w * h) / 5000; k++)
        blot(
          ctx,
          rng.range(x + 10, x + w - 10),
          rng.range(y + 10, y + h - 10),
          rng.range(14, 26),
          rng.pick(['#6aa84a', '#4a8a3a', '#8ac05a']),
          rng,
          {
            layers: 4,
            alpha: 0.2,
          },
        );
      for (let k = 0; k < (w * h) / 16000; k++)
        blot(
          ctx,
          rng.range(x + 10, x + w - 10),
          rng.range(y + 10, y + h - 10),
          rng.range(5, 8),
          rng.pick(['#f2d23a', '#e8505a', '#f0f0f0', '#b060d0']),
          rng,
          {
            layers: 3,
            alpha: 0.45,
          },
        );
    } else {
      pencilPoly(ctx, rectPoly(x, y, w, h), rng, { ...PENCIL, alpha: 0.35 });
      for (let k = 0; k < (w * h) / 9000; k++) {
        const cx = rng.range(x + 16, x + w - 16);
        const cy = rng.range(y + 16, y + h - 16);
        // matitas a lápiz: tres rulitos
        for (let l = 0; l < 3; l++)
          pencilEllipse(ctx, cx + rng.range(-10, 10), cy + rng.range(-8, 8), 8, 6, rng, {
            ...PENCIL,
            alpha: 0.28,
            passes: 1,
          });
      }
    }
  }
}

function bugambilia(ctx: Ctx, rng: Rng, m: Mode): void {
  const clusters: [number, number, number, number, number][] = [
    [80, 0, 560, 170, 34],
    [1000, 0, 520, 150, 26],
  ];
  for (const [x, y, w, h, n] of clusters) {
    for (let k = 0; k < n; k++) {
      // se concentra arriba y cae en guías
      const cx = rng.range(x, x + w);
      const cy = y + Math.pow(rng.next(), 1.8) * h;
      if (m === 'paint') {
        blot(ctx, cx, cy, rng.range(14, 26), rng.pick(['#d83a8a', '#e85aa8', '#b82a70']), rng, {
          layers: 5,
          alpha: 0.2,
        });
        if (k % 3 === 0) blot(ctx, cx + 10, cy + 8, 9, '#3a7a3a', rng, { layers: 3, alpha: 0.25 });
      } else if (k % 2 === 0) {
        pencilEllipse(ctx, cx, cy, 14, 11, rng, { ...PENCIL, alpha: 0.3, passes: 1 });
      }
    }
  }
}

function floor(ctx: Ctx, rng: Rng, m: Mode): void {
  if (m === 'paint') {
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const x = FLOOR.x + i * FLOOR.tile;
        const y = FLOOR.y + j * FLOOR.tile;
        const c = tileColor(i, j);
        ctx.fillStyle = c;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(x + 2, y + 2, FLOOR.tile - 4, FLOOR.tile - 4);
        ctx.globalAlpha = 1;
        wash(ctx, rectPoly(x + 3, y + 3, FLOOR.tile - 6, FLOOR.tile - 6), c, rng, {
          layers: 3,
          alpha: 0.18,
          variance: 2,
          edge: 0.2,
        });
        if (c === '#d07a50') {
          blot(ctx, x + FLOOR.tile / 2, y + FLOOR.tile / 2, 9, '#f2e2b0', rng, {
            layers: 3,
            alpha: 0.3,
          });
          blot(ctx, x + FLOOR.tile / 2, y + FLOOR.tile / 2, 3, '#e0a040', rng, {
            layers: 2,
            alpha: 0.5,
          });
        }
      }
    }
    return;
  }
  // A lápiz: el borde del piso y solo algunas losetas, como un dibujo sin terminar
  pencilPoly(ctx, rectPoly(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h), rng, PENCIL);
  pencilPoly(
    ctx,
    rectPoly(
      FLOOR.x + FLOOR.tile,
      FLOOR.y + FLOOR.tile,
      FLOOR.w - FLOOR.tile * 2,
      FLOOR.h - FLOOR.tile * 2,
    ),
    rng,
    {
      ...PENCIL,
      alpha: 0.4,
    },
  );
  for (let i = 1; i < nx - 1; i++) {
    for (let j = 1; j < ny - 1; j++) {
      if (!rng.chance(0.22)) continue;
      const x = FLOOR.x + i * FLOOR.tile;
      const y = FLOOR.y + j * FLOOR.tile;
      pencilPoly(ctx, rectPoly(x, y, FLOOR.tile, FLOOR.tile), rng, {
        ...PENCIL,
        alpha: 0.3,
        passes: 1,
      });
      if ((i + j) % 2 === 0) {
        for (let pt = 0; pt < 4; pt++) {
          const a = (pt / 4) * Math.PI * 2;
          pencilEllipse(ctx, x + 30 + Math.cos(a) * 7, y + 30 + Math.sin(a) * 7, 5, 5, rng, {
            ...PENCIL,
            alpha: 0.3,
            passes: 1,
          });
        }
      }
    }
  }
}

function decoPots(ctx: Ctx, rng: Rng, m: Mode): void {
  // Macetas de adorno en los arriates (no se riegan: ya están en el recuerdo)
  const spots: [number, number][] = [
    [110, 400],
    [150, 560],
    [100, 760],
    [150, 900],
    [WORLD_W - 110, 450],
    [WORLD_W - 150, 640],
    [WORLD_W - 110, 820],
    [200, 270],
    [520, 262],
    [1150, 268],
    [1420, 262],
  ];
  for (const [x, y] of spots) {
    const pot: Pt[] = [
      [x - 16, y],
      [x + 16, y],
      [x + 12, y + 26],
      [x - 12, y + 26],
    ];
    if (m === 'paint') {
      wash(ctx, pot, rng.pick(['#c86a3a', '#a8b0b8', '#d8a050']), rng, {
        layers: 4,
        alpha: 0.28,
        variance: 2,
      });
      blot(ctx, x, y - 12, 18, rng.pick(['#5a9a4a', '#4a8a3a']), rng, { layers: 4, alpha: 0.22 });
      for (let k = 0; k < 3; k++)
        blot(
          ctx,
          x + rng.range(-12, 12),
          y - 18 + rng.range(-8, 6),
          5,
          rng.pick(['#e8303a', '#f2d23a', '#fff']),
          rng,
          { layers: 2, alpha: 0.45 },
        );
    } else {
      pencilPoly(ctx, pot, rng, { ...PENCIL, alpha: 0.5 });
      pencilEllipse(ctx, x, y - 12, 16, 12, rng, { ...PENCIL, alpha: 0.35, passes: 1 });
    }
  }
}

function zaguan(ctx: Ctx, rng: Rng, m: Mode): void {
  if (m === 'paint') flatWash(ctx, 720, WORLD_H - 40, 160, 40, '#7a5a3a', rng);
  pencilPoly(
    ctx,
    rectPoly(720, WORLD_H - 40, 160, 40),
    rng,
    m === 'paint' ? { ...PENCIL, alpha: 0.3 } : PENCIL,
  );
}

function treeShadow(ctx: Ctx, rng: Rng, m: Mode): void {
  const poly = ellipsePoly(TREE.x + 30, TREE.y + 40, 170, 70, 20);
  if (m === 'paint') wash(ctx, poly, '#6a7a6a', rng, { layers: 6, alpha: 0.1, variance: 8 });
  else pencilHatch(ctx, poly, rng, { ...PENCIL, spacing: 12, alpha: 0.2 });
}

function paintPila(ctx: Ctx, rng: Rng, m: Mode): void {
  const { x, y } = PILA;
  if (m === 'paint') {
    flatWash(ctx, x - 90, y - 60, 180, 110, '#a8b0b8', rng);
    flatWash(ctx, x - 70, y - 45, 140, 70, '#4a9ad8', rng);
    blot(ctx, x - 30, y - 20, 12, '#bfe8ff', rng, { layers: 3, alpha: 0.4 });
    flatWash(ctx, x - 90, y + 50, 180, 30, '#7a8088', rng);
  }
  const o = m === 'paint' ? { ...PENCIL, alpha: 0.35 } : PENCIL;
  pencilPoly(ctx, rectPoly(x - 90, y - 60, 180, 140), rng, o);
  pencilPoly(ctx, rectPoly(x - 70, y - 45, 140, 70), rng, o);
}

function drawPatio(ctx: Ctx, rng: Rng, m: Mode): void {
  ctx.save();
  ctx.scale(RES, RES);
  if (m === 'paint') {
    ctx.fillStyle = '#e6d6b0';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }
  walls(ctx, rng, m);
  beds(ctx, rng, m);
  bugambilia(ctx, rng, m);
  doorAndWindow(ctx, rng, m);
  floor(ctx, rng, m);
  treeShadow(ctx, rng, m);
  decoPots(ctx, rng, m);
  paintPila(ctx, rng, m);
  zaguan(ctx, rng, m);
  ctx.restore();
}

function paintWater(ctx: Ctx, rng: Rng): void {
  drawPatio(ctx, rng, 'paint');
  grain(ctx, WORLD_W * RES, WORLD_H * RES, rng, 1.3, 1.2);
}

function paintPencil(ctx: Ctx, rng: Rng): void {
  const W = WORLD_W * RES;
  const H = WORLD_H * RES;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, rng, 1.4, 1.2);
  drawPatio(ctx, rng, 'pencil');
}

// ── Objetos altos (se ordenan con Iris por profundidad) ──

export interface PropDef {
  key: string;
  w: number;
  h: number;
  paint: (ctx: Ctx, rng: Rng, color: boolean) => void;
}

const PROPS: PropDef[] = [
  {
    key: 'limonero',
    w: 300,
    h: 320,
    paint: (ctx, rng, color) => {
      const trunk: Pt[] = [
        [140, 318],
        [160, 318],
        [168, 200],
        [150, 150],
        [132, 200],
      ];
      const canopy = [
        [150, 110, 110],
        [90, 140, 70],
        [215, 140, 75],
        [150, 60, 70],
      ];
      if (color) {
        wash(ctx, trunk, '#7a5a3a', rng, { layers: 6, alpha: 0.25, variance: 3 });
        for (const [x, y, r] of canopy)
          blot(ctx, x, y, r, rng.pick(['#4a8a3a', '#5a9a4a', '#3a7a3a']), rng, {
            layers: 8,
            alpha: 0.13,
          });
        for (let k = 0; k < 16; k++)
          blot(ctx, rng.range(60, 240), rng.range(50, 200), 8, '#f2d23a', rng, {
            layers: 3,
            alpha: 0.4,
          });
      } else {
        pencilPoly(ctx, trunk, rng, { color: GRAPHITE, alpha: 0.7 });
        for (const [x, y, r] of canopy)
          pencilEllipse(ctx, x, y, r, r * 0.8, rng, { color: GRAPHITE, alpha: 0.5 });
        for (let k = 0; k < 10; k++)
          pencilEllipse(ctx, rng.range(60, 240), rng.range(50, 200), 6, 7, rng, {
            color: GRAPHITE,
            alpha: 0.4,
            passes: 1,
          });
      }
    },
  },
  {
    key: 'tendedero',
    w: 440,
    h: 220,
    paint: (ctx, rng, color) => {
      const o = { color: GRAPHITE, alpha: 0.7, width: 1.6 };
      pencilLine(ctx, 20, 30, 20, 210, rng, o);
      pencilLine(ctx, 420, 30, 420, 210, rng, o);
      pencilStroke(
        ctx,
        [
          [20, 36],
          [220, 52],
          [420, 36],
        ],
        rng,
        { ...o, alpha: 0.5 },
      );
      const sheets: [number, string][] = [
        [60, '#f8f4ec'],
        [170, '#f0b8c8'],
        [290, '#b8d8f0'],
      ];
      for (const [x, c] of sheets) {
        const poly: Pt[] = [
          [x, 44],
          [x + 90, 48],
          [x + 86, 150 + rng.range(-8, 8)],
          [x + 4, 146 + rng.range(-8, 8)],
        ];
        if (color) wash(ctx, poly, c, rng, { layers: 6, alpha: 0.25, variance: 4 });
        pencilPoly(ctx, poly, rng, { ...o, alpha: color ? 0.35 : 0.6 });
        for (let k = 0; k < 3; k++)
          pencilLine(ctx, x + 20 + k * 25, 50, x + 18 + k * 25, 140, rng, { ...o, alpha: 0.2 });
      }
    },
  },
  {
    key: 'jaula',
    w: 80,
    h: 110,
    paint: (ctx, rng, color) => {
      const o = { color: GRAPHITE, alpha: 0.65, width: 1.4 };
      if (color) blot(ctx, 40, 70, 10, '#f2d23a', rng, { layers: 4, alpha: 0.4 });
      pencilLine(ctx, 40, 0, 40, 18, rng, o);
      pencilEllipse(ctx, 40, 30, 24, 12, rng, o);
      for (let k = 0; k < 6; k++)
        pencilLine(ctx, 18 + k * 9, 32, 18 + k * 9, 100, rng, { ...o, alpha: 0.5 });
      pencilLine(ctx, 14, 100, 66, 100, rng, o);
    },
  },
  {
    key: 'silla',
    w: 80,
    h: 110,
    paint: (ctx, rng, color) => {
      const seat: Pt[] = [
        [14, 60],
        [66, 60],
        [70, 72],
        [10, 72],
      ];
      if (color) {
        wash(ctx, rectPoly(14, 10, 52, 50), '#c89050', rng, { layers: 5, alpha: 0.2 });
        wash(ctx, seat, '#d8b060', rng, { layers: 5, alpha: 0.25 });
      }
      const o = { color: GRAPHITE, alpha: 0.6, width: 1.4 };
      pencilPoly(ctx, rectPoly(14, 10, 52, 50), rng, o);
      pencilPoly(ctx, seat, rng, o);
      pencilLine(ctx, 14, 72, 12, 108, rng, o);
      pencilLine(ctx, 66, 72, 68, 108, rng, o);
    },
  },
  {
    key: 'cantaros',
    w: 110,
    h: 80,
    paint: (ctx, rng, color) => {
      for (const [x, r] of [
        [34, 28],
        [80, 22],
      ]) {
        const body = deform(ellipsePoly(x, 50, r, r * 0.9, 12), 1, 2, rng);
        if (color) wash(ctx, body, '#c86a3a', rng, { layers: 6, alpha: 0.22, variance: 3 });
        pencilPoly(ctx, body, rng, { color: GRAPHITE, alpha: 0.6 });
        pencilEllipse(ctx, x, 50 - r * 0.9, r * 0.4, 5, rng, { color: GRAPHITE, alpha: 0.6 });
      }
    },
  },
];

/** Las macetas: seca (boceto) y florecida (acuarela). */
export type PlantKind = 'geranio' | 'helecho' | 'sabila';

function paintPot(ctx: Ctx, rng: Rng, kind: PlantKind, bloom: boolean): void {
  const o = { color: GRAPHITE, alpha: 0.65, width: 1.5 };
  // La maceta: un bote de lata (niña), barro (madre) o bote de nuevo (vieja)
  const pot: Pt[] =
    kind === 'helecho'
      ? [
          [22, 60],
          [58, 60],
          [52, 92],
          [28, 92],
        ]
      : rectPoly(24, 58, 32, 34);
  if (bloom) {
    wash(ctx, pot, kind === 'helecho' ? '#c86a3a' : '#a8b0b8', rng, {
      layers: 5,
      alpha: 0.28,
      variance: 2,
    });
    if (kind !== 'helecho')
      wash(ctx, rectPoly(26, 68, 28, 10), '#d9503a', rng, { layers: 3, alpha: 0.3, variance: 1 });
  }
  pencilPoly(ctx, pot, rng, o);
  if (!bloom) {
    // Planta seca: tallos caídos
    for (let k = 0; k < 4; k++) {
      pencilStroke(
        ctx,
        [
          [40, 58],
          [30 + k * 6, 40],
          [22 + k * 10, 44 + rng.range(-4, 6)],
        ],
        rng,
        { ...o, alpha: 0.45, passes: 1 },
      );
    }
    return;
  }
  switch (kind) {
    case 'geranio':
      for (let k = 0; k < 5; k++)
        blot(ctx, 40 + rng.range(-16, 16), 44 + rng.range(-14, 8), 11, '#5a9a4a', rng, {
          layers: 4,
          alpha: 0.25,
        });
      for (let k = 0; k < 6; k++)
        blot(
          ctx,
          40 + rng.range(-16, 16),
          30 + rng.range(-12, 8),
          7,
          rng.pick(['#e8303a', '#f05060']),
          rng,
          { layers: 4, alpha: 0.35 },
        );
      break;
    case 'helecho':
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI / 2 + (k - 3) * 0.38;
        wash(
          ctx,
          ellipsePoly(40 + Math.cos(a) * 20, 52 + Math.sin(a) * 26, 6, 20, 10, a + Math.PI / 2),
          '#4a9a4a',
          rng,
          {
            layers: 4,
            alpha: 0.28,
            variance: 2,
          },
        );
      }
      break;
    case 'sabila':
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (k - 2.5) * 0.3;
        wash(
          ctx,
          [
            [40, 58],
            [40 + Math.cos(a) * 34 - 3, 58 + Math.sin(a) * 40],
            [40 + Math.cos(a) * 36 + 3, 58 + Math.sin(a) * 42],
          ],
          '#6ab89a',
          rng,
          { layers: 4, alpha: 0.3, variance: 1 },
        );
      }
      blot(ctx, 40, 24, 6, '#f2a03a', rng, { layers: 3, alpha: 0.4 });
      break;
  }
}

/** Pinta todo lo del patio (idempotente). */
export function paintPatio(scene: Phaser.Scene): void {
  paintTexture(scene, 'patio-paint', WORLD_W * RES, WORLD_H * RES, (ctx) =>
    paintWater(ctx, new Rng('patio-acuarela')),
  );
  paintTexture(scene, 'patio-sketch', WORLD_W * RES, WORLD_H * RES, (ctx) =>
    paintPencil(ctx, new Rng('patio-lapiz')),
  );
  for (const p of PROPS) {
    paintTexture(scene, `${p.key}-sketch`, p.w, p.h, (ctx) => p.paint(ctx, new Rng(p.key), false));
    paintTexture(scene, `${p.key}-paint`, p.w, p.h, (ctx) => p.paint(ctx, new Rng(p.key), true));
  }
  for (const kind of ['geranio', 'helecho', 'sabila'] as PlantKind[]) {
    paintTexture(scene, `maceta-${kind}-seca`, 80, 96, (ctx) =>
      paintPot(ctx, new Rng(`maceta-${kind}`), kind, false),
    );
    paintTexture(scene, `maceta-${kind}-flor`, 80, 96, (ctx) =>
      paintPot(ctx, new Rng(`maceta-${kind}`), kind, true),
    );
  }
  // Pinceles para borrar el boceto: manchas irregulares de bordes suaves
  for (let k = 0; k < 3; k++) {
    paintTexture(scene, `wc-stamp-${k}`, 64, 64, (ctx) => {
      const rng = new Rng(`sello-${k}`);
      ctx.fillStyle = '#fff';
      const base = deform(ellipsePoly(32, 32, 20, 18, 10), 3, 5, rng);
      for (let l = 0; l < 8; l++) {
        ctx.globalAlpha = 0.22;
        fillPoly(ctx, deform(base, 2, 3, rng));
      }
      ctx.globalAlpha = 1;
      fillPoly(ctx, deform(ellipsePoly(32, 32, 13, 12, 10), 2, 3, rng));
    });
  }
  // Gota de agua
  paintTexture(scene, 'wc-drop', 16, 20, (ctx) => {
    const rng = new Rng('gota');
    const pts: Pt[] = [
      [8, 1],
      [14, 12],
      [8, 19],
      [2, 12],
    ];
    wash(ctx, pts, '#4a9ad8', rng, { layers: 4, alpha: 0.4, variance: 1 });
  });
  // Charquito que deja una gota
  paintTexture(scene, 'wc-puddle', 48, 26, (ctx) => {
    const rng = new Rng('charco');
    wash(ctx, ellipsePoly(24, 13, 18, 8, 12), '#7ab8e8', rng, {
      layers: 5,
      alpha: 0.18,
      variance: 3,
    });
  });
  // Luciérnaga en acuarela: un punto de luz con halo
  paintTexture(scene, 'wc-firefly', 40, 40, (ctx) => {
    const rng = new Rng('luciernaga-acuarela');
    blot(ctx, 20, 20, 14, '#f8e070', rng, { layers: 6, alpha: 0.18 });
    blot(ctx, 20, 20, 6, '#fff4b0', rng, { layers: 4, alpha: 0.4 });
  });
}
