/**
 * Risografía: impresión de tintas planas (rosa fluorescente, azul, amarillo)
 * con semitono, grano de papel y un leve desfase de registro entre tintas.
 * Es la técnica del tren, el menú, la intro y el final.
 */
import { addTexture, css, makeCanvas, noise2D, fbm, rng } from './canvas';

export const INK = {
  pink: 0xff5fa2,
  blue: 0x2f5dd6,
  yellow: 0xffd23f,
  teal: 0x00a3a6,
  red: 0xe8403a,
  navy: 0x1b1f3b,
  cream: 0xf4ead5,
  night: 0x14162e,
} as const;

/** Semitono: puntos en rejilla cuyo radio sigue a `value(x,y)` (0..1). */
export function halftone(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  w: number,
  h: number,
  color: number,
  value: (x: number, y: number) => number,
  cell = 6,
  angle = 0.26,
): void {
  ctx.save();
  ctx.fillStyle = css(color);
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const diag = Math.hypot(w, h);
  for (let v = -diag; v < diag; v += cell) {
    for (let u = -diag; u < diag; u += cell) {
      const x = x0 + w / 2 + u * ca - v * sa;
      const y = y0 + h / 2 + u * sa + v * ca;
      if (x < x0 - cell || x > x0 + w + cell || y < y0 - cell || y > y0 + h + cell) continue;
      const val = value(x, y);
      if (val <= 0.02) continue;
      ctx.beginPath();
      ctx.arc(x, y, (cell / 2) * Math.min(1.25, Math.sqrt(val)) * 1.05, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Grano de papel: motas claras y oscuras para poner encima de todo. */
export function buildGrain(scene: Phaser.Scene): void {
  const [c, ctx] = makeCanvas(256, 256);
  const r = rng(11);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(r() * 256, r() * 256, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  addTexture(scene, 'riso-grain', c);
}

/** Roca del túnel, repetible en horizontal. */
export function buildTunnel(scene: Phaser.Scene): void {
  const w = 512;
  const h = 220;
  const [c, ctx] = makeCanvas(w, h);
  ctx.fillStyle = css(INK.night);
  ctx.fillRect(0, 0, w, h);
  const n = noise2D(5);
  // valor periódico en x para que el mosaico no tenga costura
  const val = (x: number, y: number) => {
    const t = x / w;
    const a = fbm(n, x / 40, y / 40, 4);
    const b = fbm(n, (x - w) / 40, y / 40, 4);
    return a * (1 - t) + b * t;
  };
  halftone(ctx, 0, 0, w, h, INK.blue, (x, y) => (val(x, y) - 0.35) * 1.6, 7, 0.4);
  halftone(ctx, 0, 0, w, h, INK.pink, (x, y) => (val(x + 31, y + 17) - 0.62) * 2.2, 7, 1.1);
  // vetas
  ctx.strokeStyle = css(INK.navy, 0.8);
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const y = 20 + i * 36;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, y + Math.sin((x / w) * Math.PI * 2 * 2 + i) * 6);
    ctx.stroke();
  }
  addTexture(scene, 'riso-tunnel', c);
}

/** Paisaje del amanecer (Acto III, ya fuera del túnel). */
export function buildDawn(scene: Phaser.Scene): void {
  const w = 512;
  const h = 220;
  const [c, ctx] = makeCanvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, css(0xffb3c9));
  g.addColorStop(0.6, css(0xffe39a));
  g.addColorStop(1, css(0xffd23f));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const n = noise2D(9);
  halftone(ctx, 0, 0, w, h, INK.pink, (_x, y) => 0.5 - y / h, 6, 0.3);
  // cerros y bananeras en azul, periódicos
  ctx.fillStyle = css(INK.blue);
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) {
    const t = (x / w) * Math.PI * 2;
    ctx.lineTo(x, 130 + Math.sin(t * 2) * 18 + Math.sin(t * 5) * 8);
  }
  ctx.lineTo(w, h);
  ctx.fill();
  ctx.fillStyle = css(INK.teal);
  for (let x = 0; x < w; x += 32) {
    const y = 175 + n(x / 30, 0) * 8;
    ctx.beginPath();
    ctx.ellipse(x + 16, y, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + 14, y, 4, 40);
  }
  addTexture(scene, 'riso-dawn', c);
}

/** Pared del coche dormitorio con huecos de ventana (las ventanas dejan ver el exterior). */
export const COACH_W = 1100;
export const WALL_TOP = 40;
export const WINDOW_Y = 96;
export const WINDOW_H = 150;
export const FLOOR_Y = 440;
export const WINDOWS = [70, 300, 760]; // x de cada ventana (ancho 200)
export const DOOR_X = 540; // centro de la puerta del camarote

export function buildCoachWall(scene: Phaser.Scene): void {
  const w = COACH_W;
  const h = 500;
  const [c, ctx] = makeCanvas(w, h);
  // panel de madera
  ctx.fillStyle = css(0x7a3b2e);
  ctx.fillRect(0, 0, w, h);
  const r = rng(3);
  halftone(
    ctx,
    0,
    0,
    w,
    h,
    INK.pink,
    (x, y) => 0.25 + 0.2 * Math.sin(x / 9 + Math.sin(y / 40) * 2) + r() * 0.05,
    5,
    0.2,
  );
  halftone(ctx, 0, 0, w, h, INK.navy, (_x, y) => (y > 300 ? 0.45 : 0.15), 6, 0.9);
  // franja crema sobre las ventanas y zócalo
  ctx.fillStyle = css(INK.cream);
  ctx.fillRect(0, 0, w, 56);
  halftone(ctx, 0, 0, w, 56, INK.yellow, () => 0.35, 5);
  ctx.fillStyle = css(INK.navy);
  ctx.fillRect(0, 54, w, 4);
  ctx.fillRect(0, 300, w, 6);
  // ventanas: huecos + marco
  for (const x of WINDOWS) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.roundRect(x, WINDOW_Y - WALL_TOP, 200, WINDOW_H, 18);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = css(0xd9b45a);
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(x - 2, WINDOW_Y - WALL_TOP - 2, 204, WINDOW_H + 4, 20);
    ctx.stroke();
    ctx.strokeStyle = css(INK.navy);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x + 4, WINDOW_Y - WALL_TOP + 5, 200, WINDOW_H + 4, 20);
    ctx.stroke();
  }
  // número de coche bajo la franja (lo pone la escena), portaequipajes
  ctx.fillStyle = css(INK.navy, 0.7);
  for (let x = 20; x < w; x += 18) ctx.fillRect(x, 270, 3, 18);
  ctx.fillRect(10, 286, w - 20, 4);
  addTexture(scene, 'riso-wall', c);
}

