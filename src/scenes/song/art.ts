import Phaser from 'phaser';
import { Rng } from '../../gfx/noise';
import {
  paintTexture,
  chalkStroke,
  chalkRect,
  chalkLine,
  paperPiece,
  tape,
  wash,
  blot,
  crayonFill,
  crayonPoly,
  crayonStroke,
  rectPoly,
  ellipsePoly,
  grain,
  type Ctx,
  type Pt,
} from '../../gfx/brush';

/**
 * El arte de La Canción del Edificio: el Girasol visto de frente, de noche.
 * Cada ventana de vecino está pintada con la técnica de su sueño; lo demás
 * es el edificio «real», en tonos de madrugada.
 */

export const BUILDING = { x: 270, w: 420, ground: 470, floorH: 70, floors: 6 };
const WIN_W = 50;
const WIN_H = 40;
const WIN_X = [30, 130, 250, 350];

/** Centro de la ventana `col` del piso `level` (0 = planta baja). */
export function windowCenter(level: number, col: number): [number, number] {
  const top = BUILDING.ground - (level + 1) * BUILDING.floorH;
  return [BUILDING.x + WIN_X[col] + WIN_W / 2, top + 16 + WIN_H / 2];
}

/** Ventanas de los vecinos de esta historia: [piso, columna]. */
export const NEIGHBOR_WINDOWS = {
  exam: [0, 0],
  chase: [2, 1],
  iris: [3, 2],
  forest: [4, 1],
  fall: [5, 3],
} as const;

export function allWindows(): [number, number][] {
  const out: [number, number][] = [];
  for (let l = 0; l < BUILDING.floors; l++) for (let c = 0; c < 4; c++) out.push([l, c]);
  return out;
}

function sky(
  ctx: Ctx,
  w: number,
  h: number,
  top: string,
  mid: string,
  bottom: string,
  rng: Rng,
  stars: boolean,
): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(0.6, mid);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  if (stars) {
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = `rgba(255,255,240,${rng.range(0.2, 0.9)})`;
      const s = rng.chance(0.1) ? 2 : 1;
      ctx.fillRect(rng.range(0, w), rng.range(0, h * 0.7), s, s);
    }
  }
  grain(ctx, w, h, rng, 0.6, 0.3);
}

