/**
 * Personajes como figuras de primitivas (elipses, polígonos, trazos) en un
 * sistema local de 100 unidades de alto con los pies en (0,0). Cada técnica
 * las dibuja a su modo (puntos, plastilina, neón…), pero la silueta es la
 * misma: así Celeste se reconoce en todos los sueños.
 */
import { CELESTE_KEY } from '../config';
import { css, jitter, makeCanvas, mix, rng } from './canvas';

export type Role =
  | 'skin'
  | 'hair'
  | 'coat'
  | 'coatDark'
  | 'scarf'
  | 'cap'
  | 'capBand'
  | 'pants'
  | 'shoe'
  | 'metal'
  | 'eye'
  | 'white'
  | 'a'
  | 'b'
  | 'c'
  | 'd';

export type Prim =
  | { k: 'ell'; x: number; y: number; rx: number; ry: number; role: Role; rot?: number }
  | { k: 'poly'; pts: number[]; role: Role }
  | { k: 'line'; pts: number[]; w: number; role: Role };

export type Palette = Partial<Record<Role, number>>;

/** Paleta «natural» de Celeste. Cada técnica puede reinterpretarla salvo la bufanda. */
export const CELESTE_PAL: Palette = {
  skin: 0xc98a5e,
  hair: 0x2a1a14,
  coat: 0x2b3f73,
  coatDark: 0x1d2a4d,
  scarf: CELESTE_KEY,
  cap: 0x22325c,
  capBand: 0x111a33,
  pants: 0x1d2a4d,
  shoe: 0x14110f,
  metal: 0xd9b45a,
  eye: 0x1a0f0a,
  white: 0xf4ead5,
};

const rot = (x: number, y: number, cx: number, cy: number, a: number): [number, number] => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
};

/** Un miembro (pierna o brazo) como polígono que gira alrededor de su articulación. */
function limb(x: number, y: number, len: number, w: number, a: number, role: Role): Prim {
  const pts = [x - w / 2, y, x + w / 2, y, x + w / 2 - 0.5, y + len, x - w / 2 + 0.5, y + len];
  const out: number[] = [];
  for (let i = 0; i < pts.length; i += 2) out.push(...rot(pts[i], pts[i + 1], x, y, a));
  return { k: 'poly', pts: out, role };
}

