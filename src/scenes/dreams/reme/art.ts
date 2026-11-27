/**
 * Puntillismo: la finca de Reme se dibuja primero en colores planos (el
 * «mundo verdadero») y luego se reconstruye con puntos. Hay dos versiones:
 * la nítida (puntos chicos y densos, la que se ve bajo la lupa) y la que ve
 * Reme (puntos grandes, ralos y corridos).
 */
import { addTexture, css, fbm, jitter, makeCanvas, noise2D, rng } from '../../../gfx/canvas';

export type Painter = (ctx: CanvasRenderingContext2D) => void;

const CANVAS_BG = 0xf1e6cf;

/** Convierte un dibujo plano en puntos. `blur` = la vista de Reme. */
export function pointillize(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  paint: Painter,
  blur: boolean,
  seed = 1,
  bg = true,
): string {
  const [tc, tctx] = makeCanvas(w, h);
  paint(tctx);
  const data = tctx.getImageData(0, 0, w, h).data;
  const [c, ctx] = makeCanvas(w, h);
  if (bg) {
    ctx.fillStyle = css(CANVAS_BG);
    ctx.fillRect(0, 0, w, h);
  }
  const r = rng(seed);
  const n = noise2D(seed + 3);
  const small = Math.min(w, h) < 200;
  const count = blur ? Math.floor(w * h * (small ? 0.014 : 0.011)) : Math.floor(w * h * 0.11);
  const disp = Math.min(32, Math.min(w, h) * 0.3);
  for (let i = 0; i < count; i++) {
    const x = r() * w;
    const y = r() * h;
    // la vista de Reme: el color viene de un poco más allá
    const ox = blur ? (fbm(n, x / 70, y / 70, 3) - 0.5) * disp : 0;
    const oy = blur ? (fbm(n, y / 70 + 9, x / 70, 3) - 0.5) * disp : 0;
    const sx = Math.max(0, Math.min(w - 1, Math.floor(x + ox)));
    const sy = Math.max(0, Math.min(h - 1, Math.floor(y + oy)));
    const idx = (sy * w + sx) * 4;
    if (data[idx + 3] < 100) continue;
    const col = (data[idx] << 16) | (data[idx + 1] << 8) | data[idx + 2];
    ctx.fillStyle = css(jitter(col, blur ? 26 : 34, r), blur ? 0.8 : 1);
    ctx.beginPath();
    const rad = blur ? (small ? 3 : 4) + r() * (small ? 3 : 5) : 1.4 + r() * 1.5;
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  void tc;
  return addTexture(scene, key, c);
}

// ---------------- Dibujos planos ----------------

const rect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
) => {
  ctx.fillStyle = css(c);
  ctx.fillRect(x, y, w, h);
};
const ell = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  c: number,
) => {
  ctx.fillStyle = css(c);
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
};

