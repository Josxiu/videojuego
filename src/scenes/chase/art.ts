import Phaser from 'phaser';
import { Rng } from '../../gfx/noise';
import {
  paintTexture,
  addFrames,
  crayonStroke,
  crayonPoly,
  crayonFill,
  scribble,
  rectPoly,
  ellipsePoly,
  grain,
  type Ctx,
  type Pt,
} from '../../gfx/brush';

/**
 * El arte de La Persecución: la casa de Tomás dibujada por Tomás.
 * Crayola sobre papel, perspectiva de niño, la noche coloreada a rayones.
 */

export const ROOM_W = 900;
export const ROOM_H = 540;
export const ROOMS = 4;
export const WORLD_W = ROOM_W * ROOMS;
export const FLOOR_Y = 470;

const KID = (px: number) => `${px}px "Gochi Hand"`;

export const CRAYON_COLORS = ['#e8433a', '#ff9a2a', '#ffd23a', '#4ac05a', '#3a7ae8', '#9a5ad8'];
const INK = '#2b2340';
const NIGHT = '#1f2560';

/** Herramientas de crayola atadas a un contexto y una semilla. */
function kit(ctx: Ctx, rng: Rng) {
  return {
    line(pts: Pt[], color = INK, width = 4) {
      crayonStroke(ctx, pts, rng, { color, width });
    },
    outline(poly: Pt[], color = INK, width = 4) {
      crayonPoly(ctx, poly, rng, { color, width });
    },
    fill(poly: Pt[], color: string, coverage = 0.85, alpha = 0.8) {
      crayonFill(ctx, poly, color, rng, { coverage, alpha });
    },
    box(x: number, y: number, w: number, h: number, fill?: string, line = INK, width = 4) {
      const poly = rectPoly(x, y, w, h);
      if (fill) crayonFill(ctx, poly, fill, rng, { coverage: 0.85, alpha: 0.85 });
      crayonPoly(ctx, poly, rng, { color: line, width });
    },
    circle(cx: number, cy: number, r: number, fill?: string, line = INK, width = 4) {
      const poly = ellipsePoly(cx, cy, r, r, 18);
      if (fill) crayonFill(ctx, poly, fill, rng, { coverage: 0.9, alpha: 0.85 });
      crayonPoly(ctx, poly, rng, { color: line, width });
    },
    text(str: string, x: number, y: number, color: string, size = 30, angle = 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.font = KID(size);
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(str, 0, 0);
      ctx.restore();
    },
  };
}

function star(cx: number, cy: number, r: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([
      cx + Math.cos(a) * (i % 2 ? r * 0.45 : r),
      cy + Math.sin(a) * (i % 2 ? r * 0.45 : r),
    ]);
  }
  return pts;
}

/** Papel con la noche coloreada encima, a rayones que no llegan a cubrir todo. */
function nightPaper(ctx: Ctx, w: number, h: number, rng: Rng): void {
  ctx.fillStyle = '#fffdf6';
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h, rng, 1.2, 1);
  crayonFill(ctx, rectPoly(-10, -10, w + 20, h + 20), NIGHT, rng, {
    coverage: 0.97,
    alpha: 0.9,
    spacing: 3,
    width: 3.4,
  });
  crayonFill(ctx, rectPoly(-10, -10, w + 20, h + 20), '#2a1f5a', rng, {
    coverage: 0.5,
    alpha: 0.5,
    spacing: 5,
    angle: 0.7,
  });
}

function floorBand(ctx: Ctx, rng: Rng, w: number, color: string): void {
  const k = kit(ctx, rng);
  k.fill(rectPoly(0, FLOOR_Y, w, ROOM_H - FLOOR_Y), color, 0.9, 0.85);
  k.line(
    [
      [-4, FLOOR_Y],
      [w + 4, FLOOR_Y + rng.range(-3, 3)],
    ],
    INK,
    5,
  );
  for (let x = rng.range(20, 80); x < w; x += rng.range(90, 150)) {
    k.line(
      [
        [x, FLOOR_Y + 6],
        [x - 10, ROOM_H],
      ],
      'rgba(40,20,10,0.5)',
      2,
    );
  }
}

type RoomPainter = (ctx: Ctx, rng: Rng) => void;

