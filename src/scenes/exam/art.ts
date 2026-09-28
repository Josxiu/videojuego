import Phaser from 'phaser';
import { Rng } from '../../gfx/noise';
import {
  paintTexture,
  chalkLine,
  chalkRect,
  chalkEllipse,
  chalkHatch,
  chalkStroke,
  chalkText,
  eraserSmudge,
  grain,
  rectPoly,
  type Ctx,
  type Pt,
} from '../../gfx/brush';

/**
 * El arte del Examen Infinito: todo dibujado con gis sobre un pizarrón.
 * Lo único que NO es de gis es el borrador: por eso da miedo.
 */

export const CHALK = {
  white: '#f2efe6',
  yellow: '#ffe08a',
  pink: '#ffb3c6',
  blue: '#9fd8ff',
  green: '#b8f0a8',
  orange: '#ffc48a',
  board: '#23392f',
  boardDark: '#1d3329',
};

const F = (px: number) => `${px}px "Cabin Sketch"`;

/** Tamaños de las texturas que la escena necesita conocer. */
export const ART = {
  farW: 1920,
  farH: 320,
  midW: 1440,
  midH: 210,
  floorW: 256,
  floorH: 72,
  stepW: 22,
  stepRise: 4,
};

function board(ctx: Ctx, w: number, h: number, rng: Rng): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1c3128');
  g.addColorStop(1, '#27433a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  grain(ctx, w, h, rng, 1.2, 0.6);
  for (let i = 0; i < 16; i++) {
    eraserSmudge(
      ctx,
      rng.range(0, w),
      rng.range(0, h),
      rng.range(220, 460),
      rng.range(80, 170),
      rng,
      0.05,
    );
  }
}

/** Escritura fantasma: lo que otros borraron mal. */
function ghostWriting(ctx: Ctx, w: number, h: number, rng: Rng): void {
  const words = [
    '2 + 2 = 4',
    'ÉLMER',
    '3º B',
    'tarea: pág. 32',
    'a b c d',
    'no correr',
    '7 × 8 = 56',
    'examen final',
    'Élmer R.',
    'hoy: repaso',
    '¿presente?',
  ];
  for (let i = 0; i < 12; i++) {
    ctx.save();
    const x = rng.range(20, w - 180);
    const y = rng.range(40, h - 60);
    ctx.translate(x, y);
    ctx.rotate(rng.range(-0.08, 0.08));
    chalkText(ctx, rng.pick(words), 0, 0, rng, {
      font: F(rng.int(22, 34)),
      alpha: rng.range(0.06, 0.12),
    });
    ctx.restore();
  }
  // Rayitas de conteo: cuarenta años de días
  for (let g = 0; g < 6; g++) {
    const x0 = rng.range(30, w - 120);
    const y0 = rng.range(60, h - 80);
    for (let k = 0; k < 4; k++) {
      chalkLine(ctx, x0 + k * 9, y0, x0 + k * 9 + 1, y0 + 30, rng, { width: 2, alpha: 0.12 });
    }
    chalkLine(ctx, x0 - 4, y0 + 24, x0 + 34, y0 + 6, rng, { width: 2, alpha: 0.12 });
  }
}

/** Pizarrón de fondo (fijo a la pantalla). */
export function paintBoard(scene: Phaser.Scene): void {
  paintTexture(scene, 'exam-board', 960, 540, (ctx, w, h) => {
    const rng = new Rng('pizarron');
    board(ctx, w, h, rng);
    ghostWriting(ctx, w, h, rng);
  });
}

