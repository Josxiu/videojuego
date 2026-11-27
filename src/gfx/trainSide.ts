/** El Lucero visto de lado: locomotora verde y crema + coches con ventanas encendidas. */
import { addTexture, css, makeCanvas } from './canvas';
import { INK, halftone } from './riso';

export const TRAIN_SIDE_W = 1500;
export const TRAIN_SIDE_H = 130;

export function buildTrainSide(scene: Phaser.Scene, key = 'riso-train', lit = true): void {
  const w = TRAIN_SIDE_W;
  const h = TRAIN_SIDE_H;
  const [c, ctx] = makeCanvas(w, h);
  const green = 0x1f7a5a;
  const cream = 0xf4ead5;
  // Coches (de izquierda a derecha), la locomotora a la derecha mirando a la derecha.
  const coachW = 240;
  for (let i = 0; i < 5; i++) {
    const x = 10 + i * (coachW + 14);
    ctx.fillStyle = css(green);
    ctx.beginPath();
    ctx.roundRect(x, 30, coachW, 76, 10);
    ctx.fill();
    halftone(ctx, x, 30, coachW, 76, INK.blue, (_x, y) => ((y - 30) / 76) * 0.6, 5);
    ctx.fillStyle = css(cream);
    ctx.fillRect(x, 44, coachW, 26);
    for (let k = 0; k < 6; k++) {
      const wx = x + 14 + k * 37;
      ctx.fillStyle = lit ? css(INK.yellow) : css(INK.navy);
      ctx.beginPath();
      ctx.roundRect(wx, 47, 26, 20, 4);
      ctx.fill();
      if (lit) {
        ctx.fillStyle = css(INK.pink, 0.6);
        ctx.fillRect(wx + 3, 58, 20, 9);
      }
    }
    ctx.fillStyle = css(INK.navy);
    ctx.fillRect(x, 102, coachW, 6);
    for (const bx of [x + 30, x + 60, x + coachW - 60, x + coachW - 30]) {
      ctx.beginPath();
      ctx.arc(bx, 112, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = css(0xd9b45a);
      ctx.beginPath();
      ctx.arc(bx, 112, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = css(INK.navy);
    }
  }
  // Locomotora
  const lx = 10 + 5 * (coachW + 14);
  ctx.fillStyle = css(green);
  ctx.beginPath();
  ctx.moveTo(lx, 30);
  ctx.lineTo(lx + 190, 30);
  ctx.quadraticCurveTo(lx + 236, 36, lx + 236, 80);
  ctx.lineTo(lx + 236, 106);
  ctx.lineTo(lx, 106);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = css(cream);
  ctx.fillRect(lx, 66, 236, 12);
  ctx.fillStyle = css(INK.yellow);
  ctx.beginPath();
  ctx.roundRect(lx + 150, 40, 44, 22, 5);
  ctx.fill();
  ctx.fillStyle = css(0xfff6d0);
  ctx.beginPath();
  ctx.arc(lx + 228, 88, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(INK.navy);
  ctx.font = '800 16px "Big Shoulders Display"';
  ctx.fillText('EL LUCERO', lx + 20, 98);
  for (const bx of [lx + 40, lx + 80, lx + 160, lx + 200]) {
    ctx.fillStyle = css(INK.navy);
    ctx.beginPath();
    ctx.arc(bx, 112, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  addTexture(scene, key, c);
}