/** Cocina de la finca (sin los objetos que se recogen). */
export const paintKitchen: Painter = (ctx) => {
  const W = 960;
  // pared de tapia encalada con manchas ocre
  rect(ctx, 0, 0, W, 470, 0xefe4cc);
  const n = noise2D(4);
  for (let y = 0; y < 470; y += 6) {
    for (let x = 0; x < W; x += 6) {
      const v = fbm(n, x / 90, y / 90, 3);
      if (v > 0.55) rect(ctx, x, y, 6, 6, v > 0.63 ? 0xc9a46a : 0xdcc49a);
    }
  }
  // vigas
  rect(ctx, 0, 0, W, 34, 0x5a3a22);
  for (let x = 40; x < W; x += 160) rect(ctx, x, 0, 26, 44, 0x4a2e1a);
  // ventana al páramo
  rect(ctx, 290, 80, 240, 180, 0x5a3a22);
  const g = ctx.createLinearGradient(0, 90, 0, 250);
  g.addColorStop(0, '#9cc3d9');
  g.addColorStop(1, '#d9e6e0');
  ctx.fillStyle = g;
  ctx.fillRect(302, 92, 216, 156);
  ctx.fillStyle = css(0x5f8a5a);
  ctx.beginPath();
  ctx.moveTo(302, 200);
  ctx.quadraticCurveTo(380, 150, 440, 190);
  ctx.quadraticCurveTo(480, 170, 518, 186);
  ctx.lineTo(518, 248);
  ctx.lineTo(302, 248);
  ctx.fill();
  ctx.fillStyle = css(0x3f6a45);
  ctx.beginPath();
  ctx.moveTo(302, 230);
  ctx.quadraticCurveTo(410, 200, 518, 226);
  ctx.lineTo(518, 248);
  ctx.lineTo(302, 248);
  ctx.fill();
  // frailejones
  for (const [fx, fy] of [
    [340, 228],
    [470, 214],
    [500, 232],
  ]) {
    rect(ctx, fx - 2, fy, 4, 18, 0x6a5a3a);
    ell(ctx, fx, fy, 9, 7, 0x9aa86a);
  }
  rect(ctx, 406, 92, 8, 156, 0x5a3a22);
  rect(ctx, 302, 166, 216, 6, 0x5a3a22);
  // repisa
  rect(ctx, 560, 270, 360, 14, 0x6a4428);
  rect(ctx, 580, 284, 10, 24, 0x4a2e1a);
  rect(ctx, 890, 284, 10, 24, 0x4a2e1a);
  // fogón de ladrillo
  rect(ctx, 50, 340, 230, 130, 0xa4502e);
  for (let y = 346; y < 470; y += 18)
    for (let x = 54 + ((y / 18) % 2) * 12; x < 276; x += 26) rect(ctx, x, y, 22, 14, 0xb85a34);
  rect(ctx, 40, 330, 250, 14, 0x6a3a22);
  ell(ctx, 165, 410, 34, 22, 0x2a1a12);
  ell(ctx, 165, 414, 22, 12, 0xf08a2a);
  ell(ctx, 165, 416, 12, 6, 0xffd23f);
  // mesa
  rect(ctx, 370, 380, 320, 18, 0x7a4a2a);
  rect(ctx, 390, 398, 14, 110, 0x5a3420);
  rect(ctx, 656, 398, 14, 110, 0x5a3420);
  // mantel
  ctx.fillStyle = css(0xc8443a);
  ctx.beginPath();
  ctx.moveTo(380, 378);
  ctx.lineTo(680, 378);
  ctx.lineTo(670, 410);
  ctx.lineTo(390, 410);
  ctx.fill();
  for (let x = 390; x < 670; x += 20) rect(ctx, x, 384, 10, 22, 0xe8d8b8);
  // puerta
  rect(ctx, 860, 110, 92, 360, 0x4a6a8a);
  rect(ctx, 870, 120, 72, 150, 0x5a7a9a);
  rect(ctx, 870, 290, 72, 170, 0x5a7a9a);
  ell(ctx, 872, 300, 5, 5, 0xd9b45a);
  // clavo de las llaves
  ell(ctx, 830, 296, 3, 3, 0x2a2a2a);
  // piso de baldosa
  rect(ctx, 0, 470, W, 70, 0xb0583a);
  for (let x = 0; x < W; x += 48) rect(ctx, x, 470, 2, 70, 0x8a3a22);
  rect(ctx, 0, 500, W, 2, 0x8a3a22);
};

/** Patio de la finca: tapia, cerca, geranios, portón y páramo. */
export const paintPatio: Painter = (ctx) => {
  const W = 960;
  const g = ctx.createLinearGradient(0, 0, 0, 220);
  g.addColorStop(0, '#8fb8d6');
  g.addColorStop(1, '#e3ece6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 240);
  // nubes
  for (const [x, y, s] of [
    [160, 60, 1],
    [520, 40, 1.4],
    [800, 80, 0.9],
  ]) {
    ell(ctx, x, y, 60 * s, 18 * s, 0xf6f4ee);
    ell(ctx, x + 40 * s, y - 10, 40 * s, 16 * s, 0xf6f4ee);
  }
  // cerros
  ctx.fillStyle = css(0x6a8f78);
  ctx.beginPath();
  ctx.moveTo(0, 230);
  for (let x = 0; x <= W; x += 20)
    ctx.lineTo(x, 170 + Math.sin(x / 110) * 26 + Math.sin(x / 37) * 8);
  ctx.lineTo(W, 260);
  ctx.lineTo(0, 260);
  ctx.fill();
  ctx.fillStyle = css(0x4f7a5a);
  ctx.beginPath();
  ctx.moveTo(0, 250);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 214 + Math.sin(x / 80 + 2) * 16);
  ctx.lineTo(W, 270);
  ctx.lineTo(0, 270);
  ctx.fill();
  // tapia con teja
  rect(ctx, 0, 240, 520, 100, 0xe8dcc0);
  rect(ctx, 0, 228, 530, 16, 0xb0503a);
  for (let x = 0; x < 530; x += 22) ell(ctx, x + 11, 236, 11, 8, 0xc25a3e);
  // pasto
  rect(ctx, 0, 330, W, 210, 0x6f9a4a);
  const n = noise2D(8);
  for (let y = 330; y < 540; y += 6) {
    for (let x = 0; x < W; x += 6) {
      const v = fbm(n, x / 60, y / 60, 3);
      if (v > 0.58) rect(ctx, x, y, 6, 6, 0x5a8a3c);
      else if (v < 0.36) rect(ctx, x, y, 6, 6, 0x8ab05a);
    }
  }
  // geranios en materas
  for (const mx of [70, 160, 250, 340]) {
    rect(ctx, mx - 22, 300, 44, 40, 0xb0583a);
    ell(ctx, mx, 290, 30, 20, 0x3f7a3a);
    for (let k = 0; k < 5; k++)
      ell(ctx, mx - 18 + k * 9, 280 + (k % 2) * 8, 6, 6, k % 2 ? 0xe23a5a : 0xff6a8a);
  }
  // cerca de palos
  for (let x = 540; x < 900; x += 40) rect(ctx, x, 300, 10, 110, 0x7a5a3a);
  rect(ctx, 540, 320, 360, 8, 0x8a6a4a);
  rect(ctx, 540, 370, 360, 8, 0x8a6a4a);
  // portón
  rect(ctx, 896, 250, 64, 230, 0x6a4428);
  for (let y = 262; y < 470; y += 30) rect(ctx, 900, y, 56, 6, 0x8a5a34);
  // camino de piedra
  for (let i = 0; i < 9; i++) ell(ctx, 560 + i * 44, 480 + Math.sin(i) * 10, 18, 9, 0xc8bca0);
};