const PAINT_ROOMS: RoomPainter[] = [
  // 0 · El cuarto de Tomás
  (ctx, rng) => {
    const k = kit(ctx, rng);
    k.fill(rectPoly(0, 30, ROOM_W, FLOOR_Y - 30), '#4a6ad8', 0.55, 0.55);
    // Ventana con luna y estrellas
    k.box(110, 80, 200, 170, '#141440');
    k.circle(210, 150, 40, '#ffd23a', '#c89a1a');
    k.fill(ellipsePoly(228, 140, 34, 34, 16), '#141440', 0.95, 0.95);
    for (const [x, y] of [
      [140, 110],
      [280, 220],
      [150, 225],
      [285, 105],
    ])
      k.fill(star(x, y, 10), '#ffe27a', 1, 0.9);
    k.line(
      [
        [210, 80],
        [210, 250],
      ],
      INK,
      5,
    );
    k.line(
      [
        [110, 165],
        [310, 165],
      ],
      INK,
      5,
    );
    // Dibujos pegados en la pared: dinosaurio, casa, familia
    k.box(560, 90, 90, 80, '#fffdf6', INK, 3);
    k.fill(ellipsePoly(605, 135, 28, 16, 12), '#4ac05a', 1, 0.9);
    k.line(
      [
        [625, 128],
        [640, 105],
        [648, 110],
      ],
      '#4ac05a',
      5,
    );
    k.box(670, 80, 90, 90, '#fffdf6', INK, 3);
    k.fill(
      [
        [680, 125],
        [715, 92],
        [750, 125],
      ],
      '#e8433a',
      1,
      0.9,
    );
    k.box(690, 125, 50, 36, '#ffd23a', INK, 3);
    k.box(780, 100, 90, 80, '#fffdf6', INK, 3);
    for (const x of [800, 825, 850]) {
      k.circle(x, 120, 7, undefined, INK, 2.5);
      k.line(
        [
          [x, 127],
          [x, 150],
          [x - 6, 165],
        ],
        INK,
        2.5,
      );
    }
    // Repisa con juguetes
    k.line(
      [
        [560, 250],
        [860, 252],
      ],
      '#8a5a2a',
      6,
    );
    k.box(590, 205, 34, 44, '#9a9aa8');
    k.circle(700, 232, 18, '#e8433a');
    k.fill(star(790, 225, 22), '#ffd23a', 1, 0.9);
    // Cama con cobija de cohetes
    k.box(360, 300, 30, 170, '#8a5a2a');
    k.box(380, 380, 320, 70, '#3a7ae8');
    for (const x of [430, 520, 610]) {
      k.fill(
        [
          [x, 440],
          [x + 14, 395],
          [x + 28, 440],
        ],
        '#ffd23a',
        1,
        0.95,
      );
      k.fill(
        [
          [x + 6, 440],
          [x + 14, 458],
          [x + 22, 440],
        ],
        '#ff9a2a',
        1,
        0.95,
      );
    }
    k.box(390, 355, 80, 30, '#fffdf6');
    k.box(680, 400, 22, 70, '#8a5a2a');
    k.text('TOMÁS', 530, 60, '#ffd23a', 34, -0.05);
    floorBand(ctx, rng, ROOM_W, '#8a5a3a');
  },
  // 1 · El pasillo
  (ctx, rng) => {
    const k = kit(ctx, rng);
    k.fill(rectPoly(0, 30, ROOM_W, FLOOR_Y - 30), '#d85a8a', 0.5, 0.5);
    // Fotos de familia: monitos
    const photos: [number, string, string][] = [
      [70, 'MAMÁ', '#ff9a2a'],
      [260, 'YO', '#4ac05a'],
      [470, 'ABUE', '#9a5ad8'],
      [680, 'PANCHO', '#ffd23a'],
    ];
    for (const [x, name, col] of photos) {
      k.box(x, 90, 120, 120, '#fffdf6', col, 5);
      k.circle(x + 60, 130, 16, '#f0c09a', INK, 3);
      k.line(
        [
          [x + 60, 146],
          [x + 60, 180],
        ],
        INK,
        3,
      );
      k.line(
        [
          [x + 40, 160],
          [x + 80, 160],
        ],
        INK,
        3,
      );
      k.text(name, x + 60, 205, INK, 20);
    }
    // Perchero con abrigos
    k.line(
      [
        [860, 470],
        [860, 240],
      ],
      '#8a5a2a',
      7,
    );
    k.fill(rectPoly(820, 260, 36, 110), '#3a7ae8', 1, 0.85);
    // Tapete de rayas
    floorBand(ctx, rng, ROOM_W, '#8a5a3a');
    for (let i = 0; i < 6; i++)
      k.fill(rectPoly(200 + i * 80, FLOOR_Y + 14, 80, 34), CRAYON_COLORS[i], 0.8, 0.55);
  },
  // 2 · La sala
  (ctx, rng) => {
    const k = kit(ctx, rng);
    k.fill(rectPoly(0, 30, ROOM_W, FLOOR_Y - 30), '#4ac05a', 0.45, 0.5);
    // Ventana grande
    k.box(80, 70, 260, 200, '#141440');
    for (const [x, y] of [
      [120, 110],
      [300, 130],
      [200, 230],
      [260, 90],
    ])
      k.fill(star(x, y, 9), '#ffe27a', 1, 0.9);
    // Cuadro de montañas
    k.box(430, 90, 180, 110, '#fffdf6', '#ff9a2a', 5);
    k.fill(
      [
        [440, 190],
        [500, 120],
        [560, 190],
      ],
      '#3a7ae8',
      1,
      0.8,
    );
    k.fill(
      [
        [520, 190],
        [570, 140],
        [600, 190],
      ],
      '#4ac05a',
      1,
      0.8,
    );
    k.circle(580, 115, 12, '#ffd23a');
    // Tele
    k.box(660, 280, 170, 120, '#555566');
    k.box(680, 296, 130, 88, '#9ad8ff');
    k.line(
      [
        [745, 280],
        [715, 230],
      ],
      INK,
      3,
    );
    k.line(
      [
        [745, 280],
        [785, 235],
      ],
      INK,
      3,
    );
    k.box(690, 400, 110, 70, '#8a5a2a');
    // Lámpara de pie apagada
    k.line(
      [
        [420, 470],
        [420, 290],
      ],
      INK,
      5,
    );
    k.fill(
      [
        [385, 290],
        [455, 290],
        [440, 250],
        [400, 250],
      ],
      '#ffd23a',
      0.8,
      0.6,
    );
    floorBand(ctx, rng, ROOM_W, '#6a4a2a');
  },
  // 3 · La cocina y la puerta
  (ctx, rng) => {
    const k = kit(ctx, rng);
    k.fill(rectPoly(0, 30, ROOM_W, FLOOR_Y - 30), '#ffd23a', 0.45, 0.5);
    // Refri con imanes y un dibujo
    k.box(60, 180, 140, 290, '#fffdf6');
    k.line(
      [
        [60, 290],
        [200, 290],
      ],
      INK,
      4,
    );
    k.circle(90, 220, 8, '#e8433a');
    k.circle(170, 240, 8, '#4ac05a');
    k.box(110, 310, 60, 60, '#fffdf6', '#3a7ae8', 3);
    // Estufa y barra
    k.box(230, 330, 170, 140, '#9a9aa8');
    for (const x of [270, 360]) k.circle(x, 345, 16, '#555566');
    k.box(400, 330, 220, 140, '#d8a060');
    // Reloj de pared
    k.circle(520, 140, 42, '#fffdf6');
    k.line(
      [
        [520, 140],
        [520, 110],
      ],
      INK,
      4,
    );
    k.line(
      [
        [520, 140],
        [540, 150],
      ],
      INK,
      4,
    );
    k.text('3', 520, 176, INK, 18);
    // Marco de la puerta de la entrada (la puerta es aparte)
    k.box(700, 110, 170, 360, '#141440', INK, 6);
    k.text('2A', 785, 100, '#fffdf6', 30);
    floorBand(ctx, rng, ROOM_W, '#8a5a3a');
  },
];