/** Marco de madera y la bandeja de los gises: el borde de la pantalla. */
export function paintFrame(scene: Phaser.Scene): void {
  paintTexture(scene, 'exam-frame', 960, 540, (ctx, w, h) => {
    const rng = new Rng('marco');
    const wood = (y: number, hh: number, top: string, bottom: string) => {
      const g = ctx.createLinearGradient(0, y, 0, y + hh);
      g.addColorStop(0, top);
      g.addColorStop(1, bottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, y, w, hh);
      ctx.strokeStyle = 'rgba(40,20,5,0.25)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const yy = y + rng.range(2, hh - 2);
        ctx.beginPath();
        ctx.moveTo(0, yy);
        for (let x = 0; x <= w; x += 40) ctx.lineTo(x, yy + Math.sin(x / 90 + i) * 1.5);
        ctx.stroke();
      }
    };
    wood(0, 12, '#8a5a30', '#5a3a1e');
    wood(h - 34, 34, '#9a6a3a', '#5a3a1e');
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, h - 34, w, 3);
    ctx.fillRect(0, 12, w, 2);
    // Gises en la bandeja
    const colors = [CHALK.white, CHALK.yellow, CHALK.pink, CHALK.white, CHALK.blue, CHALK.white];
    for (let i = 0; i < 9; i++) {
      const x = rng.range(40, w - 80);
      const len = rng.range(16, 44);
      ctx.save();
      ctx.translate(x, h - 22);
      ctx.rotate(rng.range(-0.15, 0.15));
      ctx.fillStyle = rng.pick(colors);
      ctx.fillRect(0, 0, len, 7);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 5, len, 2);
      ctx.restore();
    }
    // Polvo acumulado
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(240,240,230,${rng.range(0.05, 0.25)})`;
      ctx.fillRect(rng.range(0, w), h - rng.range(10, 26), rng.range(1, 3), 1);
    }
  });
}

/** Pared lejana del pasillo: ventanas, puertas, corcho, reloj. Se repite en horizontal. */
export function paintFar(scene: Phaser.Scene): void {
  paintTexture(scene, 'exam-far', ART.farW, ART.farH, (ctx, w, h) => {
    const rng = new Rng('pasillo-lejos');
    const o = { alpha: 0.5, width: 2.2 };
    // Línea del zoclo
    chalkLine(ctx, 0, h - 30, w, h - 30, rng, { ...o, alpha: 0.35 });
    for (let x = 60; x < w - 200; x += rng.int(210, 280)) {
      const kind = rng.int(0, 3);
      if (kind === 0) {
        // Ventana alta con cruz
        chalkRect(ctx, x, 30, 110, 150, rng, o);
        chalkLine(ctx, x + 55, 30, x + 55, 180, rng, o);
        chalkLine(ctx, x, 105, x + 110, 105, rng, o);
        chalkHatch(ctx, rectPoly(x + 4, 34, 48, 68), rng, {
          color: CHALK.blue,
          alpha: 0.18,
          spacing: 7,
        });
      } else if (kind === 1) {
        // Puerta de salón con número
        chalkRect(ctx, x, 70, 80, h - 100, rng, o);
        chalkRect(ctx, x + 18, 90, 44, 50, rng, { ...o, alpha: 0.35 });
        chalkEllipse(ctx, x + 66, 190, 4, 4, rng, o);
        const n = `${rng.int(1, 6)}º ${rng.pick(['A', 'B', 'C'])}`;
        chalkText(ctx, n, x + 40, 62, rng, { font: F(20), align: 'center', alpha: 0.5 });
      } else if (kind === 2) {
        // Corcho con avisos
        chalkRect(ctx, x, 60, 140, 100, rng, { ...o, color: CHALK.orange });
        for (let k = 0; k < 4; k++) {
          const px = x + 10 + k * 32;
          chalkRect(ctx, px, 72 + rng.range(-4, 8), 26, 34, rng, { width: 1.5, alpha: 0.4 });
        }
        chalkText(ctx, 'AVISOS', x + 70, 150, rng, { font: F(18), align: 'center', alpha: 0.4 });
      } else {
        // Reloj que marca siempre tarde
        chalkEllipse(ctx, x + 50, 90, 38, 38, rng, { ...o, alpha: 0.55 });
        chalkLine(ctx, x + 50, 90, x + 50, 62, rng, { ...o, alpha: 0.55 });
        chalkLine(ctx, x + 50, 90, x + 72, 96, rng, { ...o, alpha: 0.55 });
        chalkText(ctx, '¡tarde!', x + 50, 150, rng, { font: F(18), align: 'center', alpha: 0.3 });
      }
    }
  });
}

/** Casilleros y cosas de pasillo, más cerca. Se repite en horizontal. */
export function paintMid(scene: Phaser.Scene): void {
  paintTexture(scene, 'exam-mid', ART.midW, ART.midH, (ctx, w, h) => {
    const rng = new Rng('pasillo-medio');
    let x = 30;
    while (x < w - 320) {
      const n = rng.int(4, 7);
      const color = rng.pick([CHALK.yellow, CHALK.blue, CHALK.orange, CHALK.green]);
      for (let i = 0; i < n; i++) {
        const lx = x + i * 44;
        chalkRect(ctx, lx, 40, 42, h - 44, rng, { width: 2.4, alpha: 0.75 });
        chalkHatch(ctx, rectPoly(lx + 3, 44, 36, h - 52), rng, { color, alpha: 0.28, spacing: 6 });
        for (let k = 0; k < 3; k++)
          chalkLine(ctx, lx + 10, 56 + k * 7, lx + 32, 56 + k * 7, rng, { width: 1.4, alpha: 0.6 });
        chalkRect(ctx, lx + 30, 110, 5, 12, rng, { width: 1.4, alpha: 0.7 });
      }
      x += n * 44 + rng.int(60, 140);
      // Entre bancos de casilleros: un bebedero o un cartel
      if (x < w - 360) {
        if (rng.chance(0.5)) {
          chalkRect(ctx, x, h - 80, 50, 76, rng, { width: 2, alpha: 0.6 });
          chalkEllipse(ctx, x + 25, h - 82, 20, 6, rng, { width: 2, alpha: 0.6 });
          chalkStroke(
            ctx,
            [
              [x + 25, h - 88],
              [x + 30, h - 104],
              [x + 38, h - 96],
            ] as Pt[],
            rng,
            { color: CHALK.blue, width: 2, alpha: 0.6 },
          );
        } else {
          chalkRect(ctx, x, 60, 110, 70, rng, { width: 2, alpha: 0.6, color: CHALK.pink });
          chalkText(ctx, 'NO CORRER', x + 55, 104, rng, {
            font: F(20),
            align: 'center',
            color: CHALK.pink,
            alpha: 0.7,
          });
        }
        x += 150;
      }
    }
  });
}

/** Piso del pasillo: la línea de gis donde se corre y losetas en perspectiva. */
export function paintFloor(scene: Phaser.Scene): void {
  paintTexture(scene, 'exam-floor', ART.floorW, ART.floorH, (ctx, w, h) => {
    const rng = new Rng('piso');
    // La línea del suelo, gruesa y firme
    chalkStroke(
      ctx,
      [
        [-4, 3],
        [w + 4, 3],
      ],
      rng,
      { width: 5, alpha: 1, wobble: 0.3, gaps: 0.15 },
    );
    for (const y of [22, 44, 68]) chalkLine(ctx, -4, y, w + 4, y, rng, { width: 1.6, alpha: 0.35 });
    for (let x = 0; x < w; x += 64) {
      chalkLine(ctx, x, 6, x - 24, h, rng, { width: 1.6, alpha: 0.35 });
      if ((x / 64) % 2 === 0) {
        chalkHatch(
          ctx,
          [
            [x, 6],
            [x + 64, 6],
            [x + 52, 22],
            [x - 8, 22],
          ],
          rng,
          { alpha: 0.15, spacing: 5 },
        );
      }
    }
  });
}

/**
 * Un escalón (se colocan 112 en fila). Incluye su tramo de pasamanos, así
 * al alinearlos el barandal sale solo. El origen vertical está en la huella.
 */
export const STEP_TEX_H = 130;
export const STEP_TOP = 70;
export function paintStep(scene: Phaser.Scene): void {
  paintTexture(scene, 'exam-step', ART.stepW + 2, STEP_TEX_H, (ctx) => {
    const rng = new Rng('escalon');
    const t = STEP_TOP;
    const W = ART.stepW;
    const R = ART.stepRise;
    // huella y contrahuella
    chalkStroke(
      ctx,
      [
        [0, t + R],
        [0, t],
        [W + 1, t],
      ],
      rng,
      { width: 3.6, alpha: 1, gaps: 0.15, wobble: 0.2 },
    );
    // sombreado debajo, que se desvanece
    for (let y = t + 8; y < t + 50; y += 6) {
      chalkLine(ctx, 2, y, W, y - 5, rng, { width: 1.2, alpha: 0.25 * (1 - (y - t) / 55) });
    }
    // pasamanos (sube R píxeles por escalón)
    chalkLine(ctx, 0, t - 56 + R, W + 1, t - 56, rng, {
      width: 2.4,
      alpha: 0.8,
      color: CHALK.orange,
    });
    chalkLine(ctx, W / 2, t - 55 + R / 2, W / 2, t - 2, rng, { width: 1.4, alpha: 0.45 });
  });
}

/** Obstáculos y cosas del recorrido. */
export function paintProps(scene: Phaser.Scene): void {
  // Pupitre
  paintTexture(scene, 'exam-desk', 80, 70, (ctx) => {
    const rng = new Rng('pupitre');
    const o = { width: 2.6, alpha: 1 };
    chalkStroke(
      ctx,
      [
        [8, 24],
        [58, 16],
        [74, 24],
        [24, 34],
        [8, 24],
      ] as Pt[],
      rng,
      o,
    );
    chalkHatch(
      ctx,
      [
        [8, 24],
        [58, 16],
        [74, 24],
        [24, 34],
      ],
      rng,
      { color: CHALK.yellow, alpha: 0.5, spacing: 4 },
    );
    chalkLine(ctx, 12, 26, 12, 68, rng, o);
    chalkLine(ctx, 24, 34, 24, 68, rng, o);
    chalkLine(ctx, 70, 26, 70, 62, rng, o);
    chalkLine(ctx, 12, 50, 70, 46, rng, { width: 1.6, alpha: 0.6 });
  });
  // Pila de libros con manzana
  paintTexture(scene, 'exam-books', 56, 96, (ctx) => {
    const rng = new Rng('libros');
    const cols = [CHALK.pink, CHALK.blue, CHALK.yellow, CHALK.green, CHALK.orange];
    let y = 92;
    for (let i = 0; i < 5; i++) {
      const hh = rng.int(11, 15);
      const x = 6 + rng.range(-3, 3);
      y -= hh;
      chalkRect(ctx, x, y, 42, hh, rng, { width: 2, alpha: 1 });
      chalkHatch(ctx, rectPoly(x + 2, y + 2, 38, hh - 4), rng, {
        color: cols[i],
        alpha: 0.6,
        spacing: 3,
      });
    }
    chalkEllipse(ctx, 28, y - 9, 8, 8, rng, { color: '#ff8a8a', width: 2.5, alpha: 1 });
    chalkHatch(ctx, rectPoly(21, y - 16, 14, 14), rng, {
      color: '#ff8a8a',
      alpha: 0.5,
      spacing: 3,
    });
    chalkLine(ctx, 28, y - 17, 31, y - 23, rng, { color: CHALK.green, width: 2, alpha: 1 });
  });
  // Mochila
  paintTexture(scene, 'exam-bag', 50, 46, (ctx) => {
    const rng = new Rng('mochila');
    chalkRect(ctx, 8, 10, 34, 34, rng, { width: 2.4, alpha: 1 });
    chalkHatch(ctx, rectPoly(10, 12, 30, 30), rng, { color: CHALK.blue, alpha: 0.55, spacing: 4 });
    chalkRect(ctx, 14, 24, 22, 12, rng, { width: 1.6, alpha: 0.8 });
    chalkEllipse(ctx, 25, 10, 9, 6, rng, { width: 2, alpha: 0.9 });
  });
  // Avión de papel
  paintTexture(scene, 'exam-plane', 64, 34, (ctx) => {
    const rng = new Rng('avion');
    chalkStroke(
      ctx,
      [
        [60, 16],
        [4, 4],
        [22, 18],
        [60, 16],
        [8, 30],
        [22, 18],
      ] as Pt[],
      rng,
      { width: 2.4, alpha: 1 },
    );
    chalkHatch(
      ctx,
      [
        [60, 16],
        [4, 4],
        [22, 18],
      ],
      rng,
      { alpha: 0.35, spacing: 4 },
    );
  });
  // Timbre escolar colgando
  paintTexture(scene, 'exam-bell', 56, 52, (ctx) => {
    const rng = new Rng('timbre');
    chalkStroke(
      ctx,
      [
        [8, 44],
        [14, 20],
        [28, 8],
        [42, 20],
        [48, 44],
        [8, 44],
      ] as Pt[],
      rng,
      { width: 2.6, alpha: 1, color: CHALK.yellow },
    );
    chalkHatch(
      ctx,
      [
        [10, 42],
        [15, 21],
        [28, 10],
        [41, 21],
        [46, 42],
      ],
      rng,
      { color: CHALK.yellow, alpha: 0.45, spacing: 4 },
    );
    chalkEllipse(ctx, 28, 47, 5, 4, rng, { width: 2, alpha: 1 });
    // líneas de «ring»
    chalkLine(ctx, 2, 18, 8, 22, rng, { width: 1.6, alpha: 0.7 });
    chalkLine(ctx, 54, 18, 48, 22, rng, { width: 1.6, alpha: 0.7 });
  });
  // Cordón (se estira)
  paintTexture(scene, 'exam-cord', 6, 64, (ctx) => {
    const rng = new Rng('cordon');
    chalkLine(ctx, 3, 0, 3, 64, rng, { width: 1.8, alpha: 0.8, wobble: 0.1 });
  });
  // Estrella de gis (la luciérnaga de este sueño)
  paintTexture(scene, 'exam-star', 34, 34, (ctx) => {
    const rng = new Rng('estrella');
    const pts: Pt[] = [];
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 15 : 6.5;
      pts.push([17 + Math.cos(a) * r, 17 + Math.sin(a) * r]);
    }
    chalkHatch(ctx, pts, rng, { color: CHALK.yellow, alpha: 0.7, spacing: 3 });
    chalkStroke(ctx, pts, rng, { width: 2.4, alpha: 1, color: CHALK.yellow });
  });
  // Borrón: un hueco en el piso donde la tiza ya no está
  paintTexture(scene, 'exam-hole', 180, 90, (ctx, w, h) => {
    const rng = new Rng('hueco');
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(35,57,47,1)');
    g.addColorStop(1, 'rgba(35,57,47,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(20, 0, w - 40, h);
    for (let i = 0; i < 5; i++)
      eraserSmudge(ctx, w / 2 + rng.range(-40, 40), h / 2, 120, 80, rng, 0.08);
    // bordes deshilachados de la línea
    for (const side of [20, w - 20]) {
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(242,239,230,${rng.range(0.15, 0.5)})`;
        ctx.fillRect(side + rng.range(-10, 10), rng.range(0, 8), rng.range(1, 3), 1.5);
      }
    }
  });
  // Puerta del salón: 3º B
  paintTexture(scene, 'exam-door', 120, 190, (ctx) => {
    const rng = new Rng('puerta-3b');
    chalkRect(ctx, 14, 30, 92, 158, rng, { width: 3, alpha: 1 });
    chalkHatch(ctx, rectPoly(16, 32, 88, 154), rng, {
      color: CHALK.orange,
      alpha: 0.25,
      spacing: 6,
    });
    chalkRect(ctx, 34, 50, 52, 44, rng, { width: 2, alpha: 0.9 });
    chalkHatch(ctx, rectPoly(36, 52, 48, 40), rng, { color: CHALK.blue, alpha: 0.35, spacing: 4 });
    chalkEllipse(ctx, 92, 120, 5, 5, rng, { width: 2, alpha: 1 });
    chalkText(ctx, '3º B', 60, 24, rng, { font: F(26), align: 'center', color: CHALK.yellow });
  });
}