export function paintSong(scene: Phaser.Scene): void {
  paintTexture(scene, 'song-night', 960, 540, (ctx, w, h) =>
    sky(ctx, w, h, '#0d0a2e', '#241a55', '#3a2a6a', new Rng('noche'), true),
  );
  paintTexture(scene, 'song-dawn', 960, 540, (ctx, w, h) =>
    sky(ctx, w, h, '#4a6ab8', '#f0a0a0', '#ffd8a0', new Rng('alba'), false),
  );

  // El edificio Girasol
  paintTexture(
    scene,
    'song-building',
    BUILDING.w + 40,
    BUILDING.ground + 10,
    (ctx) => {
      const rng = new Rng('girasol');
      const ox = 20;
      const top = BUILDING.ground - BUILDING.floors * BUILDING.floorH;
      ctx.translate(ox - BUILDING.x, 0);
      // Tinacos y antenas en la azotea
      ctx.fillStyle = '#1a1433';
      for (const x of [BUILDING.x + 40, BUILDING.x + 110]) {
        ctx.fillRect(x, top - 44, 44, 40);
        ctx.fillRect(x + 4, top - 50, 36, 8);
      }
      ctx.fillRect(BUILDING.x + 330, top - 70, 3, 66);
      ctx.fillRect(BUILDING.x + 316, top - 60, 30, 3);
      // Tendedero en la azotea
      ctx.strokeStyle = '#2a2250';
      ctx.beginPath();
      ctx.moveTo(BUILDING.x + 180, top - 30);
      ctx.lineTo(BUILDING.x + 300, top - 34);
      ctx.stroke();
      // Fachada
      ctx.fillStyle = '#2a2250';
      ctx.fillRect(BUILDING.x, top, BUILDING.w, BUILDING.floors * BUILDING.floorH);
      ctx.fillStyle = '#342a60';
      for (let l = 0; l < BUILDING.floors; l++) {
        const y = BUILDING.ground - (l + 1) * BUILDING.floorH;
        ctx.fillRect(BUILDING.x, y + BUILDING.floorH - 6, BUILDING.w, 6);
      }
      ctx.fillStyle = '#1e1840';
      ctx.fillRect(BUILDING.x - 8, top - 6, BUILDING.w + 16, 10);
      // Ventanas apagadas
      for (const [l, c] of allWindows()) {
        const [cx, cy] = windowCenter(l, c);
        ctx.fillStyle = '#15102a';
        ctx.fillRect(cx - WIN_W / 2, cy - WIN_H / 2, WIN_W, WIN_H);
        ctx.fillStyle = '#3e3470';
        ctx.fillRect(cx - WIN_W / 2 - 3, cy + WIN_H / 2, WIN_W + 6, 4);
      }
      // Balcón de Iris y de Doña Chuy
      for (const [l, c] of [NEIGHBOR_WINDOWS.iris, NEIGHBOR_WINDOWS.forest]) {
        const [cx, cy] = windowCenter(l, c);
        ctx.fillStyle = '#3e3470';
        ctx.fillRect(cx - 44, cy + 20, 88, 5);
        for (let k = 0; k < 9; k++) ctx.fillRect(cx - 42 + k * 10.5, cy + 4, 2, 18);
        ctx.fillRect(cx - 44, cy + 2, 88, 3);
      }
      // Letrero y puerta de la entrada
      ctx.fillStyle = '#15102a';
      ctx.fillRect(BUILDING.x + 170, BUILDING.ground - 58, 80, 58);
      ctx.fillStyle = '#e0b040';
      ctx.font = '15px "Silkscreen", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('EDIFICIO GIRASOL', BUILDING.x + BUILDING.w / 2, top + 2 + 0);
      // Un girasol pequeño sobre la puerta
      const fx = BUILDING.x + 210;
      const fy = BUILDING.ground - 70;
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        ctx.fillStyle = '#e0b040';
        ctx.beginPath();
        ctx.ellipse(fx + Math.cos(a) * 8, fy + Math.sin(a) * 8, 5, 2.5, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#6a3a1a';
      ctx.beginPath();
      ctx.arc(fx, fy, 5, 0, Math.PI * 2);
      ctx.fill();
      void rng;
    },
    false,
  );

  // La colonia alrededor: siluetas de otros edificios y un farol
  paintTexture(scene, 'song-skyline', 960, 300, (ctx, _w, h) => {
    const rng = new Rng('colonia');
    const blocks: [number, number, number][] = [
      [0, 150, 120],
      [110, 90, 150],
      [700, 110, 110],
      [800, 170, 160],
      [900, 70, 120],
    ];
    for (const [x, bw, bh] of blocks) {
      ctx.fillStyle = '#17122e';
      ctx.fillRect(x, h - bh, bw, bh);
      for (let y = h - bh + 14; y < h - 12; y += 26) {
        for (let wx = x + 10; wx < x + bw - 16; wx += 24) {
          ctx.fillStyle = rng.chance(0.12) ? 'rgba(255,210,120,0.55)' : 'rgba(40,32,80,0.9)';
          ctx.fillRect(wx, y, 12, 14);
        }
      }
    }
    // farol
    ctx.fillStyle = '#0e0a20';
    ctx.fillRect(760, h - 120, 5, 120);
    ctx.fillRect(740, h - 122, 30, 5);
    const g = ctx.createRadialGradient(745, h - 112, 2, 745, h - 112, 60);
    g.addColorStop(0, 'rgba(255,220,140,0.6)');
    g.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(680, h - 180, 130, 130);
  });

  // Ventanas de los vecinos, cada una en su técnica
  const win = (key: string, draw: (ctx: Ctx, rng: Rng) => void) =>
    paintTexture(scene, `song-win-${key}`, WIN_W, WIN_H, (ctx) =>
      draw(ctx, new Rng(`ventana-${key}`)),
    );
  win('exam', (ctx, rng) => {
    ctx.fillStyle = '#23392f';
    ctx.fillRect(0, 0, WIN_W, WIN_H);
    // una escoba de gis
    chalkLine(ctx, 14, 6, 30, 30, rng, { width: 2, alpha: 1 });
    chalkStroke(
      ctx,
      [
        [26, 28],
        [40, 34],
        [34, 38],
        [22, 34],
      ],
      rng,
      { width: 2, alpha: 1, color: '#ffe08a' },
    );
    chalkRect(ctx, 2, 2, WIN_W - 4, WIN_H - 4, rng, { width: 1.4, alpha: 0.5 });
  });
  win('fall', (ctx, rng) => {
    ctx.fillStyle = '#2c3d73';
    ctx.fillRect(0, 0, WIN_W, WIN_H);
    paperPiece(ctx, rectPoly(6, 18, 18, 16), '#c98d4a', rng, {
      shadow: 0.4,
      shadowBlur: 2,
      shadowX: 1,
      shadowY: 2,
    });
    paperPiece(ctx, rectPoly(22, 10, 22, 24), '#dba060', rng, {
      shadow: 0.4,
      shadowBlur: 2,
      shadowX: 1,
      shadowY: 2,
    });
    tape(ctx, 33, 14, 8, 10, 0, rng);
  });
  win('forest', (ctx, rng) => {
    ctx.fillStyle = '#f4ecd8';
    ctx.fillRect(0, 0, WIN_W, WIN_H);
    blot(ctx, 14, 26, 9, '#5a9a4a', rng, { layers: 5, alpha: 0.3 });
    blot(ctx, 34, 24, 10, '#d83a8a', rng, { layers: 5, alpha: 0.3 });
    blot(ctx, 25, 10, 5, '#4a9ad8', rng, { layers: 4, alpha: 0.4 });
  });
  win('chase', (ctx, rng) => {
    ctx.fillStyle = '#fffdf6';
    ctx.fillRect(0, 0, WIN_W, WIN_H);
    crayonFill(ctx, rectPoly(0, 0, WIN_W, WIN_H), '#1f2560', rng, { coverage: 0.8, alpha: 0.8 });
    crayonFill(ctx, ellipsePoly(25, 20, 9, 9, 10), '#ffd23a', rng, { coverage: 1, alpha: 1 });
    crayonPoly(ctx, rectPoly(2, 2, WIN_W - 4, WIN_H - 4), rng, { color: '#e8433a', width: 3 });
  });
  win('iris', (ctx) => {
    ctx.fillStyle = '#ffd98a';
    ctx.fillRect(0, 0, WIN_W, WIN_H);
    ctx.fillStyle = '#ffeec0';
    ctx.fillRect(4, 4, WIN_W - 8, 10);
  });

  // Íconos de los sonidos
  const icon = (key: string, draw: (ctx: Ctx, rng: Rng) => void) =>
    paintTexture(scene, `song-note-${key}`, 48, 48, (ctx) => draw(ctx, new Rng(`nota-${key}`)));
  icon('broom', (ctx, rng) => {
    ctx.fillStyle = '#23392f';
    ctx.beginPath();
    ctx.arc(24, 24, 22, 0, Math.PI * 2);
    ctx.fill();
    chalkLine(ctx, 14, 8, 28, 30, rng, { width: 2.4, alpha: 1 });
    chalkStroke(
      ctx,
      [
        [24, 28],
        [38, 34],
        [32, 40],
        [20, 36],
      ],
      rng,
      { width: 2.4, alpha: 1, color: '#ffe08a' },
    );
  });
  icon('box', (ctx, rng) => {
    paperPiece(ctx, rectPoly(8, 14, 32, 26), '#c98d4a', rng, {
      shadow: 0.35,
      shadowBlur: 3,
      shadowX: 2,
      shadowY: 3,
    });
    tape(ctx, 24, 16, 10, 14, 0, rng);
  });
  icon('drop', (ctx, rng) => {
    const pts: Pt[] = [
      [24, 4],
      [38, 26],
      [24, 42],
      [10, 26],
    ];
    wash(ctx, pts, '#4a9ad8', rng, { layers: 8, alpha: 0.3, variance: 2 });
    blot(ctx, 20, 24, 4, '#e8f6ff', rng, { layers: 3, alpha: 0.6 });
  });
  icon('knock', (ctx, rng) => {
    crayonFill(ctx, ellipsePoly(24, 24, 18, 16, 14), '#f0c09a', rng, { coverage: 1, alpha: 1 });
    for (let k = 0; k < 3; k++)
      crayonStroke(
        ctx,
        [
          [14 + k * 9, 14],
          [14 + k * 9, 22],
        ],
        rng,
        { color: '#b07a55', width: 3 },
      );
    crayonPoly(ctx, ellipsePoly(24, 24, 18, 16, 14), rng, { color: '#2b2340', width: 3 });
  });
  icon('hum', (ctx) => {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.ellipse(18, 32, 9, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(25, 8, 4, 24);
    ctx.fillRect(25, 8, 12, 5);
  });

  // La cinta del casete: por aquí se ven venir los sonidos
  paintTexture(scene, 'song-tape', 960, 34, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#4a2a1a');
    g.addColorStop(0.5, '#6a3a22');
    g.addColorStop(1, '#3a1e12');
    ctx.fillStyle = g;
    ctx.fillRect(0, 4, w, h - 8);
    ctx.fillStyle = 'rgba(255,220,180,0.12)';
    ctx.fillRect(0, 8, w, 3);
  });
  paintTexture(scene, 'song-petal', 60, 160, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 160);
    g.addColorStop(0, 'rgba(255,230,120,0)');
    g.addColorStop(0.3, 'rgba(255,214,90,0.9)');
    g.addColorStop(1, 'rgba(255,190,60,0.95)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.quadraticCurveTo(62, 90, 30, 160);
    ctx.quadraticCurveTo(-2, 90, 30, 0);
    ctx.fill();
  });
}