/** Celeste. `phase` es el ciclo de paso (0..1); `still` = de pie. */
export function celeste(
  phase = 0,
  still = true,
  opts: { punch?: boolean; arms?: number } = {},
): Prim[] {
  const sw = still ? 0 : Math.sin(phase * Math.PI * 2) * 0.45;
  const bob = still ? 0 : Math.abs(Math.sin(phase * Math.PI * 2)) * -1.5;
  const arms = opts.arms ?? 0;
  const p: Prim[] = [];
  // Trenza (detrás)
  for (let i = 0; i < 5; i++) {
    p.push({
      k: 'ell',
      x: -8 - i * 0.6 + sw * i,
      y: -78 + i * 6 + bob,
      rx: 3.2 - i * 0.25,
      ry: 4,
      role: 'hair',
    });
  }
  // Pierna de atrás, brazo de atrás
  p.push(limb(-2, -44 + bob, 42, 7, sw, 'pants'));
  p.push({ k: 'ell', x: -2 + Math.sin(sw) * -42 + 2, y: -1, rx: 5, ry: 2.5, role: 'shoe' });
  p.push(limb(-6, -74 + bob, 28, 5.5, -sw * 0.8 - arms, 'coatDark'));
  // Chaqueta
  p.push({
    k: 'poly',
    pts: [-11, -78 + bob, 10, -78 + bob, 12, -40 + bob, -12, -40 + bob],
    role: 'coat',
  });
  p.push({ k: 'line', pts: [0, -76 + bob, 0, -42 + bob], w: 1, role: 'coatDark' });
  for (let i = 0; i < 3; i++)
    p.push({ k: 'ell', x: 3, y: -70 + i * 9 + bob, rx: 1.4, ry: 1.4, role: 'metal' });
  // Pierna de adelante
  p.push(limb(3, -44 + bob, 42, 7, -sw, 'pants'));
  p.push({ k: 'ell', x: 3 + Math.sin(-sw) * -42 + 3, y: -1, rx: 5.5, ry: 2.5, role: 'shoe' });
  // Cabeza
  p.push({ k: 'ell', x: 1, y: -88 + bob, rx: 8.5, ry: 9.5, role: 'skin' });
  p.push({ k: 'ell', x: -5.5, y: -89 + bob, rx: 4.5, ry: 8, role: 'hair' });
  p.push({ k: 'ell', x: 1, y: -94.5 + bob, rx: 8, ry: 2.6, role: 'hair' });
  p.push({ k: 'ell', x: 5, y: -88 + bob, rx: 1.2, ry: 1.5, role: 'eye' });
  p.push({ k: 'line', pts: [4, -83.5 + bob, 7, -83.8 + bob], w: 0.9, role: 'eye' });
  // Bufanda (color clave) con punta al viento
  p.push({
    k: 'poly',
    pts: [-10, -80 + bob, 10, -80 + bob, 9, -74 + bob, -9, -74 + bob],
    role: 'scarf',
  });
  p.push({
    k: 'poly',
    pts: [-8, -78 + bob, -22, -74 + bob + sw * 3, -20, -69 + bob + sw * 3, -7, -74 + bob],
    role: 'scarf',
  });
  // Gorra de plato (grande)
  p.push({ k: 'ell', x: 0, y: -97 + bob, rx: 12, ry: 4.5, role: 'cap' });
  p.push({
    k: 'poly',
    pts: [-9, -97 + bob, 9, -97 + bob, 9, -93 + bob, -9, -93 + bob],
    role: 'capBand',
  });
  p.push({
    k: 'poly',
    pts: [6, -94 + bob, 15, -92 + bob, 13, -90.5 + bob, 6, -92 + bob],
    role: 'capBand',
  });
  p.push({ k: 'ell', x: 0, y: -95 + bob, rx: 1.6, ry: 1.4, role: 'metal' });
  // Brazo de adelante con la ponchadora
  const a = sw * 0.8 + arms;
  p.push(limb(6, -74 + bob, 28, 5.5, a, 'coat'));
  const hx = 6 + Math.sin(-a) * 28;
  const hy = -74 + bob + Math.cos(a) * 28;
  p.push({ k: 'ell', x: hx, y: hy, rx: 3, ry: 3, role: 'skin' });
  if (opts.punch !== false) {
    p.push({
      k: 'poly',
      pts: [hx - 1, hy - 2, hx + 7, hy - 4, hx + 8, hy - 1, hx, hy + 1],
      role: 'metal',
    });
  }
  return p;
}

/** Mecha, la farola de señales. `glass` = color del vidrio encendido. */
export function mecha(glass: Role = 'white'): Prim[] {
  return [
    { k: 'line', pts: [-7, -34, -6, -42, 6, -42, 7, -34], w: 1.6, role: 'metal' },
    { k: 'poly', pts: [-9, -34, 9, -34, 8, -30, -8, -30], role: 'metal' },
    { k: 'ell', x: 0, y: -21, rx: 8, ry: 10, role: glass },
    { k: 'line', pts: [-8, -21, 8, -21], w: 1, role: 'metal' },
    { k: 'line', pts: [0, -31, 0, -11], w: 1, role: 'metal' },
    { k: 'poly', pts: [-10, -12, 10, -12, 11, -4, -11, -4], role: 'metal' },
    { k: 'poly', pts: [-12, -4, 12, -4, 12, 0, -12, 0], role: 'coatDark' },
    // ojitos de lata
    { k: 'ell', x: -4, y: -8, rx: 1.2, ry: 1.2, role: 'eye' },
    { k: 'ell', x: 4, y: -8, rx: 1.2, ry: 1.2, role: 'eye' },
  ];
}