/** Pinta los cuatro cuartos. */
export function paintRooms(scene: Phaser.Scene): void {
  PAINT_ROOMS.forEach((paint, i) => {
    paintTexture(scene, `chase-room-${i}`, ROOM_W, ROOM_H, (ctx, w, h) => {
      const rng = new Rng(`cuarto-${i}`);
      nightPaper(ctx, w, h, rng);
      paint(ctx, rng);
    });
  });
}

// ── Escondites (cambian de lugar en cada intento) ──

export type HideKind = 'toybox' | 'armario' | 'canasta' | 'sofa' | 'cortina' | 'mesa';

export const HIDE_SIZE: Record<HideKind, [number, number]> = {
  toybox: [140, 100],
  armario: [140, 250],
  canasta: [110, 90],
  sofa: [220, 120],
  cortina: [110, 330],
  mesa: [200, 120],
};

export function paintHiding(scene: Phaser.Scene): void {
  const make = (key: HideKind, draw: (k: ReturnType<typeof kit>, w: number, h: number) => void) => {
    const [w, h] = HIDE_SIZE[key];
    paintTexture(scene, `hide-${key}`, w + 20, h + 20, (ctx) => {
      ctx.translate(10, 10);
      draw(kit(ctx, new Rng(`escondite-${key}`)), w, h);
    });
  };
  make('toybox', (k, w, h) => {
    k.box(0, 20, w, h - 20, '#e8433a');
    k.box(-4, 8, w + 8, 20, '#ff9a2a');
    k.text('JUGUETES', w / 2, 70, '#fffdf6', 22);
  });
  make('armario', (k, w, h) => {
    k.box(0, 0, w, h, '#8a5a2a');
    k.line(
      [
        [w / 2, 6],
        [w / 2, h - 6],
      ],
      INK,
      4,
    );
    k.circle(w / 2 - 12, h / 2, 6, '#ffd23a');
    k.circle(w / 2 + 12, h / 2, 6, '#ffd23a');
  });
  make('canasta', (k, w, h) => {
    k.fill(
      [
        [0, 10],
        [w, 10],
        [w - 12, h],
        [12, h],
      ],
      '#d8a060',
    );
    for (let y = 26; y < h; y += 18)
      k.line(
        [
          [4, y],
          [w - 4, y],
        ],
        '#8a5a2a',
        3,
      );
    k.fill(ellipsePoly(w / 2, 12, w / 2 - 6, 14, 14), '#3a7ae8', 0.9, 0.9);
  });
  make('sofa', (k, w) => {
    k.box(0, 20, w, 60, '#9a5ad8');
    k.box(0, 60, w, 50, '#7a3ab8');
    k.box(-6, 40, 30, 70, '#9a5ad8');
    k.box(w - 24, 40, 30, 70, '#9a5ad8');
  });
  make('cortina', (k, w, h) => {
    k.line(
      [
        [-6, 4],
        [w + 6, 4],
      ],
      INK,
      6,
    );
    k.fill(
      [
        [0, 6],
        [w, 6],
        [w - 10, h],
        [4, h],
      ],
      '#e8433a',
      0.9,
      0.85,
    );
    for (let x = 20; x < w; x += 24)
      k.line(
        [
          [x, 10],
          [x - 4, h - 4],
        ],
        '#a02a2a',
        3,
      );
  });
  make('mesa', (k, w, h) => {
    k.fill(
      [
        [-6, 10],
        [w + 6, 10],
        [w - 6, 70],
        [6, 70],
      ],
      '#fffdf6',
    );
    for (let x = 0; x < w; x += 22) k.box(x, 12, 11, 11, '#e8433a', '#e8433a', 1);
    k.line(
      [
        [-6, 10],
        [w + 6, 10],
      ],
      INK,
      4,
    );
    k.line(
      [
        [20, 70],
        [20, h],
      ],
      '#8a5a2a',
      6,
    );
    k.line(
      [
        [w - 20, 70],
        [w - 20, h],
      ],
      '#8a5a2a',
      6,
    );
  });
}