/** Mar al amanecer (lo último que Reme encuentra). */
export const paintSea: Painter = (ctx) => {
  const W = 960;
  const g = ctx.createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, '#f6b8a8');
  g.addColorStop(0.6, '#ffe2a8');
  g.addColorStop(1, '#fff3d0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 300);
  ell(ctx, 640, 290, 60, 60, 0xffd76a);
  const s = ctx.createLinearGradient(0, 290, 0, 540);
  s.addColorStop(0, '#5fa8c8');
  s.addColorStop(1, '#1f5a8a');
  ctx.fillStyle = s;
  ctx.fillRect(0, 290, W, 250);
  for (let y = 300; y < 540; y += 14) {
    for (let x = (y * 7) % 40; x < W; x += 60) rect(ctx, x, y, 30, 3, 0xbfe6f0);
  }
  ctx.fillStyle = css(0xffe7a0);
  ctx.beginPath();
  ctx.moveTo(600, 300);
  ctx.lineTo(680, 300);
  ctx.lineTo(760, 540);
  ctx.lineTo(520, 540);
  ctx.fill();
};

// ---------------- Objetos ----------------

export interface ItemDef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  paint: Painter;
}

export const KITCHEN_ITEMS: ItemDef[] = [
  {
    id: 'olla',
    x: 165,
    y: 312,
    w: 110,
    h: 70,
    paint: (c) => {
      ell(c, 55, 42, 50, 28, 0x8a4a2a);
      ell(c, 55, 22, 46, 10, 0x6a3a1e);
      ell(c, 55, 20, 40, 7, 0x3a2012);
      rect(c, 0, 30, 10, 8, 0x6a3a1e);
      rect(c, 100, 30, 10, 8, 0x6a3a1e);
    },
  },
  {
    id: 'radio',
    x: 630,
    y: 244,
    w: 90,
    h: 54,
    paint: (c) => {
      rect(c, 5, 6, 80, 46, 0x8a5a2a);
      ell(c, 30, 28, 16, 16, 0x3a2a1a);
      rect(c, 54, 16, 24, 6, 0xd9b45a);
      rect(c, 54, 30, 24, 4, 0xd9b45a);
      rect(c, 60, 0, 3, 8, 0x2a2a2a);
    },
  },
  {
    id: 'santo',
    x: 740,
    y: 236,
    w: 40,
    h: 70,
    paint: (c) => {
      ell(c, 20, 12, 8, 9, 0xe0b48e);
      ell(c, 20, 5, 12, 4, 0xffd23f);
      c.fillStyle = css(0x3a5a9a);
      c.beginPath();
      c.moveTo(8, 22);
      c.lineTo(32, 22);
      c.lineTo(36, 70);
      c.lineTo(4, 70);
      c.fill();
      rect(c, 26, 30, 3, 36, 0x6a4a2a);
    },
  },
  {
    id: 'foto',
    x: 820,
    y: 240,
    w: 56,
    h: 60,
    paint: (c) => {
      rect(c, 0, 0, 56, 60, 0xd9b45a);
      rect(c, 6, 6, 44, 48, 0xc9b49a);
      ell(c, 20, 26, 7, 8, 0x5a4a3a);
      ell(c, 36, 26, 7, 8, 0x5a4a3a);
      rect(c, 12, 34, 16, 20, 0x2a2a2a);
      rect(c, 30, 34, 14, 20, 0xf4f0e8);
    },
  },
  {
    id: 'llaves',
    x: 830,
    y: 318,
    w: 36,
    h: 44,
    paint: (c) => {
      c.strokeStyle = css(0x9a8a5a);
      c.lineWidth = 3;
      c.beginPath();
      c.arc(18, 10, 8, 0, Math.PI * 2);
      c.stroke();
      rect(c, 10, 18, 4, 24, 0xb8a86a);
      rect(c, 22, 18, 4, 20, 0xb8a86a);
      rect(c, 6, 36, 8, 4, 0xb8a86a);
      rect(c, 22, 32, 8, 4, 0xb8a86a);
    },
  },
  {
    id: 'taza',
    x: 884,
    y: 256,
    w: 36,
    h: 30,
    paint: (c) => {
      rect(c, 4, 4, 22, 22, 0xf4f0e8);
      rect(c, 4, 4, 22, 4, 0x3a8a9a);
      c.strokeStyle = css(0xf4f0e8);
      c.lineWidth = 4;
      c.beginPath();
      c.arc(28, 15, 6, -1.4, 1.4);
      c.stroke();
    },
  },
  {
    id: 'azucar',
    x: 445,
    y: 358,
    w: 44,
    h: 44,
    paint: (c) => {
      ell(c, 22, 26, 18, 16, 0xe8e0d0);
      ell(c, 22, 12, 14, 5, 0x3a8a9a);
      ell(c, 22, 6, 4, 4, 0x3a8a9a);
      rect(c, 8, 26, 28, 4, 0x3a8a9a);
    },
  },
  {
    id: 'reloj',
    x: 180,
    y: 150,
    w: 84,
    h: 84,
    paint: (c) => {
      ell(c, 42, 42, 40, 40, 0x6a4428);
      ell(c, 42, 42, 32, 32, 0xf4ecd8);
      rect(c, 41, 18, 3, 26, 0x2a2a2a);
      rect(c, 41, 40, 18, 3, 0x2a2a2a);
    },
  },
  {
    id: 'arepas',
    x: 590,
    y: 370,
    w: 70,
    h: 24,
    paint: (c) => {
      ell(c, 35, 16, 34, 8, 0xf4f0e8);
      ell(c, 24, 11, 14, 6, 0xe8c070);
      ell(c, 46, 11, 14, 6, 0xe0b060);
    },
  },
];