/** Figura genérica de pasajero: torso, cabeza, piernas; con accesorios por id. */
export type PersonId =
  | 'reme'
  | 'samu'
  | 'marisol'
  | 'jairo'
  | 'chepe'
  | 'efrain'
  | 'abel'
  | 'wilmer'
  | 'daniela'
  | 'carmenza'
  | 'ananias';

interface PersonSpec {
  h: number;
  w: number;
  pal: Palette;
}

export const PEOPLE: Record<PersonId, PersonSpec> = {
  reme: {
    h: 82,
    w: 15,
    pal: {
      skin: 0xd1a07a,
      hair: 0xcfcac2,
      coat: 0x6b7f9e,
      coatDark: 0x45546e,
      a: 0x3b2a20,
      pants: 0x3d3a3a,
      shoe: 0x231a14,
      eye: 0x1a0f0a,
    },
  },
  samu: {
    h: 62,
    w: 11,
    pal: {
      skin: 0x5a3622,
      hair: 0x120c08,
      coat: 0xd8352e,
      coatDark: 0xa82620,
      a: 0xf2c230,
      pants: 0x1e3a8a,
      shoe: 0xf2f2f2,
      eye: 0x0a0605,
    },
  },
  marisol: {
    h: 94,
    w: 12,
    pal: {
      skin: 0xe0b48e,
      hair: 0x3a2418,
      coat: 0x6d6f78,
      coatDark: 0x4a4c55,
      a: 0x1c1c22,
      pants: 0x2c2d33,
      shoe: 0x111111,
      eye: 0x1a0f0a,
    },
  },
  jairo: {
    h: 97,
    w: 14,
    pal: {
      skin: 0xb07a52,
      hair: 0xd8c7a0,
      coat: 0xefe6d2,
      coatDark: 0xc9bfa8,
      a: 0x8e1f3a,
      pants: 0x2a2a2e,
      shoe: 0x3a2014,
      eye: 0x1a0f0a,
    },
  },
  chepe: {
    h: 90,
    w: 18,
    pal: {
      skin: 0xc28a62,
      hair: 0x2b2b2b,
      coat: 0x7a5a3a,
      coatDark: 0x5a4028,
      a: 0xe2c044,
      pants: 0x34414f,
      shoe: 0x1a1410,
      eye: 0x1a0f0a,
    },
  },
  efrain: {
    h: 86,
    w: 12,
    pal: {
      skin: 0x9a6a46,
      hair: 0xe8e4dc,
      coat: 0xf4f1ea,
      coatDark: 0xd8d2c4,
      a: 0xe0cf9a,
      pants: 0xbfb6a2,
      shoe: 0x5a3a24,
      eye: 0x1a0f0a,
    },
  },
  abel: {
    h: 95,
    w: 15,
    pal: {
      skin: 0xc79470,
      hair: 0x9a9a9a,
      coat: 0x2e4a6b,
      coatDark: 0x1f3550,
      a: 0x2e4a6b,
      pants: 0x1f3550,
      shoe: 0x14110f,
      eye: 0x1a0f0a,
    },
  },
  wilmer: {
    h: 112,
    w: 20,
    pal: {
      skin: 0x4a2c1c,
      hair: 0x0e0a08,
      coat: 0xf08a1c,
      coatDark: 0x2b4a7a,
      a: 0xf2d230,
      pants: 0x2b4a7a,
      shoe: 0x241a12,
      eye: 0x0a0605,
    },
  },
  daniela: {
    h: 92,
    w: 12,
    pal: {
      skin: 0xb98058,
      hair: 0x2a160c,
      coat: 0xf6f0ea,
      coatDark: 0xe2d6cc,
      a: 0xf6f0ea,
      pants: 0xf6f0ea,
      shoe: 0xe8dccf,
      eye: 0x1a0f0a,
    },
  },
  carmenza: {
    h: 80,
    w: 13,
    pal: {
      skin: 0x8e5e3e,
      hair: 0xd6d2cc,
      coat: 0x9a6aa8,
      coatDark: 0x704c7c,
      a: 0xe0e0e8,
      pants: 0x704c7c,
      shoe: 0x3a2a20,
      eye: 0x1a0f0a,
    },
  },
  ananias: {
    h: 98,
    w: 15,
    pal: {
      skin: 0xc49a76,
      hair: 0x9a9a9a,
      coat: 0x8a6a48,
      coatDark: 0x5c4630,
      a: 0x2a2420,
      pants: 0x3a3430,
      shoe: 0x231a14,
      eye: 0x1a0f0a,
    },
  },
};

