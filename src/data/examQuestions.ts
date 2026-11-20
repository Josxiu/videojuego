import type { TextKey } from '../i18n';

/**
 * El examen de Don Élmer y el recorrido del pasillo.
 * Todos los textos viven en `src/i18n/es/`.
 */
export interface ExamQuestion {
  textKey: TextKey;
  upperKey: TextKey;
  lowerKey: TextKey;
  correct: 'upper' | 'lower';
  at: number;
}

export const EXAM_QUESTIONS: ExamQuestion[] = [
  {
    textKey: 'exam.q.1.text',
    upperKey: 'exam.q.1.up',
    lowerKey: 'exam.q.1.down',
    correct: 'lower',
    at: 1900,
  },
  {
    textKey: 'exam.q.2.text',
    upperKey: 'exam.q.2.up',
    lowerKey: 'exam.q.2.down',
    correct: 'upper',
    at: 3150,
  },
  {
    textKey: 'exam.q.3.text',
    upperKey: 'exam.q.3.up',
    lowerKey: 'exam.q.3.down',
    correct: 'upper',
    at: 6250,
  },
  {
    textKey: 'exam.q.4.text',
    upperKey: 'exam.q.4.up',
    lowerKey: 'exam.q.4.down',
    correct: 'lower',
    at: 8000,
  },
  {
    textKey: 'exam.q.5.text',
    upperKey: 'exam.q.5.up',
    lowerKey: 'exam.q.5.down',
    correct: 'upper',
    at: 10150,
  },
];

export type ExamObstacle = 'desk' | 'books' | 'bag' | 'plane' | 'bell';

export const EXAM_COURSE = {
  length: 11400,
  stairs: { start: 3450, steps: 112 },
  checkpoints: [0, 3450, 5950],
  speeds: [
    [0, 330],
    [3450, 300],
    [5950, 370],
    [10150, 400],
  ] as [number, number][],
  gaps: [
    [1400, 110],
    [7100, 130],
    [8750, 140],
  ] as [number, number][],
  obstacles: [
    [600, 'bag'],
    [1000, 'desk'],
    [2350, 'plane'],
    [2800, 'books'],
    [3950, 'plane'],
    [4600, 'plane'],
    [5200, 'plane'],
    [5600, 'bell'],
    [6700, 'desk'],
    [7550, 'bell'],
    [8400, 'bag'],
    [9200, 'plane'],
    [9700, 'desk'],
    [10600, 'books'],
    [11000, 'bell'],
  ] as [number, ExamObstacle][],
  fireflies: [
    [1455, 150],
    [2800, 175],
    [4300, 110],
    [7165, 170],
    [8820, 160],
    [10600, 175],
  ] as [number, number][],
};