// ── La Sombra: garabato negro con la silueta de Iris, más grande ──

export const SHADOW_W = 190;
export const SHADOW_H = 270;

export function paintShadow(scene: Phaser.Scene): void {
  if (scene.textures.exists('chase-shadow')) return;
  // Silueta: Iris de frente (cuadro 10), agrandada y suavizada
  const src = scene.textures.get('iris');
  const frame = src.get('10');
  const img = src.getSourceImage() as HTMLCanvasElement;
  const mask = document.createElement('canvas');
  mask.width = SHADOW_W;
  mask.height = SHADOW_H;
  const mctx = mask.getContext('2d');
  if (!mctx) return;
  mctx.imageSmoothingEnabled = true;
  mctx.drawImage(
    img,
    frame.cutX,
    frame.cutY,
    frame.cutWidth,
    frame.cutHeight,
    10,
    4,
    SHADOW_W - 20,
    SHADOW_H - 8,
  );
  const FRAMES = 4;
  paintTexture(scene, 'chase-shadow', SHADOW_W * FRAMES, SHADOW_H, (ctx) => {
    for (let f = 0; f < FRAMES; f++) {
      const rng = new Rng(`sombra-${f}`);
      const tmp = document.createElement('canvas');
      tmp.width = SHADOW_W;
      tmp.height = SHADOW_H;
      const t = tmp.getContext('2d');
      if (!t) continue;
      // Relleno de garabatos dentro de la silueta
      for (let pass = 0; pass < 3; pass++) {
        scribble(t, SHADOW_W / 2, SHADOW_H / 2, SHADOW_W * 0.55, SHADOW_H * 0.55, rng, {
          color: pass === 1 ? '#2a1f4a' : '#0c0a14',
          loops: 70,
          width: 3.2,
          alpha: 0.9,
        });
      }
      t.globalCompositeOperation = 'destination-in';
      t.drawImage(mask, 0, 0);
      t.globalCompositeOperation = 'source-over';
      // Rulos que se salen del contorno: la sombra no tiene borde fijo
      for (let k = 0; k < 7; k++) {
        const a = rng.range(0, Math.PI * 2);
        scribble(
          t,
          SHADOW_W / 2 + Math.cos(a) * 70,
          SHADOW_H / 2 + Math.sin(a) * 110,
          18,
          14,
          rng,
          {
            color: '#0c0a14',
            loops: 3,
            width: 2.4,
            alpha: 0.8,
          },
        );
      }
      // Ojos rojos (donde Iris tiene los suyos) y boca de dientes
      const ex = (SHADOW_W - 20) / 16;
      const ey = (SHADOW_H - 8) / 24;
      for (const col of [5, 10]) {
        crayonFill(
          t,
          ellipsePoly(10 + (col + 0.5) * ex, 4 + 9.7 * ey, 11, 14, 12),
          '#ff3b3b',
          rng,
          { coverage: 1, alpha: 1 },
        );
        crayonFill(t, ellipsePoly(10 + (col + 0.5) * ex, 4 + 9.7 * ey, 4, 5, 8), '#ffe27a', rng, {
          coverage: 1,
          alpha: 1,
        });
      }
      const my = 4 + 12.4 * ey;
      t.fillStyle = '#fffdf6';
      for (let k = 0; k < 6; k++) {
        const x = 62 + k * 11;
        t.beginPath();
        t.moveTo(x, my);
        t.lineTo(x + 11, my);
        t.lineTo(x + 5.5, my + 12 + (k % 2) * 4);
        t.fill();
      }
      ctx.drawImage(tmp, f * SHADOW_W, 0);
    }
  });
  addFrames(
    scene,
    'chase-shadow',
    Array.from({ length: FRAMES }, (_, i) => ({
      name: String(i),
      x: i * SHADOW_W,
      y: 0,
      w: SHADOW_W,
      h: SHADOW_H,
    })),
  );
  if (!scene.anims.exists('chase-shadow-boil')) {
    scene.anims.create({
      key: 'chase-shadow-boil',
      frames: [0, 1, 2, 3].map((i) => ({ key: 'chase-shadow', frame: String(i) })),
      frameRate: 8,
      repeat: -1,
    });
  }
}

