/** Planos del sueño de Marisol: orillas, obstáculos, tinta y tiquetes. */

export interface Plan {
  /** Polilíneas fijas (orillas, pilas, muros). */
  statics: number[][][];
  start: [number, number];
  goal: { x: number; y: number; w: number; h: number };
  ink: number;
  river: number;
  /** El río sube hasta aquí durante un intento (Acto II). */
  riverTop?: number;
  ticket?: { i: number; x: number; y: number };
  /** Borradores ya presentes en la hoja (Acto III). */
  drafts?: number[][][];
  /** Una solución de referencia (tests y modo automático). */
  solution: number[][][];
}

export const PLANS: Plan[] = [
  {
    statics: [
      [
        [40, 200],
        [40, 250],
        [230, 250],
      ],
      [
        [700, 330],
        [920, 330],
        [920, 280],
      ],
    ],
    start: [80, 236],
    goal: { x: 730, y: 290, w: 170, h: 40 },
    ink: 520,
    river: 480,
    ticket: { i: 0, x: 470, y: 280 },
    solution: [
      [
        [226, 252],
        [704, 332],
      ],
    ],
  },
  {
    statics: [
      [
        [40, 120],
        [40, 170],
        [200, 170],
      ],
      [
        [440, 250],
        [500, 250],
      ],
      [
        [470, 250],
        [470, 540],
      ],
      [
        [720, 380],
        [920, 380],
        [920, 330],
      ],
    ],
    start: [80, 156],
    goal: { x: 740, y: 340, w: 160, h: 40 },
    ink: 560,
    river: 490,
    ticket: { i: 1, x: 600, y: 298 },
    solution: [
      [
        [196, 172],
        [444, 252],
      ],
      [
        [496, 252],
        [724, 382],
      ],
    ],
  },
  {
    statics: [
      [
        [40, 90],
        [40, 140],
        [180, 140],
        [250, 220],
        [305, 300],
        [350, 352],
        [395, 376],
        [440, 384],
        [480, 382],
      ],
      [
        [690, 300],
        [920, 300],
        [920, 250],
      ],
    ],
    start: [70, 126],
    goal: { x: 710, y: 260, w: 190, h: 40 },
    ink: 300,
    river: 490,
    ticket: { i: 2, x: 585, y: 328 },
    solution: [
      [
        [476, 382],
        [694, 302],
      ],
    ],
  },
  {
    statics: [
      [
        [920, 110],
        [920, 160],
        [760, 160],
      ],
      [
        [500, 240],
        [500, 340],
      ],
      [
        [240, 400],
        [40, 400],
        [40, 350],
      ],
    ],
    start: [880, 146],
    goal: { x: 60, y: 360, w: 170, h: 40 },
    ink: 640,
    river: 490,
    ticket: { i: 3, x: 370, y: 296 },
    solution: [
      [
        [764, 162],
        [500, 226],
      ],
      [
        [500, 226],
        [236, 402],
      ],
    ],
  },
  {
    statics: [
      [
        [40, 150],
        [40, 200],
        [200, 200],
      ],
      [
        [740, 330],
        [920, 330],
        [920, 280],
      ],
    ],
    start: [80, 186],
    goal: { x: 760, y: 290, w: 150, h: 40 },
    ink: 640,
    river: 500,
    riverTop: 420,
    // con fatiga, un solo trazo largo se rompe: hay que dibujarlo en tramos
    solution: [
      [
        [196, 202],
        [470, 267],
      ],
      [
        [470, 267],
        [744, 332],
      ],
    ],
  },
  {
    statics: [
      [
        [40, 100],
        [40, 150],
        [180, 150],
      ],
      [
        [420, 300],
        [540, 300],
      ],
      [
        [480, 300],
        [480, 540],
      ],
      [
        [760, 400],
        [920, 400],
        [920, 350],
      ],
    ],
    start: [70, 136],
    goal: { x: 780, y: 360, w: 130, h: 40 },
    ink: 560,
    river: 500,
    riverTop: 430,
    ticket: { i: 4, x: 650, y: 340 },
    solution: [
      [
        [176, 152],
        [424, 302],
      ],
      [
        [536, 302],
        [764, 402],
      ],
    ],
  },
  {
    statics: [
      [
        [40, 150],
        [40, 200],
        [200, 200],
      ],
      [
        [760, 330],
        [920, 330],
        [920, 280],
      ],
    ],
    start: [80, 186],
    goal: { x: 780, y: 290, w: 130, h: 40 },
    ink: 0,
    river: 490,
    drafts: [
      [
        [196, 202],
        [336, 242],
      ],
      [
        [326, 240],
        [476, 282],
      ],
      [
        [466, 280],
        [616, 304],
      ],
      [
        [606, 302],
        [764, 332],
      ],
      [
        [260, 120],
        [380, 90],
      ],
      [
        [560, 160],
        [700, 200],
      ],
      [
        [300, 400],
        [420, 360],
      ],
    ],
    solution: [],
  },
];

/** Empujoncito inicial al soltar la canica (hacia la meta). */
export function kick(p: Plan): number {
  return p.goal.x > p.start[0] ? 170 : -170;
}

export const MARBLE = { r: 10, g: 900, bounce: 0.2, friction: 0.999 };
