/** Piezas y maletas del sueño de Samu (poliominós). Las celdas son [x, y]. */

export type PieceId =
  | 'balon'
  | 'guayos'
  | 'marimba'
  | 'heroe'
  | 'vaca'
  | 'cuaderno'
  | 'chaqueta'
  | 'tambor'
  | 'marimbaG'
  | 'acordeon'
  | 'camiseta'
  | 'pico'
  | 'samu'
  | 'tiquete';

export interface PieceDef {
  cells: [number, number][];
  color: number;
}

export const PIECES: Record<PieceId, PieceDef> = {
  balon: { cells: [[0, 0]], color: 0xf4f4f0 },
  guayos: {
    cells: [
      [0, 0],
      [1, 0],
    ],
    color: 0x2a2a30,
  },
  marimba: {
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    color: 0xb0703a,
  },
  heroe: {
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
    ],
    color: 0xd8352e,
  },
  vaca: {
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    color: 0xf6f2ea,
  },
  cuaderno: {
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ],
    color: 0x3aa655,
  },
  chaqueta: {
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
    color: 0xf2c230,
  },
  tambor: {
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
    ],
    color: 0x8a4a2a,
  },
  marimbaG: {
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ],
    color: 0xc07a40,
  },
  acordeon: {
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ],
    color: 0xc8283c,
  },
  camiseta: {
    cells: [
      [0, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    color: 0x1e5ab0,
  },
  pico: {
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 3],
    ],
    color: 0x6a3aa8,
  },
  samu: {
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    color: 0x5a3622,
  },
  tiquete: { cells: [[0, 0]], color: 0xf6ead0 },
};

export interface Level {
  cols: number;
  rows: number;
  pieces: PieceId[];
  /** Índices de los tiquetes viejos que caben en los huecos sobrantes. */
  tickets: number[];
  /** Sin solución a propósito (Acto III). */
  impossible?: boolean;
}

export const LEVELS: Level[] = [
  { cols: 5, rows: 3, pieces: ['vaca', 'heroe', 'marimba', 'guayos', 'balon'], tickets: [0] },
  {
    cols: 5,
    rows: 4,
    pieces: ['vaca', 'heroe', 'marimba', 'cuaderno', 'chaqueta', 'balon'],
    tickets: [1],
  },
  {
    cols: 6,
    rows: 4,
    pieces: ['cuaderno', 'chaqueta', 'tambor', 'marimbaG', 'vaca', 'guayos', 'balon'],
    tickets: [2],
  },
  {
    cols: 6,
    rows: 4,
    pieces: ['acordeon', 'camiseta', 'pico', 'cuaderno', 'guayos'],
    tickets: [3],
  },
  { cols: 5, rows: 4, pieces: ['samu', 'vaca', 'tambor', 'chaqueta', 'cuaderno'], tickets: [4] },
  {
    cols: 4,
    rows: 4,
    pieces: ['vaca', 'acordeon', 'camiseta', 'pico', 'samu'],
    tickets: [],
    impossible: true,
  },
];

/** Gira una forma 90° k veces y la normaliza al origen. */
export function rotate(cells: [number, number][], k: number): [number, number][] {
  let out = cells.map(([x, y]) => [x, y] as [number, number]);
  for (let i = 0; i < ((k % 4) + 4) % 4; i++)
    out = out.map(([x, y]) => [-y, x] as [number, number]);
  const mx = Math.min(...out.map((c) => c[0]));
  const my = Math.min(...out.map((c) => c[1]));
  return out.map(([x, y]) => [x - mx, y - my] as [number, number]);
}

export interface Placement {
  piece: number;
  rot: number;
  x: number;
  y: number;
}

/** ¿Caben todas estas piezas en la rejilla? (búsqueda exhaustiva, para tests y pistas) */
export function solvable(cols: number, rows: number, ids: PieceId[]): boolean {
  return solve(cols, rows, ids) !== null;
}

/** Devuelve una forma de acomodar las piezas, o null si no caben. */
export function solve(cols: number, rows: number, ids: PieceId[]): Placement[] | null {
  const grid = new Array(cols * rows).fill(false);
  const shapes = ids.map((id) => {
    const seen = new Set<string>();
    const rots: { k: number; cells: [number, number][] }[] = [];
    for (let k = 0; k < 4; k++) {
      const r = rotate(PIECES[id].cells, k);
      const key = JSON.stringify(r.slice().sort());
      if (!seen.has(key)) {
        seen.add(key);
        rots.push({ k, cells: r });
      }
    }
    return rots;
  });
  // las piezas grandes primero: poda más rápido
  const order = shapes
    .map((_s, i) => i)
    .sort((a, b) => shapes[b][0].cells.length - shapes[a][0].cells.length);
  const out: Placement[] = [];
  const place = (n: number): boolean => {
    if (n === order.length) return true;
    for (const rot of shapes[order[n]]) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cells = rot.cells.map(([cx, cy]) => [x + cx, y + cy]);
          if (cells.some(([cx, cy]) => cx >= cols || cy >= rows || grid[cy * cols + cx])) continue;
          for (const [cx, cy] of cells) grid[cy * cols + cx] = true;
          out.push({ piece: order[n], rot: rot.k, x, y });
          if (place(n + 1)) return true;
          out.pop();
          for (const [cx, cy] of cells) grid[cy * cols + cx] = false;
        }
      }
    }
    return false;
  };
  return place(0) ? out : null;
}
