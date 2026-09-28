/**
 * El examen de Don Élmer y el recorrido del pasillo.
 *
 * Él nunca supo qué le iban a preguntar, así que su sueño improvisa: el examen no
 * es de escuela, es sobre su propia vida. La respuesta correcta es siempre la que
 * él sabe de sobra, aunque nunca haya vuelto a pisar un aula.
 *
 * Son datos puros: mover obstáculos o añadir preguntas no toca la lógica del nivel.
 */
export interface ExamQuestion {
  /** El enunciado, que se escribe con gis en el pizarrón. */
  text: string;
  /** Respuesta del recuadro de arriba (se cruza saltando). */
  upper: string;
  /** Respuesta del recuadro de abajo (se cruza corriendo por el suelo). */
  lower: string;
  /** Cuál de las dos es la correcta. */
  correct: 'upper' | 'lower';
  /** Distancia del recorrido donde aparece. */
  at: number;
}

export const EXAM_QUESTIONS: ExamQuestion[] = [
  {
    text: '¿A qué hora se atasca el elevador?',
    upper: 'nunca se atasca',
    lower: 'siempre a las 7',
    correct: 'lower',
    at: 1900,
  },
  {
    text: '¿Qué se hace cuando un niño llora de madrugada?',
    upper: 'subir a ver',
    lower: 'subirle al radio',
    correct: 'upper',
    at: 3150,
  },
  {
    // Justo después de la escalera: el jugador acaba de contarlos
    text: '¿Cuántos escalones tiene el edificio Girasol?',
    upper: 'ciento doce',
    lower: 'nadie los cuenta',
    correct: 'upper',
    at: 6250,
  },
  {
    text: '¿Con qué se quita el óxido de una bisagra?',
    upper: 'con agua',
    lower: 'con paciencia',
    correct: 'lower',
    at: 8000,
  },
  {
    text: '¿Cuánto dura un gis?',
    upper: 'treinta años',
    lower: 'una clase',
    correct: 'upper',
    at: 10150,
  },
];

export type ExamObstacle = 'desk' | 'books' | 'bag' | 'plane' | 'bell';

/**
 * El recorrido completo. Las distancias son en píxeles del mundo.
 * Regla de diseño: entre dos peligros que piden acciones distintas hay al menos
 * ~1.2 s de carrera (un salto completo dura ~1.1 s).
 */
export const EXAM_COURSE = {
  length: 11400,
  /** La escalera del Girasol, metida en la escuela de su sueño. */
  stairs: { start: 3450, steps: 112 },
  /** Dónde vuelves si el borrador te alcanza. */
  checkpoints: [0, 3450, 5950],
  /** Velocidad de carrera por tramo: [desde, px/s]. */
  speeds: [
    [0, 330],
    [3450, 300],
    [5950, 370],
    [10150, 400],
  ] as [number, number][],
  /** Huecos borrados en el piso: [inicio, ancho]. */
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
    // escalera: se sube corriendo, solo hay que agacharse
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
  /** Estrellas de gis (luciérnagas): [distancia, altura sobre el suelo]. */
  fireflies: [
    [1455, 150],
    [2800, 175],
    [4300, 110],
    [7165, 170],
    [8820, 160],
    [10600, 175],
  ] as [number, number][],
};
