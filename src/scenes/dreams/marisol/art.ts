/** Cianotipia: azul de Prusia con revelado desigual, retícula y trazos blancos. */
import { addTexture, css, fbm, makeCanvas, noise2D, rng } from '../../../gfx/canvas';

export const BLUE = 0x123a7a;
export const LINE = 0xeaf2ff;

export function blueprintBg(scene: Phaser.Scene): string {
  const key = 'mari-bg';
  if (scene.textures.exists(key)) return key;
  const W = 960;
  const H = 540;
  const [c, ctx] = makeCanvas(W, H);
  const n = noise2D(14);
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // revelado desigual: manchas más claras y bordes quemados
      const v = fbm(n, x / 160, y / 160, 4);
      const edge = Math.min(x, y, W - x, H - y) / 60;
      const k = 0.78 + v * 0.35 - (edge < 1 ? (1 - edge) * 0.25 : 0);
      const i = (y * W + x) * 4;
      img.data[i] = 18 * k;
      img.data[i + 1] = 58 * k;
      img.data[i + 2] = 122 * k + 8;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // retícula
  for (let x = 0; x <= W; x += 24) {
    ctx.strokeStyle = css(LINE, x % 120 === 0 ? 0.16 : 0.06);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 24) {
    ctx.strokeStyle = css(LINE, y % 120 === 0 ? 0.16 : 0.06);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  // marco
  ctx.strokeStyle = css(LINE, 0.7);
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, W - 20, H - 20);
  ctx.lineWidth = 1;
  ctx.strokeRect(16, 16, W - 32, H - 32);
  // motas del papel
  const r = rng(3);
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = css(LINE, r() * 0.12);
    ctx.fillRect(r() * W, r() * H, 1.5, 1.5);
  }
  return addTexture(scene, key, c);
}

/** El dibujo de Marisol a los ocho años: una casa encima de un puente. */
export function childDrawing(scene: Phaser.Scene): string {
  const key = 'mari-child';
  if (scene.textures.exists(key)) return key;
  const [c, ctx] = makeCanvas(300, 220);
  const r = rng(8);
  const wob = (pts: number[][]) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const jx = x + (r() - 0.5) * 4;
      const jy = y + (r() - 0.5) * 4;
      if (i === 0) ctx.moveTo(jx, jy);
      else ctx.lineTo(jx, jy);
    });
    ctx.stroke();
  };
  ctx.fillStyle = css(0xf6ead0);
  ctx.fillRect(0, 0, 300, 220);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.strokeStyle = css(0x2a4a8a);
  wob([
    [10, 160],
    [290, 160],
  ]);
  wob([
    [30, 160],
    [60, 210],
  ]);
  wob([
    [270, 160],
    [240, 210],
  ]);
  wob([
    [60, 210],
    [100, 170],
    [150, 210],
    [200, 170],
    [240, 210],
  ]);
  ctx.strokeStyle = css(0xc8283c);
  wob([
    [110, 160],
    [110, 100],
    [190, 100],
    [190, 160],
  ]);
  wob([
    [100, 100],
    [150, 60],
    [200, 100],
  ]);
  ctx.strokeStyle = css(0x2a8a4a);
  wob([
    [140, 160],
    [140, 130],
    [160, 130],
    [160, 160],
  ]);
  ctx.strokeStyle = css(0xe0a020);
  ctx.beginPath();
  ctx.arc(250, 40, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = css(0x2a4a8a);
  ctx.font = '18px "Architects Daughter"';
  ctx.fillText('MI CASA', 112, 30);
  return addTexture(scene, key, c);
}

/** Alzado del puente de San Rafael, con la «grieta» que es una junta. */
export function bridgeElevation(scene: Phaser.Scene): string {
  const key = 'mari-bridge';
  if (scene.textures.exists(key)) return key;
  const [c, ctx] = makeCanvas(760, 160);
  ctx.strokeStyle = css(LINE, 0.9);
  ctx.lineWidth = 2;
  // tablero
  ctx.strokeRect(10, 40, 360, 14);
  ctx.strokeRect(386, 40, 364, 14);
  // pilas y arcos
  for (const x of [120, 260, 500, 640]) {
    ctx.strokeRect(x - 10, 54, 20, 96);
  }
  ctx.beginPath();
  for (const [a, b] of [
    [10, 120],
    [120, 260],
    [260, 370],
    [386, 500],
    [500, 640],
    [640, 750],
  ]) {
    ctx.moveTo(a, 54);
    ctx.quadraticCurveTo((a + b) / 2, 110, b, 54);
  }
  ctx.stroke();
  // agua
  ctx.strokeStyle = css(LINE, 0.4);
  for (let y = 130; y < 160; y += 10) {
    ctx.beginPath();
    for (let x = 0; x <= 760; x += 20) ctx.lineTo(x, y + Math.sin(x / 30) * 3);
    ctx.stroke();
  }
  return addTexture(scene, key, c);
}