/** El borrador: el único objeto «real» del sueño, fieltro y madera. */
export function paintEraser(scene: Phaser.Scene): void {
  paintTexture(scene, 'exam-eraser', 150, 96, (ctx) => {
    const rng = new Rng('borrador');
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6;
    // fieltro
    ctx.fillStyle = '#6a6a72';
    ctx.beginPath();
    ctx.roundRect(8, 44, 134, 40, 6);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#86868e';
    ctx.fillRect(10, 46, 130, 10);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = 'rgba(40,40,48,0.35)';
      ctx.fillRect(12 + i * 11, 58, 2, 24);
    }
    // madera
    const g = ctx.createLinearGradient(0, 8, 0, 48);
    g.addColorStop(0, '#c68a4e');
    g.addColorStop(1, '#8a5a2e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(4, 8, 142, 40, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,30,10,0.35)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const y = 16 + i * 5;
      ctx.moveTo(10, y);
      ctx.bezierCurveTo(50, y + rng.range(-3, 3), 100, y + rng.range(-3, 3), 140, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(16, 12, 110, 4);
    // polvo de gis pegado al fieltro
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(240,240,230,${rng.range(0.1, 0.5)})`;
      ctx.fillRect(rng.range(10, 140), rng.range(62, 84), rng.range(1, 3), rng.range(1, 2));
    }
  });
  // Borde de lo borrado: una estela de polvo que se desvanece hacia la derecha
  paintTexture(scene, 'exam-wipe', 260, 540, (ctx, w, h) => {
    const rng = new Rng('estela');
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(38,62,52,1)');
    g.addColorStop(0.6, 'rgba(44,70,58,0.85)');
    g.addColorStop(1, 'rgba(44,70,58,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const y = rng.range(0, h);
      const len = rng.range(80, 240);
      ctx.fillStyle = `rgba(230,236,226,${rng.range(0.02, 0.07)})`;
      ctx.fillRect(0, y, len, rng.range(3, 14));
    }
  });
}

/** Una respuesta del examen dentro de un recuadro de gis. */
export function paintAnswer(scene: Phaser.Scene, key: string, text: string): void {
  paintTexture(scene, key, 190, 70, (ctx, w, h) => {
    const rng = new Rng(key);
    chalkRect(ctx, 6, 6, w - 12, h - 12, rng, { width: 2.8, alpha: 1 });
    chalkHatch(ctx, rectPoly(8, 8, w - 16, h - 16), rng, { alpha: 0.08, spacing: 6 });
    chalkText(ctx, text, w / 2, h / 2 + 8, rng, {
      font: F(text.length > 16 ? 19 : 23),
      align: 'center',
    });
  });
}

/** Una marca de gis grande: ✓ o ✗. */
export function paintMarks(scene: Phaser.Scene): void {
  paintTexture(scene, 'exam-check', 70, 70, (ctx) => {
    const rng = new Rng('palomita');
    chalkStroke(
      ctx,
      [
        [8, 36],
        [26, 60],
        [64, 8],
      ] as Pt[],
      rng,
      { width: 6, alpha: 1, color: CHALK.green, gaps: 0.1 },
    );
  });
  paintTexture(scene, 'exam-cross', 70, 70, (ctx) => {
    const rng = new Rng('tache');
    chalkLine(ctx, 10, 10, 60, 60, rng, { width: 6, alpha: 1, color: '#ff9a8a', gaps: 0.1 });
    chalkLine(ctx, 60, 10, 10, 60, rng, { width: 6, alpha: 1, color: '#ff9a8a', gaps: 0.1 });
  });
}

/** El salón 3º B, donde espera el examen en blanco. */
export function paintClassroom(scene: Phaser.Scene): void {
  paintTexture(scene, 'exam-class', 960, 540, (ctx, w, h) => {
    const rng = new Rng('salon');
    board(ctx, w, h, rng);
    const o = { width: 2.6, alpha: 0.9 };
    // Piso y pared
    chalkLine(ctx, 0, 400, w, 400, rng, { width: 3.5, alpha: 1 });
    // Ventanas a la derecha
    for (let i = 0; i < 2; i++) {
      const x = 700 + i * 120;
      chalkRect(ctx, x, 90, 96, 150, rng, o);
      chalkLine(ctx, x + 48, 90, x + 48, 240, rng, o);
      chalkHatch(ctx, rectPoly(x + 4, 94, 40, 70), rng, {
        color: CHALK.blue,
        alpha: 0.2,
        spacing: 7,
      });
    }
    // Un sol de niño en la ventana
    chalkEllipse(ctx, 830, 130, 16, 16, rng, { color: CHALK.yellow, width: 2.4, alpha: 0.9 });
    // El pizarrón del salón (un pizarrón dibujado en el pizarrón)
    chalkRect(ctx, 150, 70, 440, 200, rng, { width: 4, alpha: 1, color: CHALK.orange });
    chalkText(ctx, 'EXAMEN FINAL', 370, 110, rng, { font: F(34), align: 'center', alpha: 0.9 });
    chalkLine(ctx, 250, 122, 490, 120, rng, { width: 2, alpha: 0.7 });
    // El reloj, detenido en «tarde»
    chalkEllipse(ctx, 640, 90, 28, 28, rng, o);
    chalkLine(ctx, 640, 90, 640, 70, rng, o);
    chalkLine(ctx, 640, 90, 656, 94, rng, o);
    // Escritorio del maestro
    chalkRect(ctx, 80, 300, 150, 100, rng, o);
    chalkHatch(ctx, rectPoly(82, 302, 146, 30), rng, {
      color: CHALK.orange,
      alpha: 0.35,
      spacing: 5,
    });
    chalkEllipse(ctx, 120, 290, 14, 10, rng, { color: '#ff8a8a', width: 2, alpha: 0.9 });
    // Pupitres en fila (vacíos, salvo uno)
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const x = 330 + c * 150 + r * 30;
        const y = 350 + r * 60;
        chalkStroke(
          ctx,
          [
            [x, y],
            [x + 70, y - 8],
            [x + 90, y],
            [x + 20, y + 10],
            [x, y],
          ] as Pt[],
          rng,
          { width: 2.2, alpha: 0.8 },
        );
        chalkLine(ctx, x + 4, y + 2, x + 4, y + 40, rng, { width: 2, alpha: 0.7 });
        chalkLine(ctx, x + 86, y + 2, x + 86, y + 36, rng, { width: 2, alpha: 0.7 });
      }
    }
  });
}

/** Pinta todo lo del sueño (idempotente). */
export function paintExamArt(scene: Phaser.Scene): void {
  paintBoard(scene);
  paintFrame(scene);
  paintFar(scene);
  paintMid(scene);
  paintFloor(scene);
  paintStep(scene);
  paintProps(scene);
  paintEraser(scene);
  paintMarks(scene);
  paintClassroom(scene);
}
