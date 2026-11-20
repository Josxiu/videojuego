import {
  ALL_DREAMS,
  ACT1_DREAMS,
  ACT2_DREAMS,
  ACT3_DREAMS,
  type AllDreamId,
  type DreamId,
} from '../config';

/** Sueños que esconden luciérnagas (todos los 10 sueños tienen 6). */
export type FireflyId = AllDreamId;

export type EndingKind = 'silence' | 'fragile' | 'breakfast' | 'sunflower';

export interface SaveData {
  /** Llaves del Acto I (compatibilidad directa con el diseño original). */
  keys: Record<DreamId, boolean>;
  /** Estado completado de los 10 sueños. */
  completed: Record<AllDreamId, boolean>;
  /** Máximo de luciérnagas obtenidas por sueño. */
  fireflies: Record<AllDreamId, number>;
  /** Índices únicos (0..5) de luciérnagas recolectadas de forma permanente por sueño. */
  fireflyIds: Record<AllDreamId, number[]>;
  /** Secretos descubiertos por sueño (1 por sueño). */
  secrets: Record<AllDreamId, boolean>;
  /** Variantes difíciles («Modo Desvelo») completadas por sueño. */
  insomniaDone: Record<AllDreamId, boolean>;
  /** Mejor calificación en el examen de Don Élmer (respuestas correctas). */
  examBest: number;
  /** Mejor porcentaje de acierto en La Canción del Edificio (0..100). */
  songBest: number;
  introSeen: boolean;
  metMorfeo: boolean;
  /** Octavio Bravo irrumpió en el Entresueño (Acto II). */
  octavioIntroSeen: boolean;
  nightmareIntroSeen: boolean;
  nightmareDone: boolean;
  /** Acto III del edificio desbloqueado (3A y 6A visibles). */
  act3IntroSeen: boolean;
  /** Elección frente a Octavio tras el 6A. */
  octavioChoice: 'resist' | 'silence' | null;
  /** Morfeo ya reveló que falta un sueño: el de Iris. */
  ownDreamRevealed: boolean;
  /** Iris recuperó su propio sueño (la canción del edificio). */
  songDone: boolean;
  endingSeen: boolean;
  lastEnding: EndingKind | null;
  muted: boolean;
}

// 6 luciérnagas por sueño (60 en total en todo el edificio).
export const FIREFLY_TOTALS: Record<AllDreamId, number> = {
  exam: 6,
  fall: 6,
  forest: 6,
  shadow: 6,
  embroidery: 6,
  glass: 6,
  chase: 6,
  woodcut: 6,
  chamber3d: 6,
  song: 6,
};

const STORAGE_KEY = 'duermevela-save-v1';

function makeRecord<T>(val: () => T): Record<AllDreamId, T> {
  return {
    exam: val(),
    fall: val(),
    forest: val(),
    shadow: val(),
    embroidery: val(),
    glass: val(),
    chase: val(),
    woodcut: val(),
    chamber3d: val(),
    song: val(),
  };
}

const fresh = (): SaveData => ({
  keys: { exam: false, fall: false, forest: false },
  completed: makeRecord(() => false),
  fireflies: makeRecord(() => 0),
  fireflyIds: makeRecord(() => []),
  secrets: makeRecord(() => false),
  insomniaDone: makeRecord(() => false),
  examBest: 0,
  songBest: 0,
  introSeen: false,
  metMorfeo: false,
  octavioIntroSeen: false,
  nightmareIntroSeen: false,
  nightmareDone: false,
  act3IntroSeen: false,
  octavioChoice: null,
  ownDreamRevealed: false,
  songDone: false,
  endingSeen: false,
  lastEnding: null,
  muted: false,
});

/** Progreso del jugador en localStorage. */
class SaveManagerClass {
  data: SaveData = fresh();

  load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SaveData>;
        const base = fresh();
        this.data = {
          ...base,
          ...parsed,
          keys: { ...base.keys, ...(parsed.keys ?? {}) },
          completed: { ...base.completed, ...(parsed.completed ?? {}) },
          fireflies: { ...base.fireflies, ...(parsed.fireflies ?? {}) },
          fireflyIds: { ...base.fireflyIds, ...(parsed.fireflyIds ?? {}) },
          secrets: { ...base.secrets, ...(parsed.secrets ?? {}) },
          insomniaDone: { ...base.insomniaDone, ...(parsed.insomniaDone ?? {}) },
        };
        // Sincronizar campos legados (v1 -> v2)
        for (const id of ACT1_DREAMS) {
          if (this.data.keys[id]) this.data.completed[id] = true;
          if (this.data.completed[id]) this.data.keys[id] = true;
        }
        if (this.data.nightmareDone) this.data.completed.chase = true;
        if (this.data.completed.chase) this.data.nightmareDone = true;
        if (this.data.songDone) this.data.completed.song = true;
        if (this.data.completed.song) this.data.songDone = true;
        for (const id of ALL_DREAMS) {
          const uniq = Array.from(
            new Set(
              (this.data.fireflyIds[id] ?? []).filter(
                (n) => Number.isInteger(n) && n >= 0 && n < FIREFLY_TOTALS[id],
              ),
            ),
          );
          this.data.fireflyIds[id] = uniq;
          const cap = FIREFLY_TOTALS[id];
          this.data.fireflies[id] = Math.min(
            cap,
            Math.max(this.data.fireflies[id] ?? 0, uniq.length),
          );
        }
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

