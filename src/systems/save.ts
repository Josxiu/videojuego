import { DREAMS, TICKETS_PER_DREAM, type DreamId } from '../config';

export type AbelChoice = 'bajar' | 'solo' | 'quedarse';

export interface DreamProgress {
  done: boolean;
  /** Índices (0-4) de los tiquetes viejos encontrados. Persisten aunque se repita el sueño. */
  tickets: number[];
  secret: boolean;
  madrugada: boolean;
}

export interface SaveData {
  version: number;
  started: boolean;
  /** Escenas del tren ya vistas (para no repetir diálogos). */
  seen: string[];
  dreams: Record<DreamId, DreamProgress>;
  abelChoice: AbelChoice | null;
  endings: string[];
  muted: boolean;
  /** Reducir sacudidas y destellos. */
  calm: boolean;
}

export const SAVE_VERSION = 1;
const KEY = 'trasnocho.save';

function emptyDream(): DreamProgress {
  return { done: false, tickets: [], secret: false, madrugada: false };
}

export function freshSave(): SaveData {
  const dreams = {} as Record<DreamId, DreamProgress>;
  for (const d of DREAMS) dreams[d] = emptyDream();
  return {
    version: SAVE_VERSION,
    started: false,
    seen: [],
    dreams,
    abelChoice: null,
    endings: [],
    muted: false,
    calm: false,
  };
}

/** Repara una partida guardada (campos faltantes, valores fuera de rango). */
export function sanitize(raw: unknown): SaveData {
  const base = freshSave();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<SaveData>;
  base.started = !!r.started;
  base.seen = Array.isArray(r.seen) ? r.seen.filter((s) => typeof s === 'string') : [];
  base.muted = !!r.muted;
  base.calm = !!r.calm;
  base.endings = Array.isArray(r.endings) ? r.endings.filter((s) => typeof s === 'string') : [];
  base.abelChoice =
    r.abelChoice === 'bajar' || r.abelChoice === 'solo' || r.abelChoice === 'quedarse'
      ? r.abelChoice
      : null;
  const dr = (r.dreams ?? {}) as Partial<Record<DreamId, Partial<DreamProgress>>>;
  for (const d of DREAMS) {
    const p = dr[d];
    if (!p) continue;
    const tickets = Array.isArray(p.tickets)
      ? [
          ...new Set(
            p.tickets.filter((n) => Number.isInteger(n) && n >= 0 && n < TICKETS_PER_DREAM),
          ),
        ]
      : [];
    base.dreams[d] = {
      done: !!p.done,
      tickets: tickets.sort(),
      secret: !!p.secret,
      madrugada: !!p.madrugada,
    };
  }
  return base;
}

interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function storage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export const Save = {
  data: freshSave(),

  load(store: StorageLike | null = storage()): SaveData {
    try {
      const raw = store?.getItem(KEY);
      this.data = raw ? sanitize(JSON.parse(raw)) : freshSave();
    } catch {
      this.data = freshSave();
    }
    return this.data;
  },

  write(store: StorageLike | null = storage()): void {
    try {
      store?.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Sin almacenamiento (modo privado): el juego sigue, solo no guarda.
    }
  },

  reset(store: StorageLike | null = storage()): void {
    const { muted, calm } = this.data;
    this.data = freshSave();
    this.data.muted = muted;
    this.data.calm = calm;
    this.write(store);
  },

  dream(id: DreamId): DreamProgress {
    return this.data.dreams[id];
  },

  addTicket(id: DreamId, index: number): boolean {
    const p = this.data.dreams[id];
    if (p.tickets.includes(index)) return false;
    p.tickets.push(index);
    p.tickets.sort();
    this.write();
    return true;
  },

  markSeen(key: string): boolean {
    if (this.data.seen.includes(key)) return false;
    this.data.seen.push(key);
    this.write();
    return true;
  },

  hasSeen(key: string): boolean {
    return this.data.seen.includes(key);
  },
};

export function ticketCount(s: SaveData): number {
  return DREAMS.reduce((n, d) => n + s.dreams[d].tickets.length, 0);
}

export function secretCount(s: SaveData): number {
  return DREAMS.filter((d) => s.dreams[d].secret).length;
}

export function doneCount(s: SaveData, ids: DreamId[] = DREAMS): number {
  return ids.filter((d) => s.dreams[d].done).length;
}

/** Acto del tren según el progreso: 1 → 2 → 3 → 4 (todo terminado). */
export function trainAct(s: SaveData): 1 | 2 | 3 | 4 {
  const d = s.dreams;
  if (!(d.reme.done && d.samu.done && d.marisol.done)) return 1;
  if (!(d.jairo.done && d.chepe.done && d.efrain.done)) return 2;
  if (!(d.abel.done && d.celeste.done)) return 3;
  return 4;
}

/** Hora del reloj del pasillo (minutos desde medianoche). Avanza con cada pasajero que llega. */
export function clockMinutes(s: SaveData): number {
  const steps = [167, 188, 210, 232, 254, 276, 298, 330, 352];
  return steps[Math.min(doneCount(s), steps.length - 1)];
}

export function formatClock(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}
