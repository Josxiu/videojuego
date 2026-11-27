/** Plastilina: piezas blandas con brillo, borde oscuro y huellas digitales. */
import { addTexture, css, makeCanvas, mix, rng } from '../../../gfx/canvas';
import { PIECES, type PieceId } from '../../../data/samu';

export const CELL = 54;

/** Bloque de plastilina (rectángulo redondeado con volumen). */
export function clayBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: number,
  seed = 1,
): void {
  const rr = rng(seed);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  const g = ctx.createRadialGradient(
    x + w * 0.32,
    y + h * 0.28,
    2,
    x + w * 0.5,
    y + h * 0.5,
    Math.max(w, h) * 0.75,
  );
  g.addColorStop(0, css(mix(color, 0xffffff, 0.32)));
  g.addColorStop(0.55, css(color));
  g.addColorStop(1, css(mix(color, 0x000000, 0.38)));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = css(mix(color, 0x000000, 0.45), 0.6);
  ctx.stroke();
  ctx.clip();
  // huellas
  ctx.strokeStyle = css(mix(color, 0x000000, 0.25), 0.22);
  ctx.lineWidth = 1;
  const fx = x + w * (0.3 + rr() * 0.4);
  const fy = y + h * (0.3 + rr() * 0.4);
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(fx, fy, i * 3, i * 2.2, rr() * 3, 0, Math.PI * 1.7);
    ctx.stroke();
  }
  ctx.restore();
  // brillo
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.ellipse(
    x + w * 0.3,
    y + h * 0.24,
    Math.min(w, h) * 0.16,
    Math.min(w, h) * 0.08,
    -0.5,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: number) {
  ctx.fillStyle = css(c);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Textura de una pieza (en su orientación base). */
export function pieceTexture(scene: Phaser.Scene, id: PieceId): string {
  const key = `samu-piece-${id}`;
  if (scene.textures.exists(key)) return key;
  const def = PIECES[id];
  const cw = Math.max(...def.cells.map((c) => c[0])) + 1;
  const ch = Math.max(...def.cells.map((c) => c[1])) + 1;
  const pad = 4;
  const [c, ctx] = makeCanvas(cw * CELL, ch * CELL);
  const has = (x: number, y: number) => def.cells.some(([a, b]) => a === x && b === y);
  // puentes entre celdas vecinas para que parezca una sola masa
  ctx.fillStyle = css(def.color);
  for (const [x, y] of def.cells) {
    if (has(x + 1, y))
      ctx.fillRect(x * CELL + CELL / 2, y * CELL + pad + 6, CELL, CELL - pad * 2 - 12);
    if (has(x, y + 1))
      ctx.fillRect(x * CELL + pad + 6, y * CELL + CELL / 2, CELL - pad * 2 - 12, CELL);
  }
  def.cells.forEach(([x, y], i) =>
    clayBlob(
      ctx,
      x * CELL + pad,
      y * CELL + pad,
      CELL - pad * 2,
      CELL - pad * 2,
      14,
      def.color,
      i + 3,
    ),
  );
  const W = cw * CELL;
  const H = ch * CELL;
  // decoración
  ctx.save();
  switch (id) {
    case 'balon':
      dot(ctx, 27, 27, 9, 0x22222a);
      dot(ctx, 14, 16, 4, 0x22222a);
      dot(ctx, 40, 16, 4, 0x22222a);
      dot(ctx, 16, 40, 4, 0x22222a);
      dot(ctx, 39, 40, 4, 0x22222a);
      break;
    case 'guayos':
      for (let k = 0; k < 6; k++) dot(ctx, 14 + k * 15, 44, 3, 0xd8d8d8);
      ctx.fillStyle = css(0xf2c230);
      ctx.fillRect(20, 22, 70, 5);
      break;
    case 'marimba':
    case 'marimbaG':
      for (let k = 0; k < (id === 'marimba' ? 7 : 10); k++) {
        ctx.fillStyle = css(mix(0x6a3a1e, 0xf0c080, k / 10));
        ctx.fillRect(10 + k * 15, 14 - k * 0.5, 10, 26 + k);
      }
      break;
    case 'heroe':
      dot(ctx, 27, 22, 10, 0x5a3622);
      ctx.fillStyle = css(0x1e3a8a);
      ctx.fillRect(14, 60, 26, 30);
      ctx.fillStyle = css(0xf2c230);
      ctx.fillRect(16, 66, 22, 6);
      dot(ctx, 24, 20, 2, 0xffffff);
      dot(ctx, 31, 20, 2, 0xffffff);
      break;
    case 'vaca':
      for (const [x, y, r] of [
        [30, 30, 12],
        [74, 40, 9],
        [40, 78, 14],
        [80, 80, 8],
      ])
        dot(ctx, x, y, r, 0x22222a);
      dot(ctx, 82, 20, 6, 0xf2a0b0);
      dot(ctx, 22, 88, 5, 0xf2a0b0);
      break;
    case 'cuaderno':
      ctx.strokeStyle = css(0xf4f4ea);
      ctx.lineWidth = 3;
      for (let k = 0; k < 4; k++) ctx.strokeRect(14 + k * 36, 16, 26, 22);
      break;
    case 'chaqueta':
      ctx.strokeStyle = css(0x8a6a10);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(W / 2, 8);
      ctx.lineTo(W / 2, H - 8);
      ctx.stroke();
      break;
    case 'tambor':
      ctx.strokeStyle = css(0xf2d8a0);
      ctx.lineWidth = 3;
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo(10, 20 + k * 28);
        ctx.lineTo(44, 34 + k * 28);
        ctx.stroke();
      }
      break;
    case 'acordeon':
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = css(k % 2 ? 0xf4f4ea : 0x22222a);
        ctx.fillRect(14 + (k % 2) * 46, 14 + Math.floor(k / 2) * 50, 30, 10);
      }
      dot(ctx, 40, 40, 5, 0xd9b45a);
      break;
    case 'camiseta':
      ctx.fillStyle = css(0xc8283c);
      ctx.fillRect(4, 64, W - 8, 12);
      ctx.fillRect(4, 88, W - 8, 8);
      ctx.fillStyle = css(0xf4f4ea);
      ctx.font = '700 22px Fredoka';
      ctx.fillText('10', 66, 98);
      break;
    case 'pico':
      for (let k = 0; k < 4; k++) dot(ctx, 27, 27 + k * 54, 14, 0x22222a);
      dot(ctx, 81, 189, 10, 0xff6ad5);
      break;
    case 'samu':
      dot(ctx, 27, 26, 15, 0x5a3622);
      for (let k = 0; k < 5; k++) dot(ctx, 15 + k * 6, 13, 6, 0x120c08);
      dot(ctx, 22, 26, 2.5, 0xffffff);
      dot(ctx, 32, 26, 2.5, 0xffffff);
      ctx.fillStyle = css(0xd8352e);
      ctx.fillRect(10, 58, 34, 40);
      ctx.fillStyle = css(0x1e3a8a);
      ctx.fillRect(12, 112, 30, 34);
      break;
    case 'tiquete':
      ctx.fillStyle = css(0xc8283c);
      ctx.fillRect(8, 12, 38, 8);
      dot(ctx, 36, 36, 4, 0x2a2a2a);
      break;
  }
  ctx.restore();
  return addTexture(scene, key, c);
}