export function person(id: PersonId, phase = 0, still = true): Prim[] {
  const s = PEOPLE[id];
  const k = s.h / 100;
  const w = s.w;
  const sw = still ? 0 : Math.sin(phase * Math.PI * 2) * 0.4;
  const legTop = -44 * k;
  const shoulder = -78 * k;
  const headY = -88 * k;
  const p: Prim[] = [];
  const leg = (x: number, a: number) => {
    p.push(limb(x, legTop, -legTop - 1, w * 0.42, a, 'pants'));
    p.push({
      k: 'ell',
      x: x + Math.sin(-a) * legTop + 2,
      y: -1,
      rx: w * 0.36,
      ry: 2.2,
      role: 'shoe',
    });
  };
  leg(-w * 0.2, sw);
  p.push(limb(-w * 0.55, shoulder + 3, 28 * k, w * 0.32, -sw * 0.7, 'coatDark'));
  // torso
  const belly = id === 'chepe' ? 6 : 0;
  p.push({
    k: 'poly',
    pts: [
      -w * 0.75,
      shoulder,
      w * 0.7,
      shoulder,
      w * 0.8 + belly,
      legTop + 4,
      -w * 0.8,
      legTop + 4,
    ],
    role: 'coat',
  });
  if (id === 'reme' || id === 'ananias') {
    // ruana: triángulo ancho sobre el torso
    p.push({
      k: 'poly',
      pts: [
        -w * 1.15,
        shoulder + 26 * k,
        0,
        shoulder - 2,
        w * 1.15,
        shoulder + 26 * k,
        0,
        shoulder + 34 * k,
      ],
      role: id === 'reme' ? 'coat' : 'coatDark',
    });
    p.push({
      k: 'line',
      pts: [-w * 1.1, shoulder + 26 * k, w * 1.1, shoulder + 26 * k],
      w: 1.2,
      role: 'a',
    });
  }
  if (id === 'daniela') {
    p.push({
      k: 'poly',
      pts: [-w * 0.8, legTop, w * 0.8, legTop, w * 1.4, -1, -w * 1.4, -1],
      role: 'coat',
    });
  }
  leg(w * 0.25, -sw);
  // cabeza
  const hr = id === 'samu' ? 9 : 8;
  p.push({ k: 'ell', x: 1, y: headY, rx: hr * 0.95, ry: hr * 1.08, role: 'skin' });
  p.push({ k: 'ell', x: hr * 0.5, y: headY - 0.5, rx: 1.1, ry: 1.3, role: 'eye' });
  switch (id) {
    case 'reme':
      p.push({ k: 'ell', x: -2, y: headY - 5, rx: 9, ry: 5, role: 'hair' });
      p.push({ k: 'ell', x: 0, y: headY - 9, rx: 11, ry: 2.5, role: 'a' });
      p.push({ k: 'ell', x: 0, y: headY - 12, rx: 6, ry: 4, role: 'a' });
      p.push({ k: 'line', pts: [-6, headY, -7, headY + 12], w: 2.2, role: 'hair' });
      break;
    case 'samu':
      for (let i = 0; i < 6; i++)
        p.push({
          k: 'ell',
          x: -6 + i * 2.4,
          y: headY - 7 - (i % 2),
          rx: 3.4,
          ry: 3.2,
          role: 'hair',
        });
      p.push({
        k: 'poly',
        pts: [
          -w * 0.6,
          shoulder + 6,
          w * 0.6,
          shoulder + 6,
          w * 0.6,
          shoulder + 10,
          -w * 0.6,
          shoulder + 10,
        ],
        role: 'a',
      });
      break;
    case 'marisol':
      p.push({ k: 'ell', x: -2, y: headY - 4, rx: 8.5, ry: 6, role: 'hair' });
      p.push({ k: 'ell', x: -7, y: headY - 8, rx: 4, ry: 4, role: 'hair' });
      p.push({ k: 'line', pts: [1, headY - 1, 9, headY - 1], w: 1.4, role: 'a' });
      p.push({ k: 'ell', x: 5, y: headY - 0.5, rx: 2.6, ry: 2.2, role: 'a' });
      break;
    case 'jairo':
      p.push({ k: 'ell', x: 0, y: headY - 6, rx: 8, ry: 4, role: 'hair' });
      p.push({ k: 'line', pts: [3, headY + 4, 8, headY + 4], w: 1.6, role: 'hair' });
      p.push({
        k: 'poly',
        pts: [
          -w * 0.65,
          shoulder - 3,
          w * 0.6,
          shoulder - 3,
          w * 0.55,
          shoulder + 5,
          -w * 0.6,
          shoulder + 5,
        ],
        role: 'a',
      });
      p.push({
        k: 'poly',
        pts: [
          -w * 0.5,
          shoulder + 2,
          -w * 0.9,
          shoulder + 22,
          -w * 0.4,
          shoulder + 22,
          -w * 0.2,
          shoulder + 3,
        ],
        role: 'a',
      });
      break;
    case 'chepe':
      p.push({ k: 'ell', x: 0, y: headY - 6, rx: 9, ry: 4, role: 'hair' });
      p.push({
        k: 'poly',
        pts: [-9, headY - 6, 9, headY - 6, 16, headY - 4, 9, headY - 3, -9, headY - 3],
        role: 'a',
      });
      p.push({ k: 'line', pts: [2, headY + 4, 9, headY + 4], w: 2.2, role: 'hair' });
      break;
    case 'efrain':
      p.push({ k: 'ell', x: 0, y: headY - 7, rx: 13, ry: 2.4, role: 'a' });
      p.push({ k: 'ell', x: 0, y: headY - 10, rx: 7, ry: 4, role: 'a' });
      p.push({ k: 'line', pts: [-12, headY - 7, 12, headY - 7], w: 0.8, role: 'coatDark' });
      break;
    case 'abel':
      p.push({ k: 'ell', x: 0, y: headY - 7, rx: 10, ry: 3.5, role: 'coat' });
      p.push({
        k: 'poly',
        pts: [5, headY - 5, 14, headY - 4, 12, headY - 2.5, 5, headY - 3.5],
        role: 'coatDark',
      });
      p.push({ k: 'line', pts: [2, headY + 4, 9, headY + 4], w: 2, role: 'hair' });
      break;
    case 'wilmer':
      p.push({ k: 'ell', x: 0, y: headY - 7, rx: 10, ry: 6, role: 'a' });
      p.push({ k: 'ell', x: 0, y: headY - 4, rx: 12, ry: 2, role: 'a' });
      break;
    case 'daniela':
      p.push({ k: 'ell', x: -2, y: headY - 3, rx: 9, ry: 8, role: 'hair' });
      p.push({ k: 'poly', pts: [-6, headY - 9, -18, headY + 20, -4, headY + 20], role: 'white' });
      break;
    case 'carmenza':
      p.push({ k: 'ell', x: -1, y: headY - 5, rx: 9, ry: 6, role: 'hair' });
      p.push({ k: 'ell', x: 6, y: headY + 4, rx: 1.6, ry: 1.6, role: 'a' });
      break;
    case 'ananias':
      p.push({ k: 'ell', x: 0, y: headY - 8, rx: 12, ry: 2.5, role: 'a' });
      p.push({ k: 'ell', x: 0, y: headY - 11, rx: 7, ry: 4, role: 'a' });
      break;
  }
  p.push(limb(w * 0.55, shoulder + 3, 28 * k, w * 0.32, sw * 0.7, 'coat'));
  return p;
}