// ── Cosas pequeñas ──

export function paintChaseProps(scene: Phaser.Scene): void {
  // Crayolas (una por color): las luciérnagas de esta pesadilla
  CRAYON_COLORS.forEach((c, i) => {
    paintTexture(scene, `chase-crayon-${i}`, 60, 24, (ctx) => {
      const rng = new Rng(`crayola-${i}`);
      const k = kit(ctx, rng);
      k.fill(rectPoly(10, 6, 38, 12), c, 1, 1);
      k.fill(
        [
          [48, 6],
          [58, 12],
          [48, 18],
        ],
        c,
        1,
        1,
      );
      k.fill(rectPoly(18, 6, 16, 12), '#fffdf6', 1, 0.6);
      k.outline(rectPoly(10, 6, 38, 12), INK, 2);
    });
  });
  // Lamparita enchufada y su charco de luz
  paintTexture(scene, 'chase-nightlight', 40, 40, (ctx) => {
    const k = kit(ctx, new Rng('lamparita'));
    k.box(8, 12, 24, 18, '#fffdf6');
    k.circle(20, 20, 8, '#ffd23a');
  });
  paintTexture(scene, 'chase-light', 300, 240, (ctx) => {
    const rng = new Rng('luz');
    const g = ctx.createRadialGradient(150, 120, 10, 150, 120, 150);
    g.addColorStop(0, 'rgba(255,226,122,0.55)');
    g.addColorStop(1, 'rgba(255,226,122,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 300, 240);
    crayonFill(ctx, ellipsePoly(150, 130, 120, 100, 20), '#ffe27a', rng, {
      coverage: 0.5,
      alpha: 0.35,
      spacing: 5,
    });
  });
  // Huella de crayola
  paintTexture(scene, 'chase-step', 22, 12, (ctx) => {
    const k = kit(ctx, new Rng('huella'));
    k.fill(ellipsePoly(9, 6, 8, 4, 10), '#9a8ab8', 1, 0.7);
    k.circle(18, 4, 2, '#9a8ab8', '#9a8ab8', 1);
  });
  // Ojo rojo: marca de escondite aprendido
  paintTexture(scene, 'chase-eye', 60, 36, (ctx) => {
    const rng = new Rng('ojo');
    const k = kit(ctx, rng);
    k.fill(ellipsePoly(30, 18, 26, 14, 16), '#fffdf6', 1, 0.9);
    k.fill(ellipsePoly(30, 18, 10, 12, 12), '#e8433a', 1, 1);
    k.outline(ellipsePoly(30, 18, 26, 14, 16), '#e8433a', 3);
  });
  // La puerta de la entrada
  paintTexture(scene, 'chase-door', 150, 350, (ctx) => {
    const k = kit(ctx, new Rng('puerta-2a'));
    k.box(6, 6, 138, 338, '#8a5a2a');
    k.box(26, 30, 98, 110, '#a0703a');
    k.box(26, 170, 98, 150, '#a0703a');
    k.circle(120, 190, 8, '#ffd23a');
  });
  // Los dos dibujos de Tomás: la vecina que da miedo y la vecina corregida
  const drawing = (key: string, nice: boolean) =>
    paintTexture(scene, key, 170, 210, (ctx) => {
      const rng = new Rng(key);
      const k = kit(ctx, rng);
      ctx.fillStyle = '#fffdf6';
      ctx.fillRect(4, 4, 162, 202);
      k.outline(rectPoly(4, 4, 162, 202), '#b8b0a0', 2);
      // Pelo en melena con su mechón (es Iris)
      k.fill(ellipsePoly(85, 70, 50, 46, 16), '#3bbfae', 1, 0.95);
      k.line(
        [
          [85, 26],
          [90, 10],
          [96, 20],
        ],
        '#3bbfae',
        5,
      );
      k.fill(ellipsePoly(85, 84, 34, 32, 16), '#f0c09a', 1, 0.95);
      k.fill(rectPoly(55, 116, 60, 70), '#b79ce8', 1, 0.95);
      k.line(
        [
          [55, 130],
          [25, 110],
        ],
        '#b79ce8',
        6,
      );
      k.line(
        [
          [115, 130],
          [145, 110],
        ],
        '#b79ce8',
        6,
      );
      if (nice) {
        k.circle(72, 80, 4, INK, INK, 2);
        k.circle(98, 80, 4, INK, INK, 2);
        k.line(
          [
            [70, 98],
            [85, 106],
            [100, 98],
          ],
          '#e8433a',
          4,
        );
        k.text('LA BESINA DEL 3', 85, 200, '#3a7ae8', 20, -0.04);
        k.fill(star(145, 30, 12), '#ffd23a', 1, 1);
      } else {
        k.circle(72, 80, 7, '#ff3b3b', '#ff3b3b', 2);
        k.circle(98, 80, 7, '#ff3b3b', '#ff3b3b', 2);
        k.line(
          [
            [66, 100],
            [104, 100],
          ],
          INK,
          4,
        );
        for (let x = 68; x < 104; x += 8)
          k.line(
            [
              [x, 100],
              [x + 4, 108],
            ],
            INK,
            3,
          );
        scribble(ctx, 85, 110, 80, 100, rng, {
          color: '#0c0a14',
          loops: 14,
          width: 2.5,
          alpha: 0.6,
        });
      }
    });
  drawing('chase-drawing-scary', false);
  drawing('chase-drawing-nice', true);
  // Viñeta que respira con el miedo
  paintTexture(scene, 'chase-vignette', 320, 320, (ctx) => {
    const g = ctx.createRadialGradient(160, 160, 60, 160, 160, 160);
    g.addColorStop(0, 'rgba(10,8,20,0)');
    g.addColorStop(1, 'rgba(10,8,20,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 320, 320);
  });
}
