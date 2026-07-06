import { DreamId } from '../config';

export interface SaveData {
  keys: Record<DreamId, boolean>;
  fireflies: Record<DreamId, number>;
  introSeen: boolean;
  metMorfeo: boolean;
  endingSeen: boolean;
  muted: boolean;
}

// Total de luciérnagas de memoria que existen en cada sueño
export const FIREFLY_TOTALS: Record<DreamId, number> = { exam: 6, fall: 8, forest: 6 };

const STORAGE_KEY = 'duermevela-save-v1';

const fresh = (): SaveData => ({
  keys: { exam: false, fall: false, forest: false },
  fireflies: { exam: 0, fall: 0, forest: 0 },
  introSeen: false,
  metMorfeo: false,
  endingSeen: false,
  muted: false,
});

/** Progreso del jugador en localStorage. */
class SaveManagerClass {
  data: SaveData = fresh();

  load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.data = { ...fresh(), ...JSON.parse(raw) };
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
    this.data = fresh();
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
  recordFireflies(dream: DreamId, n: number): void {
    if (n > this.data.fireflies[dream]) {
      this.data.fireflies[dream] = n;
      this.save();
    }
  }

  giveKey(dream: DreamId): void {
    this.data.keys[dream] = true;
    this.save();
  }
}

export const SaveManager = new SaveManagerClass();