// ---------------- Dibujo ----------------

export interface DrawOpts {
  scale: number;
  pal: Palette;
  /** Desplazamiento del origen (pies) dentro del lienzo. */
  ox: number;
  oy: number;
  flip?: boolean;
  outline?: number;
  outlineWidth?: number;
}

function tracePrim(ctx: CanvasRenderingContext2D, p: Prim, o: DrawOpts): void {
  const sx = (x: number) => o.ox + (o.flip ? -x : x) * o.scale;
  const sy = (y: number) => o.oy + y * o.scale;
  ctx.beginPath();
  if (p.k === 'ell') {
    ctx.ellipse(
      sx(p.x),
      sy(p.y),
      Math.abs(p.rx * o.scale),
      Math.abs(p.ry * o.scale),
      p.rot ?? 0,
      0,
      Math.PI * 2,
    );
  } else {
    ctx.moveTo(sx(p.pts[0]), sy(p.pts[1]));
    for (let i = 2; i < p.pts.length; i += 2) ctx.lineTo(sx(p.pts[i]), sy(p.pts[i + 1]));
    if (p.k === 'poly') ctx.closePath();
  }
}

function colorOf(role: Role, pal: Palette): number {
  return pal[role] ?? CELESTE_PAL[role] ?? 0xff00ff;
}

