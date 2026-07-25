/**
 * Las preguntas del examen de Don Élmer.
 *
 * Él nunca supo qué le iban a preguntar, así que su sueño improvisa: el examen no
 * es de escuela, es sobre su propia vida. La respuesta correcta es siempre la que
 * él sabe de sobra, aunque nunca haya pisado un aula.
 *
 * Son datos puros: añadir preguntas no toca la lógica del nivel.
 */
export interface ExamQuestion {
  /** El enunciado que aparece arriba. */
  text: string;
  /** Respuesta de la compuerta de arriba (se alcanza saltando). */
  upper: string;
  /** Respuesta de la compuerta de abajo (se pasa por debajo, deslizándose). */
  lower: string;
  /** Cuál de las dos es la correcta. */
  correct: 'upper' | 'lower';
}

export const EXAM_QUESTIONS: ExamQuestion[] = [
  {
    text: '¿Cuántos escalones tiene el edificio Girasol?',
    upper: 'ciento doce',
    lower: 'nadie los cuenta',
    correct: 'upper', // Élmer sí los cuenta: los barre todos los días
  },
  {
    text: '¿A qué hora se atasca el elevador?',
    upper: 'nunca se atasca',
    lower: 'siempre a las 7',
    correct: 'lower',
  },
  {
    text: '¿Qué se hace cuando un niño llora de madrugada?',
    upper: 'subir a ver',
    lower: 'bajar el volumen',
    correct: 'upper',
  },
  {
    text: '¿Con qué se quita el óxido de una bisagra?',
    upper: 'con agua',
    lower: 'con paciencia',
    correct: 'lower',
  },
  {
    text: '¿Cuánto dura un gis?',
    upper: 'treinta años',
    lower: 'una clase',
    correct: 'upper',
  },
];

/** Distancias del recorrido donde aparece cada pregunta. */
export const QUESTION_POSITIONS = [1250, 2500, 3900, 5250, 6350];