/** Cuarto de plastilina: pared azul con estrellas, ventana con luna y piso de madera. */
export function roomTexture(scene: Phaser.Scene): string {
  const key = 'samu-room';
  if (scene.textures.exists(key)) return key;
  const [c, ctx] = makeCanvas(960, 540);
  const g = ctx.createLinearGradient(0, 0, 0, 400);
  g.addColorStop(0, '#5a7ec8');
  g.addColorStop(1, '#7a9ad8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 960, 540);
  const r = rng(5);
  for (let i = 0; i < 10; i++) {
    const x = 230 + r() * 400;
    const y = 70 + r() * 60;
    clayBlob(ctx, x, y, 14 + r() * 8, 14 + r() * 8, 8, 0xf2d24a, i);
  }
  // ventana con luna
  clayBlob(ctx, 40, 60, 170, 150, 20, 0xb0703a, 50);
  clayBlob(ctx, 56, 76, 138, 118, 14, 0x1f2a5a, 51);
  clayBlob(ctx, 130, 92, 40, 40, 20, 0xf6f0c8, 52);
  // piso
  clayBlob(ctx, -20, 440, 1000, 140, 30, 0xc08a52, 53);
  for (let x = 0; x < 960; x += 90) {
    ctx.strokeStyle = 'rgba(90,50,20,0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 450);
    ctx.lineTo(x - 30, 540);
    ctx.stroke();
  }
  // banderín del Chocó en la pared
  clayBlob(ctx, 40, 250, 90, 54, 10, 0x3aa655, 60);
  clayBlob(ctx, 40, 268, 90, 18, 6, 0xf2c230, 61);
  clayBlob(ctx, 40, 286, 90, 18, 6, 0x1e5ab0, 62);
  return addTexture(scene, key, c);
}

/** Maleta de plastilina con su rejilla de huecos. */
export function suitcaseTexture(scene: Phaser.Scene, cols: number, rows: number): string {
  const key = `samu-case-${cols}x${rows}`;
  if (scene.textures.exists(key)) return key;
  const pad = 22;
  const w = cols * CELL + pad * 2;
  const h = rows * CELL + pad * 2;
  const [c, ctx] = makeCanvas(w + 10, h + 50);
  // asa
  ctx.lineWidth = 12;
  ctx.strokeStyle = css(0x6a3a1e);
  ctx.beginPath();
  ctx.roundRect(w / 2 - 50, 4, 100, 50, 22);
  ctx.stroke();
  clayBlob(ctx, 0, 36, w, h, 26, 0x8a5230, 70);
  // huecos
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.fillStyle = 'rgba(40,20,10,0.35)';
      ctx.beginPath();
      ctx.roundRect(pad + x * CELL + 3, 36 + pad + y * CELL + 3, CELL - 6, CELL - 6, 10);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,230,200,0.18)';
      ctx.beginPath();
      ctx.roundRect(pad + x * CELL + 6, 36 + pad + y * CELL + 6, CELL - 12, 8, 4);
      ctx.fill();
    }
  }
  return addTexture(scene, key, c);
}

export function latchTexture(scene: Phaser.Scene): string {
  const key = 'samu-latch';
  if (scene.textures.exists(key)) return key;
  const [c, ctx] = makeCanvas(36, 30);
  clayBlob(ctx, 2, 2, 32, 26, 8, 0xd9b45a, 80);
  ctx.fillStyle = css(0x6a4a1a);
  ctx.fillRect(14, 10, 8, 10);
  return addTexture(scene, key, c);
}