/** Relleno plano (base de casi todas las técnicas). */
export function drawFlat(ctx: CanvasRenderingContext2D, prims: Prim[], o: DrawOpts): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (o.outline !== undefined) {
    ctx.strokeStyle = css(o.outline);
    ctx.lineWidth = (o.outlineWidth ?? 2.5) * 2;
    for (const p of prims) {
      tracePrim(ctx, p, o);
      if (p.k === 'line') {
        ctx.lineWidth = p.w * o.scale + (o.outlineWidth ?? 2.5) * 2;
        ctx.stroke();
        ctx.lineWidth = (o.outlineWidth ?? 2.5) * 2;
      } else ctx.stroke();
    }
  }
  for (const p of prims) {
    tracePrim(ctx, p, o);
    const c = css(colorOf(p.role, o.pal));
    if (p.k === 'line') {
      ctx.strokeStyle = c;
      ctx.lineWidth = p.w * o.scale;
      ctx.stroke();
    } else {
      ctx.fillStyle = c;
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Solo contornos (cianotipia, neón, filigrana). */
export function drawStroke(
  ctx: CanvasRenderingContext2D,
  prims: Prim[],
  o: DrawOpts,
  width: number,
  color: (role: Role) => string,
): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const p of prims) {
    tracePrim(ctx, p, o);
    ctx.strokeStyle = color(p.role);
    ctx.lineWidth = p.k === 'line' ? Math.max(width, p.w * o.scale * 0.6) : width;
    ctx.stroke();
  }
  ctx.restore();
}