export const PATIO_ITEMS: ItemDef[] = [
  {
    id: 'ruana',
    x: 690,
    y: 345,
    w: 120,
    h: 90,
    paint: (c) => {
      c.fillStyle = css(0x6b7f9e);
      c.beginPath();
      c.moveTo(0, 8);
      c.lineTo(120, 8);
      c.lineTo(110, 88);
      c.lineTo(10, 88);
      c.fill();
      for (let y = 20; y < 88; y += 14) rect(c, 6, y, 108, 4, 0x45546e);
      for (let x = 12; x < 112; x += 8) rect(c, x, 86, 3, 6, 0x45546e);
    },
  },
  {
    id: 'gallina',
    x: 300,
    y: 450,
    w: 50,
    h: 44,
    paint: (c) => {
      ell(c, 24, 28, 20, 14, 0xb06a3a);
      ell(c, 40, 16, 8, 8, 0xb06a3a);
      ell(c, 42, 8, 4, 4, 0xe02a2a);
      c.fillStyle = css(0xf2c230);
      c.beginPath();
      c.moveTo(47, 15);
      c.lineTo(52, 17);
      c.lineTo(47, 19);
      c.fill();
      ell(c, 10, 22, 8, 10, 0x8a4a22);
      rect(c, 20, 40, 2, 6, 0xf2c230);
      rect(c, 28, 40, 2, 6, 0xf2c230);
    },
  },
];

/** Tiquete viejo: papelito crema con franja roja. Solo existe en la capa nítida. */
export const paintTicket: Painter = (c) => {
  c.save();
  c.translate(16, 12);
  c.rotate(-0.25);
  rect(c, -14, -8, 28, 16, 0xf6ead0);
  rect(c, -14, -8, 28, 4, 0xc8283c);
  ell(c, 8, 3, 2, 2, 0x2a2a2a);
  c.restore();
};

export function itemTextures(scene: Phaser.Scene, prefix: string, items: ItemDef[]): void {
  items.forEach((it, i) => {
    pointillize(scene, `${prefix}-${it.id}-s`, it.w, it.h, it.paint, false, 30 + i, false);
    pointillize(scene, `${prefix}-${it.id}-b`, it.w, it.h, it.paint, true, 60 + i, false);
  });
}
