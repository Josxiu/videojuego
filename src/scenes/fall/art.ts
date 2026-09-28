import Phaser from 'phaser';
import { Rng } from '../../gfx/noise';
import {
  paintTexture,
  paperPiece,
  grain,
  tape,
  ellipsePoly,
  rectPoly,
  jitter,
  resample,
  fillPoly,
  type Ctx,
  type Pt,
} from '../../gfx/brush';
import { FALL_ITEMS } from '../../data/fallBiomes';

/**
 * El arte de La Caída Sin Fin: un diorama de papel recortado.
 * Cada pieza tiene su sombra; el cielo es una hoja de papel distinta según
 * cuánto haya desempacado Nadia.
 */

const HAND = (px: number) => `${px}px "Patrick Hand"`;
const SERIF = (px: number, bold = true) =>
  `${bold ? 'bold ' : ''}${px}px Georgia, "Times New Roman", serif`;

/** Recorte con sombra suave. */
function cut(ctx: Ctx, poly: Pt[], color: string, rng: Rng, shadow = 0.28, torn = 0): void {
  paperPiece(ctx, poly, color, rng, {
    shadow,
    shadowBlur: 3,
    shadowX: 2,
    shadowY: 3,
    torn,
    fiber: 0.4,
  });
}

function star(cx: number, cy: number, r: number, rot = 0): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + rot + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

function cloud(cx: number, cy: number, s: number, rng: Rng): Pt[][] {
  const blobs: Pt[][] = [];
  const n = rng.int(3, 5);
  for (let i = 0; i < n; i++) {
    const x = cx + (i - (n - 1) / 2) * s * 0.7 + rng.range(-5, 5);
    const r = s * rng.range(0.45, 0.7) * (i === Math.floor(n / 2) ? 1.25 : 1);
    blobs.push(ellipsePoly(x, cy - r * 0.3, r, r * 0.85, 18));
  }
  blobs.push(rectPoly(cx - (n / 2) * s * 0.7, cy - s * 0.2, n * s * 0.7, s * 0.55));
  return blobs;
}

/** Dibuja algo en y y, si queda cerca del borde, también del otro lado (mosaico vertical). */
function wrapY(h: number, y: number, margin: number, draw: (yy: number) => void): void {
  draw(y);
  if (y < margin) draw(y + h);
  if (y > h - margin) draw(y - h);
}

// ── Cielos ──

const SKY_W = 960;
const SKY_H = 540;
export const FAR_H = 1080;

