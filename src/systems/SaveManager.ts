import type { DreamId } from '../config';

/** Sueños que esconden luciérnagas (la pesadilla también: son crayolas). */
export type FireflyId = DreamId | 'chase';

export interface SaveData {
  keys: Record<DreamId, boolean>;
  fireflies: Record<FireflyId, number>;
  /** Mejor calificación en el examen de Don Élmer (respuestas correctas). */
  examBest: number;
  introSeen: boolean;
  metMorfeo: boolean;
  nightmareIntroSeen: boolean;
  nightmareDone: boolean;
  /** Morfeo ya reveló que falta un sueño: el de Iris. */
  ownDreamRevealed: boolean;
  /** Iris recuperó su propio sueño (la canción del edificio). */
  songDone: boolean;
  endingSeen: boolean;
  muted: boolean;
}

// Total de luciérnagas que existen en cada sueño
export const FIREFLY_TOTALS: Record<FireflyId, number> = { exam: 6, fall: 8, forest: 6, chase: 6 };

const STORAGE_KEY = 'duermevela-save-v1';

const fresh = (): SaveData => ({
  keys: { exam: false, fall: false, forest: false },
  fireflies: { exam: 0, fall: 0, forest: 0, chase: 0 },
  examBest: 0,
  introSeen: false,
  metMorfeo: false,
  nightmareIntroSeen: false,
  nightmareDone: false,
  ownDreamRevealed: false,
  songDone: false,
  endingSeen: false,
  muted: false,
});

/** Progreso del jugador en localStorage. */
class SaveManagerClass {
  data: SaveData = fresh();

  load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Fusión profunda para que los guardados viejos ganen los campos nuevos
        const parsed = JSON.parse(raw) as Partial<SaveData>;
        const base = fresh();
        this.data = {
          ...base,
          ...parsed,
          keys: { ...base.keys, ...(parsed.keys ?? {}) },
          fireflies: { ...base.fireflies, ...(parsed.fireflies ?? {}) },
        };
      }
    } catch {
      this.data = fresh();
    }
  }

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // sin almacenamiento disponible: el juego sigue, solo no persiste
    }
  }

  reset(): void {
    const muted = this.data.muted;
    this.data = fresh();
    this.data.muted = muted;
    this.save();
  }

  keyCount(): number {
    return Object.values(this.data.keys).filter(Boolean).length;
  }

  fireflyCount(): number {
    return Object.values(this.data.fireflies).reduce((a, b) => a + b, 0);
  }

  fireflyTotal(): number {
    return Object.values(FIREFLY_TOTALS).reduce((a, b) => a + b, 0);
  }

  /** Registra luciérnagas de un sueño (solo si superan el récord anterior). */
  recordFireflies(dream: FireflyId, n: number): void {
    if (n > this.data.fireflies[dream]) {
      this.data.fireflies[dream] = n;
      this.save();
    }
  }

  recordExam(correct: number): void {
    if (correct > this.data.examBest) {
      this.data.examBest = correct;
      this.save();
    }
  }

  giveKey(dream: DreamId): void {
    this.data.keys[dream] = true;
    this.save();
  }
}

export const SaveManager = new SaveManagerClass();
