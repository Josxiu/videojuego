import Phaser from 'phaser';
import { Rng } from '../../gfx/noise';
import {
  paintTexture,
  chalkStroke,
  chalkLine,
  paperPiece,
  tape,
  wash,
  blot,
  crayonFill,
  crayonPoly,
  scribble,
  rectPoly,
  ellipsePoly,
  grain,
  type Ctx,
} from '../../gfx/brush';

/**
 * El arte del Entresueño: el tiro de luz del edificio visto desde adentro.
 * Es pixel art suave (el mundo «de en medio»); solo las mirillas de las
 * puertas dejan ver la técnica de cada sueño.
 */

/** Fondo lejano: la pared del tiro de luz con sus ventanas y ductos (mosaico). */
export function paintHub(scene: Phaser.Scene): void {
  paintTexture(
    scene,
    'hub-shaft',
    960,
    540,
    (ctx, w, h) => {
      const rng = new Rng('tiro-de-luz');
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#0b0820');
      g.addColorStop(0.6, '#171235');
      g.addColorStop(1, '#221a48');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Ventanas de los cuarenta departamentos, casi todas dormidas
      for (let y = 30; y < h - 150; y += 64) {
        for (let x = 24; x < w; x += 80) {
          const lit = rng.chance(0.1);
          ctx.fillStyle = lit ? 'rgba(255,200,120,0.28)' : 'rgba(60,48,110,0.35)';
          ctx.fillRect(x, y, 28, 34);
          ctx.fillStyle = 'rgba(20,14,44,0.6)';
          ctx.fillRect(x + 13, y, 2, 34);
        }
      }
      // Ductos por donde suben los sueños
      for (const x of [180, 520, 820]) {
        ctx.fillStyle = 'rgba(40,32,80,0.9)';
        ctx.fillRect(x, 0, 22, h);
        ctx.fillStyle = 'rgba(90,70,160,0.3)';
        ctx.fillRect(x + 3, 0, 4, h);
        for (let y = 20; y < h; y += 90) {
          ctx.fillStyle = 'rgba(30,24,60,1)';
          ctx.fillRect(x - 3, y, 28, 8);
        }
      }
      grain(ctx, w, h, rng, 0.5, 0.2);
    },
    false,
  );

  // La ventanilla de Morfeo
  paintTexture(
    scene,
    'hub-desk',
    190,
    120,
    (ctx) => {
      ctx.fillStyle = '#4a2e1c';
      ctx.fillRect(10, 50, 170, 70);
      ctx.fillStyle = '#6a4228';
      ctx.fillRect(4, 44, 182, 10);
      ctx.fillStyle = '#3a2214';
      ctx.fillRect(20, 62, 70, 50);
      ctx.fillStyle = '#8a5a3a';
      ctx.fillRect(50, 84, 10, 4);
      // Expedientes de sueños
      const cols = ['#d8c8a0', '#c8b890', '#e8dcc0'];
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = cols[i % 3];
        ctx.fillRect(116 + (i % 2) * 3, 42 - i * 6, 46, 5);
      }
      // Lámpara de escritorio
      ctx.fillStyle = '#2a2a3a';
      ctx.fillRect(28, 20, 4, 26);
      ctx.fillStyle = '#86f7ff';
      ctx.beginPath();
      ctx.moveTo(14, 22);
      ctx.lineTo(46, 22);
      ctx.lineTo(38, 10);
      ctx.lineTo(22, 10);
      ctx.fill();
      // Sello y timbre
      ctx.fillStyle = '#b83a3a';
      ctx.fillRect(96, 36, 12, 8);
      ctx.fillStyle = '#2a2a3a';
      ctx.fillRect(99, 30, 6, 6);
    },
    false,
  );

  // Tapetes de cada puerta
  const mat = (key: string, color: string, stripe: string) =>
    paintTexture(
      scene,
      `hub-mat-${key}`,
      86,
      16,
      (ctx) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 2, 86, 12);
        ctx.fillStyle = stripe;
        for (let x = 4; x < 86; x += 10) ctx.fillRect(x, 4, 4, 8);
      },
      false,
    );
  mat('exam', '#5a4a3a', '#7a6a5a');
  mat('fall', '#8a5a3a', '#b8864a');
  mat('forest', '#6a3a5a', '#d83a8a');
  mat('chase', '#2a3a8a', '#ffd23a');
  mat('wake', '#7a5a2a', '#ffd166');

  // Mirillas: cada puerta deja ver la técnica de su sueño
  const peep = (key: string, draw: (ctx: Ctx, rng: Rng) => void) =>
    paintTexture(scene, `hub-peep-${key}`, 40, 48, (ctx) => draw(ctx, new Rng(`mirilla-${key}`)));
  peep('exam', (ctx, rng) => {
    ctx.fillStyle = '#23392f';
    ctx.fillRect(0, 0, 40, 48);
    chalkStroke(
      ctx,
      [
        [6, 30],
        [14, 14],
        [22, 30],
        [30, 12],
      ],
      rng,
      { width: 2, alpha: 1 },
    );
    chalkLine(ctx, 4, 40, 36, 40, rng, { width: 2, alpha: 0.9, color: '#ffe08a' });
  });
  peep('fall', (ctx, rng) => {
    ctx.fillStyle = '#2c3d73';
    ctx.fillRect(0, 0, 40, 48);
    paperPiece(ctx, ellipsePoly(28, 12, 7, 7, 12), '#f6ecc8', rng, {
      shadow: 0.4,
      shadowBlur: 2,
      shadowX: 1,
      shadowY: 2,
    });
    paperPiece(ctx, rectPoly(8, 26, 20, 16), '#c98d4a', rng, {
      shadow: 0.4,
      shadowBlur: 2,
      shadowX: 1,
      shadowY: 2,
    });
    tape(ctx, 18, 28, 6, 10, 0, rng);
  });
  peep('forest', (ctx, rng) => {
    ctx.fillStyle = '#f4ecd8';
    ctx.fillRect(0, 0, 40, 48);
    blot(ctx, 12, 30, 9, '#d07a50', rng, { layers: 5, alpha: 0.3 });
    blot(ctx, 28, 18, 10, '#d83a8a', rng, { layers: 5, alpha: 0.28 });
    blot(ctx, 22, 38, 7, '#5a9a4a', rng, { layers: 4, alpha: 0.3 });
  });
  peep('chase', (ctx, rng) => {
    ctx.fillStyle = '#fffdf6';
    ctx.fillRect(0, 0, 40, 48);
    crayonFill(ctx, rectPoly(0, 0, 40, 48), '#1f2560', rng, { coverage: 0.95, alpha: 0.9 });
    scribble(ctx, 20, 26, 12, 14, rng, { color: '#0c0a14', loops: 6, width: 2.4 });
    crayonFill(ctx, ellipsePoly(15, 22, 3, 3, 8), '#ff3b3b', rng, { coverage: 1, alpha: 1 });
    crayonFill(ctx, ellipsePoly(25, 22, 3, 3, 8), '#ff3b3b', rng, { coverage: 1, alpha: 1 });
  });
  peep('own', (ctx, rng) => {
    ctx.fillStyle = '#1a1640';
    ctx.fillRect(0, 0, 40, 48);
    wash(ctx, rectPoly(4, 30, 32, 14), '#3a2a6a', rng, { layers: 3, alpha: 0.4, variance: 2 });
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(10, 8, 20, 22);
  });

  // Adornos de cada vecino (pixel art pintado a mano)
  paintTexture(
    scene,
    'hub-broom',
    40,
    100,
    (ctx) => {
      ctx.fillStyle = '#8a5a3a';
      ctx.fillRect(18, 0, 4, 70);
      ctx.fillStyle = '#d8b060';
      ctx.beginPath();
      ctx.moveTo(8, 100);
      ctx.lineTo(32, 100);
      ctx.lineTo(26, 70);
      ctx.lineTo(14, 70);
      ctx.fill();
      ctx.fillStyle = '#b89040';
      for (let x = 11; x < 30; x += 4) ctx.fillRect(x, 78, 1, 22);
    },
    false,
  );
  paintTexture(
    scene,
    'hub-bucket',
    40,
    40,
    (ctx) => {
      ctx.fillStyle = '#6a8ab0';
      ctx.beginPath();
      ctx.moveTo(4, 10);
      ctx.lineTo(36, 10);
      ctx.lineTo(32, 38);
      ctx.lineTo(8, 38);
      ctx.fill();
      ctx.strokeStyle = '#3a4a6a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(20, 10, 14, Math.PI, 0);
      ctx.stroke();
    },
    false,
  );
  paintTexture(
    scene,
    'hub-boxes',
    90,
    90,
    (ctx) => {
      const box = (x: number, y: number, w: number, h: number) => {
        ctx.fillStyle = '#b8864a';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#d6aa62';
        ctx.fillRect(x + w / 2 - 4, y, 8, h);
        ctx.fillStyle = '#8a5a2a';
        ctx.fillRect(x, y + h - 3, w, 3);
      };
      box(4, 44, 50, 44);
      box(50, 54, 38, 34);
      box(14, 10, 40, 34);
      ctx.fillStyle = '#2a2a2a';
      ctx.font = '9px monospace';
      ctx.fillText('FRÁGIL', 12, 72);
    },
    false,
  );
  paintTexture(
    scene,
    'hub-plants',
    90,
    70,
    (ctx) => {
      const pot = (x: number, c: string) => {
        ctx.fillStyle = c;
        ctx.fillRect(x, 44, 22, 24);
        ctx.fillStyle = '#4a9a4a';
        ctx.beginPath();
        ctx.ellipse(x + 11, 34, 14, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e8303a';
        ctx.fillRect(x + 6, 26, 5, 5);
        ctx.fillRect(x + 14, 32, 5, 5);
      };
      pot(4, '#c86a3a');
      pot(34, '#a8b0b8');
      pot(62, '#c86a3a');
    },
    false,
  );
  paintTexture(scene, 'hub-drawings', 70, 60, (ctx) => {
    const rng = new Rng('dibujos-puerta');
    for (const [x, y, a] of [
      [4, 6, -0.1],
      [34, 14, 0.12],
    ] as [number, number, number][]) {
      ctx.save();
      ctx.translate(x + 15, y + 18);
      ctx.rotate(a);
      ctx.fillStyle = '#fffdf6';
      ctx.fillRect(-15, -18, 30, 36);
      crayonFill(ctx, ellipsePoly(0, -2, 8, 8, 10), a > 0 ? '#ffd23a' : '#4ac05a', rng, {
        coverage: 1,
        alpha: 0.9,
      });
      crayonPoly(ctx, rectPoly(-15, -18, 30, 36), rng, { color: '#e8433a', width: 2 });
      ctx.restore();
    }
  });
  // Polvo y telarañas para la puerta olvidada
  paintTexture(scene, 'hub-dust', 90, 130, (ctx) => {
    const rng = new Rng('polvo');
    ctx.strokeStyle = 'rgba(220,220,240,0.35)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(10 + k * 7, 40 - k * 5);
      ctx.stroke();
    }
    for (let r = 10; r < 40; r += 9) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI / 2);
      ctx.stroke();
    }
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = `rgba(200,190,220,${rng.range(0.05, 0.3)})`;
      ctx.fillRect(rng.range(0, 90), rng.range(0, 130), rng.range(1, 3), 1);
    }
  });
}