function paintBg(ctx: Ctx, i: number, rng: Rng): void {
  const w = SKY_W;
  const h = SKY_H;
  switch (i) {
    case 0: {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#16214a');
      g.addColorStop(1, '#2c3d73');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      grain(ctx, w, h, rng, 1.4);
      cut(ctx, ellipsePoly(810, 110, 58, 58, 32), '#f6ecc8', rng, 0.35);
      for (const [x, y, r] of [
        [795, 95, 10],
        [828, 128, 7],
        [790, 132, 5],
      ])
        cut(ctx, ellipsePoly(x, y, r, r, 14), '#e2d5ae', rng, 0.12);
      break;
    }
    case 1: {
      ctx.fillStyle = '#dcd8cc';
      ctx.fillRect(0, 0, w, h);
      grain(ctx, w, h, rng, 1.2);
      ctx.fillStyle = '#222';
      ctx.font = SERIF(34);
      ctx.globalAlpha = 0.75;
      ctx.fillText('CLASIFICADOS', 30, 50);
      ctx.fillRect(20, 62, w - 40, 3);
      ctx.globalAlpha = 1;
      const cols = 5;
      const cw = (w - 40 - (cols - 1) * 14) / cols;
      const heads = ['SE RENTA', 'DEPARTAMENTOS', 'SE VENDE', 'MUDANZAS', 'SE RENTA'];
      for (let c = 0; c < cols; c++) {
        const x = 20 + c * (cw + 14);
        let y = 84;
        while (y < h - 10) {
          if (rng.chance(0.14)) {
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#222';
            ctx.font = SERIF(15);
            ctx.fillText(rng.pick(heads), x, y + 12);
            y += 22;
          } else if (rng.chance(0.1)) {
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = '#333';
            ctx.strokeRect(x, y, cw, 46);
            for (let k = 0; k < 4; k++)
              ctx.fillRect(x + 6, y + 8 + k * 9, rng.range(cw * 0.5, cw - 12), 3);
            y += 56;
          } else {
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = '#333';
            ctx.fillRect(x, y, rng.range(cw * 0.6, cw), 3);
            y += 8;
          }
        }
      }
      ctx.globalAlpha = 1;
      // El anuncio que ella encerró con plumón rojo
      ctx.fillStyle = '#dcd8cc';
      ctx.fillRect(560, 250, 190, 70);
      ctx.fillStyle = '#222';
      ctx.font = SERIF(15);
      ctx.fillText('5º PISO, SOLEADO', 574, 274);
      ctx.font = SERIF(12, false);
      ctx.fillText('2 rec., edificio Girasol.', 574, 292);
      ctx.fillText('Interesados llamar.', 574, 308);
      ctx.strokeStyle = 'rgba(214,40,40,0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(655, 283, 118, 50, -0.05, 0, Math.PI * 2.1);
      ctx.stroke();
      break;
    }
    case 2: {
      ctx.fillStyle = '#b98a4e';
      ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 7) {
        ctx.fillStyle = x % 14 === 0 ? 'rgba(255,230,190,0.06)' : 'rgba(60,30,5,0.06)';
        ctx.fillRect(x, 0, 4, h);
      }
      grain(ctx, w, h, rng, 1.4);
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#4a2a10';
      ctx.font = HAND(40);
      ctx.fillText('ESTE LADO ↑ ARRIBA', 60, 120);
      ctx.font = HAND(28);
      ctx.fillText('MUDANZAS «EL RÁPIDO»', 540, 470);
      ctx.translate(700, 170);
      ctx.rotate(-0.15);
      ctx.strokeStyle = 'rgba(200,40,30,0.8)';
      ctx.lineWidth = 4;
      ctx.strokeRect(-90, -34, 180, 58);
      ctx.fillStyle = 'rgba(200,40,30,0.85)';
      ctx.font = HAND(46);
      ctx.fillText('FRÁGIL', -70, 12);
      ctx.restore();
      tape(ctx, 480, 8, w + 40, 40, 0, rng);
      tape(ctx, 150, 380, 300, 40, -0.4, rng);
      break;
    }
    case 3: {
      ctx.fillStyle = '#f4a6b8';
      ctx.fillRect(0, 0, w, h);
      grain(ctx, w, h, rng, 0.8);
      for (let y = 0; y < h + 40; y += 48) {
        for (let x = (y / 48) % 2 ? 24 : 0; x < w + 40; x += 48) {
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (let k = 0; k < 30; k++) {
        ctx.fillStyle = 'rgba(255,215,90,0.8)';
        fillPoly(ctx, star(rng.range(0, w), rng.range(0, h), 6, rng.range(0, 1)));
      }
      break;
    }
    case 4: {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#34407a');
      g.addColorStop(1, '#5a6ab0');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Tiras de papel de china encimadas, translúcidas
      const cols = ['rgba(120,150,230,0.22)', 'rgba(150,110,210,0.2)', 'rgba(90,170,220,0.2)'];
      for (let k = 0; k < 14; k++) {
        const y0 = rng.range(-40, h);
        const hh = rng.range(40, 110);
        const pts: Pt[] = [];
        for (let x = -20; x <= w + 20; x += 40)
          pts.push([x, y0 + Math.sin(x / 120 + k) * 12 + rng.range(-4, 4)]);
        for (let x = w + 20; x >= -20; x -= 40)
          pts.push([x, y0 + hh + Math.sin(x / 100 + k) * 10 + rng.range(-4, 4)]);
        ctx.fillStyle = rng.pick(cols);
        fillPoly(ctx, pts);
      }
      grain(ctx, w, h, rng, 1);
      break;
    }
    case 5: {
      ctx.fillStyle = '#f6ecd4';
      ctx.fillRect(0, 0, w, h);
      grain(ctx, w, h, rng, 1);
      ctx.strokeStyle = 'rgba(90,130,200,0.35)';
      ctx.lineWidth = 1;
      for (let y = 60; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(210,70,70,0.45)';
      ctx.beginPath();
      ctx.moveTo(110, 0);
      ctx.lineTo(110, h);
      ctx.stroke();
      const lines = [
        'Hija:',
        '¿Ya desempacaste?',
        'Aquí todo sigue igual. Tu cuarto está como lo dejaste.',
        'Te mandé la foto que me pediste, la de la azotea.',
        'No te encierres, conoce a tus vecinos.',
        'Llámame cuando puedas.',
        'Te quiere, mamá.',
      ];
      ctx.fillStyle = 'rgba(40,60,140,0.6)';
      ctx.font = HAND(26);
      lines.forEach((l, k) =>
        ctx.fillText(l, 130 + (k === lines.length - 1 ? 380 : 0), 86 + k * 60),
      );
      break;
    }
    case 6: {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#23508e');
      g.addColorStop(1, '#2f66ae');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      grain(ctx, w, h, rng, 0.8);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 3;
      ctx.strokeRect(160, 110, 640, 330);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(480, 110);
      ctx.lineTo(480, 300);
      ctx.moveTo(480, 360);
      ctx.lineTo(480, 440);
      ctx.moveTo(160, 290);
      ctx.lineTo(380, 290);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(480, 300, 60, Math.PI / 2, Math.PI);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = HAND(26);
      ctx.fillText('SALA', 280, 210);
      ctx.fillText('COCINA', 250, 380);
      ctx.fillText('RECÁMARA', 580, 280);
      ctx.font = HAND(22);
      ctx.fillText('DEPTO. 5º — EDIFICIO GIRASOL', 300, 480);
      ctx.fillText('4.20 m', 450, 100);
      break;
    }
  }
}

function paintFar(ctx: Ctx, i: number, rng: Rng, thread: string): void {
  const w = SKY_W;
  const h = FAR_H;
  const hang = (x: number, y: number, len: number) => {
    ctx.save();
    ctx.strokeStyle = thread;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - len);
    ctx.stroke();
    ctx.restore();
  };
  const n = 16;
  for (let k = 0; k < n; k++) {
    const x = rng.range(20, w - 20);
    const y = (k / n) * h + rng.range(-20, 20);
    wrapY(h, y, 140, (yy) => {
      switch (i) {
        case 0:
          if (k % 3 === 0)
            cloud(x, yy, rng.range(34, 54), rng).forEach((b) => cut(ctx, b, '#3d5294', rng, 0.3));
          else {
            const r = rng.range(9, 16);
            hang(x, yy - r, rng.range(40, 120));
            cut(ctx, star(x, yy, r, rng.range(-0.3, 0.3)), '#ffd166', rng, 0.35);
          }
          break;
        case 1: {
          const pw = rng.range(80, 140);
          const ph = rng.range(50, 90);
          const poly = jitter(
            resample(rectPoly(x - pw / 2, yy - ph / 2, pw, ph), 6, true),
            2.2,
            rng,
          );
          cut(ctx, poly, '#eeeae0', rng, 0.3);
          ctx.fillStyle = 'rgba(50,50,50,0.4)';
          for (let l = 0; l < ph / 9 - 1; l++)
            ctx.fillRect(x - pw / 2 + 8, yy - ph / 2 + 8 + l * 9, pw * rng.range(0.5, 0.8), 2.5);
          break;
        }
        case 2: {
          const pw = rng.range(60, 120);
          const ph = rng.range(40, 80);
          cut(
            ctx,
            jitter(resample(rectPoly(x - pw / 2, yy - ph / 2, pw, ph), 7, true), 2.5, rng),
            '#caa06a',
            rng,
            0.3,
          );
          if (k % 2) tape(ctx, x, yy, pw * 0.8, 16, rng.range(-0.5, 0.5), rng);
          break;
        }
        case 3: {
          if (k % 4 === 0) {
            const col = rng.pick(['#ff6a8a', '#ffd23a', '#6ad0ff', '#8ae06a']);
            hang(x, yy + 30, 90);
            cut(ctx, ellipsePoly(x, yy, 22, 28, 20), col, rng, 0.3);
          } else {
            for (let c = 0; c < 6; c++) {
              ctx.save();
              ctx.translate(x + rng.range(-40, 40), yy + rng.range(-40, 40));
              ctx.rotate(rng.range(0, 3));
              ctx.fillStyle = rng.pick(['#ffd23a', '#6ad0ff', '#fff', '#8ae06a', '#b07aff']);
              ctx.fillRect(-4, -2, 8, 4);
              ctx.restore();
            }
          }
          break;
        }
        case 4: {
          const r = rng.range(8, 14);
          const drop: Pt[] = [];
          for (let a = 0; a < 16; a++) {
            const t = (a / 16) * Math.PI * 2;
            const px = Math.sin(t) * r * (1 - 0.4 * Math.max(0, -Math.cos(t)));
            const py = -Math.cos(t) * r * 1.6 + (Math.cos(t) < 0 ? -r * 0.5 * -Math.cos(t) : 0);
            drop.push([x + px, yy + py]);
          }
          cut(ctx, drop, '#a8c8f0', rng, 0.3);
          break;
        }
        case 5: {
          const pw = 90;
          const ph = 58;
          ctx.save();
          ctx.translate(x, yy);
          ctx.rotate(rng.range(-0.3, 0.3));
          cut(ctx, rectPoly(-pw / 2, -ph / 2, pw, ph), '#fbf6ea', rng, 0.3);
          ctx.strokeStyle = 'rgba(120,100,80,0.5)';
          ctx.beginPath();
          ctx.moveTo(-pw / 2, -ph / 2);
          ctx.lineTo(0, 4);
          ctx.lineTo(pw / 2, -ph / 2);
          ctx.stroke();
          ctx.fillStyle = rng.pick(['#d9503a', '#4a8ad0', '#6ab05a']);
          ctx.fillRect(pw / 2 - 20, -ph / 2 + 6, 13, 15);
          ctx.restore();
          break;
        }
        case 6: {
          ctx.save();
          ctx.strokeStyle = 'rgba(255,255,255,0.55)';
          ctx.lineWidth = 2;
          if (k % 3 === 0) {
            ctx.beginPath();
            ctx.arc(x, yy, 24, 0, Math.PI * 2);
            ctx.moveTo(x, yy - 34);
            ctx.lineTo(x, yy + 34);
            ctx.moveTo(x - 34, yy);
            ctx.lineTo(x + 34, yy);
            ctx.stroke();
          } else {
            const len = rng.range(60, 140);
            ctx.beginPath();
            ctx.moveTo(x - len / 2, yy);
            ctx.lineTo(x + len / 2, yy);
            ctx.moveTo(x - len / 2, yy - 6);
            ctx.lineTo(x - len / 2, yy + 6);
            ctx.moveTo(x + len / 2, yy - 6);
            ctx.lineTo(x + len / 2, yy + 6);
            ctx.stroke();
          }
          ctx.restore();
          break;
        }
      }
    });
  }
}

/** Pinta el cielo i (fondo fijo y capa lejana en mosaico vertical). */
export function paintSky(scene: Phaser.Scene, i: number, thread: string): void {
  paintTexture(scene, `fall-bg-${i}`, SKY_W, SKY_H, (ctx) =>
    paintBg(ctx, i, new Rng(`cielo-${i}`)),
  );
  paintTexture(scene, `fall-far-${i}`, SKY_W, FAR_H, (ctx) =>
    paintFar(ctx, i, new Rng(`lejos-${i}`), thread),
  );
}

// ── Muebles de la otra casa, colgando de hilos ──

export const FURNITURE = ['lamp', 'chair', 'clock', 'sofa', 'mirror'] as const;
export type Furniture = (typeof FURNITURE)[number];

/** Tamaño de colisión de cada mueble (ancho, alto) relativo al centro. */
export const FURNITURE_BOX: Record<Furniture, [number, number]> = {
  lamp: [50, 120],
  chair: [60, 90],
  clock: [62, 62],
  sofa: [150, 60],
  mirror: [52, 82],
};

export function paintFallProps(scene: Phaser.Scene): void {
  paintTexture(scene, 'fall-lamp', 90, 170, (ctx) => {
    const rng = new Rng('lampara');
    cut(
      ctx,
      [
        [20, 10],
        [70, 10],
        [84, 58],
        [6, 58],
      ],
      '#f2c94c',
      rng,
    );
    cut(ctx, rectPoly(42, 58, 7, 90), '#6a4a3a', rng);
    cut(ctx, ellipsePoly(45, 152, 30, 10, 16), '#6a4a3a', rng);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(26, 16, 8, 38);
  });
  paintTexture(scene, 'fall-chair', 90, 130, (ctx) => {
    const rng = new Rng('silla');
    cut(ctx, rectPoly(14, 8, 12, 110), '#a0643a', rng);
    cut(ctx, rectPoly(14, 8, 56, 12), '#a0643a', rng);
    cut(ctx, rectPoly(14, 30, 56, 8), '#a0643a', rng);
    cut(ctx, rectPoly(10, 64, 70, 12), '#b8784a', rng);
    cut(ctx, rectPoly(62, 64, 10, 56), '#a0643a', rng);
    cut(ctx, rectPoly(58, 8, 12, 60), '#a0643a', rng);
  });
  paintTexture(scene, 'fall-clock', 90, 90, (ctx) => {
    const rng = new Rng('reloj');
    cut(ctx, ellipsePoly(45, 45, 38, 38, 28), '#6a8ad0', rng);
    cut(ctx, ellipsePoly(45, 45, 30, 30, 28), '#fbf6ea', rng, 0.15);
    ctx.strokeStyle = '#2a2a44';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(45, 45);
    ctx.lineTo(45, 24);
    ctx.moveTo(45, 45);
    ctx.lineTo(60, 52);
    ctx.stroke();
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      ctx.fillStyle = '#2a2a44';
      ctx.fillRect(45 + Math.cos(a) * 24 - 1.5, 45 + Math.sin(a) * 24 - 1.5, 3, 3);
    }
  });
  paintTexture(scene, 'fall-sofa', 180, 100, (ctx) => {
    const rng = new Rng('sillon');
    cut(ctx, rectPoly(10, 16, 160, 40), '#5a9a8a', rng);
    cut(ctx, rectPoly(6, 44, 168, 34), '#4a8a7a', rng);
    cut(ctx, rectPoly(0, 30, 24, 50), '#3e7a6a', rng);
    cut(ctx, rectPoly(156, 30, 24, 50), '#3e7a6a', rng);
    cut(ctx, rectPoly(14, 78, 10, 14), '#5a3a2a', rng);
    cut(ctx, rectPoly(156, 78, 10, 14), '#5a3a2a', rng);
    ctx.strokeStyle = 'rgba(30,60,50,0.4)';
    ctx.beginPath();
    ctx.moveTo(90, 20);
    ctx.lineTo(90, 54);
    ctx.stroke();
  });
  paintTexture(scene, 'fall-mirror', 80, 110, (ctx) => {
    const rng = new Rng('espejo');
    cut(ctx, ellipsePoly(40, 55, 34, 48, 26), '#c9a24a', rng);
    cut(ctx, ellipsePoly(40, 55, 26, 40, 26), '#bfe0f0', rng, 0.1);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(30, 40, 5, 14, 0.4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Cajas cerradas, con lo que dice cada una
  FALL_ITEMS.forEach((item, k) => {
    paintTexture(scene, `fall-box-${k}`, 110, 96, (ctx) => {
      const rng = new Rng(`caja-${k}`);
      cut(ctx, rectPoly(8, 22, 94, 66), '#c98d4a', rng, 0.35);
      cut(
        ctx,
        [
          [8, 22],
          [102, 22],
          [92, 8],
          [18, 8],
        ],
        '#dba060',
        rng,
        0.15,
      );
      tape(ctx, 55, 18, 26, 26, Math.PI / 2, rng);
      tape(ctx, 55, 30, 18, 36, 0, rng);
      ctx.fillStyle = '#2a2a2a';
      ctx.font = HAND(item.box.length > 7 ? 17 : 21);
      ctx.textAlign = 'center';
      ctx.fillText(item.box, 55, 70);
    });
  });
  paintTexture(scene, 'fall-box-open', 110, 96, (ctx) => {
    const rng = new Rng('caja-abierta');
    cut(
      ctx,
      [
        [8, 30],
        [-4, 6],
        [30, 20],
      ],
      '#dba060',
      rng,
      0.2,
    );
    cut(
      ctx,
      [
        [102, 30],
        [114, 6],
        [80, 20],
      ],
      '#dba060',
      rng,
      0.2,
    );
    cut(ctx, rectPoly(8, 30, 94, 58), '#c98d4a', rng, 0.35);
    ctx.fillStyle = 'rgba(40,20,5,0.55)';
    ctx.fillRect(12, 30, 86, 10);
  });
  paintTexture(scene, 'fall-box-icon', 34, 30, (ctx) => {
    const rng = new Rng('icono-caja');
    cut(ctx, rectPoly(3, 8, 28, 20), '#c98d4a', rng, 0.3);
    tape(ctx, 17, 10, 8, 14, 0, rng);
  });
  paintTexture(scene, 'fall-box-icon-open', 34, 30, (ctx) => {
    const rng = new Rng('icono-caja-abierta');
    cut(
      ctx,
      [
        [3, 10],
        [-2, 2],
        [12, 8],
      ],
      '#dba060',
      rng,
      0.2,
    );
    cut(
      ctx,
      [
        [31, 10],
        [36, 2],
        [22, 8],
      ],
      '#dba060',
      rng,
      0.2,
    );
    cut(ctx, rectPoly(3, 10, 28, 18), '#c98d4a', rng, 0.3);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(12, 4, 10, 8);
  });

  // Lo que sale de las cajas
  const item = (k: number, draw: (ctx: Ctx, rng: Rng) => void) =>
    paintTexture(scene, `fall-item-${k}`, 90, 90, (ctx) => draw(ctx, new Rng(`objeto-${k}`)));
  item(0, (ctx, rng) => {
    cut(ctx, rectPoly(22, 26, 40, 46), '#f4efe4', rng);
    cut(ctx, ellipsePoly(66, 48, 12, 14, 16), '#f4efe4', rng, 0.2);
    cut(ctx, ellipsePoly(66, 48, 6, 8, 16), '#fbf6ea', rng, 0);
    ctx.fillStyle = '#4a8ad0';
    ctx.fillRect(24, 40, 36, 8);
    ctx.fillStyle = '#b8a890';
    ctx.beginPath();
    ctx.moveTo(22, 26);
    ctx.lineTo(30, 26);
    ctx.lineTo(24, 33);
    ctx.fill();
  });
  item(1, (ctx, rng) => {
    ctx.save();
    ctx.translate(45, 45);
    ctx.rotate(-0.1);
    cut(ctx, rectPoly(-30, -34, 60, 70), '#fbf6ea', rng);
    ctx.fillStyle = '#7ab0e0';
    ctx.fillRect(-24, -28, 48, 44);
    ctx.fillStyle = '#e8b33c';
    ctx.fillRect(-24, 4, 48, 12);
    for (const [x, c] of [
      [-10, '#6b3f2a'],
      [8, '#2a1a1a'],
    ] as [number, string][]) {
      ctx.fillStyle = '#f0c09a';
      ctx.beginPath();
      ctx.arc(x, -10, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c;
      ctx.fillRect(x - 6, -17, 12, 5);
      ctx.fillStyle = x < 0 ? '#e86a5a' : '#6ab05a';
      ctx.fillRect(x - 6, -4, 12, 12);
    }
    ctx.restore();
  });
  item(2, (ctx, rng) => {
    cut(ctx, rectPoly(6, 30, 78, 34), '#b84a3e', rng);
    ctx.fillStyle = '#f2d25a';
    ctx.font = HAND(14);
    ctx.textAlign = 'center';
    ctx.fillText('BIENVENIDOS', 45, 52);
  });
  item(3, (ctx, rng) => {
    cut(
      ctx,
      [
        [28, 56],
        [62, 56],
        [58, 84],
        [32, 84],
      ],
      '#d9703a',
      rng,
    );
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k - 2.5) * 0.35;
      cut(
        ctx,
        ellipsePoly(45 + Math.cos(a) * 22, 52 + Math.sin(a) * 30, 7, 16, 12, a + Math.PI / 2),
        '#4aa05a',
        rng,
        0.2,
      );
    }
  });
  item(4, (ctx, rng) => {
    cut(ctx, rectPoly(14, 14, 62, 66), '#fbf6ea', rng);
    ctx.fillStyle = '#d9503a';
    ctx.fillRect(14, 14, 62, 16);
    ctx.fillStyle = '#fff';
    ctx.font = HAND(14);
    ctx.textAlign = 'center';
    ctx.fillText('MARZO', 45, 27);
    ctx.fillStyle = 'rgba(40,40,60,0.5)';
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 6; c++) ctx.fillRect(20 + c * 9, 38 + r * 10, 5, 5);
  });
  item(5, (ctx, rng) => {
    cut(
      ctx,
      [
        [26, 18],
        [64, 18],
        [72, 48],
        [18, 48],
      ],
      '#f7e08a',
      rng,
    );
    cut(ctx, rectPoly(41, 48, 8, 22), '#8a6a4a', rng);
    cut(ctx, ellipsePoly(45, 74, 20, 7, 14), '#8a6a4a', rng);
  });

  // Globo de la despedida (en blanco, se tiñe)
  paintTexture(scene, 'fall-balloon', 50, 100, (ctx) => {
    const rng = new Rng('globo');
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(25, 64);
    ctx.bezierCurveTo(18, 76, 32, 86, 25, 100);
    ctx.stroke();
    cut(ctx, ellipsePoly(25, 32, 21, 28, 22), '#f2f2f2', rng, 0.3);
    cut(
      ctx,
      [
        [21, 60],
        [29, 60],
        [25, 66],
      ],
      '#e2e2e2',
      rng,
      0.1,
    );
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.ellipse(17, 22, 4, 8, 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  // Cinta canela para las paredes de cinta (mosaico horizontal)
  paintTexture(scene, 'fall-tape', 128, 34, (ctx) => {
    const rng = new Rng('cinta');
    ctx.fillStyle = 'rgba(214,170,98,0.95)';
    ctx.fillRect(0, 4, 128, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(0, 6, 128, 7);
    ctx.fillStyle = 'rgba(120,80,30,0.2)';
    for (let k = 0; k < 20; k++)
      ctx.fillRect(rng.range(0, 128), rng.range(6, 28), rng.range(6, 20), 1);
  });
  paintTexture(scene, 'fall-tape-end', 20, 34, (ctx) => {
    const rng = new Rng('cinta-punta');
    tape(ctx, 10, 17, 18, 26, 0, rng, 'rgba(214,170,98,0.95)');
  });
  // Luciérnaga de papel doblado
  paintTexture(scene, 'fall-firefly', 40, 36, (ctx) => {
    const rng = new Rng('luciernaga-papel');
    cut(
      ctx,
      [
        [20, 6],
        [34, 18],
        [20, 30],
        [6, 18],
      ],
      '#ffd166',
      rng,
      0.3,
    );
    ctx.strokeStyle = 'rgba(160,110,20,0.6)';
    ctx.beginPath();
    ctx.moveTo(20, 6);
    ctx.lineTo(20, 30);
    ctx.moveTo(6, 18);
    ctx.lineTo(34, 18);
    ctx.stroke();
    cut(ctx, ellipsePoly(11, 12, 7, 4, 10, -0.5), '#fbf6ea', rng, 0.15);
    cut(ctx, ellipsePoly(29, 12, 7, 4, 10, 0.5), '#fbf6ea', rng, 0.15);
  });
}

/** Nube grande de primer plano: pasa por delante y da profundidad al diorama. */
export function paintForeground(scene: Phaser.Scene): void {
  paintTexture(scene, 'fall-cloud-fg', 360, 170, (ctx) => {
    const rng = new Rng('nube-cerca');
    cloud(180, 110, 70, rng).forEach((b) => cut(ctx, b, '#f4f0ff', rng, 0.25));
  });
}

// ── El departamento que se arma al aterrizar (libro desplegable) ──

export function paintRoom(scene: Phaser.Scene): void {
  paintTexture(scene, 'fall-room-floor', 960, 150, (ctx, w, h) => {
    const rng = new Rng('piso-plano');
    ctx.fillStyle = '#2f66ae';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    for (let x = 0; x < w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    grain(ctx, w, h, rng, 0.8);
    cut(ctx, rectPoly(0, 0, w, 16), '#c8a878', rng, 0.35);
  });
  paintTexture(scene, 'fall-room-wall', 480, 300, (ctx, w, h) => {
    const rng = new Rng('pared');
    cut(ctx, rectPoly(4, 4, w - 8, h - 8), '#f4e4c4', rng, 0.35);
    // tapiz de rayas
    ctx.fillStyle = 'rgba(200,140,120,0.18)';
    for (let x = 20; x < w; x += 36) ctx.fillRect(x, 4, 12, h - 8);
    cut(ctx, rectPoly(4, h - 30, w - 8, 26), '#c8a878', rng, 0.2);
  });
  paintTexture(scene, 'fall-room-window', 150, 130, (ctx) => {
    const rng = new Rng('ventana');
    cut(ctx, rectPoly(6, 6, 138, 118), '#fbf6ea', rng);
    cut(ctx, rectPoly(16, 16, 118, 98), '#8ac8f0', rng, 0.1);
    cut(ctx, ellipsePoly(100, 44, 16, 16, 18), '#ffd166', rng, 0.1);
    ctx.fillStyle = '#fbf6ea';
    ctx.fillRect(72, 16, 6, 98);
    ctx.fillRect(16, 62, 118, 6);
  });
  paintTexture(scene, 'fall-room-door', 110, 210, (ctx) => {
    const rng = new Rng('puerta-nueva');
    cut(ctx, rectPoly(8, 8, 94, 196), '#a0643a', rng);
    cut(ctx, rectPoly(20, 22, 70, 70), '#b8784a', rng, 0.1);
    cut(ctx, rectPoly(20, 110, 70, 80), '#b8784a', rng, 0.1);
    cut(ctx, ellipsePoly(86, 112, 5, 5, 10), '#ffd166', rng, 0.2);
  });
  paintTexture(scene, 'fall-room-table', 150, 90, (ctx) => {
    const rng = new Rng('mesa');
    cut(ctx, rectPoly(6, 8, 138, 14), '#8a5a3a', rng);
    cut(ctx, rectPoly(16, 22, 10, 64), '#7a4a2a', rng);
    cut(ctx, rectPoly(124, 22, 10, 64), '#7a4a2a', rng);
  });
  paintTexture(scene, 'fall-room-nail', 16, 16, (ctx) => {
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(8, 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#bbb';
    ctx.fillRect(6, 6, 2, 2);
  });
}