/** Plastilina: degradado blando, borde oscuro y brillo. */
export function drawClay(
  ctx: CanvasRenderingContext2D,
  prims: Prim[],
  o: DrawOpts,
  seed = 1,
): void {
  const r = rng(seed);
  ctx.save();
  for (const p of prims) {
    const base = colorOf(p.role, o.pal);
    tracePrim(ctx, p, o);
    if (p.k === 'line') {
      ctx.strokeStyle = css(base);
      ctx.lineWidth = p.w * o.scale * 1.3;
      ctx.lineCap = 'round';
      ctx.stroke();
      continue;
    }
    // caja aproximada para el degradado
    let cx: number, cy: number, rad: number;
    if (p.k === 'ell') {
      cx = o.ox + (o.flip ? -p.x : p.x) * o.scale;
      cy = o.oy + p.y * o.scale;
      rad = Math.max(p.rx, p.ry) * o.scale;
    } else {
      let mnx = Infinity,
        mny = Infinity,
        mxx = -Infinity,
        mxy = -Infinity;
      for (let i = 0; i < p.pts.length; i += 2) {
        const x = o.ox + (o.flip ? -p.pts[i] : p.pts[i]) * o.scale;
        const y = o.oy + p.pts[i + 1] * o.scale;
        mnx = Math.min(mnx, x);
        mxx = Math.max(mxx, x);
        mny = Math.min(mny, y);
        mxy = Math.max(mxy, y);
      }
      cx = (mnx + mxx) / 2;
      cy = (mny + mxy) / 2;
      rad = Math.max(mxx - mnx, mxy - mny) / 2;
    }
    const g = ctx.createRadialGradient(
      cx - rad * 0.35,
      cy - rad * 0.4,
      rad * 0.1,
      cx,
      cy,
      rad * 1.25,
    );
    g.addColorStop(0, css(mix(base, 0xffffff, 0.28)));
    g.addColorStop(0.55, css(base));
    g.addColorStop(1, css(mix(base, 0x000000, 0.35)));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = css(mix(base, 0x000000, 0.4), 0.5);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // huellas digitales
    if (rad > 6) {
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = css(mix(base, 0x000000, 0.2), 0.18);
      ctx.lineWidth = 0.8;
      const fx = cx + (r() - 0.5) * rad;
      const fy = cy + (r() - 0.5) * rad;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(fx, fy, i * 2.2, i * 1.6, r() * 3, 0, Math.PI * 1.6);
        ctx.stroke();
      }
      ctx.restore();
    }
    // brillo
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx - rad * 0.35, cy - rad * 0.45, rad * 0.22, rad * 0.12, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Puntillismo: rellena la silueta con puntos de color variado. */
export function drawDots(
  ctx: CanvasRenderingContext2D,
  prims: Prim[],
  o: DrawOpts,
  density = 0.5,
  dot = 2.2,
  seed = 7,
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const [tc, tctx] = makeCanvas(w, h);
  drawFlat(tctx, prims, o);
  const data = tctx.getImageData(0, 0, w, h).data;
  const r = rng(seed);
  const n = Math.floor(w * h * density * 0.12);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * w);
    const y = Math.floor(r() * h);
    const idx = (y * w + x) * 4;
    if (data[idx + 3] < 128) continue;
    const col = (data[idx] << 16) | (data[idx + 1] << 8) | data[idx + 2];
    ctx.fillStyle = css(jitter(col, 38, r));
    ctx.beginPath();
    ctx.arc(x, y, dot * (0.6 + r() * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
  void tc;
}

/** Óleo empastado: pinceladas cortas y gruesas dentro de la silueta. */
export function drawOil(ctx: CanvasRenderingContext2D, prims: Prim[], o: DrawOpts, seed = 3): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const [, tctx] = makeCanvas(w, h);
  drawFlat(tctx, prims, o);
  const data = tctx.getImageData(0, 0, w, h).data;
  const r = rng(seed);
  ctx.save();
  ctx.lineCap = 'round';
  const n = Math.floor(w * h * 0.05);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * w);
    const y = Math.floor(r() * h);
    const idx = (y * w + x) * 4;
    if (data[idx + 3] < 128) continue;
    const col = (data[idx] << 16) | (data[idx + 1] << 8) | data[idx + 2];
    const a = r() * Math.PI;
    const len = 2 + r() * 4;
    ctx.strokeStyle = css(jitter(col, 30, r));
    ctx.lineWidth = 1.6 + r() * 1.8;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(a) * len, y - Math.sin(a) * len);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();
  // borde oscuro suave para separar del fondo
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  drawFlat(ctx, prims, {
    ...o,
    pal: Object.fromEntries(Object.keys(CELESTE_PAL).map((k) => [k, 0x1a1410])) as Palette,
    outline: 0x1a1410,
    outlineWidth: 1.5,
  });
  ctx.restore();
}

/** Genera una textura con una figura ya dibujada. Devuelve la clave. */
export function figureTexture(
  scene: Phaser.Scene,
  key: string,
  prims: Prim[],
  scale: number,
  draw: (ctx: CanvasRenderingContext2D, o: DrawOpts) => void,
  pal: Palette = CELESTE_PAL,
  box = { w: 60, h: 112 },
): string {
  const [c, ctx] = makeCanvas(box.w * scale, box.h * scale);
  const o: DrawOpts = { scale, pal, ox: (box.w / 2) * scale, oy: (box.h - 4) * scale };
  draw(ctx, o);
  void prims;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
  return key;
}