/** Puerta de camarote. */
export function buildDoor(scene: Phaser.Scene): void {
  const w = 130;
  const h = 250;
  const [c, ctx] = makeCanvas(w, h);
  ctx.fillStyle = css(0x5a2a22);
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 10);
  ctx.fill();
  halftone(ctx, 0, 0, w, h, INK.pink, (x) => 0.3 + 0.15 * Math.sin(x / 7), 5, 0.1);
  ctx.strokeStyle = css(0xd9b45a);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, h - 8, 8);
  ctx.stroke();
  // ventanita
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.roundRect(30, 30, 70, 80, 30);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = css(0xd9b45a);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(30, 30, 70, 80, 30);
  ctx.stroke();
  // manija
  ctx.fillStyle = css(0xd9b45a);
  ctx.fillRect(98, 140, 16, 6);
  ctx.beginPath();
  ctx.arc(104, 143, 6, 0, Math.PI * 2);
  ctx.fill();
  addTexture(scene, 'riso-door', c);
}

/** Lámpara de techo con halo. */
export function buildLamp(scene: Phaser.Scene): void {
  const [c, ctx] = makeCanvas(220, 220);
  const g = ctx.createRadialGradient(110, 110, 4, 110, 110, 110);
  g.addColorStop(0, 'rgba(255,230,160,0.95)');
  g.addColorStop(0.25, 'rgba(255,170,140,0.45)');
  g.addColorStop(1, 'rgba(255,95,162,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 220, 220);
  addTexture(scene, 'riso-halo', c);
  const [c2, ctx2] = makeCanvas(60, 30);
  ctx2.fillStyle = css(0xd9b45a);
  ctx2.beginPath();
  ctx2.ellipse(30, 10, 28, 9, 0, 0, Math.PI * 2);
  ctx2.fill();
  ctx2.fillStyle = css(0xfff1c2);
  ctx2.beginPath();
  ctx2.ellipse(30, 16, 18, 10, 0, 0, Math.PI);
  ctx2.fill();
  addTexture(scene, 'riso-lamp', c2);
}

/** Alfombra del piso. */
export function buildFloor(scene: Phaser.Scene): void {
  const [c, ctx] = makeCanvas(256, 100);
  ctx.fillStyle = css(0x2a2350);
  ctx.fillRect(0, 0, 256, 100);
  halftone(
    ctx,
    0,
    0,
    256,
    100,
    INK.pink,
    (x, y) => ((Math.floor(x / 32) + Math.floor(y / 25)) % 2 ? 0.45 : 0.12),
    5,
  );
  ctx.fillStyle = css(INK.yellow);
  ctx.fillRect(0, 0, 256, 5);
  addTexture(scene, 'riso-floor', c);
}

/** Cielo nocturno con luna para el menú y la intro. */
export function buildMenuSky(scene: Phaser.Scene, W = 960, H = 540): void {
  const [c, ctx] = makeCanvas(W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, css(INK.night));
  g.addColorStop(1, css(0x2a2350));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  halftone(ctx, 0, 0, W, H, INK.blue, (_x, y) => 0.5 - (y / H) * 0.4, 8, 0.5);
  const r = rng(4);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = r() < 0.3 ? css(INK.yellow) : css(INK.cream);
    ctx.beginPath();
    ctx.arc(r() * W, r() * 330, r() * 1.8 + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = css(INK.pink);
  ctx.beginPath();
  ctx.arc(800, 90, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(INK.night);
  ctx.beginPath();
  ctx.arc(814, 82, 30, 0, Math.PI * 2);
  ctx.fill();
  addTexture(scene, 'menu-sky', c);
}

/** Genera todas las texturas del tren (una vez, en el arranque). */
export function buildRisoTextures(scene: Phaser.Scene): void {
  buildMenuSky(scene);
  buildGrain(scene);
  buildTunnel(scene);
  buildDawn(scene);
  buildCoachWall(scene);
  buildDoor(scene);
  buildLamp(scene);
  buildFloor(scene);
}

/** Dibuja un rótulo con desfase de registro (dos tintas). */
export function misregText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  style: Phaser.Types.GameObjects.Text.TextStyle,
  under = '#2f5dd6',
  over = '#ff5fa2',
  offset = 3,
): Phaser.GameObjects.Text[] {
  const a = scene.add.text(x + offset, y + offset, text, { ...style, color: under });
  const b = scene.add.text(x, y, text, { ...style, color: over });
  a.setBlendMode(Phaser.BlendModes.MULTIPLY);
  return [a, b];
}