  /** Cantidad de llaves del Acto I obtenidas (0..3). */
  keyCount(): number {
    return ACT1_DREAMS.filter((id) => this.data.keys[id] || this.data.completed[id]).length;
  }

  act1Done(): boolean {
    return ACT1_DREAMS.every((id) => this.data.completed[id]);
  }

  act2Count(): number {
    return ACT2_DREAMS.filter((id) => this.data.completed[id]).length;
  }

  act2Done(): boolean {
    return ACT2_DREAMS.every((id) => this.data.completed[id]);
  }

  act3Done(): boolean {
    return ACT3_DREAMS.every((id) => this.data.completed[id]);
  }

  completedCount(): number {
    return ALL_DREAMS.filter((id) => this.data.completed[id]).length;
  }

  secretCount(): number {
    return ALL_DREAMS.filter((id) => this.data.secrets[id]).length;
  }

  insomniaCount(): number {
    return ALL_DREAMS.filter((id) => this.data.insomniaDone[id]).length;
  }

  fireflyCount(): number {
    return ALL_DREAMS.reduce((sum, id) => sum + this.data.fireflies[id], 0);
  }

  fireflyTotal(): number {
    return ALL_DREAMS.reduce((sum, id) => sum + FIREFLY_TOTALS[id], 0);
  }

  /** Registra luciérnagas por cantidad (compatibilidad) o por índice único. */
  recordFireflies(dream: AllDreamId, n: number): void {
    const clamped = Math.min(FIREFLY_TOTALS[dream], Math.max(0, n));
    if (clamped > this.data.fireflies[dream]) {
      this.data.fireflies[dream] = clamped;
      this.save();
    }
  }

  /** Registra una luciérnaga individual permanente (0..5). */
  collectFirefly(dream: AllDreamId, index: number): boolean {
    if (index < 0 || index >= FIREFLY_TOTALS[dream]) return false;
    const list = this.data.fireflyIds[dream];
    if (list.includes(index)) return false;
    list.push(index);
    this.data.fireflies[dream] = Math.min(
      FIREFLY_TOTALS[dream],
      Math.max(this.data.fireflies[dream], list.length),
    );
    this.save();
    return true;
  }

  hasFirefly(dream: AllDreamId, index: number): boolean {
    return this.data.fireflyIds[dream].includes(index);
  }

  markSecret(dream: AllDreamId): boolean {
    if (this.data.secrets[dream]) return false;
    this.data.secrets[dream] = true;
    this.save();
    return true;
  }

  markCompleted(dream: AllDreamId, insomnia = false): void {
    this.data.completed[dream] = true;
    if (dream === 'exam' || dream === 'fall' || dream === 'forest') {
      this.data.keys[dream] = true;
    }
    if (dream === 'chase') this.data.nightmareDone = true;
    if (dream === 'song') this.data.songDone = true;
    if (insomnia) this.data.insomniaDone[dream] = true;
    this.save();
  }

  recordExam(correct: number): void {
    if (correct > this.data.examBest) {
      this.data.examBest = correct;
      this.save();
    }
  }

  recordSong(pct: number): void {
    if (pct > this.data.songBest) {
      this.data.songBest = pct;
      this.save();
    }
  }

  giveKey(dream: DreamId): void {
    this.markCompleted(dream);
  }

  /** Calcula qué final corresponde según el estado de la partida. */
  determineEnding(): EndingKind {
    if (this.data.octavioChoice === 'silence') return 'silence';
    const ff = this.fireflyCount();
    const sec = this.secretCount();
    const ins = this.insomniaCount();
    if (ff >= 42 || (ff >= 32 && sec >= 5) || ins >= 4) return 'sunflower';
    if (ff >= 24 || sec >= 3 || ins >= 1) return 'breakfast';
    return 'fragile';
  }
}

export const SaveManager = new SaveManagerClass();
