/** Hojas de cuadros de personajes para el tren (risografía). */
import { addTexture, css, makeCanvas } from './canvas';
import {
  CELESTE_PAL,
  PEOPLE,
  celeste,
  drawFlat,
  mecha,
  person,
  type Palette,
  type PersonId,
  type Prim,
} from './figure';
import { INK } from './riso';

/** Registra un lienzo con `n` cuadros horizontales como textura con cuadros 0..n-1. */
export function addFrames(
  scene: Phaser.Scene,
  key: string,
  canvas: HTMLCanvasElement,
  fw: number,
  fh: number,
  n: number,
): void {
  addTexture(scene, key, canvas);
  const tex = scene.textures.get(key);
  for (let i = 0; i < n; i++) tex.add(i, 0, i * fw, 0, fw, fh);
}

/** Paleta risográfica: las tintas reinterpretan la ropa, la bufanda queda naranja. */
export const RISO_PAL: Palette = {
  ...CELESTE_PAL,
  coat: 0x2f5dd6,
  coatDark: 0x22398f,
  pants: 0x1b1f3b,
  cap: 0x22398f,
  capBand: 0x1b1f3b,
  skin: 0xe7a37c,
  hair: 0x2a1726,
};

/** Dibuja una figura en dos tintas con desfase (sombra rosa detrás). */
export function drawRiso(
  ctx: CanvasRenderingContext2D,
  prims: Prim[],
  ox: number,
  oy: number,
  scale: number,
  pal: Palette,
  flip = false,
): void {
  const pink = Object.fromEntries(
    Object.keys({ ...CELESTE_PAL, a: 0, b: 0, c: 0, d: 0 }).map((k) => [k, INK.pink]),
  ) as Palette;
  ctx.save();
  ctx.globalAlpha = 0.85;
  drawFlat(ctx, prims, { scale, pal: pink, ox: ox + 2.5, oy: oy + 2, flip });
  ctx.restore();
  drawFlat(ctx, prims, { scale, pal, ox, oy, flip, outline: INK.navy, outlineWidth: 1.2 });
}

const FW = 72;
const FH = 128;

/** Celeste caminando (cuadros 0-7) y quieta (8). */
export function buildCelesteRiso(scene: Phaser.Scene): void {
  const n = 9;
  const [c, ctx] = makeCanvas(FW * n, FH);
  for (let i = 0; i < n; i++) {
    const prims = i < 8 ? celeste(i / 8, false) : celeste(0, true);
    drawRiso(ctx, prims, FW * i + FW / 2, FH - 6, 1.12, RISO_PAL);
  }
  addFrames(scene, 'celeste-riso', c, FW, FH, n);
}

/** Mecha con sus tres vidrios: 0 blanco, 1 verde, 2 rojo, 3 apagada. */
export function buildMechaRiso(scene: Phaser.Scene): void {
  const glass: Record<number, number> = { 0: 0xfff6d0, 1: 0x5fe0a0, 2: 0xff4a4a, 3: 0x55506a };
  const w = 44;
  const h = 56;
  const [c, ctx] = makeCanvas(w * 4, h);
  for (let i = 0; i < 4; i++) {
    const pal: Palette = { metal: 0xd9b45a, coatDark: 0x6a4a1a, eye: INK.navy, white: glass[i] };
    if (i < 3) {
      const g = ctx.createRadialGradient(w * i + w / 2, 30, 2, w * i + w / 2, 30, 22);
      g.addColorStop(0, css(glass[i], 0.7));
      g.addColorStop(1, css(glass[i], 0));
      ctx.fillStyle = g;
      ctx.fillRect(w * i, 0, w, h);
    }
    drawFlat(ctx, mecha('white'), {
      scale: 1.1,
      pal,
      ox: w * i + w / 2,
      oy: h - 4,
      outline: INK.navy,
      outlineWidth: 1,
    });
  }
  addFrames(scene, 'mecha-riso', c, w, h, 4);
}

/** Pasajero en risografía (cuadros 0-7 caminando, 8 quieto). */
export function buildPersonRiso(scene: Phaser.Scene, id: PersonId, pal?: Palette): string {
  const key = `riso-${id}`;
  if (scene.textures.exists(key)) return key;
  const n = 9;
  const [c, ctx] = makeCanvas(FW * n, FH);
  for (let i = 0; i < n; i++) {
    const prims = i < 8 ? person(id, i / 8, false) : person(id, 0, true);
    drawRiso(ctx, prims, FW * i + FW / 2, FH - 6, 1.12, {
      ...PEOPLE[id].pal,
      ...personPal(id),
      ...(pal ?? {}),
    });
  }
  addFrames(scene, key, c, FW, FH, n);
  return key;
}

function personPal(id: PersonId): Palette {
  // En risografía todo es tinta: se conserva la piel y el pelo, la ropa pasa a tintas.
  const base: Record<PersonId, Palette> = {
    reme: { coat: 0x2f5dd6, coatDark: 0x22398f, a: 0x1b1f3b },
    samu: { coat: 0xe8403a, coatDark: 0xb02a26, a: 0xffd23f, pants: 0x2f5dd6 },
    marisol: { coat: 0x5a6280, coatDark: 0x3a4060, a: 0x1b1f3b },
    jairo: { coat: 0xf4ead5, coatDark: 0xd8cdb4, a: 0xff5fa2 },
    chepe: { coat: 0xb0703a, coatDark: 0x804a20, a: 0xffd23f },
    efrain: { coat: 0xf4ead5, coatDark: 0xd8cdb4, a: 0xffd23f },
    abel: { coat: 0x2f5dd6, coatDark: 0x22398f, a: 0x2f5dd6 },
    wilmer: {},
    daniela: {},
    carmenza: {},
    ananias: {},
  };
  return base[id];
}

export function buildCharacterSprites(scene: Phaser.Scene): void {
  buildCelesteRiso(scene);
  buildMechaRiso(scene);
  for (const id of ['reme', 'samu', 'marisol', 'jairo', 'chepe', 'efrain', 'abel'] as PersonId[]) {
    buildPersonRiso(scene, id);
  }
  // Jefe de estación: Abel con otra gorra sirve de silueta genérica.
  buildPersonRiso(scene, 'ananias', { coat: 0x22398f, coatDark: 0x1b1f3b, a: 0x1b1f3b });
}

/** Animaciones de caminar para todas las hojas de cuadros del tren. */
export function buildAnims(scene: Phaser.Scene): void {
  const mk = (key: string, tex: string) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ key: tex, frame: i })),
      frameRate: 12,
      repeat: -1,
    });
  };
  mk('walk-celeste', 'celeste-riso');
  for (const id of ['reme', 'samu', 'marisol', 'jairo', 'chepe', 'efrain', 'abel', 'ananias'])
    mk(`walk-${id}`, `riso-${id}`);
}
